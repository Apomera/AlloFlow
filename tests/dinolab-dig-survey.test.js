import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { internals } from './helpers/dino_lab_harness.js';

const source = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
function section(text, start, end) {
  const a = text.indexOf(start), b = text.indexOf(end, a + start.length);
  if (a < 0 || b <= a || text.indexOf(start, a + start.length) >= 0) throw Error('Missing or ambiguous field-survey seam: ' + start);
  return text.slice(a, b);
}
const I = internals();
const rng = new Function(section(source, '  function mulberry32(seed)', '  // ═') + '\nreturn mulberry32;')();
const surveySource = section(source, '// DINO_VOXEL_DIG_SURVEY_START', '// DINO_VOXEL_DIG_SURVEY_END');
const H = new Function('mulberry32', 'digRevealedCells',
  section(source, '// DINO_VOXEL_DIG_MODEL_START', '// DINO_VOXEL_DIG_MODEL_END') + '\n' + surveySource +
  '\nreturn {digVoxelLayout,digVoxelState,digVoxelColumn,digVoxelExcavate,digVoxelRevealed,digVoxelSurvey,digVoxelSurveyAnswers};'
)(rng, I.digRevealedCells);
const site = I.digSiteFor(42), layout = H.digVoxelLayout(site);
const bone = layout.columns.find(column => column.hasBone), dry = layout.columns.find(column => !column.hasBone);
const initial = () => H.digVoxelState(null, site, []);
const publicColumnKeys = ['index', 'row', 'col', 'coord', 'removed', 'remaining', 'status', 'shape'].sort();
const answerFields = ['record', 'identity', 'association'];
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function keysDeep(value) { return value && typeof value === 'object' ? Object.entries(value).flatMap(([key, child]) => [key, ...keysDeep(child)]) : []; }
function beforeContact() {
  let state = initial();
  for (let i = 0; i < bone.burial - 1; i++) state = H.digVoxelExcavate(site, state, bone.index, 'brush').state;
  return state;
}
function blank(key) { return { key, record: null, identity: null, association: null }; }
function answers(survey, extras = {}) { return { key: H.digVoxelSurveyAnswers(survey).key, record: 'observation', identity: 'inference', association: 'inference', ...extras }; }
function expectPublic(survey) {
  expect(Object.keys(survey).sort()).toEqual(['columns', 'focus', 'seed', 'selected']);
  expect(survey.columns).toHaveLength(24);
  expect(survey.selected).toBe(survey.columns[survey.focus]);
  survey.columns.forEach((column, index) => {
    expect(Object.keys(column).sort()).toEqual(publicColumnKeys);
    expect(column).toMatchObject({ index, row: Math.floor(index / 6), col: index % 6,
      coord: String.fromCharCode(65 + index % 6) + (Math.floor(index / 6) + 1) });
    expect(Number.isInteger(column.removed)).toBe(true);
    expect(column.removed).toBeGreaterThanOrEqual(0); expect(column.removed).toBeLessThanOrEqual(4);
    expect(column.remaining).toBe(4 - column.removed);
    expect(['covered', 'partial', 'contact', 'exposed', 'cleared']).toContain(column.status);
    expect(column.shape).toBe(column.status === 'exposed' ? ['curved', 'elongate', 'compact'][index % 3] : null);
  });
  for (const key of ['burial', 'hasBone', 'fossilY', 'coverRemaining', 'species', 'anatomy', 'chosen', 'boneCells', 'clues', 'catalog', 'age', 'association']) expect(keysDeep(survey)).not.toContain(key);
}

