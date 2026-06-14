import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/ui/Header";

// Griya's three type families — display, body/UI, and technical figures.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Griya — Konsultan Pra-Desain Rumah",
  description:
    "Rancang sebelum kamu bangun. Ubah kebutuhan rumah jadi cek kelayakan, denah konsep, dan brief PDF untuk dibawa ke tukang.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${bricolage.variable} ${jakarta.variable} ${spaceMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Header />
        {children}
      </body>
    </html>
  );
}
