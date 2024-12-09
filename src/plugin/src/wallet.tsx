import { Box, Text, Heading, Button, Copyable, Divider, Section } from '@metamask/snaps-sdk/jsx';
import type { Json } from '@metamask/snaps-sdk';
import { HDKey } from '@scure/bip32';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';
import { HandshakeRPC } from './hns-rpc';
import { SnapLogger } from './logger';

const rpc = new HandshakeRPC(' http://188.166.151.44:12037/', 'hs_f6d2e4a8c9b3719k5n2m4p7q8');
// Get logger instance
const logger = SnapLogger.getInstance();

// Define state interface
type JsonSerializable = {
  [x: string]: Json;
};

type SnapState = JsonSerializable & {
  addresses: Array<{
    address: string;
    balance: number;
    unconfirmed: number;
  }>;
  selectedIndex: number;
};

// Initial state
const initialState: SnapState = {
  addresses: [] as Array<{
    address: string;
    balance: number;
    unconfirmed: number;
  }>,
  selectedIndex: 0
};

// State management functions
export async function getState(): Promise<SnapState> {
  const state = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  }) as Record<string, Json> | null;
  
  if (!state) {
    return initialState;
  }

  // Type guard to verify the shape of the state
  const isValidState = (state: Record<string, Json>): state is SnapState => {
    return (
      Array.isArray(state.addresses) &&
      state.addresses.every(addr => 
        typeof (addr as any).address === 'string' &&
        typeof (addr as any).balance === 'number' &&
        typeof (addr as any).unconfirmed === 'number'
      ) &&
      typeof state.selectedIndex === 'number'
    );
  };

  return isValidState(state) ? state : initialState;
}

export async function setState(newState: Partial<SnapState>): Promise<void> {
  const currentState = await getState();
  const updatedState = { ...currentState, ...newState } as Record<string, Json>;
  await snap.request({
    method: 'snap_manageState',
    params: { operation: 'update', newState: updatedState },
  });
}

// Rest of the interfaces
export interface WalletRequest {
  method: string;
  params?: {
    count?: number;
    [key: string]: any;
  };
}

interface BIP32Response {
  privateKey: string;
  publicKey: string;
  chainCode: string;
}

// Constants
const HNS_PATH = "m/44'/5353'/0'/0/";
const HNS_VERSION = 0x00;
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Utility functions
function base58check(data: Uint8Array, version: number): string {
  const payload = new Uint8Array(data.length + 1);
  payload[0] = version;
  payload.set(data, 1);

  const hash = sha256(sha256(payload));
  const checksum = hash.slice(0, 4);

  const final = new Uint8Array(payload.length + 4);
  final.set(payload);
  final.set(checksum, payload.length);

  let str = '';
  let num = BigInt(0);
  for (let i = 0; i < final.length; i++) {
    num = num * BigInt(256) + BigInt(final[i]);
  }

  while (num > BigInt(0)) {
    const rem = Number(num % BigInt(58));
    str = ALPHABET[rem] + str;
    num = num / BigInt(58);
  }

  for (let i = 0; i < final.length && final[i] === 0; i++) {
    str = ALPHABET[0] + str;
  }

  return 'hs1' + str;
}

function publicKeyToAddress(publicKey: Uint8Array): string {
  const sha = sha256(publicKey);
  const hash = ripemd160(sha);
  return base58check(hash, HNS_VERSION);
}

async function getAddressBalance(address: string): Promise<{
  address: string;
  balance: number;
  unconfirmed: number;
}> {
  try {
    const info = await rpc.getAddressInfo(address);
    return {
      address,
      balance: info.balance,
      unconfirmed: info.unconfirmedBalance
    };
  } catch (error) {
    console.error(`Error fetching balance for ${address}:`, error);
    return {
      address,
      balance: 0,
      unconfirmed: 0
    };
  }
}

async function deriveAddresses(count: number): Promise<Array<{
  address: string;
  balance: number;
  unconfirmed: number;
}>> {
  try {
    const response = (await snap.request({
      method: 'snap_getBip32Entropy',
      params: {
        path: ['m', "44'", "5353'"],
        curve: 'secp256k1',
      },
    })) as unknown as BIP32Response;

    const privateKey = hexToBytes(response.privateKey.slice(2));
    const hdKey = HDKey.fromMasterSeed(privateKey);
    
    const addresses = [];
    for (let i = 0; i < count; i++) {
      const path = `${HNS_PATH}${i}`;
      const child = hdKey.derive(path);
      if (!child.publicKey) {
        throw new Error('Failed to derive public key');
      }
      
      const address = publicKeyToAddress(child.publicKey);
      const balance = await getAddressBalance(address);
      addresses.push(balance);
    }
    
    return addresses;
  } catch (error) {
    console.error('Error deriving addresses:', error);
    throw error;
  }
}

