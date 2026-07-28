import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

(async () => {
  try {
    console.log("Starting full reset of booking-related data...\n");

    const vendorCommissionsCount = await prisma.vendorCommission.count();
    const paymentsCount = await prisma.payment.count();
    const bookingsCount = await prisma.booking.count();
    const vendorsCount = await prisma.vendor.count();

    console.log("Current counts:");
    console.log("  Vendor commissions:", vendorCommissionsCount);
    console.log("  Payments:", paymentsCount);
    console.log("  Bookings:", bookingsCount);
    console.log("  Vendors:", vendorsCount);
    console.log("");

    await prisma.vendorCommission.deleteMany({});
    console.log("Deleted all vendor commissions");

    await prisma.payment.deleteMany({});
    console.log("Deleted all payments");

    await prisma.booking.deleteMany({});
    console.log("Deleted all bookings");

    const resetVendors = await prisma.vendor.updateMany({
      data: {
        totalEarnings: 0,
        totalCommission: 0,
      },
    });
    console.log("Reset earnings/commission for", resetVendors.count, "vendors");

    const finalVendorCommissions = await prisma.vendorCommission.count();
    const finalPayments = await prisma.payment.count();
    const finalBookings = await prisma.booking.count();

    console.log("\nFinal counts after reset:");
    console.log("  Vendor commissions:", finalVendorCommissions);
    console.log("  Payments:", finalPayments);
    console.log("  Bookings:", finalBookings);
    console.log("\nFull reset completed successfully!");

    process.exit(0);
  } catch (err) {
    console.error("Error during reset:", err);
    process.exit(1);
  }
})();
