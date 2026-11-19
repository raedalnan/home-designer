import { useRef, useState } from 'react';

export default function WalkthroughControls({ input, hint, onExit }) {
  const pointer = useRef(null);
  const [stick, setStick] = useState({ x: 0, y: 0 });

  function updateStick(event) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / 38;
    const y = (event.clientY - bounds.top - bounds.height / 2) / 38;
    const scale = Math.max(1, Math.hypot(x, y));
    const next = { x: x / scale, y: y / scale };
    input.current.x = next.x;
    input.current.z = -next.y;
    setStick(next);
  }

  function releaseStick(event) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    input.current.x = 0;
    input.current.z = 0;
    setStick({ x: 0, y: 0 });
  }

  return <div className="walk-hud">
    <div className="walk-toolbar">
      <button type="button" className="walk-button" onClick={() => onExit()}>Back to design</button>
      <button type="button" className="walk-button walk-mouse" onClick={() => input.current.mouseLook?.()}>Capture mouse</button>
    </div>
    <div className="walk-crosshair" aria-hidden="true">+</div>
    {hint && <div className="walk-hint" role="status">{hint}<kbd className="walk-mouse">E</kbd></div>}
    <div className="walk-guide">
      <span className="walk-mouse">WASD or arrows to move · Drag to look · E to use doors · Esc to edit</span>
      <span className="walk-touch">Use the stick to move · Drag the scene to look · Aim at a door and tap Use</span>
    </div>
    <div className="walk-touch walk-stick" aria-label="Movement joystick"
      onPointerDown={(event) => {
        if (pointer.current !== null) return;
        pointer.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        updateStick(event);
      }}
      onPointerMove={(event) => { if (pointer.current === event.pointerId) updateStick(event); }}
      onPointerUp={releaseStick} onPointerCancel={releaseStick} onLostPointerCapture={releaseStick}>
      <div style={{ transform: `translate(${stick.x * 29}px, ${stick.y * 29}px)` }} />
    </div>
    <button type="button" className="walk-button walk-touch walk-use" disabled={!hint}
      onClick={() => { input.current.interact = true; }}>Use</button>
  </div>;
}
