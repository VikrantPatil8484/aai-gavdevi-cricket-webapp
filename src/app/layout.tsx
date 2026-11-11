import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vihana11 Jay Hanuman Pise | Official Cricket Team WebApp",
  description:
    "Official Team Portal for Vihana11 Jay Hanuman Pise - Season Trophy Cabinet, 3D Squad Showcase, Live Match Schedule & Tournament Memories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
