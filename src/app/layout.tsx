import type { Metadata } from "next";
import { Outfit, Source_Serif_4, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SurveyForge — Synthesis Matrix to Survey Paper",
  description:
    "Turn a research synthesis matrix into a high-impact survey draft with taxonomy, problem diagrams, comparison tables, challenges maps, trends–gaps Venn, literature discovery, and IEEE/ACM/Springer templates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${sourceSerif.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
