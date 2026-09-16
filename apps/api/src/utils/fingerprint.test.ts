import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import {
  maskIpAddress,
  hashUserAgent,
  computeFingerprint,
  getVerifiedClientIp,
} from "./fingerprint.js";
import { config } from "../config/env.js";

describe("Device Fingerprint Utility", () => {
  describe("maskIpAddress", () => {
    it("masks standard IPv4 addresses to /24 subnet", () => {
      expect(maskIpAddress("192.168.1.45")).toBe("192.168.1.0");
      expect(maskIpAddress("10.20.30.125")).toBe("10.20.30.0");
      expect(maskIpAddress("172.16.5.99")).toBe("172.16.5.0");
    });

    it("strips port numbers from IPv4 addresses", () => {
      expect(maskIpAddress("192.168.1.45:54321")).toBe("192.168.1.0");
    });

    it("masks standard IPv6 addresses to /64 prefix", () => {
      const v6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334";
      expect(maskIpAddress(v6)).toBe("2001:db8:85a3::");
    });

    it("handles IPv4-mapped IPv6 addresses (::ffff:192.168.1.100)", () => {
      expect(maskIpAddress("::ffff:192.168.1.100")).toBe("192.168.1.0");
    });

    it("handles localhost addresses safely", () => {
      expect(maskIpAddress("127.0.0.1")).toBe("127.0.0.0");
      expect(maskIpAddress("::1")).toBe("127.0.0.0");
    });

    it("falls back to 0.0.0.0 on malformed or empty inputs", () => {
      expect(maskIpAddress("")).toBe("0.0.0.0");
      expect(maskIpAddress(null as any)).toBe("0.0.0.0");
      expect(maskIpAddress("invalid-ip-string")).toBe("0.0.0.0");
    });
  });

  describe("hashUserAgent", () => {
    it("produces deterministic SHA-256 hash regardless of whitespace or casing", () => {
      const ua1 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
      const ua2 = "   mozilla/5.0 (windows nt 10.0; win64; x64)   ";
      expect(hashUserAgent(ua1)).toBe(hashUserAgent(ua2));
    });

    it("produces different hashes for different user agents", () => {
      const ua1 = "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)";
      const ua2 = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
      expect(hashUserAgent(ua1)).not.toBe(hashUserAgent(ua2));
    });
  });

  describe("computeFingerprint", () => {
    it("produces identical fingerprints for requests on the same /24 subnet and user agent", () => {
      const mockReq1: any = {
        ip: "192.168.1.20",
        headers: { "user-agent": "Chrome/120.0" },
      };
      const mockReq2: any = {
        ip: "192.168.1.99", // Same /24 subnet
        headers: { "user-agent": "Chrome/120.0" },
      };

      expect(computeFingerprint(mockReq1)).toBe(computeFingerprint(mockReq2));
    });

    it("produces different fingerprints when subnets differ", () => {
      const mockReq1: any = {
        ip: "192.168.1.20",
        headers: { "user-agent": "Chrome/120.0" },
      };
      const mockReq2: any = {
        ip: "192.168.2.20", // Different /24 subnet
        headers: { "user-agent": "Chrome/120.0" },
      };

      expect(computeFingerprint(mockReq1)).not.toBe(
        computeFingerprint(mockReq2),
      );
    });

    it("produces different fingerprints when user agents differ", () => {
      const mockReq1: any = {
        ip: "192.168.1.20",
        headers: { "user-agent": "Chrome/120.0" },
      };
      const mockReq2: any = {
        ip: "192.168.1.20",
        headers: { "user-agent": "Firefox/120.0" },
      };

      expect(computeFingerprint(mockReq1)).not.toBe(
        computeFingerprint(mockReq2),
      );
    });
  });

  describe("getVerifiedClientIp and Secret-Paired Header Trust", () => {
    const originalSecret = config.security.originVerifySecret;

    beforeEach(() => {
      config.security.originVerifySecret = "test-origin-secret-32-chars-long!";
    });

    afterEach(() => {
      config.security.originVerifySecret = originalSecret;
    });

    it("falls back to req.ip when no custom headers are provided", () => {
      const mockReq: any = {
        ip: "192.0.2.1",
        headers: {},
      };
      expect(getVerifiedClientIp(mockReq)).toBe("192.0.2.1");
    });

    it("ignores X-Verified-Client-IP if X-Origin-Verify-Secret is missing", () => {
      const mockReq: any = {
        ip: "198.51.100.5",
        headers: {
          "x-verified-client-ip": "1.2.3.4",
        },
      };
      expect(getVerifiedClientIp(mockReq)).toBe("198.51.100.5");
    });

    it("ignores X-Verified-Client-IP if X-Origin-Verify-Secret is incorrect", () => {
      const mockReq: any = {
        ip: "198.51.100.5",
        headers: {
          "x-verified-client-ip": "1.2.3.4",
          "x-origin-verify-secret": "wrong-secret-value",
        },
      };
      expect(getVerifiedClientIp(mockReq)).toBe("198.51.100.5");
    });

    it("accepts X-Verified-Client-IP when paired with valid X-Origin-Verify-Secret", () => {
      const mockReq: any = {
        ip: "198.51.100.5",
        headers: {
          "x-verified-client-ip": "203.0.113.42",
          "x-origin-verify-secret": "test-origin-secret-32-chars-long!",
        },
      };
      expect(getVerifiedClientIp(mockReq)).toBe("203.0.113.42");
    });
  });

  describe("Express CIDR Trust & Untrusted Boundary Walk", () => {
    it("Case B: Trusted proxy forwarding adversarial prepended chain stops at first untrusted IP", async () => {
      const testApp = express();
      // Trust loopback and local private networks (like Nginx on 127.0.0.1 and Docker/private subnets)
      testApp.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
      testApp.get("/test-ip", (req, res) => {
        res.json({
          resolvedIp: req.ip,
          verifiedIp: getVerifiedClientIp(req),
        });
      });

      // Supertest connects via loopback (127.0.0.1).
      // Header: 9.9.9.9 (attacker spoof), 203.0.113.50 (real client IP), 10.0.0.1 (trusted private internal hop)
      const res = await request(testApp)
        .get("/test-ip")
        .set("X-Forwarded-For", "9.9.9.9, 203.0.113.50, 10.0.0.1");

      expect(res.status).toBe(200);
      // Express walks right-to-left:
      // - 127.0.0.1 (socket) is loopback -> trusted
      // - 10.0.0.1 is uniquelocal -> trusted
      // - 203.0.113.50 is public -> UNTRUSTED. Walk stops here!
      // Attacker's prepended 9.9.9.9 is completely rejected.
      expect(res.body.resolvedIp).toBe("203.0.113.50");
      expect(res.body.verifiedIp).toBe("203.0.113.50");
    });

    it("Case A: Direct untrusted connection ignores spoofed X-Forwarded-For and X-Real-IP headers", async () => {
      const testApp = express();
      // Configure trust proxy strictly to 10.0.0.0/8 (so loopback 127.0.0.1 is UNTRUSTED)
      testApp.set("trust proxy", ["10.0.0.0/8"]);
      testApp.get("/test-ip", (req, res) => {
        res.json({
          resolvedIp: req.ip,
          verifiedIp: getVerifiedClientIp(req),
        });
      });

      const res = await request(testApp)
        .get("/test-ip")
        .set("X-Forwarded-For", "9.9.9.9, 1.1.1.1")
        .set("X-Real-IP", "8.8.8.8");

      expect(res.status).toBe(200);
      // Because connecting socket (127.0.0.1 / ::ffff:127.0.0.1) is not in 10.0.0.0/8,
      // Express treats connection as untrusted client and ignores all spoofed headers.
      expect(res.body.resolvedIp).toMatch(/127\.0\.0\.1/);
      expect(res.body.resolvedIp).not.toBe("9.9.9.9");
      expect(res.body.resolvedIp).not.toBe("1.1.1.1");
      expect(res.body.resolvedIp).not.toBe("8.8.8.8");
    });
  });
});
