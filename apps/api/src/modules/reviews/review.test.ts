import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../../db/client.js";
import { reviewService } from "./review.service.js";
import { reviewRepository } from "./review.repository.js";
import { BookingState, UserRole, ResourceCategory } from "@prisma/client";
import { ReviewStatus } from "@daih/types";
import {
  CreateReviewSchema,
  UpdateReviewSchema,
  AdminStatusUpdateSchema,
  AdminReviewSettingSchema,
} from "./review.schema.js";

describe("Customer Review Engine Tests", () => {
  let testCustomer: any;
  let otherCustomer: any;
  let testResource: any;

  beforeAll(async () => {
    // Setup test users
    const timestamp = Date.now();
    testCustomer = await prisma.user.create({
      data: {
        email: `rev-tester-${timestamp}@daih.ng`,
        firstName: "Review",
        lastName: "Tester",
        clientId: `CL-REV-${timestamp}`,
        role: UserRole.CUSTOMER,
        isVerified: true,
      },
    });

    otherCustomer = await prisma.user.create({
      data: {
        email: `other-rev-${timestamp}@daih.ng`,
        firstName: "Other",
        lastName: "Member",
        clientId: `CL-OTH-${timestamp}`,
        role: UserRole.CUSTOMER,
        isVerified: true,
      },
    });

    testResource = await prisma.facilityResource.create({
      data: {
        name: `Studio Review Test ${timestamp}`,
        slug: `studio-review-${timestamp}`,
        category: ResourceCategory.STUDIO,
        description: "Podcast & Streaming Studio for review testing",
        location: "Floor 2",
        amenities: ["Mic", "Acoustics"],
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.review.deleteMany({
      where: { userId: { in: [testCustomer.id, otherCustomer.id] } },
    });
    await prisma.visitSession.deleteMany({
      where: { userId: { in: [testCustomer.id, otherCustomer.id] } },
    });
    await prisma.booking.deleteMany({
      where: { userId: { in: [testCustomer.id, otherCustomer.id] } },
    });
    await prisma.facilityResource.delete({
      where: { id: testResource.id },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testCustomer.id, otherCustomer.id] } },
    });
  });

  describe("1. Schema & Validation", () => {
    it("should accept valid review input", () => {
      const parsed = CreateReviewSchema.safeParse({
        bookingId: "11111111-1111-1111-1111-111111111111",
        rating: 5,
        title: "Spectacular Podcast Room",
        comment:
          "Great sound isolation, stable power, and fast internet connection.",
        wifiRating: 5,
        powerRating: 5,
        comfortRating: 4,
        staffRating: 5,
      });
      expect(parsed.success).toBe(true);
    });

    it("should reject rating outside 1 to 5", () => {
      const parsedLow = CreateReviewSchema.safeParse({
        bookingId: "11111111-1111-1111-1111-111111111111",
        rating: 0,
        comment: "Too low rating",
      });
      expect(parsedLow.success).toBe(false);

      const parsedHigh = CreateReviewSchema.safeParse({
        bookingId: "11111111-1111-1111-1111-111111111111",
        rating: 6,
        comment: "Too high rating",
      });
      expect(parsedHigh.success).toBe(false);
    });

    it("should reject comment shorter than 5 characters", () => {
      const parsed = CreateReviewSchema.safeParse({
        bookingId: "11111111-1111-1111-1111-111111111111",
        rating: 5,
        comment: "Bad",
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("2. Gatekeeping & Eligibility Logic", () => {
    it("should reject review if customer is not the booking owner", async () => {
      const booking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-OWN-${Date.now()}`,
          userId: otherCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 1800000),
          state: BookingState.COMPLETED,
          totalAmount: 5000,
          checkedInAt: new Date(Date.now() - 3600000),
        },
      });

      const check = await reviewService.checkEligibility(
        testCustomer.id,
        UserRole.CUSTOMER,
        booking.id,
      );
      expect(check.eligible).toBe(false);
      expect(check.reason).toContain("do not own");
    });

    it("should strictly reject non-CUSTOMER roles (e.g. staff trying to review)", async () => {
      const booking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-STF-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 1800000),
          state: BookingState.COMPLETED,
          totalAmount: 5000,
          checkedInAt: new Date(Date.now() - 3600000),
        },
      });

      const check = await reviewService.checkEligibility(
        testCustomer.id,
        UserRole.OPERATIONS_ADMIN,
        booking.id,
      );
      expect(check.eligible).toBe(false);
      expect(check.reason).toContain("Only customer accounts");
    });

    it("should strictly reject NO_SHOW, CANCELLED, and unconfirmed states", async () => {
      const noShowBooking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-NS-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          state: BookingState.NO_SHOW,
          totalAmount: 5000,
        },
      });

      const checkNoShow = await reviewService.checkEligibility(
        testCustomer.id,
        UserRole.CUSTOMER,
        noShowBooking.id,
      );
      expect(checkNoShow.eligible).toBe(false);
      expect(checkNoShow.reason).toContain("NO_SHOW");

      const cancelledBooking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-CAN-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          state: BookingState.CANCELLED,
          totalAmount: 5000,
        },
      });

      const checkCancelled = await reviewService.checkEligibility(
        testCustomer.id,
        UserRole.CUSTOMER,
        cancelledBooking.id,
      );
      expect(checkCancelled.eligible).toBe(false);
    });

    it("should reject overdue bookings where checkedInAt is null (no-show prevention)", async () => {
      // Slot whose end time passed, but user never checked in (before worker swept to NO_SHOW)
      const unredeemedBooking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-UNR-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 3600000),
          endTime: new Date(Date.now() - 1800000),
          state: BookingState.CONFIRMED,
          totalAmount: 5000,
          checkedInAt: null,
        },
      });

      const check = await reviewService.checkEligibility(
        testCustomer.id,
        UserRole.CUSTOMER,
        unredeemedBooking.id,
      );
      expect(check.eligible).toBe(false);
      expect(check.reason).toContain("physically checked in");
    });

    it("should allow completed 1-hour booking where customer checked in and finished", async () => {
      const hourlyBooking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-HRLY-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 3600000), // 1 hr ago
          endTime: new Date(Date.now() - 60000), // ended 1 min ago
          state: BookingState.CHECKED_OUT,
          totalAmount: 4000,
          checkedInAt: new Date(Date.now() - 3600000),
          checkedOutAt: new Date(Date.now() - 60000),
        },
      });

      const check = await reviewService.checkEligibility(
        testCustomer.id,
        UserRole.CUSTOMER,
        hourlyBooking.id,
      );
      expect(check.eligible).toBe(true);
    });
  });

  describe("3. Submission & Auto-Publish Settings Toggle", () => {
    it("should set initial status to PENDING when requireApproval is true", async () => {
      await reviewService.updateSettings(testCustomer.id, {
        requireApproval: true,
      });

      const booking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-PND-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          state: BookingState.COMPLETED,
          totalAmount: 5000,
          checkedInAt: new Date(Date.now() - 7200000),
        },
      });

      const res = await reviewService.submitReview(
        testCustomer.id,
        UserRole.CUSTOMER,
        {
          bookingId: booking.id,
          rating: 5,
          title: "Clean environment",
          comment:
            "Excellent space with continuous high speed internet and cool AC.",
        },
      );

      expect(res.review.status).toBe(ReviewStatus.PENDING);
      expect(res.review.isFeaturedOnHome).toBe(false);
      expect(res.message).toContain("pending operations review");
    });

    it("should set initial status to APPROVED when requireApproval is false (auto-publish toggle)", async () => {
      await reviewService.updateSettings(testCustomer.id, {
        requireApproval: false,
      });

      const booking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-APP-${Date.now()}`,
          userId: otherCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          state: BookingState.COMPLETED,
          totalAmount: 5000,
          checkedInAt: new Date(Date.now() - 7200000),
        },
      });

      const res = await reviewService.submitReview(
        otherCustomer.id,
        UserRole.CUSTOMER,
        {
          bookingId: booking.id,
          rating: 5,
          title: "Zero friction booking",
          comment:
            "The entire workflow from booking to checking in was smooth and effortless.",
        },
      );

      expect(res.review.status).toBe(ReviewStatus.APPROVED);
      expect(res.message).toContain("has been published");
    });

    it("should reject duplicate review for same booking", async () => {
      const booking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-DUP-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          state: BookingState.COMPLETED,
          totalAmount: 5000,
          checkedInAt: new Date(Date.now() - 7200000),
        },
      });

      await reviewService.submitReview(testCustomer.id, UserRole.CUSTOMER, {
        bookingId: booking.id,
        rating: 4,
        comment: "First review submission for this stay.",
      });

      await expect(
        reviewService.submitReview(testCustomer.id, UserRole.CUSTOMER, {
          bookingId: booking.id,
          rating: 5,
          comment: "Second duplicate attempt.",
        }),
      ).rejects.toThrow();
    });
  });

  describe("4. Moderation & Invariant Rules", () => {
    it("should force isFeaturedOnHome to false when review status is not APPROVED", async () => {
      const booking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-MOD-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          state: BookingState.COMPLETED,
          totalAmount: 5000,
          checkedInAt: new Date(Date.now() - 7200000),
        },
      });

      const created = await reviewService.submitReview(
        testCustomer.id,
        UserRole.CUSTOMER,
        {
          bookingId: booking.id,
          rating: 5,
          comment: "Review to test moderation invariants.",
        },
      );

      // Approve and pin to homepage
      const approved = await reviewService.adminUpdateStatus(
        created.review.id,
        {
          status: ReviewStatus.APPROVED,
          isFeaturedOnHome: true,
        },
      );
      expect(approved.status).toBe(ReviewStatus.APPROVED);
      expect(approved.isFeaturedOnHome).toBe(true);

      // Now reject it -> isFeaturedOnHome MUST be forced to false
      const rejected = await reviewService.adminUpdateStatus(
        created.review.id,
        {
          status: ReviewStatus.REJECTED,
          isFeaturedOnHome: true, // caller attempts to keep it featured
        },
      );
      expect(rejected.status).toBe(ReviewStatus.REJECTED);
      expect(rejected.isFeaturedOnHome).toBe(false); // Invariant enforced!
    });

    it("should allow admin to post official management reply", async () => {
      const booking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-REP-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          state: BookingState.COMPLETED,
          totalAmount: 5000,
          checkedInAt: new Date(Date.now() - 7200000),
        },
      });

      const created = await reviewService.submitReview(
        testCustomer.id,
        UserRole.CUSTOMER,
        {
          bookingId: booking.id,
          rating: 5,
          comment: "Great experience working here today!",
        },
      );

      const replied = await reviewService.adminReply(
        created.review.id,
        "Thank you for visiting DAIH! We look forward to hosting you again soon.",
        testCustomer.id,
      );

      expect(replied.adminReply).toContain("Thank you for visiting DAIH");
      expect(replied.adminRepliedAt).not.toBeNull();
    });
  });

  describe("5. 48-Hour Edit Window & Anti-Tamper Reset", () => {
    it("should allow editing within 48 hours and reset to PENDING when requireApproval is true", async () => {
      await reviewService.updateSettings(testCustomer.id, {
        requireApproval: true,
      });

      const booking = await prisma.booking.create({
        data: {
          reference: `DAIH-REV-EDT-${Date.now()}`,
          userId: testCustomer.id,
          resourceId: testResource.id,
          startTime: new Date(Date.now() - 7200000),
          endTime: new Date(Date.now() - 3600000),
          state: BookingState.COMPLETED,
          totalAmount: 5000,
          checkedInAt: new Date(Date.now() - 7200000),
        },
      });

      const created = await reviewService.submitReview(
        testCustomer.id,
        UserRole.CUSTOMER,
        {
          bookingId: booking.id,
          rating: 4,
          comment: "Good session, very productive afternoon.",
        },
      );

      // Admin approves it
      await reviewService.adminUpdateStatus(created.review.id, {
        status: ReviewStatus.APPROVED,
        isFeaturedOnHome: true,
      });

      // Customer edits review -> anti-tamper must reset to PENDING and unset isFeaturedOnHome
      const edited = await reviewService.updateReview(
        testCustomer.id,
        created.review.id,
        {
          rating: 5,
          comment:
            "Updated: Absolutely five stars after reflecting on my productive day.",
        },
      );

      expect(edited.review.status).toBe(ReviewStatus.PENDING);
      expect(edited.review.isFeaturedOnHome).toBe(false);
      expect(edited.review.comment).toContain("Updated: Absolutely five stars");
    });
  });
});
