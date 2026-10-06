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
- `npm test`: pruebas de la lógica de entrenamiento (progresión, récords, recuperación, rachas, generador y programas), de alimentación (calorías, macros, mínimos, agua y base de alimentos) y de la sincronización (diferencias, unión y conflictos).
- `npm run build`: compilación de producción.
- `npm run verify`: ejecuta lint, tipos, pruebas y build como control completo.
- `npm run start`: servidor de producción.

## Rutas

- `/`: Inicio. Primero la nutrición de hoy (calorías restantes, proteína, contador de agua y registro directo) y después la sesión de hoy (en curso, programa activo o generada; si está en curso, se puede pausar, terminar o descartar desde la tarjeta o la barra flotante), semana editorial con racha, chequeo de preparación, atajos y resumen del día.
- `/entrenar`: Casa o Gimnasio, equipamiento, Tu rutina de hoy (la misma del Inicio; ajustar duración y enfoque, editar ejercicios y cargas, guardar como rutina), Tu semana según tu objetivo (días de fuerza, intervalos o minutos de actividad, pasos y qué ejercicios priorizar), biblioteca, rutinas sugeridas, tus rutinas y herramientas (1RM, discos, calentamiento, intervalos).
- `/entrenar/programas/[id]`: detalle de cada programa de varias semanas con descarga.
- `/entrenar/sesion`: registro en vivo con serie anterior, tipos de serie, RIR, descanso automático, superseries, sustituciones, récords y resumen final.
- `/entrenar/intervalos`: temporizador de intervalos (Tabata, HIIT, EMOM o personalizado) con sonido y voz.
- `/ejercicios` y `/ejercicios/[id]`: biblioteca de 73 ejercicios con foto o ilustración (inicio y final), filtros, mapa muscular, técnica, progreso y alternativas.
- `/progreso`: Semana, Mes o Año: entrenamientos, volumen y tiempo total primero; gráfico, consistencia, mejores marcas, peso y músculos (trabajo y recuperación); historial, récords, cuerpo, logros y exportación.
- `/perfil`: foto, nombre, objetivo, cifras y Mi plan actual.
- `/ajustes`: apariencia, entrenamiento, racha, respaldo de datos y acerca de.
- `/comidas`: Nutrición. Cálculo de calorías y macros según tu objetivo, contador de agua, comidas guardadas para repetir con un toque (y la porción de la última vez), diario por comida (desayuno, almuerzo, once, cena y colaciones) con buscador de unos 145 alimentos chilenos por porción casera, alimentos propios y calorías rápidas; o un modo sin contar (comidas por saciedad). Hábitos del día en ambos modos. Desde Inicio, `?registrar` abre el registro de la comida de esa hora y `?calcular`, el cálculo.
- `/guia`: lecturas breves.

## Estructura

- `src/app`: rutas.
- `src/components`: interfaz por área (`home`, `train`, `session`, `library`, `progress`, `profile`, `content`, `onboarding`, `exercises`, `nutrition`, `cloud`, `ui`).
- `src/styles`: estilos por área; los tokens y componentes base viven en `src/app/globals.css`.
- `src/data`: datos centralizados (ejercicios, programas, catálogo, contenido, ilustraciones y alimentos).
- `src/lib`: lógica sin interfaz (`progression`, `analytics`, `generator`, `programs`, `store`, `session`, `feedback`, `illustration`, `nutrition`, `energy`) y `cloud` (cuenta y sincronización con Firebase).
- `src/types`: contratos.

## Sistema visual

PULSO tiene un estilo oscuro y desafiante: fotografía en blanco y negro, tipografía angosta en mayúsculas y un solo acento de fuego. «Tu salud en movimiento.»

