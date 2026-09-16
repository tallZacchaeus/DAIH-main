import { prisma } from "../../db/client.js";
import { redis } from "../../config/redis.js";

export const INITIAL_EMAIL_TEMPLATES = [
  {
    type: "verification",
    subject: "Verify your DAIH Hub Account",
    textBody:
      "Hello {{name}},\n\nPlease verify your email by clicking: {{verifyUrl}}\n\nThis link expires in {{expiresInHours}} hours.",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify your DAIH Hub Account</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(35, 5, 92, 0.04);">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DAIH Workspace Hub</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; font-weight: 700;">Verify Your Email Address</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{name}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Welcome to DAIH! Please confirm your email address to activate your account and start booking workspaces, private offices, and conference rooms.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="{{verifyUrl}}" style="background-color: #23055c; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 2px 6px rgba(35, 5, 92, 0.2);">
          Verify Email & Activate Account
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        This verification link will expire in {{expiresInHours}} hours. If you did not create an account on DAIH, you can safely ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
        Or copy and paste this link into your browser:<br/>
        <span style="color: #23055c; word-break: break-all;">{{verifyUrl}}</span>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "password_reset",
    subject: "Reset Your DAIH Password",
    textBody:
      "Hello {{name}},\n\nReset your password here: {{resetUrl}}\n\nExpires in {{expiresInHours}} hour(s).",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your DAIH Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(35, 5, 92, 0.04);">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DAIH Workspace Hub</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; font-weight: 700;">Password Reset Request</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{name}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        We received a request to reset the password for your DAIH account. Click the button below to choose a new password.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="{{resetUrl}}" style="background-color: #23055c; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
          Reset Your Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        This password reset link will expire in {{expiresInHours}} hour(s). If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.
      </p>
      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
        Direct link: <span style="color: #23055c; word-break: break-all;">{{resetUrl}}</span>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "staff_welcome",
    subject: "Welcome to DAIH Staff & Admin Console — Set Up Your Account",
    textBody:
      "Hello {{name}},\n\nYou have been assigned the role {{role}} on the DAIH Admin Console.\n\nPlease set up your password using your one-time link:\n{{setupUrl}}\n\nThis setup link expires in 1 hour and can only be used once.",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to DAIH Staff Portal</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(35, 5, 92, 0.06);">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DAIH Admin Console</h1>
      <p style="color: #e8ddff; margin: 6px 0 0 0; font-size: 13px;">Operations & Facility Management</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; font-weight: 700;">Staff Account Invitation</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{name}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        You have been granted access to the DAIH Operations & Admin Console with the operational role: <strong>{{role}}</strong>.
      </p>

      <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
        <div style="color: #92400e; font-weight: 700; font-size: 13px; margin-bottom: 4px;">🔐 One-Time Account Setup</div>
        <p style="color: #b45309; font-size: 12px; line-height: 1.5; margin: 0;">
          For security, this setup link <strong>expires in 1 hour</strong> and can only be used once. Click below to choose your password and activate your account.
        </p>
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a href="{{setupUrl}}" style="background-color: #23055c; color: #ffffff; padding: 14px 32px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 2px 8px rgba(35, 5, 92, 0.25);">
          Set Up Password & Activate Account
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">
        Or paste this link into your browser:<br/>
        <span style="color: #23055c; word-break: break-all;">{{setupUrl}}</span>
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "payment_receipt",
    subject: "Payment Confirmed: Booking {{bookingReference}} — DAIH Hub",
    textBody:
      "Hello {{customerName}},\n\nYour payment of {{formattedAmount}} for booking {{bookingReference}} ({{resourceName}}) is confirmed.\nView booking: {{dashboardUrl}}",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Confirmation & Receipt — DAIH Hub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(35, 5, 92, 0.04);">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DAIH Workspace Hub</h1>
    </div>
    <div style="padding: 32px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background-color: #ecfdf5; color: #065f46; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #a7f3d0;">Payment Confirmed</span>
      </div>
      <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; font-weight: 700; text-align: center;">Thank You for Your Payment!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{customerName}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Your payment for booking <strong>{{bookingReference}}</strong> ({{resourceName}}) has been confirmed successfully.
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #64748b; font-size: 13px;">Amount Paid:</span>
          <span style="color: #0f172a; font-weight: 700; font-size: 14px;">{{formattedAmount}}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
          <span style="color: #64748b; font-size: 13px;">Booking Ref:</span>
          <span style="color: #0f172a; font-weight: 600; font-size: 13px;">{{bookingReference}}</span>
        </div>
        {{#if invoiceNumber}}
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #64748b; font-size: 13px;">Invoice #:</span>
          <span style="color: #0f172a; font-weight: 600; font-size: 13px;">{{invoiceNumber}}</span>
        </div>
        {{/if}}
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a href="{{dashboardUrl}}" style="background-color: #23055c; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
          View Your Booking & Access Pass
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "booking_confirmation",
    subject:
      "Access Pass: Booking {{bookingReference}} ({{resourceName}}) — DAIH Hub",
    textBody:
      "Hello {{customerName}},\n\nYour booking {{bookingReference}} ({{resourceName}}) is confirmed for {{formattedStart}}.\nView pass: {{passUrl}}",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your DAIH Workspace Digital Access Pass</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(35, 5, 92, 0.04);">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DAIH Workspace Hub</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; font-weight: 700;">Your Booking & Access Pass are Ready!</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{customerName}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Your reservation for <strong>{{resourceName}}</strong> is confirmed. Present your digital access pass at reception or security check-in upon arrival.
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 8px;">
          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700;">Booking Reference:</span>
          <div style="color: #0f172a; font-weight: 700; font-size: 16px; font-family: monospace;">{{bookingReference}}</div>
        </div>
        <div style="margin-bottom: 8px;">
          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700;">Workspace:</span>
          <div style="color: #0f172a; font-weight: 600; font-size: 14px;">{{resourceName}}</div>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700;">Scheduled Slot:</span>
          <div style="color: #0f172a; font-size: 13px;">{{formattedStart}} — {{formattedEnd}}</div>
        </div>
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a href="{{passUrl}}" style="background-color: #23055c; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
          Open Digital QR Pass
        </a>
      </div>

      <p style="color: #64748b; font-size: 12px; line-height: 1.5;">
        <strong>Important Note:</strong> Check-in is permitted starting strictly at {{formattedStart}}. Early check-in is not permitted to ensure scheduled space availability.
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "booking_rescheduled",
    subject:
      "Booking Rescheduled: {{bookingReference}} ({{resourceName}}) — DAIH Hub",
    textBody:
      "Hello {{customerName}},\n\nYour booking {{bookingReference}} ({{resourceName}}) has been rescheduled to {{formattedStart}} — {{formattedEnd}}.\nView pass: {{passUrl}}",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Rescheduled — DAIH Hub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(35, 5, 92, 0.04);">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">DAIH Workspace Hub</h1>
    </div>
    <div style="padding: 32px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span style="background-color: #f5f3ff; color: #6d28d9; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; border: 1px solid #ddd6fe;">Booking Rescheduled</span>
      </div>
      <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; font-weight: 700; text-align: center;">Your New Reservation Time is Confirmed</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{customerName}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Your reservation for <strong>{{resourceName}}</strong> (Ref: <code>{{bookingReference}}</code>) has been successfully rescheduled to the new time slot below:
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0;">
        <div style="margin-bottom: 8px;">
          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700;">New Time Slot:</span>
          <div style="color: #23055c; font-weight: 700; font-size: 15px;">{{formattedStart}} — {{formattedEnd}}</div>
        </div>
        <div>
          <span style="color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700;">Workspace:</span>
          <div style="color: #0f172a; font-weight: 600; font-size: 14px;">{{resourceName}}</div>
        </div>
      </div>

      <div style="margin: 28px 0; text-align: center;">
        <a href="{{passUrl}}" style="background-color: #23055c; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
          View Updated Access Pass
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "check_in_welcome",
    subject: "Checked In: Welcome to DAIH ({{resourceName}})",
    textBody:
      "Hello {{customerName}},\n\nYou are checked in to {{resourceName}}.\nWi-Fi: {{wifiSsid}} | Username: {{wifiUsername}} | PIN: {{wifiPin}}\nValid until: {{formattedEnd}}",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to DAIH Hub — Checked In</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #065f46; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Welcome to DAIH!</h1>
      <p style="color: #a7f3d0; margin: 6px 0 0 0; font-size: 13px;">Check-In Confirmed · {{resourceName}}</p>
    </div>
    <div style="padding: 32px;">
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{customerName}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        You are now checked in to <strong>{{resourceName}}</strong> (Ref: <code>{{bookingReference}}</code>). We hope you have a productive session!
      </p>

      {{#if wifiSsid}}
      <div style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #bbf7d0;">
        <h3 style="color: #166534; font-size: 14px; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">📶 High-Speed Wi-Fi Access</h3>
        <div style="margin-bottom: 8px;">
          <span style="color: #64748b; font-size: 12px;">Network (SSID):</span>
          <div style="color: #0f172a; font-weight: 700; font-size: 14px;">{{wifiSsid}}</div>
        </div>
        <div style="display: flex; gap: 16px; margin-top: 8px;">
          <div style="flex: 1;">
            <span style="color: #64748b; font-size: 12px;">Username:</span>
            <div style="color: #0f172a; font-weight: 700; font-size: 14px; font-family: monospace;">{{wifiUsername}}</div>
          </div>
          <div style="flex: 1;">
            <span style="color: #64748b; font-size: 12px;">PIN:</span>
            <div style="color: #0f172a; font-weight: 700; font-size: 14px; font-family: monospace;">{{wifiPin}}</div>
          </div>
        </div>
        <p style="color: #15803d; font-size: 11px; margin: 12px 0 0 0;">
          ✓ Continuous Day Access: If you step out midday and check out, your internet remains active until {{formattedEnd}}.
        </p>
      </div>
      {{/if}}

      <div style="background-color: #f8fafc; border-radius: 10px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 12px; color: #475569;">
        <strong>Workspace Guidelines:</strong>
        <ul style="margin: 8px 0 0 0; padding-left: 18px; line-height: 1.6;">
          <li>Complimentary tea and water are available at the refreshment lounge.</li>
          <li>Please keep phone conversations in designated phone booths.</li>
          <li>Scan your pass again at reception when stepping out or concluding your session.</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "check_out_summary",
    subject: "Departure Recorded: Booking {{bookingReference}} — DAIH Hub",
    textBody:
      "Hello {{customerName}},\n\nYour departure from {{resourceName}} was recorded at {{formattedDeparture}}. Thank you for visiting DAIH!",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Session Checked Out — DAIH Hub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Thank You for Visiting!</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{customerName}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Your departure from <strong>{{resourceName}}</strong> (Ref: <code>{{bookingReference}}</code>) was recorded at <strong>{{formattedDeparture}}</strong>.
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        If you stepped out for lunch or meetings and your booking slot has not elapsed, you can scan your pass at reception to re-enter at any time before your scheduled end time.
      </p>
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px;">
        We look forward to hosting you again soon at DAIH Workspace Hub.
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "booking_reminder",
    subject:
      "Reminder: Your reservation starts soon ({{resourceName}}) — DAIH Hub",
    textBody:
      "Hello {{customerName}},\n\nYour reservation for {{resourceName}} starts at {{formattedStart}}.\nView pass: {{passUrl}}",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Upcoming Reservation Reminder — DAIH Hub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Reservation Reminder</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{customerName}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        This is a friendly reminder that your reservation for <strong>{{resourceName}}</strong> (Ref: <code>{{bookingReference}}</code>) starts at <strong>{{formattedStart}}</strong>.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="{{passUrl}}" style="background-color: #23055c; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: 700; text-decoration: none; border-radius: 10px; display: inline-block;">
          View Access Pass
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "booking_cancelled",
    subject:
      "Cancelled: Booking {{bookingReference}} ({{resourceName}}) — DAIH Hub",
    textBody:
      "Hello {{customerName}},\n\nYour booking {{bookingReference}} ({{resourceName}}) has been cancelled.",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Cancelled — DAIH Hub</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
    <div style="background-color: #7f1d1d; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">Booking Cancelled</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{customerName}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Your reservation for <strong>{{resourceName}}</strong> (Ref: <code>{{bookingReference}}</code>) has been cancelled.
      </p>
      {{#if reason}}
      <p style="color: #64748b; font-size: 13px;">Reason: {{reason}}</p>
      {{/if}}
      <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px;">
        If you have questions or believe this was an error, please contact our front desk team.
      </p>
    </div>
  </div>
</body>
</html>`,
  },
  {
    type: "mfa_otp",
    subject: "Your DAIH Login Verification Code: {{otpCode}}",
    textBody:
      "Hello {{name}},\n\nYour 6-digit login verification code for the DAIH Admin Console is:\n\n{{otpCode}}\n\nThis code expires in {{expiresInMinutes}} minutes.\nNever share this code with anyone, including DAIH staff.",
    htmlBody: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your DAIH Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(35, 5, 92, 0.06);">
    <div style="background-color: #23055c; padding: 28px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">DAIH Admin Console</h1>
      <p style="color: #e8ddff; margin: 6px 0 0 0; font-size: 13px;">Security & Two-Factor Authentication</p>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #0f172a; font-size: 18px; margin-top: 0; font-weight: 700;">Login Verification Code</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">Hello {{name}},</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        A sign-in attempt was initiated for your DAIH staff account. Use the one-time verification code below to complete your login:
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 16px 36px;">
          <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #23055c;">{{otpCode}}</span>
        </div>
      </div>
      <p style="color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
        This code expires in <strong>{{expiresInMinutes}} minutes</strong> and is valid for a single use.
      </p>
      <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
        <p style="color: #991b1b; font-size: 12px; margin: 0; line-height: 1.5;">
          🔒 <strong>Security Warning:</strong> DAIH staff will never ask for this code. Do not share it with anyone under any circumstances.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
];

export async function seedEmailTemplates(): Promise<void> {
  console.log("Seeding email templates into PostgreSQL database...");
  for (const t of INITIAL_EMAIL_TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { type: t.type },
      create: {
        type: t.type,
        subject: t.subject,
        htmlBody: t.htmlBody,
        textBody: t.textBody,
        isActive: true,
      },
      update: {
        subject: t.subject,
        htmlBody: t.htmlBody,
        textBody: t.textBody,
        isActive: true,
      },
    });
  }
  // Invalidate Redis cache
  try {
    const keys = await redis.keys("email_template:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {}
  console.log(`✓ Seeded ${INITIAL_EMAIL_TEMPLATES.length} email templates.`);
}

if (
  process.argv[1]?.endsWith("email-templates.seed.ts") ||
  process.argv[1]?.endsWith("email-templates.seed.js")
) {
  seedEmailTemplates()
    .catch(console.error)
    .finally(() => process.exit(0));
}
