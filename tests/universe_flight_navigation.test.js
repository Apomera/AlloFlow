import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight;
let scene;
let telemetry;
let pauses;
let frames;
let time;
let nextFrame;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  frames = new Map();
  time = 100;
  nextFrame = 0;
  pauses = [];
  telemetry = null;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => time);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  // Exercise navigation and persistence against the real scene lifecycle. GPU
  // drawing is stubbed because these checks concern state, geometry, and clocks.
  const graphics = new Proxy({}, {
    get: (_, key) => {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'createBuffer' || key === 'createProgram' || key === 'createShader') return () => ({});
      if (key === 'getUniformLocation') return (_program, name) => name;
      if (String(key).toUpperCase() === key) return 1;
      return () => {};
    },
  });
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(graphics);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  scene = flight.create(canvas, {
    onTelemetry: value => { telemetry = value; },
    onPause: message => pauses.push(message),
  });
});

afterEach(() => {
  scene?.dispose();
  vi.restoreAllMocks();
});

function advance(milliseconds = 16) {
  time += milliseconds;
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach(callback => callback(time));
}

describe('Universe flight destination navigation', () => {
  it('returns independent landmark catalogs for every generated scene', () => {
    const ids = new Set();
    for (const region of ['neighborhood', 'galaxy', 'cosmic']) {
      const items = flight.landmarks(region);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
        expect(item.position).toHaveLength(3);
        expect(item.position.every(Number.isFinite)).toBe(true);
        expect(item.arrivalRadiusLy).toBeGreaterThan(0);
      }
      const original = flight.landmarks(region)[0];
      items[0].name = 'Mutated';
      items[0].position[0] = 1e20;
      expect(flight.landmarks(region)[0]).toEqual(original);
    }
    expect(flight.landmarks('missing')).toEqual([]);
  });

  it('clips even the fastest approach at its viewing distance and pauses without adding physical clock time', () => {
    const target = flight.landmarks('neighborhood')[0];
    scene.set({ mode: 'explore', speed: 1e10 });
    expect(scene.navigateTo(target.id)).toBe(true);
    advance();
    for (let frame = 0; frame < 300 && telemetry.running; frame++) {
      advance(100);
      const position = scene.snapshot().state.position;
      const gap = Math.hypot(...target.position.map((value, index) => value - position[index]));
      expect(gap).toBeGreaterThanOrEqual(target.arrivalRadiusLy - 1e-9);
    }
    const remaining = Math.hypot(...target.position.map((value, index) => value - telemetry.position[index]));
    expect(remaining).toBeCloseTo(target.arrivalRadiusLy, 8);
    expect(telemetry.distanceLy).toBeCloseTo(Math.hypot(...target.position) - target.arrivalRadiusLy, 8);
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.active).toBe(false);
    expect(telemetry.universeYears).toBe(0);
    expect(telemetry.travelerYears).toBe(0);
    expect(pauses).toHaveLength(1);
    const stopped = structuredClone(telemetry.position);
    advance(1000);
    expect(telemetry.position).toEqual(stopped);
  });

  it('centers the apparent destination at relativistic speeds without moving or starting travel', () => {
    const target = flight.landmarks('neighborhood')[0];
    scene.set({ mode: 'relativity', beta: 0.9 });
    expect(scene.focusTarget(target.id)).toBe(true);
    expect(telemetry.target.id).toBe(target.id);
    expect(telemetry.target.screen[0]).toBeCloseTo(0.5, 10);
    expect(telemetry.target.screen[1]).toBeCloseTo(0.5, 10);
    expect(telemetry.target.inView).toBe(true);
    expect(telemetry.position).toEqual([0, 0, 0]);
    expect(telemetry.running).toBe(false);
    expect(scene.navigateTo(target.id)).toBe(false);
  });

  it('cancels a guided approach immediately and rejects a missing destination', () => {
    const target = flight.landmarks('neighborhood')[0];
    expect(scene.navigateTo('missing')).toBe(false);
    expect(scene.navigateTo(target.id)).toBe(true);
    expect(scene.cancelNavigation()).toBe(true);
    advance();
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.active).toBe(false);
    expect(telemetry.position).toEqual([0, 0, 0]);
  });
});

