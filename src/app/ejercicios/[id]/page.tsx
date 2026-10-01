import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exercises } from "@/data/mock-data";
import { ExerciseDetail } from "@/components/library/exercise-detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return exercises.map((exercise) => ({ id: String(exercise.id) }));
}

function findExercise(id: string) {
  return exercises.find((exercise) => String(exercise.id) === id);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const exercise = findExercise(id);
  return exercise ? { title: exercise.name, description: exercise.benefit } : { title: "Ejercicio" };
}

export default async function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exercise = findExercise(id);
  if (!exercise) notFound();
  return <ExerciseDetail exerciseId={exercise.id} />;
}
