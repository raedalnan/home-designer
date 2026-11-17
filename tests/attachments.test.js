import test from 'node:test';import assert from 'node:assert/strict';
import {resolveAttachment} from '../src/logic/Attachments.js';
import {buildGrid} from '../src/logic/Grid.js';
const room={width:20,depth:16};
test('wall items stay on the same wall while room dimensions change',()=>{
 const item={id:2,w:2,d:1,height:1,mountDepth:.05,anchor:{type:'wall',wallId:'outer-z-negative',offset:2,height:.8,side:1}};
 const a=resolveAttachment(item,[],[],[],room),b=resolveAttachment(item,[],[],[],{width:24,depth:20});
 assert.equal(a.y,.8);assert.ok(Math.abs((b.x-a.x)+1)<1e-9);assert.ok(Math.abs((b.z-a.z)+1)<1e-9);
});
test('surface decoration follows parent position and rotation',()=>{
 const parent={id:1,w:4,d:2,cellX:5,cellZ:5,height:.75,turns:0};
 const child={id:2,w:1,d:1,anchor:{type:'surface',parentId:1,x:.2,z:0},height:.2};
 const a=resolveAttachment(child,[parent],[],[],room);const b=resolveAttachment(child,[{...parent,cellX:7}],[],[],room);
 assert.equal(a.y,.75);assert.equal(b.x-a.x,1);
 const rotated=resolveAttachment(child,[{...parent,turns:1}],[],[],room);
 assert.ok(Number.isFinite(rotated.z));
});
test('missing supports do not teleport attachments into the room',()=>{
 const child={id:2,w:1,d:1,anchor:{type:'surface',parentId:999,x:0,z:0}};
 assert.equal(resolveAttachment(child,[],[],[],room),null);
});
test('mounted objects and rugs do not occupy exclusive floor cells',()=>{
 const grid=buildGrid([{id:1,w:2,d:2,cellX:0,cellZ:0,placementType:'wall'},{id:2,w:4,d:4,cellX:0,cellZ:0,collisionLayer:'rug'}],20,16);
 assert.ok(grid.every((row)=>row.every((cell)=>cell===0)));
});
