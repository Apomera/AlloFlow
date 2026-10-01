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

describe('Geology Explorer scene schematics', () => {
  it.each([
    ['geode', 'Crystal cavern 2D evidence map', 'chalcedony'],
    ['deepEarth', 'Deep Earth 2D evidence map', 'upperMantle'],
    ['subduction', 'Subduction zone 2D evidence map', 'slab'],
    ['ridge', 'Mid-ocean ridge 2D evidence map', 'axialMagma'],
    ['hotspot', 'Hotspot chain 2D evidence map', 'activeVolcano'],
  ])('describes the active evidence map for %s', (sceneId, title, activeKey) => {
    const info = P.schematicInfo(sceneId, null, 0);
    expect(info).toMatchObject({ sceneId, title, activeIndex: 0, activeKey, selectedKey: null });
    expect(info.description.length).toBeGreaterThan(40);
    expect(info.ariaLabel).toContain(title);
    expect(info.ariaLabel).toContain('Active process stage:');
  });

  it('combines selected material and active process stage in the accessible summary', () => {
    const info = P.schematicInfo('geode', 'quartz', 2);
    expect(info).toMatchObject({ activeIndex: 2, activeKey: 'quartz', selectedKey: 'quartz', selectedLabel: 'Quartz crystal' });
    expect(info.activeLabel).toContain('Open-space crystals');
    expect(info.ariaLabel).toContain('Selected material: Quartz crystal.');
  });

  it('clamps out-of-range stages and ignores materials from another palette', () => {
    expect(P.schematicInfo('ridge', 'quartz', 99)).toMatchObject({ activeIndex: 2, activeKey: 'basaltR', selectedKey: null });
    expect(P.schematicInfo('unknown-scene', null, -4)).toMatchObject({ sceneId: 'geode', activeIndex: 0 });
  });

  it('pairs selection, active-stage, and focus state without relying on color alone', () => {
    expect(P.schematicState('quartz', 'quartz', 'quartz', true)).toEqual({ selected: true, active: true, focusState: 'match', state: 'selected-active', opacity: 1 });
    expect(P.schematicState('quartz', 'quartz', 'agate', false).state).toBe('selected');
    expect(P.schematicState('agate', 'quartz', 'agate', false).state).toBe('active');
    expect(P.schematicState('agate', 'quartz', 'chalcedony', true)).toEqual({ selected: false, active: false, focusState: 'muted', state: 'muted', opacity: 0.18 });
    expect(P.schematicState('agate', null, 'chalcedony', true).state).toBe('context');
  });
});
