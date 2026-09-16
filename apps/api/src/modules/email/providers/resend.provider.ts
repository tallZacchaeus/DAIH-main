import { Resend } from "resend";
import {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from "../email.interface.js";
import { config } from "../../../config/env.js";

export class ResendEmailProvider implements IEmailProvider {
  readonly name = "Resend";
  private client?: Resend;

  constructor() {
    if (config.email.resendApiKey) {
      this.client = new Resend(config.email.resendApiKey);
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.client && !config.email.resendApiKey) {
      return {
        success: false,
        provider: this.name,
        error: "Resend API key not configured",
      };
    }

    if (!this.client) {
      this.client = new Resend(config.email.resendApiKey);
    }

    try {
      const toAddresses = Array.isArray(options.to)
        ? options.to.map((t) => (typeof t === "string" ? t : t.email))
        : [typeof options.to === "string" ? options.to : options.to.email];

      const fromAddress = options.from || config.email.resendFromEmail;

      const { data, error } = await this.client.emails.send({
        from: fromAddress,
        to: toAddresses,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      });

      if (error) {
        return {
          success: false,
          provider: this.name,
          error: error.message,
        };
      }

      return {
        success: true,
        messageId: data?.id,
        provider: this.name,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err?.message || "Unknown error occurred in Resend provider",
      };
    }
  }
}
