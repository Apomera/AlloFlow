// Tests for prim3d_module.js — Gemini-designed primitive-assembly sculptures.
//
// Pins the PURE seams: normalizeRecipe (untrusted JSON → safe recipe: shape
// whitelist, part cap, size/position clamps, color fallback), parseRecipe
// (fence-stripping, junk → null), buildRecipePrompt (sandbox rules present).
// buildObject needs a THREE instance (no GL) — covered by a minimal stub.

import { describe, it, expect, beforeAll, vi } from 'vitest';
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

  it('clamps sizes, stretches, and positions; falls back on bad colors; and truncates long names', () => {
    const r = P.normalizeRecipe({
      name: 'x'.repeat(200),
      parts: [{ shape: 'box', size: [999, -5, 'nope'], stretch: [9, 0.01, 'nope'], position: [99, -99, 0], rotation: [720, 0, 0], color: 'red' }],
    });
    expect(r.name.length).toBe(80);
    expect(r.parts[0].size).toEqual([4, 0.02, 0.4]);              // clamped hi / clamped lo / default
    expect(r.parts[0].stretch).toEqual([4, 0.1, 1]);
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

  it('adds neutral stretch values to legacy recipes', () => {
    const r = P.normalizeRecipe({ parts: [{ shape: 'sphere', size: [0.3] }] });
    expect(r.parts[0].stretch).toEqual([1, 1, 1]);
    expect(r.parts[0].deform).toEqual({ taper: 0, twist: 0, bulge: 0 });
  });

  it('normalizes and clamps taper, twist, and bulge modifiers', () => {
    const r = P.normalizeRecipe({ parts: [
      { shape: 'box', deform: { taper: 9, twist: -999, bulge: 4 } },
      { shape: 'sphere', deform: { taper: 'wide', twist: null, bulge: -9 } },
    ] });
    expect(r.parts[0].deform).toEqual({ taper: 0.85, twist: -180, bulge: 1.5 });
    expect(r.parts[1].deform).toEqual({ taper: 0, twist: 0, bulge: -0.75 });
  });

  it('validates part labels, finish, opacity, visibility, and locking', () => {
    const r = P.normalizeRecipe({ parts: [
      { shape: 'sphere', label: `  Head\u0000${'x'.repeat(60)}  `, finish: 'GLOSS', opacity: 0.05, hidden: true, locked: true },
      { shape: 'box', finish: 'sparkle', opacity: 'clear', hidden: 1, locked: 'yes' },
    ] });
    expect(r.parts[0].label).toBe(`Head ${'x'.repeat(35)}`);
    expect(r.parts[0]).toMatchObject({ finish: 'gloss', opacity: 0.15, hidden: true, locked: true });
    expect(r.parts[1]).toMatchObject({ finish: 'standard', opacity: 1, hidden: false, locked: false });
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
    expect(p).toMatch(/"deform"/);
    expect(p).toMatch(/taper -0\.85 to 0\.85/);
  });
});

describe('Prim3D.buildRefinePrompt (AI edits an existing recipe — canonical home for reuse)', () => {
  it('embeds the current recipe JSON, the instruction, the shape whitelist, and JSON-only', () => {
    const recipe = { name: 'Kettle', parts: [{ shape: 'sphere', size: [0.5], position: [0, 0.5, 0], color: '#ff0000' }] };
    const p = P.buildRefinePrompt(recipe, 'make it taller and add a spout');
    expect(p).toMatch(/Kettle/);
    expect(p).toMatch(/make it taller and add a spout/);
    expect(p).toMatch(/box, sphere, cylinder, cone, torus/);
    expect(p).toMatch(/Return ONLY the updated JSON/);
    expect(p).toMatch(/4-24 parts/);
  });
});

describe('Prim3D voice-directed sculpting (hands-free / accessible making)', () => {
  it('buildSculptCommandPrompt embeds the transcript, the sculpture state, the action set, and JSON-only', () => {
    const p = P.buildSculptCommandPrompt('make it a bit bigger', true);
    expect(p).toMatch(/make it a bit bigger/);
    expect(p).toMatch(/There IS already a sculpture/);
    expect(p).toMatch(/create\|refine\|bigger\|smaller\|rotate\|recolor\|remove\|none/);
    expect(p).toMatch(/Return ONLY the JSON/);
    expect(P.buildSculptCommandPrompt('a rocket', false)).toMatch(/There is NO sculpture yet/);
  });

  it('parseSculptCommand accepts whitelisted actions and carries subject/instruction', () => {
    expect(P.parseSculptCommand('{"action":"create","subject":"a friendly robot"}')).toEqual({ action: 'create', subject: 'a friendly robot', instruction: '' });
    expect(P.parseSculptCommand('```json\n{"action":"REFINE","instruction":"add a tail"}\n```')).toEqual({ action: 'refine', subject: '', instruction: 'add a tail' });
    expect(P.parseSculptCommand('{"action":"bigger"}').action).toBe('bigger');
  });

  it('parseSculptCommand rejects unknown actions and junk', () => {
    expect(P.parseSculptCommand('{"action":"explode"}')).toBe(null);   // not whitelisted
    expect(P.parseSculptCommand('not json')).toBe(null);
    expect(P.parseSculptCommand('{}')).toBe(null);
    expect(P.parseSculptCommand('')).toBe(null);
  });
});

