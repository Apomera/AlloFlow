import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse } from 'acorn';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const BASELINE_PATH = 'reports/watercycle-notebook-clarity/baseline-runtime.js';
const BASELINE_SHA = '942198fca1f8aae4c530764920afa5ed2fbd10c29b4fee68d7e4be560814d776';
const source = readFileSync(SOURCE_PATH, 'utf8');
const baselineBytes = readFileSync(BASELINE_PATH);
const PRESERVED = [
  'WCExploreNotebook', 'wcLandResponse', 'estimateWcLandIndices', 'estimateWcRouteShares',
  'evaporationIndex', 'wcBaselineEvaporationIndex', 'wcCurrentSnapshot', 'wcComparisonDeltas', 'formatWcDelta',
  'WATER_CYCLE_PRESETS', 'WATER_CYCLE_PREDICTIONS', 'getWcInteractionBaseline',
  'adjustClimate', 'adjustLand', 'resetClimate', 'resetLandScenario',
  'captureWcScenarioBaseline', 'restoreWcScenarioBaseline', 'clearWcScenarioBaseline',
  'isolateWcComparisonInput', 'saveWcObservation', 'replayWcObservation', 'recordWcPrediction', 'resetWcPrediction',
  'collectWcRemovedEntries', 'focusWcNotebookHeading', 'clearWcExperimentLog', 'removeWcObservation',
  'undoWcObservationRemoval', 'updateWcObservationNote', 'downloadWcExperimentLog',
];
const DELTA_ASSIGNMENTS = ['wcRunoffDelta', 'wcInfiltrationDelta', 'wcEvaporationDelta'];
const MODEL = {
  climSolar: 1, climTemp: 15, climWind: 1, landRainIntensity: 55, landSaturation: 45,
  landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
};
const VIEW = { wcMode: 'explorer', wcSection: 'conditions', wcClimateLabOpen: true, wcLandLabOpen: true,
  journeyView: '2d', activeStage: 'evaporation' };
let nodes;
let originalNodes;
let notebook;

