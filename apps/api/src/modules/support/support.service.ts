import { prisma } from "../../db/client.js";
import {
  FAQItemDTO,
  SupportContactChannelsDTO,
  SupportSettingsRecord,
  UpdateSupportSettingsDTO,
} from "./support.types.js";
import { redis } from "../../config/redis.js";

const DEFAULT_CONTACT: SupportContactChannelsDTO = {
  phone: "+234 800 000 3244",
  whatsapp: "+234 812 345 6789",
  email: "support@daih.com",
  address: "Dominion Allianze Innovation Hub (DAIH), Lagos, Nigeria",
  operatingHours: "Mon - Sat: 8:00 AM – 8:00 PM, Sun: Closed (Maintenance)",
};

const DEFAULT_FAQS: FAQItemDTO[] = [
  {
    id: "faq_1",
    category: "Bookings",
    question: "How do workspace holds and bookings work?",
    answer:
      "When you select an open desk, private office, or studio, a temporary 10-minute hold is placed to prevent double-booking while you complete checkout. Once payment is confirmed via Paystack, your booking is instantly confirmed and a secure QR check-in pass is issued.",
    isPublished: true,
    orderIndex: 0,
  },
  {
    id: "faq_2",
    category: "Check-in",
    question: "How do I check in when I arrive at DAIH Hub?",
    answer:
      "Simply open the Customer PWA on your phone, go to your booking details or click 'QR Pass' on your dashboard, and present your QR code to the receptionist or gate scanner at the front desk. The system validates your active booking immediately.",
    isPublished: true,
    orderIndex: 1,
  },
  {
    id: "faq_3",
    category: "WiFi",
    question: "How do I get my WiFi credentials?",
    answer:
      "Upon confirmed booking and arrival, your personal high-speed WiFi access voucher and password are automatically generated and visible in your dashboard's 'WiFi Access' card.",
    isPublished: true,
    orderIndex: 2,
  },
  {
    id: "faq_4",
    category: "Modifications",
    question: "Can I reschedule or cancel my reservation?",
    answer:
      "Yes. You can manage or cancel your upcoming booking directly from the 'My Bookings' page up to 24 hours prior to the scheduled start time according to our reservation policy. Please note that bookings are strictly non-refundable.",
    isPublished: true,
    orderIndex: 3,
  },
  {
    id: "faq_5",
    category: "Payments",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major Nigerian debit cards (Mastercard, Visa, Verve), Bank Transfers, USSD, and Apple Pay through our secure Paystack payment gateway. Instant automated receipts and VAT invoices are generated for every transaction.",
    isPublished: true,
    orderIndex: 4,
  },
  {
    id: "faq_6",
    category: "Visitors",
    question: "Can I bring guests or clients for meetings?",
    answer:
      "Private Office and Conference Suite bookings include guest allowances for meeting attendees. Guests simply check in at the reception desk with your booking reference.",
    isPublished: true,
    orderIndex: 5,
  },
];

const CACHE_KEY = "daih:support_settings";
const CACHE_TTL_SECONDS = 300;

export class SupportService {
  private isInitialized = false;
  private memoryCache: { data: SupportSettingsRecord; expires: number } | null =
    null;

  async ensureTableInitialized(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "support_settings" (
          "id" VARCHAR(64) PRIMARY KEY,
          "contact" JSONB NOT NULL,
          "faqs" JSONB NOT NULL,
          "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_by" VARCHAR(64)
        );
      `);

      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT "id" FROM "support_settings" WHERE "id" = 'default' LIMIT 1;`,
      );

