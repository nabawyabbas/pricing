#!/usr/bin/env node

/**
 * One-time script to create an admin user
 * Usage: node scripts/create-admin.js <username> <password>
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error("Usage: node scripts/create-admin.js <username> <password>");
    process.exit(1);
  }

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { username },
    });

    if (existing) {
      console.error(`User "${username}" already exists!`);
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    console.log(`✓ Created admin user: ${username}`);
    console.log(`  ID: ${user.id}`);
    console.log(`  Role: ${user.role}`);
  } catch (error) {
    console.error("Error creating user:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

