# Evidencia y reglas del plan de entrenamiento

Qué dice la literatura sobre cómo armar una rutina de fuerza según los días disponibles y qué parte de eso usa PULSO. Es la base de `src/lib/program-structure.ts` (estructura), `src/lib/volume.ts` (volumen), `src/lib/prescription.ts` (series, repeticiones, margen y descanso), `src/lib/selection.ts` (ejercicios), `src/lib/progression.ts`, `src/lib/adaptation.ts` y `src/lib/volume-adaptation.ts` (cambios), `src/lib/duration.ts` (tiempo) y `src/lib/training-plan.ts` (el plan).

Revisión del 22 de octubre de 2026. Cinco búsquedas independientes (volumen y frecuencia; intensidad, esfuerzo y descansos; selección de ejercicios; estructura semanal; progresión, fatiga y adherencia) sobre PubMed, Europe PMC y PMC, con preferencia por position stands, revisiones sistemáticas, metaanálisis y ensayos controlados. Las cifras se leyeron en el resumen o en el texto; lo que no se pudo comprobar está marcado **NO VERIFICADO**. Las fuentes marcadas con ✔ las abrí yo después para contrastar título, autores, revista y cifra principal.

> No es consejo médico. La mayoría de los estudios son de adultos jóvenes sanos (muchos hombres, 6–12 semanas); mujeres, mayores y plazos largos están peor cubiertos. PULSO propone reglas conservadoras y pide consultar a un profesional si una molestia persiste.

## Cómo se clasifica cada regla

- **EVIDENCIA FUERTE**: revisiones o metaanálisis consistentes.
- **EVIDENCIA MODERADA**: pocos estudios, heterogeneidad o extrapolación.
- **LIMITADA / CONTROVERTIDA**: un estudio, opinión de expertos o resultados que se contradicen.
- **DECISIÓN PRÁCTICA DE PRODUCTO**: lo que PULSO decide para que el plan sea simple y sostenible; **no** se presenta como verdad científica.

## Lo más importante

1. **El position stand del ACSM de 2026 reemplaza al de 2009** ✔ (Currier y cols., *Med Sci Sports Exerc* 58(4):851–872; PMID 41843416; revisión de 137 revisiones, más de 30 000 adultos). Fuerza: ≥2 sesiones por semana, ≥80 % del 1RM y 2–3 series por ejercicio. Hipertrofia: ≥10 series por músculo y semana (con rendimientos decrecientes hacia 18–20). A igual volumen, la frecuencia no cambia la hipertrofia. El fallo no hace falta (se sugiere dejar 2–3 repeticiones en reserva, sin poder precisar el RIR exacto). Periodizar o cambiar de método no tiene efecto consistente. Admite que «el número óptimo de series no puede precisarse» y que la regla de 2009 para principiantes (2–3 días de cuerpo completo) se apoyaba en 3 estudios.
2. **Con el mismo volumen semanal, repartirlo en más días no suma** (Full Body contra divisiones por músculo: sin diferencias ✔ Ramos-Campo 2024, 14 ensayos). Lo que sí hace falta es entrenar cada gran grupo al menos 2 veces por semana (OMS 2020).
3. **No hay evidencia de un «mejor ejercicio», de un «mejor split» ni de descargas obligatorias.** Lo que sostiene resultados es simple: volumen suficiente, esfuerzo cercano al límite pero sin fallo, progresión medible, y una rutina que la persona pueda mantener.

## Reglas, evidencia y dónde están en el código

### Estructura según los días

