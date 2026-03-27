/**
 * FSCR v7.0.0 - Run Command Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runCommand } from '../../src/commands/run';
import type { CommandContext } from '../../src/types';

describe('Run Command', () => {
  let context: CommandContext;

  beforeEach(() => {
    context = {
      args: { task: 'test:unit' },
      options: { verbose: false, dryRun: false },
      cwd: process.cwd(),
      config: {
        verbose: false,
        dryRun: false,
        force: false,
        quiet: false,
        color: true
      }
    };
  });

  it('should have correct metadata', () => {
    expect(runCommand.name).toBe('run');
    expect(runCommand.category).toBe('core');
    expect(runCommand.description).toBeTruthy();
  });

  it('should have required arguments', () => {
    const taskArg = runCommand.arguments?.find(arg => arg.name === 'task');
    expect(taskArg).toBeDefined();
    expect(taskArg?.required).toBe(true);
  });

  it('should have options', () => {
    expect(runCommand.options).toBeDefined();
    expect(runCommand.options?.length).toBeGreaterThan(0);

    const dryRunOption = runCommand.options?.find(opt => opt.name === 'dry-run');
    expect(dryRunOption).toBeDefined();
    expect(dryRunOption?.type).toBe('boolean');
  });

  it('should have examples', () => {
    expect(runCommand.examples).toBeDefined();
    expect(runCommand.examples?.length).toBeGreaterThan(0);
  });

  it('should support dry-run mode', async () => {
    context.options.dryRun = true;

    // Mock the parseScriptFile function
    vi.mock('../../../lib/parsers/parseScriptsMd.js', () => ({
      parseScriptFile: vi.fn().mockResolvedValue({
        allTasks: [
          { name: 'test:unit', script: 'npm test', lang: 'bash' }
        ]
      })
    }));

    const result = await runCommand.handler(context);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.task).toBe('test:unit');
  });

  it('should return error for non-existent task', async () => {
    context.args.task = 'non-existent-task';

    // Mock empty task list
    vi.mock('../../../lib/parsers/parseScriptsMd.js', () => ({
      parseScriptFile: vi.fn().mockResolvedValue({
        allTasks: []
      })
    }));

    const result = await runCommand.handler(context);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.error).toBeDefined();
  });
});
