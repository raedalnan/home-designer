import { useRef, useState } from "react";

const buttonStyle = "editor-button library-action";

export default function DesignMenu({ library, onAction, saveError, onRetry }) {
  const dialog = useRef(null);
  const [rename, setRename] = useState(null);
  const [deletion, setDeletion] = useState(null);
  const currentDesign = library.designs.find((design) => design.id === library.activeId);

  function openDesign(action, id) {
    dialog.current.close();
    onAction(action, id);
  }

  return <>
    <button type="button" aria-haspopup="dialog" aria-label={`My Designs: ${currentDesign.name}`}
      title={currentDesign.name} onClick={() => dialog.current.showModal()}
      className="editor-button designs-trigger">
      <svg className="editor-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      </svg>
      <span className="designs-label">
        <span>My Designs</span>
        <span className="designs-name">{currentDesign.name}</span>
      </span>
    </button>
    {saveError && <div role="alert" className="pointer-events-auto absolute left-1/2 top-17 z-40 w-max max-w-[90vw] -translate-x-1/2 rounded-lg bg-amber-100 p-2 text-xs sm:top-20">
      Browser save failed. <button type="button" className="underline" onClick={onRetry}>Retry</button>
    </div>}
    <dialog ref={dialog} aria-labelledby="design-library-title" onClose={() => { setRename(null); setDeletion(null); }}
      className="pointer-events-auto fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-auto rounded-2xl bg-[var(--editor-surface)] p-4 text-[var(--editor-ink)] shadow-xl backdrop:bg-slate-900/35 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id="design-library-title" className="text-lg font-semibold">My Designs</h2>
        <button type="button" className={buttonStyle} onClick={() => dialog.current.close()}>Close</button>
      </div>
      <p className="mb-3 text-xs text-slate-500">Changes save automatically in this browser.</p>
      <button type="button" className="editor-button editor-button-accent mb-4"
        onClick={() => openDesign('new')}>New empty design</button>
      <ul className="space-y-2">
        {library.designs.map((design) => <li key={design.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2 sm:gap-4 sm:p-3">
          <div className="min-w-0 flex-1">
            <strong title={design.name} className="block truncate text-sm">{design.name}</strong>
            {design.id === library.activeId && <small className="text-xs font-medium text-emerald-700">Current</small>}
          </div>
          {rename?.id === design.id ? (
            <form className="flex min-w-0 flex-[2] flex-wrap gap-2" onSubmit={(event) => {
              event.preventDefault();
              const name = rename.name.trim();
              if (name) { onAction('rename', design.id, name); setRename(null); }
            }}>
              <input aria-label="Design name" autoFocus required maxLength={80} value={rename.name}
                onChange={(event) => setRename({ id: design.id, name: event.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 text-sm" />
              <button className={buttonStyle}>Save name</button>
              <button type="button" className={buttonStyle} onClick={() => setRename(null)}>Cancel</button>
            </form>
          ) : deletion === design.id ? (
            <div className="flex min-w-0 flex-[2] flex-wrap items-center gap-2">
              <p className="w-full text-xs">Permanently delete this design from this browser?</p>
              <button type="button" className={buttonStyle + " text-red-700"} onClick={() => {
                setDeletion(null);
                onAction('delete', design.id);
              }}>Delete design</button>
              <button type="button" className={buttonStyle} onClick={() => setDeletion(null)}>Cancel</button>
            </div>
          ) : (
            <div className="grid shrink-0 grid-cols-2 gap-1 sm:flex sm:gap-2">
              <button type="button" className={buttonStyle + " editor-button-accent"} onClick={() => openDesign('open', design.id)}>Open</button>
              <button type="button" className={buttonStyle} onClick={() => setRename({ id: design.id, name: design.name })}>Rename</button>
              <button type="button" className={buttonStyle} onClick={() => openDesign('duplicate', design.id)}>Duplicate</button>
              <button type="button" className={buttonStyle + " editor-button-danger"} onClick={() => setDeletion(design.id)}>Delete</button>
            </div>
          )}
        </li>)}
      </ul>
    </dialog>
  </>;
}
