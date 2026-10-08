import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreakPlayer } from "@/components/breaks/break-player";
import { breakRoutineById, breakRoutines } from "@/data/active-breaks";

export const dynamicParams = false;

export function generateStaticParams() {
  return breakRoutines.map((routine) => ({ id: routine.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: breakRoutineById.get(id)?.name ?? "Pausa activa" };
}

export default async function BreakPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!breakRoutineById.has(id)) notFound();
  return <BreakPlayer routineId={id} />;
}
