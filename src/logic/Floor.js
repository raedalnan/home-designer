import { CELL, GRID_SPACING, GRID_SUBDIVISIONS } from '../data/Constants.js';
import { getFootprint, occupancyBounds } from './Grid.js';

export function floorCell(point, room) {
  const index = (value, size) => Math.max(0, Math.min(size * GRID_SUBDIVISIONS - 1,
    Math.floor((value + size * CELL / 2) / GRID_SPACING)));
  return { x: index(point.x, room.width), z: index(point.z, room.depth) };
}

export function selectedFloorKeys({ start, end }) {
  const keys = [];
  for (let z = Math.min(start.z, end.z); z <= Math.max(start.z, end.z); z++) {
    for (let x = Math.min(start.x, end.x); x <= Math.max(start.x, end.x); x++) keys.push(`${x},${z}`);
  }
  return keys;
}

export function connectedFloorKeys(tiles, start) {
  const key = `${start.x},${start.z}`;
  const level = tiles[key]?.level;
  if (!level) return [];
  const seen = new Set([key]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const { x, z } = queue[index];
    for (const cell of [{ x: x - 1, z }, { x: x + 1, z }, { x, z: z - 1 }, { x, z: z + 1 }]) {
      const neighbor = `${cell.x},${cell.z}`;
      if (!seen.has(neighbor) && tiles[neighbor]?.level === level) {
        seen.add(neighbor);
        queue.push(cell);
      }
    }
  }
  return [...seen];
}

export function editFloorTiles(tiles, keys, { color, step }) {
  const next = { ...tiles };
  for (const key of keys) {
    const tile = { ...tiles[key] };
    if (color !== undefined) tile.color = color;
    if (step) tile.level = Math.max(0, Math.min(10, (tile.level ?? 0) + step));
    if (tile.color || tile.level) next[key] = tile;
    else delete next[key];
  }
  return next;
}

export function floorElevation(item, tiles) {
  const { w, d } = getFootprint(item.turns, item.w, item.d);
  const { left, right, top, bottom } = occupancyBounds(item.cellX, item.cellZ, w, d);
  let level = 0;
  for (let row = top; row < bottom; row++) {
    for (let col = left; col < right; col++) {
      level = Math.max(level, tiles[`${col},${row}`]?.level ?? 0);
    }
  }
  return level * GRID_SPACING;
}

export function wallCrossesRaisedFloor(wall, tiles) {
  const { startX, startZ, endX, endZ } = wall;
  const horizontal = startZ === endZ;
  const seam = Math.round((horizontal ? startZ : startX) * GRID_SUBDIVISIONS);
  const start = Math.round((horizontal ? startX : startZ) * GRID_SUBDIVISIONS);
  const end = Math.round((horizontal ? endX : endZ) * GRID_SUBDIVISIONS);

  // Walls snap to tile edges. A seam inside raised flooring has raised tiles on both sides.
  for (let cell = Math.min(start, end); cell < Math.max(start, end); cell++) {
    const before = horizontal ? `${cell},${seam - 1}` : `${seam - 1},${cell}`;
    const after = horizontal ? `${cell},${seam}` : `${seam},${cell}`;
    if (tiles[before]?.level > 0 && tiles[after]?.level > 0) return true;
  }
  return false;
}
