# PULSO — Reglas del proyecto

- El nombre oficial del producto es PULSO.
- No utilizar Pulso App, pulso-app ni nombres alternativos.
- La frase principal es: Tu salud en movimiento.
- El nombre del paquete, carpeta, repositorio y proyecto es pulso.
- Mantener diseño mobile-first.
- Paleta oficial (desde 2026-10-07, del dueño): negro #0A0A0A, carbón #151515, blanco #FFFFFF, blanco roto #F4F3EE, grises #7C817D y #D9DDD8; marca rojo-naranja #FF351F (logo, ícono, botón principal, avance activo, selección) y naranja cálido #FF7A2F sólo como complemento. Gradiente de marca (135°, #FF351F → #FF7A2F) sólo en portada, ícono, botón especial y avance destacado. Estados funcionales, nunca decorativos: éxito #39B86B, advertencia #F5A623, error #E54848, info #4A7DFF (en claro, versiones más oscuras para cumplir AA). Proporción: 65 % neutros, 25 % superficies y texto, 10 % marca; PULSO es negra/blanca premium con una marca roja muy fuerte, no una app roja. Oscuro por defecto; dorado sólo para rachas y récords. Logo 2: «P» con el asta en cuchilla diagonal + «PULSO» en Archivo ancho (src/components/brand). Acentos alternativos en src/styles/accents.css (magenta, violeta, lima, eléctrico): automático según cómo se identifica la persona (magenta para mujeres) y siempre cambiable en Ajustes. Fotos de portadas y programas en versión mujer y hombre. Fotos en blanco y negro. Títulos en Archivo angosto, pesado y en mayúsculas. Tono directo y desafiante en entrenamiento; neutro y sin presión en alimentación.
- No utilizar plantillas genéricas.
- Backend sólo para cuenta y sincronización: Firebase (Authentication + Firestore en Santiago). La app debe seguir funcionando sin conexión y sin cuenta, y Firebase se carga sólo al iniciar sesión.
- Centralizar datos simulados.
- No utilizar any.
- Evitar sobreingeniería.
- Ejecutar lint y build después de cambios importantes.
- No dejar errores ni advertencias.
- Priorizar claridad, rendimiento y experiencia móvil.
