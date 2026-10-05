import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const mainBytes = readFileSync('stem_lab/stem_tool_dinolab.js');
const source = mainBytes.toString('utf8').replace(/\r\n/g, '\n');
function fragment(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous exposed-find plate seam: ' + start);
  return text.slice(a, b);
}
const I = internals();
const rng = new Function(fragment(source, '  function mulberry32(seed)', '  // ═') + '\nreturn mulberry32;')();
const model = fragment(source, '// DINO_VOXEL_DIG_FIND_PLATE_START', '// DINO_VOXEL_DIG_FIND_PLATE_END');
const H = new Function('mulberry32', 'digRevealedCells',
  fragment(source, '// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END') + '\n' +
  fragment(source, '// DINO_VOXEL_DIG_FIND_START', '// DINO_VOXEL_DIG_FIND_END') + '\n' +
  fragment(source, '// DINO_VOXEL_DIG_FIND_VIEW_START', '// DINO_VOXEL_DIG_FIND_VIEW_END') + '\n' + model +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelExcavate,digVoxelRevealed,digVoxelFind,digVoxelFindLook,digVoxelFindCameraPreset,digVoxelFindCameraPatch,digVoxelFindPlate};'
)(rng, I.digRevealedCells);
const site = I.digSiteFor(42), layout = H.digVoxelLayout(site), bone = layout.columns.find(column => column.hasBone), dry = layout.columns.find(column => !column.hasBone);
const initial = () => H.digVoxelState(null, site, []);
const record = (index = 0, removed = 2) => ({ index, row: Math.floor(index / 6), col: index % 6, coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1),
  removed, remaining: 4 - removed, shape: ['curved', 'elongate', 'compact'][index % 3] });
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function expectPublic(plate) {
  expect(Object.keys(plate).sort()).toEqual(['coord', 'index', 'key', 'look', 'remaining', 'removed', 'seed', 'shape', 'views']);
  expect(plate.views.map(view => view.id)).toEqual(['oblique', 'top', 'end']);
  for (const view of plate.views) expect(Object.keys(view).sort()).toEqual(['id', 'pitch', 'yaw', 'zoom']);
}
function beforeContact() {
  let state = initial();
  for (let i = 0; i < bone.burial - 1; i++) state = H.digVoxelExcavate(site, state, bone.index, 'brush').state;
  return state;
}
function currentPlate(actualSite, state, focus, look) { return H.digVoxelFindPlate(actualSite.seed, H.digVoxelFind(actualSite, state, focus).selected, look); }

