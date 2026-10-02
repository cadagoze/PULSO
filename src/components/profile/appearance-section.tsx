"use client";

import { SegmentedControl } from "@/components/ui";
import type { Settings } from "@/types";
import { SettingRow, SettingsGroup } from "./settings-group";

const themeOptions: Array<{ value: Settings["theme"]; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const themeHelp: Record<Settings["theme"], string> = {
  system: "Sigue la configuración de tu teléfono o computador.",
  light: "Fondo marfil, superficies blancas y tinta carbón.",
  dark: "Contraste suave para entrenar de noche.",
};

/** Tema de la app: el indicador se desliza entre Sistema, Claro y Oscuro y el cambio se aplica al instante. */
export function AppearanceSection({ theme, onChange, order }: { theme: Settings["theme"]; onChange: (theme: Settings["theme"]) => void; order?: number }) {
  return (
    <SettingsGroup id="apariencia" index="01" title="Apariencia" order={order}>
      <SettingRow
        title="Tema"
        helper={themeHelp[theme]}
        below={<SegmentedControl<Settings["theme"]> label="Tema" size="l" value={theme} onChange={onChange} options={themeOptions} />}
      />
    </SettingsGroup>
  );
}
