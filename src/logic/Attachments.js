import {CELL} from '../data/Constants.js';
import {getFootprint,cellToWorld} from './Grid.js';
export const isFloor=(item)=>!item.placementType||item.placementType==='floor';
export function removeWithDependents(objects,deleted){
 const removed=new Set(deleted);let changed=true;
 while(changed){changed=false;for(const item of objects)if(item.anchor?.parentId!=null&&removed.has(item.anchor.parentId)&&!removed.has(item.id)){removed.add(item.id);changed=true;}}
 return objects.filter((item)=>!removed.has(item.id));
}
export function resolveAttachment(item,objects,walls,openings,roomSize,seen=new Set()){
 if(seen.has(item.id))return null;seen.add(item.id);
 const footprint=getFootprint(item.turns,item.w,item.d);
 const point=cellToWorld(item.cellX??0,item.cellZ??0,footprint.w,footprint.d,roomSize.width,roomSize.depth);
 const anchor=item.anchor;
 if(!anchor)return {x:point.x,y:0,z:point.z,rotation:(item.turns??0)*Math.PI/2};
 if(anchor.type==='ceiling')return {x:anchor.x-roomSize.width*CELL/2,y:2.5-item.height,z:anchor.z-roomSize.depth*CELL/2,rotation:(item.turns??0)*Math.PI/2};
 if(anchor.type==='surface'){
   const parent=objects.find((entry)=>entry.id===anchor.parentId);if(!parent)return null;
   const base=resolveAttachment(parent,objects,walls,openings,roomSize,seen);if(!base)return null;
   const a=base.rotation;const x=anchor.x*Math.cos(a)+anchor.z*Math.sin(a),z=-anchor.x*Math.sin(a)+anchor.z*Math.cos(a);
   return {x:base.x+x,y:base.y+parent.height,z:base.z+z,rotation:base.rotation+(item.turns??0)*Math.PI/2};
 }
 const opening=anchor.openingId?openings.find((entry)=>entry.id===anchor.openingId):null;
 const id=opening?.wallId??anchor.wallId;
 const wall=walls.find((entry)=>entry.id===id)??({
   'outer-z-negative':{startX:0,endX:roomSize.width,startZ:0,endZ:0},
   'outer-z-positive':{startX:0,endX:roomSize.width,startZ:roomSize.depth,endZ:roomSize.depth},
   'outer-x-negative':{startX:0,endX:0,startZ:0,endZ:roomSize.depth},
   'outer-x-positive':{startX:roomSize.width,endX:roomSize.width,startZ:0,endZ:roomSize.depth},
 }[id]);
 if(!wall)return null;
 const horizontal=wall.startZ===wall.endZ,side=anchor.side??1;
 const offset=opening?.offset??anchor.offset;
 const along=(horizontal?Math.min(wall.startX,wall.endX):Math.min(wall.startZ,wall.endZ))*CELL+offset;
 const fixed=(horizontal?wall.startZ:wall.startX)*CELL+side*((item.mountDepth??.05)+.055);
 return {x:(horizontal?along:fixed)-roomSize.width*CELL/2,y:anchor.height??.8,z:(horizontal?fixed:along)-roomSize.depth*CELL/2,rotation:horizontal?(side===1?0:Math.PI):(side===1?Math.PI/2:-Math.PI/2)};
}