describe('Prim3D voice-directed stretch (HandWaver point→line→plane→solid by voice)', () => {
  it('buildStretchCommandPrompt embeds transcript, selection, the point→prism ladder, axes, and JSON-only', () => {
    const p = P.buildStretchCommandPrompt('stretch it up into a line', 'point');
    expect(p).toMatch(/stretch it up into a line/);
    expect(p).toMatch(/Currently selected object: point/);
    expect(p).toMatch(/point.*segment.*rectangle.*prism/i);
    expect(p).toMatch(/point\|stretch\|undo\|reset\|none/);
    expect(p).toMatch(/Return ONLY the JSON/);
  });

  it('parseStretchCommand validates action + axis, defaulting a bad/missing axis to y (up)', () => {
    expect(P.parseStretchCommand('{"action":"point"}')).toEqual({ action: 'point', axis: 'y' });
    expect(P.parseStretchCommand('{"action":"stretch","axis":"X"}')).toEqual({ action: 'stretch', axis: 'x' });
    expect(P.parseStretchCommand('{"action":"stretch","axis":"sideways"}').axis).toBe('y');   // unknown axis → default
    expect(P.parseStretchCommand('{"action":"undo"}').action).toBe('undo');
  });

  it('parseStretchCommand rejects unknown actions and junk', () => {
    expect(P.parseStretchCommand('{"action":"fold"}')).toBe(null);
    expect(P.parseStretchCommand('nope')).toBe(null);
    expect(P.parseStretchCommand('{}')).toBe(null);
  });
});

