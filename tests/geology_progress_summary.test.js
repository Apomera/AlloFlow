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

describe('Geology Explorer all-scene progress summary', () => {
  it('returns a progress snapshot for every scene', () => {
    const data = { identifiedByScene: {}, quizByScene: {}, sceneSignals: {}, notebook: { evidence: [] } };
    for (const scene of P.scenes()) {
      const snapshot = P.sceneProgress(scene, data);
      expect(snapshot.id).toBe(scene);
      expect(snapshot.total).toBe(3);
      expect(snapshot.done).toBe(0);
      expect(snapshot.complete).toBe(false);
      expect(snapshot.checks).toHaveLength(3);
    }
  });

  it('counts scene evidence, quiz attempts, and completed signal steps', () => {
    const snapshot = P.sceneProgress('subduction', {
      identifiedByScene: { subduction: { slab: 1, wedge: 1 } },
      quizByScene: { subduction: { answered: 2, correct: 1 } },
      sceneSignals: { subduction: 2 },
      notebook: { evidence: [
        { scene: 'subduction', kind: 'observation', label: 'Subducting slab' },
        { scene: 'subduction', kind: 'process', label: 'Arc magma rises' },
        { scene: 'crust', kind: 'observation', label: 'Unrelated evidence' }
      ] }
    });
    expect(snapshot.done).toBe(3);
    expect(snapshot.complete).toBe(true);
    expect(snapshot.evidenceCount).toBe(2);
    expect(snapshot.quizAttempts).toBe(2);
    expect(snapshot.quizCorrect).toBe(1);
    expect(snapshot.signalStep).toBe(3);
    expect(snapshot.signalTotal).toBe(3);
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
