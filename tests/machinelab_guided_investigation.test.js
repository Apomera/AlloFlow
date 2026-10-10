import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const PLANS = [
  { id: 'lever', before: { leverEffortArm: 2, leverLoadArm: 1, leverLoad: 400, loadDistance: 0.5 }, key: 'leverEffortArm', value: 4, ma: [2, 4], load: 400 },
  { id: 'pulley', before: { pulleySegments: 2, pulleyLoad: 400, loadDistance: 0.5 }, key: 'pulleySegments', value: 4, ma: [2, 4], load: 400 },
  { id: 'windlass', before: { windlassHandleR: 0.45, windlassDrumR: 0.1, windlassLoad: 400, loadDistance: 0.5 }, key: 'windlassDrumR', value: 0.2, ma: [4.5, 2.25], load: 400 },
  { id: 'ramp', before: { rampLength: 4, rampHeight: 1, rampLoad: 400, loadDistance: 0.5 }, key: 'rampLength', value: 8, ma: [4, 8], load: 400 },
  { id: 'wedge', before: { wedgeLength: 0.3, wedgeThickness: 0.06, wedgeLoad: 800, loadDistance: 0.5 }, key: 'wedgeThickness', value: 0.12, ma: [5, 2.5], load: 800 },
  { id: 'screw', before: { screwHandleR: 0.15, screwPitch: 0.005, screwLoad: 2000, loadDistance: 0.5 }, key: 'screwPitch', value: 0.01, ma: [60 * Math.PI, 30 * Math.PI], load: 2000 }
];
let tool;

beforeEach(() => {
  resetStemLab();
  tool = loadTool(FILE, 'machineLab');
});

function descendants(node) {
  if (Array.isArray(node)) return node.flatMap(descendants);
  if (!node || typeof node !== 'object') return [];
  return [node, ...descendants(node.props && node.props.children)];
}

function content(node) {
  if (Array.isArray(node)) return node.map(content).join('');
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  return content(node.props && node.props.children);
}

function session(overrides = {}) {
  const store = newStore({ machineLab: {
    view: 'machines', bandOverride: 'g68', bench: 'lever', ...PLANS[0].before, ...overrides
  } });
  const render = () => tool.render(makeCtx({}, store));
  const find = (predicate) => descendants(render()).find(predicate);
  const button = (label) => find((node) => node.type === 'button' && content(node) === label);
  const section = () => find((node) => node.props && node.props['data-ml-investigation'] === store.toolData.machineLab.bench);
  const currentTarget = {
    closest: () => ({ isConnected: false, parentElement: { isConnected: false }, querySelector: () => null })
  };
  function activate(node, label) {
    expect(node, `Missing button: ${label}`).toBeTruthy();
    expect(node.props.disabled, `Disabled button: ${label}`).not.toBe(true);
    node.props.onClick({ currentTarget });
  }
  return {
    store, render, find, button, section,
    state: () => store.toolData.machineLab,
    patch: (patch) => { store.toolData = { ...store.toolData, machineLab: { ...store.toolData.machineLab, ...patch } }; },
    click: (label) => activate(button(label), label),
    invoke: (node) => node.props.onClick({ currentTarget }),
    choose: (metric, choice) => activate(find((node) => node.type === 'button' &&
      node.props['data-ml-prediction'] === metric && node.props['data-choice'] === choice), `${metric}: ${choice}`),
    metric: (name, side) => {
      const evidence = find((node) => node.props && node.props['data-ml-experiment'] === store.toolData.machineLab.bench);
      const row = descendants(evidence).find((node) => node.props && node.props['data-ml-experiment-metric'] === name);
      const cell = descendants(row).find((node) => node.props && node.props['data-ml-experiment-value'] === side);
      expect(cell, `Missing evidence value: ${name}/${side}`).toBeTruthy();
      return Number(cell.props['data-value']);
    }
  };
}

function predictAndTest(s, force = 'less', distance = 'more') {
  s.click('Start investigation');
  s.choose('force', force);
  s.choose('distance', distance);
  s.click('Test planned change');
}

function isUnavailable(node) {
  return !node || node.props.disabled === true;
}