// Slice full production declarations/functions, plus the actual signed-delta assignments.
function productionNodes(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  const pending = [parse(normalized, { ecmaVersion: 'latest' })];
  const result = {};
  while (pending.length) {
    const node = pending.pop();
    if (!node || typeof node !== 'object') continue;
    let name = (node.type === 'FunctionDeclaration' || node.type === 'VariableDeclarator') && node.id && node.id.name;
    if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left.type === 'Identifier' && DELTA_ASSIGNMENTS.includes(node.left.name)) name = node.left.name + ':assignment';
    if (PRESERVED.includes(name) || DELTA_ASSIGNMENTS.some(delta => name === delta + ':assignment')) {
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

beforeAll(() => {
  nodes = productionNodes(source);
  originalNodes = productionNodes(baselineBytes.toString('utf8'));
  [...PRESERVED, ...DELTA_ASSIGNMENTS.map(name => name + ':assignment')].forEach(name => {
    if (!nodes[name] || !originalNodes[name]) throw new Error('Missing production anchor: ' + name);
  });
  notebook = new Function('var ' + nodes.WCExploreNotebook + ';\nreturn WCExploreNotebook;')();
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
function record(overrides = {}) {
  return {
    key: 'saved-rain-comparison', savedAt: 1700000000000, label: 'Saved rain test', preset: 'custom',
    prediction: 'runoff', predictionLabel: 'Runoff rises', matched: true, evidenceLabels: ['Runoff rises'],
    baseline: { ...MODEL }, snapshot: { ...MODEL, landRainIntensity: 85 },
    metrics: { baseline: { evaporation: 0.537, runoff: 39, infiltration: 47 }, current: { evaporation: 0.619, runoff: 63, infiltration: 34 } },
    deltas: { evaporation: 0.082, runoff: 24, infiltration: -13 },
    notes: { explanation: 'Rain changes the comparison.', evidence: 'Use my saved readings.', nextTest: 'Hold rain fixed; change cover.' },
    ...overrides,
  };
}
function rendered(entries = [record()], state = {}) {
  const data = freeze({ ...VIEW, ...MODEL, wcScenarioBaseline: { ...MODEL }, wcExperimentLog: entries, ...state });
  const container = document.createElement('div');
  container.innerHTML = renderTool('waterCycle', { waterCycle: data });
  return { data, container, trail: container.querySelector('[data-wc-notebook]'), entries: Array.from(container.querySelectorAll('.wc-log-entry')) };
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

describe('Water Cycle evidence notebook clarity: actual renderer and frozen recorded evidence', () => {
  it('names the notebook and saved cards with real headings and retains a folded native explanation disclosure', () => {
    const result = rendered();
    expect(result.trail).not.toBeNull();
    expect(result.trail.getAttribute('role')).toBe('region');
    const title = result.trail.querySelector('#wcExperimentNotebookTitle');
    expect(title.tagName).toBe('H4');
    expect(title.getAttribute('tabindex')).toBe('-1');
    expect(result.trail.getAttribute('aria-labelledby')).toBe(title.id);
    expect(title.textContent).toBe('Evidence notebook');
    expect(help(result.container, result.trail)).toMatch(/saved changes.*evidence.*next test/i);
    expect(result.trail.querySelector('.wc-log-list').getAttribute('role')).toBe('list');
    const card = result.entries[0];
    expect(card.getAttribute('role')).toBe('listitem');
    expect(card.querySelector('h5.wc-notebook-record-title').textContent).toBe('Saved rain test');
    expect(card.querySelector('.wc-notebook-changes h6').textContent).toBe('Saved changes');
    const disclosure = card.querySelector('.wc-notebook-reflection');
    expect(disclosure.tagName).toBe('DETAILS');
    expect(disclosure.open).toBe(false);
    expect(disclosure.firstElementChild.tagName).toBe('SUMMARY');
    expect(disclosure.firstElementChild.textContent).toMatch(/explain.*observation/i);
  }, 30000);

  it('shows true zero, positive and negative stored changes exactly with their independent index units', () => {
    const saved = record({ deltas: { evaporation: 0.082012345678, runoff: 0, infiltration: -13.345678 } });
    const card = rendered([saved], { climSolar: 0.4, climTemp: -10, landRainIntensity: 10 }).entries[0];
    const readings = Array.from(card.querySelectorAll('[data-recorded-change]'));
    expect(readings.map(node => node.dataset.recordedChange)).toEqual(['evaporation', 'runoff', 'infiltration']);
    readings.forEach((node, index) => {
      expect(node.querySelector('dt').textContent).toBe(['Evaporation', 'Runoff', 'Infiltration'][index]);
      expect(node.dataset.recordedValue).toBe(['0.082012345678', '0', '-13.345678'][index]);
      expect(node.querySelector('dd').textContent.replace(/\s/g, '')).toBe(['+0.082012345678x', '0pts', '-13.345678pts'][index]);
    });
    expect(card.querySelector('.wc-notebook-changes p').textContent).toMatch(/saved scenario minus saved baseline.*index points.*pts/i);
  });

  it.each([
    ['missing changes', undefined],
    ['NaN and both infinite values', { evaporation: NaN, runoff: Infinity, infiltration: -Infinity }],
  ])('marks %s as Not recorded instead of inventing zeroes', (label, deltas) => {
    const card = rendered([record({ deltas })]).entries[0];
    const readings = Array.from(card.querySelectorAll('[data-recorded-change]'));
    expect(readings).toHaveLength(3);
    readings.forEach(node => {
      expect(node.dataset.recordedValue).toBe('missing');
      expect(node.querySelector('dd').textContent).toBe('Not recorded');
    });
  });

  it.each([
    [true, 'agrees', 'Evidence agrees'],
    [false, 'differs', 'Evidence differs'],
    [undefined, 'unknown', 'Claim check not recorded'],
  ])('preserves the three recorded claim states when matched is %s', (matched, status, copy) => {
    const card = rendered([record({ matched })]).entries[0];
    expect(card.dataset.recordedStatus).toBe(status);
    expect(card.querySelector('.wc-notebook-record-claim').textContent).toBe(copy);
    const disclosure = card.querySelector('.wc-notebook-reflection');
    expect(normalized(disclosure.querySelector('.wc-notebook-recorded-claim').textContent)).toBe('Saved claim: Runoff rises');
    expect(card.querySelector('.wc-log-entry-evidence').closest('details')).toBe(disclosure);
    expect(normalized(card.querySelector('.wc-log-entry-evidence').textContent)).toBe('Evidence summary: Runoff rises');
    expect(card.getAttribute('aria-label')).toContain(copy + '. Claim: Runoff rises.');
    if (status === 'unknown') {
      expect(card.querySelector('.wc-notebook-record-claim').textContent).not.toMatch(/evidence agrees|evidence differs/i);
    }
  });

  it('keeps exact saved table values while later current controls and comparison readings change', () => {
    const saved = record();
    const first = rendered([saved], { climSolar: 0.6, landRainIntensity: 20 });
    const later = rendered([saved], { climSolar: 1.8, landRainIntensity: 95 });
    [first, later].forEach(result => {
      const table = result.entries[0].querySelector('.wc-notebook-values table');
      expect(table.querySelector('caption').textContent).toBe('Recorded model values');
      expect(Array.from(table.querySelectorAll('thead th')).map(node => node.textContent)).toEqual(['Reading', 'Saved baseline', 'Saved scenario']);
      expect(Array.from(table.querySelectorAll('thead th')).every(node => node.getAttribute('scope') === 'col')).toBe(true);
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      expect(rows.map(row => row.querySelector('th').textContent)).toEqual(['Evaporation (x)', 'Runoff (/100)', 'Infiltration (/100)']);
      rows.forEach((row, index) => {
        const metric = ['evaporation', 'runoff', 'infiltration'][index];
        expect(row.querySelector('th').getAttribute('scope')).toBe('row');
        expect(Array.from(row.querySelectorAll('td')).map(node => node.textContent)).toEqual([String(saved.metrics.baseline[metric]), String(saved.metrics.current[metric])]);
      });
      expect(result.entries[0].querySelector('.wc-notebook-saved-scope').textContent).toMatch(/only recorded values are shown.*current controls does not change them.*missing evidence/i);
    });
    expect(first.container.querySelector('[data-compare-reading="runoff"]').textContent).not.toBe(later.container.querySelector('[data-compare-reading="runoff"]').textContent);
    expect(first.entries[0].querySelector('table').textContent).toBe(later.entries[0].querySelector('table').textContent);
  });

  it('uses Not recorded for missing or nonfinite table cells and retains any finite saved reading', () => {
    const saved = record({ metrics: { baseline: { evaporation: 0, runoff: NaN }, current: { evaporation: Infinity, runoff: 12.345, infiltration: -Infinity } } });
    const rows = Array.from(rendered([saved]).entries[0].querySelectorAll('tbody tr'));
    expect(rows.map(row => Array.from(row.querySelectorAll('td')).map(cell => cell.textContent))).toEqual([
      ['0', 'Not recorded'], ['Not recorded', '12.345'], ['Not recorded', 'Not recorded'],
    ]);
  });

  it('does not generate a model-value table when an older observation has no recorded metrics', () => {
    const card = rendered([record({ metrics: undefined })]).entries[0];
    expect(card.querySelector('.wc-notebook-values')).toBeNull();
    expect(card.querySelector('[data-recorded-change="runoff"] dd').textContent).toBe('+24 pts');
  });

  it('derives the saved comparison method from recorded inputs rather than the later live comparison', () => {
    const entries = [
      record({ key: 'same', label: 'Same inputs', snapshot: { ...MODEL } }),
      record({ key: 'many', label: 'Two inputs', snapshot: { ...MODEL, climTemp: 24, landCover: 'urban' } }),
      record({ key: 'one', label: 'One input' }),
    ];
    const result = rendered(entries, { climTemp: -10, climWind: 1.8, landRainIntensity: 10, landCover: 'urban' });
    result.entries.forEach(card => {
      const label = card.querySelector('h5').textContent;
      const saved = entries.find(entry => entry.label === label);
      const changed = notebook.changedInputs(saved.baseline, saved.snapshot);
      expect(card.querySelector('.wc-notebook-record-method').textContent).toBe(changed.length === 1 ? changed[0].label + ' changed' : changed.length > 1 ? changed.length + ' inputs changed' : 'Inputs match');
      expect(card.querySelector('.wc-notebook-method').textContent).toMatch(changed.length === 1 ? /one input.*other seven/i : changed.length > 1 ? /multiple inputs.*cannot isolate one cause/i : /recorded inputs are identical/i);
    });
  });

  it('explains incomplete legacy inputs and replay defaults without completing or recomputing the record', () => {
    const baseline = { ...MODEL }; delete baseline.climWind;
    const snapshot = { ...MODEL, landRainIntensity: 85 }; delete snapshot.landCover;
    const saved = record({ baseline, snapshot, deltas: { runoff: -7 }, metrics: undefined });
    const card = rendered([saved]).entries[0];
    expect(card.querySelector('.wc-notebook-record-method').textContent).toBe('Partial input record');
    expect(card.querySelector('.wc-notebook-method').textContent).toMatch(/inputs were not recorded.*Not recorded.*defaults for missing condition settings.*stays incomplete/i);
    expect(card.querySelector('[data-recorded-change="runoff"] dd').textContent).toBe('-7 pts');
    expect(card.querySelector('[data-recorded-change="evaporation"] dd').textContent).toBe('Not recorded');
    expect(saved.baseline).not.toHaveProperty('climWind');
    expect(saved.snapshot).not.toHaveProperty('landCover');
  });

  it('offers native Replay settings with linked scope help for saved settings even without a baseline', () => {
    const entries = [record(), record({ key: 'no-baseline', label: 'Older settings', baseline: null })];
    const result = rendered(entries);
    result.entries.forEach(card => {
      const button = card.querySelector('.wc-log-replay');
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
      expect(normalized(readableText(button))).toBe('Replay settings');
      expect(button.getAttribute('aria-label')).toBe('Replay settings: ' + card.querySelector('h5').textContent);
      const missingBaseline = card.querySelector('.wc-notebook-baseline-missing');
      if (card.querySelector('h5').textContent === 'Older settings') {
        expect(missingBaseline.textContent).toMatch(/no saved baseline.*Replay loads its settings.*Set baseline.*new comparison/i);
      } else expect(missingBaseline).toBeNull();
      expect(help(result.container, button)).toMatch(/saved condition settings into the current workspace.*recorded evidence stays unchanged/i);
    });
  });

  it('omits Replay when no snapshot was recorded and keeps the saved record discoverable', () => {
    const card = rendered([record({ snapshot: null })]).entries[0];
    expect(card.querySelector('.wc-log-replay')).toBeNull();
    expect(card.querySelector('h5').textContent).toBe('Saved rain test');
    expect(card.querySelector('.wc-notebook-record-method').textContent).toBe('Partial input record');
    expect(card.querySelector('.wc-log-entry-actions button').getAttribute('aria-label')).toBe('Remove observation: Saved rain test');
  });

  it('announces loaded settings with an atomic live status while keeping recorded values in the notebook', () => {
    const result = rendered([record()], { wcReplayedObservation: 'Saved rain test' });
    const status = result.trail.querySelector('#wcExperimentTrailStatus');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toMatch(/settings replayed.*Saved rain test.*condition.*new comparison/i);
    const badge = result.trail.querySelector('.wc-experiment-log-replay-badge');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
    expect(badge.textContent).toBe('Settings replayed');
    expect(result.entries[0].querySelector('[data-recorded-change="runoff"] dd').textContent).toBe('+24 pts');
  });

  it('preserves saved writing in labeled native fields with unique, resolving hints after reverse display order', () => {
    const older = record({ key: 'older', label: 'Older evidence', notes: { explanation: 'Older explanation', evidence: 'Older evidence used', nextTest: 'Older next test' } });
    const newer = record({ key: 'newer', label: 'Newer evidence', notes: { explanation: 'Newer explanation', evidence: 'Newer evidence used', nextTest: 'Newer next test' } });
    const result = rendered([older, newer]);
    expect(result.entries.map(card => card.querySelector('h5').textContent)).toEqual(['Newer evidence', 'Older evidence']);
    const fields = Array.from(result.trail.querySelectorAll('.wc-notebook-note textarea'));
    expect(fields).toHaveLength(6);
    expect(new Set(fields.map(field => field.id)).size).toBe(6);
    fields.forEach(field => {
      const [, index, key] = field.id.match(/^wcNotebookNote-(\d+)-(explanation|evidence|nextTest)$/);
      expect(field.value).toBe([older, newer][Number(index)].notes[key]);
      expect(field.maxLength).toBe(1200);
      expect(result.trail.querySelector('label[for="' + field.id + '"]')).not.toBeNull();
      const hint = help(result.container, field);
      if (key === 'evidence') expect(hint).toMatch(/saved baseline.*saved scenario.*signed change.*not establish/i);
    });
  });

  it('places valid saved pathway shares inside the native disclosure and distinguishes them from independent readings', () => {
    const result = rendered([record({ routeShares: { runoff: 58, infiltration: 32, plant: 10 } })]);
    const card = result.entries[0];
    const mix = card.querySelector('.wc-log-entry-route-mix');
    expect(mix.closest('details')).toBe(card.querySelector('.wc-notebook-reflection'));
    expect(mix.textContent).toContain('Runoff 58% · Underground 32% · Plant 10%');
    expect(mix.textContent).toMatch(/relative branch shares.*separate from.*independent readings.*not measured water volumes/i);
    expect(card.querySelector('.wc-notebook-reflection').textContent).toMatch(/independent teaching indices.*not a measured water budget/i);
  });

  it('renders frozen saved records, notes and Undo without changing missing values or later learner state', () => {
    const saved = record({ deltas: { evaporation: NaN, runoff: 0, infiltration: Infinity } });
    const removed = record({ key: 'removed', label: 'Removed evidence' });
    const state = freeze({ climSolar: 1.8, landRainIntensity: 15, wcExperimentUndo: [{ index: 0, entry: removed }], wcReplayedObservation: 'Saved rain test', wcPrediction: 'mixed' });
    const before = JSON.stringify({ saved, state });
    const result = rendered([saved], state);
    expect(JSON.stringify({ saved, state })).toBe(before);
    expect(Number.isNaN(saved.deltas.evaporation)).toBe(true);
    expect(saved.deltas.infiltration).toBe(Infinity);
    expect(result.data.wcExperimentLog[0]).toBe(saved);
    expect(result.data.wcExperimentUndo[0].entry).toBe(removed);
    expect(result.trail.querySelector('.wc-notebook-undo').textContent).toContain('Undo removal');
    expect(result.entries[0].querySelector('[data-recorded-change="runoff"] dd').textContent).toBe('0 pts');
  });
  it('preserves the complete notebook/export helper, production math and original notebook state handlers', () => {
    expect(createHash('sha256').update(baselineBytes).digest('hex')).toBe(BASELINE_SHA);
    [...PRESERVED, ...DELTA_ASSIGNMENTS.map(name => name + ':assignment')].forEach(name => expect(nodes[name], name).toBe(originalNodes[name]));
  });

  it('ships identical source and public notebook implementations', () => {
    expect(readFileSync(MIRROR_PATH, 'utf8')).toBe(source);
  });
});