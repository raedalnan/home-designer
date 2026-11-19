import { CELL, GRID_SPACING } from '../data/Constants.js';
import { floorCell, floorElevation } from './Floor.js';
import { cellToWorld, getFootprint } from './Grid.js';

export const EYE_HEIGHT = 1.55;
export const PLAYER_RADIUS = 0.17;
const BODY_HEIGHT = 1.72;
const MAX_STEP = 0.21;
const WALL_HEIGHT = 2.5;
const WALL_PADDING = PLAYER_RADIUS + 0.05;

export function createWalkWorld(room, walls, openings, objects, tiles) {
  const wallSegments = walls.map((wall) => {
    const alongX = wall.startZ === wall.endZ;
    const offset = alongX ? room.width * CELL / 2 : room.depth * CELL / 2;
    const start = Math.min(alongX ? wall.startX : wall.startZ, alongX ? wall.endX : wall.endZ) * CELL - offset;
    const end = Math.max(alongX ? wall.startX : wall.startZ, alongX ? wall.endX : wall.endZ) * CELL - offset;
    const fixed = alongX ? (wall.startZ - room.depth / 2) * CELL : (wall.startX - room.width / 2) * CELL;
    return { alongX, start, end, fixed, openings: openings.filter((opening) => opening.wallId === wall.id) };
  });
  const furniture = objects.filter((item) => !item.anchor && item.collisionLayer !== 'rug').map((item) => {
    const { w, d } = getFootprint(item.turns, item.w, item.d);
    return {
      ...cellToWorld(item.cellX, item.cellZ, w, d, room.width, room.depth),
      halfWidth: w * CELL / 2, halfDepth: d * CELL / 2,
      bottom: floorElevation(item, tiles), height: item.height ?? 1,
    };
  });
  return { room, tiles, walls: wallSegments, furniture };
}

export function floorHeight(world, x, z) {
  const cell = floorCell({ x, z }, world.room);
  return (world.tiles[`${cell.x},${cell.z}`]?.level ?? 0) * GRID_SPACING;
}

function insideOpening(wall, opening, along, padding) {
  const center = wall.start + opening.offset;
  return Math.abs(along - center) <= opening.width / 2 - padding;
}

export function canWalkTo(world, x, z, previousHeight) {
  if (Math.abs(x) > world.room.width * CELL / 2 - PLAYER_RADIUS ||
      Math.abs(z) > world.room.depth * CELL / 2 - PLAYER_RADIUS) return false;
  const feet = floorHeight(world, x, z);
  if (Math.abs(feet - previousHeight) > MAX_STEP || feet + BODY_HEIGHT > WALL_HEIGHT) return false;
  for (const wall of world.walls) {
    const along = wall.alongX ? x : z;
    const across = wall.alongX ? z : x;
    if (Math.abs(across - wall.fixed) >= WALL_PADDING || along < wall.start - PLAYER_RADIUS || along > wall.end + PLAYER_RADIUS) continue;
    const passable = wall.openings.some((opening) => {
      const sill = opening.sillHeight ?? 0;
      return (opening.type === 'archway' || (opening.type === 'door' && opening.isOpen)) &&
        sill <= feet + 0.015 && sill + opening.height >= feet + BODY_HEIGHT &&
        insideOpening(wall, opening, along, PLAYER_RADIUS);
    });
    if (!passable) return false;
  }
  return !world.furniture.some((item) =>
    item.bottom + item.height > feet && item.bottom < feet + BODY_HEIGHT &&
    Math.abs(x - item.x) < item.halfWidth + PLAYER_RADIUS &&
    Math.abs(z - item.z) < item.halfDepth + PLAYER_RADIUS);
}

export function findWalkStart(world) {
  if (canWalkTo(world, 0, 0, floorHeight(world, 0, 0))) return { x: 0, z: 0 };
  let best = null;
  let nearest = Infinity;
  for (let z = -world.room.depth * CELL / 2 + 0.25; z < world.room.depth * CELL / 2; z += 0.25) {
    for (let x = -world.room.width * CELL / 2 + 0.25; x < world.room.width * CELL / 2; x += 0.25) {
      const distance = x * x + z * z;
      if (distance < nearest && canWalkTo(world, x, z, floorHeight(world, x, z))) {
        best = { x, z };
        nearest = distance;
      }
    }
  }
  return best;
}

export function aimedDoor(world, origin, direction, range = 2.3) {
  let nearest = range;
  let target = null;
  for (const wall of world.walls) {
    const velocity = wall.alongX ? direction.z : direction.x;
    if (Math.abs(velocity) < 1e-6) continue;
    const distance = (wall.fixed - (wall.alongX ? origin.z : origin.x)) / velocity;
    if (distance <= 0 || distance >= nearest) continue;
    const along = wall.alongX ? origin.x + direction.x * distance : origin.z + direction.z * distance;
    const y = origin.y + direction.y * distance;
    if (along < wall.start || along > wall.end || y < 0 || y > WALL_HEIGHT) continue;
    const opening = wall.openings.find((entry) => {
      const sill = entry.sillHeight ?? 0;
      return insideOpening(wall, entry, along, 0) && y >= sill && y <= sill + entry.height;
    });
    if (opening?.type === 'archway') continue;
    nearest = distance;
    target = opening?.type === 'door' ? { opening, distance } : null;
  }
  return target;
}
