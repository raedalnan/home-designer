import { CELL, WIDTH_CELLS, DEPTH_CELLS } from "../data/Constants";
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
export const snap = (eX, eZ, w, d) => {
  const widthM = WIDTH_CELLS * CELL;
  const depthM = DEPTH_CELLS * CELL;
  const cornerX = -widthM / 2;
  const cornerZ = -depthM / 2;
  const wC = w / CELL;
  const dC = d / CELL;

  let cellX = eX - cornerX;
  cellX = cellX / CELL;
  cellX = cellX - wC / 2;

  cellX = clamp(Math.round(cellX), 0, WIDTH_CELLS - wC);

  let cellZ = eZ - cornerZ;
  cellZ = cellZ / CELL;
  cellZ = cellZ - dC / 2;

  cellZ = clamp(Math.round(cellZ), 0, DEPTH_CELLS - dC);

  let x = cellX + wC / 2;
  x = x * CELL;
  x = x + cornerX;
  let z = cellZ + dC / 2;
  z = z * CELL;
  z = z + cornerZ;

  return { x, z };
};
