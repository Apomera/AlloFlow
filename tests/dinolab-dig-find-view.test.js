import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing bounded find-view model: ' + start);
  return text.slice(a, b);
}
const I = internals();
const rng = new Function(section(source, '  function mulberry32(seed)', '  // ═') + '\nreturn mulberry32;')();
const H = new Function('mulberry32', 'digRevealedCells',
  section(source, '// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END') + '\n' +
  section(source, '// DINO_VOXEL_DIG_FIND_START', '// DINO_VOXEL_DIG_FIND_END') + '\n' +
  section(source, '// DINO_VOXEL_DIG_FIND_VIEW_START', '// DINO_VOXEL_DIG_FIND_VIEW_END') +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelExcavate,digVoxelRevealed,digVoxelFind,digVoxelFindLook,digVoxelFindCameraPreset,digVoxelFindCameraPatch};'
)(rng, I.digRevealedCells);
const rotationMatches = [...source.matchAll(/bones\[cell\]\.rotation\.y = ([^;]+);/g)];
if (rotationMatches.length !== 1) throw Error('Missing or ambiguous actual excavation fragment rotation');
const renderedRotation = new Function('cell', 'p', 'return ' + rotationMatches[0][1]);
const site = I.digSiteFor(42), layout = H.digVoxelLayout(site);
const bone = layout.columns.find(column => column.hasBone), dry = layout.columns.find(column => !column.hasBone);
const initial = () => H.digVoxelState(null, site, []);
function exposed(actualSite = site, index = bone.index) {
  const state = H.digVoxelState(null, actualSite, []), column = H.digVoxelLayout(actualSite).columns[index];
  state.depths[index] = column.burial; state.focus = index;
  return state;
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function keysDeep(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]);
}
const commands = ['oblique', 'top', 'end'];

describe('strict exposed-find look normalization', () => {
  it('accepts the three meaningful appearances without combining states', () => {
    for (const look of ['surface', 'raking', 'outline']) expect(H.digVoxelFindLook(look)).toBe(look);
  });

  it('defaults malformed and legacy saved look values to the existing surface display', () => {
    for (const value of [undefined, null, '', 'balanced', 'edges', 'raking-outline', 'Raking', 'wireframe', 0, 1, true, false, NaN, Infinity, [], {}, { lighting: 'raking', display: 'outline' }, new String('raking')]) {
      expect(H.digVoxelFindLook(value)).toBe('surface');
    }
  });

  it('does not coerce objects or read diagnostic fields to choose a look', () => {
    const value = { toString() { throw Error('coercion'); }, valueOf() { throw Error('coercion'); } };
    Object.defineProperty(value, 'species', { get() { throw Error('private'); } });
    expect(H.digVoxelFindLook(value)).toBe('surface');
  });
});

