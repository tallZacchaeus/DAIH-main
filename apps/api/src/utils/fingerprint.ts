import { Request } from "express";
import crypto from "node:crypto";
import ipaddr from "ipaddr.js";
import { config } from "../config/env.js";

/**
 * Masks an IP address to preserve user anonymity and accommodate normal subnet shifts:
 * - IPv4 is masked to /24 subnet (e.g. 192.168.1.100 -> 192.168.1.0)
 * - IPv6 is masked to /64 prefix (e.g. 2001:db8:85a3::8a2e:370:7334 -> 2001:db8:85a3::)
 * - IPv4-mapped IPv6 (::ffff:192.168.1.100) is normalized to IPv4 and masked to /24
 */
export function maskIpAddress(rawIp?: string | null): string {
  if (!rawIp || typeof rawIp !== "string") {
    return "0.0.0.0";
  }

  let cleanIp = rawIp.trim();

  // Normalize all local loopback addresses (IPv4, IPv6, mapped) to uniform subnet
  if (
    cleanIp === "::1" ||
    cleanIp === "127.0.0.1" ||
    cleanIp === "localhost" ||
    cleanIp === "::ffff:127.0.0.1"
  ) {
    return "127.0.0.0";
  }

  // Strip port if present (e.g. "192.168.1.100:54321")
  if (
    cleanIp.includes(".") &&
    cleanIp.includes(":") &&
    !cleanIp.startsWith("::")
  ) {
    const parts = cleanIp.split(":");
    if (parts.length === 2 && !isNaN(Number(parts[1]))) {
      cleanIp = parts[0];
    }
  }

  // Handle explicit IPv4 mapped notation
  if (cleanIp.startsWith("::ffff:") && cleanIp.includes(".")) {
    cleanIp = cleanIp.replace("::ffff:", "");
  }

  try {
    const addr = ipaddr.parse(cleanIp);
    if (addr.kind() === "ipv4") {
      return ipaddr.IPv4.networkAddressFromCIDR(`${cleanIp}/24`).toString();
    } else if (addr.kind() === "ipv6") {
      const v6 = addr as ipaddr.IPv6;
      if (v6.isIPv4MappedAddress()) {
        const v4 = v6.toIPv4Address();
        return ipaddr.IPv4.networkAddressFromCIDR(
          `${v4.toString()}/24`,
        ).toString();
      }
      // Mask lower 64 bits (parts 4, 5, 6, 7)
      const parts = v6.parts.slice(0, 4).concat([0, 0, 0, 0]);
      return new ipaddr.IPv6(parts).toString();
    }
  } catch {
    return "0.0.0.0";
  }

  return "0.0.0.0";
}

/**
 * Computes a standardized SHA-256 hash of the User-Agent header.
 */
export function hashUserAgent(userAgent?: string | null): string {
  const normalized = (userAgent || "unknown").trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Resolves the cryptographically verified client IP:
 * 1. If `X-Verified-Client-IP` is provided AND matches `config.security.originVerifySecret`
 *    using constant-time `crypto.timingSafeEqual`, return the verified header value.
 * 2. Otherwise, fall back to Express's `req.ip` (derived from the right-to-left untrusted boundary walk across configured CIDRs).
 * 3. Fall back to `req.socket?.remoteAddress` or `"0.0.0.0"`.
 * 4. Never blindly trust raw unverified headers from untrusted connections.
 */
export function getVerifiedClientIp(req: Request): string {
  const customIpHeader = req.headers["x-verified-client-ip"];
  const customSecretHeader = req.headers["x-origin-verify-secret"];

  if (
    typeof customIpHeader === "string" &&
    customIpHeader.trim() &&
    typeof customSecretHeader === "string" &&
    config.security.originVerifySecret
  ) {
    const expectedSecretBuf = Buffer.from(
      config.security.originVerifySecret,
      "utf-8",
    );
    const providedSecretBuf = Buffer.from(customSecretHeader, "utf-8");

    if (
      expectedSecretBuf.length === providedSecretBuf.length &&
      crypto.timingSafeEqual(expectedSecretBuf, providedSecretBuf)
    ) {
      return customIpHeader.trim();
    }
  }

  return req.ip || req.socket?.remoteAddress || "0.0.0.0";
}

/**
 * Computes the unified device fingerprint combining the masked IP subnet and User-Agent hash.
 * Uses getVerifiedClientIp(req) to ensure real client IP is used, never proxy egress IP or spoofed values.
 */
export function computeFingerprint(req: Request): string {
  const clientIp = getVerifiedClientIp(req);
  const userAgent = req.headers["user-agent"] || "";

  const maskedIp = maskIpAddress(clientIp);
  const uaHash = hashUserAgent(userAgent);

  return crypto
    .createHash("sha256")
    .update(`${maskedIp}|${uaHash}`)
    .digest("hex");
}
