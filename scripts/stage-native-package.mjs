import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const target = process.argv[2];
const binary = process.argv[3];
if (!target || !binary) throw new Error("usage: node scripts/stage-native-package.mjs <target-triple> <binary-path>");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkgName = `fscr-${target.includes("windows") ? "win32" : target.includes("apple-darwin") ? "darwin" : "linux"}-${target.includes("aarch64") || target.includes("arm64") ? "arm64" : "x64"}`;
const out = resolve(root, "packages", pkgName);
mkdirSync(resolve(out, "bin"), { recursive: true });
const exe = target.includes("windows") ? "fsr.exe" : "fsr";
copyFileSync(resolve(binary), resolve(out, "bin", exe));
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
writeFileSync(resolve(out, "package.json"), JSON.stringify({
  name: pkgName, version, description: `Native fsr executable for ${pkgName.slice(5)}`,
  os: [pkgName.includes("win32") ? "win32" : pkgName.includes("darwin") ? "darwin" : "linux"],
  cpu: [pkgName.endsWith("arm64") ? "arm64" : "x64"],
  license: "MIT", files: ["bin"],
}, null, 2) + "\n");