describe('Universe flight saved observations', () => {
  it('restores the complete viewpoint and accumulated clocks in a paused state', () => {
    scene.set({ mode: 'relativity', beta: 0.6, timeScale: 10, fov: 55, exposure: 1.35, quality: 'auto' });
    scene.set({ running: true });
    advance();
    advance(100);
    scene.set({ running: false });
    scene.look(0.4, -0.2);
    scene.selectTarget('blue-star');
    const saved = scene.snapshot();
    expect(saved.state.universeYears).toBeGreaterThan(0);
    expect(saved.state.travelerYears).toBeLessThan(saved.state.universeYears);
    scene.set({ region: 'cosmic', mode: 'explore', running: true, fov: 90, exposure: 0.5 });
    expect(scene.restore(saved)).toBe(true);
    expect(scene.snapshot()).toEqual(saved);
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.active).toBe(false);
    expect(telemetry.position).toEqual(saved.state.position);
    expect(telemetry.universeYears).toBe(saved.state.universeYears);
    expect(telemetry.travelerYears).toBe(saved.state.travelerYears);
    advance(1000);
    expect(scene.snapshot()).toEqual(saved);
  });

  it('copies snapshots so editing a downloaded observation cannot change the live scene', () => {
    const saved = scene.snapshot();
    saved.state.position[0] = 1234;
    saved.settings.region = 'cosmic';
    expect(scene.snapshot().state.position).toEqual([0, 0, 0]);
    expect(scene.snapshot().settings.region).toBe('neighborhood');
  });

  it('rejects invalid or out-of-bounds saved views atomically', () => {
    scene.look(0.5, 0.2);
    const before = scene.snapshot();
    const invalid = [
      null,
      { ...before, version: 999 },
      { ...before, settings: { ...before.settings, region: 'missing' } },
      { ...before, state: { ...before.state, position: [NaN, 0, 0] } },
      { ...before, state: { ...before.state, position: [100001, 0, 0] } },
      { ...before, state: { ...before.state, universeYears: Infinity } },
    ];
    for (const value of invalid) {
      expect(scene.restore(value)).toBe(false);
      expect(scene.snapshot()).toEqual(before);
    }
  });
});

