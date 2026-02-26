import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DecodeCoverage — Free Homeowners Insurance Policy Decoder",
  description:
    "Upload your homeowners insurance policy and get a free AI-powered analysis in 60 seconds. Find coverage gaps and understand what you're really paying for.",
  openGraph: {
    title: "DecodeCoverage — Is your home actually covered?",
    description:
      "Free AI-powered homeowners insurance policy analysis. Upload your policy, get instant results.",
    url: "https://decodecoverage.com",
    siteName: "DecodeCoverage",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;0,9..144,800;1,9..144,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
