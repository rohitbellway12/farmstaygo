import prisma from "../src/config/database.js";

const faqs = [
  {
    question: "What is FarmStayGo?",
    answer:
      "FarmStayGo is a platform that connects travelers with verified farmhouses, villas, and unique stays across India for weekends, celebrations, and vacations.",
    category: "General",
    sortOrder: 1,
  },
  {
    question: "How do I book a property?",
    answer:
      "Browse properties, select your dates and number of guests, then submit a booking request. The vendor will confirm availability and your booking will be finalized.",
    category: "Booking",
    sortOrder: 2,
  },
  {
    question: "Are all properties verified?",
    answer:
      "Yes, every property listed on FarmStayGo goes through a verification process before being approved and made available for booking.",
    category: "General",
    sortOrder: 3,
  },
  {
    question: "What payment methods are supported?",
    answer:
      "We support online payments through Razorpay, as well as cash and bank transfer options depending on the property and location.",
    category: "Payments",
    sortOrder: 4,
  },
  {
    question: "Can I cancel my booking?",
    answer:
      "Cancellation policies vary by property. You can find the specific cancellation policy on the property detail page before confirming your booking.",
    category: "Booking",
    sortOrder: 5,
  },
  {
    question: "How do I list my property?",
    answer:
      "Register as a vendor, complete your KYC and bank details, then use the vendor dashboard to add your property with photos, amenities, and pricing.",
    category: "Vendors",
    sortOrder: 6,
  },
  {
    question: "What is the commission rate?",
    answer:
      "Commission rates vary based on the property type and location. Detailed commission information is provided during the vendor onboarding process.",
    category: "Vendors",
    sortOrder: 7,
  },
  {
    question: "How do I contact customer support?",
    answer:
      "You can reach our support team through the contact form on this page, or email us directly. We typically respond within 24 hours.",
    category: "Support",
    sortOrder: 8,
  },
  {
    question: "Is my personal information secure?",
    answer:
      "Yes, we use industry-standard security measures to protect your personal information. Please refer to our privacy policy for more details.",
    category: "General",
    sortOrder: 9,
  },
  {
    question: "Can I modify my booking after confirmation?",
    answer:
      "Modifications depend on availability and the property's policy. Contact the vendor directly through your booking details to request changes.",
    category: "Booking",
    sortOrder: 10,
  },
];

async function main() {
  for (const faq of faqs) {
    await prisma.faq.create({
      data: {
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        sortOrder: faq.sortOrder,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${faqs.length} FAQs successfully.`);
}

main()
  .catch((error) => {
    console.error("Failed to seed FAQs:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
