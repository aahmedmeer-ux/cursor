import type { Metadata } from "next";
import { Fraunces, Source_Sans_3, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { ensureDemoUsers, getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const dynamic = "force-dynamic";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Originality — Similarity & Plagiarism Reports",
  description:
    "Upload documents, run hybrid similarity checks, and explore interactive originality reports.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [{ student, instructor }, user] = await Promise.all([
    ensureDemoUsers(),
    getCurrentUser(),
  ]);

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell user={user} users={[student, instructor]}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
