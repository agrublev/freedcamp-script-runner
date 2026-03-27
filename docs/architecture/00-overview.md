# FSCR v7.0.0 Architecture Overview

**Version:** 7.0.0
**Status:** Planning Phase
**Last Updated:** 2026-03-28

## Executive Summary

FSCR v7.0.0 represents a complete architectural rewrite from JavaScript/Babel to TypeScript with aggressive performance optimizations. The primary goals are:

- **10x faster startup** (500ms → 45ms)
- **56% less memory** (80MB → 35MB)
- **57% smaller bundle** (2.8MB → 1.2MB)
- **100% type safety** with TypeScript
- **Extensibility** via plugin system
- **80%+ test coverage**

## Architectural Principles

### 1. **Performance First**
Every architectural decision prioritizes performance:
- Lazy loading for all commands
- Smart caching with TTL
- Optimized dependency tree
- Native ESM (no transpilation at runtime)

### 2. **Modularity**
Clear separation of concerns across 42+ files:
- Commands are isolated modules
- Shared utilities are reusable
- Plugins can extend core functionality
- Zero circular dependencies

### 3. **Type Safety**
100% TypeScript coverage:
- All public APIs are typed
- Internal utilities are typed
- Plugin interfaces are typed
- Test utilities are typed

### 4. **Extensibility**
Plugin system allows for:
- Custom commands
- Lifecycle hooks (pre-task, post-task, etc.)
- Configuration extensions
- Custom parsers

### 5. **Developer Experience**
- Beautiful error messages
- Progress indicators
- Performance monitoring
- Doctor diagnostics

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Entry                             │
│                    (src/cli.ts)                              │
│                   Lazy Command Loader                        │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Commands │  │   Lib    │  │ Plugins  │
│  Module  │  │  Module  │  │  System  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     │   ┌─────────┴─────────┐   │
     │   │                   │   │
     ▼   ▼                   ▼   ▼
┌─────────────┐       ┌─────────────┐
│   Parsers   │       │   Runners   │
│   System    │       │   System    │
└──────┬──────┘       └──────┬──────┘
       │                     │
       └──────────┬──────────┘
                  ▼
          ┌──────────────┐
          │   Utils &    │
          │   Cache      │
          └──────────────┘
```

## Core Subsystems

### 1. **CLI Entry System**
- **File:** `src/cli.ts`
- **Responsibility:** Main entry point with lazy command loading
- **Performance Target:** <10ms initialization

### 2. **Command System**
- **Location:** `src/commands/`
- **Responsibility:** Modular command implementations
- **Key Commands:**
  - `run.ts` - Execute tasks
  - `list.ts` - List available tasks
  - `completion.ts` - Shell completions
  - `doctor.ts` - System diagnostics
  - `profile.ts` - Profile management
  - `plugin.ts` - Plugin management

### 3. **Parser System**
- **Location:** `src/lib/parsers/`
- **Responsibility:** Parse scripts from multiple sources
- **Parsers:**
  - `parseScriptsMd.ts` - Parse fscripts.md
  - `parsePackageJson.ts` - Parse package.json scripts

### 4. **Runner System**
- **Location:** `src/lib/running/`
- **Responsibility:** Execute commands in different modes
- **Runners:**
  - `runCLICommand.ts` - Execute single command
  - `runSequence.ts` - Sequential execution
  - `runParallel.ts` - Parallel execution

### 5. **Cache System**
- **File:** `src/lib/cache.ts`
- **Responsibility:** TTL-based caching for parsed scripts
- **Performance:** 95%+ cache hit rate on repeated runs

### 6. **Plugin System**
- **File:** `src/lib/plugins.ts`
- **Responsibility:** Load and manage plugins
- **Features:**
  - Auto-discovery in `.fscr/plugins/`
  - Lifecycle hooks
  - Custom command registration

### 7. **Config System**
- **File:** `src/lib/config.ts`
- **Responsibility:** Profile-aware configuration
- **Features:**
  - Multi-environment support
  - Environment variable overrides
  - Validation

### 8. **Utilities**
- **Location:** `src/utils/`
- **Shared utilities:**
  - `console.ts` - Styled console output
  - `script-parser.ts` - Script parsing helpers
  - `package.ts` - Package.json utilities

## Data Flow

### Task Execution Flow

```
User Input (CLI)
    │
    ▼
