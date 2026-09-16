export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailOptions {
  to: string | EmailRecipient | (string | EmailRecipient)[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

export interface IEmailProvider {
  readonly name: string;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}
