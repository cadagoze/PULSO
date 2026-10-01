"use client";

import type { MouseEvent } from "react";
import { Star } from "lucide-react";
import { useFavorites } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types";

/** Estrella de favorito. No dispara la navegación de la tarjeta que la contiene. */
export function FavoriteButton({ exercise, className, size = 18 }: { exercise: Exercise; className?: string; size?: number }) {
  const [favorites, setFavorites] = useFavorites();
  const active = favorites.includes(exercise.id);

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setFavorites((current) => current.includes(exercise.id)
      ? current.filter((id) => id !== exercise.id)
      : [...current, exercise.id]);
  };

  return (
    <button
      type="button"
      className={cn("lib-fav", active && "lib-fav-on", className)}
      aria-pressed={active}
      aria-label={active ? `Quitar ${exercise.name} de favoritos` : `Guardar ${exercise.name} en favoritos`}
      onClick={toggle}
    >
      <Star size={size} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
