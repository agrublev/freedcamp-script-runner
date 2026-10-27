import crypto from "crypto";

// OpenSSL / CryptoJS-compatible AES-256-CBC.
// Output format matches `CryptoJS.AES.encrypt(text, password).toString()` and
// `openssl enc -aes-256-cbc -salt -base64`: base64("Salted__" + 8-byte salt + ciphertext).
const algorithm = "aes-256-cbc";
const MAGIC = Buffer.from("Salted__", "utf8");

// OpenSSL EVP_BytesToKey (MD5) key+IV derivation from password + salt.
const deriveKeyIv = (password, salt) => {
    const pass = Buffer.from(password, "utf8");
    let data = Buffer.alloc(0);
    let block = Buffer.alloc(0);
    while (data.length < 48) {
        // 32-byte key + 16-byte IV
        block = crypto.createHash("md5").update(Buffer.concat([block, pass, salt])).digest();
        data = Buffer.concat([data, block]);
    }
    return { key: data.subarray(0, 32), iv: data.subarray(32, 48) };
};

const encrypt = (toEncrypt, password) => {
    const salt = crypto.randomBytes(8);
    const { key, iv } = deriveKeyIv(password, salt);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const input = Buffer.isBuffer(toEncrypt) ? toEncrypt : Buffer.from(toEncrypt, "utf8");
    const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
    return Buffer.concat([MAGIC, salt, ciphertext]).toString("base64");
};

const decryptLegacy = (toDecrypt, password) => {
    const key = crypto.scryptSync(password, "salt", 24);
    const iv = Buffer.alloc(16, 0);
    const decipher = crypto.createDecipheriv("aes-192-cbc", key, iv);
    return Buffer.concat([
        decipher.update(Buffer.from(String(toDecrypt).trim(), "hex")),
        decipher.final()
    ]);
};

const decrypt = (toDecrypt, password) => {
    const raw = String(toDecrypt).trim();
    const data = Buffer.from(raw, "base64");
    if (!data.subarray(0, 8).equals(MAGIC)) {
        // legacy format: hex-encoded AES-192-CBC
        return decryptLegacy(raw, password);
    }
    const salt = data.subarray(8, 16);
    const ciphertext = data.subarray(16);
    const { key, iv } = deriveKeyIv(password, salt);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    try {
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    } catch (e) {
        throw new Error("Decryption failed — wrong password or corrupted file");
    }
};

export { decrypt, encrypt };
