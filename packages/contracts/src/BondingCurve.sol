// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BondingCurve is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant PRECISION = 1e18;
    uint256 public constant INITIAL_PRICE = 0.001 ether;
    uint256 public constant PRICE_INCREMENT = 0.0001 ether;
    
    event TokensPurchased(address indexed buyer, uint256 amountPurchased, uint256 ethSpent);
    event TokensSold(address indexed seller, uint256 amountSold, uint256 ethReceived);

    constructor() ERC20("Bonding Curve Token", "BCT") Ownable(msg.sender) {}

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
    
    // Remove the refund and keep all ETH in the contract
    uint256 ethSpent = msg.value - remainingETH;
    _mint(msg.sender, tokensToBuy);
    
    emit TokensPurchased(msg.sender, tokensToBuy, ethSpent);
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

    receive() external payable {}
}