import { rm, mkdir, cp } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = resolve(root, "dist");

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const result = await Bun.build({
    entrypoints: [resolve(root, "index.js")],
    outdir: dist,
    target: "node",
    format: "esm",
    minify: true,
    loader: { ".js": "jsx" },
    define: { "process.env.NODE_ENV": '"production"' },
    // Native .node binary add-ons cannot be inlined.
    external: ["*.node"],
    metafile: true,
    optimizeImports: ["ink", "inquirer"],
    alias: {
        "@utils": resolve(root, "lib/utils"),
        "@fsr/core": resolve(root, "packages/core"),
        "@fsr/cmd-branch": resolve(root, "packages/cmd-branch"),
        "@fsr/cmd-commit": resolve(root, "packages/cmd-commit"),
        "@fsr/cmd-upgrade": resolve(root, "packages/cmd-upgrade"),
        "@fsr/cmd-bump": resolve(root, "packages/cmd-bump"),
        "@fsr/cmd-encryption": resolve(root, "packages/cmd-encryption"),
        "@fsr/cmd-generate": resolve(root, "packages/cmd-generate"),
        "@fsr/cmd-doctor": resolve(root, "packages/cmd-doctor"),
        "@fsr/cmd-completion": resolve(root, "packages/cmd-completion"),
        "@fsr/cmd-greet": resolve(root, "packages/cmd-greet"),
        "@fsr/cmd-start": resolve(root, "packages/cmd-start"),
        "@fsr/cmd-run": resolve(root, "packages/cmd-run"),
        "@fsr/cmd-clear": resolve(root, "packages/cmd-clear"),
        "@fsr/cmd-plugins": resolve(root, "packages/cmd-plugins")
    },
    plugins: [
        {
            // react-devtools-core is only loaded by ink when DEV=true — stub it
            // so the static import in devtools.js resolves at build time.
            name: "stub-react-devtools-core",
            setup(build) {
                build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
                    path: "stub",
                    namespace: "devtools-stub"
                }));
                build.onLoad({ filter: /.*/, namespace: "devtools-stub" }, () => ({
                    contents: "export default { initialize() {}, connectToDevTools() {} };",
                    loader: "js"
                }));
            }
        }
    ]
});
// await Bun.write("./dist/meta.json", JSON.stringify(result.metafile));
console.log(result.metafile);
const bytes = result.metafile.outputs["./index.js"].bytes;
console.log(`\n📦 Bundle: ${(bytes / 1024).toFixed(1)} KB\n`);

// Analyze bundle composition
const inputs = Object.entries(result.metafile.inputs).map(([path, info]) => ({
    path,
    bytes: info.bytes,
    isNodeModule: path.includes("node_modules")
}));

// Sort by size (largest first)
inputs.sort((a, b) => b.bytes - a.bytes);

// Group by category
const nodeModules = inputs.filter((i) => i.isNodeModule);
const projectFiles = inputs.filter((i) => !i.isNodeModule);

const nodeModulesSize = nodeModules.reduce((sum, i) => sum + i.bytes, 0);
const projectFilesSize = projectFiles.reduce((sum, i) => sum + i.bytes, 0);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("📊 BUNDLE SIZE BREAKDOWN");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

console.log("\n📦 Category Summary:");
console.log(
    `  node_modules: ${(nodeModulesSize / 1024).toFixed(1)} KB (${nodeModules.length} files)`
);
console.log(
    `  project files: ${(projectFilesSize / 1024).toFixed(1)} KB (${projectFiles.length} files)`
);
console.log(`  Total: ${((nodeModulesSize + projectFilesSize) / 1024).toFixed(1)} KB`);

console.log("\n🔝 Top 20 Largest Files:");
inputs.slice(0, 20).forEach((input, idx) => {
    const size = (input.bytes / 1024).toFixed(1);
    const percentage = ((input.bytes / bytes) * 100).toFixed(1);
    const label = input.isNodeModule ? "📚" : "📄";
    const displayPath = input.path.replace(root + "/", "");
    console.log(
        `  ${(idx + 1).toString().padStart(2)}. ${label} ${size.padStart(
            6
        )} KB (${percentage.padStart(4)}%) ${displayPath}`
    );
});

// Group node_modules by package
const packageSizes = {};
nodeModules.forEach((input) => {
    const match = input.path.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
    if (match) {
        const pkg = match[1];
        packageSizes[pkg] = (packageSizes[pkg] || 0) + input.bytes;
    }
});

const topPackages = Object.entries(packageSizes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

console.log("\n📚 Top 15 Largest Packages:");
topPackages.forEach(([pkg, pkgBytes], idx) => {
    const size = (pkgBytes / 1024).toFixed(1);
    const percentage = ((pkgBytes / bytes) * 100).toFixed(1);
    console.log(
        `  ${(idx + 1).toString().padStart(2)}. ${size.padStart(6)} KB (${percentage.padStart(
            4
        )}%) ${pkg}`
    );
});

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
if (!result.success) {
    for (const log of result.logs) console.error(log);
    process.exit(1);
}

const [output] = result.outputs;
console.log(`Bundle: ${(output.size / 1024).toFixed(1)} KB`);

const completionScriptsSource = resolve(root, "packages/cmd-completion/scripts");
const completionScriptsTarget = resolve(dist, "scripts");
await cp(completionScriptsSource, completionScriptsTarget, { recursive: true, force: true });
console.log("Copied completion scripts to dist/scripts");
