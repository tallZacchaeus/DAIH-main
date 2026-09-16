import {
  IEmailProvider,
  SendEmailOptions,
  SendEmailResult,
} from "../email.interface.js";

export class MockEmailProvider implements IEmailProvider {
  readonly name = "MockProvider";
  public sentEmails: SendEmailOptions[] = [];

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    this.sentEmails.push(options);
    const recipient = Array.isArray(options.to)
      ? options.to.map((t) => (typeof t === "string" ? t : t.email)).join(", ")
      : typeof options.to === "string"
        ? options.to
        : options.to.email;

    console.log(
      `📨 [MOCK EMAIL SENT] To: ${recipient} | Subject: "${options.subject}"`,
    );
    return {
      success: true,
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      provider: this.name,
    };
  }

  clear(): void {
    this.sentEmails = [];
  }
}
