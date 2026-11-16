import { CELL } from "../data/Constants.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const getFootprint = (turns = 0, w, d) =>
  turns % 2 === 1 ? { w: d, d: w } : { w, d };

export const snap = (eX, eZ, w, d, roomWidth, roomDepth) => {
  const cornerX = -(roomWidth * CELL) / 2;
  const cornerZ = -(roomDepth * CELL) / 2;
  const cellX = clamp(Math.round((eX - cornerX) / CELL - w / 2), 0, roomWidth - w);
  const cellZ = clamp(Math.round((eZ - cornerZ) / CELL - d / 2), 0, roomDepth - d);
  return {
    x: cornerX + (cellX + w / 2) * CELL,
    z: cornerZ + (cellZ + d / 2) * CELL,
    cellX,
    cellZ,
  };
};

export const cellToWorld = (cellX, cellZ, w, d, roomWidth, roomDepth) => ({
  x: -(roomWidth * CELL) / 2 + (cellX + w / 2) * CELL,
  z: -(roomDepth * CELL) / 2 + (cellZ + d / 2) * CELL,
});

const createGrid = (roomWidth, roomDepth) =>
  Array.from({ length: roomDepth }, () => Array(roomWidth).fill(0));

export const canPlace = (grid, x, z, w, d, id, roomWidth, roomDepth) => {
  if (x < 0 || z < 0 || x + w > roomWidth || z + d > roomDepth) return false;
  for (let row = z; row < z + d; row++) {
    for (let col = x; col < x + w; col++) {
      if (grid[row][col] !== 0 && grid[row][col] !== id) return false;
    }
  }
  return true;
};

export const placeObject = (grid, x, z, w, d, id, roomWidth, roomDepth) => {
  if (!canPlace(grid, x, z, w, d, id, roomWidth, roomDepth)) return false;
  for (let row = z; row < z + d; row++) {
    for (let col = x; col < x + w; col++) grid[row][col] = id;
  }
  return true;
};

export const removeObject = (grid, id) => {
  for (const row of grid) {
    for (let col = 0; col < row.length; col++) if (row[col] === id) row[col] = 0;
  }
};

export const findFreeSpot = (grid, w, d, roomWidth, roomDepth) => {
  for (let z = 0; z <= roomDepth - d; z++) {
    for (let x = 0; x <= roomWidth - w; x++) {
      if (canPlace(grid, x, z, w, d, undefined, roomWidth, roomDepth)) return { cellX: x, cellZ: z };
    }
  }
  return null;
};

export const buildGrid = (objects, roomWidth, roomDepth) => {
  const grid = createGrid(roomWidth, roomDepth);
  for (const obj of objects) {
    const { w, d } = getFootprint(obj.turns, obj.w, obj.d);
    placeObject(grid, obj.cellX, obj.cellZ, w, d, obj.id, roomWidth, roomDepth);
  }
  return grid;
};
