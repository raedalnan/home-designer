import { Suspense, useCallback, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import Experience from "./components/Experience.jsx";
import SideBar from "./UI/SideBar.jsx";
import { CELL, DEPTH_CELLS, WIDTH_CELLS, GRID_SUBDIVISIONS } from "./data/Constants.js";
import { OPENING_CATALOG } from "./data/OpeningCatalog.js";
import {configureInstance,definitionOf} from './data/FurnitureRegistry.js';
import {readLayout} from './logic/LayoutPersistence.js';
import {removeWithDependents} from './logic/Attachments.js';
import { buildGrid, canPlace, findFreeSpot, getFootprint } from "./logic/Grid.js";
import { objectConflictsWithWalls, wallConflictsWithObject, wallsConflict } from "./logic/Walls.js";

const INITIAL_OBJECTS = [
  configureInstance(definitionOf({id:'atelier-double-bed'}),'standard',{id:1,cellX:5,cellZ:2,turns:0}),
];

const LAYOUT_VERSION = 3;
const ITEM_SIZE_MULTIPLIER = 2;
const DEFAULT_ROOM = { width: WIDTH_CELLS, depth: DEPTH_CELLS };
const DEFAULT_FINISHES = { wallColor: "#ded8cf", floorColor: "#e8e2d9" };

function findFurnitureSpot(objects, walls, width, depth, w, d, allowOverlap=false) {
  const grid = buildGrid(objects, width, depth);
  for (let row = 0; row <= Math.round((depth - d) * GRID_SUBDIVISIONS); row++) {
    for (let col = 0; col <= Math.round((width - w) * GRID_SUBDIVISIONS); col++) {
      const x = col / GRID_SUBDIVISIONS, z = row / GRID_SUBDIVISIONS;
      const candidate = { cellX: x, cellZ: z, w, d, turns: 0 };
      if ((allowOverlap||canPlace(grid, x, z, w, d, undefined, width, depth)) && !objectConflictsWithWalls(candidate, walls)) {
        return { cellX: x, cellZ: z };
      }
    }
  }
  return null;
}

function sanitizeWalls(objects, walls = []) {
  const valid = [];
  for (const wall of walls) {
    if (!objects.some((object) => wallConflictsWithObject(wall, object)) && !valid.some((existing) => wallsConflict(wall, existing))) {
      valid.push(wall);
    }
  }
  return valid;
}

function LoadingScreen() {
  const { active, progress } = useProgress();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible) return undefined;
    if (active || progress < 100) {
      setVisible(true);
      return undefined;
    }
    const timeout = window.setTimeout(() => setVisible(false), 350);
    return () => window.clearTimeout(timeout);
  }, [active, progress, visible]);

  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-[#f2f1ed] px-6 transition-opacity">
      <div className="w-full max-w-xs text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow-xl">H</div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">Home Designer</h1>
        <p className="mt-1 text-xs text-slate-500">Preparing your 3D workspace</p>
        <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-slate-900 transition-[width] duration-300" style={{ width: `${Math.max(5, Math.round(progress))}%` }} />
        </div>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{Math.round(progress)}%</p>
      </div>
    </div>
  );
}

function loadSavedState() {
  try {
    const saved=readLayout(localStorage);
    if(saved)return saved;
  } catch { /* Start with the demo layout if saved data is unavailable. */ }
  return { objects: INITIAL_OBJECTS, roomSize: DEFAULT_ROOM, walls: [], ...DEFAULT_FINISHES };
}

