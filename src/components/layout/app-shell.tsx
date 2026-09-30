import { BottomNavigation } from "@/components/navigation/bottom-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <div className="app-ambient" aria-hidden="true"><i /><i /><i /></div>
      <main className="page-container">{children}</main>
      <BottomNavigation />
    </div>
  );
}
