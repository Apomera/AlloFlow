import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const SOURCE = 'guided-source';
const MODES = [
  { id: 'brightness', key: 'contrast', before: 80, after: 30, starts: [16, 240, 109], values: [121, 134, 146], other: { target: 128 } },
  { id: 'ebbinghaus', key: 'surround', before: 36, after: 25, starts: [32, 72, 51], values: [44, 50, 53], other: { gap: 12 } },
  { id: 'mullerLyer', key: 'angle', before: 30, after: 55, starts: [250, 550, 411], values: [380, 410, 425], other: { fin: 42 } },
];
let engine, config, host, root, latest, latestAll, externalState, changeProfile, announce, deferUpdates, pendingUpdates, flushUpdates;

function records(mode = MODES[0], model = {}) {
  return mode.values.map((matchValue, index) => ({
    id: SOURCE + '-record-' + (index + 1), experiment: mode.id,
    date: '2026-10-03T12:00:0' + (index + 1) + '.000Z',
    model: { matching: true, reveal: false, prediction: 'Same', note: 'original note ' + (index + 1), matchValue, ...model },
    repeat: { id: SOURCE, trial: index + 1, startValue: mode.starts[index] },
  }));
}
function seed(mode = MODES[0], model = {}) {
  return engine.normalize({
    experiment: 'moire', studies: records(mode, model),
    models: { moire: { angle: 13.2, spacing: 18, note: 'other experiment draft' } },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'pinned cube' } },
  });
}
async function mount(value = seed(), { strict = false } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('guided-learner');
    latest = engine.normalize(data.perceptionLab);
    latestAll = data;
    externalState = next => setData(previous => ({ ...previous, perceptionLab: next }));
    changeProfile = setProfile;
    flushUpdates = () => pendingUpdates.splice(0).forEach(setData);
    return config.render(makeCtx({
      toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: update => deferUpdates ? pendingUpdates.push(update) : setData(update),
    }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy();
  return found;
}
const click = async (label, scope = host) => act(async () => button(label, scope).click());
const row = id => [...host.querySelectorAll('[data-perception-study]')].find(node => node.dataset.perceptionStudy === id);
const planner = () => host.querySelector('[data-perception-guided-plan]');
const active = () => host.querySelector('[data-perception-repeat-active]');
const pair = () => host.querySelector('[data-perception-study-pair-results]');
async function input(node, value) {
  expect(node).toBeTruthy();
  const select = node instanceof HTMLSelectElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(select ? HTMLSelectElement.prototype : HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(select ? 'change' : 'input', { bubbles: true }));
  });
}
async function openPlan(value = seed(), options) {
  await mount(value, options);
  await click('Review study', row(SOURCE + '-record-1'));
  await click('Plan one-setting repeat');
  expect(planner()).toBeTruthy();
}
async function choosePlan(mode = MODES[0]) {
  await input(host.querySelector('[data-perception-guided-setting]'), mode.key);
  await input(host.querySelector('[data-perception-guided-value]'), mode.after);
}
async function recordUI(value) {
  await input(host.querySelector('#perception-match-value'), value);
  await click('Same');
  await click('Record match');
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab');
  engine = window.StemLab.PerceptionEngine;
  announce = vi.fn();
  deferUpdates = false;
  pendingUpdates = [];
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('One-setting repeat planning engine', () => {
  it.each(MODES)('keeps the $id reference and every nonchosen setting while preserving the actual saved starting sequence', mode => {
    const state = seed(mode), original = structuredClone(state);
    const plan = engine.planRepeat(state, SOURCE, mode.key, mode.after);
    expect(plan).toMatchObject({ status: 'ready', experiment: mode.id, setting: mode.key, starts: mode.starts });
    expect(plan.fingerprint).toBeTruthy();
    const base = engine.savedStudy(state, SOURCE).study.base;
    expect(plan.base).toEqual({ ...base, [mode.key]: mode.after, prediction: '', note: '', reveal: false, matchValue: mode.starts[0] });
    expect(engine.measurements(mode.id, plan.base).reference).toBe(engine.measurements(mode.id, base).reference);
    expect(state).toEqual(original);

    let study = engine.createStudy(mode.id, plan.base, 'guided-new', plan.starts);
    expect(engine.normalizeStudy(JSON.parse(JSON.stringify(study)))).toEqual(study);
    expect(engine.studyModel(study).matchValue).toBe(mode.starts[0]);
    let next = engine.normalize({ ...state, experiment: mode.id, models: { ...state.models, [mode.id]: engine.studyModel(study) } });
    mode.values.forEach((matchValue, index) => {
      next.models[mode.id] = { ...next.models[mode.id], prediction: 'Same', matchValue };
      const result = engine.recordStudyTrial(next, study, index + 1, 'guided-trial-' + (index + 1), '2026-10-03');
      expect(result.recorded).toBe(true);
      study = result.study; next = result.state;
      if (index < 2) expect(next.models[mode.id].matchValue).toBe(mode.starts[index + 1]);
    });
    expect(next.studies.slice(-3).map(item => item.repeat.startValue)).toEqual(mode.starts);
    expect(engine.studySummary(study)).toBeNull();
    const revealed = engine.revealStudy(next, study);
    expect(engine.studySummary(revealed.study).starts).toEqual(mode.starts);
    expect(revealed.state.studies.filter(item => item.repeat.id === SOURCE).every(item => !item.model.reveal)).toBe(true);
  });

  it('keeps the existing standard study shape when no custom starting sequence is supplied', () => {
    const study = engine.createStudy('brightness', { matching: true }, 'standard');
    expect(study).not.toHaveProperty('starts');
    expect(engine.studyModel(study).matchValue).toBe(72);
    expect(engine.normalizeStudy(study)).toEqual(study);
  });

  it.each([
    ['short', [16, 240]], ['long', [16, 240, 100, 130]], ['string', ['16', 240, 100]],
    ['below bound', [15, 240, 100]], ['above bound', [16, 241, 100]],
    ['fractional', [16, 240, 100.5]], ['nonfinite', [16, Infinity, 100]],
  ])('rejects a %s custom starting sequence without silently replacing it', (_, starts) => {
    expect(engine.createStudy('brightness', { matching: true }, 'invalid', starts)).toBeNull();
    expect(engine.normalizeStudy({ id: 'invalid', experiment: 'brightness', base: { matching: true }, trials: [], starts })).toBeNull();
  });

  it('offers settings with inactive explanations and never offers reference or answer values', () => {
    const settings = engine.guidedSettings(seed(), SOURCE);
    expect(settings.map(item => item.key)).toEqual(expect.arrayContaining(['contrast', 'context', 'swap']));
    expect(settings.some(item => ['target', 'matchValue', 'reveal', 'prediction', 'note'].includes(item.key))).toBe(false);
    expect(settings.find(item => item.key === 'contrast')).toMatchObject({ value: 80, type: 'range', min: 0, max: 100, step: 1, active: true, reason: '' });
    const hidden = engine.guidedSettings(seed(MODES[0], { context: false }), SOURCE);
    expect(hidden.find(item => item.key === 'contrast')).toMatchObject({ active: false, reason: 'context' });
    expect(hidden.find(item => item.key === 'swap')).toMatchObject({ active: false, reason: 'context' });
    expect(hidden.find(item => item.key === 'context')).toMatchObject({ type: 'toggle', value: false, active: true });
    const equal = engine.guidedSettings(seed(MODES[0], { contrast: 0 }), SOURCE);
    expect(equal.find(item => item.key === 'swap')).toMatchObject({ active: false, reason: 'identical' });
  });

  it('rejects partial and conflicting source groups without producing settings or a fresh base', () => {
    const partial = seed(); partial.studies.pop();
    const conflict = seed(); conflict.studies[1].model.contrast = 20;
    for (const [state, status] of [[partial, 'incomplete'], [conflict, 'conflict']]) {
      expect(engine.guidedSettings(state, SOURCE)).toEqual([]);
      expect(engine.planRepeat(state, SOURCE, 'contrast', 30)).toMatchObject({ status, base: null, starts: [] });
    }
  });

  it.each(['target', 'matchValue', 'prediction', 'reveal', 'unknown'])('rejects %s as a planned variable', key => {
    expect(engine.planRepeat(seed(), SOURCE, key, 30).status).toBe('setting');
  });

  it.each([NaN, Infinity, -1, 101, 20.5, 'bad'])('rejects invalid contrast %s rather than making a different plan', value => {
    expect(engine.planRepeat(seed(), SOURCE, 'contrast', value)).toMatchObject({ status: 'value', base: null, starts: [] });
  });

  it('requires a changed active setting and accepts a surroundings toggle with the other settings fixed', () => {
    expect(engine.planRepeat(seed(), SOURCE, 'contrast', 80).status).toBe('unchanged');
    expect(engine.planRepeat(seed(MODES[0], { context: false }), SOURCE, 'contrast', 30).status).toBe('inactive');
    expect(engine.planRepeat(seed(MODES[0], { contrast: 0 }), SOURCE, 'swap', true).status).toBe('inactive');
    const state = seed(MODES[0], { context: false });
    expect(engine.planRepeat(state, SOURCE, 'context', true)).toMatchObject({ status: 'ready', base: { context: true, contrast: 80, target: 128, swap: false } });
  });

  it('keeps source identity stable across reveal but changes its fingerprint after a recorded observation changes', () => {
    const state = seed();
    const first = engine.planRepeat(state, SOURCE, 'contrast', 30);
    const revealed = engine.planRepeat(engine.revealSavedStudy(state, SOURCE), SOURCE, 'contrast', 30);
    expect(revealed.fingerprint).toBe(first.fingerprint);
    const changed = structuredClone(state); changed.studies[0].model.note = 'edited observation';
    expect(engine.planRepeat(changed, SOURCE, 'contrast', 30).fingerprint).not.toBe(first.fingerprint);
  });

  it('requires three free places without evicting source or unrelated observations', () => {
    const state = seed();
    const legacy = Array.from({ length: 21 }, (_, index) => ({ ...state.studies[0], id: 'old-' + index, repeat: undefined }));
    const atRisk = engine.normalize({ ...state, studies: [...state.studies, ...legacy] });
    expect(engine.planRepeat(atRisk, SOURCE, 'contrast', 30)).toMatchObject({ status: 'capacity', base: null, starts: [] });
    const retained = engine.normalize({ ...state, studies: [...legacy, ...state.studies] });
    expect(engine.planRepeat(retained, SOURCE, 'contrast', 30)).toMatchObject({ status: 'capacity', base: null, starts: [] });
    const available = engine.normalize({ ...state, studies: [...legacy.slice(0, 18), ...state.studies] });
    expect(engine.planRepeat(available, SOURCE, 'contrast', 30).status).toBe('ready');
    expect(atRisk.studies).toHaveLength(24);
  });
});

describe('Guided matching-study learner workflow', () => {
  it('requires a deliberate one-setting change and keeps planning separate from the drawing and reveal state', async () => {
    const state = seed();
    await openPlan(state);
    expect(planner().dataset.perceptionGuidedStatus).toBe('unchanged');
    expect(button('Start planned study').disabled).toBe(true);
    expect(latest).toEqual(state);
    expect(planner().textContent).not.toContain('134');
    expect(pair()).toBeNull();
    await choosePlan();
    expect(planner().dataset.perceptionGuidedStatus).toBe('ready');
    expect(button('Start planned study').disabled).toBe(false);
    expect(latest).toEqual(state);
  });

  it.each(MODES)('records a fresh $id block with the retained starts and opens the independently hidden A/B comparison', async mode => {
    const state = seed(mode);
    await openPlan(state);
    await choosePlan(mode);
    await click('Start planned study');
    const groupId = active().dataset.perceptionRepeatActive;
    expect(groupId).not.toBe(SOURCE);
    expect(latest.experiment).toBe(mode.id);
    expect(latest.models[mode.id]).toMatchObject({ matching: true, reveal: false, prediction: '', note: '', matchValue: mode.starts[0], [mode.key]: mode.after, ...mode.other });
    expect(latest.studies).toEqual(state.studies);
    expect(latest.comparison).toEqual(state.comparison);
    expect(latest.models.moire).toEqual(state.models.moire);
    expect(latestAll.otherTool).toEqual({ preserved: 37 });
    for (let index = 0; index < 3; index++) {
      expect(latest.models[mode.id].matchValue).toBe(mode.starts[index]);
      await recordUI(mode.values[index]);
    }
    expect(active()).toBeNull();
    expect(host.querySelector('[data-perception-study-review]').dataset.perceptionStudyReview).toBe(SOURCE);
    expect(host.querySelector('[data-perception-study-selector]').value).toBe(groupId);
    expect(pair()).toBeNull();
    expect(latest.studies.slice(-3).map(item => item.repeat.startValue)).toEqual(mode.starts);
    expect(latest.studies.every(item => !item.model.reveal)).toBe(true);
    await click('Reveal comparison study');
    expect(pair()).toBeNull();
    expect(latest.studies.filter(item => item.repeat.id === SOURCE).every(item => !item.model.reveal)).toBe(true);
    await click('Reveal saved study');
    expect(pair()).toBeTruthy();
    const comparison = engine.compareStudies(latest, SOURCE, groupId);
    expect(comparison).toMatchObject({ status: 'ready', startsDiffer: false });
    expect(comparison.changes).toEqual([{ key: mode.key, before: mode.before, after: mode.after, active: true }]);
    expect(latest.comparison).toEqual(state.comparison);
  });

  it('starts a changed boolean setting through a native select while numeric inactive settings stay unavailable', async () => {
    await openPlan(seed(MODES[0], { context: false }));
    const settings = host.querySelector('[data-perception-guided-setting]');
    expect([...settings.options].find(option => option.value === 'contrast').disabled).toBe(true);
    await input(settings, 'context');
    const value = host.querySelector('[data-perception-guided-value]');
    expect(value.tagName).toBe('SELECT');
    await input(value, 'true');
    expect(planner().dataset.perceptionGuidedStatus).toBe('ready');
    await click('Start planned study');
    expect(latest.models.brightness).toMatchObject({ context: true, contrast: 80, target: 128, swap: false, reveal: false });
  });

  it('keeps the chosen plan after revealing its source and starts the new study hidden', async () => {
    await openPlan(); await choosePlan();
    await click('Reveal saved study');
    expect(planner().dataset.perceptionGuidedStatus).toBe('ready');
    expect(host.querySelector('[data-perception-guided-value]').value).toBe('30');
    await click('Start planned study');
    expect(active()).toBeTruthy();
    expect(latest.models.brightness.reveal).toBe(false);
    expect(latest.studies.every(item => item.model.reveal)).toBe(true);
  });

  it('locks the other settings and keeps a partial new block after ending a guided study', async () => {
    await openPlan(); await choosePlan(); await click('Start planned study');
    const groupId = active().dataset.perceptionRepeatActive;
    expect(host.querySelector('#perception-contrast').disabled).toBe(true);
    expect(button('Remove surroundings').disabled).toBe(true);
    await recordUI(136);
    await click('End repeated study');
    expect(active()).toBeNull();
    expect(engine.savedStudy(latest, SOURCE).complete).toBe(true);
    expect(engine.savedStudy(latest, groupId)).toMatchObject({ count: 1, complete: false });
    expect(latest.studies.filter(item => item.repeat.id === SOURCE).every(item => !item.model.reveal)).toBe(true);
  });

  it('does not duplicate the fresh group or first trial under StrictMode and double activation', async () => {
    await openPlan(seed(), { strict: true }); await choosePlan();
    const start = button('Start planned study');
    await act(async () => { start.click(); start.click(); });
    expect(active()).toBeTruthy();
    const groupId = active().dataset.perceptionRepeatActive;
    await input(host.querySelector('#perception-match-value'), 136); await click('Same');
    const record = button('Record match');
    await act(async () => { record.click(); record.click(); });
    expect(latest.studies.filter(item => item.repeat.id === groupId)).toHaveLength(1);
    expect(latest.studies.slice(-1)[0].repeat).toEqual({ id: groupId, trial: 1, startValue: 16 });
  });

  it('rejects a deferred Start after its source is replaced under the same group identity', async () => {
    await openPlan(); await choosePlan();
    deferUpdates = true;
    await click('Start planned study');
    expect(pendingUpdates).toHaveLength(1);
    const replacement = seed(MODES[0], { contrast: 40 });
    await act(async () => externalState(replacement));
    deferUpdates = false;
    await act(async () => flushUpdates());
    expect(latest).toEqual(replacement);
    expect(active()).toBeNull();
    expect(latest.studies).toHaveLength(3);
    await click('Review study', row(SOURCE + '-record-1'));
    await click('Plan one-setting repeat');
    await choosePlan(); await click('Start planned study');
    expect(active()).toBeTruthy();
  });

  it('rejects a deferred Start after the learner profile changes', async () => {
    const state = seed();
    await openPlan(state); await choosePlan();
    deferUpdates = true;
    await click('Start planned study');
    await act(async () => changeProfile('other-learner'));
    deferUpdates = false;
    await act(async () => flushUpdates());
    expect(latest).toEqual(state);
    expect(active()).toBeNull();
    expect(planner()).toBeNull();
  });

  it('explains source capacity risk and prevents starting without deleting observations', async () => {
    const state = seed();
    const legacy = Array.from({ length: 21 }, (_, index) => ({ ...state.studies[0], id: 'old-' + index, repeat: undefined }));
    const full = engine.normalize({ ...state, studies: [...state.studies, ...legacy] });
    await openPlan(full); await choosePlan();
    expect(planner().dataset.perceptionGuidedStatus).toBe('capacity');
    expect(button('Start planned study').disabled).toBe(true);
    expect(latest).toEqual(full);
    expect(active()).toBeNull();
  });
});
