import { createPortal } from 'react-dom';
import { Suspense, createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { Edges, Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Plane, Raycaster, Vector2, Vector3 } from "three";
import {FURNITURE_REGISTRY,FINISHES,configureInstance,definitionOf} from '../data/FurnitureRegistry.js';
const FURNITURE_CATALOG=FURNITURE_REGISTRY;
import { CELL, GRID_SPACING } from "../data/Constants.js";
import { snap, snapCoordinate, cellToWorld, buildGrid, placeObject, removeObject, canPlace, getFootprint } from "../logic/Grid.js";
import { objectConflictsWithWalls, wallConflictsWithObject, wallsConflict } from "../logic/Walls.js";
import Furniture from "./Furniture.jsx";
import Walkthrough from './Walkthrough.jsx';
import FloorTiles from './FloorTiles.jsx';
import { connectedFloorKeys, floorCell, floorElevation, selectedFloorKeys, wallCrossesRaisedFloor } from '../logic/Floor.js';
import RoomGrid from "./RoomGrid.jsx";
import ArchitecturalOpening from "./ArchitecturalOpening.jsx";
import { Palette } from "../UI/ColorPicker.jsx";
import { resizeFurniture, rotateFurniture, rotationDegrees } from '../logic/FurnitureCommands.js';
import {resolveAttachment,isFloor} from '../logic/Attachments.js';

const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.1;
const WallFinishContext = createContext({});
const FADED_OPACITY = 0.001;
const ignoreRaycast = () => {};
function ArcOptionsButton({ label, open, onToggle }) {
  return <button type="button" className="arc-options" title={label} aria-label={label}
    aria-expanded={open} aria-controls={open ? "item-options" : undefined} onClick={onToggle}>
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h5m4 0h7M4 12h11m4 0h1M4 17h3m4 0h9" />
      <circle cx="11" cy="7" r="2" /><circle cx="17" cy="12" r="2" /><circle cx="9" cy="17" r="2" />
    </svg>
  </button>;
}

function RepeatWallButton({ children, onStep }) {
  const step = useRef(onStep);
  step.current = onStep;
  const timer = useRef(null);
  const stop = () => {
    clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  function repeat() {
    if (step.current() === false) {
      timer.current = null;
      return;
    }
    timer.current = setTimeout(repeat, 100);
  }

  return <button type="button" onPointerDown={(event) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (step.current() !== false) timer.current = setTimeout(repeat, 350);
  }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
    onContextMenu={(event) => event.preventDefault()}
    onClick={(event) => { if (event.detail === 0) step.current(); }}>{children}</button>;
}

function setSurfacePicking(group, enabled) {
  group.traverse((object) => {
    if (!object.isMesh) return;
    object.userData.surfaceRaycast ??= object.raycast;
    object.raycast = enabled ? object.userData.surfaceRaycast : ignoreRaycast;
  });
}

function CameraAwareRoof({ roomSize, color, walking }) {
  const roofRef = useRef();
  const materialRef = useRef();
  useFrame(({ camera }, delta) => {
    // From above, the roof would obscure the workspace beneath it.
    const obscuresRoom = !walking && camera.position.y >= WALL_HEIGHT;
    const material = materialRef.current;
    material.opacity = MathUtils.damp(material.opacity, obscuresRoom ? FADED_OPACITY : 1, 8, delta);
    material.depthWrite = !obscuresRoom && material.opacity > 0.98;
  });
  return (
    <mesh ref={roofRef} position={[0, WALL_HEIGHT + WALL_THICKNESS / 2, 0]} raycast={ignoreRaycast}>
      <boxGeometry args={[roomSize.width * CELL + WALL_THICKNESS, WALL_THICKNESS, roomSize.depth * CELL + WALL_THICKNESS]} />
      <meshStandardMaterial ref={materialRef} color={color} transparent opacity={FADED_OPACITY} depthWrite={false} roughness={0.9} />
    </mesh>
  );
}

function wallTransform(wall, roomSize) {
  const cornerX = -(roomSize.width * CELL) / 2;
  const cornerZ = -(roomSize.depth * CELL) / 2;
  const startX = cornerX + wall.startX * CELL;
  const startZ = cornerZ + wall.startZ * CELL;
  const endX = cornerX + wall.endX * CELL;
  const endZ = cornerZ + wall.endZ * CELL;
  const alongX = wall.startZ === wall.endZ;
  return {
    position: [(startX + endX) / 2, WALL_HEIGHT / 2, (startZ + endZ) / 2],
    size: alongX
      ? [Math.abs(endX - startX), WALL_HEIGHT, WALL_THICKNESS]
      : [WALL_THICKNESS, WALL_HEIGHT, Math.abs(endZ - startZ)],
  };
}

function wallJunctionOffset(wall, other) {
  const horizontal = wall.startZ === wall.endZ;
  const otherHorizontal = other.startZ === other.endZ;
  if (horizontal === otherHorizontal) return null;
  const vertical = horizontal ? other : wall;
  const horizontalWall = horizontal ? wall : other;
  const crosses = vertical.startX >= Math.min(horizontalWall.startX, horizontalWall.endX)
    && vertical.startX <= Math.max(horizontalWall.startX, horizontalWall.endX)
    && horizontalWall.startZ >= Math.min(vertical.startZ, vertical.endZ)
    && horizontalWall.startZ <= Math.max(vertical.startZ, vertical.endZ);
  if (!crosses) return null;
  return horizontal
    ? (vertical.startX - Math.min(wall.startX, wall.endX)) * CELL
    : (horizontalWall.startZ - Math.min(wall.startZ, wall.endZ)) * CELL;
}

function wallParts(wall, roomSize, openings, connectedWalls = []) {
  const alongX = wall.startZ === wall.endZ;
  const cornerX = -(roomSize.width * CELL) / 2;
  const cornerZ = -(roomSize.depth * CELL) / 2;
  const startCell = alongX ? Math.min(wall.startX, wall.endX) : Math.min(wall.startZ, wall.endZ);
  const endCell = alongX ? Math.max(wall.startX, wall.endX) : Math.max(wall.startZ, wall.endZ);
  const fixedCell = alongX ? wall.startZ : wall.startX;
  const startWorld = (alongX ? cornerX : cornerZ) + startCell * CELL;
  const fixedWorld = (alongX ? cornerZ : cornerX) + fixedCell * CELL;
  const length = (endCell - startCell) * CELL;
  // Horizontal walls own the junction square; vertical walls meet its edge.
  const junctions = connectedWalls.filter((other) => other.id !== wall.id)
    .map((other) => wallJunctionOffset(wall, other));
  const startJoined = junctions.some((offset) => offset === 0);
  const endJoined = junctions.some((offset) => offset === length);
  const startLimit = startJoined ? (alongX ? -WALL_THICKNESS / 2 : WALL_THICKNESS / 2 + 0.0005) : 0;
  const endLimit = length + (endJoined ? (alongX ? WALL_THICKNESS / 2 : -WALL_THICKNESS / 2 - 0.0005) : 0);
  const parts = [];
  const addPart = (from, to, bottom = 0, height = WALL_HEIGHT) => {
    from = from === 0 ? startLimit : Math.max(from, startLimit);
    to = to === length ? endLimit : Math.min(to, endLimit);
    if (to - from <= 0.001 || height <= 0.001) return;
    const center = startWorld + (from + to) / 2;
    parts.push({
      position: alongX ? [center, bottom + height / 2, fixedWorld] : [fixedWorld, bottom + height / 2, center],
      size: alongX ? [to - from, height, WALL_THICKNESS] : [WALL_THICKNESS, height, to - from],
    });
  };

  let cursor = 0;
  for (const opening of [...openings].sort((a, b) => a.offset - b.offset)) {
    const openingStart = Math.max(0, opening.offset - opening.width / 2);
    const openingEnd = Math.min(length, opening.offset + opening.width / 2);
    addPart(cursor, openingStart);
    addPart(openingStart, openingEnd, 0, opening.sillHeight);
    const openingTop = opening.sillHeight + opening.height;
    addPart(openingStart, openingEnd, openingTop, WALL_HEIGHT - openingTop);
    cursor = openingEnd;
  }
  addPart(cursor, length);
  return { alongX, cornerX, cornerZ, startWorld, fixedWorld, length, parts };
}

function OpeningFixture({ opening, wall, roomSize, onSelect, materialSet }) {
  const info = wallParts(wall, roomSize, []);
  const along = info.startWorld + opening.offset;
  const position = info.alongX ? [along, opening.sillHeight, info.fixedWorld] : [info.fixedWorld, opening.sillHeight, along];
  return <Suspense fallback={null}><ArchitecturalOpening opening={opening} position={position} alongX={info.alongX} onSelect={onSelect} materialSet={materialSet} /></Suspense>;
}

function LegacyOpeningFixture({ opening, wall, roomSize, selected, onSelect, materialSet }) {
  const info = wallParts(wall, roomSize, []);
  const center = info.startWorld + opening.offset;
  const position = info.alongX
    ? [center, opening.sillHeight + opening.height / 2, info.fixedWorld]
    : [info.fixedWorld, opening.sillHeight + opening.height / 2, center];
  const isWindow = opening.type === "window";
  const variant = opening.variantId ?? {
    "Single door": "door-single",
    "Double door": "door-double",
    "Sliding door": "door-sliding",
    "Studio door": "door-dark",
    "Standard window": "window-standard",
    "Wide window": "window-wide",
    "Tall window": "window-tall",
    "Double window": "window-double",
  }[opening.name] ?? "";
  const frameColor = isWindow ? "#f8fafc" : "#6f5947";
  const panelColor = opening.color;
  const registerMaterial = (material) => { if (material && materialSet) materialSet.current.add(material); };
  const materialProps = (baseOpacity = 1) => ({
    ref: registerMaterial,
    transparent: baseOpacity < 1 || Boolean(materialSet),
    opacity: baseOpacity,
    userData: { baseOpacity },
  });
  const frameWidth = 0.07;
  const frameDepth = 0.15;
  const innerWidth = opening.width - frameWidth * 2;
  const innerHeight = opening.height - frameWidth * 2;
  const framePieces = [
    { position: [-opening.width / 2 + frameWidth / 2, 0, 0], size: [frameWidth, opening.height, frameDepth] },
    { position: [opening.width / 2 - frameWidth / 2, 0, 0], size: [frameWidth, opening.height, frameDepth] },
    { position: [0, opening.height / 2 - frameWidth / 2, 0], size: [opening.width, frameWidth, frameDepth] },
    ...(isWindow ? [{ position: [0, -opening.height / 2 + frameWidth / 2, 0], size: [opening.width, frameWidth, frameDepth] }] : []),
  ];

  return (
    <group position={position} rotation-y={info.alongX ? 0 : -Math.PI / 2} onPointerDown={(event) => { event.stopPropagation(); onSelect(opening.id); }}>
      {framePieces.map((piece, index) => (
        <mesh key={`frame-${index}`} position={piece.position}>
          <boxGeometry args={piece.size} />
          <meshStandardMaterial color={frameColor} roughness={0.55} {...materialProps()} />
          {selected && <Edges color="#e89b30" raycast={ignoreRaycast} />}
        </mesh>
      ))}

      {isWindow ? (
        <>
          <mesh>
            <boxGeometry args={[innerWidth, innerHeight, 0.035]} />
            <meshStandardMaterial color={opening.color} roughness={0.08} metalness={0.08} {...materialProps(0.48)} />
          </mesh>
          {(variant === "window-wide" || variant === "window-double") && (
            <mesh position={[0, 0, 0.045]}>
              <boxGeometry args={[0.055, innerHeight, frameDepth * 0.75]} />
              <meshStandardMaterial color={frameColor} {...materialProps()} />
            </mesh>
          )}
          {variant === "window-double" && (
            <mesh position={[0, 0, 0.09]}>
              <boxGeometry args={[innerWidth * 0.75, 0.035, 0.025]} />
              <meshStandardMaterial color={frameColor} {...materialProps()} />
            </mesh>
          )}
        </>
      ) : variant === "door-sliding" ? (
        <>
          {[-0.25, 0.25].map((factor) => (
            <group key={factor} position={[opening.width * factor, -frameWidth / 2, 0]}>
              <mesh>
                <boxGeometry args={[innerWidth / 2 - 0.025, innerHeight, 0.045]} />
                <meshStandardMaterial color="#b8d8e5" roughness={0.1} metalness={0.08} {...materialProps(0.55)} />
              </mesh>
              <mesh position={[0, 0, 0.04]}>
                <boxGeometry args={[0.045, innerHeight, 0.07]} />
                <meshStandardMaterial color="#475569" {...materialProps()} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, opening.height / 2 + 0.045, 0]}>
            <boxGeometry args={[opening.width + 0.14, 0.055, 0.09]} />
            <meshStandardMaterial color="#475569" metalness={0.5} roughness={0.35} {...materialProps()} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[0, -frameWidth / 2, 0]}>
            <boxGeometry args={[innerWidth, innerHeight, 0.055]} />
            <meshStandardMaterial color={panelColor} roughness={0.72} {...materialProps()} />
          </mesh>
          {variant === "door-double" && (
            <mesh position={[0, -frameWidth / 2, 0.045]}>
              <boxGeometry args={[0.035, innerHeight, 0.025]} />
              <meshStandardMaterial color={frameColor} {...materialProps()} />
            </mesh>
          )}
          {(variant === "door-double" ? [-0.25, 0.25] : [0]).flatMap((xFactor) =>
            [0.28, -0.28].map((yFactor) => (
              <mesh key={`${xFactor}-${yFactor}`} position={[innerWidth * xFactor, innerHeight * yFactor, 0.045]}>
                <boxGeometry args={[variant === "door-double" ? innerWidth * 0.38 : innerWidth * 0.72, innerHeight * 0.32, 0.025]} />
                <meshStandardMaterial color={panelColor} roughness={0.85} {...materialProps()} />
              </mesh>
            )),
          )}
          {variant === "door-dark" && [-0.3, -0.1, 0.1, 0.3].map((factor) => (
            <mesh key={factor} position={[0, innerHeight * factor, 0.047]}>
              <boxGeometry args={[innerWidth * 0.78, 0.018, 0.022]} />
              <meshStandardMaterial color="#1e293b" {...materialProps()} />
            </mesh>
          ))}
          {(variant === "door-double" ? [-0.09, 0.09] : [innerWidth * 0.34]).map((x) => (
            <mesh key={x} position={[x, 0, 0.095]}>
              <sphereGeometry args={[0.035, 12, 8]} />
              <meshStandardMaterial color="#d1a954" metalness={0.75} roughness={0.25} {...materialProps()} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}

function WallMeshes({ wall, roomSize, openings, color, selected, onWallPointerDown, onOpeningSelect, materialSet, connectedWalls }) {
  const { finishes, selectSurface } = useContext(WallFinishContext);
  const info = wallParts(wall, roomSize, openings, connectedWalls);
  const axis=info.alongX ? 0 : 2;
  const cuts=[...new Set([0,...(connectedWalls ?? []).filter((other)=>other.id!==wall.id).map((other)=>wallJunctionOffset(wall,other)).filter((offset)=>offset>0 && offset<info.length),info.length])].sort((a,b)=>a-b);
  const parts=info.parts.flatMap((part)=>{
    const from=part.position[axis]-part.size[axis]/2-info.startWorld;
    const to=from+part.size[axis];
    return cuts.slice(0,-1).flatMap((cut,index)=>{
      const low=Math.max(from,index===0?from:cut), high=Math.min(to,index===cuts.length-2?to:cuts[index+1]);
      if(high-low<.00001)return [];
      const position=[...part.position],size=[...part.size];position[axis]=info.startWorld+(low+high)/2;size[axis]=high-low;
      return [{position,size,cut,end:cuts[index+1],paintKey:`${wall.id}:${cut.toFixed(3)}:${cuts[index+1].toFixed(3)}`}];
    });
  });
  const prefix = `${wall.id}:`;
  const paintedSections = Object.entries(finishes).filter(([key]) => key.startsWith(prefix))
    .map(([key, finish]) => {
      const [start, end, face] = key.slice(prefix.length).split(':').map(Number);
      return { start, end, face, finish };
    });
  function paintFor(part, face) {
    const exact = finishes[`${part.paintKey}:${face}`];
    if (exact) return exact;
    // Junctions change section bounds. Carry paint from the best overlapping section on this face.
    let bestOverlap = 0.001;
    let finish = color;
    for (const section of paintedSections) {
      if (section.face !== face) continue;
      const overlap = Math.min(part.end, section.end) - Math.max(part.cut, section.start);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        finish = section.finish;
      }
    }
    return finish;
  }
  return (
    <>
      {parts.map((part, index) => (
        <mesh key={index} position={part.position} onPointerDown={(event) => { event.stopPropagation(); selectSurface(`${part.paintKey}:${event.face?.materialIndex ?? 4}`,part.position); onWallPointerDown(wall, event); }}>
          <boxGeometry args={part.size} />
          {Array.from({length:6},(_,face)=><meshStandardMaterial key={face} attach={`material-${face}`}
            ref={(material) => { if (material && materialSet) materialSet.current.add(material); }}
            color={paintFor(part, face)}
            transparent={Boolean(materialSet)}
          />)}
          {selected && <Edges color="#e89b30" raycast={ignoreRaycast} />}
        </mesh>
      ))}
      {openings.map((opening) => (
        <OpeningFixture key={opening.id} opening={opening} wall={wall} roomSize={roomSize} selected={opening.selected} onSelect={onOpeningSelect} materialSet={materialSet} />
      ))}
    </>
  );
}

function InteriorWall(props) {
  return <WallMeshes {...props} />;
}

function CameraAwareWall({ walking, wall, roomSize, openings, axis, side, color, onWallPointerDown, onOpeningSelect, connectedWalls }) {
  const wallRef = useRef();
  const materialSet = useRef(new Set());
  const topDownRef = useRef(false);
  const facingCameraRef = useRef(false);

  useFrame(({ camera }, delta) => {
    const horizontalDistance = Math.hypot(camera.position.x, camera.position.z);
    const cameraRatio = camera.position.y / Math.max(horizontalDistance, 0.001);
    if (topDownRef.current) {
      topDownRef.current = cameraRatio > 1.15;
    } else {
      topDownRef.current = cameraRatio > 1.35;
    }

    const cameraPosition = axis === "x" ? camera.position.x : camera.position.z;
    const axisDistance = Math.abs(cameraPosition);
    const axisShare = axisDistance / Math.max(horizontalDistance, 0.001);
    if (facingCameraRef.current) {
      facingCameraRef.current = axisShare > 0.25;
    } else {
      facingCameraRef.current = axisShare > 0.35;
    }

    const isFrontWall = facingCameraRef.current && cameraPosition * side > 0;
    const faded = !walking && !topDownRef.current && isFrontWall;
    const targetOpacity = faded ? FADED_OPACITY : 1;
    const wallGroup = wallRef.current;
    setSurfacePicking(wallGroup, !faded);
    for (const material of materialSet.current) {
      const materialTarget = targetOpacity * (material.userData.baseOpacity ?? 1);
      material.opacity = MathUtils.damp(material.opacity, materialTarget, 8, delta);
      material.depthWrite = !faded && material.opacity > 0.98;
    }
  });

  return (
    <group ref={wallRef}>
      <WallMeshes wall={wall} roomSize={roomSize} openings={openings} color={color} onWallPointerDown={onWallPointerDown} onOpeningSelect={onOpeningSelect} materialSet={materialSet} connectedWalls={connectedWalls} />
    </group>
  );
}

export default function Room({ gridVisible, tileGridVisible, historyRevision, settingsHost, optionsOpen, onToggleOptions, panelOpen, walking, walkInput, onWalkExit, onWalkHint, floorTiles, floorKeys, onFloorSelect, onFloorEdit, onSelectMode, objects, setObjects, walls, setWalls, openings, setOpenings, roomSize, selectedId, setSelectedId, selectedWallId, setSelectedWallId, selectedOpeningId, setSelectedOpeningId, onDeleteSelected, tool, activeOpening, wallColor, floorColor, wallFinishes, setWallFinishes }) {
  const [isDragging, setIsDragging] = useState(false);
  const [libraryGhost, setLibraryGhost] = useState(null);
  const [doorNotice, setDoorNotice] = useState('');
  const menuPosition = (object, camera, size, actionCount) => {
    const point = new Vector3().setFromMatrixPosition(object.matrixWorld).project(camera);
    const left = panelOpen && size.width >= 768 ? Math.min(380, size.width * 0.44) + 24 : 8;
    const height = actionCount * 44;
    return [
      MathUtils.clamp((point.x + 1) * size.width / 2, left, Math.max(left, size.width - 80)),
      MathUtils.clamp((1 - point.y) * size.height / 2 - height / 2, 42, Math.max(42, size.height - height - 8)),
    ];
  };
  const [furnitureNotice,setFurnitureNotice]=useState('');
  const [pendingPlacement,setPendingPlacement]=useState(null);
  const [placementNotice,setPlacementNotice]=useState('');
  useEffect(()=>{
    const request=(event)=>{setPendingPlacement(event.detail);setPlacementNotice(`Choose ${event.detail.placementType==='surface'?'a table, shelf, cabinet, bed or sofa':event.detail.placementType==='window'?'a window':event.detail.placementType==='ceiling'?'a point on the floor below the ceiling':'a wall'} for ${event.detail.name}.`);};
    window.addEventListener('home-designer-place-attached',request);
    return()=>window.removeEventListener('home-designer-place-attached',request);
  },[]);
  const placeAttached=(anchor)=>{
    if(!pendingPlacement)return;
    const definition=definitionOf(pendingPlacement);
    const base=pendingPlacement.relocateId?objects.find((entry)=>entry.id===pendingPlacement.relocateId):null;
    const instance=configureInstance(definition,base?.sizeId??definition.defaultSizeId,{...base,id:base?.id??Math.max(0,...objects.map((entry)=>entry.id))+1,cellX:0,cellZ:0,turns:base?.turns??0,anchor});
    setObjects((current)=>base?current.map((entry)=>entry.id===base.id?instance:entry):[...current,instance]);
    setSelectedId(instance.id);setSelectedWallId(null);setSelectedOpeningId(null);setPendingPlacement(null);setPlacementNotice('');
  };
  const [surface,setSurface]=useState(null);
  useEffect(() => {
    const toggle = (event) => document.getElementById(`door-toggle-${event.detail}`)?.click();
    window.addEventListener('home-designer-door-toggle',toggle);
    return () => window.removeEventListener('home-designer-door-toggle',toggle);
  }, []);
  const libraryItem = useRef(null);
  const { camera, gl } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const start = (event) => { libraryItem.current = event.detail; if (!event.detail) setLibraryGhost(null); };
    const clear = () => setLibraryGhost(null);
    const over = (event) => {
      if (walking) return;
      event.preventDefault(); event.dataTransfer.dropEffect = "copy";
      const item = libraryItem.current;
      if (!item) return;
      const rect = canvas.getBoundingClientRect();
      const ray = new Raycaster();
      ray.setFromCamera(new Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const point = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
      if (!point) return clear();
      const definition=definitionOf(item),configured=definition?configureInstance(definition,definition.defaultSizeId):null;
      const w = configured?.w ?? item.w * 2, d = configured?.d ?? item.d * 2;
      setLibraryGhost({ ...item, ...configured, id: "preview", w, d, height: configured?.height??2, source: configured?.source??"/furniture.glb", turns: 0,
        cellX: snapCoordinate((point.x + roomSize.width * CELL / 2) / CELL - w / 2),
        cellZ: snapCoordinate((point.z + roomSize.depth * CELL / 2) / CELL - d / 2) });
    };
    const drop = (event) => {
      if (walking) return;
      event.preventDefault();
      clear();
      const item = FURNITURE_CATALOG.find((entry) => entry.id === event.dataTransfer.getData("application/home-designer"));
      if (!item) return;
      const dropDefinition=definitionOf(item);
      if(dropDefinition?.placementType==='opening'){setPlacementNotice('Choose this opening in the catalog, then tap a wall.');return;}
      if(dropDefinition && dropDefinition.placementType!=='floor'){
        window.dispatchEvent(new CustomEvent('home-designer-place-attached',{detail:dropDefinition}));return;
      }
      const rect = canvas.getBoundingClientRect();
      const ray = new Raycaster();
      ray.setFromCamera(new Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
      const point = ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), 0), new Vector3());
      if (!point) return;
      const definition=definitionOf(item),configured=definition?configureInstance(definition,definition.defaultSizeId):null;
      const w = configured?.w ?? item.w * 2, d = configured?.d ?? item.d * 2;
      const cellX = snapCoordinate((point.x + roomSize.width * CELL / 2) / CELL - w / 2);
      const cellZ = snapCoordinate((point.z + roomSize.depth * CELL / 2) / CELL - d / 2);
      const candidate = { ...item,...configured, id: Math.max(0, ...objects.map((object) => object.id)) + 1, w, d, cellX, cellZ, turns: 0, height: configured?.height??2, source: configured?.source??"/furniture.glb" };
      if (cellX<0||cellZ<0||cellX+w>roomSize.width||cellZ+d>roomSize.depth|| (candidate.collisionLayer!=='rug'&&!canPlace(buildGrid(objects, roomSize.width, roomSize.depth), cellX, cellZ, w, d, undefined, roomSize.width, roomSize.depth)) || objectConflictsWithWalls(candidate, walls)) return;
      setObjects((current) => [...current, candidate]);
      setSelectedId(candidate.id);
      setSelectedWallId(null);
      setSelectedOpeningId(null);
    };
    canvas.addEventListener("dragover", over);
    canvas.addEventListener("dragleave", clear);
    window.addEventListener("home-designer-library-drag", start);
    canvas.addEventListener("drop", drop);
    return () => { canvas.removeEventListener("dragover", over); canvas.removeEventListener("drop", drop); canvas.removeEventListener("dragleave", clear); window.removeEventListener("home-designer-library-drag", start); };
  }, [camera, gl, objects, walls, roomSize, setObjects, setSelectedId, setSelectedWallId, setSelectedOpeningId, walking]);
  const connectedWalls = [...walls,
    { id: "outer-z-negative", startX: 0, startZ: 0, endX: roomSize.width, endZ: 0 },
    { id: "outer-z-positive", startX: 0, startZ: roomSize.depth, endX: roomSize.width, endZ: roomSize.depth },
    { id: "outer-x-negative", startX: 0, startZ: 0, endX: 0, endZ: roomSize.depth },
    { id: "outer-x-positive", startX: roomSize.width, startZ: 0, endX: roomSize.width, endZ: roomSize.depth },
  ];
  const [isDrawingWall, setIsDrawingWall] = useState(false);
  const [preview, setPreview] = useState(null);
  const [wallPreview, setWallPreview] = useState(null);
  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const gridRef = useRef(null);
  if (gridRef.current === null) {
    gridRef.current = buildGrid(objects, roomSize.width, roomSize.depth);
  }
  const dragRef = useRef(null);
  const lastPointerRef = useRef(null);
  const meshesRef = useRef(new Map());
  const sizeRef = useRef(roomSize);
  sizeRef.current = roomSize;
  const wallDraftRef = useRef(null);
  const wallsRef = useRef(walls);
  wallsRef.current = walls;
  const openingsRef = useRef(openings);
  openingsRef.current = openings;

  const registerMesh = useCallback((id, mesh) => {
    if (mesh) meshesRef.current.set(id, mesh);
    else meshesRef.current.delete(id);
  }, []);

  useEffect(() => {
    gridRef.current = buildGrid(objects, roomSize.width, roomSize.depth);
  }, [objects, roomSize]);

  useEffect(() => {
    dragRef.current = null;
    setIsDragging(false);
    setPreview(null);
  }, [roomSize]);

  const [cameraTransition, setCameraTransition] = useState(false);
  const floorDragRef = useRef(null);
  const [floorDrag, setFloorDrag] = useState(null);

  useEffect(() => {
    if (!historyRevision) return;
    const dragged = objectsRef.current.find((item) => item.id === dragRef.current?.id);
    const mesh = dragged && meshesRef.current.get(dragged.id);
    if (mesh) {
      const footprint = getFootprint(dragged.turns, dragged.w, dragged.d);
      const { width, depth } = sizeRef.current;
      const { x, z } = cellToWorld(dragged.cellX, dragged.cellZ, footprint.w, footprint.d, width, depth);
      mesh.position.set(x, 0, z);
    }
    dragRef.current = null;
    wallDraftRef.current = null;
    floorDragRef.current = null;
    setIsDragging(false);
    setIsDrawingWall(false);
    setPreview(null);
    setWallPreview(null);
    setFloorDrag(null);
    setPendingPlacement(null);
    setPlacementNotice('');
    setSurface(null);
  }, [historyRevision]);

  useEffect(() => {
    function cancelFloorDrag() {
      floorDragRef.current = null;
      setFloorDrag(null);
    }
    if (tool !== 'floor') cancelFloorDrag();
    window.addEventListener('pointercancel', cancelFloorDrag);
    window.addEventListener('blur', cancelFloorDrag);
    return () => {
      window.removeEventListener('pointercancel', cancelFloorDrag);
      window.removeEventListener('blur', cancelFloorDrag);
    };
  }, [tool]);

  const startDrag = useCallback((id, point) => {
    if (walking || cameraTransition || dragRef.current || floorDragRef.current) return;
    const obj = objectsRef.current.find((o) => o.id === id);
    if (!obj) return;
    if(pendingPlacement?.placementType==='ceiling'){
      if(pendingPlacement.sizes[0].height>WALL_HEIGHT){setPlacementNotice('This ceiling fixture is taller than the room.');return;}
      placeAttached({type:'ceiling',x:point.x+roomSize.width*CELL/2,z:point.z+roomSize.depth*CELL/2});return;
    }
    if(pendingPlacement && pendingPlacement.placementType!=='surface'){setPlacementNotice('Choose the requested wall or window.');return;}
    if(pendingPlacement?.placementType==='surface'){
      const parentDefinition=definitionOf(obj);
      if(!parentDefinition?.supportsSurface && !/table|desk|cabinet|bed|sofa|shelf|console/i.test(obj.name)){setPlacementNotice('Choose a compatible furniture surface.');return;}
      const base=resolveAttachment(obj,objects,walls,openings,roomSize);if(!base)return;
      const childDefinition=definitionOf(pendingPlacement),child=childDefinition.sizes[0],parent=parentDefinition?.sizes.find((size)=>size.id===obj.sizeId)??{width:obj.w*CELL,depth:obj.d*CELL};
      const dx=point.x-base.x,dz=point.z-base.z,a=-base.rotation;
      const x=dx*Math.cos(a)+dz*Math.sin(a),z=-dx*Math.sin(a)+dz*Math.cos(a);
      if(Math.abs(x)+child.width/2>parent.width/2 || Math.abs(z)+child.depth/2>parent.depth/2){setPlacementNotice('This decoration does not fit at that position. Choose a larger surface or a point nearer its center.');return;}
      placeAttached({type:'surface',parentId:id,x,z});return;
    }
    onSelectMode("furniture");
    if(!isFloor(obj)){setSelectedId(id);setSelectedWallId(null);setSelectedOpeningId(null);return;}
    removeObject(gridRef.current, id);
    const footprint = getFootprint(obj.turns, obj.w, obj.d);
    const { x, z } = cellToWorld(obj.cellX, obj.cellZ, footprint.w, footprint.d, sizeRef.current.width, sizeRef.current.depth);
    dragRef.current = {
      id,
      lastValid: { cellX: obj.cellX, cellZ: obj.cellZ },
      candidate: { cellX: obj.cellX, cellZ: obj.cellZ },
      footprint,
      lastPoint: point ? { x: point.x, z: point.z } : { x, z },
      valid: true,
    };
    lastPointerRef.current = dragRef.current.lastPoint;
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setSelectedId(id);
    setIsDragging(true);
    setPreview({ x, z, footprint, valid: true });
  }, [setSelectedId, setSelectedOpeningId, setSelectedWallId, onSelectMode,pendingPlacement,objects,walls,openings,roomSize,walking,cameraTransition]);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;

    const obj = objectsRef.current.find((o) => o.id === drag.id);
    if (!obj) {
      dragRef.current = null;
      setIsDragging(false);
      setPreview(null);
      return;
    }
    const grid = gridRef.current;
    const { candidate, lastValid, footprint } = drag;
    const target = drag.valid ? candidate : lastValid;
    placeObject(grid, target.cellX, target.cellZ, footprint.w, footprint.d, obj.id, sizeRef.current.width, sizeRef.current.depth);
    const mesh = meshesRef.current.get(obj.id);
    if (mesh) {
      const { x, z } = cellToWorld(target.cellX, target.cellZ, footprint.w, footprint.d, sizeRef.current.width, sizeRef.current.depth);
      mesh.position.set(x, 0, z);
    }
    setObjects((prev) =>
      prev.map((o) => o.id === obj.id ? { ...o, cellX: target.cellX, cellZ: target.cellZ } : o),
    );
    dragRef.current = null;
    setIsDragging(false);
    setPreview(null);
  }, []);

  const gridPoint = useCallback((point) => {
    const cornerX = -(sizeRef.current.width * CELL) / 2;
    const cornerZ = -(sizeRef.current.depth * CELL) / 2;
    return {
      x: Math.max(0, Math.min(sizeRef.current.width, snapCoordinate((point.x - cornerX) / CELL))),
      z: Math.max(0, Math.min(sizeRef.current.depth, snapCoordinate((point.z - cornerZ) / CELL))),
    };
  }, []);

  const updateWallDraft = useCallback((point) => {
    const draft = wallDraftRef.current;
    if (!draft) return;
    const next = gridPoint(point);
    const dx = Math.abs(next.x - draft.startX);
    const dz = Math.abs(next.z - draft.startZ);
    draft.endX = dx >= dz ? next.x : draft.startX;
    draft.endZ = dx >= dz ? draft.startZ : next.z;
    setWallPreview({ ...draft });
  }, [gridPoint]);

  const endWallDrawing = useCallback(() => {
    const draft = wallDraftRef.current;
    if (!draft) return;
    wallDraftRef.current = null;
    setIsDrawingWall(false);
    setWallPreview(null);
    if (draft.startX === draft.endX && draft.startZ === draft.endZ) return;
    const wall = { ...draft, id: `wall-${Date.now()}` };
    const conflictsWithWall = wallsRef.current.some((existing) => wallsConflict(wall, existing));
    const conflictsWithFurniture = objectsRef.current.some((object) => wallConflictsWithObject(wall, object));
    if (wallCrossesRaisedFloor(wall, floorTiles)) {
      setPlacementNotice('Walls cannot cross raised flooring.');
      return;
    }
    if (conflictsWithWall || conflictsWithFurniture) return;
    setPlacementNotice('');
    setWalls((current) => [...current, wall]);
    setSelectedId(null);
    setSelectedWallId(wall.id);
  }, [floorTiles, setSelectedId, setSelectedWallId, setWalls]);

  const selectOpening = useCallback((id) => {
    if (walking || cameraTransition) return;
    if(pendingPlacement?.placementType==='window'){
      const opening=openings.find((entry)=>entry.id===id);
      if(opening?.type!=='window'){setPlacementNotice('Choose a window for this treatment.');return;}
      const wall=connectedWalls.find((entry)=>entry.id===opening.wallId);
      const horizontal=wall?.startZ===wall?.endZ;
      const fixed=wall?(horizontal?wall.startZ*CELL-roomSize.depth*CELL/2:wall.startX*CELL-roomSize.width*CELL/2):0;
      const side=(horizontal?camera.position.z:camera.position.x)>=fixed?1:-1;
      placeAttached({type:'wall',openingId:id,height:Math.max(0,opening.sillHeight+opening.height-pendingPlacement.sizes[0].height),side});return;
    }
    onSelectMode("openings");
    setSelectedId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(id);
  }, [setSelectedId, setSelectedOpeningId, setSelectedWallId,pendingPlacement,openings,onSelectMode,walking,cameraTransition]);

  const handleWallPointerDown = useCallback((wall, event) => {
    if (walking || cameraTransition || floorDragRef.current || event.button !== 0) return;
    if(pendingPlacement && ['wall','window'].includes(pendingPlacement.placementType)){
      if(pendingPlacement.placementType==='window'){setPlacementNotice('Tap the window frame, not the wall.');return;}
      const info=wallParts(wall,roomSize,[]),preset=pendingPlacement.sizes[0];
      const raw=(info.alongX?event.point.x:event.point.z)-info.startWorld;
      if(preset.width>info.length || preset.height>WALL_HEIGHT){setPlacementNotice('This item is too large for this wall.');return;}
      const side=(info.alongX?event.face?.normal.z:event.face?.normal.x)>=0?1:-1;
      placeAttached({type:'wall',wallId:wall.id,offset:Math.max(preset.width/2,Math.min(info.length-preset.width/2,raw)),height:Math.max(0,Math.min(WALL_HEIGHT-preset.height,event.point.y-preset.height/2)),side});return;
    }
    if (tool === "openings" && activeOpening) {
      const info = wallParts(wall, sizeRef.current, []);
      if (activeOpening.sillHeight + activeOpening.height > WALL_HEIGHT || info.length < activeOpening.width + 0.3) return;
      const pointerPosition = info.alongX ? event.point.x : event.point.z;
      const offset = Math.max(
        activeOpening.width / 2 + 0.15,
        Math.min(info.length - activeOpening.width / 2 - 0.15, pointerPosition - info.startWorld),
      );
      const conflicts = openingsRef.current.some((opening) => (
        opening.wallId === wall.id
        && Math.abs(opening.offset - offset) < (opening.width + activeOpening.width) / 2 + 0.1
      ));
      const blocksJunction = wallsRef.current.some((otherWall) => {
        if (otherWall.id === wall.id) return false;
        const junctionOffset = wallJunctionOffset(wall, otherWall);
        return junctionOffset != null && Math.abs(junctionOffset - offset) < activeOpening.width / 2 + 0.1;
      });
      if (conflicts || blocksJunction) return;
      const opening = { ...activeOpening, variantId: activeOpening.id, id: `opening-${Date.now()}`, wallId: wall.id, offset };
      setOpenings((current) => [...current, opening]);
      selectOpening(opening.id);
      return;
    }
    {
      onSelectMode("wall");
      setSelectedId(null);
      setSelectedOpeningId(null);
      setSelectedWallId(wall.id);
    }
  }, [activeOpening, selectOpening, setOpenings, setSelectedId, setSelectedOpeningId, setSelectedWallId, tool,pendingPlacement,roomSize,onSelectMode,walking,cameraTransition]);

  useEffect(() => {
    const finishPointerAction = () => {
      endDrag();
      endWallDrawing();
    };
    window.addEventListener("pointerup", finishPointerAction);
    window.addEventListener("pointercancel", finishPointerAction);
    return () => {
      window.removeEventListener("pointerup", finishPointerAction);
      window.removeEventListener("pointercancel", finishPointerAction);
    };
  }, [endDrag, endWallDrawing]);

  function updateFloorDrag(event, drag) {
    const rect = gl.domElement.getBoundingClientRect();
    const current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const hit = event.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -drag.height), new Vector3());
    return {
      ...drag,
      end: hit && Math.hypot(current.x - drag.origin.x, current.y - drag.origin.y) >= 4
        ? floorCell(hit, roomSize) : drag.start,
    };
  }

  function finishFloorDrag(event) {
    const drag = floorDragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.stopPropagation();
    floorDragRef.current = null;
    setFloorDrag(null);
    onFloorSelect(selectedFloorKeys(updateFloorDrag(event, drag)));
  }

  function selectRaisedArea(event, tileKey) {
    if (walking || cameraTransition || !tileKey) return;
    const [x, z] = tileKey.split(',').map(Number);
    const keys = connectedFloorKeys(floorTiles, { x, z });
    if (!keys.length) return;
    event.stopPropagation();
    onSelectMode('floor');
    onFloorSelect(keys);
  }

  function handleMove(e) {
    const floorDraft = floorDragRef.current;
    if (floorDraft) {
      if (e.pointerId !== floorDraft.pointerId) return;
      e.stopPropagation();
      const next = updateFloorDrag(e, floorDraft);
      floorDragRef.current = next;
      setFloorDrag(next);
      return;
    }
    if (wallDraftRef.current) {
      updateWallDraft(e.point);
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    drag.lastPoint = { x: e.point.x, z: e.point.z };
    lastPointerRef.current = drag.lastPoint;
    const { w, d } = drag.footprint;
    const { x, z, cellX, cellZ } = snap(e.point.x, e.point.z, w, d, sizeRef.current.width, sizeRef.current.depth);
    const draggedObject = objectsRef.current.find((object) => object.id === drag.id);
    const candidate = draggedObject ? { ...draggedObject, cellX, cellZ } : null;
    const valid = (candidate?.collisionLayer==='rug'||canPlace(gridRef.current, cellX, cellZ, w, d, drag.id, sizeRef.current.width, sizeRef.current.depth))
      && candidate != null
      && !objectConflictsWithWalls(candidate, wallsRef.current);
    drag.valid = valid;
    drag.candidate = { cellX, cellZ };
    drag.lastValid = valid ? drag.candidate : drag.lastValid;
    const elevation = candidate ? floorElevation(candidate, floorTiles) : 0;
    setPreview({ x, z, elevation, footprint: drag.footprint, valid });
    const mesh = meshesRef.current.get(drag.id);
    if (mesh) mesh.position.set(x, elevation - (mesh.parent?.position.y ?? 0), z);
  }

  useEffect(() => {
    const rotateOrDelete = (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, dialog, [contenteditable="true"]')) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedId != null || selectedWallId != null || selectedOpeningId != null) {
          dragRef.current = null;
          setIsDragging(false);
          setPreview(null);
          onDeleteSelected();
        }
        return;
      }
      if ((event.type !== "home-designer-rotate" && event.key?.toLowerCase() !== "r") || selectedId == null) return;
      const obj = objectsRef.current.find((item) => item.id === selectedId);
      if (!obj) return;
      if (!isFloor(obj)) {
        const result = rotateFurniture(obj, 90, objectsRef.current, wallsRef.current, sizeRef.current);
        if (result.ok) setObjects((current) => current.map((entry) => entry.id === obj.id ? result.item : entry));
        return;
      }
      const drag = dragRef.current;
      if (!drag) removeObject(gridRef.current, obj.id);
      const nextTurns = ((rotationDegrees(obj.turns) + 90) % 360) / 90;
      const footprint = getFootprint(nextTurns, obj.w, obj.d);
      const oldFootprint = getFootprint(obj.turns, obj.w, obj.d);
      const anchor = drag?.lastPoint ?? lastPointerRef.current ?? cellToWorld(obj.cellX, obj.cellZ, oldFootprint.w, oldFootprint.d, sizeRef.current.width, sizeRef.current.depth);
      const snapped = snap(anchor.x, anchor.z, footprint.w, footprint.d, sizeRef.current.width, sizeRef.current.depth);
      const rotatedObject = { ...obj, turns: nextTurns, cellX: snapped.cellX, cellZ: snapped.cellZ };
      if (!canPlace(gridRef.current, snapped.cellX, snapped.cellZ, footprint.w, footprint.d, obj.id, sizeRef.current.width, sizeRef.current.depth)
        || objectConflictsWithWalls(rotatedObject, wallsRef.current)) {
        if (!drag) {
          placeObject(gridRef.current, obj.cellX, obj.cellZ, oldFootprint.w, oldFootprint.d, obj.id, sizeRef.current.width, sizeRef.current.depth);
        }
        return;
      }
      if (!drag) placeObject(gridRef.current, snapped.cellX, snapped.cellZ, footprint.w, footprint.d, obj.id, sizeRef.current.width, sizeRef.current.depth);
      if (drag) {
        drag.footprint = footprint;
        drag.candidate = { cellX: snapped.cellX, cellZ: snapped.cellZ };
        drag.lastValid = drag.candidate;
        drag.valid = true;
      }
      setObjects((prev) => prev.map((item) => item.id === obj.id ? { ...item, turns: nextTurns, cellX: snapped.cellX, cellZ: snapped.cellZ } : item));
      const mesh = meshesRef.current.get(obj.id);
      if (mesh) {
        mesh.position.set(snapped.x, 0, snapped.z);
        mesh.rotation.y = nextTurns * Math.PI / 2;
      }
      if (drag) {
        drag.lastPoint = anchor;
        lastPointerRef.current = anchor;
        setPreview({ x: snapped.x, z: snapped.z, footprint, valid: true });
      }
    };
    window.addEventListener("keydown", rotateOrDelete);
    window.addEventListener("home-designer-rotate", rotateOrDelete);
    return () => {
      window.removeEventListener("keydown", rotateOrDelete);
      window.removeEventListener("home-designer-rotate", rotateOrDelete);
    };
  }, [selectedId, selectedWallId, selectedOpeningId, onDeleteSelected, setObjects]);

  const handleFloorPointerDown = (event, tileKey) => {
    if (walking || cameraTransition) return;
    if (tool === "floor") {
      if (event.button !== 0 || floorDragRef.current) return;
      event.stopPropagation();
      const rect = gl.domElement.getBoundingClientRect();
      const origin = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const [x, z] = tileKey ? tileKey.split(',').map(Number) : [];
      const start = tileKey ? { x, z } : floorCell(event.point, roomSize);
      const draft = {
        start, end: start, origin, pointerId: event.pointerId,
        height: (floorTiles[tileKey]?.level ?? 0) * GRID_SPACING,
      };
      event.target.setPointerCapture(event.pointerId);
      floorDragRef.current = draft;
      setFloorDrag(draft);
      onFloorSelect(null);
      return;
    }
    if (event.object !== event.eventObject) return;
    if(pendingPlacement){
      if(pendingPlacement.placementType==='ceiling'){
        if(pendingPlacement.sizes[0].height>WALL_HEIGHT){setPlacementNotice('This ceiling fixture is taller than the room.');return;}
        placeAttached({type:'ceiling',x:event.point.x+roomSize.width*CELL/2,z:event.point.z+roomSize.depth*CELL/2});
      }else setPlacementNotice('Choose the requested wall, window or furniture surface.');
      return;
    }
    if (tool === "wall") {
      event.stopPropagation();
      const start = gridPoint(event.point);
      wallDraftRef.current = { startX: start.x, startZ: start.z, endX: start.x, endZ: start.z };
      setIsDrawingWall(true);
      setWallPreview({ ...wallDraftRef.current });
      setSelectedId(null);
      setSelectedWallId(null);
      setSelectedOpeningId(null);
      return;
    }
    setSelectedId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
  };

  function editWall(wall, dx, dz, resize = false) {
    const next = {
      ...wall,
      startX: resize ? wall.startX : snapCoordinate(wall.startX + dx),
      startZ: resize ? wall.startZ : snapCoordinate(wall.startZ + dz),
      endX: snapCoordinate(wall.endX + dx),
      endZ: snapCoordinate(wall.endZ + dz),
    };
    const after = wallParts(next, roomSize, []);
    const neighbors = connectedWalls.filter((entry) => entry.id !== wall.id);
    const openingsOnWall = openings.filter((entry) => entry.wallId === wall.id);
    const attachments = objects.filter((entry) => entry.anchor?.wallId === wall.id);
    const blocked = [next.startX, next.endX].some((x) => x < 0 || x > roomSize.width)
      || [next.startZ, next.endZ].some((z) => z < 0 || z > roomSize.depth)
      || after.length < CELL / 4
      || wallCrossesRaisedFloor(next, floorTiles)
      || neighbors.some((entry) => wallsConflict(next, entry))
      || objects.some((entry) => wallConflictsWithObject(next, entry));
    const cutsOpening = (host, other, opening) => {
      const offset = wallJunctionOffset(host, other);
      return offset != null && Math.abs(opening.offset - offset) < opening.width / 2 + .1;
    };
    const blocksOpening = openingsOnWall.some((entry) =>
      entry.offset + entry.width / 2 + .15 > after.length + 1e-9
      || neighbors.some((other) => cutsOpening(next, other, entry)))
      || neighbors.some((other) => openings.some((entry) =>
        entry.wallId === other.id && cutsOpening(other, next, entry)));
    const clipsAttachment = attachments.some((entry) => {
      const width = definitionOf(entry)?.sizes.find((size) => size.id === entry.sizeId)?.width ?? entry.w * CELL;
      return entry.anchor.offset + width / 2 > after.length + 1e-9;
    });
    if (blocked || blocksOpening || clipsAttachment) {
      setPlacementNotice('The wall cannot fit there. Check the room edges, raised flooring, furniture, walls, and fixtures.');
      return false;
    }
    setPlacementNotice('');
    setSurface(null);
    setWalls((current) => current.map((entry) => entry.id === wall.id ? next : entry));
    return true;
  }

  function toggleDoor(opening) {
    const wall = connectedWalls.find((entry) => entry.id === opening.wallId);
    if (!wall) return false;
    const info = wallParts(wall, roomSize, []);
    const depth = opening.width + .12;
    const min = opening.offset - opening.width / 2 - .08;
    const max = opening.offset + opening.width / 2 + .08;
    const fixed = (info.fixedWorld + (info.alongX ? roomSize.depth : roomSize.width) * CELL / 2) / CELL;
    const base = (info.startWorld + (info.alongX ? roomSize.width : roomSize.depth) * CELL / 2) / CELL;
    const flipped=opening.swingDirection===-1;
    const bounds = info.alongX ? { x: base + min / CELL, z: fixed + (flipped?0:-depth/CELL), w: (max-min)/CELL, d: depth/CELL + .2 } : { x: fixed + (flipped?-depth/CELL:0), z: base + min / CELL, w: depth/CELL + .2, d: (max-min)/CELL };
    const blocked = objects.some((object) => {
      if(!isFloor(object)||object.collisionLayer==='rug')return false;
      const size = getFootprint(object.turns, object.w, object.d);
      return object.cellX < bounds.x+bounds.w && object.cellX+size.w > bounds.x && object.cellZ < bounds.z+bounds.d && object.cellZ+size.d > bounds.z;
    }) || walls.some((other) => other.id !== wall.id && wallConflictsWithObject(other, {cellX:bounds.x,cellZ:bounds.z,w:bounds.w,d:bounds.d,turns:0}));
    if (!opening.isOpen && blocked) { setDoorNotice('Move nearby furniture or walls to open this door.'); return false; }
    setDoorNotice('');
    setOpenings((current) => current.map((entry) => entry.id === opening.id ? {...entry,isOpen:!entry.isOpen} : entry));
    return true;
  }

  return (
    <WallFinishContext.Provider value={{finishes:wallFinishes,selectSurface:(key,position)=>setSurface({key,position})}}>
      <OrbitControls enabled={!walking && !cameraTransition && !isDragging && !isDrawingWall && !floorDrag} minDistance={3} maxDistance={24} maxPolarAngle={Math.PI / 2 - 0.03} />
      <Walkthrough active={walking} input={walkInput} roomSize={roomSize} walls={connectedWalls}
        openings={openings} objects={objects} floorTiles={floorTiles} onExit={onWalkExit}
        onHint={onWalkHint} onTransition={setCameraTransition}
        onDoor={(opening) => { if (!toggleDoor(opening)) onWalkHint('Door blocked by furniture or a wall'); }} />
      <CameraAwareRoof walking={walking} roomSize={roomSize} color={wallColor} />
      {!walking && placementNotice && <Html fullscreen style={{pointerEvents:'none'}}><div className="placement-notice">{placementNotice}<button onClick={()=>{setPendingPlacement(null);setPlacementNotice('');}}>Cancel</button></div></Html>}
      {(selectedWallId != null || selectedOpeningId != null) && (() => {
        const opening = openings.find((entry) => entry.id === selectedOpeningId);
        const wall = connectedWalls.find((entry) => entry.id === (opening?.wallId ?? selectedWallId));
        if (!wall) return null;
        const info = wallParts(wall, roomSize, []);
        const along = info.startWorld + (opening ? opening.offset : info.length / 2);
        const position = info.alongX ? [along, opening ? opening.sillHeight + opening.height / 2 : WALL_HEIGHT / 2, info.fixedWorld] : [info.fixedWorld, opening ? opening.sillHeight + opening.height / 2 : WALL_HEIGHT / 2, along];
        const selectedSurface = !opening && surface?.key.startsWith(`${wall.id}:`) ? surface : null;
        const canEditWall = !opening && tool === 'wall' && walls.some((entry) => entry.id === wall.id);
        const canFlip = opening?.type === 'door' && !opening.variantId?.includes('sliding');
        const canDelete = !String(selectedWallId).startsWith('outer-');
        const actionCount = 1 + Number(opening?.type === 'door') + Number(canFlip) + Number(canDelete);
        return <Html position={selectedSurface?.position ?? position}
          calculatePosition={(object, camera, size) => menuPosition(object, camera, size, actionCount)} zIndexRange={[30, 20]}>
          {settingsHost && createPortal(<div className="selection-settings">
            <h2>{opening?.name ?? 'Wall settings'}</h2>
            {canEditWall && <div className="wall-edit-controls">
                <div>Move wall</div>
                <div className="wall-edit-buttons">
                  {[['Left', -1, 0], ['Right', 1, 0], ['Back', 0, -1], ['Forward', 0, 1]].map(([label, x, z]) => (
                    <RepeatWallButton key={label} onStep={() => editWall(wall, x / 3, z / 3)}>{label}</RepeatWallButton>
                  ))}
                </div>
                <div>Length · {info.length.toFixed(2)} m</div>
                <div className="wall-edit-buttons">
                  {[-1, 1].map((direction) => (
                    <RepeatWallButton key={direction} onStep={() => {
                      const step = direction / 3;
                      // Edit the high endpoint so attached offsets keep the same origin.
                      const ordered = wall.startX > wall.endX || wall.startZ > wall.endZ
                        ? { ...wall, startX: wall.endX, startZ: wall.endZ, endX: wall.startX, endZ: wall.startZ }
                        : wall;
                      return editWall(ordered, info.alongX ? step : 0, info.alongX ? 0 : step, true);
                    }}>{direction < 0 ? 'Shorten' : 'Extend'}</RepeatWallButton>
                  ))}
                </div>
              </div>}
            {opening && <Palette value={opening.finishColor ?? opening.color} onChange={(finishColor) =>
              setOpenings((current) => current.map((entry) => entry.id === opening.id ? { ...entry, finishColor } : entry))} />}
            {selectedSurface && <Palette key={selectedSurface.key} value={wallFinishes[selectedSurface.key] ?? wallColor}
              onChange={(color) => setWallFinishes((current) => ({ ...current, [selectedSurface.key]: color }))} />}
            {!opening && !selectedSurface && <p>Select a wall face to change its color.</p>}
          </div>, settingsHost)}
          <div className="selection-arc" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <span>{opening?.name ?? "Wall"}</span>
            {opening?.type === 'door' && <button id={`door-toggle-${opening.id}`} className="arc-open" title="Open or close door (double-click the door)" onClick={() => toggleDoor(opening)}>{opening.isOpen ? 'Close' : 'Open'}</button>}
            {doorNotice && opening?.type === 'door' && <p role="status" className="arc-notice">{doorNotice}</p>}
            {canFlip && <button title="Reverse door swing" aria-label="Reverse door swing" onClick={()=>setOpenings((current)=>current.map((entry)=>entry.id===opening.id?{...entry,isOpen:false,swingDirection:entry.swingDirection===-1?1:-1}:entry))}>⇄</button>}
            <ArcOptionsButton label={opening ? "Opening options" : "Wall options"} open={optionsOpen} onToggle={onToggleOptions} />
            {canDelete && <button className="arc-delete" aria-label={opening ? "Delete selected opening" : "Delete selected wall"} onClick={onDeleteSelected}>×</button>}
          </div>
        </Html>;
      })()}
      {libraryGhost && <Furniture obj={libraryGhost} roomSize={roomSize} ghost />}
      {selectedId != null && !isDragging && (() => {
        const item = objects.find((object) => object.id === selectedId);
        if (!item) return null;
        const definition = definitionOf(item);
        const canRotate = item.anchor?.type !== 'wall';
        const hasOptions = canRotate || (definition && (definition.sizes.length > 1 || item.anchor || Object.keys(definition.parts).length > 0));
        const footprint = getFootprint(item.turns, item.w, item.d);
        const point = cellToWorld(item.cellX, item.cellZ, footprint.w, footprint.d, roomSize.width, roomSize.depth);
        const attached=resolveAttachment(item,objects,walls,openings,roomSize);
        return <Html position={item.anchor&&attached?[attached.x,attached.y+.35,attached.z]:[point.x + footprint.w * CELL / 2, 0.8, point.z]} calculatePosition={(object, camera, size) => menuPosition(object, camera, size, 1 + Number(hasOptions) + Number(canRotate))} zIndexRange={[30, 20]}>
            {settingsHost && hasOptions && createPortal(<div className="selection-settings furniture-settings" key={item.id}>
              <h2>{item.name}</h2>
              {canRotate && <div className="furniture-rotation">
                <span id="rotation-label">Rotation</span>
                <div className="rotation-controls" role="group" aria-labelledby="rotation-label">
                  {[-5, 5].map((degrees) => <button key={degrees} type="button" className="editor-button"
                    aria-label={degrees < 0 ? "Decrease rotation by 5 degrees" : "Increase rotation by 5 degrees"}
                    onClick={() => {
                      const result = rotateFurniture(item, degrees, objects, walls, roomSize);
                      setFurnitureNotice(result.ok ? '' : result.message);
                      if (result.ok) setObjects((current) => current.map((entry) => entry.id === item.id ? result.item : entry));
                    }}>{degrees < 0 ? '−5°' : '+5°'}</button>)}
                  <output className="rotation-angle" aria-label="Current rotation">{rotationDegrees(item.turns)}°</output>
                </div>
              </div>}
              {definition?.sizes.length > 1 && <label>Size<select aria-label="Furniture size" value={item.sizeId} onChange={(event)=>{
                const result=resizeFurniture(item,event.target.value,objects,walls,roomSize);
                if(!result.ok){setFurnitureNotice(result.message);return;}
                setFurnitureNotice('');setObjects((current)=>current.map((entry)=>entry.id===item.id?result.item:entry));
              }}>{definition.sizes.map((preset)=><option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>}
              {item.anchor && definition && <button className="attachment-move" onClick={()=>window.dispatchEvent(new CustomEvent('home-designer-place-attached',{detail:{...definition,relocateId:item.id}}))}>Move to another support</button>}
              {item.anchor?.type==='wall' && <label>Mounting height<input data-layout-history type="range" min="0" max={Math.max(0,2.5-item.height)} step="0.05" value={item.anchor.height??.8} onChange={(event)=>{const height=Number(event.target.value);setObjects((current)=>current.map((entry)=>entry.id===item.id?{...entry,anchor:{...entry.anchor,height}}:entry));}}/></label>}
              {Object.entries(definition?.parts ?? {}).map(([part, group]) => {
                const label = part === 'legs' ? 'Wood / frame' : part;
                const original = definition.defaultFinishes?.[part];
                const presets = [...(original ? [['Original', original]] : []), ...FINISHES[group]];
                return <fieldset key={part}>
                  <legend>{label}</legend>
                  <Palette label={label} presets={presets} value={item.finishes?.[part] ?? original}
                    onChange={(color) => setObjects((current) => current.map((entry) => entry.id === item.id
                      ? { ...entry, finishes: { ...entry.finishes, [part]: color } }
                      : entry))} />
                </fieldset>;
              })}
              {furnitureNotice&&<p role="status">{furnitureNotice}</p>}
            </div>, settingsHost)}
          <div className="selection-arc" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <span>{item.name}</span>
            {canRotate && <button title="Rotate 90°" aria-label="Rotate selected furniture 90 degrees" onClick={() => window.dispatchEvent(new Event("home-designer-rotate"))}>↻</button>}
            {hasOptions && <ArcOptionsButton label="Furniture options" open={optionsOpen} onToggle={onToggleOptions} />}
            <button className="arc-delete" aria-label="Delete selected furniture" onClick={onDeleteSelected}>×</button>
          </div>
        </Html>;
      })()}

      <mesh rotation-x={-Math.PI / 2} position-y={-0.015} onPointerMove={handleMove} onPointerDown={handleFloorPointerDown} onPointerUp={finishFloorDrag}>
        <planeGeometry args={[roomSize.width * CELL, roomSize.depth * CELL]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} />
      </mesh>

      <FloorTiles tiles={floorTiles} showGrid={tileGridVisible} selection={tool === "floor" ? (floorDrag ? selectedFloorKeys(floorDrag) : floorKeys) : []}
        roomSize={roomSize} color={floorColor} onPointerDown={handleFloorPointerDown} onPointerMove={handleMove} onPointerUp={finishFloorDrag} onDoubleClick={selectRaisedArea} />
      {tool === 'floor' && !floorDrag && floorKeys.length > 0 && (() => {
        let x = 0, z = 0, min = 10, max = 0;
        for (const key of floorKeys) {
          const [col, row] = key.split(',').map(Number);
          const level = floorTiles[key]?.level ?? 0;
          x += col;
          z += row;
          min = Math.min(min, level);
          max = Math.max(max, level);
        }
        const position = [
          (x / floorKeys.length + 0.5) * GRID_SPACING - roomSize.width * CELL / 2,
          max * GRID_SPACING + 0.3,
          (z / floorKeys.length + 0.5) * GRID_SPACING - roomSize.depth * CELL / 2,
        ];
        return <Html position={position} calculatePosition={(object, camera, size) => menuPosition(object, camera, size, 3)} zIndexRange={[30, 20]}>
          {settingsHost && createPortal(<div className="selection-settings">
            <h2>Selected floor color</h2>
            <Palette value={floorTiles[floorKeys[0]]?.color ?? floorColor} onChange={(color) => onFloorEdit({ color })} />
            <button className="settings-action" type="button" onClick={() => onFloorEdit({ color: null })}>Use base floor color</button>
          </div>, settingsHost)}
          <div className="selection-arc" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
            <span>Floor · {floorKeys.length} {floorKeys.length === 1 ? 'cell' : 'cells'}
              <small>Height {min === max ? max : `${min}–${max}`} / 10</small>
            </span>
            <button type="button" aria-label="Raise selected floor" disabled={min === 10} onClick={() => onFloorEdit({ step: 1 })}>+</button>
            <ArcOptionsButton label="Floor color" open={optionsOpen} onToggle={onToggleOptions} />
            <button type="button" aria-label="Lower selected floor" disabled={max === 0} onClick={() => onFloorEdit({ step: -1 })}>−</button>
          </div>
        </Html>;
      })()}
      <RoomGrid widthCells={roomSize.width} depthCells={roomSize.depth} visible={gridVisible} />

      {preview && (
        <mesh position={[preview.x, (preview.elevation ?? 0) + 0.025, preview.z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[preview.footprint.w * CELL, preview.footprint.d * CELL]} />
          <meshBasicMaterial color={preview.valid ? "#60a5fa" : "#ef4444"} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}

      {wallPreview && (wallPreview.startX !== wallPreview.endX || wallPreview.startZ !== wallPreview.endZ) && (() => {
        const transform = wallTransform(wallPreview, roomSize);
        return (
          <mesh position={transform.position}>
            <boxGeometry args={transform.size} />
            <meshBasicMaterial color={wallCrossesRaisedFloor(wallPreview, floorTiles) ? "#dc2626" : "#2563eb"} transparent opacity={0.45} depthWrite={false} />
          </mesh>
        );
      })()}

      {walls.map((wall) => (
        <InteriorWall
          connectedWalls={connectedWalls}
          key={wall.id}
          wall={wall}
          roomSize={roomSize}
          openings={openings.filter((opening) => opening.wallId === wall.id).map((opening) => ({ ...opening, selected: opening.id === selectedOpeningId }))}
          color={wallColor}
          selected={wall.id === selectedWallId}
          onWallPointerDown={handleWallPointerDown}
          onOpeningSelect={selectOpening}
        />
      ))}

      {[
        { id: "outer-z-negative", axis: "z", side: -1, startX: 0, startZ: 0, endX: roomSize.width, endZ: 0 },
        { id: "outer-z-positive", axis: "z", side: 1, startX: 0, startZ: roomSize.depth, endX: roomSize.width, endZ: roomSize.depth },
        { id: "outer-x-negative", axis: "x", side: -1, startX: 0, startZ: 0, endX: 0, endZ: roomSize.depth },
        { id: "outer-x-positive", axis: "x", side: 1, startX: roomSize.width, startZ: 0, endX: roomSize.width, endZ: roomSize.depth },
      ].map((wall) => (
        <CameraAwareWall
          walking={walking}
          connectedWalls={connectedWalls}
          key={wall.id}
          wall={wall}
          roomSize={roomSize}
          openings={openings.filter((opening) => opening.wallId === wall.id).map((opening) => ({ ...opening, selected: opening.id === selectedOpeningId }))}
          axis={wall.axis}
          side={wall.side}
          color={wallColor}
          onWallPointerDown={handleWallPointerDown}
          onOpeningSelect={selectOpening}
        />
      ))}

      {objects.map((obj) => {
        let support = obj;
        const visited = new Set();
        while (support?.anchor?.type === 'surface' && !visited.has(support.id)) {
          visited.add(support.id);
          support = objects.find((entry) => entry.id === support.anchor.parentId);
        }
        const elevation = support && isFloor(support) ? floorElevation(support, floorTiles) : 0;
        return <group key={obj.id} position-y={elevation}>
        <Furniture
          obj={obj}
          registerMesh={registerMesh}
          onDragStart={startDrag}
          roomSize={roomSize}
          objects={objects}
          walls={walls}
          openings={openings}
        />
        </group>;
      })}
    </WallFinishContext.Provider>
  );
}
