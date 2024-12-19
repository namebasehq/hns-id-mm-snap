// src/services/state-manager.ts
import type { Json } from '@metamask/snaps-sdk';
import { SnapLogger } from '../logger';

const logger = SnapLogger.getInstance();

export class StateManager {
  private static instance: StateManager | null = null;
  private cache: Record<string, Json> = {};

  private constructor() {}

  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Gets a value from state by key
   * @param key The key to get from state
   * @returns The value from state, or null if not found
   */
  public async getState<T extends Json>(key: string): Promise<T | null> {
    try {
      // First check cache
      if (this.cache[key]) {
        logger.debug('State found in cache', { key });
        return this.cache[key] as T;
      }

      // If not in cache, get from snap state
      const state = await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      }) as Record<string, Json> | null;

      if (!state || !state[key]) {
        logger.debug('State not found', { key });
        return null;
      }

      // Update cache and return
      this.cache[key] = state[key];
      return state[key] as T;
    } catch (error) {
      logger.error('Error getting state', { key, error });
      throw error;
    }
  }

  /**
   * Sets a value in state by key
   * @param key The key to set in state
   * @param value The value to set
   */
  public async setState<T extends Json>(key: string, value: T): Promise<void> {
    try {
      // Get current state
      const currentState = await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      }) as Record<string, Json> | null || {};

      // Update state
      const newState = {
        ...currentState,
        [key]: value,
      };

      // Update snap state
      await snap.request({
        method: 'snap_manageState',
        params: { operation: 'update', newState },
      });

      // Update cache
      this.cache[key] = value;
      
      logger.debug('State updated', { key, newValue: value });
    } catch (error) {
      logger.error('Error setting state', { key, value, error });
      throw error;
    }
  }

  /**
   * Clears a specific key from state
   * @param key The key to clear from state
   */
  public async clearState(key: string): Promise<void> {
    try {
      const currentState = await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      }) as Record<string, Json> | null;

      if (currentState && key in currentState) {
        const { [key]: _, ...newState } = currentState;
        
        await snap.request({
          method: 'snap_manageState',
          params: { operation: 'update', newState },
        });

        // Clear from cache
        delete this.cache[key];
        
        logger.debug('State cleared', { key });
      }
    } catch (error) {
      logger.error('Error clearing state', { key, error });
      throw error;
    }
  }

  /**
   * Clears all state and cache
   */
  public async clearAllState(): Promise<void> {
    try {
      await snap.request({
        method: 'snap_manageState',
        params: { operation: 'clear' },
      });
      
      // Clear cache
      this.cache = {};
      
      logger.debug('All state cleared');
    } catch (error) {
      logger.error('Error clearing all state', { error });
      throw error;
    }
  }

  /**
   * Updates only specific fields in an object stored in state
   * @param key The key of the object in state
   * @param updates Partial updates to apply to the object
   */
  public async updateState<T extends Json>(key: string, updates: Partial<T>): Promise<void> {
    try {
      const currentValue = await this.getState<T>(key);
      if (currentValue && typeof currentValue === 'object') {
        const newValue = {
          ...currentValue,
          ...updates,
        };
        await this.setState(key, newValue);
        logger.debug('State partially updated', { key, updates });
      } else {
        await this.setState(key, updates as T);
        logger.debug('State created with updates', { key, updates });
      }
    } catch (error) {
      logger.error('Error updating state', { key, updates, error });
      throw error;
    }
  }
}