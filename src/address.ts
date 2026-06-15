// qtc-client/src/address.ts
// Derive a QTC address from a Dilithium2 public key.
//
// Matches qc-node's consensus::registry::address_from_pubkey:
//   address = SHA3-256(pubkey)   (32 bytes, FIPS 202)
//
// Dilithium2 public keys are 1312 bytes (see crypto module, M1 — locked).

import { sha3_256 } from '@noble/hashes/sha3';
import { toHex, Hex } from './hex';

export const DILITHIUM2_PUBKEY_LEN = 1312;

/**
 * Derive a 32-byte QTC address ("0x" + 64 hex chars) from a Dilithium2
 * public key. Throws if the key isn't 1312 bytes.
 */
export function addressFromPubkey(pubkey: Uint8Array): Hex {
  if (pubkey.length !== DILITHIUM2_PUBKEY_LEN) {
    throw new Error(
      `Dilithium2 pubkey must be ${DILITHIUM2_PUBKEY_LEN} bytes, got ${pubkey.length}`
    );
  }
  return toHex(sha3_256(pubkey));
}