describe('three-view descriptors for current exposed illustrative finds', () => {
  it('copies the exact public find fields and names the three fixed viewpoints', () => {
    const selected = record(7, 3), result = H.digVoxelFindPlate(42, selected, 'raking');
    expectPublic(result);
    expect(result).toMatchObject({ key: '42:7:3:elongate:raking', seed: 42, index: 7, coord: 'B2', shape: 'elongate', removed: 3, remaining: 1, look: 'raking' });
    expect(result.views[0]).toEqual({ id: 'oblique', yaw: .66, pitch: .62, zoom: 1 });
    expect(result.views[1]).toEqual({ id: 'top', yaw: 0, pitch: 1.53, zoom: 1 });
  });

  it('supports each canonical coordinate, illustrative shape and permitted cover count without inventing units', () => {
    for (let index = 0; index < 24; index++) for (const removed of [2, 3, 4]) {
      const selected = record(index, removed), result = H.digVoxelFindPlate(1, selected, 'surface');
      expectPublic(result); expect(result.coord).toBe(selected.coord); expect(result.shape).toBe(selected.shape);
      expect(result.removed).toBe(removed); expect(result.remaining).toBe(4 - removed);
      expect(result.key).toBe('1:' + index + ':' + removed + ':' + selected.shape + ':surface');
    }
  });

  it('matches actual existing oblique, top and end camera shortcut angles for exposed finds across seeds', () => {
    const all = Array.from({ length: 24 }, (_, index) => index);
    for (const seed of [1, 42, 73, 1000000000]) {
      const actualSite = I.digSiteFor(seed), state = H.digVoxelState(null, actualSite, all), model = H.digVoxelFind(actualSite, state, 0);
      for (const find of model.finds) {
        const result = H.digVoxelFindPlate(seed, find, 'outline');
        for (const view of result.views) {
          const preset = H.digVoxelFindCameraPreset(actualSite, state, find.index, view.id);
          expect({ yaw: view.yaw, pitch: view.pitch, zoom: view.zoom }).toEqual(preset);
        }
      }
    }
  });

  it('keeps every plate camera descriptor finite and within the existing orbit domain', () => {
    for (const seed of [1, 42, 1000000000]) for (let index = 0; index < 24; index++) {
      const result = H.digVoxelFindPlate(seed, record(index), 'surface');
      for (const view of result.views) {
        expect([view.yaw, view.pitch, view.zoom].every(Number.isFinite)).toBe(true);
        expect(view.yaw).toBeGreaterThanOrEqual(0); expect(view.yaw).toBeLessThan(Math.PI * 2 + Math.PI / 2);
        expect(view.pitch).toBeGreaterThanOrEqual(.12); expect(view.pitch).toBeLessThanOrEqual(1.53); expect(view.zoom).toBe(1);
      }
    }
  });

  it('preserves exact display tokens and normalizes all other values to surface without coercion', () => {
    const selected = record(23, 4);
    for (const look of ['surface', 'raking', 'outline']) expect(H.digVoxelFindPlate(42, selected, look).look).toBe(look);
    const hostile = { toString() { throw Error('look toString'); }, valueOf() { throw Error('look valueOf'); } };
    for (const look of [undefined, null, '', 'Raking', 'outline ', 0, true, [], {}, new String('outline'), hostile]) {
      expect(() => H.digVoxelFindPlate(42, selected, look)).not.toThrow();
      expect(H.digVoxelFindPlate(42, selected, look)).toEqual(H.digVoxelFindPlate(42, selected, 'surface'));
      expect(H.digVoxelFindLook(look)).toBe('surface');
    }
  });

  it('changes the cache key only when the public seed, coordinate, removal count, shape or look changes', () => {
    const a = H.digVoxelFindPlate(42, record(0, 2), 'surface');
    for (const b of [H.digVoxelFindPlate(43, record(0, 2), 'surface'), H.digVoxelFindPlate(42, record(1, 2), 'surface'), H.digVoxelFindPlate(42, record(0, 3), 'surface'), H.digVoxelFindPlate(42, record(0, 2), 'raking'), H.digVoxelFindPlate(42, record(0, 2), 'outline')]) expect(b.key).not.toBe(a.key);
    expect(H.digVoxelFindPlate(42, { ...record(), pose: { yaw: 1 }, cameraReset: 99, guess: 'hidden' }, 'surface').key).toBe(a.key);
  });

  it('has no plate for unopened, partly removed, contact or cleared selections in the actual find model', () => {
    const before = beforeContact(), contact = H.digVoxelExcavate(site, before, bone.index, 'trowel').state;
    let cleared = initial(); for (let i = 0; i < 4; i++) cleared = H.digVoxelExcavate(site, cleared, dry.index, 'brush').state;
    for (const [state, focus] of [[initial(), bone.index], [before, bone.index], [contact, bone.index], [cleared, dry.index]]) {
      expect(H.digVoxelFind(site, state, focus).selected).toBeNull(); expect(currentPlate(site, state, focus, 'surface')).toBeNull();
    }
  });

  it('creates a plate only at actual exposure and clears it when Undo restores a covered contact', () => {
    const contact = H.digVoxelExcavate(site, beforeContact(), bone.index, 'trowel').state, before = structuredClone(contact);
    const exposed = H.digVoxelExcavate(site, contact, bone.index, 'brush').state, after = structuredClone(exposed);
    const result = currentPlate(site, exposed, bone.index, 'raking');
    expectPublic(result); expect(result).toMatchObject({ index: bone.index, coord: bone.coord, removed: bone.burial, remaining: 4 - bone.burial });
    expect(currentPlate(site, before, bone.index, 'raking')).toBeNull(); expect(contact).toEqual(before); expect(exposed).toEqual(after);
  });

  it('handles migrated exposures and discards stale-site eligibility through the existing find normalizer', () => {
    const migrated = H.digVoxelState(null, site, [bone.index, dry.index]);
    expectPublic(currentPlate(site, migrated, bone.index, 'surface')); expect(currentPlate(site, migrated, dry.index, 'surface')).toBeNull();
    expect(currentPlate(site, { ...migrated, seed: site.seed + 1 }, bone.index, 'surface')).toBeNull();
  });
});

