import { useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import Experience from "./components/Experience.jsx";
import SideBar from "./UI/SideBar.jsx";
import { DEPTH_CELLS, WIDTH_CELLS } from "./data/Constants.js";
import { buildGrid, findFreeSpot, getFootprint } from "./logic/Grid.js";

const INITIAL_OBJECTS = [
  { id: 1, name: "Three-seater Sofa 03", node: "Three-seaterSofa03", w: 3, d: 2, turns: 0, cellX: 0, cellZ: 0, height: 1, source: "/furniture.glb" },
  { id: 2, name: "Sofa Chair 01", node: "SofaChair01", w: 2, d: 2, turns: 0, cellX: 4, cellZ: 0, height: 1, source: "/furniture.glb" },
  { id: 3, name: "TV Stand 01", node: "TVStand01", w: 3, d: 1, turns: 0, cellX: 0, cellZ: 3, height: 1, source: "/furniture.glb" },
  { id: 4, name: "Double Bed 01", node: "doubleBed01", w: 3, d: 4, turns: 0, cellX: 5, cellZ: 3, height: 1, source: "/furniture.glb" },
];

const DEFAULT_ROOM = { width: WIDTH_CELLS, depth: DEPTH_CELLS };
const ROOM_PRESETS = [
  { label: "Small · 10 × 8 m", width: 20, depth: 16 },
  { label: "Medium · 15 × 10 m", width: 30, depth: 20 },
  { label: "Large · 20 × 12.5 m", width: 40, depth: 25 },
  { label: "XL · 25 × 15 m", width: 50, depth: 30 },
];

function loadSavedState() {
  try {
    const saved = JSON.parse(localStorage.getItem("home-designer-layout"));
    if (Array.isArray(saved?.objects) && Number.isInteger(saved?.roomSize?.width) && Number.isInteger(saved?.roomSize?.depth)) {
      const legacyNodes = {
        "Linen sofa": "Three-seaterSofa03",
        "Oak lounge chair": "SofaChair01",
        "Round coffee table": "TVStand01",
        "Platform bed": "doubleBed01",
        "Arc floor lamp": "lamp01",
        "Walnut sideboard": "SmallCabinet01",
      };
      return {
        ...saved,
        objects: saved.objects.map((obj) => ({
          ...obj,
          node: obj.node ?? legacyNodes[obj.name] ?? "SmallCabinet01",
          source: "/furniture.glb",
        })),
      };
    }
  } catch { /* Start with the demo layout if saved data is unavailable. */ }
  return { objects: INITIAL_OBJECTS, roomSize: DEFAULT_ROOM };
}

export default function App() {
  const [saved] = useState(loadSavedState);
  const [objects, setObjects] = useState(saved.objects);
  const [roomSize, setRoomSize] = useState(saved.roomSize);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    localStorage.setItem("home-designer-layout", JSON.stringify({ objects, roomSize }));
  }, [objects, roomSize]);

  const addObject = useCallback((item) => {
    const w = item.w ?? 2;
    const d = item.d ?? 2;
    const footprint = getFootprint(0, w, d);
    const spot = findFreeSpot(buildGrid(objects, roomSize.width, roomSize.depth), footprint.w, footprint.d, roomSize.width, roomSize.depth);
    if (!spot) return;
    const id = Math.max(0, ...objects.map((obj) => obj.id)) + 1;
    setObjects((current) => [...current, {
        id,
        name: item.name,
        node: item.node,
        w,
        d,
        turns: 0,
        cellX: spot.cellX,
        cellZ: spot.cellZ,
        height: item.height ?? 1,
        source: "/furniture.glb",
      }]);
    setSelectedId(id);
  }, [objects, roomSize]);

  const deleteSelected = useCallback(() => {
    if (selectedId == null) return;
    setObjects((current) => current.filter((obj) => obj.id !== selectedId));
    setSelectedId(null);
  }, [selectedId]);

  const resizeRoom = (preset) => {
    setRoomSize({ width: preset.width, depth: preset.depth });
    setObjects([]);
    setSelectedId(null);
  };

  return (
    <div className="flex h-screen w-screen">
      <Canvas className="w-full h-full" camera={{ position: [10, 13, 14], fov: 48 }} dpr={[1, 1.5]} shadows={false}>
        <Experience objects={objects} setObjects={setObjects} roomSize={roomSize} selectedId={selectedId} setSelectedId={setSelectedId} onDeleteSelected={deleteSelected} />
      </Canvas>
      <SideBar onAddObject={addObject} onDeleteSelected={deleteSelected} selectedId={selectedId} selectedName={objects.find((obj) => obj.id === selectedId)?.name} roomPresets={ROOM_PRESETS} onRoomSizeChange={resizeRoom} roomSize={roomSize} />
    </div>
  );
}
