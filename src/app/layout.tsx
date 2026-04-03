import type { Metadata } from "next";
import { Instrument_Serif, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Connect — The Community Platform Built for Signal",
  description:
    "Connect gives crypto projects, DAOs, and indie communities a clean, structured, moderated space to grow. X removed communities. Telegram is chaos. Connect is the alternative.",
  keywords: ["community platform", "DAO", "crypto community", "memecoin", "NFT community", "Discord alternative"],
  openGraph: {
    title: "Connect — The Community Platform Built for Signal",
    description:
      "Your crypto project deserves a real home. Connect is a clean, structured, spam-free community platform.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${dmSans.variable} ${ibmPlexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
