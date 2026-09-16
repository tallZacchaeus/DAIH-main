import { prisma } from "../../db/client.js";
import { BookingState, PaymentStatus } from "@daih/types";

export interface ReportExportQuery {
  type: "revenue" | "bookings" | "occupancy" | "financial_audit" | "customers";
  format: "csv" | "xlsx" | "pdf";
  startDate?: string;
  endDate?: string;
  preset?: string;
}

export class ReportsService {
  /**
   * Generates a formatted report file buffer with appropriate Content-Type and Filename
   */
  async generateExport(query: ReportExportQuery): Promise<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }> {
    const { type = "revenue", format = "csv", startDate, endDate } = query;

    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Fetch relevant dataset from PostgreSQL
    const [bookings, transactions, resources, users] = await Promise.all([
      type !== "customers" || format === "pdf"
        ? prisma.booking.findMany({
            where: {
              createdAt: { gte: start, lte: end },
            },
            include: {
              resource: true,
              user: true,
              transactions: true,
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      type !== "customers" || format === "pdf"
        ? prisma.transaction.findMany({
            where: {
              createdAt: { gte: start, lte: end },
            },
            include: {
              user: true,
              booking: { include: { resource: true } },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      type === "occupancy"
        ? prisma.facilityResource.findMany({
            where: { isActive: true },
          })
        : Promise.resolve([]),
      type === "customers" && prisma.user?.findMany
        ? prisma.user.findMany({
            where: {
              role: "CUSTOMER",
              ...(startDate ? { createdAt: { gte: start, lte: end } } : {}),
            },
            include: {
              bookings: true,
              transactions: true,
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
    ]);

    const dateRangeStr = `${start.toISOString().split("T")[0]}_to_${end.toISOString().split("T")[0]}`;
    const filename = `DAIH_${type.toUpperCase()}_REPORT_${dateRangeStr}.${format === "xlsx" ? "csv" : format}`;

    if (format === "csv" || format === "xlsx") {
      const csvContent = this.buildCsvReport(type, {
        bookings,
        transactions,
        resources,
        users,
        start,
        end,
      });
      const buffer = Buffer.from("\uFEFF" + csvContent, "utf-8"); // Add UTF-8 BOM for seamless Excel compatibility
      const contentType =
        format === "xlsx"
          ? "application/vnd.ms-excel; charset=utf-8"
          : "text/csv; charset=utf-8";
      return { buffer, contentType, filename };
    }

    if (format === "pdf") {
      const pdfBuffer = this.buildPdfReport(type, {
        bookings,
        transactions,
        resources,
        users,
        start,
        end,
      });
      return {
        buffer: pdfBuffer,
        contentType: "application/pdf",
        filename: `DAIH_${type.toUpperCase()}_REPORT_${dateRangeStr}.pdf`,
      };
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  private escapeCsv(val: any): string {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  private buildCsvReport(
    type: string,
    data: {
      bookings: any[];
      transactions: any[];
      resources: any[];
      users?: any[];
      start: Date;
      end: Date;
    },
  ): string {
    const { bookings, transactions, users = [] } = data;

    if (type === "customers") {
      const headers = [
        "Client ID",
        "Full Name",
        "Email Address",
        "Phone Number",
        "Date of Birth",
        "Role",
        "Verification Status",
        "Referral Code",
        "Total Bookings",
        "Joined Date",
      ];

      const rows = users.map((u) => [
        u.clientId,
        `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        u.email,
        u.phoneNumber || "Not provided",
        u.birthday || "Not provided",
        u.role,
        u.isVerified ? "Verified" : "Unverified",
        u.referralCode || "N/A",
        u.bookings?.length || 0,
        new Date(u.createdAt).toISOString().split("T")[0],
      ]);

      return [
        headers.map(this.escapeCsv).join(","),
        ...rows.map((r) => r.map(this.escapeCsv).join(",")),
      ].join("\n");
    }

    if (type === "bookings") {
      const headers = [
        "Booking ID",
        "Reference",
        "Client ID",
        "Customer Name",
        "Customer Email",
        "Resource",
        "Plan",
        "Start Time",
        "End Time",
        "Status",
        "Amount (NGN)",
        "Created At",
      ];

      const rows = bookings.map((b) => [
        b.id,
        b.reference,
        b.user?.clientId || "N/A",
        `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim(),
        b.user?.email || "N/A",
        b.resource?.name || "N/A",
        b.planType || "HOURLY",
        new Date(b.startTime).toISOString(),
        new Date(b.endTime).toISOString(),
        b.state,
        Number(b.totalAmount || b.price || 0),
        new Date(b.createdAt).toISOString(),
      ]);

      return [
        headers.map(this.escapeCsv).join(","),
        ...rows.map((r) => r.map(this.escapeCsv).join(",")),
      ].join("\n");
    }

    if (type === "revenue" || type === "financial_audit") {
      const headers = [
        "Transaction ID",
        "Reference",
        "Client ID",
        "Customer Name",
        "Customer Email",
        "Resource / Service",
        "Type",
        "Payment Method",
        "Amount (NGN)",
        "Status",
        "Date",
      ];

      const rows = transactions.map((t) => [
        t.id,
        t.reference,
        t.user?.clientId || "N/A",
        `${t.user?.firstName || ""} ${t.user?.lastName || ""}`.trim(),
        t.user?.email || "N/A",
        t.booking?.resource?.name || "Workspace Service",
        t.type || "BOOKING",
        t.method,
        Number(t.amount || 0),
        t.status,
        new Date(t.createdAt).toISOString(),
      ]);

      // Summary statistics footer
      const totalSuccessful = transactions
        .filter((t) => t.status === PaymentStatus.SUCCESSFUL)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const footer = [
        "",
        "",
        "",
        "",
        "",
        "",
        "TOTAL REVENUE (SUCCESSFUL)",
        "",
        totalSuccessful,
        "",
        "",
      ];

      return [
        headers.map(this.escapeCsv).join(","),
        ...rows.map((r) => r.map(this.escapeCsv).join(",")),
        "",
        footer.map(this.escapeCsv).join(","),
      ].join("\n");
    }

    // Default Occupancy / Utilization Report
    const headers = [
      "Resource Name",
      "Category",
      "Capacity",
      "Total Bookings",
      "Completed Visits",
      "Revenue Generated (NGN)",
    ];
    const rows = data.resources.map((r) => {
      const resBookings = bookings.filter((b) => b.resourceId === r.id);
      const completed = resBookings.filter(
        (b) =>
          b.state === BookingState.COMPLETED ||
          b.state === BookingState.CHECKED_OUT,
      ).length;
      const rev = resBookings.reduce(
        (sum, b) => sum + Number(b.totalAmount || b.price || 0),
        0,
      );
      return [
        r.name,
        r.category,
        r.capacity,
        resBookings.length,
        completed,
        rev,
      ];
    });

    return [
      headers.map(this.escapeCsv).join(","),
      ...rows.map((r) => r.map(this.escapeCsv).join(",")),
    ].join("\n");
  }

  /**
   * Builds clean, standards-compliant, valid PDF 1.4 binary document with exact xref byte offsets
   */
  private buildPdfReport(
    type: string,
    data: {
      bookings: any[];
      transactions: any[];
      resources: any[];
      users?: any[];
      start: Date;
      end: Date;
    },
  ): Buffer {
    const { bookings, transactions, resources, users = [], start, end } = data;
    const title = `DAIH WORKSPACE PLATFORM -- ${type.replace(/_/g, " ").toUpperCase()} REPORT`;
    const period = `${start.toDateString()} to ${end.toDateString()}`;
    const generatedAt = new Date().toUTCString();

    const totalRevenue = transactions
      .filter((t) => t.status === PaymentStatus.SUCCESSFUL)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const successfulBookings = bookings.filter(
      (b) =>
        b.state === BookingState.CONFIRMED ||
        b.state === BookingState.ACTIVE ||
        b.state === BookingState.COMPLETED,
    ).length;

    const escapePdf = (text: string) =>
      (text || "")
        .replace(/\\/g, "\\\\")
        .replace(/\(/g, "\\(")
        .replace(/\)/g, "\\)");

    const clean = (str: any, maxLen: number) => {
      if (str === null || str === undefined) return "-";
      const sanitized = String(str)
        .replace(/[^\x20-\x7E]/g, " ")
        .trim();
      if (sanitized.length > maxLen) {
        return sanitized.slice(0, maxLen - 1) + ".";
      }
      return sanitized;
    };

    const streamLines: string[] = [];

    // 1. Header Banner Box
    streamLines.push(
      "q",
      "0.137 0.020 0.361 rg", // Deep brand purple (#23055c)
      "36 740 523 66 re f",
      "Q",
      "BT",
      // Line 1: Title given full horizontal width
      "/F1 13 Tf",
      "1 1 1 rg",
      "1 0 0 1 48 787 Tm",
      `(${escapePdf(title)}) Tj`,
      // Line 2: Subtitle left, Period right
      "/F2 8.5 Tf",
      "0.88 0.85 0.94 rg",
      "1 0 0 1 48 768 Tm",
      `(${escapePdf("DAIH Coworking & Innovation Hub | Official Audit")}) Tj`,
      "1 0 0 1 340 768 Tm",
      `(${escapePdf(`Period: ${period}`)}) Tj`,
      // Line 3: System tag left, Generated right
      "/F2 7.5 Tf",
      "0.78 0.75 0.85 rg",
      "1 0 0 1 48 751 Tm",
      `(${escapePdf("Confidential Compliance & Executive Telemetry")}) Tj`,
      "1 0 0 1 340 751 Tm",
      `(${escapePdf(`Generated: ${generatedAt}`)}) Tj`,
      "ET",
    );

    // 2. Executive KPI Cards (3 Cards)
    if (type === "occupancy") {
      const totalCapacity = resources.reduce(
        (sum, r) => sum + (r.capacity || 1),
        0,
      );
      const totalCompleted = bookings.filter(
        (b) =>
          b.state === BookingState.COMPLETED ||
          b.state === BookingState.CHECKED_OUT,
      ).length;

      // Card 1
      streamLines.push(
        "q",
        "0.96 0.95 0.98 rg",
        "0.85 0.82 0.92 RG",
        "0.8 w",
        "36 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.40 0.35 0.50 rg",
        "1 0 0 1 48 710 Tm",
        "(MANAGED SPACES) Tj",
        "/F1 12 Tf",
        "0.14 0.02 0.36 rg",
        "1 0 0 1 48 691 Tm",
        `(${resources.length} Resources) Tj`,
        "ET",
      );
      // Card 2
      streamLines.push(
        "q",
        "0.95 0.97 0.99 rg",
        "0.82 0.88 0.95 RG",
        "0.8 w",
        "214 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.30 0.40 0.50 rg",
        "1 0 0 1 226 710 Tm",
        "(HUB TOTAL CAPACITY) Tj",
        "/F1 12 Tf",
        "0.10 0.30 0.60 rg",
        "1 0 0 1 226 691 Tm",
        `(${totalCapacity} Persons) Tj`,
        "ET",
      );
      // Card 3
      streamLines.push(
        "q",
        "0.95 0.98 0.96 rg",
        "0.82 0.92 0.86 RG",
        "0.8 w",
        "393 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.25 0.45 0.35 rg",
        "1 0 0 1 405 710 Tm",
        "(COMPLETED RESERVATIONS) Tj",
        "/F1 12 Tf",
        "0.08 0.50 0.25 rg",
        "1 0 0 1 405 691 Tm",
        `(${totalCompleted} Visits) Tj`,
        "ET",
      );
    } else if (type === "bookings") {
      const clientSet = new Set(
        bookings.map((b) => b.userId || b.user?.email).filter(Boolean),
      );
      // Card 1
      streamLines.push(
        "q",
        "0.96 0.95 0.98 rg",
        "0.85 0.82 0.92 RG",
        "0.8 w",
        "36 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.40 0.35 0.50 rg",
        "1 0 0 1 48 710 Tm",
        "(TOTAL BOOKINGS) Tj",
        "/F1 12 Tf",
        "0.14 0.02 0.36 rg",
        "1 0 0 1 48 691 Tm",
        `(${bookings.length} Reservations) Tj`,
        "ET",
      );
      // Card 2
      streamLines.push(
        "q",
        "0.95 0.97 0.99 rg",
        "0.82 0.88 0.95 RG",
        "0.8 w",
        "214 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.30 0.40 0.50 rg",
        "1 0 0 1 226 710 Tm",
        "(CONFIRMED / ACTIVE) Tj",
        "/F1 12 Tf",
        "0.10 0.30 0.60 rg",
        "1 0 0 1 226 691 Tm",
        `(${successfulBookings} Bookings) Tj`,
        "ET",
      );
      // Card 3
      streamLines.push(
        "q",
        "0.95 0.98 0.96 rg",
        "0.82 0.92 0.86 RG",
        "0.8 w",
        "393 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.25 0.45 0.35 rg",
        "1 0 0 1 405 710 Tm",
        "(TOTAL CUSTOMERS) Tj",
        "/F1 12 Tf",
        "0.08 0.50 0.25 rg",
        "1 0 0 1 405 691 Tm",
        `(${clientSet.size} Customers) Tj`,
        "ET",
      );
    } else if (type === "customers") {
      const verifiedCount = users.filter((u: any) => u.isVerified).length;
      const activeBookers = users.filter(
        (u: any) => u.bookings && u.bookings.length > 0,
      ).length;

      // Card 1
      streamLines.push(
        "q",
        "0.96 0.95 0.98 rg",
        "0.85 0.82 0.92 RG",
        "0.8 w",
        "36 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.40 0.35 0.50 rg",
        "1 0 0 1 48 710 Tm",
        "(TOTAL REGISTERED) Tj",
        "/F1 12 Tf",
        "0.14 0.02 0.36 rg",
        "1 0 0 1 48 691 Tm",
        `(${users.length} Customers) Tj`,
        "ET",
      );
      // Card 2
      streamLines.push(
        "q",
        "0.95 0.97 0.99 rg",
        "0.82 0.88 0.95 RG",
        "0.8 w",
        "214 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.30 0.40 0.50 rg",
        "1 0 0 1 226 710 Tm",
        "(VERIFIED MEMBERS) Tj",
        "/F1 12 Tf",
        "0.10 0.30 0.60 rg",
        "1 0 0 1 226 691 Tm",
        `(${verifiedCount} Members) Tj`,
        "ET",
      );
      // Card 3
      streamLines.push(
        "q",
        "0.95 0.98 0.96 rg",
        "0.82 0.92 0.86 RG",
        "0.8 w",
        "393 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.25 0.45 0.35 rg",
        "1 0 0 1 405 710 Tm",
        "(ACTIVE BOOKERS) Tj",
        "/F1 12 Tf",
        "0.08 0.50 0.25 rg",
        "1 0 0 1 405 691 Tm",
        `(${activeBookers} Members) Tj`,
        "ET",
      );
    } else {
      // Default: Revenue & Financial Audit
      const customerSet = new Set(
        [
          ...transactions.map((t) => t.userId || t.user?.email),
          ...bookings.map((b) => b.userId || b.user?.email),
        ].filter(Boolean),
      );

      // Card 1
      streamLines.push(
        "q",
        "0.96 0.95 0.98 rg",
        "0.85 0.82 0.92 RG",
        "0.8 w",
        "36 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.40 0.35 0.50 rg",
        "1 0 0 1 48 710 Tm",
        "(TOTAL REVENUE) Tj",
        "/F1 12 Tf",
        "0.14 0.02 0.36 rg",
        "1 0 0 1 48 691 Tm",
        `(${escapePdf(`NGN ${totalRevenue.toLocaleString()}`)}) Tj`,
        "ET",
      );
      // Card 2
      streamLines.push(
        "q",
        "0.95 0.97 0.99 rg",
        "0.82 0.88 0.95 RG",
        "0.8 w",
        "214 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.30 0.40 0.50 rg",
        "1 0 0 1 226 710 Tm",
        "(PAID RESERVATIONS) Tj",
        "/F1 12 Tf",
        "0.10 0.30 0.60 rg",
        "1 0 0 1 226 691 Tm",
        `(${successfulBookings} Bookings) Tj`,
        "ET",
      );
      // Card 3
      streamLines.push(
        "q",
        "0.95 0.98 0.96 rg",
        "0.82 0.92 0.86 RG",
        "0.8 w",
        "393 675 166 52 re B",
        "Q",
        "BT",
        "/F1 7.5 Tf",
        "0.25 0.45 0.35 rg",
        "1 0 0 1 405 710 Tm",
        "(TOTAL CUSTOMERS) Tj",
        "/F1 12 Tf",
        "0.08 0.50 0.25 rg",
        "1 0 0 1 405 691 Tm",
        `(${customerSet.size} Customers) Tj`,
        "ET",
      );
    }

    // 3. Section Title & Divider
    const sectionTitle =
      type === "bookings"
        ? "RESERVATION AUDIT LOG"
        : type === "occupancy"
          ? "FACILITY UTILIZATION & DENSITY"
          : type === "customers"
            ? "MEMBER DIRECTORY & CUSTOMER AUDIT LOG"
            : "TRANSACTION & SETTLEMENT AUDIT LOG";

    streamLines.push(
      "BT",
      "/F1 10.5 Tf",
      "0.14 0.02 0.36 rg",
      "1 0 0 1 36 648 Tm",
      `(${escapePdf(sectionTitle)}) Tj`,
      "ET",
      "q",
      "0.85 0.85 0.88 RG",
      "0.5 w",
      "36 642 m 559 642 l S",
      "Q",
    );

    // 4. Data Table Header & Rows with Absolute Coordinates
    let currentY = 598;
    const rowHeight = 18;

    if (type === "customers") {
      // Table Header
      streamLines.push(
        "q",
        "0.92 0.90 0.96 rg",
        "36 616 523 20 re f",
        "0.78 0.75 0.85 RG",
        "1 w",
        "36 616 m 559 616 l S",
        "Q",
        "BT",
        "/F1 8 Tf",
        "0.18 0.15 0.25 rg",
        "1 0 0 1 44 622 Tm",
        "(CLIENT ID) Tj",
        "1 0 0 1 125 622 Tm",
        "(CUSTOMER NAME) Tj",
        "1 0 0 1 230 622 Tm",
        "(DATE OF BIRTH) Tj",
        "1 0 0 1 315 622 Tm",
        "(EMAIL ADDRESS) Tj",
        "1 0 0 1 445 622 Tm",
        "(STATUS) Tj",
        "1 0 0 1 505 622 Tm",
        "(BOOKINGS) Tj",
        "ET",
      );

      const sample = users.slice(0, 27);
      sample.forEach((u: any, idx: number) => {
        if (idx % 2 === 1) {
          streamLines.push(
            "q",
            "0.98 0.98 0.99 rg",
            `36 ${currentY - 4} 523 ${rowHeight} re f`,
            "Q",
          );
        }
        streamLines.push(
          "q",
          "0.91 0.91 0.93 RG",
          "0.5 w",
          `36 ${currentY - 4} m 559 ${currentY - 4} l S`,
          "Q",
        );

        const clientId = clean(u.clientId, 14);
        const name = clean(
          `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Customer",
          18,
        );
        const dob = clean(u.birthday || "Not provided", 14);
        const email = clean(u.email, 22);
        const status = u.isVerified ? "Verified" : "Pending";
        const totalB = clean(String(u.bookings?.length || 0), 8);

        streamLines.push(
          "BT",
          "/F1 8 Tf",
          "0.14 0.02 0.36 rg",
          `1 0 0 1 44 ${currentY} Tm`,
          `(${escapePdf(clientId)}) Tj`,
          "/F2 8 Tf",
          "0.20 0.20 0.25 rg",
          `1 0 0 1 125 ${currentY} Tm`,
          `(${escapePdf(name)}) Tj`,
          "/F1 8 Tf",
          "0.20 0.20 0.25 rg",
          `1 0 0 1 230 ${currentY} Tm`,
          `(${escapePdf(dob)}) Tj`,
          "/F2 7.5 Tf",
          "0.30 0.30 0.35 rg",
          `1 0 0 1 315 ${currentY} Tm`,
          `(${escapePdf(email)}) Tj`,
          "/F1 7.5 Tf",
          u.isVerified ? "0.08 0.50 0.25 rg" : "0.65 0.35 0.05 rg",
          `1 0 0 1 445 ${currentY} Tm`,
          `(${escapePdf(status)}) Tj`,
          "/F2 8 Tf",
          "0.20 0.20 0.25 rg",
          `1 0 0 1 505 ${currentY} Tm`,
          `(${escapePdf(totalB)}) Tj`,
          "ET",
        );
        currentY -= rowHeight;
      });

      if (users.length > 27) {
        streamLines.push(
          "BT",
          "/F1 8 Tf",
          "0.45 0.45 0.55 rg",
          `1 0 0 1 44 ${currentY - 2} Tm`,
          `(${escapePdf(`[+ ${users.length - 27} additional members. Full dataset available via CSV export]`)}) Tj`,
          "ET",
        );
      }
    } else if (type === "bookings") {
      // Table Header
      streamLines.push(
        "q",
        "0.92 0.90 0.96 rg",
        "36 616 523 20 re f",
        "0.78 0.75 0.85 RG",
        "1 w",
        "36 616 m 559 616 l S",
        "Q",
        "BT",
        "/F1 8 Tf",
        "0.18 0.15 0.25 rg",
        "1 0 0 1 44 622 Tm",
        "(BOOKING REF) Tj",
        "1 0 0 1 140 622 Tm",
        "(CUSTOMER) Tj",
        "1 0 0 1 250 622 Tm",
        "(RESOURCE / SPACE) Tj",
        "1 0 0 1 370 622 Tm",
        "(PLAN) Tj",
        "1 0 0 1 440 622 Tm",
        "(AMOUNT (NGN)) Tj",
        "1 0 0 1 512 622 Tm",
        "(STATUS) Tj",
        "ET",
      );

      const sample = bookings.slice(0, 27);
      sample.forEach((b, idx) => {
        if (idx % 2 === 1) {
          streamLines.push(
            "q",
            "0.98 0.98 0.99 rg",
            `36 ${currentY - 4} 523 ${rowHeight} re f`,
            "Q",
          );
        }
        streamLines.push(
          "q",
          "0.91 0.91 0.93 RG",
          "0.5 w",
          `36 ${currentY - 4} m 559 ${currentY - 4} l S`,
          "Q",
        );

        const ref = clean(b.reference, 16);
        const cust = clean(
          `${b.user?.firstName || ""} ${b.user?.lastName || ""}`.trim() ||
            b.user?.email ||
            "Customer",
          20,
        );
        const res = clean(b.resource?.name || "Workspace", 22);
        const plan = clean(b.planType || "HOURLY", 12);
        const amt = clean(
          Number(b.totalAmount || b.price || 0).toLocaleString(),
          12,
        );
        const state = clean(b.state || "CONFIRMED", 12);

        const isSuccess = [
          "CONFIRMED",
          "ACTIVE",
          "COMPLETED",
          "CHECKED_OUT",
        ].includes(b.state);
        const statusColor = isSuccess
          ? "0.06 0.55 0.28 rg"
          : "0.75 0.15 0.15 rg";

        streamLines.push(
          "BT",
          "/F2 8 Tf",
          "0.20 0.20 0.25 rg",
          `1 0 0 1 44 ${currentY} Tm`,
          `(${escapePdf(ref)}) Tj`,
          `1 0 0 1 140 ${currentY} Tm`,
          `(${escapePdf(cust)}) Tj`,
          `1 0 0 1 250 ${currentY} Tm`,
          `(${escapePdf(res)}) Tj`,
          `1 0 0 1 370 ${currentY} Tm`,
          `(${escapePdf(plan)}) Tj`,
          "/F1 8 Tf",
          `1 0 0 1 440 ${currentY} Tm`,
          `(${escapePdf(amt)}) Tj`,
          "/F1 7.5 Tf",
          statusColor,
          `1 0 0 1 512 ${currentY} Tm`,
          `(${escapePdf(state)}) Tj`,
          "ET",
        );
        currentY -= rowHeight;
      });

      if (bookings.length > 27) {
        streamLines.push(
          "BT",
          "/F1 8 Tf",
          "0.45 0.45 0.55 rg",
          `1 0 0 1 44 ${currentY - 2} Tm`,
          `(${escapePdf(`[+ ${bookings.length - 27} additional reservations in this period. Full dataset available via CSV export]`)}) Tj`,
          "ET",
        );
      }
    } else if (type === "occupancy") {
      // Table Header
      streamLines.push(
        "q",
        "0.92 0.90 0.96 rg",
        "36 616 523 20 re f",
        "0.78 0.75 0.85 RG",
        "1 w",
        "36 616 m 559 616 l S",
        "Q",
        "BT",
        "/F1 8 Tf",
        "0.18 0.15 0.25 rg",
        "1 0 0 1 44 622 Tm",
        "(RESOURCE NAME) Tj",
        "1 0 0 1 185 622 Tm",
        "(CATEGORY) Tj",
        "1 0 0 1 285 622 Tm",
        "(CAPACITY) Tj",
        "1 0 0 1 350 622 Tm",
        "(BOOKINGS) Tj",
        "1 0 0 1 420 622 Tm",
        "(COMPLETED) Tj",
        "1 0 0 1 485 622 Tm",
        "(REVENUE (NGN)) Tj",
        "ET",
      );

      const sample = resources.slice(0, 27);
      sample.forEach((r, idx) => {
        const resBookings = bookings.filter((b) => b.resourceId === r.id);
        const completed = resBookings.filter(
          (b) =>
            b.state === BookingState.COMPLETED ||
            b.state === BookingState.CHECKED_OUT,
        ).length;
        const rev = resBookings.reduce(
          (sum, b) => sum + Number(b.totalAmount || b.price || 0),
          0,
        );

        if (idx % 2 === 1) {
          streamLines.push(
            "q",
            "0.98 0.98 0.99 rg",
            `36 ${currentY - 4} 523 ${rowHeight} re f`,
            "Q",
          );
        }
        streamLines.push(
          "q",
          "0.91 0.91 0.93 RG",
          "0.5 w",
          `36 ${currentY - 4} m 559 ${currentY - 4} l S`,
          "Q",
        );

        const name = clean(r.name, 24);
        const cat = clean(r.category || "GENERAL", 16);
        const cap = clean(`${r.capacity || 1} seats`, 10);
        const bks = clean(String(resBookings.length), 10);
        const comp = clean(String(completed), 10);
        const revStr = clean(rev.toLocaleString(), 14);

        streamLines.push(
          "BT",
          "/F2 8 Tf",
          "0.20 0.20 0.25 rg",
          `1 0 0 1 44 ${currentY} Tm`,
          `(${escapePdf(name)}) Tj`,
          `1 0 0 1 185 ${currentY} Tm`,
          `(${escapePdf(cat)}) Tj`,
          `1 0 0 1 285 ${currentY} Tm`,
          `(${escapePdf(cap)}) Tj`,
          `1 0 0 1 350 ${currentY} Tm`,
          `(${escapePdf(bks)}) Tj`,
          `1 0 0 1 420 ${currentY} Tm`,
          `(${escapePdf(comp)}) Tj`,
          "/F1 8 Tf",
          "0.14 0.02 0.36 rg",
          `1 0 0 1 485 ${currentY} Tm`,
          `(${escapePdf(revStr)}) Tj`,
          "ET",
        );
        currentY -= rowHeight;
      });
    } else {
      // Default: Revenue & Financial Audit
      streamLines.push(
        "q",
        "0.92 0.90 0.96 rg",
        "36 616 523 20 re f",
        "0.78 0.75 0.85 RG",
        "1 w",
        "36 616 m 559 616 l S",
        "Q",
        "BT",
        "/F1 8 Tf",
        "0.18 0.15 0.25 rg",
        "1 0 0 1 44 622 Tm",
        "(REFERENCE) Tj",
        "1 0 0 1 135 622 Tm",
        "(CUSTOMER) Tj",
        "1 0 0 1 245 622 Tm",
        "(RESOURCE / SERVICE) Tj",
        "1 0 0 1 370 622 Tm",
        "(METHOD) Tj",
        "1 0 0 1 440 622 Tm",
        "(AMOUNT (NGN)) Tj",
        "1 0 0 1 512 622 Tm",
        "(STATUS) Tj",
        "ET",
      );

      const sample = transactions.slice(0, 27);
      sample.forEach((t, idx) => {
        if (idx % 2 === 1) {
          streamLines.push(
            "q",
            "0.98 0.98 0.99 rg",
            `36 ${currentY - 4} 523 ${rowHeight} re f`,
            "Q",
          );
        }
        streamLines.push(
          "q",
          "0.91 0.91 0.93 RG",
          "0.5 w",
          `36 ${currentY - 4} m 559 ${currentY - 4} l S`,
          "Q",
        );

        const ref = clean(t.reference || t.id, 16);
        const cust = clean(
          `${t.user?.firstName || ""} ${t.user?.lastName || ""}`.trim() ||
            t.user?.email ||
            "Customer",
          20,
        );
        const res = clean(
          t.booking?.resource?.name || t.type || "Workspace",
          22,
        );
        const method = clean(t.method || "ONLINE", 12);
        const amt = clean(Number(t.amount || 0).toLocaleString(), 12);
        const status = clean(t.status || "SUCCESSFUL", 12);

        const isSuccess = t.status === PaymentStatus.SUCCESSFUL;
        const statusColor = isSuccess
          ? "0.06 0.55 0.28 rg"
          : "0.75 0.15 0.15 rg";

        streamLines.push(
          "BT",
          "/F2 8 Tf",
          "0.20 0.20 0.25 rg",
          `1 0 0 1 44 ${currentY} Tm`,
          `(${escapePdf(ref)}) Tj`,
          `1 0 0 1 135 ${currentY} Tm`,
          `(${escapePdf(cust)}) Tj`,
          `1 0 0 1 245 ${currentY} Tm`,
          `(${escapePdf(res)}) Tj`,
          `1 0 0 1 370 ${currentY} Tm`,
          `(${escapePdf(method)}) Tj`,
          "/F1 8 Tf",
          `1 0 0 1 440 ${currentY} Tm`,
          `(${escapePdf(amt)}) Tj`,
          "/F1 7.5 Tf",
          statusColor,
          `1 0 0 1 512 ${currentY} Tm`,
          `(${escapePdf(status)}) Tj`,
          "ET",
        );
        currentY -= rowHeight;
      });

      if (transactions.length > 27) {
        streamLines.push(
          "BT",
          "/F1 8 Tf",
          "0.45 0.45 0.55 rg",
          `1 0 0 1 44 ${currentY - 2} Tm`,
          `(${escapePdf(`[+ ${transactions.length - 27} additional transactions in this period. Full dataset available via CSV export]`)}) Tj`,
          "ET",
        );
      }
    }

    // 5. Page Footer
    streamLines.push(
      "q",
      "0.85 0.85 0.88 RG",
      "0.5 w",
      "36 45 m 559 45 l S",
      "Q",
      "BT",
      "/F2 7.5 Tf",
      "0.45 0.45 0.50 rg",
      "1 0 0 1 36 34 Tm",
      "(CONFIDENTIAL  |  DAIH Workspace Platform Audit & Compliance  |  All rights reserved) Tj",
      "/F1 7.5 Tf",
      "1 0 0 1 520 34 Tm",
      "(Page 1 of 1) Tj",
      "ET",
    );

    const streamContent = streamLines.join("\n");
    const streamLength = Buffer.byteLength(streamContent, "utf-8");

    const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
    const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
    const obj3 =
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /ProcSet [/PDF /Text] >> >>\nendobj\n";
    const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj\n`;
    const obj5 =
      "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n";
    const obj6 =
      "6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n";

    const objects = [obj1, obj2, obj3, obj4, obj5, obj6];
    const offsets: number[] = [];

    let currentOffset = Buffer.byteLength(header, "binary");
    for (const obj of objects) {
      offsets.push(currentOffset);
      currentOffset += Buffer.byteLength(obj, "binary");
    }

    const xrefOffset = currentOffset;

    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \r\n`;
    for (const off of offsets) {
      xref += String(off).padStart(10, "0") + " 00000 n \r\n";
    }

    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.concat([
      Buffer.from(header, "binary"),
      ...objects.map((o) => Buffer.from(o, "binary")),
      Buffer.from(xref, "binary"),
      Buffer.from(trailer, "binary"),
    ]);
  }
}

export const reportsService = new ReportsService();