describe('momentary observed-only camera shortcuts', () => {
  it('keeps the existing oblique pose and provides a bounded top pose', () => {
    const state = exposed();
    expect(H.digVoxelFindCameraPreset(site, state, bone.index, 'oblique')).toEqual({ yaw: .66, pitch: .62, zoom: 1 });
    expect(H.digVoxelFindCameraPreset(site, state, bone.index, 'top')).toEqual({ yaw: 0, pitch: 1.53, zoom: 1 });
  });

  it('aligns End with the rendered fragment local +X axis across seeds and shapes', () => {
    const shapes = new Set();
    for (const seed of [1, 7, 42, 73, 1000000000]) {
      const actualSite = I.digSiteFor(seed), actualLayout = H.digVoxelLayout(actualSite);
      for (const column of actualLayout.columns.filter(entry => entry.hasBone)) {
        const state = exposed(actualSite, column.index), pose = H.digVoxelFindCameraPreset(actualSite, state, column.index, 'end');
        const rotation = renderedRotation(column.index, { site: { seed: actualLayout.seed } });
        shapes.add(H.digVoxelFind(actualSite, state, column.index).selected.shape);
        expect(pose).toEqual({ yaw: Math.PI / 2 + rotation, pitch: .25, zoom: 1 });
        expect(Math.sin(pose.yaw)).toBeCloseTo(Math.cos(rotation), 12);
        expect(Math.cos(pose.yaw)).toBeCloseTo(-Math.sin(rotation), 12);
        expect(Number.isFinite(pose.yaw)).toBe(true); expect(pose.yaw).toBeGreaterThanOrEqual(Math.PI / 2); expect(pose.yaw).toBeLessThan(Math.PI * 2.5);
      }
    }
    expect([...shapes].sort()).toEqual(['compact', 'curved', 'elongate']);
  });

  it('defaults unknown or legacy camera commands to the current oblique shortcut', () => {
    const state = exposed();
    for (const command of [undefined, null, '', 'side', 'front', 'End', 0, true, NaN, [], {}, new String('top')]) {
      expect(H.digVoxelFindCameraPreset(site, state, bone.index, command)).toEqual({ yaw: .66, pitch: .62, zoom: 1 });
    }
  });

  it('does not enable shortcuts on untouched, partially removed, contacted or cleared empty columns', () => {
    const untouched = initial(), partial = initial(), contact = initial(), cleared = initial();
    partial.depths[bone.index] = 1;
    contact.depths[bone.index] = bone.burial - 1; contact.contacts[bone.index] = true;
    cleared.depths[dry.index] = 4;
    for (const [state, focus] of [[untouched, bone.index], [partial, bone.index], [contact, bone.index], [cleared, dry.index]]) for (const command of commands) {
      expect(H.digVoxelFindCameraPreset(site, state, focus, command)).toBeNull();
      expect(H.digVoxelFindCameraPatch(site, state, focus, command, 5)).toBeNull();
    }
  });

  it('does not substitute another exposed find when the selected column remains covered', () => {
    const state = exposed();
    const otherBone = layout.columns.find(column => column.hasBone && column.index !== bone.index);
    for (const focus of [dry.index, otherBone.index]) for (const command of commands) {
      expect(H.digVoxelFind(site, state, focus).finds).toHaveLength(1);
      expect(H.digVoxelFindCameraPreset(site, state, focus, command)).toBeNull();
      expect(H.digVoxelFindCameraPatch(site, state, focus, command, 9)).toBeNull();
    }
  });

  it('uses the normalized selected focus without coercing corrupt explicit values', () => {
    const state = exposed();
    for (const focus of [undefined, null, -1, 24, 3.2, NaN, Infinity, '23', {}, []]) {
      expect(H.digVoxelFindCameraPreset(site, state, focus, 'end')).toEqual(H.digVoxelFindCameraPreset(site, state, bone.index, 'end'));
    }
    expect(H.digVoxelFindCameraPreset(site, state, dry.index, 'end')).toBeNull();
    const corrupt = { ...state, focus: String(bone.index) };
    expect(H.digVoxelFindCameraPreset(site, corrupt, undefined, 'oblique')).toEqual(H.digVoxelFind(site, corrupt).selected ? { yaw: .66, pitch: .62, zoom: 1 } : null);
  });

  it('rejects stale site payloads and respects only current-site legacy exposure', () => {
    const stale = { ...exposed(), seed: site.seed + 1 };
    for (const command of commands) expect(H.digVoxelFindCameraPreset(site, stale, bone.index, command)).toBeNull();
    const migrated = H.digVoxelState(null, site, [bone.index, dry.index]);
    expect(H.digVoxelFindCameraPreset(site, migrated, bone.index, 'oblique')).not.toBeNull();
    expect(H.digVoxelFindCameraPreset(site, migrated, dry.index, 'oblique')).toBeNull();
  });

  it('uses the bounded model seed for the visible teaching rotation', () => {
    for (const seed of [undefined, null, -1, 0, 1.5, NaN, Infinity, 1000000001, '42']) {
      const actualSite = { ...site, seed }, actualLayout = H.digVoxelLayout(actualSite);
      const state = exposed(actualSite, bone.index), pose = H.digVoxelFindCameraPreset(actualSite, state, bone.index, 'end');
      expect(actualLayout.seed).toBe(1);
      expect(pose.yaw).toBe(Math.PI / 2 + renderedRotation(bone.index, { site: { seed: 1 } }));
      expect(pose).toMatchObject({ pitch: .25, zoom: 1 });
    }
  });
});

