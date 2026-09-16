const fs = require("fs");
const path = require("path");

const outputDir = __dirname;

function wrapDocHtml(title, subtitle, content) {
  return `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>${title}</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page {
    size: 8.5in 11.0in;
    margin: 1.0in 1.0in 1.0in 1.0in;
    mso-header-margin: 0.5in;
    mso-footer-margin: 0.5in;
    mso-paper-source: 0;
  }
  body {
    font-family: 'Segoe UI', Calibri, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #2D3748;
    background-color: #FFFFFF;
  }
  .header-card {
    background: linear-gradient(135deg, #1A365D 0%, #2B6CB0 100%);
    background-color: #1A365D;
    color: #FFFFFF;
    padding: 28px 32px;
    border-radius: 8px;
    margin-bottom: 28px;
  }
  .header-card h1 {
    color: #FFFFFF;
    font-size: 24pt;
    margin: 0 0 6px 0;
    font-weight: 700;
  }
  .header-card p.subtitle {
    color: #E2E8F0;
    font-size: 13pt;
    margin: 0 0 12px 0;
  }
  .meta-badge {
    display: inline-block;
    background-color: rgba(255, 255, 255, 0.2);
    color: #FFFFFF;
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 9pt;
    font-weight: 600;
    margin-right: 8px;
  }
  h2 {
    color: #1A365D;
    font-size: 16pt;
    border-bottom: 2px solid #E2E8F0;
    padding-bottom: 6px;
    margin-top: 28px;
    margin-bottom: 12px;
  }
  h3 {
    color: #2B6CB0;
    font-size: 13pt;
    margin-top: 18px;
    margin-bottom: 8px;
  }
  h4 {
    color: #4A5568;
    font-size: 11pt;
    margin-top: 14px;
    margin-bottom: 6px;
  }
  p {
    margin-top: 0;
    margin-bottom: 10px;
  }
  ul, ol {
    margin-top: 0;
    margin-bottom: 12px;
    padding-left: 24px;
  }
  li {
    margin-bottom: 6px;
  }
  .callout-tip {
    background-color: #EBF8FF;
    border-left: 4px solid #3182CE;
    padding: 12px 16px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
  }
  .callout-tip strong {
    color: #2B6CB0;
  }
  .callout-warning {
    background-color: #FFFAF0;
    border-left: 4px solid #DD6B20;
    padding: 12px 16px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
  }
  .callout-warning strong {
    color: #C05621;
  }
  .callout-success {
    background-color: #F0FFF4;
    border-left: 4px solid #38A169;
    padding: 12px 16px;
    margin: 14px 0;
    border-radius: 0 6px 6px 0;
  }
  .callout-success strong {
    color: #276749;
  }
  table.doc-table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 10pt;
  }
  table.doc-table th {
    background-color: #2B6CB0;
    color: #FFFFFF;
    text-align: left;
    padding: 8px 12px;
    border: 1px solid #CBD5E0;
    font-weight: 600;
  }
  table.doc-table td {
    padding: 8px 12px;
    border: 1px solid #CBD5E0;
    vertical-align: top;
  }
  table.doc-table tr:nth-child(even) {
    background-color: #F7FAFC;
  }
  .step-box {
    background-color: #F8FAFC;
    border: 1px solid #E2E8F0;
    border-radius: 6px;
    padding: 14px 18px;
    margin-bottom: 14px;
  }
  .step-number {
    display: inline-block;
    background-color: #2B6CB0;
    color: #FFFFFF;
    font-weight: bold;
    width: 24px;
    height: 24px;
    line-height: 24px;
    text-align: center;
    border-radius: 50%;
    margin-right: 8px;
    font-size: 10pt;
  }
  code {
    font-family: 'Consolas', 'Courier New', monospace;
    background-color: #EDF2F7;
    color: #C53030;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 9.5pt;
  }
  .footer-note {
    margin-top: 36px;
    border-top: 1px solid #E2E8F0;
    padding-top: 12px;
    font-size: 9pt;
    color: #718096;
    text-align: center;
  }
</style>
</head>
<body>

<div class="header-card">
  <h1>${title}</h1>
  <p class="subtitle">${subtitle}</p>
  <div>
    <span class="meta-badge">DAIH Workspace Platform</span>
    <span class="meta-badge">Official User Manual</span>
    <span class="meta-badge">Version 1.0 (2026)</span>
  </div>
</div>

${content}

<div class="footer-note">
  <p><strong>DAIH Workspace Platform</strong> &bull; Confidential &amp; Proprietary &bull; Powered by Deepmind Hub Technology</p>
</div>

</body>
</html>`;
}

