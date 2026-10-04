import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Mona_Sans, Space_Mono } from "next/font/google";

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono-space",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "BansosLedger — Transparansi Bantuan Sosial Takkalasi",
  description: "Kenali BansosLedger, sistem transparansi penyaluran bantuan sosial berbasis blockchain untuk Kelurahan Takkalasi. Terbuka, terlacak, dan dapat dipertanggungjawabkan.",
};

export const viewport: Viewport = { themeColor: "#e9edec" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${monaSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
