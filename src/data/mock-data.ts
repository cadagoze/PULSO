import type { Article, Exercise, Habit, Meal, User, WeekDay, WeightEntry } from "@/types";

export const user: User = {
  name: "Carlos",
  initials: "CA",
  currentWeight: 82.4,
  goalWeight: 78,
};

export const weightHistory: WeightEntry[] = [
  { date: "2026-07-05", label: "5 jul", weight: 84 },
  { date: "2026-07-09", label: "9 jul", weight: 83.7 },
  { date: "2026-07-13", label: "13 jul", weight: 83.8 },
  { date: "2026-07-17", label: "17 jul", weight: 83.1 },
  { date: "2026-07-21", label: "21 jul", weight: 82.9 },
  { date: "2026-07-25", label: "25 jul", weight: 82.5 },
  { date: "2026-07-29", label: "29 jul", weight: 82.7 },
  { date: "2026-08-02", label: "Hoy", weight: 82.4 },
];

export const exercises: Exercise[] = [
  { id: 1, name: "Sentadilla a silla", sets: 3, target: "10 repeticiones", muscle: "Piernas", benefit: "Refuerza el gesto de sentarte y levantarte con más seguridad.", cue: "Lleva la cadera hacia atrás y roza la silla sin dejarte caer.", phases: ["Pies firmes", "Cadera atrás", "Sube y exhala"], image: "/images/exercises/chair-squat.png", imageAlt: "Demostración en dos pasos de una sentadilla controlada hacia una silla", setup: "Pon una silla estable contra la pared. Separa los pies al ancho de las caderas y deja las puntas levemente hacia afuera.", breathing: "Inhala al bajar y suelta el aire mientras vuelves a ponerte de pie.", adaptation: "Usa una silla más alta o apoya suavemente las manos en los muslos.", avoid: "Que las rodillas colapsen hacia adentro o dejarte caer sobre la silla.", completed: false },
  { id: 2, name: "Flexiones inclinadas", sets: 3, target: "8 repeticiones", muscle: "Pecho y brazos", benefit: "Desarrolla fuerza para empujar con menos carga sobre muñecas y hombros.", cue: "Mantén el cuerpo alineado y lleva los codos a unos 45 grados.", phases: ["Manos firmes", "Baja en bloque", "Empuja y exhala"], image: "/images/exercises/incline-pushup.png", imageAlt: "Demostración en dos pasos de una flexión inclinada sobre una superficie firme", setup: "Apoya las manos sobre una mesa firme o muro, un poco más abiertas que los hombros. Camina hacia atrás hasta inclinar el cuerpo.", breathing: "Inhala al acercar el pecho y exhala al empujar la superficie.", adaptation: "Hazla contra una pared: cuanto más vertical estés, menor será la carga.", avoid: "Llevar la cabeza primero, hundir la cintura o abrir los codos completamente.", completed: false },
  { id: 3, name: "Puente de glúteos", sets: 3, target: "12 repeticiones", muscle: "Glúteos", benefit: "Activa caderas y ayuda a descargar la zona lumbar durante el día.", cue: "Empuja el suelo con los talones y evita arquear la espalda.", phases: ["Talones cerca", "Eleva la cadera", "Baja controlado"], image: "/images/exercises/glute-bridge.png", imageAlt: "Demostración lateral en dos pasos de un puente de glúteos", setup: "Acuéstate boca arriba con rodillas flexionadas, pies apoyados y brazos relajados a los lados.", breathing: "Suelta el aire al elevar la cadera e inhala al bajar lentamente.", adaptation: "Eleva sólo unos centímetros y reduce el recorrido hasta sentir control.", avoid: "Empujar con el cuello, separar demasiado los pies o terminar arqueando la espalda.", completed: false },
  { id: 4, name: "Plancha adaptada", sets: 3, target: "25 segundos", muscle: "Centro", benefit: "Mejora el control del tronco para moverte con estabilidad.", cue: "Aprieta suavemente el abdomen y continúa respirando.", phases: ["Apoyos estables", "Alinea el cuerpo", "Respira normal"], image: "/images/exercises/knee-plank.png", imageAlt: "Demostración lateral de preparación y posición de una plancha apoyada en rodillas", setup: "Apoya antebrazos y rodillas sobre una superficie cómoda. Lleva los hombros sobre los codos.", breathing: "Respira con normalidad; no aguantes el aire para sostener la posición.", adaptation: "Haz bloques de 10 segundos con una pausa breve entre cada uno.", avoid: "Hundir la cintura, encoger los hombros o continuar si molesta la zona lumbar.", completed: false },
  { id: 5, name: "Marcha rápida", sets: 1, target: "3 minutos", muscle: "Cardio", benefit: "Eleva el pulso de forma gradual y cierra la sesión con energía.", cue: "Apoya todo el pie, mueve los brazos y mantén un ritmo conversable.", phases: ["Postura alta", "Brazos activos", "Ritmo conversable"], image: "/images/exercises/brisk-march.png", imageAlt: "Demostración de una marcha de bajo impacto con rodillas y brazos alternados", setup: "Despeja el espacio y usa calzado estable. Mantén cerca una pared si necesitas apoyo.", breathing: "Respira de forma continua; deberías poder decir una frase corta sin jadear.", adaptation: "Marcha más lento, eleva menos las rodillas o sujétate con una mano.", avoid: "Golpear el suelo, inclinarte hacia atrás o acelerar hasta perder estabilidad.", completed: false },
];

export const habits: Habit[] = [
  { id: 1, title: "Caminar diez minutos", detail: "Después del almuerzo" },
  { id: 2, title: "Agregar verduras", detail: "En al menos una comida" },
  { id: 3, title: "Tomar agua", detail: "Durante la tarde" },
];

export const meals: Meal[] = [
  { id: "desayuno", name: "Desayuno", time: "08:15", status: "Registrada", summary: "Proteína · Fruta · Bebida" },
  { id: "almuerzo", name: "Almuerzo", time: "13:30", status: "Registrada", summary: "Proteína · Verduras · Carbohidrato" },
  { id: "once", name: "Once", time: "17:30", status: "Pendiente" },
  { id: "cena", name: "Cena", time: "20:30", status: "Pendiente" },
];

export const articles: Article[] = [
  { id: 1, title: "Subió la balanza: qué mirar antes de preocuparte", category: "Alimentación", readTime: "4 min", featured: true },
  { id: 2, title: "Fuerza y caminatas: una semana que sí cabe en tu agenda", category: "Entrenamiento", readTime: "5 min" },
  { id: 3, title: "Perdiste una semana: cómo retomar sin compensar", category: "Entrenamiento", readTime: "3 min" },
  { id: 4, title: "Tres señales de que hoy necesitas recuperar", category: "Descanso", readTime: "6 min" },
  { id: 5, title: "Arma un plato completo sin pesar alimentos", category: "Alimentación", readTime: "5 min" },
  { id: 6, title: "Cuándo subir repeticiones y cuándo mantener", category: "Entrenamiento", readTime: "4 min" },
];

export const weekDays: WeekDay[] = [
  { date: "2026-07-27", short: "L", number: 27, status: "done" },
  { date: "2026-07-28", short: "M", number: 28, status: "rest" },
  { date: "2026-07-29", short: "M", number: 29, status: "done" },
  { date: "2026-07-30", short: "J", number: 30, status: "rest" },
  { date: "2026-07-31", short: "V", number: 31, status: "today" },
  { date: "2026-08-01", short: "S", number: 1, status: "planned" },
  { date: "2026-08-02", short: "D", number: 2, status: "rest" },
];
