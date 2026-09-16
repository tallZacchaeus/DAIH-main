import {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from "../email.interface.js";
import { config } from "../../../config/env.js";

export class ZeptoMailEmailProvider implements IEmailProvider {
  readonly name = "ZeptoMail";

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!config.email.zeptomailApiKey) {
      return {
        success: false,
        provider: this.name,
        error: "ZeptoMail API key not configured",
      };
    }

    try {
      const toRecipients = Array.isArray(options.to)
        ? options.to.map((t) =>
            typeof t === "string"
              ? { email_address: { address: t } }
              : { email_address: { address: t.email, name: t.name } },
          )
        : [
            typeof options.to === "string"
              ? { email_address: { address: options.to } }
              : {
                  email_address: {
                    address: options.to.email,
                    name: options.to.name,
                  },
                },
          ];

      const fromAddress = options.from || config.email.zeptomailFromEmail;

      const payload = {
        from: {
          address: fromAddress.includes("<")
            ? fromAddress.replace(/^.*<([^>]+)>.*$/, "$1").trim()
            : fromAddress,
          name: fromAddress.includes("<")
            ? fromAddress.replace(/<.*>/, "").trim()
            : "DAIH Workspace Hub",
        },
        to: toRecipients,
        subject: options.subject,
        htmlbody: options.html,
        textbody: options.text,
      };

      const rawToken = config.email.zeptomailApiKey.trim();
      let authHeader: string;

      if (
        rawToken.toLowerCase().startsWith("zoho-") ||
        rawToken.toLowerCase().startsWith("sendmail-token ")
      ) {
        authHeader = rawToken;
      } else {
        // If raw token without prefix, default to Zoho-enczapikey prefix
        authHeader = `Zoho-enczapikey ${rawToken}`;
      }

      const response = await fetch(config.email.zeptomailApiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as any;

      if (!response.ok) {
        const errorDetail =
          data?.error?.details?.[0]?.message ||
          data?.error?.message ||
          data?.message ||
          (typeof data?.error === "string" ? data.error : null) ||
          `ZeptoMail HTTP ${response.status}`;

        return {
          success: false,
          provider: this.name,
          error: errorDetail,
        };
      }

      return {
        success: true,
        messageId: data?.data?.[0]?.message_id || data?.request_id,
        provider: this.name,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.name,
        error: err?.message || "Unknown error occurred in ZeptoMail provider",
      };
    }
  }
}
