import prisma from "../config/database.js";

const pagesToCreate = [
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    pageType: "custom",
    content: "Privacy Policy content coming soon.",
    footerGroup: "policies",
    sortOrder: 0,
    isPublished: true,
  },
  {
    title: "Terms & Conditions",
    slug: "terms-conditions",
    pageType: "custom",
    content: "Terms & Conditions content coming soon.",
    footerGroup: "policies",
    sortOrder: 1,
    isPublished: true,
  },
  {
    title: "Cancellation Policy",
    slug: "cancellation-policy",
    pageType: "custom",
    content: "Cancellation Policy content coming soon.",
    footerGroup: "policies",
    sortOrder: 2,
    isPublished: true,
  },
  {
    title: "Refund Policy",
    slug: "refund-policy",
    pageType: "custom",
    content: "Refund Policy content coming soon.",
    footerGroup: "policies",
    sortOrder: 3,
    isPublished: true,
  },
  {
    title: "Host Agreement",
    slug: "host-agreement",
    pageType: "custom",
    content: "Host Agreement content coming soon.",
    footerGroup: "policies",
    sortOrder: 4,
    isPublished: true,
  },
  {
    title: "About Us",
    slug: "about-us",
    pageType: "custom",
    content: "About Us content coming soon.",
    footerGroup: "company",
    sortOrder: 0,
    isPublished: true,
  },
  {
    title: "Blog & Travel Guides",
    slug: "blog-travel-guides",
    pageType: "custom",
    content: "Blog & Travel Guides content coming soon.",
    footerGroup: "company",
    sortOrder: 1,
    isPublished: true,
  },
  {
    title: "Farmhouses Near Indore",
    slug: "farmhouses-near-indore",
    pageType: "custom",
    content: "Farmhouses Near Indore content coming soon.",
    footerGroup: "company",
    sortOrder: 2,
    isPublished: true,
  },
  {
    title: "Event & Party Venues",
    slug: "event-party-venues",
    pageType: "custom",
    content: "Event & Party Venues content coming soon.",
    footerGroup: "company",
    sortOrder: 3,
    isPublished: true,
  },
  {
    title: "List Your Property",
    slug: "list-your-property",
    pageType: "custom",
    content: "List Your Property content coming soon.",
    footerGroup: "company",
    sortOrder: 4,
    isPublished: true,
  },
  {
    title: "Contact Us",
    slug: "contact-us",
    pageType: "custom",
    content: "Contact Us content coming soon.",
    footerGroup: "company",
    sortOrder: 5,
    isPublished: true,
  },
];

async function main() {
  const existing = await prisma.cmsPage.findMany({
    where: {
      slug: {
        in: pagesToCreate.map((p) => p.slug),
      },
    },
    select: { slug: true },
  });

  const existingSlugs = new Set(existing.map((p) => p.slug));

  const toCreate = pagesToCreate.filter((p) => !existingSlugs.has(p.slug));

  if (toCreate.length === 0) {
    console.log("All footer CMS pages already exist.");
    return;
  }

  for (const page of toCreate) {
    await prisma.cmsPage.create({
      data: page,
    });
    console.log(`Created: ${page.title} (${page.slug})`);
  }

  console.log(`\nDone. ${toCreate.length} pages created.`);
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
