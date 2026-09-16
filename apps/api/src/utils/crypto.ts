import crypto from "crypto";
import { config } from "../config/env.js";

const ALGORITHM = "aes-256-gcm";

/**
 * Derives a consistent 256-bit encryption key from config or environment variable.
 */
function getEncryptionKey(): Buffer {
  const customKey =
    config.tokenEncryptionKey || process.env.TOKEN_ENCRYPTION_KEY;
  if (customKey) {
    if (customKey.length === 64) {
      return Buffer.from(customKey, "hex");
    }
    return crypto.createHash("sha256").update(customKey).digest();
  }
  // Development fallback
  return crypto.createHash("sha256").update(config.jwt.secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a 96-bit random IV.
 * Output format: "ivHex:authTagHex:ciphertextHex"
 */
export function encryptSecret(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string formatted as "ivHex:authTagHex:ciphertextHex".
 * Validates GCM authentication tag to prevent tampering.
 */
export function decryptSecret(cipherString: string): string {
  const parts = cipherString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted token format");
  }

  const [ivHex, authTagHex, encrypted] = parts;
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Malformed encrypted token components");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const key = getEncryptionKey();

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
