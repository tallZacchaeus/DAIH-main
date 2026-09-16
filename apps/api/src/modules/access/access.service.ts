import { accessRepository, AccessRepository } from "./access.repository.js";
import { verifyAndParseQrToken } from "./qr-token.util.js";
import {
  BookingState,
  AccessRejectionReason,
  VerifyAccessPassResponse,
  AccessPassDetails,
  CheckInResultDTO,
  CheckOutResultDTO,
  WifiCredentialDTO,
  WifiAccessStatus,
  ReceptionTerminalSummaryDTO,
  VisitActivityResponse,
} from "@daih/types";

import { assertValidTransition } from "../booking/booking.state-machine.js";
import { prisma } from "../../db/client.js";
import { outboxService } from "../events/outbox.service.js";

export class AccessService {
  constructor(private repo: AccessRepository = accessRepository) {}

  /**
   * Helper to format Wi-Fi credentials for an active booking on a specific calendar day
   */
  public generateWifiCredentials(
    booking: any,
    forDate: Date = new Date(),
  ): WifiCredentialDTO {
    const rawRef = (booking.reference || booking.id || "DAIH")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    const todayStr = `${forDate.getFullYear()}${String(forDate.getMonth() + 1).padStart(2, "0")}${String(forDate.getDate()).padStart(2, "0")}`;
    const seed = `${rawRef}_${todayStr}`;

    // Generate clean 6-digit PIN derived from reference + day
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const pin = Math.abs((hash % 900000) + 100000).toString();

    // Validity: end of the given day (23:59:59.999) or booking endTime, whichever is earlier
    const endOfToday = new Date(forDate);
    endOfToday.setHours(23, 59, 59, 999);

    const bookingEnd =
      booking.endTime instanceof Date
        ? booking.endTime
        : new Date(booking.endTime);

    const validUntilDate = bookingEnd < endOfToday ? bookingEnd : endOfToday;

    return {
      ssid: "DAIH-Member-HighSpeed",
      username: `daih_${rawRef}`,
      pin,
      validUntil: validUntilDate.toISOString(),
      status: "ACTIVE",
      instructions:
        "Connect to 'DAIH-Member-HighSpeed' and enter your assigned username and PIN. Access remains active until the end of today.",
    };
  }

