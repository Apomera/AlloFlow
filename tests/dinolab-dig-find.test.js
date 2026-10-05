import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing bounded dig section: ' + start);
  return text.slice(a, b);
}
const I = internals();
const rng = new Function(section(source, '  function mulberry32(seed)', '  // ═') + '\nreturn mulberry32;')();
const H = new Function('mulberry32', 'digRevealedCells',
  section(source, '// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END') + '\n' +
  section(source, '// DINO_VOXEL_DIG_FIND_START', '// DINO_VOXEL_DIG_FIND_END') +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelColumn,digVoxelExcavate,digVoxelRevealed,digVoxelFind};'
)(rng, I.digRevealedCells);
const site = I.digSiteFor(42), layout = H.digVoxelLayout(site);
const bone = layout.columns.find(column => column.hasBone), dry = layout.columns.find(column => !column.hasBone);
const initial = () => H.digVoxelState(null, site, []);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function keysDeep(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]);
}
function brushTo(actualSite, raw, column, removed) {
  let state = raw;
  for (let step = state.depths[column.index]; step < removed; step++) state = H.digVoxelExcavate(actualSite, state, column.index, 'brush').state;
  return state;
}
function expectedFind(column, removed) {
  return { index: column.index, coord: column.coord, row: column.row, col: column.col,
    removed, remaining: 4 - removed, shape: ['curved', 'elongate', 'compact'][column.index % 3] };
}

describe('exposed-only fragment inspection', () => {
  it('keeps an untouched site blank for every selected column', () => {
    for (let focus = 0; focus < 24; focus++) {
      expect(H.digVoxelFind(site, initial(), focus)).toEqual({ focus, coord: layout.columns[focus].coord, finds: [], selected: null });
    }
  });

  it('does not expose a fragment before brush removal reaches its actual cover limit', () => {
    for (const seed of [1, 7, 42, 73, 1000000000]) {
      const actualSite = I.digSiteFor(seed), actualLayout = H.digVoxelLayout(actualSite);
      for (const column of actualLayout.columns.filter(entry => entry.hasBone)) {
        let state = H.digVoxelState(null, actualSite, []);
        for (let removed = 0; removed <= column.burial; removed++) {
          const view = H.digVoxelFind(actualSite, state, column.index);
          if (removed < column.burial) expect(view).toMatchObject({ finds: [], selected: null });
          else {
            expect(view.finds).toEqual([expectedFind(column, column.burial)]);
            expect(view.selected).toEqual(view.finds[0]);
          }
          if (removed < column.burial) state = H.digVoxelExcavate(actualSite, state, column.index, 'brush').state;
        }
      }
    }
  });

  it('excludes covered contacts until a brush exposes the fragment', () => {
    const beforeContact = brushTo(site, initial(), bone, bone.burial - 1);
    const contact = H.digVoxelExcavate(site, beforeContact, bone.index, 'trowel').state;
    expect(contact.contacts[bone.index]).toBe(true);
    expect(H.digVoxelFind(site, contact, bone.index)).toMatchObject({ finds: [], selected: null });
    const exposed = H.digVoxelExcavate(site, contact, bone.index, 'brush').state;
    expect(H.digVoxelFind(site, exposed, bone.index).selected).toEqual(expectedFind(bone, bone.burial));
    expect(exposed.contacts[bone.index]).toBe(false);
  });

  it('never invents a fragment from fully cleared empty ground', () => {
    const cleared = brushTo(site, initial(), dry, 4);
    expect(H.digVoxelRevealed(site, cleared)).toContain(dry.index);
    expect(H.digVoxelFind(site, cleared, dry.index)).toEqual({ focus: dry.index, coord: dry.coord, finds: [], selected: null });
  });

  it('returns exposed finds in row-major order with exactly the public schematic fields', () => {
    const state = initial(), bones = layout.columns.filter(column => column.hasBone);
    bones.forEach(column => { state.depths[column.index] = column.burial; });
    state.depths[dry.index] = 4;
    const view = H.digVoxelFind(site, state, bone.index);
    expect(view.finds).toEqual(bones.map(column => expectedFind(column, column.burial)));
    expect(view.finds.map(find => find.index)).toEqual([...view.finds.map(find => find.index)].sort((a, b) => a - b));
    expect(new Set(view.finds.map(find => find.row)).size).toBeGreaterThan(1);
    for (const find of view.finds) expect(Object.keys(find).sort()).toEqual(['col', 'coord', 'index', 'remaining', 'removed', 'row', 'shape']);
    expect(Object.keys(view).sort()).toEqual(['coord', 'finds', 'focus', 'selected']);
  });

  it('matches the three illustrative mesh shapes without assigning anatomical identity', () => {
    const synthetic = { ...site, boneCells: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [index, true])) };
    const actualLayout = H.digVoxelLayout(synthetic), state = H.digVoxelState(null, synthetic, []);
    actualLayout.columns.forEach(column => { state.depths[column.index] = column.burial; });
    const view = H.digVoxelFind(synthetic, state, 0);
    expect(view.finds).toHaveLength(24);
    expect(view.finds.slice(0, 6).map(find => find.shape)).toEqual(['curved', 'elongate', 'compact', 'curved', 'elongate', 'compact']);
    for (const find of view.finds) expect(find).toEqual(expectedFind(actualLayout.columns[find.index], actualLayout.columns[find.index].burial));
    for (const forbidden of ['anatomy', 'species', 'chosen', 'catalogId', 'skeletalPart']) expect(keysDeep(view)).not.toContain(forbidden);
  });

  it('selects only the requested exposed fragment without falling back to another find', () => {
    const bones = layout.columns.filter(column => column.hasBone), state = initial();
    bones.slice(0, 2).forEach(column => { state.depths[column.index] = column.burial; });
    for (const column of bones.slice(0, 2)) {
      const view = H.digVoxelFind(site, state, column.index);
      expect(view.selected).toBe(view.finds.find(find => find.index === column.index));
    }
    for (const focus of [dry.index, bones[2].index]) {
      const view = H.digVoxelFind(site, state, focus);
      expect(view.finds).toHaveLength(2); expect(view.selected).toBeNull();
      expect(view).toMatchObject({ focus, coord: layout.columns[focus].coord });
    }
  });

  it('keeps a selected contact blank even when a different fragment is already exposed', () => {
    const other = layout.columns.find(column => column.hasBone && column.index !== bone.index), state = initial();
    state.depths[bone.index] = bone.burial - 1; state.contacts[bone.index] = true; state.depths[other.index] = other.burial;
    const view = H.digVoxelFind(site, state, bone.index);
    expect(view.finds).toEqual([expectedFind(other, other.burial)]);
    expect(view.selected).toBeNull();
  });

  it('removes a just-exposed find after Undo and restores it only upon re-exposure', () => {
    const other = layout.columns.find(column => column.hasBone && column.index !== bone.index);
    let before = brushTo(site, initial(), other, other.burial);
    before = brushTo(site, before, bone, bone.burial - 1);
    before.contacts[bone.index] = true;
    const snapshot = structuredClone(before), beforeView = H.digVoxelFind(site, before, bone.index);
    const exposed = H.digVoxelExcavate(site, before, bone.index, 'brush').state;
    const exposedView = H.digVoxelFind(site, exposed, bone.index);
    expect(exposedView.selected).toEqual(expectedFind(bone, bone.burial));
    const undoView = H.digVoxelFind(site, snapshot, bone.index);
    expect(undoView).toEqual(beforeView); expect(undoView.selected).toBeNull();
    expect(undoView.finds).toEqual([expectedFind(other, other.burial)]);
    const reExposed = H.digVoxelExcavate(site, snapshot, bone.index, 'brush').state;
    expect(H.digVoxelFind(site, reExposed, bone.index)).toEqual(exposedView);
    expect(before).toEqual(snapshot);
  });
});

