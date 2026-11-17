import test from 'node:test';
import assert from 'node:assert/strict';
import {CELL, GRID_SPACING} from '../src/data/Constants.js';
import {buildGrid, canPlace, cellToWorld, findFreeSpot, getFootprint, placeObject, removeObject, snap} from '../src/logic/Grid.js';
import {objectConflictsWithWalls} from '../src/logic/Walls.js';
import {readLayout} from '../src/logic/LayoutPersistence.js';

const room = {width:15, depth:10};
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-9, `${a} should equal ${b}`);

test('movement has three steps per old cell without changing dimensions or saved world positions',()=>{
  const item={cellX:5,cellZ:2,w:4,d:3};
  const original=cellToWorld(item.cellX,item.cellZ,item.w,item.d,room.width,room.depth);
  const next=snap(original.x+GRID_SPACING,original.z,item.w,item.d,room.width,room.depth);
  near(next.x-original.x,CELL/3);
  near(next.cellX,item.cellX+1/3);
  near(next.cellZ,item.cellZ);
  near(item.w*CELL,2);
  near(item.d*CELL,1.5);
  near(original.x,-.25);
  near(original.z,-.75);
});

test('fine-grid collisions allow shared edges but reject a single subcell overlap',()=>{
  const grid=buildGrid([{id:1,cellX:1/3,cellZ:2/3,w:2,d:2}],room.width,room.depth);
  assert.equal(grid.length,30);
  assert.equal(grid[0].length,45);
  assert.equal(canPlace(grid,7/3,2/3,2,2,undefined,room.width,room.depth),true);
  assert.equal(canPlace(grid,2,2/3,2,2,undefined,room.width,room.depth),false);
  assert.equal(canPlace(grid,1/3,2/3,2,2,1,room.width,room.depth),true);
  removeObject(grid,1);
  assert.equal(placeObject(grid,2/3,1/3,2,2,2,room.width,room.depth),true);
  assert.equal(canPlace(grid,1/3,1/3,2,2,undefined,room.width,room.depth),false);
});

test('rotation, boundary snapping and automatic placement use the finer grid',()=>{
  const footprint=getFootprint(1,4,2);
  const edge=snap(100,-100,footprint.w,footprint.d,room.width,room.depth);
  assert.equal(edge.cellX,13);
  assert.equal(edge.cellZ,0);
  const grid=buildGrid([{id:1,cellX:0,cellZ:0,w:1/3,d:10}],15,10);
  near(findFreeSpot(grid,2,2,15,10).cellX,1/3);
  assert.equal(objectConflictsWithWalls({cellX:1/3,cellZ:0,w:2,d:2,turns:0},[{startX:2,endX:2,startZ:0,endZ:3}]),true);
  assert.equal(objectConflictsWithWalls({cellX:5/3,cellZ:0,w:2,d:2,turns:0},[{startX:11/3,endX:11/3,startZ:0,endZ:3}]),false);
});

test('fractional positions round-trip without migrating or scaling old room data',()=>{
  const saved={objects:[{id:1,cellX:1/3,cellZ:2/3,w:4,d:3}],roomSize:room,walls:[{startX:2,startZ:0,endX:2,endZ:5}]};
  const storage={getItem:key=>key==='home-designer-layout'?JSON.stringify(saved):null,setItem:()=>{}};
  const loaded=readLayout(storage);
  assert.deepEqual(loaded.roomSize,room);
  assert.equal(loaded.objects[0].cellX,1/3);
  assert.equal(loaded.objects[0].w,4);
  assert.deepEqual(loaded.walls,saved.walls);
});