  /**
   * Format booking into standard AccessPassDetails
   */
  private formatPassDetails(
    booking: any,
    activeVisitSession?: any,
    now: Date = new Date(),
  ): AccessPassDetails {
    const customerName = booking.user
      ? `${booking.user.firstName || ""} ${booking.user.lastName || ""}`.trim() ||
        booking.user.email
      : "DAIH Member";

    const bookingStart =
      booking.startTime instanceof Date
        ? booking.startTime
        : new Date(booking.startTime);
    const bookingEnd =
      booking.endTime instanceof Date
        ? booking.endTime
        : new Date(booking.endTime);

    // Check if user checked in today
    const sessions = booking.visitSessions || [];
    const hasTodayVisit = sessions.some((v: any) => {
      const checkInDate =
        v.checkInTime instanceof Date ? v.checkInTime : new Date(v.checkInTime);
      return checkInDate.toDateString() === now.toDateString();
    });

    const hasTodayCheckedInAt = booking.checkedInAt
      ? (booking.checkedInAt instanceof Date
          ? booking.checkedInAt
          : new Date(booking.checkedInAt)
        ).toDateString() === now.toDateString()
      : false;

    const checkedInToday = Boolean(
      hasTodayVisit ||
      hasTodayCheckedInAt ||
      (activeVisitSession &&
        new Date(activeVisitSession.checkInTime).toDateString() ===
          now.toDateString()),
    );

    const isConfirmedOrActive = [
      BookingState.CONFIRMED,
      BookingState.ACTIVE,
      BookingState.CHECKED_IN,
      BookingState.CHECKED_OUT,
    ].includes(booking.state as BookingState);

    const isSubscriptionExpired =
      now >= bookingEnd ||
      [
        BookingState.COMPLETED,
        BookingState.EXPIRED,
        BookingState.CANCELLED,
        BookingState.REFUNDED,
      ].includes(booking.state as BookingState);

    let wifiStatus: WifiAccessStatus = "LOCKED_NO_PASS";
    let wifiCredentials: WifiCredentialDTO | null = null;

    if (isSubscriptionExpired) {
      wifiStatus = "EXPIRED";
      wifiCredentials = null;
    } else if (isConfirmedOrActive && checkedInToday) {
      wifiStatus = "ACTIVE";
      wifiCredentials = this.generateWifiCredentials(booking, now);
    } else if (isConfirmedOrActive && !checkedInToday) {
      wifiStatus = "LOCKED_PENDING_DAILY_CHECKIN";
      wifiCredentials = null;
    }

    return {
      bookingId: booking.id,
      reference: booking.reference,
      resourceId: booking.resourceId,
      resourceName: booking.resource?.name || "Workspace Resource",
      category: booking.resource?.category,
      userId: booking.userId,
      clientId: booking.user?.clientId,
      customerName,
      customerEmail: booking.user?.email,
      customerPhone: booking.user?.phoneNumber || undefined,
      startTime: bookingStart.toISOString(),
      endTime: bookingEnd.toISOString(),
      state: booking.state as BookingState,
      checkedInAt: booking.checkedInAt
        ? booking.checkedInAt instanceof Date
          ? booking.checkedInAt.toISOString()
          : String(booking.checkedInAt)
        : null,
      checkedOutAt: booking.checkedOutAt
        ? booking.checkedOutAt instanceof Date
          ? booking.checkedOutAt.toISOString()
          : String(booking.checkedOutAt)
        : null,
      checkedInToday,
      activeVisitSession: activeVisitSession
        ? {
            id: activeVisitSession.id,
            bookingId: activeVisitSession.bookingId,
            userId: activeVisitSession.userId,
            staffUserId: activeVisitSession.staffUserId,
            terminalId: activeVisitSession.terminalId,
            checkInTime:
              activeVisitSession.checkInTime instanceof Date
                ? activeVisitSession.checkInTime.toISOString()
                : String(activeVisitSession.checkInTime),
            checkOutTime: activeVisitSession.checkOutTime
              ? activeVisitSession.checkOutTime instanceof Date
                ? activeVisitSession.checkOutTime.toISOString()
                : String(activeVisitSession.checkOutTime)
              : null,
            ipAddress: activeVisitSession.ipAddress,
            notes: activeVisitSession.notes,
            createdAt:
              activeVisitSession.createdAt instanceof Date
                ? activeVisitSession.createdAt.toISOString()
                : String(activeVisitSession.createdAt),
            updatedAt:
              activeVisitSession.updatedAt instanceof Date
                ? activeVisitSession.updatedAt.toISOString()
                : String(activeVisitSession.updatedAt),
          }
        : null,
      visitCount: booking.visitSessions?.length || (activeVisitSession ? 1 : 0),
      wifiStatus,
      wifiCredentials,
    };
  }

