const test = require('node:test');
const assert = require('node:assert');
const { overlap, bestSpot, advancePomo } = require('../src/lib/logic.js');

const CFG = { work: 25, brk: 5, long: 15, rounds: 4 };
const MIN = 60000;

test('overlap: area of intersection, 0 when apart or touching', () => {
  assert.strictEqual(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 }), 25);
  assert.strictEqual(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }), 0);
  assert.strictEqual(overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 50, y: 50, w: 5, h: 5 }), 0);
});

test('bestSpot: prefers uncovered candidate over nearer covered one', () => {
  const score = (x) => (x < 100 ? 10000 : 0);
  const b = bestSpot([[0, 0], [500, 0]], score, 0, 0, () => 0);
  assert.strictEqual(b.x, 500);
});

test('bestSpot: ties broken by distance', () => {
  const b = bestSpot([[100, 0], [900, 0]], () => 0, 0, 0, () => 0);
  assert.strictEqual(b.x, 100);
});

test('pomo: no change before end', () => {
  const p = { phase: 'work', round: 1, end: 1000 };
  assert.strictEqual(advancePomo(p, 999, CFG), null);
  assert.deepStrictEqual(p, { phase: 'work', round: 1, end: 1000 });
});

test('pomo: work -> short break', () => {
  const p = { phase: 'work', round: 1, end: 0 };
  const ev = advancePomo(p, 100, CFG);
  assert.strictEqual(p.phase, 'break');
  assert.strictEqual(p.end, 100 + 5 * MIN);
  assert.strictEqual(ev.mood, 'alert');
});

test('pomo: round 4 work -> long break, then round resets to 1', () => {
  const p = { phase: 'work', round: 4, end: 0 };
  advancePomo(p, 0, CFG);
  assert.strictEqual(p.phase, 'long');
  assert.strictEqual(p.end, 15 * MIN);
  advancePomo(p, 15 * MIN, CFG);
  assert.deepStrictEqual([p.phase, p.round], ['work', 1]);
});

test('pomo: break -> next work round', () => {
  const p = { phase: 'break', round: 2, end: 0 };
  const ev = advancePomo(p, 0, CFG);
  assert.deepStrictEqual([p.phase, p.round, p.end], ['work', 3, 25 * MIN]);
  assert.strictEqual(ev.mood, 'happy');
});