// 1. Customer PWA Guide
const customerPwaDoc = wrapDocHtml(
  "DAIH Customer Portal & PWA",
  "Comprehensive End-User Guide & Mobile Experience Manual",
  `
  <h2>1. Overview & System Access</h2>
  <p>The <strong>DAIH Customer Progressive Web App (PWA)</strong> is the self-service hub for members, coworkers, and visitors at DAIH Workspace. It enables you to discover available workspaces, book desks and conference rooms, pay securely via Paystack, manage your digital QR passes, receive real-time notifications, and access invoices.</p>
  
  <h3>1.1 Accessing the PWA</h3>
  <ul>
    <li><strong>Web URL:</strong> Access via any modern browser (Chrome, Safari, Edge, Firefox) at <code>https://app.daihworkspace.com</code> (or <code>http://localhost:3002</code> in development).</li>
    <li><strong>Installing as a Mobile App (iOS):</strong> Open the link in Safari &rarr; Tap the <strong>Share</strong> button &rarr; Select <strong>"Add to Home Screen"</strong>.</li>
    <li><strong>Installing as a Mobile App (Android):</strong> Open in Chrome &rarr; Tap the three-dot menu &rarr; Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
    <li><strong>Desktop PWA:</strong> Click the install icon in the browser address bar on Chrome or Edge to run DAIH as a standalone desktop application.</li>
  </ul>

  <div class="callout-tip">
    <strong>Tip:</strong> Installing the PWA gives you instantaneous offline access to your active bookings, QR check-in passes, and native push notifications.
  </div>

  <h2>2. Account Registration & Security</h2>
  
  <div class="step-box">
    <span class="step-number">1</span><strong>Creating Your Account</strong>
    <p>Click <strong>"Sign Up"</strong> on the welcome screen. Enter your First Name, Last Name, Phone Number, Email Address, and a secure password. If you were invited by a colleague, enter their <strong>Referral Code</strong> to receive welcome credits.</p>
  </div>

  <div class="step-box">
    <span class="step-number">2</span><strong>Email Verification & Client ID</strong>
    <p>A 6-digit confirmation code will be sent to your email. Enter the code to activate your account. Once verified, you will be assigned a unique permanent <strong>Client ID</strong> (e.g., <code>DAIH-2026-0042</code>) displayed on your profile and digital pass.</p>
  </div>

  <div class="step-box">
    <span class="step-number">3</span><strong>Two-Factor Authentication (2FA / MFA)</strong>
    <p>To protect your account, navigate to <strong>Profile &rarr; Security Settings</strong>. You can enable <strong>Authenticator App (TOTP)</strong> (Google Authenticator, Microsoft Authenticator) or <strong>Email OTP</strong> for login verification.</p>
  </div>

  <h2>3. Workspaces & Facility Booking</h2>
  <p>DAIH offers high-performance workspaces tailored to every working style:</p>
  
  <table class="doc-table">
    <thead>
      <tr>
        <th>Space Category</th>
        <th>Ideal For</th>
        <th>Pricing Options</th>
        <th>Included Amenities</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Hot Desk</strong></td>
        <td>Freelancers & Remote Workers</td>
        <td>Hourly, Daily, Night Plan</td>
        <td>High-Speed WiFi, Power Outlets, Coffee Bar access</td>
      </tr>
      <tr>
        <td><strong>Dedicated Desk</strong></td>
        <td>Full-time Professionals & Founders</td>
        <td>Weekly, Monthly</td>
        <td>Reserved ergonomic desk, lockable drawer, monitor mount</td>
      </tr>
      <tr>
        <td><strong>Office Suite</strong></td>
        <td>Growing Teams & Startups (2&ndash;10 people)</td>
        <td>Monthly, Quarterly</td>
        <td>Private enclosed office, whiteboard, acoustic privacy</td>
      </tr>
      <tr>
        <td><strong>Conference Hall</strong></td>
        <td>Client Presentations & Board Meetings</td>
        <td>Hourly, Half-day, Full-day</td>
        <td>4K Presentation Display, Video Conferencing, Whiteboard</td>
      </tr>
      <tr>
        <td><strong>Training Room</strong></td>
        <td>Workshops, Bootcamps & Seminars</td>
        <td>Half-day, Full-day</td>
        <td>Modular seating up to 30 people, PA System, Projector</td>
      </tr>
      <tr>
        <td><strong>Studio & Lounge</strong></td>
        <td>Podcasting, Content Creation & Events</td>
        <td>Hourly, Custom event</td>
        <td>Acoustic treatment, softbox lighting, lounge seating</td>
      </tr>
    </tbody>
  </table>

  <h3>3.1 Step-by-Step Booking Process</h3>
  <ol>
    <li>Navigate to the <strong>"Explore Spaces"</strong> tab.</li>
    <li>Select your preferred facility resource (e.g., <em>Executive Hot Desk A</em>).</li>
    <li>Choose your booking plan: <strong>Hourly</strong>, <strong>Daily Pass</strong>, or <strong>Night Plan</strong>.</li>
    <li>Pick your date and start/end time. The app will immediately verify availability and prevent overlaps.</li>
    <li>Review the booking summary and proceed to checkout.</li>
  </ol>

  <h2>4. Discounts, Coupons & Payments</h2>
  <h3>4.1 Applying Promo Codes</h3>
  <p>On the checkout screen, enter your coupon code in the <strong>"Discount Code"</strong> field and tap <strong>"Apply"</strong>. The breakdown will show your original price, discount deduction, and the final total.</p>

  <h3>4.2 Completing Payment</h3>
  <ul>
    <li>Payments are processed securely via <strong>Paystack</strong>.</li>
    <li>Supported methods: <strong>Debit/Credit Cards (Mastercard, Visa, Verve)</strong>, <strong>Bank Transfer</strong>, and <strong>USSD</strong>.</li>
    <li>Once payment is confirmed, your booking state immediately updates to <code>CONFIRMED</code>, and your digital access pass is generated.</li>
  </ul>

  <h2>5. Onsite Arrival & Digital QR Pass</h2>
  <div class="callout-success">
    <strong>Contactless Check-In:</strong> You do not need physical plastic cards or paper tickets. Your digital QR code is your key into DAIH facilities.
  </div>
  <ol>
    <li>When you arrive at the DAIH front gate or reception, open the app and tap <strong>"My Pass"</strong> or select your active booking card.</li>
    <li>Present the animated <strong>QR Pass</strong> to the reception desk scanner or security tablet.</li>
    <li>The scanner will authenticate your booking within 1 second, mark you as <code>CHECKED_IN</code>, and the turnstile/gate will admit you.</li>
    <li>When leaving for the day, scan again at the exit scanner to record your checkout time.</li>
  </ol>

  <h2>6. In-App Notifications & Alerts</h2>
  <p>The bell icon at the top right contains your real-time notification feed:</p>
  <ul>
    <li><strong>Booking Confirmations:</strong> Instant receipts and calendar event links.</li>
    <li><strong>Check-in Reminders:</strong> Alerts 15 minutes before your scheduled session begins.</li>
    <li><strong>Session Expiry Warnings:</strong> Notifications when your desk session is nearing conclusion with a 1-tap option to extend.</li>
    <li><strong>Exclusive Promotions:</strong> Targeted discount codes and community event announcements.</li>
  </ul>

  <h2>7. Invoices, Receipts & Profile Management</h2>
  <ul>
    <li><strong>Invoices Tab:</strong> Download official VAT-compliant PDF invoices for expense claims and corporate accounting.</li>
    <li><strong>Referrals:</strong> Share your personal referral code with colleagues. Earn credits whenever friends make their first booking.</li>
    <li><strong>Support & FAQs:</strong> Need assistance? Tap <strong>"Support"</strong> to browse interactive FAQs or launch a direct WhatsApp chat with our community manager.</li>
  </ul>
`,
);

