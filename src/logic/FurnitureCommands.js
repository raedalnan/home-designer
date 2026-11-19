import { CELL } from '../data/Constants.js';
import {configureInstance,definitionOf} from '../data/FurnitureRegistry.js';
import {buildGrid,canPlace,getFootprint} from './Grid.js';
import {objectConflictsWithWalls} from './Walls.js';
export function resizeFurniture(item,sizeId,objects,walls,roomSize) {
 const definition=definitionOf(item);
 if(!definition || !definition.sizes.some((size)=>size.id===sizeId)) return {ok:false,message:'Unknown furniture size.'};
 const candidate=configureInstance(definition,sizeId,item);
 const preset=definition.sizes.find((size)=>size.id===sizeId);
 for(const child of objects.filter((entry)=>entry.anchor?.parentId===item.id)){
   const childSize = physicalSize(child);
   const bounds = getFootprint(child.turns, childSize.w, childSize.d);
   if(Math.abs(child.anchor.x)+bounds.w/2>preset.width/2 || Math.abs(child.anchor.z)+bounds.d/2>preset.depth/2 || candidate.height+child.height>2.5)return {ok:false,message:'Move the attached decorations before choosing this size.'};
 }
 const bounds=getFootprint(candidate.turns,candidate.w,candidate.d);
 const grid=buildGrid(objects.filter((entry)=>entry.id!==item.id),roomSize.width,roomSize.depth);
 if(!canPlace(grid,candidate.cellX,candidate.cellZ,bounds.w,bounds.d,undefined,roomSize.width,roomSize.depth)||objectConflictsWithWalls(candidate,walls))return {ok:false,message:'That size does not fit here. Move the item first.'};
 return {ok:true,item:candidate};
}

export function rotationDegrees(turns = 0) {
  return ((Math.round(turns * 90) % 360) + 360) % 360;
}

function physicalSize(item) {
  const preset = definitionOf(item)?.sizes.find((size) => size.id === item.sizeId);
  return { w: preset?.width ?? item.w * CELL, d: preset?.depth ?? item.d * CELL };
}

export function rotateFurniture(item, degrees, objects, walls, roomSize) {
  const turns = rotationDegrees((item.turns ?? 0) + degrees / 90) / 90;
  const candidate = { ...item, turns };
  if (item.anchor?.type === 'wall') {
    return { ok: false, message: 'Wall-mounted items follow the wall.' };
  }
  if (item.anchor?.type === 'surface') {
    const parent = objects.find((entry) => entry.id === item.anchor.parentId);
    if (!parent) return { ok: false, message: 'The supporting furniture is missing.' };
    const child = physicalSize(item);
    const support = physicalSize(parent);
    const bounds = getFootprint(turns, child.w, child.d);
    if (Math.abs(item.anchor.x) + bounds.w / 2 > support.w / 2 + 1e-9
      || Math.abs(item.anchor.z) + bounds.d / 2 > support.d / 2 + 1e-9) {
      return { ok: false, message: 'Move the item further onto its support to rotate it.' };
    }
  }
  if (item.anchor) return { ok: true, item: candidate };

  const before = getFootprint(item.turns, item.w, item.d);
  const after = getFootprint(turns, item.w, item.d);
  const centerX = item.cellX + before.w / 2;
  const centerZ = item.cellZ + before.d / 2;
  // Snap away only floating-point noise so repeated turns preserve the center.
  const clean = (coordinate) => Math.round(coordinate * 1e12) / 1e12;
  candidate.cellX = clean(centerX - after.w / 2);
  candidate.cellZ = clean(centerZ - after.d / 2);
  const grid = buildGrid(objects.filter((entry) => entry.id !== item.id), roomSize.width, roomSize.depth);
  const roomFits = candidate.cellX >= 0 && candidate.cellZ >= 0
    && candidate.cellX + after.w <= roomSize.width + 1e-9 && candidate.cellZ + after.d <= roomSize.depth + 1e-9;
  if (!roomFits || (candidate.collisionLayer !== 'rug'
    && !canPlace(grid, candidate.cellX, candidate.cellZ, after.w, after.d, undefined, roomSize.width, roomSize.depth))
    || objectConflictsWithWalls(candidate, walls)) {
    return { ok: false, message: 'This angle needs more space. Move the item and try again.' };
  }
  return { ok: true, item: candidate };
}
