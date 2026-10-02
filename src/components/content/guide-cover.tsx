import { ArrowUpRight } from "lucide-react";
import { RoutineCard } from "@/components/ui/cards";
import { cn } from "@/lib/utils";
import type { Article } from "@/types";
import { articleDetails, readMinutes } from "./guide-data";

/** Lectura destacada como portada tipográfica: los minutos de lectura en grande sobre atmósfera. */
export function GuideCover({ article, isDay, onOpen, className }: { article: Article; isDay: boolean; onOpen: () => void; className?: string }) {
  const minutes = readMinutes(article);
  const dek = articleDetails[article.id]?.dek;
  return (
    <RoutineCard
      onClick={onOpen}
      size="l"
      tone="warm"
      className={cn("cnt-cover", className)}
      number={minutes === null ? undefined : String(minutes).padStart(2, "0")}
      numberLabel={minutes === null ? undefined : "min de lectura"}
      eyebrow={`${isDay ? "Guía del día" : "Recomendado para ti"} · ${article.category}`}
      title={article.title}
      meta={dek ? [dek] : undefined}
      action={<span className="btn btn-primary btn-small">Leer ahora<ArrowUpRight size={16} /></span>}
    />
  );
}
