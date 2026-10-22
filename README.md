# PULSO

PULSO responde una pregunta: «¿qué tengo que hacer hoy para cuidar y fortalecer mi cuerpo?». Arma la sesión de hoy para casa o gimnasio, la registra serie a serie, muestra cómo vas, ajusta el entrenamiento según cómo llegas y acompaña la alimentación sin obligarte a contar calorías. Funciona sin cuenta y sin internet.

## Stack

- Next.js 16 con App Router
- React 19 y TypeScript
- CSS propio con tokens (sin framework de estilos)
- Lucide React
- vinext en Cloudflare Workers (`npm run deploy:vinext`)

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
- `npm test`: pruebas de la lógica de entrenamiento (progresión, prescripción, selección, récords, recuperación, rachas, generador, programas, revisión semanal, acciones de la sesión), de la evaluación y el chequeo rápido, de alimentación (calorías, macros, mínimos, agua y base de alimentos) y de la sincronización (diferencias, unión de historiales y de listas, conflictos).
- `npm run build`: compilación de producción.
- `npm run verify`: ejecuta lint, tipos, pruebas y build como control completo.
- `npm run start`: servidor de producción.

## Rutas

- `/`: Inicio es el coach del día (datos → lectura → recomendación → un botón). Arriba, «Hoy»: la sesión que toca (la misma de Entrenar, con calentamiento; continuar va primero si hay una en curso), la lectura del cuerpo y la recomendación con su porqué («Recuperación parcial. Hoy puedes entrenar. Entrenaste piernas ayer: hoy priorizamos torso.»), el botón principal y «¿Poco tiempo? Versión 20 min» (los compuestos de mayor impacto con equilibrio pierna-empuje-tirón, descansos de 90 s; `src/lib/short-session.ts`), más el consejo del día ligado a la sesión (progresión o clave técnica). Debajo: «Tu cuerpo» (el único chequeo, Bien · Cansado · Muy cansado y molestias, que cambia la sesión; y la recuperación por zona con cuándo estará lista), «Esta semana» (2 / 3 ● ● ○ y la próxima), un solo dato de progreso (récord, más carga, constancia, volumen o hito; `src/lib/highlight.ts`) y la alimentación en breve (proteína y agua, o «al día»). La lógica vive en `src/lib/daily-coach.ts` (con pruebas) y `use-home-coach.ts`; todo se calcula en el teléfono. La invitación a instalar aparece sólo tras dos entrenamientos.
- `/entrenar`: Casa | Gimnasio y el equipamiento (lo simple primero: sin equipamiento, mancuernas, barra, bandas, kettlebell, banco y dominadas; el resto en «Más equipamiento»), la rutina de hoy con su calentamiento (pulso, movilidad de las articulaciones del día y una activación del primer ejercicio, unos 4 minutos; `src/lib/warmup.ts`; se puede quitar y vale también para los programas), «Empezar entrenamiento» y «Ajustar entrenamiento» (programa o a tu medida, duración, enfoque, entrenar una zona, cómo estás hoy, editar ejercicios y otra variante). Al final, tres filas: Rutinas (Full Body, Torso / Pierna y Push / Pull / Legs con uno recomendado, Personalizada y «Más programas»), Biblioteca y Herramientas.
- `/entrenar/programas/[id]`: detalle de cada programa de varias semanas con descarga.
- `/entrenar/sesion`: registro en vivo: nombre, tres claves técnicas y aviso de seguridad, la serie con repeticiones y peso, «Completar serie» y descanso automático (Saltar, +15 s y «Siguiente: …»). Superseries, sustituciones, RIR (al revisar una serie hecha) y notas en el menú. Arriba va el objetivo («8–12 rep · RIR 2», con qué significa el RIR en las primeras sesiones) y, al terminar cada ejercicio de fuerza, «¿Cómo salió?». El cierre es una sola pantalla (duración, series, volumen, récords, Fácil / Bien / Difícil, molestias) y vuelve a Inicio. El calentamiento abre la sesión («Calentamiento 2 de 4») y es opcional: si empiezas directo por lo principal, no queda pendiente. Las acciones son funciones puras en `session-actions.ts`.
- `/entrenar/intervalos`: temporizador de intervalos (Tabata, HIIT, EMOM o personalizado) con sonido y voz.
- `/ejercicios` y `/ejercicios/[id]`: biblioteca de 99 ejercicios con foto o ilustración (inicio y final), filtros, mapa muscular, técnica, progreso y alternativas.
- **Ejercicio en la sesión**: la imagen grande alterna sola entre la posición inicial y la final (foto o ilustración; fija con «reducir movimiento»), bajo el nombre van las tres claves de técnica y tocar la imagen (o «Técnica») abre la ficha completa sin salir. Los pitidos suenan sobre tu música sin cortarla (sesión de audio «ambient» en Safari). La voz («quedan 10 segundos») es opcional y viene apagada, porque en iPhone pausa la música mientras habla (Ajustes → Entrenamiento → Voz).
- `/herramientas`: lo que no es la rutina de hoy: entreno libre, movilidad 10 min, intervalos, pausas activas, calculadoras (1RM, discos, calentamiento), test físico, **retos de 30 días** (`src/lib/challenges.ts`: se cuentan solos con lo registrado, dan medalla y hasta 3 a la vez) y guía. `?tab=retos|test` abre cada vista; los enlaces antiguos de Progreso llevan aquí.
- **Rutina por zona** (`src/data/body-zones.ts`): pecho, espalda, hombros, brazos, abdomen, glúteos o piernas, en Entrenar → Ajustar → «Entrenar una zona» (o `/entrenar?zona=gluteos` desde la biblioteca).
- `/progreso`: entrenamientos de la semana (contra tu meta), volumen, tiempo y constancia, y el volumen por semana de las últimas 12 semanas. En «Ver detalles»: historial, récords, cuerpo (peso y medidas), músculos (series por grupo) y logros; aparte, Herramientas. «Compartir mi semana» (ícono del encabezado) arma una imagen vertical para compartir o descargar.
- `/perfil`: la persona: foto, nombre, objetivo, entrenamientos, racha y peso; «Mi plan» (días, minutos, lugar, equipo, zonas a cuidar, programa); progreso reciente; y accesos a Bienestar y Ajustes.
- `/bienestar`: energía y molestias (el mismo chequeo de Inicio), sueño y recuperación por grupo muscular, al servicio del entrenamiento.
- `/ajustes`: apariencia, entrenamiento (con la pausa de la racha), notificaciones, cuenta y sincronización, datos y privacidad (respaldo, instalar, borrar todo) y acerca de.
- `/comidas`: simple por defecto: las cuatro comidas con ✓, proteína frente a tu meta (de tu plan o de tu peso), agua, diario por comida y hábitos. Al registrar se elige la comida arriba (por defecto la de la hora; el desayuno, hasta el mediodía si aún no lo anotas). Primero «Repetir … de ayer», tus comidas guardadas, recientes y lo típico de esa comida; luego buscador (más de 400 alimentos y platos chilenos, sin tildes y con sinónimos como «aguacate» o «frijoles», en porciones o gramos), escáner de código de barras con Open Food Facts y alimentos propios. Con «+» se eligen varios alimentos y se agregan de una vez («Agregar a Desayuno»). «Quiero controlar calorías y macros» activa el modo avanzado (calorías restantes, «¿Qué me falta hoy?», revisión semanal y energía del entrenamiento). Con antecedente de TCA, registro por saciedad sin números. `?registrar=almuerzo` (desde Inicio) abre esa comida y `?calcular`, el cálculo. La página compone; el diario vive en `use-food-diary.ts`.
- `/guia`: lecturas breves (desde Herramientas).