      if (rows.length === 0) {
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO "support_settings" ("id", "contact", "faqs", "updated_at")
          VALUES ($1, $2::jsonb, $3::jsonb, CURRENT_TIMESTAMP)
          ON CONFLICT ("id") DO NOTHING;
          `,
          "default",
          JSON.stringify(DEFAULT_CONTACT),
          JSON.stringify(DEFAULT_FAQS),
        );
      }

      this.isInitialized = true;
    } catch (err: any) {
      console.error(
        "[SupportService] Table initialization fallback:",
        err?.message,
      );
    }
  }

  private mapRow(row: any): SupportSettingsRecord {
    return {
      id: row.id || "default",
      contact:
        typeof row.contact === "string"
          ? JSON.parse(row.contact)
          : row.contact || DEFAULT_CONTACT,
      faqs:
        typeof row.faqs === "string"
          ? JSON.parse(row.faqs)
          : row.faqs || DEFAULT_FAQS,
      updatedAt: row.updated_at
        ? new Date(row.updated_at).toISOString()
        : new Date().toISOString(),
      updatedBy: row.updated_by || null,
    };
  }

  async getSettings(): Promise<SupportSettingsRecord> {
    // 1. Check in-memory cache
    if (this.memoryCache && Date.now() < this.memoryCache.expires) {
      return this.memoryCache.data;
    }

    // 2. Check Redis cache
    if (redis) {
      try {
        const cached = await redis.get(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          this.memoryCache = {
            data: parsed,
            expires: Date.now() + CACHE_TTL_SECONDS * 1000,
          };
          return parsed;
        }
      } catch (err) {
        // Fallback to DB
      }
    }

    // 3. Query Database
    await this.ensureTableInitialized();

    try {
      const rows: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM "support_settings" WHERE "id" = 'default' LIMIT 1;`,
      );

      if (rows.length > 0) {
        const record = this.mapRow(rows[0]);
        this.memoryCache = {
          data: record,
          expires: Date.now() + CACHE_TTL_SECONDS * 1000,
        };

        if (redis) {
          await redis
            .set(CACHE_KEY, JSON.stringify(record), "EX", CACHE_TTL_SECONDS)
            .catch(() => {});
        }

        return record;
      }
    } catch (err) {
      console.warn("[SupportService] DB query failed, returning defaults");
    }

    return {
      id: "default",
      contact: DEFAULT_CONTACT,
      faqs: DEFAULT_FAQS,
      updatedAt: new Date().toISOString(),
    };
  }

  async updateSettings(
    dto: UpdateSupportSettingsDTO,
    userId?: string,
  ): Promise<SupportSettingsRecord> {
    await this.ensureTableInitialized();

    const current = await this.getSettings();

    const updatedContact: SupportContactChannelsDTO = {
      ...current.contact,
      ...(dto.contact || {}),
    };

    const updatedFaqs: FAQItemDTO[] = dto.faqs
      ? dto.faqs.map((f, idx) => ({
          id: f.id || `faq_${Date.now()}_${idx}`,
          category: f.category || "General",
          question: f.question || "",
          answer: f.answer || "",
          isPublished: f.isPublished ?? true,
          orderIndex: f.orderIndex ?? idx,
        }))
      : current.faqs;

    const contactJson = JSON.stringify(updatedContact);
    const faqsJson = JSON.stringify(updatedFaqs);

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "support_settings" ("id", "contact", "faqs", "updated_at", "updated_by")
      VALUES ('default', $1::jsonb, $2::jsonb, CURRENT_TIMESTAMP, $3)
      ON CONFLICT ("id") DO UPDATE
      SET "contact" = EXCLUDED."contact",
          "faqs" = EXCLUDED."faqs",
          "updated_at" = CURRENT_TIMESTAMP,
          "updated_by" = EXCLUDED."updated_by";
      `,
      contactJson,
      faqsJson,
      userId || null,
    );

    const updatedRecord: SupportSettingsRecord = {
      id: "default",
      contact: updatedContact,
      faqs: updatedFaqs,
      updatedAt: new Date().toISOString(),
      updatedBy: userId || null,
    };

    // Invalidate caches
    this.memoryCache = {
      data: updatedRecord,
      expires: Date.now() + CACHE_TTL_SECONDS * 1000,
    };

    if (redis) {
      await redis
        .set(CACHE_KEY, JSON.stringify(updatedRecord), "EX", CACHE_TTL_SECONDS)
        .catch(() => {});
    }

    return updatedRecord;
  }
}

export const supportService = new SupportService();
