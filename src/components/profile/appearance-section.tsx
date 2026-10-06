"use client";

import type { CSSProperties } from "react";
import { Check, Mars, Sparkles, UsersRound, Venus, type LucideIcon } from "lucide-react";
import { SegmentedControl } from "@/components/ui";
import { accentFor, accentOptions, photoOptions, type AccentName, type Identity, type PhotoPreference } from "@/lib/personalize";
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
  auto: "Según cómo te identificas en tu evaluación.",
  female: "Portadas y programas con mujeres.",
  male: "Portadas y programas con hombres.",
  mixed: "Mujeres y hombres, alternando cada día.",
};

/**
 * Tema, color de acento y fotos. El color y las fotos son automáticos según cómo te identificas
 * hasta que eliges otros; todo se aplica al instante.
 */
export function AppearanceSection({ settings, identity, update, order }: { settings: Settings; identity: Identity; update: (patch: Partial<Settings>) => void; order?: number }) {
  const automatic = accentFor(undefined, identity);
  const automaticLabel = accentOptions.find((option) => option.value === automatic)?.label ?? "Fuego";
  const photos = settings.photos ?? "auto";

  function chooseAccent(value: AccentName | undefined) {
    update({ accent: value });
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
        helper={settings.accent ? "Elegido por ti." : `Automático: ${automaticLabel.toLowerCase()} según tu perfil.`}
        below={
          <div className="accent-picker" role="radiogroup" aria-label="Color de acento">
            <button type="button" role="radio" aria-checked={!settings.accent} className={cn("accent-swatch", !settings.accent && "is-selected")} onClick={() => chooseAccent(undefined)}>
              <span className="accent-dot is-auto" style={{ "--swatch": accentOptions.find((option) => option.value === automatic)?.swatch } as CSSProperties} aria-hidden="true"><Sparkles size={14} /></span>
              <span>Auto</span>
            </button>
            {accentOptions.map((option) => {
              const selected = settings.accent === option.value;
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
