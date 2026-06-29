import type { Metadata } from "next";
import "./globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: env.studioName,
  description: `Book your recovery session at ${env.studioName}.`,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
