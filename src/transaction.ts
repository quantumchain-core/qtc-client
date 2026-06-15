// qtc-client/src/transaction.ts
// Serialize a signed transaction into the exact byte layout qc-node's
// `Transaction` struct expects for eth_sendRawTransaction
// (bincode::deserialize on the Rust side).
//
// Field order matches src/mempool/mod.rs:
//   hash, from, to, value, nonce, base_fee, priority_fee, gas_limit,
//   signature, received_at
//
// bincode 1.x defaults used by qc-node:
//   - fixed-size arrays ([u8;32]) -> raw bytes, NO length prefix
//   - Vec<u8> (signature)         -> 8-byte little-endian length prefix + raw bytes
//   - integers (u64)               -> 8-byte little-endian, fixed width

import { sha256 } from '@noble/hashes/sha256';

export const DILITHIUM2_SIG_LEN = 2420;
const ADDRESS_LEN = 32;
const HASH_LEN = 32;

export interface UnsignedTransaction {
  from: Uint8Array;   // 32 bytes (Address)
  to: Uint8Array;     // 32 bytes (Address)
  value: bigint;
  nonce: bigint;
  baseFee: bigint;
  priorityFee: bigint;
  gasLimit: bigint;
}

export interface SignedTransaction extends UnsignedTransaction {
  hash: Uint8Array;       // 32 bytes — see computeTxHash() notes below
  signature: Uint8Array;  // Dilithium2, 2420 bytes
  receivedAt: bigint;     // see README — qc-node currently stores whatever is sent
}

function writeU64LE(value: bigint): Uint8Array {
  if (value < 0n || value > 0xffffffffffffffffn) {
    throw new Error(`value out of u64 range: ${value}`);
  }
  const buf = new Uint8Array(8);
  let v = value;
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return buf;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/**
 * SHA256 over the fields that define a transaction's intent
 * (from, to, value, nonce, baseFee, priorityFee, gasLimit — all the
 * UnsignedTransaction fields, in struct order, u64s as 8-byte LE).
 *
 * IMPORTANT: this is a CONVENTION, not something qc-node currently
 * verifies. The mempool uses `tx.hash` only as a dedup/lookup key and
 * does not check it against the other fields. See README "Open questions"
 * for why this matters and what a future qc-node change might do.
 */
export function computeTxHash(tx: UnsignedTransaction): Uint8Array {
  if (tx.from.length !== ADDRESS_LEN) throw new Error('from must be 32 bytes');
  if (tx.to.length !== ADDRESS_LEN) throw new Error('to must be 32 bytes');

  return sha256(
    concat([
      tx.from,
      tx.to,
      writeU64LE(tx.value),
      writeU64LE(tx.nonce),
      writeU64LE(tx.baseFee),
      writeU64LE(tx.priorityFee),
      writeU64LE(tx.gasLimit),
    ])
  );
}

/**
 * Serialize a fully-signed transaction to the exact bincode layout
 * qc-node's `Transaction` struct expects. The result is what gets
 * hex-encoded and passed to eth_sendRawTransaction.
 */
export function serializeTransaction(tx: SignedTransaction): Uint8Array {
  if (tx.hash.length !== HASH_LEN) throw new Error('hash must be 32 bytes');
  if (tx.from.length !== ADDRESS_LEN) throw new Error('from must be 32 bytes');
  if (tx.to.length !== ADDRESS_LEN) throw new Error('to must be 32 bytes');

  const sigLenPrefix = writeU64LE(BigInt(tx.signature.length));

  return concat([
    tx.hash,
    tx.from,
    tx.to,
    writeU64LE(tx.value),
    writeU64LE(tx.nonce),
    writeU64LE(tx.baseFee),
    writeU64LE(tx.priorityFee),
    writeU64LE(tx.gasLimit),
    sigLenPrefix,
    tx.signature,
    writeU64LE(tx.receivedAt),
  ]);
}
