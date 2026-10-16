import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8');
const exported = {}; Function('window', source)(exported);
function runtime(isBlocked = () => false, focus = new THREE.Vector3(1,.2,0), withMammals = false) {
  const frames = new Map(), calls = [], modes = [], listeners = []; let serial = 0, stamp = 0, disposed = 0;
  class Renderer {
    constructor() { this.shadowMap = {}; this.info = { render: { calls: 1, triangles: 1 } }; }
    setPixelRatio() {} setSize() {} render() {} dispose() { disposed++; } forceContextLoss() {}
  }
  const terrain = (x, z) => x * .02 + z * .01;
  const local = {
    THREE: { ...THREE, WebGLRenderer: Renderer }, innerWidth: 900, devicePixelRatio: 1,
    requestAnimationFrame(callback) { const id = ++serial; frames.set(id, callback); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    addEventListener(...args) { listeners.push(args); window.addEventListener(...args); },
    removeEventListener(...args) { window.removeEventListener(...args); },
    AvianWoodlandBirds: { create() {}, supports: () => true },
    BirdLab3DBird: { create() { return { root: new THREE.Group(), footOffsetY: -.18, update() {}, dispose() {} }; } },
    BirdLab3DHabitat: { create() { return { root: new THREE.Group(), perch: new THREE.Vector3(0, 3.2, 0),
      perches: [new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(-5.7, 2.8, -4.4), new THREE.Vector3(6.3, 3.1, -5.8)],
      groundHeight: terrain, groundSurfaceHeight: terrain, isBlocked, update() {}, dispose() {} }; } },
    BirdLab3DWildlife: { create(T, scene, options) { return {
      setMode(mode) { modes.push(mode); }, update(time, dt, observer) { calls.push({ time, dt, observer, position: observer?.position.toArray(), collider: options.isBlocked }); },
      snapshot() { return [{ id: 'blueJay', heading: .2, name: 'Blue jay', behavior: 'Scanning' }]; },
      getFocus(id, out) { return out.copy(focus); }, dispose() {}
    }; } }
  };
  let mammals;
  if (withMammals) {
    Function('window', readFileSync('stem_lab/birdlab_3d_mammals.js','utf8'))(local);
    const create=local.BirdLab3DMammals.create;
    local.BirdLab3DMammals.create=(...args)=>(mammals=create(...args));
  }
  Function('window', source)(local);
  const canvas = document.createElement('canvas'); canvas.tabIndex = 0;
  canvas.getBoundingClientRect = () => ({ width: 800, height: 500 }); canvas.requestPointerLock = vi.fn();
  document.body.appendChild(canvas);
  const controller = local.BirdLab3D.mount(canvas, { quality: 'low', reducedMotion: true });
  return { controller, canvas, frames, calls, modes, terrain, mammals,
    step(seconds = .05) { stamp += seconds * 1000; const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(stamp)); },
    run(seconds) { for (let i = 0; i < seconds * 20; i++) this.step(); },
    dispose() { controller.dispose(); canvas.remove(); listeners.forEach(args => window.removeEventListener(...args)); }, get disposed() { return disposed; }
  };
}
function key(canvas, code, type = 'keydown') { canvas.dispatchEvent(new KeyboardEvent(type, { code, key: code.replace('Key', '').toLowerCase(), bubbles: true })); }
function distance(a, b) { return Math.hypot(...a.map((value, i) => value - b[i])); }