## Estructura

- `src/app`: rutas.
- `src/components`: interfaz por área (`home`, `train`, `session`, `library`, `progress`, `profile`, `content`, `onboarding`, `exercises`, `nutrition`, `cloud`, `ui`).
- `src/styles`: estilos por área (`reset.css` es el reset base, adaptado del preflight de Tailwind, MIT); los tokens y componentes base viven en `src/app/globals.css`.
- **Código de barras:** usa el lector nativo del navegador (Android/Chrome) y, donde no existe (iPhone/Safari), ZXing en WebAssembly con el paquete `barcode-detector`. El archivo `public/wasm/zxing_reader.wasm` se sirve desde la propia app (sin CDN externo) y el service worker lo guarda tras el primer uso; si se actualiza `zxing-wasm`, hay que copiarlo de nuevo desde `node_modules/zxing-wasm/dist/reader/`.
- `src/data`: datos centralizados (ejercicios, programas, catálogo, equipamiento, contenido, ilustraciones y alimentos). En `equipment.ts` cada equipo aporta capacidades (`provides`) que habilitan ejercicios: p. ej. bidones o una mochila con peso cuentan como mancuernas livianas, el set unible como mancuernas y barra, y el multigimnasio habilita poleas y máquinas en casa. La lista base de casa sigue lo que más se compra para el hogar (Mercado Libre, Amazon y CyberDay, 2025). `npm test` falla si un equipo no habilita ningún ejercicio o si un ejercicio pide algo que no se puede marcar.
- `src/lib`: lógica sin interfaz (`progression`, `prescription`, `selection`, `adaptation`, `analytics`, `generator`, `programs`, `store`, `session`, `feedback`, `illustration`, `nutrition`, `energy`) y `cloud` (cuenta y sincronización con Firebase).
- `src/types`: contratos.

