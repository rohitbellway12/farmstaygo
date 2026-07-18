import type { Metadata } from "next";
import { Inter } from "next/font/google";

import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default:
      "FarmStayGo | Farmhouses, Villas & Nature Stays",
    template: "%s | FarmStayGo",
  },

  description:
    "Discover and book verified farmhouses, villas, resorts, homestays and unique nature stays across India.",

  applicationName: "FarmStayGo",

  keywords: [
    "farmhouse booking",
    "villa booking",
    "resort booking",
    "homestay",
    "nature stays",
    "weekend getaway",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full scroll-smooth antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-ink-900">
        <SiteHeader />

        <main className="flex-1">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
