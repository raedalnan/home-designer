import { useCallback, useEffect, useRef, useState } from "react";
import { OrbitControls } from "@react-three/drei";
import { CELL } from "../data/Constants";
import { snap, cellToWorld, buildGrid, placeObject, removeObject, canPlace, getFootprint } from "../logic/Grid";
import Furniture from "./Furniture.jsx";
import RoomGrid from "./RoomGrid.jsx";

export default function Room({ objects, setObjects, roomSize, selectedId, setSelectedId, onDeleteSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState(null);
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
    if (dragRef.current) return;
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
    setSelectedId(id);
    setIsDragging(true);
    setPreview({ x, z, footprint, valid: true });
  }, []);

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

  useEffect(() => {
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    return () => {
      window.removeEventListener("pointerup", endDrag);
      window.removeEventListener("pointercancel", endDrag);
    };
  }, [endDrag]);

  function handleMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    drag.lastPoint = { x: e.point.x, z: e.point.z };
    lastPointerRef.current = drag.lastPoint;
    const { w, d } = drag.footprint;
    const { x, z, cellX, cellZ } = snap(e.point.x, e.point.z, w, d, sizeRef.current.width, sizeRef.current.depth);
    const valid = canPlace(gridRef.current, cellX, cellZ, w, d, drag.id, sizeRef.current.width, sizeRef.current.depth);
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
        if (selectedId != null) {
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
      if (!canPlace(gridRef.current, snapped.cellX, snapped.cellZ, footprint.w, footprint.d, obj.id, sizeRef.current.width, sizeRef.current.depth)) {
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
  }, [selectedId, onDeleteSelected, setObjects]);

  return (
    <>
      <OrbitControls enabled={!isDragging} minDistance={3} maxDistance={24} maxPolarAngle={Math.PI / 2 - 0.03} />

      <mesh rotation-x={-Math.PI / 2} position-y={-0.015} onPointerMove={handleMove} onPointerDown={(e) => { if (e.object === e.eventObject) setSelectedId(null); }}>
        <planeGeometry args={[roomSize.width * CELL, roomSize.depth * CELL]} />
        <meshStandardMaterial color="#e8e2d9" roughness={0.9} />
      </mesh>

      <RoomGrid widthCells={roomSize.width} depthCells={roomSize.depth} visible={isDragging || selectedId != null} />

      {preview && (
        <mesh position={[preview.x, 0.025, preview.z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[preview.footprint.w * CELL, preview.footprint.d * CELL]} />
          <meshBasicMaterial color={preview.valid ? "#60a5fa" : "#ef4444"} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}

      {[
        { position: [0, 1.25, -(roomSize.depth * CELL) / 2], size: [roomSize.width * CELL, 2.5, 0.12] },
        { position: [0, 1.25, (roomSize.depth * CELL) / 2], size: [roomSize.width * CELL, 2.5, 0.12] },
        { position: [-(roomSize.width * CELL) / 2, 1.25, 0], size: [0.12, 2.5, roomSize.depth * CELL] },
        { position: [(roomSize.width * CELL) / 2, 1.25, 0], size: [0.12, 2.5, roomSize.depth * CELL] },
      ].map((wall, index) => <mesh key={index} position={wall.position}><boxGeometry args={wall.size} /><meshStandardMaterial color="#ded8cf" /></mesh>)}

      {objects.map((obj) => (
      <Furniture
          key={obj.id}
          obj={obj}
          registerMesh={registerMesh}
          onDragStart={startDrag}
          selected={obj.id === selectedId}
          roomSize={roomSize}
        />
      ))}
    </>
  );
}
