// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./forge-std/Test.sol";
import "../src/BondingCurve.sol";
import "../src/interfaces/IBondingCurve.sol";
import "lib/forge-std/src/console.sol";


contract BondingCurveTest is Test {
    BondingCurve public bondingCurve;
    address public owner;
    address public buyer1;
    address public buyer2;

    uint256 public constant PRECISION = 1e18;
    uint256 public constant INITIAL_PRICE = 0.001 ether;
    uint256 public constant PRICE_INCREMENT = 0.0001 ether;

    event TokensPurchased(address indexed buyer, uint256 amountPurchased, uint256 ethSpent);
    event TokensSold(address indexed seller, uint256 amountSold, uint256 ethReceived);

    function setUp() public {
        owner = address(this);
        buyer1 = vm.addr(1);
        buyer2 = vm.addr(2);
        
        // Give the buyers enough ETH
        vm.deal(buyer1, 100 ether);
        vm.deal(buyer2, 100 ether);

        bondingCurve = new BondingCurve();
    }
    // Add this helper function to your test contract
function bound(uint256 x, uint256 min, uint256 max) internal pure returns (uint256) {
    require(min <= max, "Min greater than max");
    uint256 size = max - min + 1;

    if (size == 0) {
        return min;
    }

    if (x >= min && x <= max) {
        return x;
    }

    x = x % size;
    return x + min;
}

    function test_Deployment() public {
        assertEq(bondingCurve.owner(), owner);
        assertEq(bondingCurve.name(), "Bonding Curve Token");
        assertEq(bondingCurve.symbol(), "BCT");
        assertEq(bondingCurve.totalSupply(), 0);
    }

    function testFuzz_PriceCalculation(uint256 supply) public {
        supply = bound(supply, 0, 1e24);
        uint256 price = bondingCurve.getCurrentPrice(supply);
        assertGe(price, INITIAL_PRICE);
        
        if (supply > 0) {
            uint256 expectedPrice = INITIAL_PRICE + (supply * PRICE_INCREMENT / PRECISION);
            assertEq(price, expectedPrice);
        }
    }

    function test_BuyTokens() public {
        uint256 buyAmount = INITIAL_PRICE;
        
        vm.prank(buyer1);
        vm.expectEmit(true, true, true, true);
        emit TokensPurchased(buyer1, PRECISION, buyAmount);
        bondingCurve.buy{value: buyAmount}();
        
        assertEq(bondingCurve.balanceOf(buyer1), PRECISION);
    }
    function test_SellTokens() public {
        uint256 buyAmount = 0.002 ether; // Buy with more ETH to ensure contract has funds
        vm.startPrank(buyer1);
        bondingCurve.buy{value: buyAmount}();
        
        uint256 tokenBalance = bondingCurve.balanceOf(buyer1);
        console.log("Initial Token Balance:", tokenBalance);
        console.log("Contract ETH Balance:", address(bondingCurve).balance);
        
        uint256 sellAmount = PRECISION;
        uint256 expectedReturn = bondingCurve.calculateSaleReturn(sellAmount);
        uint256 balanceBeforeSale = buyer1.balance;
        
        console.log("Expected Return:", expectedReturn);
        
        vm.expectEmit(true, true, true, true);
        emit TokensSold(buyer1, sellAmount, expectedReturn);
        bondingCurve.sell(sellAmount);
        
        assertEq(bondingCurve.balanceOf(buyer1), 0, "Should have no tokens left");
        assertEq(buyer1.balance - balanceBeforeSale, expectedReturn, "Should receive correct ETH amount");
        vm.stopPrank();
    }

    function test_SellTokensPartial() public {
        uint256 buyAmount = 0.003 ether; // More ETH to ensure contract has funds
        vm.startPrank(buyer1);
        bondingCurve.buy{value: buyAmount}();
        
        uint256 tokenBalance = bondingCurve.balanceOf(buyer1);
        console.log("Initial Token Balance:", tokenBalance);
        console.log("Contract ETH Balance:", address(bondingCurve).balance);
        
        uint256 sellAmount = PRECISION;
        uint256 expectedReturn = bondingCurve.calculateSaleReturn(sellAmount);
        uint256 balanceBeforeSale = buyer1.balance;
        
        console.log("Selling Amount:", sellAmount);
        console.log("Expected Return:", expectedReturn);
        
        vm.expectEmit(true, true, true, true);
        emit TokensSold(buyer1, sellAmount, expectedReturn);
        bondingCurve.sell(sellAmount);
        
        assertEq(
            bondingCurve.balanceOf(buyer1), 
            tokenBalance - sellAmount, 
            "Should have correct tokens left"
        );
        assertEq(
            buyer1.balance - balanceBeforeSale, 
            expectedReturn, 
            "Should receive correct ETH amount"
        );
        vm.stopPrank();
    }
}

contract ReentrancyAttacker {
    bool public attempted;
    address payable public target;
    
    function attack(address _bondingCurve) external payable {
        target = payable(_bondingCurve);
        IBondingCurve(target).buy{value: 0.001 ether}();
    }
    
    receive() external payable {
        if (!attempted) {
            attempted = true;
            IBondingCurve(target).sell(1e18);
        }
    }
}

contract EthRejecter {
    receive() external payable {
        revert("Cannot receive ETH");
    }
    
    fallback() external payable {
        revert("Cannot receive ETH");
    }
}