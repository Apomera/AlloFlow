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
  section(source, '// DINO_VOXEL_DIG_SECTION_START', '// DINO_VOXEL_DIG_SECTION_END') +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelColumn,digVoxelFootprint,digVoxelExcavate,digVoxelRevealed,digVoxelSection,digVoxelSectionPick};'
)(rng, I.digRevealedCells);
const site = I.digSiteFor(42);
const layout = H.digVoxelLayout(site);
const bone = layout.columns.find(column => column.hasBone);
const dry = layout.columns.find(column => !column.hasBone);
const initial = () => H.digVoxelState(null, site, []);
const selected = (result) => result.columns.find(column => column.index === result.focus);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function publicKeys(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...publicKeys(child)]);
}
function coverAboveFossil() {
  let state = initial();
  for (let i = 0; i < bone.burial - 1; i++) state = H.digVoxelExcavate(site, state, bone.index, 'brush').state;
  return state;
}

describe('observed excavation row sections', () => {
  it('provides exactly six row columns and four top-to-bottom cover levels', () => {
    for (const focus of [0, 5, 6, 11, 12, 17, 18, 23]) {
      const view = H.digVoxelSection(site, initial(), focus);
      const row = Math.floor(focus / 6);
      expect(view).toMatchObject({ row, focus, coord: layout.columns[focus].coord, finds: [] });
      expect(view.columns.map(column => column.index)).toEqual(Array.from({ length: 6 }, (_, col) => row * 6 + col));
      for (const column of view.columns) {
        expect(column).toEqual({ index: column.index, coord: layout.columns[column.index].coord, removed: 0, remaining: 4, status: 'covered',
          layers: [1, 2, 3, 4].map(level => ({ level, removed: false })) });
      }
    }
  });

  it('does not disclose hidden placement, burial depth, catalog identity, or anatomy', () => {
    const other = { ...site, chosen: { id: 'hidden-candidate' }, boneCells: { 0: true, 23: true }, clues: [{ text: 'hidden clue' }] };
    for (const focus of [0, 6, 12, 23]) {
      const view = H.digVoxelSection(site, null, focus);
      expect(view).toEqual(H.digVoxelSection(other, null, focus));
      for (const key of ['hasBone', 'burial', 'coverRemaining', 'fossilY', 'chosen', 'species', 'candidates', 'clues', 'anatomy']) {
        expect(publicKeys(view)).not.toContain(key);
      }
      expect(JSON.stringify(view)).not.toContain(site.chosen.id);
    }
  });

  it('shows partial cover removal without revealing a fragment or unlocking a clue', () => {
    const stroke = H.digVoxelExcavate(site, initial(), bone.index, 'brush');
    const view = H.digVoxelSection(site, stroke.state, bone.index);
    expect(selected(view)).toMatchObject({ removed: 1, remaining: 3, status: 'partial' });
    expect(selected(view).layers.map(layer => layer.removed)).toEqual([true, false, false, false]);
    expect(view.finds).toEqual([]);
    expect(H.digVoxelRevealed(site, stroke.state)).toEqual([]);
    const evidence = I.digEvidenceCheck(site, { digRevealed: H.digVoxelRevealed(site, stroke.state), digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) });
    expect(evidence.used).toHaveLength(0);
    expect(evidence.kind).toBe('missing');
  });

  it('updates contact to exposure and restores the exact observed contact after undo', () => {
    const beforeContact = coverAboveFossil();
    const contact = H.digVoxelExcavate(site, beforeContact, bone.index, 'trowel').state;
    const contactSnapshot = structuredClone(contact);
    const contactView = H.digVoxelSection(site, contact, bone.index);
    expect(selected(contactView).status).toBe('contact');
    expect(contactView.finds.find(find => find.index === bone.index)).toEqual({ index: bone.index, coord: bone.coord, row: bone.row, col: bone.col, removed: bone.burial - 1, status: 'contact', level: bone.burial - 1 });
    const exposed = H.digVoxelExcavate(site, contact, bone.index, 'brush').state;
    const exposedView = H.digVoxelSection(site, exposed, bone.index);
    expect(selected(exposedView).status).toBe('exposed');
    expect(exposedView.finds.find(find => find.index === bone.index)).toMatchObject({ status: 'exposed', removed: bone.burial, level: bone.burial });
    expect(H.digVoxelRevealed(site, contact)).not.toContain(bone.index);
    expect(H.digVoxelRevealed(site, exposed)).toContain(bone.index);
    expect(I.digEvidenceCheck(site, { digRevealed: H.digVoxelRevealed(site, contact), digGuess: site.chosen.id, digCitedClues: ['period'] }).used).toHaveLength(0);
    expect(I.digEvidenceCheck(site, { digRevealed: H.digVoxelRevealed(site, exposed), digGuess: site.chosen.id, digCitedClues: ['period'] }).used).toHaveLength(1);
    expect(H.digVoxelSection(site, contactSnapshot, bone.index)).toEqual(contactView);
    expect(contact).toEqual(contactSnapshot);
  });

  it('marks cleared ground without inventing a fossil find', () => {
    let state = initial();
    for (let removed = 1; removed <= 4; removed++) {
      state = H.digVoxelExcavate(site, state, dry.index, 'brush').state;
      const view = H.digVoxelSection(site, state, dry.index), column = selected(view);
      expect(column).toMatchObject({ removed, remaining: 4 - removed, status: removed === 4 ? 'cleared' : 'partial' });
      expect(column.layers.map(layer => layer.removed)).toEqual([1, 2, 3, 4].map(level => level <= removed));
      expect(view.finds).toEqual([]);
    }
  });

  it('lists observed finds across all rows in stable coordinate order', () => {
    const knownBones = layout.columns.filter(column => column.hasBone);
    const raw = initial();
    knownBones.forEach((column, n) => {
      raw.depths[column.index] = n % 2 ? column.burial : column.burial - 1;
      raw.contacts[column.index] = n % 2 === 0;
    });
    raw.depths[dry.index] = 4;
    const view = H.digVoxelSection(site, raw, 0);
    expect(view.finds.map(find => find.index)).toEqual(knownBones.map(column => column.index));
    expect(new Set(view.finds.map(find => find.row)).size).toBeGreaterThan(1);
    for (const find of view.finds) {
      expect(find.status).toBe(raw.contacts[find.index] ? 'contact' : 'exposed');
      expect(find.level).toBe(raw.depths[find.index]);
      expect(find.coord).toBe(layout.columns[find.index].coord);
    }
    expect(view.finds.some(find => find.index === dry.index)).toBe(false);
  });
});

