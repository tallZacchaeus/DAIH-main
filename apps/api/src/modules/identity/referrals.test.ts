import { describe, it, expect, beforeEach, vi } from "vitest";
import { identityService, generateReferralCode } from "./identity.service.js";
import { customerService } from "./customer.service.js";
import { prisma } from "../../db/client.js";
import { emailService } from "../email/email.service.js";
import { UserRole, BookingState } from "@daih/types";

// In-memory mock storage for testing
const mockUsers: any[] = [];
const mockBookings: any[] = [];

vi.mock("../../db/client.js", () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(async ({ where }: any) => {
          if (where.email)
            return (
              mockUsers.find((u) => u.email === where.email.toLowerCase()) ||
              null
            );
          if (where.id) return mockUsers.find((u) => u.id === where.id) || null;
          if (where.referralCode)
            return (
              mockUsers.find(
                (u) => u.referralCode === where.referralCode.toUpperCase(),
              ) || null
            );
          return null;
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.OR) {
            for (const cond of where.OR) {
              const match = mockUsers.find(
                (u) =>
                  (cond.id && u.id === cond.id) ||
                  (cond.clientId && u.clientId === cond.clientId),
              );
              if (match) return match;
            }
          }
          return null;
        }),
        findMany: vi.fn(async ({ where, select, orderBy }: any) => {
          let list = mockUsers.filter((u) => {
            if (where.referredById && u.referredById !== where.referredById)
              return false;
            return true;
          });

          if (select) {
            return list.map((u) => {
              const res: any = {
                id: u.id,
                clientId: u.clientId,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                phoneNumber: u.phoneNumber,
                createdAt: u.createdAt,
              };

              if (select._count?.select?.bookings) {
                const targetStates =
                  select._count.select.bookings.where?.state?.in || [];
                const userPaidBookings = mockBookings.filter(
                  (b) => b.userId === u.id && targetStates.includes(b.state),
                );
                res._count = { bookings: userPaidBookings.length };
              }

              return res;
            });
          }

          return list;
        }),
        create: vi.fn(async ({ data }: any) => {
          const user = {
            id: `usr_${Date.now()}_${Math.random()}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: UserRole.CUSTOMER,
            isVerified: false,
            ...data,
          };
          mockUsers.push(user);
          return user;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const idx = mockUsers.findIndex((u) => u.id === where.id);
          if (idx === -1) throw new Error("User not found");
          mockUsers[idx] = { ...mockUsers[idx], ...data };
          return mockUsers[idx];
        }),
      },
      clientIdSequence: {
        upsert: vi.fn(async ({ create, update }: any) => {
          return {
            year: 2026,
            nextSequence: Math.floor(Math.random() * 1000) + 2,
          };
        }),
      },
      policyConsent: {
        create: vi.fn(async ({ data }: any) => ({
          id: `consent_${Date.now()}`,
          ...data,
        })),
      },
      verificationToken: {
        create: vi.fn(async ({ data }: any) => ({
          id: `vtoken_${Date.now()}`,
          ...data,
        })),
      },
      outboxEvent: {
        create: vi.fn(async ({ data }: any) => ({
          id: `outbox_${Date.now()}`,
          ...data,
        })),
      },
      emailTemplate: {
        findUnique: vi.fn(async ({ where }: any) => ({
          id: `tmpl_${where.type}`,
          type: where.type,
          subject: "Verify your DAIH Hub Account",
          htmlBody: "<p>Hello {{name}} {{verification_url}}</p>",
          textBody: "Hello {{name}} {{verification_url}}",
          isActive: true,
        })),
      },
      $transaction: vi.fn(async (callback: any) => {
        return callback(prisma);
      }),
    },
  };
});

describe("Customer Referral System Module", () => {
  beforeEach(() => {
    vi.spyOn(emailService, "sendVerificationEmail").mockResolvedValue({
      success: true,
    } as any);
    mockUsers.length = 0;
    mockBookings.length = 0;
  });

  it("generateReferralCode generates valid uppercase REF- prefixed codes", () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^REF-[2-9A-Z]{6}$/);
  });

  it("registers a new customer and automatically assigns a unique referral code", async () => {
    const res = await identityService.register({
      firstName: "John",
      lastName: "Referrer",
      email: "referrer@example.com",
      password: "Password123!",
      policyVersion: "1.0",
      consented: true,
    });

    expect(res.user).toBeDefined();
    expect(res.user.email).toBe("referrer@example.com");
    expect(res.user.referralCode).toBeDefined();
    expect(res.user.referralCode).toMatch(/^REF-/);
  });

  it("attaches referredById when a customer registers with a valid referralCode", async () => {
    // 1. Create Referrer
    const referrer = await identityService.register({
      firstName: "Alice",
      lastName: "Referrer",
      email: "alice@example.com",
      password: "Password123!",
      policyVersion: "1.0",
      consented: true,
    });

    const referrerCode = referrer.user.referralCode!;
    expect(referrerCode).toBeDefined();

    // 2. Register Referred Customer with Alice's code
    const referredCustomer = await identityService.register({
      firstName: "Bob",
      lastName: "Referred",
      email: "bob@example.com",
      password: "Password123!",
      policyVersion: "1.0",
      consented: true,
      referralCode: referrerCode,
    });

    expect(referredCustomer.user).toBeDefined();
    const storedBob = mockUsers.find((u) => u.email === "bob@example.com");
    expect(storedBob).toBeDefined();
    expect(storedBob.referredById).toBe(referrer.user.id);
  });

  it("getMyReferrals computes Active vs Inactive based on paid bookings count", async () => {
    // 1. Create Referrer
    const referrer = await identityService.register({
      firstName: "Alice",
      lastName: "Host",
      email: "alice.host@example.com",
      password: "Password123!",
      policyVersion: "1.0",
      consented: true,
    });

    // 2. Create Referred Friend 1 (Unpaid -> Inactive)
    const friend1 = await identityService.register({
      firstName: "Friend",
      lastName: "One",
      email: "friend1@example.com",
      password: "Password123!",
      policyVersion: "1.0",
      consented: true,
      referralCode: referrer.user.referralCode!,
    });

    // 3. Create Referred Friend 2 (Paid -> Active)
    const friend2 = await identityService.register({
      firstName: "Friend",
      lastName: "Two",
      email: "friend2@example.com",
      password: "Password123!",
      policyVersion: "1.0",
      consented: true,
      referralCode: referrer.user.referralCode!,
    });

    // Add confirmed/paid booking for friend2
    mockBookings.push({
      id: "booking_paid_1",
      userId: friend2.user.id,
      state: BookingState.CONFIRMED,
      totalAmount: 15000,
    });

    // 4. Query Referrer's summary
    const myReferrals = await identityService.getMyReferrals(referrer.user.id);

    expect(myReferrals.totalReferred).toBe(2);
    expect(myReferrals.activeReferred).toBe(1);
    expect(myReferrals.inactiveReferred).toBe(1);
    expect(myReferrals.referredUsers).toHaveLength(2);

    const f1Summary = myReferrals.referredUsers.find(
      (u) => u.email === "friend1@example.com",
    );
    const f2Summary = myReferrals.referredUsers.find(
      (u) => u.email === "friend2@example.com",
    );

    expect(f1Summary?.isActive).toBe(false);
    expect(f1Summary?.status).toBe("Inactive");
    expect(f1Summary?.paidBookingsCount).toBe(0);

    expect(f2Summary?.isActive).toBe(true);
    expect(f2Summary?.status).toBe("Active");
    expect(f2Summary?.paidBookingsCount).toBe(1);
  });

  it("getCustomerReferrals returns admin breakdown of referred members", async () => {
    // 1. Create Referrer
    const referrer = await identityService.register({
      firstName: "Carol",
      lastName: "Danvers",
      email: "carol@example.com",
      password: "Password123!",
      policyVersion: "1.0",
      consented: true,
    });

    // 2. Create Referred Friend
    const friend = await identityService.register({
      firstName: "Peter",
      lastName: "Parker",
      email: "peter@example.com",
      password: "Password123!",
      policyVersion: "1.0",
      consented: true,
      referralCode: referrer.user.referralCode!,
    });

    mockBookings.push({
      id: "booking_carol_friend",
      userId: friend.user.id,
      state: BookingState.COMPLETED,
      totalAmount: 25000,
    });

    // 3. Admin queries Carol's referrals
    const adminRes = await customerService.getCustomerReferrals(
      referrer.user.id,
    );

    expect(adminRes.customerName).toBe("Carol Danvers");
    expect(adminRes.totalReferred).toBe(1);
    expect(adminRes.activeReferred).toBe(1);
    expect(adminRes.referredUsers).toHaveLength(1);
    expect(adminRes.referredUsers[0].name).toBe("Peter Parker");
    expect(adminRes.referredUsers[0].status).toBe("Active");
    expect(adminRes.referredUsers[0].isActive).toBe(true);
  });
});
