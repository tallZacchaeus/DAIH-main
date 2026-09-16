import { UserRole } from "@prisma/client";
import { prisma } from "../db/client.js";
import { passwordService } from "../modules/identity/password.service.js";
import { clientIdService } from "../modules/identity/client-id.service.js";

async function createAdmin() {
  const email = "treasuresolatoye@gmail.com".toLowerCase().trim();
  const firstName = "Treasures";
  const lastName = "Olatoye";
  const plainPassword = "OlaTreasures@01";
  const role = UserRole.OPERATIONS_ADMIN;

  console.log(`Checking account for ${email}...`);

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  const passwordHash = await passwordService.hashPassword(plainPassword);

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName,
        lastName,
        role,
        isVerified: true,
        passwordHash,
        mfaEnabled: false,
        mfaMethod: null,
        mfaSecret: null,
      },
    });

    console.log(
      `Updated admin user successfully:\nID: ${updated.id}\nEmail: ${updated.email}\nName: ${updated.firstName} ${updated.lastName}\nRole: ${updated.role}\nClient ID: ${updated.clientId}\nMFA Enabled: ${updated.mfaEnabled}`,
    );
  } else {
    const clientId = await clientIdService.generateNextClientId(prisma);

    const created = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        passwordHash,
        clientId,
        role,
        isVerified: true,
        mfaEnabled: false,
        mfaMethod: null,
        mfaSecret: null,
      },
    });

    console.log(
      `Created admin user successfully:\nID: ${created.id}\nEmail: ${created.email}\nName: ${created.firstName} ${created.lastName}\nRole: ${created.role}\nClient ID: ${created.clientId}\nMFA Enabled: ${created.mfaEnabled}`,
    );
  }
}

createAdmin()
  .catch((e) => {
    console.error("Error creating admin user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
