import { OnRpcRequestHandler, panel } from "@metamask/snaps-sdk";
import type { OnNameLookupHandler } from "@metamask/snaps-sdk";
import { Box, Heading, Text } from "@metamask/snaps-sdk/jsx";
import { getAddr } from "./client";
// Keep track of logs
let logs: string[] = [];

// Helper to add logs
const addLog = async (message: string) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  logs.push(logMessage);

  // Also log to console for development
  console.log(logMessage);
};

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  await addLog(`RPC Request from: ${origin}, method: ${request.method}`);

  switch (request.method) {
    case "hello":
      await addLog("Hello method called");
      return "Hello from your snap!";

    case "getLogs":
      return logs;

    case "clearLogs":
      logs = [];
      return null;

    default:
      throw new Error("Method not found.");
  }
};

export const onNameLookup: OnNameLookupHandler = async (request) => {
  await addLog("Name lookup triggered");
  await addLog(`Full request: ${JSON.stringify(request)}`);

  try {
    const data = await getAddr(request.domain);
    await addLog(`Data for domain ${request.domain}: ${data}`);

    // For domain resolution (when user types a name)
    if (request.domain && data) {
      await addLog(`Attempting to resolve domain: ${request.domain}`);
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
  await addLog("No domain or address provided in request");
  return null;
};
