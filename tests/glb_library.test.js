// Tests for glb_library_module.js — the CC0 collectibles catalog (glblib/1).
//
// jsdom has no WebGL/network, so the actual GLTFLoader fetch is NOT exercised
// (browser smoke). What IS pinned: the pure economy + catalog seams
// (normalizeCatalog, listCatalog, canAfford, affordable, resolveSource) and the
// starter catalog's Prim3D-fallback renders TODAY (loadModel resolves an object
// from a recipe without any .glb).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let G, P;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.GlbLibrary;
  delete window.AlloModules.Prim3D;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'prim3d_module.js'), 'utf8'))();
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'glb_library_module.js'), 'utf8'))();
  P = window.AlloModules.Prim3D;
  G = window.AlloModules.GlbLibrary;
  if (!G) throw new Error('GlbLibrary did not register');
});

describe('GlbLibrary catalog + economy (pure seams)', () => {
  it('starter catalog normalizes to renderable items with costs and categories', () => {
    const cat = G.normalizeCatalog();
    expect(cat.length).toBeGreaterThanOrEqual(5);
    expect(cat.every((it) => it.id && it.cost >= 0 && (it.glbUrl || it.recipe))).toBe(true);
    expect(cat.map((it) => it.id)).toContain('trophy');
  });

  it('normalizeItem drops junk, dedups ids, clamps cost, whitelists category', () => {
    const cat = G.normalizeCatalog([
      { id: 'a', label: 'A', cost: -5, category: 'weapon', recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], color: '#ff0000' }] } },
      { id: 'a', label: 'dup', recipe: { parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0, 0], color: '#00ff00' }] } }, // dup id ⇒ dropped
      { label: 'no-id' },                                                    // no id ⇒ dropped
      { id: 'b', glbUrl: '   ' },                                            // blank url + no recipe ⇒ dropped
    ]);
    expect(cat.map((it) => it.id)).toEqual(['a']);
    expect(cat[0].cost).toBe(0);              // negative clamped
    expect(cat[0].category).toBe('decor');    // unknown category ⇒ default
  });

  it('listCatalog filters by category', () => {
    const trophies = G.listCatalog({ category: 'trophy' });
    expect(trophies.length).toBe(1);
    expect(trophies[0].id).toBe('trophy');
    expect(G.listCatalog({ category: 'plant' }).every((it) => it.category === 'plant')).toBe(true);
  });

  it('canAfford / affordable gate on the token balance', () => {
    const cat = G.normalizeCatalog();
    const trophy = cat.find((it) => it.id === 'trophy');   // cost 25
    expect(G.canAfford(trophy, 25)).toBe(true);
    expect(G.canAfford(trophy, 24)).toBe(false);
    expect(G.canAfford(null, 999)).toBe(false);
    const cheap = G.affordable(cat, 5).map((it) => it.id);
    expect(cheap).toContain('sprout');       // cost 5
    expect(cheap).not.toContain('trophy');   // cost 25
  });

  it('resolveSource: glbUrl → glb, recipe-only → prim3d, neither → none', () => {
    expect(G.resolveSource({ glbUrl: 'x.glb', recipe: {} })).toBe('glb');
    expect(G.resolveSource({ glbUrl: null, recipe: { parts: [] } })).toBe('prim3d');
    expect(G.resolveSource({ glbUrl: null, recipe: null })).toBe('none');
    expect(G.resolveSource(null)).toBe('none');
  });
});

describe('GlbLibrary.loadModel (Prim3D fallback works with zero .glb)', () => {
  function threeStub() {
    function Group() { this.children = []; this.userData = {}; this.scale = { setScalar: () => {} }; this.add = (c) => this.children.push(c); }
    function Mesh() { this.position = { set: () => {} }; this.rotation = { set: () => {} }; }
    const geo = function () { return {}; };
    return { Group, Mesh, BoxGeometry: geo, SphereGeometry: geo, CylinderGeometry: geo, ConeGeometry: geo, TorusGeometry: geo, MeshStandardMaterial: function () {}, Color: function () {} };
  }
  it('resolves a recipe-backed item to a THREE group without touching the network', async () => {
    const sprout = G.normalizeCatalog().find((it) => it.id === 'sprout');
    const obj = await G.loadModel(threeStub(), sprout, { unit: 1 });
    expect(obj).toBeTruthy();
    expect(obj.children.length).toBeGreaterThan(0);
  });
  it('rejects an item with neither source', async () => {
    await expect(G.loadModel(threeStub(), { id: 'empty' }, {})).rejects.toThrow();
  });
});