  /**
   * Verify digital access pass from scanned QR token or direct booking lookup
   */
  async verifyPass(
    tokenOrReference: string,
  ): Promise<VerifyAccessPassResponse> {
    const rawInput = (tokenOrReference || "").trim();
    if (!rawInput) {
      return {
        valid: false,
        rejectionReason: AccessRejectionReason.INVALID_SIGNATURE,
        rejectionTitle: "Empty Token",
        rejectionMessage: "No QR pass token was provided for verification.",
      };
    }

    let booking: any = null;

    // 1. Try resolving if input is a signed QR token
    if (
      rawInput.startsWith("daih_pass_v1.") ||
      rawInput.startsWith("daih_qr_")
    ) {
      const parseResult = verifyAndParseQrToken(rawInput);
      if (!parseResult.valid) {
        return {
          valid: false,
          rejectionReason: AccessRejectionReason.INVALID_SIGNATURE,
          rejectionTitle: "Tampered or Forged Pass",
          rejectionMessage:
            parseResult.message ||
            "The cryptographic signature on this digital pass could not be verified.",
        };
      }

      // Find booking using parsed booking ID or reference or stored token
      booking = await this.repo.findBookingByToken(rawInput);
      if (!booking && parseResult.payload?.bookingId) {
        booking = await this.repo.findBookingByIdOrReference(
          parseResult.payload.bookingId,
        );
      }
    } else {
      // Direct lookup by reference or ID (manual search at reception)
      booking = await this.repo.findBookingByIdOrReference(rawInput);
    }

    // 2. Booking Existence Check
    if (!booking) {
      return {
        valid: false,
        rejectionReason: AccessRejectionReason.BOOKING_NOT_FOUND,
        rejectionTitle: "Pass Not Found",
        rejectionMessage: `No reservation matching reference or token '${rawInput}' was found in the DAIH system.`,
      };
    }

    const now = new Date();
    const startTime = new Date(booking.startTime);
    const endTime = new Date(booking.endTime);
    const activeVisit = (booking.visitSessions || []).find(
      (v: any) => v.checkOutTime === null,
    );

    const passDetails = this.formatPassDetails(booking, activeVisit);

    // 3. Evaluate State Rejections
    if (
      [
        BookingState.DRAFT,
        BookingState.HELD,
        BookingState.PENDING_PAYMENT,
      ].includes(booking.state as BookingState)
    ) {
      return {
        valid: false,
        rejectionReason: AccessRejectionReason.UNPAID,
        rejectionTitle: "Payment Required / Unpaid Booking",
        rejectionMessage:
          "This booking has not been confirmed. Digital access passes are issued only after payment confirmation.",
        booking: passDetails,
        canCheckIn: false,
        canCheckOut: false,
      };
    }

    if (
      [
        BookingState.CANCELLED,
        BookingState.REFUND_PENDING,
        BookingState.REFUNDED,
      ].includes(booking.state as BookingState)
    ) {
      return {
        valid: false,
        rejectionReason: AccessRejectionReason.CANCELLED,
        rejectionTitle: "Booking Cancelled",
        rejectionMessage:
          "This reservation has been cancelled or refunded and cannot be used for workspace access.",
        booking: passDetails,
        canCheckIn: false,
        canCheckOut: false,
      };
    }

    if (booking.state === BookingState.COMPLETED) {
      return {
        valid: false,
        rejectionReason: AccessRejectionReason.COMPLETED,
        rejectionTitle: "Pass Already Completed",
        rejectionMessage:
          "This reservation has reached final completion and is no longer valid for workspace access.",
        booking: passDetails,
        canCheckIn: false,
        canCheckOut: false,
      };
    }

    // 4. Time Window Evaluation
    // Strict Early Check-In Rejection: check-in is blocked before startTime
    if (now < startTime) {
      return {
        valid: false,
        rejectionReason: AccessRejectionReason.TOO_EARLY,
        rejectionTitle: "Early Check-In Prohibited",
        rejectionMessage: `Check-in is scheduled to open at ${startTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Early check-in is strictly blocked.`,
        rejectionDetails: {
          scheduledStartTime: startTime.toISOString(),
          scheduledEndTime: endTime.toISOString(),
          policyNotice:
            "DAIH Policy: Check-in initiates authorized internet credentials and workspace duration. Access is permitted strictly during scheduled reservation hours.",
        },
        booking: passDetails,
        canCheckIn: false,
        canCheckOut: false,
      };
    }

    // Expired / No-Show Evaluation (now >= endTime)
    if (now >= endTime) {
      const wasNeverRedeemed =
        !booking.checkedInAt || booking.state === BookingState.NO_SHOW;

      if (wasNeverRedeemed) {
        return {
          valid: false,
          rejectionReason: AccessRejectionReason.NO_SHOW,
          rejectionTitle: "Unredeemed No-Show Pass",
          rejectionMessage:
            "This booking slot expired without being redeemed. Access passes cannot be scanned after scheduled end time.",
          rejectionDetails: {
            scheduledStartTime: startTime.toISOString(),
            scheduledEndTime: endTime.toISOString(),
            policyNotice:
              "DAIH Strict No-Refund Policy: Missed booking slots without prior notice are non-refundable. Super Administrators or Operations Managers may grant discretionary rescheduling.",
            auditProof: {
              bookingReference: booking.reference,
              unredeemedWindow: `${startTime.toISOString()} to ${endTime.toISOString()}`,
              scannedAt: now.toISOString(),
              receptionTerminal: "REC-GATE-01",
            },
            adminRescheduleAvailable: true,
          },
          booking: passDetails,
          canCheckIn: false,
          canCheckOut: false,
        };
      }

      return {
        valid: false,
        rejectionReason: AccessRejectionReason.EXPIRED,
        rejectionTitle: "Access Pass Expired",
        rejectionMessage:
          "The allocated booking duration for this pass has ended.",
        rejectionDetails: {
          scheduledStartTime: startTime.toISOString(),
          scheduledEndTime: endTime.toISOString(),
        },
        booking: passDetails,
        canCheckIn: false,
        canCheckOut: false,
      };
    }

    // 5. Valid Active Window (startTime <= now < endTime)
    const sessions = booking.visitSessions || [];
    const isCheckedInToday = sessions.some((v: any) => {
      const checkInDate =
        v.checkInTime instanceof Date ? v.checkInTime : new Date(v.checkInTime);
      return checkInDate.toDateString() === now.toDateString();
    });

    const isCurrentlyCheckedIn =
      booking.state === BookingState.CHECKED_IN && isCheckedInToday;
    const isCheckedOut =
      booking.state === BookingState.CHECKED_OUT ||
      (booking.state === BookingState.CHECKED_IN && !isCheckedInToday);

    return {
      valid: true,
      booking: passDetails,
      canCheckIn: !isCurrentlyCheckedIn,
      canCheckOut: isCurrentlyCheckedIn,
      isReEntry: isCheckedOut,
    };
  }

