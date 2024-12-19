import { SnapLogger } from "./logger";
import { sha256 } from "@noble/hashes/sha256";
import * as secp256k1 from "@noble/secp256k1";

interface TransactionInput {
  txid: string;
  vout: number;
  sequence: number;
  witness?: string[]; // Make witness optional and specify it's an array of strings
}

interface Transaction {
  version: number;
  inputs: TransactionInput[];
  outputs: {
    address: string;
    value: number;
  }[];
  locktime: number;
}

export class HandshakeRPC {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request(
    endpoint: string,
    method: string = "GET",
    body?: any
  ): Promise<any> {
    // Create Basic auth by base64 encoding "x:apiKey"
    const basicAuth = btoa(`x:${this.apiKey}`);

    const headers: HeadersInit = {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, options);
    if (!response.ok) {
      throw new Error(
        `HNS RPC Error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async getAddressInfo(address: string): Promise<{
    balance: number;
    unspentTxs: Array<any>;
  }> {
    const unspentTxs = await this.request(`/coin/address/${address}`);

    const balance =
      unspentTxs.reduce((acc: number, utxo: any) => acc + utxo.value, 0) / 1e6;
    const logger = SnapLogger.getInstance();

    return {
      balance,
      unspentTxs,
    };
  }

  async getBlock(hash: string): Promise<any> {
    return this.request(`/block/${hash}`);
  }

  async getBestBlockHash(): Promise<string> {
    return this.request("/chain/tip");
  }

  async getMempool(): Promise<Array<string>> {
    return this.request("/mempool");
  }

  async broadcastTx(rawTx: string): Promise<string> {
    return this.request("/broadcast", "POST", { tx: rawTx });
  }

  async getAddressHistory(address: string, limit: number = 10): Promise<any[]> {
    return this.request(`/address/${address}/history?limit=${limit}`);
  }

  async getFeeEstimate(blocks: number = 1): Promise<number> {
    return this.request(`/fee?blocks=${blocks}`);
  }

  async getName(name: string): Promise<any> {
    return this.request(`/name/${name}`);
  }

  async getAddressUTXOs(address: string): Promise<
    Array<{
      hash: string; // Transaction hash
      index: number; // Output index in the transaction
      address: string; // Address that owns this UTXO
      value: number; // Amount in HNS (converted from dollaritos/mHNS)
      height: number; // Block height where this UTXO was created
      coinbase: boolean; // Whether this is a coinbase (mining reward) transaction
    }>
  > {
    const data = await this.request(`/coin/address/${address}`);

    return data.map((utxo: any) => ({
      hash: utxo.hash,
      index: utxo.index,
      address: utxo.address,
      value: utxo.value / 1e6, // Convert from dollaritos to HNS
      height: utxo.height,
      coinbase: utxo.coinbase || false,
    }));
  }

  // NEW TRANSACTION RELATED FUNCTIONS BELOW

  async createAndBroadcastTransaction(params: {
    fromAddress: string;
    toAddress: string;
    amount: number; // Amount in HNS
    privateKey: string; // Private key in hex format
    fee?: number; // Optional fee in HNS
  }): Promise<string> {
    const logger = SnapLogger.getInstance();

    // Get UTXOs for the from address
    const utxos = await this.getAddressUTXOs(params.fromAddress);

    if (!utxos.length) {
      throw new Error("No UTXOs available for this address");
    }

    // Get fee estimate if not provided
    const feeRate = params.fee || (await this.getFeeEstimate(1));

    // Convert amounts to dollaritos (smallest unit)
    const amountDollaritos = Math.floor(params.amount * 1e6);

    // Select UTXOs and calculate change
    const selectedUtxos = [];
    let totalInput = 0;
    for (const utxo of utxos) {
      selectedUtxos.push(utxo);
      totalInput += utxo.value;
      if (totalInput >= amountDollaritos + feeRate) break;
    }

    if (totalInput < amountDollaritos + feeRate) {
      throw new Error("Insufficient funds");
    }

    const tx: Transaction = {
      version: 0,
      inputs: selectedUtxos.map((utxo) => ({
        txid: utxo.hash,
        vout: utxo.index,
        sequence: 0xffffffff,
      })),
      outputs: [
        {
          address: params.toAddress,
          value: amountDollaritos,
        },
      ],
      locktime: 0,
    };
    // Add change output if necessary
    const change = totalInput - amountDollaritos - feeRate;
    if (change > 0) {
      tx.outputs.push({
        address: params.fromAddress,
        value: change,
      });
    }

    for (let i = 0; i < tx.inputs.length; i++) {
      const sigHash = this.createSignatureHash(tx, i, selectedUtxos[i].value);
      const signature = await secp256k1.sign(sigHash, params.privateKey);

      // Convert the signature to Uint8Array first
      const signatureBytes = new Uint8Array([
        ...signature.toCompactRawBytes(),
        0x01,
      ]); // Adding SIGHASH_ALL

      tx.inputs[i].witness = [
        Buffer.from(signatureBytes).toString("hex"),
        params.privateKey,
      ];
    }

    // Serialize transaction
    const rawTx = this.serializeTransaction(tx);

    try {
      // Broadcast the signed transaction
      const txHash = await this.broadcastTx(rawTx);
      logger.debug("Transaction broadcast successfully");

      return txHash;
    } catch (error: any) {
      logger.error("Failed to broadcast transaction:", error);
      throw error;
    }
  }

  private createSignatureHash(
    tx: any,
    inputIndex: number,
    inputAmount: number
  ): Buffer {
    // This is a simplified version - needs proper implementation following Handshake protocol
    const preimage = Buffer.concat([
      Buffer.from(tx.version.toString(16).padStart(8, "0"), "hex"),
      Buffer.from(this.hashPrevouts(tx)),
      Buffer.from(this.hashSequence(tx)),
      Buffer.from(tx.inputs[inputIndex].txid, "hex").reverse(),
      Buffer.from(
        tx.inputs[inputIndex].vout.toString(16).padStart(8, "0"),
        "hex"
      ),
      // Add script code
      Buffer.from(inputAmount.toString(16).padStart(16, "0"), "hex"),
      Buffer.from(
        tx.inputs[inputIndex].sequence.toString(16).padStart(8, "0"),
        "hex"
      ),
      Buffer.from(this.hashOutputs(tx)),
      Buffer.from(tx.locktime.toString(16).padStart(8, "0"), "hex"),
      Buffer.from("01000000", "hex"), // SIGHASH_ALL
    ]);

    return Buffer.from(sha256(sha256(preimage)));
  }

  private hashPrevouts(tx: any): Buffer {
    // Implement prevouts hashing following Handshake protocol
    return Buffer.alloc(32);
  }

  private hashSequence(tx: any): Buffer {
    // Implement sequence hashing following Handshake protocol
    return Buffer.alloc(32);
  }

  private hashOutputs(tx: any): Buffer {
    // Implement outputs hashing following Handshake protocol
    return Buffer.alloc(32);
  }

  private serializeTransaction(tx: any): string {
    // Implement transaction serialization following Handshake protocol
    // This should return the raw transaction hex
    return "";
  }
}
