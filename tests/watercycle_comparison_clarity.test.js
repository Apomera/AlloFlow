import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const BASELINE_PATH = 'reports/watercycle-comparison-clarity/baseline-runtime.js';
const BASELINE_SHA = '239edf53b437848623cec592f72644ee69e6eb000b887e113175e09740b16003';
const source = readFileSync(SOURCE_PATH, 'utf8');
const baselineBytes = readFileSync(BASELINE_PATH);
const PRESERVED = [
  'WCExploreNotebook', 'wcLandResponse', 'estimateWcLandIndices', 'estimateWcRouteShares',
  'evaporationIndex', 'wcBaselineEvaporationIndex', 'wcCurrentSnapshot', 'wcComparisonDeltas', 'formatWcDelta',
  'WATER_CYCLE_PRESETS', 'WATER_CYCLE_PREDICTIONS', 'getWcInteractionBaseline',
  'adjustClimate', 'adjustLand', 'resetClimate', 'resetLandScenario',
  'captureWcScenarioBaseline', 'restoreWcScenarioBaseline', 'clearWcScenarioBaseline',
  'isolateWcComparisonInput', 'saveWcObservation', 'replayWcObservation', 'recordWcPrediction', 'resetWcPrediction',
];
const MODEL = {
  climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55, landSaturation: 45,
  landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
};
const VIEW = { wcMode: 'explorer', wcSection: 'conditions', wcClimateLabOpen: true, wcLandLabOpen: true,
  journeyView: '2d', activeStage: 'evaporation' };
const CASES = [
  ['positive sunlight and runoff shifts', { climSolar: 1.2, landRainIntensity: 85 }],
  ['negative sunlight and runoff shifts', { climSolar: 0.8, landRainIntensity: 25 }],
  ['unchanged inputs', {}],
  ['wind-only change', { climWind: 1.5 }],
];
let nodes;
let originalNodes;
let notebook;
let landForBaseline;
let evaporationFor;
let baselineEvaporationFor;
let formatDelta;
let claims;

function productionNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const pending = [parse(normalized, { ecmaVersion: 'latest' })];
  const result = {};
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    const name = (node.type === 'FunctionDeclaration' || node.type === 'VariableDeclarator') && node.id && node.id.name;
    if (PRESERVED.includes(name)) {
      if (result[name]) throw new Error('Non-unique production anchor: ' + name);
      result[name] = normalized.slice(node.start, node.end);
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) pending.push(...value);
      else if (value && typeof value === 'object') pending.push(value);
    }
  }
  return result;
}
function variableValue(name) { return new Function('var ' + nodes[name] + ';\nreturn ' + name + ';')(); }

