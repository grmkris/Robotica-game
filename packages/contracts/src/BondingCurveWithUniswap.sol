// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import '@openzeppelin/contracts/interfaces/IERC721Metadata.sol';
import '@openzeppelin/contracts/interfaces/IERC721Enumerable.sol';
import "lib/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "lib/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "lib/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "lib/v3-periphery/contracts/libraries/TransferHelper.sol";

contract BondingCurveWithUniswap is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant PRECISION = 1e18;
    uint256 public constant INITIAL_PRICE = 0.001 ether;
    uint256 public constant PRICE_INCREMENT = 0.0001 ether;
    
    // Uniswap related variables
    IUniswapV3Factory public immutable uniswapFactory;
    INonfungiblePositionManager public immutable nonfungiblePositionManager;
    address public immutable WETH;
    IUniswapV3Pool public uniswapPool;
    uint24 public constant POOL_FEE = 3000; // 0.3%
    
    bool public poolDeployed;
    uint256 public tokenId; // NFT token ID for the liquidity position
    
    event TokensPurchased(address indexed buyer, uint256 amountPurchased, uint256 ethSpent);
    event TokensSold(address indexed seller, uint256 amountSold, uint256 ethReceived);
    event UniswapPoolDeployed(address pool, uint256 initialLiquidity);
    
    constructor(
        address _factory,
        address _positionManager,
        address _weth
    ) ERC20("Bonding Curve Token", "BCT") Ownable(msg.sender) {
        uniswapFactory = IUniswapV3Factory(_factory);
        nonfungiblePositionManager = INonfungiblePositionManager(_positionManager);
        WETH = _weth;
    }

    // Helper functions
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _getTickAtPrice(uint256 price) internal pure returns (int24) {
        // Simplified tick calculation
        // In real implementation, you should use TickMath from Uniswap
        require(price > 0, "Invalid price");
        
        // Starting tick for price 1.0001
        int24 tick = -887272;
        // Each tick represents a 0.01% price change
        while (price >= 1.0001e18) {
            price = (price * 10000) / 10001;
            tick++;
            if (tick >= 887272) break;  // Max tick
        }
        return tick;
    }

    function _getTickAtSqrtRatio(uint160 sqrtPriceX96) internal pure returns (int24) {
        // Convert sqrtPrice to actual price
        uint256 price = uint256(sqrtPriceX96) * uint256(sqrtPriceX96) >> 192;
        return _getTickAtPrice(price);
    }
    
    function getCurrentPrice(uint256 supply) public pure returns (uint256) {
        return INITIAL_PRICE + (supply * PRICE_INCREMENT / PRECISION);
    }
    
    function calculatePurchaseCost(uint256 amount) public view returns (uint256) {
        uint256 supply = totalSupply();
        uint256 finalSupply = supply + amount;
        uint256 avgPrice = (getCurrentPrice(supply) + getCurrentPrice(finalSupply)) / 2;
        return avgPrice * amount / PRECISION;
    }
    
    function calculateSaleReturn(uint256 amount) public view returns (uint256) {
        require(amount <= totalSupply(), "Cannot sell more than supply");
        uint256 supply = totalSupply();
        uint256 finalSupply = supply - amount;
        uint256 avgPrice = (getCurrentPrice(finalSupply) + getCurrentPrice(supply)) / 2;
        return avgPrice * amount / PRECISION;
    }

    function _calculateSqrtPriceX96() private view returns (uint160) {
        uint256 currentPrice = getCurrentPrice(totalSupply());
        uint256 sqrtPrice = sqrt(currentPrice * (1 << 192));
        return uint160(sqrtPrice);
    }
    
    function _addInitialLiquidity(uint256 tokenAmount) private {
        uint160 sqrtPriceX96 = _calculateSqrtPriceX96();
        
        // Calculate tick from current price
        int24 currentTick = _getTickAtSqrtRatio(sqrtPriceX96);
        int24 tickSpacing = 60; // Tick spacing for 0.3% fee tier
        
        // Round to the nearest tick spacing
        int24 baseTickLower = (currentTick / tickSpacing) * tickSpacing;
        int24 baseTickUpper = baseTickLower + tickSpacing;
        
        // Set range to ±10 tick spacings from the current tick
        int24 tickLower = baseTickLower - (tickSpacing * 10);
        int24 tickUpper = baseTickUpper + (tickSpacing * 10);
        
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: address(this),
            token1: WETH,
            fee: POOL_FEE,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: tokenAmount,
            amount1Desired: tokenAmount * getCurrentPrice(totalSupply()) / 1e18,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this),
            deadline: block.timestamp
        });
        
        (tokenId, , , ) = nonfungiblePositionManager.mint(params);
    }
    
    function deployUniswapPool(uint256 initialTokens) external onlyOwner {
        require(!poolDeployed, "Pool already deployed");
        require(initialTokens > 0, "Need initial tokens");
        
        // Create the pool
        address poolAddress = uniswapFactory.createPool(
            address(this),
            WETH,
            POOL_FEE
        );
        uniswapPool = IUniswapV3Pool(poolAddress);
        
        // Initialize pool with current bonding curve price
        uint160 sqrtPriceX96 = _calculateSqrtPriceX96();
        uniswapPool.initialize(sqrtPriceX96);
        
        // Mint initial tokens for liquidity
        _mint(address(this), initialTokens);
        
        // Approve position manager
        TransferHelper.safeApprove(
            address(this),
            address(nonfungiblePositionManager),
            initialTokens
        );
        
        // Add initial liquidity
        _addInitialLiquidity(initialTokens);
        
        poolDeployed = true;
        emit UniswapPoolDeployed(address(uniswapPool), initialTokens);
    }
    
    receive() external payable {}
}