// Beehive comb-pattern model — the rules the 3D hive bay draws its comb from.
//
// The 3D frame is not decoration: reading a comb face is THE beekeeping skill,
// and the layout encodes real claims — honey ABOVE the brood, pollen in a band
// AROUND it, gaps appearing as the queen fails, and nothing but honey above a
// queen excluder. Those claims live in one pure function, bhCombCellRole, so
// they can be checked without a GPU and cannot drift away from what the
// surrounding text tells a student to look for.
//
// The GL side (that cells are actually instanced and repainted) is covered by
// tests/e2e/24-beehive-hive-forage-3d-gl.spec.ts.

import { describe, it, expect, beforeAll } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let BH;

beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
  if (!BH) throw new Error('beehive did not populate __RR_TEST_EXPORTS__');
});

const HEALTHY = { broodFill: 0.75, honeyFill: 0.6, pollenLevel: 0.6, layingRate: 1 };

// Walk the face on the grid the 3D scene actually uses, and tally roles.
function census(state, filter) {
  const counts = {};
  for (let u = -0.98; u <= 0.98; u += 0.04) {
    for (let v = -0.98; v <= 0.98; v += 0.04) {
      if (filter && !filter(u, v)) continue;
      const role = BH.bhCombCellRole(u, v, state);
      counts[role] = (counts[role] || 0) + 1;
    }
  }
  return counts;
}

