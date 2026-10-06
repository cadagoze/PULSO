"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { Button, SegmentedControl, Sheet, ToggleChip } from "@/components/ui";
import { recapImage, recapText, type ShareParts } from "@/components/progress/week-share";
import { waterGoal } from "@/lib/nutrition";
import { useFoodLog, useSettings, useWater, useWeights, useWorkouts } from "@/lib/store";
import { useLatestWeight, useNutritionDay } from "@/lib/use-nutrition";
import { defaultRecapOffset, weekRecap } from "@/lib/week-recap";

type Week = "current" | "last";
const weekOptions: Array<{ value: Week; label: string }> = [
  { value: "current", label: "Esta semana" },
  { value: "last", label: "Semana pasada" },
];

/**
 * Compartir la semana: vista previa de la imagen, qué incluir (el peso va apagado por defecto) y
 * compartir con el menú del teléfono. Sin ese menú, descargar la imagen o copiar el texto.
 */
export function WeekShareSheet({ open, onClose, now }: { open: boolean; onClose: () => void; now: number }) {
  const [workouts] = useWorkouts();
  const [settings] = useSettings();
  const [foodLog] = useFoodLog();
  const [water] = useWater();
  const [weights] = useWeights();
  const latestWeight = useLatestWeight();
  const { targets, counting } = useNutritionDay(now);
  const [week, setWeek] = useState<Week>(() => (defaultRecapOffset(new Date(now), workouts) === -1 ? "last" : "current"));
  const [parts, setParts] = useState<ShareParts>({ nutrition: true, water: true, weight: false });
  const [image, setImage] = useState<{ blob: Blob; url: string; key: string } | null>(null);
  const url = useRef<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const recap = weekRecap({
    now: new Date(now),
    offset: week === "last" ? -1 : 0,
    workouts,
    goal: Math.max(1, settings.weeklyGoal),
    pausedWeeks: settings.pausedWeeks,
    foodLog,
    targets: counting && targets ? targets : null,
    water,
    waterGoal: waterGoal(latestWeight).glasses,
    weights,
  });
  const text = recapText(recap, settings.unit, parts);
  // La imagen se vuelve a dibujar sólo si cambia lo que muestra.
  const key = `${text}|${recap.days.map((day) => Number(day.trained)).join("")}`;
  const name = `pulso-${recap.label.split(" · ")[0].toLowerCase().replace(/\s+/g, "-")}.png`;

  const draw = useEffectEvent(() => recapImage(recap, settings.unit, parts));
  useEffect(() => {
    if (!open) return;
    let alive = true;
    draw()
      .then((blob) => {
        if (!alive) return;
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(blob);
        setImage({ blob, url: url.current, key });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open, key]);

  useEffect(() => () => {
    if (url.current) URL.revokeObjectURL(url.current);
  }, []);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice((current) => (current === message ? null : current)), 2200);
  }

  async function share() {
    const file = image ? new File([image.blob], name, { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: "Mi semana en PULSO", text });
      else if (navigator.share) await navigator.share({ title: "Mi semana en PULSO", text });
      else download();
    } catch (error) {
      // Cancelar el menú de compartir no es un error.
      if (error instanceof DOMException && error.name === "AbortError") return;
      download();
    }
  }

  function download() {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image.url;
    link.download = name;
    link.click();
    flash("Imagen descargada");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      flash("Texto copiado");
    } catch {
      flash("No se pudo copiar");
    }
  }

  const optional = [
    { key: "nutrition" as const, label: "Nutrición", available: Boolean(recap.nutrition) },
    { key: "water" as const, label: "Agua", available: Boolean(recap.water) },
    { key: "weight" as const, label: "Peso", available: Boolean(recap.weight) },
  ].filter((item) => item.available);
  const ready = image?.key === key;

  return (
    <Sheet open={open} onClose={onClose} eyebrow={recap.label} title="Compartir mi semana">
      <div className="share-sheet">
        <SegmentedControl<Week> label="Semana" options={weekOptions} value={week} onChange={setWeek} />
        <div className="share-preview" aria-busy={!ready}>
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen generada en el navegador (blob) */}
          {image && <img src={image.url} alt={text.replace(/\n/g, ". ")} className={ready ? undefined : "is-stale"} />}
        </div>
        {optional.length > 0 && (
          <div className="share-parts">
            <span className="nut-label">Incluir</span>
            <div className="chips" role="group" aria-label="Qué incluir">
              {optional.map((item) => (
                <ToggleChip key={item.key} pressed={parts[item.key]} onChange={() => setParts((current) => ({ ...current, [item.key]: !current[item.key] }))}>{item.label}</ToggleChip>
              ))}
            </div>
          </div>
        )}
        <Button size="l" block onClick={() => void share()} disabled={!image}><Share2 size={18} />Compartir</Button>
        <div className="share-secondary">
          <Button variant="secondary" onClick={download} disabled={!image}><Download size={16} />Descargar</Button>
          <Button variant="secondary" onClick={() => void copy()}>{notice === "Texto copiado" ? <Check size={16} /> : <Copy size={16} />}Copiar texto</Button>
        </div>
        <p className="share-notice" role="status">{notice ?? ""}</p>
      </div>
    </Sheet>
  );
}