## Sistema visual

PULSO es negra y blanca, premium y editorial, con una marca rojo-naranja muy fuerte: fotografía en blanco y negro, títulos angostos en seminegrita y números grandes como protagonistas. «Entrenamiento que se adapta a tu vida.»

- **Color** (tokens en `src/app/globals.css`): oscuro por defecto (Ajustes permite el tema claro): negro `#0a0a0a`, carbón `#151515`, blanco roto `#f4f3ee`, rojo PULSO `--accent` (`#ff351f`) para botones, avance y navegación, la marca fija `--brand`/`--brand-gradient` (logo, ícono, portada) que no cambia con el acento, y dorado `--gold` sólo para rachas y récords. Las fotos editoriales se muestran en blanco y negro con un brillo cálido abajo. `npm test` verifica el contraste AA de los textos de acento y dorado.
- **Tipografía**: Archivo angosto (eje de ancho al 76–80 %) en seminegrita y tipo oración para títulos (`--title-weight`, `--title-tracking`, `--title-case`) y protagonista en números; Geist para la interfaz y Geist Mono para etiquetas editoriales en mayúsculas.
- **Componentes** (`src/components/ui`): `Button`, `SegmentedControl` (indicador que se desliza), `Sheet` (hoja inferior que se cierra deslizando), `NumberMetric`, `Metric`, `Card`, `PhotoCard`, `RoutineCard`, `TrendChart`, `WorkoutTimer`, `ToggleChip`, `Toast` y `useSheet`; `ExerciseVisual` y `ExerciseCard` en `src/components/exercises`.
- **Movimiento**: `--motion-fast` 140 ms, `--motion-base` 220 ms, `--motion-slow` 320 ms y la curva `--ease-standard`; sólo `transform` y `opacity`, y todo se desactiva con «reducir movimiento». Las animaciones de entrada usan `animation-fill-mode: backwards` (nunca `both`): una transformación que persiste rompe los elementos fijos como las hojas.
- **Evaluación inicial** (`src/components/onboarding`, lógica en `src/lib/assessment.ts`): cinco decisiones (cuatro si entrenas sólo en el gimnasio): objetivo, dónde entrenas, qué tienes, días y minutos, y qué considerar (principiante o molestias en rodillas, espalda u hombros); nombre opcional al final. Edad, estatura, peso y sexo se piden después, sólo si hacen falta (calorías en Comidas, fotos en Ajustes). Al rehacerla desde Perfil parte de tus respuestas y conserva fecha de inicio, nombre y equipamiento.
- **Personalización** (`src/lib/personalize.ts`): las fotos siguen cómo te identificas si lo indicaste (evaluaciones anteriores, el cálculo de calorías o Ajustes → Apariencia → Fotos); si no, se alternan mujeres y hombres. El color es el rojo PULSO para todos; en Ajustes se puede elegir otro (magenta, violeta, lima, eléctrico) y el logo sigue siempre en rojo PULSO.
- **Portada de Inicio** (`src/data/hero-photos.ts`): la foto cambia según la sesión del día (cardio, movilidad, gimnasio o casa; si hay dos, se alternan por día) y según la audiencia (mujeres, hombres o mixtas) ; la frase bajo el saludo sigue lo que pasa hoy con el tono «disciplina sin ignorar el cuerpo» (`src/lib/motivation.ts`). Las fotos son de Pexels (licencia de Pexels, uso comercial libre) y StockSnap (CC0), recortadas en 4:5 con el atleta en el tercio de arriba para que el texto no lo tape.
- **Portada de bienvenida** (`src/components/onboarding/assessment-splash.tsx`): estilo gimnasio duro, atleta encapuchado bajo la luz del techo y «DISCIPLINA.» espaciada. Foto de Alan Cordero en Pexels (licencia de Pexels: uso comercial libre, sin atribución obligatoria), pasada a blanco y negro en `public/images/editorial/splash-hard.webp`. En computador, la foto va como panel a la izquierda.
- **Textura** (grano, desenfoque, atmósfera) sólo en onboarding, portadas, estados especiales y fondos de foto. Las fotos viven en `public/images` en WebP.

