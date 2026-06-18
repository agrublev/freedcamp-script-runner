import { build } from 'esbuild';
import { mkdir, rm } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const result = await build({
    entryPoints: [resolve(root, 'index.js')],
    outfile: resolve(dist, 'index.js'),
    platform: 'node',
    format: 'esm',
    bundle: true,
    minify: true,
    loader: { '.js': 'jsx' },
    jsx: 'automatic',
    target: ['node18'],
    // Replace process.env.NODE_ENV with 'production' to eliminate dev-only code
    define: {
        'process.env.NODE_ENV': '"production"'
    },
    // react-devtools-core is only imported by ink when DEV=true and the package
    // is explicitly installed — neither applies in production. Alias to a no-op
    // stub so the static import resolves without the real package present.
    // CJS packages in the dep tree call require() for Node built-ins at runtime.
    // esbuild's CJS-in-ESM polyfill can't resolve them; inject a real require.
    banner: { js: "import{createRequire}from'module';const require=createRequire(import.meta.url);" },
    alias: { 'react-devtools-core': resolve(root, 'scripts', '_stub-devtools.mjs') },
    // Native .node binary add-ons cannot be inlined.
    external: ['*.node'],
    metafile: true,
});

const bytes = result.metafile.outputs['dist/index.js'].bytes;
console.log(`\n📦 Bundle: ${(bytes / 1024).toFixed(1)} KB\n`);

// Analyze bundle composition
const inputs = Object.entries(result.metafile.inputs).map(([path, info]) => ({
    path,
    bytes: info.bytes,
    isNodeModule: path.includes('node_modules')
}));

// Sort by size (largest first)
inputs.sort((a, b) => b.bytes - a.bytes);

// Group by category
const nodeModules = inputs.filter(i => i.isNodeModule);
const projectFiles = inputs.filter(i => !i.isNodeModule);

const nodeModulesSize = nodeModules.reduce((sum, i) => sum + i.bytes, 0);
const projectFilesSize = projectFiles.reduce((sum, i) => sum + i.bytes, 0);

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 BUNDLE SIZE BREAKDOWN');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

console.log('\n📦 Category Summary:');
console.log(`  node_modules: ${(nodeModulesSize / 1024).toFixed(1)} KB (${nodeModules.length} files)`);
console.log(`  project files: ${(projectFilesSize / 1024).toFixed(1)} KB (${projectFiles.length} files)`);
console.log(`  Total: ${((nodeModulesSize + projectFilesSize) / 1024).toFixed(1)} KB`);

console.log('\n🔝 Top 20 Largest Files:');
inputs.slice(0, 20).forEach((input, idx) => {
    const size = (input.bytes / 1024).toFixed(1);
    const percentage = ((input.bytes / bytes) * 100).toFixed(1);
    const label = input.isNodeModule ? '📚' : '📄';
    const displayPath = input.path.replace(root + '/', '');
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${label} ${size.padStart(6)} KB (${percentage.padStart(4)}%) ${displayPath}`);
});

// Group node_modules by package
const packageSizes = {};
nodeModules.forEach(input => {
    const match = input.path.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
    if (match) {
        const pkg = match[1];
        packageSizes[pkg] = (packageSizes[pkg] || 0) + input.bytes;
    }
});

const topPackages = Object.entries(packageSizes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

console.log('\n📚 Top 15 Largest Packages:');
topPackages.forEach(([pkg, pkgBytes], idx) => {
    const size = (pkgBytes / 1024).toFixed(1);
    const percentage = ((pkgBytes / bytes) * 100).toFixed(1);
    console.log(`  ${(idx + 1).toString().padStart(2)}. ${size.padStart(6)} KB (${percentage.padStart(4)}%) ${pkg}`);
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
