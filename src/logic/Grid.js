import { CELL, GRID_SUBDIVISIONS } from "../data/Constants.js";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const snapCoordinate = (value) => Math.round(value * GRID_SUBDIVISIONS) / GRID_SUBDIVISIONS;

export function getFootprint(turns = 0, w, d) {
  if (Number.isInteger(turns)) return Math.abs(turns % 2) === 1 ? { w: d, d: w } : { w, d };

  const radians = turns * Math.PI / 2;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  return { w: w * cosine + d * sine, d: w * sine + d * cosine };
}

export const snap = (eX, eZ, w, d, roomWidth, roomDepth) => {
  const cornerX = -(roomWidth * CELL) / 2;
  const cornerZ = -(roomDepth * CELL) / 2;
  const cellX = clamp(snapCoordinate((eX - cornerX) / CELL - w / 2), 0, roomWidth - w);
  const cellZ = clamp(snapCoordinate((eZ - cornerZ) / CELL - d / 2), 0, roomDepth - d);
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
  Array.from({ length: roomDepth * GRID_SUBDIVISIONS }, () => Array(roomWidth * GRID_SUBDIVISIONS).fill(0));

// Convert footprints to fine occupancy cells, avoiding rounding at shared edges.
export const occupancyBounds = (x, z, w, d) => ({
  left: Math.floor(x * GRID_SUBDIVISIONS + 1e-9),
  right: Math.ceil((x + w) * GRID_SUBDIVISIONS - 1e-9),
  top: Math.floor(z * GRID_SUBDIVISIONS + 1e-9),
  bottom: Math.ceil((z + d) * GRID_SUBDIVISIONS - 1e-9),
});

export const canPlace = (grid, x, z, w, d, id, roomWidth, roomDepth) => {
  if (x < 0 || z < 0 || x + w > roomWidth || z + d > roomDepth) return false;
  const bounds = occupancyBounds(x, z, w, d);
  for (let row = bounds.top; row < bounds.bottom; row++) {
    for (let col = bounds.left; col < bounds.right; col++) {
      if (grid[row][col] !== 0 && grid[row][col] !== id) return false;
    }
  }
  return true;
};

export const placeObject = (grid, x, z, w, d, id, roomWidth, roomDepth) => {
  if (!canPlace(grid, x, z, w, d, id, roomWidth, roomDepth)) return false;
  const bounds = occupancyBounds(x, z, w, d);
  for (let row = bounds.top; row < bounds.bottom; row++) {
    for (let col = bounds.left; col < bounds.right; col++) grid[row][col] = id;
  }
  return true;
};

export const removeObject = (grid, id) => {
  for (const row of grid) {
    for (let col = 0; col < row.length; col++) if (row[col] === id) row[col] = 0;
  }
};

export const findFreeSpot = (grid, w, d, roomWidth, roomDepth) => {
  for (let row = 0; row <= Math.round((roomDepth - d) * GRID_SUBDIVISIONS); row++) {
    for (let col = 0; col <= Math.round((roomWidth - w) * GRID_SUBDIVISIONS); col++) {
      const x = col / GRID_SUBDIVISIONS, z = row / GRID_SUBDIVISIONS;
      if (canPlace(grid, x, z, w, d, undefined, roomWidth, roomDepth)) return { cellX: x, cellZ: z };
    }
  }
  return null;
};

export const buildGrid = (objects, roomWidth, roomDepth) => {
  const grid = createGrid(roomWidth, roomDepth);
  for (const obj of objects) {
    if ((obj.placementType && obj.placementType !== 'floor') || obj.collisionLayer === 'rug') continue;
    const { w, d } = getFootprint(obj.turns, obj.w, obj.d);
    placeObject(grid, obj.cellX, obj.cellZ, w, d, obj.id, roomWidth, roomDepth);
  }
  return grid;
};