describe('BirdLab first-person woodland', () => {
  it('includes a real squirrel only in free roam and records its visible binocular identity as a mammal',()=>{
    const test=runtime(()=>false,new THREE.Vector3(300,0,0),true),c=test.controller;
    try {
      expect(c.getState().animals).toEqual([]);expect(test.mammals.root.visible).toBe(false);
      c.setMode('free');expect(c.getState().animals).toHaveLength(1);expect(test.mammals.root.visible).toBe(true);
      const before=JSON.stringify(test.mammals.snapshot());c.setBinoculars(true);test.run(1);
      const camera=new THREE.Vector3(...c.getState().cameraPosition),target=test.mammals.getFocus('graySquirrel',new THREE.Vector3()).sub(camera).normalize();
      const yaw=Math.atan2(-target.x,-target.z),pitch=Math.asin(target.y);
      const dx=-Math.atan2(Math.sin(yaw-Math.atan2(1.8,4.8)),Math.cos(yaw-Math.atan2(1.8,4.8)))/.0014,dy=-(pitch+.2)/.0014;
      for(const [type,x,y] of [['pointerdown',0,0],['pointermove',dx,dy],['pointerup',dx,dy]]) {
        const e=new Event(type);Object.assign(e,{pointerId:1,clientX:x,clientY:y,button:0});test.canvas.dispatchEvent(e);
      }
      test.run(2);
      expect(c.getState().observation).toMatchObject({id:'graySquirrel',category:'mammal',identified:true});
      expect(JSON.stringify(test.mammals.snapshot())).toBe(before);expect(c.recordSighting()).toBe(true);
      expect(c.getState().sightings[0]).toMatchObject({id:'graySquirrel',category:'mammal'});
      c.setPaused(false);test.run(4);expect(JSON.stringify(test.mammals.snapshot())).not.toBe(before);
      c.setMode('guided');expect(c.getState().animals).toEqual([]);expect(test.mammals.root.visible).toBe(false);
      expect(test.mammals.getFocus('graySquirrel',new THREE.Vector3())).toBeNull();
      expect(c.getState().sightings).toHaveLength(1);
    }finally{test.dispose();}
    expect(test.mammals.root.parent).toBeNull();
  });
  it('eases down to a quiet crouch while paused and passes crouching to resident behavior', () => {
    const test=runtime(),c=test.controller;
    try {
      c.setMode('free');const initial=c.getState(),ground=test.terrain(initial.observerPosition[0],initial.observerPosition[2]);
      key(test.canvas,'KeyC');expect(c.getState().crouching).toBe(true);test.step();
      expect(c.getState().observerPosition[1]).toBeLessThan(initial.observerPosition[1]);
      expect(c.getState().observerPosition[1]).toBeGreaterThan(ground+1.03);
      test.run(1.5);expect(c.getState().observerPosition[1]).toBeCloseTo(ground+1.03,4);
      expect(c.getState().time).toBe(initial.time);expect(test.frames.size).toBe(0);
      c.setPaused(false);test.step();const start=c.getState().observerPosition;key(test.canvas,'KeyW');test.run(1);key(test.canvas,'KeyW','keyup');
      const end=c.getState().observerPosition;expect(Math.hypot(end[0]-start[0],end[2]-start[2])).toBeCloseTo(.65,5);
      expect(test.calls.at(-1).observer.crouching).toBe(true);
      c.setPaused(true);key(test.canvas,'KeyC');test.run(1.5);expect(c.getState().observerPosition[1]).toBeCloseTo(test.terrain(end[0],end[2])+1.65,4);
      c.setMode('guided');c.setCrouching(true);expect(c.getState().crouching).toBe(false);
    } finally {test.dispose();}
  });
  it('records a real centered observation while paused, prevents duplicates and preserves the notebook between views',()=>{
    const yaw=Math.atan2(1.8,4.8),focus=new THREE.Vector3(1.8,1.734,4.8).add(new THREE.Vector3(-Math.sin(yaw)*Math.cos(.2),-Math.sin(.2),-Math.cos(yaw)*Math.cos(.2)).multiplyScalar(4));
    const test=runtime(()=>false,focus),c=test.controller;
    try {
      c.setMode('free');expect(c.recordSighting()).toBe(false);c.setBinoculars(true);test.run(3);
      expect(c.getState()).toMatchObject({paused:true,time:0,observation:{id:'blueJay',identified:true}});
      expect(c.recordSighting()).toBe(true);expect(c.recordSighting()).toBe(false);expect(c.getState().sightings).toHaveLength(1);
      expect(test.frames.size).toBe(0);
      c.setBinoculars(false);expect(c.getState().observation).toBeNull();expect(c.recordSighting()).toBe(false);
      c.resetView();c.setMode('guided');expect(c.getState().sightings).toHaveLength(1);c.setMode('free');expect(c.getState().sightings).toHaveLength(1);
      c.getState().sightings[0].name='changed';expect(c.getState().sightings[0].name).toBe('Blue jay');
    }finally{test.dispose();}
  });
  it('keeps guided playback exact while free observation advances an independent observer and clock', () => {
    const test = runtime(), c = test.controller;
    try {
      c.setCamera('blueJay'); c.seek(15.9); c.setSpeed(.5);
      const guided = c.getState();
      c.setMode('free'); expect(c.getState()).toMatchObject({ mode: 'free', camera: 'walk', paused: true, time: 0, speed: 1 });
      c.setCamera('follow'); c.seek(2); c.setRepeatFlights(true); c.restart();
      expect(c.getState()).toMatchObject({ camera: 'walk', time: 0, repeatFlights: false });
      c.setPaused(false); test.run(1);
      const time = c.getState().time; expect(time).toBeGreaterThan(.8);
      expect(c.getState().fieldVisitTime).toBe(time);
      const observed = test.calls.filter(call => call.observer);
      expect(observed.length).toBeGreaterThan(10); expect(new Set(observed.map(call => call.observer)).size).toBe(1);
      expect(observed.every(call => call.dt <= .1)).toBe(true); expect(typeof observed[0].collider).toBe('function');
      c.setMode('guided');
      for (const field of ['time', 'camera', 'speed', 'paused', 'repeatFlights', 'position', 'orientation', 'pose']) expect(c.getState()[field]).toEqual(guided[field]);
      expect(test.modes).toEqual(['free', 'guided']);
      expect(test.canvas.requestPointerLock).not.toHaveBeenCalled();
      c.setMode('free');expect(c.getState().time).toBe(0);expect(c.getState().fieldVisitTime).toBe(time);
      c.setPaused(false);test.run(1);expect(c.getState().fieldVisitTime).toBeGreaterThan(time+.8);
    } finally { test.dispose(); }
    expect(test.frames.size).toBe(0); expect(test.disposed).toBe(1);
  });

  it('walks at terrain eye level, normalizes diagonal speed and slows behind real binocular magnification', () => {
    const test = runtime(), c = test.controller;
    try {
      c.setMode('free'); c.setPaused(false); test.step();
      const start = c.getState().observerPosition; key(test.canvas, 'KeyW'); test.run(1); key(test.canvas, 'KeyW', 'keyup');
      const straight = c.getState().observerPosition, straightDistance = Math.hypot(straight[0] - start[0], straight[2] - start[2]);
      expect(straightDistance).toBeCloseTo(1.65, 5); expect(straight[1]).toBeCloseTo(test.terrain(straight[0], straight[2]) + 1.65, 10);
      c.resetView(); key(test.canvas, 'KeyW'); key(test.canvas, 'KeyD'); test.run(1); key(test.canvas, 'KeyW', 'keyup'); key(test.canvas, 'KeyD', 'keyup');
      const diagonal = c.getState().observerPosition;
      expect(Math.hypot(diagonal[0] - start[0], diagonal[2] - start[2])).toBeCloseTo(straightDistance, 5);
      c.resetView(); key(test.canvas, 'KeyB'); test.run(1);
      expect(c.getState().binoculars).toBe(true); expect(c.getState().fieldOfView).toBeLessThan(23);
      key(test.canvas, 'KeyW'); test.run(1); key(test.canvas, 'KeyW', 'keyup');
      const close = c.getState().observerPosition;
      expect(Math.hypot(close[0] - start[0], close[2] - start[2])).toBeCloseTo(.48, 5);
      key(test.canvas, 'KeyB'); test.run(1); expect(c.getState().fieldOfView).toBeGreaterThan(59);
      c.lockPointer(); expect(test.canvas.requestPointerLock).toHaveBeenCalledTimes(1);
    } finally { test.dispose(); }
  });

  it('substeps collision travel, respects the woodland boundary, and clears held movement on pause, blur and visibility loss', () => {
    const test = runtime((x, z) => z < 3.5), c = test.controller;
    const hidden = Object.getOwnPropertyDescriptor(document, 'hidden');
    try {
      c.setMode('free'); c.setPaused(false); test.step(); c.setMove('forward', true); test.run(5);
      expect(c.getState().observerPosition[2]).toBeGreaterThanOrEqual(3.5);
      window.dispatchEvent(new Event('blur')); const atBlur = c.getState().observerPosition; test.run(.5);
      expect(c.getState().observerPosition).toEqual(atBlur);
      c.setMove('right', true); c.setPaused(true); const paused = c.getState(); test.run(.5);
      expect(c.getState().observerPosition).toEqual(paused.observerPosition); expect(c.getState().time).toBe(paused.time);
      c.setPaused(false); test.run(.5); expect(c.getState().observerPosition).toEqual(paused.observerPosition);
      c.setMove('right', true); Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
      expect(test.frames.size).toBe(0);
      Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); test.run(.5);
      expect(c.getState().observerPosition).toEqual(paused.observerPosition);
      c.setMove('back', true); test.run(30);
      const position = c.getState().observerPosition; expect(Math.hypot(position[0], position[2])).toBeLessThanOrEqual(17.5);
      const time = c.getState().time; test.canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
      expect(test.frames.size).toBe(0); test.run(1); expect(c.getState().time).toBe(time); expect(c.getState().observerSpeed).toBe(0);
    } finally { if (hidden) Object.defineProperty(document, 'hidden', hidden); else delete document.hidden; test.dispose(); }
  });

  it('supports discrete accessible steps and leaves the paused observer still', () => {
    const test = runtime(), c = test.controller;
    try {
      c.setMode('free'); const start = c.getState().observerPosition;
      c.stepMove('forward'); expect(c.getState().observerPosition).toEqual(start);
      c.setPaused(false); c.stepMove('forward'); expect(distance(c.getState().observerPosition, start)).toBeGreaterThan(.2);
      c.setMode('guided'); const guided = c.getState().cameraPosition; c.stepMove('forward'); expect(c.getState().cameraPosition).toEqual(guided);
    } finally { test.dispose(); }
  });
});

