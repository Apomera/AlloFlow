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

describe('Geology Explorer vocabulary bridge', () => {
  it('provides three observation-linked terms for every scene', () => {
    const vocabulary = P.vocabulary();
    expect(Object.keys(vocabulary)).toHaveLength(P.scenes().length);
    for (const [scene, entries] of Object.entries(vocabulary)) {
      expect(entries, scene).toHaveLength(3);
      entries.forEach((entry) => {
        expect(entry.term, scene).toBeTruthy();
        expect(entry.definition, scene).toBeTruthy();
        expect(entry.cue, scene).toContain('Use it when');
      });
    }
  });

  it('anchors crust vocabulary to the mission evidence', () => {
    const crust = P.vocabulary().crust;
    expect(crust.map((entry) => entry.term)).toEqual(['Superposition', 'Cross-cutting', 'Contact metamorphism']);
    expect(crust[0].cue).toContain('drill core');
    expect(crust[1].cue).toContain('granite pluton');
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