describe('Universe flight approach planner', () => {
  it('plans without movement and bounds invalid distance choices', () => {
    const before=scene.snapshot();
    const near=scene.planApproach('amber-star',1),wide=scene.planApproach('amber-star',4);
    expect(wide.arrivalRadiusLy).toBe(near.arrivalRadiusLy*4);
    expect(wide.remainingLy).toBeLessThan(near.remainingLy);
    expect(scene.planApproach('amber-star',100)).toEqual(wide);
    expect(scene.planApproach('amber-star',NaN)).toEqual(near);
    expect(scene.planApproach('missing')).toBeNull();
    expect(scene.snapshot()).toEqual(before);
    scene.set({speed:0});expect(scene.planApproach('amber-star').estimatedSeconds).toBeNull();
    scene.set({mode:'relativity'});expect(scene.planApproach('amber-star')).toBeNull();
  });
  it('stops at each chosen survey radius with monotonic progress and a useful time estimate', () => {
    const target=flight.landmarks('neighborhood')[0];
    for(const multiplier of [1,2,4]) {
      scene.reset();scene.set({speed:2});
      const plan=scene.planApproach(target.id,multiplier);
      expect(scene.navigateTo(target.id,multiplier)).toBe(true);advance();
      let steps=0,progress=0;
      while(telemetry.running&&steps<1000) {
        advance(20);steps++;
        expect(telemetry.navigation.progress).toBeGreaterThanOrEqual(progress);
        progress=telemetry.navigation.progress;
      }
      expect(telemetry.running).toBe(false);
      expect(telemetry.navigation.completed).toBe(true);
      expect(telemetry.navigation.progress).toBe(1);
      expect(telemetry.target.distanceLy).toBeCloseTo(plan.arrivalRadiusLy,8);
      expect(telemetry.distanceLy).toBeCloseTo(plan.remainingLy,8);
      expect(Math.abs(steps*0.02-plan.estimatedSeconds)).toBeLessThan(0.15);
      expect(telemetry.universeYears).toBe(0);
      expect(telemetry.travelerYears).toBe(0);
    }
  });
  it('keeps a paused route intact, updates its estimate with pace, and clears completion on free travel', () => {
    scene.set({speed:1});scene.navigateTo('amber-star',2);advance();advance(100);
    scene.set({running:false});const stopped=structuredClone(telemetry.navigation),position=telemetry.position.slice();
    advance(1000);expect(telemetry.navigation).toEqual(stopped);
    scene.set({speed:5});expect(telemetry.navigation.estimatedSeconds).toBeLessThan(stopped.estimatedSeconds);
    expect(telemetry.position).toEqual(position);
    scene.set({running:true});advance();
    for(let i=0;i<300&&telemetry.running;i++)advance(100);
    expect(telemetry.navigation.completed).toBe(true);
    scene.set({running:true});expect(telemetry.navigation.completed).toBe(false);
    scene.set({running:false});expect(scene.navigateTo('amber-star',4)).toBe(false);
    expect(telemetry.running).toBe(false);
    expect(telemetry.navigation.completed).toBe(true);
    scene.selectTarget('blue-star');expect(telemetry.navigation.targetId).toBeNull();
  });
});

describe('Universe flight precision camera', () => {
  it('moves along the camera basis and pauses without changing clocks or gaze', () => {
    scene.look(Math.PI/2,Math.PI/6);
    const gaze=scene.snapshot().state;
    expect(scene.nudge('right',2)).toBe(true);
    expect(telemetry.position[0]).toBeCloseTo(0,8);
    expect(telemetry.position[2]).toBeCloseTo(-2,8);
    scene.nudge('up',2);
    expect(telemetry.position[0]).toBeCloseTo(-1,8);
    expect(telemetry.position[1]).toBeCloseTo(Math.sqrt(3),8);
    scene.nudge('forward',2);
    expect(telemetry.position[0]).toBeCloseTo(Math.sqrt(3)-1,8);
    expect(telemetry.position[1]).toBeCloseTo(Math.sqrt(3)+1,8);
    expect(telemetry.distanceLy).toBeCloseTo(6,8);
    expect(telemetry.running).toBe(false);
    expect(telemetry.universeYears).toBe(0);expect(telemetry.travelerYears).toBe(0);
    expect(telemetry.yaw).toBe(gaze.yaw);expect(telemetry.pitch).toBe(gaze.pitch);
  });
  it('undoes position and path while preserving a later look direction, with a 12-step limit', () => {
    for(let i=0;i<14;i++)scene.nudge('forward',1);
    expect(telemetry.cameraMoves).toBe(12);
    scene.look(0.2,0.1);
    for(let i=0;i<12;i++)expect(scene.undoNudge()).toBe(true);
    expect(telemetry.position).toEqual([0,0,2]);
    expect(telemetry.distanceLy).toBe(2);
    expect(telemetry.trail.at(-1)).toEqual([0,0,2]);
    expect(telemetry.yaw).toBeCloseTo(0.2,8);
    expect(telemetry.pitch).toBeCloseTo(0.1,8);
    expect(scene.undoNudge()).toBe(false);
  });
  it('clips steps at the model boundary and can undo the actual clipped displacement', () => {
    const saved=scene.snapshot();saved.state.position=[0,0,99999];scene.restore(saved);
    scene.nudge('forward',20);
    expect(telemetry.position[2]).toBeCloseTo(100000,8);
    expect(telemetry.distanceLy).toBeCloseTo(1,8);
    expect(telemetry.running).toBe(false);
    scene.undoNudge();expect(telemetry.position).toEqual([0,0,99999]);expect(telemetry.distanceLy).toBe(0);
  });
  it('hands off routes and orbits, clears undo for new journeys, and rejects steps in relativity', () => {
    scene.navigateTo('amber-star');scene.nudge('left',1);
    expect(telemetry.navigation.active).toBe(false);expect(telemetry.running).toBe(false);
    scene.startOrbit('amber-star');expect(telemetry.cameraMoves).toBe(0);
    scene.nudge('back',1);expect(telemetry.orbit.active).toBe(false);
    scene.set({running:true});expect(scene.undoNudge()).toBe(false);
    scene.set({running:false});const before=scene.snapshot();
    expect(scene.nudge('missing',1)).toBe(false);expect(scene.nudge('up',NaN)).toBe(false);
    expect(scene.nudge('up',-1)).toBe(false);expect(scene.snapshot()).toEqual(before);
    scene.set({mode:'relativity'});const physical=scene.snapshot();
    expect(scene.nudge('forward',1)).toBe(false);expect(scene.snapshot()).toEqual(physical);
  });
});

