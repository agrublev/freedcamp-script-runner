/**
 * FSCR v7.0.0 - Commands Index
 * Central export for all commands
 */

// Core commands
export { default as runCommand } from './run';
export { default as listCommand } from './list';
export { default as scriptsCommand } from './scripts';
export { default as runSequentialCommand } from './run-s';
export { default as runParallelCommand } from './run-p';

// Utility commands
export { default as generateCommand } from './generate';
export { default as tocCommand } from './toc';
export { default as clearCommand } from './clear';
export { default as doctorCommand } from './doctor';
export { default as completionCommand } from './completion';

// Profile commands
export {
  profileListCommand,
  profileCreateCommand,
  profileSwitchCommand,
  profileDeleteCommand
} from './profile';

// Plugin commands
export {
  pluginListCommand,
  pluginInstallCommand,
  pluginUninstallCommand
} from './plugin';