- **Color** (tokens en `src/app/globals.css`): oscuro por defecto (Ajustes permite el tema claro): negro carbón `#0a0a0a`, superficies `#141414`, acento naranja fuego `--accent` (`#ff5a1f`) para botones, avance y navegación, y dorado `--gold` sólo para rachas y récords. Las fotos editoriales se muestran en blanco y negro con un brillo cálido abajo. `npm test` verifica el contraste AA de los textos de acento y dorado.
- **Tipografía**: Archivo angosto (eje de ancho al 76–78 %) y pesado, en mayúsculas para títulos y protagonista en números; Geist para la interfaz y Geist Mono para etiquetas editoriales.
- **Componentes** (`src/components/ui`): `Button`, `SegmentedControl` (indicador que se desliza), `Sheet` (hoja inferior que se cierra deslizando), `NumberMetric`, `Metric`, `StatCard`, `Card`, `PhotoCard`, `RoutineCard`, `ProgressRing`, `WorkoutTimer`, `ToggleChip` y `Toast`; `ExerciseVisual` y `ExerciseCard` en `src/components/exercises`.
- **Movimiento**: `--motion-fast` 140 ms, `--motion-base` 220 ms, `--motion-slow` 320 ms y la curva `--ease-standard`; sólo `transform` y `opacity`, y todo se desactiva con «reducir movimiento». Las animaciones de entrada usan `animation-fill-mode: backwards` (nunca `both`): una transformación que persiste rompe los elementos fijos como las hojas.
- **Personalización** (`src/lib/personalize.ts`): la evaluación pregunta cómo te identificas (mujer, hombre o prefiero no decir). Con eso se eligen las fotos (mujeres, hombres o mixtas) y el color de acento (magenta para mujeres, fuego para el resto). En Ajustes → Apariencia se elige otro color (fuego, magenta, violeta, lima, eléctrico) u otras fotos. El color se aplica con `data-accent` en `<html>` (también antes de pintar, con un script en `layout.tsx`).
- **Portada de Inicio** (`src/data/hero-photos.ts`): la foto cambia según la sesión del día (cardio, movilidad, gimnasio o casa; si hay dos, se alternan por día) y según la audiencia (mujeres, hombres o mixtas) y lleva una frase según tu progreso (`src/lib/motivation.ts`). Las fotos son de StockSnap y rawpixel con licencia CC0 (uso libre, sin atribución).
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
- **Calorías:** metabolismo basal con Mifflin-St Jeor × factor de actividad (1,2 a 1,9). Bajar grasa resta 10, 15 (recomendado) o 20 %; ganar músculo suma 5 (recomendado) o 10 %. Nunca baja de 1.200 kcal (mujeres) o 1.500 kcal (hombres) ni del metabolismo basal. Sin déficit para menores de 18, embarazo o lactancia, o antecedentes de trastorno alimentario (que además activa el modo sin contar).
- **Macros:** proteína 2,0 g/kg al bajar, 1,6 al mantener y 1,8 al ganar (con IMC sobre 30 se usa el peso de IMC 25); grasa al menos 27 % de las calorías y 0,6 g/kg; el resto, carbohidratos. Fibra 14 g por cada 1.000 kcal y agua 35 ml/kg.
- **Agua:** 35 ml/kg es el agua total del día y cerca del 20 % llega con la comida, así que la meta para beber es 28 ml/kg en vasos de 250 ml (entre 6 y 14; 8 sin peso registrado).
- **Revisión semanal:** con al menos 3 pesajes en 10 días (ventana de 3 semanas), compara la pendiente del peso (mínimos cuadrados) con el ritmo del objetivo. Fuera de un margen de ±0,15 kg/semana propone corregir la mitad de la diferencia (1 kg/semana ≈ 1.100 kcal/día), en pasos de 50 y como máximo 200 kcal por semana, sin bajar del mínimo seguro. Si lo registrado supera el objetivo en más de 8 %, primero pide acercarse a él en vez de bajar. No aplica con situaciones especiales, menores de edad ni en el modo sin contar. Se guarda en `NutritionProfile.checkIns` (últimas 12).
- **Objetivo y entrenamiento:** el objetivo de Nutrición ajusta la rutina diaria (bajar grasa: descansos más cortos; ganar músculo: más series) y la guía semanal: bajar grasa, fuerza 3 días + 1–2 sesiones de intervalos + 8.000–10.000 pasos; ganar músculo, fuerza 3–4 días y 10–20 series por grupo muscular; mantener, fuerza 2–3 días + 150 min de actividad moderada.
- **Gasto por sesión:** MET × kg × horas (Compendio de Actividad Física 2024): fuerza 3,5, 5 o 6 según el esfuerzo marcado, intervalos 6 a 8 y movilidad 2,5. Es informativo: ya está incluido en el nivel de actividad del cálculo, que PULSO sugiere subir si entrenas más de lo que supone.

## Datos

Todo se guarda primero en el almacenamiento local del navegador: PULSO funciona sin conexión y sin cuenta. Desde Ajustes puedes exportar e importar un respaldo JSON, exportar tus entrenamientos en CSV y pedir almacenamiento persistente. PULSO se puede instalar como aplicación (manifest e íconos incluidos; Inicio y Perfil guían la instalación: botón directo en Android y pasos en iPhone, donde la app instalada no comparte datos con Safari y por eso primero se guardan en la nube) y funciona sin conexión: el service worker (`public/sw.js`) guarda las pantallas principales, los programas y las fichas de ejercicio (lista en `/precache.json`). Sólo se activa en producción; si cambias su lógica, sube `VERSION` en `public/sw.js`.

### Cuenta y sincronización (Firebase)

Con una cuenta (Google o correo y contraseña, desde Perfil o desde la bienvenida) los datos se guardan también en Firebase y se sincronizan entre equipos:

- **Proyecto:** `pulso-ac82a` (Firestore en `southamerica-west1`, Santiago). La configuración pública está en `src/lib/cloud/config.ts`; no es secreta.
- **Reglas:** `firestore.rules`. Cada persona sólo lee y escribe `users/{uid}/…`. Si cambian, hay que publicarlas en Firebase → Firestore → Reglas.
- **Modelo:** los historiales (entrenamientos, alimentos, peso, agua, chequeos, medidas) van como un documento por registro, para que dos equipos sumen en vez de pisarse. El resto (evaluación, ajustes, plan, rutinas…) va como un documento por clave. El entrenamiento en curso no se sincroniza.
- **Cómo sincroniza** (`src/lib/cloud`): la primera vez une lo local con la nube (gana la nube en un mismo registro). Después sube sólo lo que cambió (huellas por registro) y escucha los cambios de otros equipos desde el último visto. Un cambio local sin subir no se pisa.
- **Carga diferida:** Firebase (~170 KB comprimido) sólo se descarga al iniciar sesión o si ya hay una sesión abierta en ese equipo.
- **Dominios autorizados** (Firebase → Authentication → Configuración): `localhost` y `pulso.c-gonzalezzepeda.workers.dev`.
- Borrar los datos del equipo (Ajustes) cierra antes la sesión, para no borrar la nube. Eliminar la cuenta (Perfil) borra todo lo de la nube. Política en `/privacidad`.

El build para Cloudflare (`npm run build:vinext`) requiere Node 22 (`nvm use`, ver `.nvmrc`).

## Limitaciones

Sin notificaciones push ni integraciones con relojes o sensores. Entrar con Google usa una ventana emergente: en algunos modos de app instalada en iPhone puede no abrirse; ahí se entra con correo y contraseña. La orientación es general y no reemplaza evaluación médica.
