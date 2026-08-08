import "dotenv/config";
import prisma from "../src/config/database.js";

const seedServiceCities = async (): Promise<void> => {
  const cities = [
    {
      name: "Bhopal",
      state: "Madhya Pradesh",
      country: "India",
      isActive: true,
      sortOrder: 1,
    },
  ];

  for (const city of cities) {
    const existing = await prisma.serviceCity.findFirst({
      where: {
        name: city.name,
        state: city.state,
        country: city.country,
      },
    });

    if (existing) {
      await prisma.serviceCity.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          sortOrder: city.sortOrder,
        },
      });
      console.log(`Updated service city: ${city.name}, ${city.state}`);
    } else {
      await prisma.serviceCity.create({
        data: city,
      });
      console.log(`Created service city: ${city.name}, ${city.state}`);
    }
  }
};

seedServiceCities()
  .then(async () => {
    console.log("Service cities seeded successfully");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Service city seeding failed:", error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
