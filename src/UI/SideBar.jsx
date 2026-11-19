import { useState, useMemo, useEffect } from "react";
import {FURNITURE_REGISTRY} from '../data/FurnitureRegistry.js';
const FURNITURE_CATALOG=FURNITURE_REGISTRY;
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
  "Dining",
  "Plants",
  "Seating",
];

const WALL_COLORS = COLOR_PALETTE.map(({hex})=>hex);

const ICON_PATHS = {
  panelL: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  collapsePanel: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16m7-11-3 3 3 3" /></>,
  sheetChevron: <path d="m6 9 6 6 6-6" />,
  walk: <><circle cx="13" cy="4.5" r="1.75" /><path d="m5 13 3-3 4-1 2 4 4 1m-6-5-2 6 4 3v3m-4-6-2 4-4 2" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  grid: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9.33 4v16m5.34-16v16M4 9.33h16M4 14.67h16" /></>,
  undo: <path d="M9 5 4 10l5 5M4 10h10a5 5 0 0 1 0 10h-3" />,
  redo: <path d="m15 5 5 5-5 5m5-5H10a5 5 0 0 0 0 10h3" />,
  rotate: <><path d="M20 7v5h-5" /><path d="M18.2 16a8 8 0 1 1 .7-8.7L20 12" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /><path d="M10 11v5M14 11v5" /></>,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  wall: <><path d="M4 5h16v14H4z" /><path d="M4 10h16M9 5v5M15 10v4M4 14h16M10 14v5" /></>,
  chair: <><path d="M7 13V8a5 5 0 0 1 10 0v5M5 13h14v4H5z" /><path d="M7 17v3M17 17v3" /></>,
  floor: <><rect x="4" y="5" width="16" height="14" rx="1" /><path d="M4 12h16M12 5v14" /></>,
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
export default function SideBar({ gridVisible, onToggleGrid, canUndo, canRedo, onUndo, onRedo, panelHeight, onPanelHeightChange, optionsOpen, panelOpen, onTogglePanel, settingsRef, hidden, onWalkthrough, designMenu, onAddObject, onDeleteSelected, selectedId, selectedName, selectedIsWall, onRoomSizeChange, roomSize, tool, onToolChange, activeOpeningId, onOpeningChange, wallColor, onWallColorChange, floorColor, onFloorColorChange }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [visibleCount,setVisibleCount]=useState(24);
  useEffect(()=>setVisibleCount(24),[filter,query]);

  const filteredLibrary = useMemo(
    () =>
      FURNITURE_CATALOG.filter(
        (i) =>
          (filter === "All" || i.category === filter) &&
          i.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [filter, query],
  );



  if (hidden) return null;

  const toggle = (
    <button type="button" className={`editor-button ${panelOpen ? "tools-close" : "tools-toggle"}`}
      aria-label={optionsOpen ? "Close item options" : panelOpen ? "Close design tools" : "Open design tools"}
      aria-expanded={panelOpen} aria-controls={panelOpen ? "design-tools" : undefined}
      onClick={onTogglePanel}>
      <Icon name={panelOpen ? "collapsePanel" : "panelL"} className="editor-icon tools-desktop-icon" />
      <Icon name="sheetChevron" className="editor-icon tools-mobile-icon" />
      {!panelOpen && "Design tools"}
    </button>
  );

  return (
    <>
      <header className="editor-header">
        <div className="editor-brand">
          <span className="editor-brand-icon" aria-hidden="true">H</span>
          <span>Home Designer</span>
        </div>
        <div className="editor-history" role="group" aria-label="History and grid">
          <button type="button" className="editor-button" disabled={!canUndo} onClick={onUndo}>
            <Icon name="undo" className="editor-icon" /> Undo
          </button>
          <button type="button" className="editor-button" disabled={!canRedo} onClick={onRedo}>
            <Icon name="redo" className="editor-icon" /> Redo
          </button>
          <button type="button" className="editor-button grid-toggle" data-grid-visible={gridVisible} onClick={onToggleGrid}>
            <Icon name="grid" className="editor-icon" /> {gridVisible ? "Hide grid" : "Show grid"}
          </button>
        </div>
        {designMenu}
      </header>
      <button type="button" className="editor-button editor-button-accent walkthrough-launch" onClick={onWalkthrough}>
        <Icon name="walk" className="editor-icon" />
        First-person view
      </button>
      {panelOpen ? (
        <aside id="design-tools" aria-labelledby="tools-title" className="design-tools">
          <div className="tools-toolbar">
            <h1 id="tools-title" className="tools-title">{optionsOpen ? "Item options" : "Design tools"}</h1>
            {toggle}
            <div className="tools-resize">
              <label htmlFor="tools-height">Panel height</label>
              <input id="tools-height" type="range" min="24" max="46" value={panelHeight}
                onChange={(event) => onPanelHeightChange(Number(event.target.value))} />
            </div>
          </div>
          {optionsOpen ? (
            <section id="item-options" className="tools-content overflow-y-auto p-3" aria-label="Item options" ref={settingsRef} />
          ) : (
          <div className="flex min-h-0 flex-1">
            <nav aria-label="Design modes" className="tools-modes">
              {[
                ['furniture', 'Furniture', 'chair'],
                ['wall', 'Walls', 'wall'],
                ['openings', 'Openings', 'opening'],
                ['floor', 'Floor', 'floor'],
              ].map(([mode, label, icon]) => (
                <button key={mode} type="button"
                  aria-pressed={tool === mode} onClick={() => { if (mode !== tool) onToolChange(mode); }}>
                  <Icon name={icon} className="size-5" />{label}
                </button>
              ))}
            </nav>
            <div className="tools-content">
          <div className="tools-header shrink-0 border-b border-slate-200/70 px-3 py-2 sm:px-4 sm:py-3">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{tool === "wall" ? "Build rooms" : tool === "openings" ? "Doors & windows" : tool === "floor" ? "Floor" : "Furniture"}</h2>
              </div>
              {tool === "furniture" && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">{filteredLibrary.length} items</span>}
            </div>
            {tool === "furniture" && <div className="relative mt-1.5">
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
          {tool === "floor" ? (
            <div className="min-h-0 overflow-y-auto">
          <div className="room-dimensions grid grid-cols-2 gap-4 border-b border-slate-200/70 px-4 py-2">
            <label className="block">
              <span className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Room width</span>
                <span className="font-semibold text-slate-800">{(roomSize.width * 0.5).toFixed(1)} m</span>
              </span>
              <input
                type="range"
                data-layout-history
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
                data-layout-history
                min="8"
                max="30"
                step="1"
                value={roomSize.depth}
                onChange={(event) => onRoomSizeChange({ ...roomSize, depth: Number(event.target.value) })}
                className="mt-2 h-1.5 w-full cursor-pointer accent-slate-900"
              />
            </label>
          </div>
              <div className="space-y-4 p-3">
                <div>
                  <h2 className="mb-2 text-sm font-semibold">Base floor color</h2>
                  <Palette value={floorColor} onChange={onFloorColorChange} />
                </div>
                <p className="text-xs text-slate-600">Drag a box across the floor to select cells. Double-click a raised area to select its connected cells at the same height.</p>
              </div>
            </div>
          ) : tool === "furniture" ? <>
          <div className="catalog-filter px-4 py-2">
            <label className="sr-only" htmlFor="furniture-category">Furniture category</label>
            <select id="furniture-category" aria-label="Furniture category" value={filter} onChange={(event)=>setFilter(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">{['All',...new Set(FURNITURE_CATALOG.map((item)=>item.category))].map((category)=><option key={category} value={category}>{category==='All'?'All collections':category}</option>)}</select>
            {CATEGORIES.slice(0,0).map((c) => (
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
          <div className="catalog-grid grid min-h-0 flex-1 auto-rows-max content-start grid-cols-2 gap-2 overflow-y-auto px-4 pb-4 pt-1 [scrollbar-color:#cbd5e1_transparent] sm:px-5 sm:pb-5">
            {filteredLibrary.slice(0,visibleCount).map((item) => (
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
                onClick={() => { onAddObject(item); if (window.innerWidth < 768) onTogglePanel(); }}
                title={`Add ${item.name}`}
                className="catalog-card group flex flex-col min-h-[156px] items-stretch gap-2 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-2 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_25px_rgba(50,55,65,0.09)]"
              >
                <div className="h-[60px] w-[76px] shrink-0 rounded-xl bg-[#f5f4f1] p-2 transition-colors group-hover:bg-[#f0efeb]">
                  <img src={item.correctedTabletop ? `${item.thumbnail}?v=${item.assetVersion}` : (item.thumbnail ?? `/thumbnails/${item.node ?? ({sofa:'Three-seaterSofa03',bed:'doubleBed02',table:'TVStand01',cabinet:'SmallCabinet01',lamp:'lamp01',plant:'lamp02'}[item.family])}.png`)} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <div className="truncate text-[13px] font-semibold leading-5 text-slate-800">
                    {item.name}
                  </div>
                  <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                    {item.category}
                    {item.family && !item.thumbnail && ' · Family preview'}
                  </span>
                </div>
                <span className="catalog-add" aria-hidden="true">+</span>
              </button>
            ))}
            {visibleCount<filteredLibrary.length && <button className="col-span-2 rounded-xl border border-slate-200 p-3 text-sm text-slate-600" onClick={()=>setVisibleCount((count)=>count+24)}>Show 24 more · {filteredLibrary.length-visibleCount} remaining</button>}
            {filteredLibrary.length === 0 && (
              <p className="col-span-2 py-6 text-center text-sm text-slate-500">
                No objects match. Try another category or clear the search.
              </p>
            )}
          </div>
          </> : tool === "wall" ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
              <details className="text-xs text-slate-500"><summary className="cursor-pointer py-2">How to edit walls</summary><p className="py-2">Drag across the grid to draw. Select an interior wall and choose Edit. Press and hold a move or length button to repeat it.</p></details>
              <div className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Wall color</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Palette value={wallColor} onChange={onWallColorChange} />
                  {WALL_COLORS.slice(0,0).map((color) => (
                    <button key={color} onClick={() => onWallColorChange(color)} className={`size-9 rounded-full border-2 shadow-sm transition hover:scale-105 ${wallColor === color ? "border-slate-900 ring-2 ring-slate-900/10" : "border-white"}`} style={{ backgroundColor: color }} aria-label={`Use wall color ${color}`} />
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
                      <button key={item.id} onClick={() => onOpeningChange(item.id)} aria-pressed={activeOpeningId === item.id} className="opening-card flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border p-2 text-left transition">
                        <div className={`flex h-24 w-full min-w-0 shrink-0 items-center justify-center overflow-hidden rounded-xl p-2 bg-[#f5f4f1]`}>
                          <img src={item.thumbnail??`/thumbnails/${item.id}.png`} alt={item.name} width="192" height="192" className="block h-full max-h-full w-full min-w-0 max-w-full object-contain" loading="lazy" />
                          {false && (item.type === "door" ? (
                            <div className="relative h-12 w-8 rounded-t-sm border-2 border-current" style={{ backgroundColor: item.color }}><span className="absolute right-1.5 top-1/2 size-1 rounded-full bg-current" /></div>
                          ) : (
                            <div className="grid h-9 w-14 grid-cols-2 border-[3px] border-current bg-sky-100/70"><span className="border-r border-current" /><span /></div>
                          ))}
                        </div>
                        <p className="mt-2 w-full truncate text-[11px] font-semibold">{item.name}</p>
                        <p className={`mt-0.5 text-[9px] text-[var(--editor-muted)]`}>{item.width} × {item.height} m</p>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
            </div>
          </div>
          )}
        </aside>
      ) : toggle}
      {false && selectedId != null && selectedIsWall && (
        <div className={`absolute left-1/2 z-20 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/80 bg-white/90 p-1.5 shadow-[0_14px_45px_rgba(30,35,45,0.14)] backdrop-blur-xl ${panelOpen ? "bottom-5 max-sm:bottom-[calc(62dvh+0.75rem)]" : "bottom-5 max-sm:bottom-2"}`}>
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
