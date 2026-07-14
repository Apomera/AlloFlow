// Tests for landmark_module.js — giant primitive structures (landmark/1).
//
// Pins: the built-in catalog is well-formed (every landmark is a RENDERABLE
// Prim3D recipe — proven against the real Prim3D normalizer), deterministic
// pickLandmark, defensive getLandmark clone, and the Prim3D-backed builder.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let L, P;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.Landmark;
  delete window.AlloModules.Prim3D;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'prim3d_module.js'), 'utf8'))();
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'landmark_module.js'), 'utf8'))();
  P = window.AlloModules.Prim3D;
  L = window.AlloModules.Landmark;
  if (!L) throw new Error('Landmark did not register');
});

describe('Landmark catalog', () => {
  it('lists named landmarks and exposes a stable set of keys', () => {
    const list = L.listLandmarks();
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(list.every((x) => x.key && x.name)).toBe(true);
    expect(list.map((x) => x.key)).toContain('tower');
  });

  it('EVERY built-in landmark is a renderable Prim3D recipe', () => {
    L.listLandmarks().forEach(({ key }) => {
      const recipe = L.getLandmark(key);
      const norm = P.normalizeRecipe(recipe);
      expect(norm, `${key} must normalize`).not.toBe(null);
      expect(norm.parts.length).toBeGreaterThan(0);
    });
  });

  it('getLandmark returns a defensive clone (mutation cannot corrupt the catalog)', () => {
    const a = L.getLandmark('tower');
    a.parts[0].color = '#000000';
    a.parts[0].size[0] = 99;
    const b = L.getLandmark('tower');
    expect(b.parts[0].color).not.toBe('#000000');
    expect(b.parts[0].size[0]).not.toBe(99);
    expect(L.getLandmark('nope')).toBe(null);
  });
});

describe('Landmark.pickLandmark (deterministic signature)', () => {
  it('same seed → same landmark; distributes across the set', () => {
    expect(L.pickLandmark('main')).toBe(L.pickLandmark('main'));
    expect(L.pickLandmark('garden')).toBe(L.pickLandmark('garden'));
    const keys = new Set(['main', 'garden', 'library', 'studio', 'lab', 'atrium'].map((s) => L.pickLandmark(s)));
    expect(keys.size).toBeGreaterThan(1);   // not everything collapses to one landmark
    L.listLandmarks().forEach(({ key }) => {});   // sanity: no throw
  });
});

describe('Landmark.buildLandmark (Prim3D-backed, THREE stub)', () => {
  function threeStub() {
    function Group() { this.children = []; this.userData = {}; this.scale = { setScalar: () => {} }; this.add = (c) => this.children.push(c); }
    function Mesh() { this.position = { set: () => {} }; this.rotation = { set: () => {} }; }
    const geo = function () { return {}; };
    return { Group, Mesh, BoxGeometry: geo, SphereGeometry: geo, CylinderGeometry: geo, ConeGeometry: geo, TorusGeometry: geo, MeshStandardMaterial: function () {}, Color: function () {} };
  }
  it('builds a multi-part group for a real landmark, null for a bad key', () => {
    const g = L.buildLandmark(threeStub(), 'arch', { unit: 150 });
    expect(g).toBeTruthy();
    expect(g.children.length).toBeGreaterThan(1);
    expect(L.buildLandmark(threeStub(), 'nope')).toBe(null);
    expect(L.buildLandmark(null, 'arch')).toBe(null);
  });
});
