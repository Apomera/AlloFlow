import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

const WAVE37_FILES = [
  { rel: 'stem_lab/reef_3d_species.js', globalName: 'Reef3DSpecies' },
  { rel: 'stem_lab/reef_3d_explore.js', globalName: 'Reef3DExplore' },
  { rel: 'stem_lab/avian_woodland_birds.js', globalName: 'AvianWoodlandBirds' },
  { rel: 'stem_lab/raptor_distance_study.js', globalName: 'RaptorDistanceStudy' },
  { rel: 'stem_lab/birdlab_3d_habitat.js', globalName: 'BirdLab3DHabitat' }
];

const MIRROR_ROOTS = [
  '',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build'
];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadInVm(rel, extra = {}) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const ctx = Object.assign({ console }, extra);
  vm.runInNewContext(code, ctx, { filename: rel });
  return ctx;
}

describe('Wave 37 Bug Sweep — Final 5 Clean stem_lab Modules', () => {
  it('loads all 5 modules cleanly in bare Node VM, window=null, and primitive window contexts', () => {
    for (const { rel, globalName } of WAVE37_FILES) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(() => new vm.Script(code, { filename: rel })).not.toThrow();

      const bare = { console };
      vm.runInNewContext(code, bare, { filename: rel });
      expect(bare[globalName]).toBeTruthy();
      expect(Object.keys(bare).sort()).toEqual(['console', globalName].sort());

      const nullWin = { console, window: null };
      vm.runInNewContext(code, nullWin, { filename: rel });
      expect(nullWin[globalName]).toBeTruthy();

      const primWin = { console, window: 'primitive' };
      vm.runInNewContext(code, primWin, { filename: rel });
      expect(primWin[globalName]).toBeTruthy();
    }
  });

  it('maintains 4-way SHA-256 mirror parity across all 5 Wave 37 deliverables', () => {
    for (const { rel } of WAVE37_FILES) {
      const expected = sha256(path.join(ROOT, rel));
      for (const mirrorRoot of MIRROR_ROOTS.slice(1)) {
        const mirrorPath = path.join(ROOT, mirrorRoot, rel);
        expect(fs.existsSync(mirrorPath), `Missing mirror: ${mirrorPath}`).toBe(true);
        expect(sha256(mirrorPath), `Hash mismatch: ${mirrorPath}`).toBe(expected);
      }
    }
  });

  describe('stem_lab/reef_3d_species.js hardening', () => {
    it('guards prototype keys in info/create/createSchool and handles Symbol ids safely', () => {
      const ctx = loadInVm('stem_lab/reef_3d_species.js');
      const S = ctx.Reef3DSpecies;
      expect(S.version).toBe('1.0.0');
      expect(Object.keys(S).sort()).toEqual(['create', 'createSchool', 'ids', 'info', 'version']);

      expect(S.info('toString')).toBeNull();
      expect(S.info('constructor')).toBeNull();
      expect(S.info('__proto__')).toBeNull();
      expect(S.info(null)).toBeNull();
      expect(S.info(42)).toBeNull();

      const mockTHREE = { BufferGeometry: function () {}, Mesh: function () {} };
      let caught = null;
      try { S.create(mockTHREE, 'toString'); } catch (e) { caught = e; }
      expect(caught && caught.name).toBe('RangeError');

      caught = null;
      try { S.create(mockTHREE, Symbol('bad')); } catch (e) { caught = e; }
      expect(caught && caught.name).toBe('RangeError');

      caught = null;
      try { S.createSchool(mockTHREE, 'toString', 5); } catch (e) { caught = e; }
      expect(caught && caught.name).toBe('RangeError');
    });

    it('preserves Kit.prototype.baked contract and guards retract after disposal', () => {
      const src = fs.readFileSync(path.join(ROOT, 'stem_lab/reef_3d_species.js'), 'utf8');
      expect(src).toContain('Kit.prototype.baked = function (key, w, h, fn, wrapS, wrapT, linear, repeat) {');
      expect(src).toContain('if (c.kit.done) return;');
      expect(src).toContain('if(c.kit.done)return;');
      expect(src).toContain('if (a === b) return x < a ? 0 : 1;');
    });
  });

  describe('stem_lab/reef_3d_explore.js hardening', () => {
    it('preserves all fragile test anchors while fixing SSR, prototype safety, timers, and disposal', () => {
      const src = fs.readFileSync(path.join(ROOT, 'stem_lab/reef_3d_explore.js'), 'utf8');
      expect(src).toContain("global.Reef3DExplore = { version: '1.0.0', mount: mount, profileDevice: profileDevice };");
      expect(src).toContain('canvas._reef3dExplore = controller;');
      expect(src).toContain('    function localBounds(root) {');
      expect(src).toContain('    function restQuaternion(');
      expect(src).toContain('    function palette() {');
      expect(src).toContain('    function pickC(');
      expect(src).toContain('function createCausticTexture(T, size) {');

      // Verify Wave 37 guards
      expect(src).toContain('byUid = Object.create(null)');
      expect(src).toContain('seen = Object.create(null)');
      expect(src).toContain('if (!isFinite(stamp)) stamp = now();');
      expect(src).toContain('if (disposed || contextLost || !loaded || !isFinite(clientX) || !isFinite(clientY)) return null;');
      expect(src).toContain('if (m.uniforms) Object.keys(m.uniforms)');
      expect(src).not.toMatch(/renderer\.forceContextLoss\s*\(/);
    });
  });

  describe('stem_lab/avian_woodland_birds.js hardening', () => {
    it('guards prototype keys, null-prototype objects, Symbols, and missing THREE while staying mutable', () => {
      const ctx = loadInVm('stem_lab/avian_woodland_birds.js');
      const A = ctx.AvianWoodlandBirds;
      expect(A.version).toBe('1.0.0');
      expect(A.supports('blueJay')).toBe(true);
      expect(A.supports('toString')).toBe(false);
      expect(A.supports('__proto__')).toBe(false);
      expect(A.supports(null)).toBe(false);
      expect(A.supports(vm.runInNewContext('Object.create(null)'))).toBe(false);

      let caught = null;
      try { A.create(null, vm.runInNewContext('Object.create(null)')); } catch (e) { caught = e; }
      expect(caught && caught.name).toBe('RangeError');

      caught = null;
      try { A.create(null, Symbol('avian')); } catch (e) { caught = e; }
      expect(caught && caught.name).toBe('RangeError');

      caught = null;
      try { A.create(null, 'blueJay'); } catch (e) { caught = e; }
      expect(caught && caught.name).toBe('TypeError');

      // Contract: tests reassign AvianWoodlandBirds.create
      const origCreate = A.create;
      A.create = () => 'mocked';
      expect(A.create()).toBe('mocked');
      A.create = origCreate;
    });
  });

  describe('stem_lab/raptor_distance_study.js hardening', () => {
    it('returns null safely when props or required globals are missing and enforces Wave 36 interop & 44px touch target', () => {
      const ctx = loadInVm('stem_lab/raptor_distance_study.js');
      const Study = ctx.RaptorDistanceStudy;
      expect(Study.version).toBe('1.0.0');
      expect(Object.isFrozen(Study)).toBe(true);

      expect(Study.Component(null)).toBeNull();
      expect(Study.Component({})).toBeNull();
      expect(Study.Component({ React: { createElement: () => null } })).toBeNull();

      const src = fs.readFileSync(path.join(ROOT, 'stem_lab/raptor_distance_study.js'), 'utf8');
      expect(src).toContain("if (!value) return 'Comparison unavailable.';");
      expect(src).toContain('if (!comparison) return null;');
      expect(src).toContain('ready = !!(matchReference && matchHeld && matchComparison && currentImages && status === \'ready\');');
      expect(src).toContain('pinned && comparison && h(\'div\'');
      expect(src).toContain('.rh-distance-signal-probe input{width:100%;accent-color:#e9c98a;min-height:44px}');
    });
  });

  describe('stem_lab/birdlab_3d_habitat.js hardening', () => {
    it('validates THREE and scene arguments and runs cleanly in SSR without document', () => {
      const ctx = loadInVm('stem_lab/birdlab_3d_habitat.js');
      const Habitat = ctx.BirdLab3DHabitat;

      let caught = null;
      try { Habitat.create(null, {}); } catch (e) { caught = e; }
      expect(caught && caught.name).toBe('TypeError');

      caught = null;
      try { Habitat.create({ Group: function () {} }, null); } catch (e) { caught = e; }
      expect(caught && caught.name).toBe('TypeError');

      const THREE = require('../vendor/three-r128/three.min.js');
      const scene = new THREE.Scene();
      const habitat = Habitat.create(THREE, scene, { quality: 'low', reducedMotion: true });
      expect(habitat.groundHeight(NaN, 0)).toBe(0);
      expect(habitat.groundHeight(0, Infinity)).toBe(0);
      expect(habitat.groundSurfaceHeight(NaN, Infinity)).toBe(0);

      // Should not throw on non-finite wind/time or malformed light state
      expect(() => habitat.update(NaN, NaN)).not.toThrow();
      expect(() => habitat.setLightState({ fogDensity: NaN, golden: NaN, sunDir: { x: NaN, y: 1, z: 0 } })).not.toThrow();
      expect(() => habitat.setFoodVisible(true)).not.toThrow();
      expect(() => habitat.setFoodLevels([{ id: 'toString', amount: 0.5 }, { id: 'feeder', amount: NaN }])).not.toThrow();
      expect(() => habitat.setGuidedFood([{ id: 'x', kind: 'toString', x: 0, z: 0 }, { id: 'y', kind: 'seed', x: NaN, z: 0 }], true)).not.toThrow();

      // Dispose and ensure subsequent lazy builders are strict no-ops
      habitat.dispose();
      const childrenAfterDispose = habitat.root.children.length;
      habitat.setFoodVisible(true);
      habitat.setMist(true);
      habitat.setRain(true);
      habitat.setSeason('winter');
      expect(habitat.root.children.length).toBe(childrenAfterDispose);
    }, 30000);
  });
});
