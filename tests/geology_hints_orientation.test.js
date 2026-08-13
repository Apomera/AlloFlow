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

describe('Geology Explorer adaptive hints and orientation', () => {
  it('returns the first incomplete scene-specific hint', () => {
    const mission = P.missions().subduction;
    const hint = P.nextMissionHint(mission, {
      identified: {},
      identifiedCount: 0,
      hasKeys: (keys) => keys.every((key) => key === 'slab'),
      signalComplete: false,
      quizAnswered: false
    }, 'subduction');
    expect(hint.id).toBe('slab');
    expect(hint.text).toContain('cold slab');
  });

  it('returns a completion message after all checks pass', () => {
    const mission = P.missions().geode;
    const hint = P.nextMissionHint(mission, {
      identifiedCount: 3,
      hasKeys: () => true,
      signalComplete: true,
      quizAnswered: true
    }, 'geode');
    expect(hint.id).toBe('complete');
    expect(hint.text).toContain('CER');
  });

  it('defines orientation guidance for every scene', () => {
    const orientation = P.orientation();
    for (const scene of P.scenes()) {
      expect(orientation[scene].scale, scene).toBeTruthy();
      expect(orientation[scene].direction, scene).toBeTruthy();
      expect(orientation[scene].read, scene).toBeTruthy();
    }
    expect(orientation.geode.scale).toContain('2 m');
    expect(orientation.geode.scale).not.toContain('km');
    expect(orientation.subduction.scale).toContain('depth range');
    expect(orientation.ridge.scale).toContain('depth range');
    expect(orientation.hotspot.scale).toContain('depth range');
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
