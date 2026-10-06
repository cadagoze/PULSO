/**
 * Avisos (notificaciones) de PULSO: qué se puede activar, el estado mínimo del día que el teléfono
 * envía al servidor y cuándo toca cada aviso. Lo usan la app y el Worker que los envía.
 */

export interface PushPrefs {
  training: boolean;
  /** Hora local del aviso de entrenar («19:00»). */
  trainingTime: string;
  streak: boolean;
  meals: boolean;
  water: boolean;
}

export const defaultPushPrefs: PushPrefs = { training: true, trainingTime: "19:00", streak: true, meals: false, water: false };

/** Lo mínimo para saber si un aviso sirve: nunca nombres, comidas, pesos ni medidas. */
export interface PushState {
  /** Día local del teléfono cuando se calculó. */
  date: string;
  /** Lunes de esa semana. */
  weekStart: string;
  trainedToday: boolean;
  weekSessions: number;
  weekGoal: number;
  /** Semanas seguidas con la meta cumplida (sin contar la actual). */
  streak: number;
  /** Cuenta calorías (los avisos de comidas son sólo para ese modo). */
  counting: boolean;
  loggedToday: boolean;
  /** Registró once, cena o colación hoy. */
  loggedEvening: boolean;
  water: number;
  waterGoal: number;
}

export type ReminderKind = "training" | "streak" | "meals" | "water-1" | "water-2" | "water-3";
export interface Reminder { kind: ReminderKind; title: string; body: string; url: string }

export const STREAK_TIME = 18 * 60;
export const MEALS_TIME = 21 * 60;
export const WATER_TIMES: Array<{ kind: ReminderKind; at: number; share: number }> = [
  { kind: "water-1", at: 11 * 60, share: 0.3 },
  { kind: "water-2", at: 15 * 60, share: 0.55 },
  { kind: "water-3", at: 18 * 60 + 30, share: 0.8 },
];
/** Si el envío se atrasa, aún vale dentro de esta ventana (minutos); después, ya no. */
const WINDOW = 90;
/** Primero lo más específico: si tocan dos a la vez, sólo se envía uno. */
const PRIORITY: ReminderKind[] = ["streak", "training", "meals", "water-1", "water-2", "water-3"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** «19:30» → 1170 minutos; null si no es una hora válida entre 05:00 y 23:00. */
export function parseTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return Number(match[2]) < 60 && minutes >= 5 * 60 && minutes <= 23 * 60 ? minutes : null;
}

/** Fecha, minutos desde medianoche y día de la semana (0 = lunes) en la zona horaria de la persona. */
export function localClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23" }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const date = `${part("year")}-${part("month")}-${part("day")}`;
  const weekday = Math.max(0, WEEKDAYS.indexOf(part("weekday")));
  const monday = new Date(`${date}T12:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - weekday);
  return { date, minutes: Number(part("hour")) * 60 + Number(part("minute")), weekday, weekStart: monday.toISOString().slice(0, 10) };
}

export function validTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Avisos que tocan ahora y aún no se enviaron hoy (`sent`: tipo → día de envío). Si el estado es de
 * otro día, el día empieza de cero (nada entrenado ni registrado). Devuelve a lo más uno, el de mayor
 * prioridad, y `skip` con los demás que tocaban (se marcan como enviados para no repetirlos).
 */
export function dueReminders({ prefs, state, sent, timeZone, now }: {
  prefs: PushPrefs;
  state: PushState | null;
  sent: Record<string, string>;
  timeZone: string;
  now: Date;
}): { send: Reminder | null; skip: ReminderKind[] } {
  const clock = localClock(now, timeZone);
  const today = state?.date === clock.date;
  const sameWeek = state?.weekStart === clock.weekStart;
  const trainedToday = today && Boolean(state?.trainedToday);
  const weekSessions = sameWeek ? state?.weekSessions ?? 0 : 0;
  const weekGoal = Math.max(1, state?.weekGoal ?? 3);
  const water = today ? state?.water ?? 0 : 0;
  const waterGoal = Math.max(1, state?.waterGoal ?? 8);
  const inWindow = (at: number) => clock.minutes >= at && clock.minutes < at + WINDOW;
  const pending = (kind: ReminderKind) => sent[kind] !== clock.date;
  const due: Reminder[] = [];

  const trainingAt = parseTime(prefs.trainingTime);
  if (prefs.training && trainingAt !== null && inWindow(trainingAt) && pending("training") && !trainedToday && weekSessions < weekGoal) {
    due.push({
      kind: "training",
      title: "Hora de entrenar",
      body: weekSessions === 0 ? "Arranca la semana: tu sesión de hoy te espera." : `Llevas ${weekSessions} de ${weekGoal} sesiones esta semana. Hoy se entrena.`,
      url: "/entrenar",
    });
  }
  if (prefs.streak && clock.weekday === 6 && inWindow(STREAK_TIME) && pending("streak") && !trainedToday && weekSessions === weekGoal - 1) {
    const streak = state?.streak ?? 0;
    due.push({
      kind: "streak",
      title: streak > 0 ? "Tu racha está en juego" : "Cierra la semana",
      body: streak > 0 ? `Llevas ${streak} ${streak === 1 ? "semana" : "semanas"} seguidas. Te falta 1 sesión para no cortarla: 20 minutos bastan.` : "Te falta 1 sesión para cumplir tu meta semanal. 20 minutos bastan.",
      url: "/entrenar",
    });
  }
  if (prefs.meals && state?.counting && inWindow(MEALS_TIME) && pending("meals") && !(today && state.loggedEvening)) {
    due.push({
      kind: "meals",
      title: "¿Registraste tu día?",
      body: today && state.loggedToday ? "Te falta anotar la once o la cena. Un minuto basta." : "Aún no registras comidas hoy. Anótalas en un minuto.",
      url: "/comidas?registrar=1",
    });
  }
  if (prefs.water) {
    for (const slot of WATER_TIMES) {
      if (inWindow(slot.at) && pending(slot.kind) && water < Math.ceil(waterGoal * slot.share)) {
        due.push({ kind: slot.kind, title: "Un vaso de agua", body: `Llevas ${water} de ${waterGoal} vasos hoy.`, url: "/comidas" });
      }
    }
  }

  due.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
  return { send: due[0] ?? null, skip: due.slice(1).map((item) => item.kind) };
}
