# FSCR v7.0.0 - Freedcamp Script Runner

> **Fast, modern CLI tool for running markdown-documented scripts**
>
> ⚡ Startup time: **<50ms** | 💾 Memory: **<50MB** | 📘 **100% TypeScript**

[![npm version](https://img.shields.io/npm/v/fscr.svg)](https://www.npmjs.com/package/fscr)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/fscr.svg)](https://nodejs.org)

---

## 🚀 What's New in v7

FSCR v7.0.0 is a **complete rewrite** with massive performance improvements and modern architecture:

### Key Improvements:
- ⚡ **10x faster startup** (500ms → 45ms)
- 💾 **56% less memory** (80MB → 35MB)
- 📘 **100% TypeScript** (full type safety)
- 🔌 **Plugin system** (extend with custom commands)
- 🐚 **Shell completions** (bash, zsh, fish, PowerShell)
- ⚙️ **Profile support** (multi-environment configs)
- 📦 **Modular architecture** (42 files, clear separation)
- 🧪 **80%+ test coverage**

[See full improvements →](./IMPROVEMENTS.md)

---

## 📦 Installation

```bash
# Global install
npm install -g fscr@latest

# Project install
npm install --save-dev fscr

# Verify installation
fscr --version
fscr doctor
```

---

## 🎯 Quick Start

### 1. Create `fscripts.md`

```bash
fscr generate  # Auto-generate from package.json
```

Or create manually:

````markdown
# Development Scripts

## start:web

Start the web server in development mode

```bash
npm run dev -- --port 3000
```

## start:api

Start the API server

```bash
node src/api/server.js
```

## test

Run all tests

```javascript
import { runTests } from './test-runner.js';
await runTests();
```
````

### 2. Run Tasks

```bash
# Interactive mode (choose from menu)
fscr

# Run specific task
fscr run start:web

# List all tasks
fscr list

# Run multiple tasks sequentially
fscr run-s build test deploy

# Run multiple tasks in parallel
fscr run-p start:web start:api
```

---

## 🔥 Features

### 1. **Lightning Fast** ⚡

```bash
$ time fscr run build
real    0m0.045s  # <50ms startup!
```

**How?**
- ✅ No Babel transpilation (native ESM)
- ✅ Lazy command loading
- ✅ Smart caching (5min TTL)
- ✅ Optimized dependency tree

### 2. **Shell Completions** 🐚

```bash
# Auto-install for your shell
fscr completion --install

# Now get autocompletion!
fscr run <TAB>
  start:web    start:api    build    test    deploy
```

**Supported shells:**
- ✅ Bash
- ✅ Zsh
- ✅ Fish
- ✅ PowerShell

### 3. **TypeScript Support** 📘

```typescript
// Full type safety throughout
import type { Command, CommandContext } from 'fscr';

export default {
  name: 'custom',
  handler: async (opts, ctx: CommandContext) => {
    // IDE autocomplete works perfectly!
  }
} satisfies Command;
```

### 4. **Plugin System** 🔌

Extend FSCR with custom commands and hooks:

```typescript
// .fscr/plugins/my-plugin/index.js
export default {
  name: 'my-plugin',
  version: '1.0.0',

  async init(context) {
    // Register custom command
    context.registerCommand({
      name: 'deploy',
      description: 'Deploy to production',
      handler: async (opts, ctx) => {
        console.log('Deploying...');
      }
    });

    // Register hooks
    context.registerHook('pre-task', async (data) => {
      console.log('Task starting:', data.taskName);
    });
  }
};
```

```bash
fscr deploy  # Your custom command!
```

### 5. **Configuration Profiles** ⚙️

Manage multiple environments easily:

```json
{
  "fscripts": {
    "profiles": {
      "development": {
        "scriptsFile": "fscripts.md",
        "env": { "NODE_ENV": "development" }
      },
      "production": {
        "scriptsFile": "fscripts.prod.md",
        "env": { "NODE_ENV": "production" }
      }
    },
    "defaultProfile": "development"
  }
}
```

```bash
$ fscr profile list
  • development (active)
  • production

$ fscr profile switch production
$ fscr run deploy  # Uses production profile
```

### 6. **Smart Caching** 💾

```bash
# First run (cold cache)
$ time fscr run build
450ms

# Second run (warm cache)
$ time fscr run build
45ms  # 10x faster!
```

Automatic cache invalidation when `fscripts.md` changes.

### 7. **Developer Experience** 🎨

#### Beautiful Error Messages:
```bash
$ fscr run invalid-task

❌ Task "invalid-task" not found

Available tasks:
  • start:web
  • start:api
  • build
  ... and 23 more

Tip: Run "fscr list" to see all tasks
```

#### Progress Indicators:
```bash
▶️  Running task: build:all

Progress: [████████████████████░░░░░░░░] 85%

✅ Task completed: build:all (2.3s)
```

#### Performance Monitoring:
```bash
$ FSCR_PERF=1 fscr run test

Running tests...

─────────────────────────
⚡ Startup: 42.31ms
💾 Memory: 34.12MB
─────────────────────────
```

### 8. **Doctor Command** 🏥

Run diagnostics to ensure everything works:

```bash
$ fscr doctor

🔍 Running FSCR diagnostics...

✅ Node.js version
   v20.0.0 (recommended: >=18.0.0)

✅ Package manager (npm)
   npm 10.0.0 installed

✅ Git
   git version 2.40.0

✅ fscripts.md file
   Found (4,523 bytes)

✅ package.json
   Valid (fscr@7.0.0)

⚠️  TypeScript
   Not installed (optional)

✅ File permissions
   Read/write access OK

✅ Cache system
   Operational

─────────────────────────
Summary:
  ✅ Passed: 7
  ⚠️  Warnings: 1
─────────────────────────
```

Fix issues automatically:
```bash
fscr doctor --fix
```

---

## 📚 Commands

### Core Commands

| Command | Description | Example |
|---------|-------------|---------|
| `fscr` | Interactive menu | `fscr` |
| `run` | Run a specific task | `fscr run start:web` |
| `list` | List all tasks | `fscr list` |
| `scripts` | Choose from package.json | `fscr scripts` |
| `run-s` | Run tasks sequentially | `fscr run-s build test` |
| `run-p` | Run tasks in parallel | `fscr run-p start:web start:api` |

### Utility Commands

| Command | Description | Example |
|---------|-------------|---------|
| `generate` | Generate fscripts.md | `fscr generate` |
| `toc` | Generate table of contents | `fscr toc` |
| `clear` | Clear recent task history | `fscr clear` |
| `doctor` | Run diagnostics | `fscr doctor --fix` |
| `completion` | Shell completions | `fscr completion --install` |

### Configuration Commands

| Command | Description | Example |
|---------|-------------|---------|
| `profile list` | List profiles | `fscr profile list` |
| `profile create` | Create profile | `fscr profile create staging` |
| `profile switch` | Switch profile | `fscr profile switch prod` |
| `profile delete` | Delete profile | `fscr profile delete old` |

### Plugin Commands

| Command | Description | Example |
|---------|-------------|---------|
| `plugin list` | List plugins | `fscr plugin list` |
| `plugin install` | Install plugin | `fscr plugin install my-plugin` |
| `plugin uninstall` | Uninstall plugin | `fscr plugin uninstall my-plugin` |

---

## 🎓 Advanced Usage

### Environment Variables

```bash
# Override environment variables
fscr run deploy --env "API_KEY=xxx,ENV=prod"

# Multiple variables
fscr run test --env "CI=true,COVERAGE=80"
```

### Dry Run Mode

See what would be executed without running:

```bash
$ fscr run build --dry-run

🔍 Dry run mode - showing what would be executed:

Task: build
Language: bash
Type: npm
Environment:
  NODE_ENV=production

Script:
npm run build -- --production
```

### Silent Mode

Run without output (for CI/CD):

```bash
fscr run test --silent && echo "Tests passed!"
```

### Performance Benchmarks

```bash
$ npm run benchmark

🔬 Running 20 startup benchmarks...

📊 Results:
  Average:  45.23ms
  Median:   43.12ms
  Min:      38.45ms
  Max:      52.31ms
  P95:      48.76ms

✅ Target: <50ms
🎯 PASSED: Startup time within target!
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# UI mode
npm run test:ui
```

### Coverage Targets:
- ✅ Lines: 80%
- ✅ Functions: 80%
- ✅ Branches: 75%
- ✅ Statements: 80%

---

## 🏗️ Architecture

```
fscr/
├── src/
│   ├── cli.ts                    # Main entry (lazy loading)
│   ├── types/
│   │   └── index.ts              # TypeScript definitions
│   ├── commands/                 # Modular commands
│   │   ├── run.ts
│   │   ├── list.ts
│   │   ├── completion.ts
│   │   ├── doctor.ts
│   │   ├── profile.ts
│   │   └── ...
│   ├── lib/
│   │   ├── config.ts             # Profile-aware config
│   │   ├── cache.ts              # TTL cache manager
│   │   ├── plugins.ts            # Plugin system
│   │   ├── parsers/
│   │   │   ├── parseScriptsMd.ts
│   │   │   └── parsePackageJson.ts
│   │   └── running/
│   │       ├── runCLICommand.ts
│   │       ├── runSequence.ts
│   │       └── runParallel.ts
│   └── utils/
│       ├── script-parser.ts
│       ├── console.ts
│       └── package.ts
├── tests/                        # Comprehensive tests
├── benchmarks/                   # Performance benchmarks
├── bin/                          # Entry points
│   ├── fscr
│   └── fsr
├── tsconfig.json                 # TypeScript config
├── vitest.config.ts              # Test config
└── package.json
```

---

## 🔧 Development

### Setup:

```bash
git clone https://github.com/agrublev/freedcamp-script-runner.git
cd freedcamp-script-runner
npm install
```

### Development Workflow:

```bash
# Start in dev mode (no build needed)
npm run dev

# Type checking
npm run typecheck

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check

# Build
npm run build

# Test
npm test
npm run test:watch
```

---

## 📊 Performance Comparison

### v6.2.6 (Before) vs v7.0.0 (After)

| Metric | v6.2.6 | v7.0.0 | Improvement |
|--------|--------|--------|-------------|
| **Startup Time** | ~500ms | ~45ms | **10x faster** |
| **Memory (Heap)** | ~80MB | ~35MB | **56% less** |
| **Memory (External)** | ~15MB | ~8MB | **47% less** |
| **Bundle Size** | ~2.8MB | ~1.2MB | **57% smaller** |
| **Build Time** | ~3.5s (Babel) | ~1.2s (TSC) | **66% faster** |
| **Type Safety** | ❌ None | ✅ 100% | **Perfect** |
| **Shell Completions** | ❌ No | ✅ 4 shells | **Added** |
| **Plugin System** | ❌ No | ✅ Yes | **Added** |
| **Profiles** | ❌ No | ✅ Yes | **Added** |
| **Caching** | ❌ No | ✅ TTL cache | **Added** |
| **Test Coverage** | ~40% | ~85% | **2x better** |

---

## 🛣️ Roadmap

### v7.1.0 (Q2 2024)
- [ ] Watch mode for automatic reruns
- [ ] Remote script execution
- [ ] Cloud sync for configurations
- [ ] Web UI dashboard

### v7.2.0 (Q3 2024)
- [ ] Docker integration
- [ ] Kubernetes support
- [ ] CI/CD templates
- [ ] Metrics & analytics dashboard

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Development Setup:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit: `git commit -m 'Add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

---

## 📄 License

MIT © [Angel Grablev](https://github.com/agrublev)

---

## 🙏 Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js)
- Powered by [TypeScript](https://www.typescriptlang.org/)
- Tested with [Vitest](https://vitest.dev/)
- Styled with [Chalk](https://github.com/chalk/chalk)

---

## 📞 Support

- 🐛 [Report a bug](https://github.com/agrublev/freedcamp-script-runner/issues)
- 💡 [Request a feature](https://github.com/agrublev/freedcamp-script-runner/issues)
- 📖 [Read the docs](https://github.com/agrublev/freedcamp-script-runner/wiki)
- 💬 [Join discussions](https://github.com/agrublev/freedcamp-script-runner/discussions)

---

**Made with ❤️ for developers who love fast, simple tools**

⭐ Star us on GitHub if you find FSCR helpful!
