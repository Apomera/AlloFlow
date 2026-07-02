// Tests for memory_palace_module.js — the method-of-loci 3D walk.
//
// jsdom has no WebGL, so the GL walk is NOT exercised here (live Canvas smoke).
// What IS pinned: (1) buildPalace() is pure and deterministic — rooms per branch,
// loci in reading order, camera stops inside the room, ids matching the
// adaptGenerated convention; (2) navigateRoute clamps; (3) describeLocusForSR
// carries the mnemonic (the pedagogical payload); (4) the graceful-degradation
// contract — no WebGL ⇒ visible walking-route list + notice, never a crash.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let MP;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.MemoryPalace;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8'))();
  MP = window.AlloModules.MemoryPalace;
  if (!MP) throw new Error('MemoryPalace did not register');
});

function sampleData() {
  return {
    main: 'The Water Cycle',
    branches: [
      { title: 'Sky Room', items: ['Evaporation', 'Condensation'], mnemonics: ['A kettle the size of a house boils a lake into golden steam', 'A cloud knitting itself from silver wool'] },
      { title: 'Ground Room', items: ['Precipitation', { text: 'Collection' }], mnemonics: ['Umbrellas raining upward'] },
    ],
  };
}

describe('MemoryPalace.buildPalace (pure palace model)', () => {
  it('creates an entry hall plus one room per branch, in corridor order', () => {
    const p = MP.buildPalace(sampleData());
    expect(p.rooms.map((r) => r.key)).toEqual(['__entry', 'b0', 'b1']);
    expect(p.rooms.map((r) => r.label)).toEqual(['The Water Cycle', 'Sky Room', 'Ground Room']);
    // rooms march along +X
    expect(p.rooms[1].center.x).toBeGreaterThan(p.rooms[0].center.x);
    expect(p.rooms[2].center.x).toBeGreaterThan(p.rooms[1].center.x);
  });

  it('route = entrance then every item in reading order, ids matching adaptGenerated', () => {
    const p = MP.buildPalace(sampleData());
    expect(p.route).toEqual(['__entry', 'b0_i0', 'b0_i1', 'b1_i0', 'b1_i1']);
  });

  it('loci carry labels, mnemonics ({text} items handled), and per-stop camera rails', () => {
    const p = MP.buildPalace(sampleData());
    const byId = {}; p.loci.forEach((l) => { byId[l.id] = l; });
    expect(byId.b0_i0.label).toBe('Evaporation');
    expect(byId.b0_i0.mnemonic).toMatch(/kettle/);
    expect(byId.b1_i1.label).toBe('Collection');          // {text} object item
    expect(byId.b1_i1.mnemonic).toBe('');                  // missing mnemonic ⇒ empty, never undefined
    // camera stands inside the room, back from the frame, looking at it
    const l = byId.b0_i0;
    expect(Math.abs(l.camPos.z)).toBeLessThan(Math.abs(l.framePos.z));
    expect(l.lookAt.x).toBe(l.framePos.x);
  });

  it('alternates walls left/right within a room (classic loci pattern)', () => {
    const p = MP.buildPalace(sampleData());
    const byId = {}; p.loci.forEach((l) => { byId[l.id] = l; });
    expect(Math.sign(byId.b0_i0.framePos.z)).toBe(-1);
    expect(Math.sign(byId.b0_i1.framePos.z)).toBe(1);
  });

  it('is deterministic and survives an empty outline', () => {
    const a = MP.buildPalace(sampleData());
    const b = MP.buildPalace(sampleData());
    expect(a).toEqual(b);
    const empty = MP.buildPalace({ main: 'X', branches: [] });
    expect(empty.route).toEqual(['__entry']);
    expect(empty.rooms.length).toBe(1);
  });
});

describe('MemoryPalace — route navigation + SR descriptions', () => {
  it('navigateRoute walks in order with clamping, no wrap', () => {
    const p = MP.buildPalace(sampleData());
    expect(MP.navigateRoute(p, null, 'first')).toBe('__entry');
    expect(MP.navigateRoute(p, null, 'last')).toBe('b1_i1');
    expect(MP.navigateRoute(p, '__entry', 'next')).toBe('b0_i0');
    expect(MP.navigateRoute(p, 'b1_i1', 'next')).toBe('b1_i1');   // clamp at end
    expect(MP.navigateRoute(p, 'b0_i0', 'prev')).toBe('__entry');
    expect(MP.navigateRoute({ route: [] }, null, 'next')).toBe(null);
  });

  it('describeLocusForSR announces locus position, room, item, and the mnemonic', () => {
    const p = MP.buildPalace(sampleData());
    const d = MP.describeLocusForSR(p, 'b0_i1', null);
    expect(d).toMatch(/Locus 2 of 4/);
    expect(d).toMatch(/Sky Room room/);
    expect(d).toMatch(/Condensation/);
    expect(d).toMatch(/Picture this: A cloud knitting itself/);
    expect(MP.describeLocusForSR(p, '__entry', null)).toMatch(/Palace entrance: The Water Cycle/);
    expect(MP.describeLocusForSR(p, 'nope', null)).toBe('');
  });
});

describe('MemoryPalace — graceful degradation (no WebGL in jsdom)', () => {
  it('isWebGLAvailable() is false under jsdom', () => {
    expect(MP.isWebGLAvailable()).toBe(false);
  });

  it('render() falls back to a VISIBLE walking-route list + notice, never crashes', () => {
    const div = document.createElement('div'); document.body.appendChild(div);
    const handle = MP.render(div, sampleData(), { t: (k) => k });
    expect(handle.fellBack).toBe(true);
    expect(div.querySelector('[role="status"]')).toBeTruthy();
    const items = Array.prototype.slice.call(div.querySelectorAll('ol li')).map((li) => li.textContent);
    expect(items.length).toBe(5);                                  // entrance + 4 loci
    expect(items[1]).toMatch(/Evaporation/);
    expect(items[1]).toMatch(/kettle/);                            // mnemonic reaches the fallback too
    expect(() => handle.destroy()).not.toThrow();
    div.remove();
  });
});
