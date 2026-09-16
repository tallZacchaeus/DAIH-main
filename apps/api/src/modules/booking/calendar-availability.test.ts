import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { bookingRouter } from "./booking.routes.js";
import { prisma } from "../../db/client.js";

const app = express();
app.use(express.json());
app.use("/api/v1/bookings", bookingRouter);

describe("Calendar Availability API", () => {
  let testResourceId: string;

  beforeAll(async () => {
    // Create a temporary resource for testing calendar availability
    const resource = await prisma.facilityResource.create({
      data: {
        name: "Calendar Test Studio",
        slug: `calendar-test-studio-${Date.now()}`,
        category: "STUDIO",
        description: "Test Studio for Calendar Availability",
        location: "Ground Floor Studio A",
        capacity: 5,
        isActive: true,
      },
    });
    testResourceId = resource.id;
  });

  afterAll(async () => {
    if (testResourceId) {
      await prisma.booking.deleteMany({
        where: { resourceId: testResourceId },
      });
      await prisma.facilityResource.deleteMany({
        where: { id: testResourceId },
      });
    }
  });

  it("should return sparse calendar availability map with default AVAILABLE status", async () => {
    const res = await request(app).get(
      `/api/v1/bookings/calendar-availability?resourceId=${testResourceId}&month=2026-08`,
    );

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resourceId).toBe(testResourceId);
    expect(res.body.data.defaultStatus).toBe("AVAILABLE");
    expect(typeof res.body.data.busyDates).toBe("object");
  });

  it("should reject invalid month format", async () => {
    const res = await request(app).get(
      `/api/v1/bookings/calendar-availability?resourceId=${testResourceId}&month=invalid-month`,
    );

    expect(res.status).toBe(400);
  });
});
