const test = require('node:test');
const assert = require('node:assert');
const { overlap, bestSpot, advancePomo, detectAppCategory, evaluateClutter, evaluateAppMode, evaluateMedia, getPeekSpot, getUnpeekSpot } = require('../src/lib/logic.js');

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

test('detectAppCategory: categorizes classes accurately', () => {
  assert.strictEqual(detectAppCategory('code'), 'code');
  assert.strictEqual(detectAppCategory('Google-chrome'), 'browser');
  assert.strictEqual(detectAppCategory('kitty'), 'code');
  assert.strictEqual(detectAppCategory('figma-linux'), 'design');
  assert.strictEqual(detectAppCategory('slack'), 'chat');
  assert.strictEqual(detectAppCategory('calculator'), 'other');
});

test('evaluateClutter: alerts on high tab count and respects cooldown', () => {
  const tracker = { lastAlert: 0, lastCount: 0 };
  const ev1 = evaluateClutter({ tabs: 24, windows: 5 }, tracker, 1000, 20 * MIN);
  assert.ok(ev1);
  assert.match(ev1.msg, /24 browser tabs/);

  // During cooldown: no new alert
  const ev2 = evaluateClutter({ tabs: 30, windows: 8 }, tracker, 1000 + 5 * MIN, 20 * MIN);
  assert.strictEqual(ev2, null);

  // After cooldown: alerts again
  const ev3 = evaluateClutter({ tabs: 10, windows: 15 }, tracker, 1000 + 21 * MIN, 20 * MIN);
  assert.ok(ev3);
  assert.match(ev3.msg, /15 windows/);
});

test('evaluateAppMode: triggers coding streak nudge after threshold', () => {
  const tracker = { category: '', start: 0, lastNudge: 0 };
  // Initial switch to code
  const ev0 = evaluateAppMode({ cls: 'code' }, tracker, 1000, 45 * MIN);
  assert.strictEqual(ev0, null);
  assert.strictEqual(tracker.category, 'code');

  // Before 45 mins: null
  const ev1 = evaluateAppMode({ cls: 'code' }, tracker, 1000 + 30 * MIN, 45 * MIN);
  assert.strictEqual(ev1, null);

  // At 45 mins: triggers
  const ev2 = evaluateAppMode({ cls: 'code' }, tracker, 1000 + 45 * MIN, 45 * MIN);
  assert.ok(ev2);
  assert.match(ev2.msg, /Coding streak/);
});

test('evaluateMedia: tracks playback and notifies on new track', () => {
  const tracker = { lastTrack: '', lastNudge: 0 };
  const stopped = evaluateMedia({ status: 'Stopped' }, tracker, 1000);
  assert.strictEqual(stopped.isPlaying, false);
  assert.strictEqual(stopped.event, null);

  const playing = evaluateMedia({ status: 'Playing', title: 'Song A', artist: 'Artist B' }, tracker, 1000, 3 * MIN);
  assert.strictEqual(playing.isPlaying, true);
  assert.ok(playing.event);
  assert.match(playing.event.msg, /Song A/);

  // Same track: no alert
  const same = evaluateMedia({ status: 'Playing', title: 'Song A', artist: 'Artist B' }, tracker, 1000 + 1 * MIN, 3 * MIN);
  assert.strictEqual(same.isPlaying, true);
  assert.strictEqual(same.event, null);
});

test('getPeekSpot: chooses closest edge and appropriate facing direction', () => {
  const minXVal = -270;
  const maxXVal = 1550;
  const floorYVal = 870;

  // Closer to left edge
  const left = getPeekSpot(-200, minXVal, maxXVal, floorYVal);
  assert.strictEqual(left.side, 'left');
  assert.strictEqual(left.dir, 1);
  assert.strictEqual(left.x, minXVal);
  assert.strictEqual(left.y, floorYVal);

  // Closer to right edge
  const right = getPeekSpot(1400, minXVal, maxXVal, floorYVal);
  assert.strictEqual(right.side, 'right');
  assert.strictEqual(right.dir, -1);
  assert.strictEqual(right.x, maxXVal);
  assert.strictEqual(right.y, floorYVal);
});

test('getUnpeekSpot: returns position inside desktop bounds', () => {
  const minXVal = -270;
  const maxXVal = 1550;
  const floorYVal = 870;

  const backLeft = getUnpeekSpot(minXVal - 45, minXVal, maxXVal, floorYVal, 80);
  assert.strictEqual(backLeft.x, minXVal + 80);
  assert.strictEqual(backLeft.y, floorYVal);

  const backRight = getUnpeekSpot(maxXVal + 45, minXVal, maxXVal, floorYVal, 80);
  assert.strictEqual(backRight.x, maxXVal - 80);
  assert.strictEqual(backRight.y, floorYVal);
});
