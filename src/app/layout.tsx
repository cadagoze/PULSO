import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";
import "@/styles/home.css";
import "@/styles/onboarding.css";
import "@/styles/train.css";
import "@/styles/session.css";
import "@/styles/library.css";
import "@/styles/progress.css";
import "@/styles/profile.css";
import "@/styles/content.css";
import "@/styles/nutrition.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
// Títulos y números: Archivo con eje de ancho para el tono editorial y deportivo.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "PULSO",
    template: "%s | PULSO",
  },
  description: "Tu salud en movimiento.",
  applicationName: "PULSO",
  appleWebApp: { capable: true, title: "PULSO", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f0e" },
  ],
};

/** Aplica el tema guardado antes de pintar, para evitar un destello de color. */
const themeScript = `try{var s=JSON.parse(localStorage.getItem("pulso:settings")||"{}");if(s.theme==="light"||s.theme==="dark")document.documentElement.setAttribute("data-theme",s.theme)}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable} ${archivo.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