describe('Universe flight navigation chart', () => {
  it('fits landmarks and path with equal scales for both coordinate axes', () => {
    for (const region of ['neighborhood','galaxy','cosmic']) for (const plane of ['xz','xy']) {
      const chart=flight.math.chartView(region,[-90000,15000,-80000],0.2,0.1,[[0,0,0],[1000,2000,3000]],plane);
      const points=chart.landmarks.map(p=>[p.x,p.y]).concat([[chart.camera.x,chart.camera.y]],chart.trail);
      for(const [x,y] of points) {
        expect(x).toBeGreaterThan(15);expect(x).toBeLessThan(265);
        expect(y).toBeGreaterThan(15);expect(y).toBeLessThan(205);
      }
      const [a,b]=chart.trail;
      expect((b[0]-a[0])/(a[1]-b[1])).toBeCloseTo(plane==='xz'?1/3:1/2,8);
      expect(chart.scaleLy).toBeGreaterThan(0);expect(chart.scalePixels).toBeGreaterThan(0);
    }
  });
  it('projects gaze without a false heading when looking perpendicular to the chart', () => {
    const view=(yaw,pitch,plane)=>flight.math.chartView('neighborhood',[0,0,0],yaw,pitch,[],plane);
    expect(view(0,0,'xz').camera.angle).toBe(0);
    expect(view(Math.PI/2,0,'xz').camera.angle).toBeCloseTo(90,8);
    expect(view(0,Math.PI/2,'xz').camera.headingVisible).toBe(false);
    expect(view(0,0,'xy').camera.headingVisible).toBe(false);
    expect(view(0,Math.PI/4,'xy').camera.angle).toBe(0);
    const shifted=flight.math.chartView('neighborhood',[0,0,0],Math.PI/2,0,[],'xz',0.9);
    expect(shifted.camera.angle).toBeCloseTo(Math.atan2(Math.sqrt(1-0.9*0.9),-0.9)*180/Math.PI,8);
    const invalid=flight.math.chartView('missing',[NaN,Infinity,0],NaN,Infinity,null,'missing');
    expect(Number.isFinite(invalid.camera.x)).toBe(true);expect(invalid.landmarks).toEqual([]);
  });
  it('bounds and copies history, then clears it on a restored view or scene change', () => {
    scene.set({speed:2,running:true});advance();
    for(let i=0;i<150;i++)advance(300);
    scene.set({running:false});expect(telemetry.trail).toHaveLength(128);
    expect(telemetry.trail.at(-1)).toEqual(telemetry.position);
    const saved=scene.snapshot(),oldPosition=telemetry.position.slice();
    telemetry.trail.at(-1)[0]=1e15;scene.selectTarget('amber-star');
    expect(telemetry.trail.at(-1)).toEqual(oldPosition);
    const count=telemetry.trail.length;scene.look(0.1,0);advance();
    expect(telemetry.trail).toHaveLength(count);
    scene.restore(saved);expect(telemetry.trail).toEqual([saved.state.position]);
    scene.set({region:'galaxy'});expect(telemetry.trail).toEqual([[0,0,-95000]]);
    scene.reset();expect(telemetry.trail).toEqual([[0,0,-95000]]);
  });
});

