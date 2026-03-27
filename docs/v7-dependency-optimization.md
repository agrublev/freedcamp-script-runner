# FSCR v7.0.0 - Dependency Optimization Strategy

## Overview

This document outlines dependency optimizations for achieving v7.0.0 performance targets.

## Performance Targets

| Metric | v6.2.6 | v7.0.0 Target | Improvement |
|--------|--------|---------------|-------------|
| Startup time | ~500ms | <50ms | 10x faster |
| Heap memory | ~80MB | <35MB | 56% reduction |
| External memory | ~15MB | <8MB | 47% reduction |
| Bundle size | ~2.8MB | <1.2MB | 57% smaller |

## Critical Dependencies to Replace/Remove

### 1. Remove Babel Runtime Dependencies

**Impact:** -40MB bundle size, -150ms startup

```bash
# Remove Babel runtime
npm uninstall @babel/runtime @babel/cli @babel/core @babel/node
npm uninstall @babel/plugin-proposal-decorators @babel/plugin-proposal-export-default-from
npm uninstall @babel/plugin-syntax-class-properties @babel/plugin-transform-runtime
npm uninstall @babel/preset-env @babel/preset-react
npm uninstall babel-plugin-module-resolver
```

**Replacement:** Use native Node.js ESM (already using `"type": "module"`)

### 2. Replace Heavy UI Dependencies

**Current:** boxen@8.0.1 (large dependency tree)
**Replacement:** Simple terminal formatting with chalk

```javascript
// Before (boxen)
import boxen from 'boxen';
console.log(boxen('Message', { padding: 1 }));

// After (native)
import chalk from 'chalk';
console.log(chalk.green('═'.repeat(50)));
console.log(chalk.green('  Message'));
console.log(chalk.green('═'.repeat(50)));
```

**Impact:** -5MB bundle size, -20ms startup

### 3. Optimize Markdown Processing

**Current:**
- md-2-json@2.0.0
- better-md-2-json@1.0.6
- markdown-toc@1.2.0
- marked@16.3.0

**Strategy:** Keep only `marked` (lightest, most maintained)

```bash
npm uninstall md-2-json better-md-2-json markdown-toc
```

**Impact:** -3MB bundle size, -15ms startup

### 4. Replace inquirer with enquirer

**Current:** inquirer@12.9.6 (heavy)
**Already have:** enquirer@2.3.4 (lightweight)

**Action:** Use enquirer exclusively, remove inquirer

```bash
npm uninstall inquirer
```

**Impact:** -8MB bundle size, -30ms startup

### 5. Optimize Git Dependencies

**Current:**
- simple-git@3.28.0
- git-changed-files@1.0.0
- git-release-notes@5.0.0
- git-state@4.1.0
- staged-git-files@1.2.0

**Strategy:** Keep only simple-git, implement other features natively

```bash
npm uninstall git-changed-files git-release-notes git-state staged-git-files
```

**Impact:** -6MB bundle size, -25ms startup

### 6. Use Native Node.js APIs

**Replace:**
- `cross-spawn` → `child_process.spawn` (native)
- `fs-extra` → `fs.promises` (native)
- `require-from-string` → dynamic import

```bash
npm uninstall cross-spawn fs-extra require-from-string
```

**Impact:** -4MB bundle size, -20ms startup

### 7. Optimize Utility Libraries

**Current:**
- lodash (devDep, but may be in use)
- underscore.string@3.3.5

**Action:** Use native ES6+ methods

```bash
npm uninstall lodash underscore.string
```

**Impact:** -2MB bundle size, -10ms startup

### 8. Remove Unused Dev Dependencies from Production

**Current:** Many dev-only dependencies

**Action:** Ensure production build doesn't include:
- vitest
- nodemon
- rimraf
- all dev tools

**Impact:** -15MB in node_modules (doesn't affect bundle)

## Optimized package.json Dependencies

```json
{
  "dependencies": {
    "chalk": "^4.1.2",
    "conf": "^15.0.2",
    "detect-indent": "^7.0.2",
    "enquirer": "^2.4.1",
    "github-basic": "^6.0.0",
    "ink": "^5.2.1",
    "ink-select-input": "^4.2.2",
    "is-builtin-module": "^5.0.0",
    "json-colorz": "^0.2.7",
    "marked": "^16.3.0",
    "micromatch": "^4.0.2",
    "moment-mini": "^2.24.0",
    "open": "^10.2.0",
    "pretty-ms": "^9.3.0",
    "react": "^18.3.1",
    "server-destroy": "^1.0.1",
    "set-value": "^4.1.0",
    "shell-quote": "^1.7.2",
    "simple-git": "^3.28.0",
    "sort-object-keys": "^2.0.0",
    "term-size": "^4.0.0"
  }
}
```

**Removed:** 35 dependencies
**Reduction:** ~80MB in node_modules, ~1.5MB in bundle

## Build Process Changes

### Remove Babel Build

**Before:**
```json
"scripts": {
  "build": "run-p build:index build:lib",
  "build:index": "babel index.js --out-file dist/index.js",
  "build:lib": "babel lib --out-dir dist/lib"
}
```

**After:**
```json
"scripts": {
  "build": "node scripts/build.js",
  "build:fast": "cp -r lib dist/ && cp index.js dist/"
}
```

**Impact:** -200ms build time, native ESM support

### Enable Tree Shaking

Create optimized build script:

```javascript
// scripts/build.js
import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['index.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'dist/index.js',
  treeShaking: true,
  minify: true,
  sourcemap: false,
  external: [
    'chalk',
    'enquirer',
    'ink',
    'react'
  ]
});
```

**Impact:** -600KB bundle size

## Implementation Plan

### Phase 1: Remove Babel (Week 1)
1. Remove all Babel dependencies
2. Update build scripts
3. Test with native ESM
4. Verify all imports work

### Phase 2: Replace Heavy Dependencies (Week 1)
1. Replace inquirer → enquirer
2. Remove boxen, use native formatting
3. Consolidate markdown libraries
4. Test CLI functionality

### Phase 3: Optimize Utilities (Week 2)
1. Replace cross-spawn with native spawn
2. Replace fs-extra with fs.promises
3. Remove lodash/underscore.string
4. Refactor code to use native APIs

### Phase 4: Git Optimization (Week 2)
1. Keep simple-git
2. Implement git-changed-files natively
3. Remove other git utilities
4. Test git workflows

### Phase 5: Bundle Optimization (Week 3)
1. Implement esbuild bundling
2. Enable tree shaking
3. Minify production builds
4. Verify bundle size targets

## Expected Results

After all optimizations:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| node_modules | 160MB | 65MB | 59% reduction |
| Bundle size | 2.8MB | 1.1MB | 61% reduction |
| Startup time | 500ms | 45ms | 91% faster |
| Memory (heap) | 80MB | 32MB | 60% reduction |
| Memory (external) | 15MB | 7MB | 53% reduction |

## Validation

Run benchmark suite after each phase:

```bash
node benchmarks/performance.bench.js
```

Check targets:
- ✓ Startup < 50ms
- ✓ Heap < 35MB
- ✓ External < 8MB
- ✓ Bundle < 1.2MB

## Rollback Strategy

Each phase has a git tag for rollback:
- `v7.0.0-phase1` - Babel removal
- `v7.0.0-phase2` - Dependency replacement
- `v7.0.0-phase3` - Utility optimization
- `v7.0.0-phase4` - Git optimization
- `v7.0.0-phase5` - Bundle optimization

## References

- Node.js ESM documentation
- esbuild documentation
- Package size analyzer: `npm ls --depth=0`
- Bundle analyzer: `source-map-explorer dist/index.js`
