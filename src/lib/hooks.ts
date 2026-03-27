/**
 * Hook Execution System
 * FSCR v7.0.0 - Manages hook registration and execution
 */

import type {
  HookEvent,
  HookHandler,
  HookRegistration,
  HookPriority,
  HookExecutionResult,
  HookData,
  PluginContext
} from '../types/plugin.js';

/**
 * Priority weights for sorting
 */
const PRIORITY_WEIGHTS: Record<HookPriority, number> = {
  highest: 0,
  high: 1,
  normal: 2,
  low: 3,
  lowest: 4
};

/**
 * Hook manager for registering and executing hooks
 */
export class HookManager {
  private hooks: Map<HookEvent, HookRegistration[]> = new Map();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  /**
   * Register a hook handler
   */
  register<T extends HookEvent>(
    event: T,
    handler: HookHandler<T>,
    pluginName: string,
    priority: HookPriority = 'normal'
  ): void {
    const registration: HookRegistration = {
      event,
      handler,
      priority,
      pluginName
    };

    const existing = this.hooks.get(event) || [];
    existing.push(registration);

    // Sort by priority
    existing.sort((a, b) => PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority]);

    this.hooks.set(event, existing);

    this.context.logger.debug(
      `Hook registered: ${event} (plugin: ${pluginName}, priority: ${priority})`
    );
  }

  /**
   * Unregister all hooks for a plugin
   */
  unregisterPlugin(pluginName: string): void {
    for (const [event, registrations] of this.hooks.entries()) {
      const filtered = registrations.filter(r => r.pluginName !== pluginName);
      if (filtered.length > 0) {
        this.hooks.set(event, filtered);
      } else {
        this.hooks.delete(event);
      }
    }

    this.context.logger.debug(`Hooks unregistered for plugin: ${pluginName}`);
  }

  /**
   * Execute all hooks for an event
   */
  async execute<T extends HookEvent>(
    event: T,
    data: HookData[T]
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const registrations = this.hooks.get(event) || [];
    const errors: Array<{ plugin: string; error: Error }> = [];

    this.context.logger.debug(`Executing ${registrations.length} hooks for event: ${event}`);

    // Execute hooks sequentially in priority order
    for (const registration of registrations) {
      try {
        await Promise.resolve(registration.handler(data, this.context));
      } catch (error) {
        const err = error as Error;
        errors.push({
          plugin: registration.pluginName,
          error: err
        });

        this.context.logger.error(
          `Hook error in ${registration.pluginName} for ${event}: ${err.message}`
        );
      }
    }

    const duration = Date.now() - startTime;

    return {
      event,
      executedCount: registrations.length,
      errors,
      duration
    };
  }

  /**
   * Execute hooks in parallel (for non-order-dependent hooks)
   */
  async executeParallel<T extends HookEvent>(
    event: T,
    data: HookData[T]
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();
    const registrations = this.hooks.get(event) || [];
    const errors: Array<{ plugin: string; error: Error }> = [];

    this.context.logger.debug(
      `Executing ${registrations.length} hooks in parallel for event: ${event}`
    );

    // Execute all hooks in parallel
    const results = await Promise.allSettled(
      registrations.map(async registration => {
        try {
          await Promise.resolve(registration.handler(data, this.context));
        } catch (error) {
          errors.push({
            plugin: registration.pluginName,
            error: error as Error
          });
          throw error;
        }
      })
    );

    const duration = Date.now() - startTime;

    return {
      event,
      executedCount: registrations.length,
      errors,
      duration
    };
  }

  /**
   * Check if any hooks are registered for an event
   */
  hasHooks(event: HookEvent): boolean {
    return (this.hooks.get(event)?.length || 0) > 0;
  }

  /**
   * Get count of registered hooks for an event
   */
  getHookCount(event: HookEvent): number {
    return this.hooks.get(event)?.length || 0;
  }

  /**
   * Get all registered hooks
   */
  getAllHooks(): Map<HookEvent, HookRegistration[]> {
    return new Map(this.hooks);
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
    this.context.logger.debug('All hooks cleared');
  }

  /**
   * Get hooks for a specific plugin
   */
  getPluginHooks(pluginName: string): HookRegistration[] {
    const pluginHooks: HookRegistration[] = [];

    for (const registrations of this.hooks.values()) {
      pluginHooks.push(...registrations.filter(r => r.pluginName === pluginName));
    }

    return pluginHooks;
  }

  /**
   * Get statistics about registered hooks
   */
  getStats(): {
    totalHooks: number;
    hooksByEvent: Record<HookEvent, number>;
    hooksByPlugin: Record<string, number>;
  } {
    const hooksByEvent = {} as Record<HookEvent, number>;
    const hooksByPlugin = {} as Record<string, number>;
    let totalHooks = 0;

    for (const [event, registrations] of this.hooks.entries()) {
      hooksByEvent[event] = registrations.length;
      totalHooks += registrations.length;

      for (const registration of registrations) {
        hooksByPlugin[registration.pluginName] =
          (hooksByPlugin[registration.pluginName] || 0) + 1;
      }
    }

    return {
      totalHooks,
      hooksByEvent,
      hooksByPlugin
    };
  }
}

/**
 * Utility function to create a safe hook handler with timeout
 */
export function createSafeHookHandler<T extends HookEvent>(
  handler: HookHandler<T>,
  timeout: number = 5000
): HookHandler<T> {
  return async (data: HookData[T], context: PluginContext) => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Hook execution timeout')), timeout);
    });

    await Promise.race([
      Promise.resolve(handler(data, context)),
      timeoutPromise
    ]);
  };
}

/**
 * Utility to create a debounced hook handler
 */
export function createDebouncedHookHandler<T extends HookEvent>(
  handler: HookHandler<T>,
  delay: number = 300
): HookHandler<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  return (data: HookData[T], context: PluginContext) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise<void>((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          await Promise.resolve(handler(data, context));
          resolve();
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}

/**
 * Utility to create a throttled hook handler
 */
export function createThrottledHookHandler<T extends HookEvent>(
  handler: HookHandler<T>,
  interval: number = 1000
): HookHandler<T> {
  let lastRun = 0;
  let pending: (() => void) | null = null;

  return async (data: HookData[T], context: PluginContext) => {
    const now = Date.now();

    if (now - lastRun >= interval) {
      lastRun = now;
      await Promise.resolve(handler(data, context));
      return;
    }

    // Queue for next interval
    if (pending) return;

    pending = () => {
      lastRun = Date.now();
      handler(data, context);
      pending = null;
    };

    setTimeout(pending, interval - (now - lastRun));
  };
}
