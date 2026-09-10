import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
let THREE;
const cleanup = [];
const originalLock = Object.getOwnPropertyDescriptor(document, 'pointerLockElement');
beforeAll(() => {
  const exports = {};
  new Function('exports', 'module', readFileSync('vendor/three-r128/three.min.js', 'utf8'))(exports, { exports });
  THREE = exports;
});
afterEach(() => {
  cleanup.splice(0).forEach(fn => fn());
  if (originalLock) Object.defineProperty(document, 'pointerLockElement', originalLock);
  else delete document.pointerLockElement;
  document.body.innerHTML = '';
});

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker), end = source.indexOf(endMarker, start);
  if (start < 0 || end < start) throw Error('Missing engine section ' + startMarker);
  return source.slice(start, end);
}
function engineFunction(name) {
  const start = source.indexOf('        engine.' + name + ' = function('), endMark = '\n        };';
  if (start < 0) throw Error('Missing engine function ' + name);
  return source.slice(start, source.indexOf(endMark, start) + endMark.length);
}

function fixture() {
  window.THREE = THREE;
  Object.defineProperty(document, 'pointerLockElement', { configurable: true, value: null });
  const canvas = document.createElement('canvas'), cv = {}, doc = {};
  let requests = 0;
  canvas.requestPointerLock = () => { requests++; };
  document.body.appendChild(canvas);
  const engine = {
    renderer: { domElement: canvas }, camera: new THREE.PerspectiveCamera(), euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    isLocked: false, _touchActive: false, _touchControlsEnabled: true,
    _touchMoveId: null, _touchLookId: null, _touchMoveStart: null, _touchLookStart: null,
    _touchMoveVec: { x: 0, z: 0 }, _touchLookSensitivity: .004,
    moveState: {}, lookState: {}, velocity: new THREE.Vector3(), flyMode: true,
    _currentLesson: { ground: { y: 12 }, structures: [{ type: 'fill', x1: 100, x2: 104, y1: 13, y2: 17, z1: 100, z2: 104 }] }
  };
  const body = engineFunction('isInputActive') + '\n' + engineFunction('releaseInput') + '\n' + engineFunction('refreshTouchActivity') + '\n' + engineFunction('setTouchControlsEnabled') + '\n'
    + section("        canvas.addEventListener('click', _cvH.click", '        // Smooth mouse look') + '\n'
    + section("        document.addEventListener('mousemove', _docH.mousemove", "        document.addEventListener('keydown'") + '\n'
    + section("        canvas.addEventListener('touchstart', _cvH.touchstart", '        // ── Cached blocks array') + '\n'
    + section('        function finiteWorldCoordinate(', '        // ── Textual Scene Map');
  const deps = {
    engine, canvas, _cvH: cv, _docH: doc, MOUSE_SENSITIVITY: .0018,
    resetTouchJoystick() {}, resetTouchLookFeedback() {}, updateTouchJoystick() {}, updateTouchLookFeedback() {},
    setViewPreset() {}, setGuidedTourStep() {}, setGuidedTourActive() {}, announceToSR() {}, startAmbientWind() {}, upd() {},
    guidedTourSteps: ['Observe the structure'], __alloT: (_key, text) => text, __alloFill: text => text
  };
  new Function(...Object.keys(deps), body)(...Object.values(deps));
  cleanup.push(() => {
    Object.keys(cv).forEach(name => canvas.removeEventListener(name, cv[name]));
    Object.keys(doc).forEach(name => document.removeEventListener(name, doc[name]));
  });
  return { engine, canvas, requests: () => requests };
}

function touch(canvas, type, x = window.innerWidth * .75, y = 100) {
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'changedTouches', { value: [{ identifier: 7, clientX: x, clientY: y }] });
  canvas.dispatchEvent(ev);
}
function mouseMove(dx = 30, dy = 10) {
  const ev = new MouseEvent('mousemove', { bubbles: true });
  Object.defineProperties(ev, { movementX: { value: dx }, movementY: { value: dy } });
  document.dispatchEvent(ev);
}
function heldState(engine) {
  engine.moveState = { forward: true, backward: false, left: true, right: false, sprint: true, flyUp: true, flyDown: true };
  engine.lookState = { left: false, right: true, up: true, down: false };
  engine._jumpLock = true;
  engine._touchMoveId = 4; engine._touchLookId = 7;
  engine._touchMoveStart = { x: 100, y: 100 }; engine._touchLookStart = { x: 700, y: 100 };
  engine._touchMoveVec = { x: 1, z: -1 }; engine._touchActive = true;
}
function expectReleased(engine) {
  expect(Object.values(engine.moveState).some(Boolean)).toBe(false);
  expect(Object.values(engine.lookState).some(Boolean)).toBe(false);
  expect(engine._jumpLock).toBe(false);
  expect(engine._touchMoveId).toBeNull(); expect(engine._touchLookId).toBeNull();
  expect(engine._touchMoveStart).toBeNull(); expect(engine._touchLookStart).toBeNull();
  expect(engine._touchMoveVec).toEqual({ x: 0, z: 0 });
}

