import { BookingState } from "@daih/types";

export class InvalidBookingStateTransitionError extends Error {
  public code = "INVALID_BOOKING_STATE_TRANSITION";
  public statusCode = 400;

  constructor(
    public fromState: BookingState,
    public toState: BookingState,
    public bookingId?: string,
    message?: string,
  ) {
    super(
      message ||
        `Cannot transition booking ${bookingId ? `'${bookingId}' ` : ""}from state '${fromState}' to '${toState}'`,
    );
    this.name = "InvalidBookingStateTransitionError";
  }
}

/**
 * Formal transition map for DAIH booking state machine.
 *
 * Graph:
 * DRAFT -> [HELD]
 * HELD -> [PENDING_PAYMENT, EXPIRED, CANCELLED, CONFIRMED (Admin Override)]
 * PENDING_PAYMENT -> [CONFIRMED, FAILED, EXPIRED, CANCELLED]
 * CONFIRMED -> [CHECKED_IN, CANCELLED, NO_SHOW, ACTIVE]
 * ACTIVE -> [CHECKED_IN, CHECKED_OUT, COMPLETED]
 * CHECKED_IN -> [CHECKED_OUT, COMPLETED]
 * CHECKED_OUT -> [COMPLETED]
 * CANCELLED | NO_SHOW | EXPIRED | COMPLETED -> Terminal states
 */
export const ALLOWED_TRANSITIONS: Record<BookingState, BookingState[]> = {
  [BookingState.DRAFT]: [BookingState.HELD],
  [BookingState.HELD]: [
    BookingState.PENDING_PAYMENT,
    BookingState.EXPIRED,
    BookingState.CANCELLED,
    BookingState.CONFIRMED, // Admin override or instant confirmation
  ],
  [BookingState.PENDING_PAYMENT]: [
    BookingState.CONFIRMED,
    BookingState.EXPIRED,
    BookingState.CANCELLED,
  ],
  [BookingState.CONFIRMED]: [
    BookingState.ACTIVE,
    BookingState.CHECKED_IN,
    BookingState.NO_SHOW,
    BookingState.COMPLETED,
  ],
  [BookingState.ACTIVE]: [
    BookingState.CHECKED_IN,
    BookingState.CHECKED_OUT,
    BookingState.COMPLETED,
  ],
  [BookingState.CHECKED_IN]: [BookingState.CHECKED_OUT, BookingState.COMPLETED],
  [BookingState.CHECKED_OUT]: [
    BookingState.CHECKED_IN, // Member re-entry before scheduled endTime
    BookingState.COMPLETED,
  ],
  [BookingState.COMPLETED]: [],
  [BookingState.CANCELLED]: [],
  [BookingState.REFUND_PENDING]: [],
  [BookingState.REFUNDED]: [],
  [BookingState.EXPIRED]: [
    // Recovers to CONFIRMED if slot free; transitions to NO_SHOW with conflict alert if occupied
    BookingState.CONFIRMED,
    BookingState.NO_SHOW,
  ],
  [BookingState.NO_SHOW]: [
    // Permitted exclusively through Admin Discretionary Rescheduling
    BookingState.CONFIRMED,
  ],
};

/**
 * Checks whether transitioning from `fromState` to `toState` is permitted.
 */
export function isValidTransition(
  fromState: BookingState,
  toState: BookingState,
): boolean {
  if (fromState === toState) return true;
  const allowed = ALLOWED_TRANSITIONS[fromState] || [];
  return allowed.includes(toState);
}

/**
 * Asserts valid transition, throwing a typed error if invalid.
 */
export function assertValidTransition(
  fromState: BookingState,
  toState: BookingState,
  bookingId?: string,
): void {
  if (!isValidTransition(fromState, toState)) {
    throw new InvalidBookingStateTransitionError(fromState, toState, bookingId);
  }
}

/**
 * States considered active for reservation locking and overlap prevention.
 */
export const ACTIVE_BOOKING_STATES: BookingState[] = [
  BookingState.HELD,
  BookingState.PENDING_PAYMENT,
  BookingState.CONFIRMED,
  BookingState.ACTIVE,
  BookingState.CHECKED_IN,
  BookingState.CHECKED_OUT,
];

export function isActiveHoldOrBooking(
  state: BookingState,
  holdExpiresAt?: Date | null,
): boolean {
  if (!ACTIVE_BOOKING_STATES.includes(state)) {
    return false;
  }
  // For holds or pending payment, verify hold expiration
  if (
    (state === BookingState.HELD || state === BookingState.PENDING_PAYMENT) &&
    holdExpiresAt
  ) {
    return new Date(holdExpiresAt) > new Date();
  }
  return true;
}