## Ilustraciones de ejercicios

Los ejercicios sin foto se muestran con una ilustración propia en dos viñetas (inicio → final). Cada una es una pose en `src/data/illustrations`: ángulos por segmento del cuerpo (0° abajo, 90° adelante, 180° arriba) y accesorios como bancos, barras, bandas o máquinas. `src/lib/illustration.ts` la convierte en SVG, apoya la figura en el suelo y destaca en lima los músculos principales. `npm test` falla si un ejercicio sin foto queda sin ilustración o si una figura se sale del cuadro.

Todos los medios pasan por `src/lib/exercise-media.ts` (`ExerciseMedia`: foto, cuadros de inicio y final, ilustración y, a futuro, GIF o video con su `source`). La interfaz no conoce a ningún proveedor: si algún día se suma uno, se conecta ahí y, si falla, vuelve a lo local. En octubre de 2026 se evaluaron ExerciseDB y MuscleWiki y se descartaron por ahora: sus términos prohíben guardar los medios para usarlos sin conexión (la sesión activa debe funcionar sin internet) y el español es de pago. Para ampliar la biblioteca, los textos abiertos de wger (CC BY-SA) con ilustraciones propias.

Cada ejercicio muestra su versión para casa y para el gimnasio (`placeAlternative` en `src/lib/generator.ts`): mismo patrón y músculos parecidos, con mancuernas o sin nada en casa, y con barra, máquinas o poleas en el gimnasio.

## Cómo decide PULSO

