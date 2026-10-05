import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a) throw new Error('Missing bounded action-plan seam: ' + start);
  return text.slice(a, b);
}
const I = internals();
const rng = new Function(section(source, '  function mulberry32(seed)', '  // ═') + '\nreturn mulberry32;')();
const H = new Function('mulberry32', 'digRevealedCells',
  section(source, '// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END') + '\n' +
  section(source, '// DINO_VOXEL_DIG_PLAN_START', '// DINO_VOXEL_DIG_PLAN_END') +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelColumn,digVoxelFootprint,digVoxelExcavate,digVoxelRevealed,digVoxelPlan};'
)(rng, I.digRevealedCells);
const site = I.digSiteFor(42), layout = H.digVoxelLayout(site);
const bone = layout.columns.find(column => column.hasBone), dry = layout.columns.find(column => !column.hasBone);
const initial = () => H.digVoxelState(null, site, []);
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function keysDeep(value) {
  return value && typeof value === 'object' ? Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]) : [];
}
function contactState() {
  let state = initial();
  for (let i = 0; i < bone.burial - 1; i++) state = H.digVoxelExcavate(site, state, bone.index, 'brush').state;
  return H.digVoxelExcavate(site, state, bone.index, 'trowel').state;
}
// Exercise the production root action so preview bounds include its center
// guard. The low-level trowel helper alone permits digging nearby columns.
function rootStroke(actualSite, raw, focus, tool) {
  const patches = [], state = { ...H.digVoxelState(raw, actualSite, []), tool };
  let calls = 0;
  const invoke = new Function('inspectSection', 'inspectionOnly', 'revealed', 'voxel', 'site', 'seed', 'undoHistory', 'digVoxelExcavate', 'digVoxelState', 'upd', 'announceToSR', 'dvt', 'dst',
    section(source, '        function dig(i) {', '        function undoExcavation()') + '\nreturn dig;'
  )(false, false, H.digVoxelRevealed(actualSite, state), state, actualSite, actualSite.seed, [],
    (...args) => { calls++; return H.digVoxelExcavate(...args); }, H.digVoxelState,
    patch => patches.push(patch), () => {}, (key, fallback) => fallback, (key, fallback) => fallback);
  invoke(focus);
  return { calls, patches, state: patches.find(patch => patch.digVoxel)?.digVoxel || state };
}