// 2. Reception App Guide
const receptionDoc = wrapDocHtml(
  "DAIH Reception & Security Desk App",
  "Front Desk Operations, QR Access Verification & Gate Control Manual",
  `
  <h2>1. Overview & Terminal Setup</h2>
  <p>The <strong>DAIH Reception &amp; Security Desk App</strong> is designed for front-desk officers, community managers, and security personnel at physical DAIH facilities. It provides high-speed member check-in, real-time ticket validation, visitor logs, desk allocations, and emergency roll-call monitoring.</p>
  
  <h3>1.1 Recommended Hardware Configuration</h3>
  <ul>
    <li><strong>Device:</strong> Dedicated 10"&ndash;13" iPad / Android Tablet with stand, or Front Desk Desktop PC with Windows 11 / macOS.</li>
    <li><strong>Input Devices:</strong> Built-in HD Camera or 2D USB/Bluetooth Barcode Scanner (Honeywell / Zebra).</li>
    <li><strong>Access URL:</strong> <code>https://reception.daihworkspace.com</code> (or <code>http://localhost:3003</code> in local environments).</li>
  </ul>

  <h2>2. Daily Shift Log-in & Authentication</h2>
  <ol>
    <li>Enter your staff credentials (Email and Password).</li>
    <li>Complete the 2FA verification prompt if prompted.</li>
    <li>Confirm your designated terminal station ID (e.g., <code>REC-GATE-01</code> or <code>REC-FRONT-DESK</code>).</li>
    <li>Ensure the terminal status indicator in the top header shows <strong style="color:#276749;">ONLINE &bull; SYNCED</strong>.</li>
  </ol>

  <h2>3. Member & Visitor Check-In Operations</h2>
  
  <h3>3.1 Primary Workflow: QR Code Scanner</h3>
  <div class="step-box">
    <span class="step-number">1</span><strong>Activate the Scanner</strong>
    <p>Ensure the camera feed on the left panel is active. When a member approaches, ask them to hold up the QR Pass on their DAIH Customer App.</p>
  </div>

  <div class="step-box">
    <span class="step-number">2</span><strong>Instant Validation</strong>
    <p>The system automatically decodes the cryptographic QR token and displays one of the following states:</p>
    <ul>
      <li><strong style="color:#276749;">VALID (Green):</strong> Active confirmed booking for today. Displays Member Name, Photo, Desk/Room Allocated, and Booking Time.</li>
      <li><strong style="color:#DD6B20;">ALREADY CHECKED IN (Yellow):</strong> Member is already on-site. Allows recording re-entry or checkout.</li>
      <li><strong style="color:#C53030;">EXPIRED / WRONG DATE (Red):</strong> Booking is for a past or future date.</li>
      <li><strong style="color:#C53030;">PAYMENT PENDING / CANCELLED (Red):</strong> Booking has not been paid or was cancelled.</li>
    </ul>
  </div>

  <div class="step-box">
    <span class="step-number">3</span><strong>Confirm Admission</strong>
    <p>Click <strong>"Admit / Check-In"</strong> (or enable <em>Auto-Admit</em> in settings). The visit session is logged in the database, and the member receives a welcome notification.</p>
  </div>

  <h3>3.2 Secondary Workflow: Manual Lookup</h3>
  <p>If a guest’s phone battery is flat or they do not have their QR code:</p>
  <ol>
    <li>Click the <strong>"Manual Search"</strong> bar at the top of the dashboard.</li>
    <li>Type the member's <strong>Client ID</strong> (e.g. <code>DAIH-2026-0015</code>), <strong>Email Address</strong>, or <strong>Booking Reference</strong> (e.g. <code>BK-982310</code>).</li>
    <li>Verify their identity with a valid government ID.</li>
    <li>Click <strong>"Manual Check-In"</strong> and add an optional note (e.g. <em>"Phone flat &ndash; ID verified"</em>).</li>
  </ol>

  <h2>4. Check-Out & Exit Management</h2>
  <ul>
    <li>When a member departs, scan their QR pass at the exit terminal or search their name on the <strong>Active Visits</strong> list and click <strong>"Check Out"</strong>.</li>
    <li>The system logs the exact departure timestamp and frees the desk capacity for subsequent bookings.</li>
  </ul>

  <h2>5. On-Site Live Roster & Emergency Roll Call</h2>
  <div class="callout-warning">
    <strong>Health & Safety Compliance:</strong> The Live Roster maintains a real-time head count of every individual currently inside the physical premises.
  </div>
  <ul>
    <li><strong>Live Occupancy Widget:</strong> Displays current on-site headcount versus maximum facility capacity.</li>
    <li><strong>Emergency Export Button:</strong> In the event of a fire drill or building evacuation, tap <strong>"Export Evacuation Roll Call"</strong> to instantly generate a printable PDF checklist of all on-site members and staff.</li>
  </ul>

  <h2>6. Front Desk Best Practices & Troubleshooting</h2>
  <table class="doc-table">
    <thead>
      <tr>
        <th>Scenario</th>
        <th>Recommended Action</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Camera feed is black / not responding</strong></td>
        <td>Check browser permissions for camera access &rarr; Click the camera toggle button to switch between front/back lenses.</td>
      </tr>
      <tr>
        <td><strong>Walk-In Guest without a booking</strong></td>
        <td>Direct the guest to scan the QR code on the front desk counter with their smartphone to book instantly, or assist them at the desk.</td>
      </tr>
      <tr>
        <td><strong>Member overstayed booking duration</strong></td>
        <td>The system will highlight their badge in amber. Inform the member politely and assist them in extending their session via the customer app.</td>
      </tr>
    </tbody>
  </table>
`,
);