describe('actual normalized voxel field-survey records', () => {
  it('starts with exactly 24 covered row-major columns and no fragment shape hints', () => {
    const survey = H.digVoxelSurvey(site, initial(), 0);
    expectPublic(survey);
    expect(survey).toMatchObject({ seed: 42, focus: 0 });
    expect(survey.columns.every(column => column.status === 'covered' && column.removed === 0 && column.remaining === 4 && column.shape === null)).toBe(true);
    expect(survey.columns.filter(column => column.index === 5 || column.index === 18 || column.index === 23).map(column => column.coord)).toEqual(['F1', 'A4', 'F4']);
  });

  it('describes shallow removal as partial without announcing buried shapes', () => {
    const state = initial(); state.depths.fill(1);
    const survey = H.digVoxelSurvey(site, state, bone.index);
    expectPublic(survey);
    expect(survey.columns.every(column => column.status === 'partial' && column.shape === null && column.remaining === 3)).toBe(true);
  });

  it('shows a real trowel contact as a recorded contact with no whole fragment shape', () => {
    const before = beforeContact(), contact = H.digVoxelExcavate(site, before, bone.index, 'trowel').state;
    expect(H.digVoxelSurvey(site, before, bone.index).selected.status).toBe('partial');
    const survey = H.digVoxelSurvey(site, contact, bone.index);
    expectPublic(survey);
    expect(survey.selected).toMatchObject({ index: bone.index, status: 'contact', removed: bone.burial - 1, remaining: 5 - bone.burial, shape: null });
    expect(survey.columns.filter(column => column.shape !== null)).toHaveLength(0);
  });

  it('shows an exposed shape only after the brush removes the actual final cover', () => {
    const contact = H.digVoxelExcavate(site, beforeContact(), bone.index, 'trowel').state;
    const exposed = H.digVoxelExcavate(site, contact, bone.index, 'brush').state;
    const survey = H.digVoxelSurvey(site, exposed, bone.index);
    expectPublic(survey);
    expect(survey.selected).toMatchObject({ status: 'exposed', removed: bone.burial, remaining: 4 - bone.burial,
      shape: ['curved', 'elongate', 'compact'][bone.index % 3] });
  });

  it('clears a dry column after four actual brush removals without attaching a shape', () => {
    let state = initial();
    for (let i = 0; i < 4; i++) state = H.digVoxelExcavate(site, state, dry.index, 'brush').state;
    const survey = H.digVoxelSurvey(site, state, dry.index);
    expectPublic(survey);
    expect(survey.selected).toMatchObject({ status: 'cleared', removed: 4, remaining: 0, shape: null });
  });

  it('uses all three generic shape labels across actually exposed seeded finds', () => {
    const seen = new Set();
    for (const seed of [1, 42, 73]) {
      const actualSite = I.digSiteFor(seed), actualLayout = H.digVoxelLayout(actualSite);
      const migrated = H.digVoxelState(null, actualSite, Array.from({ length: 24 }, (_, index) => index));
      const survey = H.digVoxelSurvey(actualSite, migrated, 0); expectPublic(survey);
      for (const column of actualLayout.columns) {
        const publicColumn = survey.columns[column.index];
        expect(publicColumn.status).toBe(column.hasBone ? 'exposed' : 'cleared');
        if (column.hasBone) seen.add(publicColumn.shape); else expect(publicColumn.shape).toBeNull();
      }
    }
    expect([...seen].sort()).toEqual(['compact', 'curved', 'elongate']);
  });

  it('respects explicit legacy migration and discards stale current-state seeds', () => {
    const migrated = H.digVoxelState(null, site, [bone.index, dry.index]);
    const survey = H.digVoxelSurvey(site, migrated, bone.index);
    expect(survey.columns[bone.index].status).toBe('exposed'); expect(survey.columns[dry.index].status).toBe('cleared');
    const stale = { ...migrated, seed: site.seed + 1 };
    expect(H.digVoxelSurvey(site, stale, bone.index).columns.every(column => column.status === 'covered' && column.shape === null)).toBe(true);
    const newSite = I.digSiteFor(43), next = H.digVoxelSurvey(newSite, migrated, bone.index);
    expect(next.seed).toBe(43); expect(next.columns.every(column => column.status === 'covered')).toBe(true);
    expectPublic(next);
  });

  it('restores the public contact/partial states after Undo instead of retaining an exposed hint', () => {
    const before = beforeContact(), contact = H.digVoxelExcavate(site, before, bone.index, 'trowel').state;
    const exposed = H.digVoxelExcavate(site, contact, bone.index, 'brush').state;
    expect(H.digVoxelSurvey(site, exposed, bone.index).selected.status).toBe('exposed');
    expect(H.digVoxelSurvey(site, contact, bone.index).selected).toMatchObject({ status: 'contact', shape: null });
    expect(H.digVoxelSurvey(site, before, bone.index).selected).toMatchObject({ status: 'partial', shape: null });
  });

  it('uses the existing restored-state normalization and bounded focus rules', () => {
    const restored = { version: 1, seed: 42, depths: [999, -1, '2', NaN, 1.5], contacts: Array(24).fill('true'), tool: 'bad', focus: 23 };
    const survey = H.digVoxelSurvey(site, restored); expectPublic(survey); expect(survey.focus).toBe(23);
    for (const column of survey.columns) {
      const normalized = H.digVoxelColumn(site, restored, column.index);
      expect(column.removed).toBe(normalized.removed); expect(column.remaining).toBe(normalized.remaining);
    }
    const raw = { ...initial(), focus: 19 };
    for (const focus of [undefined, null, -1, 24, 1.5, NaN, Infinity, '0', {}, []]) expect(H.digVoxelSurvey(site, raw, focus).focus).toBe(19);
    expect(H.digVoxelSurvey(site, raw, 0).focus).toBe(0);
    for (const rawFocus of ['19', -1, 24, 1.5, null]) expect(H.digVoxelSurvey(site, { ...raw, focus: rawFocus }).focus).toBe(0);
  });

  it('returns fresh arrays/column objects, preserves frozen progress and keeps only selected aliasing', () => {
    const frozenSite = freeze(structuredClone(site)), raw = freeze(initial()), before = JSON.stringify(raw);
    const first = H.digVoxelSurvey(frozenSite, raw, 7), second = H.digVoxelSurvey(frozenSite, raw, 7);
    expect(first.columns).not.toBe(second.columns); expect(first.columns).not.toBe(raw.depths);
    first.columns.forEach((column, index) => expect(column).not.toBe(second.columns[index]));
    expect(first.selected).toBe(first.columns[7]); expect(second.selected).toBe(second.columns[7]);
    first.columns[7].status = 'exposed'; first.columns[7].shape = 'compact'; first.columns.push({ index: 99 });
    expect(H.digVoxelSurvey(frozenSite, raw, 7)).toEqual(second); expect(JSON.stringify(raw)).toBe(before);
  });

  it('ignores hidden identity/catalog fields in site and raw progress', () => {
    const actualSite = { seed: site.seed, boneCells: { ...site.boneCells } }, raw = initial();
    for (const object of [actualSite, raw]) for (const key of ['chosen', 'species', 'anatomy', 'clues', 'candidates', 'catalog', 'burial', 'hasBone', 'fossilY', 'layout']) {
      Object.defineProperty(object, key, { get() { throw Error('Hidden field read: ' + key); } });
    }
    expect(() => H.digVoxelSurvey(actualSite, raw, 7)).not.toThrow();
    expectPublic(H.digVoxelSurvey(actualSite, raw, 7));
  });

  it('does not disclose differing hidden placements or burial depths through matching covered surfaces', () => {
    const otherSite = { seed: site.seed, boneCells: { 0: true, 23: true } };
    const first = initial(), second = H.digVoxelState(null, otherSite, []); first.depths.fill(1); second.depths.fill(1);
    expect(H.digVoxelSurvey(site, first, 7)).toEqual(H.digVoxelSurvey(otherSite, second, 7));
    const differentSeedSite = I.digSiteFor(73), third = H.digVoxelState(null, differentSeedSite, []); third.depths.fill(1);
    expect(H.digVoxelLayout(site).columns.map(column => column.burial)).not.toEqual(H.digVoxelLayout(differentSeedSite).columns.map(column => column.burial));
    expect(H.digVoxelSurvey(site, first, 7).columns).toEqual(H.digVoxelSurvey(differentSeedSite, third, 7).columns);
    expect(H.digVoxelSurvey(differentSeedSite, third, 7).seed).toBe(73);
  });

  it('keeps existing excavation evidence and available catalog clues unchanged', () => {
    const raw = H.digVoxelState(null, site, [bone.index, dry.index]), before = JSON.stringify(raw), revealed = H.digVoxelRevealed(site, raw);
    const evidenceState = { digRevealed: revealed, digGuess: site.chosen.id, digCitedClues: site.clues.map(clue => clue.id) };
    const evidence = I.digEvidenceCheck(site, evidenceState);
    for (let focus = 0; focus < 24; focus++) {
      const survey = H.digVoxelSurvey(site, raw, focus); H.digVoxelSurveyAnswers(survey, answers(survey));
    }
    expect(JSON.stringify(raw)).toBe(before); expect(H.digVoxelRevealed(site, raw)).toEqual(revealed);
    expect(I.digEvidenceCheck(site, { ...evidenceState, digRevealed: H.digVoxelRevealed(site, raw) })).toEqual(evidence);
  });
});

