import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ejercicios",
  description: "Biblioteca de ejercicios de PULSO: técnica paso a paso para entrenar en casa o en el gimnasio.",
};

export default function ExercisesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