describe('Universe flight camera orbits', () => {
  it('holds radius and altitude, centers its target, and records camera arc length without advancing physical clocks', () => {
    scene.set({ region: 'galaxy', orbitRate: 6 });
    expect(scene.startOrbit('galactic-center')).toBe(true);
    advance();
    for (let i = 0; i < 10; i++) advance(100);
    scene.set({ running: false });
    expect(Math.hypot(...telemetry.position)).toBeCloseTo(95000, 6);
    expect(telemetry.position[1]).toBe(0);
    expect(telemetry.position[0]).toBeLessThan(0);
    expect(telemetry.target.screen[0]).toBeCloseTo(0.5, 8);
    expect(telemetry.target.screen[1]).toBeCloseTo(0.5, 8);
    expect(telemetry.distanceLy).toBeCloseTo(95000 * Math.PI / 30, 6);
    expect(telemetry.universeYears).toBe(0);
    expect(telemetry.travelerYears).toBe(0);
    const paused = scene.snapshot(); advance(5000);
    expect(scene.snapshot()).toEqual(paused);
    expect(telemetry.orbit.active).toBe(true);
    scene.set({ orbitDirection: -1, running: true }); advance();
    for (let i = 0; i < 10; i++) advance(100);
    scene.set({ running: false });
    expect(telemetry.position[0]).toBeCloseTo(0, 6);
    expect(telemetry.position[2]).toBeCloseTo(-95000, 6);
  });

  it('hands control back immediately on manual look and target changes', () => {
    expect(scene.startOrbit('amber-star')).toBe(true);
    const before = scene.snapshot().state.position;
    scene.look(0.2, 0); advance();
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.running).toBe(false);
    expect(telemetry.position).toEqual(before);
    scene.startOrbit('amber-star'); scene.selectTarget('blue-star');
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.running).toBe(false);
    scene.startOrbit('blue-star'); scene.view('back');
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.running).toBe(false);
  });

  it('clears orbit state when switching motion, restoring a view, resetting, or entering relativity', () => {
    const saved = scene.snapshot();
    scene.startOrbit('amber-star'); scene.navigateTo('amber-star');
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.navigation.active).toBe(true);
    scene.startOrbit('amber-star');
    expect(telemetry.navigation.active).toBe(false);
    expect(scene.restore(saved)).toBe(true);
    expect(telemetry.orbit.active).toBe(false);
    scene.startOrbit('amber-star'); scene.reset();
    expect(telemetry.orbit.active).toBe(false);
    scene.startOrbit('amber-star'); scene.set({mode:'relativity'});
    expect(telemetry.orbit.active).toBe(false);
    expect(telemetry.running).toBe(false);
    expect(scene.startOrbit('amber-star')).toBe(false);
    expect(scene.startOrbit('missing')).toBe(false);
  });

  it('stops an orbit at the generated model boundary', () => {
    const saved = scene.snapshot(); saved.state.position = [-100000,0,0];
    scene.restore(saved); scene.set({orbitRate:0.25}); scene.startOrbit('amber-star');
    advance(); advance(100);
    expect(telemetry.running).toBe(false);
    expect(telemetry.orbit.active).toBe(false);
    expect(Math.hypot(...telemetry.position)).toBeCloseTo(100000, 6);
  });
});
