import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../app.js";
import { prisma } from "../../db/client.js";
import { UserRole } from "@daih/types";
import jwt from "jsonwebtoken";

describe("Milestone 1.2: Catalogue & Resource Model Module", () => {
  let adminToken: string;
  let customerToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Retry wrapper for Neon cold starts
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const adminUser = await prisma.user.upsert({
          where: { email: "admin.catalogue@daih.ng" },
          update: { role: UserRole.OPERATIONS_ADMIN, isVerified: true },
          create: {
            email: "admin.catalogue@daih.ng",
            firstName: "Admin",
            lastName: "Catalogue",
            clientId: `DAIH-2026-CATALOGUE-${Date.now()}`,
            role: UserRole.OPERATIONS_ADMIN,
            isVerified: true,
            passwordHash:
              "$argon2id$v=19$m=65536,t=3,p=4$dummyhashforcatalogueadmin",
          },
        });
        adminUserId = adminUser.id;

        const customerUser = await prisma.user.upsert({
          where: { email: "customer.catalogue@daih.ng" },
          update: { role: UserRole.CUSTOMER, isVerified: true },
          create: {
            email: "customer.catalogue@daih.ng",
            firstName: "Customer",
            lastName: "Catalogue",
            clientId: `DAIH-2026-CATALOGUE-CUST-${Date.now()}`,
            role: UserRole.CUSTOMER,
            isVerified: true,
            passwordHash:
              "$argon2id$v=19$m=65536,t=3,p=4$dummyhashforcataloguecust",
          },
        });

        adminToken = jwt.sign(
          {
            id: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
            clientId: adminUser.clientId,
          },
          process.env.JWT_SECRET || "dev-secret-key-12345678901234567890",
          { expiresIn: "1h" },
        );

        customerToken = jwt.sign(
          {
            id: customerUser.id,
            email: customerUser.email,
            role: customerUser.role,
            clientId: customerUser.clientId,
          },
          process.env.JWT_SECRET || "dev-secret-key-12345678901234567890",
          { expiresIn: "1h" },
        );

        break;
      } catch (err) {
        if (attempt === 4) throw err;
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }, 30000);

  describe("2. Operations Admin RBAC Protection", () => {
    it("rejects unauthenticated requests to admin catalogue routes with 401", async () => {
      const res = await request(app).get("/api/v1/catalogue/admin/resources");
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("UNAUTHORIZED");
    });

    it("rejects customer accounts from accessing admin catalogue routes with 403", async () => {
      const res = await request(app)
        .get("/api/v1/catalogue/admin/resources")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    });

    it("allows Operations Admin to view all resources including inactive with 200", async () => {
      const res = await request(app)
        .get("/api/v1/catalogue/admin/resources")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe("3. Resource & Pricing CRUD", () => {
    let createdResourceId: string;
    let createdPlanId: string;

    it("creates a new workspace resource as Operations Admin", async () => {
      const newResource = {
        name: "Podcast Studio Suite",
        slug: `podcast-suite-${Date.now()}`,
        category: "STUDIO",
        description:
          "Sound-isolated acoustic recording room equipped for 4-host podcasts.",
        capacity: 4,
        location: "Ground Floor, Media Wing",
        amenities: [
          "4x Shure SM7B Mics",
          "Acoustic Wall Panels",
          "Multi-Cam Setup",
        ],
        sortOrder: 10,
        isPopular: false,
        isActive: true,
      };

      const res = await request(app)
        .post("/api/v1/catalogue/admin/resources")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newResource);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newResource.name);
      createdResourceId = res.body.data.id;
    });

    it("adds a pricing tier to the newly created resource", async () => {
      const newPlan = {
        planName: "2-Hour Podcast Session",
        durationHours: 2,
        price: 50000,
        currency: "NGN",
        isPopular: true,
        isActive: true,
      };

      const res = await request(app)
        .post(`/api/v1/catalogue/admin/resources/${createdResourceId}/pricing`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(newPlan);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.planName).toBe(newPlan.planName);
      expect(res.body.data.price).toBe(50000);
      createdPlanId = res.body.data.id;
    });

    it("updates a pricing tier price and confirms live reflection", async () => {
      const res = await request(app)
        .put(`/api/v1/catalogue/admin/pricing/${createdPlanId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ price: 55000 });

      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(55000);
    });

    it("adds and deletes a blackout date on the resource", async () => {
      const tomorrow = new Date(Date.now() + 86400000).toISOString();
      const nextDay = new Date(Date.now() + 172800000).toISOString();

      const blackoutRes = await request(app)
        .post(
          `/api/v1/catalogue/admin/resources/${createdResourceId}/blackouts`,
        )
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startDate: tomorrow,
          endDate: nextDay,
          reason: "Acoustic Foam Upgrades",
          isActive: true,
        });

      expect(blackoutRes.status).toBe(201);
      const blackoutId = blackoutRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/v1/catalogue/admin/blackouts/${blackoutId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });

    it("uploads and compresses an image for a resource", async () => {
      // 1x1 transparent PNG encoded in base64
      const sampleBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const uploadRes = await request(app)
        .post("/api/v1/catalogue/admin/upload-image")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          data: sampleBase64,
          fileName: "test-space-photo.png",
          resourceId: createdResourceId,
        });

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.success).toBe(true);
      expect(uploadRes.body.data.url).toMatch(
        /^\/uploads\/resources\/test-space-photo-.*\.webp$/,
      );
      expect(uploadRes.body.data.format).toBe("webp");
      expect(uploadRes.body.data.size).toBeGreaterThan(0);
      expect(uploadRes.body.data.resource).toBeDefined();
      expect(uploadRes.body.data.resource.imageUrl).toBe(
        uploadRes.body.data.url,
      );
    });

    it("rejects non-staff user from uploading resource images", async () => {
      const sampleBase64 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const res = await request(app)
        .post("/api/v1/catalogue/admin/upload-image")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          data: sampleBase64,
          fileName: "hacker-photo.png",
        });

      expect(res.status).toBe(403);
    });

    afterAll(async () => {
      try {
        if (createdResourceId) {
          await prisma.resourcePricing.deleteMany({
            where: { resourceId: createdResourceId },
          });
          await prisma.resourceBlackout.deleteMany({
            where: { resourceId: createdResourceId },
          });
          await prisma.facilityResource.deleteMany({
            where: { id: createdResourceId },
          });
        }
        await prisma.facilityResource.deleteMany({
          where: { name: "Podcast Studio Suite" },
        });
      } catch (err) {
        // ignore cleanup error
      }
    });
  });
});
