import type { OnNameLookupHandler } from "@metamask/snaps-sdk";
import { getAddr, getName } from "./client";
import { chainInfo } from "./utils";

export const onNameLookup: OnNameLookupHandler = async (request) => {
  try {
    const chain = chainInfo[request.chainId];
    const data = await getAddr(request.domain, chain.coinType);

    // For domain resolution (when user types a name)
    if (request.domain && data) {
      return {
        resolvedAddresses: [
          {
            resolvedAddress: data.address,
            protocol: data.protocol,
            domainName: request.domain,
          },
        ],
      };
    }

    // // For reverse resolution (when user enters an address)
    if (request.address) {
      const resolvedDomain = await getName(
        request.address as `0x${string}`,
        chain.coinType
      );

      return {
        resolvedDomains: [
          {
            resolvedDomain: resolvedDomain || '',
            protocol: "hns.id",
          }
        ],
      };
    }
  } catch (error) {
    return null;
  }

  return null;
};
