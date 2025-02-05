// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../forge-std/Test.sol";
import "./TestPlus.sol";
import "./mocks/MockERC20.sol";

contract SoladyTest is Test, TestPlus {
    /// @dev Alias for `_hem`.
    function _bound(uint256 x, uint256 min, uint256 max) internal pure virtual returns (uint256) {
        return _hem(x, min, max);
    }
    /// @dev Parameters for the bonding curve
    struct BondingCurveParams {
        uint256 basePrice;      // Initial price in wei
        uint256 priceMultiplier; // Rate of price increase
        uint256 supplyLimit;    // Maximum supply allowed
    }

    /// @dev Calculates token price based on current supply using bonding curve
    /// @param currentSupply Current token supply
    /// @param params Bonding curve parameters
    /// @return price Price in wei for minting 1 token
    function calculateBondingCurvePrice(
        uint256 currentSupply,
        BondingCurveParams memory params
    ) internal pure returns (uint256 price) {
        require(currentSupply < params.supplyLimit, "Supply limit reached");
        
        // Linear bonding curve: price = basePrice + (currentSupply * priceMultiplier)
        price = params.basePrice + (currentSupply * params.priceMultiplier);
    }

    /// @dev Calculates total cost for minting multiple tokens
    /// @param amount Amount of tokens to mint
    /// @param currentSupply Current token supply
    /// @param params Bonding curve parameters
    /// @return totalCost Total cost in wei
    function calculateTotalMintingCost(
        uint256 amount,
        uint256 currentSupply,
        BondingCurveParams memory params
    ) internal pure returns (uint256 totalCost) {
        require(currentSupply + amount <= params.supplyLimit, "Exceeds supply limit");
        
        // For each token being minted, calculate its individual price and sum
        for (uint256 i = 0; i < amount; i++) {
            totalCost += calculateBondingCurvePrice(currentSupply + i, params);
        }
    }

    /// @dev Simulates minting tokens using bonding curve pricing
    /// @param token ERC20 token to mint
    /// @param to Address to mint tokens to
    /// @param amount Amount of tokens to mint
    /// @param params Bonding curve parameters
    /// @return cost Total cost of minting
    function mintWithBondingCurve(
        MockERC20 token,
        address to,
        uint256 amount,
        BondingCurveParams memory params
    ) internal returns (uint256 cost) {
        uint256 currentSupply = token.totalSupply();
        cost = calculateTotalMintingCost(amount, currentSupply, params);
        
        // Ensure the recipient has enough ETH to pay for minting
        vm.deal(to, cost);
        
        // Simulate the payment
        vm.prank(to);
        (bool success,) = address(token).call{value: cost}("");
        require(success, "Payment failed");
        
        // Mint the tokens
        token.mint(to, amount);
        
        emit TokensMinted(to, amount, cost);
    }

    /// @dev Event emitted when tokens are minted using bonding curve
    event TokensMinted(address indexed to, uint256 amount, uint256 cost);

    /// @dev Helper to create default bonding curve parameters
    function getDefaultBondingCurveParams() internal pure returns (BondingCurveParams memory) {
        return BondingCurveParams({
            basePrice: 0.001 ether,      // Initial price of 0.001 ETH
            priceMultiplier: 0.0001 ether, // Price increases by 0.0001 ETH per token
            supplyLimit: 1000000         // Maximum supply of 1 million tokens
        });
    }

}