import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { config } from "../config/env.js";

declare global {
  var prisma: PrismaClient | undefined;
  var pgPool: pg.Pool | undefined;
}

const pool =
  global.pgPool ||
  new pg.Pool({
    connectionString: config.databaseUrl,
    // Enough for concurrent API requests + worker + admin bulk queries
    max: 20,
    min: 0,
    // Release idle connections after 30s to reduce DB resource usage
    idleTimeoutMillis: 30000,
    // Generous connection timeout to accommodate Neon serverless cold starts / wake-ups
    connectionTimeoutMillis: 20000,
  });

pool.on("error", (err) => {
  console.warn("[PG_POOL] Idle client error:", err.message);
});

const adapter = new PrismaPg(pool);

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    errorFormat: "minimal",
    log: [
      { emit: "event", level: "error" },
      { emit: "event", level: "warn" },
    ],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
  global.pgPool = pool;
}
