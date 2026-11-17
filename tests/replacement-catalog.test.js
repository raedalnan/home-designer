import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {REPLACEMENT_CATALOG} from '../src/data/ReplacementCatalog.js';
import {configureInstance} from '../src/data/FurnitureRegistry.js';
const requested=JSON.parse(fs.readFileSync(new URL('../assets-source/furniture/requested-items.json',import.meta.url)));
test('every requested entry has a model and actual rendered thumbnail',()=>{
 assert.equal(REPLACEMENT_CATALOG.length,480);assert.equal(new Set(REPLACEMENT_CATALOG.map((item)=>item.id)).size,480);
 for(const name of requested){const item=REPLACEMENT_CATALOG.find((item)=>item.name===name);assert.ok(item,name);assert.ok(fs.existsSync('public'+item.modelSource),item.modelSource);assert.ok(fs.existsSync('public'+item.thumbnail),item.thumbnail);}
});
test('every size and finish definition can create a valid independent instance',()=>{
 for(const item of REPLACEMENT_CATALOG){
   const a=configureInstance(item,item.defaultSizeId,{id:1}),b=configureInstance(item,item.defaultSizeId,{id:2});
   assert.ok(a.w>0&&a.d>0&&a.height>0,item.name);assert.notEqual(a.finishes,b.finishes);
   for(const part of Object.keys(item.parts)){assert.match(a.finishes[part],/^#[0-9a-f]{6}$/i,item.name);}
   for(const size of item.sizes){assert.ok(size.width>0&&size.depth>0&&size.height>0,item.name);}
 }
});
test('specialized placements are represented rather than forced into floor occupancy',()=>{
 const types=new Set(REPLACEMENT_CATALOG.map((item)=>item.placementType));for(const type of ['floor','wall','surface','ceiling','window','opening'])assert.ok(types.has(type),type);
 assert.equal(REPLACEMENT_CATALOG.find((item)=>item.name==='Framed painting').placementType,'wall');
 assert.equal(REPLACEMENT_CATALOG.find((item)=>item.name==='Chandelier').placementType,'ceiling');
});