describe('Prim3D.buildObject (recipe → group; THREE stub, no GL)', () => {
  function threeStub() {
    function Group() { this.children = []; this.userData = {}; this.scale = { setScalar: () => {} }; this.add = (c) => this.children.push(c); }
    function Mesh(geo, mat) { this.geo = geo; this.mat = mat; this.position = { set: () => {} }; this.rotation = { set: () => {} }; this.scale = { set: (...values) => { this.appliedStretch = values; } }; }
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
    expect(g.children.map((mesh) => mesh.userData.prim3dPartIndex)).toEqual([0, 1]);
  });
  it('applies persistent per-axis stretch to every primitive mesh', () => {
    const g = P.buildObject(threeStub(), { parts: [
      { shape: 'sphere', size: [0.3], stretch: [2, 0.5, 1.5], color: '#f59e0b' },
    ] });
    expect(g.children[0].appliedStretch).toEqual([2, 0.5, 1.5]);
  });
  it('skips hidden parts and applies validated surface material settings', () => {
    const g = P.buildObject(threeStub(), { parts: [
      { shape: 'box', hidden: true, label: 'Hidden base' },
      { shape: 'sphere', label: 'Glass head', finish: 'gloss', opacity: 0.4, color: '#22c55e' },
    ] });
    expect(g.children).toHaveLength(1);
    expect(g.children[0].userData).toMatchObject({ prim3dPartIndex: 1, prim3dPartLabel: 'Glass head' });
    expect(g.children[0].mat.opts).toMatchObject({ roughness: 0.16, metalness: 0.05, opacity: 0.4, transparent: true, depthWrite: false, wireframe: false });
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

  it('deforms vertices deterministically and recomputes normals and bounds', () => {
    const values = new Float32Array([
      1, -1, 0,
      1, 0, 0,
      1, 1, 0,
    ]);
    const position = {
      array: values,
      itemSize: 3,
      count: 3,
      getX(index) { return this.array[index * 3]; },
      getY(index) { return this.array[index * 3 + 1]; },
      getZ(index) { return this.array[index * 3 + 2]; },
      setXYZ(index, x, y, z) { this.array.set([x, y, z], index * 3); },
      needsUpdate: false,
    };
    const geometry = {
      attributes: { position },
      computeVertexNormals: vi.fn(),
      computeBoundingBox: vi.fn(),
      computeBoundingSphere: vi.fn(),
    };
    P.deformGeometry(geometry, { taper: 0.5, bulge: 0.5, twist: 0 });
    expect(values[0]).toBeCloseTo(0.5, 5);
    expect(values[3]).toBeCloseTo(1.5, 5);
    expect(values[6]).toBeCloseTo(1.5, 5);
    expect(position.needsUpdate).toBe(true);
    expect(geometry.computeVertexNormals).toHaveBeenCalledOnce();
    expect(geometry.computeBoundingBox).toHaveBeenCalledOnce();
    expect(geometry.computeBoundingSphere).toHaveBeenCalledOnce();
  });

  it('leaves neutral geometry untouched and twists top vertices around the vertical axis', () => {
    const makeGeometry = () => {
      const values = new Float32Array([1, -1, 0, 1, 1, 0]);
      const position = {
        array: values, itemSize: 3, count: 2,
        getX(index) { return this.array[index * 3]; },
        getY(index) { return this.array[index * 3 + 1]; },
        getZ(index) { return this.array[index * 3 + 2]; },
        setXYZ(index, x, y, z) { this.array.set([x, y, z], index * 3); },
      };
      return { values, geometry: { attributes: { position }, computeVertexNormals: vi.fn() } };
    };
    const neutral = makeGeometry();
    P.deformGeometry(neutral.geometry, {});
    expect(Array.from(neutral.values)).toEqual([1, -1, 0, 1, 1, 0]);
    expect(neutral.geometry.computeVertexNormals).not.toHaveBeenCalled();

    const twisted = makeGeometry();
    P.deformGeometry(twisted.geometry, { twist: 180 });
    expect(twisted.values[3]).toBeCloseTo(0, 5);
    expect(twisted.values[5]).toBeCloseTo(1, 5);
  });
});

describe('Prim3D morph profiles', () => {
  it('returns fresh built-ins and applies only silhouette fields', () => {
    const first = P.getMorphProfile('twisted');
    const second = P.getMorphProfile('twisted');
    expect(first).not.toBe(second);
    expect(first.deform).not.toBe(second.deform);
    first.deform.twist = 0;
    expect(second.deform.twist).toBe(110);

    const recipe = P.normalizeRecipe({ parts: [{ shape: 'cone', size: [0.4, 0.8], position: [1, 2, 3], rotation: [10, 20, 30], color: '#22c55e', finish: 'metal' }] });
    const morphed = P.applyMorphProfile(recipe, 0, 'twisted');
    expect(morphed.parts[0].deform).toEqual({ taper: 0, twist: 110, bulge: 0.12 });
    expect(morphed.parts[0]).toMatchObject({ shape: 'cone', position: [1, 2, 3], rotation: [10, 20, 30], color: '#22c55e', finish: 'metal' });
  });

  it('normalizes custom profiles, merges individual deformation edits, and protects locked parts', () => {
    const custom = P.normalizeMorphProfile({ id: 'mine', name: '  Vase\u0000body  ', stretch: [9, 0, 2], deform: { taper: -9, twist: 999, bulge: 0.4 } });
    expect(custom).toEqual({ id: 'mine', label: 'Vase body', stretch: [4, 0.1, 2], deform: { taper: -0.85, twist: 180, bulge: 0.4 } });

    const recipe = P.normalizeRecipe({ parts: [{ shape: 'box', deform: { taper: 0.2, twist: 15, bulge: 0.3 } }] });
    const edited = P.updatePartDeform(recipe, 0, { twist: 45 });
    expect(edited.parts[0].deform).toEqual({ taper: 0.2, twist: 45, bulge: 0.3 });
    const locked = P.updatePart(recipe, 0, { locked: true });
    expect(P.applyMorphProfile(locked, 0, 'bulged')).toEqual(locked);
    expect(P.updatePartDeform(locked, 0, { taper: 0.8 })).toEqual(locked);
  });
});

describe('Prim3D.PRESETS (built-in decoration shelf)', () => {
  it('every preset has a unique id, an emoji, a label, and a renderable recipe', () => {
    const ids = P.PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(P.PRESETS.length).toBeGreaterThanOrEqual(10);
    P.PRESETS.forEach((p) => {
      expect(typeof p.emoji).toBe('string');
      expect(p.label.length).toBeGreaterThan(0);
      const rec = P.getPreset(p.id);
      expect(rec).toBeTruthy();
      expect(rec.parts.length).toBeGreaterThanOrEqual(4);
      expect(rec.parts.length).toBeLessThanOrEqual(P.MAX_PARTS);
      // decorations stand ON the pedestal: no part center below the ground plane
      rec.parts.forEach((part) => expect(part.position[1]).toBeGreaterThanOrEqual(0));
    });
  });
  it('getPreset returns a FRESH normalized recipe each call (mutation-safe) and null for unknown ids', () => {
    const a = P.getPreset('trophy');
    const b = P.getPreset('trophy');
    expect(a).not.toBe(b);
    a.parts[0].color = '#000000';
    expect(b.parts[0].color).not.toBe('#000000');
    expect(P.getPreset('no-such-preset')).toBe(null);
  });
  it('preset recipes survive normalizeRecipe unchanged in part count (already in-bounds)', () => {
    P.PRESETS.forEach((p) => {
      const rec = P.getPreset(p.id);
      const renorm = P.normalizeRecipe(rec);
      expect(renorm.parts.length).toBe(rec.parts.length);
    });
  });
});

describe('Prim3D recipe editing ops (hand-built sculpting seams)', () => {
  const seed = () => P.normalizeRecipe({ name: 'seed', parts: [
    { shape: 'box', size: [0.4, 0.4, 0.4], position: [0, 0.5, 0], color: '#ef4444' },
    { shape: 'sphere', size: [0.25], position: [0, 1, 0], color: '#3b82f6' },
  ] });

  it('addPart appends a normalized starter part and respects MAX_PARTS', () => {
    const r = P.addPart(null, 'cone');
    expect(r.parts).toHaveLength(1);
    expect(r.parts[0].shape).toBe('cone');
    let full = seed();
    for (let i = 0; i < 30; i++) full = P.addPart(full, 'box');
    expect(full.parts.length).toBe(P.MAX_PARTS);
    expect(P.addPart(full, 'box').parts.length).toBe(P.MAX_PARTS);   // no growth at the cap
  });

  it('updatePart / nudgePart / scalePart patch one part and stay clamped', () => {
    const r = seed();
    expect(P.updatePart(r, 1, { color: '#22c55e' }).parts[1].color).toBe('#22c55e');
    const moved = P.nudgePart(r, 0, 'position', 1, 0.08);
    expect(moved.parts[0].position[1]).toBeCloseTo(0.58, 6);
    expect(moved.parts[1].position[1]).toBe(1);            // other part untouched
    let big = r;
    for (let i = 0; i < 40; i++) big = P.scalePart(big, 0, 1.5);
    expect(big.parts[0].size[0]).toBeLessThanOrEqual(4);   // sculpting-box clamp
    const spun = P.nudgePart(r, 0, 'rotation', 1, 30);
    expect(spun.parts[0].rotation[1]).toBe(30);
    expect(P.nudgePart(r, 0, 'color', 1, 1)).toEqual(r);   // invalid field = no-op
  });

  it('duplicatePart inserts a visible copy; removePart of the last part returns null', () => {
    const r = seed();
    const protectedRecipe = P.updatePart(r, 0, { label: 'Base', finish: 'metal', opacity: 0.5, deform: { taper: 0.3, twist: 45, bulge: 0.2 }, hidden: true, locked: true });
    const dup = P.duplicatePart(protectedRecipe, 0);
    expect(dup.parts).toHaveLength(3);
    expect(dup.parts[1]).toMatchObject({ shape: 'box', label: 'Base copy', finish: 'metal', opacity: 0.5, hidden: false, locked: false });
    expect(dup.parts[1].position[0]).toBeCloseTo(0.2, 6);
    expect(dup.parts[1].deform).toEqual({ taper: 0.3, twist: 45, bulge: 0.2 });
    expect(dup.parts[1].deform).not.toBe(dup.parts[0].deform);
    const one = P.removePart(r, 1);
    expect(one.parts).toHaveLength(1);
    expect(P.removePart(one, 0)).toBe(null);               // cleared
  });

  it('recolorPart cycles the shared palette; edited recipes stay buildObject-safe', () => {
    const r = seed();
    const rec = P.recolorPart(r, 0);
    expect(P.PART_PALETTE).toContain(rec.parts[0].color);
    expect(rec.parts[0].color).not.toBe(r.parts[0].color);
    // whole-object transforms survive part edits
    const tinted = P.normalizeRecipe({ ...seed(), scale: 2, rotY: 90, tint: '#ff00ff' });
    const edited = P.addPart(tinted, 'torus');
    expect(edited.scale).toBe(2);
    expect(edited.rotY).toBe(90);
    expect(edited.tint).toBe('#ff00ff');
  });
});