// 3. Admin Portal Guide
const adminPortalDoc = wrapDocHtml(
  "DAIH Admin & Management Portal",
  "Super Admin, Operations & Financial Management Comprehensive Guide",
  `
  <h2>1. Overview & Role Permissions</h2>
  <p>The <strong>DAIH Admin &amp; Management Portal</strong> provides operations executives, community directors, financial controllers, and system administrators with end-to-end management capabilities across all DAIH hubs, assets, pricing, users, and transactions.</p>
  
  <table class="doc-table">
    <thead>
      <tr>
        <th>Staff Role</th>
        <th>Dashboard & Analytics</th>
        <th>Bookings & Overrides</th>
        <th>User Management</th>
        <th>Pricing & Discounts</th>
        <th>Finance & Invoices</th>
        <th>System Settings</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>SUPER_ADMIN</strong></td>
        <td>Full Access</td>
        <td>Full Access</td>
        <td>Full Access</td>
        <td>Full Access</td>
        <td>Full Access</td>
        <td>Full Access</td>
      </tr>
      <tr>
        <td><strong>OPERATIONS_ADMIN</strong></td>
        <td>Full Access</td>
        <td>Full Access</td>
        <td>Full Access</td>
        <td>Manage Discounts</td>
        <td>View Only</td>
        <td>Restricted</td>
      </tr>
      <tr>
        <td><strong>FINANCE_OFFICER</strong></td>
        <td>Financial KPIs</td>
        <td>View Only</td>
        <td>View Only</td>
        <td>View Discounts</td>
        <td>Full Access & Refunds</td>
        <td>No Access</td>
      </tr>
      <tr>
        <td><strong>MANAGEMENT_VIEWER</strong></td>
        <td>Read-Only Reports</td>
        <td>Read-Only</td>
        <td>Read-Only</td>
        <td>Read-Only</td>
        <td>Read-Only</td>
        <td>No Access</td>
      </tr>
    </tbody>
  </table>

  <h2>2. Executive Analytics & Dashboard KPIs</h2>
  <p>The main overview screen aggregates real-time platform metrics:</p>
  <ul>
    <li><strong>Revenue Metrics:</strong> Gross Revenue (Today, This Week, Month-to-Date, Year-to-Date), Average Booking Value (ABV), and Refund totals.</li>
    <li><strong>Occupancy Rate:</strong> Real-time desk utilization percentage by space category.</li>
    <li><strong>Active Bookings Stream:</strong> Real-time feed of newly confirmed, upcoming, and in-progress sessions.</li>
    <li><strong>Peak Hour Heatmaps:</strong> Visual breakdown of peak traffic hours to optimize staff scheduling and power/HVAC management.</li>
  </ul>

  <h2>3. Facility & Resource Configuration</h2>
  <p>Located under <strong>Facilities &amp; Resources</strong> in the left navigation sidebar:</p>
  <ol>
    <li><strong>Creating / Editing Spaces:</strong> Set resource name, category (<em>HOT_DESK, OFFICE_SUITE, CONFERENCE_HALL</em>), capacity, location description, and high-resolution cover images.</li>
    <li><strong>Pricing Matrix:</strong> Configure hourly rates, full-day packages, multi-month corporate retainers, and specialized <em>Night Plan</em> pricing.</li>
    <li><strong>Operating Hours &amp; Schedules:</strong> Set open/close schedules per day of week (e.g. Mon&ndash;Fri 08:00&ndash;21:00, Sat 09:00&ndash;18:00) or toggle 24/7 access.</li>
    <li><strong>Blackout Dates &amp; Maintenance:</strong> Schedule planned maintenance, private corporate buyouts, or public holidays to automatically block out the booking calendar.</li>
  </ol>

  <h2>4. Discount & Coupon Campaign Engine</h2>
  <div class="callout-tip">
    <strong>Growth Marketing:</strong> Create highly targeted promotional campaigns with automated rules and abuse-prevention limits.
  </div>
  <ul>
    <li><strong>Discount Types:</strong> <code>PERCENTAGE</code> (e.g. 20% off), <code>FIXED_AMOUNT</code> (e.g. &#8358;5,000 off), or <code>FIXED_PRICE</code> (e.g. Promo Desk at &#8358;2,500).</li>
    <li><strong>Trigger Mechanisms:</strong>
      <ul>
        <li><strong>Customer Coupon:</strong> Requires customer to enter a specific promo code (e.g. <code>DAIHLAUNCH2026</code>).</li>
        <li><strong>Automatic Discount:</strong> Automatically applied at checkout when conditions are met (e.g. Flash Sale).</li>
        <li><strong>Staff Override:</strong> Special discount code usable only by reception/operations admins for walk-in VIPs.</li>
      </ul>
    </li>
    <li><strong>Eligibility Rules:</strong> Restrict to <em>All Customers</em>, <em>First-Time Users Only</em>, <em>Specific Whitelisted User IDs</em>, or corporate email domain matches (e.g. <code>@google.com</code>, <code>@andela.com</code>).</li>
    <li><strong>Usage Limits:</strong> Enforce total campaign redemptions (e.g. first 100 users) and per-user limits (e.g. 1 redemption per account).</li>
  </ul>

  <h2>5. Booking Management & Overrides</h2>
  <ul>
    <li><strong>Booking Directory:</strong> Search and filter bookings by Reference, Customer Name, Client ID, Status, and Date Range.</li>
    <li><strong>Staff Overrides:</strong> Force check-in / check-out, extend active bookings, or reassign desks in case of customer requests.</li>
    <li><strong>Cancellations &amp; Refunds:</strong> Process booking cancellations with automatic or manual refund processing through Paystack gateway.</li>
  </ul>

  <h2>6. Financial Ledgers, Invoices & Reconciliation</h2>
  <ul>
    <li><strong>Transaction Log:</strong> Live stream of Paystack webhooks, card charges, bank transfers, and reference IDs.</li>
    <li><strong>Automated Invoices:</strong> System automatically generates sequential tax invoices (e.g. <code>INV-2026-0089</code>) with detailed line items and customer details.</li>
    <li><strong>Exporting for Accounting:</strong> Export financial reports to CSV / Excel for monthly audit and tax filing.</li>
  </ul>

  <h2>7. Legal Policies, Support Settings & System Audit Logs</h2>
  <ul>
    <li><strong>Legal Policies CMS:</strong> Publish versioned Terms of Service, Privacy Policies, and Hub House Rules. Tracks user consent timestamps for compliance.</li>
    <li><strong>Support Settings CMS:</strong> Manage public contact email, emergency phone hotlines, WhatsApp numbers, physical address, and interactive FAQ Q&As.</li>
    <li><strong>System Audit Logs:</strong> Immutable log recording every administrative action, IP address, user ID, timestamp, and metadata diff for security accountability.</li>
  </ul>
`,
);

