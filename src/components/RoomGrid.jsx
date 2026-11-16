import { useMemo } from "react";
import { CELL } from "../data/Constants";
import * as THREE from "three";

export default function RoomGrid({ widthCells, depthCells, visible }) {
  const geometry = useMemo(() => {
    const depthM = depthCells * CELL;
    const widthM = widthCells * CELL;

    const originX = -widthM / 2;
    const originZ = -depthM / 2;
    const y = 0.01;
    const points = [];

    for (let i = 0; i <= widthCells; i++) {
      const x = originX + i * CELL;
      points.push(new THREE.Vector3(x, y, originZ));
      points.push(new THREE.Vector3(x, y, originZ + depthM));
    }

    for (let j = 0; j <= depthCells; j++) {
      const z = originZ + j * CELL;
      points.push(new THREE.Vector3(originX, y, z));
      points.push(new THREE.Vector3(originX + widthM, y, z));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [widthCells, depthCells]);

  return (
    <lineSegments geometry={geometry} visible={visible}>
      <lineBasicMaterial color="#94a3b8" transparent opacity={0.65} />
    </lineSegments>
  );
}
