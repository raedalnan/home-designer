import test from 'node:test';
import assert from 'node:assert/strict';
import { GRID_SPACING } from '../src/data/Constants.js';
import { connectedFloorKeys, editFloorTiles, floorCell, floorElevation, selectedFloorKeys, wallCrossesRaisedFloor } from '../src/logic/Floor.js';

test('raised area selection follows shared edges at the same elevation', () => {
  const tiles = {
    '0,0': { level: 2, color: '#000000' },
    '1,0': { level: 2, color: '#ffffff' },
    '1,1': { level: 2 },
    '0,1': { level: 1 },
    '2,2': { level: 2 },
    '2,1': { color: '#ffffff' },
  };
  assert.deepEqual(connectedFloorKeys(tiles, { x: 0, z: 0 }), ['0,0', '1,0', '1,1']);
  assert.deepEqual(connectedFloorKeys(tiles, { x: 2, z: 1 }), []);
});

test('floor selection uses fine grid coordinates in either direction', () => {
  const room = { width: 15, depth: 10 };
  assert.deepEqual(floorCell({ x: 3.75, z: 2.5 }, room), { x: 44, z: 29 });
  assert.deepEqual(selectedFloorKeys({ start: { x: 2, z: 1 }, end: { x: 1, z: 0 } }),
    ['1,0', '2,0', '1,1', '2,1']);
});

test('paint resets to the base finish independently of clamped height', () => {
  const keys = ['1,0'];
  const raised = editFloorTiles({ '0,0': { color: '#abcdef' } }, keys, { color: '#123456', step: 11 });
  const resetPaint = editFloorTiles(raised, keys, { color: null });
  assert.equal(resetPaint['1,0'].level, 10);
  assert.equal(floorElevation({ cellX: 0, cellZ: 0, w: 1, d: 1 }, resetPaint), 10 * GRID_SPACING);
  assert.deepEqual(editFloorTiles(resetPaint, keys, { step: -11 }), { '0,0': { color: '#abcdef' } });
});

test('walls cannot run through a raised area in either direction', () => {
  const tiles = {
    '0,0': { level: 1 }, '1,0': { level: 2 },
    '0,1': { level: 1 }, '1,1': { level: 2 },
    '2,0': { color: '#abcdef' },
  };
  assert.equal(wallCrossesRaisedFloor({ startX: 1, endX: 0, startZ: 1 / 3, endZ: 1 / 3 }, tiles), true);
  assert.equal(wallCrossesRaisedFloor({ startX: 1 / 3, endX: 1 / 3, startZ: 0, endZ: 1 }, tiles), true);
  assert.equal(wallCrossesRaisedFloor({ startX: 0, endX: 1, startZ: 0, endZ: 0 }, tiles), false);
  assert.equal(wallCrossesRaisedFloor({ startX: 2 / 3, endX: 2 / 3, startZ: 0, endZ: 1 }, tiles), false);
  assert.equal(wallCrossesRaisedFloor({ startX: 1, endX: 2 / 3, startZ: 1 / 3, endZ: 1 / 3 }, tiles), false);
});
