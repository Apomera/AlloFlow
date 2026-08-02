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

describe('Geology Explorer quiz remediation', () => {
  it('provides remediation for every quiz item in every scene', () => {
    const banks = P.quizBanks();
    for (const [scene, bank] of Object.entries(banks)) {
      bank.items.forEach((_, index) => {
        const feedback = P.quizRemediation(scene, index);
        expect(feedback.id, `${scene}:${index}`).toBeTruthy();
        expect(feedback.misconception, `${scene}:${index}`).toBeTruthy();
        expect(feedback.remedy, `${scene}:${index}`).toBeTruthy();
      });
    }
  });

  it('targets the subduction source misconception', () => {
    const feedback = P.quizRemediation('subduction', 0);
    expect(feedback.misconception).toContain('slab itself melts');
    expect(feedback.remedy).toContain('mantle wedge');
  });

  it('counts persisted review flags in scene progress', () => {
    const snapshot = P.sceneProgress('subduction', {
      quizByScene: { subduction: { answered: 3, correct: 1, misconceptions: { 'subduction-source': 2 } } },
      identifiedByScene: {},
      sceneSignals: {},
      notebook: { evidence: [] }
    });
    expect(snapshot.misconceptionCount).toBe(2);
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
