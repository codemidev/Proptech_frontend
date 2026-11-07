import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "@/lib/fetch-guard";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aviritech PropTech",
    template: "%s · Aviritech PropTech",
  },
  description: "Modern Property Management & Real Estate Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={fontSans.variable} suppressHydrationWarning>
        <body><ThemeProvider>{children}</ThemeProvider></body>
      </html>
    </ClerkProvider>
  );
}