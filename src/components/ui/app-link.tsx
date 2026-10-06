"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { usePrefetchReady } from "@/lib/prefetch-gate";

/** `next/link` con la precarga diferida hasta que la página terminó de cargar (ver prefetch-gate). */
export default function Link({ prefetch, ...props }: ComponentProps<typeof NextLink>) {
  const ready = usePrefetchReady();
  return <NextLink {...props} prefetch={ready ? prefetch : false} />;
}
