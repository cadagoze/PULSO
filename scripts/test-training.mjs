import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = new Map();

/** Carga un módulo TypeScript de src/ resolviendo los alias "@/". */
function load(relativePath) {
  if (cache.has(relativePath)) return cache.get(relativePath);
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exported = {};
  cache.set(relativePath, exported);
  const require = (name) => {
    if (name === 'clsx') return nodeRequire(name);
    if (!name.startsWith('@/') && !name.startsWith('.')) throw new Error(`Unexpected import: ${name}`);
    const base = name.startsWith('@/') ? path.join('src', name.slice(2)) : path.join(path.dirname(relativePath), name);
    const candidates = [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')];
    const found = candidates.find((candidate) => fs.existsSync(path.join(root, candidate)));
    if (!found) throw new Error(`Cannot resolve ${name}`);
    return load(found);
  };
  vm.runInNewContext(source, { exports: exported, require, performance, crypto: globalThis.crypto, globalThis: { crypto: globalThis.crypto } });
  return exported;
}

const training = load('src/lib/training.ts');
const progression = load('src/lib/progression.ts');
const analytics = load('src/lib/analytics.ts');
const generator = load('src/lib/generator.ts');
const programs = load('src/lib/programs.ts');
const { exercises } = load('src/data/exercises.ts');
const { programs: programList } = load('src/data/programs.ts');
const utils = load('src/lib/utils.ts');

const DAY = 86_400_000;
function workout(daysAgo, records, extra = {}) {
  const date = new Date(Date.now() - daysAgo * DAY);
  const sets = records.reduce((sum, record) => sum + record.sets.filter((set) => set.done).length, 0);
  return { id: `w-${daysAgo}-${Math.random()}`, date: utils.localDateKey(date), completedAt: date.toISOString(), durationMinutes: 40, exerciseCount: records.length, sets, mode: 'full', records, ...extra };
}
const set = (value, load, extra = {}) => ({ value, load, done: true, kind: 'normal', ...extra });

test('las series nuevas de un ejercicio empiezan sin marcar', () => {
  const records = training.recordsForExercises([1, 2, 4].map(training.exerciseById));
  assert.deepEqual(Array.from(records, (record) => record.exerciseId), [1, 2, 4]);
  assert.equal(training.completedSets(records), 0);
  assert.equal(records.find((record) => record.exerciseId === 4).unit, 'seconds');
});

test('la duración excluye pausas y el reloj formatea horas', () => {
  assert.equal(training.durationSeconds({ elapsedSeconds: 30, runningSince: 10_000 }, 25_000), 45);
  assert.equal(training.durationSeconds({ elapsedSeconds: 45, runningSince: null }, 500_000), 45);
  assert.equal(training.clockLabel(185), '03:05');
  assert.equal(training.clockLabel(3725), '1:02:05');
});

test('el volumen ignora calentamientos y series pendientes', () => {
  const records = [{ exerciseId: 10, unit: 'reps', sets: [set(10, 20), set(5, 10, { kind: 'warmup' }), { value: 10, load: 20, done: false }] }];
  assert.equal(training.recordsVolume(records), 200);
});

test('1RM estimado con Epley y repeticiones en reserva', () => {
  assert.equal(progression.estimateOneRepMax(100, 1), 100);
  assert.equal(Math.round(progression.estimateOneRepMax(100, 10)), 133);
  assert.equal(Math.round(progression.estimateOneRepMax(100, 8, 2)), 133);
  assert.equal(progression.estimateOneRepMax(0, 10), 0);
});

test('doble progresión: repeticiones primero, luego carga', () => {
  const exercise = { ...exercises.find((item) => item.id === 10), range: [8, 12], increment: 2, unit: 'reps' };
  const mid = progression.suggestNext(exercise, { exerciseId: 10, unit: 'reps', sets: [set(10, 20), set(9, 20)] });
  assert.equal(mid.kind, 'reps');
  assert.equal(mid.value, 10);
  assert.equal(mid.load, 20);
  const top = progression.suggestNext(exercise, { exerciseId: 10, unit: 'reps', sets: [set(12, 20, { rir: 2 }), set(12, 20, { rir: 1 })] });
  assert.equal(top.kind, 'load');
  assert.equal(top.load, 22);
  assert.equal(top.value, 8);
  const failed = progression.suggestNext(exercise, { exerciseId: 10, unit: 'reps', sets: [set(6, 20, { rir: 0 })] });
  assert.equal(failed.kind, 'deload');
  assert.equal(progression.suggestNext(exercise, undefined).kind, 'start');
});

test('calculadora de discos y series de aproximación', () => {
  const plates = progression.plateBreakdown(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
  assert.deepEqual(Array.from(plates.perSide), [25, 15]);
  assert.equal(plates.remainder, 0);
  const odd = progression.plateBreakdown(101, 20, [25, 20, 15, 10, 5, 2.5, 1.25]);
  assert.equal(odd.achieved, 100);
  const warmup = progression.warmupSets(100, true, 20);
  assert.deepEqual(Array.from(warmup, (item) => item.load), [20, 50, 70, 85]);
  assert.ok(warmup.every((item) => item.kind === 'warmup'));
  assert.equal(progression.warmupSets(8, false, 20).length, 0);
});

test('récords personales sólo frente a una marca anterior', () => {
  const first = workout(7, [{ exerciseId: 10, unit: 'reps', sets: [set(8, 20)] }]);
  const second = workout(0, [{ exerciseId: 10, unit: 'reps', sets: [set(8, 22)] }]);
  assert.equal(progression.detectRecords(first, [first]).length, 0);
  const hits = progression.detectRecords(second, [first, second]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, 'e1rm');
  const bests = progression.exerciseBests([first, second], 10);
  assert.equal(bests.load, 22);
  assert.equal(bests.sessions.length, 2);
});

test('récords: los drop sets y el RIR no inflan marcas; más repeticiones exige la misma carga', () => {
  const base = workout(7, [{ exerciseId: 10, unit: 'reps', sets: [set(8, 100), set(8, 100), set(8, 100)] }]);
  const drop = workout(0, [{ exerciseId: 10, unit: 'reps', sets: [set(8, 100), set(12, 60, { kind: 'drop' })] }]);
  assert.equal(progression.detectRecords(drop, [base, drop]).length, 0);
  const rir = workout(0, [{ exerciseId: 10, unit: 'reps', sets: [set(8, 100, { rir: 2 })] }]);
  assert.equal(progression.detectRecords(rir, [base, rir]).length, 0);
  const lighter = workout(0, [{ exerciseId: 10, unit: 'reps', sets: [set(10, 80)] }]);
  assert.equal(progression.detectRecords(lighter, [base, lighter]).length, 0);
  const moreReps = workout(0, [{ exerciseId: 10, unit: 'reps', sets: [set(9, 100)] }]);
  const hit = progression.detectRecords(moreReps, [base, moreReps]);
  assert.equal(hit.length, 1);
});

test('recuperación muscular: fatiga reciente y recuperación total después de 3 días', () => {
  const recent = workout(0, [{ exerciseId: 12, unit: 'reps', sets: [set(8, 16), set(8, 16), set(8, 16), set(8, 16)] }]);
  const old = workout(4, [{ exerciseId: 12, unit: 'reps', sets: [set(8, 16), set(8, 16), set(8, 16)] }]);
  const chestId = exercises.find((item) => item.id === 12).primary[0];
  assert.ok(analytics.muscleRecovery([recent])[chestId] < 60);
  assert.equal(analytics.muscleRecovery([old])[chestId], 100);
});

test('series semanales por músculo cuentan 1 para principales y 0,5 para secundarios', () => {
  const entry = workout(0, [{ exerciseId: 12, unit: 'reps', sets: [set(8, 16), set(8, 16)] }]);
  const exercise = exercises.find((item) => item.id === 12);
  const { sets } = analytics.workoutMuscleSets(entry);
  assert.equal(sets[exercise.primary[0]], 2);
  if (exercise.secondary[0]) assert.equal(sets[exercise.secondary[0]], 1);
});

test('racha semanal: la semana en curso no la rompe y las pausas la protegen', () => {
  const now = new Date();
  const lastWeek = analytics.weekRange(now, -1);
  const twoWeeks = analytics.weekRange(now, -2);
  const threeWeeks = analytics.weekRange(now, -3);
  const at = (start, offset) => { const d = new Date(`${start}T12:00:00`); d.setDate(d.getDate() + offset); return utils.localDateKey(d); };
  const mk = (date) => ({ id: date + Math.random(), date, completedAt: `${date}T12:00:00.000Z`, durationMinutes: 30, exerciseCount: 1, sets: 3, mode: 'full' });
  const list = [mk(at(lastWeek.start, 0)), mk(at(lastWeek.start, 2)), mk(at(threeWeeks.start, 1)), mk(at(threeWeeks.start, 3))];
  assert.equal(analytics.weekStreak(list, 2, [], now).streak, 1);
  assert.equal(analytics.weekStreak(list, 2, [twoWeeks.start], now).streak, 2);
});

test('preparación 0–100 y recomendación', () => {
  assert.equal(analytics.readinessScore({ energy: 3, sleep: 3, soreness: 0, stress: 1 }, 1).score, 100);
  const low = analytics.readinessScore({ energy: 1, sleep: 1, soreness: 2, stress: 3 }, 2);
  assert.equal(low.recommendation, 'recovery');
  assert.equal(analytics.readinessScore({ energy: 2, sleep: 2, soreness: 1, stress: 2 }, null).recommendation, 'short');
});

test('carga aguda:crónica', () => {
  const list = [0, 2, 9, 16, 23].map((daysAgo) => workout(daysAgo, [], { effort: 3, durationMinutes: 30 }));
  const load = analytics.trainingLoad(list);
  assert.equal(load.acute, 360);
  assert.ok(load.ratio > 1);
});

test('generador: peso corporal en casa, equipamiento de gimnasio y zonas a cuidar', () => {
  const home = generator.generateWorkout({ preference: { location: 'home', equipment: [] }, minutes: 30, focus: 'full', seed: 3 });
  assert.ok(home.records.length >= 3 && home.estimatedMinutes <= 33, `${home.records.length} ejercicios · ${home.estimatedMinutes} min`);
  assert.ok(home.records.every((record) => exercises.find((item) => item.id === record.exerciseId).equipment.length === 0));
  const gym = generator.generateWorkout({ preference: { location: 'gym', equipment: [] }, minutes: 45, focus: 'full', level: 2, seed: 3 });
  assert.ok(gym.records.length >= 4 && gym.estimatedMinutes <= 50, `${gym.records.length} ejercicios · ${gym.estimatedMinutes} min`);
  for (const minutes of [10, 20, 30, 45, 60]) {
    const plan = generator.generateWorkout({ preference: { location: 'gym', equipment: [] }, minutes, focus: 'full', goal: 'strength', level: 2, seed: minutes });
    assert.ok(plan.estimatedMinutes <= Math.max(minutes * 1.1, plan.records.length <= 3 ? minutes * 1.6 : 0), `${minutes} min → ${plan.estimatedMinutes}`);
  }
  const knees = generator.generateWorkout({ preference: { location: 'gym', equipment: [] }, minutes: 45, focus: 'lower', limitations: ['knees'], level: 3, seed: 1 });
  assert.ok(knees.records.every((record) => !(exercises.find((item) => item.id === record.exerciseId).stresses ?? []).includes('knees')));
  const recovery = generator.generateWorkout({ preference: { location: 'home', equipment: [] }, minutes: 30, focus: 'full', readiness: 'recovery' });
  assert.ok(recovery.records.length <= 3);
  const unique = new Set(gym.records.map((record) => record.exerciseId));
  assert.equal(unique.size, gym.records.length);
});

test('generador: las alternativas respetan patrón y equipamiento', () => {
  const pushup = exercises.find((item) => item.id === 2);
  const alternatives = generator.alternativesFor(pushup, generator.availableEquipment({ location: 'home', equipment: [] }));
  assert.ok(alternatives.length > 0);
  assert.ok(alternatives.every((item) => item.pattern === pushup.pattern && item.equipment.length === 0));
});

test('programas: cada sesión tiene ejercicios válidos y avanza en orden', () => {
  for (const program of programList) {
    for (let day = 1; day <= program.days.length; day += 1) {
      const records = programs.programSessionRecords(program, program.weeks, day, []);
      assert.ok(records.length >= 3, `${program.id} día ${day}`);
      assert.ok(records.every((record) => record.sets.length >= 1));
    }
    assert.equal(program.weekSetDelta.length, program.weeks);
  }
  const program = programList[0];
  const next = programs.nextProgramSession(program, { programId: program.id, startedAt: '', completed: ['1-1'] });
  assert.deepEqual({ ...next }, { week: 1, day: 2 });
  const marked = programs.markProgramSession({ programId: program.id, startedAt: '', completed: [] }, program.id, 1, 1);
  assert.deepEqual(Array.from(marked.completed), ['1-1']);
});

test('catálogo: ids únicos y progresiones existentes', () => {
  const ids = new Set(exercises.map((item) => item.id));
  assert.equal(ids.size, exercises.length);
  for (const id of [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 20, 21, 22, 23, 24]) assert.ok(ids.has(id), `falta ${id}`);
  for (const item of exercises) {
    if (item.easier) assert.ok(ids.has(item.easier));
    if (item.harder) assert.ok(ids.has(item.harder));
    assert.ok(item.range[0] <= item.range[1]);
  }
});

test('conversión de unidades kg/lb', () => {
  assert.equal(utils.toDisplayWeight(100, 'lb'), 220.5);
  assert.equal(utils.fromDisplayWeight(220.5, 'lb'), 100.02);
  assert.equal(utils.toDisplayWeight(22.5, 'kg'), 22.5);
});

const illustration = load('src/lib/illustration.ts');
const { exerciseIllustrations } = load('src/data/illustrations/index.ts');

test('ilustraciones: todo ejercicio sin foto tiene una ilustración', () => {
  const missing = Array.from(exercises.filter((item) => !item.image && !exerciseIllustrations[item.id]), (item) => item.id);
  assert.deepEqual(missing, [], `sin ilustración: ${missing.join(', ')}`);
  for (const id of Object.keys(exerciseIllustrations)) assert.ok(exercises.some((item) => item.id === Number(id)), `ilustración huérfana ${id}`);
});

test('ilustraciones: coordenadas válidas, dentro del cuadro y apoyadas en el suelo', () => {
  const { PANEL } = illustration;
  for (const [id, spec] of Object.entries(exerciseIllustrations)) {
    const panels = illustration.layoutIllustration(spec);
    panels.forEach((panel, index) => {
      const pose = index === 0 ? spec.start : spec.end;
      const points = panel.segments.flatMap((s) => [[s.x1, s.y1, s.width / 2], [s.x2, s.y2, s.width / 2]]);
      points.push([panel.head.cx, panel.head.cy, panel.head.r]);
      for (const [x, y, pad] of points) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y), `${id}: coordenada inválida`);
        assert.ok(x - pad > -3 && x + pad < PANEL.width + 3 && y - pad > -3 && y + pad < PANEL.height + 3, `${id} (${index ? 'final' : 'inicio'}): la figura se sale del cuadro`);
      }
      const lowest = Math.max(...points.map(([, y, pad]) => y + pad), ...panel.props.filter((p) => p.type === 'circle').map((p) => p.cy + p.r));
      if (!pose.lift) assert.ok(lowest <= PANEL.ground + 0.5, `${id}: algo atraviesa el suelo`);
    });
  }
});

const nutrition = load('src/lib/nutrition.ts');
const { foods } = load('src/data/foods.ts');
const baseProfile = { sex: 'male', birthYear: 1986, heightCm: 178, activity: 'moderate', goal: 'maintain', adjustment: 0, special: 'none', mode: 'count', updatedAt: '2026-10-05T12:00:00.000Z' };
const october = new Date('2026-10-05T12:00:00');

test('alimentación: metabolismo basal con Mifflin-St Jeor', () => {
  assert.equal(nutrition.basalMetabolism({ sex: 'male', weightKg: 81.5, heightCm: 178, age: 40 }), 1732.5);
  assert.equal(nutrition.basalMetabolism({ sex: 'female', weightKg: 60, heightCm: 165, age: 30 }), 1320.25);
});

test('alimentación: mantención, déficit y macros que suman las calorías', () => {
  const maintain = nutrition.nutritionTargets(baseProfile, 81.5, october);
  assert.equal(maintain.tdee, 2690);
  assert.equal(maintain.kcal, 2690);
  assert.equal(maintain.weeklyChangeKg, 0);
  const lose = nutrition.nutritionTargets({ ...baseProfile, goal: 'lose', adjustment: -15 }, 81.5, october);
  assert.equal(lose.kcal, 2280);
  assert.equal(lose.protein, 163);
  assert.ok(lose.weeklyChangeKg < -0.3 && lose.weeklyChangeKg > -0.45, `ritmo ${lose.weeklyChangeKg}`);
  const fromMacros = lose.protein * 4 + lose.carbs * 4 + lose.fat * 9;
  assert.ok(Math.abs(fromMacros - lose.kcal) <= 12, `macros ${fromMacros} vs ${lose.kcal}`);
  assert.equal(lose.limited, null);
});

test('alimentación: nunca baja del mínimo seguro ni del basal', () => {
  const small = { ...baseProfile, sex: 'female', birthYear: 1966, heightCm: 155, activity: 'sedentary', goal: 'lose', adjustment: -20 };
  const targets = nutrition.nutritionTargets(small, 50, october);
  assert.equal(targets.kcal, 1200);
  assert.equal(targets.limited, 'floor');
  const custom = nutrition.nutritionTargets({ ...small, customKcal: 900 }, 50, october);
  assert.equal(custom.kcal, 1200);
  assert.equal(custom.custom, true);
});

test('alimentación: sin déficit con embarazo, antecedente de TCA o menos de 18 años', () => {
  const lose = { ...baseProfile, goal: 'lose', adjustment: -20 };
  const pregnancy = nutrition.nutritionTargets({ ...lose, sex: 'female', special: 'pregnancy' }, 70, october);
  assert.equal(pregnancy.kcal, pregnancy.tdee);
  assert.equal(pregnancy.limited, 'special');
  const minor = nutrition.nutritionTargets({ ...lose, birthYear: 2010 }, 60, october);
  assert.equal(minor.kcal, minor.tdee);
  assert.equal(minor.limited, 'minor');
});

test('alimentación: totales del día y alimentos recientes', () => {
  const entry = (id, foodId, portions, kcal) => ({ id, date: '2026-10-05', meal: 'almuerzo', foodId, name: foodId, portion: '1', portions, kcal, protein: 10, carbs: 10, fat: 1 });
  const totals = nutrition.entryTotals([entry('a', 'arroz', 1.5, 200), entry('b', 'pollo', 1, 198)]);
  assert.equal(totals.kcal, 498);
  assert.equal(totals.protein, 25);
  const recent = nutrition.recentFoods([entry('a', 'arroz', 1, 200), entry('b', 'pollo', 1, 198), entry('c', 'arroz', 1, 200)]);
  assert.deepEqual(Array.from(recent, (item) => item.foodId), ['arroz', 'pollo']);
});

test('alimentos: ids únicos y calorías coherentes con los macros', () => {
  const ids = new Set();
  for (const food of foods) {
    assert.ok(!ids.has(food.id), `id repetido ${food.id}`);
    ids.add(food.id);
    if (food.alcohol) continue;
    const fromMacros = food.protein * 4 + food.carbs * 4 + food.fat * 9;
    assert.ok(Math.abs(fromMacros - food.kcal) <= Math.max(15, food.kcal * 0.15), `${food.id}: ${food.kcal} kcal vs ${Math.round(fromMacros)} por macros`);
  }
  assert.ok(foods.length >= 120);
});

const energy = load('src/lib/energy.ts');

test('energía: calorías por sesión según MET, peso, duración y esfuerzo', () => {
  assert.equal(energy.sessionCalories({ durationMinutes: 60, kind: 'strength', effort: 3 }, 80), 400);
  assert.equal(energy.sessionCalories({ durationMinutes: 60, kind: 'strength', effort: 5 }, 80), 480);
  assert.equal(energy.sessionCalories({ durationMinutes: 60, kind: 'strength', effort: 1 }, 80), 280);
  assert.equal(energy.sessionCalories({ durationMinutes: 20, kind: 'interval' }, 80), 185);
  const mobility = exercises.find((exercise) => exercise.category === 'mobility');
  assert.equal(energy.sessionCalories({ durationMinutes: 10, records: [{ exerciseId: mobility.id, unit: 'seconds', sets: [] }] }, 80), 35);
  assert.equal(energy.plannedCalories(30, 70), 175);
});

test('energía: semana de entrenamiento y nivel de actividad sugerido', () => {
  const wednesday = new Date(2026, 9, 7, 12);
  const chest = exercises.find((exercise) => exercise.primary.length === 1 && exercise.primary[0] === 'chest' && exercise.category !== 'mobility');
  const entry = (date, extra = {}) => ({ id: `${date}-${Math.random()}`, date, completedAt: `${date}T10:00:00.000Z`, durationMinutes: 30, exerciseCount: 1, sets: 3, mode: 'full', ...extra });
  const week = energy.weekTraining([
    entry('2026-10-05', { records: [{ exerciseId: chest.id, unit: 'reps', sets: Array.from({ length: 10 }, () => set(10, 20)) }] }),
    entry('2026-10-05'),
    entry('2026-10-06', { kind: 'interval', durationMinutes: 16 }),
    entry('2026-10-04'),
  ], wednesday);
  assert.equal(week.strengthDays, 1);
  assert.equal(week.intervals, 1);
  assert.equal(week.minutes, 76);
  assert.equal(week.musclesOnTarget, 1);
  assert.equal(week.sessions.length, 3);

  const days = Array.from({ length: 12 }, (_, index) => utils.localDateKey(new Date(wednesday.getTime() - index * 2 * DAY)));
  assert.equal(energy.trainedActivity(days.map((date) => entry(date)), wednesday), 'moderate');
  assert.equal(energy.trainedActivity(days.slice(0, 3).map((date) => entry(date)), wednesday), null);
  assert.ok(energy.activityRank('moderate') > energy.activityRank('light'));
});

test('el objetivo de alimentación ajusta la rutina y la guía semanal', () => {
  assert.equal(generator.trainingGoal(['habits'], 'lose'), 'weight');
  assert.equal(generator.trainingGoal(['habits'], 'gain'), 'muscle');
  assert.equal(generator.trainingGoal(['muscle']), 'muscle');
  assert.equal(generator.trainingGoal(['energy'], 'maintain'), 'energy');
  assert.equal(generator.trainingGoal(['energy']), 'energy');
  assert.equal(nutrition.goalFromAssessment(['weight']), 'lose');
  assert.equal(nutrition.goalFromAssessment(['strength']), 'maintain');
  assert.deepEqual({ ...energy.goalGuides.lose.intervals }, { min: 1, max: 2 });
  assert.equal(energy.goalGuides.lose.strength.min, 3);
  assert.equal(energy.goalGuides.maintain.activityMinutes, 150);
  assert.deepEqual({ ...energy.goalGuides.gain.setsPerMuscle }, { min: 4, max: 20 });
});

test('agua: meta para beber según el peso, comida según la hora e historial acotado', () => {
  assert.deepEqual({ ...nutrition.waterGoal(81.5) }, { glasses: 9, liters: 2.25 });
  assert.deepEqual({ ...nutrition.waterGoal(60) }, { glasses: 7, liters: 1.75 });
  assert.equal(nutrition.waterGoal(null).glasses, 8);
  assert.equal(nutrition.waterGoal(40).glasses, 6);
  assert.equal(nutrition.waterGoal(200).glasses, 14);
  assert.equal(nutrition.formatLiters(9), '2,25');
  const at = (hour, minute = 0) => nutrition.mealSlotAt(new Date(2026, 9, 5, hour, minute));
  assert.deepEqual([at(7), at(13), at(18), at(19, 45), at(23, 30), at(3)], ['desayuno', 'almuerzo', 'once', 'cena', 'colacion', 'colacion']);
  const targets = nutrition.nutritionTargets({ sex: 'male', birthYear: 1986, heightCm: 178, activity: 'moderate', goal: 'lose', adjustment: -15, special: 'none', mode: 'count', updatedAt: '' }, 81.5, new Date(2026, 9, 5));
  assert.equal(targets.waterLiters, 2.25);
});

const sync = load('src/lib/cloud/sync-plan.ts');
const { STORAGE_KEYS } = load('src/lib/storage-keys.ts');

test('nube: qué se sincroniza (todo menos el entrenamiento en curso)', () => {
  const synced = new Set(sync.cloudSpecs.map((spec) => spec.key));
  for (const [name, key] of Object.entries(STORAGE_KEYS)) {
    if (name === 'draft') assert.ok(!synced.has(key), 'el entrenamiento en curso no se sube');
    else assert.ok(synced.has(key), `falta sincronizar ${name}`);
  }
  assert.equal(sync.cloudId('a/b'), 'a_b');
  assert.equal(sync.cloudId(''), '_');
  assert.equal(sync.hashValue({ a: 1 }), sync.hashValue({ a: 1 }));
  assert.notEqual(sync.hashValue({ a: 1 }), sync.hashValue({ a: 2 }));
});

