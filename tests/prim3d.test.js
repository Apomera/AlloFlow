// Tests for prim3d_module.js — Gemini-designed primitive-assembly sculptures.
//
// Pins the PURE seams: normalizeRecipe (untrusted JSON → safe recipe: shape
// whitelist, part cap, size/position clamps, color fallback), parseRecipe
// (fence-stripping, junk → null), buildRecipePrompt (sandbox rules present).
// buildObject needs a THREE instance (no GL) — covered by a minimal stub.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let P;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.Prim3D;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'prim3d_module.js'), 'utf8'))();
  P = window.AlloModules.Prim3D;
  if (!P) throw new Error('Prim3D did not register');
});

describe('Prim3D.normalizeRecipe (untrusted JSON → safe recipe)', () => {
  it('keeps whitelisted shapes, drops unknown ones, caps parts at 24', () => {
    const parts = [
      { shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], color: '#ff0000' },
      { shape: 'dragon', size: [1, 1, 1] },                       // unknown ⇒ dropped
      { shape: 'SPHERE', size: [0.5], position: [0, 1.5, 0] },    // case-insensitive
      ...Array.from({ length: 40 }, () => ({ shape: 'sphere', size: [0.1], position: [0, 0, 0] })),
    ];
    const r = P.normalizeRecipe({ name: 'Test', parts });
    expect(r.parts.length).toBe(24);
    expect(r.parts[0].shape).toBe('box');
    expect(r.parts[1].shape).toBe('sphere');
    expect(r.parts.some((p) => p.shape === 'dragon')).toBe(false);
  });

  it('clamps sizes/positions, falls back on bad colors, truncates long names', () => {
    const r = P.normalizeRecipe({
      name: 'x'.repeat(200),
      parts: [{ shape: 'box', size: [999, -5, 'nope'], position: [99, -99, 0], rotation: [720, 0, 0], color: 'red' }],
    });
    expect(r.name.length).toBe(80);
    expect(r.parts[0].size).toEqual([4, 0.02, 0.4]);              // clamped hi / clamped lo / default
    expect(r.parts[0].position[0]).toBe(4);
    expect(r.parts[0].position[1]).toBe(-4);
    expect(r.parts[0].rotation[0]).toBe(360);
    expect(r.parts[0].color).toBe('#818cf8');                     // named color ⇒ fallback hex
  });

  it('returns null when nothing renderable remains', () => {
    expect(P.normalizeRecipe(null)).toBe(null);
    expect(P.normalizeRecipe({ parts: [] })).toBe(null);
    expect(P.normalizeRecipe({ parts: [{ shape: 'blob' }] })).toBe(null);
  });
});

describe('Prim3D.parseRecipe (model text → recipe)', () => {
  it('strips code fences and prose around the JSON', () => {
    const text = 'Here you go!\n```json\n{"name":"Apple","parts":[{"shape":"sphere","size":[0.5],"position":[0,0.5,0],"color":"#ef4444"}]}\n```';
    const r = P.parseRecipe(text);
    expect(r.name).toBe('Apple');
    expect(r.parts[0]).toMatchObject({ shape: 'sphere', color: '#ef4444' });
  });
  it('returns null on junk', () => {
    expect(P.parseRecipe('not json at all')).toBe(null);
    expect(P.parseRecipe('')).toBe(null);
  });
});

describe('Prim3D.buildRecipePrompt (the sandbox ask)', () => {
  it('names the subject, the shape whitelist, the part budget, and ONLY JSON', () => {
    const p = P.buildRecipePrompt('a friendly volcano');
    expect(p).toMatch(/a friendly volcano/);
    expect(p).toMatch(/box, sphere, cylinder, cone, torus/);
    expect(p).toMatch(/4 to 24 parts/);
    expect(p).toMatch(/Return ONLY JSON/);
    expect(p).toMatch(/STANDS ON the ground plane/);
    expect(p).toMatch(/school-appropriate/);
  });
});

describe('Prim3D.buildObject (recipe → group; THREE stub, no GL)', () => {
  function threeStub() {
    function Group() { this.children = []; this.userData = {}; this.scale = { setScalar: () => {} }; this.add = (c) => this.children.push(c); }
    function Mesh(geo, mat) { this.geo = geo; this.mat = mat; this.position = { set: () => {} }; this.rotation = { set: () => {} }; }
    const geo = function () { return {}; };
    return {
      Group, Mesh,
      BoxGeometry: geo, SphereGeometry: geo, CylinderGeometry: geo, ConeGeometry: geo, TorusGeometry: geo,
      MeshStandardMaterial: function (o) { this.opts = o; },
      Color: function (c) { this.c = c; },
    };
  }
  it('assembles one mesh per valid part and names the group', () => {
    const THREE = threeStub();
    const g = P.buildObject(THREE, { name: 'Robot', parts: [
      { shape: 'box', size: [0.5, 0.5, 0.5], position: [0, 0.25, 0], color: '#334155' },
      { shape: 'sphere', size: [0.3], position: [0, 0.8, 0], color: '#f59e0b' },
    ] });
    expect(g.children.length).toBe(2);
    expect(g.userData.prim3dName).toBe('Robot');
  });
  it('returns null for empty/invalid recipes', () => {
    expect(P.buildObject(threeStub(), { parts: [{ shape: 'nope' }] })).toBe(null);
    expect(P.buildObject(null, { parts: [{ shape: 'box' }] })).toBe(null);
  });
  it('normalizes even a version-stamped recipe so malformed parts cannot throw (regression)', () => {
    // a p3d/1 recipe whose part has no size/position/rotation arrays — the old code
    // trusted the version and threw at position[0]; now it re-normalizes and fills defaults.
    const THREE = threeStub();
    let g;
    expect(() => { g = P.buildObject(THREE, { version: 'p3d/1', parts: [{ shape: 'box' }] }); }).not.toThrow();
    expect(g).toBeTruthy();
    expect(g.children.length).toBe(1);
  });
});
