import type { OnNameLookupHandler } from "@metamask/snaps-sdk";
import { getAddr } from "./client";


export const onNameLookup: OnNameLookupHandler = async (request) => {

  try {
    const data = await getAddr(request.domain);


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
    // if (request.address) {
    //   await addLog(`Attempting reverse resolution for address: ${request.address}`);
    //   return {
    //     resolvedDomains: [{
    //       resolvedDomain: 'myresolution.eth',
    //       protocol: 'fixed resolver'
    //     }]
    //   };
    // }
  } catch (error) {
    return null;
  }

  return null;
};
