-- PostgreSQL GiST Range Exclusion Constraint for Booking Engine (Milestone 1.3)
-- Prevents overlapping active reservations for single-capacity resources at the database level

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Drop existing constraint if present
ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS no_overlapping_active_bookings;

-- Add GiST exclusion constraint on (resourceId, tsrange(startTime, endTime))
-- Filter to active states only: HELD, PENDING_PAYMENT, CONFIRMED, ACTIVE, CHECKED_IN
ALTER TABLE "bookings"
ADD CONSTRAINT no_overlapping_active_bookings
EXCLUDE USING gist (
  "resourceId" WITH =,
  tsrange("startTime", "endTime") WITH &&
)
WHERE ("state" IN ('HELD', 'PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN'));
