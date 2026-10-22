import { Sparkles } from "lucide-react";
import type { Learned } from "@/lib/adaptation";

/**
 * «PULSO aprendió»: lo que el entrenamiento ya cambió por cómo te ha ido (molestias, cansancio, lo que te
 * costó o te salió fácil, lo que progresas y lo que cambias seguido). No se muestra sin nada que contar.
 */
export function LearnedCard({ items }: { items: Learned[] }) {
  if (!items.length) return null;
  return (
    <section className="section prog-learned" aria-labelledby="prog-learned-title">
      <h2 id="prog-learned-title" className="meta">PULSO aprendió</h2>
      <ul className="list prog-learned-list">
        {items.map((item) => (
          <li key={item.key} className="list-row">
            <span className="icon-tile" aria-hidden="true"><Sparkles size={18} /></span>
            <span className="grow"><small>{item.text}</small></span>
          </li>
        ))}
      </ul>
      <p className="prog-learned-note">Esto ajusta tus próximas sesiones. Puedes cambiarlo cuando quieras desde el menú de cada ejercicio.</p>
    </section>
  );
}