- **Tus pesas** (`src/lib/loads.ts`): en casa puedes marcar los pesos que tienes (cada mancuerna, kettlebell, tobillera o balón; el máximo en barra y set unible). Cada ejercicio parte con una carga sugerida (fracción del peso corporal según ejercicio y nivel, o la de tu historial) y toma el peso más cercano que tengas. Si es liviano, sube las repeticiones (hasta 2×, tope 25) y suma una serie cuando falta mucho; si es pesado, baja las repeticiones (mínimo 5). Si las pesas no sirven (menos de 40 % o más de 1,6× la carga ideal), elige otro ejercicio del mismo tipo. El rango adaptado queda en el registro (`ExerciseRecord.range`) y la progresión lo respeta. En el gimnasio no se ajusta.
- **Enseñar a entrenar** (separado en cuatro capas, todo en el teléfono y sin conexión): **selección** (`src/lib/selection.ts`), **prescripción** (`src/lib/prescription.ts`), **progresión** (`src/lib/progression.ts`) y **adaptación** (`src/lib/adaptation.ts`). El generador (`src/lib/generator.ts`) sólo las orquesta, y los ids y el historial siguen siendo compatibles.
  - Selección: cada candidato suma por recuperación, potencial de progresión, encaje con tu nivel y objetivo, músculos que faltan esta semana, **continuidad** (lo que vienes progresando se mantiene entre 4 y 8 semanas, salvo que pidas «Otra variante» o se estanque) y **adherencia** (lo que cambias o te molestó baja; tus favoritos de la biblioteca suben). Los puntajes son internos: lo que ves es el porqué de cada ejercicio y de cada variante («Necesitamos una bisagra de cadera: trabaja isquiotibiales y glúteos. Entrenas en casa y tienes mancuernas.»), nunca un ranking ni un porcentaje. La sesión se ordena por prioridad (sentadilla, bisagra, empujes, tirones, trabajo a una pierna; luego aislamientos y núcleo) y, si no cabe en el tiempo, sale primero lo que repite un movimiento: cuerpo completo conserva rodilla, empuje, tirón y bisagra.
  - Prescripción: series, rango, margen y descanso por objetivo, nivel y papel del ejercicio. Rangos: fuerza 4–8 en el principal, hipertrofia 6–12, accesorios 10–15 y, para moverse más, 8–20. RIR 2 en compuestos y 1 en accesorios (uno más al empezar o en recuperación); el fallo no es la norma. Descansos: pesados 2–3 min, moderados 90–150 s, aislamientos 60–90 s (con peso corporal, hasta 90 s); +30 s si el ejercicio salió difícil o si en la sesión bajas 3 repeticiones con la misma carga. Quien empieza no suma series; desde intermedio, una más en fuerza y músculo.
  - Progresión doble: sube repeticiones dentro del rango y, cuando todas las series llegan al tope con al menos 1 repetición en reserva, sugiere más carga. No sube si el ejercicio salió «Muy difícil» ni si marcaste «Molestia»: repite o propone otra variante.
  - «¿Cómo salió?» (Muy fácil · Bien · Muy difícil · Molestia): se pregunta al terminar cada ejercicio de fuerza, se guarda en `ExerciseRecord.feel` y manda sobre el esfuerzo de la sesión en la próxima.
  - Lo que PULSO cambió se ve: «40 → 42,5 kg · Completaste el rango con margen» en la tarjeta de hoy («PULSO ajustó 2 ejercicios · ver por qué») y bajo cada ejercicio de «Ejercicios de hoy» (`describeAdjustment`), con «Por qué estos ejercicios» plegado debajo, «PULSO aprendió» en el resumen de Progreso (`learnedFrom`) y, el lunes, una revisión de la semana pasada con lo que viene (`src/lib/training-review.ts`), que se cierra con «Entendido» (`Settings.weekReviewSeen`).
  - Programas: 2–3 días, Full Body; 4, Torso / Pierna; 5–6, Push / Pull / Legs sólo desde nivel intermedio (a quien empieza, nunca Push / Pull / Legs); en casa, Full Body.
  - La ficha de cada ejercicio (`src/components/exercises/exercise-technique.tsx`): «Hoy» (series × rango, RIR, descanso y carga), «Hazlo así» (tres claves), «Recorrido» de inicio a final con su ritmo, «Debes sentir», «Detente si aparece» (dolor agudo o repentino en una articulación, mareo importante, dolor en el pecho, pérdida súbita de fuerza, hormigueo; el cansancio y el ardor muscular son normales) y, plegado en «Ver técnica completa», lo avanzado. El texto es orientativo y no reemplaza a un profesional de salud (`src/data/technique.ts`).
