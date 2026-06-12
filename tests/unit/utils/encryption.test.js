import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../../lib/utils/encryption.js';

/**
 * The encryption util must be OpenSSL / CryptoJS compatible:
 *   base64("Salted__" + 8-byte salt + AES-256-CBC ciphertext), key/IV via EVP_BytesToKey (MD5).
 *
 * This is a regression suite for the "wrong final block length" bug, where the util had been
 * switched to an incompatible scheme (AES-192-CBC / fixed scrypt salt / zero IV / hex) and could
 * no longer decrypt files produced by CryptoJS (e.g. the committed `.config.json`).
 */

const PASSWORD = 'secret';

// Ciphertext produced externally by CryptoJS.AES.encrypt(json, 'secret').toString().
// This is the exact value committed in `.config.json` and is the anchor for cross-impl compat.
const CRYPTOJS_CIPHERTEXT =
    'U2FsdGVkX18JEPfTiyy4VqH7HsBUWVy10KDnffESQz7jJI/53EtI+F2Ydih9+SfF5CKCdJmz7CFw1uTBJawHxQ==';
const EXPECTED_PLAINTEXT = { angelsSecret: 'VERY52', key: '5252' };

describe('utils/encryption', () => {
    describe('decrypt (CryptoJS/OpenSSL compatibility)', () => {
        it('decrypts a CryptoJS-produced ciphertext with the correct password', () => {
            const plaintext = decrypt(CRYPTOJS_CIPHERTEXT, PASSWORD);
            expect(JSON.parse(plaintext)).toEqual(EXPECTED_PLAINTEXT);
        });

        it('tolerates trailing whitespace/newline in the encrypted input', () => {
            const plaintext = decrypt(`${CRYPTOJS_CIPHERTEXT}\n`, PASSWORD);
            expect(JSON.parse(plaintext)).toEqual(EXPECTED_PLAINTEXT);
        });

        it('throws a friendly error on a wrong password (not a raw OpenSSL crash)', () => {
            expect(() => decrypt(CRYPTOJS_CIPHERTEXT, 'wrong-password')).toThrow(
                /wrong password or corrupted file/i
            );
        });

        it('rejects input that is not in the OpenSSL "Salted__" format', () => {
            expect(() => decrypt('not-an-encrypted-file', PASSWORD)).toThrow(
                /invalid encrypted file format/i
            );
        });
    });

    describe('encrypt', () => {
        it('produces base64 output with the OpenSSL "Salted__" header', () => {
            const out = encrypt('hello world', PASSWORD);
            const raw = Buffer.from(out, 'base64');
            expect(raw.subarray(0, 8).toString('utf8')).toBe('Salted__');
        });

        it('uses a random salt (same input encrypts to different ciphertext)', () => {
            const a = encrypt('same input', PASSWORD);
            const b = encrypt('same input', PASSWORD);
            expect(a).not.toBe(b);
        });
    });

    describe('round-trip', () => {
        const cases = {
            'a JSON document': JSON.stringify({ a: 1, nested: { b: [1, 2, 3] } }, null, 4),
            'an empty string': '',
            'unicode and emoji': 'héllo — 世界 🔐',
            'a large payload': 'x'.repeat(10000)
        };

        for (const [name, input] of Object.entries(cases)) {
            it(`encrypt → decrypt restores ${name}`, () => {
                expect(decrypt(encrypt(input, PASSWORD), PASSWORD)).toBe(input);
            });
        }

        it('is interoperable: our encrypt output decrypts back with our decrypt', () => {
            const secret = JSON.stringify(EXPECTED_PLAINTEXT);
            const roundTripped = decrypt(encrypt(secret, PASSWORD), PASSWORD);
            expect(JSON.parse(roundTripped)).toEqual(EXPECTED_PLAINTEXT);
        });
    });
});