describe('bounded formative responses keyed to the selected public survey record', () => {
  it('returns the exact observation key and three null responses by default', () => {
    const survey = H.digVoxelSurvey(site, initial(), 7);
    expect(H.digVoxelSurveyAnswers(survey)).toEqual(blank('42:7:0:covered'));
    expect(Object.keys(H.digVoxelSurveyAnswers(survey)).sort()).toEqual(['association', 'identity', 'key', 'record']);
  });

  it('accepts both exact response tokens independently for every question', () => {
    const survey = H.digVoxelSurvey(site, initial(), 0);
    for (const record of ['observation', 'inference']) for (const identity of ['observation', 'inference']) for (const association of ['observation', 'inference']) {
      const raw = answers(survey, { record, identity, association });
      expect(H.digVoxelSurveyAnswers(survey, raw)).toEqual(raw);
    }
  });

  it('clears corrupt response values individually without coercion or retaining extra properties', () => {
    const survey = H.digVoxelSurvey(site, initial(), 0);
    const hostile = { toString() { throw Error('coerced'); }, valueOf() { throw Error('coerced'); } };
    for (const field of answerFields) for (const value of [undefined, null, '', 'Observation', 'observation ', 'inference\n', true, false, 0, 1, NaN, Infinity, [], {}, hostile, new String('observation')]) {
      const raw = answers(survey, { [field]: value, score: 3, correct: true, species: 'hidden' });
      const expected = answers(survey, { [field]: null });
      expect(H.digVoxelSurveyAnswers(survey, raw)).toEqual(expected);
    }
  });

  it('ignores malformed raw payloads and exact-key mismatches instead of merging their answers', () => {
    const survey = H.digVoxelSurvey(site, initial(), 7), key = '42:7:0:covered';
    for (const raw of [undefined, null, false, true, 0, '', key, [], {}, { key: null }, { key: 7 }, answers(survey, { key: '42:0:0:covered' }), answers(survey, { key: key + ' ' })]) {
      expect(H.digVoxelSurveyAnswers(survey, raw)).toEqual(blank(key));
    }
    const stale = { key: 'different' };
    for (const field of answerFields) Object.defineProperty(stale, field, { get() { throw Error('Stale answer read'); } });
    expect(H.digVoxelSurveyAnswers(survey, stale)).toEqual(blank(key));
  });

  it('changes the key for selection, layer removal, contact recording, exposure, Undo and a new seed', () => {
    const before = beforeContact(), partial = H.digVoxelSurvey(site, before, bone.index), raw = answers(partial);
    const contactState = H.digVoxelExcavate(site, before, bone.index, 'trowel').state, contact = H.digVoxelSurvey(site, contactState, bone.index);
    expect(contact.selected.removed).toBe(partial.selected.removed);
    expect(H.digVoxelSurveyAnswers(contact).key).not.toBe(raw.key);
    expect(H.digVoxelSurveyAnswers(contact, raw)).toEqual(blank(H.digVoxelSurveyAnswers(contact).key));
    const exposedState = H.digVoxelExcavate(site, contactState, bone.index, 'brush').state, exposed = H.digVoxelSurvey(site, exposedState, bone.index);
    const exposedAnswers = answers(exposed);
    expect(H.digVoxelSurveyAnswers(exposed).key).not.toBe(H.digVoxelSurveyAnswers(contact).key);
    expect(H.digVoxelSurveyAnswers(contact, exposedAnswers)).toEqual(blank(H.digVoxelSurveyAnswers(contact).key));
    expect(H.digVoxelSurveyAnswers(partial, raw)).toEqual(raw);
    const other = H.digVoxelSurvey(site, before, dry.index);
    expect(H.digVoxelSurveyAnswers(other, raw)).toEqual(blank(H.digVoxelSurveyAnswers(other).key));
    const nextSite = I.digSiteFor(43), next = H.digVoxelSurvey(nextSite, exposedState, bone.index);
    expect(H.digVoxelSurveyAnswers(next, raw)).toEqual(blank(H.digVoxelSurveyAnswers(next).key));
    const initialSurvey = H.digVoxelSurvey(site, initial(), dry.index), initialAnswers = answers(initialSurvey);
    const removed = H.digVoxelExcavate(site, initial(), dry.index, 'brush').state, changed = H.digVoxelSurvey(site, removed, dry.index);
    expect(H.digVoxelSurveyAnswers(changed, initialAnswers)).toEqual(blank(H.digVoxelSurveyAnswers(changed).key));
  });

  it('keeps the same response key when tools or display settings change without new observations', () => {
    const raw = beforeContact(), survey = H.digVoxelSurvey(site, raw, bone.index), saved = answers(survey);
    const changedPresentation = { ...raw, tool: 'trowel', digVoxelView: 'section', digVoxelCamera: 'top', digVoxelCompareStroke: false, digVoxelSurveyGuides: false };
    expect(H.digVoxelSurveyAnswers(H.digVoxelSurvey(site, changedPresentation, bone.index), saved)).toEqual(saved);
  });

  it('rejects invalid current survey selection data instead of building a misleading key', () => {
    const survey = H.digVoxelSurvey(site, initial(), 7), saved = answers(survey);
    for (const actual of [undefined, null, [], {}, { ...survey, seed: '42' }, { ...survey, seed: 0 }, { ...survey, seed: 1000000001 }, { ...survey, focus: '7' }, { ...survey, selected: null }]) {
      expect(H.digVoxelSurveyAnswers(actual, saved)).toEqual(blank(null));
    }
    const corruptions = [{ index: -1 }, { index: 24 }, { row: 3 }, { col: 4 }, { coord: 'A1' }, { removed: '0' }, { remaining: 3 },
      { status: 'unknown' }, { status: 'partial' }, { status: 'contact' }, { status: 'exposed' }, { status: 'cleared' }, { shape: 'curved' }];
    for (const corruption of corruptions) expect(H.digVoxelSurveyAnswers({ ...survey, selected: { ...survey.selected, ...corruption } }, saved)).toEqual(blank(null));
  });

  it('reads only public selected fields and the three exact response fields', () => {
    const survey = H.digVoxelSurvey(site, initial(), 7), selected = { ...survey.selected }, raw = answers(survey);
    for (const object of [selected, survey, raw]) for (const key of ['burial', 'hasBone', 'fossilY', 'species', 'anatomy', 'clues', 'chosen', 'score', 'correct', 'history', 'notes']) {
      Object.defineProperty(object, key, { get() { throw Error('Unexpected hidden field read: ' + key); } });
    }
    expect(() => H.digVoxelSurveyAnswers({ ...survey, selected }, raw)).not.toThrow();
    expect(H.digVoxelSurveyAnswers({ ...survey, selected }, raw)).toEqual(answers(survey));
  });

  it('returns fresh bounded answer copies for frozen inputs without mutating survey or progress', () => {
    const survey = freeze(H.digVoxelSurvey(site, initial(), 7)), raw = freeze(answers(survey)), before = JSON.stringify({ survey, raw });
    const first = H.digVoxelSurveyAnswers(survey, raw), second = H.digVoxelSurveyAnswers(survey, raw);
    expect(first).not.toBe(second); first.record = 'inference'; first.key = 'corrupted'; first.hidden = true;
    expect(H.digVoxelSurveyAnswers(survey, raw)).toEqual(second); expect(JSON.stringify({ survey, raw })).toBe(before);
    expect(Object.keys(second).sort()).toEqual(['association', 'identity', 'key', 'record']);
  });

  it('ships identical bounded survey helpers in the desktop mirror', () => {
    const mirror = readFileSync('desktop/web-app/public/stem_lab/stem_tool_dinolab.js', 'utf8').replace(/\r\n/g, '\n');
    expect(section(mirror, '// DINO_VOXEL_DIG_SURVEY_START', '// DINO_VOXEL_DIG_SURVEY_END')).toBe(surveySource);
  });
});
