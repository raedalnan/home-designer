import Room from "./Room.jsx";
import PerformanceProbe from './PerformanceProbe.jsx';
import { Environment, Lightformer } from '@react-three/drei';

export default function Experience({
  gridVisible,
  tileGridVisible,
  historyRevision,
  settingsHost,
  optionsOpen,
  onToggleOptions,
  panelOpen,
  walking,
  walkInput,
  onWalkExit,
  onWalkHint,
  floorTiles,
  floorKeys,
  onFloorSelect,
  onFloorEdit,
  onSelectMode,
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
  wallFinishes,
  setWallFinishes,
}) {
  return (
    <>
      <ambientLight intensity={3} />
      {new URLSearchParams(window.location.search).has('benchmark') && <PerformanceProbe/>}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={3} position={[0,8,0]} rotation-x={Math.PI/2} scale={[12,12,1]} />
        <Lightformer intensity={2} position={[5,3,5]} scale={[3,5,1]} />
        <Lightformer intensity={1} position={[-5,3,-5]} rotation-y={Math.PI} scale={[4,5,1]} />
      </Environment>
      <directionalLight position={[20, 30, 20]} intensity={2} />
      <Room
        gridVisible={gridVisible}
        tileGridVisible={tileGridVisible}
        historyRevision={historyRevision}
        settingsHost={settingsHost}
        optionsOpen={optionsOpen}
        onToggleOptions={onToggleOptions}
        panelOpen={panelOpen}
        walking={walking}
        walkInput={walkInput}
        onWalkExit={onWalkExit}
        onWalkHint={onWalkHint}
        floorTiles={floorTiles}
        floorKeys={floorKeys}
        onFloorSelect={onFloorSelect}
        onFloorEdit={onFloorEdit}
        onSelectMode={onSelectMode}
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
        wallFinishes={wallFinishes}
        setWallFinishes={setWallFinishes}
      />
    </>
  );
}
