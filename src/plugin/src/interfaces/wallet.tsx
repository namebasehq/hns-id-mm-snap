import {
  Box,
  Text,
  Heading,
  Button,
  Copyable,
  Divider,
  Section,
} from "@metamask/snaps-sdk/jsx";
import { UserInputEventType } from "@metamask/snaps-sdk";
import type { Json } from "@metamask/snaps-sdk";
import { BaseInterface } from "../base-interface";
import { SnapLogger } from "../logger";
import { 
  WalletService, 
  type SerializableAddressInfo,
  type WalletState,
  HANDSHAKE_CONFIG,
  toSerializable
} from "../services/wallet";

const logger = SnapLogger.getInstance();

interface WalletRequest {
  method: string;
  params?: {
    count?: number;
    [key: string]: any;
  };
}

// Initialize WalletService with Handshake configuration
WalletService.initialize(HANDSHAKE_CONFIG);

export class WalletInterface extends BaseInterface<WalletState> {
  private static instance: WalletInterface | null = null;
  private readonly walletService: WalletService;

  private constructor() {
    super("wallet", {
      addresses: [],
      selectedIndex: 0
    });
    this.walletService = WalletService.getInstance();
  }

  public static getInstance(): WalletInterface {
    if (!WalletInterface.instance) {
      WalletInterface.instance = new WalletInterface();
    }
    return WalletInterface.instance;
  }

  public static async getActiveInterface(id: string): Promise<WalletInterface | null> {
    return WalletInterface.instance;
  }

  protected validateState(state: Record<string, Json> | null): boolean {
    try {
      if (!state) return false;

      return (
        Array.isArray(state.addresses) &&
        state.addresses.every(
          (addr): addr is SerializableAddressInfo => {
            const addrObj = addr as { [key: string]: Json };
            return (
              typeof addrObj === 'object' &&
              addrObj !== null &&
              typeof addrObj.address === "string" &&
              typeof addrObj.balance === "number" 
            );
          }
        ) &&
        typeof state.selectedIndex === "number"
      );
    } catch (error) {
      throw new Error(`Error in validateState: ${error}`);
    }
  }

  private getSummaryPanel(addresses: SerializableAddressInfo[]) {
    try {
      const totalBalance = addresses.reduce((sum, addr) => sum + addr.balance, 0);
      const totalUnconfirmed = 0;

      return (
        <Section>
          <Heading>Summary</Heading>
          <Text>Total Balance: {this.walletService.formatAmount(totalBalance)}</Text>
          {totalUnconfirmed > 0 && (
            <Text color="warning">
              Pending: {this.walletService.formatAmount(totalUnconfirmed)}
            </Text>
          )}
        </Section>
      );
    } catch (error) {
      throw new Error(`Error in getSummaryPanel: ${error}`);
    }
  }

  private getAddressPanel(address: SerializableAddressInfo, index: number) {
    try {
      return (
        <Section>
          <Text>Address:</Text>
          <Copyable value={address.address} />
          <Text>Balance: {this.walletService.formatAmount(address.balance)}</Text>
          <Text color="muted">Path: {HANDSHAKE_CONFIG.pathPrefix + index}</Text>
        </Section>
      );
    } catch (error) {
      throw new Error(`Error in getAddressPanel: ${error}`);
    }
  }

  protected renderInterface(state: WalletState): JSX.Element {
    try {
      const selected = state.addresses[state.selectedIndex];
      if (!selected) {
        throw new Error('Selected address is undefined');
      }

      return (
        <Box>
          <Heading>HNS Wallet</Heading>
          <Divider />
          {this.getSummaryPanel(state.addresses)}
          <Divider />
          <Box direction="horizontal" alignment="center">
            <Button name="prev-address" disabled={state.selectedIndex === 0}>
              Previous
            </Button>
            <Button
              name="next-address"
              disabled={state.selectedIndex === state.addresses.length - 1}
            >
              Next
            </Button>
          </Box>
          {this.getAddressPanel(selected, state.selectedIndex)}
        </Box>
      );
    } catch (error) {
      throw new Error(`Error in renderInterface: ${error}`);
    }
  }

  protected async handleUserInput(buttonName: string): Promise<void> {
    try {
      const state = await this.getState();
      logger.debug("Processing user input", { buttonName, currentState: state });

      switch (buttonName) {
        case "prev-address":
          if (state.selectedIndex > 0) {
            await this.setState({ selectedIndex: state.selectedIndex - 1 });
          }
          break;
        case "next-address":
          if (state.selectedIndex < state.addresses.length - 1) {
            await this.setState({ selectedIndex: state.selectedIndex + 1 });
          }
          break;
        default:
          logger.debug("Unknown button clicked", { buttonName });
      }
    } catch (error) {
      throw new Error(`Error in handleUserInput: ${error}`);
    }
  }

  public async handleExternalEvent(event: {
    type: string;
    name?: string;
  }): Promise<void> {
    try {
      logger.debug("Processing external event", { event });

      if (event.type === UserInputEventType.ButtonClickEvent && event.name) {
        await this.handleUserInput(event.name);
        await this.updateInterface();
      }
    } catch (error) {
      throw new Error(`Error in handleExternalEvent: ${error}`);
    }
  }

  public async getAddresses(params?: { count?: number }): Promise<Json> {
    try {
      await this.initialize(params?.count || 1);
      await this.show();
      return {
        success: true,
        interfaceId: this.interfaceId,
        type: "wallet_response",
      };
    } catch (error) {
      throw new Error(`Error in getAddresses: ${error}`);
    }
  }

  protected async getState(): Promise<WalletState> {
    try {
      const state = await this.stateManager.getState<WalletState>(this.stateKey);
      if (!state || !this.validateState(state)) {
        return this.initialState;
      }
      return state;
    } catch (error) {
      throw new Error(`Error in getState: ${error}`);
    }
  }

  protected async setState(newState: Partial<WalletState>): Promise<void> {
    try {
      await this.stateManager.updateState(this.stateKey, newState);
    } catch (error) {
      throw new Error(`Error in setState: ${error}`);
    }
  }

  public async initialize(addressCount: number): Promise<void> {
    try {
      const state = await this.getState();
      if (state.addresses.length === 0) {
        const addresses = await this.walletService.deriveAddresses(0, addressCount);
        if (!addresses) {
          throw new Error('deriveAddresses returned null or undefined');
        }
        const serializedAddresses = addresses.map(addr => {
          if (!addr) {
            throw new Error('Null or undefined address in deriveAddresses result');
          }
          return toSerializable(addr);
        });
        await this.setState({ 
          addresses: serializedAddresses,
          selectedIndex: 0  // Initialize the selected index to the first address
        });
      }
    } catch (error) {
      throw new Error(`Error in initialize: ${error}`);
    }
  }

  public async show(): Promise<Json> {
    try {
      if (!this.interfaceId) {
        await this.createInterface();
      }
      await this.updateInterface();
      const result = await snap.request({
        method: "snap_dialog",
        params: {
          type: "alert",
          id: this.interfaceId!,
        },
      });
      return { success: true, interfaceId: this.interfaceId } as const;
    } catch (error) {
      throw new Error(`Error in show: ${error}`);
    }
  }
}