test('nube: diferencias por registro y unión al conectar un equipo', () => {
  const spec = sync.collectionSpecs.find((item) => item.name === 'workouts');
  const a = { id: 'a', date: '2026-10-01', completedAt: '2026-10-01T10:00:00Z' };
  const b = { id: 'b', date: '2026-10-03', completedAt: '2026-10-03T10:00:00Z' };
  const first = sync.diffCollection([a, b], spec, {});
  assert.deepEqual(Array.from(first.upserts, (item) => item.id), ['a', 'b']);
  const shadow = Object.fromEntries(first.upserts.map((item) => [item.id, item.hash]));
  const edited = sync.diffCollection([{ ...a, notes: 'nuevo' }], spec, shadow);
  assert.deepEqual(Array.from(edited.upserts, (item) => item.id), ['a']);
  assert.deepEqual(Array.from(edited.removals), ['b']);

  const c = { id: 'c', date: '2026-10-02', completedAt: '2026-10-02T10:00:00Z' };
  const remote = new Map([
    ['a', { json: JSON.stringify({ ...a, notes: 'nube' }), deleted: false }],
    ['c', { json: JSON.stringify(c), deleted: false }],
    ['b', { json: '', deleted: true }],
  ]);
  const merged = sync.mergeCollection([a, b, { id: 'd', date: '2026-10-04' }], remote, spec);
  assert.deepEqual(Array.from(merged.items, (item) => item.id), ['a', 'c', 'd']);
  assert.equal(merged.items[0].notes, 'nube');
  assert.deepEqual(Object.keys(merged.shadow).sort(), ['a', 'c']);
});

test('nube: al conectar un equipo, las listas se unen en vez de reemplazarse', () => {
  const plain = (value) => JSON.parse(JSON.stringify(value));
  // Rutinas: gana la nube en el mismo id; la rutina creada sólo en este equipo se conserva al final.
  const routines = sync.mergeListDoc([{ id: 'r1', name: 'Local' }, { id: 'r3', name: 'Sólo aquí' }], [{ id: 'r1', name: 'Nube' }, { id: 'r2', name: 'Otra' }]);
  assert.deepEqual(plain(routines).map((item) => `${item.id}:${item.name}`), ['r1:Nube', 'r2:Otra', 'r3:Sólo aquí']);
  // Favoritos (números) y bienestar (por fecha, en orden cronológico).
  assert.deepEqual(plain(sync.mergeListDoc([3, 7], [7, 9])), [7, 9, 3]);
  const wellness = sync.mergeListDoc([{ date: '2026-10-03', sleepHours: 6 }, { date: '2026-10-05', sleepHours: 8 }], [{ date: '2026-10-04', sleepHours: 7 }, { date: '2026-10-05', sleepHours: 7.5 }]);
  assert.deepEqual(plain(wellness), [{ date: '2026-10-03', sleepHours: 6 }, { date: '2026-10-04', sleepHours: 7 }, { date: '2026-10-05', sleepHours: 7.5 }]);
  // Documentos que no son listas (ajustes, evaluación): manda la nube, como antes.
  assert.deepEqual(plain(sync.mergeListDoc({ name: 'Local' }, { name: 'Nube' })), { name: 'Nube' });
  assert.deepEqual(plain(sync.mergeListDoc([{ id: 'x' }], { name: 'Nube' })), { name: 'Nube' });
});

test('nube: un cambio remoto no pisa un cambio local sin subir', () => {
  const spec = sync.collectionSpecs.find((item) => item.name === 'water');
  const today = { date: '2026-10-05', glasses: 3 };
  const shadow = { '2026-10-05': sync.hashValue(today) };
  const incoming = { json: JSON.stringify({ date: '2026-10-05', glasses: 5 }), deleted: false };
  const applied = sync.applyRemoteRecord([today], '2026-10-05', incoming, spec, { ...shadow });
  assert.equal(applied.changed, true);
  assert.equal(applied.items[0].glasses, 5);
  const localEdit = sync.applyRemoteRecord([{ date: '2026-10-05', glasses: 4 }], '2026-10-05', incoming, spec, { ...shadow });
  assert.equal(localEdit.changed, false);
  assert.equal(localEdit.items[0].glasses, 4);
  const removed = sync.applyRemoteRecord([today], '2026-10-05', { json: '', deleted: true }, spec, { ...shadow });
  assert.deepEqual(Array.from(removed.items), []);
  const added = sync.applyRemoteRecord([], '2026-10-06', { json: JSON.stringify({ date: '2026-10-06', glasses: 1 }), deleted: false }, spec, {});
  assert.equal(added.items.length, 1);
});

const review = load('src/lib/weekly-review.ts');

test('revisión semanal: tendencia del peso por mínimos cuadrados', () => {
  const entries = [['2026-09-20', 82], ['2026-09-24', 81.8], ['2026-09-27', 81.7], ['2026-10-01', 81.4], ['2026-10-04', 81.3]].map(([date, weight]) => ({ date, label: date, weight }));
  const trend = review.weightTrend(entries, '2026-10-05');
  assert.equal(trend.points.length, 5);
  assert.equal(trend.spanDays, 14);
  assert.ok(trend.kgPerWeek < -0.3 && trend.kgPerWeek > -0.4, `pendiente ${trend.kgPerWeek}`);
  assert.equal(review.weightTrend(entries.slice(0, 1), '2026-10-05'), null);
  assert.equal(review.weightTrend(entries, '2026-12-30'), null, 'fuera de la ventana de 3 semanas');
});

test('revisión semanal: decisiones y límites', () => {
  const profile = { sex: 'male', birthYear: 1986, heightCm: 178, activity: 'moderate', goal: 'lose', adjustment: -15, special: 'none', mode: 'count', updatedAt: '' };
  const series = (perWeek) => Array.from({ length: 5 }, (_, index) => ({ date: utils.localDateKey(new Date(2026, 8, 21 + index * 3.5)), label: '', weight: Math.round((82 + (perWeek / 7) * index * 3.5) * 100) / 100 }));
  const today = '2026-10-06';
  const run = (perWeek, extra = {}, foodLog = []) => review.weeklyReview({ profile: { ...profile, ...extra }, weights: series(perWeek), foodLog, today });

  const onTrack = run(-0.37);
  assert.equal(onTrack.status, 'ready');
  assert.equal(onTrack.verdict, 'on-track');
  assert.equal(onTrack.change, 0);
  assert.ok(Math.abs(onTrack.plannedKgWeek + 0.37) < 0.05);

  const slow = run(-0.1);
  assert.equal(slow.verdict, 'lower');
  assert.equal(slow.change, -150);
  assert.equal(slow.suggestedKcal, slow.currentKcal - 150);

  const fast = run(-1.2);
  assert.equal(fast.verdict, 'raise');
  assert.equal(fast.change, 200, 'máximo 200 kcal por semana');

  const atFloor = run(-0.05, { customKcal: 1600 });
  assert.equal(atFloor.verdict, 'floor');
  assert.equal(atFloor.suggestedKcal, atFloor.currentKcal);

  const food = (date, kcal) => ({ id: date, date, meal: 'almuerzo', foodId: 'x', name: 'x', portion: '1', portions: 1, kcal, protein: 0, carbs: 0, fat: 0 });
  const overeating = Array.from({ length: 7 }, (_, index) => food(utils.localDateKey(new Date(2026, 8, 25 + index)), 2600));
  const adherence = run(-0.05, {}, overeating);
  assert.equal(adherence.verdict, 'adherence');
  assert.equal(adherence.intakeAvg, 2600);
  assert.equal(adherence.change, 0);

  // El ritmo planeado no cambia por haber ajustado ya las calorías.
  const adjusted = run(-0.05, { customKcal: 2130 });
  assert.ok(Math.abs(adjusted.plannedKgWeek - onTrack.plannedKgWeek) < 0.01);

  assert.equal(review.weeklyReview({ profile, weights: series(-0.3).slice(0, 2), foodLog: [], today }).status, 'collecting');
  assert.equal(run(-0.3, { special: 'pregnancy' }).status, 'unavailable');
  assert.equal(run(-0.3, { mode: 'simple' }).status, 'unavailable');

  const patch = review.checkInPatch(profile, slow, true, today);
  assert.equal(patch.customKcal, slow.suggestedKcal);
  assert.equal(patch.checkIns.at(-1).applied, true);
  const done = run(-0.05, patch);
  assert.equal(done.due, false, 'ya revisado esta semana');
  assert.equal(review.activeCheckIn({ ...profile, ...patch }).toKcal, slow.suggestedKcal);
  const many = { ...profile, checkIns: Array.from({ length: 12 }, (_, index) => ({ date: `2026-01-${String(index + 1).padStart(2, '0')}`, fromKcal: 1, toKcal: 1, observedKgWeek: 0, plannedKgWeek: 0, applied: false })) };
  assert.equal(review.checkInPatch(many, onTrack, false, today).checkIns.length, 12);
});

test('comidas guardadas: guardar, repetir y porción habitual', () => {
  const entry = (id, foodId, portions, meal = 'desayuno', date = '2026-10-05') => ({ id, date, meal, foodId, name: foodId, portion: '1 porción', portions, kcal: 100, protein: 10, carbs: 10, fat: 2 });
  const saved = nutrition.savedMealFromEntries([entry('a', 'avena', 1), entry('b', 'platano', 1.5)], { id: 's1', name: '  Mi desayuno  ', meal: 'desayuno', now: new Date(2026, 9, 5) });
  assert.equal(saved.name, 'Mi desayuno');
  assert.deepEqual(Object.keys(saved.items[0]).sort(), ['carbs', 'fat', 'foodId', 'kcal', 'name', 'portion', 'portions', 'protein']);
  assert.equal(nutrition.entryTotals(saved.items).kcal, 250);
  let n = 0;
  const copies = nutrition.entriesFromSavedMeal(saved, { date: '2026-10-06', meal: 'once', newId: () => `n${++n}` });
  assert.deepEqual(Array.from(copies, (item) => [item.id, item.date, item.meal, item.portions]), [['n1', '2026-10-06', 'once', 1], ['n2', '2026-10-06', 'once', 1.5]]);
  const other = { ...saved, id: 's2', meal: 'cena', updatedAt: '2026-10-07T00:00:00.000Z' };
  assert.deepEqual(Array.from(nutrition.savedMealsFor([other, saved], 'desayuno'), (item) => item.id), ['s1', 's2']);
  const usual = nutrition.usualPortions([entry('x', 'arroz', 1), entry('y', 'arroz', 1.5), entry('z', 'rapido', 3)]);
  assert.deepEqual({ ...usual }, { arroz: 1.5 });
});

const hero = load('src/data/hero-photos.ts');
const motivation = load('src/lib/motivation.ts');

test('portada: foto según la sesión y frase según el progreso', () => {
  assert.equal(hero.heroKind({ focus: 'conditioning', location: 'home' }), 'cardio');
  assert.equal(hero.heroKind({ focus: 'mobility', location: 'gym' }), 'mobility');
  assert.equal(hero.heroKind({ focus: 'full', location: 'gym' }), 'gym');
  assert.equal(hero.heroKind({ focus: 'upper', location: 'home' }), 'home');
  assert.equal(hero.heroKind({ programGoal: 'conditioning', location: 'gym' }), 'cardio');
  assert.notEqual(hero.heroPhoto('gym', 0).src, hero.heroPhoto('gym', 1).src, 'se alternan por día');
  for (const kind of ['home', 'gym', 'cardio', 'mobility']) {
    const photo = hero.heroPhoto(kind, 3);
    assert.ok(fs.existsSync(path.join(root, 'public', photo.src)), `falta ${photo.src}`);
    assert.ok(photo.alt.length > 10);
  }

  const wednesday = new Date(2026, 9, 7, 9);
  const day = (date) => ({ id: date, date, completedAt: `${date}T10:00:00.000Z`, durationMinutes: 30, exerciseCount: 4, sets: 12, mode: 'full' });
  const line = (dates, recommendation = 'train-normal', done = 1, goal = 3) => motivation.todayLine({ recommendation, workouts: dates.map(day), week: { done, goal }, now: wednesday });
  assert.equal(line([], 'train-normal', 0), 'Tu primera sesión está lista.');
  assert.equal(line(['2026-10-05', '2026-10-06', '2026-10-07'], 'train-normal', 3), 'Vas muy bien esta semana.');
  assert.equal(line(['2026-09-28'], 'train-normal', 0), 'Constancia antes que perfección.', 'tras días sin entrenar, sin culpa');
  assert.equal(line(['2026-10-05']), 'Hoy toca avanzar.');
  // El cuerpo manda: con cansancio o recuperación, la frase acompaña en vez de empujar.
  assert.equal(line(['2026-10-05'], 'recovery'), 'Recuperar también es avanzar.');
  assert.equal(line(['2026-10-05'], 'train-reduced'), 'Entrena según cómo responde tu cuerpo.');
  assert.equal(line(['2026-10-05'], 'done'), 'Buen trabajo hoy.');
  assert.equal(line(['2026-10-05'], 'resume-session'), 'Tu entrenamiento te espera.');
  for (const recommendation of ['resume-session', 'done', 'train-normal', 'train-reduced', 'short-session', 'recovery', 'mobility']) {
    assert.doesNotMatch(line(['2026-10-05'], recommendation), /excusa|nadie lo hará|no la cortes|termínalo/i, `tono: ${recommendation}`);
  }
});

test('paleta: contraste AA del acento y el dorado en ambos temas', () => {
  const css = fs.readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
  const light = css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme: dark)'));
  const dark = css.slice(css.indexOf(':root[data-theme="dark"], .on-dark {'));
  const token = (block, name) => block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1];
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  assert.ok(ratio(token(light, 'accent'), token(light, 'accent-ink')) >= 4.5, 'texto sobre el acento (claro)');
  assert.ok(ratio(token(light, 'accent-text'), token(light, 'bg')) >= 4.5, 'texto de acento sobre el fondo (claro)');
  assert.ok(ratio(token(light, 'gold-text'), token(light, 'bg')) >= 4.5, 'texto dorado sobre el fondo (claro)');
  assert.ok(ratio(token(dark, 'accent-text'), token(dark, 'bg')) >= 4.5, 'texto de acento sobre el fondo (oscuro)');
  assert.ok(ratio(token(dark, 'gold-text'), token(dark, 'bg')) >= 4.5, 'texto dorado sobre el fondo (oscuro)');
  assert.ok(ratio(token(dark, 'ink-2'), token(dark, 'bg')) >= 4.5, 'texto secundario (oscuro)');
});

const personalize = load('src/lib/personalize.ts');

test('personalización: fotos y color según cómo te identificas, con elección manual', () => {
  assert.equal(personalize.identityFrom('female', 'male'), 'female');
  assert.equal(personalize.identityFrom(undefined, 'male'), 'male');
  assert.equal(personalize.identityFrom(), 'unspecified');
  assert.equal(personalize.audienceFor('auto', 'female'), 'female');
  assert.equal(personalize.audienceFor(undefined, 'unspecified'), 'mixed');
  assert.equal(personalize.audienceFor('male', 'female'), 'male');
  assert.equal(personalize.accentFor(undefined), 'fire');
  assert.equal(personalize.accentFor('lime'), 'lime');
  const sets = { female: ['f1', 'f2'], male: ['m1'] };
  assert.equal(personalize.pickPhoto(sets, 'female', 1), 'f2');
  assert.equal(personalize.pickPhoto(sets, 'male', 5), 'm1');
  assert.deepEqual([0, 1].map((seed) => personalize.pickPhoto(sets, 'mixed', seed)), ['m1', 'f1']);
  for (const photo of hero.allHeroPhotos) assert.ok(fs.existsSync(path.join(root, 'public', photo.src)), `falta ${photo.src}`);
  for (const kind of ['home', 'gym', 'cardio', 'mobility']) {
    assert.match(hero.heroPhoto(kind, 0, 'female').alt, /Mujer/);
  }
  const onboarding = load('src/data/onboarding-photos.ts');
  for (const photo of onboarding.allOnboardingPhotos) assert.ok(fs.existsSync(path.join(root, 'public', photo)), `falta ${photo}`);
  assert.notEqual(onboarding.onboardingPhoto('goal', null), onboarding.onboardingPhoto('place', null), 'sin identidad, se alternan');
  assert.equal(onboarding.onboardingPhoto('place', 'female'), '/images/editorial/hero-f-gym-deadlift.webp');
  assert.equal(onboarding.resultPhoto('gym', 'male'), '/images/editorial/hero-m-gym-squat.webp');
});

test('colores de acento: contraste AA en claro y oscuro', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/accents.css'), 'utf8');
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
  const read = (rule, name) => rule.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'))[1];
  for (const name of personalize.accentOptions.map((option) => option.value).filter((value) => value !== 'fire')) {
    const light = css.match(new RegExp(`:root\\[data-accent="${name}"\\]:not\\(\\[data-theme="dark"\\]\\) \\{([^}]+)\\}`))[1];
    const dark = css.match(new RegExp(`:root\\[data-accent="${name}"\\]\\[data-theme="dark"\\][^{]*\\{([^}]+)\\}`))[1];
    assert.ok(ratio(read(light, 'accent'), read(light, 'accent-ink')) >= 4.5, `${name}: texto sobre el acento (claro)`);
    assert.ok(ratio(read(light, 'accent-text'), '#f5f3ec') >= 4.5, `${name}: texto de acento (claro)`);
    assert.ok(ratio(read(dark, 'accent'), read(dark, 'accent-ink')) >= 4.5, `${name}: texto sobre el acento (oscuro)`);
    assert.ok(ratio(read(dark, 'accent-text'), '#0a0a0a') >= 4.5, `${name}: texto de acento (oscuro)`);
  }
});

const equipmentData = load('src/data/equipment.ts');

