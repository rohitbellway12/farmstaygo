import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const p = new PrismaClient({ adapter });

async function main() {
  try {
    const result = await p.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vendors' 
        AND table_schema = 'public'
        AND column_name = 'commission_rate'
    `;
    console.log('commission_rate column:', result);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await p.$disconnect();
  }
}

main();
