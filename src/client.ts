// qtc-client/src/client.ts
// QtcClient — thin JSON-RPC 2.0 wrapper around qc-node's HTTP endpoint.
// Works in Node.js, Cloudflare Workers, and browser (uses fetch).

import { hexToBigInt, toHex, Hex } from './hex';
import { BlockJson, TransactionJson, Account } from './types';
import { SignedTransaction, serializeTransaction } from './transaction';

export interface QtcClientOptions {
  /** qc-node RPC URL, e.g. "http://localhost:8545" */
  url: string;
  /** Optional fetch implementation (defaults to globalThis.fetch) */
  fetch?: typeof fetch;
}

let _id = 0;

export class QtcClient {
  private url: string;
  private fetch: typeof fetch;

  constructor(opts: QtcClientOptions) {
    this.url = opts.url;
    this.fetch = opts.fetch ?? globalThis.fetch;
  }

  private async call<T>(method: string, params: unknown[] = []): Promise<T> {
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: ++_id,
    });

    const res = await this.fetch(this.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${this.url}`);
    }

    const json = await res.json() as {
      result?: T;
      error?: { code: number; message: string };
    };

    if (json.error) {
      throw new Error(`RPC error ${json.error.code}: ${json.error.message}`);
    }

    return json.result as T;
  }

  /** eth_chainId — returns the chain id as a bigint. */
  async chainId(): Promise<bigint> {
    const hex = await this.call<string>('eth_chainId');
    return hexToBigInt(hex);
  }

  /** eth_blockNumber — returns current block height as a bigint. */
  async blockNumber(): Promise<bigint> {
    const hex = await this.call<string>('eth_blockNumber');
    return hexToBigInt(hex);
  }

  /**
   * eth_getBalance — returns the balance of `address` in nano-QTC.
   * `address` must be a "0x" + 64 hex char string (32 bytes).
   */
  async getBalance(address: Hex): Promise<bigint> {
    const hex = await this.call<string>('eth_getBalance', [address]);
    return hexToBigInt(hex);
  }

  /** eth_getTransactionCount — returns the nonce of `address`. */
  async getTransactionCount(address: Hex): Promise<bigint> {
    const hex = await this.call<string>('eth_getTransactionCount', [address]);
    return hexToBigInt(hex);
  }

  /** Fetch both balance and nonce in two parallel calls. */
  async getAccount(address: Hex): Promise<Account> {
    const [balance, nonce] = await Promise.all([
      this.getBalance(address),
      this.getTransactionCount(address),
    ]);
    return { balance, nonce };
  }

  /**
   * eth_getBlockByNumber — returns a block or null if not found.
   * `number` is a bigint (block height).
   */
  async getBlockByNumber(number: bigint): Promise<BlockJson | null> {
    const hex = '0x' + number.toString(16);
    return this.call<BlockJson | null>('eth_getBlockByNumber', [hex]);
  }

  /**
   * eth_sendRawTransaction — serialize and submit a signed transaction.
   * Returns the tx hash as a Hex string.
   */
  async sendRawTransaction(tx: SignedTransaction): Promise<Hex> {
    const bytes = serializeTransaction(tx);
    const hex = toHex(bytes);
    return this.call<Hex>('eth_sendRawTransaction', [hex]);
  }
}
