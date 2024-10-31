import {
  createPublicClient,
  namehash,
  http,
  zeroAddress,
  getAddress,
} from "viem";
import { normalize } from "viem/ens";
import { optimism, mainnet } from "viem/chains";
import abi from "./abi.json";

export const publicClient = createPublicClient({
  chain: optimism,
  transport: http(),
});

export const l1PublicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

type AddressResponse = {
  protocol: "hns.id" | "ENS";
  address: string;
};

export const getAddr = async (
  domain: string | undefined,
  coinType: bigint = 60n
): Promise<AddressResponse | undefined> => {
  if (!domain) return;

  const node = namehash(domain);

  try {
    const address = (await publicClient.readContract({
      address: "0xDDa56f06D80f3D8E3E35159701A63753f39c3BCB",
      abi,
      functionName: "addr",
      args: [node, coinType],
    })) as string;

    return { address, protocol: "hns.id" };
  } catch (error) {
    const address = await l1PublicClient.getEnsAddress({
      name: normalize(domain),
      strict: true,
    });
    return { address: address?.toString() ?? zeroAddress, protocol: "ENS" };
  }
};
