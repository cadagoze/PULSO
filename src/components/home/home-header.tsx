"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { useSettings } from "@/lib/store";
import { formatLongDate } from "@/lib/utils";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

/** Marca, fecha y saludo: «Hola, Carlos» con una frase según el día. */
export function HomeHeader({ now, line }: { now: number; line: string }) {
  const [settings] = useSettings();
  const name = settings.name.trim();
  // Sólo imágenes incrustadas: un respaldo importado no puede apuntar a otra cosa.
  const photo = settings.photo?.startsWith("data:image/") ? settings.photo : undefined;
  const date = now ? formatLongDate(new Date(now)) : "";
  return (
    <header className="home-header">
      <div className="home-header-bar">
        <span className="wordmark">PULSO<span>.</span></span>
        <Link href="/perfil" className="home-avatar" aria-label="Tu perfil">
          {photo ? <span className="home-avatar-photo" style={{ backgroundImage: `url("${photo}")` }} /> : name ? <span>{initials(name)}</span> : <UserRound size={19} />}
        </Link>
      </div>
      <div className="home-greeting">
        <p className="meta">{date || " "}</p>
        <h1>Hola{name ? `, ${name.split(/\s+/)[0]}` : ""}</h1>
        <p className="home-line">{line}</p>
      </div>
    </header>
  );
}
