// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.25 <0.9.0;

import {RoboticaPayments} from "../src/RoboticaPayments.sol";
import {BaseScript} from "./Base.s.sol";
import {console2} from "forge-std/src/console2.sol";

contract DeployRobotica is BaseScript {
    function run() public broadcast returns (RoboticaPayments payments) {
        // Read deployment parameters from environment variables
        address signerAddress = vm.envAddress("SIGNER_ADDRESS");
        uint256 entryFee = vm.envUint("ENTRY_FEE");

        // Validate parameters
        require(signerAddress != address(0), "Invalid signer address");
        require(entryFee > 0, "Entry fee must be greater than 0");

        console2.log("Deploying RoboticaPayments with parameters:");
        console2.log("- Deployer:", broadcaster);
        console2.log("- Signer:", signerAddress);
        console2.log("- Entry fee:", entryFee);

        // Deploy the contract
        payments = new RoboticaPayments(signerAddress, entryFee);

        // Log deployment info
        console2.log("\nDeployment successful!");
        console2.log("RoboticaPayments deployed to:", address(payments));
    }
}
