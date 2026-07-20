import {PrismaClient} from 'file:///C:/xampp/htdocs/FarmStay/backend/dist/generated/prisma/client.js';
const p=new PrismaClient();
const users=await p.user.findMany({where:{role:{in:['ADMIN','STAFF_ADMIN','SUPPORT']}},select:{id:true,email:true,role:true,status:true}});
console.log('ADMINS',JSON.stringify(users));
const bk=await p.booking.count();
console.log('bookings count',bk);
await p.$disconnect();
