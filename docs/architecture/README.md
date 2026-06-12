# FSCR v7.0.0 Architecture Documentation

> Complete architecture design for the TypeScript migration and performance rewrite

## 📖 Table of Contents

### Core Architecture Documents

1. **[Architecture Overview](./00-overview.md)** 📋
   - Executive summary
   - High-level architecture
   - Core subsystems
   - Success metrics

2. **[Type Definitions](./01-type-definitions.md)** 📘
   - Complete TypeScript types
   - Interfaces and type guards
   - Manager interfaces
   - Usage examples

3. **[Performance Strategy](./02-performance-strategy.md)** ⚡
   - Startup time optimization (<50ms)
   - Memory optimization (<50MB)
   - Bundle size optimization (<1.5MB)
   - Benchmarking strategy

4. **[Plugin System](./03-plugin-system.md)** 🔌
   - Plugin architecture
   - Hook system
   - Custom commands
   - Plugin examples

5. **[Caching Strategy](./04-caching-strategy.md)** 💾
   - Smart caching with TTL
   - Automatic invalidation
   - 95%+ cache hit rate
   - Memory management

6. **[Build Strategy](./05-build-strategy.md)** 🏗️
   - TypeScript compilation
   - ESM output
   - Tree shaking
   - Code splitting

7. **[Module Dependency Graph](./06-module-dependency-graph.md)** 🔗
   - Dependency layers
   - Circular dependency prevention
   - Lazy loading strategy
   - Bundle analysis

### Architecture Decision Records (ADRs)

- **[ADR-001: TypeScript Migration](./adrs/001-typescript-migration.md)**
  - Decision to migrate from JavaScript/Babel to TypeScript
  - Performance and type safety benefits
  - Implementation plan

- **[ADR-002: ESM Module System](./adrs/002-esm-module-system.md)**
  - Adoption of native ES Modules
  - Tree shaking and bundle optimization
  - Migration checklist

## 🎯 Performance Targets

| Metric | v6.2.6 (Current) | v7.0.0 (Target) | Status |
|--------|------------------|-----------------|--------|
| **Startup Time** | ~500ms | <50ms | ⏳ Designed |
| **Memory Usage** | ~80MB | <50MB | ⏳ Designed |
| **Bundle Size** | ~2.8MB | <1.5MB | ⏳ Designed |
| **Build Time** | ~3.5s | <2s | ⏳ Designed |
| **Type Coverage** | 0% | 100% | ⏳ Designed |
| **Test Coverage** | ~40% | 80%+ | ⏳ Designed |

## 🏗️ Architecture Highlights

### Modular Design

```
42 files, clear separation of concerns:
- CLI Entry (1 file)
- Commands (12 files)
- Core Libraries (8 files)
- Parsers (2 files)
- Runners (3 files)
- Utilities (3 files)
- Types (1 file)
- Tests (10+ files)
```

### Performance Optimizations

1. **No Babel** - Native TypeScript compilation saves ~180ms
2. **Lazy Loading** - Commands loaded on demand saves ~100ms
3. **Smart Caching** - 95%+ hit rate saves ~60ms on repeat runs
4. **Tree Shaking** - ESM modules reduce bundle by 57%
5. **Minimal Dependencies** - 8 deps vs 42 in v6.2.6

### Type Safety

```typescript
// 100% type coverage
interface Script {
  name: string;
  script: string;
  language: ScriptLanguage;
  type: ScriptType;
  source: ScriptSource;
  // ... fully typed
}

// Type-safe managers
class CacheManager {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
}
```

### Plugin System

```typescript
// Extensible via plugins
export default {
  name: 'my-plugin',
  version: '1.0.0',
  async init(context) {
    context.registerCommand({ ... });
    context.registerHook('pre-task', async () => { ... });
  }
} satisfies Plugin;
```

## 📊 Data Flow

```
User Input (CLI)
    │
    ▼
Parse Arguments
    │
    ▼
Load Config (with profile)
    │
    ▼
Check Cache ◄──── Hit? Return cached
    │
    │ Miss
    ▼
Parse Scripts
    │
    ▼
Load Plugins & Run pre-task hooks
    │
    ▼
Execute Task (CLI/Sequence/Parallel)
    │
    ▼
Run post-task hooks
    │
    ▼
Return Result
```

## 🔗 Module Dependencies

```
cli.ts (Layer 1)
  │
  ▼
commands/ (Layer 2)
  │
  ▼
lib/ (Layer 3)
  │
  ▼
utils/ (Layer 4)
  │
  ▼
types/ (Layer 5)
```

**Rules:**
- No circular dependencies
- Unidirectional flow (top → bottom)
- Types layer is always a leaf node

## 🧪 Testing Strategy

### Unit Tests (80%+ coverage)

```typescript
// Each module has unit tests
tests/unit/
├── cache.test.ts
├── config.test.ts
├── plugins.test.ts
└── ...
```

### Integration Tests