describe('Geometry World input ownership across mode changes', () => {
  it('uses touch activity without pretending the canvas has native pointer lock', () => {
    const f = fixture(); touch(f.canvas, 'touchstart');
    expect(f.engine._touchActive).toBe(true);
    expect(f.engine.isInputActive()).toBe(true);
    expect(document.pointerLockElement).toBeNull();
    expect(f.engine.isLocked).toBe(false);
  });

  it('Touch off stops unlocked mouse rotation and lets a real mouse click request lock', () => {
    const f = fixture(); touch(f.canvas, 'touchstart'); touch(f.canvas, 'touchend');
    f.engine.setTouchControlsEnabled(false);
    const before = f.engine.camera.quaternion.toArray();
    mouseMove();
    expect(f.engine.camera.quaternion.toArray()).toEqual(before);
    f.canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
    expect(f.requests()).toBe(1);
  });

  it('retains mouse look for native lock on this world canvas', () => {
    const f = fixture();
    Object.defineProperty(document, 'pointerLockElement', { configurable: true, value: f.canvas });
    document.dispatchEvent(new Event('pointerlockchange'));
    const before = f.engine.camera.quaternion.toArray(); mouseMove();
    expect(f.engine.camera.quaternion.toArray()).not.toEqual(before);
  });

  it('view presets release held flight, arrow look, and an existing touch gesture', () => {
    const f = fixture(); heldState(f.engine);
    expect(f.engine.setViewPreset('front')).toBe(true);
    expectReleased(f.engine);
    const before = f.engine.camera.quaternion.toArray();
    touch(f.canvas, 'touchmove', 735, 115);
    expect(f.engine.camera.quaternion.toArray()).toEqual(before);
  });

  it('starting a guided tour releases the prior input gesture', () => {
    const f = fixture(); heldState(f.engine);
    expect(f.engine.startGuidedTour()).toBe(true);
    expectReleased(f.engine);
    expect(f.engine._guidedTour).toBeTruthy();
  });

  it('finishing a guided tour cannot resume a held flight or arrow action', () => {
    const f = fixture(); f.engine._guidedTour = {}; heldState(f.engine);
    expect(f.engine.stopGuidedTour(true)).toBe(true);
    expectReleased(f.engine);
  });

  it('preserves keyboard input while the world surface has focus', () => {
    const f = fixture(), surface = document.createElement('div');
    surface.id = 'geoworld-fs-wrap'; surface.tabIndex = 0; document.body.appendChild(surface);
    surface.focus(); expect(f.engine.isInputActive()).toBe(true);
    surface.blur(); expect(f.engine.isInputActive()).toBe(false);
  });

  it('does not treat another canvas pointer lock as ownership of this camera', () => {
    const f = fixture();
    Object.defineProperty(document, 'pointerLockElement', { configurable: true, value: document.createElement('canvas') });
    document.dispatchEvent(new Event('pointerlockchange'));
    expect(f.engine.isLocked).toBe(false);
    const before = f.engine.camera.quaternion.toArray(); mouseMove();
    expect(f.engine.camera.quaternion.toArray()).toEqual(before);
  });

  it.each([
    ['Up', 'touchend'], ['Up', 'touchcancel'], ['Down', 'touchend'], ['Down', 'touchcancel']
  ])('keeps held %s active when a separate canvas look finger ends with %s', (direction, endEvent) => {
    const f = fixture();
    const mobileSource = section('      function beginMobileJump()', '      function talkToNearbyNpc()');
    const mobile = new Function('engine', 'sfxJump', mobileSource + '\nreturn { beginMobileJump, stopMobileJump, beginMobileDescent, stopMobileDescent };')(f.engine, () => {});
    touch(f.canvas, 'touchstart');
    if (direction === 'Up') mobile.beginMobileJump(); else mobile.beginMobileDescent();
    touch(f.canvas, endEvent);
    expect(f.engine._touchLookId).toBeNull();
    expect(f.engine.isLocked).toBe(false);
    expect(document.pointerLockElement).toBeNull();
    expect(f.engine.isInputActive()).toBe(true);
    expect(f.engine.moveState[direction === 'Up' ? 'flyUp' : 'flyDown']).toBe(true);
    if (direction === 'Up') mobile.stopMobileJump(); else mobile.stopMobileDescent();
    expect(f.engine.isInputActive()).toBe(false);
  });

});
