/**
 * Qué tan buen punto de partida es cada ejercicio para la mayoría de personas (0–10, 5 si no figura). No dice
 * cuál es «el mejor»: mezcla lo que de verdad decide si se sostiene y se progresa: cuánto trabajo útil da el
 * músculo, cuánta fatiga y técnica cuesta, qué tan fácil es cargarlo de a poco y medir el avance, y qué tan
 * estable y cómodo es. Dos ejercicios que trabajan lo mismo: gana el que más personas controlan, toleran y
 * completan con constancia (ver docs/evidencia-entrenamiento.md, «Estímulo y fatiga»). Es una guía interna de
 * la selección; nunca se muestra como puntaje.
 */
export const exerciseQuality: Record<number, number> = {
  // Sentadilla y prensa
  59: 8, // Sentadilla con barra
  20: 8, // Prensa de piernas
  10: 8, // Sentadilla goblet
  44: 6, // Sentadilla sumo con carga
  30: 5, // Sentadilla con peso corporal
  1: 4, // Sentadilla a silla
  95: 3, // Sentadilla en pared con pelota
  // Zancadas y una pierna
  41: 7, // Sentadilla búlgara
  45: 7, // Zancada con mancuernas
  40: 7, // Zancada hacia atrás
  16: 6, // Subida al banco
  // Bisagra de cadera
  22: 9, // Peso muerto rumano con barra
  11: 8, // Peso muerto rumano con mancuernas
  64: 8, // Hip thrust con barra
  51: 7, // Hip thrust con mancuerna
  63: 6, // Peso muerto convencional
  52: 5, // Swing con kettlebell
  94: 5, // Curl femoral con pelota
  3: 5, // Puente de glúteos
  33: 5, // Puente de glúteos a una pierna
  // Empuje horizontal
  60: 9, // Press de banca con barra
  12: 9, // Press de pecho con mancuernas
  21: 8, // Press de pecho en máquina
  31: 7, // Flexión de brazos
  2: 6, // Flexiones inclinadas
  32: 6, // Flexión declinada
  106: 4, // Flexión diamante
  // Empuje vertical
  46: 9, // Press de hombros con mancuernas
  61: 8, // Press militar con barra
  68: 8, // Press de hombros en máquina
  42: 5, // Flexión pica
  43: 3, // Fondos en silla
  // Tirón horizontal
  14: 9, // Remo con mancuerna
  67: 9, // Remo sentado en polea
  62: 8, // Remo con barra
  88: 7, // Remo en suspensión
  6: 6, // Remo invertido en mesa
  13: 6, // Remo con banda
  107: 4, // Remo en W boca abajo
  108: 4, // Remo con toalla en la puerta
  111: 4, // Face pull con banda
  // Tirón vertical
  23: 9, // Jalón al pecho
  57: 8, // Dominada
  15: 7, // Dominada asistida
  56: 6, // Jalón con banda
  109: 5, // Pull-over con mancuerna
  // Núcleo y acarreo
  55: 7, // Press Pallof
  34: 6, // Plancha frontal
  35: 6, // Plancha lateral
  36: 6, // Bicho muerto
  58: 6, // Elevación de rodillas colgado
  89: 6, // Rueda abdominal
  24: 5, // Plancha en banco
  37: 5, // Cuadrupedia alterna
  38: 5, // Superman
  4: 4, // Plancha adaptada
  93: 4, // Encogimiento en pelota
  96: 3, // Plancha en pelota
  53: 6, // Paseo del granjero
  // Aislamientos
  47: 8, // Elevaciones laterales
  48: 8, // Curl de bíceps con mancuernas
  102: 8, // Curl de bíceps en polea
  100: 7, // Curl martillo con mancuernas
  101: 5, // Curl de bíceps con banda
  103: 4, // Curl concentrado
  49: 8, // Extensión de tríceps sobre la cabeza
  70: 8, // Extensión de tríceps en polea
  104: 5, // Extensión de tríceps con banda
  105: 4, // Patada de tríceps con mancuerna
  50: 6, // Aperturas con mancuernas
  54: 4, // Aperturas con banda
  69: 8, // Face pull en polea
  110: 3, // Elevaciones frontales
  65: 7, // Extensión de cuádriceps
  66: 8, // Curl femoral en máquina
  39: 7, // Elevación de talones
  91: 5, // Caminata lateral con minibanda
  97: 5, // Patada de glúteo con tobilleras
  98: 5, // Abducción de pie con tobilleras
};

export const defaultQuality = 5;