describe('independent hawk decisions', () => {
  it('holds a true mid-flight glide and resumes powered strokes without resetting the wing phase', () => {
    const hawk = exported.BirdLab3D.createFreeHawk([new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(6, 3, -4)], -.18);
    let gliding = 0, poweredAfterGlide = false, previousPhase = hawk.state.wingPhase;
    for (let frame = 0; frame < 5000; frame++) {
      const s = hawk.update(.01, null), phaseStep = (s.wingPhase - previousPhase + Math.PI * 2) % (Math.PI * 2);
      expect(phaseStep).toBeGreaterThan(0); expect(phaseStep).toBeLessThan(.18); previousPhase = s.wingPhase;
      if (s.phase === 'gliding' && s.pose.flapAmplitude === 0) {
        gliding++; expect(s.wingbeat).toBeCloseTo(0, 2); expect(s.pose.fold).toBe(0);
        expect(s.pose.wingSupport).toBeGreaterThan(.12); expect(s.airspeed).toBeGreaterThan(1);
      }
      if (gliding && s.phase === 'landing' && s.pose.flapAmplitude > .4) { poweredAfterGlide = true; break; }
    }
    expect(gliding).toBeGreaterThan(40); expect(poweredAfterGlide).toBe(true);
  });
  it('visits actual lookout destinations with finite continuous posture, varied dwell times, and no 44-second replay', () => {
    const perches = [new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(-5.7, 2.8, -4.4), new THREE.Vector3(6.3, 3.1, -5.8)];
    const hawk = exported.BirdLab3D.createFreeHawk(perches, -.18), visits = new Set(), states = new Set(), snapshots = [];
    const initial = JSON.stringify(hawk.state);
    let previous = hawk.state.position.slice(), previousPose = { ...hawk.state.pose }, flightFrames = 0;
    for (let frame = 0; frame <= 3600; frame++) {
      const state = hawk.update(.05, { position: new THREE.Vector3(15, 1.65, 12), speed: 0 });
      expect([...state.position, ...state.velocity, state.yaw, state.pitch, state.bank, ...Object.values(state.pose)].every(Number.isFinite)).toBe(true);
      expect(distance(state.position, previous)).toBeLessThan(.6); previous = state.position.slice(); states.add(state.phase);
      expect(Math.max(...Object.keys(state.pose).map(key => Math.abs(state.pose[key] - previousPose[key])))).toBeLessThan(.3);
      previousPose = { ...state.pose };
      if (state.phase === 'perched') {
        const perch = perches.findIndex(point => distance(state.position, [point.x, point.y + .18, point.z]) < 1e-7);
        expect(perch).toBeGreaterThanOrEqual(0); visits.add(perch);
      }
      if (state.airspeed > .1) flightFrames++;
      if (frame % 20 === 0) snapshots.push(state.position.slice());
    }
    expect(visits.size).toBe(3); expect(states.has('takeoff')).toBe(true); expect(states.has('landing')).toBe(true); expect(states.has('gliding')).toBe(true);
    expect(flightFrames).toBeGreaterThan(150);
    expect(Math.max(...snapshots.slice(44).map((position, i) => distance(position, snapshots[i])))).toBeGreaterThan(1);
    hawk.reset(); expect(JSON.stringify(hawk.state)).toBe(initial);
  });
  it('notices an approaching observer without advancing while paused', () => {
    const perches = [new THREE.Vector3(0, 3.2, 0), new THREE.Vector3(6, 3, -4)], hawk = exported.BirdLab3D.createFreeHawk(perches, -.18);
    const observer = { position: new THREE.Vector3(0, 1.65, 1), speed: 1 };
    expect(hawk.update(0, observer).label).toContain('Alert');
    const before = JSON.stringify(hawk.state); for (let frame = 0; frame < 50; frame++) hawk.update(0, observer);
    expect(JSON.stringify(hawk.state)).toBe(before);
    for (let frame = 0; frame < 100; frame++) hawk.update(.05, observer);
    expect(hawk.state.phase).toBe('takeoff');
  });
  it('keeps the single-perch fallback grounded instead of inventing a vertical flight', () => {
    const hawk = exported.BirdLab3D.createFreeHawk([new THREE.Vector3(0, 3.2, 0)], -.18);
    for (let frame = 0; frame < 1200; frame++) hawk.update(.1, null);
    expect(hawk.state.phase).toBe('perched'); expect(hawk.state.position).toEqual([0, 3.3800000000000003, 0]);
  });
});
