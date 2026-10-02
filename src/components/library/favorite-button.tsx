"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { Star } from "lucide-react";
import { useFavorites } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

/**
 * Estrella de favorito. No dispara la navegación de la tarjeta que la contiene.
 * `glass` es la versión para fotografías y portadas oscuras.
 */
export function FavoriteButton({ exercise, className, size = 18, variant = "plain" }: { exercise: Exercise; className?: string; size?: number; variant?: "plain" | "glass" }) {
  const [favorites, setFavorites] = useFavorites();
  // El rebote sólo se ve al marcar, no al cargar la pantalla con favoritos guardados.
  const [popped, setPopped] = useState(false);
  const active = favorites.includes(exercise.id);

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setPopped(!active);
    setFavorites((current) => current.includes(exercise.id)
      ? current.filter((id) => id !== exercise.id)
      : [...current, exercise.id]);
  };

  return (
    <button
      type="button"
      className={cn("lib-fav", variant === "glass" && "lib-fav-glass", active && "lib-fav-on", active && popped && "lib-fav-pop", className)}
      aria-pressed={active}
      aria-label={active ? `Quitar ${exercise.name} de favoritos` : `Guardar ${exercise.name} en favoritos`}
      onClick={toggle}
    >
      <Star size={size} fill={active ? "currentColor" : "none"} strokeWidth={active ? 1.6 : 1.9} aria-hidden="true" />
    </button>
  );
}
