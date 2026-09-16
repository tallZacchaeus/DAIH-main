import argon2 from "argon2";
import crypto from "crypto";

export const DUMMY_ARGON2_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$ZHVtbXlzYWx0MTIzNDU2Nw$q9F47K3i0pXjJb9kG7wY1A0k5Z8m3n2vQ1Y5t7u9o3w";

export class PasswordService {
  /**
   * Hash password using Argon2
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verify password against Argon2 hash
   */
  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Pre-computed dummy hash for timing attack mitigation
   */
  getDummyHash(): string {
    return DUMMY_ARGON2_HASH;
  }

  /**
   * Generate an unguessable random token (e.g. 64-char hex string)
   */
  generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString("hex");
  }

  /**
   * Hash a raw token with SHA-256 for secure database storage
   */
  hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

export const passwordService = new PasswordService();
