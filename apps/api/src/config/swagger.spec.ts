import { OpenAPIV3 } from "openapi-types";

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "DAIH Workspace Platform API",
    version: "1.0.0",
    description: `
## Dare Adeboye Innovation Hub (DAIH) Modular API Documentation

Welcome to the official REST API documentation for the **DAIH Workspace Platform**.
This API powers:
- **Customer Progressive Web App (PWA)**: Desk and space reservations, subscriptions, QR digital access passes, personal billing history, and referral programs.
- **Operations Admin Portal**: Space allocation, live occupancy analytics, financial reconciliation, discount coupon engine, staff role management, and transactional email template customization.
- **Reception & Security Terminal App**: Rapid QR pass scanning, same-day re-entry validation, and shift attendance telemetry.

### Authentication
Protected endpoints require either:
1. **Bearer Token Authentication**: Include your access token in the \`Authorization\` header as \`Bearer <jwt_token>\`.
2. **Session Cookie**: Set automatically via \`refreshToken\` HTTP-only cookie on login/refresh.

Use the **Authorize** button below to provide a JWT token for testing secured endpoints.
    `.trim(),
    contact: {
      name: "DAIH Technical Operations",
      email: "support@daih.ng",
      url: "https://hub.daih.ng",
    },
    license: {
      name: "Proprietary / Internal Access Only",
    },
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
    {
      url: "https://api-staging.daih.ng",
      description: "Staging Testing Environment",
    },
    {
      url: "https://api.daih.ng",
      description: "Production Environment",
    },
  ],
  tags: [
    {
      name: "Identity & Auth",
      description:
        "User authentication, profile management, avatar uploads, MFA (TOTP/Email OTP), password reset, and staff directory management.",
    },
    {
      name: "Catalogue & Resources",
      description:
        "Workspace resource management (Hot Desks, Flex Desks, Dedicated Desks, Office Suites, Conference Halls, Studios), pricing tiers, blackout periods, and operational schedules.",
    },
    {
      name: "Bookings",
      description:
        "Space reservation workflow (hold creation, checkout confirmation, rescheduling, cancellations, calendar availability, and admin overrides).",
    },
    {
      name: "Payments & Invoices",
      description:
        "Paystack payment initialization, status verification, financial transaction history, automated invoices, daily summaries, and Paystack webhooks.",
    },
    {
      name: "Discounts & Promotions",
      description:
        "Promotional campaigns, automatic discounts, coupon redemption, staff courtesy overrides, and discount preview calculator.",
    },
    {
      name: "Access & Passes",
      description:
        "Digital QR access pass generation, terminal scanner verification, check-in and check-out processing, and live occupancy telemetry.",
    },
    {
      name: "Email Templates",
      description:
        "Dynamic transactional email template customization and real-time HTML/text preview.",
    },
    {
      name: "Legal Policies",
      description:
        "Workspace terms of service, privacy policy, NDPR compliance documents, and consent auditing.",
    },
    {
      name: "Support & FAQs",
      description:
        "Workspace contact channels, helpdesk FAQs, and operating hour support metadata.",
    },
    {
      name: "In-App Notifications",
      description:
        "Real-time user notification inbox, unread badges, mark-read, and archive operations.",
    },
    {
      name: "Reports & Analytics",
      description:
        "Consolidated operational analytics and CSV report exports for bookings, finance, and customer telemetry.",
    },
    {
      name: "System & Health",
      description:
        "Service health probes and observability diagnostics (Sentry & Datadog tracing).",
    },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System & Health"],
        summary: "API Health Check Probe",
        description:
          "Returns the operational status, timestamp, and service identity.",
        responses: {
          "200": {
            description: "Service is healthy and operating normally",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "healthy" },
                    timestamp: {
                      type: "string",
                      format: "date-time",
                      example: "2026-09-11T09:30:00.000Z",
                    },
                    service: { type: "string", example: "DAIH Modular API" },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ─── IDENTITY & AUTH ────────────────────────────────────────────────────────
    "/api/v1/identity/register": {
      post: {
        tags: ["Identity & Auth"],
        summary: "Register a new customer account",
        description:
          "Creates a member account and queues an email verification link. Supports optional referral code.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterDTO" },
            },
          },
        },
        responses: {
          "201": {
            description: "Account registered successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthSuccessResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "409": {
            description: "Email address already registered",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/identity/login": {
      post: {
        tags: ["Identity & Auth"],
        summary: "Authenticate user credentials",
        description:
          "Validates email and password. Returns JWT access token or prompts for MFA challenge if enabled.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginDTO" },
            },
          },
        },
        responses: {
          "200": {
            description: "Authentication successful or MFA challenge initiated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginSuccessResponse" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
        },
      },
    },
    "/api/v1/identity/refresh": {
      post: {
        tags: ["Identity & Auth"],
        summary: "Rotate session and issue new access token",
        description:
          "Uses the HTTP-only refreshToken cookie to rotate auth session and generate a fresh access token.",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Session refreshed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    accessToken: {
                      type: "string",
                      example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    },
                    user: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
        },
      },
    },
    "/api/v1/identity/logout": {
      post: {
        tags: ["Identity & Auth"],
        summary: "Sign out and revoke active auth session",
        description:
          "Invalidates the active session token family and clears the authentication cookie.",
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: {
          "200": {
            description: "Signed out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Logged out successfully",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/identity/me": {
      get: {
        tags: ["Identity & Auth"],
        summary: "Get current authenticated user profile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current member profile",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserProfile" },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
        },
      },
      put: {
        tags: ["Identity & Auth"],
        summary: "Update personal profile details",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateProfileDTO" },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserProfile" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
        },
      },
    },
    "/api/v1/identity/me/change-password": {
      post: {
        tags: ["Identity & Auth"],
        summary: "Change account password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["currentPassword", "newPassword"],
                properties: {
                  currentPassword: { type: "string", format: "password" },
                  newPassword: {
                    type: "string",
                    format: "password",
                    minLength: 8,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Password changed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    message: {
                      type: "string",
                      example: "Password changed successfully",
                    },
                  },
                },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
        },
      },
    },
    "/api/v1/identity/me/avatar": {
      post: {
        tags: ["Identity & Auth"],
        summary: "Upload profile avatar image",
        description:
          "Uploads and optimizes profile picture (Base64 WebP/PNG/JPG).",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["data"],
                properties: {
                  data: {
                    type: "string",
                    description: "Base64 data URL or raw Base64 string",
                  },
                  contentType: { type: "string", example: "image/webp" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Avatar uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    avatarUrl: {
                      type: "string",
                      example: "/uploads/avatars/user-123.webp",
                    },
                    user: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Identity & Auth"],
        summary: "Remove profile avatar image",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Avatar removed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    user: { $ref: "#/components/schemas/UserProfile" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/identity/me/referrals": {
      get: {
        tags: ["Identity & Auth"],
        summary: "Get member referral program statistics",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Referral stats and referred user count",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/CustomerReferralsResponse",
                },
              },
            },
          },
        },
      },
    },

    // ─── CATALOGUE & RESOURCES ──────────────────────────────────────────────────
    "/api/v1/catalogue/resources": {
      get: {
        tags: ["Catalogue & Resources"],
        summary: "List public active resources and pricing",
        description:
          "Retrieves all publicly available workspace spaces and active hourly/daily/monthly pricing tiers.",
        responses: {
          "200": {
            description: "List of active workspace resources",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FacilityResource" },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/catalogue/resources/{slug}": {
      get: {
        tags: ["Catalogue & Resources"],
        summary: "Get resource details by slug or ID",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Resource URL slug or UUID",
          },
        ],
        responses: {
          "200": {
            description:
              "Detailed resource record including pricing plans, operating schedules, and blackout periods",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FacilityResource" },
              },
            },
          },
          "404": { $ref: "#/components/responses/NotFoundError" },
        },
      },
    },
    "/api/v1/catalogue/admin/resources": {
      get: {
        tags: ["Catalogue & Resources"],
        summary: "Admin: List all resources (including inactive)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "Comprehensive list of all workspace resources for operations management",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FacilityResource" },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/UnauthorizedError" },
          "403": { $ref: "#/components/responses/ForbiddenError" },
        },
      },
      post: {
        tags: ["Catalogue & Resources"],
        summary: "Admin: Create a new resource",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateResourceDTO" },
            },
          },
        },
        responses: {
          "201": {
            description: "Resource created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/FacilityResource" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },

    // ─── BOOKINGS ───────────────────────────────────────────────────────────────
    "/api/v1/bookings/hold": {
      post: {
        tags: ["Bookings"],
        summary: "Place a temporary 10-minute hold on a resource",
        description:
          "Reserves desk/space capacity for 10 minutes to prevent double-booking while customer completes checkout.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateHoldDTO" },
            },
          },
        },
        responses: {
          "201": {
            description: "Hold created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookingHoldDTO" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "409": {
            description:
              "Resource capacity unavailable for the requested window",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ErrorResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/bookings/{id}/confirm": {
      post: {
        tags: ["Bookings"],
        summary:
          "Confirm a held booking without payment (Free / 100% Discount / Admin)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Booking ID",
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Booking confirmed and access pass generated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BookingSummary" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/v1/bookings/my": {
      get: {
        tags: ["Bookings"],
        summary: "Customer: List personal bookings and pass history",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of customer bookings",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/BookingSummary" },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/bookings/availability": {
      get: {
        tags: ["Bookings"],
        summary: "Check real-time capacity and pricing for a window",
        parameters: [
          {
            name: "resourceId",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
          {
            name: "startTime",
            in: "query",
            required: true,
            schema: { type: "string", format: "date-time" },
          },
          {
            name: "endTime",
            in: "query",
            required: true,
            schema: { type: "string", format: "date-time" },
          },
        ],
        responses: {
          "200": {
            description: "Real-time availability status",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AvailabilityResultDTO" },
              },
            },
          },
        },
      },
    },
    "/api/v1/bookings/admin/dashboard-summary": {
      get: {
        tags: ["Bookings"],
        summary: "Admin: Consolidated Operations Dashboard KPI Summary",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "Live occupancy, today's check-ins, active bookings, and recent alerts",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AdminDashboardSummaryDTO",
                },
              },
            },
          },
        },
      },
    },

    // ─── PAYMENTS & INVOICES ───────────────────────────────────────────────────
    "/api/v1/payments/initialize/{bookingId}": {
      post: {
        tags: ["Payments & Invoices"],
        summary: "Initialize Paystack checkout transaction",
        parameters: [
          {
            name: "bookingId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  discountCode: { type: "string" },
                  callbackUrl: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Paystack authorization URL and reference",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/PaystackInitializeResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/payments/{transactionId}/verify": {
      post: {
        tags: ["Payments & Invoices"],
        summary: "Verify Paystack transaction status",
        parameters: [
          {
            name: "transactionId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Payment verified successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaymentTransaction" },
              },
            },
          },
        },
      },
    },
    "/api/v1/payments/webhook": {
      post: {
        tags: ["Payments & Invoices"],
        summary: "Paystack IPN Webhook Receiver",
        description:
          "Receives raw event webhooks verified with Paystack cryptographic HMAC SHA512 signature header (\`x-paystack-signature\`).",
        responses: {
          "200": {
            description: "Webhook event acknowledged and processed",
          },
          "400": {
            description: "Invalid HMAC signature or malformed payload",
          },
        },
      },
    },

    // ─── DISCOUNTS & PROMOTIONS ────────────────────────────────────────────────
    "/api/v1/discounts/preview": {
      post: {
        tags: ["Discounts & Promotions"],
        summary: "Preview discount calculation before checkout",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/DiscountPreviewRequestDTO",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Calculated discount breakdown and final price",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    valid: { type: "boolean" },
                    originalPrice: { type: "number" },
                    discountAmount: { type: "number" },
                    finalPrice: { type: "number" },
                    discount: { $ref: "#/components/schemas/DiscountDTO" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/discounts": {
      get: {
        tags: ["Discounts & Promotions"],
        summary: "Admin: List all promotional and discount rules",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of discounts",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/DiscountDTO" },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Discounts & Promotions"],
        summary: "Admin: Create a new discount code or automatic promo rule",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateDiscountDTO" },
            },
          },
        },
        responses: {
          "201": {
            description: "Discount rule created successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DiscountDTO" },
              },
            },
          },
        },
      },
    },

    // ─── ACCESS & PASSES ───────────────────────────────────────────────────────
    "/api/v1/access/qr/{bookingId}": {
      get: {
        tags: ["Access & Passes"],
        summary: "Get signed QR access pass details",
        description:
          "Returns digital pass with HMAC signed QR token, space location, and high-speed Wi-Fi credentials.",
        parameters: [
          {
            name: "bookingId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "QR Pass data with Wi-Fi credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AccessPassDetails" },
              },
            },
          },
        },
      },
    },
    "/api/v1/access/verify-qr": {
      post: {
        tags: ["Access & Passes"],
        summary: "Terminal: Verify scanned QR code or booking reference",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["qrToken"],
                properties: {
                  qrToken: {
                    type: "string",
                    description:
                      "Scanned QR token string or booking reference code",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description:
              "Verification result with member details and check-in eligibility",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/VerifyAccessPassResponse",
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/access/checkin/{bookingId}": {
      post: {
        tags: ["Access & Passes"],
        summary: "Terminal: Process member check-in",
        parameters: [
          {
            name: "bookingId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "Check-in recorded, active visit session started, and welcome email queued",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckInResultDTO" },
              },
            },
          },
        },
      },
    },
    "/api/v1/access/checkout/{bookingId}": {
      post: {
        tags: ["Access & Passes"],
        summary: "Terminal: Process member check-out",
        parameters: [
          {
            name: "bookingId",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Check-out recorded and visit session closed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CheckOutResultDTO" },
              },
            },
          },
        },
      },
    },
    "/api/v1/access/occupancy": {
      get: {
        tags: ["Access & Passes"],
        summary: "Get live occupancy telemetry across desk pools & spaces",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description:
              "Real-time count of active checked-in members and capacity utilization",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LiveOccupancyDTO" },
              },
            },
          },
        },
      },
    },

    // ─── EMAIL TEMPLATES ───────────────────────────────────────────────────────
    "/api/v1/email-templates": {
      get: {
        tags: ["Email Templates"],
        summary: "Super Admin: List all transactional email templates",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of customizable email templates",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/EmailTemplateItem" },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/email-templates/{type}": {
      get: {
        tags: ["Email Templates"],
        summary: "Super Admin: Get single email template by type",
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Email template details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmailTemplateItem" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Email Templates"],
        summary: "Super Admin: Update transactional email template",
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  subject: { type: "string" },
                  htmlBody: { type: "string" },
                  textBody: { type: "string" },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Email template updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmailTemplateItem" },
              },
            },
          },
        },
      },
    },

    // ─── LEGAL POLICIES ────────────────────────────────────────────────────────
    "/api/v1/policies": {
      get: {
        tags: ["Legal Policies"],
        summary: "Public: Get all active terms, NDPR privacy policy, and rules",
        responses: {
          "200": {
            description: "List of workspace policies",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/PolicyDocument" },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/policies/{type}": {
      get: {
        tags: ["Legal Policies"],
        summary: "Public: Get specific policy document by type",
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: [
                "TERMS_OF_SERVICE",
                "PRIVACY_POLICY",
                "COMMUNITY_GUIDELINES",
                "REFUND_POLICY",
              ],
            },
          },
        ],
        responses: {
          "200": {
            description: "Policy document details",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PolicyDocument" },
              },
            },
          },
        },
      },
      put: {
        tags: ["Legal Policies"],
        summary: "Admin: Update policy document content",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "type",
            in: "path",
            required: true,
            schema: {
              type: "string",
              enum: [
                "TERMS_OF_SERVICE",
                "PRIVACY_POLICY",
                "COMMUNITY_GUIDELINES",
                "REFUND_POLICY",
              ],
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title", "content", "version"],
                properties: {
                  title: { type: "string" },
                  content: { type: "string" },
                  version: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Policy document updated successfully",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PolicyDocument" },
              },
            },
          },
        },
      },
    },

    // ─── SUPPORT & FAQS ────────────────────────────────────────────────────────
    "/api/v1/support": {
      get: {
        tags: ["Support & FAQs"],
        summary: "Public: Get workspace contact channels and FAQs",
        responses: {
          "200": {
            description:
              "Support contact details, opening hours, emergency numbers, and FAQs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    email: { type: "string", example: "support@daih.ng" },
                    phone: { type: "string", example: "+234 800 324 4482" },
                    address: {
                      type: "string",
                      example:
                        "Dare Adeboye Innovation Hub, Redemption City, Ogun State, Nigeria",
                    },
                    faqs: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          question: { type: "string" },
                          answer: { type: "string" },
                          category: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      put: {
        tags: ["Support & FAQs"],
        summary: "Admin: Update workspace support settings and FAQs",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string" },
                  phone: { type: "string" },
                  address: { type: "string" },
                  faqs: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Support settings saved successfully",
          },
        },
      },
    },

    // ─── IN-APP NOTIFICATIONS ─────────────────────────────────────────────────
    "/api/v1/notifications": {
      get: {
        tags: ["In-App Notifications"],
        summary: "Get current user notifications",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "number", default: 20 },
          },
          { name: "cursor", in: "query", schema: { type: "string" } },
          { name: "unreadOnly", in: "query", schema: { type: "boolean" } },
        ],
        responses: {
          "200": {
            description: "Paginated list of notifications and unread count",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    notifications: {
                      type: "array",
                      items: { $ref: "#/components/schemas/NotificationDTO" },
                    },
                    unreadCount: { type: "number" },
                    nextCursor: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/notifications/unread-count": {
      get: {
        tags: ["In-App Notifications"],
        summary: "Get total count of unread notifications",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Unread count response",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    unreadCount: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/notifications/read-all": {
      patch: {
        tags: ["In-App Notifications"],
        summary: "Mark all user notifications as read",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "All notifications marked as read",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: true },
                    updatedCount: { type: "number" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/notifications/{id}/read": {
      patch: {
        tags: ["In-App Notifications"],
        summary: "Mark specific notification as read",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Updated notification object",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationDTO" },
              },
            },
          },
        },
      },
    },
    "/api/v1/notifications/{id}/archive": {
      patch: {
        tags: ["In-App Notifications"],
        summary: "Archive specific notification",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Archived notification object",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/NotificationDTO" },
              },
            },
          },
        },
      },
    },

    // ─── REPORTS & ANALYTICS ───────────────────────────────────────────────────
    "/api/v1/reports/export": {
      get: {
        tags: ["Reports & Analytics"],
        summary:
          "Admin: Export CSV reports for Bookings, Customers, Payments, or Visits",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "type",
            in: "query",
            required: true,
            schema: {
              type: "string",
              enum: [
                "bookings",
                "customers",
                "payments",
                "visits",
                "occupancy",
              ],
            },
          },
          {
            name: "startDate",
            in: "query",
            schema: { type: "string", format: "date" },
          },
          {
            name: "endDate",
            in: "query",
            schema: { type: "string", format: "date" },
          },
        ],
        responses: {
          "200": {
            description: "CSV file attachment download",
            content: {
              "text/csv": {
                schema: { type: "string", format: "binary" },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description:
          "Standard JWT Bearer token obtained from `/api/v1/identity/login` or `/refresh`.",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "refreshToken",
        description: "HTTP-only session cookie set automatically during login.",
      },
    },
    responses: {
      UnauthorizedError: {
        description: "Authentication token missing, expired, or invalid",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ForbiddenError: {
        description: "User lacks required role or RBAC permissions",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      NotFoundError: {
        description: "Requested resource was not found",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      ValidationError: {
        description: "Invalid request payload schema or parameters",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ValidationErrorResponse" },
          },
        },
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          code: { type: "string", example: "UNAUTHORIZED" },
          message: {
            type: "string",
            example: "Access token is missing or invalid",
          },
        },
      },
      ValidationErrorResponse: {
        type: "object",
        properties: {
          code: { type: "string", example: "VALIDATION_ERROR" },
          message: { type: "string", example: "Invalid request payload" },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string", example: "email" },
                message: { type: "string", example: "Invalid email format" },
              },
            },
          },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          firstName: { type: "string" },
          lastName: { type: "string" },
          phoneNumber: { type: "string" },
          avatarUrl: { type: "string", nullable: true },
          clientId: { type: "string", example: "DAIH-0042" },
          role: {
            type: "string",
            enum: [
              "CUSTOMER",
              "RECEPTION_OFFICER",
              "SECURITY_OFFICER",
              "OPERATIONS_ADMIN",
              "FINANCE_OFFICER",
              "SUPER_ADMIN",
              "MANAGEMENT_VIEWER",
            ],
          },
          isVerified: { type: "boolean" },
          mfaEnabled: { type: "boolean" },
          mfaMethod: {
            type: "string",
            enum: ["TOTP", "EMAIL_OTP"],
            nullable: true,
          },
          birthday: { type: "string", example: "05-24", nullable: true },
          referralCode: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      RegisterDTO: {
        type: "object",
        required: ["email", "password", "firstName", "lastName"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password", minLength: 8 },
          firstName: { type: "string" },
          lastName: { type: "string" },
          phoneNumber: { type: "string" },
          referralCode: { type: "string" },
          consents: {
            type: "array",
            items: {
              type: "object",
              required: ["policyVersion", "purpose"],
              properties: {
                policyVersion: { type: "string", example: "1.0" },
                purpose: { type: "string", example: "TERMS_AND_PRIVACY" },
              },
            },
          },
        },
      },
      LoginDTO: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
        },
      },
      LoginSuccessResponse: {
        type: "object",
        properties: {
          accessToken: {
            type: "string",
            example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
          },
          user: { $ref: "#/components/schemas/UserProfile" },
          mfaRequired: { type: "boolean", example: false },
          mfaToken: { type: "string", nullable: true },
        },
      },
      AuthSuccessResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserProfile" },
          accessToken: { type: "string" },
          message: { type: "string" },
        },
      },
      UpdateProfileDTO: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          phoneNumber: { type: "string" },
          birthday: { type: "string", example: "05-24" },
        },
      },
      CustomerReferralsResponse: {
        type: "object",
        properties: {
          referralCode: { type: "string", example: "REF-98124" },
          shareUrl: {
            type: "string",
            example: "https://hub.daih.ng/register?ref=REF-98124",
          },
          totalReferred: { type: "number", example: 5 },
          activeBookingsFromReferred: { type: "number", example: 12 },
          rewardCreditsEarned: { type: "number", example: 15000 },
        },
      },
      FacilityResource: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: {
            type: "string",
            example: "Executive Dedicated Desk (Floor 2)",
          },
          slug: { type: "string", example: "executive-dedicated-desk-floor-2" },
          category: {
            type: "string",
            enum: [
              "HOT_DESK",
              "FLEX_DESK",
              "DEDICATED_DESK",
              "OFFICE_SUITE",
              "CONFERENCE_HALL",
              "TRAINING_ROOM",
              "ROOFTOP_LOUNGE",
              "STUDIO",
            ],
          },
          capacity: { type: "number", example: 1 },
          quantity: { type: "number", example: 20 },
          amenities: {
            type: "array",
            items: { type: "string" },
            example: [
              "High-speed Wi-Fi",
              "Ergonomic Chair",
              "Dual Power Sockets",
              "Locker Access",
            ],
          },
          imageUrl: { type: "string", nullable: true },
          isActive: { type: "boolean", example: true },
          pricingPlans: {
            type: "array",
            items: { $ref: "#/components/schemas/ResourcePricingPlan" },
          },
        },
      },
      ResourcePricingPlan: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          durationHours: { type: "number", example: 8 },
          durationDays: { type: "number", example: 1 },
          priceAmount: { type: "number", example: 7500 },
          currency: { type: "string", example: "NGN" },
          name: { type: "string", example: "Day Pass (8 Hours)" },
          isActive: { type: "boolean", example: true },
        },
      },
      CreateResourceDTO: {
        type: "object",
        required: ["name", "slug", "category", "capacity", "quantity"],
        properties: {
          name: { type: "string" },
          slug: { type: "string" },
          category: { type: "string" },
          capacity: { type: "number" },
          quantity: { type: "number" },
          description: { type: "string" },
          amenities: { type: "array", items: { type: "string" } },
        },
      },
      CreateHoldDTO: {
        type: "object",
        required: ["resourceId", "startTime", "endTime"],
        properties: {
          resourceId: { type: "string", format: "uuid" },
          pricingPlanId: { type: "string", format: "uuid" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          discountCode: { type: "string" },
        },
      },
      BookingHoldDTO: {
        type: "object",
        properties: {
          holdId: { type: "string", format: "uuid" },
          bookingId: { type: "string", format: "uuid" },
          reference: { type: "string", example: "DAIH-2026-X8912" },
          expiresAt: { type: "string", format: "date-time" },
          priceAmount: { type: "number", example: 12000 },
          currency: { type: "string", example: "NGN" },
          holdDurationMinutes: { type: "number", example: 10 },
        },
      },
      BookingSummary: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          reference: { type: "string", example: "DAIH-2026-X8912" },
          state: {
            type: "string",
            enum: [
              "DRAFT",
              "HELD",
              "PENDING_PAYMENT",
              "CONFIRMED",
              "ACTIVE",
              "CHECKED_IN",
              "CHECKED_OUT",
              "COMPLETED",
              "CANCELLED",
              "EXPIRED",
              "NO_SHOW",
            ],
          },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          totalAmount: { type: "number", example: 12000 },
          currency: { type: "string", example: "NGN" },
          resource: { $ref: "#/components/schemas/FacilityResource" },
        },
      },
      AvailabilityResultDTO: {
        type: "object",
        properties: {
          available: { type: "boolean", example: true },
          remainingCapacity: { type: "number", example: 14 },
          totalCapacity: { type: "number", example: 20 },
          priceEstimate: { type: "number", example: 7500 },
          currency: { type: "string", example: "NGN" },
        },
      },
      AdminDashboardSummaryDTO: {
        type: "object",
        properties: {
          totalCheckedInToday: { type: "number", example: 48 },
          activeOccupancyRate: { type: "number", example: 72.5 },
          totalRevenueToday: { type: "number", example: 345000 },
          upcomingBookingsCount: { type: "number", example: 19 },
          recentActivity: { type: "array", items: { type: "object" } },
        },
      },
      PaystackInitializeResponse: {
        type: "object",
        properties: {
          authorizationUrl: {
            type: "string",
            example: "https://checkout.paystack.com/39h38fn923",
          },
          accessCode: { type: "string", example: "39h38fn923" },
          reference: { type: "string", example: "PSTK-REF-91238" },
        },
      },
      PaymentTransaction: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          reference: { type: "string" },
          bookingReference: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string", example: "NGN" },
          status: {
            type: "string",
            enum: ["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"],
          },
          paidAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      DiscountDTO: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          code: { type: "string", example: "DAIHLAUNCH20" },
          name: { type: "string", example: "20% Launch Welcome" },
          type: {
            type: "string",
            enum: ["PERCENTAGE", "FIXED_AMOUNT", "FIXED_PRICE"],
          },
          value: { type: "number", example: 20 },
          isActive: { type: "boolean", example: true },
          maxUses: { type: "number", nullable: true },
          usedCount: { type: "number", example: 34 },
        },
      },
      CreateDiscountDTO: {
        type: "object",
        required: ["name", "type", "value"],
        properties: {
          code: { type: "string" },
          name: { type: "string" },
          type: {
            type: "string",
            enum: ["PERCENTAGE", "FIXED_AMOUNT", "FIXED_PRICE"],
          },
          value: { type: "number" },
          validFrom: { type: "string", format: "date-time" },
          validUntil: { type: "string", format: "date-time" },
        },
      },
      DiscountPreviewRequestDTO: {
        type: "object",
        required: ["resourceId", "startTime", "endTime"],
        properties: {
          resourceId: { type: "string" },
          pricingPlanId: { type: "string" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          discountCode: { type: "string" },
        },
      },
      AccessPassDetails: {
        type: "object",
        properties: {
          bookingId: { type: "string", format: "uuid" },
          reference: { type: "string", example: "DAIH-2026-X8912" },
          qrToken: { type: "string", example: "hmac-signed-token-pass-value" },
          resourceName: {
            type: "string",
            example: "Executive Desk 4 (Floor 2)",
          },
          customerName: { type: "string", example: "Amina Bello" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          state: { type: "string", example: "CONFIRMED" },
          wifiCredentials: {
            type: "object",
            properties: {
              ssid: { type: "string", example: "DAIH_Members_HighSpeed" },
              username: { type: "string", example: "DAIH-MBR-8912" },
              pin: { type: "string", example: "982314" },
            },
          },
        },
      },
      VerifyAccessPassResponse: {
        type: "object",
        properties: {
          valid: { type: "boolean", example: true },
          state: { type: "string", example: "CONFIRMED" },
          message: {
            type: "string",
            example: "Pass is valid and ready for check-in",
          },
          booking: { $ref: "#/components/schemas/BookingSummary" },
          customer: { $ref: "#/components/schemas/UserProfile" },
        },
      },
      CheckInResultDTO: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: {
            type: "string",
            example: "Welcome to DAIH Hub! Check-in confirmed.",
          },
          visitSessionId: { type: "string", format: "uuid" },
          checkInTime: { type: "string", format: "date-time" },
        },
      },
      CheckOutResultDTO: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: {
            type: "string",
            example: "Check-out processed successfully. See you soon!",
          },
          checkOutTime: { type: "string", format: "date-time" },
        },
      },
      LiveOccupancyDTO: {
        type: "object",
        properties: {
          currentOccupancy: { type: "number", example: 42 },
          totalCapacity: { type: "number", example: 100 },
          occupancyPercentage: { type: "number", example: 42.0 },
          categoryBreakdown: {
            type: "array",
            items: {
              type: "object",
              properties: {
                category: { type: "string" },
                checkedInCount: { type: "number" },
                totalCount: { type: "number" },
              },
            },
          },
        },
      },
      EmailTemplateItem: {
        type: "object",
        properties: {
          type: { type: "string", example: "staff_welcome" },
          subject: { type: "string", example: "Welcome to DAIH Hub Team" },
          htmlBody: { type: "string" },
          textBody: { type: "string" },
          description: { type: "string" },
          variables: { type: "array", items: { type: "string" } },
          isCustomized: { type: "boolean" },
          isActive: { type: "boolean" },
        },
      },
      NotificationDTO: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: { type: "string", example: "booking.confirmed" },
          title: { type: "string", example: "Booking Confirmed" },
          message: {
            type: "string",
            example:
              "Your reservation for Executive Dedicated Desk is confirmed.",
          },
          linkHref: {
            type: "string",
            nullable: true,
            example: "/bookings/DAIH-2026-X8912",
          },
          metadata: { type: "object", nullable: true },
          readAt: { type: "string", format: "date-time", nullable: true },
          archivedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      PolicyDocument: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          type: {
            type: "string",
            enum: [
              "TERMS_OF_SERVICE",
              "PRIVACY_POLICY",
              "COMMUNITY_GUIDELINES",
              "REFUND_POLICY",
            ],
          },
          title: { type: "string" },
          content: { type: "string" },
          version: { type: "string", example: "1.0.0" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
};