describe('bounded public input validation', () => {
  it('requires an integer bounded seed and ignores the selected object entirely when the seed is invalid', () => {
    const selected = new Proxy(record(), { get() { throw Error('Selected read for invalid seed'); } });
    for (const seed of [undefined, null, -1, 0, 1000000001, 1.5, NaN, Infinity, '42', true, {}, []]) expect(H.digVoxelFindPlate(seed, selected, 'surface')).toBeNull();
    expectPublic(H.digVoxelFindPlate(1, record(), 'surface')); expectPublic(H.digVoxelFindPlate(1000000000, record(), 'surface'));
  });

  it('rejects absent and non-object selected finds instead of inferring exposure from other state', () => {
    for (const selected of [undefined, null, false, true, 0, 42, '', 'exposed', [], [record()], () => record()]) expect(H.digVoxelFindPlate(42, selected, 'surface')).toBeNull();
  });

  it('requires canonical integer index, row, col and exact selected coordinate', () => {
    const invalid = { index: [-1, 24, .5, NaN, Infinity, '0', null, undefined], row: [-1, 1, .5, '0', null, undefined], col: [-1, 1, .5, '0', null, undefined], coord: ['', 'a1', 'A0', 'A2', 'A1 ', 0, null, undefined] };
    for (const [field, values] of Object.entries(invalid)) for (const value of values) expect(H.digVoxelFindPlate(42, { ...record(), [field]: value }, 'surface')).toBeNull();
  });

  it('accepts only the recorded illustrative shape for that column without anatomical labels', () => {
    for (let index = 0; index < 24; index++) for (const shape of [undefined, null, '', 'Curved', 'curved ', 'rib', 'vertebra', 'claw', 'curved', 'elongate', 'compact', {}, []]) {
      const result = H.digVoxelFindPlate(42, { ...record(index), shape }, 'surface');
      if (shape === record(index).shape) expect(result.shape).toBe(shape); else expect(result).toBeNull();
    }
  });

  it('requires integer complementary removal/remaining counts compatible with exposure', () => {
    for (const [field, values] of [['removed', [undefined, null, -1, 0, 1, 5, 999, 2.5, NaN, Infinity, '2', true, {}, []]], ['remaining', [undefined, null, -1, 3, 4, 999, 1.5, NaN, Infinity, '2', true, {}, []]]]) {
      for (const value of values) expect(H.digVoxelFindPlate(42, { ...record(), [field]: value }, 'surface')).toBeNull();
    }
    for (const removed of [2, 3, 4]) for (const remaining of [0, 1, 2]) {
      const result = H.digVoxelFindPlate(42, { ...record(), removed, remaining }, 'surface');
      if (removed + remaining === 4) expect(result).toMatchObject({ removed, remaining }); else expect(result).toBeNull();
    }
  });

  it('never invokes user-defined coercion on malformed required fields', () => {
    const hostile = { toString() { throw Error('toString'); }, valueOf() { throw Error('valueOf'); } };
    expect(H.digVoxelFindPlate(hostile, record(), 'surface')).toBeNull();
    for (const field of ['index', 'row', 'col', 'coord', 'removed', 'remaining', 'shape']) {
      const selected = { ...record(), [field]: hostile }; expect(() => H.digVoxelFindPlate(42, selected, 'surface')).not.toThrow(); expect(H.digVoxelFindPlate(42, selected, 'surface')).toBeNull();
    }
  });
});

