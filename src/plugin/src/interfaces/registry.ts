// src/interfaces/registry.ts
import { WalletInterface } from './wallet';
import { DropdownWalletInterface } from './dropdown-wallet';
import { SendTransaction } from './send-transaction';

export const interfaceRegistry = {
  wallet: () => WalletInterface.getInstance(),
  dropdownWallet: () => DropdownWalletInterface.getInstance(),
  sendTransaction: () => SendTransaction.getInstance(),
} as const;

export type InterfaceType = keyof typeof interfaceRegistry;