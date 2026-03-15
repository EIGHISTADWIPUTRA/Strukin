import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STRUKIN - Kendalikan Uangmu",
  description: "Kelola keuangan Anda dengan cerdas dan capai tujuan finansial lebih cepat bersama STRUKIN.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${manrope.variable} antialiased bg-white text-slate-900 font-display transition-colors duration-300`}
      >
        {children}
      </body>
    </html>
  );
}
