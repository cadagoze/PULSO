"use client";

import { Segmented, Switch } from "@/components/ui";
import { equipmentOptions } from "@/data/mock-data";
import type { Settings, TrainingEquipment, TrainingLocation, TrainingPreference } from "@/types";
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

export function TrainingSection({ settings, update, preference, setPreference }: { settings: Settings; update: (patch: Partial<Settings>) => void; preference: TrainingPreference; setPreference: (next: TrainingPreference) => void }) {
  function toggleEquipment(value: TrainingEquipment) {
    const has = preference.equipment.includes(value);
    setPreference({ ...preference, equipment: has ? preference.equipment.filter((item) => item !== value) : [...preference.equipment, value] });
  }

  function togglePlate(kg: number) {
    const has = settings.plates.includes(kg);
    const next = has ? settings.plates.filter((item) => item !== kg) : [...settings.plates, kg];
    update({ plates: next.sort((a, b) => b - a) });
  }

  return (
    <SettingsGroup index="03" title="Entrenamiento" description="Dónde entrenas y cómo se comporta la sesión." id="prof-training">
      <SettingRow
        stacked
        title="Lugar"
        helper={preference.location === "gym" ? "En el gimnasio asumimos máquinas, poleas y pesos libres." : "Marca lo que tienes en casa. Sin nada, usamos peso corporal."}
        below={
          <div className="stack-s prof-row-below">
            <Segmented<TrainingLocation>
              label="Lugar de entrenamiento"
              value={preference.location}
              onChange={(location) => setPreference({ ...preference, location })}
              options={[{ value: "home", label: "Casa" }, { value: "gym", label: "Gimnasio" }]}
            />
            {preference.location === "home" && (
              <div className="chips" role="group" aria-label="Equipamiento disponible">
                {equipmentOptions.map((option) => (
                  <button key={option.value} type="button" className="chip" aria-pressed={preference.equipment.includes(option.value)} onClick={() => toggleEquipment(option.value)}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />
      <SettingRow
        stacked
        title="Descanso por defecto"
        helper="Entre series, salvo que el ejercicio indique otro."
        below={
          <div className="prof-choice prof-row-below" role="group" aria-label="Descanso por defecto">
            {restOptions.map((seconds) => (
              <button key={seconds} type="button" className="chip num" aria-pressed={settings.defaultRest === seconds} onClick={() => update({ defaultRest: seconds })}>
                {restLabel(seconds)}
              </button>
            ))}
          </div>
        }
      />
      <SettingRow
        title="Descanso automático"
        helper="Inicia el temporizador al completar una serie."
        control={<Switch checked={settings.autoRest} onChange={(autoRest) => update({ autoRest })} label="Descanso automático al completar serie" />}
      />
      <SettingRow
        title="Pantalla encendida"
        helper="Evita que se apague mientras entrenas."
        control={<Switch checked={settings.keepAwake} onChange={(keepAwake) => update({ keepAwake })} label="Mantener pantalla encendida" />}
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
        title="Unidades"
        helper="Tus registros se guardan en kg y se convierten al mostrar."
        control={
          <div className="prof-segmented-s">
            <Segmented<Settings["unit"]>
              label="Unidades de peso"
              value={settings.unit}
              onChange={(unit) => update({ unit })}
              options={[{ value: "kg", label: "kg" }, { value: "lb", label: "lb" }]}
            />
          </div>
        }
      />
      <SettingRow
        stacked
        title="Barra olímpica"
        helper="Para calcular los discos por lado."
        below={
          <div className="prof-choice prof-row-below" style={{ ["--cols" as string]: 3 }} role="group" aria-label="Peso de la barra">
            {barOptions.map((kg) => (
              <button key={kg} type="button" className="chip num" aria-pressed={settings.barWeight === kg} onClick={() => update({ barWeight: kg })}>
                {kg} kg
              </button>
            ))}
          </div>
        }
      />
      <SettingRow
        stacked
        title="Discos disponibles"
        helper={`${settings.plates.length} de ${plateOptions.length} tamaños, en kg.`}
        below={
          <div className="prof-plates prof-row-below" role="group" aria-label="Discos disponibles">
            {plateOptions.map((kg) => (
              <button
                key={kg}
                type="button"
                className="prof-plate num"
                style={{ ["--plate" as string]: `${28 + kg * 1.3}px` }}
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
