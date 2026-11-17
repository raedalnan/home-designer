import { Suspense, createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { Edges, Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Plane, Raycaster, Vector2, Vector3 } from "three";
import {FURNITURE_REGISTRY,FINISHES,configureInstance,definitionOf} from '../data/FurnitureRegistry.js';
const FURNITURE_CATALOG=FURNITURE_REGISTRY;
import { CELL } from "../data/Constants.js";
import { snap, snapCoordinate, cellToWorld, buildGrid, placeObject, removeObject, canPlace, getFootprint } from "../logic/Grid.js";
import { objectConflictsWithWalls, wallConflictsWithObject, wallsConflict } from "../logic/Walls.js";
import Furniture from "./Furniture.jsx";
import RoomGrid from "./RoomGrid.jsx";
import ArchitecturalOpening from "./ArchitecturalOpening.jsx";
import ColorPicker from "../UI/ColorPicker.jsx";
import {resizeFurniture} from '../logic/FurnitureCommands.js';
import {resolveAttachment,isFloor} from '../logic/Attachments.js';

const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.1;
const WallFinishContext = createContext({});
const FADED_OPACITY = 0.001;
const ignoreRaycast = () => {};
function menuPosition(object,camera,size){
  const point=new Vector3().setFromMatrixPosition(object.matrixWorld).project(camera);
  return [MathUtils.clamp((point.x+1)*size.width/2,32,Math.max(32,size.width-360)),MathUtils.clamp((1-point.y)*size.height/2,160,Math.max(160,size.height-320))];
}

function setSurfacePicking(group, enabled) {
  group.traverse((object) => {
    if (!object.isMesh) return;
    object.userData.surfaceRaycast ??= object.raycast;
    object.raycast = enabled ? object.userData.surfaceRaycast : ignoreRaycast;
  });
}

function CameraAwareRoof({ roomSize, color }) {
  const roofRef = useRef();
  const materialRef = useRef();
  useFrame(({ camera }, delta) => {
    // From above, the roof would obscure the workspace beneath it.
    const obscuresRoom = camera.position.y >= WALL_HEIGHT;
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
      return [{position,size,paintKey:`${wall.id}:${cut.toFixed(3)}:${cuts[index+1].toFixed(3)}`}];
    });
  });
  return (
    <>
      {parts.map((part, index) => (
        <mesh key={index} position={part.position} onPointerDown={(event) => { event.stopPropagation(); selectSurface(`${part.paintKey}:${event.face?.materialIndex ?? 4}`,part.position); onWallPointerDown(wall, event); }}>
          <boxGeometry args={part.size} />
          {Array.from({length:6},(_,face)=><meshStandardMaterial key={face} attach={`material-${face}`}
            ref={(material) => { if (material && materialSet) materialSet.current.add(material); }}
            color={finishes[`${part.paintKey}:${face}`] ?? color}
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

function CameraAwareWall({ wall, roomSize, openings, axis, side, color, onWallPointerDown, onOpeningSelect, connectedWalls }) {
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
    const faded = !topDownRef.current && isFrontWall;
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

export default function Room({ objects, setObjects, walls, setWalls, openings, setOpenings, roomSize, selectedId, setSelectedId, selectedWallId, setSelectedWallId, selectedOpeningId, setSelectedOpeningId, onDeleteSelected, tool, activeOpening, wallColor, floorColor }) {
  const [isDragging, setIsDragging] = useState(false);
  const [libraryGhost, setLibraryGhost] = useState(null);
  const [doorNotice, setDoorNotice] = useState('');
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
  const [wallFinishes,setWallFinishes]=useState(()=>{try{return JSON.parse(localStorage.getItem('home-designer-wall-finishes'))??{};}catch{return {};}});
  useEffect(()=>{localStorage.setItem('home-designer-wall-finishes',JSON.stringify(wallFinishes));},[wallFinishes]);
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
  }, [camera, gl, objects, walls, roomSize, setObjects, setSelectedId, setSelectedWallId, setSelectedOpeningId]);
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

  const startDrag = useCallback((id, point) => {
    if (tool !== "furniture" || dragRef.current) return;
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
  }, [setSelectedId, setSelectedOpeningId, setSelectedWallId, tool,pendingPlacement,objects,walls,openings,roomSize]);

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
    if (conflictsWithWall || conflictsWithFurniture) return;
    setWalls((current) => [...current, wall]);
    setSelectedId(null);
    setSelectedWallId(wall.id);
  }, [setSelectedId, setSelectedWallId, setWalls]);

  const selectOpening = useCallback((id) => {
    if(pendingPlacement?.placementType==='window'){
      const opening=openings.find((entry)=>entry.id===id);
      if(opening?.type!=='window'){setPlacementNotice('Choose a window for this treatment.');return;}
      const wall=connectedWalls.find((entry)=>entry.id===opening.wallId);
      const horizontal=wall?.startZ===wall?.endZ;
      const fixed=wall?(horizontal?wall.startZ*CELL-roomSize.depth*CELL/2:wall.startX*CELL-roomSize.width*CELL/2):0;
      const side=(horizontal?camera.position.z:camera.position.x)>=fixed?1:-1;
      placeAttached({type:'wall',openingId:id,height:Math.max(0,opening.sillHeight+opening.height-pendingPlacement.sizes[0].height),side});return;
    }
    setSelectedId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(id);
  }, [setSelectedId, setSelectedOpeningId, setSelectedWallId,pendingPlacement,openings]);

  const handleWallPointerDown = useCallback((wall, event) => {
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
      setSelectedId(null);
      setSelectedOpeningId(null);
      setSelectedWallId(wall.id);
    }
  }, [activeOpening, selectOpening, setOpenings, setSelectedId, setSelectedOpeningId, setSelectedWallId, tool,pendingPlacement,roomSize]);

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

  function handleMove(e) {
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
    setPreview({ x, z, footprint: drag.footprint, valid });
    const mesh = meshesRef.current.get(drag.id);
    if (mesh) mesh.position.set(x, 0, z);
  }

  useEffect(() => {
    const rotateOrDelete = (event) => {
      if (event.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
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
      if(!isFloor(obj)){
        if(obj.anchor?.type!=='wall')setObjects((current)=>current.map((entry)=>entry.id===obj.id?{...entry,turns:((entry.turns??0)+1)%4}:entry));
        return;
      }
      const drag = dragRef.current;
      if (!drag) removeObject(gridRef.current, obj.id);
      const nextTurns = ((obj.turns ?? 0) + 1) % 4;
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

  const handleFloorPointerDown = (event) => {
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

  return (
    <WallFinishContext.Provider value={{finishes:wallFinishes,selectSurface:(key,position)=>setSurface({key,position})}}>
      <OrbitControls enabled={!isDragging && !isDrawingWall} minDistance={3} maxDistance={24} maxPolarAngle={Math.PI / 2 - 0.03} />
      <CameraAwareRoof roomSize={roomSize} color={wallColor} />
      {placementNotice && <Html fullscreen style={{pointerEvents:'none'}}><div className="placement-notice">{placementNotice}<button onClick={()=>{setPendingPlacement(null);setPlacementNotice('');}}>Cancel</button></div></Html>}
      {(selectedWallId != null || selectedOpeningId != null) && (() => {
        const opening = openings.find((entry) => entry.id === selectedOpeningId);
        const wall = connectedWalls.find((entry) => entry.id === (opening?.wallId ?? selectedWallId));
        if (!wall) return null;
        const info = wallParts(wall, roomSize, []);
        const along = info.startWorld + (opening ? opening.offset : info.length / 2);
        const position = info.alongX ? [along, opening ? opening.sillHeight + opening.height / 2 : WALL_HEIGHT / 2, info.fixedWorld] : [info.fixedWorld, opening ? opening.sillHeight + opening.height / 2 : WALL_HEIGHT / 2, along];
        return <Html position={!opening && surface ? surface.position : position} calculatePosition={menuPosition} zIndexRange={[30, 20]}>
          <div className="selection-arc" onPointerDown={(event) => event.stopPropagation()}>
            <span>{opening?.name ?? "Interior wall"}<small>Selected</small></span>
            {!opening && surface && <ColorPicker value={wallFinishes[surface.key] ?? wallColor} onChange={(color)=>setWallFinishes((current)=>({...current,[surface.key]:color}))} />}
            {opening?.type==='door' && !opening.variantId?.includes('sliding') && <button className="arc-flip" title="Reverse door swing" aria-label="Reverse door swing" onClick={()=>setOpenings((current)=>current.map((entry)=>entry.id===opening.id?{...entry,isOpen:false,swingDirection:entry.swingDirection===-1?1:-1}:entry))}>⇄</button>}
            {opening && <ColorPicker value={opening.finishColor ?? opening.color} onChange={(finishColor)=>setOpenings((current)=>current.map((entry)=>entry.id===opening.id?{...entry,finishColor}:entry))} />}
            {opening?.type === 'door' && <button id={`door-toggle-${opening.id}`} className="arc-open" title="Open or close door (double-click the door)" onClick={() => {
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
              if (!opening.isOpen && blocked) { setDoorNotice('Move nearby furniture or walls to open this door.'); return; }
              setDoorNotice('');
              setOpenings((current) => current.map((entry) => entry.id === opening.id ? {...entry,isOpen:!entry.isOpen} : entry));
            }}>{opening.isOpen ? 'Close' : 'Open'}</button>}
            {doorNotice && opening?.type === 'door' && <p role="status" style={{width:180,position:'absolute',top:140,background:'white',padding:8,fontSize:12}}>{doorNotice}</p>}
            {!String(selectedWallId).startsWith('outer-') && <button aria-label={opening ? "Delete selected opening" : "Delete selected wall"} onClick={onDeleteSelected}>×</button>}
          </div>
        </Html>;
      })()}
      {libraryGhost && <Furniture obj={libraryGhost} roomSize={roomSize} ghost />}
      {selectedId != null && !isDragging && (() => {
        const item = objects.find((object) => object.id === selectedId);
        if (!item) return null;
        const footprint = getFootprint(item.turns, item.w, item.d);
        const point = cellToWorld(item.cellX, item.cellZ, footprint.w, footprint.d, roomSize.width, roomSize.depth);
        const attached=resolveAttachment(item,objects,walls,openings,roomSize);
        return <Html position={item.anchor&&attached?[attached.x,attached.y+.35,attached.z]:[point.x + footprint.w * CELL / 2, 0.8, point.z]} calculatePosition={menuPosition} zIndexRange={[30, 20]}>
          <div className="selection-arc" onPointerDown={(event) => event.stopPropagation()}>
            <span>{item.name}<small>Selected</small></span>
            {definitionOf(item) && <div className="furniture-settings" onPointerDown={(event)=>event.stopPropagation()}>
              <label>Size<select aria-label="Furniture size" value={item.sizeId} onChange={(event)=>{
                const result=resizeFurniture(item,event.target.value,objects,walls,roomSize);
                if(!result.ok){setFurnitureNotice(result.message);return;}
                setFurnitureNotice('');setObjects((current)=>current.map((entry)=>entry.id===item.id?result.item:entry));
              }}>{definitionOf(item).sizes.map((preset)=><option key={preset.id} value={preset.id}>{preset.label}</option>)}</select></label>
              {item.anchor && <button className="attachment-move" onClick={()=>window.dispatchEvent(new CustomEvent('home-designer-place-attached',{detail:{...definitionOf(item),relocateId:item.id}}))}>Move to another support</button>}
              {item.anchor?.type==='wall' && <label>Mounting height<input type="range" min="0" max={Math.max(0,2.5-item.height)} step="0.05" value={item.anchor.height??.8} onChange={(event)=>{const height=Number(event.target.value);setObjects((current)=>current.map((entry)=>entry.id===item.id?{...entry,anchor:{...entry.anchor,height}}:entry));}}/></label>}
              {Object.entries(definitionOf(item).parts).map(([part,group])=><fieldset key={part}><legend>{part==='legs'?'Wood / frame':part}</legend><div>{[...(definitionOf(item).defaultFinishes?.[part]?[['Original',definitionOf(item).defaultFinishes[part]]]:[]),...FINISHES[group]].map(([name,color])=><button key={name} title={name} aria-label={`${part}: ${name}`} aria-pressed={item.finishes?.[part]===color} style={{background:color}} onClick={()=>setObjects((current)=>current.map((entry)=>entry.id===item.id?{...entry,finishes:{...entry.finishes,[part]:color}}:entry))}/>)}</div></fieldset>)}
              {furnitureNotice&&<p role="status">{furnitureNotice}</p>}
            </div>}
            <button aria-label="Rotate selected furniture" onClick={() => window.dispatchEvent(new Event("home-designer-rotate"))}>↻</button>
            <button aria-label="Delete selected furniture" onClick={onDeleteSelected}>×</button>
          </div>
        </Html>;
      })()}

      <mesh rotation-x={-Math.PI / 2} position-y={-0.015} onPointerMove={handleMove} onPointerDown={handleFloorPointerDown}>
        <planeGeometry args={[roomSize.width * CELL, roomSize.depth * CELL]} />
        <meshStandardMaterial color={floorColor} roughness={0.9} />
      </mesh>

      <RoomGrid widthCells={roomSize.width} depthCells={roomSize.depth} visible={tool === "wall" || tool === "openings" || isDragging || selectedId != null} />

      {preview && (
        <mesh position={[preview.x, 0.025, preview.z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[preview.footprint.w * CELL, preview.footprint.d * CELL]} />
          <meshBasicMaterial color={preview.valid ? "#60a5fa" : "#ef4444"} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}

      {wallPreview && (wallPreview.startX !== wallPreview.endX || wallPreview.startZ !== wallPreview.endZ) && (() => {
        const transform = wallTransform(wallPreview, roomSize);
        return (
          <mesh position={transform.position}>
            <boxGeometry args={transform.size} />
            <meshBasicMaterial color="#2563eb" transparent opacity={0.45} depthWrite={false} />
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

      {objects.map((obj) => (
      <Furniture
          key={obj.id}
          obj={obj}
          registerMesh={registerMesh}
          onDragStart={startDrag}
          roomSize={roomSize}
          objects={objects}
          walls={walls}
          openings={openings}
        />
      ))}
    </WallFinishContext.Provider>
  );
}
