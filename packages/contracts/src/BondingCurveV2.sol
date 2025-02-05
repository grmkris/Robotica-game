// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IUniswapV2.sol";

contract BondingCurveV2 is ERC20, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant PRECISION = 1e18;
    uint256 public constant INITIAL_PRICE = 0.001 ether;
    uint256 public constant PRICE_INCREMENT = 0.0001 ether;
    
    // Uniswap V2 variables
    IUniswapV2Router02 public immutable uniswapRouter;
    IUniswapV2Factory public immutable uniswapFactory;
    address public immutable WETH;
    IUniswapV2Pair public uniswapPair;
    bool public poolDeployed;
    
    event TokensPurchased(address indexed buyer, uint256 amountPurchased, uint256 ethSpent);
    event TokensSold(address indexed seller, uint256 amountSold, uint256 ethReceived);
    event UniswapPoolDeployed(address pair, uint256 initialLiquidity);
    
    constructor(
        address _router,
        address _factory,
        address _weth
    ) ERC20("Bonding Curve Token V2", "BCTV2") Ownable(msg.sender) {
        uniswapRouter = IUniswapV2Router02(_router);
        uniswapFactory = IUniswapV2Factory(_factory);
        WETH = _weth;
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
    
    function buy() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH to buy tokens");
        
        uint256 remainingETH = msg.value;
        uint256 tokensToBuy = 0;
        
        while (remainingETH > 0) {
            uint256 currentPrice = getCurrentPrice(totalSupply() + tokensToBuy);
            if (currentPrice > remainingETH) break;
            
            tokensToBuy += PRECISION;
            remainingETH -= currentPrice;
        }
        
        require(tokensToBuy > 0, "Not enough ETH to buy any tokens");
        
        _mint(msg.sender, tokensToBuy);
        
        // Keep the ETH in the contract for liquidity
        emit TokensPurchased(msg.sender, tokensToBuy, msg.value - remainingETH);
    }
    
    function sell(uint256 amount) external nonReentrant {
        require(amount > 0, "Must sell some tokens");
        require(balanceOf(msg.sender) >= amount, "Not enough tokens");
        
        uint256 ethToReturn = calculateSaleReturn(amount);
        
        _burn(msg.sender, amount);
        
        (bool success, ) = msg.sender.call{value: ethToReturn}("");
        require(success, "ETH transfer failed");
        
        emit TokensSold(msg.sender, amount, ethToReturn);
    }
    
    function deployUniswapPool(uint256 initialTokens, uint256 ethAmount) external onlyOwner {
        require(!poolDeployed, "Pool already deployed");
        require(initialTokens > 0, "Need initial tokens");
        require(ethAmount > 0, "Need initial ETH");
        require(address(this).balance >= ethAmount, "Not enough ETH in contract");
        
        // Create the pair if it doesn't exist
        address pairAddress = uniswapFactory.getPair(address(this), WETH);
        if (pairAddress == address(0)) {
            pairAddress = uniswapFactory.createPair(address(this), WETH);
        }
        uniswapPair = IUniswapV2Pair(pairAddress);
        
        // Mint tokens for initial liquidity
        _mint(address(this), initialTokens);
        
        // Approve router
        _approve(address(this), address(uniswapRouter), initialTokens);
        
        // Add liquidity
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) = uniswapRouter.addLiquidityETH{value: ethAmount}(
            address(this),
            initialTokens,
            0, // Accept any amount of tokens
            0, // Accept any amount of ETH
            address(this), // Send LP tokens to this contract
            block.timestamp
        );
        
        poolDeployed = true;
        emit UniswapPoolDeployed(address(uniswapPair), liquidity);
    }
    
    // Allow contract to receive ETH
    receive() external payable {}
}