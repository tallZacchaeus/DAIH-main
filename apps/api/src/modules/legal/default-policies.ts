import { PolicyType } from "./legal.types.js";

export interface DefaultPolicyDef {
  type: PolicyType;
  title: string;
  version: string;
  content: string;
}

export const DEFAULT_TERMS_OF_SERVICE: DefaultPolicyDef = {
  type: "TERMS_OF_SERVICE",
  title: "DAIH Terms of Service & Membership Agreement",
  version: "1.0",
  content: `# DAIH Terms of Service & Membership Agreement

**Effective Date:** January 1, 2026  
**Last Updated:** September 5, 2026  
**Governing Jurisdiction:** Federal Republic of Nigeria

---

### 1. Acceptance of Terms
Welcome to **DAIH (Dev & AI Innovation Hub)**. By registering an account, booking a workspace, purchasing a membership pass, connecting to our network, or physically accessing our premises, you ("Member", "User", "Visitor", or "Customer") agree to be legally bound by these Terms of Service ("Terms") and our Privacy Policy. If you do not agree to these Terms, you must not use our services or premises.

---

### 2. Workspace Access & Access Passes
1. **Personal Non-Transferable Access:** Access passes, digital QR codes, and RFID credentials issued by DAIH are strictly personal to the registered individual and must not be shared, loaned, or transferred.
2. **Operating Hours & Check-In:** Members must adhere to the operating hours associated with their purchased workspace or pass tier. Check-in via reception terminal or authorized scanner is mandatory upon entering the hub.
3. **Capacity & Fair Use:** Access to open coworking desks, booths, and communal lounges is subject to capacity limits. DAIH reserves the right to manage desk allocation during peak demand.

---

### 3. Member Code of Conduct
All members, guests, and visitors must contribute to a professional, respectful, and productive environment:
- **Respectful Interaction:** Harassment, discrimination, threatening speech, or inappropriate conduct toward members, staff, or guests will result in immediate termination of membership without refund.
- **Noise & Calls:** Phone and video calls must be conducted in designated call booths or meeting rooms. Communal workspaces are quiet-focused environments.
- **Property Care:** Members must treat all hub furniture, displays, high-speed networking equipment, and amenities with care. Any damage caused by negligence will be assessed and billed to the responsible party.
- **Cleanliness:** Members are responsible for clearing dishes, personal garbage, and whiteboards after use.

---

### 4. High-Speed Internet & Network Acceptable Use
DAIH provides enterprise-grade high-speed internet and power redundancy. By utilizing our network, you agree not to:
- Engage in unlawful digital activities, including hacking, unauthorized network penetration, denial-of-service, or transmitting malicious code.
- Torrent, stream unauthorized copyright-infringing content, or engage in high-bandwidth abusive operations that degrade service for other members.
- Host unauthorized commercial servers or public relays without prior written agreement with DAIH Operations.

---

### 5. Bookings, Payments, & Cancellations
1. **Pricing & Currency:** All fees are listed in Nigerian Naira (NGN) and inclusive of applicable statutory taxes unless stated otherwise.
2. **Advance Payment:** Bookings and membership renewals must be paid in full prior to confirmation and pass issuance.
3. **Cancellations & Rescheduling:**
   - Dedicated desks and meeting rooms cancelled at least 24 hours prior to commencement qualify for rescheduling or hub credit.
   - Cancellations made less than 24 hours before start time, or no-shows, are non-refundable.

---

### 6. Personal Belongings & Liability Disclaimer
1. **Personal Property:** DAIH is not responsible for any lost, stolen, or damaged personal belongings or equipment brought onto the hub premises. Lockers and secure storage (where available) are used at the member's own risk.
2. **Business Risk:** While DAIH maintains redundant power and high-speed multi-WAN failover, DAIH accepts no liability for indirect business disruptions, loss of profits, or data loss arising from utility disruptions, force majeure, or equipment maintenance.

---

### 7. Intellectual Property
Members retain 100% ownership and copyright over all products, software, creative works, and proprietary ideas developed on DAIH premises. DAIH claims no intellectual property rights over member projects.

---

### 8. Termination
DAIH reserves the right to suspend or revoke access, terminate memberships, and ban individuals who violate these Terms, breach security protocols, or compromise the safety and well-being of the hub community.

---

### 9. Amendments & Inquiries
DAIH may update these Terms periodically. Continued use of our facilities after modifications constitutes agreement to the updated Terms. For inquiries regarding these terms, please contact:
- **Operations Hub:** reception@daih.hub
- **Legal & Compliance:** legal@daih.hub
`,
};