  /**
   * Process Check-In at reception/gate
   */
  async checkIn(
    bookingIdOrRef: string,
    options: {
      staffUserId?: string | null;
      terminalId?: string;
      ipAddress?: string;
      notes?: string;
    } = {},
  ): Promise<CheckInResultDTO> {
    const booking = await this.repo.findBookingByIdOrReference(bookingIdOrRef);
    if (!booking) {
      const err: any = new Error(`Booking '${bookingIdOrRef}' not found`);
      err.statusCode = 404;
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }

    const now = new Date();
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);

    // Enforce strict time window
    if (now < start) {
      const err: any = new Error(
        `Cannot check in before scheduled start time (${start.toISOString()})`,
      );
      err.statusCode = 400;
      err.code = "TOO_EARLY";
      throw err;
    }

    if (now >= end) {
      const err: any = new Error(
        `Cannot check in: scheduled booking window has ended (${end.toISOString()})`,
      );
      err.statusCode = 400;
      err.code = "EXPIRED";
      throw err;
    }

    const sessions = booking.visitSessions || [];
    const checkedInToday = sessions.some((v: any) => {
      const checkInDate =
        v.checkInTime instanceof Date ? v.checkInTime : new Date(v.checkInTime);
      return checkInDate.toDateString() === now.toDateString();
    });

    const isSameDayCheckedIn =
      booking.state === BookingState.CHECKED_IN && checkedInToday;

    if (isSameDayCheckedIn) {
      const err: any = new Error(
        `Booking '${booking.reference}' is already checked in today`,
      );
      err.statusCode = 400;
      err.code = "ALREADY_CHECKED_IN";
      throw err;
    }

    assertValidTransition(
      booking.state as BookingState,
      BookingState.CHECKED_IN,
      booking.id,
    );

    const isFirstCheckIn = !booking.checkedInAt;
    const isReEntry =
      booking.state === BookingState.CHECKED_OUT ||
      (booking.state === BookingState.CHECKED_IN && !checkedInToday);

