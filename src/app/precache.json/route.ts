import { exercises } from "@/data/mock-data";
import { programs } from "@/data/programs";

export const dynamic = "force-static";

/** Páginas que el service worker guarda en segundo plano para usarlas sin conexión. */
export function GET() {
  return Response.json({
    pages: [
      ...programs.map((program) => `/entrenar/programas/${program.id}`),
      ...exercises.map((exercise) => `/ejercicios/${exercise.id}`),
    ],
  });
}
