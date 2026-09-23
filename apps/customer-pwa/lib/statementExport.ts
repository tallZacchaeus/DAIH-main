import { BookingSummary, BookingState } from "@daih/types";

export interface StatementCustomerInfo {
  name: string;
  email?: string;
  phone?: string;
  clientId?: string;
}

export interface StatementExportOptions {
  bookings: BookingSummary[];
  periodLabel: string;
  customer: StatementCustomerInfo;
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

function formatIsoDate(isoStr?: string | null): string {
  if (!isoStr) return "N/A";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

/**
 * Checks whether a booking is eligible for statement export.
 * Excludes EXPIRED bookings and incomplete drafts/holds.
 */
export function isStatementEligible(b: { state?: string | null }): boolean {
  if (!b || !b.state) return false;
  const s = String(b.state).toUpperCase().trim();
  return (
    s !== "EXPIRED" && s !== "DRAFT" && s !== "HELD" && s !== "PENDING_PAYMENT"
  );
}

/**
 * Formats booking state for statement display.
 * Strictly maps to user requirements: "MISSED", "CANCELED", or "CONFIRMED".
 */
export function formatStatementStatus(
  state?: string | null,
): "CONFIRMED" | "CANCELED" | "MISSED" {
  if (!state) return "CONFIRMED";
  const s = String(state).toUpperCase().trim();
  if (s === "NO_SHOW" || s === "NO-SHOW" || s === "MISSED") {
    return "MISSED";
  }
  if (
    s === "CANCELLED" ||
    s === "CANCELED" ||
    s === "REFUNDED" ||
    s === "REFUND_PENDING"
  ) {
    return "CANCELED";
  }
  return "CONFIRMED";
}

/**
 * Downloads a structured CSV containing all booking and financial details.
 */
export function downloadBookingsCsv({
  bookings,
  periodLabel,
  customer,
}: StatementExportOptions): void {
  const eligibleBookings = bookings.filter(isStatementEligible);
  const periodSlug = periodLabel.replace(/[^a-zA-Z0-9-_]/g, "_");
  const nowStr = new Date().toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lines: string[] = [];

  // Metadata Header Block
  lines.push(
    escapeCsv("DAIH WORKSPACE PLATFORM - BOOKINGS & FINANCIAL STATEMENT"),
  );
  lines.push(
    `${escapeCsv("Customer:")},${escapeCsv(`${customer.name} (${customer.clientId || "N/A"})`)}`,
  );
  if (customer.email) {
    lines.push(`${escapeCsv("Email:")},${escapeCsv(customer.email)}`);
  }
  lines.push(`${escapeCsv("Statement Period:")},${escapeCsv(periodLabel)}`);
  lines.push(`${escapeCsv("Generated Date:")},${escapeCsv(nowStr)}`);
  lines.push(
    `${escapeCsv("Total Reservations:")},${escapeCsv(eligibleBookings.length)}`,
  );
  lines.push(""); // blank line

  // Column Headers
  const headers = [
    "Booking Reference",
    "Workspace Resource",
    "Category",
    "Start Date & Time",
    "End Date & Time",
    "Booking Status",
    "Gross Amount (NGN)",
    "Discount Amount (NGN)",
    "Discount Code",
    "Net Amount Paid (NGN)",
    "Date Created",
    "Check-In Time",
    "Check-Out Time",
  ];
  lines.push(headers.map(escapeCsv).join(","));

  let totalGross = 0;
  let totalDiscount = 0;
  let totalNet = 0;

  // Booking Rows
  eligibleBookings.forEach((b) => {
    const gross = Number(b.originalAmount ?? b.amount ?? 0);
    const discount = Number(b.discountAmount ?? 0);
    const net = Number(b.amount ?? 0);

    totalGross += gross;
    totalDiscount += discount;
    totalNet += net;

    const row = [
      b.reference,
      b.resourceName,
      b.category,
      formatIsoDate(b.startTime),
      formatIsoDate(b.endTime),
      formatStatementStatus(b.state),
      gross.toFixed(2),
      discount.toFixed(2),
      b.discountCode || "N/A",
      net.toFixed(2),
      formatIsoDate(b.createdAt),
      b.checkedInAt ? formatIsoDate(b.checkedInAt) : "N/A",
      b.checkedOutAt ? formatIsoDate(b.checkedOutAt) : "N/A",
    ];
    lines.push(row.map(escapeCsv).join(","));
  });

  // Summary Totals Row
  lines.push("");
  const summaryRow = [
    `TOTALS (${eligibleBookings.length} Bookings)`,
    "",
    "",
    "",
    "",
    "",
    totalGross.toFixed(2),
    totalDiscount.toFixed(2),
    "",
    totalNet.toFixed(2),
    "",
    "",
    "",
  ];
  lines.push(summaryRow.map(escapeCsv).join(","));

  // Create UTF-8 Blob with BOM for proper Excel compatibility
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `DAIH_Bookings_Financial_${periodSlug}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}

/**
 * Zero-dependency client-side PDF 1.4 Statement Generator
 * Generates an official, standards-compliant, beautifully styled DAIH statement PDF.
 */
export function downloadBookingsPdf({
  bookings,
  periodLabel,
  customer,
}: StatementExportOptions): void {
  const escapePdf = (text: string) =>
    (text || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const clean = (str: any, maxLen: number = 38) => {
    if (str === null || str === undefined) return "-";
    const sanitized = String(str)
      .replace(/[^\x20-\x7E]/g, " ")
      .trim();
    if (sanitized.length > maxLen) {
      return sanitized.slice(0, maxLen - 1) + ".";
    }
    return sanitized;
  };

  const periodSlug = periodLabel.replace(/[^a-zA-Z0-9-_]/g, "_");
  const streamLines: string[] = [];

  // Page setup: 595 x 842 points (A4 Portrait)
  // 1. Header Banner (Brand Deep Purple #23055c)
  streamLines.push(
    "q",
    "0.137 0.020 0.361 rg", // Deep brand purple
    "40 740 515 65 re f",
    "Q",
    "BT",
    "/F1 14 Tf",
    "1 1 1 rg",
    "1 0 0 1 55 780 Tm",
    "(DAIH WORKSPACE PLATFORM) Tj",
    "/F1 9.5 Tf",
    "0.92 0.86 0.98 rg",
    "1 0 0 1 55 765 Tm",
    "(OFFICIAL BOOKINGS & FINANCIAL STATEMENT) Tj",
    "/F2 7.5 Tf",
    "0.80 0.74 0.88 rg",
    "1 0 0 1 55 752 Tm",
    "(DAIH Hub Innovation & Co-Working Center - Member Statement) Tj",
    "ET",
  );

  // Period Badge on Header Banner
  streamLines.push(
    "q",
    "1 1 1 rg",
    "0.15 w",
    "405 755 135 22 re s",
    "Q",
    "BT",
    "/F1 7.5 Tf",
    "1 1 1 rg",
    "1 0 0 1 415 762 Tm",
    `(${escapePdf(clean(`PERIOD: ${periodLabel.toUpperCase()}`, 24))}) Tj`,
    "ET",
  );

  const eligibleBookings = bookings.filter(isStatementEligible);

  // 2. Member Information & Summary Box
  streamLines.push(
    "q",
    "0.97 0.96 0.99 rg", // Light lavender bg
    "0.88 0.85 0.94 RG", // Border
    "0.8 w",
    "40 680 515 50 re B",
    "Q",
    "BT",
    // Left: Customer details
    "/F2 7.5 Tf",
    "0.40 0.35 0.48 rg",
    "1 0 0 1 55 714 Tm",
    "(MEMBER NAME) Tj",
    "/F1 10.5 Tf",
    "0.137 0.020 0.361 rg",
    "1 0 0 1 55 700 Tm",
    `(${escapePdf(clean(customer.name, 30))}) Tj`,
    "/F2 7.5 Tf",
    "0.45 0.45 0.50 rg",
    "1 0 0 1 55 688 Tm",
    `(${escapePdf(clean(`ID: ${customer.clientId || "N/A"}  |  ${customer.email || ""}`, 45))}) Tj`,

    // Right: Statement Date & Summary
    "/F2 7.5 Tf",
    "0.40 0.35 0.48 rg",
    "1 0 0 1 370 714 Tm",
    "(DATE GENERATED) Tj",
    "/F1 9.5 Tf",
    "0.20 0.20 0.25 rg",
    "1 0 0 1 370 700 Tm",
    `(${escapePdf(new Date().toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }))}) Tj`,
    "/F2 7.5 Tf",
    "0.45 0.45 0.50 rg",
    "1 0 0 1 370 688 Tm",
    `(${escapePdf(`${eligibleBookings.length} Total Reservations`)}) Tj`,
    "ET",
  );

  // 3. Financial Metrics Pills
  let totalGross = 0;
  let totalDiscount = 0;
  let totalNet = 0;
  eligibleBookings.forEach((b) => {
    totalGross += Number(b.originalAmount ?? b.amount ?? 0);
    totalDiscount += Number(b.discountAmount ?? 0);
    totalNet += Number(b.amount ?? 0);
  });

  const formattedTotal = `NGN ${totalNet.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
  const formattedDiscount = `NGN ${totalDiscount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;

  streamLines.push(
    "q",
    "0.95 0.95 0.98 rg",
    "40 638 250 32 re f",
    "Q",
    "BT",
    "/F2 7.5 Tf",
    "0.45 0.45 0.50 rg",
    "1 0 0 1 55 658 Tm",
    "(TOTAL SPENT IN PERIOD) Tj",
    "/F1 11 Tf",
    "0.137 0.020 0.361 rg",
    "1 0 0 1 55 645 Tm",
    `(${escapePdf(formattedTotal)}) Tj`,
    "ET",
    "q",
    "0.95 0.95 0.98 rg",
    "305 638 250 32 re f",
    "Q",
    "BT",
    "/F2 7.5 Tf",
    "0.45 0.45 0.50 rg",
    "1 0 0 1 320 658 Tm",
    "(TOTAL REWARDS & DISCOUNTS SAVED) Tj",
    "/F1 11 Tf",
    "0.06 0.55 0.28 rg",
    "1 0 0 1 320 645 Tm",
    `(${escapePdf(formattedDiscount)}) Tj`,
    "ET",
  );

  // 4. Bookings Table Header
  let tableY = 608;
  streamLines.push(
    "q",
    "0.92 0.90 0.96 rg",
    `40 ${tableY - 18} 515 22 re f`,
    "0.82 0.80 0.88 RG",
    "0.8 w",
    `40 ${tableY - 18} m 555 ${tableY - 18} l S`,
    "Q",
    "BT",
    "/F1 7.5 Tf",
    "0.25 0.20 0.35 rg",
    `1 0 0 1 48 ${tableY - 13} Tm`,
    "(DATE) Tj",
    `1 0 0 1 108 ${tableY - 13} Tm`,
    "(REFERENCE) Tj",
    `1 0 0 1 214 ${tableY - 13} Tm`,
    "(WORKSPACE / RESOURCE) Tj",
    `1 0 0 1 352 ${tableY - 13} Tm`,
    "(CATEGORY) Tj",
    `1 0 0 1 422 ${tableY - 13} Tm`,
    "(STATUS) Tj",
    `1 0 0 1 482 ${tableY - 13} Tm`,
    "(PAID (NGN)) Tj",
    "ET",
  );

  tableY -= 20;

  // 5. Bookings Table Rows (Display up to 18 rows on single page statement)
  const maxRows = 18;
  const displayedBookings = eligibleBookings.slice(0, maxRows);
  const rowHeight = 18;

  displayedBookings.forEach((b, idx) => {
    const isEven = idx % 2 === 0;
    if (isEven) {
      streamLines.push(
        "q",
        "0.985 0.985 0.995 rg",
        `40 ${tableY - rowHeight} 515 ${rowHeight} re f`,
        "Q",
      );
    }

    const dateSource = b.startTime || b.createdAt;
    const bDate = dateSource
      ? new Date(dateSource).toLocaleDateString("en-NG", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "-";
    const ref = clean(b.reference || b.id.slice(0, 8), 18);
    const resName = clean(b.resourceName || "Workspace", 24);
    const cat = clean((b.category || "Hot Desk").replace(/_/g, " "), 12);
    const statusLabel = formatStatementStatus(b.state);
    const paidStr = Number(b.amount || 0).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    let statusColor = "0.06 0.55 0.28 rg"; // CONFIRMED: Emerald green
    if (statusLabel === "MISSED") {
      statusColor = "0.85 0.45 0.05 rg"; // MISSED: Amber / Warm Orange
    } else if (statusLabel === "CANCELED") {
      statusColor = "0.75 0.20 0.20 rg"; // CANCELED: Soft Crimson / Red
    }

    streamLines.push(
      "BT",
      "/F2 7.5 Tf",
      "0.30 0.30 0.35 rg",
      `1 0 0 1 48 ${tableY - 12} Tm`,
      `(${escapePdf(bDate)}) Tj`,
      "/F2 7 Tf",
      "0.40 0.40 0.45 rg",
      `1 0 0 1 108 ${tableY - 12} Tm`,
      `(${escapePdf(ref)}) Tj`,
      "/F1 7.5 Tf",
      "0.15 0.15 0.20 rg",
      `1 0 0 1 214 ${tableY - 12} Tm`,
      `(${escapePdf(resName)}) Tj`,
      "/F2 7.5 Tf",
      "0.40 0.40 0.45 rg",
      `1 0 0 1 352 ${tableY - 12} Tm`,
      `(${escapePdf(cat)}) Tj`,
      "/F1 7.5 Tf",
      statusColor,
      `1 0 0 1 422 ${tableY - 12} Tm`,
      `(${escapePdf(statusLabel)}) Tj`,
      "/F1 8 Tf",
      "0.137 0.020 0.361 rg",
      `1 0 0 1 482 ${tableY - 12} Tm`,
      `(${escapePdf(paidStr)}) Tj`,
      "ET",
    );

    tableY -= rowHeight;
  });

  if (eligibleBookings.length > maxRows) {
    streamLines.push(
      "BT",
      "/F2 7.5 Tf",
      "0.50 0.50 0.55 rg",
      `1 0 0 1 50 ${tableY - 12} Tm`,
      `(${escapePdf(`[+ ${eligibleBookings.length - maxRows} additional bookings in this period. Full dataset available via CSV export]`)} ) Tj`,
      "ET",
    );
    tableY -= 15;
  }

  // 6. Summary Footer Box
  streamLines.push(
    "q",
    "0.88 0.88 0.92 RG",
    "0.8 w",
    `40 ${tableY - 5} m 555 ${tableY - 5} l S`,
    "Q",
  );
  tableY -= 22;

  streamLines.push(
    "BT",
    "/F1 9 Tf",
    "0.137 0.020 0.361 rg",
    `1 0 0 1 320 ${tableY} Tm`,
    "(TOTAL STATEMENT SETTLEMENT:) Tj",
    "/F1 10.5 Tf",
    `1 0 0 1 470 ${tableY} Tm`,
    `(${escapePdf(formattedTotal)}) Tj`,
    "ET",
  );

  // 7. Security / Disclaimer Notice
  streamLines.push(
    "BT",
    "/F2 7 Tf",
    "0.55 0.55 0.60 rg",
    "1 0 0 1 50 65 Tm",
    "(Official statement generated directly from DAIH Customer Portal. Valid for accounting and expense reporting.) Tj",
    "1 0 0 1 50 54 Tm",
    "(DAIH Hub Campus, Nigeria - inquiries: support@daih.com.ng) Tj",
    "ET",
  );

  // Build PDF Objects
  const streamContent = streamLines.join("\n");
  const encoder = new TextEncoder();
  const streamBytes = encoder.encode(streamContent);

  const preObjects: Uint8Array[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  const append = (str: string) => {
    const bytes = encoder.encode(str);
    preObjects.push(bytes);
    currentOffset += bytes.length;
  };

  append("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  // Obj 1: Catalog
  offsets.push(currentOffset);
  append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  // Obj 2: Pages
  offsets.push(currentOffset);
  append("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");

  // Obj 3: Page (A4: 595 x 842 pt)
  offsets.push(currentOffset);
  append(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> >>\nendobj\n",
  );

  // Obj 4: Font F1 (Helvetica-Bold)
  offsets.push(currentOffset);
  append(
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
  );

  // Obj 5: Font F2 (Helvetica)
  offsets.push(currentOffset);
  append(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
  );

  // Obj 6: Content Stream
  offsets.push(currentOffset);
  const streamHeader = `6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`;
  const streamFooter = `\nendstream\nendobj\n`;

  append(streamHeader);
  preObjects.push(streamBytes);
  currentOffset += streamBytes.length;
  append(streamFooter);

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
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `DAIH_Bookings_Statement_${periodSlug}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);
}
