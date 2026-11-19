import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Euler, MathUtils, Quaternion, Vector3 } from 'three';
import { aimedDoor, canWalkTo, createWalkWorld, EYE_HEIGHT, findWalkStart, floorHeight } from '../logic/Walkthrough.js';

const MOVEMENT_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const VIEW_ORDER = 'YXZ';

export default function Walkthrough({
  active, input, roomSize, walls, openings, objects, floorTiles, onExit, onDoor, onHint, onTransition,
}) {
  const { camera, gl } = useThree();
  const world = useMemo(() => createWalkWorld(roomSize, walls, openings, objects, floorTiles),
    [roomSize, walls, openings, objects, floorTiles]);
  const latest = useRef(null);
  latest.current = { world, onExit, onDoor, onHint, onTransition };
  const session = useRef({
    edit: null, transition: null, feet: 0, velocity: new Vector3(), keys: new Set(),
    look: new Euler(0, 0, 0, VIEW_ORDER), direction: new Vector3(), hint: '',
  });

  useLayoutEffect(() => {
    const state = session.current;
    const from = { position: camera.position.clone(), rotation: camera.quaternion.clone() };
    if (active) {
      const start = findWalkStart(latest.current.world);
      if (!start) {
        latest.current.onExit('There is no clear standing space. Move furniture or lower a floor area to start walking.');
        return;
      }
      state.edit ??= from;
      state.feet = floorHeight(latest.current.world, start.x, start.z);
      state.look.set(0, 0, 0, VIEW_ORDER);
      state.velocity.set(0, 0, 0);
      state.hint = '';
      state.transition = {
        from, elapsed: 0, entering: true,
        to: { position: new Vector3(start.x, state.feet + EYE_HEIGHT, start.z), rotation: new Quaternion().setFromEuler(state.look) },
      };
    } else if (state.edit) {
      state.transition = { from, to: state.edit, elapsed: 0, entering: false };
      latest.current.onTransition(true);
    }
  }, [active, camera]);

  useEffect(() => {
    if (!active) return;
    const state = session.current;
    const canvas = gl.domElement;
    let pointer = null;
    function reset() {
      state.keys.clear();
      input.current.x = 0;
      input.current.z = 0;
      input.current.interact = false;
      state.velocity.set(0, 0, 0);
      pointer = null;
    }
    function keyDown(event) {
      if (event.code === 'Escape') { latest.current.onExit(); return; }
      if (MOVEMENT_KEYS.has(event.code)) {
        event.preventDefault();
        state.keys.add(event.code);
      } else if (event.code === 'KeyE' && !event.repeat) input.current.interact = true;
    }
    function keyUp(event) { state.keys.delete(event.code); }
    function pointerDown(event) {
      if (event.button !== 0 || pointer || document.pointerLockElement === canvas) return;
      canvas.setPointerCapture(event.pointerId);
      pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
    function pointerMove(event) {
      if (document.pointerLockElement === canvas || pointer?.id !== event.pointerId) return;
      rotateLook(event.clientX - pointer.x, event.clientY - pointer.y);
      Object.assign(pointer, { x: event.clientX, y: event.clientY });
    }
    function rotateLook(dx, dy) {
      state.look.y -= dx * 0.004;
      state.look.x = MathUtils.clamp(state.look.x - dy * 0.004, -1.42, 1.42);
    }
    function mouseMove(event) {
      if (document.pointerLockElement === canvas) rotateLook(event.movementX, event.movementY);
    }
    function pointerEnd(event) { if (pointer?.id === event.pointerId) pointer = null; }

    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    document.addEventListener('mousemove', mouseMove);
    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerEnd);
    canvas.addEventListener('pointercancel', pointerEnd);
    canvas.addEventListener('lostpointercapture', pointerEnd);
    const requestMouseLook = () => {
      try { canvas.requestPointerLock?.()?.catch(() => {}); } catch { /* Drag look remains available. */ }
    };
    input.current.mouseLook = requestMouseLook;
    return () => {
      if (pointer && canvas.hasPointerCapture(pointer.id)) canvas.releasePointerCapture(pointer.id);
      reset();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      input.current.mouseLook = null;
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
      document.removeEventListener('mousemove', mouseMove);
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      canvas.removeEventListener('pointerup', pointerEnd);
      canvas.removeEventListener('pointercancel', pointerEnd);
      canvas.removeEventListener('lostpointercapture', pointerEnd);
    };
  }, [active, gl, input]);

  useFrame((_, delta) => {
    const state = session.current;
    const transition = state.transition;
    if (transition) {
      transition.elapsed += delta;
      const progress = Math.min(1, transition.elapsed / 0.45);
      const eased = progress * progress * (3 - 2 * progress);
      camera.position.lerpVectors(transition.from.position, transition.to.position, eased);
      camera.quaternion.slerpQuaternions(transition.from.rotation, transition.to.rotation, eased);
      if (progress === 1) {
        state.transition = null;
        if (!transition.entering) {
          state.edit = null;
          latest.current.onTransition(false);
        }
      }
      return;
    }
    if (!active || !state.edit) return;
    const dt = Math.min(delta, 0.05);
    const { keys, look, velocity } = state;
    const has = (a, b) => Number(keys.has(a) || keys.has(b));
    const strafe = has('KeyD', 'ArrowRight') - has('KeyA', 'ArrowLeft') + input.current.x;
    const forward = has('KeyW', 'ArrowUp') - has('KeyS', 'ArrowDown') + input.current.z;
    const speed = 2.25 / Math.max(1, Math.hypot(strafe, forward));
    const sin = Math.sin(look.y), cos = Math.cos(look.y);
    velocity.x = MathUtils.damp(velocity.x, (strafe * cos - forward * sin) * speed, 15, dt);
    velocity.z = MathUtils.damp(velocity.z, (-strafe * sin - forward * cos) * speed, 15, dt);
    const steps = Math.max(1, Math.ceil(Math.hypot(velocity.x, velocity.z) * dt / 0.045));
    const walkWorld = latest.current.world;
    for (let step = 0; step < steps; step++) {
      const x = camera.position.x + velocity.x * dt / steps;
      const z = camera.position.z + velocity.z * dt / steps;
      if (canWalkTo(walkWorld, x, camera.position.z, state.feet)) {
        camera.position.x = x;
        state.feet = floorHeight(walkWorld, x, camera.position.z);
      }
      if (canWalkTo(walkWorld, camera.position.x, z, state.feet)) {
        camera.position.z = z;
        state.feet = floorHeight(walkWorld, camera.position.x, z);
      }
    }
    camera.position.y = MathUtils.damp(camera.position.y, state.feet + EYE_HEIGHT, 15, dt);
    camera.quaternion.setFromEuler(look);
    camera.getWorldDirection(state.direction);
    const target = aimedDoor(walkWorld, camera.position, state.direction);
    const hint = target ? (target.opening.isOpen ? 'Close door' : 'Open door') : '';
    if (hint !== state.hint) {
      state.hint = hint;
      latest.current.onHint(hint);
    }
    if (input.current.interact) {
      input.current.interact = false;
      if (target && !(target.opening.isOpen && target.distance < 0.45)) latest.current.onDoor(target.opening);
    }
  });
  return null;
}
