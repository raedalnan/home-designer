import { getFootprint } from "./Grid.js";

// Third-cell coordinates can differ by machine precision at touching edges.
const EPSILON = 1e-9;
const betweenStrict = (value, a, b) => value > Math.min(a, b) + EPSILON && value < Math.max(a, b) - EPSILON;
const rangesOverlap = (a1, a2, b1, b2) => Math.max(Math.min(a1, a2), Math.min(b1, b2)) < Math.min(Math.max(a1, a2), Math.max(b1, b2)) - EPSILON;

export function wallsConflict(a, b) {
  const aHorizontal = a.startZ === a.endZ;
  const bHorizontal = b.startZ === b.endZ;

  if (aHorizontal === bHorizontal) {
    const sameLine = aHorizontal ? a.startZ === b.startZ : a.startX === b.startX;
    if (!sameLine) return false;
    return aHorizontal
      ? rangesOverlap(a.startX, a.endX, b.startX, b.endX)
      : rangesOverlap(a.startZ, a.endZ, b.startZ, b.endZ);
  }

  const horizontal = aHorizontal ? a : b;
  const vertical = aHorizontal ? b : a;
  return betweenStrict(vertical.startX, horizontal.startX, horizontal.endX)
    && betweenStrict(horizontal.startZ, vertical.startZ, vertical.endZ);
}

export function wallConflictsWithObject(wall, object) {
  if(object.placementType && object.placementType!=='floor')return false;
  const footprint = getFootprint(object.turns, object.w, object.d);
  const left = object.cellX;
  const right = object.cellX + footprint.w;
  const top = object.cellZ;
  const bottom = object.cellZ + footprint.d;
  const horizontal = wall.startZ === wall.endZ;

  if (horizontal) {
    return betweenStrict(wall.startZ, top, bottom)
      && rangesOverlap(wall.startX, wall.endX, left, right);
  }
  return betweenStrict(wall.startX, left, right)
    && rangesOverlap(wall.startZ, wall.endZ, top, bottom);
}

export function objectConflictsWithWalls(object, walls) {
  if(object.placementType && object.placementType!=='floor')return false;
  return walls.some((wall) => wallConflictsWithObject(wall, object));
}
