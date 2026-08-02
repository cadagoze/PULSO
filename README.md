# PULSO

PULSO es una aplicación personal de bienestar orientada a entrenamiento en casa, alimentación sencilla, seguimiento de peso y hábitos.

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
- `npm run build`: compilación de producción.
- `npm run verify`: ejecuta lint, tipos y build como control completo.
- `npm run start`: servidor de producción.

## Rutas

- `/`: resumen de hoy.
- `/entrenar`: plan semanal.
- `/entrenar/sesion`: entrenamiento activo.
- `/comidas`: registro de alimentación.
- `/progreso`: evolución de peso, medidas y hábitos.
- `/guia`: orientación y contenido.

## Estructura

El código de interfaz vive en `src/app` y `src/components`. Los datos simulados se centralizan en `src/data/mock-data.ts`, los contratos en `src/types` y las utilidades en `src/lib`.

## Funciones actuales

El prototipo incluye navegación responsive, hábitos interactivos, planificación semanal, entrenamiento completo o corto con temporizador y descansos, flujo de seguridad ante dolor, registro local de comidas, registro local de peso, gráficos adaptables, pestañas de progreso, detalle de ejercicios y contenido editorial filtrable.

Los hábitos, comidas y registros de peso se guardan en el almacenamiento local del navegador para conservarlos entre recargas durante esta fase.

## Limitaciones

Esta fase utiliza datos simulados y persistencia local en el dispositivo. No hay sincronización entre dispositivos, autenticación, backend, diagnóstico médico, notificaciones reales ni integraciones externas.

## Próximas fases

Persistencia segura de datos, autenticación, personalización del plan, recordatorios y conexiones de salud se evaluarán después de validar el prototipo.
