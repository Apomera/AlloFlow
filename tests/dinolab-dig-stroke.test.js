import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous last-stroke seam: ' + start);
  return text.slice(a, b);
}
const I = internals();
const rng = new Function(section(source, '  function mulberry32(seed)', '  // ═') + '\nreturn mulberry32;')();
const strokeSource = section(source, '// DINO_VOXEL_DIG_STROKE_START', '// DINO_VOXEL_DIG_STROKE_END');
const H = new Function('mulberry32', 'digRevealedCells',
  section(source, '// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END') + '\n' + strokeSource +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelExcavate,digVoxelRevealed,digVoxelLastStroke};'
)(rng, I.digRevealedCells);
const seed = 42;
function state(extras = {}) { return { version: 1, seed, depths: Array(24).fill(0), contacts: Array(24).fill(false), tool: 'brush', focus: 0, ...extras }; }
function action(removed = 1, contacts = 0, extras = {}) { return { seed, kind: 'excavate', removed, contacts, bones: 0, ...extras }; }
function sample(index = 7, tool = 'brush') {
  const previous = state({ tool }), current = state({ tool }); current.depths[index] = 1;
  return { previous, current, action: action() };
}
function stroke(fixture) { return H.digVoxelLastStroke(seed, fixture.current, fixture.previous, fixture.action); }
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function keysDeep(value) { return value && typeof value === 'object' ? Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]) : []; }
function rootStroke(actualSite, raw, focus, tool, history = []) {
  const patches = [], voxel = { ...H.digVoxelState(raw, actualSite, []), tool };
  const dig = new Function('inspectionOnly', 'revealed', 'voxel', 'site', 'seed', 'undoHistory', 'digVoxelExcavate', 'digVoxelState', 'upd', 'announceToSR', 'dvt', 'dst',
    section(source, '        function dig(i) {', '        function undoExcavation()') + '\nreturn dig;'
  )(false, H.digVoxelRevealed(actualSite, voxel), voxel, actualSite, actualSite.seed, history,
    H.digVoxelExcavate, H.digVoxelState, patch => patches.push(patch), () => {}, (key, fallback) => fallback, (key, fallback) => fallback);
  dig(focus);
  return { before: voxel, patch: patches.find(patch => patch.digVoxelAction?.kind === 'excavate') || null };
}