beforeAll(() => {
  nodes = productionNodes(source);
  originalNodes = productionNodes(baselineBytes.toString('utf8'));
  PRESERVED.forEach(name => { if (!nodes[name] || !originalNodes[name]) throw new Error('Missing production anchor: ' + name); });
  notebook = variableValue('WCExploreNotebook');
  claims = variableValue('WATER_CYCLE_PREDICTIONS');
  landForBaseline = new Function('snapshot', 'return (' + nodes.estimateWcLandIndices + ')(snapshot);');
  evaporationFor = new Function('currentSolar', 'currentTemp', 'var ' + nodes.evaporationIndex + ';\nreturn evaporationIndex;');
  baselineEvaporationFor = new Function('wcScenarioBaseline', 'var ' + nodes.wcBaselineEvaporationIndex + ';\nreturn wcBaselineEvaporationIndex;');
  formatDelta = new Function('return (' + nodes.formatWcDelta + ');')();
  resetStemLab();
  loadTool(SOURCE_PATH, 'waterCycle');
}, 60000);

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function normalized(text) { return text.replace(/\u00d7/g, 'x').replace(/\s+/g, ' ').trim(); }
function readableText(node) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1 || node.hidden || node.getAttribute('aria-hidden') === 'true') return '';
  return Array.from(node.childNodes).map(readableText).join(' ');
}
function rendered(state = {}) {
  const data = freeze({ ...VIEW, ...MODEL, ...state });
  const container = document.createElement('div');
  container.innerHTML = renderTool('waterCycle', { waterCycle: data });
  return { data, container, compare: container.querySelector('[data-watercycle-comparison]') };
}
function comparison(state = {}) {
  const result = rendered({ wcScenarioBaseline: { ...MODEL }, ...state });
  expect(result.compare, 'actual rendered Scenario Compare').not.toBeNull();
  return result;
}
function help(container, element) {
  const ids = (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  expect(ids.length, element.id || element.className).toBeGreaterThan(0);
  return ids.map(id => {
    const matches = Array.from(container.querySelectorAll('[id]')).filter(node => node.id === id);
    expect(matches, 'describedby ' + id).toHaveLength(1);
    expect(matches[0].textContent.trim(), id).not.toBe('');
    return matches[0].textContent;
  }).join(' ');
}
function values(result) {
  const baseline = result.data.wcScenarioBaseline;
  const before = { ...landForBaseline(baseline), evaporation: baselineEvaporationFor(baseline) };
  const now = { ...window.WaterCycleInvestigationKernel.land(result.data), evaporation: evaporationFor(result.data.climSolar, result.data.climTemp) };
  return ['evaporation', 'runoff', 'infiltration'].map(metric => ({ metric, before: before[metric], now: now[metric], change: now[metric] - before[metric] }));
}
function expectReadings(result) {
  const cards = Array.from(result.compare.querySelectorAll('[data-compare-reading]'));
  expect(cards.map(card => card.dataset.compareReading)).toEqual(['evaporation', 'runoff', 'infiltration']);
  values(result).forEach(({ metric, before, now, change }) => {
    const card = result.compare.querySelector('[data-compare-reading="' + metric + '"]');
    const evaporation = metric === 'evaporation';
    const unit = evaporation ? 'x' : '/100';
    const display = value => evaporation ? value.toFixed(2) : String(value);
    const keys = Array.from(card.querySelectorAll('.wc-compare-bar-key')).map(node => normalized(node.textContent));
    expect(keys, metric).toEqual(['Baseline ' + display(before) + unit, 'Current ' + display(now) + unit]);
    expect(normalized(card.querySelector('.wc-compare-bar-delta').textContent), metric).toBe('Change ' + formatDelta(change, evaporation ? 'x' : ' pts', evaporation ? 2 : 0));
    expect(card.querySelector('.wc-compare-reading-note').textContent, metric).toMatch(/Current minus baseline/i);
    expect(card.querySelector('.wc-compare-bar-scale').textContent, metric).toBe(evaporation ? '0-2x' : '0-100');
    expect(card.querySelector('.wc-compare-bar-track').getAttribute('aria-hidden'), metric).toBe('true');
    expect(card.getAttribute('role'), metric).toBe('group');
    expect(card.getAttribute('aria-label'), metric).toContain('baseline ' + display(before));
    expect(card.getAttribute('aria-label'), metric).toContain('current ' + display(now));
  });
}

describe('Water Cycle comparison clarity: actual renderer and preserved production model', () => {
  it('keeps baseline capture available as a native control when no comparison is saved', () => {
    const result = rendered();
    expect(result.compare).toBeNull();
    const capture = result.container.querySelector('#wcSetScenarioBaseline');
    expect(capture.tagName).toBe('BUTTON');
    expect(capture.type).toBe('button');
    expect(capture.getAttribute('aria-label')).toMatch(/save current.*baseline/i);
  }, 30000);

  it('gives a complete one-input comparison a named guide and atomic live workflow', () => {
    const result = comparison({ climSolar: 1.2 });
    expect(result.compare.dataset.comparisonComplete).toBe('true');
    const method = result.compare.querySelector('[data-wc-fair-test]');
    expect(method.dataset.comparisonKind).toBe('one-input');
    expect(method.textContent).toContain('other seven inputs are held fixed');
    const guide = result.compare.querySelector('.wc-compare-reading-guide');
    expect(guide.querySelector('h4').id).toBe(guide.getAttribute('aria-labelledby'));
    expect(guide.textContent).toMatch(/each.*own baseline/i);
    expect(result.compare.querySelector('[data-baseline-defaults-note]')).toBeNull();
    const workflow = result.compare.querySelector('#wcScenarioWorkflowStatus');
    expect(workflow.getAttribute('role')).toBe('status');
    expect(workflow.getAttribute('aria-live')).toBe('polite');
    expect(workflow.getAttribute('aria-atomic')).toBe('true');
    help(result.container, result.compare);
  });

  it('labels partial recorded baselines and their display defaults without inventing one-input attribution', () => {
    const partial = { ...MODEL }; delete partial.climWind;
    const result = comparison({ wcScenarioBaseline: partial, climSolar: 1.2 });
    expect(result.compare.dataset.comparisonComplete).toBe('false');
    const method = result.compare.querySelector('[data-wc-fair-test]');
    expect(method.dataset.comparisonKind).toBe('incomplete');
    expect(method.textContent).toMatch(/cannot isolate one input/i);
    expect(result.compare.querySelector('[data-baseline-defaults-note]').textContent).toMatch(/defaults for missing values/i);
    expect(result.compare.querySelector('#wcIsolateInput')).toBeNull();
    expect(result.data.wcScenarioBaseline).not.toHaveProperty('climWind');
    expectReadings(result);
  });

  it.each(CASES)('shows exact Baseline, Current and signed Change values for %s', (label, state) => {
    const result = comparison(state);
    expectReadings(result);
    if (label === 'wind-only change') {
      expect(values(result).every(reading => reading.change === 0)).toBe(true);
      expect(result.compare.querySelector('[data-wc-fair-test]').dataset.comparisonKind).toBe('one-input');
      expect(result.compare.querySelector('.wc-fair-inputs').textContent).toContain('Wind');
    }
    if (label === 'unchanged inputs') expect(result.compare.querySelector('[data-wc-fair-test]').dataset.comparisonKind).toBe('unchanged');
  });

  it('distinguishes the independent indices from a folded native Pathway mix disclosure', () => {
    const result = comparison({ landRainIntensity: 85 });
    const bars = result.compare.querySelector('.wc-compare-bars');
    expect(help(result.container, bars)).toMatch(/independent indices.*do not add up to a water budget/i);
    const mix = result.compare.querySelector('[data-compare-pathway-mix]');
    expect(mix.tagName).toBe('DETAILS');
    expect(mix.open).toBe(false);
    expect(mix.firstElementChild.tagName).toBe('SUMMARY');
    expect(mix.firstElementChild.textContent).toContain('Pathway mix');
    expect(mix.textContent).toContain('Relative teaching shares, not water volumes');
    expect(mix.querySelector('.wc-route-mix-purpose').textContent).toMatch(/percentages are separate.*independent indices/i);
    const rows = Array.from(mix.querySelectorAll('.wc-route-mix-row'));
    expect(rows).toHaveLength(2);
    rows.forEach(row => {
      expect(row.getAttribute('role')).toBe('img');
      expect(row.getAttribute('aria-label')).toContain('not measured water volumes');
      expect(row.querySelector('.wc-route-mix-track').getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('names baseline actions explicitly, links their scope help, and disables Restore when inputs match', () => {
    const result = comparison({ climSolar: 1.2 });
    const actions = result.compare.querySelector('.wc-compare-actions');
    expect(help(result.container, actions)).toMatch(/replaces the baseline.*removes the comparison baseline.*observations stay/i);
    const buttons = Array.from(actions.querySelectorAll('button'));
    expect(buttons.map(button => normalized(button.textContent))).toEqual(['↶ Restore baseline', 'Save current as baseline', 'Clear baseline']);
    buttons.forEach(button => { expect(button.type).toBe('button'); help(result.container, button); });
    expect(buttons[0].disabled).toBe(false);
    expect(buttons[0].getAttribute('aria-label')).toMatch(/restore.*baseline/i);
    expect(buttons[1].getAttribute('aria-label').toLowerCase()).toContain(normalized(buttons[1].textContent).toLowerCase());
    expect(buttons[2].getAttribute('aria-label').toLowerCase()).toContain(normalized(buttons[2].textContent).toLowerCase());
    const unchanged = comparison();
    expect(unchanged.compare.querySelector('.wc-compare-btn.is-restore').disabled).toBe(true);
  });

  it('links the native isolate select and button to the restoration hint and only lists changed inputs', () => {
    const result = comparison({ climTemp: 21, landRainIntensity: 85, wcIsolateInput: 'landRainIntensity' });
    const select = result.compare.querySelector('#wcIsolateInput');
    expect(select.tagName).toBe('SELECT');
    expect(select.value).toBe('landRainIntensity');
    expect(Array.from(select.options).map(option => option.value)).toEqual(notebook.changedInputs(MODEL, result.data).map(input => input.key));
    expect(result.compare.querySelector('label[for="wcIsolateInput"]')).not.toBeNull();
    expect(select.getAttribute('aria-describedby')).toBe('wcIsolateInputHelp');
    expect(help(result.container, select)).toMatch(/restores the other inputs.*observations and writing stay/i);
    const button = select.parentElement.querySelector('button');
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-describedby')).toBe('wcIsolateInputHelp');
    help(result.container, button);
  });

  it('provides stable native claim IDs and a focusable feedback heading without hiding exact readings', () => {
    const pending = comparison({ landRainIntensity: 85 });
    const buttons = Array.from(pending.container.querySelectorAll('button[id^="wcEvidenceClaim-"]'));
    expect(buttons.map(button => button.id)).toEqual(Object.keys(claims).map(id => 'wcEvidenceClaim-' + id));
    buttons.forEach((button, index) => { expect(button.type).toBe('button'); expect(button.getAttribute('aria-label')).toMatch(/as an evidence claim$/); const label = normalized(readableText(button)); expect(label).toBe(claims[Object.keys(claims)[index]].label); expect(button.getAttribute('aria-label')).toContain(label); });
    const selected = comparison({ landRainIntensity: 85, wcPrediction: 'runoff' });
    const feedback = selected.container.querySelector('#wcPredictionFeedback');
    expect(feedback.tagName).toBe('H4');
    expect(feedback.getAttribute('tabindex')).toBe('-1');
    expect(feedback.textContent).toMatch(/evidence agrees|evidence differs/i);
    expect(selected.container.querySelectorAll('button[id^="wcEvidenceClaim-"]')).toHaveLength(0);
    expect(selected.container.querySelector('.wc-prediction-strip').getAttribute('aria-live')).toBe('polite');
    expectReadings(selected);
  });

  it.each(['available', 'duplicate', 'full'])('preserves the native observation-save state when the notebook is %s', kind => {
    const current = { ...MODEL, landRainIntensity: 85 };
    const entries = kind === 'duplicate' ? [{ label: 'My recorded comparison', baseline: { ...MODEL }, snapshot: current, notes: { evidence: 'Keep my writing.' } }]
      : kind === 'full' ? Array.from({ length: 4 }, (_, index) => ({ label: 'Saved ' + index, baseline: { ...MODEL, climTemp: 10 + index }, snapshot: { ...MODEL, climTemp: 20 + index }, notes: { evidence: 'Keep ' + index } })) : [];
    const result = comparison({ ...current, wcPrediction: 'runoff', wcExperimentLog: entries });
    const save = result.container.querySelector('.wc-prediction-save');
    expect(save.tagName).toBe('BUTTON');
    expect(save.type).toBe('button');
    expect(save.disabled).toBe(kind !== 'available');
    expect(normalized(save.textContent)).toBe(kind === 'duplicate' ? 'Saved' : kind === 'full' ? 'Notebook full' : 'Save observation');
    expect(save.getAttribute('aria-label')).toMatch(kind === 'duplicate' ? /already saved/i : kind === 'full' ? /notebook full.*remove/i : /save.*observation/i);
    expect(save.getAttribute('aria-label').toLowerCase()).toContain(normalized(save.textContent).toLowerCase());
  });

  it('renders changed comparisons without mutating frozen baselines, notes, undo records or process writing', () => {
    const state = freeze({ ...MODEL, landRainIntensity: 85, wcPrediction: 'runoff', wcScenarioBaseline: { ...MODEL },
      wcExperimentLog: [{ label: 'Learner record', baseline: { ...MODEL }, snapshot: { ...MODEL, landCover: 'urban' }, notes: { explanation: 'Keep my explanation.', evidence: 'Keep my evidence.', nextTest: 'Keep my next test.' } }],
      wcExperimentUndo: [{ index: 0, entry: { label: 'Removed record', notes: { evidence: 'Keep removed writing.' } } }],
      wcProcessCompare: { first: 'evaporation', second: 'transpiration', notes: { 'evaporation|transpiration': 'Keep my process explanation.' } }, wcReplayedObservation: 'Learner replay' });
    const before = JSON.stringify(state);
    const result = rendered(state);
    expectReadings(result);
    expect(result.container.querySelector('[data-wc-notebook]')).not.toBeNull();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('preserves the exact original production calculations, comparison identity and state handlers', () => {
    expect(createHash('sha256').update(baselineBytes).digest('hex')).toBe(BASELINE_SHA);
    PRESERVED.forEach(name => expect(nodes[name], name).toBe(originalNodes[name]));
  });

  it('ships identical source and public comparison implementations', () => {
    expect(readFileSync(MIRROR_PATH, 'utf8')).toBe(source);
  });
});