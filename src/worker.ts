import app from "vinext/server/fetch-handler";
import { proxyFirebaseAuth } from "@/server/auth-proxy";
import { handlePushRequest, runReminders, type PushEnv } from "@/server/push";

/**
 * Entrada del Worker: la app (vinext) y, aparte, el puente del inicio de sesión de Firebase (/__/*),
 * la API de avisos (/api/push/*) y la tarea programada que los envía cada 15 minutos.
 */
export * from "vinext/server/fetch-handler";

interface WorkerContext { waitUntil(promise: Promise<unknown>): void }
interface ScheduledEvent { scheduledTime: number }

const worker = {
  async fetch(request: Request, env: PushEnv, ctx: WorkerContext) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/__/auth/") || pathname.startsWith("/__/firebase/")) return proxyFirebaseAuth(request);
    if (pathname.startsWith("/api/push/")) return handlePushRequest(request, env);
    return app.fetch(request, env, ctx);
  },
  async scheduled(event: ScheduledEvent, env: PushEnv, ctx: WorkerContext) {
    ctx.waitUntil(runReminders(env, new Date(event.scheduledTime)));
  },
};

export default worker;
