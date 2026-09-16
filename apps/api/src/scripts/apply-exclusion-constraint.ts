import { prisma } from "../db/client.js";
import fs from "fs";
import path from "path";

async function applyExclusionConstraint() {
  console.log(
    "Applying PostgreSQL GiST exclusion constraint on bookings table...",
  );
  try {
    const candidatePaths = [
      path.join(
        process.cwd(),
        "apps/api/src/db/raw-sql/booking-exclusion-constraint.sql",
      ),
      path.join(
        process.cwd(),
        "src/db/raw-sql/booking-exclusion-constraint.sql",
      ),
    ];

    let sql = `
      CREATE EXTENSION IF NOT EXISTS btree_gist;
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS no_overlapping_active_bookings;
      ALTER TABLE "bookings" ADD CONSTRAINT no_overlapping_active_bookings 
        EXCLUDE USING gist (
          "resourceId" WITH =,
          tsrange("startTime", "endTime") WITH &&
        )
        WHERE ("state" IN ('HELD', 'PENDING_PAYMENT', 'CONFIRMED', 'ACTIVE', 'CHECKED_IN'));
    `;

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        sql = fs.readFileSync(p, "utf8");
        break;
      }
    }

    // Split statements and execute
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));

    for (const statement of statements) {
      console.log(`Executing SQL: ${statement.substring(0, 50)}...`);
      await prisma.$executeRawUnsafe(statement);
    }

    console.log(
      "✅ PostgreSQL GiST exclusion constraint successfully applied.",
    );
  } catch (err) {
    console.error("Failed to apply exclusion constraint:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyExclusionConstraint();
