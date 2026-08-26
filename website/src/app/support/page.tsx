import type { Metadata } from "next";
import SupportClient from "./SupportClient";

export const metadata: Metadata = {
  title: "FarmStayGo Support | Farmhouse Booking Help Near Indore",
  description:
    "Need help with your farmhouse booking near Indore? Get assistance with bookings, payments, cancellations, refunds, property enquiries and other FarmStayGo queries.",
};

export default function SupportPage() {
  return <SupportClient />;
}
