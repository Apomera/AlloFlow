// The quota-exceeded retry must not throw away Prim3D sculptures.
//
// serializeItems(items, stripImages) is the fallback path: when a local write fails
// because storage is full, the app retries with the heavy media stripped. For a
// student that local store is the ONLY durable one (cloud sync is teacher-only), so
// what this path keeps is what survives.
//
// A concept space's node art is a MIX. A base64 illustration is ~300KB and is the
// actual problem; a Prim3D sculpture recipe is ~1KB of JSON and is not. The original
// handling dropped the entire `conceptArt` store, so a teacher's whole batch-furnish
// of sculptures was discarded to reclaim essentially nothing — while the block
// directly above it already did the right thing for the Memory Palace (drop images
// and depth maps, keep loci/mnemonics/mastery).
//
// The monolith is the source of truth and is mirrored into desktop/web-app/src twice
// (a hand-maintained AlloFlowANTI.txt copy and the build-generated App.jsx). The
// recurring bug in this repo is a fix landing in one copy and not the others, so
// every assertion here runs against all three.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const COPIES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

describe('conceptArt quota strip keeps sculptures', () => {
  it.each(COPIES)('%s selects sculptures instead of dropping the whole store', (rel) => {
    const src = read(rel);
    expect(src).toContain("if (art && typeof art === 'object' && art.type === 'sculpture') keptArt[nodeId] = art;");
    expect(src).toContain('const keptArt = {};');
    expect(src).toContain('parsedData = { ...parsedData, conceptArt: keptArt };');
  });

  it.each(COPIES)('%s still drops the key entirely when nothing survives', (rel) => {
    // An empty map would be saved as dead weight and would also read as "this
    // space has art" to anything that checks the key's presence.
    const src = read(rel);
    expect(src).toContain('if (Object.keys(keptArt).length > 0) {');
    expect(src).toContain('const { conceptArt, ...restArt } = parsedData;');
  });

  it.each(COPIES)('%s guards the store is an object before iterating it', (rel) => {
    // parsedData comes from JSON.parse of whatever was stored, so a corrupted or
    // hand-edited resource must not throw inside the last-ditch save path.
    const src = read(rel);
    expect(src).toContain("parsedData.conceptArt && typeof parsedData.conceptArt === 'object'");
  });

  it.each(COPIES)('%s keeps the palace strip asymmetric in the same way', (rel) => {
    // Pinned as the reference shape this fix was modelled on: pictures go, the
    // structure that makes the palace usable stays.
    const src = read(rel);
    expect(src).toContain('const { images, depths, covered, ...keepPalace } = mp;');
  });

  it('the three copies agree on the whole strip block', () => {
    // Cheap drift detector: the fix must never exist in only one copy.
    const marker = /const keptArt = \{\};[\s\S]{0,600}?conceptArt, \.\.\.restArt \} = parsedData;/;
    const blocks = COPIES.map((rel) => {
      const m = read(rel).match(marker);
      expect(m, `strip block not found in ${rel}`).toBeTruthy();
      return m[0].replace(/\s+/g, ' ').trim();
    });
    expect(blocks[1]).toBe(blocks[0]);
    expect(blocks[2]).toBe(blocks[0]);
  });
});

describe('the strip contract, executed', () => {
  // The block above is inline in a component and cannot be imported, so this is the
  // documented behaviour written out. It fails if anyone changes what the comment in
  // the monolith promises, which is the part a future reader will rely on.
  const strip = (parsedData) => {
    if (parsedData && typeof parsedData === 'object' && parsedData.conceptArt && typeof parsedData.conceptArt === 'object') {
      const keptArt = {};
      Object.keys(parsedData.conceptArt).forEach((nodeId) => {
        const art = parsedData.conceptArt[nodeId];
        if (art && typeof art === 'object' && art.type === 'sculpture') keptArt[nodeId] = art;
      });
      if (Object.keys(keptArt).length > 0) return { ...parsedData, conceptArt: keptArt };
      const { conceptArt, ...restArt } = parsedData;
      return restArt;
    }
    return parsedData;
  };

  const IMG = { type: 'image', dataUrl: 'data:image/png;base64,AAAA' };
  const SCULPT = { type: 'sculpture', recipe: { parts: [{ kind: 'box' }] } };

  it('keeps every sculpture and removes every image', () => {
    const out = strip({ conceptArt: { a: SCULPT, b: IMG, c: SCULPT } });
    expect(Object.keys(out.conceptArt).sort()).toEqual(['a', 'c']);
    expect(out.conceptArt.a).toEqual(SCULPT);
  });

  it('drops the key when the space was image-only', () => {
    const out = strip({ conceptArt: { a: IMG, b: IMG }, conceptSpace: { axes: {} } });
    expect('conceptArt' in out).toBe(false);
    expect(out.conceptSpace).toEqual({ axes: {} });   // the arrangement is never collateral
  });

  it('leaves the rest of the resource untouched', () => {
    const input = { conceptArt: { a: SCULPT, b: IMG }, main: 'Water cycle', constellation: { 'a|b': { w: 0.5 } } };
    const out = strip(input);
    expect(out.main).toBe('Water cycle');
    expect(out.constellation).toEqual({ 'a|b': { w: 0.5 } });
  });

  it('survives malformed or hostile stores without throwing', () => {
    expect(() => strip({ conceptArt: null })).not.toThrow();
    expect(() => strip({ conceptArt: 'nope' })).not.toThrow();
    expect(() => strip({})).not.toThrow();
    expect(() => strip(null)).not.toThrow();
    const out = strip({ conceptArt: { a: null, b: 'x', c: { type: 'unknown' }, d: SCULPT } });
    expect(Object.keys(out.conceptArt)).toEqual(['d']);
  });

  it('is a no-op for a resource that has no concept art at all', () => {
    const input = { main: 'Topic', memoryPalace: { loci: [] } };
    expect(strip(input)).toEqual(input);
  });
});
