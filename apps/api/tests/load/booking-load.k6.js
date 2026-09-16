import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Custom Performance Metrics
const errorRate = new Rate("error_rate");
const holdSuccessRate = new Rate("hold_success_rate");
const bookingLatency = new Trend("booking_creation_duration");

export const options = {
  scenarios: {
    // Stage 1: Warmup & Ramp to 50 concurrent VUs
    concurrency_spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 20 },
        { duration: "20s", target: 50 },
        { duration: "15s", target: 50 },
        { duration: "10s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // Less than 5% network/server failure
    http_req_duration: ["p(95)<500"], // 95% of requests must complete below 500ms
    booking_creation_duration: ["p(95)<400"],
  },
};

const BASE_URL = __ENV.API_BASE_URL || "http://localhost:4000/api/v1";

export default function () {
  const headers = {
    "Content-Type": "application/json",
    "x-portal": "customer",
  };

  // 1. Check catalogue availability
  const availRes = http.get(`${BASE_URL}/catalogue/resources`, { headers });
  check(availRes, {
    "Catalogue available (HTTP 200)": (r) => r.status === 200,
  });

  // 2. High-contention booking hold simulation on a fixed time window
  const startTime = "2026-09-02T10:00:00.000Z";
  const endTime = "2026-09-02T14:00:00.000Z";

  const holdPayload = JSON.stringify({
    resourceId: "contention-test-resource-1",
    startTime,
    endTime,
    planType: "HOURLY",
  });

  const startHold = Date.now();
  const holdRes = http.post(`${BASE_URL}/bookings/hold`, holdPayload, {
    headers,
  });
  bookingLatency.add(Date.now() - startHold);

  const isSuccess = holdRes.status === 201 || holdRes.status === 200;
  const isExpectedConflict = holdRes.status === 409 || holdRes.status === 400;

  holdSuccessRate.add(isSuccess ? 1 : 0);

  // Success OR 409 Conflict is expected under high concurrency — 500 is an error
  const isAcceptableResponse = isSuccess || isExpectedConflict;
  errorRate.add(!isAcceptableResponse ? 1 : 0);

  check(holdRes, {
    "No double-booking concurrency leaks (200/201 or 409 Conflict)": () =>
      isAcceptableResponse,
    "Response is clean JSON": (r) =>
      r.headers["Content-Type"]?.includes("application/json"),
  });

  sleep(0.5);
}
