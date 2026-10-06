"use client";

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { BellRing } from "lucide-react";
import { Button, Switch } from "@/components/ui";
import { InstallSheet } from "@/components/install/install-sheet";
import { useInstallState } from "@/lib/install";
import { disablePush, enablePush, pushSupport, sendTestPush, usePushSettings, usePushState, type PushSupport } from "@/lib/push";
import type { PushPrefs } from "@/lib/reminders";
import { useNutritionProfile } from "@/lib/store";
import { SettingRow, SettingsGroup } from "./settings-group";

const times = Array.from({ length: 33 }, (_, index) => {
  const minutes = 6 * 60 + index * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${minutes % 60 === 0 ? "00" : "30"}`;
});

const supportHelp: Record<Exclude<PushSupport, "ready">, string> = {
  "needs-install": "En iPhone, los avisos llegan sólo con PULSO instalada en tu pantalla de inicio. Instálala y actívalos desde ahí.",
  denied: "Bloqueaste los avisos de PULSO. Actívalos en los ajustes de tu navegador o de tu teléfono y vuelve aquí.",
  unsupported: "Este navegador no permite avisos. Prueba con Chrome, Edge, Firefox o Safari actualizado.",
};

// El permiso puede cambiar fuera de la app: se vuelve a leer al volver a la pestaña.
function subscribe(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * Avisos: activar en este teléfono y elegir cuáles (hora de entrenar, racha, comidas y agua). Cada uno
 * sólo llega cuando sirve: si ya entrenaste, registraste o tomaste agua, no se envía.
 */
export function NotificationsSection({ order, onToast }: { order?: number; onToast: (message: string) => void }) {
  const [push, setPush] = usePushSettings();
  const state = usePushState();
  const [nutrition] = useNutritionProfile();
  const install = useInstallState();
  const support = useSyncExternalStore(subscribe, pushSupport, () => "unsupported" as PushSupport);
  const [busy, setBusy] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const counting = nutrition?.mode === "count";
  const active = push.enabled && support === "ready";

  async function toggle(on: boolean) {
    setBusy(true);
    if (on) {
      const result = await enablePush(push.prefs, state);
      if (result.ok) {
        setPush((current) => ({ ...current, enabled: true, endpoint: result.endpoint }));
        onToast("Avisos activados");
      } else {
        onToast(result.reason === "denied" ? "Sin permiso para avisos" : "No se pudieron activar. Intenta de nuevo");
      }
    } else {
      await disablePush(push.endpoint);
      setPush((current) => ({ ...current, enabled: false, endpoint: null }));
      onToast("Avisos desactivados");
    }
    setBusy(false);
  }

  function setPref<K extends keyof PushPrefs>(key: K, value: PushPrefs[K]) {
    setPush((current) => ({ ...current, prefs: { ...current.prefs, [key]: value } }));
  }

  async function test() {
    if (!push.endpoint) return;
    setBusy(true);
    const ok = await sendTestPush(push.endpoint);
    setBusy(false);
    onToast(ok ? "Aviso de prueba enviado" : "No se pudo enviar. Revisa tu conexión");
  }

  return (
    <SettingsGroup id="avisos" index="03" title="Notificaciones" description="Te avisamos a tu hora y sólo cuando sirve." order={order}>
      <SettingRow
        title="Recibir avisos"
        helper={support === "ready" ? (active ? "Activos en este teléfono." : "Actívalos para que PULSO te recuerde entrenar.") : supportHelp[support]}
        control={support === "ready" ? <Switch checked={active} onChange={(on) => { if (!busy) void toggle(on); }} label="Recibir avisos" /> : undefined}
        below={support === "needs-install" && !install.standalone ? <Button variant="secondary" size="s" onClick={() => setInstallOpen(true)}>Ver cómo instalar</Button> : undefined}
      />
      {active && (
        <>
          <SettingRow
            title="Hora de entrenar"
            helper="Sólo los días que aún no entrenas y mientras no cumplas tu meta semanal."
            control={<Switch checked={push.prefs.training} onChange={(on) => setPref("training", on)} label="Aviso de hora de entrenar" />}
            below={push.prefs.training ? (
              <label className="push-time">
                <span>A las</span>
                <select value={push.prefs.trainingTime} onChange={(event) => setPref("trainingTime", event.target.value)} aria-label="Hora del aviso de entrenar">
                  {times.map((time) => <option key={time} value={time}>{time}</option>)}
                </select>
              </label>
            ) : undefined}
          />
          <SettingRow
            title="Racha en riesgo"
            helper="Domingo a las 18:00, si te falta una sesión para cumplir la semana."
            control={<Switch checked={push.prefs.streak} onChange={(on) => setPref("streak", on)} label="Aviso de racha en riesgo" />}
          />
          <SettingRow
            title="Registrar comidas"
            helper={counting ? "A las 21:00, si aún no registras la once o la cena." : "Para quien cuenta calorías en Nutrición."}
            control={counting ? <Switch checked={push.prefs.meals} onChange={(on) => setPref("meals", on)} label="Aviso para registrar comidas" /> : undefined}
          />
          <SettingRow
            title="Agua"
            helper="A las 11:00, 15:00 y 18:30, si vas bajo tu meta de vasos."
            control={<Switch checked={push.prefs.water} onChange={(on) => setPref("water", on)} label="Avisos de agua" />}
          />
          <SettingRow
            title="Probar"
            helper="Envía un aviso ahora para ver cómo llega."
            control={<Button variant="secondary" size="s" onClick={() => void test()} disabled={busy}><BellRing size={15} />Enviar</Button>}
          />
        </>
      )}
      {typeof document !== "undefined" && createPortal(
        <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} platform={install.platform} canPrompt={install.canPrompt} />,
        document.body,
      )}
    </SettingsGroup>
  );
}
