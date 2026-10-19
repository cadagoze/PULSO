"use client";

import { useEffect, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";
import { focusRoutes } from "@/components/navigation/bottom-navigation";
import { hasNewVersion } from "@/lib/app-version";

/** Tras este tiempo en segundo plano, al volver se busca una versión nueva (el iPhone deja la app «dormida»). */
const AWAY_MS = 5 * 60_000;

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Registra el service worker (sólo en producción), avisa cuando no hay conexión y, al volver a la app
 * después de un rato, se recarga sola si hay una versión nueva publicada (nunca a mitad de un entrenamiento).
 */
export function OfflineSupport() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => { void navigator.serviceWorker.register("/sw.js").catch(() => undefined); };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    let hiddenAt = 0;
    async function check() {
      if (!navigator.onLine || focusRoutes.some((route) => window.location.pathname.startsWith(route))) return;
      try {
        const response = await fetch("/", { cache: "no-store" });
        if (response.ok && hasNewVersion(document.documentElement.outerHTML, await response.text())) window.location.reload();
      } catch {
        // Sin red o servidor caído: se sigue con la versión abierta.
      }
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) void check();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  if (online) return null;
  return (
    <div className="offline-pill" role="status">
      <WifiOff size={15} aria-hidden="true" />
      Sin conexión · tus registros se guardan en este dispositivo
    </div>
  );
}
