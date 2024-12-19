

import type { Json } from '@metamask/snaps-sdk';
import { SnapLogger } from './logger';
import { StateManager } from './services/state-manager';

export type JsonSerializable = {
  [x: string]: Json;
};

export interface DynamicMethods {
  [key: string]: (params?: any) => Promise<Json>;
}
const logger = SnapLogger.getInstance();
export abstract class BaseInterface<T extends JsonSerializable> implements DynamicMethods {
  public interfaceId: string | null = null;
  protected initialState: T;
  protected stateKey: string;
  protected stateManager: StateManager;

  [key: string]: any; // This allows dynamic method access

  constructor(stateKey: string, initialState: T) {
    this.stateKey = stateKey;
    this.initialState = initialState;
    this.stateManager = StateManager.getInstance();
  }
  protected async getState(): Promise<T> {
    const state = await this.stateManager.getState<T>(this.stateKey);
    return state && this.validateState(state) ? state : this.initialState;
  }

  protected abstract validateState(state: Record<string, Json> | null): boolean;

  protected async setState(newState: Partial<T>): Promise<void> {
    await this.stateManager.updateState(this.stateKey, newState);
  }

  protected abstract renderInterface(state: T): JSX.Element;

  protected async handleUserInput(buttonName: string): Promise<void> {
    // Override this method to handle button clicks
  }

  public async createInterface(): Promise<string> {
    const state = await this.getState();
    this.interfaceId = await snap.request({
      method: "snap_createInterface",
      params: {
        ui: this.renderInterface(state)
      },
    });
    return this.interfaceId;
  }

  public async updateInterface(): Promise<void> {
    if (!this.interfaceId) {
      throw new Error('Interface not created');
    }    
    const state = await this.getState();
    logger.debug('Updating interface', { interfaceId: this.interfaceId, state: state });

    await snap.request({
      method: "snap_updateInterface",
      params: {
        id: this.interfaceId,
        ui: this.renderInterface(state),
      },
    });
  }

  public async show(): Promise<Json> {
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
  }

  public async onButtonClick(buttonName: string): Promise<void> {
    await this.handleUserInput(buttonName);
    await this.updateInterface();
  }

  public async handleExternalEvent(event: { type: string; name?: string; [key: string]: any }): Promise<void> {
    // Override this method to handle external events
  }


  public static async getActiveInterface(id: string): Promise<BaseInterface<any> | null> {
    // Override this static method to return the appropriate interface instance
    return null;
  }
}