"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, ChevronRight, Clock3, Moon, Salad, Sparkles, X } from "lucide-react";
import { articles } from "@/data/mock-data";
import { PageHeader } from "@/components/ui";
import type { Article } from "@/types";

const categories = ["Recomendado", "Entrenamiento", "Alimentación", "Descanso"];

const articleDetails: Record<number, { intro: string; action: string }> = {
  1: { intro: "El agua, la sal, el horario de la última comida y el tránsito intestinal pueden mover la balanza de un día a otro sin que hayas ganado grasa.", action: "Compara promedios de siete días y pésate en condiciones similares. Recién ahí decide si necesitas ajustar algo." },
  2: { intro: "Dos sesiones de fuerza y caminatas breves ya forman una base útil. No es necesario concentrar todo el esfuerzo el fin de semana.", action: "Separa las sesiones de fuerza por al menos un día y usa caminatas de 10 minutos después de comer cuando tengas espacio." },
  3: { intro: "Después de una pausa, intentar recuperar todo en una sesión suele dejar más fatiga que progreso. Tu capacidad regresa más rápido con una entrada gradual.", action: "Haz la versión corta, usa dos series por ejercicio y termina sintiendo que podrías haber hecho un poco más." },
  4: { intro: "Sueño insuficiente, dolor muscular que cambia tu técnica y falta de energía inusual son señales para reducir la exigencia, no para abandonar.", action: "Cambia la sesión por una caminata suave, hidrátate y vuelve a evaluar mañana cómo te sientes." },
  5: { intro: "Un plato completo no requiere pesar alimentos: puedes estimar proporciones usando el plato y tu propia mano.", action: "Prueba medio plato de verduras, una palma de proteína y un puño de carbohidrato. Ajusta según hambre y energía." },
  6: { intro: "Subir dificultad sólo tiene sentido cuando completas todas las series con técnica estable y sin dolor durante dos sesiones seguidas.", action: "Agrega primero una o dos repeticiones. Si la técnica cambia, vuelve al número anterior y consolídalo." },
};

export default function GuidePage() {
  const [category, setCategory] = useState("Recomendado");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const visible = category === "Recomendado" ? articles : articles.filter((article) => article.category === category);
  return (
    <div className="page-stack guide-page">
      <PageHeader eyebrow="APRENDE A TU RITMO" title="Tu guía" subtitle="Información práctica para sostener tu progreso." />
      <div className="category-scroll">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {category === "Recomendado" && <article className="featured-article"><div className="editorial-art"><div className="orb one" /><div className="orb two" /><BookOpen size={52} /></div><div><span><Sparkles size={14} /> RECOMENDADO SEGÚN TU PROGRESO</span><h2>{articles[0].title}</h2><p>Distingue una variación normal de una tendencia antes de cambiar tu alimentación.</p><button onClick={() => setSelectedArticle(articles[0])}>Abrir guía de 4 minutos <ArrowUpRight size={17} /></button></div></article>}
      <section className="article-section"><div className="section-header"><h2>{category === "Recomendado" ? "Explora" : category}</h2><span>{visible.length} artículos</span></div><div className="article-grid">{visible.filter((article) => !article.featured || category !== "Recomendado").map((article) => <article className="article-card" key={article.id}><div className={`article-icon ${article.category.toLowerCase()}`}>{article.category === "Alimentación" ? <Salad size={23} /> : article.category === "Descanso" ? <Moon size={23} /> : <BookOpen size={23} />}</div><div><span>{article.category}</span><h3>{article.title}</h3><p><Clock3 size={13} /> {article.readTime} de lectura</p></div><button className="icon-button" onClick={() => setSelectedArticle(article)} aria-label={`Leer ${article.title}`}><ChevronRight size={18} /></button></article>)}</div></section>
      <aside className="guide-quote"><span>“</span><p>Lo que puedes sostener vale más que lo que haces perfecto por unos días.</p><small>RECORDATORIO DE LA SEMANA</small></aside>
      {selectedArticle && <div className="modal-backdrop" onMouseDown={() => setSelectedArticle(null)}><article className="sheet-modal article-modal" role="dialog" aria-modal="true" aria-labelledby="article-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-handle" /><header><div><span>{selectedArticle.category.toUpperCase()} · {selectedArticle.readTime}</span><h2 id="article-title">{selectedArticle.title}</h2></div><button className="icon-button" onClick={() => setSelectedArticle(null)} aria-label="Cerrar"><X size={20} /></button></header><div className="article-body"><p>{articleDetails[selectedArticle.id].intro}</p><h3>Qué hacer con esta información</h3><p>{articleDetails[selectedArticle.id].action}</p><aside>Orientación educativa general. Si aparecen dolor persistente, mareos o cambios de peso inexplicables, consulta a un profesional de salud.</aside></div></article></div>}
    </div>
  );
}
