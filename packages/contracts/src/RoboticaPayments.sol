// SPDX-License-Identifier: MIT
pragma solidity >=0.8.25;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract RoboticaPayments {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public signerAddress;
    uint256 public entryFee;
    mapping(address => uint256) private _nonces;
    mapping(uint256 => mapping(address => bool)) public playerInGame;

    event PlayerEntered(uint256 indexed gameId, address indexed player);
    event PrizeClaimed(
        uint256 indexed gameId,
        address indexed player,
        uint256 amount
    );

    constructor(address _signerAddress, uint256 _entryFee) {
        require(_entryFee > 0, "Entry fee must be greater than zero");
        signerAddress = _signerAddress;
        entryFee = _entryFee;
    }

    function enterGame(
        uint256 gameId,
        bytes memory signature
    ) external payable {
        require(msg.value == entryFee, "Must send exact entry fee");
        require(!playerInGame[gameId][msg.sender], "Signature already used");
        
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender,
                gameId,
                "ENTER",
                address(this),
                _getNonce(msg.sender)
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        require(
            ECDSA.recover(ethSignedMessageHash, signature) == signerAddress,
            "Invalid signature"
        );

        playerInGame[gameId][msg.sender] = true;
        _incrementNonce(msg.sender);

        emit PlayerEntered(gameId, msg.sender);
    }

    function claimPrize(
        uint256 gameId,
        uint256 amount,
        bytes memory signature
    ) external {
        require(amount > 0, "Prize amount must be greater than zero");
        require(playerInGame[gameId][msg.sender], "Not in this game");

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                msg.sender,
                gameId,
                amount,
                "CLAIM",
                address(this),
                _getNonce(msg.sender)
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        require(
            ECDSA.recover(ethSignedMessageHash, signature) == signerAddress,
            "Invalid signature"
        );

        _incrementNonce(msg.sender);

        emit PrizeClaimed(gameId, msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }

    function _getNonce(address account) internal view returns (uint256) {
        return _nonces[account];
    }

    function _incrementNonce(address account) internal {
        _nonces[account]++;
    }

    function getNonce(address account) external view returns (uint256) {
        return _nonces[account];
    }
}
