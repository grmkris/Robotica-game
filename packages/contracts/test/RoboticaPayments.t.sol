// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.25;

import {Test} from "forge-std/src/Test.sol";
import {console2} from "forge-std/src/console2.sol";
import {RoboticaPayments} from "../src/RoboticaPayments.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract RoboticaPaymentsTest is Test {
    RoboticaPayments internal payments;
    address internal signer;
    uint256 internal signerPrivateKey;
    uint256 internal constant ENTRY_FEE = 0.1 ether;

    function setUp() public virtual {
        // Generate a signer key pair
        signerPrivateKey = 0xA11CE;
        signer = vm.addr(signerPrivateKey);

        // Deploy contract
        payments = new RoboticaPayments(signer, ENTRY_FEE);
    }

    // ======== Constructor Tests ========
    function test_Constructor() public view {
        assertEq(payments.signerAddress(), signer, "Incorrect signer address");
        assertEq(payments.entryFee(), ENTRY_FEE, "Incorrect entry fee");
    }

    // ======== Enter Game Tests ========
    function test_EnterGame_Success() public {
        // Setup test account with enough ETH
        address player = makeAddr("player");
        vm.deal(player, ENTRY_FEE);

        // Generate valid signature for player
        bytes memory signature = _generateEnterGameSignature(player);

        // Enter game as player
        vm.prank(player);
        payments.enterGame{value: ENTRY_FEE}(1, signature);

        // Assert contract balance increased
        assertEq(
            address(payments).balance,
            ENTRY_FEE,
            "Contract balance should equal entry fee"
        );
    }

    function test_EnterGame_IncorrectFee() public {
        // Setup test account
        address player = makeAddr("player");
        vm.deal(player, ENTRY_FEE);

        // Generate valid signature
        bytes memory signature = _generateEnterGameSignature(player);

        // Try to enter with incorrect fee
        vm.prank(player);
        vm.expectRevert("Must send exact entry fee");
        payments.enterGame{value: ENTRY_FEE - 0.01 ether}(1, signature);
    }

    function test_EnterGame_UsedSignature() public {
        // Setup test account
        address player = makeAddr("player");
        vm.deal(player, ENTRY_FEE * 2); // Give enough for two attempts

        // Generate signature
        bytes memory signature = _generateEnterGameSignature(player);

        // First entry should succeed
        vm.prank(player);
        payments.enterGame{value: ENTRY_FEE}(1, signature);

        // Second entry with same signature should fail
        vm.prank(player);
        vm.expectRevert("Signature already used");
        payments.enterGame{value: ENTRY_FEE}(1, signature);
    }

    function test_EnterGame_InvalidSignature() public {
        // Setup test account
        address player = makeAddr("player");
        vm.deal(player, ENTRY_FEE);

        // Generate invalid signature (just some random bytes)
        bytes memory invalidSignature = abi.encodePacked(
            bytes32(uint256(0x1234)),
            bytes32(uint256(0x5678)),
            uint8(27)
        );

        // Attempt to enter with invalid signature
        vm.prank(player);
        vm.expectRevert("Invalid signature");
        payments.enterGame{value: ENTRY_FEE}(1, invalidSignature);
    }

    function test_EnterGame_WrongSigner() public {
        // Setup test account
        address player = makeAddr("player");
        vm.deal(player, ENTRY_FEE);

        // Generate signature with wrong private key
        uint256 wrongPrivateKey = 0xB0B;
        vm.prank(player);

        bytes32 messageHash = keccak256(
            abi.encodePacked(player, "ENTER", address(payments))
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            wrongPrivateKey,
            ethSignedMessageHash
        );
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        // Attempt to enter with wrong signature
        vm.expectRevert("Invalid signature");
        payments.enterGame{value: ENTRY_FEE}(1, wrongSignature);
    }

    function test_EnterGame_WrongContract() public {
        // Setup test account
        address player = makeAddr("player");
        vm.deal(player, ENTRY_FEE);

        // Deploy a second contract instance
        RoboticaPayments otherContract = new RoboticaPayments(
            signer,
            ENTRY_FEE
        );

        // Generate signature for the other contract
        bytes32 messageHash = keccak256(
            abi.encodePacked(player, "ENTER", address(otherContract))
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerPrivateKey,
            ethSignedMessageHash
        );
        bytes memory wrongContractSignature = abi.encodePacked(r, s, v);

        // Attempt to use signature meant for other contract
        vm.prank(player);
        vm.expectRevert("Invalid signature");
        payments.enterGame{value: ENTRY_FEE}(1, wrongContractSignature);
    }

    // ======== Claim Prize Tests ========
    function test_ClaimPrize_Success() public {
        // Setup test account and prize amount
        address winner = makeAddr("winner");
        uint256 prizeAmount = 0.5 ether;

        // Fund contract with prize amount
        vm.deal(address(payments), prizeAmount);

        // Generate valid signature for prize claim
        bytes memory signature = _generateClaimPrizeSignature(
            winner,
            prizeAmount
        );

        // Record initial balances
        uint256 initialContractBalance = address(payments).balance;
        uint256 initialWinnerBalance = winner.balance;

        // Claim prize as winner
        vm.prank(winner);
        payments.claimPrize(1, prizeAmount, signature);

        // Assert balances changed correctly
        assertEq(
            address(payments).balance,
            initialContractBalance - prizeAmount,
            "Contract balance should decrease by prize amount"
        );
        assertEq(
            winner.balance,
            initialWinnerBalance + prizeAmount,
            "Winner balance should increase by prize amount"
        );
    }

    function test_ClaimPrize_UsedSignature() public {
        // Setup test account and prize amount
        address winner = makeAddr("winner");
        uint256 prizeAmount = 0.5 ether;
        vm.deal(address(payments), prizeAmount * 2); // Fund for two potential claims

        // Generate signature for initial nonce (0)
        bytes memory signature = _generateClaimPrizeSignature(
            winner,
            prizeAmount
        );

        // First claim should succeed
        vm.prank(winner);
        payments.claimPrize(1, prizeAmount, signature);

        // Second claim with same signature should fail because nonce has increased
        vm.prank(winner);
        vm.expectRevert("Invalid signature");
        payments.claimPrize(1, prizeAmount, signature);
    }

    function test_ClaimPrize_InvalidSignature() public {
        // Setup test account and prize amount
        address winner = makeAddr("winner");
        uint256 prizeAmount = 0.5 ether;
        vm.deal(address(payments), prizeAmount);

        // Generate invalid signature (random bytes)
        bytes memory invalidSignature = abi.encodePacked(
            bytes32(uint256(0x1234)),
            bytes32(uint256(0x5678)),
            uint8(27)
        );

        // Attempt to claim with invalid signature
        vm.prank(winner);
        vm.expectRevert("Invalid signature");
        payments.claimPrize(1, prizeAmount, invalidSignature);
    }

    function test_ClaimPrize_WrongSigner() public {
        // Setup test account and prize amount
        address winner = makeAddr("winner");
        uint256 prizeAmount = 0.5 ether;
        vm.deal(address(payments), prizeAmount);

        // Generate signature with wrong private key
        uint256 wrongPrivateKey = 0xB0B;
        bytes32 messageHash = keccak256(
            abi.encodePacked(winner, prizeAmount, "CLAIM", address(payments))
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            wrongPrivateKey,
            ethSignedMessageHash
        );
        bytes memory wrongSignature = abi.encodePacked(r, s, v);

        // Attempt to claim with wrong signature
        vm.prank(winner);
        vm.expectRevert("Invalid signature");
        payments.claimPrize(1, prizeAmount, wrongSignature);
    }

    function test_ClaimPrize_InsufficientBalance() public {
        // Setup test account and prize amount
        address winner = makeAddr("winner");
        uint256 prizeAmount = 1 ether;

        // Deliberately underfund the contract
        vm.deal(address(payments), prizeAmount - 0.1 ether);

        // Generate valid signature
        bytes memory signature = _generateClaimPrizeSignature(
            winner,
            prizeAmount
        );

        // Attempt to claim more than contract balance
        vm.prank(winner);
        vm.expectRevert(); // This matches the low-level revert from transfer()
        payments.claimPrize(1, prizeAmount, signature);
    }

    function test_ClaimPrize_WrongAmount() public {
        // Setup test account
        address winner = makeAddr("winner");
        uint256 signedAmount = 0.5 ether;
        uint256 attemptedAmount = 1 ether;
        vm.deal(address(payments), attemptedAmount);

        // Generate signature for smaller amount
        bytes memory signature = _generateClaimPrizeSignature(
            winner,
            signedAmount
        );

        // Attempt to claim larger amount
        vm.prank(winner);
        vm.expectRevert("Invalid signature");
        payments.claimPrize(1, attemptedAmount, signature);
    }

    function test_ClaimPrize_WrongContract() public {
        // Setup test account and prize amount
        address winner = makeAddr("winner");
        uint256 prizeAmount = 0.5 ether;
        vm.deal(address(payments), prizeAmount);

        // Deploy a second contract instance
        RoboticaPayments otherContract = new RoboticaPayments(
            signer,
            ENTRY_FEE
        );

        // Generate signature for other contract
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                winner,
                prizeAmount,
                "CLAIM",
                address(otherContract)
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerPrivateKey,
            ethSignedMessageHash
        );
        bytes memory wrongContractSignature = abi.encodePacked(r, s, v);

        // Attempt to use signature meant for other contract
        vm.prank(winner);
        vm.expectRevert("Invalid signature");
        payments.claimPrize(1, prizeAmount, wrongContractSignature);
    }

    // ======== Integration Tests ========
    function test_Integration_EnterAndClaim() public {
        // Setup test account
        address player = makeAddr("player");
        vm.deal(player, ENTRY_FEE);
        uint256 prizeAmount = 0.2 ether;

        // Enter game
        bytes memory enterSignature = _generateEnterGameSignature(player);
        vm.prank(player);
        payments.enterGame{value: ENTRY_FEE}(1, enterSignature);

        // Fund contract for prize
        vm.deal(address(payments), prizeAmount);

        // Claim prize
        bytes memory claimSignature = _generateClaimPrizeSignature(
            player,
            prizeAmount
        );
        vm.prank(player);
        payments.claimPrize(1, prizeAmount, claimSignature);

        assertEq(player.balance, prizeAmount, "Prize not received correctly");
    }

    function test_Integration_MultiplePlayers() public {
        // Setup players
        address[] memory players = new address[](3);
        for (uint i = 0; i < 3; i++) {
            players[i] = makeAddr(string.concat("player", vm.toString(i)));
            vm.deal(players[i], ENTRY_FEE);
        }

        // All players enter
        for (uint i = 0; i < 3; i++) {
            bytes memory signature = _generateEnterGameSignature(players[i]);
            vm.prank(players[i]);
            payments.enterGame{value: ENTRY_FEE}(1, signature);
        }

        assertEq(
            address(payments).balance,
            ENTRY_FEE * 3,
            "Contract balance should equal total entry fees"
        );
    }

    function test_Integration_MultipleClaims() public {
        // Setup winner
        address winner = makeAddr("winner");
        uint256 prizeAmount = 0.1 ether;

        // Fund contract for multiple prizes
        vm.deal(address(payments), prizeAmount * 3);

        // Make multiple claims with different signatures
        for (uint i = 0; i < 3; i++) {
            bytes memory signature = _generateClaimPrizeSignature(
                winner,
                prizeAmount
            );
            vm.prank(winner);
            payments.claimPrize(1, prizeAmount, signature);
        }

        assertEq(
            winner.balance,
            prizeAmount * 3,
            "Winner should receive all prizes"
        );
    }

    // ======== Edge Cases ========
    function test_EdgeCase_ZeroEntryFee() public {
        // Try to deploy contract with zero entry fee
        vm.expectRevert("Entry fee must be greater than zero");
        new RoboticaPayments(signer, 0);
    }

    function test_EdgeCase_ZeroPrize() public {
        // Setup winner
        address winner = makeAddr("winner");

        // Try to claim zero prize
        bytes memory signature = _generateClaimPrizeSignature(winner, 0);
        vm.prank(winner);
        vm.expectRevert("Prize amount must be greater than zero");
        payments.claimPrize(1, 0, signature);
    }

    function test_EdgeCase_LargePrize() public {
        // Setup winner
        address winner = makeAddr("winner");
        uint256 largeAmount = 1000 ether;

        // Fund contract with large amount
        vm.deal(address(payments), largeAmount);

        // Claim large prize
        bytes memory signature = _generateClaimPrizeSignature(
            winner,
            largeAmount
        );
        vm.prank(winner);
        payments.claimPrize(1, largeAmount, signature);

        assertEq(
            winner.balance,
            largeAmount,
            "Winner should receive large prize"
        );
    }

    function test_EdgeCase_SignatureReplay() public {
        // Setup player/winner
        address player = makeAddr("player");
        vm.deal(player, ENTRY_FEE);
        uint256 prizeAmount = ENTRY_FEE;

        // Generate signatures
        bytes memory enterSig = _generateEnterGameSignature(player);
        bytes memory claimSig = _generateClaimPrizeSignature(
            player,
            prizeAmount
        );

        // Enter game
        vm.prank(player);
        payments.enterGame{value: ENTRY_FEE}(1, enterSig);

        // Try to reuse enter signature for claim
        vm.prank(player);
        vm.expectRevert("Invalid signature");
        payments.claimPrize(1, prizeAmount, enterSig);

        // Try to use claim signature for enter
        vm.deal(player, ENTRY_FEE);
        vm.prank(player);
        vm.expectRevert("Invalid signature");
        payments.enterGame{value: ENTRY_FEE}(1, claimSig);
    }

    // ======== Helper Functions ========
    function _generateEnterGameSignature(
        address player
    ) internal view returns (bytes memory) {
        // Add gameId (using 1 as default for tests)
        uint256 gameId = 1;

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                player,
                gameId,
                "ENTER",
                address(payments),
                payments.getNonce(player)
            )
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerPrivateKey,
            ethSignedMessageHash
        );
        return abi.encodePacked(r, s, v);
    }

    function _generateClaimPrizeSignature(
        address winner,
        uint256 amount
    ) internal view returns (bytes memory) {
        // Add gameId (using 1 as default for tests)
        uint256 gameId = 1;

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                winner,
                gameId,
                amount,
                "CLAIM",
                address(payments),
                payments.getNonce(winner)
            )
        );

        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(
            messageHash
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerPrivateKey,
            ethSignedMessageHash
        );
        return abi.encodePacked(r, s, v);
    }
}