describe('independent find pose bank and unchanged observations', () => {
  it('returns only the find pose/reset patch and preserves every other progress bank', () => {
    const state = exposed();
    const progress = freeze({ digVoxel: structuredClone(state), digVoxelPose: { yaw: .3, pitch: .8, zoom: .9 }, digVoxelCameraReset: 4,
      digVoxelSectionPose: { yaw: -.3, pitch: .24, zoom: 1.1 }, digVoxelSectionReset: 6,
      digVoxelFindPose: { yaw: 2.1, pitch: .4, zoom: 1.4 }, digVoxelFindReset: 7,
      digRevealed: H.digVoxelRevealed(site, state), digVoxelUndo: [initial()], digCitedClues: ['period'], digGuess: site.chosen.id, digChecked: true, notebook: ['observed outline'] });
    for (const command of commands) {
      const patch = H.digVoxelFindCameraPatch(site, progress.digVoxel, bone.index, command, progress.digVoxelFindReset);
      expect(Object.keys(patch).sort()).toEqual(['digVoxelFindPose', 'digVoxelFindReset']);
      expect(patch.digVoxelFindReset).toBe(8);
      const after = { ...progress, ...patch };
      for (const key of Object.keys(progress).filter(key => key !== 'digVoxelFindPose' && key !== 'digVoxelFindReset')) expect(after[key]).toBe(progress[key]);
      expect(after.digVoxelFindPose).toEqual(H.digVoxelFindCameraPreset(site, state, bone.index, command));
    }
  });

  it('increments valid find reset counters while safely restarting corrupt or exhausted counters', () => {
    const state = exposed();
    for (const reset of [0, 1, 7, 300, Number.MAX_SAFE_INTEGER - 1]) {
      expect(H.digVoxelFindCameraPatch(site, state, bone.index, 'top', reset).digVoxelFindReset).toBe(reset + 1);
    }
    for (const reset of [undefined, null, -1, 1.5, '7', NaN, Infinity, {}, [], Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]) {
      expect(H.digVoxelFindCameraPatch(site, state, bone.index, 'top', reset).digVoxelFindReset).toBe(1);
    }
  });

  it('returns fresh poses and accepts frozen site/progress inputs', () => {
    const actualSite = freeze(structuredClone(site)), state = freeze(exposed());
    const first = H.digVoxelFindCameraPatch(actualSite, state, bone.index, 'end', 7), pristine = structuredClone(first);
    first.digVoxelFindPose.yaw = 99; first.digVoxelFindReset = 99;
    expect(H.digVoxelFindCameraPatch(actualSite, state, bone.index, 'end', 7)).toEqual(pristine);
    const pose = H.digVoxelFindCameraPreset(actualSite, state, bone.index, 'oblique'); pose.zoom = 99;
    expect(H.digVoxelFindCameraPreset(actualSite, state, bone.index, 'oblique')).toEqual({ yaw: .66, pitch: .62, zoom: 1 });
  });

  it('produces identical camera choices when other hidden placements and catalog data differ', () => {
    const other = { seed: site.seed, boneCells: { [bone.index]: true } }, state = exposed();
    for (const key of ['chosen', 'clues', 'species', 'candidates', 'anatomy']) Object.defineProperty(other, key, { get() { throw Error('private metadata read'); } });
    for (const command of commands) {
      const patch = H.digVoxelFindCameraPatch(site, state, bone.index, command, 2);
      expect(H.digVoxelFindCameraPatch(other, state, bone.index, command, 2)).toEqual(patch);
      for (const key of ['hasBone', 'burial', 'fossilY', 'coverRemaining', 'species', 'anatomy', 'chosen', 'clues', 'index', 'seed']) expect(keysDeep(patch)).not.toContain(key);
    }
  });

  it('changes no layers, contacts, find records, revealed cells or available clues', () => {
    const state = exposed(), snapshot = structuredClone(state), finds = H.digVoxelFind(site, state, bone.index), revealed = H.digVoxelRevealed(site, state);
    const evidence = I.digEvidenceCheck(site, { digRevealed: revealed, digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) });
    for (const look of ['surface', 'raking', 'outline']) for (const command of commands) {
      H.digVoxelFindLook(look); H.digVoxelFindCameraPatch(site, state, bone.index, command, 2);
    }
    expect(state).toEqual(snapshot); expect(H.digVoxelFind(site, state, bone.index)).toEqual(finds); expect(H.digVoxelRevealed(site, state)).toEqual(revealed);
    expect(I.digEvidenceCheck(site, { digRevealed: H.digVoxelRevealed(site, state), digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) })).toEqual(evidence);
  });

  it('disables a covered selection after Undo and allows commands again only after re-exposure', () => {
    const before = initial(); before.depths[bone.index] = bone.burial - 1; before.contacts[bone.index] = true; before.focus = bone.index;
    const exposedState = H.digVoxelExcavate(site, before, bone.index, 'brush').state;
    const patch = H.digVoxelFindCameraPatch(site, exposedState, bone.index, 'end', 3);
    expect(patch).not.toBeNull();
    expect(H.digVoxelFindCameraPatch(site, before, bone.index, 'end', 4)).toBeNull();
    const reExposed = H.digVoxelExcavate(site, before, bone.index, 'brush').state;
    expect(H.digVoxelFindCameraPatch(site, reExposed, bone.index, 'end', 3)).toEqual(patch);
    expect(before.contacts[bone.index]).toBe(true); expect(before.depths[bone.index]).toBe(bone.burial - 1);
  });

  it('ships identical bounded display helpers in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(section(mirror, '// DINO_VOXEL_DIG_FIND_VIEW_START', '// DINO_VOXEL_DIG_FIND_VIEW_END'))
      .toBe(section(source, '// DINO_VOXEL_DIG_FIND_VIEW_START', '// DINO_VOXEL_DIG_FIND_VIEW_END'));
  });
});
