"use client";

import { Dumbbell, GlassWater, Medal, RotateCcw, StretchHorizontal, Utensils, Beef, type LucideIcon } from "lucide-react";
import { Button, NumberMetric, ProgressBar } from "@/components/ui";
import { Toast, useToast } from "@/components/ui/toast";
import { paceLine, type ChallengeKind } from "@/lib/challenges";
import { useChallengeBoard, type BoardItem } from "@/lib/use-challenges";
import { formatShortDate } from "@/lib/utils";

export const challengeIcons: Record<ChallengeKind, LucideIcon> = {
  "entrenos-12": Dumbbell,
  "agua-21": GlassWater,
  "comidas-25": Utensils,
  "proteina-20": Beef,
  "movilidad-10": StretchHorizontal,
};

/** Retos: los activos con su avance y ritmo, tus medallas, los que no alcanzaron y cuáles puedes empezar. */
export function ChallengesTab() {
  const board = useChallengeBoard();
  const { toast, show } = useToast();
  if (!board.ready) return <div className="prog-skeleton prog-skeleton-chart" aria-hidden="true" />;

  function begin(kind: ChallengeKind, title: string) {
    if (board.start(kind)) show(`Reto empezado · ${title}`);
  }

  return (
    <div className="prog-stack challenges">
      <section className="prog-ach-summary" aria-labelledby="ch-summary-title">
        <h2 id="ch-summary-title" className="meta">Medallas de retos</h2>
        <NumberMetric size="xl" value={board.medals.length} label={board.medals.length ? "Cada una son 30 días de constancia." : "Elige un reto y gánate la primera."} />
      </section>

      {board.active.length > 0 && (
        <section className="section" aria-labelledby="ch-active-title">
          <h2 id="ch-active-title" className="meta">En curso</h2>
          <div className="ch-list">
            {board.active.map((item) => <ActiveCard key={item.id} item={item} onAbandon={() => void board.abandon(item).then((ok) => ok && show("Reto abandonado"))} />)}
          </div>
        </section>
      )}

      {board.medals.length > 0 && (
        <section className="section" aria-labelledby="ch-medals-title">
          <h2 id="ch-medals-title" className="meta">Tus medallas</h2>
          <ul className="ch-medals">
            {board.medals.map((item) => {
              const Icon = challengeIcons[item.def.kind];
              return (
                <li key={item.id} className="ch-medal">
                  <span className="ch-medal-badge" aria-hidden="true"><Icon size={20} /></span>
                  <span className="grow"><strong>{item.def.title}</strong><small>Cumplido el {formatShortDate(item.doneOn ?? item.end)}</small></span>
                  <Medal size={18} className="ch-medal-mark" aria-hidden="true" />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {board.available.length > 0 && (
        <section className="section" aria-labelledby="ch-new-title">
          <h2 id="ch-new-title" className="meta">{board.active.length ? "Suma otro reto" : "Empieza un reto"}</h2>
          {!board.canStart && <p className="muted ch-note">Puedes llevar hasta 3 retos a la vez.</p>}
          <ul className="ch-catalog">
            {board.available.map((def) => {
              const Icon = challengeIcons[def.kind];
              const missed = board.missed.find((item) => item.def.kind === def.kind);
              return (
                <li key={def.kind} className="ch-option">
                  <span className="icon-tile" aria-hidden="true"><Icon size={19} /></span>
                  <span className="grow">
                    <strong>{def.title}</strong>
                    <small>{missed ? `La última vez: ${missed.count} de ${missed.target}. ${def.detail}` : def.detail}</small>
                  </span>
                  <Button size="s" variant={missed ? "secondary" : "primary"} disabled={!board.canStart} onClick={() => begin(def.kind, def.title)}>
                    {missed ? <><RotateCcw size={14} />Reintentar</> : "Empezar"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <Toast toast={toast} />
    </div>
  );
}

function ActiveCard({ item, onAbandon }: { item: BoardItem; onAbandon: () => void }) {
  const Icon = challengeIcons[item.def.kind];
  const pace = paceLine(item);
  return (
    <article className="ch-card" aria-labelledby={`ch-${item.id}`}>
      <div className="ch-card-head">
        <span className="icon-tile accent" aria-hidden="true"><Icon size={19} /></span>
        <span className="grow">
          <strong id={`ch-${item.id}`}>{item.def.title}</strong>
          <small>Desde el {formatShortDate(item.start)} · {item.daysLeft === 1 ? "último día" : `quedan ${item.daysLeft} días`}</small>
        </span>
      </div>
      <p className="ch-count"><span className="num-display">{item.count}</span><span className="nmetric-soft num">/{item.target}</span> <span className="ch-unit">{item.def.unit}</span></p>
      <ProgressBar value={(item.count / item.target) * 100} label={`${item.count} de ${item.target} ${item.def.unit}`} />
      {pace && <p className="ch-pace">{pace}</p>}
      <button type="button" className="link-button ch-abandon" onClick={onAbandon}>Abandonar</button>
    </article>
  );
}