test('equipamiento: cada equipo habilita ejercicios y cada ejercicio se puede habilitar', () => {
  const provided = new Set(equipmentData.equipmentCatalog.flatMap((item) => item.provides));
  const used = new Set(exercises.flatMap((exercise) => exercise.equipment.flat()));
  for (const capability of used) assert.ok(provided.has(capability), `ningún equipo aporta «${capability}»`);
  for (const item of equipmentData.equipmentCatalog) {
    if (item.comfort) { assert.equal(item.provides.length, 0, `${item.id}: marcado como complemento pero aporta capacidades`); continue; }
    assert.ok(item.provides.length > 0, `${item.id} no aporta nada`);
    assert.ok(item.provides.some((capability) => used.has(capability)), `ningún ejercicio usa ${item.id}`);
    assert.ok(item.base.every((place) => item.places.includes(place)), `${item.id}: base fuera de sus lugares`);
  }
  const ids = equipmentData.equipmentCatalog.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('equipamiento: casa, gimnasio completo y gimnasio ajustado', () => {
  const has = (preference, capability) => generator.availableEquipment(preference).has(capability);
  assert.equal(generator.availableEquipment({ location: 'home', equipment: [] }).size, 0);
  assert.ok(has({ location: 'home', equipment: ['load-bag'] }, 'dumbbells'), 'bidones o mochila sirven como mancuernas');
  assert.ok(has({ location: 'gym', equipment: [] }, 'leg-press'), 'gimnasio completo por defecto');
  assert.ok(!has({ location: 'gym', equipment: [], gymEquipment: ['dumbbells', 'bench'] }, 'cable'), 'respeta lo que tiene el gimnasio');
  const treadmill = exercises.find((exercise) => exercise.id === 86);
  assert.ok(generator.isAvailable(treadmill, generator.availableEquipment({ location: 'home', equipment: ['treadmill'] })));
  assert.ok(!generator.isAvailable(treadmill, generator.availableEquipment({ location: 'home', equipment: ['bike'] })));
  const stepUp = exercises.find((exercise) => exercise.id === 16);
  assert.ok(generator.isAvailable(stepUp, generator.availableEquipment({ location: 'home', equipment: ['box'] })), 'subida con cajón o banco');
  assert.ok(equipmentData.homeBase.length >= 5);
  const set = generator.availableEquipment({ location: 'home', equipment: ['dumbbell-set'] });
  assert.ok(set.has('dumbbells') && set.has('barbell'), 'el set unible sirve como mancuernas y barra');
  const multigym = generator.availableEquipment({ location: 'home', equipment: ['multigym'] });
  assert.ok(multigym.has('cable') && multigym.has('press-machines'), 'el multigimnasio habilita poleas y press');
  assert.equal(generator.availableEquipment({ location: 'home', equipment: ['mat'] }).size, 0, 'la colchoneta no cambia la rutina');
});

const loadsLib = load('src/lib/loads.ts');

test('pesos: disponibles en casa, set unible, barra y gimnasio', () => {
  assert.equal(loadsLib.availableLoads({ location: 'gym', equipment: [], loads: { dumbbells: [10] } }), null, 'en el gimnasio no se ajusta');
  assert.equal(loadsLib.availableLoads({ location: 'home', equipment: ['dumbbells'] }), null, 'sin pesos marcados, como antes');
  const home = loadsLib.availableLoads({ location: 'home', equipment: ['dumbbells', 'load-bag', 'kettlebell'], loads: { dumbbells: [4, 8], 'load-bag': [5], kettlebell: [12] } });
  assert.deepEqual([...home.dumbbells], [4, 5, 8]);
  assert.deepEqual([...home.kettlebell], [12]);
  const kit = loadsLib.availableLoads({ location: 'home', equipment: ['dumbbell-set'], loads: { 'dumbbell-set': [20] } });
  assert.equal(Math.max(...kit.dumbbells), 10, 'set de 20 kg: hasta 10 kg por mancuerna');
  assert.equal(Math.max(...kit.barbell), 20);
});

test('pesos: ajuste de carga, repeticiones y series', () => {
  const goblet = exercises.find((exercise) => exercise.id === 10);
  assert.equal(loadsLib.startingLoad(goblet, 80, 2), 13);
  const light = loadsLib.fitLoad(goblet, 13, [4, 6]);
  assert.equal(light.load, 6);
  assert.ok(light.range[0] > goblet.range[0] && light.range[1] <= 25, `más repeticiones: ${light.range}`);
  assert.equal(light.extraSet, true);
  const heavy = loadsLib.fitLoad(goblet, 8, [14]);
  assert.ok(heavy.range[1] < goblet.range[1] && heavy.range[0] >= 4, `menos repeticiones: ${heavy.range}`);
  const exact = loadsLib.fitLoad(goblet, 10, [8, 10, 12]);
  assert.equal(exact.adapted, false);
  assert.equal(exact.load, 10);
  assert.ok(loadsLib.unfit(30 / 10) && loadsLib.unfit(2 / 15) && !loadsLib.unfit(1));
});

test('pesos: el generador adapta la rutina a las pesas de casa', () => {
  const base = { minutes: 30, focus: 'upper', goal: 'strength', level: 2, seed: 3, bodyKg: 80, workouts: [] };
  const heavyOnly = generator.generateWorkout({ ...base, preference: { location: 'home', equipment: ['dumbbells'], loads: { dumbbells: [20] } } });
  assert.ok(!heavyOnly.records.some((record) => record.exerciseId === 47), 'sin elevaciones laterales con sólo mancuernas de 20 kg');
  const lightOnly = generator.generateWorkout({ ...base, preference: { location: 'home', equipment: ['dumbbells'], loads: { dumbbells: [3] } } });
  const unknown = generator.generateWorkout({ ...base, preference: { location: 'home', equipment: ['dumbbells'] } });
  const loaded = lightOnly.records.filter((record) => record.sets.some((set) => set.load > 0));
  assert.ok(loaded.length > 0, 'usa las mancuernas livianas en algún ejercicio');
  for (const record of loaded) {
    assert.ok(record.sets.every((set) => set.load === 3), 'carga igual a la que tienes');
    const exercise = exercises.find((item) => item.id === record.exerciseId);
    const same = unknown.records.find((item) => item.exerciseId === record.exerciseId);
    const baseRange = same?.range ?? exercise.range;
    if (record.range) assert.ok(record.range[0] >= baseRange[0], 'peso liviano: no menos repeticiones que sin pesas marcadas');
  }
  assert.ok(unknown.records.every((record) => record.sets.every((set) => set.load === 0)), 'sin pesos marcados, sin cargas inventadas');
});

const barcode = load('src/lib/barcode.ts');

test('comida en gramos: porción, conversión y etiqueta', () => {
  assert.equal(nutrition.portionGrams('1 taza (160 g)'), 160);
  assert.equal(nutrition.portionGrams('1 plato (150 g, con 1 cdta de aceite)'), 150);
  assert.equal(nutrition.portionGrams('100 g cocida'), 100);
  assert.equal(nutrition.portionGrams('1 vaso (200 ml)'), 200);
  assert.equal(nutrition.portionGrams('1 vaso (45 ml de pisco)'), null, 'sólo mide una parte');
  assert.equal(nutrition.portionGrams('1 bowl (40 g de avena)'), null);
  assert.equal(nutrition.portionGrams('8 piezas'), null);
  assert.equal(nutrition.portionUnit('1 vaso (200 ml)'), 'ml');
  assert.equal(nutrition.portionUnit('1 taza (160 g)'), 'g');
  const arroz = foods.find((food) => food.id === 'arroz-blanco');
  const entry = nutrition.entryFromFood(arroz, { id: 'e1', date: '2026-10-06', meal: 'almuerzo', portions: 1, grams: 240 });
  assert.equal(entry.portions, 1.5);
  assert.equal(entry.grams, 240);
  assert.equal(nutrition.entryTotals([entry]).kcal, 312);
  assert.equal(nutrition.amountLabel(entry), '240 g');
  const byPortion = nutrition.entryFromFood(arroz, { id: 'e2', date: '2026-10-06', meal: 'almuerzo', portions: 2 });
  assert.ok(!('grams' in byPortion));
  assert.equal(nutrition.amountLabel(byPortion), '2 × 1 taza (160 g)');
  assert.deepEqual({ ...nutrition.usualGrams([entry, { ...byPortion, foodId: 'avena' }]) }, { 'arroz-blanco': 240 });
  assert.deepEqual({ ...nutrition.usualGrams([entry, byPortion]) }, {}, 'la última vez fue en porciones');
  const saved = nutrition.savedMealFromEntries([entry], { id: 's', name: 'Almuerzo', meal: 'almuerzo' });
  assert.equal(saved.items[0].grams, 240, 'las comidas guardadas recuerdan los gramos');
  const ids = new Set(foods.map((food) => food.id));
  assert.ok(foods.length >= 200 && ids.has('porotos-granados') && ids.has('mote-huesillo'));
  const withGrams = foods.filter((food) => nutrition.portionGrams(food.portion)).length;
  assert.ok(withGrams / foods.length > 0.85, `casi todo se puede registrar en gramos (${withGrams} de ${foods.length})`);
});

test('código de barras: producto de Open Food Facts a alimento', () => {
  const product = { product_name: 'Galletas de avena', brands: 'Marca X, Otra', serving_quantity: '30', nutriments: { 'energy-kcal_100g': 450, proteins_100g: 8, carbohydrates_100g: 65, fat_100g: 17 } };
  const food = barcode.foodFromOpenFoodFacts('7801234567890', product);
  assert.deepEqual({ ...food }, { id: 'off-7801234567890', name: 'Galletas de avena · Marca X', portion: '1 porción (30 g)', kcal: 135, protein: 2.4, carbs: 19.5, fat: 5.1, category: 'propios' });
  assert.equal(nutrition.portionGrams(food.portion), 30);
  const per100 = barcode.foodFromOpenFoodFacts('123', { product_name_es: 'Leche', product_name: 'Milk', nutriments: { energy_100g: 2092 } });
  assert.equal(per100.portion, '100 g');
  assert.equal(per100.kcal, 500, 'kJ a kcal');
  assert.equal(per100.name, 'Leche');
  const drink = barcode.foodFromOpenFoodFacts('5449000000996', { product_name: 'Coca-Cola Original', brands: 'COCA-COLA SERVICES SA/NV', serving_quantity: 330, serving_size: '330 ml', nutriments: { 'energy-kcal_100g': 42, carbohydrates_100g: 10.6 } });
  assert.equal(drink.name, 'Coca-Cola Original', 'sin repetir la marca');
  assert.equal(drink.portion, '1 porción (330 ml)');
  assert.equal(nutrition.portionUnit(drink.portion), 'ml');
  assert.equal(barcode.foodFromOpenFoodFacts('1', { product_name: 'Sin datos', nutriments: {} }), null);
  assert.equal(barcode.foodFromOpenFoodFacts('1', { nutriments: { 'energy-kcal_100g': 100 } }), null);
});

const gapLib = load('src/lib/day-gap.ts');

test('¿qué me falta hoy?: ideas que caben, con proteína y lo de siempre primero', () => {
  const at = (h, m = 0) => new Date(2026, 9, 6, h, m);
  const zero = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const targets = { kcal: 2000, protein: 140 };
  const morning = gapLib.dayGap({ targets, totals: zero, now: at(8), catalog: foods, history: [] });
  assert.equal(morning.meal, 'desayuno');
  assert.equal(morning.focus, 'protein');
  assert.equal(morning.ideas.length, 3);
  assert.equal(new Set(morning.ideas.map((idea) => idea.food.category)).size, 3, 'sin repetir categoría');
  assert.ok(morning.ideas.every((idea) => idea.kcal <= 500 && idea.protein >= 6), 'caben en la parte del desayuno y aportan proteína');
  const entry = (foodId, portions, meal = 'desayuno') => ({ id: foodId + meal + portions, date: '2026-10-05', meal, foodId, name: foodId, portion: '', portions, kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const history = [entry('queso-cottage', 1), entry('queso-cottage', 1), entry('queso-cottage', 1), ...Array.from({ length: 5 }, () => entry('cerveza', 1, 'cena'))];
  const usual = gapLib.dayGap({ targets, totals: zero, now: at(8), catalog: foods, history });
  const dairy = usual.ideas.find((idea) => idea.food.category === 'lacteos');
  assert.equal(dairy.food.id, 'queso-cottage', 'lo que sueles comer primero');
  assert.ok(dairy.usual);
  const night = gapLib.dayGap({ targets, totals: { ...zero, kcal: 1400, protein: 140 }, now: at(20, 30), catalog: foods, history });
  assert.equal(night.focus, 'energy');
  assert.ok(night.ideas.length > 0 && night.ideas.every((idea) => idea.kcal <= 600 && !idea.food.alcohol), 'nunca alcohol');
  assert.equal(gapLib.dayGap({ targets, totals: { ...zero, kcal: 1900, protein: 100 }, now: at(13), catalog: foods, history }), null, 'día casi cubierto: nada');
  assert.equal(gapLib.dayGap({ targets, totals: { ...zero, kcal: 1850, protein: 135 }, now: at(13), catalog: foods, history }), null);
  const lunch = (foodId, date = '2026-10-06') => ({ ...entry(foodId, 1, 'almuerzo'), id: foodId + date, date });
  const atTea = gapLib.dayGap({ targets, totals: { ...zero, kcal: 900, protein: 60 }, now: at(17), catalog: foods, history: [lunch('pollo-pechuga', '2026-10-05'), entry('yogur-griego', 1, 'once'), { ...entry('huevo', 1, 'once'), date: '2026-10-06' }] });
  assert.ok(!atTea.ideas.some((idea) => idea.food.id === 'pollo-pechuga'), 'lo del almuerzo no se sugiere en la once');
  assert.ok(!atTea.ideas.some((idea) => idea.food.id === 'huevo'), 'lo ya registrado en esta comida hoy no se repite');
  assert.ok(atTea.ideas.some((idea) => idea.food.id === 'yogur-griego' && idea.usual));
  const late = gapLib.dayGap({ targets, totals: { ...zero, kcal: 1840, protein: 110 }, now: at(23, 30), catalog: foods, history: [entry('batido-proteina', 2, 'colacion')] });
  const shake = late.ideas.find((idea) => idea.food.id === 'batido-proteina');
  assert.equal(shake.portions, 0.5, 'la porción baja para caber');
  for (const [meal, ids] of Object.entries(load('src/data/foods.ts').mealIdeas)) {
    for (const id of ids) assert.ok(foods.some((food) => food.id === id), `${meal}: ${id} no existe`);
  }
});

const recapLib = load('src/lib/week-recap.ts');
const shareLib = load('src/components/progress/week-share.ts');

test('resumen semanal: semana en números y texto para compartir', () => {
  const now = new Date(2026, 9, 7, 18); // miércoles
  const workout = (date, extra = {}) => ({ id: date, name: 'Fuerza', date, completedAt: `${date}T19:00:00.000Z`, durationMinutes: 40, sets: 12, volume: 5000, ...extra });
  const workouts = [
    ...['2026-09-21', '2026-09-23', '2026-09-25'].map((date) => workout(date)),
    ...['2026-09-28', '2026-09-30', '2026-10-02'].map((date) => workout(date)),
    workout('2026-10-05', { prs: [{ exerciseId: 'x' }, { exerciseId: 'y' }] }),
    workout('2026-10-06', { durationMinutes: 35, volume: 2400 }),
  ];
  const food = (date, kcal, protein) => ({ id: date + kcal, date, meal: 'almuerzo', foodId: 'x', name: 'x', portion: '', portions: 1, kcal, protein, carbs: 0, fat: 0 });
  const base = { now, workouts, goal: 3, foodLog: [food('2026-10-05', 600, 50), food('2026-10-05', 400, 30), food('2026-10-06', 2000, 120)], water: [{ date: '2026-10-05', glasses: 8 }, { date: '2026-10-06', glasses: 5 }], waterGoal: 8, weights: [{ date: '2026-09-30', label: '', weight: 80 }, { date: '2026-10-06', label: '', weight: 79.4 }] };
  const current = recapLib.weekRecap({ ...base, targets: { kcal: 2100, protein: 140 } });
  assert.equal(current.start, '2026-10-05');
  assert.equal(current.sessions, 2);
  assert.equal(current.minutes, 75);
  assert.equal(current.volume, 7400);
  assert.equal(current.prs, 2);
  assert.deepEqual(Array.from(current.days, (day) => (day.trained ? 'x' : day.future ? '·' : '-')).join(''), 'xx-····');
  assert.deepEqual({ ...current.nutrition }, { days: 2, kcal: 1500, protein: 100, targetKcal: 2100, targetProtein: 140 });
  assert.deepEqual({ ...current.water }, { days: 2, met: 1, average: 6.5, goal: 8 });
  assert.deepEqual({ ...current.weight }, { change: -0.6, latest: 79.4 });
  assert.equal(recapLib.weekRecap({ ...base, targets: null }).nutrition, null, 'sin contar calorías no se comparte nutrición');
  const last = recapLib.weekRecap({ ...base, offset: -1, targets: null });
  assert.equal(last.sessions, 3);
  assert.equal(last.streak, 2, 'racha al cierre de esa semana');
  assert.ok(!last.current && last.days.every((day) => !day.future));
  assert.equal(recapLib.defaultRecapOffset(new Date(2026, 9, 5, 9), workouts), -1, 'el lunes se propone la semana pasada');
  assert.equal(recapLib.defaultRecapOffset(now, workouts), 0);
  const text = shareLib.recapText(current, 'kg', { nutrition: true, water: true, weight: false });
  assert.match(text, /^Mi semana en PULSO · 5 oct – 11 oct/);
  assert.match(text, /2 entrenamientos \(meta: 3\) · 75 min/);
  assert.match(text, /7\.400 kg levantados · 2 récords/);
  assert.match(text, /Comidas: 1\.500 kcal · 100 g proteína al día/);
  assert.match(text, /Agua: meta cumplida 1 de 2 días/);
  assert.ok(!text.includes('Peso'), 'el peso sólo si se elige');
  assert.match(shareLib.recapText(current, 'kg', { nutrition: false, water: false, weight: true }), /Peso: −0,6 kg en la semana/);
  assert.equal(shareLib.signedWeight(0.45, 'kg'), '+0,5 kg');
});

const reminders = load('src/lib/reminders.ts');

test('avisos: cuándo toca cada uno y cuándo no', () => {
  const tz = 'America/Santiago';
  // 2026-10-07 es miércoles; en Santiago (UTC−3 en octubre) las 19:05 son las 22:05 UTC.
  const at = (date, hh, mm = 5) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, hh + 3, mm)); };
  const clock = reminders.localClock(at('2026-10-07', 19), tz);
  assert.deepEqual({ ...clock }, { date: '2026-10-07', minutes: 19 * 60 + 5, weekday: 2, weekStart: '2026-10-05' });
  const prefs = { ...reminders.defaultPushPrefs, meals: true, water: true };
  const state = { date: '2026-10-07', weekStart: '2026-10-05', trainedToday: false, weekSessions: 1, weekGoal: 3, streak: 2, counting: true, loggedToday: true, loggedEvening: false, water: 8, waterGoal: 9 };
  const due = (overrides = {}, when = at('2026-10-07', 19), sent = {}) => reminders.dueReminders({ prefs, state: { ...state, ...overrides }, sent, timeZone: tz, now: when });
  const training = due();
  assert.equal(training.send.kind, 'training');
  assert.match(training.send.body, /1 de 3 sesiones/);
  assert.equal(due({ trainedToday: true }).send, null, 'ya entrenó hoy');
  assert.equal(due({ weekSessions: 3 }).send, null, 'meta semanal cumplida');
  assert.equal(due({}, at('2026-10-07', 19), { training: '2026-10-07' }).send, null, 'una vez al día');
  assert.equal(due({}, at('2026-10-07', 21, 0)).send?.kind, 'meals', 'fuera de la ventana de entrenar, toca comidas a las 21');
  assert.equal(due({ trainedToday: true }, at('2026-10-08', 19)).send.kind, 'training', 'estado de ayer: el día empieza de cero');
  assert.equal(due({}, at('2026-10-07', 18, 0)).send, null, 'antes de la hora, nada');
  // Comidas: neutro y sólo si cuenta calorías y falta la noche.
  assert.match(due({ trainedToday: true }, at('2026-10-07', 21, 10)).send.body, /once o la cena/);
  assert.equal(due({ trainedToday: true, loggedEvening: true }, at('2026-10-07', 21, 10)).send, null);
  assert.equal(due({ trainedToday: true, counting: false }, at('2026-10-07', 21, 10)).send, null);
  // Agua: según lo esperado a esa hora.
  assert.equal(due({ trainedToday: true, water: 2 }, at('2026-10-07', 11, 10)).send.kind, 'water-1');
  assert.equal(due({ water: 2 }).send.kind, 'training', 'si coinciden, gana entrenar');
  assert.deepEqual(Array.from(due({ water: 2 }).skip), ['water-3']);
  assert.equal(due({ trainedToday: true, water: 3 }, at('2026-10-07', 11, 10)).send, null, '3 de 9 a las 11 va bien');
  // Racha: domingo 18:00 si falta exactamente una; gana sobre el de entrenar.
  const sunday = reminders.dueReminders({ prefs: { ...prefs, trainingTime: '18:00' }, state: { ...state, date: '2026-10-11', weekSessions: 2 }, sent: {}, timeZone: tz, now: at('2026-10-11', 18, 10) });
  assert.equal(sunday.send.kind, 'streak');
  assert.match(sunday.send.body, /2 semanas seguidas/);
  assert.deepEqual(Array.from(sunday.skip), ['training'], 'el de entrenar se marca para no repetirlo');
  // Días fijos: miércoles (2) no está en [0, 4] → sin aviso de entrenar; viernes sí.
  assert.equal(due({ trainingDays: [0, 4] }).send, null, 'día de descanso: no se avisa');
  assert.equal(reminders.dueReminders({ prefs, state: { ...state, date: '2026-10-09', trainingDays: [0, 4] }, sent: {}, timeZone: tz, now: at('2026-10-09', 19) }).send.kind, 'training');
  assert.equal(due({ trainingDays: [] }).send.kind, 'training', 'sin días fijos, como siempre');
  assert.equal(reminders.parseTime('07:30'), 450);
  assert.equal(reminders.parseTime('03:00'), null);
  assert.equal(reminders.parseTime('19:75'), null);
  assert.ok(reminders.validTimeZone('Europe/Madrid') && !reminders.validTimeZone('Marte/Base'));
});

test('nube: lo anotado en dos equipos no se duplica al unir', () => {
  const foodSpec = sync.collectionSpecs.find((spec) => spec.name === 'foodLog');
  const food = (id, foodId, portions = 1, meal = 'desayuno') => ({ id, date: '2026-10-06', meal, foodId, name: foodId, portion: '', portions, kcal: 100, protein: 5, carbs: 10, fat: 2 });
  const remote = new Map([['c1', { json: JSON.stringify(food('c1', 'avena')), deleted: false }], ['c2', { json: JSON.stringify(food('c2', 'huevo')), deleted: false }]]);
  const local = [food('l1', 'avena'), food('l2', 'huevo'), food('l3', 'huevo'), food('l4', 'avena', 2), food('l5', 'avena', 1, 'once')];
  const merged = sync.mergeCollection(local, remote, foodSpec);
  assert.deepEqual(Array.from(merged.items, (item) => item.id).sort(), ['c1', 'c2', 'l3', 'l4', 'l5'], 'una avena y un huevo ya estaban; el segundo huevo, otra porción y otra comida se conservan');
  const same = sync.mergeCollection([food('c1', 'avena')], remote, foodSpec);
  assert.equal(same.items.length, 2, 'mismo id: gana la nube como siempre');
  const workoutSpec = sync.collectionSpecs.find((spec) => spec.name === 'workouts');
  const workout = (id, minutes = 40) => ({ id, name: 'Fuerza', date: '2026-10-06', completedAt: `2026-10-06T2${id.length}:00:00Z`, durationMinutes: minutes, sets: 9, exerciseCount: 3, volume: 1200 });
  const cloudWorkouts = new Map([['w1', { json: JSON.stringify(workout('w1')), deleted: false }]]);
  assert.deepEqual(Array.from(sync.mergeCollection([workout('w9'), workout('w8', 35)], cloudWorkouts, workoutSpec).items, (item) => item.id).sort(), ['w1', 'w8']);
  assert.deepEqual(Array.from(sync.duplicateIds([food('a', 'avena'), food('b', 'avena'), food('c', 'avena', 2), food('d', 'avena')], sync.sameFood)), ['b', 'd'], 'se conserva el primero');
  assert.deepEqual(Array.from(sync.duplicateIds([workout('w1'), workout('w2', 41)], sync.sameWorkout)), []);
});

const trainingDays = load('src/lib/training-days.ts');

test('días de entreno: descanso, próximo día y propuesta', () => {
  const wednesday = new Date(2026, 9, 7, 10);
  assert.equal(trainingDays.weekdayIndex(wednesday), 2);
  assert.equal(trainingDays.isRestDay([0, 2, 4], wednesday), false);
  assert.equal(trainingDays.isRestDay([0, 4], wednesday), true);
  assert.equal(trainingDays.isRestDay([], wednesday), false, 'sin días fijos nunca es descanso');
  assert.deepEqual({ ...trainingDays.nextTrainingDay([0, 2, 4], wednesday) }, { day: 4, ahead: 2, label: 'viernes' });
  assert.equal(trainingDays.nextTrainingDay([3], wednesday).label, 'mañana');
  assert.equal(trainingDays.nextTrainingDay([2], wednesday).ahead, 7, 'el mismo día de la próxima semana');
  assert.equal(trainingDays.nextTrainingDay([], wednesday), null);
  assert.deepEqual(Array.from(trainingDays.cleanDays([4, 0, 4, 9, -1, 2.5])), [0, 4]);
  for (let goal = 1; goal <= 7; goal++) assert.equal(trainingDays.suggestedDays(goal).length, goal);
  assert.equal(trainingDays.daysLabel([4, 0, 2]), 'L · X · V');
});

const { bodyZones } = load('src/data/body-zones.ts');

test('rutina por zona: ejercicios de esa zona con tu equipo', () => {
  const setups = [
    ['casa sin equipo', { location: 'home', equipment: [] }],
    ['casa con mancuernas, banco y bandas', { location: 'home', equipment: ['dumbbells', 'bench', 'bands'] }],
    ['gimnasio', { location: 'gym', equipment: [] }],
  ];
  for (const zone of bodyZones) {
    for (const [label, preference] of setups) {
      const plan = generator.generateWorkout({ preference, minutes: 30, focus: 'full', level: 2, seed: 5, zone: zone.id });
      assert.match(plan.name, new RegExp(`^${zone.label} · 30 min`));
      assert.equal(plan.zone, zone.id);
      const chosen = plan.records.map((record) => exercises.find((item) => item.id === record.exerciseId));
      const main = chosen.filter((exercise) => exercise.primary.some((muscle) => zone.muscles.includes(muscle)));
      assert.ok(chosen.every((exercise) => exercise.category === 'strength'), `${zone.id} ${label}: sólo fuerza`);
      const zoneMuscles = [...zone.muscles, ...(zone.support ?? [])];
      assert.ok(chosen.every((exercise) => [...exercise.primary, ...exercise.secondary].some((muscle) => zoneMuscles.includes(muscle))), `${zone.id} ${label}: todo trabaja la zona`);
      if (label !== 'casa sin equipo') assert.ok(main.length >= 3, `${zone.id} ${label}: ${main.length} ejercicios principales de la zona`);
      assert.ok(plan.records.length >= 2, `${zone.id} ${label}: ${plan.records.length} ejercicios`);
      assert.ok(plan.estimatedMinutes <= 33, `${zone.id} ${label}: ${plan.estimatedMinutes} min`);
    }
  }
  const glutes = generator.generateWorkout({ preference: { location: 'gym', equipment: [] }, minutes: 45, focus: 'full', level: 2, seed: 1, zone: 'gluteos' });
  const patterns = glutes.records.map((record) => exercises.find((item) => item.id === record.exerciseId).pattern);
  assert.ok(new Set(patterns).size >= 3, `variedad de movimientos: ${patterns.join(', ')}`);
  const zonesLib = load('src/data/body-zones.ts');
  assert.equal(zonesLib.zoneForMuscles(['glutes']).id, 'gluteos');
  assert.equal(zonesLib.zoneForMuscles(['biceps', 'triceps']).id, 'brazos');
  assert.equal(zonesLib.zoneForMuscles([]), undefined);
  assert.equal(zonesLib.zoneForQuery('Glúteos').id, 'gluteos');
  assert.equal(zonesLib.zoneForQuery('abs').id, 'abdomen');
  assert.equal(zonesLib.zoneForQuery('press de banca'), undefined);
  const input = generator.todayGeneratorInput({ profile: null, preference: { location: 'home', equipment: [] }, workouts: [], now: Date.now(), zone: 'piernas' });
  assert.equal(input.focus, 'lower');
  assert.equal(input.zone, 'piernas');
});

const challenges = load('src/lib/challenges.ts');

test('retos de 30 días: cuenta, meta, vencimiento y ritmo', () => {
  const day = (n) => { const d = new Date(2026, 9, 1 + n, 12); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const workout = (n, mobility = false) => ({ id: `w${n}${mobility}`, date: day(n), completedAt: `${day(n)}T18:00:00Z`, durationMinutes: 30, exerciseCount: 1, sets: 3, mode: 'full', records: [{ exerciseId: mobility ? exercises.find((e) => e.category === 'mobility').id : 1, unit: 'reps', sets: [] }] });
  const data = (overrides = {}) => ({ workouts: [], foodLog: [], water: [], waterGoal: 8, proteinTarget: 140, ...overrides });
  const entry = { id: 'r1', kind: 'entrenos-12', start: day(0) };
  // Antes del inicio no cuenta; 5 entrenos en la ventana.
  const five = challenges.challengeProgress(entry, data({ workouts: [workout(-2), ...[0, 2, 4, 6, 8].map((n) => workout(n))] }), day(10));
  assert.deepEqual([five.count, five.target, five.status, five.end, five.daysLeft], [5, 12, 'active', day(29), 20]);
  assert.match(challenges.paceLine(five), /Te faltan 7 en 20 días: unos 3 por semana/);
  // 12 entrenos: cumplido el día del duodécimo.
  const twelve = challenges.challengeProgress(entry, data({ workouts: Array.from({ length: 13 }, (_, n) => workout(n * 2)) }), day(29));
  assert.deepEqual([twelve.status, twelve.count, twelve.doneOn], ['done', 12, day(22)]);
  // Vencido sin llegar, y abandonado.
  assert.equal(challenges.challengeProgress(entry, data({ workouts: [workout(1)] }), day(30)).status, 'expired');
  assert.equal(challenges.challengeProgress({ ...entry, endedAt: day(5) }, data({ workouts: [workout(1), workout(7)] }), day(8)).count, 1, 'lo de después de abandonar no cuenta');
  // Agua, comidas, proteína y movilidad.
  const water = Array.from({ length: 22 }, (_, n) => ({ date: day(n), glasses: n % 2 ? 9 : 5 }));
  assert.equal(challenges.challengeProgress({ id: 'a', kind: 'agua-21', start: day(0) }, data({ water }), day(25)).count, 11);
  const food = (n, protein) => ({ id: `f${n}${protein}`, date: day(n), meal: 'almuerzo', foodId: 'x', name: 'x', portion: '', portions: 2, kcal: 300, protein, carbs: 0, fat: 0 });
  const foodLog = [food(0, 40), food(0, 40), food(1, 30), food(2, 80)];
  assert.equal(challenges.challengeProgress({ id: 'c', kind: 'comidas-25', start: day(0) }, data({ foodLog }), day(5)).count, 3);
  assert.equal(challenges.challengeProgress({ id: 'p', kind: 'proteina-20', start: day(0) }, data({ foodLog }), day(5)).count, 2, '160 g y 160 g llegan a 140; 60 g no');
  assert.equal(challenges.challengeProgress({ id: 'p', kind: 'proteina-20', start: day(0) }, data({ foodLog, proteinTarget: null }), day(5)).count, 0);
  assert.equal(challenges.challengeProgress({ id: 'm', kind: 'movilidad-10', start: day(0) }, data({ workouts: [workout(1, true), workout(2), workout(3, true)] }), day(5)).count, 2);
  const tooLate = challenges.challengeProgress({ id: 'a', kind: 'agua-21', start: day(0) }, data({ water: [] }), day(20));
  assert.match(challenges.paceLine(tooLate), /este no alcanza/);
  assert.equal(challenges.challengeCatalog.filter((item) => item.counting).length, 2);
});

const fitness = load('src/lib/fitness-test.ts');
const fitnessData = load('src/data/fitness-test.ts');

test('test físico: niveles, puntaje, comparación y cuándo repetirlo', () => {
  const [pushups, , plank, step] = fitnessData.fitnessTests;
  // Referencias por edad e identidad (CSEP, YMCA); sin identidad, el promedio.
  assert.deepEqual([...fitness.cutsFor(pushups, 25, 'male')], [17, 22, 29, 36]);
  assert.deepEqual([...fitness.cutsFor(pushups, 25, 'female', 'knees')], [10, 15, 21, 30]);
  assert.equal(fitness.cutsFor(pushups, 25, 'male', 'knees'), null, 'rodillas apoyadas: sin referencia masculina');
  assert.deepEqual([...fitness.cutsFor(step, 40, 'unspecified')], [116, 108, 92, 80]);
  assert.deepEqual([...fitness.cutsFor(plank, 70, 'male')], [15, 30, 45, 60], 'plancha: de 15 en 15 segundos, a toda edad');
  assert.deepEqual([...fitness.cutsFor(plank, 25, 'unspecified')], [15, 30, 45, 60]);
  assert.deepEqual([14, 15, 30, 45, 60].map((v) => fitness.levelFor(v, fitness.cutsFor(plank, 30, 'female'), false)), [1, 2, 3, 4, 5]);
  // Nivel y puntaje coinciden en los cortes; el escalón premia el pulso más bajo.
  const cuts = fitness.cutsFor(pushups, 25, 'male');
  assert.deepEqual([16, 17, 22, 29, 36].map((v) => fitness.levelFor(v, cuts, false)), [1, 2, 3, 4, 5]);
  assert.deepEqual([0, 17, 22, 29, 36, 43, 60].map((v) => fitness.pointsFor(v, cuts, false)), [0, 20, 40, 60, 80, 100, 100]);
  const stepCuts = fitness.cutsFor(step, 22, 'male');
  assert.deepEqual([130, 107, 100, 84, 76, 60].map((v) => fitness.pointsFor(v, stepCuts, true)), [0, 20, 40, 60, 80, 100]);
  assert.equal(fitness.levelFor(90, stepCuts, true), 3);
  for (const test of fitnessData.fitnessTests) {
    for (const row of test.norms) {
      for (const sex of ['male', 'female']) {
        const c = row[sex];
        assert.ok(c.every((v, i) => i === 0 || (test.lowerIsBetter ? v < c[i - 1] : v > c[i - 1])), `${test.id} ${row.maxAge} ${sex}: cortes en orden`);
      }
    }
  }
  // Puntaje PULSO, comparación (las flexiones sólo con la misma variante) y prueba a mejorar.
  const first = { id: 'a', date: '2026-10-01', completedAt: '2026-10-01T10:00:00Z', age: 30, sex: 'male', results: { pushups: 20, squats: 35, plank: 60, step: 105 }, pushupVariant: 'standard' };
  const second = { ...first, id: 'b', date: '2026-10-29', completedAt: '2026-10-29T10:00:00Z', results: { pushups: 26, squats: 38, plank: 80, step: 96 } };
  const results = fitness.testResults(first);
  assert.equal(results.length, 4);
  assert.ok(fitness.fitnessScore(results) > 0 && fitness.fitnessScore(results) < 100);
  const comparison = fitness.compareTests(second, first);
  assert.deepEqual({ ...comparison.deltas }, { pushups: 6, squats: 3, plank: 20, step: -9 });
  assert.ok(comparison.scoreDelta > 0);
  assert.ok(fitness.isImprovement('step', -9) && !fitness.isImprovement('pushups', -2));
  assert.equal(fitness.deltaLabel('step', -9), '−9 lpm');
  assert.equal(fitness.compareTests({ ...second, pushupVariant: 'knees' }, first).deltas.pushups, undefined, 'otra variante no se compara');
  assert.equal(fitness.focusFor(results).test.id, fitness.testResults(first).reduce((low, item) => (item.points < low.points ? item : low)).test.id);
  assert.equal(fitness.testResults({ ...first, results: { pushups: 12 }, pushupVariant: 'knees' })[0].points, null);
  assert.equal(fitness.fitnessScore(fitness.testResults({ ...first, results: { pushups: 12 }, pushupVariant: 'knees' })), null);
  assert.equal(fitness.valueLabel('plank', 95), '1:35 min');
  assert.equal(fitness.valueLabel('plank', 45), '45 s');
  // Cada 4 semanas.
  assert.deepEqual({ ...fitness.testStatus([], '2026-10-05') }, { last: null, previous: null, due: true, daysLeft: 0, nextDate: '2026-10-05' });
  const status = fitness.testStatus([second, first], '2026-11-10');
  assert.deepEqual([status.last.id, status.previous.id, status.nextDate, status.daysLeft, status.due], ['b', 'a', '2026-11-26', 16, false]);
  assert.equal(fitness.testStatus([first], '2026-10-29').due, true);
  assert.ok(sync.docSpecs.some((spec) => spec.key === 'pulso:fitness-tests'), 'se sincroniza como documento');
});

const breaksData = load('src/data/active-breaks.ts');
const breaksLib = load('src/lib/active-breaks.ts');

test('pausas activas: ilustraciones dentro del cuadro y apoyadas en el suelo', () => {
  const { PANEL } = illustration;
  for (const move of breaksData.breakMoves) {
    assert.ok(move.illustration, `${move.id}: sin ilustración`);
    const panels = illustration.layoutIllustration(move.illustration);
    panels.forEach((panel, index) => {
      const points = panel.segments.flatMap((s) => [[s.x1, s.y1, s.width / 2], [s.x2, s.y2, s.width / 2]]);
      points.push([panel.head.cx, panel.head.cy, panel.head.r]);
      for (const [x, y, pad] of points) {
        assert.ok(Number.isFinite(x) && Number.isFinite(y), `${move.id}: coordenada inválida`);
        assert.ok(x - pad > -3 && x + pad < PANEL.width + 3 && y - pad > -3 && y + pad < PANEL.height + 3, `${move.id} (${index ? 'final' : 'inicio'}): la figura se sale del cuadro`);
      }
      assert.ok(Math.max(...points.map(([, y, pad]) => y + pad)) <= PANEL.ground + 0.5, `${move.id}: algo atraviesa el suelo`);
    });
  }
});

test('pausas activas: tramos, duración, rotación y registro', () => {
  const ids = new Set(breaksData.breakMoves.map((move) => move.id));
  for (const routine of breaksData.breakRoutines) {
    for (const item of routine.items) assert.ok(ids.has(item.move), `${routine.id}: movimiento desconocido ${item.move}`);
    const minutes = breaksLib.routineMinutes(routine);
    assert.ok(minutes >= 2 && minutes <= 6, `${routine.id}: ${minutes} min`);
  }
  const neck = breaksData.breakRoutineById.get('cuello');
  const segments = breaksLib.breakSegments(neck);
  // Prepárate + cuello por lado (2) y luego, por cada movimiento, «sigue» + movimiento.
  assert.deepEqual(JSON.parse(JSON.stringify(segments.slice(0, 4).map((s) => [s.kind, s.side ?? 0, s.seconds]))), [['prep', 0, 5], ['move', 1, 20], ['move', 2, 20], ['switch', 0, 5]]);
  assert.equal(breaksLib.routineSeconds(neck), 5 + 40 + 4 * (5 + 30));
  // Rotación: cuello → piernas → espalda → ojos → completa.
  const entry = (routine, date = '2026-10-08') => ({ id: `${routine}${date}`, date, completedAt: '', routine });
  assert.equal(breaksLib.suggestedRoutine([], '2026-10-08').id, 'cuello');
  assert.equal(breaksLib.suggestedRoutine([entry('cuello')], '2026-10-08').id, 'piernas');
  assert.equal(breaksLib.suggestedRoutine([entry('cuello', '2026-10-07')], '2026-10-08').id, 'cuello', 'lo de ayer no cuenta');
  assert.equal(breaksLib.suggestedRoutine(['cuello', 'piernas', 'espalda', 'ojos'].map((id) => entry(id)), '2026-10-08').id, 'completa');
  assert.equal(breaksLib.breaksOn([entry('cuello'), entry('ojos'), entry('cuello', '2026-10-07')], '2026-10-08'), 2);
  // El historial se conserva completo (nada se borra por antigüedad) y sin duplicados.
  const saved = breaksLib.addBreak([entry('cuello', '2026-05-01'), entry('ojos', '2026-09-01')], entry('piernas'));
  assert.deepEqual(JSON.parse(JSON.stringify(saved.map((item) => item.routine))), ['cuello', 'ojos', 'piernas']);
  assert.equal(breaksLib.addBreak(saved, entry('piernas')).length, 3);
  assert.ok(sync.docSpecs.some((spec) => spec.key === 'pulso:breaks'), 'se sincroniza como documento');
});

test('avisos: pausas activas a las 11:00 y 16:00 de lunes a viernes', () => {
  const tz = 'America/Santiago';
  const at = (date, hh, mm = 5) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, hh + 3, mm)); };
  const prefs = { ...reminders.defaultPushPrefs, training: false, streak: false, breaks: true };
  const state = { date: '2026-10-07', weekStart: '2026-10-05', trainedToday: false, weekSessions: 0, weekGoal: 3, streak: 0, counting: false, loggedToday: false, loggedEvening: false, water: 0, waterGoal: 8, breaksToday: 0 };
  const due = (overrides = {}, when = at('2026-10-07', 11), sent = {}, p = prefs) => reminders.dueReminders({ prefs: p, state: { ...state, ...overrides }, sent, timeZone: tz, now: when });
  assert.equal(reminders.defaultPushPrefs.breaks, false, 'desactivadas por defecto');
  assert.equal(due().send.kind, 'break-1');
  assert.equal(due().send.url, '/pausas');
  assert.equal(due({ breaksToday: 1 }).send, null, 'ya hizo su pausa de la mañana');
  assert.equal(due({ breaksToday: 1 }, at('2026-10-07', 16)).send.kind, 'break-2');
  assert.equal(due({ breaksToday: 2 }, at('2026-10-07', 16)).send, null);
  assert.equal(due({ date: '2026-10-10', breaksToday: 0 }, at('2026-10-10', 11)).send, null, 'sábado: sin pausas');
  assert.equal(due({ breaksToday: 3 }, at('2026-10-08', 11)).send.kind, 'break-1', 'el conteo de ayer no cuenta hoy');
  assert.equal(due({}, at('2026-10-07', 11), {}, { ...prefs, breaks: false }).send, null);
});

