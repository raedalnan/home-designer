import { useState, useMemo } from "react";
import { FURNITURE_CATALOG, FURNITURE_MATERIALS } from "../data/FurnitureCatalog.js";
import { OPENING_CATALOG } from "../data/OpeningCatalog.js";
import { COLOR_PALETTE } from "../data/ColorPalette.js";
import { Palette } from './ColorPicker.jsx';

const CATEGORIES = [
  "All",
  "Living",
  "Bedroom",
  "Storage",
  "Lighting",
  "Bathroom",
];

const WALL_COLORS = COLOR_PALETTE.map(({hex})=>hex);
const FLOOR_COLORS = WALL_COLORS;

const ICON_PATHS = {
  panelL: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  rotate: <><path d="M20 7v5h-5" /><path d="M18.2 16a8 8 0 1 1 .7-8.7L20 12" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /><path d="M10 11v5M14 11v5" /></>,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  wall: <><path d="M4 5h16v14H4z" /><path d="M4 10h16M9 5v5M15 10v4M4 14h16M10 14v5" /></>,
  chair: <><path d="M7 13V8a5 5 0 0 1 10 0v5M5 13h14v4H5z" /><path d="M7 17v3M17 17v3" /></>,
  opening: <><path d="M5 20V4h14v16" /><path d="M9 20V8h7v12M14 14h.01" /></>,
};

