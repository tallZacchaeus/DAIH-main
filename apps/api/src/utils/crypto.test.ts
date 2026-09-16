import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "./crypto.js";

describe("AES-256-GCM Symmetric Token Encryption Utility", () => {
  it("should encrypt and decrypt raw tokens accurately", () => {
    const rawToken =
      "d94b8e21a0f54316827c88b0a1f9e8a93bc48d7210e3954a7c1b52e04f691c28";
    const encrypted = encryptSecret(rawToken);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(rawToken);

    // Verify format iv:authTag:ciphertext
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3);
    expect(parts[0].length).toBe(24); // 12 bytes = 24 hex chars
    expect(parts[1].length).toBe(32); // 16 bytes = 32 hex chars

    // Decrypt and verify equality
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawToken);
  });

  it("should generate unique ciphertexts and IVs for the same plaintext", () => {
    const plainText = "my-secure-sample-token";
    const enc1 = encryptSecret(plainText);
    const enc2 = encryptSecret(plainText);

    expect(enc1).not.toBe(enc2);
    expect(decryptSecret(enc1)).toBe(plainText);
    expect(decryptSecret(enc2)).toBe(plainText);
  });

  it("should throw an error when attempting to decrypt tampered ciphertexts", () => {
    const plainText = "sensitive-reset-token-12345";
    const encrypted = encryptSecret(plainText);
    const parts = encrypted.split(":");

    // Tamper with ciphertext
    const tamperedCiphertext =
      parts[0] + ":" + parts[1] + ":" + parts[2].slice(0, -2) + "00";

    expect(() => decryptSecret(tamperedCiphertext)).toThrow();
  });

  it("should throw an error on malformed token formats", () => {
    expect(() => decryptSecret("invalid-format")).toThrow();
    expect(() => decryptSecret("::")).toThrow();
  });
});
