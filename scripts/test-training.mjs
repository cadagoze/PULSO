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
