import { UserRole } from "@prisma/client";
import { prisma } from "../db/client.js";
import { config } from "../config/env.js";
import { passwordService } from "../modules/identity/password.service.js";
import { clientIdService } from "../modules/identity/client-id.service.js";

async function seedSuperAdmin() {
  console.log("🌱 Checking Super Administrator account...");

  const { email, password, firstName, lastName, phoneNumber } =
    config.superAdmin;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  const passwordHash = await passwordService.hashPassword(password);

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
        passwordHash,
      },
    });

    console.log(
      `✅ Super Administrator account updated successfully: ${updated.email} (${updated.clientId})`,
    );
  } else {
    const clientId = await clientIdService.generateNextClientId(prisma);

    const created = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        phoneNumber,
        passwordHash,
        clientId,
        role: UserRole.SUPER_ADMIN,
        isVerified: true,
      },
    });

    console.log(
      `✅ Super Administrator account created successfully: ${created.email} (${created.clientId})`,
    );
  }
}

seedSuperAdmin()
  .catch((e) => {
    console.error("❌ Error seeding Super Administrator:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
