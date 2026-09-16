import {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from "./email.interface.js";
import { ResendEmailProvider } from "./providers/resend.provider.js";
import { ZeptoMailEmailProvider } from "./providers/zeptomail.provider.js";
import { MockEmailProvider } from "./providers/mock.provider.js";
import { emailTemplateService } from "./email-template.service.js";
import { config } from "../../config/env.js";

export class EmailService {
  private primaryProvider: IEmailProvider;
  private fallbackProvider: IEmailProvider;
  private mockProvider: MockEmailProvider;

  constructor() {
    this.primaryProvider = new ResendEmailProvider();
    this.fallbackProvider = new ZeptoMailEmailProvider();
    this.mockProvider = new MockEmailProvider();
  }

  /**
   * Sends email with primary (Resend) -> fallback (ZeptoMail) failover logic.
   * If both fail or in test/dev with no keys, routes to MockProvider safely.
   */
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    // If explicitly set to mock or running in test without keys, use Mock Provider
    if (
      config.email.provider === "mock" ||
      (!config.email.resendApiKey && !config.email.zeptomailApiKey)
    ) {
      return this.mockProvider.sendEmail(options);
    }

    // 1. Attempt Primary (Resend)
    if (config.email.resendApiKey && config.email.provider !== "zeptomail") {
      const primaryResult = await this.primaryProvider.sendEmail(options);
      if (primaryResult.success) {
        return primaryResult;
      }
      console.warn(
        `⚠️ Primary email provider (Resend) failed: ${primaryResult.error}. Attempting ZeptoMail fallback...`,
      );
    }

    // 2. Attempt Fallback (ZeptoMail)
    if (config.email.zeptomailApiKey) {
      const fallbackResult = await this.fallbackProvider.sendEmail(options);
      if (fallbackResult.success) {
        return fallbackResult;
      }
      console.error(
        `❌ Fallback email provider (ZeptoMail) failed: ${fallbackResult.error}`,
      );
    }

    // 3. If in non-production, fallback to mock so flows don't crash
    if (config.env !== "production") {
      console.warn(
        "⚠️ Both live email providers failed or were unconfigured; falling back to Mock provider in development",
      );
      return this.mockProvider.sendEmail(options);
    }

    return {
      success: false,
      provider: "none",
      error: "All email providers failed to deliver message",
    };
  }

  /**
   * Sends Verification Email with branded HTML link
   */
  async sendVerificationEmail(
    to: string,
    name: string,
    rawToken: string,
  ): Promise<SendEmailResult> {
    const verifyUrl = `${config.frontendUrls.customer}/verify-email?token=${encodeURIComponent(rawToken)}`;

    const rendered = await emailTemplateService.renderTemplate("verification", {
      name,
      verifyUrl,
      expiresInHours: config.jwt.verificationExpiresInHours,
    });

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Password Reset Email
   */
  async sendPasswordResetEmail(
    to: string,
    name: string,
    rawToken: string,
  ): Promise<SendEmailResult> {
    const resetUrl = `${config.frontendUrls.customer}/reset-password?token=${encodeURIComponent(rawToken)}`;

    const rendered = await emailTemplateService.renderTemplate(
      "password_reset",
      {
        name,
        resetUrl,
        expiresInHours: config.jwt.passwordResetExpiresInHours,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Staff / Admin Account Setup Invitation with 1-hour one-time link
   */
  async sendStaffWelcomeEmail(
    to: string,
    name: string,
    role: string,
    setupUrl: string,
  ): Promise<SendEmailResult> {
    const rendered = await emailTemplateService.renderTemplate(
      "staff_welcome",
      {
        name,
        role,
        setupUrl,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Payment Receipt & Booking Confirmation Email
   */
  async sendPaymentReceiptEmail(
    to: string,
    customerName: string,
    bookingReference: string,
    resourceName: string,
    amount: number,
    currency: string = "NGN",
    invoiceNumber?: string,
  ): Promise<SendEmailResult> {
    const dashboardUrl = `${config.frontendUrls.customer}/bookings`;
    const formattedAmount = `${currency} ${amount.toLocaleString()}`;

    const rendered = await emailTemplateService.renderTemplate(
      "payment_receipt",
      {
        customerName,
        bookingReference,
        resourceName,
        formattedAmount,
        invoiceNumber,
        dashboardUrl,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Booking Confirmation with Access Pass Link
   */
  async sendBookingConfirmationEmail(
    to: string,
    customerName: string,
    bookingReference: string,
    resourceName: string,
    startTime: string,
    endTime: string,
    qrToken?: string,
  ): Promise<SendEmailResult> {
    const passUrl = `${config.frontendUrls.customer}/qr`;
    const formattedStart = new Date(startTime).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const formattedEnd = new Date(endTime).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const rendered = await emailTemplateService.renderTemplate(
      "booking_confirmation",
      {
        customerName,
        bookingReference,
        resourceName,
        formattedStart,
        formattedEnd,
        passUrl,
        qrToken,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Booking Rescheduled Notification
   */
  async sendBookingRescheduledEmail(
    to: string,
    customerName: string,
    bookingReference: string,
    resourceName: string,
    startTime: string,
    endTime: string,
    qrToken?: string,
  ): Promise<SendEmailResult> {
    const passUrl = `${config.frontendUrls.customer}/qr`;
    const formattedStart = new Date(startTime).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const formattedEnd = new Date(endTime).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const rendered = await emailTemplateService.renderTemplate(
      "booking_rescheduled",
      {
        customerName,
        bookingReference,
        resourceName,
        formattedStart,
        formattedEnd,
        passUrl,
        qrToken,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Check-In Welcome Notice with Wi-Fi Credentials
   */
  async sendCheckInWelcomeEmail(
    to: string,
    customerName: string,
    bookingReference: string,
    resourceName: string,
    wifiCredentials?: {
      ssid?: string;
      username?: string;
      pin?: string;
      networkName?: string;
      password?: string;
      validUntil?: string;
    },
    endTime?: string,
  ): Promise<SendEmailResult> {
    const formattedEnd = endTime
      ? new Date(endTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "End of booked window";

    const wifiSsid =
      wifiCredentials?.ssid ||
      wifiCredentials?.networkName ||
      "DAIH-Member-HighSpeed";
    const wifiUsername = wifiCredentials?.username || "Guest";
    const wifiPin = wifiCredentials?.pin || wifiCredentials?.password || "N/A";

    const rendered = await emailTemplateService.renderTemplate(
      "check_in_welcome",
      {
        customerName,
        bookingReference,
        resourceName,
        wifiSsid,
        wifiUsername,
        wifiPin,
        formattedEnd,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Check-Out Departure Summary
   */
  async sendCheckOutSummaryEmail(
    to: string,
    customerName: string,
    bookingReference: string,
    resourceName: string,
    departureTime: string,
  ): Promise<SendEmailResult> {
    const formattedDeparture = new Date(departureTime).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const rendered = await emailTemplateService.renderTemplate(
      "check_out_summary",
      {
        customerName,
        bookingReference,
        resourceName,
        formattedDeparture,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Booking Reminder Email
   */
  async sendBookingReminderEmail(
    to: string,
    customerName: string,
    bookingReference: string,
    resourceName: string,
    startTime: string,
  ): Promise<SendEmailResult> {
    const formattedStart = new Date(startTime).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const passUrl = `${config.frontendUrls.customer}/qr`;

    const rendered = await emailTemplateService.renderTemplate(
      "booking_reminder",
      {
        customerName,
        bookingReference,
        resourceName,
        formattedStart,
        passUrl,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends Booking Cancellation Notice
   */
  async sendBookingCancelledEmail(
    to: string,
    customerName: string,
    bookingReference: string,
    resourceName: string,
    reason?: string,
  ): Promise<SendEmailResult> {
    const rendered = await emailTemplateService.renderTemplate(
      "booking_cancelled",
      {
        customerName,
        bookingReference,
        resourceName,
        reason,
      },
    );

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Sends a 6-digit MFA OTP code to a staff user.
   * Template key: "mfa_otp"
   */
  async sendMfaOtpEmail(
    to: string,
    name: string,
    otpCode: string,
  ): Promise<SendEmailResult> {
    const rendered = await emailTemplateService.renderTemplate("mfa_otp", {
      name,
      otpCode,
      expiresInMinutes: "10",
    });

    return this.sendEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  getMockProvider(): MockEmailProvider {
    return this.mockProvider;
  }
}

export const emailService = new EmailService();
