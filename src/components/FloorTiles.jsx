import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Matrix4 } from 'three';
import { CELL, GRID_SPACING } from '../data/Constants.js';

function TileBatch({ keys, tiles, roomSize, color, highlight, onPointerDown, onPointerMove, onPointerUp, onDoubleClick }) {
  const mesh = useRef();
  useLayoutEffect(() => {
    const matrix = new Matrix4();
    keys.forEach((key, index) => {
      const [x, z] = key.split(',').map(Number);
      const elevation = (tiles[key]?.level ?? 0) * GRID_SPACING;
      const height = highlight ? 0.002 : elevation + 0.012;
      matrix.makeScale(GRID_SPACING, height, GRID_SPACING);
      matrix.setPosition(
        (x + 0.5) * GRID_SPACING - roomSize.width * CELL / 2,
        highlight ? elevation + 0.014 : elevation - height / 2,
        (z + 0.5) * GRID_SPACING - roomSize.depth * CELL / 2,
      );
      mesh.current.setMatrixAt(index, matrix);
      if (!highlight) mesh.current.setColorAt(index, new Color(tiles[key]?.color ?? color));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [keys, tiles, roomSize, color, highlight]);

  return <instancedMesh ref={mesh} args={[undefined, undefined, keys.length]}
    raycast={highlight ? () => {} : undefined}
    onPointerDown={onPointerDown && ((event) => onPointerDown(event, keys[event.instanceId]))}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    onDoubleClick={onDoubleClick && ((event) => onDoubleClick(event, keys[event.instanceId]))}>
    <boxGeometry />
    {highlight ? <meshBasicMaterial color="#2563eb" transparent opacity={0.32} depthWrite={false} />
      : <meshStandardMaterial roughness={0.9} />}
  </instancedMesh>;
}

export default function FloorTiles({ tiles, selection, showGrid, ...props }) {
  const keys = Object.keys(tiles);
  const gridPoints = useMemo(() => {
    if (!showGrid) return new Float32Array();
    const points = [];
    for (const [key, tile] of Object.entries(tiles)) {
      const [col, row] = key.split(',').map(Number);
      const x = col * GRID_SPACING - props.roomSize.width * CELL / 2;
      const z = row * GRID_SPACING - props.roomSize.depth * CELL / 2;
      const y = (tile.level ?? 0) * GRID_SPACING + 0.01;
      const right = x + GRID_SPACING;
      const back = z + GRID_SPACING;
      points.push(x, y, z, right, y, z, right, y, z, right, y, back,
        right, y, back, x, y, back, x, y, back, x, y, z);
    }
    return new Float32Array(points);
  }, [tiles, showGrid, props.roomSize]);
  return <>
    {keys.length > 0 && <TileBatch keys={keys} tiles={tiles} {...props} />}
    {gridPoints.length > 0 && <lineSegments raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[gridPoints, 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#94a3b8" transparent opacity={0.65} />
    </lineSegments>}
    {selection.length > 0 && <TileBatch keys={selection} tiles={tiles} roomSize={props.roomSize} highlight />}
  </>;
}
