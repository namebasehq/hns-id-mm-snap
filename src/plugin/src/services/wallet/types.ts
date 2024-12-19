// src/services/wallet/types.ts
import type { Json } from "@metamask/snaps-sdk";
import type { JsonSerializable } from "../../base-interface";

export type HandshakeAddress = `${string}1${string}`;

interface Covenant {
    type: number;
    action: string;
    items: any[];  // not sure what type this is yet
  }
  
  interface UnspentTransaction {
    version: number;
    height: number;
    value: number;
    address: HandshakeAddress;
    covenant: Covenant;
    coinbase: boolean;
    hash: string;
    index: number;
  }
  
  export interface AddressInfo {
    address: HandshakeAddress;
    balance: number;
    unspentTx: UnspentTransaction[];
  }
  
  // Make SerializableAddressInfo use Json types
  export interface SerializableAddressInfo extends JsonSerializable {
    address: string;
    balance: number;
  }
  
  // Configuration for different chains/coins
  export interface WalletConfig {
    coinType: number;
    pathPrefix: string;
    addressPrefix: string;
  }
  
  // WalletState implementing JsonSerializable properly
  export interface WalletState extends JsonSerializable {
    addresses: SerializableAddressInfo[];  // Changed from Json[] to be more specific
    selectedIndex: number;
  }
  
  export const toSerializable = (info: AddressInfo): SerializableAddressInfo => ({
    address: info.address,
    balance: info.balance,

  });

  export const HANDSHAKE_CONFIG: WalletConfig = {
    coinType: 5353,
    pathPrefix: "m/44'/5353'/0'/0/",
    addressPrefix: 'hs'
  } as const;