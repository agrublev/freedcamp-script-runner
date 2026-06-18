import { build } from 'esbuild';
import { cp, mkdir, rm } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = resolve(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, 'lib'), { recursive: true });

// Copy non-UI lib files
await cp(resolve(root, 'lib'), resolve(dist, 'lib'), { recursive: true });

// Copy root index
await cp(resolve(root, 'index.js'), resolve(dist, 'index.js'));

// Transpile JSX UI files via esbuild (overwrites the raw copies)
await build({
    entryPoints: [
        resolve(root, 'lib/ui/TaskPicker.js'),
        resolve(root, 'lib/ui/AutoComplete.js'),
        resolve(root, 'lib/ui/PluginPicker.js'),
    ],
    outdir: resolve(dist, 'lib/ui'),
    platform: 'node',
    format: 'esm',
    loader: { '.js': 'jsx' },
    jsx: 'automatic',
    bundle: false,
});
