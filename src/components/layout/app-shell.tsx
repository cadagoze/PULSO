"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BottomNavigation, focusRoutes } from "@/components/navigation/bottom-navigation";
import { OfflineSupport } from "@/components/layout/offline-support";
import { useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";
import { CloudBoot } from "@/components/cloud/cloud-boot";
import { captureInstallPrompt } from "@/lib/install";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const focus = focusRoutes.some((route) => pathname.startsWith(route));
  const [settings] = useSettings();

  // El aviso de instalación del navegador llega una sola vez: se escucha desde que abre la app.
  useEffect(() => { captureInstallPrompt(); }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  return (
    <div className="app-shell">
      <main className={focus ? "page-container focus-mode" : "page-container"}>
        {/* Cada pantalla entra con un fundido y un desplazamiento leve; las de foco, sólo con fundido. */}
        <div key={pathname} className={cn("route", focus && "route-fade")}>{children}</div>
      </main>
      <BottomNavigation />
      <OfflineSupport />
      <CloudBoot />
    </div>
  );
}
