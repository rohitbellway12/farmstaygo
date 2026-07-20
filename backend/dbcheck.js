const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  try{
    const users=await p.user.findMany({where:{role:{in:['ADMIN','STAFF_ADMIN','SUPPORT']}},select:{id:true,email:true,role:true,status:true}});
    console.log('ADMINS',JSON.stringify(users));
    const bk=await p.booking.count();
    console.log('bookings count',bk);
  }catch(e){console.log('ERR',e.message)}
  await p.$disconnect();
})();