```typescript
// Test module interactions
tests/integration/
├── cli.test.ts
├── plugin-system.test.ts
└── ...
```

### E2E Tests

```bash
# Test real CLI usage
tests/e2e/
├── run-command.test.ts
├── list-command.test.ts
└── ...
```

### Benchmarks

```bash
# Performance benchmarks
benchmarks/
├── startup.bench.ts     # <50ms
├── memory.bench.ts      # <50MB
└── bundle.bench.ts      # <1.5MB
```

## 🛠️ Build Pipeline

```
TypeScript Source (.ts)
    │
    ▼
Type Checking (tsc --noEmit)
    │
    ▼
Compilation (tsc)
    │
    ▼
ESM Output (.js) + Type Declarations (.d.ts)
    │
    ▼
Code Splitting (dynamic imports)
    │
    ▼
Tree Shaking (ESM modules)
    │
    ▼
Final Bundle (<1.5MB)
```

## 🚀 Technology Stack

### Runtime
- **Node.js:** ≥18.0.0
- **Module System:** ESM (native)

### Development
- **TypeScript:** 5.x
- **Build:** tsc (or swc)
- **Test:** Vitest
- **Lint:** ESLint + TypeScript ESLint
- **Format:** Prettier

### Dependencies (Optimized)
- **CLI:** Commander.js (~120KB)
- **Styling:** Chalk v4 (~80KB)
- **Prompts:** Enquirer (~140KB)
- **Spawn:** cross-spawn (~110KB)
- **Total:** ~450KB (vs ~2.4MB in v6.2.6)

## 📦 File Structure

```
fsr/
├── src/
│   ├── cli.ts                    # Entry point
│   ├── types/
│   │   └── index.ts              # All type definitions
│   ├── commands/                 # Modular commands
│   │   ├── run.ts
│   │   ├── list.ts
│   │   ├── doctor.ts
│   │   └── ...
│   ├── lib/
│   │   ├── config.ts             # Config management
│   │   ├── cache.ts              # Smart caching
│   │   ├── plugins.ts            # Plugin system
│   │   ├── parsers/              # Script parsers
│   │   └── running/              # Task runners
│   └── utils/
│       ├── console.ts            # Console utilities
│       ├── script-parser.ts      # Parsing helpers
│       └── package.ts            # Package.json utils
│
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # E2E tests
│
├── benchmarks/                   # Performance benchmarks
│
├── docs/
│   └── architecture/             # This directory
│
├── dist/                         # Build output
├── tsconfig.json                 # TypeScript config
├── vitest.config.ts              # Test config
└── package.json
```

## ✅ Design Validation

### Performance Targets

- [x] Startup time: <50ms (designed)
- [x] Memory usage: <50MB (designed)
- [x] Bundle size: <1.5MB (designed)
- [x] Build time: <2s (designed)

### Quality Targets

- [x] Type coverage: 100% (designed)
- [x] Test coverage: 80%+ (designed)
- [x] Zero circular dependencies (designed)
- [x] All imports use `.js` extensions (designed)

### Feature Targets

- [x] Plugin system with hooks (designed)
- [x] Shell completions (4 shells) (designed)
- [x] Profile management (designed)
- [x] Doctor diagnostics (designed)
- [x] Smart caching (designed)

## 🔄 Next Steps

### Phase 1: Implementation (Weeks 1-4)
1. Setup TypeScript project
2. Implement type definitions
3. Migrate core modules
4. Implement plugin system
5. Implement caching system

### Phase 2: Testing (Week 5)
1. Write unit tests
2. Write integration tests
3. Write E2E tests
4. Performance benchmarking

### Phase 3: Documentation (Week 6)
1. API documentation
2. User guide
3. Migration guide
4. Plugin developer guide

### Phase 4: Release (Week 7)
1. Beta testing
2. Bug fixes
3. Final benchmarks
4. v7.0.0 release

## 📚 References

### TypeScript & ESM
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Node.js ES Modules](https://nodejs.org/api/esm.html)
- [TypeScript Performance](https://github.com/microsoft/TypeScript/wiki/Performance)

### Performance
- [V8 Performance](https://v8.dev/docs)
- [Node.js Performance](https://nodejs.org/en/docs/guides/dont-block-the-event-loop/)
- [Bundle Size Optimization](https://web.dev/reduce-javascript-payloads-with-tree-shaking/)

### Architecture
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [ADR Documentation](https://adr.github.io/)

## 💬 Questions?

For questions about the architecture:
1. Review the relevant document above
2. Check the ADRs for decision rationale
3. Open a GitHub discussion
4. Contact the development team

## 📝 Contributing

To contribute to the architecture:
1. Read all core documents
2. Understand the design principles
3. Follow the module dependency rules
4. Write ADRs for major decisions
5. Update documentation as needed

---

**Status:** Design Phase Complete ✅
**Next:** Begin Implementation (v7.0.0-alpha.1)

---

*This architecture documentation was created on 2026-03-28 for FSCR v7.0.0*
