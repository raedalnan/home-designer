import test from 'node:test';
import assert from 'node:assert/strict';
import { aimedDoor, canWalkTo, createWalkWorld, findWalkStart, floorHeight } from '../src/logic/Walkthrough.js';

const room = { width: 12, depth: 12 };
const wall = { id: 'partition', startX: 0, startZ: 6, endX: 12, endZ: 6 };
const door = { id: 'door', wallId: wall.id, type: 'door', width: 1, height: 2.1, offset: 3 };

test('walkers pass only through an open door with enough body clearance', () => {
  const closed = createWalkWorld(room, [wall], [door], [], {});
  const open = createWalkWorld(room, [wall], [{ ...door, isOpen: true }], [], {});
  assert.equal(canWalkTo(closed, 0, 0, 0), false);
  assert.equal(canWalkTo(open, 0, 0, 0), true);
  assert.equal(canWalkTo(open, 0.42, 0, 0), false);
  assert.equal(canWalkTo(open, 3, -1, 0), false);
});

test('walking steps up and down one fine cell and rejects taller ledges', () => {
  const world = createWalkWorld(room, [], [], [], { '18,18': { level: 1 }, '19,18': { level: 3 } });
  const low = floorHeight(world, 0.08, 0.08);
  assert.equal(canWalkTo(world, 0.08, 0.08, 0), true);
  assert.equal(canWalkTo(world, -0.08, 0.08, low), true);
  assert.equal(canWalkTo(world, 0.25, 0.08, low), false);
});

test('the spawn point avoids furniture and solid walls occlude door targeting', () => {
  const furniture = { cellX: 5, cellZ: 5, w: 2, d: 2, height: 1 };
  const world = createWalkWorld(room, [wall], [door], [furniture], {});
  const spawn = findWalkStart(world);
  assert.ok(spawn && canWalkTo(world, spawn.x, spawn.z, 0));
  assert.equal(aimedDoor(world, { x: 0, y: 1.55, z: 2 }, { x: 0, y: 0, z: -1 }).opening.id, door.id);
  const blocked = createWalkWorld(room, [wall, { ...wall, id: 'block', startZ: 8, endZ: 8 }], [door], [], {});
  assert.equal(aimedDoor(blocked, { x: 0, y: 1.55, z: 2 }, { x: 0, y: 0, z: -1 }), null);
});
