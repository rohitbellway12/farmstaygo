import 'dotenv/config';
import prisma from './src/config/database.js';

async function main() {
  try {
    const currentYear = new Date().getFullYear();
    const [
      totalRevenue,
      totalBookings,
      totalVendors,
      totalProperties,
      totalCompletedBookings,
      totalCancelledBookings,
      totalRejectedBookings,
      avgBookingValue,
      occupancyRate,
      monthlyTrend,
      topVendors,
      categoryRevenue,
    ] = await Promise.all([
      prisma.booking.aggregate({ _sum: { estimatedTotal: true } }),
      prisma.booking.count(),
      prisma.vendor.count(),
      prisma.property.count(),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.booking.count({ where: { status: 'CANCELLED' } }),
      prisma.booking.count({ where: { status: 'REJECTED' } }),
      prisma.booking.aggregate({ _avg: { estimatedTotal: true } }),
      prisma.booking.aggregate({ _avg: { totalNights: true } }),
      prisma.$queryRaw`SELECT TO_CHAR(DATE_TRUNC('month', "created_at"), 'YYYY-MM') AS "month", COALESCE(SUM("estimated_total"), 0) AS "revenue", COUNT(*) AS "bookings" FROM "bookings" WHERE "created_at" >= NOW() - INTERVAL '12 months' GROUP BY DATE_TRUNC('month', "created_at") ORDER BY DATE_TRUNC('month', "created_at") ASC`,
      prisma.$queryRaw`SELECT v.id AS "vendorId", v.business_name AS "businessName", COALESCE(SUM(b.estimated_total), 0) AS "totalRevenue", COUNT(b.id) AS "totalBookings" FROM "vendors" v JOIN "Property" p ON p."vendorId" = v.id JOIN "bookings" b ON b."property_id" = p.id WHERE b.status = 'COMPLETED' GROUP BY v.id, v.business_name ORDER BY "totalRevenue" DESC LIMIT 10`,
      prisma.$queryRaw`SELECT pc.id AS "categoryId", pc.name AS "categoryName", COALESCE(SUM(b.estimated_total), 0) AS "totalRevenue" FROM "PropertyCategory" pc JOIN "Property" p ON p."categoryId" = pc.id JOIN "bookings" b ON b."property_id" = p.id WHERE b.status = 'COMPLETED' GROUP BY pc.id, pc.name ORDER BY "totalRevenue" DESC`,
    ]);
    console.log({ totalRevenue, totalBookings, totalVendors, totalProperties, totalCompletedBookings, totalCancelledBookings, totalRejectedBookings, avgBookingValue, occupancyRate, monthlyTrend, topVendors, categoryRevenue });
  } catch (error) {
    console.error('analytics error', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
