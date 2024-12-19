import {
  Box,
  Text,
  Heading,
  Input,
  Button,
  Divider,
  Section,
} from "@metamask/snaps-sdk/jsx";
import { UserInputEventType } from "@metamask/snaps-sdk";
import type { Json } from "@metamask/snaps-sdk";
import { BaseInterface, JsonSerializable } from "../base-interface";
import { SnapLogger } from "../logger";
import { WalletService, HANDSHAKE_CONFIG } from "../services/wallet";

const logger = SnapLogger.getInstance();

interface SendTransactionState extends JsonSerializable {
  [key: string]: Json; // Add index signature
  fromAddress: string;
  toAddress: string;
  amount: string;
  signedTx: string | null;
  error: string | null;
  status: "input" | "ready_to_broadcast" | "broadcasting" | "completed";
}

export class SendTransaction extends BaseInterface<SendTransactionState> {
  private static instance: SendTransaction | null = null;
  private readonly walletService: WalletService;

  private constructor() {
    super("send_transaction", {
      fromAddress: "",
      toAddress: "",
      amount: "",
      signedTx: null,
      error: null,
      status: "input",
    });
    this.walletService = WalletService.getInstance();
  }

  public static getInstance(): SendTransaction {
    if (!SendTransaction.instance) {
      SendTransaction.instance = new SendTransaction();
    }
    return SendTransaction.instance;
  }

  protected validateState(state: Record<string, Json> | null): boolean {
    if (!state) return false;

    return (
      typeof state.fromAddress === "string" &&
      typeof state.toAddress === "string" &&
      typeof state.amount === "string" &&
      (state.signedTx === null || typeof state.signedTx === "string") &&
      (state.error === null || typeof state.error === "string") &&
      ["input", "ready_to_broadcast", "broadcasting", "completed"].includes(
        state.status as string
      )
    );
  }

  protected async handleUserInput(buttonName: string): Promise<void> {
    try {
      switch (buttonName) {
        case "sign_transaction":
          const signedTx = await this.walletService.sign({
            fromAddress: this.state.fromAddress,
            toAddress: this.state.toAddress,
            amount: parseFloat(this.state.amount),
          });

          await this.setState({
            signedTx,
            status: "ready_to_broadcast",
            error: null,
          });
          break;

        case "broadcast_transaction":
          if (!this.state.signedTx) {
            throw new Error("No signed transaction available");
          }

          await this.setState({ status: "broadcasting" });
          await this.walletService.broadcast(this.state.signedTx);
          await this.setState({
            status: "completed",
            error: null,
          });
          break;

        default:
          logger.error("Unknown button clicked:", { buttonName });
      }
    } catch (error: any) {
      logger.error("Error handling button click:", error);
      await this.setState({
        error: error?.message,
        status: "input",
      });
    }
  }

  public async buildTransaction(params?: {
    addressIndex?: number;
  }): Promise<Json> {
    try {
      const state = await this.getState();
      await this.initialize(params?.addressIndex || 0);
      //logger.debug("Current state after init", { state });
      await this.show();
      //logger.debug("Show complete");
      return {
        success: true,
        interfaceId: this.interfaceId,
        type: "wallet_response",
      };
    } catch (error) {
      logger.error("Error in buildTransaction", { error });
      throw new Error(`Error in buildTransaction: ${error}`);
    }
  }

  public async initialize(addressIndex: number): Promise<void> {
    const addresses = await this.walletService.deriveAddresses(addressIndex, 1);

    await this.setState({ address: addresses[0].address, index: addressIndex });
  }

  protected renderInterface(state: SendTransactionState): JSX.Element {
    return (
      <Box>
        <Heading>Send HNS</Heading>
        <Divider />
        <Section>
          <Box>
            <Text>To Address:</Text>
            <Input
              value={state.toAddress}
              name="to_address"
              placeholder="hs1..."
            />

            <Text>Amount (HNS):</Text>
            <Input value={state.amount} name="amount" placeholder="0.0" />
          </Box>
        </Section>

        <Divider />

        {false && (
          <Section>
            <Box>
              <Text color="error">{state.error}</Text>
            </Box>
          </Section>
        )}

        <Section>
          <Box>
            {state.status === "input" && (
              <Button name="sign_transaction">Sign Transaction</Button>
            )}

            {state.status === "ready_to_broadcast" && (
              <Button name="broadcast_transaction">
                Broadcast Transaction
              </Button>
            )}

            {state.status === "broadcasting" && (
              <Text>Broadcasting transaction...</Text>
            )}

            {state.status === "completed" && (
              <Text>Transaction sent successfully!</Text>
            )}
          </Box>
        </Section>
      </Box>
    );
  }
  public async handleExternalEvent(event: {
    type: string;
    name?: string;
    value?: string;
  }): Promise<void> {
    try {
      if (
        event.type === UserInputEventType.InputChangeEvent &&
        event.name &&
        event.value
      ) {
        const updates: Partial<SendTransactionState> = {
          [event.name]: event.value,
        };
        await this.setState(updates);
        await this.updateInterface();
      }
    } catch (error) {
      logger.error("Error in handleExternalEvent:", { error });
      throw error;
    }
  }
}
