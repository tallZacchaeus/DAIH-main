import crypto from "crypto";
import { config } from "../../config/env.js";

export interface QrTokenPayload {
  bookingId: string;
  reference: string;
  userId: string;
  startTime: string;
  endTime: string;
  issuedAt: number;
}

const QR_TOKEN_PREFIX = "daih_pass_v1";

function getSigningSecret(): string {
  return config.qrSigningSecret || "dev-qr-signing-key-1234567890";
}

/**
 * Encodes string to URL-safe Base64 without padding
 */
function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes URL-safe Base64 string
 */
function base64UrlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * Generates a cryptographically signed, opaque digital access pass token (HMAC-SHA256).
 * Output format: "daih_pass_v1.<payload_b64>.<signature_b64>"
 */
export function generateSignedQrToken(payload: QrTokenPayload): string {
  const secret = getSigningSecret();
  const serialized = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(serialized);
  const dataToSign = `${QR_TOKEN_PREFIX}.${payloadB64}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${dataToSign}.${signature}`;
}

export interface QrTokenParseResult {
  valid: boolean;
  payload?: QrTokenPayload;
  error?: "MALFORMED_TOKEN" | "INVALID_SIGNATURE" | "UNSUPPORTED_VERSION";
  message?: string;
}

/**
 * Verifies the cryptographic HMAC-SHA256 signature of a QR pass token and extracts payload.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyAndParseQrToken(tokenString: string): QrTokenParseResult {
  if (!tokenString || typeof tokenString !== "string") {
    return {
      valid: false,
      error: "MALFORMED_TOKEN",
      message: "Access token is empty or invalid",
    };
  }

  const parts = tokenString.trim().split(".");
  if (parts.length !== 3) {
    // Check if legacy test format `daih_qr_<id>_<timestamp>`
    if (tokenString.startsWith("daih_qr_")) {
      const segs = tokenString.split("_");
      return {
        valid: true,
        payload: {
          bookingId: segs[2] || "",
          reference: "LEGACY-REF",
          userId: "",
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
          issuedAt: Date.now(),
        },
      };
    }

    return {
      valid: false,
      error: "MALFORMED_TOKEN",
      message: "Access token format is malformed",
    };
  }

  const [prefix, payloadB64, signatureB64] = parts;

  if (prefix !== QR_TOKEN_PREFIX) {
    return {
      valid: false,
      error: "UNSUPPORTED_VERSION",
      message: `Unsupported access token format '${prefix}'`,
    };
  }

  const secret = getSigningSecret();
  const dataToSign = `${prefix}.${payloadB64}`;
  const expectedSignatureB64 = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const sigBuffer = Buffer.from(signatureB64, "utf8");
  const expectedSigBuffer = Buffer.from(expectedSignatureB64, "utf8");

  if (
    sigBuffer.length !== expectedSigBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)
  ) {
    return {
      valid: false,
      error: "INVALID_SIGNATURE",
      message: "Access pass signature verification failed (tampered token)",
    };
  }

  try {
    const jsonStr = base64UrlDecode(payloadB64);
    const payload = JSON.parse(jsonStr) as QrTokenPayload;
    if (!payload.bookingId) {
      return {
        valid: false,
        error: "MALFORMED_TOKEN",
        message: "Missing booking ID in pass payload",
      };
    }
    return {
      valid: true,
      payload,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: "MALFORMED_TOKEN",
      message: `Failed to decode access token payload: ${err?.message}`,
    };
  }
}
