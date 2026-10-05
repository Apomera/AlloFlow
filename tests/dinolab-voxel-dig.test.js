import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing bounded voxel test section: ' + start);
  return source.slice(a, b);
}
const seededRng = new Function(section('  function mulberry32(seed)', '  // ═') + '\nreturn mulberry32;')();
const I = internals();
const H = new Function('mulberry32', 'digRevealedCells',
  section('// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END') +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelFootprint,digVoxelColumn,digVoxelRevealed,digVoxelExcavate};'
)(seededRng, I.digRevealedCells);
const site = I.digSiteFor(42);
const boneIds = Object.keys(site.boneCells).map(Number);
const dryIds = Array.from({ length: 24 }, (_, i) => i).filter(i => !site.boneCells[i]);
const start = () => H.digVoxelState(null, site, []);
function trowelWholeSite(initial = start()) {
  let state = initial;
  for (let stroke = 0; stroke < 4; stroke++) {
    for (let i = 0; i < 24; i++) state = H.digVoxelExcavate(site, state, i, 'trowel').state;
  }
  return state;
}
function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze); Object.freeze(value);
  }
  return value;
}

describe('deterministic voxel burial and restored-site compatibility', () => {
  it('adds four layers over the unchanged 24-cell catalog layout', () => {
    for (const seed of [1, 2, 42, 73, 1000000000]) {
      const actual = I.digSiteFor(seed), before = JSON.stringify(actual);
      const layout = H.digVoxelLayout(actual);
      expect(layout).toMatchObject({ seed, cols: 6, rows: 4, layers: 4 });
      expect(layout.columns).toHaveLength(24);
      expect(layout).toEqual(H.digVoxelLayout(actual));
      expect(layout.columns.filter(column => column.hasBone).map(column => column.index)).toEqual(Object.keys(actual.boneCells).map(Number));
      for (const column of layout.columns) {
        expect(column.row).toBe(Math.floor(column.index / 6));
        expect(column.col).toBe(column.index % 6);
        expect(column.burial).toBeGreaterThanOrEqual(2);
        expect(column.burial).toBeLessThanOrEqual(4);
      }
      expect(layout.columns[0].coord).toBe('A1');
      expect(layout.columns[23].coord).toBe('F4');
      expect(JSON.stringify(actual)).toBe(before);
      expect(I.digSiteFor(seed)).toEqual(actual); // voxel RNG does not consume catalog RNG
    }
    expect(H.digVoxelLayout({ ...site, seed: 43 }).columns.map(column => column.burial)).not.toEqual(H.digVoxelLayout(site).columns.map(column => column.burial));
  });

  it('migrates legacy bone and empty results without losing clues or notebook candidate identity', () => {
    const revealed = [boneIds[0], dryIds[0], boneIds[0], -1, 24, '2'];
    const restored = H.digVoxelState(null, site, revealed);
    expect(H.digVoxelRevealed(site, restored)).toEqual([boneIds[0], dryIds[0]].sort((a, b) => a - b));
    expect(H.digVoxelColumn(site, restored, boneIds[0]).exposed).toBe(true);
    expect(H.digVoxelColumn(site, restored, dryIds[0])).toMatchObject({ cleared: true, removed: 4, remaining: 0 });
    const prepared = H.digVoxelState(null, site, boneIds.slice(0, 8));
    const evidence = I.digEvidenceCheck(site, { digRevealed: H.digVoxelRevealed(site, prepared), digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) });
    expect(evidence.kind).toBe('match');
    expect(evidence.used).toHaveLength(6);
    expect(evidence.matches.map(animal => animal.id)).toEqual([site.chosen.id]);
  });

  it('discards a mismatched or invalid voxel payload and migrates only the current-site legacy IDs', () => {
    const forged = { version: 1, seed: site.seed + 1, depths: Array(24).fill(4), contacts: Array(24).fill(true), tool: 'trowel', focus: 23 };
    const legacy = [boneIds[0]];
    const restored = H.digVoxelState(forged, site, legacy);
    expect(restored).toMatchObject({ version: 1, seed: site.seed, tool: 'brush', focus: 0 });
    expect(H.digVoxelRevealed(site, restored)).toEqual(legacy);
    expect(restored.contacts.every(value => value === false)).toBe(true);
    for (const raw of [null, undefined, [], 42, 'bad', { ...forged, version: 99 }, { ...forged, seed: String(site.seed) }]) {
      expect(H.digVoxelState(raw, site, [])).toEqual(start());
    }
  });

  it('bounds copied depth/contact arrays and rejects nonnumeric depth, unknown tools and invalid focus', () => {
    const raw = deepFreeze({ version: 1, seed: site.seed,
      depths: ['4', -5, NaN, Infinity, {}, 999], contacts: Array(30).fill(true), tool: 'hammer', focus: -1 });
    const normalized = H.digVoxelState(raw, site, []);
    expect(normalized.depths).toHaveLength(24);
    expect(normalized.contacts).toHaveLength(24);
    expect(normalized.depths.slice(0, 5)).toEqual([0, 0, 0, 0, 0]);
    expect(normalized.depths[5]).toBe(H.digVoxelLayout(site).columns[5].burial);
    expect(normalized).toMatchObject({ tool: 'brush', focus: 0 });
    expect(normalized.contacts.every(value => value === false)).toBe(true);
    normalized.depths[0] = 1;
    expect(raw.depths[0]).toBe('4');
    const bone = boneIds[0], near = start();
    near.depths[bone] = H.digVoxelLayout(site).columns[bone].burial - 1;
    near.contacts[bone] = true;
    expect(H.digVoxelState(near, site, []).contacts[bone]).toBe(true);
    near.depths[bone]--;
    expect(H.digVoxelState(near, site, []).contacts[bone]).toBe(false);
  });
});

