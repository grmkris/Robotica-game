// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./forge-std/Test.sol";
import "lib/forge-std/src/console.sol";
import "../src/BondingCurveWithUniswap.sol";
import "lib/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "lib/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "lib/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";

contract BondingCurveWithUniswapTest is Test {
    BondingCurveWithUniswap public bondingCurve;
    address public owner;
    address public buyer1;
    
    // Uniswap addresses (Mainnet)
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11FE88;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    
    // Mock contracts
    MockFactory public mockFactory;
    MockPositionManager public mockPositionManager;
    MockWETH public mockWETH;
    
    function setUp() public {
        owner = address(this);
        buyer1 = vm.addr(1);
        vm.deal(buyer1, 100 ether);
        
        // Deploy mock contracts
        mockFactory = new MockFactory();
        mockPositionManager = new MockPositionManager();
        mockWETH = new MockWETH();
        
        // Deploy bonding curve with mock addresses
        bondingCurve = new BondingCurveWithUniswap(
            address(mockFactory),
            address(mockPositionManager),
            address(mockWETH)
        );
    }
    
    function test_DeploymentWithUniswap() public {
        assertEq(address(bondingCurve.uniswapFactory()), address(mockFactory));
        assertEq(address(bondingCurve.nonfungiblePositionManager()), address(mockPositionManager));
        assertEq(bondingCurve.WETH(), address(mockWETH));
        assertFalse(bondingCurve.poolDeployed());
    }
    
    function test_DeployUniswapPool() public {
        uint256 initialTokens = 1000 * 1e18;
        
        vm.startPrank(owner);
        bondingCurve.deployUniswapPool(initialTokens);
        vm.stopPrank();
        
        assertTrue(bondingCurve.poolDeployed());
        assertNotEq(address(bondingCurve.uniswapPool()), address(0));
        assertEq(bondingCurve.balanceOf(address(bondingCurve)), initialTokens);
        assertEq(bondingCurve.tokenId(), 1); // Mock token ID
    }
    
    function test_InitialLiquidityRange() public {
        uint256 initialTokens = 1000 * 1e18;
        
        vm.startPrank(owner);
        bondingCurve.deployUniswapPool(initialTokens);
        vm.stopPrank();
        
        // Verify token approval
        assertEq(bondingCurve.balanceOf(address(bondingCurve)), initialTokens);
        
        // Verify NFT minting
        assertEq(bondingCurve.tokenId(), 1);
    }

    function testFail_DeployPoolTwice() public {
        uint256 initialTokens = 1000 * 1e18;
        
        vm.startPrank(owner);
        bondingCurve.deployUniswapPool(initialTokens);
        // Should fail on second deployment
        bondingCurve.deployUniswapPool(initialTokens);
        vm.stopPrank();
    }

    function testFail_DeployPoolNotOwner() public {
        uint256 initialTokens = 1000 * 1e18;
        
        vm.prank(buyer1);
        bondingCurve.deployUniswapPool(initialTokens);
    }

    function testFail_DeployPoolZeroTokens() public {
        vm.prank(owner);
        bondingCurve.deployUniswapPool(0);
    }
}

contract MockFactory {
    address public lastPool;
    
    function createPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external returns (address pool) {
        pool = address(new MockPool(tokenA, tokenB, fee));
        lastPool = pool;
        return pool;
    }
}

contract MockPool is IUniswapV3Pool {
    uint160 public constant MOCK_SQRT_PRICE_X96 = 79228162514264337593543950336; // 1.0 price
    address public immutable factory;
    address public immutable token0;
    address public immutable token1;
    uint24 public immutable fee;
    int24 public immutable tickSpacing;
    uint128 public immutable maxLiquidityPerTick;
    
    constructor(address _token0, address _token1, uint24 _fee) {
        factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
        tickSpacing = 60;
        maxLiquidityPerTick = 100000;
    }

    function initialize(uint160 sqrtPriceX96) external {
        // Mock initialization
    }

    function slot0() external pure returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    ) {
        return (
            MOCK_SQRT_PRICE_X96,
            0,
            0,
            0,
            0,
            0,
            true
        );
    }

    function mint(
        address recipient,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount,
        bytes calldata data
    ) external returns (uint256 amount0, uint256 amount1) {
        return (0, 0);
    }

    function burn(
        int24 tickLower,
        int24 tickUpper,
        uint128 amount
    ) external returns (uint256 amount0, uint256 amount1) {
        return (0, 0);
    }

    function collect(
        address recipient,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount0Requested,
        uint128 amount1Requested
    ) external returns (uint128 amount0, uint128 amount1) {
        return (0, 0);
    }

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1) {
        return (0, 0);
    }

    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external {
    }

    function increaseObservationCardinalityNext(uint16 observationCardinalityNext) external {
    }

    function observe(uint32[] calldata secondsAgos) external view returns (
        int56[] memory tickCumulatives,
        uint160[] memory secondsPerLiquidityCumulativeX128s
    ) {
        tickCumulatives = new int56[](secondsAgos.length);
        secondsPerLiquidityCumulativeX128s = new uint160[](secondsAgos.length);
    }

    function snapshotCumulativesInside(
        int24 tickLower,
        int24 tickUpper
    ) external view returns (
        int56 tickCumulativeInside,
        uint160 secondsPerLiquidityInsideX128,
        uint32 secondsInside
    ) {
        return (0, 0, 0);
    }

    function feeGrowthGlobal0X128() external view returns (uint256) {
        return 0;
    }

    function feeGrowthGlobal1X128() external view returns (uint256) {
        return 0;
    }

    function protocolFees() external view returns (uint128 token0, uint128 token1) {
        return (0, 0);
    }

    function liquidity() external view returns (uint128) {
        return 0;
    }

    function ticks(int24 tick) external view returns (
        uint128 liquidityGross,
        int128 liquidityNet,
        uint256 feeGrowthOutside0X128,
        uint256 feeGrowthOutside1X128,
        int56 tickCumulativeOutside,
        uint160 secondsPerLiquidityOutsideX128,
        uint32 secondsOutside,
        bool initialized
    ) {
        return (0, 0, 0, 0, 0, 0, 0, false);
    }

    function tickBitmap(int16 wordPosition) external view returns (uint256) {
        return 0;
    }

    function positions(bytes32 key) external view returns (
        uint128 _liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0,
        uint128 tokensOwed1
    ) {
        return (0, 0, 0, 0, 0);
    }

    function observations(uint256) external pure returns (
        uint32 blockTimestamp,
        int56 tickCumulative,
        uint160 secondsPerLiquidityCumulativeX128,
        bool initialized
    ) {
        return (0, 0, 0, false);
    }

    function setFeeProtocol(uint8 feeProtocol0, uint8 feeProtocol1) external {
    }

    function collectProtocol(
        address recipient,
        uint128 amount0Requested,
        uint128 amount1Requested
    ) external returns (uint128 amount0, uint128 amount1) {
        return (0, 0);
    }
}

contract MockPositionManager {
    uint256 public tokenIdCounter = 1;
    
    function mint(INonfungiblePositionManager.MintParams calldata params)
        external
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        tokenId = tokenIdCounter++;
        liquidity = 1000;
        amount0 = params.amount0Desired;
        amount1 = params.amount1Desired;
    }
}

contract MockWETH {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function deposit() external payable {
        balanceOf[msg.sender] += msg.value;
    }
    
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}