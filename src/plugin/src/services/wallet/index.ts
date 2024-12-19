export * from './types';
export * from './wallet-service';


export const HANDSHAKE_CONFIG = {
  coinType: 5353,
  pathPrefix: "m/44'/5353'/0'/0/",
  addressPrefix: 'hs'
} as const;