import encrypt from "./encryption.js";

/** @type {import("@fsr/cli").CommandDefinition[]} */
const commands = [
    {
        cmd: "encryption",
        desc: "Encrypt or decrypt secret files interactively",
        handler: async () => encrypt.init(),
        menu: true
    },
    {
        cmd: "encrypt",
        desc: "Encrypt secret files",
        handler: async () => encrypt.encrypt()
    },
    {
        cmd: "decrypt",
        desc: "Decrypt secret files",
        handler: async () => encrypt.decrypt()
    }
];
export default commands;
