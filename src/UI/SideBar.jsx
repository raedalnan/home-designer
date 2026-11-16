import { useState, useMemo } from "react";
import { FURNITURE_CATALOG, FURNITURE_MATERIALS } from "../data/FurnitureCatalog.js";

const CATEGORIES = [
  "All",
  "Living",
  "Bedroom",
  "Storage",
  "Lighting",
  "Bathroom",
];

/* ───────────────────────────── Tiny icon set ───────────────────────────── */

const ICON_PATHS = {
  panelL: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
  panelR: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M15 4v16" />
    </>
  ),

  close: <path d="M6 6l12 12M18 6L6 18" />,
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
export default function SideBar({ onAddObject, onDeleteSelected, selectedId, selectedName, roomPresets, onRoomSizeChange, roomSize }) {
  const [leftOpen, setLeftOpen] = useState(true);
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
      <div className="absolute left-3 top-3 flex gap-1.5">
        <button
          className="btn btn-sm btn-square border-slate-200 bg-white shadow-sm"
          aria-label="Toggle left panel"
          onClick={() => setLeftOpen((v) => !v)}
        >
          <Icon name="panelL" />
        </button>
      </div>
      {leftOpen && (
        <aside className="z-10 flex w-72 shrink-0 flex-col overflow-y-auto border-r border-slate-200 bg-white p-6 max-lg:absolute max-lg:inset-y-0 max-lg:left-0 max-lg:shadow-xl">
          <div className="mb-3 mt-2.5">
            <h1 className="text-lg font-semibold text-slate-900">Model library</h1>
            <p className="mt-1 text-xs text-slate-500">Models are selected by node from furniture.glb.</p>
          </div>
          <label className="mb-3 block text-xs font-medium text-slate-600">
            Room size
            <select
              className="select select-bordered select-sm mt-1 w-full"
              value={`${roomSize.width}x${roomSize.depth}`}
              onChange={(event) => {
                const preset = roomPresets.find((item) => `${item.width}x${item.depth}` === event.target.value);
                if (preset) onRoomSizeChange(preset);
              }}
            >
              {roomPresets.map((preset) => <option key={preset.label} value={`${preset.width}x${preset.depth}`}>{preset.label}</option>)}
            </select>
            <span className="mt-1 block font-normal text-slate-400">Changing size clears the room.</span>
          </label>
          <div className="mb-3 flex items-center gap-2">
            <button className="btn btn-sm flex-1" onClick={() => window.dispatchEvent(new Event("home-designer-rotate"))} disabled={selectedId == null}>
              Rotate
            </button>
            <button className="btn btn-sm flex-1" onClick={onDeleteSelected} disabled={selectedId == null}>
              Delete {selectedName ? `· ${selectedName}` : "selected"}
            </button>
          </div>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search models"
            aria-label="Search models"
            className="input input-bordered input-sm w-full"
          />

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  filter === c
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {filteredLibrary.map((item) => (
              <button
                key={item.id}
                onClick={() => onAddObject(item)}
                className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition hover:border-slate-400 hover:shadow-sm"
              >
                <div className="aspect-[4/3] bg-gradient-to-b from-slate-50 to-slate-100 p-3">
                  <Thumb item={item} hex={matOf(item.materialId).hex} />
                </div>
                <div className="px-2.5 py-2">
                  <div className="truncate text-[13px] font-medium">
                    {item.name}
                  </div>
                  <span className="badge badge-ghost badge-sm mt-1 font-normal text-slate-500">
                    {item.category}
                  </span>
                </div>
              </button>
            ))}
            {filteredLibrary.length === 0 && (
              <p className="col-span-2 py-6 text-center text-sm text-slate-500">
                No objects match. Try another category or clear the search.
              </p>
            )}
          </div>
          <footer className="mt-5 border-t border-slate-200 pt-3 text-[11px] leading-relaxed text-slate-500">
            Furniture pack: “Low Poly Furnitures Full Bundle” by <a className="link link-hover" href="https://skfb.ly/oLwUo" target="_blank" rel="noreferrer">Taha Kaya</a>, licensed under <a className="link link-hover" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Modified: split into individual pieces and rescaled.
          </footer>
        </aside>
      )}
    </>
  );
}
