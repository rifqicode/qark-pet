const test = require('node:test');
const assert = require('node:assert');
const { pickAgent } = require('../integrations/herdr.js');

const A = [
  { pane_id: 'p1', cwd: '/tada/rifqi-daily-report', terminal_title_stripped: 'short', state_change_seq: 5 },
  { pane_id: 'p2', cwd: '/tada/sre-onprem', terminal_title_stripped: 'Improve validate script', state_change_seq: 9 },
  { pane_id: 'p3', cwd: '/home/x/desktop-pet', terminal_title_stripped: '', state_change_seq: 1 },
];

test('matches project dir in text', () => assert.strictEqual(pickAgent(A, 'desktop-pet done ✅').pane_id, 'p3'));
test('matches terminal title in text', () => assert.strictEqual(pickAgent(A, 'x: improve validate script').pane_id, 'p2'));
test('ignores short titles', () => assert.strictEqual(pickAgent(A, 'short').pane_id, 'p2'));
test('no match -> most recent state change', () => assert.strictEqual(pickAgent(A, 'unrelated').pane_id, 'p2'));
test('several matches -> most recent', () => assert.strictEqual(pickAgent(A, 'rifqi-daily-report and sre-onprem').pane_id, 'p2'));
test('empty list -> undefined', () => assert.strictEqual(pickAgent([], 'x'), undefined));
