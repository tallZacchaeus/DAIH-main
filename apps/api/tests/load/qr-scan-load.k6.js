import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

const qrVerificationLatency = new Trend("qr_verification_duration");
const qrSuccessRate = new Rate("qr_success_rate");

export const options = {
  scenarios: {
    reception_rush_hour: {
      executor: "constant-vus",
      vus: 30, // 30 concurrent scans simulating morning rush
      duration: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"], // Less than 2% network failures
    qr_verification_duration: ["p(99)<200"], // p99 verification under 200ms
  },
};

const BASE_URL = __ENV.API_BASE_URL || "http://localhost:4000/api/v1";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    "x-portal": "admin",
  };

  const payload = JSON.stringify({
    token: "sample-signed-qr-token-for-load-testing",
  });

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/access/verify-qr`, payload, { headers });
  qrVerificationLatency.add(Date.now() - startTime);

  // Both valid pass or expected pass rejection (400/404/200) are valid HTTP codes
  const isHealthyResponse =
    res.status === 200 || res.status === 400 || res.status === 404;
  qrSuccessRate.add(isHealthyResponse ? 1 : 0);

  check(res, {
    "QR Verification responded safely without 500 error": () =>
      isHealthyResponse,
    "Response time < 200ms": () => Date.now() - startTime < 200,
  });

  sleep(0.1); // Rapid scan simulation
}
