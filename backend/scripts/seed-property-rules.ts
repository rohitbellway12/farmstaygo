import "dotenv/config";
import prisma from "../src/config/database.js";

const defaultRules = [
  {
    name: "Couples Allowed",
    slug: "couples-allowed",
    description: "Valid ID required at check-in",
    icon: "Heart",
    sortOrder: 1,
  },
  {
    name: "Family Friendly",
    slug: "family-friendly",
    description: "Suitable for families with children",
    icon: "Users",
    sortOrder: 2,
  },
  {
    name: "Bachelor Groups Allowed",
    slug: "bachelor-groups-allowed",
    description: "Bachelor groups are permitted",
    icon: "User",
    sortOrder: 3,
  },
  {
    name: "Children Allowed",
    slug: "children-allowed",
    description: "Children are welcome",
    icon: "Baby",
    sortOrder: 4,
  },
  {
    name: "Pets Allowed",
    slug: "pets-allowed",
    description: "Pets are welcome",
    icon: "Dog",
    sortOrder: 5,
  },
  {
    name: "Outside Food Allowed",
    slug: "outside-food-allowed",
    description: "Outside food is permitted",
    icon: "UtensilsCrossed",
    sortOrder: 6,
  },
  {
    name: "Cooking Allowed",
    slug: "cooking-allowed",
    description: "Self-cooking is permitted",
    icon: "ChefHat",
    sortOrder: 7,
  },
  {
    name: "Non-Veg Allowed",
    slug: "non-veg-allowed",
    description: "Non-vegetarian food is allowed",
    icon: "Chicken",
    sortOrder: 8,
  },
  {
    name: "Alcohol Allowed",
    slug: "alcohol-allowed",
    description: "Consumption of alcohol is permitted",
    icon: "Wine",
    sortOrder: 9,
  },
  {
    name: "Smoking Allowed",
    slug: "smoking-allowed",
    description: "Smoking is permitted in designated areas",
    icon: "Cigarette",
    sortOrder: 10,
  },
  {
    name: "Parties / Celebrations Allowed",
    slug: "parties-celebrations-allowed",
    description: "Events, parties and celebrations are permitted",
    icon: "PartyPopper",
    sortOrder: 11,
  },
  {
    name: "Local ID Accepted",
    slug: "local-id-accepted",
    description: "Local ID proof is accepted for booking",
    icon: "IdCard",
    sortOrder: 12,
  },
  {
    name: "Visitors Allowed",
    slug: "visitors-allowed",
    description: "Outside visitors are permitted",
    icon: "UserPlus",
    sortOrder: 13,
  },
];

const seedPropertyRules = async (): Promise<void> => {
  for (const rule of defaultRules) {
    await prisma.propertyRule.upsert({
      where: {
        slug: rule.slug,
      },
      update: {
        name: rule.name,
        description: rule.description,
        icon: rule.icon,
        sortOrder: rule.sortOrder,
        isActive: true,
      },
      create: {
        name: rule.name,
        slug: rule.slug,
        description: rule.description,
        icon: rule.icon,
        sortOrder: rule.sortOrder,
        isActive: true,
      },
    });
  }

  console.log("Property rules seeded successfully");
};

seedPropertyRules()
  .catch((error) => {
    console.error("Property rules seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
