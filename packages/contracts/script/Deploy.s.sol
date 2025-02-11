// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.25 <0.9.0;

import {RoboticaPayments} from "../src/RoboticaPayments.sol";
import {BaseScript} from "./Base.s.sol";

/// @dev See the Solidity Scripting tutorial: https://book.getfoundry.sh/tutorials/solidity-scripting
contract Deploy is BaseScript {
    function run() public broadcast returns (RoboticaPayments payments) {
        // Read deployment parameters from environment variables
        address signerAddress = vm.envAddress("SIGNER_ADDRESS");
        uint256 entryFee = vm.envUint("ENTRY_FEE");

        // If environment variables are not set, use default values
        if (signerAddress == address(0)) signerAddress = broadcaster;
        if (entryFee == 0) entryFee = 0.1 ether;

        // Deploy the contract
        payments = new RoboticaPayments(signerAddress, entryFee);
    }
}
