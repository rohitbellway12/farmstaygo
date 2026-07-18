import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../config/database.js";

const seedVendor = async (): Promise<void> => {
  const email = process.env.VENDOR_EMAIL;
  const password = process.env.VENDOR_PASSWORD;
  const mobile = process.env.VENDOR_MOBILE;
  const businessName = process.env.VENDOR_BUSINESS_NAME;

  if (!email || !password || !mobile || !businessName) {
    throw new Error(
      "VENDOR_EMAIL, VENDOR_PASSWORD, VENDOR_MOBILE and VENDOR_BUSINESS_NAME are required in .env"
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.upsert({
      where: {
        email,
      },

      update: {
        firstName: process.env.VENDOR_FIRST_NAME ?? "Demo",
        lastName: process.env.VENDOR_LAST_NAME ?? "Vendor",
        mobile,
        password: hashedPassword,
        role: "VENDOR",
        status: "ACTIVE",
      },

      create: {
        firstName: process.env.VENDOR_FIRST_NAME ?? "Demo",
        lastName: process.env.VENDOR_LAST_NAME ?? "Vendor",
        email,
        mobile,
        password: hashedPassword,
        role: "VENDOR",
        status: "ACTIVE",
      },
    });

    const vendor = await transaction.vendor.upsert({
      where: {
        userId: user.id,
      },

      update: {
        businessName,
        kycStatus: "APPROVED",
      },

      create: {
        userId: user.id,
        businessName,
        kycStatus: "APPROVED",
      },
    });

    return {
      user,
      vendor,
    };
  });

  console.log("Vendor account ready:");
  console.table({
    id: result.user.id,
    firstName: result.user.firstName,
    lastName: result.user.lastName,
    email: result.user.email,
    mobile: result.user.mobile,
    role: result.user.role,
    status: result.user.status,
    vendorId: result.vendor.id,
    businessName: result.vendor.businessName,
    kycStatus: result.vendor.kycStatus,
  });
};

seedVendor()
  .catch((error) => {
    console.error("Vendor seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
