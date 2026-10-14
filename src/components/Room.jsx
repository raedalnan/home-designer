import { CELL, WIDTH_CELLS, DEPTH_CELLS } from "../data/Constants";
import { snap } from "../logic/Grid";

export default function Room({ cubeRef }) {
  function snapCube(e) {
    const { x, z } = snap(
      e.point.x,
      e.point.z,
      cubeRef.current.geometry.parameters.width,
      cubeRef.current.geometry.parameters.depth,
    );
    console.log(snap(100, 100, 1, 1));

    cubeRef.current.position.set(x, 0.5, z);
  }

  return (
    <>
      <mesh rotation-x={Math.PI * -0.5} onPointerMove={(e) => snapCube(e)}>
        <planeGeometry args={[WIDTH_CELLS * CELL, DEPTH_CELLS * CELL]} />
        <meshBasicMaterial color="orange" />
      </mesh>
      <mesh position={[(-WIDTH_CELLS * CELL) / 2, 1, 0]}>
        <boxGeometry args={[CELL / 4, 2, DEPTH_CELLS * CELL]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[(+WIDTH_CELLS * CELL) / 2, 1, 0]}>
        <boxGeometry args={[CELL / 4, 2, DEPTH_CELLS * CELL]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, 1, (-DEPTH_CELLS * CELL) / 2]}>
        <boxGeometry args={[WIDTH_CELLS * CELL, 2, CELL / 4]} />
        <meshStandardMaterial />
      </mesh>
      <mesh position={[0, 1, (DEPTH_CELLS * CELL) / 2]}>
        <boxGeometry args={[WIDTH_CELLS * CELL, 2, CELL / 4]} />
        <meshStandardMaterial />
      </mesh>
    </>
  );
}
