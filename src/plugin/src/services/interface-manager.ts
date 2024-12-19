// src/services/interface-manager.ts
import { BaseInterface, type DynamicMethods } from "../base-interface";
import { SnapLogger } from "../logger";
import { interfaceRegistry, type InterfaceType } from "../interfaces/registry";

const logger = SnapLogger.getInstance();

export class InterfaceManager {
  private static instance: InterfaceManager | null = null;
  private activeComponents = new Map<string, BaseInterface<any> & DynamicMethods>();

  private constructor() {}

  public static getInstance(): InterfaceManager {
    if (!InterfaceManager.instance) {
      InterfaceManager.instance = new InterfaceManager();
    }
    return InterfaceManager.instance;
  }

  private parseRequest(method: string): { interfaceType: string; methodName: string } {
    // Split only on the first underscore
    const firstUnderscoreIndex = method.indexOf('_');
    if (firstUnderscoreIndex === -1) {
      throw new Error(`Invalid method format: ${method}`);
    }

    const interfaceType = method.substring(0, firstUnderscoreIndex);
    const methodName = method.substring(firstUnderscoreIndex + 1);

    if (!interfaceType || !methodName) {
      throw new Error(`Invalid method format: ${method}`);
    }

    return { interfaceType, methodName };
  }

  private toCamelCase(methodName: string): string {
    return methodName;  // Don't modify the method name at all
  }

  public async getComponent(interfaceId: string): Promise<BaseInterface<any> & DynamicMethods> {
    try {
      // First check if it's a component type
      const existing = this.activeComponents.get(interfaceId);
      if (existing) {
        return existing;
      }

      // Then check if it's a valid interface type
      const factory = interfaceRegistry[interfaceId as InterfaceType];
      if (!factory) {
        // Finally check if any component has this ID
        for (const component of this.activeComponents.values()) {
          if (component.interfaceId === interfaceId) {
            return component;
          }
        }
        throw new Error(`Unknown interface type or ID: ${interfaceId}`);
      }

      const instance = factory() as BaseInterface<any> & DynamicMethods;
      this.activeComponents.set(interfaceId, instance);
      return instance;
    } catch (error) {
      throw new Error(`Error in getComponent: ${error}`);
    }
  }

  public async handleComponentRequest(request: { method: string; params?: any }): Promise<any> {
    try {
      const { interfaceType, methodName } = this.parseRequest(request.method);
      logger.debug('Parsed request', { interfaceType, methodName });

      const component = await this.getComponent(interfaceType);
      const finalMethod = this.toCamelCase(methodName);
      logger.debug('Looking for method', { finalMethod, availableMethods: Object.keys(component) });

      if (typeof component[finalMethod] !== 'function') {
        throw new Error(`Method ${finalMethod} not found on ${interfaceType} interface`);
      }

      return component[finalMethod](request.params);
    } catch (error) {
      throw new Error(`Error in handleComponentRequest: ${error}`);
    }
  }
}