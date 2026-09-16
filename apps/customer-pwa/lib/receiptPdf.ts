/**
 * Zero-dependency client-side PDF 1.4 Receipt Generator
 * Generates an official, standards-compliant, beautifully styled DAIH receipt PDF.
 */

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  amount: number;
}

export interface InvoiceReceiptData {
  invoiceNumber: string;
  issuedAt: string;
  customerName: string;
  customerClientId: string;
  resourceName: string;
  bookingReference: string;
  currency: string;
  lineItems: InvoiceLineItem[];
  total: number;
}

export function generateReceiptPdfBlob(data: InvoiceReceiptData): Blob {
  const escapePdf = (text: string) =>
    (text || "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const clean = (str: any, maxLen: number = 40) => {
    if (str === null || str === undefined) return "-";
    const sanitized = String(str)
      .replace(/[^\x20-\x7E]/g, " ")
      .trim();
    if (sanitized.length > maxLen) {
      return sanitized.slice(0, maxLen - 1) + ".";
    }
    return sanitized;
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const streamLines: string[] = [];

  // 1. Header Banner Box (Brand Deep Purple #23055c)
  streamLines.push(
    "q",
    "0.137 0.020 0.361 rg", // Deep brand purple
    "40 735 515 70 re f",
    "Q",
    "BT",
    "/F1 15 Tf",
    "1 1 1 rg",
    "1 0 0 1 55 776 Tm",
    "(DAIH WORKSPACE PLATFORM) Tj",
    "/F1 10 Tf",
    "0.92 0.86 0.98 rg",
    "1 0 0 1 55 760 Tm",
    "(OFFICIAL PAYMENT RECEIPT) Tj",
    "/F2 8 Tf",
    "0.80 0.74 0.88 rg",
    "1 0 0 1 55 746 Tm",
    "(DAIH Hub Innovation & Workspace Center) Tj",
    "ET",
  );

  // Paid Confirmation Badge (Top Right of Banner)
  streamLines.push(
    "q",
    "0.06 0.55 0.28 rg", // Emerald green
    "425 752 115 24 re f",
    "Q",
    "BT",
    "/F1 8.5 Tf",
    "1 1 1 rg",
    "1 0 0 1 440 760 Tm",
    "(PAID & CONFIRMED) Tj",
    "ET",
  );

  // 2. Invoice & Issue Date Metadata Box
  streamLines.push(
    "q",
    "0.97 0.96 0.99 rg", // Light lavender bg
    "0.88 0.85 0.94 RG", // Border
    "0.8 w",
    "40 668 515 50 re B",
    "Q",
    "BT",
    // Left: Invoice Number
    "/F2 7.5 Tf",
    "0.40 0.35 0.48 rg",
    "1 0 0 1 55 700 Tm",
    "(INVOICE NUMBER) Tj",
    "/F1 12 Tf",
    "0.137 0.020 0.361 rg",
    "1 0 0 1 55 683 Tm",
    `(${escapePdf(clean(data.invoiceNumber, 25))}) Tj`,
    // Right: Issue Date
    "/F2 7.5 Tf",
    "0.40 0.35 0.48 rg",
    "1 0 0 1 380 700 Tm",
    "(DATE ISSUED) Tj",
    "/F1 10.5 Tf",
    "0.20 0.20 0.25 rg",
    "1 0 0 1 380 684 Tm",
    `(${escapePdf(formatDate(data.issuedAt))}) Tj`,
    "ET",
  );

  // 3. Customer & Reservation Information Grid
  let infoY = 638;
  const infoRowHeight = 19;

  const infoRows = [
    {
      label: "Customer Name:",
      value: clean(`${data.customerName} (${data.customerClientId})`, 45),
    },
    { label: "Workspace / Space:", value: clean(data.resourceName, 45) },
    {
      label: "Booking Reference:",
      value: clean(data.bookingReference, 35),
      isBold: true,
    },
    { label: "Payment Status:", value: "SETTLED / COMPLETED", isGreen: true },
  ];

  infoRows.forEach((row) => {
    streamLines.push(
      "BT",
      "/F2 8.5 Tf",
      "0.40 0.40 0.45 rg",
      `1 0 0 1 55 ${infoY} Tm`,
      `(${escapePdf(row.label)}) Tj`,
      row.isBold ? "/F1 9 Tf" : "/F2 9 Tf",
      row.isGreen
        ? "0.06 0.55 0.28 rg"
        : row.isBold
          ? "0.137 0.020 0.361 rg"
          : "0.15 0.15 0.20 rg",
      `1 0 0 1 180 ${infoY} Tm`,
      `(${escapePdf(row.value)}) Tj`,
      "ET",
    );
    infoY -= infoRowHeight;
  });

  // Divider Line
  streamLines.push(
    "q",
    "0.88 0.88 0.92 RG",
    "0.7 w",
    `40 ${infoY + 6} m 555 ${infoY + 6} l S`,
    "Q",
  );

  infoY -= 14;

  // 4. Itemized Line Items Table
  // Table Header
  streamLines.push(
    "q",
    "0.94 0.92 0.97 rg",
    `40 ${infoY - 18} 515 22 re f`,
    "0.85 0.82 0.90 RG",
    "0.8 w",
    `40 ${infoY - 18} m 555 ${infoY - 18} l S`,
    "Q",
    "BT",
    "/F1 8 Tf",
    "0.22 0.18 0.28 rg",
    `1 0 0 1 55 ${infoY - 11} Tm`,
    "(ITEM DESCRIPTION) Tj",
    `1 0 0 1 360 ${infoY - 11} Tm`,
    "(QTY) Tj",
    `1 0 0 1 445 ${infoY - 11} Tm`,
    `(${escapePdf(`AMOUNT (${data.currency || "NGN"})`)}) Tj`,
    "ET",
  );

  let currentY = infoY - 34;
  const rowH = 20;

  const items =
    data.lineItems && data.lineItems.length > 0
      ? data.lineItems
      : [
          {
            description: data.resourceName || "Workspace Reservation",
            quantity: 1,
            amount: data.total,
          },
        ];

  items.forEach((item, idx) => {
    if (idx % 2 === 1) {
      streamLines.push(
        "q",
        "0.98 0.98 0.99 rg",
        `40 ${currentY - 4} 515 ${rowH} re f`,
        "Q",
      );
    }

    streamLines.push(
      "q",
      "0.92 0.92 0.94 RG",
      "0.5 w",
      `40 ${currentY - 4} m 555 ${currentY - 4} l S`,
      "Q",
      "BT",
      "/F2 8.5 Tf",
      "0.18 0.18 0.22 rg",
      `1 0 0 1 55 ${currentY + 2} Tm`,
      `(${escapePdf(clean(item.description, 45))}) Tj`,
      `1 0 0 1 370 ${currentY + 2} Tm`,
      `(${escapePdf(String(item.quantity || 1))}) Tj`,
      "/F1 8.5 Tf",
      "0.15 0.15 0.20 rg",
      `1 0 0 1 445 ${currentY + 2} Tm`,
      `(${escapePdf(Number(item.amount).toLocaleString())}) Tj`,
      "ET",
    );
    currentY -= rowH;
  });

  // 5. Total Paid Summary Box
  const totalBoxY = currentY - 26;
  streamLines.push(
    "q",
    "0.96 0.94 0.99 rg", // Soft brand tinted box
    "0.82 0.76 0.90 RG",
    "1 w",
    `300 ${totalBoxY} 255 42 re B`,
    "Q",
    "BT",
    "/F1 10 Tf",
    "0.137 0.020 0.361 rg",
    `1 0 0 1 315 ${totalBoxY + 16} Tm`,
    "(TOTAL AMOUNT PAID:) Tj",
    "/F1 12 Tf",
    "0.137 0.020 0.361 rg",
    `1 0 0 1 455 ${totalBoxY + 16} Tm`,
    `(${escapePdf(`${data.currency || "NGN"} ${Number(data.total).toLocaleString()}`)}) Tj`,
    "ET",
  );

  // 6. Security Note & Official Disclaimer
  const noteY = totalBoxY - 45;
  streamLines.push(
    "q",
    "0.98 0.98 0.98 rg",
    `40 ${noteY} 515 30 re f`,
    "Q",
    "BT",
    "/F2 7.5 Tf",
    "0.45 0.45 0.50 rg",
    `1 0 0 1 55 ${noteY + 17} Tm`,
    "(Security & Verification: This is a computer-generated receipt issued by DAIH Workspace Platform.) Tj",
    `1 0 0 1 55 ${noteY + 7} Tm`,
    "(For support, reservations inquiries, or tax invoice questions, please contact hub reception.) Tj",
    "ET",
  );

  // 7. Page Footer
  streamLines.push(
    "q",
    "0.85 0.85 0.88 RG",
    "0.5 w",
    "40 45 m 555 45 l S",
    "Q",
    "BT",
    "/F2 7.5 Tf",
    "0.50 0.50 0.55 rg",
    "1 0 0 1 40 34 Tm",
    "(DAIH Workspace Platform  |  Official Transaction Receipt  |  All rights reserved) Tj",
    "/F1 7.5 Tf",
    "1 0 0 1 515 34 Tm",
    "(Page 1 of 1) Tj",
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

  // Calculate object byte offsets
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

  return new Blob(totalParts as any, { type: "application/pdf" });
}

export function downloadReceiptPdf(data: InvoiceReceiptData): void {
  const blob = generateReceiptPdfBlob(data);
  const cleanNumber = (data.invoiceNumber || "RECEIPT").replace(
    /[^a-zA-Z0-9-_]/g,
    "_",
  );
  const fileName = `DAIH-Receipt-${cleanNumber}.pdf`;

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