| Regla | Evidencia | Código |
|---|---|---|
| Cada gran grupo ≥2 días por semana. | **FUERTE** (OMS 2020, ACSM 2026; sin dosis-respuesta con más). | `program-structure.ts` |
| Dividir no mejora nada a volumen igual; elegir por preferencia y calendario. | **MODERADA–FUERTE** ✔ Ramos-Campo 2024 (14 ensayos, n=392); Pedersen 2022 (Full Body 2 d = Torso/Pierna 4 d en 50 mujeres). Faltan ensayos de empuje/tirón/pierna. | idem |
| 1 día: Full Body corto. 2: Full Body A/B. 3: Full Body (A/B alternados). | ACSM 2009 (principiante 2–3 d, grado A) con la crítica del ACSM 2026; **MODERADA**. | `recommendStructure` |
| 4 días: Torso / Pierna. 5: Torso / Pierna + Full Body. Push / Pull / Legs sólo con experiencia y equipo. | ACSM 2009 (intermedio 3 FB o 4 T/P; avanzado 4–6) es consenso; para 5–6 días es **extrapolación (LIMITADA)**. | idem |
| **Quien empieza, con salud general como objetivo o con poco equipo: como máximo 3 sesiones**; el resto, opcional (caminata, movilidad). | **MODERADA** (a volumen igual no hay ventaja con más días); lo demás, decisión de producto. | idem |
| **Seis días no se recomiendan solos**: nivel avanzado, ≥45 min, buen equipo y objetivo de fuerza o músculo. | Extrapolación; **decisión de producto** (adherencia y recuperación). | idem |
| Nunca Push / Pull / Legs con 1–3 días. | **Decisión de producto** (daría 1 vez por semana a cada músculo). | idem (probado) |
| Días seguidos: no hace falta 48 h entre sesiones del mismo músculo si el volumen por sesión es moderado; dejar 2–3 repeticiones en reserva y no repetir piernas al límite. | **LIMITADA**: ningún ensayo prueba que 48 h sean necesarias; ✔ Sousa 2024 (el fallo, más volumen y los ejercicios exigentes alargan la recuperación). | `training-plan.ts` (nota) |

### Volumen

| Regla | Evidencia | Código |
|---|---|---|
| Series semanales por músculo y objetivo (6–10 / 10–16 / 12–20 para músculo según nivel; 3–6 / 4–9 / 4–9 para fuerza; 4–12 para salud general). Se arranca en la parte baja. | ✔ Schoenfeld, Ogborn y Krieger 2017: +0,37 % de hipertrofia por serie semanal adicional, frágil (depende de un estudio). ✔ Pelland 2026 (67 estudios, 2058 personas): rendimientos decrecientes, dosis mínima ≈4 series, sin meseta clara hasta ~25–40 (pocos datos). ACSM 2026: ≥10 series. **MODERADA**. Los rangos por nivel son **decisión de producto**. | `volume.ts` (`weeklyTarget`) |
| Dosis mínima: ≥4 series por músculo y semana con un ejercicio de pierna, uno de empuje y uno de tirón; 1 serie por ejercicio ya mejora el 1RM. | ✔ Iversen 2021 (narrativa); Androulakis-Korakakis 2020 (1 serie, +12 kg de 1RM, hombres entrenados). **MODERADA**. | `volume.ts`, sesión de 20 min |
| Multiserie > una sola serie. | **FUERTE** (Krieger 2010, ES +0,10); en principiantes 3 > 1 serie en piernas (Rønnestad 2007). | `training-plan.ts` (2–4 series por ejercicio) |
| Tope por sesión ≈ 8–10 series efectivas por músculo (6 en principiantes); si el objetivo semanal pasa de ~10, repartir en ≥2 sesiones. | **LIMITADA**: consenso IUSCA 2021 (≈10, «no se ha cuantificado un umbral») y un preprint (rendimientos decrecientes hacia ~8 series directas). | `volume.ts` (`sessionCap`) |
| Series indirectas cuentan **una fracción**: 1 al músculo que lidera, 0,5 a los otros principales y 0,25 a los de apoyo. | **MODERADA/LIMITADA**: contar fracciones ajusta mejor que contar 1 o 0 (Pelland 2026; estimaciones exploratorias ≈0,3). Las cifras exactas son **decisión de producto**. | `volume.ts` (`muscleCredit`) |
| Pedir trabajo directo de bíceps, tríceps, deltoides y gemelos sólo con objetivo de músculo y sesiones de 45 min o más. | **LIMITADA**; **decisión de producto**. | `training-plan.ts` |
| El volumen sube de a 1 serie tras dos semanas buenas; baja de a 2 con fatiga. Sin saltos bruscos. | **LIMITADA**: ningún ensayo define la tasa; ACSM 2009 pide cambios graduales. **Decisión de producto**. | `volume-adaptation.ts` |
| **No se usan** los estudios de Barbalho 2019 y 2020 (retractados) ni el de 2018 (aviso de integridad). | — | — |