// 4. Public Web Guide
const publicWebDoc = wrapDocHtml(
  "DAIH Public Web Portal",
  "Marketing Showcase, Virtual Tour & Public Engagement Guide",
  `
  <h2>1. Overview & Purpose</h2>
  <p>The <strong>DAIH Public Web Portal</strong> is the primary digital storefront for the DAIH Workspace brand. It introduces prospective members, corporate clients, event organizers, and founders to the hub's physical amenities, culture, pricing tiers, community events, and membership packages.</p>
  
  <h2>2. Portal Architecture & Navigation</h2>
  <table class="doc-table">
    <thead>
      <tr>
        <th>Section</th>
        <th>Target Audience</th>
        <th>Key Features</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Hero &amp; Value Proposition</strong></td>
        <td>First-Time Visitors</td>
        <td>High-impact photography, brand mission, and primary "Book a Desk" / "Schedule a Tour" CTAs.</td>
      </tr>
      <tr>
        <td><strong>Workspace Catalog</strong></td>
        <td>Freelancers, Teams &amp; Enterprises</td>
        <td>Filterable showcase of Hot Desks, Dedicated Suites, Conference Rooms, and Media Studios with amenity tags.</td>
      </tr>
      <tr>
        <td><strong>Pricing Calculator</strong></td>
        <td>Decision Makers &amp; Budget Planners</td>
        <td>Transparent hourly, daily, and monthly rate estimator with instant cost calculation.</td>
      </tr>
      <tr>
        <td><strong>Virtual Tour &amp; Gallery</strong></td>
        <td>Remote Clients &amp; Event Planners</td>
        <td>360&deg; high-resolution imagery of workspaces, lounge, cafeteria, podcast studio, and executive meeting rooms.</td>
      </tr>
      <tr>
        <td><strong>Community &amp; Events</strong></td>
        <td>Innovators &amp; Tech Community</td>
        <td>Upcoming workshops, pitch nights, networking mixers, and founder fireside chats.</td>
      </tr>
      <tr>
        <td><strong>Support, FAQs &amp; Location</strong></td>
        <td>All Visitors</td>
        <td>Interactive Google Maps integration, operating hours, parking directions, and direct contact form.</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Seamless Conversion Funnel</h2>
  <p>Every call-to-action button on the public website links intelligently to the <strong>DAIH Customer PWA</strong>:</p>
  <ul>
    <li>Clicking <strong>"Book Desk Now"</strong> opens the PWA directly on the selected desk category with the booking modal pre-populated.</li>
    <li>Clicking <strong>"Sign In / Member Portal"</strong> directs existing members to the authentication screen with return URL preservation.</li>
    <li>Corporate event inquiries submitted through the contact form automatically notify the community management team via email and outbox notifications.</li>
  </ul>

  <h2>4. SEO, Performance & Responsive Design</h2>
  <ul>
    <li><strong>Optimized for Mobile:</strong> Built with responsive layouts ensuring crisp rendering on all smartphone, tablet, and desktop viewports.</li>
    <li><strong>Performance:</strong> Sub-second load times, WebP image compression, and semantic HTML5 for optimal search engine indexation.</li>
    <li><strong>Accessibility:</strong> High-contrast typography and WCAG 2.1 AA compliant color schemes.</li>
  </ul>
`,
);

