import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const p = new PrismaClient({ adapter });

async function main() {
  const blocks = await p.propertyAvailabilityBlock.findMany({
    where: { propertyId: 'cmrq61tzi000awotzf4jjgjcl' },
    select: { propertyId: true, date: true, note: true }
  });
  console.log('Property blocks for cmrq61tzi000awotzf4jjgjcl:', blocks);
  await p.$disconnect();
}

main();
