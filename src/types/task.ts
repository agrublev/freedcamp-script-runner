/**
 * FSCR v7.0.0 - Task Type Definitions
 * Type-safe task execution and management
 */

/**
 * Task metadata from fscripts.md
 */
export interface Task {
  name: string;
  description?: string;
  script: string;
  lang: 'bash' | 'javascript' | 'typescript' | 'shell';
  category?: string;
  tags?: string[];
}

/**
 * Parsed script information
 */
export interface ParsedScript {
  lang: 'bash' | 'javascript' | 'typescript' | 'shell' | 'node';
  env: Record<string, string>;
  type: string;
  full: string;
  rest: string[];
}

/**
 * Task execution context
 */
export interface TaskExecutionContext {
  task: Task;
  script: ParsedScript;
  cwd?: string;
  timeout?: number;
  signal?: AbortSignal;
}

/**
 * Task execution result
 */
export interface TaskExecutionResult {
  success: boolean;
  exitCode: number;
  stdout?: string;
  stderr?: string;
  duration?: number;
  error?: Error;
}

/**
 * Script file structure
 */
export interface ScriptFile {
  allTasks: Task[];
  categories: Map<string, Task[]>;
  metadata?: {
    version?: string;
    description?: string;
    author?: string;
  };
}

/**
 * Task history entry
 */
export interface TaskHistoryEntry {
  task: string;
  timestamp: number;
  duration: number;
  success: boolean;
  exitCode: number;
}

/**
 * Task filter options
 */
export interface TaskFilterOptions {
  category?: string;
  tags?: string[];
  lang?: string;
  search?: string;
}

/**
 * Sequential execution options
 */
export interface SequentialOptions {
  stopOnError?: boolean;
  continueOnWarning?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Parallel execution options
 */
export interface ParallelOptions {
  maxConcurrent?: number;
  failFast?: boolean;
  aggregateOutput?: boolean;
}
