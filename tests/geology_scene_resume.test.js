import { beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});

describe('Geology Explorer scene-stage resume', () => {
  it('starts an unvisited world at stage one without claiming a resume', () => {
    expect(P.sceneResumeState('geode', {})).toEqual({
      sceneId: 'geode',
      index: 0,
      key: 'chalcedony',
      label: 'Wall rind',
      hasSavedProgress: false,
      message: '',
    });
  });

  it('restores the latest saved process stage and names it clearly', () => {
    expect(P.sceneResumeState('geode', { geode: 1 })).toEqual({
      sceneId: 'geode',
      index: 1,
      key: 'agate',
      label: 'Banded pulses',
      hasSavedProgress: true,
      message: 'Resumed at stage 2: Banded pulses.',
    });
  });

  it('treats a saved first stage as real progress', () => {
    expect(P.sceneResumeState('subduction', { subduction: 0 })).toMatchObject({
      index: 0,
      key: 'slab',
      hasSavedProgress: true,
    });
  });

  it('derives the layered-crust resume point from saved evidence', () => {
    const state = P.sceneResumeState('crust', {
      identifiedByScene: { crust: { sandstone: 1, shale: 1, limestone: 1, intrusion: 1 } },
      notebook: { evidence: [] },
    });
    expect(state).toMatchObject({
      sceneId: 'crust',
      index: 1,
      key: 'cross-cutting',
      label: 'Find what cuts',
      hasSavedProgress: true,
    });
  });

  it('clamps malformed saved indexes to the scene journey', () => {
    expect(P.sceneResumeState('deepEarth', { deepEarth: 99 })).toMatchObject({ index: 2, key: 'innerCore' });
    expect(P.sceneResumeState('ridge', { ridge: -8 })).toMatchObject({ index: 0, key: 'axialMagma' });
    expect(P.sceneResumeState('unknown', { unknown: 2 })).toMatchObject({ sceneId: 'crust', index: 0, hasSavedProgress: false });
  });
});
