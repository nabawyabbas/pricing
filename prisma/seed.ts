import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.log("ADMIN_USERNAME and ADMIN_PASSWORD not set in env. Skipping seed.");
    return;
  }

  // Check if User table is empty
  const userCount = await prisma.user.count();

  if (userCount > 0) {
    console.log("Users already exist. Skipping seed.");
    return;
  }

  // Create admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      username: adminUsername,
      passwordHash,
      role: "ADMIN" as const,
      isActive: true,
    },
  });

  console.log(`✓ Created admin user: ${adminUsername}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

