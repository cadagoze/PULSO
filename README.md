# PULSO

PULSO es una aplicación de entrenamiento de fuerza en casa y gimnasio: planifica, entrena serie a serie y progresa con datos, sin depender de una cuenta ni de internet.

## Stack

- Next.js 16 con App Router
- React 19 y TypeScript
- Tailwind CSS 4
- Lucide React
- Recharts

## Requisitos

- Node.js 20.9 o superior
- npm

## Instalación

```bash
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Comandos

- `npm run dev`: servidor de desarrollo.
- `npm run lint`: validación de código.
- `npm run typecheck`: validación de tipos sin generar archivos.
- `npm test`: pruebas de la lógica de entrenamiento (progresión, récords, recuperación, rachas, generador y programas).
- `npm run build`: compilación de producción.
- `npm run verify`: ejecuta lint, tipos, pruebas y build como control completo.
- `npm run start`: servidor de producción.

## Rutas

- `/`: Hoy. Chequeo de preparación (0–100), entrenamiento del día (programa activo o generado), semana y racha, recuperación muscular, accesos rápidos y bienestar.
- `/entrenar`: Para hoy (generador por lugar, equipo, duración y enfoque), Rutinas, Programas y Herramientas (1RM, discos, calentamiento).
- `/entrenar/programas/[id]`: detalle de cada programa de varias semanas con descarga.
- `/entrenar/sesion`: registro en vivo con serie anterior, tipos de serie, RIR, descanso automático, superseries, sustituciones, récords y resumen final.
- `/entrenar/intervalos`: temporizador de intervalos (Tabata, HIIT, EMOM o personalizado) con sonido y voz.
- `/ejercicios` y `/ejercicios/[id]`: biblioteca de 73 ejercicios con foto o ilustración (inicio y final), filtros, mapa muscular, técnica, progreso y alternativas.
- `/progreso`: resumen semanal, historial, récords, cuerpo (peso y medidas) y logros.
- `/perfil`: plan, preferencias de entrenamiento, unidades, tema, racha y respaldo de datos.
- `/guia` y `/comidas`: contenido educativo y registro de comidas por saciedad.

## Estructura

- `src/app`: rutas.
- `src/components`: interfaz por área (`home`, `train`, `session`, `library`, `progress`, `profile`, `exercises`, `ui`).
- `src/styles`: estilos por área; los tokens y componentes base viven en `src/app/globals.css`.
- `src/data`: datos centralizados (ejercicios, programas, catálogo, contenido e ilustraciones).
- `src/lib`: lógica sin interfaz (`progression`, `analytics`, `generator`, `programs`, `store`, `session`, `feedback`, `illustration`).
- `src/types`: contratos.

## Ilustraciones de ejercicios

Los ejercicios sin foto se muestran con una ilustración propia en dos viñetas (inicio → final). Cada una es una pose en `src/data/illustrations`: ángulos por segmento del cuerpo (0° abajo, 90° adelante, 180° arriba) y accesorios como bancos, barras, bandas o máquinas. `src/lib/illustration.ts` la convierte en SVG, apoya la figura en el suelo y destaca en lima los músculos principales. `npm test` falla si un ejercicio sin foto queda sin ilustración o si una figura se sale del cuadro.

## Cómo decide PULSO

- **Progresión doble:** sube repeticiones dentro del rango y, cuando todas las series llegan al tope con al menos 1 repetición en reserva, sugiere más carga.
- **1RM estimado:** fórmula de Epley; las repeticiones en reserva cuentan como repeticiones posibles.
- **Recuperación muscular:** la fatiga de cada músculo baja en 48 h (pequeños) o 72 h (grandes); principal cuenta 1 serie y secundario 0,5.
- **Volumen semanal:** 10–20 series por músculo (6–10 para principiantes).
- **Carga de entrenamiento:** esfuerzo × minutos; relación de 7 días frente a la media de 28 días (0,8–1,3 zona óptima).
- **Racha:** semanas seguidas cumpliendo el objetivo; se puede pausar una semana.

## Datos

Todo se guarda en el almacenamiento local del navegador; no hay backend ni cuentas. Desde Perfil puedes exportar e importar un respaldo JSON, exportar tus entrenamientos en CSV y pedir almacenamiento persistente. PULSO se puede instalar como aplicación (manifest e íconos incluidos) y funciona sin conexión: el service worker (`public/sw.js`) guarda las pantallas principales, los programas y las fichas de ejercicio (lista en `/precache.json`). Sólo se activa en producción; si cambias su lógica, sube `VERSION` en `public/sw.js`.

El build para Cloudflare (`npm run build:vinext`) requiere Node 22 (`nvm use`, ver `.nvmrc`).

## Limitaciones

Sin sincronización entre dispositivos, autenticación, notificaciones push ni integraciones con relojes o sensores. La orientación es general y no reemplaza evaluación médica.
