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
    expect(trophies.length).toBeGreaterThanOrEqual(1);      // grows with the catalog (KayKit wave added more)
    expect(trophies.every((it) => it.category === 'trophy')).toBe(true);
    expect(trophies.some((it) => it.id === 'trophy')).toBe(true);
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

describe('GlbLibrary — real CC0 model entries (KayKit wave 1)', () => {
  it('every glb-backed item keeps a renderable Prim3D fallback and a well-formed relative url', () => {
    const glbItems = G.normalizeCatalog().filter((it) => it.glbUrl);
    expect(glbItems.length).toBeGreaterThanOrEqual(11);
    glbItems.forEach((it) => {
      expect(it.glbUrl).toMatch(/^assets\/glb\/[a-z0-9_]+\.glb$/);
      expect(it.recipe).toBeTruthy();                       // offline / load-fail still renders
      expect(G.resolveSource(it)).toBe('glb');
      expect(it.unitScale).toBeGreaterThan(0);
      const fs = require('node:fs');
      expect(fs.existsSync(it.glbUrl)).toBe(true);          // asset actually committed at repo root
      expect(fs.existsSync('desktop/web-app/public/' + it.glbUrl)).toBe(true);   // and mirrored
    });
  });
  it('resolveGlbUrl joins relative urls to a base and passes absolute/data urls through', () => {
    expect(G.resolveGlbUrl('assets/glb/key.glb', 'https://cdn.example/')).toBe('https://cdn.example/assets/glb/key.glb');
    expect(G.resolveGlbUrl('./assets/glb/key.glb', 'https://cdn.example')).toBe('https://cdn.example/assets/glb/key.glb');
    expect(G.resolveGlbUrl('https://x.y/z.glb', 'https://cdn.example/')).toBe('https://x.y/z.glb');
    expect(G.resolveGlbUrl('data:model/gltf-binary;base64,xxx', 'https://cdn.example/')).toBe('data:model/gltf-binary;base64,xxx');
    expect(G.resolveGlbUrl('', 'https://cdn.example/')).toBe('');
  });
  it('unitScale is clamped and defaults to 1', () => {
    const one = G.normalizeCatalog([{ id: 'a', recipe: { parts: [{ shape: 'box' }] } }])[0];
    expect(one.unitScale).toBe(1);
    const big = G.normalizeCatalog([{ id: 'b', unitScale: 99, recipe: { parts: [{ shape: 'box' }] } }])[0];
    expect(big.unitScale).toBe(10);
  });
});
