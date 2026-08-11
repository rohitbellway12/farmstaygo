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

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl: string | undefined;
  let siteName = "FarmStayGo";

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/public/settings/platform`,
      { next: { revalidate: 60 } }
    );

    if (response.ok) {
      const data = await response.json();

      if (data?.success && data?.data) {
        faviconUrl = data.data.siteFaviconUrl || undefined;
        siteName = data.data.siteName || siteName;
      }
    }
  } catch {
    // keep defaults
  }

  const icon = faviconUrl
    ? [
        {
          url: faviconUrl,
          type: "image/x-icon",
          sizes: "32x32",
        },
      ]
    : undefined;

  return {
    title: {
      default: `${siteName} | Farmhouses, Villas & Nature Stays`,
      template: "%s | FarmStayGo",
    },

    description:
      "Discover and book verified farmhouses, villas, resorts, homestays and unique nature stays across India.",

    applicationName: siteName,

    icons: icon,

    keywords: [
      "farmhouse booking",
      "villa booking",
      "resort booking",
      "homestay",
      "nature stays",
      "weekend getaway",
    ],
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body
        className="flex min-h-full flex-col bg-white text-ink-900"
        suppressHydrationWarning
      >
        <SiteHeader />

        <main className="flex-1">
          {children}
        </main>

        <SiteFooter />
      </body>
    </html>
  );
}