- **Aprende de ti** (todo con tu historial, en el teléfono, y el porqué visible en Inicio o en la sesión):
  - Esfuerzo (`effortFor` en `src/lib/progression.ts`): si tu última sesión con un ejercicio fue «Difícil», mantiene la carga; tras dos difíciles seguidas, apunta a la parte baja del rango; si fue «Fácil», sube las repeticiones más rápido.
  - Cansancio acumulado y molestias (`src/lib/adaptation.ts`): dos sesiones difíciles recientes, o la zona marcada en «Sentí molestias» al terminar, bajan el volumen de hoy aunque no hagas el chequeo (si lo haces, manda el chequeo; la molestia aparece marcada y con «No» se quita).
  - Nivel (`trainingLevel` en `src/lib/generator.ts`): con 5 semanas de dos o más sesiones entre las últimas 11 pasas a intermedio; con 10, a avanzado. Nunca baja de lo que respondiste al empezar, e Inicio avisa el día que subes.
  - Gustos: cada vez que sustituyes un ejercicio (en la sesión o en «Ajustar») se anota en `Settings.swappedOut`; con dos, el generador deja de proponerlo si hay alternativa. Si después lo completas, se olvida.
- **1RM estimado:** fórmula de Epley; las repeticiones en reserva cuentan como repeticiones posibles.
- **Recuperación muscular:** la fatiga de cada músculo baja en 48 h (pequeños) o 72 h (grandes); principal cuenta 1 serie y secundario 0,5.
- **Volumen semanal** (`weeklySetTarget`): referencia de producto, no norma médica: 4–8 series por músculo al empezar, 8–12 en intermedio y 10–20 con experiencia. Cada serie extra suma menos y cuesta más recuperarse.
- **Carga de entrenamiento:** esfuerzo × minutos; relación de 7 días frente a la media de 28 días (0,8–1,3 zona óptima).
- **Racha:** semanas seguidas cumpliendo el objetivo; se puede pausar una semana.
- **Calorías:** metabolismo basal con Mifflin-St Jeor × factor de actividad (1,2 a 1,9). Bajar grasa resta 10, 15 (recomendado) o 20 %; ganar músculo suma 5 (recomendado) o 10 %. Nunca baja de 1.200 kcal (mujeres) o 1.500 kcal (hombres) ni del metabolismo basal. Sin déficit para menores de 18, embarazo o lactancia, o antecedentes de trastorno alimentario (que además activa el modo sin contar).
- **Macros:** proteína 2,0 g/kg al bajar, 1,6 al mantener y 1,8 al ganar (con IMC sobre 30 se usa el peso de IMC 25); grasa al menos 27 % de las calorías y 0,6 g/kg; el resto, carbohidratos. Fibra 14 g por cada 1.000 kcal y agua 35 ml/kg.
- **Agua:** 35 ml/kg es el agua total del día y cerca del 20 % llega con la comida, así que la meta para beber es 28 ml/kg en vasos de 250 ml (entre 6 y 14; 8 sin peso registrado).
- **Revisión semanal:** con al menos 3 pesajes en 10 días (ventana de 3 semanas), compara la pendiente del peso (mínimos cuadrados) con el ritmo del objetivo. Fuera de un margen de ±0,15 kg/semana propone corregir la mitad de la diferencia (1 kg/semana ≈ 1.100 kcal/día), en pasos de 50 y como máximo 200 kcal por semana, sin bajar del mínimo seguro. Si lo registrado supera el objetivo en más de 8 %, primero pide acercarse a él en vez de bajar. No aplica con situaciones especiales, menores de edad ni en el modo sin contar. Se guarda en `NutritionProfile.checkIns` (últimas 12).
- **Objetivo y entrenamiento:** el objetivo de Nutrición ajusta la rutina diaria (bajar grasa: descansos más cortos; ganar músculo: más series) y la guía semanal: bajar grasa, fuerza 3 días + 1–2 sesiones de intervalos + 8.000–10.000 pasos; ganar músculo, fuerza 3–4 días y series por grupo muscular según tu nivel (4–8, 8–12 o 10–20); mantener, fuerza 2–3 días + 150 min de actividad moderada.
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
- **Dominios autorizados** (Firebase → Authentication → Configuración): `localhost` y `pulso.pulsochile.workers.dev`. En el cliente OAuth de Google Cloud, origen autorizado `https://pulso.pulsochile.workers.dev` y redirección `https://pulso.pulsochile.workers.dev/__/auth/handler`.
- Borrar los datos del equipo (Ajustes) cierra antes la sesión, para no borrar la nube. Eliminar la cuenta (Perfil) borra todo lo de la nube. Política en `/privacidad`.

