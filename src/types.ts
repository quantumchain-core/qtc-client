// qtc-client/src/types.ts
// TypeScript types matching the JSON shapes returned by qc-node's RPC
// (src/rpc/methods.rs: block_to_json, tx_to_json). All numeric fields
// come back as "0x..." hex strings.

import { Hex } from './hex';

/** Shape of a transaction as embedded in eth_getBlockByNumber results. */
export interface TransactionJson {
  hash: Hex;
  from: Hex;
  to: Hex;
  value: Hex;
  nonce: Hex;
  baseFee: Hex;
  priorityFee: Hex;
  gasLimit: Hex;
}

/** Shape returned by eth_getBlockByNumber (header fields flattened + transactions). */
export interface BlockJson {
  number: Hex;
  parentHash: Hex;
  slot: Hex;
  timestamp: Hex;
  proposer: Hex;
  txRoot: Hex;
  stateRoot: Hex;
  baseFee: Hex;
  gasUsed: Hex;
  gasLimit: Hex;
  signature: Hex;
  transactions: TransactionJson[];
}

/** Decoded account state (eth_getBalance + eth_getTransactionCount combined). */
export interface Account {
  balance: bigint;
  nonce: bigint;
}
