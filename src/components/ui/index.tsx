import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, subtitle, backHref }: { eyebrow?: string; title: string; subtitle?: string; backHref?: string }) {
  return (
    <header className="page-header">
      {backHref && <Link href={backHref} className="icon-button" aria-label="Volver"><ArrowLeft size={20} /></Link>}
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </header>
  );
}

export function SectionHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
  return <div className="section-header"><h2>{title}</h2>{action && href && <Link href={href}>{action}<ArrowRight size={15} /></Link>}</div>;
}

export function PrimaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("button button-primary", className)} {...props}>{children}</button>;
}

export function SecondaryButton({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn("button button-secondary", className)} {...props}>{children}</button>;
}

export function ProgressBar({ value, purple = false }: { value: number; purple?: boolean }) {
  return <div className="progress-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span className={purple ? "purple" : ""} style={{ width: `${value}%` }} /></div>;
}

export function ProgressRing({ value, size = 112, children }: { value: number; size?: number; children?: ReactNode }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true"><circle className="ring-track" cx="50" cy="50" r={radius} /><circle className="ring-value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)} /></svg>
      <div className="ring-content">{children}</div>
    </div>
  );
}

export function StatusBadge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "purple" | "muted" }) {
  return <span className={`status-badge status-${tone}`}>{children}</span>;
}
