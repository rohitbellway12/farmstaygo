import type { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login | FarmStayGo | Manage Your Farmhouse Bookings",
  description:
    "Log in to your FarmStayGo account to manage farmhouse bookings, view reservations, update your profile and access your account from one place.",
};

export default function LoginPage() {
  return <LoginClient />;
}
