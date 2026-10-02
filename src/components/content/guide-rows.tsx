import type { CSSProperties } from "react";
import { StatusBadge } from "@/components/ui";
import type { Article } from "@/types";
import { readMinutes } from "./guide-data";

/** Lista de lectura: índice, categoría, título y los minutos como número protagonista. */
export function GuideRows({ articles, dayId, onOpen }: { articles: Article[]; dayId?: number; onOpen: (article: Article) => void }) {
  return (
    <ol className="cnt-reads">
      {articles.map((article, index) => {
        const minutes = readMinutes(article);
        return (
          <li key={article.id} className="rise" style={{ "--i": index } as CSSProperties}>
            <button type="button" className="cnt-read" onClick={() => onOpen(article)}>
              <span className="cnt-read-index num" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <span className="cnt-read-body">
                <span className="cnt-read-meta">
                  <span className="meta">{article.category}</span>
                  {article.id === dayId && <StatusBadge>Guía del día</StatusBadge>}
                </span>
                <strong className="cnt-read-title">{article.title}</strong>
              </span>
              {minutes === null ? (
                <span className="cnt-read-time"><span className="meta">{article.readTime}</span></span>
              ) : (
                <span className="cnt-read-time">
                  <b>{minutes}</b>
                  <span className="meta">min<span className="sr-only"> de lectura</span></span>
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
