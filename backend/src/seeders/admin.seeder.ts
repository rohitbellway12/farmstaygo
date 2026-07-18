import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../config/database.js";

const seedAdmin = async (): Promise<void> => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required in .env"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: {
      email,
    },

    update: {
      firstName: "Super",
      lastName: "Admin",
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },

    create: {
      firstName: "Super",
      lastName: "Admin",
      email,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
    },
  });

  console.log("Admin account ready:");
  console.table(admin);
};

seedAdmin()
  .catch((error) => {
    console.error("Admin seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });