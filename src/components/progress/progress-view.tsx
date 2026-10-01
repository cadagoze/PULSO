"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader, Segmented } from "@/components/ui";
import { AchievementsTab } from "@/components/progress/achievements-tab";
import { BodyTab } from "@/components/progress/body-tab";
import { HistoryTab } from "@/components/progress/history-tab";
import { RecordsTab } from "@/components/progress/records-tab";
import { SummaryTab } from "@/components/progress/summary-tab";

const tabs = [
  { value: "resumen", label: "Resumen" },
  { value: "historial", label: "Historial" },
  { value: "records", label: "Récords" },
  { value: "cuerpo", label: "Cuerpo" },
  { value: "logros", label: "Logros" },
] as const;

type Tab = (typeof tabs)[number]["value"];

function isTab(value: string | null): value is Tab {
  return tabs.some((tab) => tab.value === value);
}

export function ProgressView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("tab");
  const tab: Tab = isTab(raw) ? raw : "resumen";
  const label = tabs.find((item) => item.value === tab)?.label ?? "Resumen";

  function change(next: Tab) {
    router.replace(next === "resumen" ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  }

  return (
    <div className="page prog-page">
      <PageHeader eyebrow="TU EVOLUCIÓN" title="Progreso" />
      <div className="prog-tabs">
        <Segmented options={[...tabs]} value={tab} onChange={change} label="Secciones de progreso" />
      </div>
      <div role="tabpanel" aria-label={label} className="prog-panel">
        {tab === "resumen" && <SummaryTab />}
        {tab === "historial" && <HistoryTab />}
        {tab === "records" && <RecordsTab />}
        {tab === "cuerpo" && <BodyTab />}
        {tab === "logros" && <AchievementsTab />}
      </div>
    </div>
  );
}
