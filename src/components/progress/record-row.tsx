"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { exerciseName, recordValueLabel, type Unit } from "@/components/progress/format";
import { recordKindLabels } from "@/lib/progression";
import { formatShortDate } from "@/lib/utils";
import type { PersonalRecordHit } from "@/types";

/** Un récord personal: ejercicio, tipo y fecha, la marca nueva y la anterior. Abre el progreso del ejercicio. */
export function RecordRow({ pr, date, unit, badge = true }: { pr: PersonalRecordHit; date: string; unit: Unit; badge?: boolean }) {
  return (
    <Link href={`/ejercicios/${pr.exerciseId}`} className="list-row prog-record">
      <span className="icon-tile orange" aria-hidden="true"><Trophy size={18} /></span>
      <span className="grow">
        <strong>{exerciseName(pr.exerciseId)}</strong>
        <small className="prog-record-kind">
          {badge && <StatusBadge tone="orange">Récord</StatusBadge>}
          <span>{recordKindLabels[pr.kind]} · {formatShortDate(date)}</span>
        </small>
      </span>
      <span className="prog-record-values">
        <b className="num">{recordValueLabel(pr.kind, pr.value, unit)}</b>
        <small className="num"><span className="sr-only">Antes: </span><s>{recordValueLabel(pr.kind, pr.previous, unit)}</s></small>
      </span>
    </Link>
  );
}
