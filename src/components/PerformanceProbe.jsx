import {useRef,useState} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
export default function PerformanceProbe(){
 const sample=useRef({time:0,frames:0});const [stats,setStats]=useState(null);
 useFrame(({gl},delta)=>{
   sample.current.time+=delta;sample.current.frames++;
   if(sample.current.time<1)return;
   setStats({fps:Math.round(sample.current.frames/sample.current.time),calls:gl.info.render.calls,triangles:gl.info.render.triangles,geometries:gl.info.memory.geometries,textures:gl.info.memory.textures,heapMB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):'unavailable',transferKB:Math.round(performance.getEntriesByType('resource').reduce((sum,entry)=>sum+(entry.transferSize??0),0)/1000)});
   sample.current={time:0,frames:0};
 });
 return <Html fullscreen style={{pointerEvents:'none'}}><output style={{position:'absolute',right:12,bottom:12,padding:8,background:'#fff',fontSize:11,whiteSpace:'pre'}}>{JSON.stringify(stats,null,2)}</output></Html>;
}
