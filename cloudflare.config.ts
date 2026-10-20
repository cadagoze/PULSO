import { bindings, defineConfig, defineWorker, exports, triggers } from "cf/config";
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
      // Fin del descanso a la hora exacta, con la app en segundo plano (src/server/rest-alarm.ts).
      REST_ALARM: bindings.durableObject({ worker: "pulso", exportName: "RestAlarm" }),
    },
    exports: {
      ...cache.exports,
      RestAlarm: exports.durableObject({ storage: "sqlite" }),
    },
    triggers: [triggers.scheduled({ schedule: "*/15 * * * *" })],
  }),
});
