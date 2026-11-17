import test from 'node:test';
import assert from 'node:assert/strict';
import {definitionOf,configureInstance} from '../src/data/FurnitureRegistry.js';
import {resizeFurniture} from '../src/logic/FurnitureCommands.js';
import {readLayout} from '../src/logic/LayoutPersistence.js';
const bed=definitionOf({id:'studio-bed'});
test('blocked size changes do not modify the original instance',()=>{
 const item=configureInstance(bed,'single',{id:1,cellX:0,cellZ:0,turns:0});const original=structuredClone(item);
 const result=resizeFurniture(item,'king',[item,{id:2,cellX:2,cellZ:0,w:2,d:4}],[],{width:15,depth:10});
 assert.equal(result.ok,false);assert.deepEqual(item,original);
});
test('resizing checks rotated bounds and walls',()=>{
 const item=configureInstance(bed,'single',{id:1,cellX:0,cellZ:0,turns:1});
 assert.equal(resizeFurniture(item,'king',[item],[],{width:15,depth:10}).ok,true);
 assert.equal(resizeFurniture(item,'king',[item],[{startX:0,endX:5,startZ:3,endZ:3}],{width:15,depth:10}).ok,false);
});
test('instance finishes are independent and survive size changes',()=>{
 const a=configureInstance(bed,'single',{id:1}),b=configureInstance(bed,'single',{id:2});a.finishes.frame='#123456';
 assert.notEqual(a.finishes.frame,b.finishes.frame);assert.equal(configureInstance(bed,'king',a).finishes.frame,'#123456');
});
test('shrinking a support preserves decorations that would no longer fit',()=>{
 const item=configureInstance(bed,'king',{id:1,cellX:0,cellZ:0,turns:0});
 const decoration={id:2,placementType:'surface',w:1,d:1,height:.2,anchor:{type:'surface',parentId:1,x:.65,z:0}};
 const original=structuredClone(item);
 const result=resizeFurniture(item,'single',[item,decoration],[],{width:15,depth:10});
 assert.equal(result.ok,false);assert.match(result.message,/attached decorations/);assert.deepEqual(item,original);
});
test('loading preserves transforms, new metadata, unknown objects and walls',()=>{
 const saved={objects:[{id:1,node:'unknown',w:7,d:3,cellX:5,cellZ:2,turns:1,custom:'retain'}],walls:[{id:'wall'}],roomSize:{width:15,depth:10},layoutVersion:2};
 const values=new Map([['home-designer-layout',JSON.stringify(saved)]]);const storage={getItem:(key)=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 const loaded=readLayout(storage);assert.deepEqual(loaded.walls,saved.walls);assert.equal(loaded.objects[0].cellX,5);assert.equal(loaded.objects[0].custom,'retain');assert.equal(values.get('home-designer-layout-before-studio'),JSON.stringify(saved));
 storage.setItem=()=>{throw Error('quota');};values.delete('home-designer-layout-before-studio');assert.equal(readLayout(storage).objects[0].node,'unknown');
});
