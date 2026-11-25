import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const MIRROR_PREFIXES = [
  '',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build'
];

const WAVE36_FILES = [
  'stem_lab/stem_sim_meadow.js',
  'stem_lab/stem_sim_assets.js',
  'stem_lab/raptor_distance_model.js',
  'stem_lab/raptor_distance_evidence.js',
  'stem_lab/raptor_distance_fieldwork.js',
  'stem_lab/raptor_distance_results.js',
  'stem_lab/raptor_distance_signal.js',
  'stem_lab/raptor_distance_match.js',
  'stem_lab/birdlab_3d_mammals.js',
  'stem_lab/birdlab_3d_bird.js',
  'stem_lab/renewables_tycoon_scene.js',
  'stem_lab/birdlab_3d_wildlife.js',
  'stem_lab/reef_3d_habitat.js',
  'stem_lab/renewables_tycoon_view.js',
  'stem_lab/perception_walk_scene.js',
  'stem_lab/birdlab_3d_engine.js',
  'stem_lab/universe_flight_scene.js',
  'stem_lab/perception_walk.js'
];

const ALL_DELIVERABLES = [...WAVE36_FILES, 'stem_lab/stem_tool_renewables.js'];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadInWindow(relPath, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = { ...extraGlobals };
  const ctx = vm.createContext({ window: win, globalThis: win, console, ...extraGlobals });
  vm.runInContext(code, ctx, { filename: relPath });
  return win;
}

