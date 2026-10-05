"use client";

import { useEffect } from "react";
import { hasCloudSession, setCloudStatus } from "@/lib/cloud/status";
import { cloudActions } from "@/lib/cloud/use-cloud";

/** Si hay una sesión abierta en este equipo, reanuda la sincronización al abrir la app. */
export function CloudBoot() {
  useEffect(() => {
    if (!hasCloudSession()) return;
    setCloudStatus({ phase: "starting" });
    void cloudActions.boot().catch(() => setCloudStatus({ phase: "error", message: "No se pudo conectar con tu cuenta. Revisa tu conexión." }));
  }, []);
  return null;
}
