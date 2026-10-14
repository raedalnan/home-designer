import { useMemo } from "react";
import { CELL, WIDTH_CELLS, DEPTH_CELLS } from "../data/Constants";
import * as THREE from "three";
import { useControls } from "leva";

export default function RoomGrid() {
  const { showGrid, gridColor } = useControls("Grid", {
    showGrid: true,
    gridColor: "#3246fc",
  });
  const geometry = useMemo(() => {
    const depthM = DEPTH_CELLS * CELL;
    const widthM = WIDTH_CELLS * CELL;

    const originX = -widthM / 2;
    const originZ = -depthM / 2;
    const y = 0.01;
    const points = [];

    for (let i = 0; i <= WIDTH_CELLS; i++) {
      const x = originX + i * CELL;
      points.push(new THREE.Vector3(x, y, originZ));
      points.push(new THREE.Vector3(x, y, originZ + depthM));
    }

    for (let j = 0; j <= DEPTH_CELLS; j++) {
      const z = originZ + j * CELL;
      points.push(new THREE.Vector3(originX, y, z));
      points.push(new THREE.Vector3(originX + widthM, y, z));
    }

    return new THREE.BufferGeometry().setFromPoints(points);
  }, [WIDTH_CELLS, DEPTH_CELLS]);

  return (
    <lineSegments geometry={geometry} visible={showGrid}>
      <lineBasicMaterial color={gridColor}></lineBasicMaterial>
    </lineSegments>
  );
}
