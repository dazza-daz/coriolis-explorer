import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coriolis Explorer",
  description: "Visualize Coriolis effect through orbital vs ground-following paths.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