describe('bounded observation-only last excavation comparison', () => {
  it('returns public row-major before/after cover counts for one brush removal', () => {
    expect(stroke(sample())).toEqual({ seed, tool: 'brush', changedCount: 1, removedLayers: 1, newContacts: 0,
      columns: [{ index: 7, coord: 'B2', row: 1, col: 1, beforeRemoved: 0, removed: 1, beforeRemaining: 4, remaining: 3,
        delta: 1, contactBefore: false, contactAfter: false, newContact: false }] });
  });

  it('clips its records to exactly changed coordinates and keeps row-major order at corners', () => {
    const f = sample(23, 'trowel'); f.current.depths[0] = 1; f.current.depths[5] = 1; f.current.depths[18] = 1; f.action.removed = 4;
    expect(stroke(f).columns.map(column => [column.index, column.coord, column.row, column.col])).toEqual([[0, 'A1', 0, 0], [5, 'F1', 0, 5], [18, 'A4', 3, 0], [23, 'F4', 3, 5]]);
    expect(stroke(f)).toMatchObject({ tool: 'trowel', changedCount: 4, removedLayers: 4 });
  });

  it('includes a contact-only tool stop without inventing removed sediment', () => {
    const previous = state({ tool: 'trowel' }), current = state({ tool: 'trowel' });
    previous.depths[19] = current.depths[19] = 3; current.contacts[19] = true;
    const result = H.digVoxelLastStroke(seed, current, previous, action(0, 1));
    expect(result).toMatchObject({ changedCount: 1, removedLayers: 0, newContacts: 1 });
    expect(result.columns).toEqual([{ index: 19, coord: 'B4', row: 3, col: 1, beforeRemoved: 3, removed: 3,
      beforeRemaining: 1, remaining: 1, delta: 0, contactBefore: false, contactAfter: true, newContact: true }]);
  });

  it('combines actual removals and new contacts while ignoring already recorded contacts', () => {
    const f = sample(0, 'trowel'); f.current.contacts[7] = true; f.previous.depths[7] = f.current.depths[7] = 2;
    f.previous.contacts[12] = f.current.contacts[12] = true; f.previous.depths[12] = f.current.depths[12] = 3;
    f.action.contacts = 1;
    expect(stroke(f)).toMatchObject({ changedCount: 2, removedLayers: 1, newContacts: 1 });
    expect(stroke(f).columns.map(column => column.index)).toEqual([0, 7]);
  });

  it('accepts brush exposure that clears a recorded contact only when one layer was removed', () => {
    const f = sample(7); f.previous.depths[7] = 2; f.current.depths[7] = 3; f.previous.contacts[7] = true;
    expect(stroke(f).columns[0]).toMatchObject({ delta: 1, contactBefore: true, contactAfter: false, newContact: false });
    f.current.depths[7] = 2; f.action.removed = 0;
    expect(stroke(f)).toBeNull();
  });

  it('reports the actual stroke tool from its previous snapshot despite later tool changes', () => {
    const f = sample(7, 'trowel'); f.current.tool = 'brush';
    expect(stroke(f).tool).toBe('trowel');
    for (const restoredTool of [undefined, null, 'Brush', 'corrupt', {}, 1]) {
      f.previous.tool = restoredTool; expect(stroke(f).tool).toBe('brush');
    }
  });

  it('accepts a nine-column removal and rejects larger or multi-layer pseudo-strokes', () => {
    const previous = state({ tool: 'trowel' }), current = state({ tool: 'trowel' }); current.depths.fill(1, 0, 9);
    expect(H.digVoxelLastStroke(seed, current, previous, action(9))).toMatchObject({ changedCount: 9, removedLayers: 9 });
    current.depths[9] = 1;
    expect(H.digVoxelLastStroke(seed, current, previous, action(10))).toBeNull();
    const f = sample(); f.current.depths[7] = 2; f.action.removed = 2;
    expect(stroke(f)).toBeNull();
    const contacts = state({ tool: 'trowel' }); contacts.contacts.fill(true, 0, 10);
    expect(H.digVoxelLastStroke(seed, contacts, previous, action(0, 10))).toBeNull();
  });

  it('rejects multi-column brush pseudo-strokes and contacts attributed to a brush', () => {
    const f = sample(0); f.current.depths[7] = 1; f.action.removed = 2;
    expect(stroke(f)).toBeNull();
    const previous = state(), current = state(); current.contacts[7] = true;
    expect(H.digVoxelLastStroke(seed, current, previous, action(0, 1))).toBeNull();
    current.depths[0] = 1;
    expect(H.digVoxelLastStroke(seed, current, previous, action(1, 1))).toBeNull();
  });

  it('rejects a contact recorded during a removal or a recorded contact retained after removal', () => {
    for (const tool of ['brush', 'trowel']) {
      const f = sample(7, tool); f.current.contacts[7] = true; f.action.contacts = 1;
      expect(stroke(f)).toBeNull();
      f.previous.contacts[7] = true; f.action.contacts = 0;
      expect(stroke(f)).toBeNull();
    }
  });

  it('rejects a trowel removing the final cover of an already recorded contact', () => {
    const f = sample(7, 'trowel'); f.previous.depths[7] = 2; f.current.depths[7] = 3; f.previous.contacts[7] = true;
    expect(stroke(f)).toBeNull();
    f.previous.tool = 'brush';
    expect(stroke(f).columns[0]).toMatchObject({ delta: 1, contactBefore: true, contactAfter: false });
  });

  it('requires the stored actual action counts to match observed differences exactly', () => {
    for (const removed of [undefined, null, '1', true, NaN, Infinity, -1, 0, 2, 1.5]) {
      const f = sample(); f.action.removed = removed; expect(stroke(f)).toBeNull();
    }
    for (const contacts of [undefined, null, '0', false, NaN, Infinity, -1, 1, 1.5]) {
      const f = sample(); f.action.contacts = contacts; expect(stroke(f)).toBeNull();
    }
  });

  it('disables comparisons for missing history, unchanged state, Undo, prepared samples and new sites', () => {
    const f = sample();
    for (const previous of [undefined, null, false, 0, [], {}, { ...f.previous, seed: seed + 1 }, { ...f.previous, version: 2 }]) {
      expect(H.digVoxelLastStroke(seed, f.current, previous, f.action)).toBeNull();
    }
    for (const actual of [undefined, null, false, 0, [], {}, action(1, 0, { kind: 'undo' }), action(1, 0, { kind: 'prepared' }), action(1, 0, { kind: 'unknown' }), action(1, 0, { seed: seed + 1 })]) {
      expect(H.digVoxelLastStroke(seed, f.current, f.previous, actual)).toBeNull();
    }
    expect(H.digVoxelLastStroke(seed, f.previous, f.previous, action(0))).toBeNull();
    expect(H.digVoxelLastStroke(seed + 1, f.current, f.previous, f.action)).toBeNull();
  });

  it('rejects malformed current states and seeds without coercion', () => {
    const f = sample();
    for (const current of [undefined, null, false, 0, [], {}, { ...f.current, seed: '42' }, { ...f.current, seed: seed + 1 }, { ...f.current, version: '1' }, { ...f.current, version: 2 }]) {
      expect(H.digVoxelLastStroke(seed, current, f.previous, f.action)).toBeNull();
    }
    for (const actualSeed of [undefined, null, false, 0, -1, 1.5, NaN, Infinity, 1000000001, '42', {}]) {
      expect(H.digVoxelLastStroke(actualSeed, f.current, f.previous, f.action)).toBeNull();
    }
    for (const boundarySeed of [1, 1000000000]) {
      expect(H.digVoxelLastStroke(boundarySeed, { ...f.current, seed: boundarySeed }, { ...f.previous, seed: boundarySeed }, { ...f.action, seed: boundarySeed }).seed).toBe(boundarySeed);
    }
  });

  it('rejects short, long, sparse, typed or invalid depth/contact arrays in either snapshot', () => {
    for (const snapshot of ['current', 'previous']) {
      for (const key of ['depths', 'contacts']) {
        const good = key === 'depths' ? 0 : false;
        for (const array of [undefined, null, {}, [], Array(23).fill(good), Array(25).fill(good), Array(24), new Uint8Array(24)]) {
          const f = sample(); f[snapshot][key] = array; expect(stroke(f)).toBeNull();
        }
      }
      for (const depth of [undefined, null, '0', false, -1, 5, 1.5, NaN, Infinity, {}, []]) {
        const f = sample(); f[snapshot].depths[23] = depth; expect(stroke(f)).toBeNull();
      }
      for (const contact of [undefined, null, 'false', 0, 1, NaN, {}, []]) {
        const f = sample(); f[snapshot].contacts[23] = contact; expect(stroke(f)).toBeNull();
      }
    }
  });

  it('rejects a depth reversal anywhere, including an unrelated unchanged-looking column', () => {
    const f = sample(); f.previous.depths[23] = 4; f.current.depths[23] = 3;
    expect(stroke(f)).toBeNull();
  });

  it('accepts frozen inputs and returns fresh copies with no aliases into saved progress', () => {
    const f = freeze(sample()), before = JSON.stringify(f), first = stroke(f), pristine = structuredClone(first);
    first.columns[0].remaining = 100; first.columns.push({ index: 100 }); first.removedLayers = 999;
    expect(stroke(f)).toEqual(pristine); expect(JSON.stringify(f)).toBe(before);
    expect(stroke(f).columns).not.toBe(stroke(f).columns);
    expect(stroke(f).columns[0]).not.toBe(stroke(f).columns[0]);
  });

  it('reads no hidden layout, identity, exposure or clue fields and never reads action.bones', () => {
    const f = sample();
    for (const object of [f.current, f.previous, f.action]) for (const key of ['site', 'layout', 'burial', 'hasBone', 'fossilY', 'coverRemaining', 'species', 'anatomy', 'chosen', 'boneCells', 'clues', 'revealed', 'bones']) {
      if (key === 'bones') delete object.bones;
      Object.defineProperty(object, key, { get() { throw Error('Hidden field read: ' + key); } });
    }
    expect(() => stroke(f)).not.toThrow();
    expect(stroke(f)).toMatchObject({ changedCount: 1, removedLayers: 1, newContacts: 0 });
    expect(Object.keys(stroke(f)).sort()).toEqual(['changedCount', 'columns', 'newContacts', 'removedLayers', 'seed', 'tool']);
    expect(Object.keys(stroke(f).columns[0]).sort()).toEqual(['beforeRemaining', 'beforeRemoved', 'col', 'contactAfter', 'contactBefore', 'coord', 'delta', 'index', 'newContact', 'remaining', 'removed', 'row']);
    for (const key of ['burial', 'hasBone', 'fossilY', 'coverRemaining', 'species', 'anatomy', 'chosen', 'boneCells', 'clues', 'revealed', 'bones']) expect(keysDeep(stroke(f))).not.toContain(key);
  });

  it('works with actual seeded brush/trowel transitions and untouched root Undo snapshots', () => {
    const exercised = new Set(); let comparisons = 0;
    for (const actualSeed of [1, 42, 73]) for (const tool of ['brush', 'trowel']) {
      const site = I.digSiteFor(actualSeed); let current = H.digVoxelState(null, site, []), history = [];
      for (let pass = 0; pass < 4; pass++) for (let index = 0; index < 24; index++) {
        const result = rootStroke(site, current, index, tool, history);
        if (!result.patch) continue;
        const { digVoxel, digVoxelUndo, digVoxelAction } = result.patch;
        const previous = digVoxelUndo[digVoxelUndo.length - 1], before = JSON.stringify(result.patch);
        const comparison = H.digVoxelLastStroke(actualSeed, digVoxel, previous, digVoxelAction);
        expect(comparison).not.toBeNull(); expect(comparison.tool).toBe(tool);
        expect(comparison.removedLayers).toBe(digVoxelAction.removed); expect(comparison.newContacts).toBe(digVoxelAction.contacts);
        expect(comparison.changedCount).toBeGreaterThan(0); expect(comparison.changedCount).toBeLessThanOrEqual(9);
        expect(previous).toEqual(result.before);
        expect(JSON.stringify(result.patch)).toBe(before);
        expect(comparison.columns.every(column => column.delta === 0 || column.delta === 1)).toBe(true);
        exercised.add(tool); if (comparison.newContacts) exercised.add('contact');
        comparisons++; current = digVoxel; history = digVoxelUndo;
      }
    }
    expect(comparisons).toBeGreaterThan(50);
    expect([...exercised].sort()).toEqual(['brush', 'contact', 'trowel']);
  });

  it('represents a real contact-only stroke followed by brush exposure without changing available clues', () => {
    const site = I.digSiteFor(seed), layout = H.digVoxelLayout(site), bone = layout.columns.find(column => column.hasBone);
    let before = H.digVoxelState(null, site, []);
    // Reach this case through real brush transitions: every neighboring column
    // is already exposed/cleared, and this one has its final cover remaining.
    for (const column of layout.columns) {
      const removals = column.index === bone.index ? column.burial - 1 : column.hasBone ? column.burial : 4;
      for (let i = 0; i < removals; i++) before = H.digVoxelExcavate(site, before, column.index, 'brush').state;
    }
    const trowel = H.digVoxelExcavate(site, before, bone.index, 'trowel');
    const contactBefore = { ...before, tool: 'trowel' };
    const first = H.digVoxelLastStroke(seed, trowel.state, contactBefore, action(trowel.layersRemoved, trowel.contactsFound.length));
    expect(first).toMatchObject({ changedCount: 1, removedLayers: 0, newContacts: 1 });
    expect(first.columns.find(column => column.index === bone.index)).toMatchObject({ delta: 0, newContact: true });
    const brushBefore = { ...trowel.state, tool: 'brush' }, brush = H.digVoxelExcavate(site, brushBefore, bone.index, 'brush');
    const revealed = H.digVoxelRevealed(site, brush.state), beforeState = JSON.stringify(brush.state);
    const check = I.digEvidenceCheck(site, { digRevealed: revealed, digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) });
    const second = H.digVoxelLastStroke(seed, brush.state, brushBefore, action(brush.layersRemoved, brush.contactsFound.length));
    expect(second.columns[0]).toMatchObject({ index: bone.index, delta: 1, contactBefore: true, contactAfter: false });
    expect(H.digVoxelRevealed(site, brush.state)).toEqual(revealed); expect(JSON.stringify(brush.state)).toBe(beforeState);
    expect(I.digEvidenceCheck(site, { digRevealed: H.digVoxelRevealed(site, brush.state), digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) })).toEqual(check);
    expect(H.digVoxelLastStroke(seed, brushBefore, before, { seed, kind: 'undo' })).toBeNull();
  });

  it('ships identical bounded last-stroke helpers in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(section(mirror, '// DINO_VOXEL_DIG_STROKE_START', '// DINO_VOXEL_DIG_STROKE_END')).toBe(strokeSource);
  });
});
