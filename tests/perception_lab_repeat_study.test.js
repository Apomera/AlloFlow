import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const MODES = [
  { id: 'brightness', starts: [72, 184, 100], values: [144, 128, 160], reference: 128, median: 144, range: 32, difference: 16, percent: null, unit: 'RGB' },
  { id: 'ebbinghaus', starts: [40, 60, 44], values: [44, 60, 52], reference: 48, median: 52, range: 16, difference: 4, percent: 100 / 12, unit: 'units' },
  { id: 'mullerLyer', starts: [325, 475, 363], values: [390, 420, 410], reference: 400, median: 410, range: 30, difference: 10, percent: 2.5, unit: 'units' },
];
let engine, config, host, root, latest, latestAll, edit, changeProfile, announce;

function makeSession(id = 'brightness', values = {}) {
  const study = engine.createStudy(id, { matching: true, note: 'First match note', ...values }, 'test-three-matches');
  const state = engine.normalize({ experiment: id, models: { [id]: engine.studyModel(study) } });
  return { state, study };
}
function adjusted(state, study, matchValue, values = {}) {
  return engine.normalize({ ...state, models: { ...state.models, [study.experiment]: { ...state.models[study.experiment], prediction: 'Same', matchValue, ...values } } });
}
function record(session, value, index) {
  return engine.recordStudyTrial(adjusted(session.state, session.study, value), session.study, index, 'trial-record-' + index, '2026-10-03T12:00:00.000Z');
}
function complete(mode) {
  let result = makeSession(mode.id);
  mode.values.forEach((value, index) => {
    result = record(result, value, index + 1);
    expect(result.recorded).toBe(true);
  });
  return result;
}
function flatten(nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => typeof node === 'object' && node ? [node, ...flatten(node.children || [])] : []);
}
const surroundings = (id, model) => flatten(engine.scene(id, model)).filter(node => node.props?.['data-perception-context']);

