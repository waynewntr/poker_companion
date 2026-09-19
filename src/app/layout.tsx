import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poker Odds Companion",
  description: "Fast, local Texas Hold'em odds calculator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0D0D0F]">{children}</body>
    </html>
  );
}
