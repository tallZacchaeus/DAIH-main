import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import { EmailService } from "./email.service.js";
import {
  emailTemplateService,
  interpolateTemplate,
} from "./email-template.service.js";
import { prisma } from "../../db/client.js";
import { config } from "../../config/env.js";

describe("EmailService & Dynamic Database Templates", () => {
  let emailService: EmailService;
  const originalProvider = config.email.provider;

  beforeAll(async () => {
    await emailTemplateService.invalidateCache();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    config.email.provider = "mock";
    emailService = new EmailService();
    await emailTemplateService.invalidateCache();
  });

  afterEach(() => {
    config.email.provider = originalProvider;
  });

  it("should send email using mock provider in development/test environment", async () => {
    const result = await emailService.sendEmail({
      to: "member@daih.ng",
      subject: "Test Subject",
      html: "<p>Test Message</p>",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("MockProvider");
    expect(emailService.getMockProvider().sentEmails.length).toBe(1);
    expect(emailService.getMockProvider().sentEmails[0].subject).toBe(
      "Test Subject",
    );
  });

  it("should generate properly formatted verification email from database template", async () => {
    emailService.getMockProvider().clear();

    const result = await emailService.sendVerificationEmail(
      "tunde@company.com",
      "Tunde Adeleke",
      "secure_verification_token_123",
    );

    expect(result.success).toBe(true);
    const sent = emailService.getMockProvider().sentEmails[0];
    expect(sent.to).toBe("tunde@company.com");
    expect(sent.subject).toContain("Verify your DAIH Hub Account");
    expect(sent.html).toContain("secure_verification_token_123");
    expect(sent.html).toContain("/verify-email?token=");
  });

  it("should generate properly formatted password reset email from database template", async () => {
    emailService.getMockProvider().clear();

    const result = await emailService.sendPasswordResetEmail(
      "amina@company.com",
      "Amina Bello",
      "secure_reset_token_456",
    );

    expect(result.success).toBe(true);
    const sent = emailService.getMockProvider().sentEmails[0];
    expect(sent.to).toBe("amina@company.com");
    expect(sent.subject).toContain("Reset Your DAIH Password");
    expect(sent.html).toContain("secure_reset_token_456");
    expect(sent.html).toContain("/reset-password?token=");
  });

  it("should generate properly formatted staff welcome notice with 1-hour setup link", async () => {
    emailService.getMockProvider().clear();

    const setupUrl =
      "https://admin.daih.ng/setup-account?token=secure_setup_token_789";

    const result = await emailService.sendStaffWelcomeEmail(
      "admin.staff@daih.ng",
      "Staff User",
      "OPERATIONS_ADMIN",
      setupUrl,
    );

    expect(result.success).toBe(true);
    const sent = emailService.getMockProvider().sentEmails[0];
    expect(sent.to).toBe("admin.staff@daih.ng");
    expect(sent.subject).toContain("Welcome to DAIH");
    expect(sent.html).toContain("OPERATIONS_ADMIN");
    expect(sent.html).toContain("secure_setup_token_789");
    expect(sent.html).toContain("/setup-account?token=");
    expect(sent.html).toContain("1 hour");
  });

  it("should correctly interpolate variables and conditionals in templates", () => {
    const rawTemplate =
      "Hello {{name}}, your code is {{code}}.{{#if extra}} Extra: {{extra}}{{/if}}";
    const rendered1 = interpolateTemplate(rawTemplate, {
      name: "Bola",
      code: "1234",
      extra: "VIP Pass",
    });
    expect(rendered1).toBe("Hello Bola, your code is 1234. Extra: VIP Pass");

    const rendered2 = interpolateTemplate(rawTemplate, {
      name: "Bola",
      code: "1234",
      extra: "",
    });
    expect(rendered2).toBe("Hello Bola, your code is 1234.");
  });

  it("should strictly fail with EMAIL_TEMPLATE_NOT_FOUND when template is missing from database", async () => {
    await expect(
      emailTemplateService.renderTemplate("non_existent_custom_template", {
        name: "Test",
      }),
    ).rejects.toThrow("does not exist in the database");
  });

  it("should strictly fail with EMAIL_TEMPLATE_INACTIVE when template is marked inactive", async () => {
    // Create an inactive test template in DB
    await emailTemplateService.updateTemplate("inactive_test_template", {
      subject: "Inactive Notice",
      htmlBody: "<p>Disabled</p>",
      isActive: false,
    });

    await expect(
      emailTemplateService.renderTemplate("inactive_test_template", {}),
    ).rejects.toThrow("currently deactivated");

    // Clean up
    await emailTemplateService.deleteTemplate("inactive_test_template");
  });
});
