import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import chalk from "chalk";
import { decrypt, encrypt } from "../utils/encryption.js";
import fsrLog from "../utils/console.js";

const SUFFIX = ".encrypted";

const encrypted = {};

// fc-filepick is only reachable when no file argument is given — imported lazily
// so the arg-driven path loads nothing beyond node builtins.
const pickFile = async () => {
    const { default: mod } = await import("fc-filepick");
    return (mod.default ?? mod)({ type: "file" });
};

// `.env.encrypted` -> `.env`. Anything else gets a suffix appended so the
// ciphertext is never overwritten by its own plaintext.
const plaintextPathFor = (file) =>
    file.endsWith(SUFFIX) ? file.slice(0, -SUFFIX.length) : `${file}.decrypted`;

// Nothing here prompts, so an existing target is an error rather than a question.
const assertWritable = (file, force) => {
    if (!force && fs.existsSync(file)) {
        throw new Error(`Target already exists: ${file} — pass --force to overwrite`);
    }
};

const requirePass = (pass) => {
    const resolved = pass || process.env.FSR_PASS || null;
    if (!resolved) {
        throw new Error("A password is required — pass --pass <password> or set $FSR_PASS");
    }
    return resolved;
};

encrypted.encrypt = async (pass, encryptedFile = null, decryptedFile = null, force = false) => {
    pass = requirePass(pass);
    if (decryptedFile === null) {
        // the picked path is kept as-is, so files outside the cwd resolve correctly
        decryptedFile = await pickFile();
        encryptedFile = `${decryptedFile}${SUFFIX}`;
    }
    assertWritable(encryptedFile, force);
    fs.writeFileSync(encryptedFile, encrypt(fs.readFileSync(decryptedFile), pass));
    fsrLog.warn(`${chalk.bold.green.underline("ENCRYPTED FILE:")} ${chalk.bold.dim(encryptedFile)}`);
};

encrypted.decrypt = async (pass, encryptedFile = null, decryptedFile = null, force = false) => {
    pass = requirePass(pass);
    if (encryptedFile === null) {
        encryptedFile = await pickFile();
        decryptedFile = plaintextPathFor(encryptedFile);
    }
    assertWritable(decryptedFile, force);
    fs.writeFileSync(decryptedFile, decrypt(fs.readFileSync(encryptedFile, "utf8"), pass));
    fsrLog.warn(`${chalk.bold.green.underline("DECRYPTED FILE:")} ${chalk.bold.dim(decryptedFile)}`);
};

/**
 * Single entry both the standalone CLI and `fsr encrypt|decrypt` go through.
 * Omitting `file` falls back to the file picker; `pass` is always required.
 */
encrypted.run = async ({ file = null, pass = null, decrypt: isDecrypt = false, force = false } = {}) => {
    pass = requirePass(pass);
    if (file === null || file === undefined) {
        return isDecrypt
            ? encrypted.decrypt(pass, null, null, force)
            : encrypted.encrypt(pass, null, null, force);
    }
    if (isDecrypt) {
        // `.env` and `.env.encrypted` are both accepted as the argument
        const source =
            !file.endsWith(SUFFIX) && fs.existsSync(`${file}${SUFFIX}`) ? `${file}${SUFFIX}` : file;
        if (!fs.existsSync(source)) {
            throw new Error(`File not found: ${source}`);
        }
        return encrypted.decrypt(pass, source, plaintextPathFor(source), force);
    }
    if (!fs.existsSync(file)) {
        throw new Error(`File not found: ${file}`);
    }
    return encrypted.encrypt(pass, `${file}${SUFFIX}`, file, force);
};

const USAGE = `Usage: node lib/encryption/encryption.js <file> --pass <password> [options]

  <file>                 file to encrypt, or the file to decrypt back
                         (omit it to choose one with the file picker)

Options:
  -p, --pass <password>  password — required, or set $FSR_PASS instead
  -d, --decrypt          decrypt instead of encrypt
  -f, --force            overwrite the target if it already exists
  -h, --help             show this help

Examples:
  node lib/encryption/encryption.js .env --pass s3cret            # .env -> .env.encrypted
  node lib/encryption/encryption.js .env --pass s3cret --decrypt  # .env.encrypted -> .env`;

const parseArgs = (argv) => {
    const opts = { file: null, pass: null, decrypt: false, force: false, help: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "-d" || arg === "--decrypt") opts.decrypt = true;
        else if (arg === "-f" || arg === "--force") opts.force = true;
        else if (arg === "-h" || arg === "--help") opts.help = true;
        else if (arg === "-p" || arg === "--pass") opts.pass = argv[++i] ?? null;
        else if (arg.startsWith("--pass=")) opts.pass = arg.slice("--pass=".length);
        else if (!arg.startsWith("-") && opts.file === null) opts.file = arg;
    }
    return opts;
};

encrypted.cli = async (argv = process.argv.slice(2)) => {
    const { help, ...opts } = parseArgs(argv);
    // bare invocation is a usage request, not an error to explain
    if (help || (opts.file === null && !opts.pass)) {
        fsrLog.log(USAGE);
        return help ? 0 : 1;
    }
    await encrypted.run(opts);
    return 0;
};

// Standalone: `node lib/encryption/encryption.js <file> --pass X [--decrypt]`.
// The basename check keeps this inert inside the bundled dist/index.js, where
// import.meta.url and argv[1] both resolve to the bundle itself.
if (
    process.argv[1] &&
    path.basename(process.argv[1], ".js") === "encryption" &&
    import.meta.url === pathToFileURL(process.argv[1]).href
) {
    encrypted
        .cli()
        .then((code) => {
            process.exitCode = code;
        })
        .catch((err) => {
            fsrLog.error(chalk.bold.red(err.message));
            process.exitCode = 1;
        });
}

export default { ...encrypted };