describe('bounded restored data and selection-only inspection', () => {
  it('rejects corrupt explicit focus and uses only a valid normalized fallback', () => {
    const raw = { ...initial(), focus: 17 };
    for (const focus of [undefined, null, -1, 24, 3.2, NaN, Infinity, '23', {}, []]) {
      expect(H.digVoxelSection(site, raw, focus)).toMatchObject({ focus: 17, row: 2, coord: 'F3' });
    }
    expect(H.digVoxelSection(site, raw, 0)).toMatchObject({ focus: 0, row: 0, coord: 'A1' });
    expect(H.digVoxelSection(site, { ...raw, focus: '17' }, Infinity)).toMatchObject({ focus: 0, row: 0, coord: 'A1' });
  });

  it('discards stale-site progress rather than displaying another site\'s finds', () => {
    const stale = { version: 1, seed: site.seed + 1, depths: Array(24).fill(4), contacts: Array(24).fill(true), focus: 23, tool: 'trowel' };
    expect(H.digVoxelSection(site, stale)).toEqual(H.digVoxelSection(site, null));
    expect(H.digVoxelSection(site, stale, 23)).toMatchObject({ focus: 23, row: 3, coord: 'F4', finds: [] });
    expect(H.digVoxelSection(site, stale, 23).columns.every(column => column.removed === 0)).toBe(true);
  });

  it('derives legacy exposure only after the current-site legacy normalizer', () => {
    const legacy = [bone.index, dry.index, bone.index, -1, 24, String(bone.index)];
    const migrated = H.digVoxelState(null, site, legacy);
    const view = H.digVoxelSection(site, migrated, bone.index);
    expect(view.finds).toHaveLength(1);
    expect(view.finds[0]).toMatchObject({ index: bone.index, status: 'exposed' });
    const dryView = H.digVoxelSection(site, migrated, dry.index);
    expect(selected(dryView)).toMatchObject({ index: dry.index, status: 'cleared', removed: 4, remaining: 0 });
    expect(H.digVoxelRevealed(site, migrated)).toEqual([bone.index, dry.index].sort((a, b) => a - b));
    expect(H.digVoxelSection(site, { ...migrated, seed: site.seed + 1 }).finds).toEqual([]);
  });

  it('bounds malformed restored data before producing finite observed fields', () => {
    const corrupt = freeze({ version: 1, seed: site.seed, depths: ['4', -8, NaN, Infinity, null, 999, 1.5], contacts: Array(30).fill(true), focus: NaN, tool: 'unknown' });
    for (const focus of [0, 6, 12, 18]) {
      const view = H.digVoxelSection(site, corrupt, focus);
      expect(view.columns).toHaveLength(6);
      for (const column of view.columns) {
        expect(Number.isInteger(column.removed)).toBe(true);
        expect(column.removed).toBeGreaterThanOrEqual(0);
        expect(column.removed).toBeLessThanOrEqual(4);
        expect(column.remaining).toBe(4 - column.removed);
        expect(column.layers).toHaveLength(4);
        expect(column.layers.every(layer => typeof layer.removed === 'boolean')).toBe(true);
      }
      expect(view.finds.every(find => Number.isInteger(find.level) && find.level > 0 && find.level <= 4)).toBe(true);
    }
    for (const raw of [null, undefined, [], 42, 'bad', { ...corrupt, version: 99 }, { ...corrupt, seed: String(site.seed) }]) {
      expect(H.digVoxelSection(site, raw, 0)).toEqual(H.digVoxelSection(site, null, 0));
    }
  });

  it('changes only the inspected row/selection, preserving all excavation and discovery data', () => {
    const contact = H.digVoxelExcavate(site, coverAboveFossil(), bone.index, 'trowel').state;
    const before = structuredClone(contact);
    const views = [0, 6, 12, 18, 23].map(focus => H.digVoxelSection(site, contact, focus));
    for (const view of views) expect(view.finds).toEqual(views[0].finds);
    expect(contact).toEqual(before);
    const acrossRows = views.slice(0, 4).flatMap(view => view.columns);
    expect(acrossRows).toHaveLength(24);
    expect(acrossRows.map(column => column.removed)).toEqual(contact.depths);
    expect(H.digVoxelRevealed(site, contact)).toEqual(H.digVoxelRevealed(site, before));
  });

  it('returns detached data and accepts frozen state/site inputs', () => {
    const frozenSite = freeze(structuredClone(site)), raw = freeze(coverAboveFossil());
    const first = H.digVoxelSection(frozenSite, raw, bone.index);
    const pristine = structuredClone(first);
    first.columns[0].layers[0].removed = !first.columns[0].layers[0].removed;
    first.columns[0].removed = 99;
    first.finds.push({ index: 99, status: 'exposed' });
    expect(H.digVoxelSection(frozenSite, raw, bone.index)).toEqual(pristine);
  });

  it('rejects stale hidden-row picks and never wraps or coerces coordinates', () => {
    for (let focus = 0; focus < 24; focus++) for (let index = 0; index < 24; index++) {
      expect(H.digVoxelSectionPick(focus, index)).toBe(Math.floor(focus / 6) === Math.floor(index / 6) ? index : null);
    }
    for (const bad of [-1, 24, 1.5, NaN, Infinity, '0', null, {}, []]) {
      expect(H.digVoxelSectionPick(bad, 0)).toBeNull();
      expect(H.digVoxelSectionPick(0, bad)).toBeNull();
    }
    expect(H.digVoxelSectionPick(5, 6)).toBeNull();
    expect(H.digVoxelSectionPick(6, 5)).toBeNull();
  });

  it('does not trim trowel excavation footprints to the inspected row', () => {
    const focus = 7, before = initial();
    const footprint = H.digVoxelFootprint(focus, 'trowel');
    expect(footprint).toEqual([0, 1, 2, 6, 7, 8, 12, 13, 14]);
    const stroke = H.digVoxelExcavate(site, before, focus, 'trowel');
    expect(stroke.cellsChanged).toEqual(footprint);
    expect(stroke.layersRemoved).toBe(9);
    const view = H.digVoxelSection(site, stroke.state, focus);
    expect(view.columns.map(column => column.index)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(H.digVoxelSectionPick(view.focus, 0)).toBeNull();
    expect(stroke.state.depths[0]).toBe(1);
    expect(stroke.state.depths[12]).toBe(1);
  });

  it('ships identical bounded section helpers in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(section(mirror, '// DINO_VOXEL_DIG_SECTION_START', '// DINO_VOXEL_DIG_SECTION_END'))
      .toBe(section(source, '// DINO_VOXEL_DIG_SECTION_START', '// DINO_VOXEL_DIG_SECTION_END'));
  });
});
