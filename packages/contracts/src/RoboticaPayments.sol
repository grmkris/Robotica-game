// SPDX-License-Identifier: MIT
pragma solidity >=0.8.25;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract RoboticaPayments {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public signerAddress;
    uint256 public entryFee;
    mapping(bytes32 => bool) public usedEnterSignatures;
    mapping(bytes32 => bool) public usedClaimSignatures;

    constructor(address _signerAddress, uint256 _entryFee) {
        require(_entryFee > 0, "Entry fee must be greater than zero");
        signerAddress = _signerAddress;
        entryFee = _entryFee;
    }

    // Players need signature to enter
    function enterGame(bytes memory signature) external payable {
        require(msg.value == entryFee, "Must send exact entry fee");

        bytes32 messageHash = keccak256(
            abi.encodePacked(msg.sender, "ENTER", address(this))
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Check signature validity first
        require(
            ECDSA.recover(ethSignedMessageHash, signature) == signerAddress,
            "Invalid signature"
        );

        // Then check if it's been used
        require(
            !usedEnterSignatures[ethSignedMessageHash],
            "Signature already used"
        );

        usedEnterSignatures[ethSignedMessageHash] = true;
        // Emit event or additional logic
    }

    function claimPrize(uint256 amount, bytes memory signature) external {
        require(amount > 0, "Prize amount must be greater than zero");

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender,
                amount,
                "CLAIM",
                address(this),
                _getNonce(msg.sender)
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Check signature validity first
        require(
            ECDSA.recover(ethSignedMessageHash, signature) == signerAddress,
            "Invalid signature"
        );

        // Then check if it's been used
        require(
            !usedClaimSignatures[ethSignedMessageHash],
            "Signature already used"
        );

        usedClaimSignatures[ethSignedMessageHash] = true;
        _incrementNonce(msg.sender);
        payable(msg.sender).transfer(amount);
    }

    // Add nonce tracking
    mapping(address => uint256) private _nonces;

    function _getNonce(address account) internal view returns (uint256) {
        return _nonces[account];
    }

    function _incrementNonce(address account) internal {
        _nonces[account]++;
    }

    // Add view function to get current nonce for an address
    function getNonce(address account) external view returns (uint256) {
        return _nonces[account];
    }
}
