import type { Metadata } from "next";
import ContactClient from "./ContactClient";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = {
  title: "Contact FarmStayGo | Farmhouse Booking Near Indore",
  description:
    "Contact FarmStayGo for farmhouse bookings, property enquiries, host partnerships and customer support. Get help finding and booking the right stay near Indore.",
};

async function getContactImage(): Promise<string | null> {
  try {
    const data = await apiFetch<{
      success: boolean;
      data: {
        contactImage: string | null;
      };
    }>("/contact/info");

    return data?.data?.contactImage || null;
  } catch {
    return null;
  }
}

export default async function ContactPage() {
  const contactImage = await getContactImage();

  return <ContactClient contactImage={contactImage} />;
}
