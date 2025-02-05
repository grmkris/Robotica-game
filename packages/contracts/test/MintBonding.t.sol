// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "./forge-std/Test.sol";
import {ERC20} from "../src/ERC20.sol";
import {BondingCurve} from "../src/BondingCurve.sol";
import {StdUtils} from "lib/forge-std/src/StdUtils.sol";


// First, create a concrete implementation of the ERC20 token
contract TestToken is ERC20 {
    string private _name;
    string private _symbol;

    constructor(string memory tokenName, string memory tokenSymbol) {
        _name = tokenName;
        _symbol = tokenSymbol;
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    // Add a mint function for testing
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract BondingCurveTest is Test {
    TestToken public token;
    BondingCurve public bondingCurve;
    address public user;
    
    function setUp() public {
        // Create a test user address
        user = vm.addr(1); // Use a simple number as the private key
        
        // Deploy the test token
        token = new TestToken("Test Token", "TEST");
        
        // Deploy the bonding curve
        bondingCurve = new BondingCurve();
        
        // Mint some tokens to the user for testing
        token.mint(user, 1000 * 10**18);
        
        // Give the user some ETH for testing
        vm.deal(user, 100 ether);
    }

    function testInitialState() public {
        assertEq(bondingCurve.INITIAL_PRICE(), 0.001 ether);
        assertEq(bondingCurve.PRICE_INCREMENT(), 0.0001 ether);
        assertEq(bondingCurve.totalSupply(), 0);
    }

    function testBuyTokens() public {
        vm.startPrank(user);
        
        // Buy tokens with 1 ETH
        bondingCurve.buy{value: 1 ether}();
        
        // Assert the user received tokens
        assertTrue(bondingCurve.balanceOf(user) > 0);
        
        vm.stopPrank();
    }

    function testSellTokens() public {
        vm.startPrank(user);
        
        // First buy some tokens
        bondingCurve.buy{value: 1 ether}();
        uint256 initialBalance = bondingCurve.balanceOf(user);
        
        // Sell half of the tokens
        bondingCurve.sell(initialBalance / 2);
        
        // Assert the user's balance decreased
        assertEq(bondingCurve.balanceOf(user), initialBalance / 2);
        
        vm.stopPrank();
    }

    function testPriceIncreases() public {
        uint256 initialPrice = bondingCurve.getCurrentPrice(0);
        uint256 laterPrice = bondingCurve.getCurrentPrice(1000 * 10**18);
        
        assertTrue(laterPrice > initialPrice);
    }
}