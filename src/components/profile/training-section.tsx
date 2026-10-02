"use client";

import type { CSSProperties } from "react";
import { SegmentedControl, Switch } from "@/components/ui";
import type { Settings } from "@/types";
import { SettingRow, SettingsGroup } from "./settings-group";

const restOptions = [30, 60, 90, 120, 180];
const barOptions = [20, 15, 10];
const plateOptions = [25, 20, 15, 10, 5, 2.5, 1.25];

function restLabel(seconds: number) {
  if (seconds < 60) return `${seconds} s`;
  const minutes = seconds / 60;
  return Number.isInteger(minutes) ? `${minutes} min` : `${Math.floor(minutes)}:${String(seconds % 60).padStart(2, "0")}`;
}

function plateLabel(kg: number) {
  return kg.toLocaleString("es-CL");
}

const unitOptions: Array<{ value: Settings["unit"]; label: string }> = [
  { value: "kg", label: "kg" },
  { value: "lb", label: "lb" },
];
const restChoices = restOptions.map((seconds) => ({ value: String(seconds), label: restLabel(seconds) }));
const barChoices = barOptions.map((kg) => ({ value: String(kg), label: `${kg} kg` }));

/** Cómo se comporta la sesión: unidades, descansos, avisos, pantalla, barra y discos. */
export function TrainingSection({ settings, update, order }: { settings: Settings; update: (patch: Partial<Settings>) => void; order?: number }) {
  function togglePlate(kg: number) {
    const has = settings.plates.includes(kg);
    const next = has ? settings.plates.filter((item) => item !== kg) : [...settings.plates, kg];
    update({ plates: next.sort((a, b) => b - a) });
  }

  return (
    <SettingsGroup id="entrenamiento" index="02" title="Entrenamiento" description="Cómo se comporta la sesión mientras entrenas." order={order}>
      <SettingRow
        title="Unidades"
        helper="Tus registros se guardan en kg y se convierten al mostrar."
        control={<SegmentedControl<Settings["unit"]> label="Unidades de peso" size="s" className="prof-unit" value={settings.unit} onChange={(unit) => update({ unit })} options={unitOptions} />}
      />
      <SettingRow
        title="Descanso por defecto"
        helper="Entre series, salvo que el ejercicio indique otro."
        below={<SegmentedControl label="Descanso por defecto" className="prof-rest" value={String(settings.defaultRest)} onChange={(value) => update({ defaultRest: Number(value) })} options={restChoices} />}
      />
      <SettingRow
        title="Descanso automático"
        helper="Inicia el temporizador al completar una serie."
        control={<Switch checked={settings.autoRest} onChange={(autoRest) => update({ autoRest })} label="Descanso automático al completar serie" />}
      />
      <SettingRow
        title="Sonidos"
        helper="Aviso breve al terminar el descanso y en intervalos."
        control={<Switch checked={settings.sound} onChange={(sound) => update({ sound })} label="Sonidos" />}
      />
      <SettingRow
        title="Vibración"
        helper="En Android. Safari en iPhone no permite vibrar desde la web."
        control={<Switch checked={settings.vibration} onChange={(vibration) => update({ vibration })} label="Vibración" />}
      />
      <SettingRow
        title="Pantalla encendida"
        helper="Evita que se apague mientras entrenas."
        control={<Switch checked={settings.keepAwake} onChange={(keepAwake) => update({ keepAwake })} label="Mantener pantalla encendida" />}
      />
      <SettingRow
        title="Barra olímpica"
        helper="Para calcular los discos por lado."
        below={<SegmentedControl label="Peso de la barra" value={String(settings.barWeight)} onChange={(value) => update({ barWeight: Number(value) })} options={barChoices} />}
      />
      <SettingRow
        title="Discos disponibles"
        helper={<><span className="num">{settings.plates.length}</span> de <span className="num">{plateOptions.length}</span> tamaños, en kg.</>}
        below={
          <div className="prof-plates" role="group" aria-label="Discos disponibles">
            {plateOptions.map((kg) => (
              <button
                key={kg}
                type="button"
                className="prof-plate num"
                style={{ "--plate": `${28 + kg * 1.3}px` } as CSSProperties}
                aria-pressed={settings.plates.includes(kg)}
                aria-label={`Disco de ${plateLabel(kg)} kg`}
                onClick={() => togglePlate(kg)}
              >
                <i aria-hidden="true" />
                {plateLabel(kg)}
              </button>
            ))}
          </div>
        }
      />
    </SettingsGroup>
  );
}
