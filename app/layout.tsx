import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { ThemeInitScript } from "@/components/ThemeInitScript";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AISmartCalendar",
  description: "Calendar-aware AI productivity for college students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeInitScript />
        {children}
      </body>
    </html>
  );
}
