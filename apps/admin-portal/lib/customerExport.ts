/**
 * Customer Records Export Utility (CSV & PDF)
 * Produces official, formatted CSV and PDF reports containing customer records,
 * with explicit inclusion of Date of Birth, Client IDs, tiers, and verification status.
 */

import { CustomerRecord } from "@daih/types";

/**
 * Escapes CSV special characters and quotes
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Clean printable ASCII string for PDF output
 */
function cleanAscii(str: any, maxLen: number = 40): string {
  if (str === null || str === undefined) return "-";
  const sanitized = String(str)
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();
  if (sanitized.length > maxLen) {
    return sanitized.slice(0, maxLen - 1) + ".";
  }
  return sanitized;
}

/**
 * Escape parenthesis and backslashes for PDF syntax
 */
function escapePdf(text: string): string {
  return (text || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * Export Customer Records to CSV
 */
export function exportCustomersCsv(
  customers: CustomerRecord[],
  filenamePrefix = "DAIH_Customers_Directory",
): void {
  const headers = [
    "Client ID",
    "Full Name",
    "Email Address",
    "Phone Number",
    "Date of Birth",
    "Plan / Membership Tier",
    "Account Status",
    "Referral Code",
    "Referrals Count",
    "Active Referrals",
    "Total Bookings",
    "Total Spent (NGN)",
    "Joined Date",
    "Last Visit",
  ];

  const rows = customers.map((c) => [
    c.id,
    c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim(),
    c.email,
    c.phone || "Not provided",
    c.dateOfBirth || c.birthday || "Not provided",
    c.tier || "Dedicated Desk",
    c.status,
    c.referralCode || "N/A",
    c.referralCount ?? 0,
    c.activeReferralCount ?? 0,
    c.totalBookings ?? 0,
    c.totalSpent ?? 0,
    c.joinedDate ||
      (c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-NG") : ""),
    c.lastVisit || "No visits yet",
  ]);

  const csvContent = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${filenamePrefix}_${dateStr}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Export Customer Records to a styled PDF Document
 */
export function exportCustomersPdf(
  customers: CustomerRecord[],
  filenamePrefix = "DAIH_Customers_Directory",
): void {
  const activeCount = customers.filter((c) => c.status === "Active").length;
  const pendingCount = customers.filter((c) => c.status === "Pending").length;
  const dormantCount = customers.filter((c) => c.status === "Inactive").length;

  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const generatedAt = new Date().toUTCString();

  const streamLines: string[] = [];

  // 1. Header Banner Box (Brand Deep Purple #23055c)
  streamLines.push(
    "q",
    "0.137 0.020 0.361 rg", // Deep brand purple
    "36 740 523 66 re f",
    "Q",
    "BT",
    "/F1 13 Tf",
    "1 1 1 rg",
    "1 0 0 1 48 787 Tm",
    `(${escapePdf("DAIH WORKSPACE PLATFORM -- CUSTOMER DIRECTORY REPORT")}) Tj`,
    "/F2 8.5 Tf",
    "0.88 0.85 0.94 rg",
    "1 0 0 1 48 768 Tm",
    `(${escapePdf("Dominion Allianze Innovation Hub | Official Member Directory & Audit")}) Tj`,
    "1 0 0 1 360 768 Tm",
    `(${escapePdf(`Generated: ${dateStr}`)}) Tj`,
    "/F2 7.5 Tf",
    "0.75 0.70 0.85 rg",
    "1 0 0 1 48 752 Tm",
    `(${escapePdf("Classification: Confidential Operations Record")}) Tj`,
    "1 0 0 1 360 752 Tm",
    `(${escapePdf(`UTC: ${generatedAt}`)}) Tj`,
    "ET",
  );

  // 2. Metric KPI Summary Cards (4 Columns)
  const kpiY = 692;
  const cardW = 124;
  const cardH = 36;
  const gap = 9;

  const kpiData = [
    { label: "TOTAL MEMBERS", val: String(customers.length) },
    { label: "VERIFIED ACTIVE", val: String(activeCount) },
    { label: "UNVERIFIED PENDING", val: String(pendingCount) },
    { label: "DORMANT MEMBERS", val: String(dormantCount) },
  ];

  kpiData.forEach((kpi, idx) => {
    const cardX = 36 + idx * (cardW + gap);
    streamLines.push(
      "q",
      "0.96 0.95 0.98 rg",
      "0.88 0.85 0.94 RG",
      "0.75 w",
      `${cardX} ${kpiY} ${cardW} ${cardH} re B`,
      "Q",
      "BT",
      "/F2 7 Tf",
      "0.40 0.38 0.45 rg",
      `1 0 0 1 ${cardX + 8} ${kpiY + 23} Tm`,
      `(${escapePdf(kpi.label)}) Tj`,
      "/F1 11 Tf",
      "0.137 0.020 0.361 rg",
      `1 0 0 1 ${cardX + 8} ${kpiY + 9} Tm`,
      `(${escapePdf(kpi.val)}) Tj`,
      "ET",
    );
  });

  // 3. Table Header Bar (Dark Navy / Purple Header)
  const tableTopY = 672;
  streamLines.push(
    "q",
    "0.224 0.133 0.443 rg", // Secondary purple
    `36 ${tableTopY - 18} 523 18 re f`,
    "Q",
    "BT",
    "/F1 7.5 Tf",
    "1 1 1 rg",
    `1 0 0 1 42 ${tableTopY - 12} Tm`,
    "(CLIENT ID) Tj",
    `1 0 0 1 130 ${tableTopY - 12} Tm`,
    "(MEMBER NAME) Tj",
    `1 0 0 1 235 ${tableTopY - 12} Tm`,
    "(DATE OF BIRTH) Tj",
    `1 0 0 1 315 ${tableTopY - 12} Tm`,
    "(TIER / PLAN) Tj",
    `1 0 0 1 405 ${tableTopY - 12} Tm`,
    "(STATUS) Tj",
    `1 0 0 1 475 ${tableTopY - 12} Tm`,
    "(JOINED DATE) Tj",
    "ET",
  );

  // 4. Data Rows
  let currentY = tableTopY - 32;
  const rowH = 17;
  const maxRows = 30; // Fits comfortably on A4 page
  const displayRows = customers.slice(0, maxRows);

  displayRows.forEach((member, idx) => {
    // Alternating zebra striping
    if (idx % 2 === 1) {
      streamLines.push(
        "q",
        "0.98 0.98 0.99 rg",
        `36 ${currentY - 3} 523 ${rowH} re f`,
        "Q",
      );
    }

    // Row bottom separator line
    streamLines.push(
      "q",
      "0.92 0.92 0.94 RG",
      "0.5 w",
      `36 ${currentY - 3} m 559 ${currentY - 3} l S`,
      "Q",
    );

    // Text output
    streamLines.push(
      "BT",
      "/F1 7.5 Tf",
      "0.137 0.020 0.361 rg",
      `1 0 0 1 42 ${currentY + 2} Tm`,
      `(${escapePdf(cleanAscii(member.id, 14))}) Tj`,
      "/F2 7.5 Tf",
      "0.15 0.15 0.18 rg",
      `1 0 0 1 130 ${currentY + 2} Tm`,
      `(${escapePdf(cleanAscii(member.name, 18))}) Tj`,
      "/F1 7.5 Tf",
      "0.20 0.20 0.25 rg",
      `1 0 0 1 235 ${currentY + 2} Tm`,
      `(${escapePdf(cleanAscii(member.dateOfBirth || member.birthday || "Not provided", 12))}) Tj`,
      "/F2 7 Tf",
      "0.30 0.30 0.35 rg",
      `1 0 0 1 315 ${currentY + 2} Tm`,
      `(${escapePdf(cleanAscii(member.tier, 15))}) Tj`,
      "/F1 7 Tf",
      member.status === "Active"
        ? "0.07 0.45 0.20 rg"
        : member.status === "Pending"
          ? "0.69 0.38 0.00 rg"
          : "0.45 0.45 0.50 rg",
      `1 0 0 1 405 ${currentY + 2} Tm`,
      `(${escapePdf(cleanAscii(member.status, 10))}) Tj`,
      "/F2 7 Tf",
      "0.35 0.35 0.40 rg",
      `1 0 0 1 475 ${currentY + 2} Tm`,
      `(${escapePdf(cleanAscii(member.joinedDate, 12))}) Tj`,
      "ET",
    );

    currentY -= rowH;
  });

  // If there are more rows than fitted on the single page
  if (customers.length > maxRows) {
    streamLines.push(
      "BT",
      "/F2 7.5 Tf",
      "0.50 0.50 0.55 rg",
      `1 0 0 1 42 ${currentY - 4} Tm`,
      `(${escapePdf(`... and ${customers.length - maxRows} additional members listed in full CSV export.`)}) Tj`,
      "ET",
    );
    currentY -= 14;
  }

  // 5. Official Disclaimer & Security Note
  const noteY = Math.max(currentY - 26, 62);
  streamLines.push(
    "q",
    "0.97 0.96 0.98 rg",
    `36 ${noteY} 523 24 re f`,
    "Q",
    "BT",
    "/F2 7 Tf",
    "0.40 0.40 0.46 rg",
    `1 0 0 1 46 ${noteY + 13} Tm`,
    "(Confidential Document: Official member directory generated by DAIH Workspace Management System.) Tj",
    `1 0 0 1 46 ${noteY + 4} Tm`,
    "(Contains personal customer data protected under the Nigeria Data Protection Act 2023. Unauthorized distribution prohibited.) Tj",
    "ET",
  );

  // 6. Page Footer
  streamLines.push(
    "q",
    "0.85 0.85 0.88 RG",
    "0.5 w",
    "36 45 m 559 45 l S",
    "Q",
    "BT",
    "/F2 7.5 Tf",
    "0.50 0.50 0.55 rg",
    "1 0 0 1 36 34 Tm",
    "(DAIH Workspace Platform  |  Official Customer Records  |  All rights reserved) Tj",
    "/F1 7.5 Tf",
    "1 0 0 1 495 34 Tm",
    `(${escapePdf(`Total: ${customers.length} Members`)}) Tj`,
    "ET",
  );

  const streamContent = streamLines.join("\n");
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamContent);
  const streamLength = streamBytes.length;

  const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 =
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /ProcSet [/PDF /Text] >> >>\nendobj\n";
  const obj4Pre = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n`;
  const obj4Post = "\nendstream\nendobj\n";
  const obj5 =
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n";
  const obj6 =
    "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";

  const preObjects = [
    encoder.encode(header),
    encoder.encode(obj1),
    encoder.encode(obj2),
    encoder.encode(obj3),
    encoder.encode(obj4Pre),
    streamBytes,
    encoder.encode(obj4Post),
    encoder.encode(obj5),
    encoder.encode(obj6),
  ];

  const offsets: number[] = [];
  let currentOffset = encoder.encode(header).length;

  // Obj 1
  offsets.push(currentOffset);
  currentOffset += encoder.encode(obj1).length;

  // Obj 2
  offsets.push(currentOffset);
  currentOffset += encoder.encode(obj2).length;

  // Obj 3
  offsets.push(currentOffset);
  currentOffset += encoder.encode(obj3).length;

  // Obj 4
  offsets.push(currentOffset);
  currentOffset +=
    encoder.encode(obj4Pre).length +
    streamLength +
    encoder.encode(obj4Post).length;

  // Obj 5
  offsets.push(currentOffset);
  currentOffset += encoder.encode(obj5).length;

  // Obj 6
  offsets.push(currentOffset);
  currentOffset += encoder.encode(obj6).length;

  const xrefOffset = currentOffset;

  let xref = `xref\n0 7\n0000000000 65535 f \r\n`;
  for (const off of offsets) {
    xref += String(off).padStart(10, "0") + " 00000 n \r\n";
  }

  const trailer = `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const totalParts = [
    ...preObjects,
    encoder.encode(xref),
    encoder.encode(trailer),
  ];

  const blob = new Blob(totalParts as any, { type: "application/pdf" });
  const fileDateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${filenamePrefix}_${fileDateStr}.pdf`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}
