import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { programs } from "@/data/programs";
import { programById } from "@/lib/programs";
import { ProgramDetail } from "@/components/train/program-detail";

export const dynamicParams = false;

export function generateStaticParams() {
  return programs.map((program) => ({ id: program.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: programById(id)?.name ?? "Programa" };
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!programById(id)) notFound();
  return <ProgramDetail programId={id} />;
}