test('avisos: pesarse al levantarse (opcional, a su hora y sólo si aún no se pesa)', () => {
  const tz = 'America/Santiago';
  const at = (date, hh, mm = 5) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d, hh + 3, mm)); };
  const prefs = { ...reminders.defaultPushPrefs, weight: true };
  // 2026-10-07 es miércoles; 2026-10-05, lunes.
  const state = { date: '2026-10-07', weekStart: '2026-10-05', trainedToday: false, weekSessions: 0, weekGoal: 3, streak: 0, counting: false, loggedToday: false, loggedEvening: false, water: 0, waterGoal: 8, weighedToday: false };
  const due = (overrides = {}, when = at('2026-10-07', 7), sent = {}, p = prefs) => reminders.dueReminders({ prefs: p, state: { ...state, ...overrides }, sent, timeZone: tz, now: when });
  assert.equal(reminders.defaultPushPrefs.weight, false, 'apagado por defecto');
  assert.equal(reminders.defaultPushPrefs.rest, true, 'el fin del descanso viene activo');
  const morning = due();
  assert.equal(morning.send.kind, 'weight');
  assert.match(morning.send.body, /baño/);
  assert.equal(morning.send.url, '/progreso?tab=cuerpo&registrar=peso');
  assert.equal(due({ weighedToday: true }).send, null, 'ya se pesó hoy');
  assert.equal(due({ weighedToday: true }, at('2026-10-08', 7)).send.kind, 'weight', 'lo de ayer no cuenta');
  assert.equal(due({}, at('2026-10-07', 6, 30)).send, null, 'antes de la hora, nada');
  assert.equal(due({}, at('2026-10-07', 7), { weight: '2026-10-07' }).send, null, 'una vez al día');
  assert.equal(due({}, at('2026-10-07', 6), {}, { ...prefs, weightTime: '06:00' }).send.kind, 'weight', 'a la hora elegida');
  assert.equal(due({}, at('2026-10-07', 7), {}, { ...prefs, weight: false }).send, null);
  // Sólo los lunes.
  const monday = { ...prefs, weightDays: 'monday' };
  assert.equal(due({}, at('2026-10-07', 7), {}, monday).send, null, 'miércoles: no');
  assert.equal(due({ date: '2026-10-05' }, at('2026-10-05', 7), {}, monday).send.kind, 'weight', 'lunes: sí');
  // Si coincide con el de entrenar, gana entrenar y el de peso llega en la pasada siguiente (no se descarta).
  const both = { ...prefs, trainingTime: '07:00' };
  const first = due({}, at('2026-10-07', 7), {}, both);
  assert.equal(first.send.kind, 'training');
  assert.deepEqual(Array.from(first.skip), [], 'el de peso no se marca como enviado');
  assert.equal(due({}, at('2026-10-07', 7, 20), { training: '2026-10-07' }, both).send.kind, 'weight');
});

test('avisos: fin del descanso fuera de la app', () => {
  const notice = reminders.restNotice('Press de banca · Serie 3 de 4');
  assert.equal(notice.title, 'Descanso terminado');
  assert.equal(notice.body, 'Siguiente: Press de banca · Serie 3 de 4.');
  assert.equal(notice.url, '/entrenar/sesion');
  assert.equal(notice.tag, 'rest', 'cada descanso reemplaza el aviso anterior');
  assert.match(reminders.restNotice(null).body, /siguiente serie/);
  assert.ok(reminders.REST_PUSH_MAX_MS >= 10 * 60_000, 'cubre descansos largos');
  // Lo que sigue: la primera serie pendiente, en orden.
  const bench = training.exerciseById(1);
  const pending = (done) => ({ value: 10, load: 20, done, kind: 'normal' });
  const records = [
    { exerciseId: 1, unit: 'reps', sets: [{ ...pending(true), kind: 'warmup' }, pending(true), pending(false), pending(false)] },
    { exerciseId: 2, unit: 'reps', sets: [pending(false)] },
  ];
  assert.equal(training.nextUpLabel(records), `${bench.name} · Serie 2 de 3`);
  assert.equal(training.nextUpLabel([{ ...records[0], sets: [{ ...pending(false), kind: 'warmup' }, pending(false)] }]), `${bench.name} · Calentamiento 1 de 1`);
  assert.equal(training.nextUpLabel([{ ...records[0], sets: [pending(true)] }, records[1]]), `${training.exerciseById(2).name} · Serie 1 de 1`);
  assert.equal(training.nextUpLabel([{ ...records[0], sets: [pending(true)] }]), null, 'todo hecho');
});

test('calentamiento: enfocado en la sesión del día', () => {
  const warmupLib = load('src/lib/warmup.ts');
  const rec = (id) => ({ exerciseId: id, unit: training.exerciseById(id).unit, sets: [{ value: 10, load: 0, done: false, kind: 'normal' }] });
  const steps = (items) => Array.from(items, (item) => `${item.phase}:${item.exercise.id}`);
  // Torso (flexión declinada, remo con mancuerna, press de hombros, remo invertido): hombros y espalda alta, activa el empuje.
  const torso = warmupLib.warmupFor({ records: [32, 14, 46, 6].map(rec), minutes: 30 });
  assert.deepEqual(steps(torso), ['pulse:72', 'mobility:82', 'mobility:80', 'activation:2']);
  assert.equal(warmupLib.warmupFocus(torso), 'hombros y espalda alta');
  assert.equal(torso[0].value, 60);
  assert.equal(torso[2].value, 40, 'a un lado y al otro');
  assert.equal(warmupLib.warmupTarget(torso[3]), '10 rep');
  assert.equal(warmupLib.warmupMinutes(torso), 4);
  // Pierna (sentadilla goblet, peso muerto rumano, zancada): caderas y columna, activa la sentadilla.
  const legs = warmupLib.warmupFor({ records: [10, 11, 40].map(rec), minutes: 45 });
  assert.deepEqual(steps(legs), ['pulse:72', 'mobility:78', 'mobility:79', 'activation:30']);
  assert.equal(warmupLib.warmupFocus(legs), 'caderas y columna');
  // Rodillas a cuidar: marcha en vez de saltos y sin sentadilla profunda.
  const knees = warmupLib.warmupFor({ records: [10, 20].map(rec), limitations: ['knees'], minutes: 45 });
  assert.deepEqual(steps(knees), ['pulse:5', 'mobility:78', 'mobility:79', 'activation:30']);
  // No repite ejercicios de la sesión: con flexiones inclinadas, activa con remo en W.
  assert.equal(warmupLib.warmupFor({ records: [2, 14].map(rec) }).at(-1).exercise.id, 107);
  // Sesión corta: una sola de movilidad y 45 s de pulso.
  const short = warmupLib.warmupFor({ records: [31, 6].map(rec), minutes: 15 });
  assert.equal(short.filter((item) => item.phase === 'mobility').length, 1);
  assert.equal(short[0].value, 45);
  // Sesión exprés (10 minutos o menos): sólo la activación, para dejar el tiempo al entrenamiento.
  const express = warmupLib.warmupFor({ records: [31, 6].map(rec), minutes: 10 });
  assert.deepEqual(steps(express).map((step) => step.split(':')[0]), ['activation']);
  assert.equal(warmupLib.warmupMinutes(express), 1);
  // Equipamiento: aperturas con banda sólo si hay bandas.
  const pull = [107, 14].map(rec);
  assert.equal(warmupLib.warmupFor({ records: pull, equipment: new Set(['bands']) }).at(-1).exercise.id, 54);
  assert.ok(!warmupLib.warmupFor({ records: pull, equipment: new Set() }).some((item) => item.exercise.id === 54));
  // En la sesión: una serie de calentamiento cada uno y 15 s para cambiar de ejercicio.
  const records = Array.from(warmupLib.warmupRecords(torso));
  assert.equal(records.length, 4);
  assert.ok(records.every((record) => record.sets.length === 1 && record.sets[0].kind === 'warmup' && record.restSeconds === 15));
  assert.equal(records[0].sets[0].value, 60);
  assert.equal(warmupLib.warmupFor({ records: [] }).length, 0, 'sin ejercicios, sin calentamiento');
});

test('sesión: el calentamiento que te saltas no queda pendiente', () => {
  const sets = (n, done, kind = 'normal') => Array.from({ length: n }, (_, i) => ({ value: 10, load: 0, done: i < done, kind }));
  const records = [
    { exerciseId: 72, unit: 'seconds', sets: sets(1, 0, 'warmup') },
    { exerciseId: 82, unit: 'seconds', sets: sets(1, 0, 'warmup') },
    { exerciseId: 32, unit: 'reps', sets: sets(3, 0) },
  ];
  assert.deepEqual({ ...training.sessionSets(records) }, { done: 0, total: 5 });
  assert.equal(training.warmupCount(records), 2);
  assert.equal(training.recordHeading(records, 1, 0), 'Calentamiento 2 de 2');
  assert.equal(training.recordHeading(records, 2, 1), 'Serie 2 de 3');
  assert.match(training.nextUpLabel(records), /Calentamiento 1 de 2$/, 'sin empezar lo principal, el calentamiento va primero');
  // Directo a lo principal: el calentamiento deja de contar y la sesión queda lista para guardar.
  const skipped = records.map((record, index) => (index === 2 ? { ...record, sets: sets(3, 3) } : record));
  assert.deepEqual({ ...training.sessionSets(skipped) }, { done: 3, total: 3 });
  assert.equal(training.hasPending(skipped[0], training.mainStarted(skipped)), false);
  assert.equal(training.nextUpLabel(skipped), null);
  // Con el calentamiento hecho, cuenta como siempre.
  const all = records.map((record) => ({ ...record, sets: record.sets.map((set) => ({ ...set, done: true })) }));
  assert.deepEqual({ ...training.sessionSets(all) }, { done: 5, total: 5 });
});

test('comidas: buscador con sinónimos, comida sugerida y catálogo amplio', () => {
  const { foods: catalog, mealSuggestions, foodCategoryLabels } = load('src/data/foods.ts');
  const names = (list) => Array.from(list, (food) => food.name);
  assert.ok(catalog.length >= 400, `catálogo amplio (${catalog.length})`);
  const ids = new Set(catalog.map((food) => food.id));
  for (const [meal, list] of Object.entries(mealSuggestions)) for (const id of list) assert.ok(ids.has(id), `${meal}: ${id} existe`);
  for (const food of catalog) assert.ok(foodCategoryLabels[food.category], `${food.id}: categoría conocida`);
  // Sin tildes, con sinónimos y primero lo que empieza igual.
  assert.equal(nutrition.searchFoods(catalog, 'aguacate')[0].id, 'palta');
  assert.ok(names(nutrition.searchFoods(catalog, 'frijoles negros')).includes('Porotos negros cocidos'));
  assert.ok(names(nutrition.searchFoods(catalog, 'fresas')).includes('Frutillas'));
  assert.equal(nutrition.searchFoods(catalog, 'platano')[0].id, 'platano');
  const pan = names(nutrition.searchFoods(catalog, 'pan'));
  assert.ok(pan.indexOf('Pan integral') < pan.indexOf('Empanada de pino'), 'primero lo que empieza por «pan»');
  assert.ok(nutrition.searchFoods(catalog, 'salsa', 'salsas').every((food) => food.category === 'salsas'));
  assert.equal(nutrition.searchFoods(catalog, 'zzz').length, 0);
  // Comida sugerida: a las 11:30 sin desayuno anotado sigue siendo desayuno; con desayuno, almuerzo.
  const at = (h, m = 0) => new Date(2026, 9, 20, h, m);
  assert.equal(nutrition.suggestedMealSlot(at(8), []), 'desayuno');
  assert.equal(nutrition.suggestedMealSlot(at(11, 30), []), 'desayuno');
  assert.equal(nutrition.suggestedMealSlot(at(11, 30), ['desayuno']), 'almuerzo');
  assert.equal(nutrition.suggestedMealSlot(at(13), []), 'almuerzo');
  assert.equal(nutrition.suggestedMealSlot(at(17), []), 'once');
  assert.equal(nutrition.suggestedMealSlot(at(21), []), 'cena');
});

test('coach de Inicio: recomendación, porqué y acción según el día', () => {
  const coachLib = load('src/lib/daily-coach.ts');
  const fresh = Object.fromEntries(analytics.allMuscles.map((muscle) => [muscle, 100]));
  const on = (date, records) => ({ id: date, date, completedAt: `${date}T18:00:00.000Z`, durationMinutes: 40, exerciseCount: records.length, sets: records.reduce((sum, r) => sum + r.sets.length, 0), mode: 'full', records });
  const legs = [{ exerciseId: 10, unit: 'reps', sets: [set(10, 20), set(10, 20), set(10, 20)] }, { exerciseId: 11, unit: 'reps', sets: [set(10, 20), set(10, 20), set(10, 20)] }];
  const base = { now: new Date(2026, 9, 20, 9), draft: null, trainedToday: false, restDay: false, readiness: null, recovery: fresh, focus: 'full', focusByRecovery: true, workouts: [], week: { done: 0, goal: 3 }, short: false, minutes: 38 };
  const coach = (patch = {}) => coachLib.dailyCoach({ ...base, ...patch });
  let result = coach();
  assert.equal(result.recommendation, 'train-normal');
  assert.equal(result.title, 'Hoy puedes entrenar normal.');
  assert.equal(result.status, 'Recuperación buena');
  assert.match(result.reason, /primera sesión/);
  assert.equal(result.primaryAction, 'Empezar entrenamiento');
  assert.equal(result.duration, 38);
  // Sesión en curso: siempre primero continuarla.
  result = coach({ draft: { minutes: 18, done: 9, total: 16, ready: false, paused: false }, readiness: { recommendation: 'recovery', feel: 'exhausted' } });
  assert.equal(result.recommendation, 'resume-session');
  assert.equal(result.reason, '18 min · 9/16 series');
  assert.equal(result.primaryAction, 'Continuar');
  assert.equal(coach({ draft: { minutes: 40, done: 16, total: 16, ready: true, paused: false } }).primaryAction, 'Guardar entrenamiento');
  assert.equal(coach({ trainedToday: true }).recommendation, 'done');
  // El cuerpo manda: muy cansado → recuperar; día de descanso → movilidad.
  result = coach({ readiness: { recommendation: 'recovery', feel: 'exhausted' } });
  assert.equal(result.recommendation, 'recovery');
  assert.equal(result.status, 'Energía muy baja');
  assert.equal(result.primaryAction, 'Movilidad 10 min');
  assert.equal(coach({ restDay: true }).recommendation, 'mobility');
  // Cansado o con molestia: menos volumen y el porqué.
  result = coach({ readiness: { recommendation: 'short', feel: 'tired' } });
  assert.equal(result.recommendation, 'train-reduced');
  assert.match(result.reason, /energía está baja/);
  result = coach({ readiness: { recommendation: 'short', feel: 'good', pain: ['knees'] } });
  assert.equal(result.status, 'Cuidando rodillas');
  assert.match(result.reason, /rodillas/);
  assert.equal(coach({ short: true }).recommendation, 'short-session');
  // Recuperación: piernas entrenadas ayer → hoy torso, con el porqué.
  const tiredLegs = { ...fresh, quads: 55, hamstrings: 60, glutes: 58, calves: 80 };
  result = coach({ recovery: tiredLegs, focus: 'upper', workouts: [on('2026-10-19', legs)], week: { done: 1, goal: 3 } });
  assert.equal(result.reason, 'Entrenaste piernas ayer: hoy priorizamos torso.');
  assert.equal(result.status, 'Recuperación parcial');
  assert.equal(coach({ recovery: tiredLegs, focus: 'upper', workouts: [on('2026-10-17', legs)], week: { done: 1, goal: 3 } }).reason, 'Piernas todavía se recuperan: hoy priorizamos torso.');
  assert.doesNotMatch(coach({ recovery: tiredLegs, focus: 'upper', focusByRecovery: false, workouts: [on('2026-10-19', legs)], week: { done: 1, goal: 3 } }).reason, /priorizamos/, 'si eligió el enfoque, no se explica por recuperación');
  // Semana y días sin entrenar.
  assert.equal(coach({ workouts: [on('2026-10-17', legs)], week: { done: 1, goal: 3 } }).reason, 'Llevas 3 días sin entrenar y tu recuperación es buena.');
  assert.equal(coach({ workouts: [on('2026-10-19', legs)], week: { done: 2, goal: 3 } }).reason, 'Con esta sesión cumples tu meta de la semana.');
  assert.equal(coach({ workouts: [on('2026-10-19', legs)], week: { done: 3, goal: 3 } }).title, 'Semana completada: lo de hoy suma extra.');
  for (const patch of [{}, { trainedToday: true }, { restDay: true }, { short: true }, { readiness: { recommendation: 'short', feel: 'tired' } }, { readiness: { recommendation: 'recovery', feel: 'exhausted' } }]) {
    const { title, reason } = coach(patch);
    assert.doesNotMatch(`${title} ${reason}`, /excusa|sin falta|no te rindas|cansado|cansada/i, 'tono sin presión y sin género');
  }
});

test('cansado: la misma sesión con menos volumen, nunca más ejercicios', () => {
  for (const [focus, goal] of [['upper', 'strength'], ['lower', 'muscle'], ['full', 'weight']]) {
    const input = { preference: { location: 'home', equipment: ['dumbbells', 'bench'] }, minutes: 30, focus, goal, level: 2, seed: 4 };
    const normal = generator.generateWorkout(input);
    const tired = generator.generateWorkout({ ...input, readiness: 'short' });
    const sets = (plan) => plan.records.reduce((sum, record) => sum + record.sets.length, 0);
    assert.ok(tired.records.length <= normal.records.length, `${focus}: no suma ejercicios`);
    assert.ok(sets(tired) < sets(normal), `${focus}: menos series`);
    assert.deepEqual(tired.records.map((record) => record.exerciseId), normal.records.slice(0, tired.records.length).map((record) => record.exerciseId), `${focus}: los mismos ejercicios, en el mismo orden`);
    assert.match(tired.notes[0], /Energía moderada/);
  }
});

