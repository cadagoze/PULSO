import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { exercises } from "@/data/exercises";

/** Acceso a la biblioteca de ejercicios (vive dentro de Entrenar desde que Nutrición entró a la barra). */
export function LibraryLink() {
  return (
    <Link href="/ejercicios" className="train-library pressable">
      <span className="num-display train-library-count">{exercises.length}</span>
      <span className="grow">
        <span className="meta">Biblioteca</span>
        <strong>Ejercicios con técnica paso a paso</strong>
        <small>Foto o ilustración, músculos, progreso y alternativas.</small>
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </Link>
  );
}