### Intensidad, esfuerzo y descansos

| Regla | Evidencia | Código |
|---|---|---|
| Fuerza: el principal en 3–8 repeticiones (la carga alta rinde más); quien empieza, 6–10 para aprender la técnica. | **FUERTE** (Schoenfeld 2017, Lopez 2021, Currier 2023: ventaja de la carga alta en 1RM, en parte por especificidad del test). | `prescription.ts` (`rangeFor`) |
| Músculo: 5–10 en el principal, 6–12 en secundarios y 10–20 en aislamientos; de 30 a 100 % del 1RM sirve con esfuerzo alto. | **FUERTE** (la carga no cambia la hipertrofia con esfuerzo alto); el reparto por papel es **decisión de producto**. Con ~20 % del 1RM aun al fallo rinde la mitad (Lasevicius 2018). | idem |
| Salud general: 8–15 repeticiones. | ACSM 2026; **MODERADA**. | idem |
| Casa con cargas livianas: subir repeticiones (tope razonable 25–30) y dificultad hasta quedar cerca del límite. | **MODERADA** (Schoenfeld 2017; sin estudios en principiantes en casa). | `loads.ts`, `prescription.ts` |
| **RIR por nivel y papel** (principiante 3/3/2; intermedio 2/2/1; avanzado 2/1/1), nunca el fallo por defecto. | El fallo no mejora la fuerza (**FUERTE**) y aporta poco a la hipertrofia (**MODERADA**: Refalo 2023, Grgic 2022; cuánto margen exacto, **CONTROVERTIDO**). Las cifras son **decisión de producto** apoyada en ACSM 2026 (2–3 RIR). | `prescription.ts` (`RIRS`) |
| El RIR se estima mal (subestima ≈1 repetición; con series largas el error llega a 2–4). Se pide más margen a quien empieza y se toma como aproximado lo de ≥4 RIR. | **MODERADA** ✔ Halperin 2022 (12 estudios, n=414); Zourdos 2021. El efecto de la experiencia es **CONTROVERTIDO**. | `rirText`, explicación para principiantes |
| Descanso: lo pesado 2–3 min, compuestos moderados 90–120 s, aislamientos 60–90 s; con peso corporal hasta 90 s; +30 s si el ejercicio salió difícil. En sesiones cortas, compuestos no por debajo de 90 s. | **MODERADA** (Schoenfeld 2016, Grgic 2018: ≥2 min en entrenados; Singer 2024: poca diferencia sobre 60–90 s en principiantes; Longo 2022: igual a volumen igualado). Los segundos exactos son **decisión de producto**. | `prescription.ts` (`RESTS`), `training-plan.ts` (`REST_CAP`) |
| Orden: lo prioritario primero; multiarticular antes que aislamiento. | **MODERADA** (✔ Simão 2012, Nunes 2021: la fuerza mejora más en lo que va primero; la hipertrofia no). | `selection.ts` (`sessionOrder`), prioridades de las plantillas |
| Superseries sólo para ahorrar tiempo: empuje + tirón, torso + pierna o bíceps + tríceps; nunca el mismo músculo; el principal pesado va en series rectas. | **MODERADA** en tiempo (sesión ≈37 % más corta con las mismas repeticiones: Zhang 2025); **LIMITADA** en adaptaciones a largo plazo. | `training-plan.ts` (`pairable`) |
| Tempo: bajar en 2–3 s y subir con intención; sin códigos de tiempo bajo tensión. | **MODERADA** (0,5–8 s por repetición da la misma hipertrofia: Schoenfeld 2015). | `technique.ts` |

### Selección de ejercicios