test('coach de Inicio: consejo del día ligado a la sesión', () => {
  const coachLib = load('src/lib/daily-coach.ts');
  const press = { exerciseId: 12, unit: 'reps', sets: [set(8, 20)] };
  const top = (rir) => ({ id: 'w', date: '2026-10-18', completedAt: '2026-10-18T18:00:00.000Z', durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', records: [{ exerciseId: 12, unit: 'reps', sets: [set(12, 20, { rir }), set(12, 20, { rir }), set(12, 20, { rir })] }] });
  assert.match(coachLib.dailyTip({ recommendation: 'train-normal', records: [press], workouts: [top(2)] }), /^Hoy en press de pecho con mancuernas: sube a 22 kg y vuelve a 8 repeticiones\.$/);
  assert.match(coachLib.dailyTip({ recommendation: 'train-normal', records: [press], workouts: [] }), /2 o 3 repeticiones en reserva/, 'sin historial: carga con margen');
  assert.match(coachLib.dailyTip({ recommendation: 'train-normal', records: [{ exerciseId: 31, unit: 'reps', sets: [set(10, 0)] }], workouts: [] }), /^Hoy en flexión de brazos: /, 'peso corporal: su clave técnica');
  assert.match(coachLib.dailyTip({ recommendation: 'train-reduced', records: [press], workouts: [] }), /reserva/);
  assert.equal(coachLib.dailyTip({ recommendation: 'resume-session', records: [press], workouts: [] }), null);
});

test('versión corta: lo de mayor impacto, con equilibrio y en 20 minutos', () => {
  const short = load('src/lib/short-session.ts');
  const generatorLib = load('src/lib/generator.ts');
  const pending = (n, value = 10, load = 10) => Array.from({ length: n }, () => ({ value, load, done: false, kind: 'normal' }));
  const session = [
    { exerciseId: 10, unit: 'reps', sets: pending(4), restSeconds: 150 },
    { exerciseId: 47, unit: 'reps', sets: pending(3, 12, 4), restSeconds: 60 },
    { exerciseId: 12, unit: 'reps', sets: pending(4), restSeconds: 150 },
    { exerciseId: 34, unit: 'seconds', sets: pending(3, 30, 0), restSeconds: 60 },
    { exerciseId: 14, unit: 'reps', sets: pending(4), restSeconds: 150 },
    { exerciseId: 40, unit: 'reps', sets: pending(3, 10, 0), restSeconds: 90 },
  ];
  assert.ok(generatorLib.estimateMinutes(session, 90) > 35, 'la sesión completa es larga');
  const result = Array.from(short.shortVersion(session, 90));
  const ids = result.map((record) => record.exerciseId);
  assert.ok(ids.length <= 4 && ids.length >= 3, `entre 3 y 4 ejercicios (${ids})`);
  for (const id of [10, 12, 14]) assert.ok(ids.includes(id), `mantiene pierna, empuje y tirón (${id})`);
  assert.ok(!ids.includes(47) && !ids.includes(34), 'sin aislamiento ni núcleo mientras haya compuestos');
  assert.deepEqual(ids, [...ids].sort((a, b) => session.findIndex((r) => r.exerciseId === a) - session.findIndex((r) => r.exerciseId === b)), 'en el orden original');
  assert.ok(generatorLib.estimateMinutes(result, 90) <= 17, 'cabe con su calentamiento en 20 min');
  assert.ok(result.every((record) => record.sets.length >= 2 && record.restSeconds <= 90));
  assert.equal(session[0].sets.length, 4, 'no modifica la sesión original');
  assert.equal(Array.from(short.shortVersion([session[0]], 90)).length, 1);
});

test('progreso relevante: un solo dato, el más valioso', () => {
  const highlightLib = load('src/lib/highlight.ts');
  const now = new Date(2026, 9, 20, 9);
  const on = (date, records, extra = {}) => ({ id: date, date, completedAt: `${date}T18:00:00.000Z`, durationMinutes: 40, exerciseCount: records.length, sets: 3, mode: 'full', records, ...extra });
  const press = (load) => [{ exerciseId: 12, unit: 'reps', sets: [set(8, load), set(8, load)] }];
  const pick = (workouts, goal = 3) => highlightLib.progressHighlight(workouts, { now, goal });
  assert.equal(pick([]), null);
  const record = pick([on('2026-10-18', press(26), { prs: [{ exerciseId: 12, kind: 'load', value: 26, previous: 24 }] })]);
  assert.deepEqual({ ...record }, { kind: 'record', value: 'Nuevo récord', label: 'Press de pecho con mancuernas · 26 kg × 8' });
  const stronger = pick([on('2026-09-28', press(20)), on('2026-10-12', press(24))]);
  assert.deepEqual({ ...stronger }, { kind: 'strength', value: '+4 kg', label: 'en press de pecho con mancuernas · últimas 4 semanas' });
  const weeks = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-13', '2026-10-14', '2026-10-15'].map((date) => on(date, press(20)));
  assert.equal(pick(weeks).kind, 'streak');
  assert.equal(pick(weeks).value, '3 semanas');
  assert.equal(pick([on('2026-10-19', press(20))]), null, 'nada destaca: no se inventa');
});

test('aprende de ti: el esfuerzo que marcas ajusta la progresión', () => {
  const press = training.exerciseById(12); // rango 8–12, +2 kg
  const at = (date, sets, effort) => ({ id: date, date, completedAt: `${date}T18:00:00.000Z`, durationMinutes: 40, exerciseCount: 1, sets: sets.length, mode: 'full', effort, records: [{ exerciseId: 12, unit: 'reps', sets }] });
  const top = [set(12, 20, { rir: 2 }), set(12, 20, { rir: 2 }), set(12, 20, { rir: 2 })];
  const mid = [set(10, 20), set(10, 20), set(10, 20)];
  const suggest = (workouts) => progression.suggestNext(press, training.lastRecordFor(workouts, 12), 'kg', (kg) => kg, progression.effortFor(workouts, 12));
  // Bien: doble progresión de siempre.
  assert.equal(suggest([at('2026-10-18', top, 3)]).kind, 'load');
  assert.equal(suggest([at('2026-10-18', top, 3)]).load, 22);
  // Difícil: mantiene la carga aunque completaste el rango, y dice por qué.
  const hard = suggest([at('2026-10-18', top, 4)]);
  assert.deepEqual({ kind: hard.kind, load: hard.load, value: hard.value, because: hard.because }, { kind: 'hold', load: 20, value: 12, because: 'hard' });
  assert.match(hard.message, /^Como tu última sesión fue difícil, repite 12 repeticiones con 20 kg\.$/);
  assert.equal(suggest([at('2026-10-18', mid, 4)]).value, 10, 'difícil en medio del rango: repite');
  // Dos difíciles seguidas: apunta a la parte baja del rango.
  const streak = suggest([at('2026-10-18', mid, 4), at('2026-10-15', mid, 4)]);
  assert.deepEqual({ kind: streak.kind, value: streak.value, because: streak.because }, { kind: 'hold', value: 8, because: 'hard-streak' });
  // Fácil: dos repeticiones más (sin pasar el tope) o la subida de carga, con su porqué.
  const easy = suggest([at('2026-10-18', mid, 2)]);
  assert.deepEqual({ kind: easy.kind, value: easy.value, because: easy.because }, { kind: 'reps', value: 12, because: 'easy' });
  assert.match(suggest([at('2026-10-18', top, 2)]).message, /^Como tu última sesión fue fácil, sube a 22 kg/);
  // Sin esfuerzo anotado o sin historial, nada cambia.
  assert.equal(suggest([at('2026-10-18', top)]).because, undefined);
  assert.equal(progression.suggestNext(press, undefined, 'kg', (kg) => kg, { effort: 4, hardStreak: 2 }).kind, 'start');
  // effortFor: la última sesión con el ejercicio y la racha de difíciles.
  assert.deepEqual({ ...progression.effortFor([at('2026-10-18', mid, 4), at('2026-10-15', mid, 4), at('2026-10-12', mid, 3)], 12, undefined, Date.UTC(2026, 9, 21, 12)) }, { effort: 4, hardStreak: 2, gapDays: 2 });
  assert.deepEqual({ ...progression.effortFor([], 12) }, { effort: undefined, hardStreak: 0 });
  // Las series de la próxima sesión ya vienen ajustadas.
  const sets = Array.from(progression.progressedSets(press, 3, { exerciseId: 12, unit: 'reps', sets: top }, { effort: 4, hardStreak: 1 }));
  assert.ok(sets.every((item) => item.load === 20 && item.value === 12));
});

test('aprende de ti: cansancio acumulado, molestias al terminar y lo que cambias', () => {
  const adapt = load('src/lib/adaptation.ts');
  const now = new Date(2026, 9, 20, 9);
  const on = (date, extra = {}) => ({ id: date + Math.random(), date, completedAt: `${date}T18:00:00.000Z`, durationMinutes: 40, exerciseCount: 3, sets: 9, mode: 'full', ...extra });
  assert.equal(adapt.recentHardStreak([on('2026-10-19', { effort: 4 }), on('2026-10-17', { effort: 4 }), on('2026-10-15', { effort: 3 })], now), 2);
  assert.equal(adapt.recentHardStreak([on('2026-10-19', { effort: 4 }), on('2026-10-17', { effort: 3 })], now), 1);
  assert.equal(adapt.recentHardStreak([on('2026-10-14', { effort: 4 }), on('2026-10-13', { effort: 4 })], now), 0, 'tras varios días de descanso, ya pasó');
  assert.deepEqual(Array.from(adapt.carriedPain([on('2026-10-19', { feltPain: true, painAreas: ['knees'] })], now)), ['knees']);
  assert.deepEqual(Array.from(adapt.carriedPain([on('2026-10-17', { feltPain: true, painAreas: ['knees'] })], now)), [], 'de hace días, ya no');
  assert.deepEqual(Array.from(adapt.carriedPain([on('2026-10-19'), on('2026-10-18', { painAreas: ['back'] })], now)), [], 'sólo la última sesión');
  let swaps = adapt.addSwap(undefined, 12);
  swaps = adapt.addSwap(swaps, 12);
  assert.deepEqual({ ...swaps }, { 12: 2 });
  assert.deepEqual({ ...adapt.forgetSwaps(swaps, [12]) }, {}, 'si lo completas, ya no lo evitas');
  assert.equal(adapt.forgetSwaps(swaps, [14]), swaps, 'sin cambios, el mismo objeto');
  // El generador deja de proponer lo que cambias seguido (si hay alternativa).
  const input = { preference: { location: 'home', equipment: ['dumbbells', 'bench'] }, minutes: 30, focus: 'upper', goal: 'muscle', level: 2, seed: 4 };
  const first = generator.generateWorkout(input).records[0].exerciseId;
  const avoided = generator.generateWorkout({ ...input, avoid: { [first]: 2 } }).records.map((record) => record.exerciseId);
  assert.ok(!avoided.includes(first), `ya no propone ${first}`);
});

test('aprende de ti: el nivel sale de lo que haces, no de lo que dices ni de los días que tienes', () => {
  const now = new Date(2026, 9, 20, 9);
  const weeks = (count, withProgress = false) => Array.from({ length: count }, (_, week) => [1, 3].map((day) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 7 * (week + 1) + day - ((now.getDay() + 6) % 7));
    const key = utils.localDateKey(date);
    // Con progreso: dos ejercicios que suben la carga con el tiempo (las semanas más recientes, con más peso).
    const load = 20 + (count - week) * 2;
    const records = withProgress ? [10, 12].map((exerciseId) => ({ exerciseId, unit: 'reps', sets: [set(10, load), set(10, load), set(10, load)] })) : undefined;
    return { id: `${week}-${day}`, date: key, completedAt: `${key}T18:00:00.000Z`, durationMinutes: 40, exerciseCount: 3, sets: 9, mode: 'full', ...(records ? { records } : {}) };
  })).flat();
  assert.equal(generator.trainingLevel([], [], now), 1);
  assert.equal(generator.trainingLevel([], weeks(4), now), 1);
  assert.equal(generator.trainingLevel([], weeks(5), now), 2, '5 semanas constantes: intermedio');
  assert.equal(generator.trainingLevel([], weeks(10), now), 2, '10 semanas sin progreso medible: sigue intermedio');
  assert.equal(generator.trainingLevel([], weeks(10, true), now), 3, '10 semanas progresando: avanzado');
  // Decir que entrenas con regularidad sólo da el nivel intermedio: lo avanzado se gana con el historial.
  assert.equal(generator.trainingLevel(['regular'], [], now), 2);
  assert.equal(generator.trainingLevel(['some'], [], now), 2);
  assert.equal(generator.trainingLevel(['walking'], [], now), 1);
  assert.equal(generator.trainingLevel(['regular'], weeks(10, true), now), 3);
});

test('aprende de ti: el coach explica lo aprendido cuando no hay chequeo', () => {
  const coachLib = load('src/lib/daily-coach.ts');
  const fresh = Object.fromEntries(analytics.allMuscles.map((muscle) => [muscle, 100]));
  const base = { now: new Date(2026, 9, 20, 9), draft: null, trainedToday: false, restDay: false, readiness: null, recovery: fresh, focus: 'full', focusByRecovery: false, workouts: [], week: { done: 1, goal: 3 }, short: false, minutes: 38 };
  let result = coachLib.dailyCoach({ ...base, adaptation: { carriedPain: ['knees'], hardStreak: 0 } });
  assert.equal(result.recommendation, 'train-reduced');
  assert.equal(result.status, 'Cuidando rodillas');
  assert.equal(result.reason, 'Al terminar tu última sesión marcaste molestia en las rodillas: hoy cuidamos esa zona.');
  result = coachLib.dailyCoach({ ...base, adaptation: { carriedPain: [], hardStreak: 2 } });
  assert.equal(result.recommendation, 'train-reduced');
  assert.equal(result.status, 'Cansancio acumulado');
  assert.match(result.reason, /dos últimas sesiones fueron difíciles/);
  // Si hoy hiciste el chequeo, manda el chequeo.
  result = coachLib.dailyCoach({ ...base, readiness: { recommendation: 'planned', feel: 'good' }, adaptation: { carriedPain: ['knees'], hardStreak: 3 } });
  assert.equal(result.recommendation, 'train-normal');
  // Al terminar: la zona queda en el historial.
  const sessionUtils = load('src/components/session/session-utils.ts');
  const draft = { id: 'd', name: 'Torso', records: [{ exerciseId: 12, unit: 'reps', sets: [set(10, 20)] }], elapsedSeconds: 1800, runningSince: null, restUntil: null, notes: '', restSeconds: 90 };
  assert.deepEqual(Array.from(sessionUtils.buildWorkoutEntry(draft, [], { effort: 4, feltPain: true, painAreas: ['shoulders'] }, Date.now()).painAreas), ['shoulders']);
  assert.equal(sessionUtils.buildWorkoutEntry(draft, [], { effort: 3, feltPain: false, painAreas: ['shoulders'] }, Date.now()).painAreas, undefined);
});

test('conteo de cifras: lee y escribe números en formato chileno', () => {
  const count = load('src/lib/count.ts');
  const parsed = (text) => { const value = count.parseCount(text); return value && { ...value }; };
  assert.deepEqual(parsed('8.420'), { value: 8420, digits: 0, pad: 0 });
  assert.deepEqual(parsed('72,4'), { value: 72.4, digits: 1, pad: 0 });
  assert.deepEqual(parsed('05'), { value: 5, digits: 0, pad: 2 });
  assert.deepEqual(parsed('1.234,56'), { value: 1234.56, digits: 2, pad: 0 });
  assert.equal(count.parseCount('2/3'), null);
  assert.equal(count.parseCount('—'), null);
  assert.equal(count.parseCount('12 kg'), null);
  assert.equal(count.formatCount(8420, 0), '8.420');
  assert.equal(count.formatCount(36.2, 1), '36,2');
  assert.equal(count.formatCount(3, 0, 2), '03');
});

test('casa o gimnasio: el mismo movimiento con el equipo de cada lugar', () => {
  const bench = training.exerciseById(60);
  const home = generator.placeAlternative(bench, 'home');
  assert.ok(home, 'el press de banca tiene versión en casa');
  assert.equal(home.pattern, bench.pattern);
  const { capabilitiesOf } = load('src/data/equipment.ts');
  assert.ok(generator.isAvailable(home, capabilitiesOf(['dumbbells'])), `${home.name} se hace con mancuernas o sin nada`);
  assert.equal(generator.placeAlternative(bench, 'gym'), null, 'ya es de gimnasio');
  const pushup = training.exerciseById(31);
  assert.equal(generator.placeAlternative(pushup, 'home'), null, 'las flexiones ya sirven en casa');
  const gym = generator.placeAlternative(pushup, 'gym');
  assert.ok(gym, 'las flexiones tienen versión de gimnasio');
  assert.equal(gym.pattern, pushup.pattern);
});

test('medios de ejercicios: capa propia, local y sin conexión', () => {
  const { exerciseMedia } = load('src/lib/exercise-media.ts');
  for (const exercise of exercises) {
    const media = exerciseMedia(exercise);
    assert.equal(media.source, 'local');
    assert.ok(media.image || media.illustration, `${exercise.name} tiene foto o ilustración`);
  }
  const photo = exerciseMedia(exercises.find((exercise) => exercise.image));
  assert.match(photo.frames.start, /^\/images\/editorial\/.+-start\.webp$/);
});

test('bienestar: un registro por día, combinable, y promedios de 7 días', () => {
  const wellness = load('src/lib/wellness.ts');
  const plain = (value) => JSON.parse(JSON.stringify(value));
  let entries = wellness.upsertWellness([], '2026-10-19', { sleepHours: 7.5 }, 't1');
  entries = wellness.upsertWellness(entries, '2026-10-19', { steps: 8200, mood: 4 }, 't2');
  assert.deepEqual(plain(entries), [{ date: '2026-10-19', sleepHours: 7.5, steps: 8200, mood: 4, updatedAt: 't2' }]);
  entries = wellness.upsertWellness(entries, '2026-10-19', { steps: null }, 't3');
  assert.equal(entries[0].steps, undefined, 'null borra el dato');
  entries = wellness.upsertWellness(entries, '2026-10-17', { sleepHours: 6.5, mood: 2 }, 't4');
  entries = wellness.upsertWellness(entries, '2026-10-10', { sleepHours: 4 }, 't5');
  assert.deepEqual(plain(entries.map((entry) => entry.date)), ['2026-10-10', '2026-10-17', '2026-10-19']);
  const week = wellness.weekWellness(entries, '2026-10-19');
  assert.equal(week.days, 2, 'el 10 queda fuera de los 7 días');
  assert.equal(week.sleep, 7);
  assert.equal(week.mood, 3);
  assert.equal(week.steps, null);
  const old = wellness.upsertWellness([{ date: '2026-01-01', sleepHours: 8, updatedAt: 'x' }], '2026-10-19', { mood: 3 }, 't6');
  assert.equal(old.length, 2, 'los días antiguos no se borran');
});

test('gráficos propios: curva monótona, marcas y etiquetas sin montarse', () => {
  const chart = load('src/lib/chart.ts');
  assert.equal(chart.monotonePath([]), '');
  assert.equal(chart.monotonePath([[0, 10]]), 'M0,10');
  assert.equal(chart.monotonePath([[0, 10], [10, 0]]), 'M0,10L10,0');
  const path = chart.monotonePath([[0, 10], [10, 0], [20, 0], [30, 5]]);
  assert.match(path, /^M0,10C/);
  // Tramo plano (10→20 en y=0): los puntos de control no bajan del valor (no inventa valles).
  const controls = [...path.matchAll(/C([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+) /g)][1];
  assert.equal(Number(controls[2]), 0);
  assert.equal(Number(controls[4]), 0);
  assert.deepEqual([...chart.integerTicks([10, 20])], [10, 14, 18]);
  assert.deepEqual([...chart.labelIndexes(10, 320)], [1, 3, 5, 7, 9]);
  assert.deepEqual([...chart.labelIndexes(3, 320)], [0, 1, 2]);
});

test('cálculo de calorías (modo avanzado): datos del cuerpo y reglas de seguridad', () => {
  const now = new Date('2026-10-20T12:00:00');
  const ok = nutrition.parseBody({ age: '34', height: '176', weight: '82,5' }, 'kg');
  assert.equal(ok.valid, true);
  assert.equal(ok.weightKg, 82.5);
  assert.equal(nutrition.parseBody({ age: '', height: '176', weight: '82' }, 'kg').errors.age, 'Entre 14 y 100 años.');
  assert.equal(nutrition.parseBody({ age: '34', height: '90', weight: '82' }, 'kg').valid, false);
  assert.ok(Math.abs(nutrition.parseBody({ age: '34', height: '176', weight: '180' }, 'lb').weightKg - 81.65) < 0.01, 'libras a kg');
  const base = nutrition.suggestedNutritionProfile({ activities: ['regular'], goals: ['weight'], sex: 'male' }, now);
  assert.equal(base.goal, 'lose');
  assert.equal(base.activity, 'moderate');
  assert.equal(nutrition.suggestedNutritionProfile({ goals: ['muscle'] }, now).goal, 'gain', '«Ganar músculo» propone un leve superávit');
  const targets = nutrition.nutritionTargets({ ...base, birthYear: 1992, heightCm: 176 }, 82.5, now);
  assert.ok(targets.kcal > 1800 && targets.kcal < 2800, `kcal razonables: ${targets.kcal}`);
  const minor = nutrition.nutritionTargets({ ...base, sex: 'female', birthYear: 2010, heightCm: 165 }, 60, now);
  assert.equal(minor.limited, 'minor', 'sin déficit para menores de 18');
  assert.equal(nutrition.nutritionTargets({ ...base, special: 'eating-disorder' }, 60, now).limited, 'special');
});

test('versión de la app: detecta una publicación nueva por el archivo principal', () => {
  const version = load('src/lib/app-version.ts');
  const page = (hash) => `<head><link rel="modulepreload" href="/_next/static/chunks/index-${hash}.js"><script src="/_next/static/chunks/framework-2k-VFE-j.js"></script></head>`;
  assert.equal(version.entryChunk(page('CTTfcN2o')), '/_next/static/chunks/index-CTTfcN2o.js');
  assert.equal(version.hasNewVersion(page('CTTfcN2o'), page('Ab12_cd-')), true);
  assert.equal(version.hasNewVersion(page('CTTfcN2o'), page('CTTfcN2o')), false);
  assert.equal(version.hasNewVersion('<html></html>', page('CTTfcN2o')), false, 'sin referencia actual, no recarga');
  assert.equal(version.hasNewVersion(page('CTTfcN2o'), '<html>error</html>'), false, 'respuesta rara, no recarga');
});

const readinessLib = load('src/lib/readiness.ts');

test('chequeo rápido: un toque se guarda con la forma de siempre y ajusta la sesión', () => {
  const plain = (value) => JSON.parse(JSON.stringify(value));
  const at = new Date('2026-10-19T08:00:00Z');
  const good = readinessLib.quickReadiness({ date: '2026-10-19', feel: 'good', loadRatio: 1, now: at });
  assert.equal(good.recommendation, 'planned');
  assert.ok(good.score >= 70);
  assert.equal(good.energy, 3);
  assert.equal(good.sleep, 2, 'sin sueño anotado queda «normal»');
  assert.equal(readinessLib.quickReadiness({ date: '2026-10-19', feel: 'tired', loadRatio: 1, now: at }).recommendation, 'short');
  const exhausted = readinessLib.quickReadiness({ date: '2026-10-19', feel: 'exhausted', loadRatio: null, now: at });
  assert.equal(exhausted.recommendation, 'recovery');
  assert.ok(exhausted.score < 40, 'el puntaje queda en la franja de la recomendación');
  const sore = readinessLib.quickReadiness({ date: '2026-10-19', feel: 'good', pain: ['knees'], sleepHours: 5, loadRatio: 1, now: at });
  assert.equal(sore.recommendation, 'short', 'con molestia, versión corta');
  assert.equal(sore.soreness, 2);
  assert.equal(sore.sleep, 1, 'el sueño de Bienestar se usa si está');
  assert.deepEqual(plain(sore.pain), ['knees']);
  // Chequeos anteriores (cuatro preguntas) se leen igual.
  assert.equal(readinessLib.readinessFeel({ date: 'x', energy: 2, sleep: 2, soreness: 1, score: 55, recommendation: 'short', updatedAt: '' }), 'tired');
  assert.deepEqual(plain(readinessLib.painLimitations(['knees', 'other', 'back'])), ['knees', 'back']);
  assert.equal(readinessLib.painNote(['knees', 'back']), 'Hoy evitamos ejercicios que exijan las rodillas y la espalda.');
  assert.equal(readinessLib.painNote([]), null);
  assert.deepEqual(plain(readinessLib.feelOptions('female').map((option) => option.label)), ['Bien', 'Cansada', 'Muy cansada']);
  assert.deepEqual(plain(readinessLib.feelOptions('mixed').map((option) => option.label)), ['Bien', 'Cansado/a', 'Muy cansado/a']);

  // La molestia del día entra al generador como zona a cuidar.
  const input = generator.todayGeneratorInput({ profile: { limitations: ['shoulders'] }, preference: { location: 'gym', equipment: [] }, workouts: [], pain: ['knees', 'other'], now: at.getTime() });
  assert.deepEqual(plain(input.limitations).sort(), ['knees', 'shoulders']);
  const plan = generator.generateWorkout({ ...input, focus: 'lower', minutes: 45, level: 3 });
  for (const record of plan.records) {
    const exercise = exercises.find((item) => item.id === record.exerciseId);
    assert.ok(!(exercise.stresses ?? []).includes('knees'), `${exercise.name} exige las rodillas`);
  }

  // Programa con chequeo «cansado»: una serie menos donde hay tres o más.
  const records = [{ exerciseId: 1, unit: 'reps', sets: [set(8, 10), set(8, 10), set(8, 10), set(8, 10)] }, { exerciseId: 2, unit: 'reps', sets: [set(8, 0), set(8, 0)] }];
  assert.deepEqual(plain(programs.easierRecords(records).map((record) => record.sets.length)), [3, 2]);
});

const assessment = load('src/lib/assessment.ts');

test('evaluación: cinco decisiones arman el perfil de siempre y repetirla conserva lo tuyo', () => {
  const plain = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(assessment.assessmentSteps('gym')), ['goal', 'place', 'time', 'consider'], 'en el gimnasio no se pregunta el equipamiento');
  assert.equal(assessment.assessmentSteps(null).length, 5);
  assert.deepEqual(plain(assessment.toggleConsideration(['beginner'], 'none')), ['none']);
  assert.deepEqual(plain(assessment.toggleConsideration(['none'], 'knees')), ['knees']);

  const at = new Date('2026-10-19T12:00:00Z');
  const answers = { goal: 'muscle', place: 'both', equipment: ['dumbbells'], days: 4, minutes: 60, considerations: ['knees', 'beginner'] };
  const profile = assessment.buildProfile(answers, null, at);
  assert.equal(profile.location, 'gym', '«Ambos»: el gimnasio por defecto');
  assert.deepEqual(plain(profile.equipment), ['dumbbells'], 'y el equipo de casa a mano');
  assert.deepEqual(plain(profile.goals), ['muscle']);
  assert.deepEqual(plain(profile.activities), ['walking'], 'principiante → nivel 1');
  assert.deepEqual(plain(profile.limitations), ['knees']);
  assert.equal(profile.recommendation.sessionsPerWeek, 4);
  assert.equal(profile.recommendation.sessionMinutes, 60);
  assert.match(profile.recommendation.caution, /rodillas/);
  assert.deepEqual(Object.keys(profile.customAnswers).sort(), ['activities', 'barriers', 'goals', 'limitations', 'times'], 'formato compatible');
  // Lo que usa el generador sale igual que antes.
  assert.equal(generator.levelFromActivities(profile.activities), 1);
  assert.deepEqual(plain(generator.profileLimitations(profile.limitations)), ['knees']);
  assert.equal(generator.goalFromProfile(profile.goals), 'muscle');
  assert.equal(assessment.buildProfile({ ...answers, considerations: ['none'], days: 5 }, null, at).activities[0], 'some', 'los días no dicen cuánta experiencia tienes');
  assert.deepEqual(plain(assessment.buildProfile({ ...answers, place: 'gym' }, null, at).equipment), [], 'sólo gimnasio: sin equipo de casa');

  // Repetir: conserva fecha de inicio, nombre e identidad; parte de tus respuestas actuales.
  const previous = { ...profile, createdAt: '2026-01-02T10:00:00.000Z', name: 'Ana', sex: 'female', goals: ['weight'], recommendation: { ...profile.recommendation, sessionMinutes: 20 } };
  const again = assessment.buildProfile(answers, previous, at);
  assert.equal(again.createdAt, '2026-01-02T10:00:00.000Z');
  assert.equal(again.name, 'Ana');
  assert.equal(again.sex, 'female');
  const prefilled = assessment.answersFromProfile(previous, 'home', ['bands'], 3);
  assert.equal(prefilled.goal, 'energy', '«Mejorar mi peso» pasa a «Estar en forma»');
  assert.equal(prefilled.place, 'home');
  assert.deepEqual(plain(prefilled.equipment), ['bands']);
  assert.equal(prefilled.minutes, 30, 'los minutos se acercan a las opciones nuevas');
  assert.deepEqual(plain(prefilled.considerations), ['beginner', 'knees']);
});

