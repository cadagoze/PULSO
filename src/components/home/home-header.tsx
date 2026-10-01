"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useSettings } from "@/lib/store";
import { formatLongDate, greeting } from "@/lib/utils";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function HomeHeader({ now }: { now: number }) {
  const [settings] = useSettings();
  const name = settings.name.trim();
  const longDate = now ? formatLongDate(new Date(now)) : "";
  const date = longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const hello = now ? greeting(new Date(now)) : "Hola";
  return (
    <header className="home-header">
      <div className="home-header-bar">
        <div className="wordmark home-wordmark">PULSO<span>.</span></div>
        <Link href="/perfil" className="home-avatar" aria-label="Tu perfil">
          {name ? <span>{initials(name)}</span> : <UserRound size={19} />}
        </Link>
      </div>
      <div className="home-greeting">
        <p className="home-date">{date || " "}</p>
        <h1>
          {hello}
          {name ? <>, <em>{name.split(/\s+/)[0]}</em></> : null}.
        </h1>
      </div>
    </header>
  );
}
