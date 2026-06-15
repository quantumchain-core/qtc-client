// qtc-client/src/hex.ts
// Hex <-> bytes/bigint helpers, matching the "0x..." format used by
// qc-node's JSON-RPC (src/rpc/methods.rs: hex0x, u64_to_hex, u128_to_hex).

export type Hex = `0x${string}`;

export function toHex(bytes: Uint8Array): Hex {
  let out = '0x';
  for (const b of bytes) {
    out += b.toString(16).padStart(2, '0');
  }
  return out as Hex;
}

export function fromHex(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error(`hex string must have even length: ${hex}`);
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

/** Parse a "0x..." hex string (as returned by eth_getBalance, eth_blockNumber, etc.) to a bigint. */
export function hexToBigInt(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  return clean.length === 0 ? 0n : BigInt('0x' + clean);
}

/** Format a bigint as a "0x..." hex string, matching qc-node's u64_to_hex/u128_to_hex (no leading zeros). */
export function bigIntToHex(v: bigint): Hex {
  if (v < 0n) throw new Error('bigIntToHex: negative values not supported');
  return ('0x' + v.toString(16)) as Hex;
}

/** Validate a 32-byte ("0x" + 64 hex chars) address string. */
export function isAddress(hex: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hex);
}
