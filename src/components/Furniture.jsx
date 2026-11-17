import { Suspense, lazy, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CELL } from "../data/Constants.js";
import { cellToWorld, getFootprint } from "../logic/Grid.js";
import { Clone, useGLTF } from "@react-three/drei";

const StudioFurniture=lazy(()=>import('./StudioFurniture.jsx'));
const BlenderFurniture=lazy(()=>import('./BlenderFurniture.jsx'));
export default function Furniture(props) {
  if(props.obj.source?.startsWith('/furniture-v2/'))return <Suspense fallback={null}><BlenderFurniture {...props}/></Suspense>;
  if(props.obj.definitionId) return <Suspense fallback={null}><StudioFurniture {...props}/></Suspense>;
  return <LegacyFurniture {...props}/>;
}
function LegacyFurniture({ obj, registerMesh, onDragStart, roomSize, ghost = false }) {
  const { id, w, d, cellX, cellZ, height, source } = obj;
  const meshRef = useRef();
  const { nodes } = useGLTF(source);
  const sourceNode = nodes[obj.node] ?? nodes.SmallCabinet01;
  const footprint = getFootprint(obj.turns, w, d);
  const normalizedNode = useMemo(() => {
    const clone = sourceNode.clone(true);
    if (ghost) clone.traverse((child) => {
      if (!child.isMesh) return;
      const fade = (material) => { const copy = material.clone(); copy.transparent = true; copy.opacity = 0.35; copy.depthWrite = false; return copy; };
      child.material = Array.isArray(child.material) ? child.material.map(fade) : fade(child.material);
      child.raycast = () => {};
    });
    clone.position.set(0, 0, 0);
    clone.updateMatrix();
    clone.updateMatrixWorld(true);
    return clone;
  }, [sourceNode, ghost]);

  // Ignore the node's original pack layout position, then fit its own bounds.
  const fit = useMemo(() => {
    const bounds = new THREE.Box3().setFromObject(normalizedNode);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = Math.min((w * CELL * 0.9) / (size.x || 1), (d * CELL * 0.9) / (size.z || 1), height / (size.y || 1));
    return {
      scale,
      position: [-center.x, -bounds.min.y, -center.z],
    };
  }, [normalizedNode, w, d, height]);

  useLayoutEffect(() => {
    const { x, z } = cellToWorld(cellX, cellZ, footprint.w, footprint.d, roomSize.width, roomSize.depth);
    meshRef.current.position.set(x, 0, z);
    meshRef.current.rotation.y = (obj.turns ?? 0) * Math.PI / 2;
  }, [cellX, cellZ, footprint.w, footprint.d, roomSize, obj.turns, height]);

  useLayoutEffect(() => {
    if (ghost) return;
    registerMesh(id, meshRef.current);
    return () => registerMesh(id, null);
  }, [id, registerMesh, ghost]);

  return (
    <group
      ref={meshRef}
      onPointerDown={(e) => {
        if (ghost) return;
        e.stopPropagation();
        onDragStart(id, e.point);
      }}
    >
      <group scale={fit.scale}>
        <Clone object={normalizedNode} position={fit.position} />
      </group>
    </group>
  );
}