export const DEFAULT_PRIVACY_POLICY: DefaultPolicyDef = {
  type: "PRIVACY_POLICY",
  title: "DAIH Privacy Policy & NDPR/NDPA Compliance Notice",
  version: "1.0",
  content: `# DAIH Privacy Policy & NDPR / NDPA 2023 Compliance Notice

**Effective Date:** January 1, 2026  
**Last Updated:** September 5, 2026  
**Regulatory Framework:** Nigeria Data Protection Act 2023 (NDPA) & Nigeria Data Protection Regulation (NDPR)

---

### 1. Introduction & Data Controller
**DAIH (Dev & AI Innovation Hub)** ("we", "us", or "our") is dedicated to safeguarding the privacy, confidentiality, and security of all personal data entrusted to us by our members, visitors, and website users.

This Privacy Policy explains how we collect, use, process, store, and protect your personal information in accordance with the **Nigeria Data Protection Act (NDPA 2023)** and regulations enforced by the **Nigeria Data Protection Commission (NDPC)**.

**Data Controller Contact:**
- **Entity:** DAIH Innovation Hub Limited
- **Email:** privacy@daih.hub / dpo@daih.hub
- **Physical Address:** DAIH Innovation Hub, Nigeria

---

### 2. Information We Collect
We collect personal information necessary to deliver workspace services, maintain facility safety, and comply with legal requirements:

1. **Identity & Contact Information:** Full name, email address, telephone number, job title, company name, date of birth (optional for birthday recognitions), and profile photograph (used for digital badge verification).
2. **Physical Access & Visit Telemetry:** Reception terminal check-in and check-out timestamps, access pass scan records, terminal IDs, and physical security logs.
3. **Financial & Transaction Data:** Payment transaction references, plan subscription records, invoice histories, and payment status. *Note: DAIH does not store raw credit/debit card numbers or CVVs; all payment processing is securely managed by licensed, PCI-DSS certified payment processors (e.g., Paystack).*
4. **Network & Technical Logs:** Device MAC address, allocated local IP address, connected Wi-Fi session duration, and device operating system metadata necessary for network security and quality of service.
5. **CCTV Surveillance:** Closed-Circuit Television (CCTV) cameras operate continuously in common entrance points and reception corridors for the physical safety of all members and asset security.

---

### 3. Lawful Basis for Processing
We process personal data only when lawful under NDPA 2023 Section 25:
- **Performance of a Contract:** To provision your workspace booking, deliver internet credentials, generate access passes, and manage your membership.
- **Legal Obligation:** To maintain financial records for corporate tax and statutory audit purposes.
- **Legitimate Interests:** To secure our physical hub premises, protect members against unauthorized intrusion, and prevent fraud.
- **Explicit Consent:** For promotional communications, events newsletters, and optional community directory inclusion (which you may withdraw at any time).

---

### 4. How We Use Your Information
- Authenticate and manage member accounts and multi-factor authentication (MFA).
- Issue dynamic QR codes and grant verified physical facility access.
- Provision high-speed Wi-Fi network credentials tied to active booking windows.
- Process membership invoices, payment receipts, and automated renewals.
- Notify members regarding essential operational alerts, hub schedules, and security advisories.
- Prevent physical and cyber security threats, vandalism, or unauthorized access.

---

### 5. Data Sharing & Third-Party Processors
We do **not** sell, rent, or monetize your personal data to third parties. We share information only with trusted processors under strict data processing agreements:
- **Payment Gateways:** Paystack (PCI-DSS compliant) for processing local and international card payments.
- **Communication Infrastructure:** Transactional email and SMS delivery providers (e.g., Resend, Termii).
- **Law Enforcement & Regulatory Authorities:** Only when strictly mandated by valid subpoena, court order, or applicable Nigerian statutory law.

---

### 6. Data Security & Storage
We employ rigorous physical, administrative, and technical safeguards to secure your data:
- **Encryption:** All data in transit is encrypted using TLS 1.3. Sensitive database credentials and authorization tokens are hashed using industry-standard algorithms (Argon2id / SHA-256).
- **Access Control:** Role-based access controls (RBAC) restrict personal data access strictly to authorized personnel with a verifiable operational need.
- **Session Protection:** In-memory token management and automated session revocation protect customer sessions against token theft.

---

### 7. Data Retention
- Active customer account data is retained for the duration of your membership relationship.
- Financial transaction records are retained for seven (7) years in compliance with Nigerian tax regulations.
- Access check-in/check-out logs are retained for ninety (90) days for facility security audits before automated archival.

---

### 8. Your Data Protection Rights
Under NDPA 2023, you have the following enforceable rights:
- **Right of Access:** You may request a copy of the personal data we hold about you.
- **Right to Rectification:** You can update incorrect or incomplete personal details directly in your customer profile or by contacting us.
- **Right to Erasure ("Right to be Forgotten"):** You may request deletion of your account and personal data, subject to statutory retention obligations.
- **Right to Restriction & Objection:** You may object to certain processing activities or request restrictions on how we use your data.
- **Right to Data Portability:** You may request an export of your personal information in a structured, machine-readable format.

---

### 9. Exercising Your Rights & Contacting the DPO
To exercise any of your data protection rights, or if you have any questions or complaints regarding this Privacy Policy, please reach out to:

- **Data Protection Officer (DPO):** dpo@daih.hub
- **General Privacy Desk:** privacy@daih.hub
- **Response Time:** We will acknowledge and respond to all legitimate data subject requests within thirty (30) days.
`,
};

export const DEFAULT_POLICIES: DefaultPolicyDef[] = [
  DEFAULT_TERMS_OF_SERVICE,
  DEFAULT_PRIVACY_POLICY,
];