| Regla | Evidencia | Código |
|---|---|---|
| Base de ejercicios multiarticulares; aislamientos sólo si cubren un hueco (recto femoral, gemelos, isquios, glúteo medio) o con tiempo. | **MODERADA**: añadir monoarticulares no mejora la hipertrofia de los flexores del codo (Rosa 2023); el recto femoral y los gemelos sí necesitan trabajo directo (Kinoshita 2026, 2023). | plantillas con huecos opcionales |
| Entre variantes, preferir las que cargan el músculo estirado (tríceps sobre la cabeza, curl femoral sentado, gemelo de pie) y el rango completo. | **MODERADA** (Maeo 2021–2023; ROM completo ≥ parcial: Pallarés 2021, Wolf 2023); «parcial alargado mejor que completo» es **LIMITADO**. Curl inclinado = predicador. | `exercise-quality.ts` |
| Máquinas y pesos libres equivalen en hipertrofia; las superficies inestables no aportan en lo principal. | **MODERADA** (Haugen 2023; Saeterbakken 2019). | `exercise-quality.ts` |
| Cobertura por patrones (rodilla, bisagra, empuje y tirón horizontales y verticales, núcleo). | **No hay estudios de resultado por patrón**: es opinión de expertos (ACSM 2026 lo admite). Se usa como taxonomía de cobertura. | `program-structure.ts` |
| Máximo dos variantes del mismo músculo por sesión; no llenar la sesión de variaciones casi iguales. | **LIMITADA** (las variantes cambian la distribución regional, no el crecimiento total). | plantillas |
| **Continuidad**: los ejercicios principales se mantienen mientras progresas y durante bloques de 6 semanas; rotar sólo accesorios o a pedido. | **LIMITADA**: variar no mejora hipertrofia ni fuerza (Baz-Valle 2019, Kassiano 2025) y puede subir la motivación; la cadencia óptima **no tiene datos**. **Decisión de producto**. | `selection.ts`, `training-plan.ts` (`BLOCK_DAYS`) |
| «Estímulo / fatiga»: elegir lo que la persona controla, tolera, progresa y completa. | **No es un constructo validado**: es una heurística de entrenadores (el EMG predice mal el estímulo y el coste de fatiga entre ejercicios es menor al supuesto). Se usa como **criterio de diseño**, no como evidencia. | `exercise-quality.ts` |
| En casa: sentadilla con barra → goblet → dividida → peso corporal lento y profundo; flexiones progresivas o con banda; la fuerza máxima se limita sin cargas altas. | **LIMITADA–MODERADA** (flexiones ≈ banca, bandas ≈ pesos libres en fuerza; los límites de mancuernas fijas **NO ESTÁN ESTUDIADOS**). | `generator.ts` (`placeAlternative`) |

### Progresión, estancamiento y fatiga

| Regla | Evidencia | Código |
|---|---|---|
| Doble progresión: primero repeticiones y, al llegar al tope con margen, +2–10 % de carga. «Muy difícil» o molestia: no se sube. | ACSM 2009 (2–10 %, grado B, una referencia); subir repeticiones ≈ subir carga (Plotkin 2022). **LIMITADA–MODERADA**. | `progression.ts` |
| Con ≥3 sesiones seguidas con molestia en un ejercicio, se deja de insistir (otra variante y, si persiste, un profesional). Tras una pausa de 3 semanas, −10 % de carga (−20 % tras 6). | **LIMITADA**; **decisión conservadora de producto** (Bosquet 2013 para la pausa). | `progression.ts` |
| Estancamiento: ≥3 exposiciones en ≥10 días sin superar la mejor marca; una caída aislada <8 % es ruido (el 1RM varía ≈4 % de un día a otro). Antes de cambiar: revisar descanso, sueño y margen. | **LIMITADA**: ningún estudio define el número de exposiciones (Grgic 2020 para la variabilidad). | `selection.ts` (`exerciseTrend`) |
| **Sin descargas programadas.** Descarga reactiva sólo si el rendimiento cae ≥8 % en ≥2 ejercicios **y** la mitad o más de las sesiones fueron difíciles: una semana con 3 series menos por músculo y los mismos ejercicios. | **LIMITADA**: ✔ Bell 2023 (Delphi: «no se sabe si mejora la adaptación»); Coleman 2024 (una semana sin entrenar: igual hipertrofia, menos fuerza). Que una descarga cada 4–6 semanas mejore resultados **NO ESTÁ SOPORTADO**. | `volume-adaptation.ts` |
| Señales de fatiga: feedback por sesión (Fácil / Bien / Difícil / Molestia), repeticiones y carga contra el historial, margen reportado. **No** se usan agujetas, variabilidad cardíaca ni «% de recuperación» como verdad. | **MODERADA** en lo subjetivo (Saw 2016, Haddad 2017); las agujetas no miden adaptación; el modelo de recuperación por músculo **no está validado** (se usa sólo como señal adicional). | `daily-coach.ts`, `training-plan.ts` (`todayPlanDay`) |

