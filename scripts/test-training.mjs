import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

function load(relativePath) {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', relativePath);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exported = {};
  vm.runInNewContext(source, { exports: exported, require: (name) => {
    if (name === '@/data/mock-data') return load('src/data/mock-data.ts');
    throw new Error(`Unexpected import: ${name}`);
  }});
  return exported;
}
const training = load('src/lib/training.ts');
test('routine converts minute targets to seconds and keeps planned sets unchecked', () => {
  const records = training.defaultRecords();
  assert.equal(records.find((item) => item.exerciseId === 5).sets[0].value, 180);
  assert.equal(records.find((item) => item.exerciseId === 4).sets[0].value, 25);
  assert.equal(training.completedSets(records), 0);
});
test('only checked series contribute to totals and sets are independent', () => {
  const records = training.defaultRecords(true);
  records[0].sets[0].done = true;
  records[0].sets[0].value = 12;
  assert.equal(training.completedSets(records), 1);
  assert.equal(records[0].sets[1].value, 10);
  assert.equal(records.reduce((sum, record) => sum + record.sets.length, 0), 6);
});
test('duration survives reload and excludes paused time', () => {
  assert.equal(training.durationSeconds({elapsedSeconds:30,runningSince:10000}, 25000), 45);
  assert.equal(training.durationSeconds({elapsedSeconds:45,runningSince:null}, 500000), 45);
  assert.equal(training.durationSeconds({elapsedSeconds:45,runningSince:50000}, 40000), 45);
  assert.equal(training.clockLabel(185), '03:05');
});
