import { useCallback, useEffect, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MathUtils } from "three";
import { CELL } from "../data/Constants.js";
import { snap, cellToWorld, buildGrid, placeObject, removeObject, canPlace, getFootprint } from "../logic/Grid.js";
import { objectConflictsWithWalls, wallConflictsWithObject, wallsConflict } from "../logic/Walls.js";
import Furniture from "./Furniture.jsx";
import RoomGrid from "./RoomGrid.jsx";

const WALL_HEIGHT = 2.5;
const WALL_THICKNESS = 0.1;

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

function wallParts(wall, roomSize, openings) {
  const alongX = wall.startZ === wall.endZ;
  const cornerX = -(roomSize.width * CELL) / 2;
  const cornerZ = -(roomSize.depth * CELL) / 2;
  const startCell = alongX ? Math.min(wall.startX, wall.endX) : Math.min(wall.startZ, wall.endZ);
  const endCell = alongX ? Math.max(wall.startX, wall.endX) : Math.max(wall.startZ, wall.endZ);
  const fixedCell = alongX ? wall.startZ : wall.startX;
  const startWorld = (alongX ? cornerX : cornerZ) + startCell * CELL;
  const fixedWorld = (alongX ? cornerZ : cornerX) + fixedCell * CELL;
  const length = (endCell - startCell) * CELL;
  const parts = [];
  const addPart = (from, to, bottom = 0, height = WALL_HEIGHT) => {
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

function OpeningFixture({ opening, wall, roomSize, selected, onSelect, materialSet }) {
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
  const frameColor = selected ? "#60a5fa" : isWindow ? "#f8fafc" : "#6f5947";
  const panelColor = selected ? "#93c5fd" : opening.color;
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
        </mesh>
      ))}

      {isWindow ? (
        <>
          <mesh>
            <boxGeometry args={[innerWidth, innerHeight, 0.035]} />
            <meshStandardMaterial color={selected ? "#7dd3fc" : opening.color} roughness={0.08} metalness={0.08} {...materialProps(0.48)} />
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

function WallMeshes({ wall, roomSize, openings, color, selected, onWallPointerDown, onOpeningSelect, materialSet }) {
  const { parts } = wallParts(wall, roomSize, openings);
  return (
    <>
      {parts.map((part, index) => (
        <mesh key={index} position={part.position} onPointerDown={(event) => { event.stopPropagation(); onWallPointerDown(wall, event); }}>
          <boxGeometry args={part.size} />
          <meshStandardMaterial
            ref={(material) => { if (material && materialSet) materialSet.current.add(material); }}
            color={selected ? "#94a3b8" : color}
            transparent={Boolean(materialSet)}
          />
        </mesh>
      ))}
      {openings.map((opening) => (
        <OpeningFixture key={opening.id} opening={opening} wall={wall} roomSize={roomSize} selected={opening.selected} onSelect={onOpeningSelect} materialSet={materialSet} />
      ))}
    </>
  );
}

function InteriorWall({ wall, roomSize, openings, color, selected, onWallPointerDown, onOpeningSelect }) {
  return <WallMeshes wall={wall} roomSize={roomSize} openings={openings} color={color} selected={selected} onWallPointerDown={onWallPointerDown} onOpeningSelect={onOpeningSelect} />;
}

function CameraAwareWall({ wall, roomSize, openings, axis, side, color, onWallPointerDown, onOpeningSelect }) {
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
    const targetOpacity = topDownRef.current || !isFrontWall ? 1 : 0;
    const wallGroup = wallRef.current;

    if (targetOpacity > 0) wallGroup.visible = true;
    let opacity = targetOpacity;
    for (const material of materialSet.current) {
      const materialTarget = targetOpacity * (material.userData.baseOpacity ?? 1);
      material.opacity = MathUtils.damp(material.opacity, materialTarget, 8, delta);
      material.depthWrite = material.opacity > 0.98;
      opacity = Math.max(opacity === targetOpacity ? 0 : opacity, material.opacity);
    }
    if (targetOpacity === 0 && opacity < 0.01) wallGroup.visible = false;
  });

  return (
    <group ref={wallRef}>
      <WallMeshes wall={wall} roomSize={roomSize} openings={openings} color={color} onWallPointerDown={onWallPointerDown} onOpeningSelect={onOpeningSelect} materialSet={materialSet} />
    </group>
  );
}

export default function Room({ objects, setObjects, walls, setWalls, openings, setOpenings, roomSize, selectedId, setSelectedId, selectedWallId, setSelectedWallId, selectedOpeningId, setSelectedOpeningId, onDeleteSelected, tool, activeOpening, wallColor, floorColor }) {
  const [isDragging, setIsDragging] = useState(false);
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
  }, [setSelectedId, setSelectedOpeningId, setSelectedWallId, tool]);

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
      x: Math.max(0, Math.min(sizeRef.current.width, Math.round((point.x - cornerX) / CELL))),
      z: Math.max(0, Math.min(sizeRef.current.depth, Math.round((point.z - cornerZ) / CELL))),
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
    setSelectedId(null);
    setSelectedWallId(null);
    setSelectedOpeningId(id);
  }, [setSelectedId, setSelectedOpeningId, setSelectedWallId]);

  const handleWallPointerDown = useCallback((wall, event) => {
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
    if (!String(wall.id).startsWith("outer-")) {
      setSelectedId(null);
      setSelectedOpeningId(null);
      setSelectedWallId(wall.id);
    }
  }, [activeOpening, selectOpening, setOpenings, setSelectedId, setSelectedOpeningId, setSelectedWallId, tool]);

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
    const valid = canPlace(gridRef.current, cellX, cellZ, w, d, drag.id, sizeRef.current.width, sizeRef.current.depth)
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
    <>
      <OrbitControls enabled={!isDragging && !isDrawingWall} minDistance={3} maxDistance={24} maxPolarAngle={Math.PI / 2 - 0.03} />

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
        />
      ))}
    </>
  );
}
