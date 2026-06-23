import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Noto_Sans_Sinhala, Plus_Jakarta_Sans } from "next/font/google";
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

// Handwriting font for piped-icing previews (Latin scripts)…
const handwriting = Caveat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-handwriting",
  display: "swap",
});

// …and a Sinhala-capable font so සිංහල icing messages shape correctly.
const sinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  weight: ["500", "600", "700"],
  variable: "--font-sinhala",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kamala · Sri Lanka's warmest AI shopping concierge",
  description:
    "Chat your way to the perfect gift. Kamala helps you discover products, quote delivery anywhere in Sri Lanka, and check out — powered by the Kapruka MCP.",
  applicationName: "Kamala",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kamala", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Kamala · Sri Lanka's warmest AI shopping concierge",
    description: "Chat your way to the perfect gift. Powered by Kapruka.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#5B2D8E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${handwriting.variable} ${sinhala.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