async function mount(seed = {}, { strict = false } = {}) {
  function Harness() {
    const [toolData, setToolData] = React.useState({ perceptionLab: seed, otherTool: { marker: 77 } });
    const [profile, setProfile] = React.useState('repeat-learner');
    latest = toolData.perceptionLab;
    latestAll = toolData;
    changeProfile = setProfile;
    edit = update => setToolData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData, setToolData, activeProfileId: profile, announceToSR: announce }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, required = true) {
  const found = [...host.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  if (required) expect(found, label).toBeTruthy();
  return found;
}
const click = async label => act(async () => button(label).click());
async function input(id, value) {
  const node = host.querySelector('#' + id);
  expect(node, id).toBeTruthy();
  const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const activeBlock = () => host.querySelector('[data-perception-repeat-active]');
const summary = () => host.querySelector('[data-perception-study-summary]');
async function recordUI(value) {
  await input('perception-match-value', value);
  await click('Same');
  await click('Record match');
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab');
  engine = window.StemLab.PerceptionEngine;
  announce = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Repeated matching study engine', () => {
  it.each(MODES)('$id varies valid starting values while preserving the fixed reference and surroundings', mode => {
    let session = makeSession(mode.id, { swap: true, prediction: 'Same', reveal: true });
    const reference = engine.measurements(mode.id, session.study.base).reference;
    const baselineContext = surroundings(mode.id, session.state.models[mode.id]);
    const originalBase = structuredClone(session.study.base);
    mode.starts.forEach((start, index) => {
      const model = engine.studyModel(session.study);
      expect(model).toMatchObject({ matchValue: start, matching: true, swap: true, prediction: '', reveal: false });
      expect(engine.measurements(mode.id, model).reference).toBe(reference);
      // Fin endpoints follow a changed shaft; their angle, length and direction
      // stay frozen. The other two experiments keep all context positions fixed.
      if (mode.id !== 'mullerLyer') expect(surroundings(mode.id, model)).toEqual(baselineContext);
      expect(model.note).toBe(index ? '' : 'First match note');
      session = record(session, mode.values[index], index + 1);
      expect(session.recorded).toBe(true);
      expect(session.study.base).toEqual(originalBase);
    });
    expect(new Set(mode.starts).size).toBe(3);
    expect(mode.starts[0]).toBeLessThan(reference);
    expect(mode.starts[1]).toBeGreaterThan(reference);
    expect(mode.starts[2]).toBeLessThan(reference);
    expect(engine.studyModel(session.study)).toBeNull();
    expect(session.state.studies.map(item => item.repeat)).toEqual(mode.starts.map((startValue, index) => ({ id: 'test-three-matches', trial: index + 1, startValue })));
    expect(session.state.studies.map(item => item.model.note)).toEqual(['First match note', '', '']);
  });

  it('places brightness starts on opposite sides of each supported custom reference', () => {
    for (const target of [48, 128, 208]) {
      let session = makeSession('brightness', { target });
      const starts = [];
      for (let trial = 1; trial <= 3; trial++) {
        starts.push(engine.studyModel(session.study).matchValue);
        session = record(session, target, trial);
      }
      expect(starts).toEqual([Math.round((16 + target) / 2), Math.round((240 + target) / 2), Math.round((16 + target * 3) / 4)]);
      expect(starts[0]).toBeGreaterThanOrEqual(16);
      expect(starts[1]).toBeLessThanOrEqual(240);
      expect(starts[0]).toBeLessThan(target);
      expect(starts[1]).toBeGreaterThan(target);
      expect(starts[2]).toBeLessThan(target);
    }
  });

  it('requires a supported matching experiment and a nonempty group identity', () => {
    expect(engine.createStudy('cafeWall', { matching: true }, 'group')).toBeNull();
    expect(engine.createStudy('brightness', { matching: false }, 'group')).toBeNull();
    expect(engine.createStudy('brightness', { matching: true }, ' ')).toBeNull();
    expect(engine.studyModel(null)).toBeNull();
  });

  it.each(MODES)('$id reveals ordered values, median, range and domain-correct differences only after three matches', mode => {
    const result = complete(mode);
    expect(engine.studySummary(result.study)).toBeNull();
    expect(result.state.studies.every(item => item.model.reveal === false)).toBe(true);
    const revealed = engine.revealStudy(result.state, result.study);
    expect(revealed.revealed).toBe(true);
    const measured = engine.studySummary(revealed.study);
    expect(measured).toMatchObject({ count: 3, reference: mode.reference, values: mode.values, starts: mode.starts, median: mode.median, min: Math.min(...mode.values), max: Math.max(...mode.values), range: mode.range, difference: mode.difference, unit: mode.unit });
    if (mode.percent === null) expect(measured.percent).toBeNull();
    else expect(measured.percent).toBeCloseTo(mode.percent, 10);
    expect(revealed.state.models[mode.id].reveal).toBe(true);
    expect(revealed.state.studies.every(item => item.model.reveal)).toBe(true);
    expect(result.study.revealed).toBe(false);
    expect(result.state.studies.every(item => !item.model.reveal)).toBe(true);
  });

  it.each([
    ['missing impression', { prediction: '' }],
    ['invalid impression', { prediction: 'Incorrect choice' }],
    ['Observe mode', { matching: false }],
    ['already revealed frame', { reveal: true }],
    ['changed background difference', { contrast: 31 }],
    ['changed reference gray', { target: 160 }],
    ['changed visibility', { context: false }],
    ['changed context order', { swap: true }],
  ])('rejects a recording with %s without mutating either input', (_, values) => {
    const session = makeSession();
    const state = adjusted(session.state, session.study, 144, values);
    const before = structuredClone({ state, study: session.study });
    const result = engine.recordStudyTrial(state, session.study, 1, 'record', '2026-10-03');
    expect(result.recorded).toBe(false);
    expect(result.state.studies).toHaveLength(0);
    expect(state).toEqual(before.state);
    expect(session.study).toEqual(before.study);
  });

  it('rejects an experiment switch, stale trial index and empty record identity', () => {
    const session = makeSession();
    const state = adjusted(session.state, session.study, 144);
    expect(engine.recordStudyTrial({ ...state, experiment: 'ebbinghaus' }, session.study, 1, 'record', '').recorded).toBe(false);
    for (const index of [0, 2, 4, '1']) expect(engine.recordStudyTrial(state, session.study, index, 'record', '').recorded).toBe(false);
    expect(engine.recordStudyTrial(state, session.study, 1, ' ', '').recorded).toBe(false);
  });

  it('cannot record a duplicate trial from a stale callback or reuse a notebook identity', () => {
    const session = makeSession();
    const first = record(session, 144, 1);
    const state = adjusted(first.state, session.study, 145);
    const repeated = engine.recordStudyTrial(state, session.study, 1, 'another-id', '');
    expect(repeated.recorded).toBe(false);
    expect(repeated.state.studies).toHaveLength(1);
    expect(engine.recordStudyTrial(adjusted(first.state, first.study, 145), first.study, 2, 'trial-record-1', '').recorded).toBe(false);
  });

  it('refuses to record a trial into a full notebook without dropping retained observations', () => {
    const session = makeSession();
    session.state.studies = Array.from({ length: 24 }, (_, index) => ({ id: 'older-' + index, experiment: 'brightness', model: engine.normalizeModel('brightness', { prediction: 'Left' }), date: '' }));
    const submitted = adjusted(session.state, session.study, 128), original = structuredClone(submitted);
    const result = engine.recordStudyTrial(submitted, session.study, 1, 'new-trial', '2026-10-03T12:00:00.000Z');
    expect(result.recorded).toBe(false);
    expect(result.state).toEqual(original);
    expect(result.study).toEqual(session.study);
    expect(submitted).toEqual(original);
  });

  it('cannot reveal an incomplete study and never recreates a deleted group record', () => {
    const one = record(makeSession(), 144, 1);
    expect(engine.revealStudy(one.state, one.study).revealed).toBe(false);
    expect(engine.studySummary(one.study)).toBeNull();
    const completed = complete(MODES[0]);
    const deleted = engine.deleteStudy(completed.state, 'trial-record-1').state;
    const revealed = engine.revealStudy(deleted, completed.study);
    expect(revealed.state.studies).toHaveLength(2);
    expect(revealed.state.studies.map(item => item.id)).toEqual(['trial-record-2', 'trial-record-3']);
  });
});

describe('Repeated matching study learner workflow', () => {
  it.each(MODES)('$id completes three hidden matches, maintains focus and reveals the final summary on request', async mode => {
    await mount({ experiment: mode.id, models: { [mode.id]: { matching: true, note: 'First match note' } } });
    await click('Start three matches');
    expect(activeBlock()).toBeTruthy();
    expect(document.activeElement.id).toBe('perception-match-value');
    expect(button('Record match').disabled).toBe(true);
    expect(button('Remove surroundings').disabled).toBe(true);
    expect(button('Swap surroundings').disabled).toBe(true);
    expect(button('Reveal measurements').disabled).toBe(true);
    expect(button('Observe').disabled).toBe(true);
    for (let index = 0; index < 3; index++) {
      expect(latest.models[mode.id]).toMatchObject({ matchValue: mode.starts[index], prediction: '', reveal: false, note: index ? '' : 'First match note' });
      expect(summary()).toBeNull();
      expect(host.querySelector('[data-perception-result]')).toBeNull();
      await recordUI(mode.values[index]);
      expect(latest.studies).toHaveLength(index + 1);
      if (index < 2) expect(document.activeElement.id).toBe('perception-match-value');
    }
    expect(summary()).toBeNull();
    expect(host.querySelector('#perception-match-value').disabled).toBe(true);
    expect(document.activeElement).toBe(button('Reveal study results'));
    expect(latest.studies.map(item => item.model.matchValue)).toEqual(mode.values);
    await click('Reveal study results');
    expect(summary()).toBeTruthy();
    expect(summary().querySelectorAll('tbody tr')).toHaveLength(3);
    expect(summary().textContent).toContain('Median match');
    expect(summary().textContent).toContain(String(mode.median));
    expect(document.activeElement.id).toContain('-study-results');
    expect(latest.studies.every(item => item.model.reveal)).toBe(true);
    expect(latestAll.otherTool).toEqual({ marker: 77 });
  });

  it('handles double Start and Record activations in StrictMode without duplicate groups or trials', async () => {
    await mount({ experiment: 'brightness', models: { brightness: { matching: true } } }, { strict: true });
    await act(async () => { button('Start three matches').click(); button('Start three matches').click(); });
    const group = activeBlock().getAttribute('data-perception-repeat-active');
    expect(latest.models.brightness.matchValue).toBe(72);
    await input('perception-match-value', 144);
    await click('Same');
    const recordButton = button('Record match');
    await act(async () => { recordButton.click(); recordButton.click(); });
    expect(latest.studies).toHaveLength(1);
    expect(latest.studies[0].repeat).toMatchObject({ id: group, trial: 1, startValue: 72 });
    expect(latest.models.brightness).toMatchObject({ matchValue: 184, prediction: '', reveal: false });
    expect(activeBlock().getAttribute('data-perception-repeat-active')).toBe(group);
    expect(document.activeElement.id).toBe('perception-match-value');
  });

  it('expires the live summary when one of its recorded trials is deleted', async () => {
    await mount({ experiment: 'brightness', models: { brightness: { matching: true } } });
    await click('Start three matches');
    for (const value of MODES[0].values) await recordUI(value);
    await click('Reveal study results');
    expect(summary()).toBeTruthy();
    const id = latest.studies[0].id;
    const row = [...host.querySelectorAll('[data-perception-study]')].find(node => node.getAttribute('data-perception-study') === id);
    const remove = [...row.querySelectorAll('button')].find(node => node.textContent.trim() === 'Delete observation');
    expect(remove).toBeTruthy();
    await act(async () => remove.click());
    expect(latest.studies).toHaveLength(2);
    expect(activeBlock()).toBeNull();
    expect(summary()).toBeNull();
    expect(button('Reveal study results', false)).toBeUndefined();
    expect(button('Start three matches').disabled).toBe(false);
  });

  it('ends a partial study without losing its recorded match or saving the unfinished draft', async () => {
    await mount({ experiment: 'ebbinghaus', models: { ebbinghaus: { matching: true } } });
    await click('Start three matches');
    await recordUI(52);
    const saved = structuredClone(latest.studies);
    await input('perception-match-value', 68);
    await click('End repeated study');
    expect(activeBlock()).toBeNull();
    expect(latest.studies).toEqual(saved);
    expect(button('Start three matches').disabled).toBe(false);
    expect(button('Swap surroundings').disabled).toBe(false);
  });

  it('expires an active study on external context replacement and on a learner switch', async () => {
    await mount({ experiment: 'brightness', models: { brightness: { matching: true } } });
    await click('Start three matches');
    await act(async () => edit(previous => ({ ...previous, models: { ...previous.models, brightness: { ...previous.models.brightness, contrast: 31 } } })));
    expect(activeBlock()).toBeNull();
    expect(latest.studies).toHaveLength(0);
    expect(latest.models.brightness.contrast).toBe(31);
    await click('Start three matches');
    await recordUI(144);
    const records = structuredClone(latest.studies);
    await act(async () => changeProfile('next-learner'));
    expect(activeBlock()).toBeNull();
    expect(button('Record match', false)).toBeUndefined();
    expect(latest.studies).toEqual(records);
    expect(summary()).toBeNull();
  });
});
