"use client";

import Link from "@/components/ui/app-link";
import { ChevronRight, Medal } from "lucide-react";
import { ProgressBar } from "@/components/ui";
import { challengeIcons } from "@/components/progress/challenges-tab";
import { useChallengeBoard } from "@/lib/use-challenges";

const DAY = 86_400_000;

/** En Inicio: el reto en curso con más avance, o la medalla recién ganada (3 días). Sin retos, nada. */
export function ChallengeRow() {
  const board = useChallengeBoard();
  if (!board.ready) return null;
  const current = board.active[0];
  const recent = board.medals.find((item) => item.doneOn && new Date(`${board.today}T12:00:00`).getTime() - new Date(`${item.doneOn}T12:00:00`).getTime() <= 3 * DAY);
  if (!current && !recent) return null;

  if (!current && recent) {
    return (
      <Link href="/progreso?tab=retos" className="home-challenge is-done">
        <span className="home-challenge-medal" aria-hidden="true"><Medal size={20} /></span>
        <span className="grow"><strong>¡Reto cumplido!</strong><small>{recent.def.title} · suma otro cuando quieras</small></span>
        <ChevronRight size={18} className="subtle" aria-hidden="true" />
      </Link>
    );
  }

  const Icon = challengeIcons[current.def.kind];
  return (
    <Link href="/progreso?tab=retos" className="home-challenge">
      <span className="icon-tile accent" aria-hidden="true"><Icon size={18} /></span>
      <span className="grow">
        <span className="home-challenge-top">
          <strong>{current.def.title}</strong>
          <small className="num">{current.count}/{current.target}</small>
        </span>
        <ProgressBar value={(current.count / current.target) * 100} label={`${current.count} de ${current.target} ${current.def.unit}`} />
        <small>{current.daysLeft === 1 ? "Último día del reto" : `Quedan ${current.daysLeft} días`}{board.active.length > 1 ? ` · ${board.active.length - 1} reto más` : ""}</small>
      </span>
      <ChevronRight size={18} className="subtle" aria-hidden="true" />
    </Link>
  );
}
