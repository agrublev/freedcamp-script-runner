/**
 * FSCR v7.0.0 - Command Registry Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CommandRegistry } from '../../src/core/command-registry';
import type { Command } from '../../src/types';

describe('CommandRegistry', () => {
  let registry: CommandRegistry;

  beforeEach(() => {
    registry = new CommandRegistry();
  });

  it('should register a command', () => {
    const loader = async () => ({
      name: 'test',
      description: 'Test command',
      handler: async () => ({ success: true, exitCode: 0 })
    } as Command);

    registry.register('test', loader);

    expect(registry.has('test')).toBe(true);
    expect(registry.getNames()).toContain('test');
  });

  it('should lazy load commands', async () => {
    let loaded = false;

    const loader = async () => {
      loaded = true;
      return {
        name: 'lazy',
        description: 'Lazy command',
        handler: async () => ({ success: true, exitCode: 0 })
      } as Command;
    };

    registry.register('lazy', loader);

    expect(loaded).toBe(false);

    const command = await registry.get('lazy');

    expect(loaded).toBe(true);
    expect(command).toBeDefined();
    expect(command?.name).toBe('lazy');
  });

  it('should register and resolve aliases', async () => {
    const loader = async () => ({
      name: 'original',
      description: 'Original command',
      handler: async () => ({ success: true, exitCode: 0 })
    } as Command);

    registry.register('original', loader);
    registry.registerAlias('alias', 'original');

    expect(registry.has('alias')).toBe(true);

    const command = await registry.get('alias');
    expect(command?.name).toBe('original');
  });

  it('should return null for non-existent commands', async () => {
    const command = await registry.get('non-existent');
    expect(command).toBeNull();
  });

  it('should preload multiple commands', async () => {
    let load1 = false;
    let load2 = false;

    registry.register('cmd1', async () => {
      load1 = true;
      return { name: 'cmd1', description: '', handler: async () => ({ success: true, exitCode: 0 }) } as Command;
    });

    registry.register('cmd2', async () => {
      load2 = true;
      return { name: 'cmd2', description: '', handler: async () => ({ success: true, exitCode: 0 }) } as Command;
    });

    await registry.preload(['cmd1', 'cmd2']);

    expect(load1).toBe(true);
    expect(load2).toBe(true);
  });

  it('should list commands without loading them', () => {
    registry.register('cmd1', async () => ({
      name: 'cmd1',
      description: '',
      handler: async () => ({ success: true, exitCode: 0 })
    } as Command));

    registry.register('cmd2', async () => ({
      name: 'cmd2',
      description: '',
      handler: async () => ({ success: true, exitCode: 0 })
    } as Command));

    const list = registry.list();

    expect(list).toHaveLength(2);
    expect(list.every(item => !item.loaded)).toBe(true);
  });

  it('should clear the registry', () => {
    registry.register('test', async () => ({
      name: 'test',
      description: '',
      handler: async () => ({ success: true, exitCode: 0 })
    } as Command));

    registry.registerAlias('t', 'test');

    expect(registry.getNames()).toHaveLength(1);

    registry.clear();

    expect(registry.getNames()).toHaveLength(0);
    expect(Object.keys(registry.getAliases())).toHaveLength(0);
  });
});