const actions = load('src/components/session/session-actions.ts');

test('sesión: acciones puras (carga que se copia, descanso, series, pausa y orden)', () => {
  const plain = (value) => JSON.parse(JSON.stringify(value));
  const pending = (value, load) => ({ value, load, done: false, kind: 'normal' });
  const record = { exerciseId: 10, unit: 'reps', sets: [pending(10, 20), pending(10, 20), pending(8, 22)] };
  // Subir la carga de la primera serie la copia a las pendientes que tenían la misma (no a la de 22).
  const carried = actions.patchSet(record, 0, { load: 25 }, 20);
  assert.deepEqual(plain(carried.sets.map((set) => set.load)), [25, 25, 22]);
  assert.deepEqual(plain(actions.patchSet(record, 0, { value: 12 }).sets.map((set) => set.value)), [12, 10, 8]);

  const draft = { id: 'd', name: 'Hoy', records: [record, { exerciseId: 11, unit: 'reps', sets: [pending(10, 0)] }], elapsedSeconds: 0, runningSince: 1000, restUntil: null, notes: '', restSeconds: 90, startedAt: '' };
  const marked = actions.markSet(draft.records, 0, 0, true);
  assert.equal(marked[0].sets[0].done, true);
  assert.equal(actions.restAfterSet(draft, 0, marked, true), 90, 'descanso general');
  assert.equal(actions.restAfterSet(draft, 0, marked, false), 0, 'sin descanso automático');
  assert.equal(actions.restAfterSet({ ...draft, runningSince: null }, 0, marked, true), 0, 'en pausa no corre');
  const allDone = draft.records.map((item) => ({ ...item, sets: item.sets.map((set) => ({ ...set, done: true })) }));
  assert.equal(actions.restAfterSet(draft, 0, allDone, true), 0, 'tras la última serie toca terminar');
  const superset = { ...draft, records: [{ ...record, group: 'a' }, { ...draft.records[1], group: 'a' }] };
  assert.equal(actions.restAfterSet(superset, 0, actions.markSet(superset.records, 0, 0, true), true), 0, 'en superserie se alterna sin descanso');

  assert.equal(actions.withExtraSet(record).sets.length, 4);
  assert.equal(actions.withoutLastSet({ ...record, sets: [pending(5, 0)] }).sets.length, 1, 'siempre queda una serie');
  const paused = actions.togglePaused({ ...draft, restUntil: 5000 }, 61_000);
  assert.equal(paused.runningSince, null);
  assert.equal(paused.elapsedSeconds, 60);
  assert.equal(paused.restUntil, null, 'pausar corta el descanso');
  assert.equal(actions.togglePaused(paused, 70_000).runningSince, 70_000);
  const longer = actions.adjustedRest({ ...draft, restUntil: 100_000, restTotal: 90 }, 15, 50_000);
  assert.equal(longer.restUntil, 115_000);
  assert.equal(longer.restTotal, 105);
  assert.deepEqual(plain(actions.movedRecords(draft.records, 0, 1).map((item) => item.exerciseId)), [11, 10]);
  assert.equal(actions.movedRecords(draft.records, 0, -1), draft.records, 'fuera de rango no cambia');
});

// ─── Ejercicios, generador y progresión: enseñar a entrenar ──────────────────
const prescription = load('src/lib/prescription.ts');
const selection = load('src/lib/selection.ts');
const technique = load('src/data/technique.ts');
const adaptationLib = load('src/lib/adaptation.ts');
const trainingReview = load('src/lib/training-review.ts');
const loadedBy = (pattern) => exercises.find((item) => item.category === 'strength' && item.pattern === pattern && item.increment > 0 && item.unit === 'reps');
const pair = (range) => Array.from(range);

test('prescripción: rangos por objetivo, margen (RIR), descansos y series por nivel', () => {
  const squat = loadedBy('squat');
  const curl = loadedBy('isolation');
  const plan = (exercise, goal, role, extra = {}) => prescription.prescribe(exercise, { goal, level: 2, role, ...extra });
  const planAt = (exercise, goal, role, level) => prescription.prescribe(exercise, { goal, level, role });
  // Rangos: fuerza, el principal de 3 a 8 (la carga alta rinde más); músculo, 5–10 y aislamientos 10–20; salud general, 8–15.
  assert.deepEqual(pair(plan(squat, 'strength', 'main').range), [4, 8]);
  assert.deepEqual(pair(planAt(squat, 'strength', 'main', 3).range), [3, 6]);
  assert.deepEqual(pair(plan(squat, 'muscle', 'main').range), [5, 10]);
  assert.deepEqual(pair(plan(squat, 'habits', 'main').range), [8, 12]);
  assert.deepEqual(pair(plan(curl, 'muscle', 'accessory').range), [10, 20]);
  assert.deepEqual(pair(plan(curl, 'habits', 'accessory').range), [10, 15]);
  // Quien empieza aprende la técnica con cargas moderadas.
  assert.deepEqual(pair(planAt(squat, 'strength', 'main', 1).range), [6, 10]);
  assert.deepEqual(pair(planAt(squat, 'muscle', 'main', 1).range), [8, 12]);
  assert.deepEqual(pair(planAt(curl, 'muscle', 'accessory', 1).range), [10, 15]);
  // Descansos: lo pesado 2–3 min, compuestos moderados 90–120 s, aislamientos 60–90 s; quien empieza, menos.
  assert.equal(plan(squat, 'strength', 'main').rest, 180);
  assert.equal(plan(squat, 'muscle', 'compound').rest, 120);
  assert.equal(plan(curl, 'muscle', 'accessory').rest, 75);
  assert.equal(planAt(squat, 'strength', 'main', 1).rest, 150);
  assert.equal(planAt(squat, 'strength', 'compound', 1).rest, 90);
  const bodyweight = exercises.find((item) => item.category === 'strength' && item.increment === 0 && prescription.isCompound(item) && item.unit === 'reps');
  assert.ok(plan(bodyweight, 'strength', 'main').rest <= 90, 'sin carga externa no hace falta el descanso largo');
  // RIR por nivel y papel: más margen cuanto menos experiencia; nunca el fallo por defecto (RIR 0).
  assert.deepEqual(['main', 'compound', 'accessory'].map((role) => planAt(squat, 'muscle', role, 1).rir), [3, 3, 2]);
  assert.deepEqual(['main', 'compound', 'accessory'].map((role) => planAt(squat, 'muscle', role, 2).rir), [2, 2, 1]);
  assert.deepEqual(['main', 'compound', 'accessory'].map((role) => planAt(squat, 'muscle', role, 3).rir), [2, 1, 1]);
  assert.equal(plan(squat, 'muscle', 'main', { easier: true }).rir, 3, 'el modo suave suma uno (máximo 3)');
  assert.equal(plan(curl, 'muscle', 'accessory', { easier: true }).rir, 2);
  for (const level of [1, 2, 3]) for (const role of ['main', 'compound', 'accessory', 'core']) assert.ok(planAt(squat, 'strength', role, level).rir >= 1, 'nadie va al fallo por defecto');
  // Series: de 2 a 4 por ejercicio y sesión; desde intermedio una más en fuerza y músculo; lo suave, una menos.
  const starter = prescription.prescribe(squat, { goal: 'muscle', level: 1, role: 'main' }).sets;
  assert.equal(plan(squat, 'muscle', 'main').sets, Math.min(4, starter + 1));
  assert.equal(plan(squat, 'habits', 'main').sets, starter);
  assert.equal(plan(squat, 'muscle', 'main', { easier: true }).sets, Math.max(2, Math.min(4, squat.sets)));
  assert.ok(prescription.prescribe(squat, { goal: 'strength', level: 3, role: 'main', minutes: 10, easier: true }).sets >= 2);
  for (const level of [1, 2, 3]) assert.ok(planAt(squat, 'strength', 'main', level).sets <= 4);
  // Movilidad: sin esfuerzo, descanso mínimo.
  const stretch = exercises.find((item) => item.category === 'mobility');
  assert.deepEqual({ rir: plan(stretch, 'muscle', 'accessory').rir, rest: plan(stretch, 'muscle', 'accessory').rest }, { rir: 3, rest: 15 });
  // Papeles y textos.
  assert.equal(prescription.roleOf(squat, true), 'main');
  assert.equal(prescription.roleOf(squat, false), 'compound');
  assert.equal(prescription.roleOf(curl, false), 'accessory');
  assert.equal(prescription.roleOf(exercises.find((item) => item.pattern === 'core' && item.category === 'strength'), false), 'core');
  assert.match(prescription.rirText(2), /2 repeticiones posibles/);
  assert.match(prescription.rirText(1), /1 repetición posible/);
  const press = { ...training.exerciseById(12), unilateral: false };
  assert.equal(prescription.targetText({ unit: 'reps', rir: 2 }, press), '8–12 rep · RIR 2');
  assert.equal(prescription.targetText({ unit: 'reps', rir: 2, range: [4, 8] }, press), '4–8 rep · RIR 2');
  assert.equal(prescription.targetText({ unit: 'reps' }, press), '8–12 rep');
  assert.equal(prescription.targetText({ unit: 'reps', range: [10, 10] }, { ...press, unilateral: true }), '10 rep por lado');
  assert.equal(prescription.targetText({ unit: 'seconds' }, { ...press, range: [20, 40], unilateral: false }), '20–40 s');
});

test('generador: rango y RIR por objetivo, orden por prioridad y cobertura de patrones', () => {
  const byId = (id) => exercises.find((item) => item.id === id);
  const run = (goal, minutes = 45, seed = 5) => generator.generateWorkout({ preference: { location: 'gym', equipment: [] }, minutes, focus: 'full', goal, level: 2, seed });
  const rangeOf = (record) => pair(record.range ?? byId(record.exerciseId).range);
  const strength = run('strength');
  const habits = run('habits');
  // Cuerpo completo: rodilla + empuje + tirón + bisagra, también cuando el tiempo es corto.
  const group = (pattern) => (pattern === 'squat' || pattern === 'lunge' ? 'knee' : pattern.endsWith('push') ? 'push' : pattern.endsWith('pull') ? 'pull' : pattern);
  for (const location of ['gym', 'home']) {
    for (const minutes of [20, 30, 45, 60]) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const plan = generator.generateWorkout({ preference: { location, equipment: location === 'home' ? ['dumbbells', 'bench'] : [] }, minutes, focus: 'full', goal: 'muscle', level: 2, seed });
        const groups = plan.records.map((record) => group(byId(record.exerciseId).pattern));
        const missing = ['knee', 'push', 'pull', 'hinge'].filter((item) => !groups.includes(item));
        const repeated = ['knee', 'push', 'pull', 'hinge'].some((item) => groups.filter((value) => value === item).length > 1);
        assert.ok(plan.records.length < 4 || !missing.length || !repeated, `${location} ${minutes} min seed ${seed}: falta ${missing} y se repite ${groups}`);
      }
    }
  }
  // El principal manda: fuerza 4–8 con descanso largo; «moverme más», rangos altos y menos descanso.
  assert.deepEqual(rangeOf(strength.records[0]), [4, 8]);
  assert.equal(strength.records[0].restSeconds, 180);
  assert.ok(rangeOf(habits.records[0])[1] >= 12);
  assert.ok(habits.records[0].restSeconds < strength.records[0].restSeconds);
  // Cada ejercicio de fuerza con repeticiones lleva su margen (RIR 1–3).
  for (const record of [...strength.records, ...habits.records]) {
    const exercise = byId(record.exerciseId);
    if (exercise.category === 'strength' && exercise.unit === 'reps') assert.ok(record.rir >= 1 && record.rir <= 3, `${exercise.name}: RIR ${record.rir}`);
    else assert.equal(record.rir, undefined);
  }
  // Orden por prioridad: compuestos (con carga primero), después lo demás y el núcleo al final.
  const flags = habits.records.map((record) => prescription.isCompound(byId(record.exerciseId)));
  assert.ok(byId(habits.records[0].exerciseId).increment > 0);
  assert.equal(flags.lastIndexOf(true) + 1, flags.filter(Boolean).length, 'los compuestos van juntos al principio');
  assert.equal(byId(habits.records.at(-1).exerciseId).pattern, 'core');
  // Cada ejercicio lleva su porqué (papel y variante).
  for (const record of habits.records) {
    assert.ok(habits.why[record.exerciseId].role.length > 15 && habits.why[record.exerciseId].variant.length > 15, `porqué de ${record.exerciseId}`);
  }
});

