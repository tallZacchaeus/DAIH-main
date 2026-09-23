import { prisma } from "../../db/client.js";
import { redis } from "../../config/redis.js";

export interface RenderedEmail {
  subject: string;
  html: string;
  text?: string;
}

export const TEMPLATE_METADATA: Record<
  string,
  { description: string; variables: string[] }
> = {
  verification: {
    description: "Email verification link sent to new customer accounts",
    variables: ["name", "verifyUrl", "expiresInHours"],
  },
  password_reset: {
    description: "Password reset request link",
    variables: ["name", "resetUrl", "expiresInHours"],
  },
  staff_welcome: {
    description:
      "One-time account setup link sent to newly onboarded staff & admin members",
    variables: ["name", "role", "setupUrl"],
  },
  payment_receipt: {
    description: "Payment confirmation and invoice receipt",
    variables: [
      "customerName",
      "bookingReference",
      "resourceName",
      "formattedAmount",
      "invoiceNumber",
      "dashboardUrl",
    ],
  },
  booking_confirmation: {
    description: "Booking confirmed notice with digital pass link",
    variables: [
      "customerName",
      "bookingReference",
      "resourceName",
      "formattedStart",
      "formattedEnd",
      "passUrl",
    ],
  },
  booking_rescheduled: {
    description: "Notice sent when a booking slot is rescheduled",
    variables: [
      "customerName",
      "bookingReference",
      "resourceName",
      "formattedStart",
      "formattedEnd",
      "passUrl",
    ],
  },
  check_in_welcome: {
    description: "Welcome notice upon check-in with Wi-Fi network details",
    variables: [
      "customerName",
      "bookingReference",
      "resourceName",
      "wifiSsid",
      "wifiUsername",
      "wifiPin",
      "formattedEnd",
    ],
  },
  check_out_summary: {
    description: "Departure summary notice when member checks out",
    variables: [
      "customerName",
      "bookingReference",
      "resourceName",
      "formattedDeparture",
      "reviewUrl",
    ],
  },
  booking_completed_review: {
    description: "Post-session review request sent after booking completion",
    variables: [
      "customerName",
      "bookingReference",
      "resourceName",
      "reviewUrl",
    ],
  },
  booking_reminder: {
    description: "Reminder notice sent before reservation starts",
    variables: [
      "customerName",
      "bookingReference",
      "resourceName",
      "formattedStart",
      "passUrl",
    ],
  },
  booking_cancelled: {
    description: "Cancellation confirmation notice",
    variables: ["customerName", "bookingReference", "resourceName", "reason"],
  },
};

/**
 * Interpolates simple {{variable}} tokens and handles basic {{#if var}}...{{/if}} conditional blocks.
 */
export function interpolateTemplate(
  template: string,
  variables: Record<string, any>,
): string {
  let result = template;

  // Handle simple {{#if key}} content {{/if}} conditionals
  result = result.replace(
    /\{\{#if\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, content) => {
      const val = variables[key];
      return val && val !== "" && val !== 0 ? content : "";
    },
  );

  // Handle standard {{variable}} replacements
  result = result.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return "";
    }
    return String(val);
  });

  return result;
}

export const DEFAULT_SYSTEM_TEMPLATES: Record<
  string,
  { subject: string; htmlBody: string; textBody?: string }