describe('voxel tool footprints and fossil protection', () => {
  it('clips 3x3 trowel footprints at corners and edges without row wraparound', () => {
    expect(H.digVoxelFootprint(0, 'trowel')).toEqual([0, 1, 6, 7]);
    expect(H.digVoxelFootprint(5, 'trowel')).toEqual([4, 5, 10, 11]);
    expect(H.digVoxelFootprint(23, 'trowel')).toEqual([16, 17, 22, 23]);
    expect(H.digVoxelFootprint(7, 'trowel')).toEqual([0, 1, 2, 6, 7, 8, 12, 13, 14]);
    expect(H.digVoxelFootprint(2, 'trowel')).toHaveLength(6);
    expect(H.digVoxelFootprint(7, 'brush')).toEqual([7]);
    for (const invalid of [-1, 24, 1.5, NaN, null, '7']) expect(H.digVoxelFootprint(invalid, 'trowel')).toEqual([]);
  });

  it('reveals no bones in unopened terrain and records no contact merely from knowing the hidden layout', () => {
    const untouched = start();
    for (const bone of boneIds) {
      const column = H.digVoxelColumn(site, untouched, bone);
      expect(column).toMatchObject({ hasBone: true, removed: 0, exposed: false, contact: false, remaining: 4, topLayer: 3, surfaceY: 4 });
      expect(column.coverRemaining).toBe(column.burial);
      expect(column.fossilY).toBe(column.layers - column.burial);
    }
    expect(H.digVoxelRevealed(site, untouched)).toEqual([]);
    expect(H.digVoxelColumn(site, untouched, 24)).toBeNull();
  });

  it('removes one brush layer from one column and exposes a fossil only after its final cover', () => {
    const bone = boneIds[0], burial = H.digVoxelLayout(site).columns[bone].burial;
    let state = start();
    for (let stroke = 1; stroke <= burial; stroke++) {
      const result = H.digVoxelExcavate(site, state, bone, 'brush');
      expect(result.layersRemoved).toBe(1);
      expect(result.cellsChanged).toEqual([bone]);
      expect(result.bonesExposed).toEqual(stroke === burial ? [bone] : []);
      expect(result.contactsFound).toEqual([]);
      expect(H.digVoxelColumn(site, result.state, bone).exposed).toBe(stroke === burial);
      expect(result.state.depths.filter((_, index) => index !== bone).every(value => value === 0)).toBe(true);
      state = result.state;
    }
    expect(H.digVoxelRevealed(site, state)).toEqual([bone]);
    expect(H.digVoxelExcavate(site, state, bone, 'brush')).toMatchObject({ changed: false, layersRemoved: 0, bonesExposed: [] });
  });

  it('uses the wider trowel for terrain but stops before every fossil and requires a brush to expose it', () => {
    const stopped = trowelWholeSite();
    expect(H.digVoxelRevealed(site, stopped)).toEqual(dryIds);
    for (const bone of boneIds) {
      const column = H.digVoxelColumn(site, stopped, bone);
      expect(column).toMatchObject({ exposed: false, contact: true, coverRemaining: 1 });
      expect(column.removed).toBe(column.burial - 1);
    }
    for (const dry of dryIds) expect(H.digVoxelColumn(site, stopped, dry)).toMatchObject({ cleared: true, exposed: false, remaining: 0, topLayer: -1 });
    const repeated = H.digVoxelExcavate(site, stopped, 7, 'trowel');
    expect(repeated).toMatchObject({ changed: false, layersRemoved: 0, contactsFound: [], bonesExposed: [] });
    const brush = H.digVoxelExcavate(site, stopped, boneIds[0], 'brush');
    expect(brush.bonesExposed).toEqual([boneIds[0]]);
    expect(H.digVoxelColumn(site, brush.state, boneIds[0])).toMatchObject({ exposed: true, contact: false, coverRemaining: 0 });
  });

  it('protects exposed fossils during later neighboring trowel strokes', () => {
    const exposed = H.digVoxelState(null, site, [boneIds[0]]);
    const depth = exposed.depths[boneIds[0]];
    for (let i = 0; i < 6; i++) {
      const result = H.digVoxelExcavate(site, exposed, boneIds[0], 'trowel');
      expect(result.state.depths[boneIds[0]]).toBe(depth);
      expect(H.digVoxelColumn(site, result.state, boneIds[0]).exposed).toBe(true);
      expect(result.bonesExposed).not.toContain(boneIds[0]);
      expect(result.contactsFound).not.toContain(boneIds[0]);
    }
  });

  it('does not mutate transaction inputs and supports restoring both voxel and clue state on undo', () => {
    const before = trowelWholeSite();
    const priorRevealed = H.digVoxelRevealed(site, before);
    const snapshot = JSON.stringify(before);
    deepFreeze(before);
    const stroke = H.digVoxelExcavate(site, before, boneIds[0], 'brush');
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(stroke.state.depths).not.toBe(before.depths);
    expect(stroke.state.contacts).not.toBe(before.contacts);
    expect(stroke.revealed).toContain(boneIds[0]);
    const undone = H.digVoxelState(before, site, priorRevealed);
    expect(undone).toEqual(before);
    expect(H.digVoxelRevealed(site, undone)).not.toContain(boneIds[0]);
    expect(H.digVoxelExcavate(site, before, -1, 'brush')).toMatchObject({ state: before, changed: false, layersRemoved: 0 });
  });
});

