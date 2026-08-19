import type { Metadata } from "next";
import { Bebas_Neue, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Jettribe | Jet Ski Gear, Impact Vests & Ride Apparel",
    template: "%s | Jettribe",
  },
  description:
    "Jettribe — a true core personal watercraft brand born in Southern California. Impact vests, wetsuits, gloves, boots, and ride gear.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${bebas.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-ink antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
