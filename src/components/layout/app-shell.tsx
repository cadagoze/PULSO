import { BottomNavigation } from "@/components/navigation/bottom-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <main className="page-container">{children}</main>
      <BottomNavigation />
    </div>
  );
}
