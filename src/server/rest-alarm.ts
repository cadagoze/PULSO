import { sendRestNotice, type PushEnv } from "@/server/push";

interface AlarmStorage {
  get<T>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<boolean>;
  setAlarm(scheduledTime: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}
interface AlarmState { storage: AlarmStorage }
interface Pending { id: string; at: number; next: string }

/**
 * Fin del descanso con PULSO en segundo plano: un Durable Object por suscripción guarda el aviso
 * pendiente y lo envía a la hora exacta (la tarea de cada 15 minutos sería demasiado gruesa para un
 * descanso de 90 segundos). Programar otro reemplaza al anterior; volver a la app lo cancela.
 */
export class RestAlarm {
  private readonly storage: AlarmStorage;
  private readonly env: PushEnv;

  constructor(state: AlarmState, env: PushEnv) {
    this.storage = state.storage;
    this.env = env;
  }

  async fetch(request: Request) {
    if (new URL(request.url).pathname === "/cancel") {
      await this.storage.deleteAlarm();
      await this.storage.delete("pending");
    } else {
      const pending = (await request.json()) as Pending;
      await this.storage.put("pending", pending);
      await this.storage.setAlarm(pending.at);
    }
    return new Response(null, { status: 204 });
  }

  async alarm() {
    const pending = await this.storage.get<Pending>("pending");
    if (!pending) return;
    await this.storage.delete("pending");
    try {
      await sendRestNotice(this.env, pending.id, pending.next);
    } catch {
      // Un aviso de descanso atrasado ya no sirve: no se reintenta.
    }
  }
}
