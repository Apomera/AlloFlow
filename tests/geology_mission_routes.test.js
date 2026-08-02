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

describe('Geology Explorer mission routing', () => {
  it('maps every mission check to a concrete target and mode', () => {
    const expected = {
      materials: ['materials', 'investigate'],
      core: ['core', 'investigate'],
      layers: ['materials', 'investigate'],
      sequence: ['signal', 'investigate'],
      cores: ['materials', 'investigate'],
      waves: ['signal', 'investigate'],
      slab: ['materials', 'investigate'],
      arc: ['signal', 'investigate'],
      polarity: ['materials', 'investigate'],
      spread: ['signal', 'investigate'],
      chain: ['materials', 'investigate'],
      motion: ['signal', 'investigate'],
      quiz: ['quiz', 'assess']
    };

    for (const [checkId, [target, mode]] of Object.entries(expected)) {
      const action = P.missionAction(checkId);
      expect(action, checkId).toBeTruthy();
      expect(action.target, checkId).toBe(target);
      expect(action.mode, checkId).toBe(mode);
      expect(action.label, checkId).toBeTruthy();
    }
  });

  it('returns null for an unknown mission check', () => {
    expect(P.missionAction('not-a-real-check')).toBeNull();
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
