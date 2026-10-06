import { bindings, defineConfig, defineWorker, triggers } from "cf/config";
import { createWorkersCacheConfig } from "@vinext/cloudflare/cache/config";

const cache = await createWorkersCacheConfig();

export default defineConfig({
  worker: defineWorker({
    ...cache,
    name: "pulso",
    // La app de vinext más la API y la tarea programada de los avisos.
    entrypoint: "./src/worker.ts",
    compatibilityDate: "2026-09-30",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ...cache.env,
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      VINEXT_KV_CACHE: bindings.kv(),
      // Avisos: suscripciones de los teléfonos y la clave privada VAPID (secreto).
      PUSH_DB: bindings.d1(),
      VAPID_PRIVATE_KEY: bindings.secret(),
    },
    triggers: [triggers.scheduled({ schedule: "*/15 * * * *" })],
  }),
});
