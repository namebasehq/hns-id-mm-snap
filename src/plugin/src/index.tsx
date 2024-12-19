import {
  OnUserInputHandler,
  UserInputEventType,
  type OnNameLookupHandler,
  type OnRpcRequestHandler,
  type Json,
} from "@metamask/snaps-sdk";
import { getAddr, getName } from "./client";
import { chainInfo } from "./utils";
import { SnapLogger, type LogLevel } from "./logger";
import { StateManager } from "./services/state-manager";
import { InterfaceManager } from "./services/interface-manager";

const logger = SnapLogger.getInstance();
const stateManager = StateManager.getInstance();
const interfaceManager = InterfaceManager.getInstance();

// Handle name resolution requests
export const onNameLookup: OnNameLookupHandler = async (request) => {
  try {
    const chain = chainInfo[request.chainId];

    // Handle forward resolution (domain -> address)
    if (request.domain) {
      const data = await getAddr(request.domain, chain.coinType);
      if (data) {
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
    }

    // Handle reverse resolution (address -> domain)
    if (request.address) {
      const resolvedDomain = await getName(
        request.address as `0x${string}`,
        chain.coinType
      );
      return {
        resolvedDomains: [
          {
            resolvedDomain: resolvedDomain || "",
            protocol: "hns.id",
          },
        ],
      };
    }
  } catch (error) {
    logger.error("Error in name lookup:", { error });
  }
  return null;
};

// Serialize log entries for storage/transmission
const serializeLogEntry = (log: {
  timestamp: number;
  level: LogLevel;
  message: string;
  context?: unknown;
}): Json => ({
  timestamp: log.timestamp,
  level: String(log.level),
  message: log.message,
  context: log.context ? JSON.parse(JSON.stringify(log.context)) : null,
});

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  try {
    logger.debug("Incoming RPC request:", { origin, request });

    // Route interface-specific methods
    if (request.method.includes("_")) {
      return interfaceManager.handleComponentRequest(request);
    }

    // Handle system/utility methods
    switch (request.method) {
      case "getSnap": {
        const serializedLogs = logger.getLogs().map(serializeLogEntry);
        return {
          status: "active",
          logs: serializedLogs,
        } as const;
      }
      case "notify": {
        const serializedLogs = logger.getLogs().map(serializeLogEntry);
        return {
          success: true,
          logs: serializedLogs,
        } as const;
      }
      case "clearState": {
        await stateManager.clearAllState();
        return {
          success: true,
          message: "State cleared successfully",
        } as const;
      }
      default:
        throw new Error(`Method not found: ${request.method}`);
    }
  } catch (error) {
    logger.error("Error handling RPC request:", { error });
    throw new Error(error instanceof Error ? error.message : "Unknown error");
  }
};

// Handle user interface interactions
export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
  try {
    logger.debug("Received user input:", { id, event });

    const component = await interfaceManager.getComponent(id);
    if (!component) {
      logger.warn("No active component found for event:", { id, event });
      return;
    }

    // Convert event type to camelCase method name
    const methodName = event.type.toLowerCase().replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );

    // If component has the method, call it
    if (typeof component[methodName] === 'function') {
      await component[methodName](event);
    } else {
      // Fallback to handleExternalEvent if specific method not found
      await component.handleExternalEvent(event);
    }
  } catch (error) {
    logger.error("Error handling user input:", { error, id, event });
    throw error;
  }
};

// Export services for external use if needed
export const services = {
  stateManager,
  interfaceManager,
};