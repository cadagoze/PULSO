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

- `/`: Inicio. Portada con la sesión de hoy (en curso, programa activo o generada), semana editorial con racha, chequeo de preparación, atajos y resumen del día.
- `/entrenar`: Casa o Gimnasio, equipamiento, Tu rutina de hoy (la misma del Inicio; ajustar duración y enfoque, editar ejercicios y cargas, guardar como rutina), rutinas sugeridas, tus rutinas y herramientas (1RM, discos, calentamiento, intervalos).
- `/entrenar/programas/[id]`: detalle de cada programa de varias semanas con descarga.
- `/entrenar/sesion`: registro en vivo con serie anterior, tipos de serie, RIR, descanso automático, superseries, sustituciones, récords y resumen final.
- `/entrenar/intervalos`: temporizador de intervalos (Tabata, HIIT, EMOM o personalizado) con sonido y voz.
- `/ejercicios` y `/ejercicios/[id]`: biblioteca de 73 ejercicios con foto o ilustración (inicio y final), filtros, mapa muscular, técnica, progreso y alternativas.
- `/progreso`: Semana, Mes o Año: entrenamientos, volumen y tiempo total primero; gráfico, consistencia, mejores marcas, peso y músculos (trabajo y recuperación); historial, récords, cuerpo, logros y exportación.
- `/perfil`: foto, nombre, objetivo, cifras y Mi plan actual.
- `/ajustes`: apariencia, entrenamiento, racha, respaldo de datos y acerca de.
- `/comidas`: comidas por saciedad y hábitos del día. `/guia`: lecturas breves.

## Estructura

- `src/app`: rutas.
- `src/components`: interfaz por área (`home`, `train`, `session`, `library`, `progress`, `profile`, `content`, `onboarding`, `exercises`, `ui`).
- `src/styles`: estilos por área; los tokens y componentes base viven en `src/app/globals.css`.
- `src/data`: datos centralizados (ejercicios, programas, catálogo, contenido e ilustraciones).
- `src/lib`: lógica sin interfaz (`progression`, `analytics`, `generator`, `programs`, `store`, `session`, `feedback`, `illustration`).
- `src/types`: contratos.

## Sistema visual

PULSO combina funcionalidad limpia, fotografía editorial y tipografía con carácter: «Entrenamiento que se adapta a tu vida».

- **Color** (tokens en `src/app/globals.css`): marfil `#F5F3EC`, superficie blanca, carbón `#161816`, verde bosque `#1E3026` y lima `#B7F34A` como identidad; naranja `#FF6633` sólo como acento (rachas y récords). Modo oscuro completo; `.on-dark` aplica la paleta oscura a una zona (sesión activa, fotos, barra de navegación).
- **Tipografía**: Archivo con eje de ancho para títulos y números protagonistas, Geist para la interfaz y Geist Mono para etiquetas editoriales.
- **Componentes** (`src/components/ui`): `Button`, `SegmentedControl` (indicador que se desliza), `Sheet` (hoja inferior que se cierra deslizando), `NumberMetric`, `Metric`, `StatCard`, `Card`, `PhotoCard`, `RoutineCard`, `ProgressRing`, `WorkoutTimer`, `ToggleChip` y `Toast`; `ExerciseVisual` y `ExerciseCard` en `src/components/exercises`.
- **Movimiento**: `--motion-fast` 140 ms, `--motion-base` 220 ms, `--motion-slow` 320 ms y la curva `--ease-standard`; sólo `transform` y `opacity`, y todo se desactiva con «reducir movimiento». Las animaciones de entrada usan `animation-fill-mode: backwards` (nunca `both`): una transformación que persiste rompe los elementos fijos como las hojas.
- **Textura** (grano, desenfoque, atmósfera) sólo en onboarding, portadas, estados especiales y fondos de foto. Las fotos viven en `public/images` en WebP.

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
