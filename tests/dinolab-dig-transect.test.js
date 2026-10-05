import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const mainBytes = readFileSync('stem_lab/stem_tool_dinolab.js');
const source = mainBytes.toString('utf8').replace(/\r\n/g, '\n');
function fragment(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous transect seam: ' + start);
  return text.slice(a, b);
}
const I = internals();
const rng = new Function(fragment(source, '  function mulberry32(seed)', '  // ═') + '\nreturn mulberry32;')();
const model = fragment(source, '// DINO_VOXEL_DIG_TRANSECT_START', '// DINO_VOXEL_DIG_TRANSECT_END');
const H = new Function('mulberry32', 'digRevealedCells',
  fragment(source, '// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END') + '\n' +
  fragment(source, '// DINO_VOXEL_DIG_SECTION_START', '// DINO_VOXEL_DIG_SECTION_END') + '\n' + model +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelExcavate,digVoxelRevealed,digVoxelSection,digVoxelTransect};'
)(rng, I.digRevealedCells);
const site = I.digSiteFor(42), layout = H.digVoxelLayout(site);
const bone = layout.columns.find(column => column.hasBone), dry = layout.columns.find(column => !column.hasBone);
const initial = () => H.digVoxelState(null, site, []);
const rowSection = (row = 0, removed = 0, focus = row * 6) => ({
  row, focus, coord: String.fromCharCode(65 + focus % 6) + (row + 1),
  columns: Array.from({ length: 6 }, (_, col) => ({ index: row * 6 + col, coord: String.fromCharCode(65 + col) + (row + 1),
    removed, remaining: 4 - removed, status: removed === 0 ? 'covered' : removed === 4 ? 'cleared' : 'partial' }))
});
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function expectPublic(transect) {
  expect(Object.keys(transect).sort()).toEqual(['columns', 'coord', 'focus', 'removedMax', 'removedMin', 'row']);
  expect(transect.columns).toHaveLength(6);
  transect.columns.forEach(column => expect(Object.keys(column).sort()).toEqual(['coord', 'index', 'remaining', 'removed', 'status']));
}
function beforeContact() {
  let state = initial();
  for (let i = 0; i < bone.burial - 1; i++) state = H.digVoxelExcavate(site, state, bone.index, 'brush').state;
  return state;
}

