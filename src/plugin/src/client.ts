import {
  createPublicClient,
  namehash,
  http,
  zeroAddress,
} from "viem";
import { normalize } from "viem/ens";
import { optimism, mainnet } from "viem/chains";
import abi from "./abi.json";
import { getChainInfoByCoinType } from "./utils";

export const publicClient = createPublicClient({
  chain: optimism,
  transport: http(),
});

export const l1PublicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

type AddressResponse = {
  protocol: `hns.id - ${string}` | `ENS - ${string}`;
  address: string;
};

const RESOLVER_ADDRESS = "0xDDa56f06D80f3D8E3E35159701A63753f39c3BCB";

export const getAddr = async (
  domain: string | undefined,
  coinType: number = 60
): Promise<AddressResponse | undefined> => {
  if (!domain) return;

  const node = namehash(normalize(domain));

  const chain = getChainInfoByCoinType(coinType);

  try {
    const address = (await publicClient.readContract({
      address: RESOLVER_ADDRESS,
      abi,
      functionName: "addr",
      args: [node, coinType],
    })) as string;

    return { address, protocol: `hns.id - ${chain?.name}` };
  } catch (error) {
    const address = await l1PublicClient.getEnsAddress({
      name: normalize(domain),
      coinType,
      strict: true,
    });

    // we include this because metamask does not support CCIP domains outside of mainnet
    return { address: address?.toString() ?? zeroAddress, protocol: `ENS - ${chain?.name}` };
  }
};

export const getName = async (
  address: `0x${string}` | undefined,
  coinType: number = 60
): Promise<string | undefined> => {
  if (!address) return;

  const chain = getChainInfoByCoinType(coinType);

  try {
    const name = (await publicClient.readContract({
      address: RESOLVER_ADDRESS,
      abi,
      functionName: "getName",
      args: [address, coinType],
    })) as string;

    return name;
  } catch (error) {
    return undefined;
  }
}