    // Transactional check-in: update booking & create visit session & audit log
    const { updatedBooking, visitSession } = await prisma.$transaction(
      async (tx) => {
        const b = await tx.booking.update({
          where: { id: booking.id },
          data: {
            state: BookingState.CHECKED_IN,
            ...(isFirstCheckIn ? { checkedInAt: now } : {}),
          },
          include: {
            resource: true,
            user: true,
            visitSessions: {
              orderBy: { checkInTime: "desc" },
            },
          },
        });

        const vs = await tx.visitSession.create({
          data: {
            bookingId: booking.id,
            userId: booking.userId,
            staffUserId: options.staffUserId,
            terminalId: options.terminalId || "REC-GATE-01",
            checkInTime: now,
            ipAddress: options.ipAddress,
            notes: options.notes,
          },
        });

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: options.staffUserId || null,
            action: isReEntry
              ? "ACCESS_MEMBER_RE_CHECK_IN"
              : "ACCESS_MEMBER_CHECK_IN",
            entityType: "Booking",
            entityId: booking.id,
            metadata: {
              bookingReference: booking.reference,
              terminalId: options.terminalId || "REC-GATE-01",
              isReEntry,
              checkInTime: now.toISOString(),
              notes: options.notes,
            },
            ipAddress: options.ipAddress,
          },
        });

        // Outbox event
        await outboxService.recordEvent(
          {
            eventType: "access.checked_in",
            aggregateType: "Booking",
            aggregateId: booking.id,
            payload: {
              bookingId: booking.id,
              reference: booking.reference,
              userId: booking.userId,
              customerEmail: booking.user?.email,
              customerName:
                `${booking.user?.firstName || ""} ${booking.user?.lastName || ""}`.trim() ||
                booking.user?.email,
              resourceName: booking.resource?.name || "Workspace",
              terminalId: options.terminalId || "REC-GATE-01",
              staffUserId: options.staffUserId,
              isReEntry,
              checkInTime: now.toISOString(),
              endTime: end.toISOString(),
            },
          },
          tx,
        );

        return { updatedBooking: b, visitSession: vs };
      },
    );

    const wifiCredentials = this.generateWifiCredentials(updatedBooking);
    const passDetails = this.formatPassDetails(updatedBooking, visitSession);

    return {
      success: true,
      action: "CHECKED_IN",
      isReEntry,
      booking: passDetails,
      visitSession: {
        id: visitSession.id,
        bookingId: visitSession.bookingId,
        userId: visitSession.userId,
        staffUserId: visitSession.staffUserId,
        terminalId: visitSession.terminalId,
        checkInTime: visitSession.checkInTime.toISOString(),
        checkOutTime: null,
        ipAddress: visitSession.ipAddress,
        notes: visitSession.notes,
        createdAt: visitSession.createdAt.toISOString(),
        updatedAt: visitSession.updatedAt.toISOString(),
      },
      wifiCredentials,
      timestamp: now.toISOString(),
    };
  }

  /**
   * Process Check-Out at reception/gate
   */
  async checkOut(
    bookingIdOrRef: string,
    options: {
      staffUserId?: string | null;
      terminalId?: string;
      ipAddress?: string;
      notes?: string;
    } = {},
  ): Promise<CheckOutResultDTO> {
    const booking = await this.repo.findBookingByIdOrReference(bookingIdOrRef);
    if (!booking) {
      const err: any = new Error(`Booking '${bookingIdOrRef}' not found`);
      err.statusCode = 404;
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }

    if (booking.state !== BookingState.CHECKED_IN) {
      const err: any = new Error(
        `Cannot check out: booking '${booking.reference}' is not currently checked in (current state: ${booking.state})`,
      );
      err.statusCode = 400;
      err.code = "NOT_CHECKED_IN";
      throw err;
    }

    assertValidTransition(
      booking.state as BookingState,
      BookingState.CHECKED_OUT,
      booking.id,
    );

    const now = new Date();
    const end = new Date(booking.endTime);

    const { updatedBooking, visitSession } = await prisma.$transaction(
      async (tx) => {
        const b = await tx.booking.update({
          where: { id: booking.id },
          data: {
            state: BookingState.CHECKED_OUT,
            checkedOutAt: now,
          },
          include: {
            resource: true,
            user: true,
            visitSessions: {
              orderBy: { checkInTime: "desc" },
            },
          },
        });

        // Find active open session
        const activeVs = await tx.visitSession.findFirst({
          where: {
            bookingId: booking.id,
            checkOutTime: null,
          },
          orderBy: { checkInTime: "desc" },
        });

        let vs: any = null;
        if (activeVs) {
          vs = await tx.visitSession.update({
            where: { id: activeVs.id },
            data: {
              checkOutTime: now,
              notes: options.notes ? options.notes : undefined,
            },
          });
        } else {
          vs = await tx.visitSession.create({
            data: {
              bookingId: booking.id,
              userId: booking.userId,
              staffUserId: options.staffUserId,
              terminalId: options.terminalId || "REC-GATE-01",
              checkInTime: booking.checkedInAt || now,
              checkOutTime: now,
              ipAddress: options.ipAddress,
              notes: options.notes,
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            userId: options.staffUserId || null,
            action: "ACCESS_MEMBER_CHECK_OUT",
            entityType: "Booking",
            entityId: booking.id,
            metadata: {
              bookingReference: booking.reference,
              terminalId: options.terminalId || "REC-GATE-01",
              checkOutTime: now.toISOString(),
              scheduledEndTime: end.toISOString(),
              notes: options.notes,
            },
            ipAddress: options.ipAddress,
          },
        });

        // Outbox event
        await outboxService.recordEvent(
          {
            eventType: "access.checked_out",
            aggregateType: "Booking",
            aggregateId: booking.id,
            payload: {
              bookingId: booking.id,
              reference: booking.reference,
              userId: booking.userId,
              customerEmail: booking.user?.email,
              customerName:
                `${booking.user?.firstName || ""} ${booking.user?.lastName || ""}`.trim() ||
                booking.user?.email,
              resourceName: booking.resource?.name || "Workspace",
              terminalId: options.terminalId || "REC-GATE-01",
              staffUserId: options.staffUserId,
              departureTime: now.toISOString(),
              scheduledEndTime: end.toISOString(),
            },
          },
          tx,
        );

        return { updatedBooking: b, visitSession: vs };
      },
    );

    const passDetails = this.formatPassDetails(updatedBooking, null);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    const validUntilDate = end < endOfToday ? end : endOfToday;

    return {
      success: true,
      action: "CHECKED_OUT",
      booking: passDetails,
      visitSession: {
        id: visitSession.id,
        bookingId: visitSession.bookingId,
        userId: visitSession.userId,
        staffUserId: visitSession.staffUserId,
        terminalId: visitSession.terminalId,
        checkInTime: visitSession.checkInTime.toISOString(),
        checkOutTime: visitSession.checkOutTime
          ? visitSession.checkOutTime.toISOString()
          : now.toISOString(),
        ipAddress: visitSession.ipAddress,
        notes: visitSession.notes,
        createdAt: visitSession.createdAt.toISOString(),
        updatedAt: visitSession.updatedAt.toISOString(),
      },
      timestamp: now.toISOString(),
      wifiStatus: "CONTINUOUS_ACTIVE_UNTIL_END_TIME",
      wifiValidUntil: validUntilDate.toISOString(),
    };
  }

  /**
   * Search bookings for reception manual search
   */
  async searchBookings(query: string) {
    const results = await this.repo.searchBookings(query);
    return results.map((b) => this.formatPassDetails(b));
  }

  /**
   * Get terminal activity feed
   */
  async getTerminalActivity(options: {
    terminalId?: string;
    limit?: number;
    offset?: number;
  }) {
    const raw = await this.repo.getTerminalActivity(options);
    return raw.map((item) => {
      const action = item.checkOutTime ? "CHECK_OUT" : "CHECK_IN";
      const customerName = item.user
        ? `${item.user.firstName || ""} ${item.user.lastName || ""}`.trim() ||
          item.user.email
        : "DAIH Member";

      return {
        id: item.id,
        bookingId: item.bookingId,
        bookingReference: item.booking?.reference || "N/A",
        customerName,
        clientId: item.user?.clientId,
        resourceName: item.booking?.resource?.name || "Workspace Resource",
        action,
        timestamp: (item.checkOutTime || item.checkInTime).toISOString(),
        terminalId: item.terminalId || "REC-GATE-01",
        staffName: item.staffUserId || undefined,
        notes: item.notes || undefined,
      };
    });
  }

  /**
   * Get filtered and paginated visits activity for log audit
   */
  async getVisitsActivity(options: {
    terminalId?: string;
    startDate?: string;
    endDate?: string;
    status?: "ALL" | "ON_SITE" | "CHECKED_OUT";
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<VisitActivityResponse> {
    const { items, total, currentlyOnSiteCount, todayTotalCount } =
      await this.repo.getVisitsActivity(options);

    const mappedItems = items.map((item) => {
      const checkInDate = new Date(item.checkInTime);
      const checkOutDate = item.checkOutTime
        ? new Date(item.checkOutTime)
        : null;
      const durationMinutes = checkOutDate
        ? Math.max(
            0,
            Math.round(
              (checkOutDate.getTime() - checkInDate.getTime()) / 60000,
            ),
          )
        : Math.max(0, Math.round((Date.now() - checkInDate.getTime()) / 60000));

      const customerName = item.user
        ? `${item.user.firstName || ""} ${item.user.lastName || ""}`.trim() ||
          item.user.email
        : "DAIH Member";

      return {
        id: item.id,
        bookingId: item.bookingId,
        bookingReference: item.booking?.reference || "N/A",
        userId: item.userId,
        customerName,
        customerEmail: item.user?.email || "",
        customerPhone: item.user?.phoneNumber || null,
        clientId: item.user?.clientId || null,
        resourceName: item.booking?.resource?.name || "Workspace Resource",
        resourceCategory: item.booking?.resource?.category || null,
        checkInTime: checkInDate.toISOString(),
        checkOutTime: checkOutDate ? checkOutDate.toISOString() : null,
        durationMinutes,
        isOnSite: item.checkOutTime === null,
        terminalId: item.terminalId || "REC-GATE-01",
        staffName: item.staffUserId || undefined,
        notes: item.notes || undefined,
      };
    });

    return {
      items: mappedItems,
      total,
      currentlyOnSiteCount,
      todayTotalCount,
    };
  }

  /**
   * Get live occupancy statistics
   */
  async getLiveOccupancy() {
    return this.repo.getLiveOccupancy();
  }

  /**
   * Consolidated Reception Terminal Telemetry Summary
   * Returns shift metrics, live occupancy by resource, and recent activity
   * in a single fast database round-trip.
   */
  async getTerminalSummary(options?: {
    terminalId?: string;
  }): Promise<ReceptionTerminalSummaryDTO> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const [
      resources,
      checkedInBookings,
      rawActivity,
      todayCheckedInCount,
      todayDeparturesCount,
      expectedArrivalsRemaining,
    ] = await Promise.all([
      prisma.facilityResource.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.booking.findMany({
        where: { state: BookingState.CHECKED_IN },
        select: { resourceId: true },
      }),
      prisma.visitSession.findMany({
        where: options?.terminalId ? { terminalId: options.terminalId } : {},
        include: {
          booking: {
            include: {
              resource: true,
              user: true,
            },
          },
          user: true,
        },
        orderBy: { checkInTime: "desc" },
        take: 10,
      }),
      prisma.booking.count({
        where: {
          checkedInAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.booking.count({
        where: {
          checkedOutAt: { gte: todayStart, lte: todayEnd },
        },
      }),
      prisma.booking.count({
        where: {
          state: { in: [BookingState.CONFIRMED, BookingState.HELD] },
          startTime: { gte: todayStart, lte: todayEnd },
          checkedInAt: null,
        },
      }),
    ]);

    const occupancyByResource = new Map<string, number>();
    checkedInBookings.forEach((b) => {
      occupancyByResource.set(
        b.resourceId,
        (occupancyByResource.get(b.resourceId) || 0) + 1,
      );
    });

    let totalCapacity = 0;
    let totalCheckedIn = 0;

    const resourceItems = resources.map((r) => {
      const current = occupancyByResource.get(r.id) || 0;
      totalCapacity += r.capacity;
      totalCheckedIn += current;
      const available = Math.max(0, r.capacity - current);
      const rate =
        r.capacity > 0 ? Math.round((current / r.capacity) * 100) : 0;

      return {
        resourceId: r.id,
        resourceName: r.name,
        category: r.category,
        capacity: r.capacity,
        currentOccupancy: current,
        availableSpots: available,
        occupancyRate: rate,
      };
    });

    const overallRate =
      totalCapacity > 0
        ? Math.round((totalCheckedIn / totalCapacity) * 100)
        : 0;

    const formattedActivity = rawActivity.map((item) => {
      const action = item.checkOutTime ? "CHECK_OUT" : "CHECK_IN";
      const customerName = item.user
        ? `${item.user.firstName || ""} ${item.user.lastName || ""}`.trim() ||
          item.user.email
        : "DAIH Member";

      return {
        id: item.id,
        bookingId: item.bookingId,
        bookingReference: item.booking?.reference || "N/A",
        customerName,
        clientId: item.user?.clientId,
        resourceName: item.booking?.resource?.name || "Workspace Resource",
        action: action as any,
        timestamp: (item.checkOutTime || item.checkInTime).toISOString(),
        terminalId: item.terminalId || "REC-GATE-01",
        staffName: item.staffUserId || undefined,
        notes: item.notes || undefined,
      };
    });

    return {
      shiftMetrics: {
        todayCheckedInCount,
        currentlyOnSiteCount: totalCheckedIn,
        todayDeparturesCount,
        expectedArrivalsRemaining,
        totalShiftCapacity: totalCapacity,
        occupancyRate: overallRate,
      },
      occupancy: {
        totalCapacity,
        totalCheckedIn,
        overallOccupancyRate: overallRate,
        timestamp: now.toISOString(),
        resources: resourceItems,
      },
      recentActivity: formattedActivity,
      timestamp: now.toISOString(),
    };
  }
}

export const accessService = new AccessService();
