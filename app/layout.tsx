import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kapri · Sri Lanka's warmest AI shopping concierge",
  description:
    "Chat your way to the perfect gift. Kapri helps you discover products, quote delivery anywhere in Sri Lanka, and check out — powered by the Kapruka MCP.",
  openGraph: {
    title: "Kapri · Sri Lanka's warmest AI shopping concierge",
    description:
      "Chat your way to the perfect gift. Powered by Kapruka.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E5B4A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
