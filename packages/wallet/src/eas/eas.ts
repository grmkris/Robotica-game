import type {
  OffchainAttestationParams,
  SchemaItem,
  SignedOffchainAttestation
} from "@ethereum-attestation-service/eas-sdk";
import {
  EAS,
  SchemaEncoder,
  SchemaRegistry,
} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers";
import type { PublicClient, WalletClient } from "viem";
import { getTransactionReceipt } from "viem/actions";
import { walletClientToSigner } from "./eas-viem.utils";

export const EASRegistryContractAddress = "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0"; // Sepolia v0.26
export const EASContractAddress = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e"; // Sepolia v0.26

// Custom timestamp schema - since it's not exported from the SDK anymore
export const TIMESTAMP_SCHEMA = "bytes32 hash";
export const TIMESTAMP_SCHEMA_UID = "0x5f0fdb4d2ab50f562d4e9ee507e9d92f9f7add2faa63f8d35c6d41c7f3c7d821";

// Add these constants at the top of the file with other constants
export const NAME_SCHEMA_UID = "0x44d562ac1d7cd77e232978687fea027ace48f719cf1d58c7888e509663bb87fc";
export const DESCRIPTION_SCHEMA = "string description";
export const DESCRIPTION_SCHEMA_UID = "0xb0ef096990e96b6827358fd2958f4da039b1e4e9b00aa6074549d50b0fd8c9a8";
export const CONTEXT_SCHEMA = "string context";
export const CONTEXT_SCHEMA_UID = "0x9c8e8c3ea0583314fe4766c7041a045897e384c086bea1a38fda2f2f46d9fbb0";

const eas = new EAS(EASContractAddress);
const provider = ethers.getDefaultProvider("sepolia");
eas.connect(provider);

export interface CreateAttestationParams {
  schema: string;
  schemaUID: string;
  recipient: string;
  expirationTime?: bigint;
  revocable?: boolean;
  refUID?: string;
  data: SchemaItem[];
}

export interface CreateSchemaParams {
  name: string;
  description: string;
  schema: string;
  context: string;
  resolverAddress?: string;
  revocable?: boolean;
}

export interface SchemaRegistrationResponse {
  schemaUID: string;
  transaction: string;
  metadataTransactions: {
    name?: string;
    description?: string;
    context?: string;
  };
}

