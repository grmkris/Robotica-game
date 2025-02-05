// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./forge-std/Test.sol";
import "forge-std/src/console.sol";
import "../src/BondingCurveV2.sol";
import "../src/interfaces/IUniswapV2.sol";


contract BondingCurveV2Test is Test {
    BondingCurveV2 public bondingCurve;
    address public owner;
    address public buyer1;
    
    // Uniswap V2 addresses (Mainnet)
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    
    // Mock contracts
    MockRouter public mockRouter;
    MockFactory public mockFactory;
    
    function setUp() public {
        owner = address(this);
        buyer1 = vm.addr(1);
        vm.deal(buyer1, 100 ether);
        
        // Deploy mocks
        mockRouter = new MockRouter();
        mockFactory = new MockFactory();
        
        // Deploy bonding curve
        bondingCurve = new BondingCurveV2(
            address(mockRouter),
            address(mockFactory),
            WETH
        );
    }
    
    function test_Deployment() public {
        assertEq(address(bondingCurve.uniswapRouter()), address(mockRouter));
        assertEq(address(bondingCurve.uniswapFactory()), address(mockFactory));
        assertEq(bondingCurve.WETH(), WETH);
        assertFalse(bondingCurve.poolDeployed());
    }
    
    function test_BuyTokens() public {
        uint256 buyAmount = 0.001 ether;
        
        vm.prank(buyer1);
        bondingCurve.buy{value: buyAmount}();
        
        assertEq(bondingCurve.balanceOf(buyer1), 1e18); // 1 token
    }
    
    function test_DeployPool() public {
        // First buy some tokens to get ETH in the contract
        vm.prank(buyer1);
        bondingCurve.buy{value: 1 ether}();
        
        uint256 initialTokens = 1000 * 1e18;
        uint256 ethAmount = 1 ether;
        
        vm.prank(owner);
        bondingCurve.deployUniswapPool(initialTokens, ethAmount);
        
        assertTrue(bondingCurve.poolDeployed());
        assertNotEq(address(bondingCurve.uniswapPair()), address(0));
    }
}

contract MockRouter is IUniswapV2Router02 {
    function factory() external pure returns (address) {
        return address(0);
    }
    
    function WETH() external pure returns (address) {
        return address(0);
    }
    
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity) {
        return (amountTokenDesired, msg.value, 1e18);
    }
    
    function swapExactTokensForETH(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn;
        return amounts;
    }
    
    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint[] memory amounts) {
        amounts = new uint[](2);
        amounts[0] = msg.value;
        amounts[1] = msg.value;
        return amounts;
    }
}

contract MockFactory is IUniswapV2Factory {
    mapping(address => mapping(address => address)) public pairs;
    
    function getPair(address tokenA, address tokenB) external view returns (address) {
        return pairs[tokenA][tokenB];
    }
    
    function createPair(address tokenA, address tokenB) external returns (address) {
        address pair = address(new MockPair());
        pairs[tokenA][tokenB] = pair;
        pairs[tokenB][tokenA] = pair;
        return pair;
    }
}

contract MockPair is IUniswapV2Pair {
    function token0() external pure returns (address) {
        return address(0);
    }
    
    function token1() external pure returns (address) {
        return address(0);
    }
    
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) {
        return (1e18, 1e18, uint32(block.timestamp));
    }
    
    function mint(address to) external pure returns (uint) {
        return 1e18;
    }
    
    function transfer(address to, uint value) external pure returns (bool) {
        return true;
    }
    
    function burn(address to) external pure returns (uint amount0, uint amount1) {
        return (1e18, 1e18);
    }
}