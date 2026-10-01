"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { BottomNavigation, focusRoutes } from "@/components/navigation/bottom-navigation";
import { useSettings } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const focus = focusRoutes.some((route) => pathname.startsWith(route));
  const [settings] = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  return (
    <div className="app-shell">
      <main className={focus ? "page-container focus-mode" : "page-container"}>{children}</main>
      <BottomNavigation />
    </div>
  );
}
