"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, ChevronRight, Clock3, Dumbbell, Moon, Salad, Sparkles } from "lucide-react";
import { articles } from "@/data/mock-data";
import { PageHeader, Sheet } from "@/components/ui";
import type { Article } from "@/types";

type Category = "Recomendado" | Article["category"];

const categories: Category[] = ["Recomendado", "Entrenamiento", "Alimentación", "Descanso"];

const articleDetails: Record<number, { intro: string; action: string }> = {
  1: { intro: "El agua, la sal, el horario de la última comida y el tránsito intestinal pueden mover la balanza de un día a otro sin que hayas ganado grasa.", action: "Compara promedios de siete días y pésate en condiciones similares. Recién ahí decide si necesitas ajustar algo." },
  2: { intro: "Dos sesiones de fuerza y caminatas breves ya forman una base útil. No es necesario concentrar todo el esfuerzo el fin de semana.", action: "Separa las sesiones de fuerza por al menos un día y usa caminatas de 10 minutos después de comer cuando tengas espacio." },
  3: { intro: "Después de una pausa, intentar recuperar todo en una sesión suele dejar más fatiga que progreso. Tu capacidad regresa más rápido con una entrada gradual.", action: "Haz la versión corta, usa dos series por ejercicio y termina sintiendo que podrías haber hecho un poco más." },
  4: { intro: "Sueño insuficiente, dolor muscular que cambia tu técnica y falta de energía inusual son señales para reducir la exigencia, no para abandonar.", action: "Cambia la sesión por una caminata suave, hidrátate y vuelve a evaluar mañana cómo te sientes." },
  5: { intro: "Un plato completo no requiere pesar alimentos: puedes estimar proporciones usando el plato y tu propia mano.", action: "Prueba medio plato de verduras, una palma de proteína y un puño de carbohidrato. Ajusta según hambre y energía." },
  6: { intro: "Subir dificultad sólo tiene sentido cuando completas todas las series con técnica estable y sin dolor durante dos sesiones seguidas.", action: "Agrega primero una o dos repeticiones. Si la técnica cambia, vuelve al número anterior y consolídalo." },
};

const categoryTone: Record<Article["category"], string> = {
  Entrenamiento: "cnt-tone-train",
  Alimentación: "cnt-tone-food",
  Descanso: "cnt-tone-rest",
};

function CategoryIcon({ category, size = 20 }: { category: Article["category"]; size?: number }) {
  if (category === "Alimentación") return <Salad size={size} />;
  if (category === "Descanso") return <Moon size={size} />;
  return <Dumbbell size={size} />;
}

function FeaturedArticle({ article, onOpen }: { article: Article; onOpen: () => void }) {
  return (
    <article className="card card-forest card-l cnt-featured">
      <div className="cnt-featured-art" aria-hidden="true">
        <span className="cnt-ring one" />
        <span className="cnt-ring two" />
        <BookOpen size={44} />
      </div>
      <div className="cnt-featured-copy">
        <p className="eyebrow"><Sparkles size={13} /> Recomendado según tu progreso</p>
        <h2>{article.title}</h2>
        <p>Distingue una variación normal de una tendencia antes de cambiar tu alimentación.</p>
        <button type="button" className="btn btn-primary" onClick={onOpen}>
          Leer en <span className="num">{article.readTime}</span>
          <ArrowUpRight size={17} />
        </button>
      </div>
    </article>
  );
}

function ArticleCard({ article, index, onOpen }: { article: Article; index: number; onOpen: () => void }) {
  return (
    <button type="button" className="cnt-article" onClick={onOpen} aria-label={`Leer ${article.title}`}>
      <span className="cnt-article-top">
        <span className={`cnt-article-icon ${categoryTone[article.category]}`}>
          <CategoryIcon category={article.category} />
        </span>
        <span className="cnt-article-index num">{String(index + 1).padStart(2, "0")}</span>
      </span>
      <span className="cnt-article-cat">{article.category}</span>
      <strong>{article.title}</strong>
      <span className="cnt-article-meta">
        <Clock3 size={13} />
        <span className="num">{article.readTime}</span> de lectura
        <ChevronRight size={16} className="cnt-article-go" />
      </span>
    </button>
  );
}

function ArticleDetail({ article }: { article: Article }) {
  const detail = articleDetails[article.id];
  return (
    <div className="cnt-detail">
      {detail ? (
        <>
          <p className="cnt-detail-lead">{detail.intro}</p>
          <section className="cnt-detail-action">
            <p className="eyebrow">Qué hacer con esta información</p>
            <p>{detail.action}</p>
          </section>
        </>
      ) : (
        <p className="muted">Pronto tendrás esta lectura completa.</p>
      )}
      <p className="cnt-detail-note">
        Orientación educativa general. Si aparecen dolor persistente, mareos o cambios de peso inexplicables, consulta a un profesional de salud.
      </p>
    </div>
  );
}

export default function GuidePage() {
  const [category, setCategory] = useState<Category>("Recomendado");
  const [selected, setSelected] = useState<Article | null>(null);
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const recommended = category === "Recomendado";
  const visible = recommended
    ? articles.filter((article) => article.id !== featured?.id)
    : articles.filter((article) => article.category === category);

  return (
    <div className="page cnt-page">
      <PageHeader backHref="/perfil" eyebrow="Aprende a tu ritmo" title="Tu guía" subtitle="Información práctica para sostener tu progreso." />

      <div className="scroll-x cnt-categories" role="group" aria-label="Categorías">
        {categories.map((item) => (
          <button key={item} type="button" className="chip" aria-pressed={category === item} onClick={() => setCategory(item)}>
            {item}
          </button>
        ))}
      </div>

      {recommended && featured && <FeaturedArticle article={featured} onOpen={() => setSelected(featured)} />}

      <section className="section">
        <div className="section-head">
          <h2>{recommended ? "Explora" : category}</h2>
          <span className="subtle cnt-count"><span className="num">{visible.length}</span> {visible.length === 1 ? "artículo" : "artículos"}</span>
        </div>
        <div className="cnt-article-grid">
          {visible.map((article, index) => (
            <ArticleCard key={article.id} article={article} index={index} onOpen={() => setSelected(article)} />
          ))}
        </div>
      </section>

      <aside className="cnt-quote">
        <span className="cnt-quote-mark" aria-hidden="true">“</span>
        <p>Lo que puedes sostener vale más que lo que haces perfecto por unos días.</p>
        <small className="eyebrow">Recordatorio de la semana</small>
      </aside>

      <Sheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        eyebrow={selected ? `${selected.category} · ${selected.readTime}` : undefined}
        title={selected?.title}
        className="cnt-sheet"
      >
        {selected && <ArticleDetail article={selected} />}
      </Sheet>
    </div>
  );
}
