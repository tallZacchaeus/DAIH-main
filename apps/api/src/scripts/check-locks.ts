import { prisma } from "../db/client.js";

async function main() {
  const locks: any = await prisma.$queryRawUnsafe(`
    SELECT pid, locktype, mode, granted 
    FROM pg_locks 
    WHERE locktype = 'advisory'
  `);
  console.log("Advisory Locks:", locks);

  const conns: any = await prisma.$queryRawUnsafe(`
    SELECT pid, state, query, age(clock_timestamp(), query_start) 
    FROM pg_stat_activity 
    WHERE pid != pg_backend_pid()
  `);
  console.log("Other Connections:", conns);

  // Terminate any connection holding an advisory lock
  for (const lock of locks) {
    console.log(`Terminating pid holding advisory lock: ${lock.pid}`);
    await prisma.$queryRawUnsafe(`SELECT pg_terminate_backend(${lock.pid})`);
  }
}

main()
  .catch((err) => console.error(err))
  .finally(() => process.exit(0));
