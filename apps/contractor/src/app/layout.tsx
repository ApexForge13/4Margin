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
    default: "4Margin — AI-Powered Policy Decoder for Roofing Contractors",
    template: "%s — 4Margin",
  },
  description:
    "Upload any homeowner's insurance policy. Our AI decodes coverages, exclusions, deductibles, and hidden gaps — so you know exactly what's covered before you start the job.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "4Margin",
    title: "4Margin — AI-Powered Policy Decoder for Roofing Contractors",
    description:
      "Upload any homeowner's insurance policy. Our AI decodes coverages, exclusions, deductibles, and hidden gaps in minutes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "4Margin — AI-Powered Policy Decoder",
    description:
      "Upload any insurance policy. AI-powered coverage decoding for roofing contractors.",
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