describe('existing catalog evidence gates with voxel excavation', () => {
  const citeAll = site.clues.map(clue => clue.id);
  const check = raw => I.digEvidenceCheck(site, { digGuess: site.chosen.id, digCitedClues: citeAll, digRevealed: H.digVoxelRevealed(site, raw) });

  it('gives no free clues for empty-column clearing, contact detection or superficial soil removal', () => {
    expect(check(start())).toMatchObject({ kind: 'missing', used: [] });
    const dry = H.digVoxelState(null, site, dryIds);
    expect(check(dry)).toMatchObject({ kind: 'missing', used: [] });
    const contacts = trowelWholeSite();
    expect(check(contacts)).toMatchObject({ kind: 'missing', used: [] });
    const superficial = H.digVoxelExcavate(site, start(), boneIds[0], 'brush');
    expect(superficial.bonesExposed).toEqual([]);
    expect(check(superficial.state)).toMatchObject({ kind: 'missing', used: [] });
  });

  it('unlocks catalog clues only as protected bone exposure reaches the existing thresholds', () => {
    let state = trowelWholeSite();
    for (let found = 1; found <= Math.min(8, boneIds.length); found++) {
      state = H.digVoxelExcavate(site, state, boneIds[found - 1], 'brush').state;
      const eligible = site.clues.filter(clue => found >= clue.at);
      const evidence = check(state);
      if (eligible.length < 2) expect(evidence.kind).toBe('missing');
      expect(evidence.used.map(clue => clue.id)).toEqual(eligible.map(clue => clue.id));
      if (found >= 8) expect(evidence).toMatchObject({ kind: 'match', matches: [site.chosen] });
    }
  });

  it('keeps every seeded site solvable without destroying fossils', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const actual = I.digSiteFor(seed), allBones = Object.keys(actual.boneCells).map(Number);
      let state = H.digVoxelState(null, actual, []);
      for (const bone of allBones) {
        for (let stroke = 0; stroke < 4; stroke++) state = H.digVoxelExcavate(actual, state, bone, 'brush').state;
      }
      const revealed = H.digVoxelRevealed(actual, state);
      expect(revealed).toEqual(allBones);
      expect(I.digEvidenceCheck(actual, { digRevealed: revealed, digGuess: actual.chosen.id, digCitedClues: actual.clues.map(clue => clue.id) }).kind).toBe('match');
    }
  });
});

describe('voxel distribution and English UI parity', () => {
  it('keeps the desktop browser source mirror synchronized', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n')).toBe(source);
  });

  it.each(['ui_strings.js', 'desktop/web-app/public/ui_strings.js'])('resolves voxel UI keys in %s', path => {
    const strings = JSON.parse(readFileSync(path, 'utf8')).stem.dinolab;
    const required = new Set([...source.matchAll(/\bdvt\('([^']+)',/g)].map(match => 'voxel_' + match[1]));
    for (const match of source.matchAll(/['"]stem\.dinolab\.(voxel_[a-z0-9_]+)['"]\s*,/g)) required.add(match[1]);
    expect(required.size).toBeGreaterThan(0);
    for (const key of required) {
      expect(typeof strings[key], key).toBe('string');
      expect(strings[key].trim(), key).not.toBe('');
    }
  });
});
