import { describe, it, expect, beforeEach, vi } from "vitest";
import { reportsService } from "./reports.service.js";
import { BookingState, PaymentStatus } from "@daih/types";

const mockBookings: any[] = [];
const mockTransactions: any[] = [];
const mockResources: any[] = [];
const mockUsers: any[] = [];

vi.mock("../../db/client.js", () => {
  return {
    prisma: {
      booking: {
        findMany: vi.fn(async () => mockBookings),
      },
      transaction: {
        findMany: vi.fn(async () => mockTransactions),
      },
      facilityResource: {
        findMany: vi.fn(async () => mockResources),
      },
      user: {
        findMany: vi.fn(async () => mockUsers),
      },
    },
  };
});

describe("Reports & Analytics Export Service", () => {
  beforeEach(() => {
    mockBookings.length = 0;
    mockTransactions.length = 0;
    mockResources.length = 0;
    mockUsers.length = 0;
    vi.clearAllMocks();

    mockResources.push(
      {
        id: "res_1",
        name: "Dedicated Desk Alpha",
        category: "DEDICATED_DESK",
        capacity: 1,
        isActive: true,
      },
      {
        id: "res_2",
        name: "Executive Suite 1",
        category: "OFFICE_SUITE",
        capacity: 6,
        isActive: true,
      },
    );

    mockBookings.push({
      id: "bkg_1",
      reference: "DAIH-BKG-001",
      startTime: new Date("2026-09-01T09:00:00Z"),
      endTime: new Date("2026-09-01T17:00:00Z"),
      state: BookingState.CONFIRMED,
      totalAmount: 15000,
      price: 15000,
      resourceId: "res_1",
      resource: mockResources[0],
      user: {
        clientId: "DAIH-2026-0001",
        firstName: "Tunde",
        lastName: "Adeleke",
        email: "tunde@example.com",
      },
      createdAt: new Date("2026-09-01T08:30:00Z"),
    });

    mockTransactions.push({
      id: "tx_1",
      reference: "DAIH-TX-001",
      amount: 15000,
      status: PaymentStatus.SUCCESSFUL,
      type: "PAYMENT",
      method: "PAYSTACK",
      user: {
        clientId: "DAIH-2026-0001",
        firstName: "Tunde",
        lastName: "Adeleke",
        email: "tunde@example.com",
      },
      booking: mockBookings[0],
      createdAt: new Date("2026-09-01T08:30:00Z"),
    });

    mockUsers.push({
      id: "usr_1",
      clientId: "DAIH-2026-0001",
      firstName: "Tunde",
      lastName: "Adeleke",
      email: "tunde@example.com",
      phoneNumber: "+2348012345678",
      birthday: "1994-08-15",
      role: "CUSTOMER",
      isVerified: true,
      referralCode: "TUNDE-101",
      createdAt: new Date("2026-08-01T10:00:00Z"),
      bookings: [mockBookings[0]],
      transactions: [mockTransactions[0]],
    });
  });

  it("generates a valid CSV revenue and audit report with UTF-8 BOM", async () => {
    const report = await reportsService.generateExport({
      type: "revenue",
      format: "csv",
    });

    expect(report.contentType).toContain("text/csv");
    expect(report.filename).toContain("DAIH_REVENUE_REPORT");

    const text = report.buffer.toString("utf-8");
    expect(text).toContain("Transaction ID");
    expect(text).toContain("DAIH-TX-001");
    expect(text).toContain("Tunde Adeleke");
    expect(text).toContain("15000");
    expect(text).toContain("TOTAL REVENUE (SUCCESSFUL)");
  });

  it("generates a valid CSV bookings export with customer details and resource names", async () => {
    const report = await reportsService.generateExport({
      type: "bookings",
      format: "csv",
    });

    expect(report.contentType).toContain("text/csv");
    const text = report.buffer.toString("utf-8");
    expect(text).toContain("Booking ID");
    expect(text).toContain("DAIH-BKG-001");
    expect(text).toContain("Dedicated Desk Alpha");
  });

  it("generates a valid CSV customers report including Date of Birth", async () => {
    const report = await reportsService.generateExport({
      type: "customers",
      format: "csv",
    });

    expect(report.contentType).toContain("text/csv");
    expect(report.filename).toContain("DAIH_CUSTOMERS_REPORT");
    const text = report.buffer.toString("utf-8");
    expect(text).toContain("Date of Birth");
    expect(text).toContain("1994-08-15");
    expect(text).toContain("DAIH-2026-0001");
    expect(text).toContain("Tunde Adeleke");
  });

  it("generates a valid PDF export with branded DAIH letterhead and metrics", async () => {
    const report = await reportsService.generateExport({
      type: "revenue",
      format: "pdf",
    });

    expect(report.contentType).toBe("application/pdf");
    expect(report.filename).toContain(".pdf");
    expect(report.buffer.length).toBeGreaterThan(100);

    const pdfContent = report.buffer.toString("utf-8");
    expect(pdfContent).toContain("%PDF-1.4");
    expect(pdfContent).toContain("DAIH WORKSPACE PLATFORM -- REVENUE REPORT");
    expect(pdfContent).toContain("NGN 15,000");
    expect(pdfContent).toContain("%%EOF");
    expect(pdfContent).toContain("startxref");
    expect(pdfContent).toContain("xref");
  });

  it("generates valid PDF bookings and occupancy reports", async () => {
    const bkgReport = await reportsService.generateExport({
      type: "bookings",
      format: "pdf",
    });
    expect(bkgReport.contentType).toBe("application/pdf");
    expect(bkgReport.buffer.toString("utf-8")).toContain(
      "RESERVATION AUDIT LOG",
    );

    const occReport = await reportsService.generateExport({
      type: "occupancy",
      format: "pdf",
    });
    expect(occReport.contentType).toBe("application/pdf");
    expect(occReport.buffer.toString("utf-8")).toContain(
      "FACILITY UTILIZATION & DENSITY",
    );
  });

  it("generates a valid PDF customers report with Date of Birth and summary cards", async () => {
    const custReport = await reportsService.generateExport({
      type: "customers",
      format: "pdf",
    });
    expect(custReport.contentType).toBe("application/pdf");
    expect(custReport.filename).toContain("DAIH_CUSTOMERS_REPORT");
    const pdfStr = custReport.buffer.toString("utf-8");
    expect(pdfStr).toContain("%PDF-1.4");
    expect(pdfStr).toContain("MEMBER DIRECTORY & CUSTOMER AUDIT LOG");
    expect(pdfStr).toContain("DATE OF BIRTH");
    expect(pdfStr).toContain("1994-08-15");
    expect(pdfStr).toContain("TOTAL REGISTERED");
    expect(pdfStr).toContain("%%EOF");
  });
});
