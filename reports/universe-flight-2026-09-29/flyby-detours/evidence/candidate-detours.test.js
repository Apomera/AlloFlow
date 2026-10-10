import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let flight, scene, canvas, telemetry, pauses, frames, now, frameId, created, deleted, uploads;

beforeAll(() => {
  delete window.UniverseFlight;
  new Function(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'))();
  flight = window.UniverseFlight;
});

beforeEach(() => {
  scene = null; telemetry = null; pauses = []; frames = new Map(); now = 100; frameId = 0;
  created = { Buffer: [], Texture: [], Program: [], Shader: [] };
  deleted = { Buffer: [], Texture: [], Program: [], Shader: [] };
  uploads = { texture: 0, buffer: 0 };
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  vi.spyOn(window.performance, 'now').mockImplementation(() => now);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => { scene?.dispose(); vi.restoreAllMocks(); });

function createScene(available = true) {
  const constants = new Map();
  const gl = new Proxy({}, {
    get(_, key) {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'getAttribLocation') return () => 0;
      if (key === 'getUniformLocation') return (_program, name) => name;
      if (key === 'getParameter') return () => [1, 256];
      if (key === 'texImage2D') return () => uploads.texture++;
      if (key === 'bufferData') return () => uploads.buffer++;
      const operation = String(key).match(/^(create|delete)(Buffer|Texture|Program|Shader)$/);
      if (operation) return resource => {
        if (operation[1] === 'create') {
          const item = { type: operation[2], index: created[operation[2]].length };
          created[operation[2]].push(item); return item;
        }
        deleted[operation[2]].push(resource);
      };
      if (String(key).toUpperCase() === key) {
        if (!constants.has(key)) constants.set(key, constants.size + 1);
        return constants.get(key);
      }
      return () => {};
    },
  });
  canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(available ? gl : null);
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ width: 800, height: 500 });
  scene = flight.create(canvas, { onTelemetry(value) { telemetry = value; }, onPause(message, detail) { pauses.push({ message, detail }); } });
  return scene;
}
function advance(milliseconds = 16) {
  now += milliseconds; const callbacks = [...frames.values()]; frames.clear();
  callbacks.forEach(callback => callback(now));
}
function publish() { scene.set({}); return telemetry; }
function launch(id = 'stellar', seconds, preferences = {}) {
  const route = flight.flybys().find(item => item.id === id);
  scene.set({ mode: 'explore', region: route.region, flybyRate: 1, pauseAtHighlights: false, ...preferences });
  expect(scene.startFlyby(id)).toBe(true); advance();
  expect(scene.seekFlyby(seconds ?? route.highlights[0].seconds)).toBe(true);
  return route;
}
function reject(action) {
  const saved = scene.snapshot(), before = structuredClone(telemetry), scheduled = [...frames.keys()], events = pauses.length;
  expect(action()).toBe(false);
  expect(scene.snapshot()).toEqual(saved); expect(telemetry).toEqual(before);
  expect([...frames.keys()]).toEqual(scheduled); expect(pauses).toHaveLength(events);
}
function counts() { return Object.fromEntries(Object.entries(created).map(([kind, items]) => [kind, items.length])); }
function expectInspectionRestore(actual, expected) {
  // Inspection Back shares version-1 restore's established yaw normalization.
  // Route return is checked separately with exact, unnormalized snapshot equality.
  expect(Math.sin(actual.state.yaw)).toBeCloseTo(Math.sin(expected.state.yaw), 12);
  expect(Math.cos(actual.state.yaw)).toBeCloseTo(Math.cos(expected.state.yaw), 12);
  const comparable = structuredClone(actual); comparable.state.yaw = expected.state.yaw;
  expect(comparable).toEqual(expected);
}

