import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

await build({
    entryPoints: [
        resolve(root, 'lib/ui/TaskPicker.js'),
        resolve(root, 'lib/ui/AutoComplete.js'),
        resolve(root, 'lib/ui/PluginPicker.js'),
    ],
    outdir: resolve(root, 'dist/lib/ui'),
    platform: 'node',
    format: 'esm',
    loader: { '.js': 'jsx' },
    jsx: 'automatic',
    bundle: false,
});
