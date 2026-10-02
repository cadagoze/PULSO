import type { Article } from "@/types";
import { articleDetails } from "./guide-data";

/** Contenido de la hoja de lectura: introducción, qué hacer y la nota de orientación general. */
export function ArticleReader({ article }: { article: Article }) {
  const detail = articleDetails[article.id];
  return (
    <div className="cnt-reader">
      {detail ? (
        <>
          <p className="cnt-reader-lead">{detail.intro}</p>
          <section className="cnt-reader-action">
            <p className="meta">Qué hacer con esta información</p>
            <p>{detail.action}</p>
          </section>
        </>
      ) : (
        <p className="muted">Pronto tendrás esta lectura completa.</p>
      )}
      <p className="cnt-reader-note">
        Orientación educativa general. Si aparecen dolor persistente, mareos o cambios de peso inexplicables, consulta a un profesional de salud.
      </p>
    </div>
  );
}