### Cardio complementario, nivel y adherencia

| Regla | Evidencia | Código |
|---|---|---|
| Fuerza y cardio se llevan bien: el cardio no frena la hipertrofia ni la fuerza máxima; sí la fuerza explosiva, sobre todo en la misma sesión. Si se junta, la fuerza primero o ≥6 h aparte. | **FUERTE** ✔ Schumann 2022 (43 estudios). | notas del plan |
| **Nivel** a partir de lo que haces (constancia y progreso), no de los años que dices entrenar: quien dice tener experiencia parte como intermedio; avanzado exige ≥10 semanas constantes y progreso en ≥2 ejercicios. | **Decisión de producto**: ni el nivel de entrenamiento ni el sexo mejoraron los modelos de carga en un metaanálisis grande (Swinton 2024). | `generator.ts` (`trainingLevel`) |
| Sesiones simples y sostenibles; versión mínima si falta tiempo. | **MODERADA**: la falta de tiempo es la barrera más citada; 1 serie ya mejora (Iversen 2021, Androulakis-Korakakis 2020). | sesión de 20 min |

## Decisiones de producto (lo que no es ciencia)

- Los **rangos de series por nivel y objetivo**, el tope por sesión (6/8/10) y las fracciones de series indirectas.
- La **matriz de estructura por días** (qué se recomienda con cada cantidad de días, nivel y equipo) y el límite de tres sesiones para quien empieza.
- **A/B con los mismos movimientos principales** para principiantes y fuerza, y variantes complementarias para quien progresa.
- La tabla **`exerciseQuality`** (qué tan buen punto de partida es cada ejercicio).
- Bloques de **6 semanas** sin cambios de ejercicios por azar.
- Las **cifras** de repeticiones por papel, RIR y descansos dentro de lo que respalda la evidencia.
- Los **umbrales de adaptación** (dos semanas buenas, 8 % de caída, 3 series menos en la descarga reactiva).
- El **modelo de tiempo** (3 s por repetición, 15 s por serie, 45 s por transición y superseries que comparten el descanso). El tiempo elegido incluye el calentamiento del día (con 10 minutos o menos, sólo su activación) y el plan lo mide con las mismas series y repeticiones de la sesión real.

## Lo que no se puede afirmar

El RIR óptimo exacto; que el fallo cause lesiones; rangos de repeticiones distintos para compuestos y aislamientos; un tope de volumen por sesión validado; el volumen máximo recuperable; que un split sea mejor que otro con el mismo volumen; que el curl inclinado supere al predicador; cuántas semanas conviene mantener un ejercicio; que un «% de recuperación» por músculo sea fiable; resultados en principiantes que entrenan en casa con mancuernas fijas; efectos a más de 6 meses.

**NO VERIFICADO**: cifras finales de la metarregresión de Robinson 2024 (de pago; sólo el preprint), posiciones de la NSCA (libro), el consenso IUSCA 2021 (sitio inaccesible; citado a través del ACSM 2026 y de Remmert), «Henselmans 2022 sobre tiempos de recuperación» (no se encontró) y la atribución del concepto de estímulo/fatiga.

## Fuentes principales

✔ = contrastada por mí (título, autores, revista y cifra principal). El resto, leída por el equipo de búsqueda en el resumen o el texto completo. PMID en https://pubmed.ncbi.nlm.nih.gov/PMID/.

