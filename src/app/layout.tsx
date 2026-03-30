import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NoDustHub สำหรับทุกคน",
  description: "ค้นหาที่หลบฝุ่นใกล้คุณ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
