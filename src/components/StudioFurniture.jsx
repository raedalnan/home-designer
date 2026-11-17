import {useLayoutEffect,useRef} from 'react';
import {definitionOf} from '../data/FurnitureRegistry.js';
import {cellToWorld,getFootprint} from '../logic/Grid.js';
import {BoxGeometry,MeshStandardMaterial} from 'three';
// Module-owned resources are shared by all instances; R3F must not dispose them.
const geometry=new BoxGeometry(1,1,1),materials=new Map();
function Box({position,size,color,ghost}) {
 const key=`${color}:${Boolean(ghost)}`;
 if(!materials.has(key))materials.set(key,new MeshStandardMaterial({color,roughness:.7,transparent:ghost,opacity:ghost?.35:1,depthWrite:!ghost}));
 return <mesh position={position} scale={size} geometry={geometry} material={materials.get(key)} dispose={null}/>;
}
export default function StudioFurniture({obj,roomSize,registerMesh,onDragStart,ghost=false}) {
 const ref=useRef();const definition=definitionOf(obj);const preset=definition.sizes.find((entry)=>entry.id===obj.sizeId)??definition.sizes[0];
 const {width:w,depth:d,height:h}=preset;const c=obj.finishes??{};const footprint=getFootprint(obj.turns,obj.w,obj.d);const point=cellToWorld(obj.cellX,obj.cellZ,footprint.w,footprint.d,roomSize.width,roomSize.depth);
 useLayoutEffect(()=>{if(ghost)return;registerMesh(obj.id,ref.current);return()=>registerMesh(obj.id,null);},[obj.id,registerMesh,ghost]);
 const box=(key,position,size,color)=><Box key={key} position={position} size={size} color={color} ghost={ghost}/>;
 const legs=(color,top=.35)=>[-1,1].flatMap((x)=>[-1,1].map((z)=>box(`leg${x}${z}`,[x*(w/2-.09),top/2,z*(d/2-.09)],[.06,top,.06],color)));
 let model;
 switch(definition.family){
 case 'sofa':model=<>{legs(c.legs,.15)}{box('seat',[0,.35,0],[w,.3,d],c.fabric)}{box('back',[0,.65,-d/2+.1],[w,.4,.2],c.fabric)}{[-1,1].map((x)=>box(`arm${x}`,[x*(w/2-.09),.5,0],[.18,.35,d],c.fabric))}{[-1,1].map((x)=>box(`cushion${x}`,[x*w*.22,.52,.08],[w*.4,.08,d*.65],c.fabric))}</>;break;
 case 'bed':model=<>{legs(c.frame,.25)}{box('frame',[0,.3,0],[w,.18,d],c.frame)}{box('head',[0,.65,-d/2+.04],[w,.6,.08],c.frame)}{box('mattress',[0,.47,0],[w-.06,.18,d-.08],'#f4f1e9')}{box('duvet',[0,.57,.3],[w-.04,.08,d*.65],c.bedding)}{box('pillow',[0,.6,-d*.32],[w*.8,.13,.35],'#f5f1e7')}</>;break;
 case 'table':model=<>{legs(c.legs,h-.06)}{box('top',[0,h-.03,0],[w,.06,d],c.top)}</>;break;
 case 'cabinet':model=<>{box('body',[0,h/2,0],[w,h,d],c.body)}{[-1,1].map((x)=>box(`door${x}`,[x*w*.245,h/2,d/2+.012],[w*.48,h-.04,.025],c.body))}{[-1,1].map((x)=>box(`handle${x}`,[x*.06,h*.6,d/2+.04],[.018,.12,.025],c.handles))}</>;break;
 case 'lamp':model=<>{box('base',[0,.025,0],[w,.05,d],c.stand)}{box('stand',[0,h*.4,0],[.035,h*.8,.035],c.stand)}{box('shade',[0,h*.87,0],[w,h*.25,d],c.shade)}</>;break;
 default:model=<>{box('pot',[0,h*.15,0],[w*.65,h*.3,d*.65],c.pot)}{box('stem',[0,h*.55,0],[.035,h*.65,.035],'#566d3e')}{[.4,.6,.8].flatMap((y,i)=>[-1,1].map((x)=>box(`leaf${i}${x}`,[x*w*.22,h*y,0],[w*.45,.06,d*.7],i%2?'#718658':'#4f7048')))}</>;
 }
 return <group ref={ref} position={[point.x,0,point.z]} rotation-y={(obj.turns??0)*Math.PI/2} onPointerDown={(event)=>{if(ghost)return;event.stopPropagation();onDragStart(obj.id,event.point);}}>{model}</group>;
}