- ✔ Currier BS y cols. ACSM Position Stand: Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance in Healthy Adults. *Med Sci Sports Exerc* 2026;58(4):851–872. PMID 41843416.
- ✔ Pelland JC y cols. The Resistance Training Dose Response: Meta-Regressions Exploring the Effects of Weekly Volume and Frequency. *Sports Med* 2026;56(2):481–505. PMID 41343037.
- ✔ Schoenfeld BJ, Ogborn D, Krieger JW. Dose-response relationship between weekly resistance training volume and increases in muscle mass. *J Sports Sci* 2017;35(11):1073–1082. PMID 27433992.
- ✔ Halperin I y cols. Accuracy in Predicting Repetitions to Task Failure in Resistance Exercise. *Sports Med* 2022;52(2):377–390. PMID 34542869.
- ✔ Sousa CA, Zourdos MC, Storey AG, Helms ER. The Importance of Recovery in Resistance Training Microcycle Construction. *J Hum Kinet* 2024;91:205–223. PMID 38689583.
- ✔ Bell L y cols. Integrating Deloading into Strength and Physique Sports Training Programmes: An International Delphi Consensus Approach. *Sports Med Open* 2023;9:87. PMID 37730925.
- ✔ Schumann M y cols. Compatibility of Concurrent Aerobic and Strength Training for Skeletal Muscle Size and Function. *Sports Med* 2022;52(3):601–612. PMID 34757594.
- ✔ Ramos-Campo DJ y cols. Efficacy of Split Versus Full-Body Resistance Training on Strength and Muscle Growth. *J Strength Cond Res* 2024;38(7):1330–1340. PMID 38595233.
- ✔ Iversen VM, Norum M, Schoenfeld BJ, Fimland MS. No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy. *Sports Med* 2021;51(10):2079–2095. PMID 34125411.
- Ratamess NA y cols. ACSM Position Stand: Progression models in resistance training for healthy adults. *Med Sci Sports Exerc* 2009. PMID 19204579.
- Bull FC y cols. World Health Organization 2020 guidelines on physical activity and sedentary behaviour. *Br J Sports Med* 2020. PMID 33239350.
- Currier BS y cols. Resistance training prescription for muscle strength and hypertrophy in healthy adults: a systematic review and Bayesian network meta-analysis. *Br J Sports Med* 2023. PMID 37414459.
- Krieger JW. Single vs. multiple sets of resistance exercise for muscle hypertrophy. *J Strength Cond Res* 2010. PMID 20300012.
- Ralston GW y cols. The Effect of Weekly Set Volume on Strength Gain. *Sports Med* 2017. PMID 28755103.
- Androulakis-Korakakis P y cols. The Minimum Effective Training Dose Required to Increase 1RM Strength in Resistance-Trained Men. *Sports Med* 2020. PMID 31797219.
- Schoenfeld BJ, Grgic J, Krieger J. How many times per week should a muscle be trained to maximize muscle hypertrophy? *J Sports Sci* 2019. PMID 30558493. Grgic J y cols. Effect of resistance training frequency on gains in muscular strength. *Sports Med* 2018. PMID 29470825.
- Pedersen H y cols. 2022 (50 mujeres no entrenadas, 12 semanas: Full Body 2 días por semana contra Torso / Pierna 4 días por semana). PMID 35568897.
- Schoenfeld BJ y cols. Strength and hypertrophy adaptations between low- vs. high-load resistance training. *J Strength Cond Res* 2017. PMID 28834797. Lopez P y cols. Resistance Training Load Effects on Muscle Hypertrophy and Strength Gain. *Med Sci Sports Exerc* 2021. PMID 33433148.
- Refalo MC y cols. Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy. *Sports Med* 2023. PMID 36334240. Grgic J y cols. Effects of resistance training performed to repetition failure or non-failure. *J Sport Health Sci* 2022. PMID 33497853.
- Zourdos MC y cols. (2016, escala RIR) PMID 26049792; (2021) PMID 30747900. Steele y cols. 2017, *PeerJ* (predicción de las repeticiones hasta el fallo). PMID 29204323.
- Schoenfeld BJ y cols. Longer interset rest periods enhance muscle strength and hypertrophy. *J Strength Cond Res* 2016. PMID 26605807. Grgic J y cols. Effects of rest interval duration on measures of muscular strength. *Sports Med* 2018. PMID 28933024. Singer y cols. 2024, *Front Sports Act Living* (metaanálisis bayesiano del descanso entre series y la hipertrofia). PMID 39205815.
- Nunes y cols. 2021, *Eur J Sport Sci* (orden de los ejercicios, 11 estudios). PMID 32077380. Simão R y cols. Exercise order in resistance training. *Sports Med* 2012. PMID 22292516.
- Zhang y cols. 2025, *Sports Med* (revisión sistemática y metaanálisis de superseries, 19 estudios). PMID 39903375. Schoenfeld y cols. 2015, *Sports Med* (duración de la repetición). PMID 25601394.
- Rosa y cols. (2023) y Gentil y cols. (2013, PMID 23537028) sobre añadir monoarticulares; Kinoshita y cols. 2026 (PMID 41630124) y 2023 (PMID 38156065); Maeo y cols. (PMIDs 35819335, 33009197); Pallarés y cols. 2021 (PMID 34170576); Wolf y cols. 2023; Haugen y cols. 2023 (PMID 37582807); Baz-Valle y cols. 2019 (PMID 31881066); Kassiano y cols. 2025 (PMID 39388663); Plotkin y cols. 2023 (PMID 37877099).
- Plotkin D y cols. (2022, PMID 36199287); Helms y cols. 2018 (PMID 29628895); Hickmott y cols. 2022 (PMID 35038063); Grgic J y cols. 2020 (PMID 32681399); Grandou C y cols. 2020 (PMID 31820373); Enes A y cols. 2024 (PMID 37796222).
- Coleman M y cols. 2024 (PMID 38274324); Rogerson y cols. 2024 (PMID 38499934); Hwang y cols. 2017 (PMID 28328712); Ogasawara y cols. 2013 (PMID 23053130).
- Saw AE y cols. 2016 (PMID 26423706); Haddad M y cols. 2017 (PMID 29163016); Morán-Navarro R y cols. 2017 (PMID 28965198); Smith BE y cols. 2017 (PMID 28596288); Sprague y cols. 2021 (PMC7905015).
- Sperandei S y cols. 2016 (PMID 26874647); Rhodes RE y cols. 2017 (PMID 28404558); Teixeira PJ y cols. 2012 (PMID 22726453); Patall EA y cols. 2008 (PMID 18298272); Sylvester BD y cols. 2016 (PMID 26546241).
- Murphy C, Koehler K. 2022 (PMID 34623696); Garthe I y cols. 2011 (PMID 21558571); Swinton PA y cols. 2024 (PMID 38652410); Momma H y cols. 2022 (PMID 35228201).

## Mapa de reglas

- **Estructura y calendario**: `recommendStructure`, `structureFor` (`program-structure.ts`) y `nextPlanDay`, `todayPlanDay` (`training-plan.ts`).
- **Volumen**: `weeklyTarget`, `muscleCredit`, `sessionCap` (`volume.ts`); ajuste semanal: `volumeShift` (`volume-adaptation.ts`).
- **Prescripción**: `prescribe` (`prescription.ts`).
- **Selección**: `scoreCandidate`, `whyExercise` (`selection.ts`), `exerciseQuality` (`data/exercise-quality.ts`) y `pickForSlot` (`training-plan.ts`).
- **Tiempo**: `estimateMinutes` (`duration.ts`) y `fitDay` (`training-plan.ts`).
- **Progresión y adaptación**: `suggestNext`, `describeAdjustment` (`progression.ts`), `learnedFrom` (`adaptation.ts`).
- **Validación del plan**: `validatePlan` (`training-plan.ts`); las pruebas la exigen en 144 casos (días × nivel × lugar × duración × molestias) y a mano en 5 400 combinaciones.