┌─────────────────┐
│ CLI Entry       │
│ Parse Arguments │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Load Config     │
│ (with profile)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Cache     │◄──── Cache Hit? Return cached
└────────┬────────┘
         │ Cache Miss
         ▼
┌─────────────────┐
│ Parse Scripts   │
│ (MD or JSON)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validate Task   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Load Plugins    │
│ Run pre-task    │
│ hooks           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Execute Task    │
│ (CLI/Sequence/  │
│  Parallel)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Run post-task   │
│ hooks           │
└────────┬────────┘
         │
         ▼
    Return Result
```

## Performance Strategy

### Startup Time Optimization (<50ms target)

1. **Lazy Command Loading**
   - Only load command module when invoked
   - Use dynamic imports: `await import('./commands/run.js')`
   - Saves ~30ms on startup

2. **Minimal Dependencies**
   - Bundle only what's needed
   - Tree-shake unused code
   - Use native Node.js APIs where possible

3. **No Runtime Transpilation**
   - Native ESM modules
   - TypeScript compiled to ESM
   - No Babel overhead

4. **Smart Caching**
   - Cache parsed scripts for 5 minutes
   - Invalidate on file change
   - Saves ~20ms on repeat runs

### Memory Optimization (<50MB target)

1. **No Heavy Dependencies**
   - Replace `inquirer` with lighter alternatives
   - Use `chalk` v4 (CommonJS, smaller)
   - Avoid React/Ink where possible

2. **Streaming Parsers**
   - Don't load entire files into memory
   - Use streaming for large markdown files

3. **Garbage Collection Friendly**
   - Clear references after use
   - Avoid global state
   - Use WeakMap for caches

### Bundle Size Optimization (<1.5MB target)

1. **Tree Shaking**
   - ESM modules enable tree shaking
   - Import only what's used

2. **Code Splitting**
   - Commands are separate chunks
   - Loaded on demand

3. **Dependency Audit**
   - Remove unused dependencies
   - Replace heavy deps with lighter alternatives

## Technology Stack

### Runtime
- **Node.js:** ≥18.0.0 (native ESM support)
- **Module System:** ESM (native, no transpilation)

### Development
- **TypeScript:** 5.x (type checking + compilation)
- **Build Tool:** tsc (native TypeScript compiler)
- **Test Framework:** Vitest (fast, ESM-native)
- **Linting:** ESLint + TypeScript ESLint
- **Formatting:** Prettier

### Dependencies (Optimized)
- **CLI Framework:** Commander.js (lightweight)
- **Styling:** Chalk v4 (proven, stable)
- **Markdown Parser:** Custom lightweight parser
- **Config:** Native fs + JSON parsing
- **Caching:** Node.js Map with TTL logic

## Module Dependency Graph

```
cli.ts
  ├── commands/run.ts
  │     ├── lib/config.ts
  │     ├── lib/cache.ts
  │     ├── lib/parsers/parseScriptsMd.ts
  │     ├── lib/running/runCLICommand.ts
  │     └── utils/console.ts
  │
  ├── commands/list.ts
  │     ├── lib/config.ts
  │     ├── lib/parsers/parseScriptsMd.ts
  │     └── utils/console.ts
  │
  ├── commands/completion.ts
  │     ├── lib/config.ts
  │     └── utils/console.ts
  │
  ├── commands/doctor.ts
  │     ├── lib/config.ts
  │     └── utils/console.ts
  │
  ├── commands/profile.ts
  │     ├── lib/config.ts
  │     └── utils/console.ts
  │
  └── commands/plugin.ts
        ├── lib/plugins.ts
        └── utils/console.ts