describe('Wave 36 — Hardening Regression Suite (18 STEM Lab Modules)', () => {
  it('evaluates cleanly in bare Node VM (SSR) and with window === null across all 18 modules', () => {
    for (const relPath of WAVE36_FILES) {
      const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
      expect(() => new vm.Script(code, { filename: relPath })).not.toThrow();
      expect(() => vm.runInNewContext(code, { console }, { filename: relPath })).not.toThrow();
      expect(() => vm.runInNewContext(code, { console, window: null }, { filename: relPath })).not.toThrow();
    }
  });

  it('maintains 4-way SHA-256 mirror parity across all 19 Wave 36 deliverables', () => {
    for (const relPath of ALL_DELIVERABLES) {
      const expected = sha256(path.join(ROOT, relPath));
      for (const prefix of MIRROR_PREFIXES.slice(1)) {
        const dest = path.join(ROOT, prefix, relPath);
        expect(fs.existsSync(dest), `missing mirror ${dest}`).toBe(true);
        expect(sha256(dest), `mirror mismatch ${dest}`).toBe(expected);
      }
    }
  });

  it('Pass 1: StemMeadow clamps extreme clocks to finite poses and preserves butterflyWing/vegetation', () => {
    const win = loadInWindow('stem_lab/stem_sim_meadow.js');
    expect(Object.keys(win)).toEqual(['StemMeadow']);
    expect(Object.isFrozen(win.StemMeadow)).toBe(true);
    const pose = win.StemMeadow.ambientPose(0, { simulationClock: 1e308 }, false);
    expect(Number.isFinite(pose.point.x)).toBe(true);
    expect(Number.isFinite(pose.point.y)).toBe(true);
    expect(Number.isFinite(pose.point.z)).toBe(true);
    expect(Number.isFinite(pose.yaw)).toBe(true);
    expect(Number.isFinite(pose.wingAngle)).toBe(true);
    expect(win.StemMeadow.ambientPose(0, 'not-an-object', false)).not.toBeNull();
    const fore = win.StemMeadow.butterflyWing('fore');
    expect(fore.positions.every(Number.isFinite)).toBe(true);
  });

  it('Pass 1: StemSimAssets handles null-prototype/throwing IDs and hostile provider getters safely', () => {
    const win = loadInWindow('stem_lab/stem_sim_assets.js');
    expect(Object.keys(win)).toEqual(['StemSimAssets']);
    expect(Object.isFrozen(win.StemSimAssets)).toBe(true);
    const nullProto = Object.create(null);
    let caught = null;
    try { win.StemSimAssets.createData(nullProto, '1.0.0'); } catch (e) { caught = e; }
    expect(caught).not.toBeNull();
    expect(caught.name).toBe('RangeError');
    expect(caught.message).toMatch(/Unknown shared asset or version/);
    Object.defineProperty(win, 'AvianWoodlandBirds', {
      configurable: true,
      get() { throw new Error('hostile getter'); }
    });
    expect(win.StemSimAssets.available('animal.mourning-dove', '1.0.0')).toBe(false);
  });

  it('Pass 1: RaptorDistanceModel blocks prototype-chain hijacking and normalizes -0 sigma', () => {
    const win = loadInWindow('stem_lab/raptor_distance_model.js');
    expect(Object.keys(win)).toEqual(['RaptorDistanceModel']);
    expect(Object.isFrozen(win.RaptorDistanceModel)).toBe(true);
    expect(Object.is(win.RaptorDistanceModel.gaussianSigmaPixels(60, -0), 0)).toBe(true);
    const inherited = Object.create({ version: 1, distance: 300, contrast: 10, cycles: 20 });
    const norm = win.RaptorDistanceModel.normalize(inherited);
    expect(norm.distance).toBe(120);
    expect(norm.contrast).toBe(95);
    expect(norm.cycles).toBe(12);
  });

  it('Pass 1: RaptorDistanceEvidence, Fieldwork, Results, Signal, and Match resist sparse arrays and NaN metrics', () => {
    const win = {};
    const ctx = vm.createContext({ window: win, globalThis: win, console });
    for (const f of [
      'stem_lab/raptor_distance_model.js',
      'stem_lab/raptor_distance_evidence.js',
      'stem_lab/raptor_distance_fieldwork.js',
      'stem_lab/raptor_distance_results.js',
      'stem_lab/raptor_distance_signal.js',
      'stem_lab/raptor_distance_match.js'
    ]) {
      vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
    }
    const base = vm.runInContext('({ version: 1, distance: 60, cycles: 12, contrast: 95 })', ctx);
    const rec = win.RaptorDistanceEvidence.makeRecord(base, 'eagle', 'Clear bars');
    const sparse = vm.runInContext('var a = []; a', ctx);
    sparse[1e7] = rec;
    const rawSettings = Object.assign(Object.create(null), { version: 1, records: sparse });
    const read = win.RaptorDistanceEvidence.readRecords(rawSettings);
    expect(read).toHaveLength(1);
    expect(read[0].distance).toBe(60);

    const sparseTrials = vm.runInContext('var b = []; b', ctx);
    sparseTrials[1e7] = Object.assign(Object.create(null), { settings: base, prediction: 'eagle' });
    const summary = win.RaptorDistanceFieldwork.summarize('human', sparseTrials);
    expect(summary.trials).toHaveLength(1);

    // Malformed metrics must not produce NaN or misclassify match direction
    const badWin = {};
    const badCtx = vm.createContext({ window: badWin, globalThis: badWin, console });
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'stem_lab/raptor_distance_model.js'), 'utf8'), badCtx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'stem_lab/raptor_distance_evidence.js'), 'utf8'), badCtx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'stem_lab/raptor_distance_match.js'), 'utf8'), badCtx);
    const origModel = badWin.RaptorDistanceModel;
    badWin.RaptorDistanceModel = {
      version: 1,
      normalize: origModel.normalize,
      metrics: () => ({ angleDeg: NaN, cyclesPerDegree: NaN, referenceLimit: 60, eagleLimit: 140, referenceTransfer: NaN, eagleTransfer: NaN })
    };
    const badBase = vm.runInContext('({ version: 1, distance: 60, cycles: 12, contrast: 95 })', badCtx);
    expect(badWin.RaptorDistanceEvidence.compare(badBase, badBase)).toBeNull();
    expect(badWin.RaptorDistanceMatch.compare(
      vm.runInContext('({ version: 1, distance: 60, cycles: 8, contrast: 95 })', badCtx),
      vm.runInContext('({ version: 1, distance: 140, cycles: 8, contrast: 95 })', badCtx)
    )).toBeNull();

    // Signal readRow rejects non-plain Uint8ClampedArray subclass
    const CustomClamped = vm.runInContext('(class CustomClamped extends Uint8ClampedArray {})', ctx);
    const region = win.RaptorDistanceSignal.region(base, 1024, 512);
    expect(region).not.toBeNull();
    const subRow = new CustomClamped(region.count * 4).fill(255);
    expect(win.RaptorDistanceSignal.fromRows(base, subRow, subRow)).toBeNull();
  });

  it('Pass 2: BirdLab3DMammals guards observer.position finiteness and THREE argument', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/birdlab_3d_mammals.js'), 'utf8');
    expect(src).toContain('function hasObserverPos(observer)');
    expect(src).toContain('Math.max(1e-6, 1 - leg.releasePhase)');
    const win = loadInWindow('stem_lab/birdlab_3d_mammals.js');
    expect(() => win.BirdLab3DMammals.create(null, null)).toThrow(/requires THREE/);
  });

  it('Pass 2: BirdLab3DBird preserves fragile test anchors and hardens canvas/quaternion/flapPhase', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/birdlab_3d_bird.js'), 'utf8');
    expect((src.match(/\+ shaftCrest/g) || []).length).toBe(1);
    expect(src).toContain('smoothSphereNormals(bodyGeo);');
    expect(src).toContain('smoothSphereNormals(headGeo);');
    expect(src).toContain('    function strokeCycle(');
    expect(src).toContain('    function dispose()');
    expect(src).toContain('var qSign = q.w < 0 ? -1 : 1;');
    expect(src).toContain('Number.isFinite(rawPhase)');
    const win = loadInWindow('stem_lab/birdlab_3d_bird.js');
    expect(win.BirdLab3DBird.version).toBe('1.7.0');
    expect(() => win.BirdLab3DBird.create(null)).toThrow(/requires THREE/);
  });

  it('Pass 2: RenewablesTycoonScene hardens SSR, SVG geometry guards, positive modulo, prototype lookups, and 44px targets', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/renewables_tycoon_scene.js'), 'utf8');
    expect(src).toContain('selectedBattery && selectedSite ?');
    expect(src).toContain("typeof path.getTotalLength !== 'function'");
    expect(src).toContain('((rawHour % 24) + 24) % 24');
    expect(src).toContain('((nextPhase % 1) + 1) % 1');
    expect(src).toContain('min-height:44px;min-width:44px');
    expect(src).toContain('.rn-tycoon-scene .rn-tycoon-network button{min-height:44px');
    const win = loadInWindow('stem_lab/renewables_tycoon_scene.js');
    expect(typeof win.StemLab.RenewablesTycoonScene).toBe('function');
    expect(win.StemLab.RenewablesTycoonScene(null)).toBeNull();
  });

  it('Pass 2: BirdLab3DWildlife clamps track dt, guards cueSong trill, prototype maps, setFeedingStudy, and getFocus', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/birdlab_3d_wildlife.js'), 'utf8');
    expect(src).toContain('var safeDt = Number.isFinite(dt) && dt > 0 ? Math.min(dt, .1) : 0;');
    expect(src).toContain('updateTracks(safeDt);');
    expect(src).toContain('sharedPlumageWrapped.clear();');
    expect(src).toContain('var target = out || new THREE.Vector3();');
    const win = loadInWindow('stem_lab/birdlab_3d_wildlife.js');
    expect(() => win.BirdLab3DWildlife.create(null, null)).toThrow(/requires THREE/);
  });

  it('Pass 2: Reef3DHabitat blocks prototype pollution, preserves exact global contract, and caps shaderWarnings', () => {
    const win = loadInWindow('stem_lab/reef_3d_habitat.js');
    expect(Object.keys(win)).toEqual(['Reef3DHabitat']);
    expect(win.Reef3DHabitat.version).toBe('1.0.0');
    const normalized = win.Reef3DHabitat.normalizeLayout({
      lengthM: 20,
      points: [{ distanceM: 1, category: 'toString' }, { distanceM: 2, category: 'constructor' }]
    });
    expect(normalized.points[0].coralForm).toBeNull();
    expect(normalized.points[1].coralForm).toBeNull();
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/reef_3d_habitat.js'), 'utf8');
    expect(src).toContain('if (disposed || !Number.isInteger(i) || i < 0 || i >= pts.length) return null;');
    expect(src).toContain('if (warnings.length < 200) warnings.push(message);');
    expect(src).toContain('var immersedMaterials = typeof WeakSet === \'function\' ? new WeakSet() : null;');
  });

  it('Pass 3: RenewablesTycoonView enforces SSR, visibilitychange pause, WCAG 44px targets, and safe DOM lookup', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/renewables_tycoon_view.js'), 'utf8');
    expect(src).toContain('.rn-tycoon button,.rn-tycoon select,.rn-tycoon input[type=text]{min-height:44px}');
    expect(src).toContain('.rn-tycoon input[type=range]{width:100%;accent-color:var(--ty-green);min-height:44px');
    expect(src).toContain("doc.addEventListener('visibilitychange', onVisibility)");
    expect(src).toContain('if (!(rect.width > 0)) return;');
    expect(src).toContain("if (event.key === 'Escape') { event.preventDefault(); setResetOpen(false); }");
    expect(src).not.toContain("querySelector('[data-tycoon-site=\"' + siteId");
    const win = loadInWindow('stem_lab/renewables_tycoon_view.js');
    expect(typeof win.StemLab.RenewablesTycoon).toBe('function');
    expect(win.StemLab.RenewablesTycoon(null)).toBeNull();
  });

  it('Pass 3: PerceptionWalkScene tracks renderer textures, guards aspect/label/pick, and disposes fallback geos', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/perception_walk_scene.js'), 'utf8');
    expect(src).toContain('if (walkTextures && walkTexturesRenderer === renderer) return walkTextures;');
    expect(src).toContain('if (attachedHost && host !== attachedHost) disposeWalkTextures();');
    expect(src).toContain('var aspect = S.camera.aspect > 0 && isFinite(S.camera.aspect) ? S.camera.aspect : 1;');
    expect(src).toContain('coneGeo.dispose();');
    expect(src).toContain('dustGeo.dispose();');
    const win = loadInWindow('stem_lab/perception_walk_scene.js');
    expect(typeof win.StemLab.PerceptionWalkScene.createViewer).toBe('function');
  });

  it('Pass 3: BirdLab3D engine preserves source-slicing anchors, exact global key, and hardens runtime edge cases', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/birdlab_3d_engine.js'), 'utf8');
    expect(src.indexOf('  var residentRepeatWindows=')).toBeGreaterThan(-1);
    expect(src.indexOf('  function applyHeightFog(')).toBeGreaterThan(-1);
    expect(src.indexOf('  function selectQuality(')).toBeGreaterThan(-1);
    expect(src.indexOf('  function mount(')).toBeGreaterThan(-1);
    expect(src).toContain('new global.ResizeObserver(resize)');
    expect(src).toContain('if(disposed||!Number.isFinite(dx)||!Number.isFinite(dy))return;');

    const win = loadInWindow('stem_lab/birdlab_3d_engine.js');
    expect(Object.keys(win)).toEqual(['BirdLab3D']);
    expect(() => win.BirdLab3D.mount(null)).toThrow(/requires a canvas/);
    const follow = win.BirdLab3D.sampleFollowFrame(null);
    expect(follow.positionOffset.every(Number.isFinite)).toBe(true);
    const hawk = win.BirdLab3D.createFreeHawk([], NaN);
    expect(hawk.state.position.every(Number.isFinite)).toBe(true);
  });

  it('Pass 3: UniverseFlight preserves source-replace anchor, hardens math/view/nudge, and cleans up reduced-motion listener', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/universe_flight_scene.js'), 'utf8');
    expect(src).toContain('  global.UniverseFlight = {');
    expect(src).toContain('Object.prototype.hasOwnProperty.call(views, direction)');
    expect(src).toContain('Object.prototype.hasOwnProperty.call(axes, direction)');
    expect(src).toContain('if (!entries || !entries.length) return;');
    expect(src).toContain('prefers-reduced-motion: reduce');
    expect(src).toContain('function detachListeners()');

    const win = loadInWindow('stem_lab/universe_flight_scene.js');
    expect(win.UniverseFlight.math.aberrate(null, 0.5)).toEqual([0, 0, 1]);
    const stepped = win.UniverseFlight.math.stepFlight(null, { running: true, mode: 'explore', speed: 2 }, 0.1);
    expect(stepped.position.every(Number.isFinite)).toBe(true);
  });

  it('Pass 3: PerceptionWalk hardens canTurnCorner, keyDown prototype lookup, pointer capture, and WCAG 44px/reduced-motion CSS', () => {
    const src = fs.readFileSync(path.join(ROOT, 'stem_lab/perception_walk.js'), 'utf8');
    expect(src).toContain('.pw-task input[type=range]{width:100%;display:block;min-height:44px');
    expect(src).toContain('.pw-toolbar label{display:flex;align-items:center;gap:7px;font-size:13px;min-height:44px;cursor:pointer}');
    expect(src).toContain('.pw-precision{display:flex;align-items:center;gap:7px;font-size:13px;min-height:44px;cursor:pointer}');
    expect(src).toContain('@media(prefers-reduced-motion:reduce)');
    expect(src).toContain('Object.prototype.hasOwnProperty.call(keyMap, k)');

    const win = loadInWindow('stem_lab/perception_walk.js');
    expect(win.StemLab.PerceptionWalk.normalize(null).activity).toBe('ring');
    // Calling turnCorner with null/corrupt input must not crash inside canTurnCorner
    expect(() => win.StemLab.PerceptionWalk.turnCorner(null, 0, 45)).not.toThrow();
  });
});
