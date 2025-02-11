// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.25 <0.9.0;

import {RoboticaPayments} from "../src/RoboticaPayments.sol";
import {BaseScript} from "./Base.s.sol";
import {console2} from "forge-std/src/console2.sol";

contract DeployRobotica is BaseScript {
    function run() public broadcast returns (RoboticaPayments payments) {
        // Read deployment parameters from environment variables
        address signerAddress = vm.envOr({
            name: "SIGNER_ADDRESS",
            defaultValue: broadcaster
        });
        uint256 entryFee = vm.envOr({
            name: "ENTRY_FEE",
            defaultValue: uint256(0.1 ether)
        });

        // Deploy the contract
        payments = new RoboticaPayments(signerAddress, entryFee);

        // Log deployment info
        console2.log("RoboticaPayments deployed to:", address(payments));
        console2.log("Signer address:", signerAddress);
        console2.log("Entry fee:", entryFee);
    }
}
