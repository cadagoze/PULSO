"use client";

import { useRef, useState } from "react";
import { EmptyState, PageHeader, Sheet, ToggleChip } from "@/components/ui";
import { ArticleReader } from "@/components/content/article-reader";
import { GuideCover } from "@/components/content/guide-cover";
import { GuideRows } from "@/components/content/guide-rows";
import { articles } from "@/data/mock-data";
import { useNow } from "@/lib/use-now";
import { localDaySeed } from "@/lib/utils";
import type { Article } from "@/types";

type Category = "Recomendado" | Article["category"];

const categories: Category[] = ["Recomendado", "Entrenamiento", "Alimentación", "Descanso"];

/** Pone primero la "Guía del día" (la misma que enlaza Inicio), si está en la lista. */
function dayFirst(list: Article[], dayId: number | undefined) {
  const day = list.find((article) => article.id === dayId);
  return day ? [day, ...list.filter((article) => article !== day)] : list;
}

export default function GuidePage() {
  const now = useNow();
  const [category, setCategory] = useState<Category>("Recomendado");
  // La lectura abierta se conserva al cerrar para que la hoja no se vacíe mientras baja.
  const [reading, setReading] = useState<Article | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const dayId = now && articles.length ? articles[localDaySeed(now) % articles.length].id : undefined;
  const recommended = category === "Recomendado";
  const visible = recommended
    ? dayFirst(articles.filter((article) => article.id !== featured?.id), dayId)
    : articles.filter((article) => article.category === category);

  function choose(item: Category) {
    setCategory(item);
    // En móvil la fila de filtros se desplaza: tras pintar (el chip elegido cambia de ancho), se desliza hasta verse entero.
    requestAnimationFrame(() => {
      const chip = filtersRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      chip?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: smooth ? "smooth" : "auto" });
    });
  }

  function open(article: Article) {
    setReading(article);
    setReaderOpen(true);
  }

  return (
    <div className="page cnt-page cnt-split cnt-guide">
      <div className="cnt-lead">
        <PageHeader backHref="/perfil" meta="Aprende a tu ritmo" title="Tu guía" subtitle="Información práctica para sostener tu progreso." />
        <div ref={filtersRef} className="scroll-x cnt-filters" role="group" aria-label="Categorías">
          {categories.map((item) => (
            <ToggleChip key={item} pressed={category === item} onChange={() => choose(item)}>{item}</ToggleChip>
          ))}
        </div>
      </div>

      <div className="cnt-main">
        {/* En móvil la portada sólo acompaña a «Recomendado»; en escritorio queda fija a la izquierda con cualquier filtro. */}
        {featured && <GuideCover article={featured} isDay={featured.id === dayId} onOpen={() => open(featured)} className={recommended ? undefined : "cnt-cover-aside"} />}

        <section className="cnt-section" aria-labelledby="cnt-reads-title">
          <div className="cnt-head">
            <h2 id="cnt-reads-title" className="meta">{recommended ? "Explora" : category}</h2>
            <span className="cnt-hint"><span className="num">{visible.length}</span> {visible.length === 1 ? "artículo" : "artículos"}</span>
          </div>
          {visible.length ? (
            <GuideRows key={category} articles={visible} dayId={dayId} onOpen={open} />
          ) : (
            <EmptyState title="Pronto habrá lecturas aquí">Mientras tanto, revisa las otras categorías.</EmptyState>
          )}
        </section>

        <aside className="cnt-quote" aria-labelledby="cnt-quote-label">
          <p id="cnt-quote-label" className="meta">Recordatorio de la semana</p>
          <blockquote className="cnt-quote-text">
            <p>Lo que puedes sostener vale más que lo que haces perfecto por unos días.</p>
          </blockquote>
        </aside>
      </div>

      <Sheet
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        eyebrow={reading ? `${reading.category} · ${reading.readTime}` : undefined}
        title={reading?.title}
        className="cnt-sheet"
      >
        {reading && <ArticleReader article={reading} />}
      </Sheet>
    </div>
  );
}
