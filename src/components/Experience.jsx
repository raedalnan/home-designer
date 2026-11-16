import Room from "./Room.jsx";

export default function Experience({
  objects,
  setObjects,
  walls,
  setWalls,
  openings,
  setOpenings,
  roomSize,
  selectedId,
  setSelectedId,
  selectedWallId,
  setSelectedWallId,
  selectedOpeningId,
  setSelectedOpeningId,
  onDeleteSelected,
  tool,
  activeOpening,
  wallColor,
  floorColor,
}) {
  return (
    <>
      <ambientLight intensity={3} />
      <directionalLight position={[20, 30, 20]} intensity={2} />
      <Room
        objects={objects}
        setObjects={setObjects}
        walls={walls}
        setWalls={setWalls}
        openings={openings}
        setOpenings={setOpenings}
        roomSize={roomSize}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        selectedWallId={selectedWallId}
        setSelectedWallId={setSelectedWallId}
        selectedOpeningId={selectedOpeningId}
        setSelectedOpeningId={setSelectedOpeningId}
        onDeleteSelected={onDeleteSelected}
        tool={tool}
        activeOpening={activeOpening}
        wallColor={wallColor}
        floorColor={floorColor}
      />
    </>
  );
}
