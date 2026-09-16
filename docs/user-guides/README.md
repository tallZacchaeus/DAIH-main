# DAIH Workspace Platform &mdash; User Manuals &amp; Documentation

This directory contains standalone, fully formatted `.doc` user manuals for every application in the DAIH Workspace ecosystem. They can be opened directly with **Microsoft Word**, **Google Docs**, or **LibreOffice**.

---

### Available Documents (.doc)

1. [**1_Customer_PWA_User_Guide.doc**](file:///c:/Users/AJAO%20PETER%20OLUWAFEMI/Herd/E310/DAIH-main/docs/user-guides/1_Customer_PWA_User_Guide.doc)
   - **Application:** Customer Portal & Mobile PWA (`apps/customer-pwa`)
   - **Target Audience:** Workspace Members, Drop-in Customers, Corporate Tenants
   - **Key Topics:** Account registration, 2FA security, workspace discovery, booking time slots, applying promo codes, Paystack payments, digital QR pass check-in, in-app notifications, invoices & receipts, and referral rewards.

2. [**2_Reception_Desk_User_Guide.doc**](file:///c:/Users/AJAO%20PETER%20OLUWAFEMI/Herd/E310/DAIH-main/docs/user-guides/2_Reception_Desk_User_Guide.doc)
   - **Application:** Reception & Front Desk App (`apps/reception-app`)
   - **Target Audience:** Reception Officers, Security Gate Personnel, Community Managers
   - **Key Topics:** Workstation & scanner setup, QR camera validation, instant member check-in/out, manual Client ID / Booking lookup, live on-site occupancy roster, and emergency evacuation roll-call export.

3. [**3_Admin_Portal_User_Guide.doc**](file:///c:/Users/AJAO%20PETER%20OLUWAFEMI/Herd/E310/DAIH-main/docs/user-guides/3_Admin_Portal_User_Guide.doc)
   - **Application:** Admin & Management Portal (`apps/admin-portal`)
   - **Target Audience:** Operations Admins, Finance Officers, Super Admins, Management Viewers
   - **Key Topics:** Executive KPI analytics dashboard, facility & pricing matrix setup, blackout dates & maintenance, booking management & overrides, discount campaign engine, Paystack transaction ledgers, legal policy CMS, support settings, and audit logs.

4. [**4_Public_Website_User_Guide.doc**](file:///c:/Users/AJAO%20PETER%20OLUWAFEMI/Herd/E310/DAIH-main/docs/user-guides/4_Public_Website_User_Guide.doc)
   - **Application:** Public Marketing Web Portal (`apps/web`)
   - **Target Audience:** Prospective Members, Event Organizers, General Public, Marketing Team
   - **Key Topics:** Space catalog & amenity showcase, transparent pricing calculator, virtual photo gallery, community events, contact forms, and conversion funnel into the customer booking app.

5. [**5_API_Developer_Reference_Guide.doc**](file:///c:/Users/AJAO%20PETER%20OLUWAFEMI/Herd/E310/DAIH-main/docs/user-guides/5_API_Developer_Reference_Guide.doc)
   - **Application:** Backend API & Developer Portal (`apps/api`)
   - **Target Audience:** Software Engineers, System Integrators, Third-Party Developers
   - **Key Topics:** Express modular monolith architecture, interactive Swagger UI (`/api-docs`), OpenAPI 3.0.3 specification, JWT bearer authentication, Paystack webhook processing, and core REST API endpoints.

---

### How to Regenerate

To update or regenerate all `.doc` files, run:

```bash
node docs/user-guides/generate-guides.js
```
