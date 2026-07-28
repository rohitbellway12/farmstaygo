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
    const count = await prisma.booking.count();
    console.log("Total bookings found:", count);

    if (count > 0) {
      const result = await prisma.booking.deleteMany({});
      console.log("Deleted bookings:", result.count);
    } else {
      console.log("No bookings to delete.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
})();
