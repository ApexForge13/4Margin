import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "4Margin — AI-Powered Insurance Supplements for Roofing Contractors",
    template: "%s — 4Margin",
  },
  description:
    "Recover $3,000–$8,000 more per job. Upload the adjuster's Xactimate scope and get a professional supplement in 10 minutes — not hours.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "4Margin",
    title: "4Margin — AI-Powered Insurance Supplements for Roofing Contractors",
    description:
      "Upload the adjuster's Xactimate estimate. Our AI finds every missing line item and generates a carrier-ready supplement in minutes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "4Margin — AI-Powered Insurance Supplements",
    description:
      "Recover $3,000–$8,000 more per job. AI-powered supplement generation for roofing contractors.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