describe('private, bounded and selection-only find data', () => {
  it('returns identical blank observations when hidden placements and catalog data differ', () => {
    const other = { ...site, chosen: { id: 'hidden-identity' }, clues: [{ text: 'hidden clue' }], boneCells: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [index, !site.boneCells[index]])) };
    const state = initial(); state.depths.fill(1);
    for (const focus of [0, 7, 13, 23]) expect(H.digVoxelFind(site, state, focus)).toEqual(H.digVoxelFind(other, state, focus));
  });

  it('keeps an observed find identical when all remaining hidden placements change', () => {
    const other = { ...site, chosen: { id: 'secret' }, boneCells: { [bone.index]: true } }, state = initial();
    state.depths.fill(1); state.depths[bone.index] = bone.burial;
    for (const focus of [bone.index, dry.index]) expect(H.digVoxelFind(site, state, focus)).toEqual(H.digVoxelFind(other, state, focus));
    const view = H.digVoxelFind(site, state, bone.index);
    for (const forbidden of ['hasBone', 'burial', 'coverRemaining', 'fossilY', 'chosen', 'species', 'candidates', 'clues', 'contacts', 'anatomy', 'state', 'revealed']) expect(keysDeep(view)).not.toContain(forbidden);
    expect(JSON.stringify(view)).not.toContain(site.chosen.id);
  });

  it('does not read catalog identity or diagnostic metadata to create a find', () => {
    const restricted = { seed: site.seed, boneCells: site.boneCells };
    for (const key of ['chosen', 'clues', 'candidates', 'species', 'anatomy']) Object.defineProperty(restricted, key, { get() { throw new Error('Find inspector accessed private catalog data: ' + key); } });
    const exposed = brushTo(site, initial(), bone, bone.burial);
    expect(H.digVoxelFind(restricted, exposed, bone.index).selected).toEqual(expectedFind(bone, bone.burial));
  });

  it('uses a normalized focus fallback without coercing corrupt explicit selections', () => {
    const state = { ...initial(), focus: 17 };
    for (const focus of [undefined, null, -1, 24, 3.2, NaN, Infinity, '23', {}, []]) expect(H.digVoxelFind(site, state, focus)).toMatchObject({ focus: 17, coord: 'F3', selected: null });
    expect(H.digVoxelFind(site, state, 0)).toMatchObject({ focus: 0, coord: 'A1' });
    expect(H.digVoxelFind(site, { ...state, focus: '17' }, null)).toMatchObject({ focus: 0, coord: 'A1' });
  });

  it('discards stale site progress and malformed state versions before inspecting finds', () => {
    const stale = { version: 1, seed: site.seed + 1, depths: Array(24).fill(4), contacts: Array(24).fill(true), tool: 'trowel', focus: 23 };
    expect(H.digVoxelFind(site, stale)).toEqual(H.digVoxelFind(site, null));
    expect(H.digVoxelFind(site, stale, 23)).toEqual({ focus: 23, coord: 'F4', finds: [], selected: null });
    for (const raw of [null, undefined, [], 42, 'bad', { ...stale, seed: String(site.seed) }, { ...stale, seed: site.seed, version: 99 }]) expect(H.digVoxelFind(site, raw)).toEqual(H.digVoxelFind(site, null));
    const oldExposed = brushTo(site, initial(), bone, bone.burial), newSite = I.digSiteFor(43);
    expect(H.digVoxelFind(newSite, oldExposed, bone.index)).toMatchObject({ finds: [], selected: null });
  });

  it('bounds corrupt depths and emits only finite normalized public fields', () => {
    const corrupt = initial(); corrupt.depths = Array(30).fill(999); corrupt.contacts = Array(30).fill(true); corrupt.focus = NaN;
    const view = H.digVoxelFind(site, corrupt);
    const bones = layout.columns.filter(column => column.hasBone);
    expect(view).toMatchObject({ focus: 0, coord: 'A1' });
    expect(view.finds).toEqual(bones.map(column => expectedFind(column, column.burial)));
    for (const bad of ['4', -5, NaN, Infinity, {}, null, 1.5]) {
      const invalid = initial(); invalid.depths[bone.index] = bad; invalid.contacts[bone.index] = true;
      expect(H.digVoxelFind(site, invalid, bone.index)).toMatchObject({ finds: [], selected: null });
    }
    for (const find of view.finds) {
      expect(Number.isInteger(find.removed)).toBe(true); expect(find.removed).toBeGreaterThanOrEqual(2); expect(find.removed).toBeLessThanOrEqual(4);
      expect(find.remaining).toBe(4 - find.removed); expect(Number.isFinite(find.row)).toBe(true); expect(Number.isFinite(find.col)).toBe(true);
    }
  });

  it('preserves current-site legacy migration while excluding legacy cleared ground', () => {
    const migrated = H.digVoxelState(null, site, [bone.index, dry.index]);
    expect(H.digVoxelFind(site, migrated, bone.index).finds).toEqual([expectedFind(bone, bone.burial)]);
    expect(H.digVoxelFind(site, migrated, dry.index).selected).toBeNull();
  });

  it('changes no excavation progress, contacts, revealed cells or clue availability during selection', () => {
    const state = initial(); state.depths[bone.index] = bone.burial - 1; state.contacts[bone.index] = true;
    const before = structuredClone(state), revealed = H.digVoxelRevealed(site, state);
    const evidenceBefore = I.digEvidenceCheck(site, { digRevealed: revealed, digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) });
    for (let focus = 0; focus < 24; focus++) H.digVoxelFind(site, state, focus);
    expect(state).toEqual(before); expect(H.digVoxelRevealed(site, state)).toEqual(revealed);
    expect(evidenceBefore.used).toHaveLength(0);
    expect(I.digEvidenceCheck(site, { digRevealed: H.digVoxelRevealed(site, state), digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) })).toEqual(evidenceBefore);
  });

  it('accepts frozen inputs and returns detached find records on every derivation', () => {
    const frozenSite = freeze(structuredClone(site)), state = freeze(brushTo(site, initial(), bone, bone.burial));
    const view = H.digVoxelFind(frozenSite, state, bone.index), pristine = structuredClone(view);
    view.selected.shape = 'invented'; view.selected.removed = 99; view.finds.push({ index: 99 });
    expect(H.digVoxelFind(frozenSite, state, bone.index)).toEqual(pristine);
    expect(state.depths[bone.index]).toBe(bone.burial);
  });

  it('ships the same bounded find helper in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(section(mirror, '// DINO_VOXEL_DIG_FIND_START', '// DINO_VOXEL_DIG_FIND_END'))
      .toBe(section(source, '// DINO_VOXEL_DIG_FIND_START', '// DINO_VOXEL_DIG_FIND_END'));
  });
});