export const createEasClient = (props: {
  walletClient: WalletClient
  publicClient: PublicClient
}) => {
  const { walletClient, publicClient } = props;

  eas.connect(walletClientToSigner(walletClient));
  const signer = walletClientToSigner(walletClient);

  const schemaRegistry = new SchemaRegistry(EASRegistryContractAddress).connect(signer); // Sepolia Schema Registry


  return {
    createOnchainAttestation: async ({
      schema,
      schemaUID,
      recipient,
      expirationTime = BigInt(0),
      revocable = true,
      refUID = "0x0000000000000000000000000000000000000000000000000000000000000000",
      data
    }: CreateAttestationParams) => {
      const schemaEncoder = new SchemaEncoder(schema);
      const encodedData = schemaEncoder.encodeData(data);

      const tx = await eas.attest({
        schema: schemaUID,
        data: {
          recipient,
          expirationTime,
          revocable,
          refUID,
          data: encodedData,
        },
      });

      return await tx.wait();
    },

    createOffchainAttestation: async ({
      schema,
      schemaUID,
      recipient,
      expirationTime = BigInt(0),
      revocable = true,
      refUID = "0x0000000000000000000000000000000000000000000000000000000000000000",
      data
    }: CreateAttestationParams): Promise<SignedOffchainAttestation> => {
      const schemaEncoder = new SchemaEncoder(schema);
      const encodedData = schemaEncoder.encodeData(data);

      const offchain = await eas.getOffchain();

      const attestationRequest: OffchainAttestationParams = {
        schema: schemaUID,
        recipient,
        time: BigInt(Math.floor(Date.now() / 1000)),
        expirationTime,
        revocable,
        refUID,
        data: encodedData,
      };

      const tx = await offchain.signOffchainAttestation(
        attestationRequest,
        walletClientToSigner(walletClient)
      );

      return tx;
    },

    createTimestamp: async (hash: string) => {
      const schemaEncoder = new SchemaEncoder(TIMESTAMP_SCHEMA);
      const encodedData = schemaEncoder.encodeData([
        { name: "hash", value: hash, type: "bytes32" }
      ]);

      const tx = await eas.attest({
        schema: TIMESTAMP_SCHEMA_UID,
        data: {
          recipient: "0x0000000000000000000000000000000000000000",
          expirationTime: BigInt(0),
          revocable: false,
          data: encodedData,
          refUID: "0x0000000000000000000000000000000000000000000000000000000000000000",
        },
      });

      return await tx.wait();
    },

    revokeAttestation: async (uid: string, schemaUID: string) => {
      const tx = await eas.revoke({
        schema: schemaUID,
        data: { uid },
      });

      return await tx.wait();
    },

    getAttestation: async (uid: string) => {
      return await eas.getAttestation(uid);
    },

    registerSchemaWithMetadata: async ({
      name,
      description,
      schema,
      context,
      resolverAddress = "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0",
      revocable = true,
    }: CreateSchemaParams): Promise<SchemaRegistrationResponse> => {
      const schema1 = "uint256 eventId, uint8 voteIndex";
      const resolverAddress2 = "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0"; // Sepolia 0.26
      const revocable3 = true;

      // Register the schema first
      console.log("Registering schema");
      const transaction = await schemaRegistry.contract.register(schema1, resolverAddress2, revocable3);

      console.log("Waiting for transaction receipt");
      const receipt = await transaction.wait();
      if (!receipt) throw new Error("Failed to get transaction receipt");

      const logs = await getTransactionReceipt(publicClient, { hash: receipt as `0x${string}` });

      // Get schema UID from the transaction receipt
      const schemaUID = logs?.[0]?.topics?.[1];
      if (!schemaUID) throw new Error("Failed to get schema UID from transaction receipt");

      const response: SchemaRegistrationResponse = {
        schemaUID,
        transaction: receipt,
        metadataTransactions: {}
      };

      // Create metadata attestations
      if (name) {
        const nameTx = await eas.attest({
          schema: NAME_SCHEMA_UID,
          data: {
            recipient: "0x0000000000000000000000000000000000000000",
            expirationTime: BigInt(0),
            revocable: true,
            refUID: schemaUID,
            data: new SchemaEncoder("string name").encodeData([
              { name: "name", value: name, type: "string" }
            ]),
          },
        });
        const nameReceipt = await nameTx.wait();
        if (nameReceipt) {
          response.metadataTransactions.name = nameReceipt;
        }
      }

      if (description) {
        const descriptionTx = await eas.attest({
          schema: DESCRIPTION_SCHEMA_UID,
          data: {
            recipient: "0x0000000000000000000000000000000000000000",
            expirationTime: BigInt(0),
            revocable: true,
            refUID: schemaUID,
            data: new SchemaEncoder(DESCRIPTION_SCHEMA).encodeData([
              { name: "description", value: description, type: "string" }
            ]),
          },
        });
        const descriptionReceipt = await descriptionTx.wait();
        if (descriptionReceipt) {
          response.metadataTransactions.description = descriptionReceipt;
        }
      }

      if (context) {
        const contextTx = await eas.attest({
          schema: CONTEXT_SCHEMA_UID,
          data: {
            recipient: "0x0000000000000000000000000000000000000000",
            expirationTime: BigInt(0),
            revocable: true,
            refUID: schemaUID,
            data: new SchemaEncoder(CONTEXT_SCHEMA).encodeData([
              { name: "context", value: context, type: "string" }
            ]),
          },
        });
        const contextReceipt = await contextTx.wait();
        if (contextReceipt) {
          response.metadataTransactions.context = contextReceipt;
        }
      }

      return response;
    },

    registerSchema: async ({
      schema,
      resolverAddress = "0x0000000000000000000000000000000000000000",
      revocable = true,
    }: CreateSchemaParams) => {
      const transaction = await schemaRegistry.register({
        schema,
        resolverAddress,
        revocable,
      });

      return await transaction.wait();
    },
  };
}
