const crypto = require("crypto");
const algorithm = "aes-192-cbc";
const iv = Buffer.alloc(16, 0); // Initialization vector.
const encrypt = (toEncrypt, password) => {
    const key = crypto.scryptSync(password, "salt", 24);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(toEncrypt, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
};
const decrypt = (toDecrypt, password) => {
    const key = crypto.scryptSync(password, "salt", 24);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);

    let decrypted = decipher.update(toDecrypt, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};
module.exports = { decrypt, encrypt };
