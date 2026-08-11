import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';

let src;

beforeEach(() => {
  resetStemLab();
  src = readFileSync(resolve(process.cwd(), FILE), 'utf8');
});

// The rubble displacement is deliberately NOT a physics engine and NOT random.
// These tests guard the premise rather than the pixels: a scene that reshuffles
// on every re-render reads as a rendering bug, and one that cannot be
// reproduced cannot be screenshot-tested later.
describe('Machine Lab: rubble is deterministic by construction', () => {
  it('never CALLS Math.random anywhere in the tool', () => {
    // Match the call, not the word: the file mentions Math.random in a comment
    // explaining why it is not used, and a blunt substring check fails on that.
    const calls = src.replace(/\/\/[^\n]*/g, '').match(/Math\s*\.\s*random\s*\(/g) || [];
    expect(calls).toEqual([]);
  });

  it('derives displacement from a hash of the block coordinates', () => {
    expect(src).toContain('function hash01(');
    expect(src).toMatch(/hash01\(b\.col, b\.row, 1\)/);
  });

  it('reproduces the identical offset for the same block, every call', () => {
    // Re-implement the published hash and pin it: if the constants change, the
    // rubble changes, and that should be a deliberate act rather than a drift.
    const m = src.match(/function hash01\(a, b, salt\) \{([\s\S]*?)\n {2}\}/);
    expect(m).toBeTruthy();
    // eslint-disable-next-line no-new-func
    const hash01 = new Function('a', 'b', 'salt', m[1] + '\n');
    const a = hash01(3, 4, 1);
    for (let i = 0; i < 50; i++) expect(hash01(3, 4, 1)).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    // Different blocks and different salts must not collapse onto one value.
    expect(hash01(3, 5, 1)).not.toBe(a);
    expect(hash01(3, 4, 2)).not.toBe(a);
  });

  it('spreads values across the unit interval rather than clustering', () => {
    const m = src.match(/function hash01\(a, b, salt\) \{([\s\S]*?)\n {2}\}/);
    // eslint-disable-next-line no-new-func
    const hash01 = new Function('a', 'b', 'salt', m[1] + '\n');
    const buckets = [0, 0, 0, 0];
    for (let c = 0; c < 20; c++) {
      for (let r = 0; r < 20; r++) {
        buckets[Math.min(3, Math.floor(hash01(c, r, 1) * 4))]++;
      }
    }
    for (const b of buckets) expect(b).toBeGreaterThan(20);
  });
});

describe('Machine Lab: the 3D wall never decides anything', () => {
  it('keeps scoring in the pure model, not the scene builder', () => {
    // The architectural rule from the spec: the visual layer is downstream of
    // the scored model and never feeds back into it.
    const sceneStart = src.indexOf('function buildWallScene(');
    const sceneEnd = src.indexOf('var SIEGE_GL =');
    expect(sceneStart).toBeGreaterThan(-1);
    expect(sceneEnd).toBeGreaterThan(sceneStart);
    const scene = src.slice(sceneStart, sceneEnd);
    for (const forbidden of ['applyDamage', 'isBreached', 'setLabToolData', 'awardXP', 'shotsFired']) {
      expect(scene).not.toContain(forbidden);
    }
  });

  it('pushes the wall as static, so an idle wall costs no frames', () => {
    expect(src).toMatch(/SIEGE_GL\.push\(\{[\s\S]{0,200}static: true/);
  });

  it('keeps block state out of the rebuild signature', () => {
    // If state rode in the sig, every shot would tear down and rebuild the
    // whole batch instead of updating its buffers.
    const m = src.match(/SIEGE_GL\.push\(\{\s*sig: \[([^\]]*)\]/);
    expect(m).toBeTruthy();
    expect(m[1]).not.toContain('state');
    expect(m[1]).not.toContain('breached');
  });
});
