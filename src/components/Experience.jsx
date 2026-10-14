import { OrbitControls } from "@react-three/drei";
import { Perf } from "r3f-perf";
import RoomGrid from "./RoomGrid";
import Room from "./Room";
import { useRef, useEffect, useState } from "react";
import { useControls, button } from "leva";
import { CELL } from "../data/Constants";

export default function Experience() {
  const cubeRef = useRef();
  const [boxes, setBoxes] = useState([]);
  // const { size } = useControls({
  //   size: { value: 1, options: { Small: 0.5, Medium: 1, Large: 2 } },
  // });
  // useControls(
  //   {
  //     "Add Box": button(() => {
  //       const newBox = {
  //         id: crypto.randomUUID(),
  //         size,
  //       };
  //       setBoxes((prev) => [...prev, newBox]);
  //     }),
  //     "Clear All": button(() => setBoxes([])),
  //   },
  //   [size],
  // );

  // function Box({ size }) {
  //   return (
  //     <mesh position-y={0.5}>
  //       <boxGeometry args={[size, 1, size]} />
  //       <meshStandardMaterial />
  //     </mesh>
  //   );
  // }

  return (
    <>
      <Perf position="top-left" />
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <directionalLight position={[20, 30, 20]} intensity={5} />
      <Room cubeRef={cubeRef} />
      <mesh position={[-0.5, 0.5, -0.5]} ref={cubeRef}>
        <boxGeometry args={[3 * CELL, 1, 2 * CELL]} />
        <meshStandardMaterial color="cyan" />
      </mesh>
      {/* {boxes.map((box) => (
        <box
          key={box.id}
          position={box.position}
          size={box.size}
          color={box.color}
        />
      ))} */}
      <RoomGrid />
    </>
  );
}
