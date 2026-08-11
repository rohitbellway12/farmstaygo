import prisma from "../src/config/database.js";

async function truncateAllBookings() {
  console.log("Starting bookings truncation...");

  const bookingCount = await prisma.booking.count();
  console.log(`Found ${bookingCount} bookings`);

  const paymentsCount = await prisma.payment.count();
  console.log(`Found ${paymentsCount} payments`);

  const commissionsCount = await prisma.vendorCommission.count();
  console.log(`Found ${commissionsCount} vendor commissions`);

  await prisma.vendorCommission.deleteMany({});
  console.log("All vendor commissions deleted");

  await prisma.booking.deleteMany({});
  console.log("All bookings deleted");

  await prisma.payment.deleteMany({});
  console.log("All payments deleted");

  const vendorResult = await prisma.vendor.updateMany({
    data: {
      totalEarnings: 0,
      totalCommission: 0,
    },
  });
  console.log(`Reset earnings for ${vendorResult.count} vendors`);

  console.log("Done! All bookings, payments, commissions, and vendor earnings have been reset.");
  process.exit(0);
}

truncateAllBookings().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
