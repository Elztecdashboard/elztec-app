import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Elztec Dashboard",
  description: "Financieel dashboard Elztec",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" className={jakarta.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
