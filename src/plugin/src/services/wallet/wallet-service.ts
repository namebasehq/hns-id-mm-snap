import { getBIP44AddressKeyDeriver } from "@metamask/key-tree";
import { hexToBytes } from '@noble/hashes/utils';
import { bech32 } from '@scure/base';
import { blake2b } from 'blakejs';
import { SnapLogger } from '../../logger';
import { HandshakeRPC } from '../../hns-rpc';
import { AddressInfo, HandshakeAddress, WalletConfig } from "./types";

export class WalletService {
  private static instance: WalletService | null = null;
  private readonly logger = SnapLogger.getInstance();
  private readonly rpc: HandshakeRPC;

  private constructor(private readonly config: WalletConfig) {
    this.rpc = new HandshakeRPC('http://188.166.151.44:12037/', 'hs_f6d2e4a8c9b3719k5n2m4p7q8');
  }

  public static initialize(config: WalletConfig): void {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService(config);
    }
  }

  public static getInstance(): WalletService {
    if (!WalletService.instance) {
      throw new Error('WalletService must be initialized with config first');
    }
    return WalletService.instance;
  }

  private publicKeyToAddress(publicKey: Uint8Array): HandshakeAddress {
    const hash = blake2b(publicKey, undefined, 20);
    const version = 0;
    const words = bech32.toWords(hash);
    const address = bech32.encode(this.config.addressPrefix, [version, ...words]);

    if (!this.isValidAddress(address)) {
      throw new Error(`Invalid address generated: ${address}`);
    }

    return address;
  }

  private isValidAddress(address: HandshakeAddress): boolean {
    try {
      const { prefix, words } = bech32.decode(address);
      const version = words[0];
      const hash = bech32.fromWords(words.slice(1));
      const reencoded = bech32.encode(prefix, [version, ...bech32.toWords(hash)]);
      return reencoded === address;
    } catch (error) {
      this.logger.error('Invalid address', { address, error });
      return false;
    }
  }

  public async getAddressInfo(address: HandshakeAddress): Promise<AddressInfo> {
    try {
      const info = await this.rpc.getAddressInfo(address);
     // const history = await this.rpc.getAddressHistory(address);

      return {
        address,
        balance: info.balance,
        unspentTx: info.unspentTxs
      };
    } catch (error: any) {
      this.logger.error('Error fetching address info', { address, error: error?.message });
      return { address, balance: 0, unspentTx: [] };
    }
  }

  public async deriveAddresses(startIndex: number, count: number): Promise<AddressInfo[]> {
    try {
      const entropy = await snap.request({
        method: 'snap_getBip44Entropy',
        params: { coinType: this.config.coinType },
      });

      const deriveAddress = await getBIP44AddressKeyDeriver(entropy);
      const addresses: AddressInfo[] = [];

      for (let i = startIndex; i < startIndex + count; i++) {
        const derived = await deriveAddress(i);
        this.logger.info('Derived new address', { 
          index: i,
          publicKey: derived.publicKey
        });

        const publicKeyBytes = hexToBytes(derived.publicKey.replace('0x', ''));
        const address = this.publicKeyToAddress(publicKeyBytes);
        
        const addressInfo = await this.getAddressInfo(address);
        this.logger.debug('Fetched address info', { address, addressInfo });
        addresses.push(addressInfo);
      }

      return addresses;
    } catch (error) {
      this.logger.error('Error deriving addresses', { error });
      throw error;
    }
  }

  public async sign(params: {
    fromAddress: string;
    toAddress: string;
    amount: number;
  }): Promise<string> {
    // TODO: Implement transaction signing logic
    // 1. Get UTXOs for fromAddress
    // 2. Create transaction with inputs and outputs
    // 3. Sign with private key
    // 4. Return signed transaction hex
    throw new Error('Not implemented');
  }
  
  public async broadcast(signedTx: string): Promise<string> {
    // TODO: Implement transaction broadcasting
    // 1. Use HandshakeRPC to broadcast transaction
    // 2. Return transaction hash
    throw new Error('Not implemented');
  }

  public formatAmount(amount: number, decimals: number = 6): string {
    return `${amount.toFixed(decimals)} ${this.config.addressPrefix.toUpperCase()}`;
  }
}
