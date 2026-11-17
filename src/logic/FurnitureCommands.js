import {configureInstance,definitionOf} from '../data/FurnitureRegistry.js';
import {buildGrid,canPlace,getFootprint} from './Grid.js';
import {objectConflictsWithWalls} from './Walls.js';
export function resizeFurniture(item,sizeId,objects,walls,roomSize) {
 const definition=definitionOf(item);
 if(!definition || !definition.sizes.some((size)=>size.id===sizeId)) return {ok:false,message:'Unknown furniture size.'};
 const candidate=configureInstance(definition,sizeId,item);
 const preset=definition.sizes.find((size)=>size.id===sizeId);
 for(const child of objects.filter((entry)=>entry.anchor?.parentId===item.id)){
   const childDefinition=definitionOf(child),childSize=childDefinition?.sizes.find((size)=>size.id===child.sizeId)??{width:child.w*.5,depth:child.d*.5};
   if(Math.abs(child.anchor.x)+childSize.width/2>preset.width/2 || Math.abs(child.anchor.z)+childSize.depth/2>preset.depth/2 || candidate.height+child.height>2.5)return {ok:false,message:'Move the attached decorations before choosing this size.'};
 }
 const bounds=getFootprint(candidate.turns,candidate.w,candidate.d);
 const grid=buildGrid(objects.filter((entry)=>entry.id!==item.id),roomSize.width,roomSize.depth);
 if(!canPlace(grid,candidate.cellX,candidate.cellZ,bounds.w,bounds.d,undefined,roomSize.width,roomSize.depth)||objectConflictsWithWalls(candidate,walls))return {ok:false,message:'That size does not fit here. Move the item first.'};
 return {ok:true,item:candidate};
}