// 5. API & Developer Reference Guide
const apiDevDoc = wrapDocHtml(
  "DAIH API & Developer Reference",
  "RESTful Architecture, Swagger OpenAPI Documentation & Webhook Integration Guide",
  `
  <h2>1. API Architecture & Standards</h2>
  <p>The <strong>DAIH Backend API</strong> is built as an enterprise-grade Express Modular Monolith utilizing PostgreSQL (Prisma ORM), Redis caching, BullMQ background queues, and Argon2 password hashing. It exposes standard RESTful JSON endpoints protected by JWT bearer token rotation and role-based access control.</p>
  
  <h2>2. Accessing Interactive Swagger OpenAPI Documentation</h2>
  <p>The API provides an interactive Swagger UI documentation interface and raw OpenAPI 3.0.3 specifications:</p>
  
  <table class="doc-table">
    <thead>
      <tr>
        <th>Endpoint URL</th>
        <th>Format</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>http://localhost:3000/api-docs</code></td>
        <td>HTML / Interactive UI</td>
        <td>Full Swagger UI explorer with built-in "Try It Out" request runner and schema viewer.</td>
      </tr>
      <tr>
        <td><code>http://localhost:3000/api/v1/docs</code></td>
        <td>HTML / Interactive UI</td>
        <td>Alias mount for Swagger UI.</td>
      </tr>
      <tr>
        <td><code>http://localhost:3000/api-docs/json</code></td>
        <td>JSON (OpenAPI 3.0.3)</td>
        <td>Raw OpenAPI specification for Postman, Insomnia, or client SDK generation.</td>
      </tr>
      <tr>
        <td><code>http://localhost:3000/api/v1/openapi.json</code></td>
        <td>JSON (OpenAPI 3.0.3)</td>
        <td>Standard specification endpoint for CI/CD API linting and automated test suites.</td>
      </tr>
    </tbody>
  </table>

  <h2>3. Authentication & Security</h2>
  <h3>3.1 Bearer Token Authorization</h3>
  <p>All authenticated endpoints require an <code>Authorization</code> header formatted as:</p>
  <pre><code>Authorization: Bearer &lt;access_token&gt;</code></pre>
  
  <h3>3.2 Authentication Flow</h3>
  <ol>
    <li><code>POST /api/v1/auth/login</code> &rarr; Returns short-lived JWT access token (15 mins) and sets an HTTP-only refresh token cookie.</li>
    <li><code>POST /api/v1/auth/refresh-token</code> &rarr; Rotates refresh token and issues new access token. Employs token family tracking to detect reuse attacks.</li>
    <li><code>POST /api/v1/auth/mfa/verify</code> &rarr; Verifies 6-digit TOTP code or email OTP token.</li>
  </ol>

  <h2>4. Core API Module Summary</h2>
  <table class="doc-table">
    <thead>
      <tr>
        <th>Module</th>
        <th>Base Route</th>
        <th>Key Endpoints</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Auth &amp; Users</strong></td>
        <td><code>/api/v1/auth</code></td>
        <td><code>/register</code>, <code>/login</code>, <code>/mfa/setup</code>, <code>/me</code>, <code>/profile</code></td>
      </tr>
      <tr>
        <td><strong>Facility Resources</strong></td>
        <td><code>/api/v1/resources</code></td>
        <td><code>GET /</code> (catalog), <code>GET /:id</code>, <code>GET /:id/availability</code></td>
      </tr>
      <tr>
        <td><strong>Bookings</strong></td>
        <td><code>/api/v1/bookings</code></td>
        <td><code>POST /</code> (hold slot), <code>GET /my-bookings</code>, <code>POST /:id/cancel</code></td>
      </tr>
      <tr>
        <td><strong>Discounts</strong></td>
        <td><code>/api/v1/discounts</code></td>
        <td><code>POST /validate</code>, <code>GET /available</code>, <code>POST /apply</code></td>
      </tr>
      <tr>
        <td><strong>Payments &amp; Invoices</strong></td>
        <td><code>/api/v1/payments</code></td>
        <td><code>POST /initialize</code>, <code>POST /webhook</code> (Paystack), <code>GET /invoices</code></td>
      </tr>
      <tr>
        <td><strong>Visits &amp; Gate</strong></td>
        <td><code>/api/v1/visits</code></td>
        <td><code>POST /scan</code>, <code>POST /check-in</code>, <code>POST /check-out</code>, <code>GET /active</code></td>
      </tr>
      <tr>
        <td><strong>In-App Notifications</strong></td>
        <td><code>/api/v1/notifications</code></td>
        <td><code>GET /</code>, <code>GET /unread-count</code>, <code>PATCH /:id/read</code>, <code>PATCH /read-all</code></td>
      </tr>
      <tr>
        <td><strong>Legal &amp; Support</strong></td>
        <td><code>/api/v1/legal</code></td>
        <td><code>GET /policies/:type</code>, <code>POST /policies/consent</code>, <code>GET /support</code></td>
      </tr>
    </tbody>
  </table>

  <h2>5. Webhook Handlers (Paystack Integration)</h2>
  <p>Paystack sends real-time transaction updates to <code>POST /api/v1/payments/webhook</code>.</p>
  <ul>
    <li><strong>Signature Verification:</strong> Validates <code>x-paystack-signature</code> HMAC SHA512 hash against <code>PAYSTACK_SECRET_KEY</code>.</li>
    <li><strong>Idempotency:</strong> Every webhook event ID is recorded in <code>transactions.webhookEventId</code> to prevent double-crediting.</li>
    <li><strong>Outbox Events:</strong> Successful charges dispatch background events to generate invoices, send confirmation emails, and create in-app notifications.</li>
  </ul>
`,
);

const files = [
  { name: "1_Customer_PWA_User_Guide.doc", content: customerPwaDoc },
  { name: "2_Reception_Desk_User_Guide.doc", content: receptionDoc },
  { name: "3_Admin_Portal_User_Guide.doc", content: adminPortalDoc },
  { name: "4_Public_Website_User_Guide.doc", content: publicWebDoc },
  { name: "5_API_Developer_Reference_Guide.doc", content: apiDevDoc },
];

for (const file of files) {
  const filePath = path.join(outputDir, file.name);
  fs.writeFileSync(filePath, file.content, "utf8");
  console.log(`Generated: ${filePath}`);
}

console.log("All 5 user guides generated successfully!");