> = {
  booking_completed_review: {
    subject: "How was your session? Leave a Review — DAIH Hub",
    textBody:
      "Hello {{customerName}},\n\nThank you for choosing DAIH Hub! How was your session at {{resourceName}} (Ref: {{bookingReference}})? We'd love to hear your feedback.\n\nLeave your review here: {{reviewUrl}}\n\nBest regards,\nDAIH Workspace Team",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>How was your session? Leave a Review — DAIH Hub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">How was your session?</h1>
      <p style="color: #e2d9f3; margin: 8px 0 0 0; font-size: 14px;">Leave a Review &bull; DAIH Hub</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #1e293b; font-size: 14px; line-height: 1.6; margin-top: 0;">Hello {{customerName}},</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        Thank you for spending your session with us at <strong>{{resourceName}}</strong> (Booking Ref: <code>{{bookingReference}}</code>). We hope everything was seamless, productive, and comfortable.
      </p>
      <div style="text-align: center; margin: 24px 0 8px 0;">
        <span style="font-size: 26px; color: #f59e0b; letter-spacing: 4px;">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.6; text-align: center;">
        Your feedback helps other members choose the best space and helps our team keep elevating the workspace experience.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="{{reviewUrl}}" style="background-color: #23055c; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 12px; display: inline-block;">
          Leave a Review
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; text-align: center; margin-bottom: 0;">
        Or copy and paste this link in your browser:<br>
        <span style="color: #334155; word-break: break-all;">{{reviewUrl}}</span>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
};

export class EmailTemplateService {
  private readonly CACHE_PREFIX = "email_template:";
  private readonly CACHE_TTL_SECONDS = 600; // 10 minutes

  /**
   * Retrieves a template definition strictly from Redis Cache or Database.
   * Throws an error if no template exists or if it is marked inactive.
   */
  async getTemplate(type: string): Promise<{
    subject: string;
    htmlBody: string;
    textBody?: string;
    isActive: boolean;
  }> {
    const cacheKey = `${this.CACHE_PREFIX}${type}`;

    // 1. Try Redis cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!parsed.isActive) {
          const error: any = new Error(
            `Email template '${type}' is currently deactivated in system settings`,
          );
          error.code = "EMAIL_TEMPLATE_INACTIVE";
          error.statusCode = 400;
          throw error;
        }
        return parsed;
      }
    } catch (err: any) {
      if (err?.code === "EMAIL_TEMPLATE_INACTIVE") {
        throw err;
      }
      // Redis connection issue -> fallback directly to database
    }

    // 2. Query Database strictly
    const dbTemplate = await prisma.emailTemplate.findUnique({
      where: { type },
    });

    if (!dbTemplate) {
      const fallback = DEFAULT_SYSTEM_TEMPLATES[type];
      if (fallback) {
        try {
          const created = await prisma.emailTemplate.create({
            data: {
              type,
              subject: fallback.subject,
              htmlBody: fallback.htmlBody,
              textBody: fallback.textBody,
              isActive: true,
            },
          });
          return {
            subject: created.subject,
            htmlBody: created.htmlBody,
            textBody: created.textBody || undefined,
            isActive: created.isActive,
          };
        } catch {
          return {
            subject: fallback.subject,
            htmlBody: fallback.htmlBody,
            textBody: fallback.textBody,
            isActive: true,
          };
        }
      }

      const error: any = new Error(
        `Email template '${type}' does not exist in the database. Please configure this template in Admin Console.`,
      );
      error.code = "EMAIL_TEMPLATE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    if (!dbTemplate.isActive) {
      const error: any = new Error(
        `Email template '${type}' is currently deactivated in system settings`,
      );
      error.code = "EMAIL_TEMPLATE_INACTIVE";
      error.statusCode = 400;
      throw error;
    }

    const payload = {
      subject: dbTemplate.subject,
      htmlBody: dbTemplate.htmlBody,
      textBody: dbTemplate.textBody || undefined,
      isActive: dbTemplate.isActive,
    };

    // Cache in Redis for high-throughput dispatch
    try {
      await redis.set(
        cacheKey,
        JSON.stringify(payload),
        "EX",
        this.CACHE_TTL_SECONDS,
      );
    } catch {}

    return payload;
  }

  /**
   * Renders a template with provided variables
   */
  async renderTemplate(
    type: string,
    variables: Record<string, any>,
  ): Promise<RenderedEmail> {
    const template = await this.getTemplate(type);

    const subject = interpolateTemplate(template.subject, variables);
    const html = interpolateTemplate(template.htmlBody, variables);
    const text = template.textBody
      ? interpolateTemplate(template.textBody, variables)
      : undefined;

    return {
      subject,
      html,
      text,
    };
  }

  /**
   * Lists all templates defined in the database
   */
  async listTemplates(): Promise<
    Array<{
      type: string;
      subject: string;
      htmlBody: string;
      textBody?: string;
      description: string;
      variables: string[];
      isCustomized: boolean;
      isActive: boolean;
      updatedAt?: Date;
    }>
  > {
    const dbTemplates = await prisma.emailTemplate.findMany({
      orderBy: { type: "asc" },
    });

    return dbTemplates.map((t) => {
      const meta = TEMPLATE_METADATA[t.type] || {
        description: `Transactional template for ${t.type}`,
        variables: [],
      };

      return {
        type: t.type,
        subject: t.subject,
        htmlBody: t.htmlBody,
        textBody: t.textBody || undefined,
        description: meta.description,
        variables: meta.variables,
        isCustomized: true,
        isActive: t.isActive,
        updatedAt: t.updatedAt,
      };
    });
  }

  /**
   * Updates or creates a template in the database and clears Redis cache
   */
  async updateTemplate(
    type: string,
    data: {
      subject: string;
      htmlBody: string;
      textBody?: string;
      isActive?: boolean;
    },
    adminUserId?: string,
  ): Promise<{ success: boolean; type: string }> {
    await prisma.emailTemplate.upsert({
      where: { type },
      create: {
        type,
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        isActive: data.isActive ?? true,
        lastEditedBy: adminUserId,
      },
      update: {
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        isActive: data.isActive ?? true,
        lastEditedBy: adminUserId,
      },
    });

    // Invalidate Redis cache
    await this.invalidateCache(type);

    return { success: true, type };
  }

  /**
   * Deletes a template from the database and clears Redis cache
   */
  async deleteTemplate(
    type: string,
  ): Promise<{ success: boolean; type: string }> {
    await prisma.emailTemplate.delete({
      where: { type },
    });

    await this.invalidateCache(type);

    return { success: true, type };
  }

  /**
   * Clears cache for a given template type or all templates
   */
  async invalidateCache(type?: string): Promise<void> {
    try {
      if (type) {
        await redis.del(`${this.CACHE_PREFIX}${type}`);
      } else {
        const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      }
    } catch {}
  }
}

export const emailTemplateService = new EmailTemplateService();
