import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayoutHistory, recordLayout, undoLayout, redoLayout } from '../src/logic/LayoutHistory.js';

test('history can undo and redo the three most recent edits', () => {
  let history = createLayoutHistory({ objects: [] });
  for (let count = 1; count <= 4; count++) {
    history = recordLayout(history, { objects: Array.from({ length: count }, (_, id) => ({ id })) });
  }
  for (const count of [3, 2, 1]) {
    history = undoLayout(history);
    assert.equal(history.present.objects.length, count);
  }
  assert.equal(undoLayout(history), history);
  for (const count of [2, 3, 4]) {
    history = redoLayout(history);
    assert.equal(history.present.objects.length, count);
  }
  assert.equal(redoLayout(history), history);
});

test('undo and redo restore a complete edit, and a new edit discards redo', () => {
  const before = { walls: [{ id: 1 }], openings: [{ wallId: 1 }], wallFinishes: { 1: '#ffffff' } };
  const after = { walls: [], openings: [], wallFinishes: {} };
  const history = recordLayout(createLayoutHistory(before), after);
  const undone = undoLayout(history);
  assert.equal(undone.present, before);
  assert.equal(redoLayout(undone).present, after);
  assert.equal(recordLayout(undone, structuredClone(before)), undone);
  const changed = recordLayout(undone, { ...before, wallFinishes: { 1: '#eeeeee' } });
  assert.deepEqual(changed.future, []);
});

test('successive changes from a single slider drag consume one step', () => {
  const start = createLayoutHistory({ roomSize: { width: 15, depth: 10 } });
  const gesture = Symbol();
  const first = recordLayout(start, { roomSize: { width: 16, depth: 10 } }, gesture);
  const last = recordLayout(first, { roomSize: { width: 20, depth: 10 } }, gesture);
  assert.equal(last.past.length, 1);
  assert.equal(undoLayout(last).present, start.present);
  assert.equal(redoLayout(undoLayout(last)).present, last.present);
});
