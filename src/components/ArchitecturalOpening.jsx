import { useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { MathUtils, Quaternion, Vector3, MeshPhysicalMaterial } from 'three';

export default function ArchitecturalOpening({ opening, position, alongX, onSelect, materialSet }) {
  const variant = opening.variantId ?? (opening.type === 'door' ? 'door-single' : 'window-standard');
  const { scene } = useGLTF(`/openings/${variant}.glb?v=3`);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((node) => {
      if (!node.isMesh) return;
      const clone = (source) => {
        const material = /glass/i.test(source.name) ? new MeshPhysicalMaterial({name:source.name,color:'#f0fcff',roughness:.075,metalness:0,transmission:.92,thickness:.018,ior:1.5,clearcoat:1,clearcoatRoughness:.045,envMapIntensity:1.4,attenuationColor:'#c6ece5',attenuationDistance:3}) : source.clone();
        material.userData.baseOpacity = material.opacity; if (materialSet) material.transparent = true; return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(clone) : clone(node.material);
    });
    return copy;
  }, [scene, materialSet]);
  useEffect(() => {
    if (!opening.finishColor) return;
    model.traverse((node) => {
      if (!node.isMesh) return;
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
        if (!/glass|brass/i.test(material.name)) material.color.set(opening.finishColor);
      }
    });
  }, [model, opening.finishColor]);
  useEffect(() => {
    const materials = [];
    model.traverse((node) => { if (node.isMesh) materials.push(...(Array.isArray(node.material) ? node.material : [node.material])); });
    materials.forEach((material) => materialSet?.current.add(material));
    return () => materials.forEach((material) => { materialSet?.current.delete(material); material.dispose(); });
  }, [model, materialSet]);
  useFrame((_, delta) => {
    model.traverse((node) => {
      if (!node.name.startsWith('Leaf_') && !node.name.startsWith('Slide_active')) return;
      node.userData.closedX ??= node.position.x;
      if (node.name.startsWith('Slide_active')) node.position.x = MathUtils.damp(node.position.x, node.userData.closedX + (opening.isOpen ? (opening.width-.15)/2 : 0), 8, delta);
      else {
        node.userData.closedQuaternion ??= node.quaternion.clone();
        node.userData.swing = MathUtils.damp(node.userData.swing ?? 0, opening.isOpen ? (node.name.startsWith('Leaf_right') ? -Math.PI / 2 : Math.PI / 2)*(opening.swingDirection ?? 1) : 0, 8, delta);
        node.quaternion.copy(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), node.userData.swing)).multiply(node.userData.closedQuaternion);
      }
    });
  });
  return <group position={position} rotation-y={alongX ? 0 : -Math.PI / 2} onDoubleClick={(event) => { event.stopPropagation(); if(opening.type==='door') window.dispatchEvent(new CustomEvent('home-designer-door-toggle',{detail:opening.id})); }} onPointerDown={(event) => { event.stopPropagation(); onSelect(opening.id); }}><primitive object={model} /></group>;
}
