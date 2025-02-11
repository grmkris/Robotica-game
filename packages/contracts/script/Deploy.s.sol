// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.25 <0.9.0;

import {RoboticaPayments} from "../src/RoboticaPayments.sol";
import {BaseScript} from "./Base.s.sol";

/// @dev See the Solidity Scripting tutorial: https://book.getfoundry.sh/tutorials/solidity-scripting
contract Deploy is BaseScript {
    function run() public broadcast returns (RoboticaPayments payments) {
        // Read deployment parameters from environment variables
        address signerAddress = vm.envOr("SIGNER_ADDRESS", broadcaster);
        uint256 entryFee = vm.envOr("ENTRY_FEE", 0.1 ether);

        // Deploy the contract
        payments = new RoboticaPayments(signerAddress, entryFee);
    }
}
