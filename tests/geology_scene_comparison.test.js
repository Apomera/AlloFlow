import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});

beforeEach(() => {
  P.setScene('crust');
  P.setGrid('standard');
});

describe('Geology Explorer cross-scene comparison', () => {
  it('defines comparison metadata for every scene', () => {
    const comparisons = P.sceneComparisons();
    for (const scene of P.scenes()) {
      expect(comparisons[scene], scene).toBeTruthy();
      expect(comparisons[scene].concept, scene).toBeTruthy();
      expect(comparisons[scene].process, scene).toBeTruthy();
      expect(comparisons[scene].evidence, scene).toBeTruthy();
      expect(comparisons[scene].direction, scene).toBeTruthy();
      expect(comparisons[scene].outcome, scene).toBeTruthy();
    }
  });

  it('returns pair-specific transfer insight when available', () => {
    expect(P.sceneComparisonInsight('ridge', 'subduction')).toContain('opposite plate-boundary');
    expect(P.sceneComparisonInsight('subduction', 'hotspot')).toContain('plate boundary');
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
