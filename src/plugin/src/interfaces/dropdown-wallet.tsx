import {
  Box,
  Text,
  Heading,
  Dropdown,
  Option,
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

interface DropdownWalletState extends WalletState {
  selectedAddress: string | null;
}

// Initialize WalletService
WalletService.initialize(HANDSHAKE_CONFIG);

export class DropdownWalletInterface extends BaseInterface<DropdownWalletState> {
  private static instance: DropdownWalletInterface | null = null;
  private readonly walletService: WalletService;

  private constructor() {
    super("dropdown_wallet", {
      addresses: [],
      selectedIndex: 0,
      selectedAddress: null
    });
    this.walletService = WalletService.getInstance();
  }

  public static getInstance(): DropdownWalletInterface {
    if (!DropdownWalletInterface.instance) {
      DropdownWalletInterface.instance = new DropdownWalletInterface();
    }
    return DropdownWalletInterface.instance;
  }

  protected validateState(state: Record<string, Json> | null): boolean {
    try {
      if (!state) {
        logger.debug("State is null in validateState");
        return false;
      }

      const hasValidAddresses = Array.isArray(state.addresses) &&
        state.addresses.every((addr) => {
          if (!addr || typeof addr !== 'object' || Array.isArray(addr)) {
            return false;
          }
          
          const address = addr as Record<string, Json>;
          
          return (
            typeof address.address === "string" &&
            typeof address.balance === "number" 
          );
        });

      const hasValidIndex = typeof state.selectedIndex === "number";
      const hasValidSelectedAddress = state.selectedAddress === null || 
                                    typeof state.selectedAddress === "string";

      const isValid = hasValidAddresses && hasValidIndex && hasValidSelectedAddress;
      logger.debug("State validation result", { 
        isValid, 
        hasValidAddresses, 
        hasValidIndex, 
        hasValidSelectedAddress,
        state 
      });
      return isValid;

    } catch (error) {
      logger.error("Error in validateState", { error });
      throw new Error(`Error in validateState: ${error}`);
    }
  }

  private getWalletPanel(address: SerializableAddressInfo, index: number) {
    try {
      return (
        <Section>
          <Text>Address Details</Text>
          <Copyable value={address.address} />
          <Text>Balance: {this.walletService.formatAmount(address.balance)}</Text>
          <Text color="muted">Path: {HANDSHAKE_CONFIG.pathPrefix + index}</Text>
        </Section>
      );
    } catch (error) {
      throw new Error(`Error in getWalletPanel: ${error}`);
    }
  }

  protected renderInterface(state: DropdownWalletState): JSX.Element {
    try {
      logger.debug("Rendering interface with state", { state });
      const selectedAddress = state.addresses.find(addr => addr.address === state.selectedAddress);
      const selectedIndex = state.addresses.findIndex(addr => addr.address === state.selectedAddress);

      logger.debug("Selected address info", { selectedAddress, selectedIndex });

      const walletPanel = selectedAddress && selectedIndex !== -1 
        ? this.getWalletPanel(selectedAddress, selectedIndex) 
        : <Section><Text>No wallet selected</Text></Section>;

      return (
        <Box>
          <Heading>HNS Wallet Selector</Heading>
          <Divider />
          <Section>
            <Text>Select Wallet Address:</Text>
            <Dropdown name="wallet-selector">
              {state.addresses.map((addr, index) => (
                <Option value={addr.address} key={addr.address}>
                  {`Wallet ${index + 1} (${this.walletService.formatAmount(addr.balance)})`}
                </Option>
              ))}
            </Dropdown>
          </Section>
          <Divider />
          {walletPanel}
        </Box>
      );
    } catch (error) {
      logger.error("Error in renderInterface", { error });
      throw new Error(`Error in renderInterface: ${error}`);
    }
  }

  public async handleExternalEvent(event: {
    type: string;
    name?: string;
    value?: string;
  }): Promise<void> {
    try {
      logger.debug("Processing external event", { event });

      if (event.type === UserInputEventType.InputChangeEvent && event.value) {
        await this.setState({ selectedAddress: event.value });
        await this.updateInterface();
      }
    } catch (error) {
      throw new Error(`Error in handleExternalEvent: ${error}`);
    }
  }

  public async getAddresses(params?: { count?: number }): Promise<Json> {
    try {
      //logger.debug("Starting getAddresses", { params });
      await this.initialize(params?.count || 10);
      //logger.debug("Initialization complete");
      const state = await this.getState();
      //logger.debug("Current state after init", { state });
      await this.show();
      //logger.debug("Show complete");
      return {
        success: true,
        interfaceId: this.interfaceId,
        type: "wallet_response",
      };
    } catch (error) {
      logger.error("Error in getAddresses", { error });
      throw new Error(`Error in getAddresses: ${error}`);
    }
  }

  public async initialize(addressCount: number): Promise<void> {
    try {
      const state = await this.getState();
      //logger.debug("Current state in initialize", { state });
      if (state.addresses.length === 0) {
        //logger.debug("Initializing wallet dropdown", { addressCount });
        const addresses = await this.walletService.deriveAddresses(0, addressCount);
        logger.debug("xxx Derived addresses", { addresses });
        if (!addresses) {
          throw new Error('deriveAddresses returned null or undefined');
        }
        const serializedAddresses = addresses.map(addr => {
          if (!addr) {
            throw new Error('Null or undefined address in deriveAddresses result');
          }
          return toSerializable(addr);
        });
        
       // logger.debug("Serialized addresses", { serializedAddresses });
        
        // Set addresses and select the first one
        await this.setState({ 
          addresses: serializedAddresses,
          selectedAddress: serializedAddresses[0]?.address || null,
          selectedIndex: 0  
        });
        logger.debug("State set complete", { 
          addresses: serializedAddresses,
          selectedAddress: serializedAddresses[0]?.address || null,
          selectedIndex: 0  
        });
      }
    } catch (error) {
      logger.error("Error in initialize", { error });
      throw new Error(`Error in initialize: ${error}`);
    }
  }
}