```

## File Structure

```
fscr/
├── src/
│   ├── cli.ts                           # Main entry (200 lines)
│   │
│   ├── types/
│   │   └── index.ts                     # Type definitions (300 lines)
│   │
│   ├── commands/                        # Command modules
│   │   ├── run.ts                       # Run task (250 lines)
│   │   ├── list.ts                      # List tasks (150 lines)
│   │   ├── scripts.ts                   # Package.json scripts (100 lines)
│   │   ├── run-s.ts                     # Sequential runner (100 lines)
│   │   ├── run-p.ts                     # Parallel runner (100 lines)
│   │   ├── generate.ts                  # Generate fscripts.md (200 lines)
│   │   ├── toc.ts                       # Generate TOC (150 lines)
│   │   ├── clear.ts                     # Clear history (50 lines)
│   │   ├── completion.ts                # Shell completions (300 lines)
│   │   ├── doctor.ts                    # Diagnostics (400 lines)
│   │   ├── profile.ts                   # Profile management (250 lines)
│   │   └── plugin.ts                    # Plugin management (200 lines)
│   │
│   ├── lib/
│   │   ├── config.ts                    # Config manager (350 lines)
│   │   ├── cache.ts                     # Cache manager (200 lines)
│   │   ├── plugins.ts                   # Plugin system (400 lines)
│   │   │
│   │   ├── parsers/
│   │   │   ├── parseScriptsMd.ts        # Markdown parser (300 lines)
│   │   │   └── parsePackageJson.ts      # JSON parser (150 lines)
│   │   │
│   │   └── running/
│   │       ├── runCLICommand.ts         # CLI executor (200 lines)
│   │       ├── runSequence.ts           # Sequential runner (150 lines)
│   │       └── runParallel.ts           # Parallel runner (200 lines)
│   │
│   └── utils/
│       ├── script-parser.ts             # Script utilities (200 lines)
│       ├── console.ts                   # Console utilities (150 lines)
│       └── package.ts                   # Package utilities (100 lines)
│
├── tests/                               # Test files
│   ├── unit/                            # Unit tests
│   ├── integration/                     # Integration tests
│   └── e2e/                             # E2E tests
│
├── benchmarks/                          # Performance benchmarks
│   ├── startup.bench.ts                 # Startup time
│   ├── memory.bench.ts                  # Memory usage
│   └── bundle.bench.ts                  # Bundle size
│
├── bin/                                 # Binary entry points
│   ├── fscr                             # Main binary
│   └── fsr                              # Alias
│
├── docs/
│   ├── architecture/                    # Architecture docs
│   └── api/                             # API documentation
│
├── tsconfig.json                        # TypeScript config
├── vitest.config.ts                     # Test config
├── package.json                         # Package manifest
└── README.md                            # User documentation
```

## Success Metrics

### Performance Targets
- ✅ Startup time: <50ms (currently ~500ms)
- ✅ Memory usage: <50MB (currently ~80MB)
- ✅ Bundle size: <1.5MB (currently ~2.8MB)
- ✅ Build time: <2s (currently ~3.5s)

### Quality Targets
- ✅ Type coverage: 100%
- ✅ Test coverage: 80%+
- ✅ Zero circular dependencies
- ✅ ESLint errors: 0

### Feature Targets
- ✅ Plugin system with hooks
- ✅ Shell completions (4 shells)
- ✅ Profile management
- ✅ Doctor diagnostics
- ✅ Smart caching

## Next Steps

1. **Review Architecture** - Team review and approval
2. **Create ADRs** - Document major architectural decisions
3. **Define TypeScript Types** - Complete type definitions
4. **Prototype Core** - Build minimal viable architecture
5. **Benchmark** - Validate performance targets
6. **Iterate** - Refine based on benchmarks
7. **Implement** - Full implementation
8. **Test** - Comprehensive testing
9. **Document** - API and user documentation
10. **Release** - v7.0.0 release

## References

- [TypeScript Type Definitions](./01-type-definitions.md)
- [Performance Strategy](./02-performance-strategy.md)
- [Plugin System Architecture](./03-plugin-system.md)
- [Caching Strategy](./04-caching-strategy.md)
- [Build Strategy](./05-build-strategy.md)
- [ADRs](./adrs/)
