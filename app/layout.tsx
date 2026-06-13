import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konsultan Pra-Desain Rumah",
  description:
    "Ubah kebutuhan rumah jadi cek kelayakan, denah konsep, dan brief PDF untuk dibawa ke tukang.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 font-sans text-slate-900">{children}</body>
    </html>
  );
}
