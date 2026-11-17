import {useLayoutEffect,useMemo,useRef,useEffect} from 'react';
import {useGLTF} from '@react-three/drei';
import {Box3,Vector3,MeshPhysicalMaterial} from 'three';
import {definitionOf} from '../data/FurnitureRegistry.js';
import {cellToWorld,getFootprint} from '../logic/Grid.js';
import {resolveAttachment} from '../logic/Attachments.js';

export default function BlenderFurniture({obj,roomSize,registerMesh,onDragStart,ghost=false,objects=[],walls=[],openings=[]}) {
 const ref=useRef();const definition=definitionOf(obj);const source=obj.source??definition.modelSource;const {scene}=useGLTF(`${source}?v=${definition.assetVersion??'1'}`);
 const model=useMemo(()=>{
   const model=scene.clone(true);
   model.traverse((node)=>{
     if(!node.isMesh)return;
     const clone=(source)=>{
       const part=source.name.split('.')[0];
       const material=part==='glass'?new MeshPhysicalMaterial({name:source.name,color:'#edfaff',roughness:.09,transmission:.86,thickness:.018,ior:1.5,envMapIntensity:1.2,metalness:0,clearcoat:.8}):source.clone();
       if(part==='glass' && /mirror/i.test(definition.name)){material.transmission=0;material.metalness=1;material.roughness=.055;material.color.set('#c7d0d5');}
       if(part==='bulb'){material.emissive.set('#ffdba0');material.emissiveIntensity=.7;}
       const color=obj.finishes?.[part]??(part==='seams'||part==='buttons'?obj.finishes?.fabric:null);
       if(color)material.color.set(color);
       if(part==='seams')material.color.multiplyScalar(.72);
       if(ghost){material.transparent=true;material.opacity=.35;material.depthWrite=false;}
       return material;
     };
     node.material=Array.isArray(node.material)?node.material.map(clone):clone(node.material);
     if(ghost)node.raycast=()=>{};
   });
   const bounds=new Box3().setFromObject(model);const center=bounds.getCenter(new Vector3());
   model.position.set(-center.x,-bounds.min.y,-center.z);
   return model;
 },[scene,obj.finishes,ghost]);
 useEffect(()=>()=>model.traverse((node)=>{if(node.isMesh)for(const material of(Array.isArray(node.material)?node.material:[node.material]))material.dispose();}),[model]);
 const point=resolveAttachment(obj,objects,walls,openings,roomSize);
 useLayoutEffect(()=>{if(ghost)return;registerMesh(obj.id,ref.current);return()=>registerMesh(obj.id,null);},[obj.id,registerMesh,ghost]);
 if(!point)return null;
 return <group ref={ref} position={[point.x,point.y,point.z]} rotation-y={point.rotation} onPointerDown={(event)=>{if(ghost)return;event.stopPropagation();onDragStart(obj.id,event.point);}}><primitive object={model} dispose={null}/></group>;
}
