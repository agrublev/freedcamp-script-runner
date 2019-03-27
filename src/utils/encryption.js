const CryptoJS = require("crypto-js");
const chalk = require("chalk");

// console.log(CryptoJS.HmacSHA1("Message", "Key"));
// const SHA256 = require("crypto-js/sha256");
// console.log(SHA256("Message"));
//
const data = [{ id: 1 }, { id: 2 }];

// Encrypt
const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), "secret key 123");
console.warn(ciphertext.toString());

// Decrypt
const bytes = CryptoJS.AES.decrypt(ciphertext.toString(), "secret key 123");
const decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

console.log(decryptedData);
