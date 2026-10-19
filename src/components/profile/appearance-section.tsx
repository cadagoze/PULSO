"use client";

import type { CSSProperties } from "react";
import { Check, Mars, Sparkles, UsersRound, Venus, type LucideIcon } from "lucide-react";
import { SegmentedControl } from "@/components/ui";
import { accentOptions, photoOptions, type AccentName, type PhotoPreference } from "@/lib/personalize";
import { cn } from "@/lib/utils";
import type { Settings } from "@/types";
import { SettingRow, SettingsGroup } from "./settings-group";

const themeOptions: Array<{ value: Settings["theme"]; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const themeHelp: Record<Settings["theme"], string> = {
  system: "Sigue la configuración de tu teléfono o computador.",
  light: "Fondo claro y tinta carbón.",
  dark: "Negro carbón: el estilo de PULSO.",
};

const photoIcons: Record<PhotoPreference, LucideIcon> = { auto: Sparkles, female: Venus, male: Mars, mixed: UsersRound };

const photoHelp: Record<PhotoPreference, string> = {
  auto: "Según cómo te identificas (si lo indicaste); si no, mujeres y hombres alternando.",
  female: "Portadas y programas con mujeres.",
  male: "Portadas y programas con hombres.",
  mixed: "Mujeres y hombres, alternando cada día.",
};

/**
 * Tema, color de acento y fotos. El color es el rojo PULSO salvo que elijas otro (el logo sigue rojo);
 * las fotos son automáticas según cómo te identificas. Todo se aplica al instante.
 */
export function AppearanceSection({ settings, update, order }: { settings: Settings; update: (patch: Partial<Settings>) => void; order?: number }) {
  const accent = settings.accent ?? "fire";
  const photos = settings.photos ?? "auto";

  function chooseAccent(value: AccentName) {
    update({ accent: value === "fire" ? undefined : value });
  }

  return (
    <SettingsGroup id="apariencia" index="01" title="Apariencia" order={order}>
      <SettingRow
        title="Tema"
        helper={themeHelp[settings.theme]}
        below={<SegmentedControl<Settings["theme"]> label="Tema" size="l" value={settings.theme} onChange={(theme) => update({ theme })} options={themeOptions} />}
      />
      <SettingRow
        title="Color"
        helper={accent === "fire" ? "El rojo PULSO, el color de la marca." : "Color alternativo elegido por ti. El logo sigue en rojo PULSO."}
        below={
          <div className="accent-picker" role="radiogroup" aria-label="Color de acento">
            {accentOptions.map((option) => {
              const selected = accent === option.value;
              return (
                <button key={option.value} type="button" role="radio" aria-checked={selected} className={cn("accent-swatch", selected && "is-selected")} onClick={() => chooseAccent(option.value)}>
                  <span className="accent-dot" style={{ "--swatch": option.swatch } as CSSProperties} aria-hidden="true">{selected && <Check size={15} strokeWidth={3} />}</span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        }
      />
      <SettingRow
        title="Fotos"
        helper={photoHelp[photos]}
        below={
          <div className="accent-picker photo-picker" role="radiogroup" aria-label="Fotos">
            {photoOptions.map((option) => {
              const Icon = photoIcons[option.value];
              const selected = photos === option.value;
              return (
                <button key={option.value} type="button" role="radio" aria-checked={selected} className={cn("accent-swatch", selected && "is-selected")} onClick={() => update({ photos: option.value })}>
                  <span className="photo-icon" aria-hidden="true"><Icon size={18} /></span>
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        }
      />
    </SettingsGroup>
  );
}
