import { Perf } from "r3f-perf";
import RoomGrid from "./RoomGrid";
import Room from "./Room";

export default function Experience({
  objects,
  setObjects,
  roomSize,
  selectedId,
  setSelectedId,
  onDeleteSelected,
}) {
  return (
    <>
      <Perf position="top-left" />

      <ambientLight intensity={3} />
      <directionalLight position={[20, 30, 20]} intensity={2} />
      <Room
        objects={objects}
        setObjects={setObjects}
        roomSize={roomSize}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        onDeleteSelected={onDeleteSelected}
      />
    </>
  );
}
