import test from 'node:test';
import assert from 'node:assert/strict';
import { createDesign, readDesignLibrary, writeDesignLibrary } from '../src/logic/LayoutPersistence.js';

test('a saved table uses the corrected model dimensions and keeps its placement and finish', () => {
  const table = { id: 7, definitionId: 'atelier-side-table', sizeId: 'standard',
    cellX: 3, cellZ: 2, turns: 1, w: 2, d: 1, height: 0.8, finishes: { legs: '#abcdef' } };
  const design = { id: 'room', name: 'Room', layout: { objects: [table], roomSize: { width: 15, depth: 10 } } };
  const storage = { getItem: () => JSON.stringify({ activeId: design.id, designs: [design] }) };
  const [savedTable] = readDesignLibrary(storage, null).designs[0].layout.objects;
  assert.ok(savedTable.height > 0.5 && savedTable.height < 0.6);
  assert.equal(savedTable.mountDepth, 0.25);
  assert.deepEqual([savedTable.cellX, savedTable.cellZ, savedTable.turns], [3, 2, 1]);
  assert.deepEqual(savedTable.finishes, table.finishes);
});

test('legacy room and separate wall paint migrate together and survive switching to an empty design', () => {
  const room = { roomSize: { width: 15, depth: 10 }, objects: [{ id: 1 }], openings: [{ id: 'window' }] };
  const finishes = { 'outer-z-negative:0.000:7.500:4': '#ab1234' };
  const data = new Map([
    ['home-designer-layout', JSON.stringify(room)],
    ['home-designer-wall-finishes', JSON.stringify(finishes)],
  ]);
  const storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  const migrated = readDesignLibrary(storage, null).designs[0];
  assert.deepEqual(migrated.layout.wallFinishes, finishes);
  assert.deepEqual(migrated.layout.openings, room.openings);
  const empty = createDesign('Empty room', { roomSize: room.roomSize, objects: [], wallFinishes: {} });
  writeDesignLibrary(storage, { activeId: empty.id, designs: [migrated, empty] });
  const reopened = readDesignLibrary(storage, null);
  assert.equal(reopened.activeId, empty.id);
  assert.deepEqual(reopened.designs[1].layout.objects, []);
  assert.deepEqual(reopened.designs[0].layout.wallFinishes, finishes);
  assert.equal(reopened.designs[0].layout.objects[0].id, 1);
});