function Icon({ name, className = "size-4" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}
function Thumb({ item, hex }) {
  const { type, seats = 1 } = item;
  let shape;
  if (type === "sofa") {
    const cushionWidth = 36 / seats;
    shape = <>
      <rect x="8" y="24" width="8" height="23" rx="3" />
      <rect x="48" y="24" width="8" height="23" rx="3" />
      <rect x="13" y="15" width="38" height="15" rx="4" />
      {Array.from({ length: seats }, (_, index) => <rect key={index} x={14 + index * cushionWidth} y="28" width={cushionWidth - 1} height="14" rx="3" />)}
      <path d="M17 46v5M47 46v5" stroke="#756e65" strokeWidth="2" />
    </>;
  } else if (type === "bed") {
    shape = <>
      <rect x="9" y="19" width="46" height="29" rx="3" />
      <rect x="13" y="24" width="38" height="20" rx="4" fill="#fff" opacity=".72" />
      <rect x="16" y="25" width="12" height="8" rx="3" fill="#fff" />
      <rect x="9" y="15" width="5" height="34" rx="2" />
      <path d="M14 48v4M51 48v4" stroke="#756e65" strokeWidth="2" />
    </>;
  } else if (type === "wardrobe") {
    shape = <>
      <rect x="14" y="8" width="36" height="47" rx="2" />
      <path d="M32 9v45M27 28v5M37 28v5" stroke="#fff" strokeWidth="2" opacity=".8" />
      <path d="M18 55v3M46 55v3" stroke="#756e65" strokeWidth="2" />
    </>;
  } else if (type === "cabinet") {
    shape = <>
      <rect x="8" y="21" width="48" height="27" rx="3" />
      <path d="M32 22v25M12 31h40" stroke="#fff" strokeWidth="2" opacity=".75" />
      <circle cx="28" cy="36" r="1.3" fill="#594331" /><circle cx="36" cy="36" r="1.3" fill="#594331" />
      <path d="M14 48v5M50 48v5" stroke="#756e65" strokeWidth="2" />
    </>;
  } else if (type === "tvstand") {
    shape = <>
      <rect x="15" y="8" width="34" height="22" rx="2" fill="#303842" />
      <rect x="18" y="11" width="28" height="16" rx="1" fill="#a9c6d7" />
      <rect x="8" y="35" width="48" height="13" rx="2" />
      <path d="M13 48v5M51 48v5M24 39h16" stroke="#756e65" strokeWidth="2" />
    </>;
  } else if (type === "fireplace") {
    shape = <>
      <rect x="7" y="13" width="50" height="37" rx="3" />
      <rect x="14" y="19" width="36" height="25" rx="2" fill="#343840" />
      <path d="M31 41c-9-6 1-10 1-17 9 8 11 14 2 18z" fill="#ef9b48" />
      <path d="M31 42c-4-4 0-7 2-9 4 5 3 8 0 9z" fill="#ffdb82" />
    </>;
  } else if (type === "lamp") {
    shape = <>
      <path d="M18 14h28l-4 14H22z" />
      <path d="M32 28v22M22 53h20" fill="none" stroke={hex} strokeWidth="3" strokeLinecap="round" />
      <path d="M24 50h16l4 4H20z" />
    </>;
  } else if (type === "sink") {
    shape = <>
      <rect x="8" y="27" width="48" height="8" rx="2" />
      <path d="M12 35v15h40V35M24 25v-4c0-7 16-7 16 0v4" fill="none" stroke={hex} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="32" cy="31" rx="12" ry="3" fill="#fff" opacity=".75" />
    </>;
  } else {
    shape = <>
      <path d="M22 11h20v8l7 7v15c0 7-5 11-17 11s-17-4-17-11V26l7-7z" />
      <path d="M23 14h18M25 32h14" fill="none" stroke="#fff" strokeWidth="2" opacity=".8" />
      <ellipse cx="32" cy="41" rx="10" ry="7" fill="#fff" opacity=".8" />
    </>;
  }
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" fill={hex} stroke="#665d52" strokeWidth="1.3" strokeLinejoin="round">
      {shape}
    </svg>
  );
}
export default function SideBar({ onAddObject, onDeleteSelected, selectedId, selectedName, selectedIsWall, onRoomSizeChange, roomSize, tool, onToolChange, activeOpeningId, onOpeningChange, wallColor, onWallColorChange, floorColor, onFloorColorChange }) {
  const [leftOpen, setLeftOpen] = useState(() => window.innerWidth >= 768);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filteredLibrary = useMemo(
    () =>
      FURNITURE_CATALOG.filter(
        (i) =>
          (filter === "All" || i.category === filter) &&
          i.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [filter, query],
  );

  const matOf = (id) => FURNITURE_MATERIALS.find((m) => m.id === id);

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 sm:p-5">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white/85 px-2.5 py-2 shadow-[0_10px_35px_rgba(40,45,55,0.08)] backdrop-blur-xl sm:gap-3 sm:px-3">
          <div className="grid size-8 place-items-center rounded-xl bg-slate-900 text-xs font-semibold text-white sm:size-9 sm:text-sm">H</div>
          <div className="pr-1 sm:pr-2">
            <p className="text-sm font-semibold tracking-tight text-slate-900">Home Designer</p>
            <p className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400 min-[380px]:block">3D room planner</p>
          </div>
        </div>
        <button
          className="pointer-events-auto grid size-10 place-items-center rounded-2xl border border-white/80 bg-white/85 text-slate-600 shadow-[0_10px_35px_rgba(40,45,55,0.08)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:text-slate-950 sm:size-11"
          aria-label={leftOpen ? "Close model library" : "Open model library"}
          onClick={() => setLeftOpen((v) => !v)}
        >
          <Icon name={leftOpen ? "close" : "panelL"} className="size-5" />
        </button>
      </div>
      {leftOpen && (
        <aside className="absolute bottom-5 left-5 top-24 z-10 flex w-[320px] flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/88 shadow-[0_24px_80px_rgba(32,38,48,0.13)] backdrop-blur-2xl max-lg:w-[300px] max-sm:bottom-2 max-sm:left-2 max-sm:right-2 max-sm:top-auto max-sm:h-[62dvh] max-sm:w-auto max-sm:rounded-[24px]">
          <div className="border-b border-slate-200/70 px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Design tools</p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{tool === "wall" ? "Build rooms" : tool === "openings" ? "Doors & windows" : "Furniture"}</h1>
              </div>
              {tool === "furniture" && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">{filteredLibrary.length} items</span>}
            </div>
            {tool === "furniture" && <div className="relative mt-4">
              <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search furniture"
                aria-label="Search furniture"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-900/5"
              />
            </div>}
          </div>
          <div className="grid grid-cols-3 gap-1.5 border-b border-slate-200/70 px-4 py-2.5 sm:px-5 sm:py-3">
            <button onClick={() => onToolChange("furniture")} className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition ${tool === "furniture" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"}`}>
              <Icon name="chair" /> Furniture
            </button>
            <button onClick={() => onToolChange("wall")} className={`flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold transition ${tool === "wall" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"}`}>
              <Icon name="wall" /> Walls
            </button>
            <button onClick={() => onToolChange("openings")} className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[11px] font-semibold transition ${tool === "openings" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:text-slate-900"}`}>
              <Icon name="opening" /> Openings
            </button>
          </div>
          <div className="room-dimensions grid grid-cols-2 gap-4 border-b border-slate-200/70 px-4 py-2">
            <label className="block">
              <span className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Room width</span>
                <span className="font-semibold text-slate-800">{(roomSize.width * 0.5).toFixed(1)} m</span>
              </span>
              <input
                type="range"
                min="10"
                max="50"
                step="1"
                value={roomSize.width}
                onChange={(event) => onRoomSizeChange({ ...roomSize, width: Number(event.target.value) })}
                className="mt-2 h-1.5 w-full cursor-pointer accent-slate-900"
              />
            </label>
            <label className="block">
              <span className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Room depth</span>
                <span className="font-semibold text-slate-800">{(roomSize.depth * 0.5).toFixed(1)} m</span>
              </span>
              <input
                type="range"
                min="8"
                max="30"
                step="1"
                value={roomSize.depth}
                onChange={(event) => onRoomSizeChange({ ...roomSize, depth: Number(event.target.value) })}
                className="mt-2 h-1.5 w-full cursor-pointer accent-slate-900"
              />
            </label>
          </div>
          {tool === "furniture" ? <>
          <div className="flex gap-1 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] sm:px-5 sm:py-3">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                  filter === c
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 auto-rows-max content-start grid-cols-1 gap-2 overflow-y-auto px-4 pb-4 pt-1 [scrollbar-color:#cbd5e1_transparent] sm:px-5 sm:pb-5">
            {filteredLibrary.map((item) => (
              <button
                key={item.id}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/home-designer", item.id);
                  event.dataTransfer.effectAllowed = "copy";
                  const image = document.createElement("canvas"); image.width = 1; image.height = 1;
                  event.dataTransfer.setDragImage(image, 0, 0);
                  window.dispatchEvent(new CustomEvent("home-designer-library-drag", { detail: item }));
                }}
                onDragEnd={() => window.dispatchEvent(new CustomEvent("home-designer-library-drag", { detail: null }))}
                onClick={() => { onAddObject(item); if (window.innerWidth < 768) setLeftOpen(false); }}
                title={`Add ${item.name}`}
                className="group flex min-h-[76px] items-center gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_25px_rgba(50,55,65,0.09)]"
              >
                <div className="h-[60px] w-[76px] shrink-0 rounded-xl bg-[#f5f4f1] p-2 transition-colors group-hover:bg-[#f0efeb]">
                  <img src={`/thumbnails/${item.node}.png`} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <div className="truncate text-[13px] font-semibold leading-5 text-slate-800">
                    {item.name}
                  </div>
                  <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                    {item.category}
                  </span>
                </div>
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-50 text-base font-light text-slate-400 transition group-hover:bg-slate-900 group-hover:text-white" aria-hidden="true">+</span>
              </button>
            ))}
            {filteredLibrary.length === 0 && (
              <p className="col-span-2 py-6 text-center text-sm text-slate-500">
                No objects match. Try another category or clear the search.
              </p>
            )}
          </div>
          </> : tool === "wall" ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <details className="text-xs text-slate-500"><summary className="cursor-pointer py-2">How to draw walls</summary><p className="py-2">Drag across the grid to draw. Select a wall to delete it. Close the library for more space.</p></details>
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Wall color</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Palette value={wallColor} onChange={onWallColorChange} />
                  {WALL_COLORS.slice(0,0).map((color) => (
                    <button key={color} onClick={() => onWallColorChange(color)} className={`size-9 rounded-full border-2 shadow-sm transition hover:scale-105 ${wallColor === color ? "border-slate-900 ring-2 ring-slate-900/10" : "border-white"}`} style={{ backgroundColor: color }} aria-label={`Use wall color ${color}`} />
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Floor color</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Palette value={floorColor} onChange={onFloorColorChange} />
                  {FLOOR_COLORS.slice(0,0).map((color) => (
                    <button key={color} onClick={() => onFloorColorChange(color)} className={`size-9 rounded-full border-2 shadow-sm transition hover:scale-105 ${floorColor === color ? "border-slate-900 ring-2 ring-slate-900/10" : "border-white"}`} style={{ backgroundColor: color }} aria-label={`Use floor color ${color}`} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <details className="text-xs text-slate-500"><summary className="cursor-pointer py-2">How to place openings</summary><p className="py-2">Choose a style, then tap a wall. Leave space from corners and other openings.</p></details>
              {[
                ["Doors", OPENING_CATALOG.filter((item) => item.type === "door")],
                ["Windows", OPENING_CATALOG.filter((item) => item.type === "window")],
              ].map(([label, items]) => (
                <section key={label} className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {items.map((item) => (
                      <button key={item.id} onClick={() => onOpeningChange(item.id)} className={`rounded-2xl border p-2 text-left transition ${activeOpeningId === item.id ? "border-slate-900 bg-slate-900 text-white shadow-md" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}>
                        <div className={`grid h-16 place-items-center rounded-xl ${activeOpeningId === item.id ? "bg-white/10" : "bg-[#f5f4f1]"}`}>
                          <img src={`/thumbnails/${item.id}.png`} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
                          {false && (item.type === "door" ? (
                            <div className="relative h-12 w-8 rounded-t-sm border-2 border-current" style={{ backgroundColor: item.color }}><span className="absolute right-1.5 top-1/2 size-1 rounded-full bg-current" /></div>
                          ) : (
                            <div className="grid h-9 w-14 grid-cols-2 border-[3px] border-current bg-sky-100/70"><span className="border-r border-current" /><span /></div>
                          ))}
                        </div>
                        <p className="mt-2 truncate text-[11px] font-semibold">{item.name}</p>
                        <p className={`mt-0.5 text-[9px] ${activeOpeningId === item.id ? "text-white/55" : "text-slate-400"}`}>{item.width} × {item.height} m</p>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </aside>
      )}
      {false && selectedId != null && selectedIsWall && (
        <div className={`absolute left-1/2 z-20 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-[0_14px_45px_rgba(30,35,45,0.14)] backdrop-blur-xl ${leftOpen ? "bottom-5 max-sm:bottom-[calc(62dvh+0.75rem)]" : "bottom-5 max-sm:bottom-2"}`}>
          <span className="max-w-44 truncate px-3 text-xs font-semibold text-slate-700">{selectedName ?? "Selected item"}</span>
          <div className="h-6 w-px bg-slate-200" />
          {!selectedIsWall && <button className="flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950" onClick={() => window.dispatchEvent(new Event("home-designer-rotate"))}>
            <Icon name="rotate" className="size-4" /> Rotate
          </button>}
          <button className="grid size-9 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600" onClick={onDeleteSelected} aria-label={`Delete ${selectedName ?? "selected item"}`}>
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
