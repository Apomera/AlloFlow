// Golden-master / characterization tests for the PURE Voxel Archaeology engine.
// The engine has no DOM, React, or globals, so we load it headless (the same
// new Function() pattern setup.js uses) and exercise the real exported functions.
// Phase 1 of VOXEL_ARCHAEOLOGY_ARCHITECTURE.md: pin behavior before any UI exists.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let E;
beforeAll(() => {
  const src = readFileSync(resolve(process.cwd(), 'stem_lab/archaeology_engine.js'), 'utf-8');
  // eslint-disable-next-line no-new-func
  new Function(src)();
  E = globalThis.AlloArchaeology;
  if (!E) throw new Error('archaeology engine did not register on globalThis');
});

describe('generateSite — deterministic and well-formed', () => {
  it('is deterministic for a given seed', () => {
    expect(E.generateSite(42)).toEqual(E.generateSite(42));
  });
  it('varies with the seed', () => {
    expect(JSON.stringify(E.generateSite(42).artifacts)).not.toBe(JSON.stringify(E.generateSite(7).artifacts));
  });
  it('has the expected shape', () => {
    const s = E.generateSite(42);
    expect(s.cols).toBe(6);
    expect(s.rows).toBe(6);
    expect(s.depth).toBe(6);
    expect(s.strata).toHaveLength(6);
    expect(s.artifacts).toHaveLength(4);
  });
  it('places artifacts in distinct strata (1-4) and distinct cells', () => {
    const s = E.generateSite(123);
    const strata = s.artifacts.map(a => a.trueStratum);
    const cells = s.artifacts.map(a => a.x + ',' + a.y);
    expect(new Set(strata).size).toBe(4);
    expect(new Set(cells).size).toBe(4);
    strata.forEach(n => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(4); });
  });
});

describe('exposeCell — layer-by-layer, no skipping (superposition)', () => {
  it('cannot reach a find before its overlying strata are removed', () => {
    const site = E.generateSite(42);
    const deep = site.artifacts.find(a => a.trueStratum === 4); // deepest find
    let state = E.initState(site);
    for (let k = 1; k <= deep.trueStratum + 1; k++) {
      const res = E.exposeCell(state, deep.x, deep.y);
      state = res.state;
      expect(res.stratumIndex).toBe(k - 1); // processes strata in order 0,1,2,...
      if (k <= deep.trueStratum) expect(res.exposed).toBeNull();
      else expect(res.exposed).toBe(deep.id); // found only when its own stratum is excavated
    }
  });
  it('stops at sterile subsoil and does not over-dig', () => {
    const site = E.generateSite(1);
    let state = E.initState(site);
    for (let k = 0; k < site.depth; k++) state = E.exposeCell(state, 0, 0).state;
    const res = E.exposeCell(state, 0, 0);
    expect(res.atBedrock).toBe(true);
    expect(res.exposed).toBeNull();
    expect(res.state.dug[0][0]).toBe(site.depth); // capped
  });
});

// Helper: fully excavate a cell until its artifact is exposed.
function exposeArtifact(E, state, art) {
  for (let k = 0; k <= art.trueStratum; k++) state = E.exposeCell(state, art.x, art.y).state;
  return state;
}

describe('record vs remove — context preservation (the ethics mechanic)', () => {
  it('recording an exposed find preserves context', () => {
    const site = E.generateSite(42);
    const art = site.artifacts[0];
    let state = exposeArtifact(E, E.initState(site), art);
    expect(state.status[art.id]).toBe('exposed');
    state = E.recordFind(state, art.id);
    expect(state.status[art.id]).toBe('recorded');
    expect(state.lostContext[art.id]).toBe(false);
  });
  it('removing before recording loses context', () => {
    const site = E.generateSite(42);
    const art = site.artifacts[0];
    let state = exposeArtifact(E, E.initState(site), art);
    state = E.removeFind(state, art.id);
    expect(state.status[art.id]).toBe('removed');
    expect(state.lostContext[art.id]).toBe(true);
  });
  it('recording then removing keeps context intact', () => {
    const site = E.generateSite(42);
    const art = site.artifacts[0];
    let state = exposeArtifact(E, E.initState(site), art);
    state = E.removeFind(E.recordFind(state, art.id), art.id);
    expect(state.lostContext[art.id]).toBe(false);
  });
});

describe('proposeOrdering — superposition check', () => {
  it('accepts oldest-to-youngest (deepest stratum first)', () => {
    const site = E.generateSite(42);
    const truth = E.trueChronOrder(site);
    const res = E.proposeOrdering(E.initState(site), truth);
    expect(res.correct).toBe(true);
    expect(res.explanation).toMatch(/superposition/i);
  });
  it('rejects the reversed order with an explanation', () => {
    const site = E.generateSite(42);
    const reversed = E.trueChronOrder(site).slice().reverse();
    const res = E.proposeOrdering(E.initState(site), reversed);
    expect(res.correct).toBe(false);
    expect(res.explanation.length).toBeGreaterThan(0);
  });
});

describe('scoreSession — rewards systematic, context-preserving work', () => {
  it('a fully-recorded dig preserves context', () => {
    const site = E.generateSite(42);
    let state = E.initState(site);
    site.artifacts.forEach(a => { state = E.recordFind(exposeArtifact(E, state, a), a.id); });
    const score = E.scoreSession(state);
    expect(score.foundCount).toBe(4);
    expect(score.recordedCount).toBe(4);
    expect(score.contextPreserved).toBe(true);
    expect(score.lostContextCount).toBe(0);
  });
  it('removing a find without recording flags lost context', () => {
    const site = E.generateSite(42);
    const art = site.artifacts[0];
    let state = E.removeFind(exposeArtifact(E, E.initState(site), art), art.id);
    const score = E.scoreSession(state);
    expect(score.contextPreserved).toBe(false);
    expect(score.lostContextCount).toBeGreaterThanOrEqual(1);
  });
});

describe('describeCell — accessible label basis', () => {
  it('returns a position-anchored description', () => {
    const site = E.generateSite(42);
    const text = E.describeCell(E.initState(site), 0, 0);
    expect(text).toMatch(/^Cell A1\./);
    expect(text).toMatch(/layers/);
  });
});
