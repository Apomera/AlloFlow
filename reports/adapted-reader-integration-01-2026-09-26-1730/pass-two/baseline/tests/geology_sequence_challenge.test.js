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

describe('Geology Explorer sequencing challenge', () => {
  it('defines a process-specific sequence for every scene', () => {
    const challenges = P.sequenceChallenges();
    expect(Object.keys(challenges)).toEqual(['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision']);
    for (const [scene, challenge] of Object.entries(challenges)) {
      expect(challenge.title, scene).toBeTruthy();
      expect(challenge.prompt, scene).toBeTruthy();
      expect(challenge.items.length, scene).toBeGreaterThanOrEqual(4);
      challenge.items.forEach((item) => {
        expect(item.key, scene).toBeTruthy();
        expect(item.label, scene).toBeTruthy();
        expect(item.detail, scene).toBeTruthy();
      });
    }
  });

  it('starts shuffled and validates the canonical order', () => {
    for (const scene of P.scenes()) {
      const items = P.sequenceChallenges()[scene].items;
      const correct = items.map((item) => item.key);
      const initial = P.sequenceInitialOrder(scene);
      expect(initial, scene).not.toEqual(correct);
      expect(P.sequenceIsCorrect(scene, initial), scene).toBe(false);
      expect(P.sequenceIsCorrect(scene, correct), scene).toBe(true);
    }
  });

  it('moves a selected card before a target without mutating the original order', () => {
    const order = ['limestone', 'sandstone', 'soil', 'shale', 'pluton', 'rim'];
    expect(P.sequenceMoveBefore(order, 'shale', 'sandstone')).toEqual(['limestone', 'shale', 'sandstone', 'soil', 'pluton', 'rim']);
    expect(order).toEqual(['limestone', 'sandstone', 'soil', 'shale', 'pluton', 'rim']);
    expect(P.sequenceMoveBefore(order, 'missing', 'sandstone')).toEqual(order);
  });
  it('persists sequence completion in scene progress', () => {
    const snapshot = P.sceneProgress('subduction', {
      sequenceByScene: { subduction: true },
      identifiedByScene: {},
      quizByScene: {},
      sceneSignals: {},
      notebook: { evidence: [] }
    });
    expect(snapshot.sequenceComplete).toBe(true);
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
