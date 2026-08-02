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

describe('Geology Explorer guided missions', () => {
  it('keeps the working-tree and deploy mirrors byte-identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });

  it('defines one question and three observable checks for every scene', () => {
    const missions = P.missions();
    expect(Object.keys(missions)).toEqual(['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot']);
    for (const [id, mission] of Object.entries(missions)) {
      expect(mission.question, id).toBeTruthy();
      expect(mission.notice, id).toHaveLength(3);
      expect(mission.checklist, id).toHaveLength(3);
      expect(mission.evidencePrompt, id).toBeTruthy();
      if (id !== 'crust') {
        expect(mission.signal, id).toMatchObject({ steps: expect.any(Array) });
        expect(mission.signal.steps).toHaveLength(3);
      }
    }
  });

  it('keeps the mission state scene-scoped and exposes the evidence workflow', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('identifiedByScene');
    expect(source).toContain('d.quizByScene');
    expect(source).toContain('function sceneMissionPanel');
    expect(source).toContain('function sceneSignalPanel');
    expect(source).toContain('function reconstructPanel');
    expect(source).toContain("palette = SCENE.palette || ROCKS");
    expect(source).toContain('Explain your evidence');
    expect(source).toContain('Export field note');
  });

  it('keeps every scene?s pure generator selectable for content-level smoke tests', () => {
    const scenes = P.scenes();
    for (const id of scenes) {
      P.setScene(id);
      expect(P.sceneId()).toBe(id);
    }
  });
});
