// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IBondingCurve {
    function buy() external payable;
    function sell(uint256 amount) external;
    function calculateSaleReturn(uint256 amount) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}