describe('side-effect-free view descriptor boundary', () => {
  it('returns fresh views and objects isolated from frozen source records and other calls', () => {
    const selected = freeze(record(17, 3)), before = JSON.stringify(selected), first = H.digVoxelFindPlate(42, selected, 'outline'), second = H.digVoxelFindPlate(42, selected, 'outline');
    expectPublic(first); expect(first).not.toBe(selected); expect(first).not.toBe(second); expect(first.views).not.toBe(second.views);
    first.views.forEach((view, index) => expect(view).not.toBe(second.views[index]));
    first.views[0].yaw = NaN; first.views[1].id = 'species'; first.views.push({ hidden: true }); first.coord = 'Z9';
    expect(H.digVoxelFindPlate(42, selected, 'outline')).toEqual(second); expect(JSON.stringify(selected)).toBe(before);
  });

  it('ignores enumerable hidden getters and action or camera metadata without reading or copying them', () => {
    const selected = record(13, 3), expected = H.digVoxelFindPlate(42, selected, 'raking');
    for (const key of ['status', 'hasBone', 'burial', 'fossilY', 'coverRemaining', 'layers', 'finds', 'site', 'state', 'chosen', 'species', 'identity', 'anatomy', 'clues', 'catalog', 'age', 'association', 'action', 'onSelect', 'pose', 'camera', 'cameraReset']) {
      Object.defineProperty(selected, key, { enumerable: true, get() { throw Error('Hidden plate read: ' + key); } });
    }
    expect(() => H.digVoxelFindPlate(42, selected, 'raking')).not.toThrow(); expect(H.digVoxelFindPlate(42, selected, 'raking')).toEqual(expected); expectPublic(H.digVoxelFindPlate(42, selected, 'raking'));
  });

  it('captures required public fields once without enumerating the source record', () => {
    const selected = record(21, 4), expected = H.digVoxelFindPlate(42, selected, 'surface'), reads = [];
    const protectedRecord = new Proxy(selected, { ownKeys() { throw Error('Plate enumerated source'); }, get(target, key) { if (!['index', 'row', 'col', 'coord', 'removed', 'remaining', 'shape'].includes(key)) throw Error('Unexpected plate read: ' + String(key)); reads.push(key); return target[key]; } });
    expect(H.digVoxelFindPlate(42, protectedRecord, 'surface')).toEqual(expected); expect(reads).toHaveLength(7); expect(new Set(reads).size).toBe(7);
  });

  it('keeps excavation, discovery, evidence and all camera pose banks unchanged', () => {
    const state = H.digVoxelState(null, site, [bone.index, dry.index]), before = structuredClone(state), selected = H.digVoxelFind(site, state, bone.index).selected;
    const banks = freeze({ digVoxelPose: { yaw: .8, pitch: .7, zoom: 1.2 }, digVoxelSectionPose: { yaw: .2, pitch: .3, zoom: .9 }, digVoxelFindPose: { yaw: 1.2, pitch: .4, zoom: 1.3 }, digVoxelFindReset: 6 });
    const savedBanks = JSON.stringify(banks), revealed = H.digVoxelRevealed(site, state), evidenceInput = { digRevealed: revealed, digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) }, evidence = I.digEvidenceCheck(site, evidenceInput);
    for (const look of ['surface', 'raking', 'outline']) expectPublic(H.digVoxelFindPlate(site.seed, { ...selected, ...banks }, look));
    expect(state).toEqual(before); expect(H.digVoxelRevealed(site, state)).toEqual(revealed); expect(I.digEvidenceCheck(site, evidenceInput)).toEqual(evidence); expect(JSON.stringify(banks)).toBe(savedBanks);
  });

  it('ships identical application bytes and the exact bounded descriptor in the desktop mirror', () => {
    const mirrorBytes = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js');
    expect(mirrorBytes.equals(mainBytes)).toBe(true);
    expect(fragment(mirrorBytes.toString('utf8').replace(/\r\n/g, '\n'), '// DINO_VOXEL_DIG_FIND_PLATE_START', '// DINO_VOXEL_DIG_FIND_PLATE_END')).toBe(model);
  });
});
