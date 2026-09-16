import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../app.js";

describe("Observability & Debug Endpoints (Staging Smoke Checks)", () => {
  it("GET /api/v1/debug/sentry-error triggers a deliberate test exception captured for Sentry", async () => {
    const res = await request(app).get("/api/v1/debug/sentry-error");

    // Expected: express errorHandler catches the error and returns standard error JSON
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL_SERVER_ERROR");
    expect(res.body.message).toContain("DAIH Smoke Test Exception");
  });

  it("GET /api/v1/debug/datadog-span creates and completes a tracer span", async () => {
    const res = await request(app).get("/api/v1/debug/datadog-span");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("Datadog span created");
    expect(res.body.traceId).toBeDefined();
    expect(res.body.spanId).toBeDefined();
  });
});
