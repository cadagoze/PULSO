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
    if (name === 'clsx' || name === 'tailwind-merge') return nodeRequire(name);
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

test('las rutinas base conservan los ejercicios originales y empiezan sin series marcadas', () => {
  const records = training.defaultRecords();
  assert.deepEqual(Array.from(records, (record) => record.exerciseId), [1, 2, 3, 4, 5]);
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
  const pruned = nutrition.pruneHistory([{ ...entry('x', 'a', 1, 1), date: '2026-01-01' }, entry('y', 'b', 1, 1)], '2026-10-05');
  assert.deepEqual(Array.from(pruned, (item) => item.id), ['y']);
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
  assert.equal(generator.trainingGoal(['habits'], 'gain'), 'strength');
  assert.equal(generator.trainingGoal(['energy'], 'maintain'), 'energy');
  assert.equal(generator.trainingGoal(['energy']), 'energy');
  assert.equal(nutrition.goalFromAssessment(['weight']), 'lose');
  assert.equal(nutrition.goalFromAssessment(['strength']), 'maintain');
  assert.deepEqual({ ...energy.goalGuides.lose.intervals }, { min: 1, max: 2 });
  assert.equal(energy.goalGuides.lose.strength.min, 3);
  assert.equal(energy.goalGuides.maintain.activityMinutes, 150);
  assert.deepEqual({ ...energy.goalGuides.gain.setsPerMuscle }, { min: 10, max: 20 });
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
  const kept = nutrition.pruneHistory([{ date: '2026-01-01', glasses: 3 }, { date: '2026-10-04', glasses: 8 }], '2026-10-05');
  assert.deepEqual(Array.from(kept, (entry) => entry.date), ['2026-10-04']);
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
  const line = (dates, goal = 3) => motivation.heroLine({ workouts: dates.map(day), weeklyGoal: goal, minutes: 20, now: wednesday });
  assert.equal(line([]), 'Tu primera sesión: 20 minutos. Empieza ahora.');
  assert.equal(line(['2026-10-05', '2026-10-06', '2026-10-07']), 'Meta cumplida. Hoy vas por más.');
  assert.equal(line(['2026-09-28']), 'Nadie lo hará por ti. Hoy, 20 minutos.');
  assert.equal(line(['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-06']), '1 semana seguida · no la cortes: te faltan 2.');
  assert.equal(line(['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-06', '2026-10-07']), '2 semanas seguidas · no la cortes: te falta 1 sesión.');
  assert.equal(line(['2026-10-05', '2026-10-06']), 'Te falta 1 sesión para tu meta. Hazla hoy.');
  assert.equal(line(['2026-10-05']), '20 minutos. Sin excusas.');
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
  assert.equal(personalize.accentFor(undefined, 'female'), 'magenta');
  assert.equal(personalize.accentFor(undefined, 'male'), 'fire');
  assert.equal(personalize.accentFor('lime', 'female'), 'lime');
  const sets = { female: ['f1', 'f2'], male: ['m1'] };
  assert.equal(personalize.pickPhoto(sets, 'female', 1), 'f2');
  assert.equal(personalize.pickPhoto(sets, 'male', 5), 'm1');
  assert.deepEqual([0, 1].map((seed) => personalize.pickPhoto(sets, 'mixed', seed)), ['m1', 'f1']);
  for (const photo of hero.allHeroPhotos) assert.ok(fs.existsSync(path.join(root, 'public', photo.src)), `falta ${photo.src}`);
  for (const kind of ['home', 'gym', 'cardio', 'mobility']) {
    assert.match(hero.heroPhoto(kind, 0, 'female').alt, /Mujer/);
  }
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
  const loaded = lightOnly.records.filter((record) => record.sets.some((set) => set.load > 0));
  assert.ok(loaded.length > 0, 'usa las mancuernas livianas en algún ejercicio');
  for (const record of loaded) {
    assert.ok(record.sets.every((set) => set.load === 3), 'carga igual a la que tienes');
    const exercise = exercises.find((item) => item.id === record.exerciseId);
    if (record.range) assert.ok(record.range[0] >= exercise.range[0], 'peso liviano: no menos repeticiones');
  }
  const unknown = generator.generateWorkout({ ...base, preference: { location: 'home', equipment: ['dumbbells'] } });
  assert.ok(unknown.records.every((record) => record.sets.every((set) => set.load === 0) && !record.range), 'sin pesos marcados, la rutina queda como antes');
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
  assert.match(text, /Nutrición: 1\.500 kcal · 100 g proteína al día/);
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

const firstWeek = load('src/lib/first-week.ts');

test('primera semana: pasos según el equipo y lo ya hecho', () => {
  const base = { hasPlan: false, hasWorkout: false, hasMeal: false, platform: 'android', standalone: false, push: 'ready', pushEnabled: false };
  const ids = (input) => Array.from(firstWeek.firstWeekSteps(input), (step) => step.id);
  assert.deepEqual(ids(base), ['plan', 'workout', 'meal', 'install', 'push']);
  assert.deepEqual(ids({ ...base, platform: 'desktop' }), ['plan', 'workout', 'meal', 'push'], 'en el computador no se pide instalar');
  assert.deepEqual(ids({ ...base, push: 'unsupported' }), ['plan', 'workout', 'meal', 'install'], 'sin avisos en el navegador, no se piden');
  const iphone = firstWeek.firstWeekSteps({ ...base, platform: 'ios', push: 'needs-install' });
  assert.match(iphone.find((step) => step.id === 'push').detail, /instálala primero/);
  const done = firstWeek.firstWeekSteps({ ...base, hasPlan: true, hasWorkout: true, standalone: true, pushEnabled: true });
  assert.deepEqual(Array.from(done.filter((step) => !step.done), (step) => step.id), ['meal']);
  assert.equal(firstWeek.firstWeekSteps({ ...base, push: 'denied', pushEnabled: true }).find((step) => step.id === 'push').done, false, 'bloqueados después de activarlos: pendiente');
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