export default function App() {
  const [saved] = useState(loadSavedState);
  const [objects, setObjects] = useState(saved.objects);
  const [roomSize, setRoomSize] = useState(saved.roomSize);
  const [selectedId, setSelectedId] = useState(null);
  const [walls, setWalls] = useState(saved.walls ?? []);
  const [selectedWallId, setSelectedWallId] = useState(null);
  const [openings, setOpenings] = useState(saved.openings ?? []);
  const [selectedOpeningId, setSelectedOpeningId] = useState(null);
  const [activeOpeningId, setActiveOpeningId] = useState(OPENING_CATALOG[0].id);
  const [tool, setTool] = useState("furniture");
  const [wallColor, setWallColor] = useState(saved.wallColor ?? DEFAULT_FINISHES.wallColor);
  const [floorColor, setFloorColor] = useState(saved.floorColor ?? DEFAULT_FINISHES.floorColor);

  useEffect(() => {
    localStorage.setItem("home-designer-layout", JSON.stringify({ layoutVersion: LAYOUT_VERSION, objects, roomSize, walls, openings, wallColor, floorColor }));
  }, [objects, roomSize, walls, openings, wallColor, floorColor]);

  const addObject = useCallback((item) => {
    const definition=definitionOf(item);
    if(definition?.placementType==='opening'){setActiveOpeningId(definition.id);setTool('openings');return;}
    if(definition && definition.placementType!=='floor'){
      setTool('furniture');window.dispatchEvent(new CustomEvent('home-designer-place-attached',{detail:definition}));return;
    }
    const configured=definition?configureInstance(definition,definition.defaultSizeId):null;
    const w = configured?.w ?? (item.w ?? 2) * ITEM_SIZE_MULTIPLIER;
    const d = configured?.d ?? (item.d ?? 2) * ITEM_SIZE_MULTIPLIER;
    const footprint = getFootprint(0, w, d);
    const spot = findFurnitureSpot(objects, walls, roomSize.width, roomSize.depth, footprint.w, footprint.d,configured?.collisionLayer==='rug');
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
        height: (item.height ?? 1) * ITEM_SIZE_MULTIPLIER,
        source: "/furniture.glb",
        ...configured,
      }]);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setSelectedId(id);
  }, [objects, roomSize, walls]);

  const deleteSelected = useCallback(() => {
    if (selectedOpeningId != null) {
      setOpenings((current) => current.filter((opening) => opening.id !== selectedOpeningId));
      setObjects((current)=>removeWithDependents(current,current.filter((item)=>item.anchor?.openingId===selectedOpeningId).map((item)=>item.id)));
      setSelectedOpeningId(null);
      return;
    }
    if (selectedWallId != null) {
      setWalls((current) => current.filter((wall) => wall.id !== selectedWallId));
      setOpenings((current) => current.filter((opening) => opening.wallId !== selectedWallId));
      const openingIds=new Set(openings.filter((opening)=>opening.wallId===selectedWallId).map((opening)=>opening.id));
      setObjects((current)=>removeWithDependents(current,current.filter((item)=>item.anchor?.wallId===selectedWallId||openingIds.has(item.anchor?.openingId)).map((item)=>item.id)));
      setSelectedWallId(null);
      return;
    }
    if (selectedId != null) {
      setObjects((current) => removeWithDependents(current,[selectedId]));
      setSelectedId(null);
    }
  }, [selectedId, selectedOpeningId, selectedWallId,openings]);

  const resizeRoom = (nextSize) => {
    setRoomSize(nextSize);
    const nextObjects = objects.filter((obj) => {
      if(obj.anchor)return true;
      const footprint = getFootprint(obj.turns, obj.w, obj.d);
      return obj.cellX >= 0
        && obj.cellZ >= 0
        && obj.cellX + footprint.w <= nextSize.width
        && obj.cellZ + footprint.d <= nextSize.depth;
    });
    const nextWalls = walls.filter((wall) => wall.startX >= 0
      && wall.endX >= 0
      && wall.startZ >= 0
      && wall.endZ >= 0
      && wall.startX <= nextSize.width
      && wall.endX <= nextSize.width
      && wall.startZ <= nextSize.depth
      && wall.endZ <= nextSize.depth);
    const validWalls = [];
    for (const wall of nextWalls) {
      if (!nextObjects.some((object) => wallConflictsWithObject(wall, object)) && !validWalls.some((existing) => wallsConflict(wall, existing))) {
        validWalls.push(wall);
      }
    }
    setWalls(validWalls);
    const validWallIds = new Set(validWalls.map((wall) => wall.id));
    const nextOpenings=openings.filter((opening) => {
      if (opening.wallId.startsWith("outer-x")) return opening.offset + opening.width / 2 <= nextSize.depth * 0.5;
      if (opening.wallId.startsWith("outer-z")) return opening.offset + opening.width / 2 <= nextSize.width * 0.5;
      return validWallIds.has(opening.wallId);
    });
    setOpenings(nextOpenings);
    const openingIds=new Set(nextOpenings.map((opening)=>opening.id));
    const candidates=nextObjects.filter((object)=>{
      if(objectConflictsWithWalls(object,validWalls))return false;
      const anchor=object.anchor;if(!anchor)return true;
      if(anchor.openingId)return openingIds.has(anchor.openingId);
      if(anchor.type==='ceiling')return anchor.x>=0 && anchor.z>=0 && anchor.x<=nextSize.width*CELL && anchor.z<=nextSize.depth*CELL;
      if(anchor.type==='wall'){
        const wall=validWalls.find((entry)=>entry.id===anchor.wallId);
        const length=wall?Math.hypot(wall.endX-wall.startX,wall.endZ-wall.startZ)*CELL:anchor.wallId?.startsWith('outer-x')?nextSize.depth*CELL:anchor.wallId?.startsWith('outer-z')?nextSize.width*CELL:0;
        const width=definitionOf(object)?.sizes.find((size)=>size.id===object.sizeId)?.width??object.w*CELL;
        return anchor.offset-width/2>=0 && anchor.offset+width/2<=length;
      }
      return true;
    });
    const kept=new Set(candidates.map((item)=>item.id));
    setObjects(removeWithDependents(candidates,objects.filter((item)=>!kept.has(item.id)).map((item)=>item.id)));
    setSelectedId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
  };

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-[#f2f1ed]">
      <Canvas className="w-full h-full" camera={{ position: [10, 13, 14], fov: 48 }} dpr={[1, 1.5]} shadows={false}>
        <Suspense fallback={null}>
        <Experience objects={objects} setObjects={setObjects} walls={walls} setWalls={setWalls} openings={openings} setOpenings={setOpenings} roomSize={roomSize} selectedId={selectedId} setSelectedId={setSelectedId} selectedWallId={selectedWallId} setSelectedWallId={setSelectedWallId} selectedOpeningId={selectedOpeningId} setSelectedOpeningId={setSelectedOpeningId} onDeleteSelected={deleteSelected} tool={tool} activeOpening={OPENING_CATALOG.find((item) => item.id === activeOpeningId)} wallColor={wallColor} floorColor={floorColor} />
        </Suspense>
      </Canvas>
      <SideBar onAddObject={addObject} onDeleteSelected={deleteSelected} selectedId={selectedId ?? selectedWallId ?? selectedOpeningId} selectedName={selectedOpeningId != null ? openings.find((opening) => opening.id === selectedOpeningId)?.name : selectedWallId != null ? "Interior wall" : objects.find((obj) => obj.id === selectedId)?.name} selectedIsWall={selectedWallId != null || selectedOpeningId != null} onRoomSizeChange={resizeRoom} roomSize={roomSize} tool={tool} onToolChange={setTool} activeOpeningId={activeOpeningId} onOpeningChange={setActiveOpeningId} wallColor={wallColor} onWallColorChange={setWallColor} floorColor={floorColor} onFloorColorChange={setFloorColor} />
      <LoadingScreen />
    </main>
  );
}
