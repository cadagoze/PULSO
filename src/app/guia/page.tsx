"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, ChevronRight, Clock3, Moon, Salad, Sparkles, X } from "lucide-react";
import { articles } from "@/data/mock-data";
import { PageHeader } from "@/components/ui";
import type { Article } from "@/types";

const categories = ["Recomendado", "Entrenamiento", "Alimentación", "Descanso"];

const articleCopy: Record<Article["category"], string> = {
  Entrenamiento: "Avanza de forma gradual, prioriza una técnica cómoda y deja espacio para recuperarte. Una rutina sostenible se construye con sesiones que puedes repetir.",
  Alimentación: "Observa patrones semanales en lugar de perseguir un día perfecto. Combina alimentos simples, suficientes y variados que te ayuden a mantener energía y saciedad.",
  Descanso: "Dormir y bajar el ritmo también forman parte del progreso. Una recuperación consistente ayuda a sostener el movimiento y tomar mejores decisiones durante el día.",
};

export default function GuidePage() {
  const [category, setCategory] = useState("Recomendado");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const visible = category === "Recomendado" ? articles : articles.filter((article) => article.category === category);
  return (
    <div className="page-stack guide-page">
      <PageHeader eyebrow="APRENDE A TU RITMO" title="Tu guía" subtitle="Información práctica para sostener tu progreso." />
      <div className="category-scroll">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {category === "Recomendado" && <article className="featured-article"><div className="editorial-art"><div className="orb one" /><div className="orb two" /><BookOpen size={52} /></div><div><span><Sparkles size={14} /> RECOMENDADO PARA TI</span><h2>Por qué el peso cambia cada día</h2><p>Aprende a mirar la tendencia sin preocuparte por cada variación.</p><button onClick={() => setSelectedArticle(articles[0])}>Leer artículo <ArrowUpRight size={17} /></button></div></article>}
      <section className="article-section"><div className="section-header"><h2>{category === "Recomendado" ? "Explora" : category}</h2><span>{visible.length} artículos</span></div><div className="article-grid">{visible.filter((article) => !article.featured || category !== "Recomendado").map((article) => <article className="article-card" key={article.id}><div className={`article-icon ${article.category.toLowerCase()}`}>{article.category === "Alimentación" ? <Salad size={23} /> : article.category === "Descanso" ? <Moon size={23} /> : <BookOpen size={23} />}</div><div><span>{article.category}</span><h3>{article.title}</h3><p><Clock3 size={13} /> {article.readTime} de lectura</p></div><button className="icon-button" onClick={() => setSelectedArticle(article)} aria-label={`Leer ${article.title}`}><ChevronRight size={18} /></button></article>)}</div></section>
      <aside className="guide-quote"><span>“</span><p>Lo que puedes sostener vale más que lo que haces perfecto por unos días.</p><small>RECORDATORIO DE LA SEMANA</small></aside>
      {selectedArticle && <div className="modal-backdrop" onMouseDown={() => setSelectedArticle(null)}><article className="sheet-modal article-modal" role="dialog" aria-modal="true" aria-labelledby="article-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-handle" /><header><div><span>{selectedArticle.category.toUpperCase()} · {selectedArticle.readTime}</span><h2 id="article-title">{selectedArticle.title}</h2></div><button className="icon-button" onClick={() => setSelectedArticle(null)} aria-label="Cerrar"><X size={20} /></button></header><div className="article-body"><p>{articleCopy[selectedArticle.category]}</p><h3>Una idea para hoy</h3><p>Elige un cambio pequeño que puedas repetir mañana. Registra cómo te resulta y ajusta sin castigarte.</p><aside>Este contenido es educativo y no reemplaza orientación médica o nutricional personalizada.</aside></div></article></div>}
    </div>
  );
}
