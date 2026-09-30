import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";
import "./redesign.css";
import "./tracker.css";

export const metadata: Metadata = {
  title: {
    default: "PULSO",
    template: "%s | PULSO",
  },
  description: "Tu salud en movimiento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