describe('observable-only next-stroke plans', () => {
  it('uses the original clipped brush/trowel footprint at corners, edges and interior', () => {
    for (const [focus, expected] of [[0, [0, 1, 6, 7]], [2, [1, 2, 3, 7, 8, 9]], [7, [0, 1, 2, 6, 7, 8, 12, 13, 14]], [23, [16, 17, 22, 23]]]) {
      const plan = H.digVoxelPlan(site, initial(), focus, 'trowel');
      expect(plan.footprint).toEqual(expected);
      expect(plan.columns.map(column => column.index)).toEqual(expected);
      expect(plan.footprint).toEqual(H.digVoxelFootprint(focus, 'trowel'));
      expect(plan).toMatchObject({ blocked: false, minRemoval: 0, maxRemoval: expected.length, eligibleCount: expected.length, maxAffected: expected.length });
      expect(H.digVoxelPlan(site, initial(), focus, 'brush').footprint).toEqual([focus]);
    }
  });

  it('gives identical plans when observations match but hidden layouts and identities differ', () => {
    const other = { ...site, seed: site.seed + 1, chosen: { id: 'hidden-other-species' }, boneCells: { 0: true, 23: true }, clues: [{ text: 'hidden clue' }] };
    const first = initial(), second = H.digVoxelState(null, other, []);
    first.depths.fill(1); second.depths.fill(1); // below every possible exposure; no contact observed
    for (let focus = 0; focus < 24; focus++) for (const tool of ['brush', 'trowel']) {
      expect(H.digVoxelPlan(site, first, focus, tool)).toEqual(H.digVoxelPlan(other, second, focus, tool));
    }
  });

  it('does not become an oracle when a hidden contact makes actual next removals differ', () => {
    const observed = initial(); observed.depths[bone.index] = bone.burial - 1;
    const withoutBone = { ...site, boneCells: { ...site.boneCells } }; delete withoutBone.boneCells[bone.index];
    const plan = H.digVoxelPlan(site, observed, bone.index, 'trowel');
    expect(plan).toEqual(H.digVoxelPlan(withoutBone, observed, bone.index, 'trowel'));
    expect(plan.columns.find(column => column.index === bone.index)).toMatchObject({ status: 'candidate', contact: false, minRemoval: 0, maxRemoval: 1 });
    const stopped = H.digVoxelExcavate(site, observed, bone.index, 'trowel');
    const removed = H.digVoxelExcavate(withoutBone, observed, bone.index, 'trowel');
    expect(stopped.state.depths[bone.index]).toBe(observed.depths[bone.index]);
    expect(removed.state.depths[bone.index]).toBe(observed.depths[bone.index] + 1);
    expect(stopped.contactsFound).toContain(bone.index);
  });

  it('returns conservative unknown-trowel bounds and exact eligible-brush removal', () => {
    const brush = H.digVoxelPlan(site, initial(), 7, 'brush');
    expect(brush).toMatchObject({ minRemoval: 1, maxRemoval: 1, eligibleCount: 1, maxAffected: 1, contactCount: 0, contactStopCount: 0 });
    expect(brush.columns[0]).toMatchObject({ status: 'candidate', removed: 0, remaining: 4, minRemoval: 1, maxRemoval: 1 });
    const trowel = H.digVoxelPlan(site, initial(), 7, 'trowel');
    expect(trowel.columns.every(column => column.status === 'candidate' && column.minRemoval === 0 && column.maxRemoval === 1)).toBe(true);
    expect(trowel).toMatchObject({ minRemoval: 0, maxRemoval: 9, maxAffected: 9 });
  });

  it('counts a known contact as a trowel stop and a one-layer brush candidate', () => {
    const state = contactState();
    const trowel = H.digVoxelPlan(site, state, bone.index, 'trowel');
    expect(trowel.blocked).toBe(false);
    expect(trowel.columns.find(column => column.index === bone.index)).toMatchObject({ status: 'contact-stop', contact: true, minRemoval: 0, maxRemoval: 0 });
    expect(trowel.contactStopCount).toBe(1);
    expect(trowel.contactCount).toBe(1);
    expect(trowel.eligibleCount).toBe(trowel.footprint.length - 1);
    const brush = H.digVoxelPlan(site, state, bone.index, 'brush');
    expect(brush).toMatchObject({ blocked: false, contactCount: 1, contactStopCount: 0, eligibleCount: 1, minRemoval: 1, maxRemoval: 1 });
    expect(brush.columns[0]).toMatchObject({ status: 'candidate', contact: true, minRemoval: 1, maxRemoval: 1 });
  });

  it('protects exposed neighbors and cleared ground while counting eligible surrounding columns', () => {
    const state = initial(), focus = 7, footprint = H.digVoxelFootprint(focus, 'trowel');
    const protectedBone = layout.columns.find(column => footprint.includes(column.index) && column.index !== focus && column.hasBone);
    const cleared = layout.columns.find(column => footprint.includes(column.index) && column.index !== focus && !column.hasBone);
    expect(protectedBone).toBeTruthy(); expect(cleared).toBeTruthy();
    state.depths[protectedBone.index] = protectedBone.burial; state.depths[cleared.index] = 4;
    const plan = H.digVoxelPlan(site, state, focus, 'trowel');
    expect(plan).toMatchObject({ blocked: false, protectedCount: 1, clearedCount: 1, eligibleCount: footprint.length - 2, maxRemoval: footprint.length - 2 });
    expect(plan.columns.find(column => column.index === protectedBone.index)).toMatchObject({ status: 'protected', minRemoval: 0, maxRemoval: 0 });
    expect(plan.columns.find(column => column.index === cleared.index)).toMatchObject({ status: 'cleared', minRemoval: 0, maxRemoval: 0 });
  });

  it('matches the root protected/cleared-center guard instead of forecasting neighboring excavation', () => {
    for (const [center, reason] of [[bone, 'protected'], [dry, 'cleared']]) {
      const state = initial(); state.depths[center.index] = center.hasBone ? center.burial : 4;
      const plan = H.digVoxelPlan(site, state, center.index, 'trowel');
      expect(plan).toMatchObject({ blocked: true, blockReason: reason, minRemoval: 0, maxRemoval: 0, eligibleCount: 0, maxAffected: 0 });
      expect(plan.footprint).toEqual(H.digVoxelFootprint(center.index, 'trowel'));
      expect(plan.columns.some(column => column.status === 'candidate')).toBe(true);
      expect(plan.columns.every(column => column.minRemoval === 0 && column.maxRemoval === 0)).toBe(true);
      const actual = rootStroke(site, state, center.index, 'trowel');
      expect(actual.calls).toBe(0);
      expect(actual.state.depths).toEqual(state.depths);
      expect(actual.state.contacts).toEqual(state.contacts);
      expect(actual.patches.some(patch => 'digRevealed' in patch || 'digVoxelUndo' in patch || 'digVoxelAction' in patch)).toBe(false);
    }
  });

  it('discards stale seed payloads and bounds corrupt focus, tools and current-state arrays', () => {
    const stale = { version: 1, seed: site.seed + 1, depths: Array(24).fill(4), contacts: Array(24).fill(true), tool: 'trowel', focus: 23 };
    expect(H.digVoxelPlan(site, stale)).toEqual(H.digVoxelPlan(site, null));
    const corrupt = { version: 1, seed: site.seed, depths: ['4', -5, NaN, Infinity, {}, 99], contacts: Array(30).fill(true), focus: 7, tool: 'trowel' };
    for (const focus of [undefined, null, -1, 24, 1.5, NaN, Infinity, '23', {}, []]) {
      const plan = H.digVoxelPlan(site, corrupt, focus, 'hammer');
      expect(plan).toMatchObject({ focus: 7, coord: 'B2', tool: 'trowel' });
      for (const column of plan.columns) {
        expect(Number.isInteger(column.removed)).toBe(true); expect(column.removed).toBeGreaterThanOrEqual(0); expect(column.removed).toBeLessThanOrEqual(4);
        expect(column.remaining).toBe(4 - column.removed);
        expect(column.minRemoval).toBeGreaterThanOrEqual(0); expect(column.maxRemoval).toBeLessThanOrEqual(1);
      }
    }
    expect(H.digVoxelPlan(site, { ...corrupt, focus: '7', tool: 'bad' }, '7', null)).toMatchObject({ focus: 0, coord: 'A1', tool: 'brush' });
    expect(H.digVoxelPlan(site, corrupt, 0, 'brush')).toMatchObject({ focus: 0, tool: 'brush' });
    for (const raw of [null, undefined, [], 42, 'bad', { ...corrupt, version: 99 }, { ...corrupt, seed: String(site.seed) }]) expect(H.digVoxelPlan(site, raw)).toEqual(H.digVoxelPlan(site, null));
  });

  it('preserves migrated legacy observations and never unlocks a clue from planning', () => {
    const migrated = H.digVoxelState(null, site, [bone.index, dry.index]);
    const before = structuredClone(migrated), revealed = H.digVoxelRevealed(site, migrated);
    expect(H.digVoxelPlan(site, migrated, bone.index, 'brush').blockReason).toBe('protected');
    expect(H.digVoxelPlan(site, migrated, dry.index, 'trowel').blockReason).toBe('cleared');
    for (let focus = 0; focus < 24; focus++) H.digVoxelPlan(site, migrated, focus, 'trowel');
    expect(migrated).toEqual(before); expect(H.digVoxelRevealed(site, migrated)).toEqual(revealed);
    const untouched = initial(); H.digVoxelPlan(site, untouched, bone.index, 'brush');
    expect(I.digEvidenceCheck(site, { digRevealed: H.digVoxelRevealed(site, untouched), digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) }).used).toHaveLength(0);
  });

  it('accepts frozen inputs, returns detached data, and exposes no hidden/future result fields', () => {
    const frozenSite = freeze(structuredClone(site)), state = freeze(contactState());
    const plan = H.digVoxelPlan(frozenSite, state, bone.index, 'trowel'), pristine = structuredClone(plan);
    for (const key of ['hasBone', 'burial', 'coverRemaining', 'fossilY', 'chosen', 'species', 'clues', 'state', 'revealed', 'bonesExposed', 'contactsFound', 'anatomy']) expect(keysDeep(plan)).not.toContain(key);
    plan.columns[0].status = 'changed'; plan.columns[0].maxRemoval = 99; plan.footprint.push(99);
    expect(H.digVoxelPlan(frozenSite, state, bone.index, 'trowel')).toEqual(pristine);
  });

  it('bounds actual root removals over seeded states without predicting their hidden results', () => {
    for (const seed of [1, 2, 7, 42, 73, 1000000000]) {
      const actualSite = I.digSiteFor(seed);
      let state = H.digVoxelState(null, actualSite, []);
      for (let round = 0; round < 3; round++) {
        for (const focus of [0, 5, 7, 13, 18, 23]) for (const tool of ['brush', 'trowel']) {
          const plan = H.digVoxelPlan(actualSite, state, focus, tool), stroke = rootStroke(actualSite, state, focus, tool);
          const removals = stroke.state.depths.reduce((sum, depth, index) => sum + depth - state.depths[index], 0);
          expect(removals).toBeGreaterThanOrEqual(plan.minRemoval); expect(removals).toBeLessThanOrEqual(plan.maxRemoval);
          expect(stroke.state.depths.filter((depth, index) => depth > state.depths[index]).length).toBeLessThanOrEqual(plan.maxAffected);
        }
        for (const focus of [0, 7, 13, 23]) state = H.digVoxelExcavate(actualSite, state, focus, round === 2 ? 'brush' : 'trowel').state;
      }
    }
  });

  it('ships the same bounded helper expressions in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(section(mirror, '// DINO_VOXEL_DIG_PLAN_START', '// DINO_VOXEL_DIG_PLAN_END'))
      .toBe(section(source, '// DINO_VOXEL_DIG_PLAN_START', '// DINO_VOXEL_DIG_PLAN_END'));
  });
});