El build para Cloudflare (`npm run build:vinext`) requiere Node 22 (`nvm use`, ver `.nvmrc`).

### Notificaciones (Web Push)

Gratis, sin cuenta y sin servicios externos aparte de los de avisos de cada navegador (Google, Apple, Mozilla). En iPhone sólo funcionan con PULSO instalada en la pantalla de inicio (iOS 16.4+).

- **Avisos:** hora de entrenar (a la hora elegida, si aún no entrenas y no cumples la meta semanal), pesarte al levantarte (opcional, cada día o los lunes, si aún no te pesas; nunca con un trastorno alimentario marcado; abre la hoja de peso), racha en riesgo (domingo 18:00 si falta una sesión), registrar comidas (21:00, sólo si cuentas calorías y falta la once o la cena), pausas activas y agua (11:00, 15:00 y 18:30 si vas bajo lo esperado). A lo más uno por pasada (el de peso, si coincide, llega en la siguiente); nunca dos veces el mismo en el día. Lógica en `src/lib/reminders.ts` (con pruebas).
- **Fin del descanso:** una web en iPhone no puede mostrar un contador en la barra de estado ni sonar en segundo plano. Si sales de PULSO con un descanso en curso, `RestAway` (`src/components/session/rest-away.tsx`) lo programa en `/api/push/rest` y un Durable Object por suscripción (`RestAlarm`, `src/server/rest-alarm.ts`, binding `REST_ALARM`) envía «Descanso terminado · Siguiente: …» a la hora exacta con una alarma; al volver se cancela. Dentro de la app, el descanso se ve en Inicio, Entrenar y la barra del entrenamiento en curso, con los mismos pitidos.
- **Worker:** `src/worker.ts` envuelve el Worker de vinext: `/api/push/{subscribe,state,unsubscribe,test,rest}` (sólo POST desde el mismo origen) y la tarea programada `*/15 * * * *` (`cloudflare.config.ts`). Código en `src/server/push.ts`.
- **Datos:** D1 `pulso-push-db` (binding `PUSH_DB`; la tabla se crea sola). Por teléfono: suscripción, zona horaria, preferencias y un estado mínimo del día que envía `PushStateSync` (`src/lib/push.ts`): entrenó hoy, sesiones y meta, racha, si registró comidas, si ya se pesó y vasos de agua. Sin nombre, comidas ni peso.
- **Claves VAPID:** la pública en `src/lib/push-config.ts`; la privada es el secreto `VAPID_PRIVATE_KEY` del Worker (`cf workers secrets update VAPID_PRIVATE_KEY --worker pulso`). Para probar en local va en `.dev.vars` (ignorado por git). Si se cambian las claves, todas las suscripciones dejan de servir y hay que activarlas de nuevo.
- **En local:** `npm run dev:vinext` simula D1 y la tarea; se dispara con `POST http://localhost:3001/cdn-cgi/local/explorer/api/local/scheduled?worker=pulso` y cuerpo `{"cron":"*/15 * * * *"}`. Con `npm run dev` (Next) la API de avisos no existe.

## Limitaciones

Sin notificaciones push ni integraciones con relojes o sensores. Entrar con Google usa una ventana emergente: en algunos modos de app instalada en iPhone puede no abrirse; ahí se entra con correo y contraseña. La orientación es general y no reemplaza evaluación médica.