test('selección: continuidad, molestias, cambios y semanas (puntajes internos, sin rankings)', () => {
  const press = training.exerciseById(12);
  const NOW = Date.UTC(2026, 9, 20, 15);
  const at = (daysAgo, load, feel) => ({ id: `d${daysAgo}`, date: utils.localDateKey(new Date(NOW - daysAgo * DAY)), completedAt: new Date(NOW - daysAgo * DAY).toISOString(), durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', records: [{ exerciseId: 12, unit: 'reps', ...(feel ? { feel } : {}), sets: [set(10, load), set(10, load), set(10, load)] }] });
  // Tendencia: sube la carga estimada → progresa; sin cambios en tres sesiones → estancado.
  const rising = [at(20, 20), at(13, 22), at(6, 24)];
  assert.deepEqual({ ...selection.exerciseTrend(rising, 12, NOW) }, { sessions: 3, weeks: 2, progressing: true, stalled: false });
  const flat = [at(20, 20), at(13, 20), at(6, 20), at(1, 20)];
  assert.equal(selection.exerciseTrend(flat, 12, NOW).stalled, true);
  assert.equal(selection.exerciseTrend(flat, 12, NOW).progressing, false);
  assert.equal(selection.exerciseTrend([], 12, NOW), null);
  assert.equal(selection.exerciseTrend([at(60, 20)], 12, NOW), null, 'sólo cuentan las últimas 6 semanas');

  // Puntaje interno: lo que progresas se mantiene; lo que cambias o te molestó baja; «otra variante» explora.
  const base = { goal: 'muscle', level: 2, chosen: [], painful: new Set(), trends: new Map(), exploring: false, seed: 3 };
  const score = (extra) => selection.scoreCandidate(press, { ...base, ...extra }).score;
  const trend = selection.exerciseTrend(rising, 12, NOW);
  assert.ok(score({ trends: new Map([[12, trend]]) }) - score({}) >= 28, 'continuidad');
  assert.equal(score({ trends: new Map([[12, trend]]), exploring: true }) - score({ exploring: true }), 0, 'al explorar no hay continuidad');
  assert.equal(score({ trends: new Map([[12, selection.exerciseTrend(flat, 12, NOW)]]) }), score({}), 'estancado: sin continuidad');
  assert.equal(score({}) - score({ avoid: { 12: 2 } }), 50, 'cambiado dos veces');
  assert.equal(score({}) - score({ painful: new Set([12]) }), 60, 'molestia');
  // Series semanales de referencia por nivel.
  const volumeModule = load('src/lib/volume.ts');
  assert.deepEqual([1, 2, 3].map((level) => ({ ...volumeModule.weeklyTarget(level, 'muscle') })), [{ low: 6, high: 10 }, { low: 10, high: 16 }, { low: 12, high: 20 }]);
  assert.deepEqual([1, 2, 3].map((level) => ({ ...volumeModule.weeklyTarget(level, 'strength') })), [{ low: 3, high: 6 }, { low: 4, high: 9 }, { low: 4, high: 9 }]);

  // El generador respeta la molestia (cambia a otra variante) y mantiene lo que progresa.
  const input = { preference: { location: 'gym', equipment: [] }, minutes: 45, focus: 'upper', goal: 'muscle', level: 2, now: NOW };
  const first = generator.generateWorkout({ ...input, seed: 2 }).records[0].exerciseId;
  const history = (feel) => [13, 6].map((daysAgo, index) => ({ ...at(daysAgo, 20 + index * 2, index === 1 ? feel : undefined), records: [{ exerciseId: first, unit: 'reps', ...(index === 1 && feel ? { feel } : {}), sets: [set(10, 20 + index * 2), set(10, 20 + index * 2), set(10, 20 + index * 2)] }] }));
  const painful = generator.generateWorkout({ ...input, seed: 2, workouts: history('pain') });
  assert.ok(!painful.records.some((record) => record.exerciseId === first), 'no repite lo que te molestó');
  assert.ok(Object.values(painful.why).some((reason) => /te molestó/i.test(reason.variant)), 'y lo explica');
  // Lo que progresas se mantiene: un ejercicio que no salía solo, con tres semanas de avance, entra y se queda;
  // «Otra variante» explora y deja de sostenerlo.
  const chosen = new Set(generator.generateWorkout({ ...input, seed: 2 }).records.map((record) => record.exerciseId));
  const candidate = exercises.find((item) => item.category === 'strength' && item.pattern === 'vertical-push' && item.increment > 0 && item.equipment.length > 0 && !chosen.has(item.id));
  const progressing = [20, 13, 6].map((daysAgo, index) => ({ ...at(daysAgo, 10), id: `c${daysAgo}`, records: [{ exerciseId: candidate.id, unit: 'reps', sets: [set(10, 10 + index * 2), set(10, 10 + index * 2), set(10, 10 + index * 2)] }] }));
  const included = (extra, seed) => generator.generateWorkout({ ...input, seed, ...extra }).records.some((record) => record.exerciseId === candidate.id);
  const seeds = Array.from({ length: 12 }, (_, index) => index + 1);
  assert.ok(seeds.filter((seed) => included({}, seed)).length <= seeds.length / 2, 'sin historial no se impone');
  assert.equal(seeds.filter((seed) => included({ workouts: progressing }, seed)).length, seeds.length, 'con avance sostenido, se mantiene');
  const withoutHistory = seeds.filter((seed) => included({}, seed)).length;
  const exploring = seeds.filter((seed) => included({ workouts: progressing, variant: 4 }, seed)).length;
  assert.ok(exploring < seeds.length && exploring <= withoutHistory + 3, `al pedir otra variante se explora (${exploring} de ${seeds.length}, sin historial ${withoutHistory})`);
  assert.ok(Object.values(generator.generateWorkout({ ...input, seed: 3, workouts: progressing }).why).some((reason) => /Lo mantenemos: has progresado/.test(reason.variant)), 'y lo explica');
});

test('selección: el porqué explica papel, variante y lo aprendido', () => {
  const hinge = loadedBy('hinge') ?? exercises.find((item) => item.pattern === 'hinge');
  const why = (exercise, extra = {}) => selection.whyExercise(exercise, { location: 'gym', level: 2, ...extra });
  assert.match(why(hinge).role, /Necesitamos una bisagra de cadera: trabaja/);
  assert.match(why(exercises.find((item) => item.pattern === 'core')).role, /^Núcleo/);
  assert.match(why(hinge, { location: 'home', replacedForPain: 'Peso muerto' }).variant, /te molestó peso muerto/i);
  assert.match(why(hinge, { trend: { sessions: 3, weeks: 3, progressing: true, stalled: false } }).variant, /Lo mantenemos: has progresado en las últimas 3 semanas/);
  assert.match(why(hinge, { trend: { sessions: 4, weeks: 4, progressing: false, stalled: true } }).variant, /antes de cambiarlo, revisa el descanso y el margen \(RIR\)/);
  const bodyweight = exercises.find((item) => item.equipment.length === 0 && item.category === 'strength' && item.level === 2);
  assert.match(why(bodyweight, { location: 'home' }).variant, /equipamiento|Entrenas en casa/);
  // Ni rankings ni porcentajes en ningún motivo.
  for (const exercise of exercises.filter((item) => item.category === 'strength').slice(0, 40)) {
    const text = Object.values(why(exercise)).join(' ');
    assert.doesNotMatch(text, /%|mejor ejercicio|#1|ranking/i);
  }
  // Orden y recorte por cobertura.
  const ordered = selection.sessionOrder([exercises.find((item) => item.pattern === 'core'), loadedBy('horizontal-push'), loadedBy('squat'), loadedBy('isolation')]);
  assert.deepEqual(ordered.map((item) => item.pattern), ['squat', 'horizontal-push', 'isolation', 'core']);
  const squat = loadedBy('squat');
  const lunge = loadedBy('lunge') ?? exercises.find((item) => item.pattern === 'lunge');
  assert.equal(selection.leastNeeded([squat, loadedBy('horizontal-push'), lunge, loadedBy('hinge') ?? hinge]), 2, 'sale la repetición de rodilla antes que la bisagra');
  assert.equal(selection.leastNeeded([squat, loadedBy('horizontal-push'), hinge]), 2, 'si todos son distintos, el último');
});

test('progresión: «¿Cómo salió?» manda sobre el esfuerzo de la sesión y la molestia nunca sube', () => {
  const press = training.exerciseById(12);
  const NOW = Date.UTC(2026, 9, 20, 15);
  const top = [set(12, 20, { rir: 2 }), set(12, 20, { rir: 2 }), set(12, 20, { rir: 2 })];
  const on = (daysAgo, feel, effort = 3) => ({ id: `f${daysAgo}`, date: utils.localDateKey(new Date(NOW - daysAgo * DAY)), completedAt: new Date(NOW - daysAgo * DAY).toISOString(), durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', effort, records: [{ exerciseId: 12, unit: 'reps', ...(feel ? { feel } : {}), sets: top }] });
  const next = (workouts) => progression.suggestNext(press, training.lastRecordFor(workouts, 12), 'kg', (kg) => kg, progression.effortFor(workouts, 12));
  assert.equal(next([on(2, undefined, 3)]).kind, 'load', 'sin respuesta, la sesión normal sube');
  // Muy difícil en el ejercicio, aunque la sesión fue «bien»: se repite.
  assert.deepEqual({ kind: next([on(2, 'hard', 3)]).kind, because: next([on(2, 'hard', 3)]).because }, { kind: 'hold', because: 'hard' });
  // Muy fácil en el ejercicio, aunque la sesión fue difícil: manda el ejercicio.
  assert.equal(next([on(2, 'easy', 5)]).because, 'easy');
  // Bien: doble progresión de siempre.
  assert.equal(next([on(2, 'good', 5)]).kind, 'load');
  // Molestia: mantiene la carga y propone cambiar de variante; nunca sube.
  const pain = next([on(2, 'pain')]);
  assert.deepEqual({ kind: pain.kind, load: pain.load, because: pain.because }, { kind: 'hold', load: 20, because: 'pain' });
  assert.match(pain.message, /te molestó.*cambia a otra variante/);
  assert.equal(progression.effortFor([on(2, 'pain')], 12).pain, true);
  assert.equal(progression.effortFor([on(2, 'pain'), on(9, 'good')], 12).hardStreak, 1);
  // Ejercicios que te molestaron en las últimas 3 semanas (sólo cuenta la última vez).
  const painful = adaptationLib.painfulExercises;
  assert.deepEqual(Array.from(painful([on(2, 'pain')], NOW)), [12]);
  assert.deepEqual(Array.from(painful([on(2, 'good'), on(9, 'pain')], NOW)), [], 'si la última vez salió bien, ya no');
  assert.deepEqual(Array.from(painful([on(30, 'pain')], NOW)), [], 'de hace más de 3 semanas, ya pasó');
});

test('ajustes visibles: qué cambió frente a tu última vez y por qué', () => {
  const press = training.exerciseById(12); // 8–12 reps, +2 kg
  const top = [set(12, 20, { rir: 2 }), set(12, 20, { rir: 2 }), set(12, 20, { rir: 2 })];
  const mid = [set(10, 20), set(10, 20), set(10, 20)];
  const last = (sets) => ({ exerciseId: 12, unit: 'reps', sets });
  const adjust = (sets, context) => {
    const previous = last(sets);
    const proposed = last(progression.progressedSets(press, 3, previous, context));
    return progression.describeAdjustment(press, previous, proposed, context, 'kg', (kg) => kg);
  };
  assert.deepEqual({ ...adjust(top, { effort: 3, hardStreak: 0 }) }, { change: '20 → 22 kg', reason: 'Completaste el rango con margen.', direction: 'up' });
  assert.equal(adjust(top, { effort: 2, hardStreak: 0 }).reason, 'Tu última sesión fue fácil.');
  assert.deepEqual({ ...adjust(mid, { effort: 3, hardStreak: 0 }) }, { change: '10 → 11 rep.', reason: 'Sumas una repetición dentro del rango.', direction: 'up' });
  const hard = adjust(top, { effort: 4, hardStreak: 1 });
  assert.deepEqual({ change: hard.change, direction: hard.direction }, { change: 'Mantiene 20 kg', direction: 'hold' });
  assert.match(hard.reason, /difícil.*repetimos antes de subir/);
  assert.match(adjust(top, { effort: 4, hardStreak: 1, pain: true }).reason, /Te molestó la última vez/);
  assert.match(adjust(mid, { effort: 4, hardStreak: 2 }).reason, /dos sesiones difíciles seguidas/);
  assert.equal(progression.describeAdjustment(press, undefined, last(top), undefined, 'kg', (kg) => kg), null, 'primera vez: nada que comparar');
  // Si la carga se mueve por las pesas que tienes, no se presenta como progreso (ni como bajada por fatiga).
  const snapped = progression.describeAdjustment(press, last(top), last(top.map((item) => ({ ...item, load: 16 }))), { effort: 3, hardStreak: 0 }, 'kg', (kg) => kg);
  assert.deepEqual({ ...snapped }, { change: '20 → 16 kg', reason: 'Ajustada a las pesas que tienes.', direction: 'down' });
  const snappedUp = progression.describeAdjustment(press, last(mid), last(mid.map((item) => ({ ...item, load: 24 }))), { effort: 3, hardStreak: 0 }, 'kg', (kg) => kg);
  assert.equal(snappedUp.reason, 'Ajustada a las pesas que tienes.');
  // En libras, la carga se muestra en libras.
  const lb = progression.describeAdjustment(press, last(top), last(progression.progressedSets(press, 3, last(top), { effort: 3, hardStreak: 0 })), { effort: 3, hardStreak: 0 }, 'lb', (kg) => utils.toDisplayWeight(kg, 'lb'));
  assert.match(lb.change, /lb$/);
});

test('revisión semanal: sólo al empezar la semana, con lo hecho y lo que viene, y una vez', () => {
  const monday = new Date(2026, 9, 19, 9); // lunes 19 de octubre de 2026
  const day = (date, extra = {}) => ({ id: `r${date}`, date, completedAt: `${date}T18:00:00.000Z`, durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', prs: [], records: [{ exerciseId: 12, unit: 'reps', sets: [set(12, 20, { rir: 2 }), set(12, 20, { rir: 2 }), set(12, 20, { rir: 2 })] }], ...extra });
  const workouts = [day('2026-10-13'), day('2026-10-16', { prs: [{ exerciseId: 12, kind: 'load', value: 20 }] })];
  const options = { now: monday, goal: 3, unit: 'kg' };
  const result = trainingReview.trainingReview(workouts, options);
  assert.equal(result.weekStart, '2026-10-12');
  assert.deepEqual(Array.from(result.lines), ['2 sesiones de 3', '6 series de trabajo', '1 récord nuevo']);
  assert.equal(result.next.length, 1);
  assert.deepEqual({ name: result.next[0].name, change: result.next[0].change, direction: result.next[0].direction }, { name: training.exerciseById(12).name, change: '20 → 22 kg', direction: 'up' });
  // Meta cumplida, una vez vista no vuelve, y sólo lunes a miércoles.
  assert.match(trainingReview.trainingReview([...workouts, day('2026-10-14')], options).lines[0], /3 sesiones de 3: meta cumplida/);
  assert.equal(trainingReview.trainingReview(workouts, { ...options, seen: '2026-10-12' }), null);
  assert.ok(trainingReview.trainingReview(workouts, { ...options, now: new Date(2026, 9, 21, 20) }), 'el miércoles aún aparece');
  assert.equal(trainingReview.trainingReview(workouts, { ...options, now: new Date(2026, 9, 22, 9) }), null, 'el jueves ya no');
  assert.equal(trainingReview.trainingReview([day('2026-10-05')], options), null, 'sin sesiones la semana pasada, no hay revisión');
  assert.equal(trainingReview.trainingReview([], options), null);
});

test('PULSO aprendió: molestias, cansancio, lo que costó o salió fácil, lo que progresas y lo que cambias', () => {
  const NOW = Date.UTC(2026, 9, 20, 15);
  const at = (daysAgo, recordExtra = {}, extra = {}) => ({ id: `l${daysAgo}`, date: utils.localDateKey(new Date(NOW - daysAgo * DAY)), completedAt: new Date(NOW - daysAgo * DAY).toISOString(), durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', records: [{ exerciseId: 12, unit: 'reps', sets: [set(10, 20), set(10, 20), set(10, 20)], ...recordExtra }], ...extra });
  const name = training.exerciseById(12).name;
  assert.deepEqual(Array.from(adaptationLib.learnedFrom([], undefined, NOW)), [], 'sin historial no hay nada que contar');
  assert.deepEqual(Array.from(adaptationLib.learnedFrom([at(40)], { 12: 3 }, NOW)), [], 'sin sesiones recientes, tampoco');
  assert.match(adaptationLib.learnedFrom([at(2, { feel: 'pain' })], undefined, NOW)[0].text, new RegExp(`Te molestó ${name}: no subimos su carga y proponemos otra variante`));
  assert.match(adaptationLib.learnedFrom([at(2, { feel: 'hard' })], undefined, NOW)[0].text, /te costó: la próxima vez repetimos antes de subir/);
  assert.match(adaptationLib.learnedFrom([at(2, { feel: 'easy' })], undefined, NOW)[0].text, /te salió fácil: la próxima vez subimos un poco/);
  assert.equal(adaptationLib.learnedFrom([at(2, { feel: 'good' })], undefined, NOW).length, 0, 'bien: nada que ajustar');
  const streak = adaptationLib.learnedFrom([at(1, {}, { effort: 4 }), at(3, {}, { effort: 4 })], undefined, NOW);
  assert.ok(streak.some((item) => /2 sesiones difíciles seguidas/.test(item.text)));
  assert.ok(adaptationLib.learnedFrom([at(2)], { 12: 2 }, NOW).some((item) => /Cambiaste .* varias veces: dejamos de proponerlo/.test(item.text)));
  const rising = [at(13, { sets: [set(10, 20), set(10, 20), set(10, 20)] }), at(6, { sets: [set(10, 24), set(10, 24), set(10, 24)] })];
  assert.ok(adaptationLib.learnedFrom(rising, undefined, NOW).some((item) => /avanza: lo mantenemos/.test(item.text)));
  // Como máximo cuatro, con las molestias primero.
  const many = adaptationLib.learnedFrom([at(1, { feel: 'pain' }, { effort: 4 }), at(3, { feel: 'hard' }, { effort: 4 })], { 12: 2, 14: 2, 15: 2 }, NOW);
  assert.ok(many.length <= 4);
  assert.match(many[0].key, /^pain-/);
});

test('programas: la recomendación sale de tus días, tu lugar y tu nivel', () => {
  const featured = programs.featuredPrograms({ location: 'gym', level: 2, hasDumbbells: false });
  const pick = (extra) => programs.recommendedProgram(featured, { location: 'gym', days: 3, level: 2, ...extra })?.id;
  assert.equal(pick({ days: 2 }), featured[0].id, '2 o 3 días: cuerpo completo');
  assert.equal(pick({ days: 3 }), featured[0].id);
  assert.equal(pick({ days: 4 }), 'torso-pierna', '4 días: torso y pierna');
  assert.equal(pick({ days: 5 }), 'torso-pierna', 'a nivel intermedio, push, pull y legs no hace falta');
  assert.equal(pick({ days: 5, level: 3 }), 'push-pull-legs', '5 días con experiencia: push, pull y legs');
  assert.equal(pick({ days: 6, level: 3 }), 'push-pull-legs');
  assert.equal(pick({ days: 5, level: 1 }), featured[0].id, 'quien empieza: cuerpo completo, nunca push, pull y legs');
  assert.equal(pick({ days: 6, level: 1 }), featured[0].id);
  assert.equal(pick({ days: 4, level: 1 }), featured[0].id);
  assert.equal(pick({ location: 'home', days: 6 }), featured[0].id, 'en casa, cuerpo completo');
  // Cada sesión de programa lleva rango, margen y descanso por papel.
  const program = programs.programById('full-body-gimnasio');
  const records = programs.programSessionRecords(program, 1, 1, []);
  assert.ok(records.length >= 3);
  assert.ok(records.every((record) => record.restSeconds > 0));
  const withRir = records.filter((record) => exercises.find((item) => item.id === record.exerciseId).category === 'strength' && record.unit === 'reps');
  assert.ok(withRir.length > 0 && withRir.every((record) => record.rir >= 1 && record.rir <= 3));
});

test('sesión: una caída de 3 repeticiones o más con la misma carga pide 30 s de descanso extra', () => {
  const sets = (...values) => values.map(([value, load, done = true]) => ({ value, load, done, kind: 'normal' }));
  const record = (...values) => ({ exerciseId: 12, unit: 'reps', sets: sets(...values) });
  assert.equal(actions.repDrop(record([12, 20], [8, 20], [8, 20, false]), 1), 4);
  assert.equal(actions.repDrop(record([12, 20], [10, 20], [10, 20, false]), 1), 0, 'bajar 2 es normal');
  assert.equal(actions.repDrop(record([12, 20], [8, 25], [8, 25, false]), 1), 0, 'con más carga, bajar es esperable');
  assert.equal(actions.repDrop(record([12, 20], [8, 20]), 1), 0, 'sin series pendientes, no hay siguiente descanso');
  assert.equal(actions.repDrop(record([12, 20, false], [8, 20, false]), 0), 0, 'una serie sin hacer no cuenta');
  assert.equal(actions.repDrop({ exerciseId: 99, unit: 'seconds', sets: sets([40, 0], [30, 0], [30, 0, false]) }, 1), 0, 'por tiempo, no aplica');
  assert.equal(actions.repDrop(record([12, 20], [8, 20, true], [8, 20, false]), 0), 0, 'la primera serie no se compara con nada');
});

test('ficha del ejercicio: recorrido por patrón, ritmo, esfuerzo normal y señales para detenerse', () => {
  for (const pattern of ['squat', 'hinge', 'lunge', 'horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull', 'core', 'carry', 'isolation', 'cardio', 'mobility']) {
    assert.ok(technique.rangeOfMotion[pattern].length > 40, `recorrido de ${pattern}`);
  }
  const strength = exercises.find((item) => item.category === 'strength' && item.unit === 'reps' && item.pattern !== 'carry');
  assert.match(technique.tempoCue(strength), /Baja en 2–3 segundos/);
  assert.equal(technique.tempoCue(exercises.find((item) => item.category === 'mobility')), null);
  assert.equal(technique.tempoCue(exercises.find((item) => item.unit === 'seconds' && item.category === 'strength')), null);
  assert.match(technique.normalEffort(strength), /cansancio, el ardor en el músculo y respirar agitado/);
  assert.match(technique.normalEffort(strength), /agujetas.*no miden/);
  assert.match(technique.normalEffort(exercises.find((item) => item.category === 'mobility')), /nunca dolor/);
  assert.ok(technique.stopSigns.length >= 5);
  assert.ok(technique.stopSigns.some((sign) => /Dolor agudo/.test(sign)) && technique.stopSigns.some((sign) => /pecho/.test(sign)));
  // Sin lenguaje médico absoluto.
  const text = [...Object.values(technique.rangeOfMotion), ...technique.stopSigns].join(' ');
  assert.doesNotMatch(text, /garantiz|cura\b|diagnóstic|siempre es seguro|sin riesgo/i);
});

test('selección: tus favoritos pesan sin imponerse y se nombran en el porqué', () => {
  const NOW = Date.UTC(2026, 9, 20, 15);
  const press = training.exerciseById(12);
  const base = { goal: 'muscle', level: 2, chosen: [], painful: new Set(), trends: new Map(), exploring: false, seed: 3 };
  const score = (extra) => selection.scoreCandidate(press, { ...base, ...extra }).score;
  assert.equal(score({ favorites: new Set([12]) }) - score({}), 14);
  // Un favorito que además cambias seguido o te molestó no se impone.
  assert.ok(score({ favorites: new Set([12]), avoid: { 12: 2 } }) < score({}));
  assert.ok(score({ favorites: new Set([12]), painful: new Set([12]) }) < score({}));
  // En el generador: entra mucho más seguido que sin marcarlo, pero no en toda sesión que no encaje.
  const shoulders = exercises.find((item) => item.name === 'Press de hombros con mancuernas');
  const gym = { preference: { location: 'gym', equipment: [] }, minutes: 45, focus: 'full', goal: 'muscle', level: 2, now: NOW };
  const seeds = Array.from({ length: 20 }, (_, index) => index + 1);
  const count = (extra) => seeds.filter((seed) => generator.generateWorkout({ ...gym, seed, ...extra }).records.some((record) => record.exerciseId === shoulders.id)).length;
  const without = count({});
  const favored = count({ favorites: [shoulders.id] });
  assert.ok(favored >= without + 8, `${without} → ${favored} de ${seeds.length}`);
  const plan = generator.generateWorkout({ ...gym, seed: seeds.find((seed) => generator.generateWorkout({ ...gym, seed, favorites: [shoulders.id] }).records.some((record) => record.exerciseId === shoulders.id)), favorites: [shoulders.id] });
  assert.match(plan.why[shoulders.id].variant, /favoritos/);
  assert.match(selection.whyExercise(shoulders, { location: 'gym', level: 2, favorite: true }).variant, /Es uno de tus favoritos/);
  assert.doesNotMatch(selection.whyExercise(shoulders, { location: 'gym', level: 2 }).variant, /favoritos/);
});

// ─── Plan de entrenamiento: estructura, volumen, tiempo y adaptación ───────────
const planLib = load('src/lib/training-plan.ts');
const structureLib = load('src/lib/program-structure.ts');
const volumeLib = load('src/lib/volume.ts');
const durationLib = load('src/lib/duration.ts');
const adaptVolume = load('src/lib/volume-adaptation.ts');
const plainJson = (value) => JSON.parse(JSON.stringify(value));
const gymPreference = { location: 'gym', equipment: [] };
const homePreference = { location: 'home', equipment: ['dumbbells', 'bench'] };
const barePreference = { location: 'home', equipment: [] };
const planOf = (extra) => planLib.buildTrainingPlan({ preference: gymPreference, goal: 'muscle', level: 2, minutes: 45, daysPerWeek: 3, warmup: true, now: Date.UTC(2026, 9, 21, 15), ...extra });
const exerciseOfPlan = (item) => exercises.find((candidate) => candidate.id === item.exerciseId);

test('volumen: una serie cuenta entera para el que lidera y una fracción para los que ayudan', () => {
  const press = training.exerciseById(12);
  const row = training.exerciseById(14);
  assert.deepEqual(plainJson(volumeLib.muscleCredit(press)), { chest: 1, triceps: 0.5, shoulders: 0.25 });
  assert.deepEqual(plainJson(volumeLib.muscleCredit(row)), { lats: 1, back: 0.5, biceps: 0.25, forearms: 0.25 });
  const sets = volumeLib.effectiveSets([{ exercise: press, sets: 4 }, { exercise: row, sets: 4 }]);
  assert.deepEqual([sets.chest, sets.triceps, sets.shoulders, sets.biceps], [4, 2, 1, 1]);
  assert.equal(volumeLib.trackedSets(sets, 'lats'), 4, 'la espalda cuenta por la mayor entre dorsales y espalda media');
  // Movilidad y cardio no suman series de fuerza.
  const mobility = exercises.find((item) => item.category === 'mobility');
  assert.ok(Object.values(volumeLib.effectiveSets([{ exercise: mobility, sets: 3 }])).every((value) => value === 0));
  // Los registros de una sesión se cuentan igual (sin calentamientos).
  const record = { exerciseId: 12, unit: 'reps', sets: [set(10, 20, { kind: 'warmup' }), set(10, 20), set(10, 20)] };
  assert.equal(volumeLib.recordsEffectiveSets([record]).chest, 2);
  assert.deepEqual([1, 2, 3].map((level) => volumeLib.sessionCap(level)), [6, 8, 10]);
});

test('duración: ejecución, descansos y transiciones; las superseries comparten el descanso', () => {
  const rec = (exerciseId, sets, rest, extra = {}) => ({ exerciseId, unit: 'reps', restSeconds: rest, sets: Array.from({ length: sets }, () => ({ value: 10, load: 0, done: false, kind: 'normal' })), ...extra });
  // 3 series de 10 repeticiones (3 s cada una + 15 s de preparación), 2 descansos de 90 s y 45 s para pasar al siguiente.
  assert.equal(durationLib.sessionSeconds([rec(12, 3, 90)], 90), 3 * 45 + 2 * 90 + 45);
  assert.equal(durationLib.estimateMinutes([rec(12, 3, 90)], 90), 6);
  const separate = [rec(12, 3, 90), rec(14, 3, 90)];
  const paired = [rec(12, 3, 90, { group: 'a' }), rec(14, 3, 90, { group: 'a' })];
  assert.equal(durationLib.sessionSeconds(separate, 90), 720);
  assert.equal(durationLib.sessionSeconds(paired, 90), 540, 'ahorra un descanso por vuelta del segundo ejercicio');
  // El calentamiento cuenta como en su tarjeta: lo que dura cada movimiento y 15 s para cambiar, sin preparar series ni transiciones.
  const warm = [rec(72, 1, 15, { unit: 'seconds', sets: [{ value: 60, load: 0, done: false, kind: 'warmup' }] }), rec(2, 1, 15, { sets: [{ value: 10, load: 0, done: false, kind: 'warmup' }] })];
  assert.equal(durationLib.sessionSeconds(warm, 60), 60 + 15 + 10 * 3 + 15);
  // Los ejercicios por tiempo cuentan sus segundos y el descanso largo pesa: el mismo número de ejercicios no dura lo mismo.
  const plank = { exerciseId: 4, unit: 'seconds', restSeconds: 45, sets: [{ value: 40, load: 0, done: false }, { value: 40, load: 0, done: false }] };
  assert.equal(durationLib.sessionSeconds([plank], 45), 40 + 40 + 45 + 45);
  const heavy = Array.from({ length: 5 }, () => rec(12, 4, 180));
  const light = Array.from({ length: 5 }, () => rec(12, 3, 60));
  assert.ok(durationLib.estimateMinutes(heavy, 90) > durationLib.estimateMinutes(light, 90) * 2, 'cinco ejercicios pesados no son cinco aislamientos');
});

test('estructura: la recomendación sale de tus días, nivel, objetivo, tiempo y equipo', () => {
  const rec = (extra) => structureLib.recommendStructure({ days: 3, level: 2, goal: 'muscle', minutes: 45, location: 'gym', variety: 70, ...extra });
  assert.equal(rec({ days: 1 }).sessions, 1);
  assert.deepEqual([rec({ days: 2 }).split, plainJson(rec({ days: 2 }).cycle)], ['full-body', ['A', 'B']]);
  assert.deepEqual([rec({ days: 3, level: 1 }).split, plainJson(rec({ days: 3, level: 1 }).cycle)], ['full-body', ['A', 'B']]);
  assert.deepEqual([rec({ days: 4 }).split, plainJson(rec({ days: 4 }).cycle)], ['upper-lower', ['UA', 'LA', 'UB', 'LB']]);
  assert.equal(rec({ days: 5, level: 2 }).split, 'full-upper-lower');
  // Quien empieza: tres sesiones de Full Body bastan (cada músculo tres veces por semana); los demás días, opcionales.
  for (const days of [4, 5, 6]) assert.deepEqual([rec({ days, level: 1 }).split, rec({ days, level: 1 }).sessions], ['full-body', 3]);
  assert.match(rec({ days: 5, level: 1 }).reason, /5 días.*al empezar|al empezar.*3 de Full Body/);
  // Cinco días con experiencia, buen equipo y objetivo de fuerza o músculo: PPL + Torso / Pierna; con poco equipo, el híbrido de siempre.
  assert.equal(rec({ days: 5, level: 3 }).split, 'ppl-upper-lower');
  assert.equal(rec({ days: 5, level: 3, variety: 38 }).split, 'full-upper-lower');
  assert.equal(rec({ days: 5, level: 3, goal: 'weight' }).split, 'full-upper-lower');
  // Seis días no se recomiendan solos: hace falta experiencia, equipo y sesiones de verdad.
  assert.ok(rec({ days: 6, level: 2 }).sessions <= 5 && rec({ days: 6, level: 2 }).split === 'full-upper-lower');
  assert.equal(rec({ days: 6, level: 3, minutes: 60 }).split, 'push-pull-legs');
  assert.notEqual(rec({ days: 6, level: 3, minutes: 30 }).split, 'push-pull-legs', 'con sesiones cortas no');
  assert.notEqual(rec({ days: 6, level: 3, minutes: 60, variety: 35 }).split, 'push-pull-legs', 'con poco equipo tampoco');
  assert.notEqual(rec({ days: 6, level: 3, minutes: 60, goal: 'habits' }).split, 'push-pull-legs');
  // Salud general: tres sesiones aunque haya más días; poco equipo: Full Body y como mucho tres.
  assert.equal(rec({ days: 5, goal: 'habits' }).sessions, 3);
  assert.equal(rec({ days: 5, goal: 'energy' }).split, 'full-body');
  assert.deepEqual([rec({ days: 5, variety: 22, level: 3 }).split, rec({ days: 5, variety: 22, level: 3 }).sessions], ['full-body', 3]);
  // Nunca Push / Pull / Legs con 1–3 días, sea cual sea el nivel o el objetivo.
  for (const level of [1, 2, 3]) for (const goal of ['strength', 'muscle', 'weight', 'energy', 'habits']) for (const days of [1, 2, 3]) assert.notEqual(rec({ days, level, goal }).split, 'push-pull-legs');
  // Una razón en una línea y, a lo sumo, una alternativa.
  for (const days of [1, 2, 3, 4, 5, 6]) {
    const structure = rec({ days, level: days === 6 ? 3 : 2, minutes: 60 });
    assert.ok(structure.reason.length > 20 && structure.reason.length < 240 && !structure.reason.includes('\n'), structure.reason);
    assert.ok(!structure.alternative || structure.alternative.split !== structure.split);
  }
});

test('plan: «3 días, 45 minutos, en casa con mancuernas» sale hecho, completo y progresable', () => {
  const input = { preference: homePreference, goal: 'strength', level: 1, minutes: 45, daysPerWeek: 3, warmup: true, now: Date.UTC(2026, 9, 21, 15) };
  const plan = planLib.buildTrainingPlan(input);
  assert.deepEqual([plan.label, plan.daysPerWeek, plainJson(plan.cycle)], ['Full Body', 3, ['A', 'B']]);
  assert.match(plan.reason, /3 días/);
  assert.equal(plan.chosen, false);
  assert.deepEqual(plainJson(plan.days.map((day) => day.name)), ['Full Body A', 'Full Body B']);
  for (const day of plan.days) {
    assert.ok(day.minutes <= 46, `${day.name}: ${day.minutes} min`);
    assert.ok(day.exercises.length >= 4 && day.exercises.length <= 7, `${day.name}: ${day.exercises.length} ejercicios`);
    assert.ok(day.exercises.every((item) => item.sets >= 2 && item.sets <= 5));
  }
  // Cada semana cubre rodilla, empuje, tirón y bisagra, con el equipo que hay.
  const patterns = new Set(plan.days.flatMap((day) => day.exercises.map((item) => exerciseOfPlan(item).pattern)));
  for (const needed of [['squat', 'lunge'], ['horizontal-push', 'vertical-push'], ['horizontal-pull', 'vertical-pull'], ['hinge']]) assert.ok(needed.some((pattern) => patterns.has(pattern)), `falta ${needed}`);
  assert.deepEqual(plainJson(planLib.validatePlan(plan, input)), []);
  // Quien empieza repite los mismos movimientos principales: la bisagra es el mismo ejercicio en A y B.
  const hinge = plan.days.map((day) => day.exercises.find((item) => item.slot === 'hinge')?.exerciseId);
  assert.equal(hinge[0], hinge[1], 'mismo ejercicio en A y B');
  // Ningún día pasa de las series que rinden, y el volumen semanal queda en rango de principiante.
  for (const muscle of ['chest', 'lats', 'shoulders', 'quads', 'hamstrings', 'glutes']) {
    const weekly = volumeLib.trackedSets(plan.weekly, muscle);
    assert.ok(weekly >= 3 && weekly <= 11, `${muscle}: ${weekly}`);
  }
});

test('plan: 4 días, 60 minutos, gimnasio, hipertrofia → Torso / Pierna con variantes A/B', () => {
  const input = { preference: gymPreference, goal: 'muscle', level: 2, minutes: 60, daysPerWeek: 4, warmup: true, now: Date.UTC(2026, 9, 21, 15) };
  const plan = planLib.buildTrainingPlan(input);
  assert.deepEqual([plan.label, plainJson(plan.cycle)], ['Torso / Pierna', ['UA', 'LA', 'UB', 'LB']]);
  assert.deepEqual(plainJson(plan.days.map((day) => day.name)), ['Torso A', 'Pierna A', 'Torso B', 'Pierna B']);
  assert.ok(plan.days.every((day) => day.minutes <= 61 && day.exercises.length >= 4));
  // Torso: empuje y tirón; pierna: rodilla y bisagra. Las variantes B no repiten los principales de A.
  const slotOf = (day, slot) => day.exercises.find((item) => item.slot === slot)?.exerciseId;
  const [ua, la, ub, lb] = plan.days;
  assert.notEqual(slotOf(ua, 'push-h'), slotOf(ub, 'push-h'));
  assert.notEqual(slotOf(ua, 'pull-v'), slotOf(ub, 'pull-v'));
  assert.notEqual(slotOf(la, 'hinge'), slotOf(lb, 'hinge'));
  assert.ok(ua.exercises.every((item) => !['squat', 'hinge', 'lunge'].includes(exerciseOfPlan(item).pattern)), 'el torso no trae ejercicios de pierna');
  assert.ok(la.exercises.every((item) => !['horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull'].includes(exerciseOfPlan(item).pattern)));
  // Cada músculo principal llega a su rango de hipertrofia sin pasarse.
  for (const muscle of ['chest', 'lats', 'shoulders', 'quads', 'hamstrings', 'glutes']) {
    const weekly = volumeLib.trackedSets(plan.weekly, muscle);
    assert.ok(weekly >= 8 && weekly <= 18, `${muscle}: ${weekly}`);
  }
  assert.deepEqual(plainJson(planLib.validatePlan(plan, input)), []);
});

test('plan: casos de 2, 3, 4 y 5 días, principiante e intermedio, casa y gimnasio, 20 y 60 minutos, con molestias', () => {
  const stress = (area) => (exercise) => (exercise.stresses ?? []).includes(area);
  let checked = 0;
  for (const preference of [barePreference, homePreference, gymPreference]) {
    for (const [level, goal] of [[1, 'strength'], [2, 'muscle'], [3, 'muscle']]) {
      for (const daysPerWeek of [2, 3, 4, 5]) {
        for (const minutes of [20, 60]) {
          for (const limitations of [[], ['knees', 'shoulders']]) {
            const input = { preference, goal, level, minutes, daysPerWeek, limitations, warmup: true, now: Date.UTC(2026, 9, 21, 15) };
            const plan = planLib.buildTrainingPlan(input);
            const label = `${preference.location} ${preference.equipment.join('+') || 'sin equipo'} L${level} ${daysPerWeek}d ${minutes}m ${limitations}`;
            assert.deepEqual(plainJson(planLib.validatePlan(plan, input)), [], label);
            for (const day of plan.days) {
              assert.ok(day.minutes <= minutes * 1.06 + 1, `${label}: ${day.name} dura ${day.minutes}`);
              // Con una zona que cuidar, un día de torso puede quedar corto (los ejercicios que la exigen se evitan); sin ella, al menos tres.
              assert.ok(day.exercises.length >= (limitations.length ? 2 : 3), `${label}: ${day.name} tiene ${day.exercises.length}`);
              for (const item of day.exercises) for (const area of limitations) assert.ok(!stress(area)(exerciseOfPlan(item)), `${label}: ${exerciseOfPlan(item).name} exige ${area}`);
            }
            checked += 1;
          }
        }
      }
    }
  }
  assert.equal(checked, 144);
});

test('plan: con 20 minutos son 3–4 movimientos de alto impacto, no la sesión normal cortada', () => {
  const plan = planOf({ preference: gymPreference, goal: 'muscle', level: 2, minutes: 20, daysPerWeek: 3 });
  for (const day of plan.days) {
    assert.ok(day.exercises.length >= 3 && day.exercises.length <= 4, `${day.name}: ${day.exercises.length}`);
    assert.ok(day.minutes <= 21, `${day.name}: ${day.minutes} min`);
    // Lo que queda son los movimientos principales (pierna, empuje, tirón o bisagra), no accesorios.
    assert.ok(day.exercises.filter((item) => ['squat', 'lunge', 'hinge', 'horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull'].includes(exerciseOfPlan(item).pattern)).length >= 3);
  }
  // Con tiempo justo se alternan en superserie (descansos compartidos) antes de quitar series.
  assert.ok(plan.days.some((day) => day.exercises.some((item) => item.group)), 'hay superseries para ahorrar tiempo');
  // Lo principal de la fuerza máxima no se empareja.
  const strength = planOf({ preference: gymPreference, goal: 'strength', level: 2, minutes: 20, daysPerWeek: 3 });
  assert.ok(strength.days.every((day) => day.exercises.every((item) => !item.group || item.role !== 'main')));
  // Con 10 minutos son tres movimientos de 2 series; con 75, la sesión no se infla: hay más ejercicios pero no más de los que caben.
  for (const preference of [gymPreference, homePreference]) {
    const ten = planOf({ preference, minutes: 10, daysPerWeek: 3 });
    assert.ok(ten.days.every((day) => day.exercises.length === 3 && day.minutes <= 11), ten.days.map((day) => day.minutes).join());
    const long = planOf({ preference, minutes: 75, daysPerWeek: 3 });
    assert.ok(long.days.every((day) => day.exercises.length >= 6 && day.exercises.length <= 8 && day.minutes <= 76));
  }
  assert.ok(generator.durationOptions.includes(75));
  // Con 60 minutos hay más ejercicios y la duración sigue cabiendo.
  const long = planOf({ minutes: 60, daysPerWeek: 3 });
  assert.ok(long.days.every((day) => day.exercises.length >= 5 && day.minutes <= 61));
});

test('plan: equipo limitado y seis días, sin imposibles ni dogmas', () => {
  // Sin equipo no hay con qué variar: Full Body y como mucho tres sesiones, y se avisa de lo que falta.
  const bare = planOf({ preference: barePreference, goal: 'muscle', level: 2, daysPerWeek: 5, minutes: 45 });
  assert.deepEqual([bare.split, bare.daysPerWeek, bare.availableDays], ['full-body', 3, 5]);
  assert.match(bare.reason, /5 días.*Full Body|Full Body.*5 días|equipo/i);
  assert.ok(bare.notes.some((note) => /barra de dominadas|bandas/.test(note)), 'dice qué equipo habilita tirones verticales');
  // Seis días sin experiencia: menos días de pesas, el resto opcional.
  const six = planOf({ goal: 'muscle', level: 2, daysPerWeek: 6, minutes: 60 });
  assert.ok(six.daysPerWeek <= 5 && six.availableDays === 6);
  assert.notEqual(six.split, 'push-pull-legs');
  assert.match(six.reason, /6|seis|opcional/i);
  // Seis días con experiencia, equipo y tiempo: Push / Pull / Legs dos veces.
  const advanced = planOf({ goal: 'muscle', level: 3, daysPerWeek: 6, minutes: 60 });
  assert.deepEqual([advanced.split, advanced.days.length, advanced.daysPerWeek], ['push-pull-legs', 6, 6]);
  // La persona puede elegir otra estructura y el plan lo respeta (y lo dice).
  const chosen = planOf({ daysPerWeek: 4, splitOverride: 'full-body' });
  assert.deepEqual([chosen.split, chosen.chosen], ['full-body', true]);
  assert.ok(chosen.options.some((option) => option.recommended && option.split === 'upper-lower'));
  assert.ok(planOf({ daysPerWeek: 4 }).options.length <= 2);
});

test('plan: mismos datos, mismo plan; sólo lo que importa lo cambia', () => {
  const input = { preference: gymPreference, goal: 'muscle', level: 2, minutes: 45, daysPerWeek: 4, warmup: true, now: Date.UTC(2026, 9, 21, 15), seed: 5 };
  const ids = (plan) => plan.days.map((day) => day.exercises.map((item) => item.exerciseId));
  const first = planLib.buildTrainingPlan(input);
  assert.deepEqual(ids(planLib.buildTrainingPlan(input)), ids(first), 'determinista');
  // Un historial de sesiones que no cambia nada (sin molestias ni cambios) no mueve los ejercicios que no progresan.
  const DAYS = 86_400_000;
  const noise = [2, 5, 9].map((daysAgo) => ({ id: `n${daysAgo}`, date: utils.localDateKey(new Date(input.now - daysAgo * DAYS)), completedAt: new Date(input.now - daysAgo * DAYS).toISOString(), durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', records: [{ exerciseId: 999, unit: 'reps', sets: [set(10, 20)] }] }));
  assert.deepEqual(ids(planLib.buildTrainingPlan({ ...input, workouts: noise })), ids(first));
  // Cambiar un ejercicio varias veces lo saca del plan; una molestia con él, también.
  const lead = first.days[0].exercises[0].exerciseId;
  assert.ok(!ids(planLib.buildTrainingPlan({ ...input, avoid: { [lead]: 2 } })).flat().includes(lead));
  const hurt = [{ id: 'p', date: utils.localDateKey(new Date(input.now - 2 * DAYS)), completedAt: new Date(input.now - 2 * DAYS).toISOString(), durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', records: [{ exerciseId: lead, unit: 'reps', feel: 'pain', sets: [set(10, 20), set(10, 20)] }] }];
  assert.ok(!ids(planLib.buildTrainingPlan({ ...input, workouts: hurt })).flat().includes(lead));
  // Un favorito entra y lo que progresas se queda aunque cambie la semilla del bloque.
  const keep = first.days[1].exercises.find((item) => exerciseOfPlan(item).increment > 0).exerciseId;
  const progress = [20, 13, 6].map((daysAgo, index) => ({ id: `r${daysAgo}`, date: utils.localDateKey(new Date(input.now - daysAgo * DAYS)), completedAt: new Date(input.now - daysAgo * DAYS).toISOString(), durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', records: [{ exerciseId: keep, unit: 'reps', sets: [set(10, 20 + index * 2), set(10, 20 + index * 2), set(10, 20 + index * 2)] }] }));
  for (const seed of [1, 2, 3, 4, 5, 6]) assert.ok(ids(planLib.buildTrainingPlan({ ...input, seed, workouts: progress })).flat().includes(keep), `seed ${seed}`);
});

test('plan: qué toca hoy sigue el ciclo y la recuperación sólo cambia el día cuando es claro', () => {
  const NOW = Date.UTC(2026, 9, 21, 15);
  const at = (daysAgo, dayId) => ({ id: `w${daysAgo}`, date: utils.localDateKey(new Date(NOW - daysAgo * DAY)), completedAt: new Date(NOW - daysAgo * DAY).toISOString(), durationMinutes: 40, exerciseCount: 4, sets: 12, mode: 'full', source: { type: 'plan', dayId }, records: [] });
  const full = planLib.buildTrainingPlan({ preference: homePreference, goal: 'strength', level: 1, minutes: 45, daysPerWeek: 3, warmup: true, now: NOW });
  assert.equal(planLib.nextPlanDay(full, [], NOW).id, 'A');
  assert.equal(planLib.nextPlanDay(full, [at(2, 'A')], NOW).id, 'B');
  assert.equal(planLib.nextPlanDay(full, [at(2, 'B'), at(4, 'A')], NOW).id, 'A', 'A B A · B A B: el ciclo sigue entre semanas');
  assert.equal(planLib.nextPlanDay(full, [at(30, 'B')], NOW).id, 'A', 'tras una pausa larga se empieza de nuevo');
  assert.equal(planLib.nextPlanDay(full, [{ ...at(2, 'B'), source: { type: 'generated' } }], NOW).id, 'A', 'lo que no es del plan no mueve el ciclo');
  const split = planLib.buildTrainingPlan({ preference: gymPreference, goal: 'muscle', level: 2, minutes: 60, daysPerWeek: 4, warmup: true, now: NOW });
  const tired = { chest: 100, back: 100, lats: 100, traps: 100, shoulders: 100, biceps: 100, triceps: 100, forearms: 100, abs: 100, obliques: 100, lowerBack: 100, glutes: 20, quads: 20, hamstrings: 20, adductors: 20, calves: 20 };
  const fresh = Object.fromEntries(Object.keys(tired).map((muscle) => [muscle, 100]));
  assert.equal(planLib.todayPlanDay(split, [at(1, 'UA')], NOW, fresh).day.id, 'LA');
  const swapped = planLib.todayPlanDay(split, [at(1, 'UA')], NOW, tired);
  assert.equal(swapped.day.id, 'UB', 'con las piernas cansadas, se hace el torso');
  assert.match(swapped.note, /Hoy te tocaba Pierna A, pero tus piernas aún se recuperan: entrenas Torso B/);
  // En Full Body todo el cuerpo trabaja: no hay otro día más fresco, se mantiene el que toca.
  assert.equal(planLib.todayPlanDay(full, [at(1, 'A')], NOW, tired).day.id, 'B');
  assert.equal(planLib.todayPlanDay(full, [at(1, 'A')], NOW, tired).note, undefined);
});

test('plan: la sesión de hoy sale del día del plan con progresión, rango, margen y porqué', () => {
  const NOW = Date.UTC(2026, 9, 21, 15);
  const input = { preference: gymPreference, goal: 'strength', level: 2, minutes: 45, daysPerWeek: 3, warmup: true, now: NOW, seed: 2 };
  const plan = planLib.buildTrainingPlan(input);
  const session = planLib.planSession(input, plan, plan.days[0]);
  assert.equal(session.name, 'Full Body A');
  assert.equal(session.records.length, plan.days[0].exercises.length);
  assert.ok(session.estimatedMinutes <= 48);
  for (const record of session.records) {
    const exercise = exercises.find((item) => item.id === record.exerciseId);
    if (exercise.category === 'strength' && exercise.unit === 'reps') assert.ok(record.rir >= 1 && record.rir <= 3);
    assert.ok(record.restSeconds >= 45 && record.sets.length >= 2);
    assert.ok(session.why[record.exerciseId].role.length > 15);
  }
  const main = session.records[0];
  assert.deepEqual(plainJson(main.range ?? exercises.find((item) => item.id === main.exerciseId).range), [4, 8], 'fuerza: el principal en 4–8');
  // Con energía moderada: la misma sesión con una serie menos y sin el último ejercicio.
  const short = planLib.planSession(input, plan, plan.days[0], { readiness: 'short' });
  assert.equal(short.records.length, session.records.length - 1);
  assert.ok(short.records.reduce((sum, record) => sum + record.sets.length, 0) < session.records.reduce((sum, record) => sum + record.sets.length, 0));
  assert.match(short.notes[0], /Energía moderada/);
  // Con otro tiempo sólo se recortan los días, no la estructura.
  const quick = planLib.buildTrainingPlan({ ...input, minutesOverride: 20 });
  assert.equal(quick.split, plan.split);
  assert.deepEqual(plainJson(quick.cycle), plainJson(plan.cycle));
  assert.ok(quick.days[0].minutes < plan.days[0].minutes);
});

test('plan: los minutos de cada día son los de la sesión que harás, con su calentamiento y con o sin historial', () => {
  const NOW = Date.UTC(2026, 9, 21, 15);
  const base = { preference: gymPreference, goal: 'muscle', level: 2, minutes: 60, daysPerWeek: 4, warmup: true, now: NOW };
  const history = [1, 3].map((daysAgo) => {
    const date = new Date(NOW - daysAgo * 86_400_000);
    return { id: `h${daysAgo}`, date: utils.localDateKey(date), completedAt: date.toISOString(), durationMinutes: 50, exerciseCount: 4, sets: 12, mode: 'full', effort: 3, records: [59, 12, 14, 46].map((exerciseId) => ({ exerciseId, unit: 'reps', sets: [set(12, 60), set(12, 60), set(12, 60)] })) };
  });
  const inputs = [base, { ...base, workouts: history }, { ...base, minutes: 20 }, { ...base, minutes: 10 }, { ...base, warmup: false }, { ...base, preference: homePreference, level: 1, goal: 'strength', minutes: 45, daysPerWeek: 3 }];
  for (const input of inputs) {
    const plan = planLib.buildTrainingPlan(input);
    for (const planned of plan.days) assert.equal(planLib.planSession(input, plan, planned).estimatedMinutes, planned.minutes, `${planned.name} (${input.minutes} min)`);
    // Con o sin calentamiento, ningún día pasa del tiempo que pediste (más el redondeo).
    assert.ok(plan.days.every((planned) => planned.minutes <= input.minutes * 1.02 + 0.5), `${plan.days.map((planned) => planned.minutes)} para ${input.minutes} min`);
  }
});

test('plan: si las sesiones duran bastante menos que tu tiempo, lo explica; las superseries van juntas', () => {
  const home = (minutes) => planLib.buildTrainingPlan({ preference: homePreference, goal: 'strength', level: 1, minutes, daysPerWeek: 3, warmup: true, now: Date.UTC(2026, 9, 21, 15) });
  assert.match(home(75).notes[0], /duran unos \d+ min, menos de los 75 que tienes/);
  assert.equal(home(30).notes.some((note) => /duran unos/.test(note)), false);
  for (const minutes of [10, 20, 30]) {
    for (const daysPerWeek of [2, 3, 4, 5]) {
      for (const planned of planOf({ minutes, daysPerWeek }).days) {
        const groups = planned.exercises.map((item) => item.group ?? null);
        for (const label of new Set(groups.filter(Boolean))) {
          const at = groups.flatMap((group, index) => (group === label ? [index] : []));
          assert.equal(at[at.length - 1] - at[0], at.length - 1, `${planned.name}: la superserie ${label} no está junta`);
        }
      }
    }
  }
});

test('adaptación del volumen: baja con fatiga o molestia, sube despacio con progreso y vuelve a empezar tras una pausa', () => {
  const NOW = Date.UTC(2026, 9, 21, 15); // miércoles
  const weekStart = (weeksAgo) => { const date = new Date(NOW); date.setDate(date.getDate() - ((date.getDay() + 6) % 7) - 7 * weeksAgo); return date; };
  const session = (weeksAgo, dayOffset, { load = 40, effort = 3, feel, painAreas } = {}) => {
    const date = weekStart(weeksAgo); date.setDate(date.getDate() + dayOffset); date.setHours(18, 0, 0, 0);
    const key = utils.localDateKey(date);
    return { id: `s${weeksAgo}${dayOffset}${load}`, date: key, completedAt: date.toISOString(), durationMinutes: 40, exerciseCount: 1, sets: 3, mode: 'full', effort, ...(painAreas ? { painAreas } : {}), records: [{ exerciseId: 59, unit: 'reps', ...(feel ? { feel } : {}), sets: [set(8, load), set(8, load), set(8, load)] }] };
  };
  // Sentadilla con barra (piernas): sin historial, nada cambia.
  assert.deepEqual(plainJson(adaptVolume.volumeShift([], { now: NOW, level: 2, goal: 'muscle' })), { shift: {}, changes: [], deload: false });
  // Dos semanas buenas seguidas con progreso: sube una serie por músculo de la región.
  const good = [session(3, 0, { load: 40 }), session(2, 0, { load: 42 }), session(1, 0, { load: 44 })];
  const up = adaptVolume.volumeShift(good, { now: NOW, level: 2, goal: 'muscle' });
  assert.equal(up.shift.legs, 1);
  assert.deepEqual(plainJson(up.changes), [{ region: 'legs', delta: 1, reason: 'Estás progresando bien y recuperándote sin problemas.' }]);
  assert.equal(adaptVolume.volumeShift(good.slice(1), { now: NOW, level: 2, goal: 'muscle' }).shift.legs, undefined, 'una sola semana buena no alcanza');
  // Dos sesiones difíciles en la semana, o una molestia: baja de a dos.
  const hard = [session(2, 0, { load: 40 }), session(1, 0, { load: 40, effort: 4 }), session(1, 2, { load: 40, effort: 5 })];
  const down = adaptVolume.volumeShift(hard, { now: NOW, level: 2, goal: 'muscle' });
  assert.equal(down.shift.legs, -2);
  assert.match(down.changes[0].reason, /sesiones fueron difíciles/);
  const pain = adaptVolume.volumeShift([session(1, 0, { painAreas: ['knees'] })], { now: NOW, level: 2, goal: 'muscle' });
  assert.equal(pain.shift.legs, -2);
  assert.match(pain.changes[0].reason, /molestia/);
  const felt = adaptVolume.volumeShift([session(1, 0, { feel: 'pain' })], { now: NOW, level: 2, goal: 'muscle' });
  assert.equal(felt.shift.legs, -2);
  assert.equal(adaptVolume.volumeShift([session(1, 0, { painAreas: ['shoulders'] })], { now: NOW, level: 2, goal: 'muscle' }).shift.legs, undefined, 'una molestia de hombros no toca las piernas');
  // Nunca baja de −3 ni sube más del rango, y tras dos semanas sin entrenar vuelve a empezar conservador.
  const spiral = [4, 3, 2, 1].map((weeksAgo) => session(weeksAgo, 0, { effort: 5, painAreas: ['knees'] }));
  assert.equal(adaptVolume.volumeShift(spiral, { now: NOW, level: 2, goal: 'muscle' }).shift.legs, -3);
  const rest = [session(4, 0, { effort: 5, painAreas: ['knees'] })];
  assert.equal(adaptVolume.volumeShift(rest, { now: NOW, level: 2, goal: 'muscle' }).shift.legs, undefined, 'tras la pausa, de nuevo conservador');
  // Fácil en dos ejercicios de la región también cuenta como una buena semana.
  const easy = (weeksAgo, load) => { const date = weekStart(weeksAgo); date.setHours(18, 0, 0, 0); return { id: `e${weeksAgo}`, date: utils.localDateKey(date), completedAt: date.toISOString(), durationMinutes: 40, exerciseCount: 2, sets: 4, mode: 'full', effort: 3, records: [59, 41].map((exerciseId) => ({ exerciseId, unit: 'reps', feel: 'easy', sets: [set(8, load), set(8, load)] })) }; };
  assert.equal(adaptVolume.volumeShift([easy(3, 40), easy(2, 40), easy(1, 40)], { now: NOW, level: 2, goal: 'muscle' }).shift.legs, 1);
  // Un rendimiento que cae en dos ejercicios de la zona baja el volumen aunque no hayas marcado nada.
  const week = (weeksAgo, effort, loads) => ['0', '2'].map((offset) => { const date = weekStart(weeksAgo); date.setDate(date.getDate() + Number(offset)); date.setHours(18, 0, 0, 0); return { id: `d${weeksAgo}${offset}`, date: utils.localDateKey(date), completedAt: date.toISOString(), durationMinutes: 40, exerciseCount: 2, sets: 6, mode: 'full', effort, records: Object.entries(loads).map(([exerciseId, load]) => ({ exerciseId: Number(exerciseId), unit: 'reps', sets: [set(8, load), set(8, load), set(8, load)] })) }; });
  const legs = adaptVolume.volumeShift([...week(3, 3, { 59: 100, 41: 40 }), ...week(1, 3, { 59: 82, 41: 32 })], { now: NOW, level: 2, goal: 'muscle' });
  assert.deepEqual([legs.shift.legs, legs.deload], [-2, false], 'sin esfuerzo alto, es sólo una baja del volumen de las piernas');
  assert.match(legs.changes[0].reason, /rendimiento bajó/);
  assert.equal(adaptVolume.volumeShift([...week(3, 3, { 59: 100, 41: 40 }), ...week(1, 3, { 59: 98, 41: 39 })], { now: NOW, level: 2, goal: 'muscle' }).shift.legs, undefined, 'una caída de 2 % es ruido');
  assert.equal(adaptVolume.volumeShift([...week(3, 3, { 59: 100 }), ...week(1, 3, { 59: 82 })], { now: NOW, level: 2, goal: 'muscle' }).shift.legs, undefined, 'un solo ejercicio que baja, sin esfuerzo alto, puede ser un mal día');
  // Descarga reactiva: rendimiento y esfuerzo a la vez. Todo el cuerpo baja, con los mismos ejercicios; nada de descargas fijas.
  const tired = adaptVolume.volumeShift([...week(3, 3, { 59: 100, 60: 80 }), ...week(1, 5, { 59: 82, 60: 64 })], { now: NOW, level: 2, goal: 'muscle' });
  assert.equal(tired.deload, true);
  assert.ok(['chest', 'back', 'shoulders', 'arms', 'legs', 'core'].every((region) => tired.shift[region] === -5), 'esta semana, cerca de un 40 % menos de series por músculo (12 → 7)');
  assert.match(tired.changes[0].reason, /más liviana/);
  const steady = [5, 4, 3, 2, 1].flatMap((weeksAgo) => week(weeksAgo, 3, { 59: 100, 60: 80 }));
  assert.equal(adaptVolume.volumeShift(steady, { now: NOW, level: 2, goal: 'muscle' }).deload, false, 'cinco semanas seguidas sin señales: ninguna descarga programada');
  // El ajuste se ve en el plan: menos series de piernas y el motivo.
  const input = { preference: gymPreference, goal: 'muscle', level: 2, minutes: 60, daysPerWeek: 4, warmup: true, now: NOW, shift: { legs: -2 } };
  const adjustments = planLib.planAdjustments(input, [{ region: 'legs', delta: -2, reason: 'Tus últimas sesiones fueron difíciles: bajamos el volumen para que te recuperes.' }]);
  assert.equal(adjustments.length, 1);
  assert.ok(adjustments[0].from > adjustments[0].to, `${adjustments[0].from} → ${adjustments[0].to}`);
  assert.equal(adjustments[0].label, 'Piernas');
});
