import { PrismaClient } from '../dist/generated/prisma/client.js';

const prisma = new PrismaClient();

(async () => {
  try {
    const count = await prisma.booking.count();
    console.log('Total bookings found:', count);
    
    if (count > 0) {
      const result = await prisma.booking.deleteMany({});
      console.log('Deleted bookings:', result.count);
    } else {
      console.log('No bookings to delete.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
