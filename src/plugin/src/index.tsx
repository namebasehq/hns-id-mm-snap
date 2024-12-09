import { Box, Text, Heading, Button, Copyable, Divider, Section } from '@metamask/snaps-sdk/jsx';
import { 
  OnUserInputHandler, 
  UserInputEventType, 
  type OnNameLookupHandler, 
  type OnRpcRequestHandler,
  Json
} from "@metamask/snaps-sdk";
import { getAddr, getName } from "./client";
import { chainInfo } from "./utils";
import { getState, handleWalletRequest, setState, showWalletInterface, updateWalletInterface } from "./wallet";
import { SnapLogger, LogLevel } from './logger';

// Get logger instance
const logger = SnapLogger.getInstance();

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

    // For reverse resolution (when user enters an address)
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

// Helper function to ensure log entries are JSON serializable
const serializeLogEntry = (log: { 
  timestamp: number; 
  level: LogLevel; 
  message: string; 
  context?: unknown; 
}): Json => ({
  timestamp: log.timestamp,
  level: String(log.level),
  message: log.message,
  context: log.context ? JSON.parse(JSON.stringify(log.context)) : null
});

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  // Log the incoming request

  // logger.debug('Received RPC request', { origin, request });

  try {
    // Handle wallet methods
    if (request.method.startsWith('wallet_')) {
      return handleWalletRequest(request);
    }

    // Handle specific methods for logging functionality
    switch (request.method) {
      case 'getSnap': {
        const serializedLogs = logger.getLogs().map(serializeLogEntry);
        return {
          status: 'active',
          logs: serializedLogs,
        };
      }

      case 'notify': {
        const serializedLogs = logger.getLogs().map(serializeLogEntry);
        return {
          success: true,
          logs: serializedLogs,
        };
      }

      default:
        throw new Error('Method not found.');
    }
  } catch (error) {
    logger.error('Error handling RPC request', { error });
    throw error;
  }
};

export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
  logger.debug('Received user input', { id, event });

  if (event.type === UserInputEventType.ButtonClickEvent) {
    const currentState = await getState();
    logger.debug('Current state in input handler:', currentState);
    
    let newIndex = currentState.selectedIndex;
    
    if (event.name === 'prev-address' && currentState.selectedIndex > 0) {
      newIndex = currentState.selectedIndex - 1;
    } else if (
      event.name === 'next-address' && 
      currentState.selectedIndex < currentState.addresses.length - 1
    ) {
      newIndex = currentState.selectedIndex + 1;
    }

    if (newIndex !== currentState.selectedIndex) {
      logger.debug('Updating index to:', { newIndex });
      await setState({ selectedIndex: newIndex });
      logger.debug('State updated, updating interface');
      const newState = await getState();
      await updateWalletInterface(id, newState);
    }
  }
};