describe('Universe flyby inspection detours', () => {
  it('admits only a paused active route and rejects nested or consumed checkpoints atomically', () => {
    createScene(); reject(() => scene.beginFlybyDetour()); reject(() => scene.returnToFlyby()); reject(() => scene.cancelFlybyDetour());
    launch(); scene.set({ running: true }); reject(() => scene.beginFlybyDetour());
    scene.set({ running: false }); expect(scene.beginFlybyDetour()).toBe(true);
    reject(() => scene.beginFlybyDetour());
    expect(scene.returnToFlyby()).toBe(true); reject(() => scene.returnToFlyby());
    expect(scene.beginFlybyDetour()).toBe(true); expect(scene.cancelFlybyDetour()).toBe(true);
    reject(() => scene.returnToFlyby()); reject(() => scene.cancelFlybyDetour());
    const route = launch(); scene.seekFlyby(route.durationSeconds); reject(() => scene.beginFlybyDetour());
    scene.set({ mode: 'relativity' }); reject(() => scene.beginFlybyDetour());
  });

  it('returns every route to its exact paused pose, target, free look and counters without serializing the detour', () => {
    createScene();
    for (const route of flight.flybys()) {
      launch(route.id, route.highlights[1].seconds, { fov: 43, exposure: 0.72, quality: 'low', flybyRate: 2 });
      scene.look(-0.231, 0.071);
      const origin = scene.snapshot(), originalRoute = structuredClone(publish().flyby), trail = structuredClone(telemetry.trail), events = pauses.length;
      expect(scene.beginFlybyDetour()).toBe(true);
      expect(scene.snapshot()).toEqual(origin);
      expect(telemetry).toMatchObject({ running: false, flyby: { active: false }, flybyDetour: {
        active: true, id: route.id, name: route.name, elapsedSeconds: route.highlights[1].seconds,
        durationSeconds: route.durationSeconds, targetId: origin.targetId,
      } });
      expect(pauses).toHaveLength(events + 1); expect(pauses.at(-1).detail.kind).toBe('flyby-detour');
      expect(Object.keys(scene.snapshot()).sort()).toEqual(['settings', 'state', 'targetId', 'version']);
      expect(scene.snapshot().version).toBe(1);
      const mutable = telemetry.flybyDetour; mutable.id = 'changed'; mutable.elapsedSeconds = 1e9; mutable.targetId = 'missing';
      expect(publish().flybyDetour).toMatchObject({ id: route.id, elapsedSeconds: route.highlights[1].seconds, targetId: origin.targetId });
      expect(scene.nudge('right', route.region === 'neighborhood' ? 1 : 1000)).toBe(true);
      scene.look(0.3, -0.2); scene.set({ fov: 10, exposure: 1.8, quality: 'high' });
      expect(scene.returnToFlyby()).toBe(true);
      expect(scene.snapshot()).toEqual(origin); expect(telemetry.flyby).toEqual(originalRoute); expect(telemetry.trail).toEqual(trail);
      expect(telemetry.flybyDetour).toEqual({ active: false }); expect(telemetry.running).toBe(false);
      expect(pauses.at(-1).detail.kind).toBe('flyby-return');
      advance(50000); expect(scene.snapshot()).toEqual(origin);
    }
  });

  it('keeps one route bookmark through target changes, lens edits, radial and viewpoint glides, and a camera orbit', () => {
    createScene(); launch('stellar'); const origin = scene.snapshot(); expect(scene.beginFlybyDetour()).toBe(true);
    const bookmark = structuredClone(telemetry.flybyDetour);
    expect(scene.selectTarget('blue-star')).toBe(true); expect(scene.focusTarget('blue-star')).toBe(true);
    scene.set({ fov: 10, exposure: 1.6, speed: 7, timeScale: 90, smoothTravel: true, flybyRate: 4, pauseAtHighlights: true, orbitTilt: 35, orbitDirection: -1 });
    expect(scene.startDistanceGlide('blue-star', 'farther')).toBe(true); advance(); advance(300); expect(scene.cancelDistanceGlide()).toBe(true);
    expect(scene.startViewpointGlide('blue-star', 'left', 15)).toBe(true); advance(); advance(300); expect(scene.cancelViewpointGlide()).toBe(true);
    expect(scene.startOrbit('blue-star')).toBe(true); advance(); advance(300);
    expect(publish().flybyDetour).toEqual(bookmark); expect(telemetry.orbit.active).toBe(true);
    expect(scene.returnToFlyby()).toBe(true);
    expect(scene.snapshot()).toEqual(origin); expect(telemetry.running).toBe(false);
    expect(telemetry.orbit.active || telemetry.distanceGlide.active || telemetry.viewpointGlide.active || telemetry.navigation.active).toBe(false);
  });

  it('resumes with the same trajectory as uninterrupted paused travel across rates, highlight easing and free look', () => {
    createScene();
    function continuation(detour, rate, stops, freeLook) {
      launch('disk', 14.2, { flybyRate: rate, pauseAtHighlights: stops, fov: 53, exposure: 0.82 });
      scene.set({ running: true }); advance(); advance(100); advance(200); scene.set({ running: false });
      if (freeLook) scene.look(0.12, -0.05);
      if (detour) {
        expect(scene.beginFlybyDetour()).toBe(true); scene.nudge('left', 400);
        scene.set({ flybyRate: rate === 4 ? 0.25 : 4, pauseAtHighlights: !stops, fov: 10, exposure: 1.7 });
        expect(scene.returnToFlyby()).toBe(true);
      }
      const result = [];
      scene.set({ running: true }); advance();
      for (let index = 0; index < 5; index++) {
        advance(100); result.push({ snapshot: scene.snapshot(), route: structuredClone(publish().flyby), motion: structuredClone(telemetry.motion) });
      }
      return result;
    }
    for (const rate of [0.25, 1, 4]) for (const stops of [false, true]) for (const freeLook of [false, true]) {
      expect(continuation(true, rate, stops, freeLook)).toEqual(continuation(false, rate, stops, freeLook));
    }
  });

  it('continues past the returned stop and pauses exactly once at the following highlight', () => {
    createScene(); const route = launch('disk', 10, { flybyRate: 4, pauseAtHighlights: true });
    const origin = scene.snapshot(); expect(scene.beginFlybyDetour()).toBe(true); scene.nudge('right', 1000);
    expect(scene.returnToFlyby()).toBe(true); expect(scene.snapshot()).toEqual(origin);
    const events = pauses.length; scene.set({ running: true }); advance();
    for (let tick = 0; tick < 100 && publish().running; tick++) advance(100);
    expect(telemetry.flyby.elapsedSeconds).toBe(route.highlights[1].seconds); expect(telemetry.running).toBe(false);
    expect(pauses.slice(events).map(item => item.detail?.kind)).toEqual(['flyby-stop']);
    expect(pauses.at(-1).detail.highlightId).toBe(route.highlights[1].id);
    const paused = scene.snapshot(); advance(60000); expect(scene.snapshot()).toEqual(paused); expect(pauses).toHaveLength(events + 1);
  });

  it('supports inspection Back only within the current exploration region while preserving the route bookmark', () => {
    createScene(); launch('stellar'); const origin = scene.snapshot(); expect(scene.beginFlybyDetour()).toBe(true);
    const bookmark = structuredClone(telemetry.flybyDetour), inspection = scene.snapshot();
    scene.nudge('right', 1); scene.set({ fov: 10 });
    expect(scene.restoreInspectionView(inspection)).toBe(true);
    expectInspectionRestore(scene.snapshot(), inspection); expect(telemetry.flybyDetour).toEqual(bookmark); expect(telemetry.running).toBe(false);
    for (const change of [{ mode: 'relativity' }, { region: 'galaxy' }, { region: 'cosmic' }]) {
      const invalid = structuredClone(inspection); Object.assign(invalid.settings, change);
      reject(() => scene.restoreInspectionView(invalid));
    }
    const malformed = structuredClone(inspection); malformed.state.position[0] = NaN;
    reject(() => scene.restoreInspectionView(malformed));
    expect(scene.returnToFlyby()).toBe(true); expect(scene.snapshot()).toEqual(origin);
  });

  it('visits another scenic highlight and takes inspection Back without losing the suspended route', () => {
    createScene(); const route = launch('nebula', 12); scene.look(0.13, -0.06);
    const origin = scene.snapshot(); expect(scene.beginFlybyDetour()).toBe(true);
    scene.nudge('right', 0.5); const inspection = scene.snapshot(), bookmark = structuredClone(telemetry.flybyDetour);
    for (const args of [['missing', 'amber'], ['stellar', 'missing'], ['disk', 'arms'], [null, null]]) {
      reject(() => scene.inspectFlybyHighlight(...args));
    }
    const scenic = flight.flybys('neighborhood').find(item => item.id === 'stellar');
    expect(scene.inspectFlybyHighlight('stellar', scenic.highlights[0].id)).toBe(true);
    expect(telemetry.running).toBe(false); expect(telemetry.flyby.active).toBe(false); expect(telemetry.flybyDetour).toEqual(bookmark);
    expect(scene.snapshot().targetId).toBe(scenic.highlights[0].targetId);
    expect(scene.snapshot().settings).toMatchObject({ region: route.region, fov: scenic.fov, exposure: 0.86 });
    expect(scene.snapshot().state.position).not.toEqual(inspection.state.position);
    expect(scene.restoreInspectionView(inspection)).toBe(true);
    expectInspectionRestore(scene.snapshot(), inspection); expect(telemetry.flybyDetour).toEqual(bookmark);
    expect(scene.returnToFlyby()).toBe(true); expect(scene.snapshot()).toEqual(origin);
    expect(telemetry.flyby).toMatchObject({ id: 'nebula', active: true, elapsedSeconds: 12, autoLook: false });
  });

  it('invalidates a detour on successful saved-view restore, reset, new route, and actual scene or mode changes', () => {
    createScene();
    const handoffs = [
      () => scene.restore(scene.snapshot()), () => scene.reset(), () => scene.startFlyby('nebula'),
      () => scene.set({ region: 'galaxy' }), () => scene.set({ mode: 'relativity' }),
    ];
    for (const action of handoffs) {
      launch('stellar'); expect(scene.beginFlybyDetour()).toBe(true);
      scene.set({ mode: 'explore', region: 'neighborhood' }); expect(telemetry.flybyDetour.active).toBe(true);
      action(); publish(); expect(telemetry.flybyDetour).toEqual({ active: false }); reject(() => scene.returnToFlyby());
    }
  });

  it('retains the bookmark and current detour after rejected restoration, route launches and navigation requests', () => {
    createScene(); launch('stellar'); const origin = scene.snapshot(); expect(scene.beginFlybyDetour()).toBe(true);
    scene.nudge('right', 1);
    const malformed = scene.snapshot(); malformed.state.position[2] = Infinity;
    for (const action of [
      () => scene.restore(malformed), () => scene.restore(null), () => scene.restoreInspectionView(malformed),
      () => scene.startFlyby('missing'), () => scene.startFlyby('disk'),
      () => scene.startOrbit('missing'), () => scene.navigateTo('missing'), () => scene.selectTarget('missing'),
    ]) reject(action);
    expect(scene.returnToFlyby()).toBe(true); expect(scene.snapshot()).toEqual(origin);
  });

  it('lets a learner keep exploring by dropping the bookmark without changing position, settings or orbit motion', () => {
    createScene(); launch('stellar'); expect(scene.beginFlybyDetour()).toBe(true);
    scene.startOrbit('amber-star'); advance(); advance(200);
    const before = scene.snapshot(), orbit = structuredClone(publish().orbit), events = pauses.length;
    expect(scene.cancelFlybyDetour()).toBe(true);
    expect(scene.snapshot()).toEqual(before); expect(telemetry.orbit).toEqual(orbit); expect(telemetry.running).toBe(true);
    expect(telemetry.flybyDetour).toEqual({ active: false }); expect(pauses).toHaveLength(events);
    reject(() => scene.returnToFlyby()); advance(100); expect(scene.snapshot().state.position).not.toEqual(before.state.position);
  });

  it('uses the current route for a later detour and never reuses a cancelled origin', () => {
    createScene(); launch('stellar'); const oldOrigin = scene.snapshot(); expect(scene.beginFlybyDetour()).toBe(true);
    expect(scene.cancelFlybyDetour()).toBe(true);
    launch('nebula', 12); scene.look(-0.1, 0.03); const nextOrigin = scene.snapshot();
    expect(nextOrigin).not.toEqual(oldOrigin); expect(scene.beginFlybyDetour()).toBe(true);
    scene.nudge('right', 2); expect(scene.returnToFlyby()).toBe(true);
    expect(scene.snapshot()).toEqual(nextOrigin); expect(telemetry.flyby.id).toBe('nebula'); reject(() => scene.returnToFlyby());
  });

  it('finishes a returned route once, preserves its graphics objects, and releases each resource once', () => {
    createScene(); launch('disk', 43.9, { flybyRate: 4 }); const resources = counts(), allocationUploads = { ...uploads };
    expect(scene.beginFlybyDetour()).toBe(true); scene.nudge('right', 100); expect(scene.returnToFlyby()).toBe(true);
    const events = pauses.length; scene.set({ running: true }); advance(); advance(100); publish();
    expect(telemetry.flyby).toMatchObject({ id: 'disk', active: false, completed: true, elapsedSeconds: 44 });
    expect(telemetry.running).toBe(false); expect(pauses.slice(events).filter(item => item.detail?.kind === 'flyby')).toHaveLength(1);
    const completed = scene.snapshot(); advance(60000); expect(scene.snapshot()).toEqual(completed);
    expect(pauses.slice(events).filter(item => item.detail?.kind === 'flyby')).toHaveLength(1);
    expect(counts()).toEqual(resources); expect(uploads).toEqual(allocationUploads);
    scene.dispose(); scene.dispose(); expect(frames.size).toBe(0);
    for (const [kind, items] of Object.entries(created)) {
      expect(deleted[kind]).toHaveLength(items.length);
      for (const item of items) expect(deleted[kind].filter(resource => resource === item)).toHaveLength(1);
    }
  });

  it('rejects unavailable graphics and disposed scenes, while allowing a lost-context detour to be discarded', () => {
    createScene(); launch(); expect(scene.beginFlybyDetour()).toBe(true); const inspection = scene.snapshot();
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    reject(() => scene.beginFlybyDetour()); reject(() => scene.returnToFlyby()); reject(() => scene.restoreInspectionView(inspection));
    expect(scene.cancelFlybyDetour()).toBe(true); expect(publish().flybyDetour).toEqual({ active: false });
    scene.dispose(); reject(() => scene.beginFlybyDetour()); reject(() => scene.returnToFlyby()); reject(() => scene.cancelFlybyDetour());
    createScene(false); const saved = scene.snapshot(), events = pauses.length;
    expect(scene.beginFlybyDetour()).toBe(false); expect(scene.returnToFlyby()).toBe(false); expect(scene.restoreInspectionView(saved)).toBe(false);
    expect(scene.snapshot()).toEqual(saved); expect(pauses).toHaveLength(events);
  });
});
