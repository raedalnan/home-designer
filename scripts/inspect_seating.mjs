import fs from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {SEATING_CATALOG} from '../src/data/SeatingCatalog.js';
let bytes=0,triangles=0;
for(const item of SEATING_CATALOG){
 const file=fs.readFileSync(`public${item.modelSource}`);bytes+=file.length;
 const gltf=JSON.parse(file.subarray(20,20+file.readUInt32LE(12)).toString());
 const bounds=new Box3();let count=0;
 function visit(index,parent){
  const node=gltf.nodes[index];
  const local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(new Vector3().fromArray(node.translation??[0,0,0]),new Quaternion().fromArray(node.rotation??[0,0,0,1]),new Vector3().fromArray(node.scale??[1,1,1]));
  const matrix=parent.clone().multiply(local);
  if(node.mesh!==undefined){for(const primitive of gltf.meshes[node.mesh].primitives){
   count++;triangles+=gltf.accessors[primitive.indices].count/3;
   const accessor=gltf.accessors[primitive.attributes.POSITION];
   bounds.union(new Box3(new Vector3().fromArray(accessor.min),new Vector3().fromArray(accessor.max)).applyMatrix4(matrix));
  }}
  for(const child of node.children??[])visit(child,matrix);
 }
 for(const root of gltf.scenes[gltf.scene??0].nodes)visit(root,new Matrix4());
 const size=bounds.getSize(new Vector3());
 const preset=item.sizes[0];
 const fits=size.x<=Math.ceil(preset.width/.5)*.5+.001&&size.z<=Math.ceil(preset.depth/.5)*.5+.001;
 if(!fits)throw Error(`Footprint mismatch: ${item.id}: ${size.toArray()}`);
 if(!fs.existsSync(`public${item.thumbnail}`))throw Error(`Missing thumbnail: ${item.id}`);
 console.log(item.id,{bytes:file.length,primitives:count,width:+size.x.toFixed(3),depth:+size.z.toFixed(3),height:+size.y.toFixed(3)});
}
console.log({models:SEATING_CATALOG.length,bytes,triangles});
