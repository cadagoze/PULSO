"use client";

import { Segmented } from "@/components/ui";
import type { Settings } from "@/types";
import { SettingsGroup } from "./settings-group";

const themeHelp: Record<Settings["theme"], string> = {
  system: "Sigue la configuración de tu teléfono o computador.",
  light: "Fondo marfil, verde bosque y lima.",
  dark: "Contraste suave para entrenar de noche.",
};

export function AppearanceSection({ theme, onChange }: { theme: Settings["theme"]; onChange: (theme: Settings["theme"]) => void }) {
  return (
    <SettingsGroup index="04" title="Apariencia" id="prof-appearance">
      <div className="prof-row prof-theme">
        <div className="prof-theme-controls">
          <div className="prof-row-text">
            <strong>Tema</strong>
            <small>{themeHelp[theme]}</small>
          </div>
          <Segmented<Settings["theme"]>
            label="Tema"
            value={theme}
            onChange={onChange}
            options={[{ value: "system", label: "Sistema" }, { value: "light", label: "Claro" }, { value: "dark", label: "Oscuro" }]}
          />
        </div>
        <div className="prof-swatch" aria-hidden="true">
          <span className="prof-swatch-card">
            <i className="prof-swatch-line" />
            <i className="prof-swatch-line short" />
            <i className="prof-swatch-pill" />
          </span>
          <span className="prof-swatch-row">
            <i />
            <i />
          </span>
        </div>
      </div>
    </SettingsGroup>
  );
}
