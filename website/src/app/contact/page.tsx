import type { Metadata } from "next";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact FarmStayGo | Farmhouse Booking Near Indore",
  description:
    "Contact FarmStayGo for farmhouse bookings, property enquiries, host partnerships and customer support. Get help finding and booking the right stay near Indore.",
};

export default function ContactPage() {
  return <ContactClient />;
}