describe('Machine Lab: guided investigations', () => {
  it.each(PLANS)('offers an investigation at $id for the two quantitative grade bands', (plan) => {
    for (const bandOverride of ['g68', 'g912']) {
      const s = session({ bandOverride, bench: plan.id });
      expect(s.section(), `${bandOverride}/${plan.id}`).toBeTruthy();
      expect(s.button('Start investigation')).toBeTruthy();
      expect(isUnavailable(s.button('Save investigation'))).toBe(true);
      expect(s.button('View before setup')).toBeUndefined();
      expect(s.button('View after setup')).toBeUndefined();
    }
  });

  it.each(PLANS)('keeps the younger grade bands free of the quantitative investigation card at $id', (plan) => {
    for (const bandOverride of ['k2', 'g35']) {
      const s = session({ bandOverride, bench: plan.id });
      expect(s.section()).toBeUndefined();
      expect(s.button('Start investigation')).toBeUndefined();
      expect(s.find((node) => node.props && node.props['data-ml-prediction'])).toBeUndefined();
    }
  });

  it('starts from a reproducible setup and stops motion without erasing other student work', () => {
    const references = { lever: { ...PLANS[0].before, leverEffortArm: 3 }, pulley: { ...PLANS[1].before } };
    const experiments = { pulley: {
      benchId: 'pulley', before: { settings: { ...PLANS[1].before } },
      after: { settings: { ...PLANS[1].before, pulleySegments: 4 } }, note: 'Keep my pulley explanation.'
    } };
    const s = session({
      leverEffortArm: 5, leverLoad: 800, loadDistance: 2,
      shopAnimating: true, shopMotionProgress: 0.7,
      benchReferences: references, benchExperiments: experiments,
      iqHypothesis: 'An unrelated inquiry.', provenBenches: { screw: true }
    });
    s.click('Start investigation');
    expect(s.state()).toMatchObject({ ...PLANS[0].before, shopAnimating: false });
    expect(s.state().benchInvestigations.lever).toMatchObject({ force: null, distance: null, tested: false });
    expect(typeof s.state().benchInvestigations.lever.id).toBe('string');
    expect(s.state().benchInvestigations.lever.id.length).toBeGreaterThan(0);
    expect(s.state().benchReferences).toEqual(references);
    expect(s.state().benchExperiments).toEqual(experiments);
    expect(s.state().iqHypothesis).toBe('An unrelated inquiry.');
    expect(s.state().provenBenches).toEqual({ screw: true });
  });

  it('requires two explicit predictions and exposes their native button selection state', () => {
    const s = session();
    s.click('Start investigation');
    for (const [metric, label] of [['force', 'Effort force prediction'], ['distance', 'Hand travel prediction']]) {
      const fieldset = descendants(s.section()).find((node) => node.type === 'fieldset' && node.props['aria-label'] === label);
      expect(fieldset, `Missing fieldset: ${label}`).toBeTruthy();
      const choices = descendants(fieldset).filter((node) => node.type === 'button' && node.props['data-ml-prediction'] === metric);
      expect(choices.map((node) => node.props['data-choice'])).toEqual(['less', 'same', 'more']);
      expect(choices.map(content)).toEqual(['Less', 'Same', 'More']);
      expect(choices.every((node) => node.props['aria-pressed'] === false)).toBe(true);
    }
    expect(isUnavailable(s.button('Test planned change'))).toBe(true);
    s.choose('force', 'same');
    expect(s.state().benchInvestigations.lever.force).toBe('same');
    expect(isUnavailable(s.button('Test planned change'))).toBe(true);
    s.choose('distance', 'less');
    expect(isUnavailable(s.button('Test planned change'))).toBe(false);
    for (const [metric, choice] of [['force', 'same'], ['distance', 'less']]) {
      const selected = s.find((node) => node.props && node.props['data-ml-prediction'] === metric && node.props['data-choice'] === choice);
      expect(selected.props['aria-pressed']).toBe(true);
    }
  });

  it.each(PLANS)('tests the $id change with fixed task, correct force-distance trade, and equal ideal work', (plan) => {
    const s = session({ bench: plan.id });
    // Deliberately wrong predictions must still allow experimentation.
    predictAndTest(s, 'same', 'same');
    const expectedAfter = { ...plan.before, [plan.key]: plan.value };
    expect(s.state()).toMatchObject(expectedAfter);
    expect(s.state().benchInvestigations[plan.id]).toMatchObject({ force: 'same', distance: 'same', tested: true });
    s.click('Save investigation');
    const record = s.state().benchExperiments[plan.id];
    expect(record).toMatchObject({
      benchId: plan.id, before: { settings: plan.before }, after: { settings: expectedAfter }, note: '',
      investigation: { id: s.state().benchInvestigations[plan.id].id, force: 'same', distance: 'same' }
    });
    expect(record.before.settings).not.toBe(record.after.settings);
    expect(Object.keys(record.before.settings).filter((key) => record.before.settings[key] !== record.after.settings[key])).toEqual([plan.key]);
    for (const [index, side] of ['before', 'after'].entries()) {
      expect(s.metric('ma', side)).toBeCloseTo(plan.ma[index]);
      expect(s.metric('force', side)).toBeCloseTo(plan.load / plan.ma[index]);
      expect(s.metric('distance', side)).toBeCloseTo(0.5 * plan.ma[index]);
      expect(s.metric('workIn', side)).toBeCloseTo(plan.load * 0.5);
      expect(s.metric('workOut', side)).toBeCloseTo(plan.load * 0.5);
    }
  });

  it('does not test a setup that drifted from the controlled before state', () => {
    const s = session();
    s.click('Start investigation');
    s.choose('force', 'less');
    s.choose('distance', 'more');
    const oldTest = s.button('Test planned change');
    s.patch({ leverLoad: 500 });
    expect(isUnavailable(s.button('Test planned change'))).toBe(true);
    s.invoke(oldTest);
    expect(s.state().leverEffortArm).toBe(2);
    expect(s.state().leverLoad).toBe(500);
    expect(s.state().benchInvestigations.lever.tested).toBe(false);
    expect(isUnavailable(s.button('Save investigation'))).toBe(true);
  });

  it('does not let an old test callback test a replacement investigation', () => {
    const s = session();
    s.click('Start investigation');
    s.choose('force', 'less');
    s.choose('distance', 'more');
    const oldTest = s.button('Test planned change');
    s.patch({ benchInvestigations: { lever: { ...s.state().benchInvestigations.lever, force: null, distance: null } } });
    s.invoke(oldTest);
    expect(s.state().leverEffortArm).toBe(2);
    expect(s.state().benchInvestigations.lever.tested).toBe(false);
    expect(s.state().benchInvestigations.lever.force).toBeNull();
  });

  it('revisits the tested pair without changing the predictions or recorded evidence', () => {
    const s = session();
    predictAndTest(s, 'less', 'more');
    s.click('Save investigation');
    const investigation = { ...s.state().benchInvestigations.lever };
    const record = JSON.stringify(s.state().benchExperiments.lever);
    s.patch({ leverLoad: 500, loadDistance: 1, shopAnimating: true });
    s.click('View before setup');
    expect(s.state()).toMatchObject({ ...PLANS[0].before, shopAnimating: false });
    expect(s.state().benchInvestigations.lever).toEqual(investigation);
    s.click('View after setup');
    expect(s.state()).toMatchObject({ ...PLANS[0].before, leverEffortArm: 4, shopAnimating: false });
    expect(s.state().benchInvestigations.lever).toEqual(investigation);
    expect(JSON.stringify(s.state().benchExperiments.lever)).toBe(record);
  });

  it('locks predictions after the test, including a previously captured prediction callback', () => {
    const s = session();
    s.click('Start investigation');
    s.choose('force', 'same');
    s.choose('distance', 'less');
    const oldChoice = s.find((node) => node.type === 'button' && node.props['data-ml-prediction'] === 'force' && node.props['data-choice'] === 'more');
    s.click('Test planned change');
    const afterChoice = s.find((node) => node.type === 'button' && node.props['data-ml-prediction'] === 'force' && node.props['data-choice'] === 'more');
    expect(isUnavailable(afterChoice)).toBe(true);
    s.invoke(oldChoice);
    expect(s.state().benchInvestigations.lever).toMatchObject({ force: 'same', distance: 'less', tested: true });
  });

  it('saves the fixed tested pair and original predictions after live settings change', () => {
    const s = session();
    predictAndTest(s, 'same', 'less');
    s.patch({ leverLoad: 500, leverEffortArm: 1, loadDistance: 2 });
    s.click('Save investigation');
    expect(s.state().benchExperiments.lever).toMatchObject({
      before: { settings: PLANS[0].before },
      after: { settings: { ...PLANS[0].before, leverEffortArm: 4 } },
      investigation: { force: 'same', distance: 'less' }
    });
    expect(s.state()).toMatchObject({ leverLoad: 500, leverEffortArm: 1, loadDistance: 2 });
    expect(s.metric('force', 'after')).toBe(100);
  });

  it('restarts the investigation without overwriting saved evidence and rejects its stale save callback', () => {
    const s = session();
    predictAndTest(s);
    s.click('Save investigation');
    const recorded = JSON.stringify(s.state().benchExperiments.lever);
    const oldSave = s.button('Replace with investigation');
    s.click('Restart investigation');
    expect(s.state()).toMatchObject(PLANS[0].before);
    expect(s.state().benchInvestigations.lever).toMatchObject({ force: null, distance: null, tested: false });
    expect(JSON.stringify(s.state().benchExperiments.lever)).toBe(recorded);
    s.choose('force', 'more');
    s.choose('distance', 'less');
    s.click('Test planned change');
    s.invoke(oldSave);
    expect(JSON.stringify(s.state().benchExperiments.lever)).toBe(recorded);
    expect(s.state().benchInvestigations.lever).toMatchObject({ force: 'more', distance: 'less', tested: true });
  });

  it('requires an explicit replacement action for an existing comparison and preserves other stations', () => {
    const lever = { benchId: 'lever', before: { settings: { ...PLANS[0].before } },
      after: { settings: { ...PLANS[0].before, leverEffortArm: 3 } }, note: 'An earlier comparison.' };
    const pulley = { benchId: 'pulley', before: { settings: { ...PLANS[1].before } },
      after: { settings: { ...PLANS[1].before, pulleySegments: 4 } }, note: 'A different station.' };
    const s = session({ benchExperiments: { lever, pulley } });
    predictAndTest(s);
    expect(s.state().benchExperiments).toEqual({ lever, pulley });
    expect(s.button('Save investigation')).toBeUndefined();
    s.click('Replace with investigation');
    expect(s.state().benchExperiments.lever).toMatchObject({ after: { settings: { leverEffortArm: 4 } }, note: '' });
    expect(s.state().benchExperiments.lever.investigation).toMatchObject({ force: 'less', distance: 'more' });
    expect(s.state().benchExperiments.pulley).toEqual(pulley);
  });

  it('keeps in-progress predictions separate when switching between stations', () => {
    const s = session();
    s.click('Start investigation');
    s.choose('force', 'less');
    const lever = { ...s.state().benchInvestigations.lever };
    s.patch({ bench: 'pulley' });
    s.click('Start investigation');
    s.choose('distance', 'same');
    expect(s.state().benchInvestigations.lever).toEqual(lever);
    expect(s.state().benchInvestigations.pulley).toMatchObject({ force: null, distance: 'same', tested: false });
    s.patch({ bench: 'lever' });
    const selected = s.find((node) => node.props && node.props['data-ml-prediction'] === 'force' && node.props['data-choice'] === 'less');
    expect(selected.props['aria-pressed']).toBe(true);
    expect(isUnavailable(s.button('Test planned change'))).toBe(true);
  });

  it('rejects malformed or noncanonical imported investigation states', () => {
    const initial = session();
    initial.click('Start investigation');
    const valid = { ...initial.state().benchInvestigations.lever, force: 'less', distance: 'more', tested: true };
    for (const investigation of [
      null, [], {}, { ...valid, id: 'unknown-plan' }, { ...valid, force: 'lower' },
      { ...valid, distance: {} }, { ...valid, tested: 'true' }, { ...valid, tested: null },
      { ...valid, force: null }, { ...valid, distance: null }
    ]) {
      const s = session({ benchInvestigations: { lever: investigation } });
      expect(() => ReactDOMServer.renderToStaticMarkup(s.render())).not.toThrow();
      expect(isUnavailable(s.button('Save investigation'))).toBe(true);
      expect(isUnavailable(s.button('Test planned change'))).toBe(true);
      expect(s.button('View before setup')).toBeUndefined();
      expect(s.button('View after setup')).toBeUndefined();
    }
  });

  it('includes saved evidence, original predictions, and the student explanation in Your work', () => {
    const s = session();
    predictAndTest(s, 'same', 'more');
    s.click('Save investigation');
    const note = 'I expected the force to stay the same, but the longer arm needs less force.';
    const editor = s.find((node) => node.type === 'textarea' && node.props['aria-label'] === 'What does your comparison show?');
    expect(editor).toBeTruthy();
    editor.props.onChange({ target: { value: note } });
    s.patch({ view: 'learn', manualTopic: 'record', leverEffortArm: 1, benchReferences: {} });
    const recordText = content(s.render());
    expect(s.find((node) => node.props && node.props.id === 'ml-record-note-lever').props.value).toBe(note);
    expect(recordText).toMatch(/[Pp]rediction/);
    expect(recordText).toMatch(/[Ss]ame/);
    expect(recordText).toMatch(/[Mm]ore/);
    expect(recordText).toContain('200');
    expect(recordText).toContain('100');
    expect(recordText).not.toContain('NaN');
    expect(recordText).not.toContain('Infinity');
  });
});