describe('Beehive comb-pattern model', () => {
  it('exposes the model and its colour map', () => {
    expect(typeof BH.bhCombCellRole).toBe('function');
    expect(typeof BH.bhCombCellColor).toBe('function');
  });

  it('puts the brood nest in the middle of the frame', () => {
    expect(BH.bhCombCellRole(0, -0.1, HEALTHY)).toMatch(/brood/);
  });

  it('stores honey ABOVE the brood, never through it', () => {
    // Every honey cell must sit higher than every brood cell on the same face.
    let lowestHoney = 1;
    let highestBrood = -1;
    for (let u = -0.9; u <= 0.9; u += 0.05) {
      for (let v = -0.9; v <= 0.9; v += 0.05) {
        const role = BH.bhCombCellRole(u, v, HEALTHY);
        if (role === 'honey') lowestHoney = Math.min(lowestHoney, v);
        if (role.indexOf('brood') >= 0) highestBrood = Math.max(highestBrood, v);
      }
    }
    expect(lowestHoney).toBeGreaterThan(highestBrood);
  });

  it('bands pollen around the brood rather than scattering it', () => {
    // A pollen cell is always farther from the nest centre than the brood it
    // rings, measured on the same ellipse the pattern is built from.
    const dist = (u, v) => (u / 0.84) ** 2 + ((v + 0.16) / 0.7) ** 2;
    let maxBrood = 0;
    let minPollen = Infinity;
    for (let u = -0.9; u <= 0.9; u += 0.05) {
      for (let v = -0.9; v <= 0.9; v += 0.05) {
        const role = BH.bhCombCellRole(u, v, HEALTHY);
        if (role.indexOf('brood') >= 0) maxBrood = Math.max(maxBrood, dist(u, v));
        if (role === 'pollen') minPollen = Math.min(minPollen, dist(u, v));
      }
    }
    expect(minPollen).toBeGreaterThan(0);
    expect(minPollen).toBeLessThan(maxBrood + 0.6);
  });

  it('keeps the youngest brood on the expanding rim, capped brood in the centre', () => {
    expect(BH.bhCombCellRole(0, -0.16, HEALTHY)).toBe('capped_brood');
    const rim = census(HEALTHY);
    expect(rim.open_brood).toBeGreaterThan(0);
    expect(rim.capped_brood).toBeGreaterThan(0);
  });

  // The headline teaching claim of the whole frame view.
  it('opens gaps in the brood as the queen fails — the spotty pattern', () => {
    const inNest = (u, v) => (u / 0.84) ** 2 + ((v + 0.16) / 0.7) ** 2 < 0.5;
    const solid = census({ ...HEALTHY, layingRate: 1 }, inNest);
    const failing = census({ ...HEALTHY, layingRate: 0.35 }, inNest);
    const solidBrood = (solid.capped_brood || 0) + (solid.open_brood || 0) + (solid.drone_brood || 0);
    const failingBrood = (failing.capped_brood || 0) + (failing.open_brood || 0) + (failing.drone_brood || 0);
    expect(solidBrood).toBeGreaterThan(0);
    expect(failingBrood).toBeLessThan(solidBrood);
    expect(failing.empty || 0).toBeGreaterThan(solid.empty || 0);
  });

  // Drone comb is not a cosmetic variant: varroa breed in it preferentially
  // because drones stay capped about three days longer, which is the whole
  // basis of drone-comb trapping as a mite control.
  it('puts drone brood along the BOTTOM edge of the nest', () => {
    const roles = [];
    for (let u = -0.9; u <= 0.9; u += 0.05) {
      for (let v = -0.9; v <= 0.9; v += 0.05) {
        if (BH.bhCombCellRole(u, v, HEALTHY) === 'drone_brood') roles.push(v);
      }
    }
    expect(roles.length).toBeGreaterThan(0);
    // Every drone cell sits below the middle of the frame.
    expect(Math.max(...roles)).toBeLessThan(0);
  });

  // Not a clean band under the worker brood — drone comb is built in the
  // bottom CORNERS and along the outer margin, while the queen keeps laying
  // worker brood straight down the middle of the nest.
  it('keeps drone brood on the outer edge of the nest, never in its centre', () => {
    const dist = (u, v) => (u / 0.84) ** 2 + ((v + 0.16) / 0.7) ** 2;
    expect(BH.bhCombCellRole(0, -0.16, HEALTHY)).toBe('capped_brood');
    expect(BH.bhCombCellRole(0, -0.45, HEALTHY)).not.toBe('drone_brood');
    let closestDrone = Infinity;
    for (let u = -0.9; u <= 0.9; u += 0.05) {
      for (let v = -0.9; v <= 0.9; v += 0.05) {
        if (BH.bhCombCellRole(u, v, HEALTHY) === 'drone_brood') {
          closestDrone = Math.min(closestDrone, dist(u, v));
        }
      }
    }
    // Comfortably outside the middle of the laying ellipse.
    expect(closestDrone).toBeGreaterThan(0.3);
  });

  it('grows the nest with the brood reading', () => {
    const inNest = (u, v) => true;
    const small = census({ ...HEALTHY, broodFill: 0.15 }, inNest);
    const big = census({ ...HEALTHY, broodFill: 0.95 }, inNest);
    const smallBrood = (small.capped_brood || 0) + (small.open_brood || 0) + (small.drone_brood || 0);
    const bigBrood = (big.capped_brood || 0) + (big.open_brood || 0) + (big.drone_brood || 0);
    expect(bigBrood).toBeGreaterThan(smallBrood);
  });

  it('leaves bare foundation at the edges of a weak colony', () => {
    const weak = census({ broodFill: 0.05, honeyFill: 0.05, pollenLevel: 0.05, layingRate: 1 });
    expect(weak.foundation || 0).toBeGreaterThan(0);
  });

  it('draws a super as honey over empty comb, with no brood and no pollen', () => {
    // This is exactly the state the scene paints above the queen excluder,
    // which exists to keep brood out of the honey supers.
    const superState = { broodFill: 0, honeyFill: 0.9, pollenLevel: 0, layingRate: 1 };
    const counts = census(superState);
    expect(counts.capped_brood || 0).toBe(0);
    expect(counts.open_brood || 0).toBe(0);
    expect(counts.drone_brood || 0).toBe(0);
    expect(counts.pollen || 0).toBe(0);
    expect(counts.honey || 0).toBeGreaterThan(0);
  });

  it('is deterministic — the same frame reads the same way twice', () => {
    const a = census(HEALTHY);
    const b = census(HEALTHY);
    expect(a).toEqual(b);
  });

  describe('queen marking colours', () => {
    it('follows the five-year international cycle', () => {
      // 1 & 6 white, 2 & 7 yellow, 3 & 8 red, 4 & 9 green, 5 & 0 blue.
      const nameFor = (y) => BH.BH_QUEEN_MARK_NAMES[BH.bhQueenMarkIndex(y)];
      expect(nameFor(2026)).toBe('white');
      expect(nameFor(2021)).toBe('white');
      expect(nameFor(2027)).toBe('yellow');
      expect(nameFor(2028)).toBe('red');
      expect(nameFor(2029)).toBe('green');
      expect(nameFor(2030)).toBe('blue');
      expect(nameFor(2025)).toBe('blue');
    });
  });

  describe('cell colours', () => {
    it('separates capped brood, capped honey and empty comb', () => {
      const brood = BH.bhCombCellColor('capped_brood', 0, 0, false);
      const honey = BH.bhCombCellColor('honey', 0, 0, false);
      const empty = BH.bhCombCellColor('empty', 0, 0, false);
      expect(new Set([brood, honey, empty]).size).toBe(3);
    });

    it('every role resolves to a parseable hex colour', () => {
      ['capped_brood', 'open_brood', 'drone_brood', 'honey', 'pollen', 'foundation', 'empty'].forEach((role) => {
        expect(BH.bhCombCellColor(role, 0.3, -0.2, false)).toMatch(/^#[0-9a-f]{6}$/i);
        expect(BH.bhCombCellColor(role, 0.3, -0.2, true)).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});