describe('canonical observed row transects', () => {
  it('preserves every real inspected row and focus with six canonical A–F records', () => {
    const state = initial();
    for (let focus = 0; focus < 24; focus++) {
      const section = H.digVoxelSection(site, state, focus), result = H.digVoxelTransect(section);
      expectPublic(result);
      expect(result).toMatchObject({ row: Math.floor(focus / 6), focus, coord: layout.columns[focus].coord, removedMin: 0, removedMax: 0 });
      expect(result.columns).toEqual(section.columns.map(({ index, coord, removed, remaining, status }) => ({ index, coord, removed, remaining, status })));
      expect(result.columns.map(column => column.coord)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'].map(letter => letter + (result.row + 1)));
    }
  });

  it('retains distinct observations at equal depths and derives the range across all six columns', () => {
    const section = rowSection(2, 0, 15);
    const records = [[0, 'covered'], [1, 'partial'], [2, 'contact'], [2, 'exposed'], [3, 'partial'], [4, 'cleared']];
    records.forEach(([removed, status], col) => Object.assign(section.columns[col], { removed, remaining: 4 - removed, status }));
    const result = H.digVoxelTransect(section);
    expectPublic(result);
    expect(result).toMatchObject({ row: 2, focus: 15, coord: 'D3', removedMin: 0, removedMax: 4 });
    expect(result.columns.map(column => [column.removed, column.remaining, column.status])).toEqual(records.map(([removed, status]) => [removed, 4 - removed, status]));
  });

  it('keeps every permitted model depth finite and within the bounds used by the 3D row surface', () => {
    for (let row = 0; row < 4; row++) for (let removed = 0; removed <= 4; removed++) {
      const result = H.digVoxelTransect(rowSection(row, removed, row * 6 + 5));
      expect(result.removedMin).toBe(removed); expect(result.removedMax).toBe(removed);
      for (const column of result.columns) {
        const x = (column.index % 6 - 2.5) * 1.08, z = (result.row - 1.5) * 1.08, y = column.remaining * 0.52;
        expect([x, y, z].every(Number.isFinite)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(-2.7); expect(x).toBeLessThanOrEqual(2.7);
        expect(z).toBeGreaterThanOrEqual(-1.62); expect(z).toBeLessThanOrEqual(1.62);
        expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThanOrEqual(2.08);
        expect(column.removed + column.remaining).toBe(4);
      }
    }
  });

  it('updates a real partial/contact/exposed record and restores the exact earlier profile after Undo', () => {
    const before = beforeContact(), beforeCopy = structuredClone(before);
    const contact = H.digVoxelExcavate(site, before, bone.index, 'trowel').state, contactCopy = structuredClone(contact);
    const exposed = H.digVoxelExcavate(site, contact, bone.index, 'brush').state, exposedCopy = structuredClone(exposed);
    const snapshots = [before, contact, exposed].map(state => H.digVoxelTransect(H.digVoxelSection(site, state, bone.index)));
    const col = bone.index % 6;
    expect(snapshots.map(result => result.columns[col].status)).toEqual(['partial', 'contact', 'exposed']);
    expect(snapshots.map(result => result.columns[col].removed)).toEqual([bone.burial - 1, bone.burial - 1, bone.burial]);
    expect(H.digVoxelTransect(H.digVoxelSection(site, contactCopy, bone.index))).toEqual(snapshots[1]);
    expect(H.digVoxelTransect(H.digVoxelSection(site, beforeCopy, bone.index))).toEqual(snapshots[0]);
    expect(before).toEqual(beforeCopy); expect(contact).toEqual(contactCopy); expect(exposed).toEqual(exposedCopy);
  });

  it('records a cleared dry column at the model base without inventing an exposed find', () => {
    let state = initial();
    for (let i = 0; i < 4; i++) state = H.digVoxelExcavate(site, state, dry.index, 'brush').state;
    const result = H.digVoxelTransect(H.digVoxelSection(site, state, dry.index));
    expect(result.columns[dry.index % 6]).toMatchObject({ index: dry.index, removed: 4, remaining: 0, status: 'cleared' });
    expect(result.removedMax).toBe(4); expect(result.removedMin).toBe(0);
    expect(H.digVoxelSection(site, state, dry.index).finds.some(find => find.index === dry.index)).toBe(false);
  });

  it('uses the existing section migration and stale-site reset before exposing any row profile', () => {
    const state = H.digVoxelState(null, site, [bone.index, dry.index]);
    const migrated = H.digVoxelTransect(H.digVoxelSection(site, state, bone.index));
    expect(migrated.columns[bone.index % 6].status).toBe('exposed');
    const stale = { ...state, seed: site.seed + 1 };
    expect(H.digVoxelTransect(H.digVoxelSection(site, stale, bone.index))).toEqual(H.digVoxelTransect(H.digVoxelSection(site, initial(), bone.index)));
  });
});

describe('rejects incoherent public sections as a unit', () => {
  it('rejects missing or non-object sections without coercion', () => {
    for (const input of [undefined, null, false, true, 0, 42, '', 'section', [], [rowSection()], () => rowSection()]) expect(H.digVoxelTransect(input)).toBeNull();
  });

  it('requires an integer row, a focus within that row and the exact canonical selected coordinate', () => {
    for (const row of [-1, 4, 0.5, NaN, Infinity, '0', null, undefined]) expect(H.digVoxelTransect({ ...rowSection(), row })).toBeNull();
    for (const row of [0, 1, 2, 3]) {
      const base = rowSection(row);
      for (const focus of [-1, 24, row * 6 - 1, row * 6 + 6, row * 6 + 0.5, NaN, Infinity, String(row * 6), null]) expect(H.digVoxelTransect({ ...base, focus })).toBeNull();
      for (const coord of ['', 'A0', 'A5', 'a' + (row + 1), 'A' + (row + 1) + ' ', 'B' + (row + 1), row, null, undefined]) expect(H.digVoxelTransect({ ...base, coord })).toBeNull();
    }
  });

  it('requires exactly six columns in row order, without duplicates or foreign row coordinates', () => {
    const base = rowSection(1);
    for (const columns of [undefined, null, {}, 'six', base.columns.slice(0, 5), [...base.columns, base.columns[0]], new Array(6)]) expect(H.digVoxelTransect({ ...base, columns })).toBeNull();
    for (let col = 0; col < 6; col++) for (const change of [{ index: col }, { index: 6 + ((col + 1) % 6) }, { coord: String.fromCharCode(65 + col) + '1' }, { coord: base.columns[col].coord.toLowerCase() }, { coord: base.columns[col].coord + ' ' }]) {
      const input = structuredClone(base); Object.assign(input.columns[col], change); expect(H.digVoxelTransect(input)).toBeNull();
    }
    expect(H.digVoxelTransect({ ...base, columns: [...base.columns].reverse() })).toBeNull();
  });

  it('rejects non-object column records in every position', () => {
    for (let col = 0; col < 6; col++) for (const record of [undefined, null, false, true, 0, '', [], () => ({})]) {
      const input = rowSection(); input.columns[col] = record; expect(H.digVoxelTransect(input)).toBeNull();
    }
  });

  it('requires bounded integer complementary layer counts instead of clamping corrupt records', () => {
    for (let col = 0; col < 6; col++) for (const field of ['removed', 'remaining']) for (const value of [-1, 5, 999, 1.5, NaN, Infinity, -Infinity, '0', null, undefined, true, {}, []]) {
      const input = rowSection(); input.columns[col][field] = value; expect(H.digVoxelTransect(input)).toBeNull();
    }
    for (let removed = 0; removed <= 4; removed++) for (let remaining = 0; remaining <= 4; remaining++) if (removed + remaining !== 4) {
      const input = rowSection(0, removed); input.columns[4].remaining = remaining; expect(H.digVoxelTransect(input)).toBeNull();
    }
  });

  it('accepts only coherent covered, partial, contact, exposed and cleared depth combinations', () => {
    const validDepths = { covered: [0], partial: [1, 2, 3], contact: [1, 2, 3], exposed: [2, 3, 4], cleared: [4] };
    for (const [status, depths] of Object.entries(validDepths)) for (let removed = 0; removed <= 4; removed++) {
      const input = rowSection(3, removed, 23); input.columns[5].status = status;
      const result = H.digVoxelTransect(input);
      if (depths.includes(removed)) expect(result.columns[5]).toMatchObject({ removed, remaining: 4 - removed, status }); else expect(result).toBeNull();
    }
    for (const status of [undefined, null, '', 'Covered', 'partial ', 'found', 0, true, {}, [], new String('partial')]) {
      const input = rowSection(0, 1); input.columns[2].status = status; expect(H.digVoxelTransect(input)).toBeNull();
    }
  });

  it('never invokes user-defined coercion when a required field has the wrong type', () => {
    const hostile = { valueOf() { throw Error('valueOf'); }, toString() { throw Error('toString'); } };
    for (const field of ['row', 'focus', 'coord']) expect(H.digVoxelTransect({ ...rowSection(), [field]: hostile })).toBeNull();
    for (const field of ['index', 'coord', 'removed', 'remaining', 'status']) {
      const input = rowSection(); input.columns[0][field] = hostile;
      expect(() => H.digVoxelTransect(input)).not.toThrow(); expect(H.digVoxelTransect(input)).toBeNull();
    }
  });

  it('returns no partial result and stops reading later public records after an invalid column', () => {
    const input = rowSection(); input.columns[2].remaining = 2;
    Object.defineProperty(input.columns[3], 'removed', { get() { throw Error('Invalid section continued reading'); } });
    expect(H.digVoxelTransect(input)).toBeNull();
  });
});

describe('pure public data boundary', () => {
  it('preserves frozen source sections and returns fresh objects isolated from source and other calls', () => {
    const input = freeze(rowSection(2, 2, 17)), before = JSON.stringify(input);
    const first = H.digVoxelTransect(input), second = H.digVoxelTransect(input);
    expectPublic(first); expect(first).not.toBe(input); expect(first).not.toBe(second); expect(first.columns).not.toBe(input.columns); expect(first.columns).not.toBe(second.columns);
    first.columns.forEach((column, index) => { expect(column).not.toBe(input.columns[index]); expect(column).not.toBe(second.columns[index]); });
    first.columns[0].remaining = 99; first.columns[1].status = 'exposed'; first.columns.push({ species: 'invented' }); first.removedMin = -1;
    expect(H.digVoxelTransect(input)).toEqual(second); expect(JSON.stringify(input)).toBe(before);
  });

  it('ignores enumerable hidden getters, layers and finds without reading, enumerating or copying them', () => {
    const input = rowSection(1, 2, 8), expected = H.digVoxelTransect(input);
    const hidden = ['layers', 'finds', 'burial', 'hasBone', 'fossilY', 'coverRemaining', 'shape', 'species', 'identity', 'chosen', 'clues', 'catalog', 'anatomy', 'age', 'actions', 'association'];
    for (const object of [input, input.columns, ...input.columns]) for (const key of hidden) {
      Object.defineProperty(object, key, { enumerable: true, get() { throw Error('Hidden transect read: ' + key); } });
    }
    expect(() => H.digVoxelTransect(input)).not.toThrow(); expect(H.digVoxelTransect(input)).toEqual(expected); expectPublic(H.digVoxelTransect(input));
  });

  it('produces identical profiles for identical public observations despite different hidden metadata', () => {
    const first = rowSection(3, 1, 20), second = structuredClone(first);
    Object.assign(first, { finds: [{ index: 19, species: 'candidate-a' }], layers: [], age: 100 });
    Object.assign(second, { finds: [], layers: [{ level: 999 }], age: 200 });
    first.columns.forEach((column, index) => Object.assign(column, { burial: index, hasBone: true, shape: 'curved', identity: 'candidate-a' }));
    second.columns.forEach(column => Object.assign(column, { burial: 999, hasBone: false, shape: 'compact', identity: 'candidate-b' }));
    expect(H.digVoxelTransect(first)).toEqual(H.digVoxelTransect(second));
  });

  it('captures each required scalar once without enumerating source objects', () => {
    const input = rowSection(2, 3, 16), expected = H.digVoxelTransect(input), reads = [];
    const protect = (record, fields, name) => new Proxy(record, {
      ownKeys() { throw Error('Transect enumerated ' + name); },
      get(target, key) {
        if (!fields.includes(key)) throw Error('Unexpected transect read: ' + name + '.' + String(key));
        reads.push(name + '.' + key); return target[key];
      }
    });
    input.columns = input.columns.map((column, col) => protect(column, ['index', 'coord', 'removed', 'remaining', 'status'], 'column' + col));
    const protectedSection = protect(input, ['row', 'focus', 'coord', 'columns'], 'section');
    expect(H.digVoxelTransect(protectedSection)).toEqual(expected);
    expect(reads).toHaveLength(34); expect(new Set(reads).size).toBe(34);
  });

  it('cannot alter discovery, excavation progress or species-evidence results when inspecting every row', () => {
    const state = H.digVoxelState(null, site, [bone.index, dry.index]), before = structuredClone(state), revealed = H.digVoxelRevealed(site, state);
    const evidenceInput = { digRevealed: revealed, digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) };
    const evidence = I.digEvidenceCheck(site, evidenceInput);
    for (let focus = 0; focus < 24; focus++) expectPublic(H.digVoxelTransect(H.digVoxelSection(site, state, focus)));
    expect(state).toEqual(before); expect(H.digVoxelRevealed(site, state)).toEqual(revealed); expect(I.digEvidenceCheck(site, evidenceInput)).toEqual(evidence);
  });

  it('ships identical app bytes and the same bounded normalizer in the desktop mirror', () => {
    const mirrorBytes = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js');
    expect(mirrorBytes.equals(mainBytes)).toBe(true);
    expect(fragment(mirrorBytes.toString('utf8').replace(/\r\n/g, '\n'), '// DINO_VOXEL_DIG_TRANSECT_START', '// DINO_VOXEL_DIG_TRANSECT_END')).toBe(model);
  });
});