function formatHNS(amount: number): string {
  return `${amount.toFixed(6)} HNS`;
}

// UI Components
function getSummaryPanel(addresses: Array<{ balance: number; unconfirmed: number }>) {
  const totalBalance = addresses.reduce((sum, addr) => sum + addr.balance, 0);
  const totalUnconfirmed = addresses.reduce((sum, addr) => sum + addr.unconfirmed, 0);
  
  return (
    <Section>
      <Heading>Summary</Heading>
      <Text>Total Balance: {formatHNS(totalBalance)}</Text>
      {totalUnconfirmed > 0 && (
        <Text color="warning">Pending: {formatHNS(totalUnconfirmed)}</Text>
      )}
    </Section>
  );
}

function getAddressPanel(address: {
  address: string;
  balance: number;
  unconfirmed: number;
}, index: number) {
  return (
    <Section>
      <Text>Address:</Text>
      <Copyable value={address.address} />
      <Text>Balance: {formatHNS(address.balance)}</Text>
      {address.unconfirmed > 0 && (
        <Text color="warning">Pending: {formatHNS(address.unconfirmed)}</Text>
      )}
      <Text color="muted">Path: {HNS_PATH + index}</Text>
    </Section>
  );
}

// Modified interface handlers
function getWalletInterface(state: SnapState) {
  const selected = state.addresses[state.selectedIndex];
  
  return (
    <Box>
      <Heading>HNS Wallet</Heading>
      <Divider />
      {getSummaryPanel(state.addresses)}
      <Divider />
      <Box direction="horizontal" alignment="center">
        <Button
          name="prev-address"
          disabled={state.selectedIndex === 0}
        >
          Previous
        </Button>
        <Button
          name="next-address"
          disabled={state.selectedIndex === state.addresses.length - 1}
        >
          Next
        </Button>
      </Box>
      {getAddressPanel(selected, state.selectedIndex)}
    </Box>
  );
}

export async function createWalletInterface(state: SnapState) {
  const interfaceId = await snap.request({
    method: "snap_createInterface",
    params: {
      ui: getWalletInterface(state)
    },
  });

  return interfaceId;
}

export async function updateWalletInterface(id: string, state: SnapState) {
  await snap.request({
    method: "snap_updateInterface",
    params: {
      id,
      ui: getWalletInterface(state)
    },
  });
  logger.debug('Interface updated');
 
}

// Handler for button clicks
export async function handleUserInput(buttonName: string, interfaceId: string) {
  const state = await getState();

  switch (buttonName) {
    case 'prev-address':
      if (state.selectedIndex > 0) {
        await setState({ selectedIndex: state.selectedIndex - 1 });
      }
      break;
    case 'next-address':
      if (state.selectedIndex < state.addresses.length - 1) {
        await setState({ selectedIndex: state.selectedIndex + 1 });
      }
      break;
  }

  // Get updated state and update the interface
  const newState = await getState();
  return updateWalletInterface(interfaceId, newState);
}

export async function showWalletInterface(addressCount?: number) {
  logger.debug('Showing wallet interface', { addressCount });
  try {
    const state = await getState();
    logger.debug('Current state:', state);
    
    if (state.addresses.length === 0 && addressCount) {
      logger.debug('Deriving new addresses');
      const newAddresses = await deriveAddresses(addressCount);
      await setState({ addresses: newAddresses });
      state.addresses = newAddresses;
    }

    const interfaceId = await createWalletInterface(state);
     await updateWalletInterface(interfaceId, state);

     return snap.request({
      method: "snap_dialog",
      params: {
        type: "alert",
        id: interfaceId,
      },
    });
  } catch (error) {
    logger.error('Error in wallet interface:', { error });
    throw error;
  }
}

export async function handleWalletRequest(request: WalletRequest) {
  switch (request.method) {
    case 'wallet_getAddresses':
      return showWalletInterface(request.params?.count);
    default:
      throw new Error('Wallet method not found.');
  }
}