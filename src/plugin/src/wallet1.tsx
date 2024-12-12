import { Box, Text, Heading, Button, Copyable, Divider, Section } from '@metamask/snaps-sdk/jsx';
import type { Json } from '@metamask/snaps-sdk';
import { getBIP44AddressKeyDeriver } from "@metamask/key-tree";
import { hexToBytes } from '@noble/hashes/utils';
import { HandshakeRPC } from './hns-rpc';
import { SnapLogger } from './logger';
import { bech32 } from '@scure/base';
import { blake2b } from 'blakejs';

const rpc = new HandshakeRPC('http://188.166.151.44:12037/', 'hs_f6d2e4a8c9b3719k5n2m4p7q8');
const logger = SnapLogger.getInstance();

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

const initialState: SnapState = {
  addresses: [],
  selectedIndex: 0,
};

export async function getState(): Promise<SnapState> {
  const state = await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get' },
  }) as Record<string, Json> | null;
  
  if (!state) {
    return initialState;
  }

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

interface WalletRequest {
  method: string;
  params?: {
    count?: number;
    [key: string]: any;
  };
}

async function getAddressBalance(address: string): Promise<{
  address: string;
  balance: number;
  unconfirmed: number;
}> {
  try {
    const info = await rpc.getAddressInfo(address);
    const test = await rpc.getAddressHistory(address);

    logger.debug(`${address} History:`, { test });
    return {
      address,
      balance: info.balance,
      unconfirmed: info.unconfirmedBalance,
    };
  } catch (error) {
    console.error(`Error fetching balance for ${address}:`, error);
    return {
      address,
      balance: 0,
      unconfirmed: 0,
    };
  }
}

function publicKeyToAddress(publicKey: Uint8Array): `${string}1${string}` {
  // Step 1: Hash the public key using Blake2b with a 20-byte output
  const hash = blake2b(publicKey, undefined, 20);

  // Step 2: Encode the hash into a Bech32 address
  const version = 0; // Handshake uses version 0 for standard addresses
  const words = bech32.toWords(hash);
  const address = bech32.encode('hs', [version, ...words]);

  if (!isValidHandshakeAddress(address)) {
    throw new Error(`Generated invalid Handshake address: ${address}`);
  }

  return address;
}

function isValidHandshakeAddress(address: `${string}1${string}`): boolean {
  try {
    const { prefix, words } = bech32.decode(address);
    const version = words[0];
    const hash = bech32.fromWords(words.slice(1));
    const reencoded = bech32.encode(prefix, [version, ...bech32.toWords(hash)]);
    return reencoded === address;
  } catch (error) {
    console.error('Invalid Handshake address:', address, error);
    return false;
  }
}

async function deriveAddresses(count: number): Promise<
  Array<{
    address: string;
    balance: number;
    unconfirmed: number;
  }>
> {
  try {
    // Get the Handshake coin_type node
    const hnsNode = await snap.request({
      method: 'snap_getBip44Entropy',
      params: {
        coinType: 5353,
      },
    });

    // Create the address deriver
    const deriveHNSAddress = await getBIP44AddressKeyDeriver(hnsNode);

    const addresses = [];
    for (let i = 0; i < count; i++) {
      // Derive the address key
      const derived = await deriveHNSAddress(i);

      logger.info(`Derived address ${i}:`, {
        publicKey: derived.publicKey,
        privateKey: derived.privateKey,
        address: derived.address
      });
      // Convert hex string public key to Uint8Array
      const publicKeyBytes = hexToBytes(derived.publicKey.replace('0x', ''));
      const address = publicKeyToAddress(publicKeyBytes);
      
      if (!isValidHandshakeAddress(address)) {
        throw new Error(`Invalid Handshake address generated: ${address}`);
      }

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
  const HNS_PATH = "m/44'/5353'/0'/0/";
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
      ui: getWalletInterface(state),
    },
  });
  logger.debug('Interface updated');
}

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