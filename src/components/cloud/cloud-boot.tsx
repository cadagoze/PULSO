"use client";

import { useEffect } from "react";
import { hasCloudSession, redirectPending, setCloudStatus } from "@/lib/cloud/status";
import { cloudActions } from "@/lib/cloud/use-cloud";

/** Si hay una sesión abierta en este equipo (o se vuelve de entrar con Google), reanuda la sincronización al abrir la app. */
export function CloudBoot() {
  useEffect(() => {
    if (!hasCloudSession() && !redirectPending()) return;
    setCloudStatus({ phase: "starting" });
    void cloudActions.boot().catch(() => setCloudStatus({ phase: "error", message: "No se pudo conectar con tu cuenta. Revisa tu conexión." }));
  }, []);
  return null;
}
