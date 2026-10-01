import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
const SOURCE_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js');
const MIRROR_PATH = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const source = readFileSync(SOURCE_PATH, 'utf8');

function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  expect(from, start).toBeGreaterThan(-1);
  expect(to, end).toBeGreaterThan(from);
  return source.slice(from, to);
}
const derivation = between('          function clampWcSignal(value)', '          var wcClimateBaselineSolar =');
const dashboardStart = source.search(/React\.createElement\("section", \{\s*className: "wc-signal-dashboard wc-focus-secondary"/);
const dashboardEnd = source.indexOf("            React.createElement('section', { className: 'wc-next-test", dashboardStart);
expect(dashboardStart).toBeGreaterThan(-1);
expect(dashboardEnd).toBeGreaterThan(dashboardStart);
const dashboardExpression = source.slice(dashboardStart, dashboardEnd).trim().replace(/,$/, '');

function fixture(options = {}) {
  return {
    d: {}, journeyReplayIsScrubbed: false, journeyReplaySegment: { state: 'ocean' },
    resolvedStageId: 'evaporation', currentStageLabel: 'Evaporation', journeyReplayProgress: 0,
    landSaturation: 45, landRainIntensity: 55, runoffTendency: 52, infiltrationOpportunity: 48,
    evaporationIndex: 1.2, currentWind: 1, currentSolar: 1, landPermeability: 'medium',
    wcRouteShares: { runoff: 35, infiltration: 35, plant: 30 },
    wcSolarEffect: 'Solar fixture explanation.', wcTemperatureEffect: 'Temperature fixture explanation.',
    wcLandInterpretation: 'Land fixture explanation.', isDark: false,
    React, t: (_key, fallback) => fallback, __alloT: (_key, fallback) => fallback,
    upd: vi.fn(), ...options,
  };
}

function derive(options = {}, render = false) {
  const context = fixture(options);
  const body = [
    "'use strict';", derivation,
    'return { places: wcSignalChartPlaceKeys, labels: wcSignalChartLabels,',
    '  focusState: wcSignalFocusState, stageIndex: wcSignalChartStageIndex,',
    '  focusKind: wcSignalChartFocusKind,',
    '  inspectPlace: wcSignalInspectPlace, inspectIndex: wcSignalInspectIndex,',
    '  series: { energy: wcSignalEnergySeries, flow: wcSignalFlowSeries, storage: wcSignalStorageSeries },',
    '  seriesSpec: wcSignalSeries, chartX: wcSignalChartX, chartY: wcSignalChartY, chartPath: wcSignalChartPath,',
    '  reservoirs: wcSignalReservoirs, driver: wcSignalDriver, activeSeries: wcSignalActiveSeries,',
    render ? '  element: (' + dashboardExpression + ')' : '  element: null',
    '};',
  ].join('\n');
  return { ...new Function(...Object.keys(context), body)(...Object.values(context)), context };
}

const placeKeys = ['surface', 'air', 'cloud', 'land', 'return'];
const standalone = [
  ['collection', 0], ['evaporation', 1], ['condensation', 2],
  ['precipitation', 3], ['infiltration', 3], ['transpiration', 4],
];
const journey = [
  ['ocean', 0], ['river_runoff', 0], ['evaporating', 1], ['condensing', 2],
  ['precipitating', 3], ['ground_choice', 3], ['infiltrating', 3], ['aquifer_flow', 3],
  ['plant_absorb', 4], ['transpiring', 4], ['complete', 4],
];

describe('Water Cycle signal chart: actual inspection derivations', () => {
  it.each(standalone)('standalone %s follows the correct named place', (stage, expected) => {
    const state = Object.freeze({ journeyActive: false, journeyState: 'aquifer_flow' });
    const result = derive({ d: state, resolvedStageId: stage });
    expect(result.focusState).toBe(stage);
    expect(result.stageIndex).toBe(expected);
    expect(result.inspectIndex).toBe(expected);
    expect(result.inspectPlace).toBe('follow');
  });

  it.each(journey)('active %s and its replay use the existing stage mapping', (state, expected) => {
    for (const paused of [false, true]) {
      const active = derive({ d: Object.freeze({ journeyActive: true, journeyState: state, journeyPaused: paused }), resolvedStageId: 'evaporation' });
      expect(active.focusState).toBe(state);
      expect(active.stageIndex).toBe(expected);
      expect(active.inspectIndex).toBe(expected);
    }
    const replay = derive({ d: Object.freeze({ journeyActive: false, journeyState: 'ocean' }), resolvedStageId: 'collection', journeyReplayIsScrubbed: true, journeyReplaySegment: { state } });
    expect(replay.focusState).toBe(state);
    expect(replay.stageIndex).toBe(expected);
    expect(replay.inspectIndex).toBe(expected);
  });

  it.each(placeKeys)('manual inspection of %s keeps the separate current-stage marker', place => {
    const result = derive({ d: Object.freeze({ journeyActive: true, journeyState: 'infiltrating', wcSignalInspectPlace: place }), resolvedStageId: 'infiltration' });
    expect(result.places).toEqual(placeKeys);
    expect(result.inspectPlace).toBe(place);
    expect(result.inspectIndex).toBe(placeKeys.indexOf(place));
    expect(result.stageIndex).toBe(3);
    expect(result.focusState).toBe('infiltrating');
  });

  it('manual inspection is retained while live stage and replay focus change', () => {
    const state = Object.freeze({ journeyActive: true, journeyState: 'condensing', wcSignalInspectPlace: 'return' });
    const live = derive({ d: state });
    const replay = derive({ d: state, journeyReplayIsScrubbed: true, journeyReplaySegment: { state: 'precipitating' } });
    expect(live.stageIndex).toBe(2);
    expect(replay.stageIndex).toBe(3);
    expect(live.inspectIndex).toBe(4);
    expect(replay.inspectIndex).toBe(4);
  });

  it('missing, malformed, and prototype-like restored preferences fall back to following', () => {
    for (const restored of [undefined, null, '', 0, false, [], {}, 'Air', 'bogus', '__proto__', 'constructor', 'toString']) {
      const result = derive({ d: Object.freeze({ journeyActive: true, journeyState: 'condensing', wcSignalInspectPlace: restored }) });
      expect(result.inspectPlace, String(restored)).toBe('follow');
      expect(result.inspectIndex, String(restored)).toBe(2);
    }
    const follow = derive({ d: Object.freeze({ wcSignalInspectPlace: 'follow' }), resolvedStageId: 'infiltration' });
    expect(follow.inspectPlace).toBe('follow');
    expect(follow.inspectIndex).toBe(3);
  });

  it('unknown restored journey stages fall back to a valid inspection index', () => {
    for (const state of ['unknown_saved_state', '__proto__', 'constructor', 'toString']) {
      for (const options of [
        { d: Object.freeze({ journeyActive: true, journeyState: state }) },
        { d: Object.freeze({ journeyActive: true, journeyState: 'ocean' }), journeyReplayIsScrubbed: true, journeyReplaySegment: { state } },
      ]) {
        const result = derive(options);
        expect(result.stageIndex, state).toBe(0);
        expect(result.inspectIndex, state).toBe(0);
        expect(result.driver.key, state).toBe('surface');
        expect(result.activeSeries, state).toBe('flow');
      }
    }
  });

  it('inspecting another place does not change any generated score or saved state', () => {
    const saved = Object.freeze({
      journeyActive: true, journeyState: 'plant_absorb', journeyPaused: true,
      journeyReplayProgress: 0.74, journeyPaths: Object.freeze({ plant: 2, runoff: 1 }),
      climTemp: 31, climSolar: 0.6, wc3dCameraMode: 'orbit',
      wcProcessCompare: Object.freeze({ notes: Object.freeze({ 'evaporation|transpiration': 'My explanation' }) }),
      wcPrediction: 'runoff', wcReplayedObservation: 'saved-1',
      wcScenarioBaseline: Object.freeze({ climTemp: 15, climSolar: 1 }),
      wcExperimentLog: Object.freeze([Object.freeze({ label: 'My evidence', prediction: 'runoff', snapshot: Object.freeze({ climTemp: 31 }), notes: Object.freeze({ evidence: 'Keep my evidence.', nextTest: 'Change sunlight.' }) })]),
      wcExperimentUndo: Object.freeze([Object.freeze({ index: 0, entry: Object.freeze({ label: 'My removed evidence' }) })]),
    });
    const before = JSON.stringify(saved);
    const following = derive({ d: saved });
    for (const place of placeKeys) {
      const inspecting = derive({ d: Object.freeze({ ...saved, wcSignalInspectPlace: place }) });
      expect(inspecting.series).toEqual(following.series);
      expect(inspecting.reservoirs).toEqual(following.reservoirs);
      expect(inspecting.driver).toEqual(following.driver);
      expect(inspecting.activeSeries).toBe(following.activeSeries);
    }
    expect(JSON.stringify(saved)).toBe(before);
  });

  it('retains the four original score initializers from the pre-inspection source', () => {
    // These hashes were captured from the saved source with SHA-256 2ab8cb80d55de3063122677d50df18c4047ab1ad41fc198b86d5093ae9c83ccf.
    // Pin the existing score calculation without copying or inventing any formulas.
    const original = {
      wcSignalReservoirs: '982c75e76c179b1e30f9009319f95c58dac0506fb8b552e9cc63e479e633e531',
      wcSignalEnergySeries: '8a771c16632d6c5158f45c5028ee65b7a79a9ea4825c503f013f7727535f4dcf',
      wcSignalFlowSeries: 'fb804faec8e6c0a8c1ed86cfb32595de4ede4cf2f6e27fd1b0eb45113b4b6378',
      wcSignalStorageSeries: '1543ffb8eb449b31edf7a292840bef718bf9a5bdb86bed911cdd61fd2e6bf461',
    };
    for (const [name, expected] of Object.entries(original)) {
      const initializer = source.match(new RegExp('var ' + name + ' = \\[([\\s\\S]*?)\\n          \\];'));
      expect(initializer, name).not.toBeNull();
      const actual = createHash('sha256').update(initializer[0].replace(/\r\n/g, '\n')).digest('hex');
      expect(actual, name).toBe(expected);
    }
  });

  it('each existing series supplies one finite 0–100 score per named place', () => {
    for (const climate of [
      { currentSolar: 0, currentWind: 0, evaporationIndex: 0.15, landRainIntensity: 0, landSaturation: 0, runoffTendency: 0, infiltrationOpportunity: 100 },
      { currentSolar: 2, currentWind: 3, evaporationIndex: 2, landRainIntensity: 100, landSaturation: 100, runoffTendency: 100, infiltrationOpportunity: 0 },
    ]) {
      const result = derive(climate);
      for (const values of Object.values(result.series)) {
        expect(values).toHaveLength(placeKeys.length);
        expect(values.every(value => Number.isFinite(value) && value >= 0 && value <= 100)).toBe(true);
      }
    }
  });
});

function walk(element, predicate, found = []) {
  if (!element || typeof element !== 'object') return found;
  if (Array.isArray(element)) { element.forEach(child => walk(child, predicate, found)); return found; }
  if (predicate(element)) found.push(element);
  walk(element.props && element.props.children, predicate, found);
  return found;
}
function rendered(options) {
  const result = derive(options, true);
  const html = ReactDOMServer.renderToStaticMarkup(result.element);
  const container = document.createElement('div');
  container.innerHTML = html;
  return { ...result, container, html };
}

function expectExactReadings(result) {
  const { container, inspectIndex, stageIndex, series, labels } = result;
  const chart = container.querySelector('[data-watercycle-chart]');
  expect(chart.getAttribute('data-signal-stage-index')).toBe(String(stageIndex));
  expect(chart.getAttribute('data-signal-inspect-index')).toBe(String(inspectIndex));
  const reading = container.querySelector('.wc-signal-reading');
  expect(reading.getAttribute('data-signal-reading-place')).toBe(placeKeys[inspectIndex]);
  expect(reading.getAttribute('role')).toBe('status');
  expect(reading.getAttribute('aria-live')).toBe('polite');
  expect(reading.getAttribute('aria-atomic')).toBe('true');
  expect(reading.querySelector('strong').textContent).toBe(labels[inspectIndex] + ' · Teaching scores');
  const focus = result.focusKind.toLowerCase();
  const caption = result.inspectPlace === 'follow'
    ? 'Following ' + focus : 'Inspecting this place · ' + focus + ' ' + labels[stageIndex];
  expect(reading.querySelector('.wc-signal-reading-head span').textContent).toBe(caption);
  expect(container.querySelector('#wcSignalInspectPlace option[value="follow"]').textContent).toBe('Follow ' + focus + ' · ' + labels[stageIndex]);
  expect(container.querySelector('#wcSignalChartDesc').textContent).toContain(result.focusKind + ' is ' + labels[stageIndex] + '; inspected values are at ' + labels[inspectIndex]);
  expect(Array.from(reading.querySelectorAll('[data-signal-reading-series]'), item => item.dataset.signalReadingSeries)).toEqual(Object.keys(series));
  for (const [key, values] of Object.entries(series)) {
    const item = reading.querySelector('[data-signal-reading-series="' + key + '"]');
    expect(item.querySelector('dd').textContent, key).toBe(values[inspectIndex] + '/100');
    expect(item.querySelector('dt').textContent, key).toBe(result.seriesSpec.find(spec => spec.key === key).label);
  }
  const details = container.querySelector('details.wc-signal-values');
  expect(details.open).toBe(false);
  expect(details.querySelector('summary').textContent).toBe('Read all chart values');
  const rows = Array.from(details.querySelectorAll('tbody tr'));
  expect(rows.map(row => row.dataset.signalValuesPlace)).toEqual(placeKeys);
  expect(details.querySelectorAll('thead th[scope="col"]')).toHaveLength(4);
  expect(details.querySelector('caption').textContent).toMatch(/Independent teaching scores \(0–100\)/);
  expect(rows.filter(row => row.dataset.inspected === 'true')).toEqual([rows[inspectIndex]]);
  rows.forEach((row, index) => {
    expect(row.querySelector('th[scope="row"]').textContent).toBe(labels[index]);
    expect(row.querySelectorAll('td')).toHaveLength(3);
    for (const [key, values] of Object.entries(series)) {
      expect(row.querySelector('[data-signal-value="' + key + '"]').textContent, key + ' at ' + placeKeys[index]).toBe(String(values[index]));
    }
  });
  const bars = Array.from(container.querySelectorAll('.wc-signal-bars [role="progressbar"]'));
  expect(bars.map(bar => Number(bar.getAttribute('aria-valuenow')))).toEqual(result.reservoirs.map(reservoir => reservoir.value));
}

describe('Water Cycle signal chart: actual chart-only rendering', () => {
  it('keeps the plot, inspection, named storage group and folded table in reading order', () => {
    const { container } = rendered();
    const grid = container.querySelector('.wc-signal-grid');
    expect(Array.from(grid.children, child => child.className)).toEqual([
      'wc-signal-chart', 'wc-signal-inspection', 'wc-signal-stores', 'wc-signal-values',
    ]);
    const [chart, inspection, stores, values] = grid.children;
    expect(chart.querySelector('.wc-signal-plot')).not.toBeNull();
    expect(chart.querySelector('.wc-signal-legend')).not.toBeNull();
    expect(inspection.querySelector('.wc-signal-inspection-controls label[for="wcSignalInspectPlace"]')).not.toBeNull();
    expect(inspection.querySelector('#wcSignalInspectHint')).not.toBeNull();
    expect(inspection.querySelector('.wc-signal-reading')).not.toBeNull();
    expect(stores.querySelector('.wc-signal-bars[role="list"]')).not.toBeNull();
    expect(values.tagName).toBe('DETAILS');
    expect(values.open).toBe(false);
    expect(values.querySelector('table')).not.toBeNull();
  });

  it('names the five storage cues visibly and retains their exact reservoir values', () => {
    const result = rendered();
    const stores = result.container.querySelector('.wc-signal-stores');
    const heading = stores.querySelector('h4#wcSignalStoresTitle');
    expect(heading.textContent).toBe('Storage cues by store');
    expect(heading.getAttribute('aria-hidden')).not.toBe('true');
    expect(heading.hidden).toBe(false);
    const list = stores.querySelector('.wc-signal-bars[role="list"]');
    const items = Array.from(list.querySelectorAll('[role="listitem"]'));
    expect(items).toHaveLength(5);
    expect(items.map(item => item.querySelector('.wc-signal-bar-head span').textContent)).toEqual(result.reservoirs.map(store => store.label));
    expect(items.map(item => Number(item.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')))).toEqual(result.reservoirs.map(store => store.value));
  });

  it('states that current conditions supply the same scores while replay changes focus', () => {
    const state = Object.freeze({ journeyActive: true, journeyState: 'evaporating', wcSignalInspectPlace: 'return' });
    const live = rendered({ d: state });
    const replay = rendered({ d: state, journeyReplayIsScrubbed: true, journeyReplaySegment: { state: 'infiltrating' } });
    for (const result of [live, replay]) {
      expect(result.container.querySelector('.wc-signal-dashboard-title').textContent).toContain('Current condition cues');
      const scope = result.container.querySelector('.wc-signal-chart-note').textContent;
      expect(scope).toMatch(/current conditions/i);
      expect(scope).toMatch(/replay.*focus/i);
      expectExactReadings(result);
    }
    expect(replay.series).toEqual(live.series);
    expect(replay.reservoirs).toEqual(live.reservoirs);
    expect(replay.inspectIndex).toBe(live.inspectIndex);
    expect(replay.stageIndex).not.toBe(live.stageIndex);
  });

  it('renders the native follow/places select with a selected restored place', () => {
    const result = rendered({ d: { wcSignalInspectPlace: 'cloud' } });
    const select = result.container.querySelector('#wcSignalInspectPlace');
    expect(select).not.toBeNull();
    expect(Array.from(select.options, option => option.value)).toEqual(['follow', ...placeKeys]);
    expect(select.value).toBe('cloud');
    expect(result.container.querySelector('label[for="wcSignalInspectPlace"]')).not.toBeNull();
  });

  it('the native selector updates only the inspection preference', () => {
    const state = Object.freeze({ journeyActive: true, journeyState: 'aquifer_flow', journeyPaused: true, wc3dCameraMode: 'orbit', wcPrediction: 'runoff', wcExperimentLog: Object.freeze([Object.freeze({ label: 'Saved evidence' })]) });
    const before = JSON.stringify(state);
    const result = derive({ d: state }, true);
    const select = walk(result.element, element => element.type === 'select' && element.props.id === 'wcSignalInspectPlace')[0];
    select.props.onChange({ target: { value: 'cloud' } });
    select.props.onChange({ target: { value: 'follow' } });
    expect(result.context.upd.mock.calls).toEqual([['wcSignalInspectPlace', 'cloud'], ['wcSignalInspectPlace', 'follow']]);
    expect(state.journeyState).toBe('aquifer_flow');
    expect(state.journeyPaused).toBe(true);
    expect(state.wc3dCameraMode).toBe('orbit');
    expect(JSON.stringify(state)).toBe(before);
  });

  it('the three series keep distinct persistent dash styles and an accessible description', () => {
    const { container } = rendered({ d: { wcSignalInspectPlace: 'land' }, resolvedStageId: 'infiltration' });
    const series = Array.from(container.querySelectorAll('.wc-signal-plot path[data-signal-series]'));
    expect(series).toHaveLength(3);
    expect(series.map(path => [path.dataset.signalSeries, path.getAttribute('stroke-dasharray')])).toEqual([
      ['energy', 'none'], ['flow', '9 6'], ['storage', '1 6'],
    ]);
    const svg = container.querySelector('.wc-signal-plot');
    expect(svg.getAttribute('role')).toBe('img');
    const associated = svg.getAttribute('aria-labelledby').split(/\s+/).map(id => container.querySelector('#' + id)?.textContent).join(' ');
    expect(associated).toMatch(/teaching|illustrative/i);
    expect(associated).toContain('not measurements');
    expect(associated).toContain('not elapsed time or a required droplet route');
    expect(associated).toContain('solid with circle markers');
    expect(associated).toContain('dashed with square markers');
    expect(associated).toContain('dotted with diamond markers');
  });

  it.each(placeKeys)('the %s readout and all table rows match the original evaluated series', place => {
    for (const isDark of [false, true]) {
      expectExactReadings(rendered({ d: Object.freeze({ wcSignalInspectPlace: place }), isDark }));
    }
  });

  it.each(standalone)('the %s follow readout exposes the same place as the selected stage', (stage, index) => {
    const result = rendered({ d: Object.freeze({ journeyActive: false }), resolvedStageId: stage });
    expect(result.inspectIndex).toBe(index);
    expectExactReadings(result);
  });

  it.each(journey)('the active and scrubbed %s readout match their stage and actual series', (state, index) => {
    const active = rendered({ d: Object.freeze({ journeyActive: true, journeyState: state }) });
    const replay = rendered({ d: Object.freeze({ journeyActive: true, journeyState: 'ocean', journeyPaused: true }), journeyReplayIsScrubbed: true, journeyReplaySegment: { state } });
    for (const result of [active, replay]) {
      expect(result.inspectIndex).toBe(index);
      expectExactReadings(result);
    }
  });

  it('invalid restored inspection preferences render the native follow option and valid readings', () => {
    for (const saved of [undefined, null, 'Air', 'bogus', '__proto__', 'constructor', [], {}]) {
      const result = rendered({ d: Object.freeze({ journeyActive: true, journeyState: 'aquifer_flow', wcSignalInspectPlace: saved }) });
      expect(result.container.querySelector('#wcSignalInspectPlace').value).toBe('follow');
      expectExactReadings(result);
    }
  });

  it('unknown and prototype-like saved stage names render valid fallback readings', () => {
    for (const state of ['unknown_saved_state', '__proto__', 'constructor', 'toString']) {
      for (const options of [
        { d: Object.freeze({ journeyActive: true, journeyState: state }) },
        { d: Object.freeze({ journeyActive: true, journeyState: 'ocean' }), journeyReplayIsScrubbed: true, journeyReplaySegment: { state } },
      ]) {
        const result = rendered(options);
        expect(result.inspectIndex, state).toBe(0);
        expectExactReadings(result);
        expect(result.container.querySelector('.wc-signal-driver strong').textContent).toBe('Surface storage + gravity');
      }
    }
  });

  it.each(placeKeys)('the inspected %s markers match the actual path coordinates and legend shapes', place => {
    const result = rendered({ d: { journeyActive: true, journeyState: 'precipitating', wcSignalInspectPlace: place } });
    const plot = result.container.querySelector('.wc-signal-plot');
    expect(Array.from(plot.querySelectorAll('[data-signal-marker]'), point => [point.dataset.signalMarker, point.tagName])).toEqual([
      ['energy', 'circle'], ['flow', 'rect'], ['storage', 'path'],
    ]);
    const x = result.chartX(result.inspectIndex);
    for (const [key, values] of Object.entries(result.series)) {
      const path = plot.querySelector('path[data-signal-series="' + key + '"]');
      expect(path.getAttribute('d'), key).toBe(result.chartPath(values));
      const point = plot.querySelector('[data-signal-marker="' + key + '"]');
      const y = result.chartY(values[result.inspectIndex]);
      if (key === 'energy') {
        expect(Number(point.getAttribute('cx'))).toBe(x);
        expect(Number(point.getAttribute('cy'))).toBe(y);
      } else if (key === 'flow') {
        expect(Number(point.getAttribute('x')) + Number(point.getAttribute('width')) / 2).toBe(x);
        expect(Number(point.getAttribute('y')) + Number(point.getAttribute('height')) / 2).toBeCloseTo(y, 8);
      } else {
        const origin = point.getAttribute('d').match(/^M ([\d.]+) ([\d.]+)/);
        expect(Number(origin[1])).toBe(x);
        expect(Number(origin[2]) + 6).toBeCloseTo(y, 8);
        expect(point.getAttribute('d')).toMatch(/ l 6 6 -6 6 -6 -6 Z$/);
      }
      const legend = result.container.querySelector('.wc-signal-legend');
      expect(legend.querySelector('[data-signal-marker="' + key + '"]').tagName).toBe(point.tagName);
      expect(legend.querySelector('path[data-signal-series="' + key + '"]').getAttribute('stroke-dasharray')).toBe(path.getAttribute('stroke-dasharray'));
    }
    expect(Number(plot.querySelector('.wc-signal-stage-marker').getAttribute('x1'))).toBe(result.chartX(result.stageIndex));
    expect(plot.querySelector('.wc-signal-stage-marker-label').textContent).toBe(result.labels[result.stageIndex]);
    expect(Number(plot.querySelector('.wc-signal-inspect-band').getAttribute('x')) + 12).toBe(x);
    const label = plot.querySelectorAll('.wc-signal-place-label')[result.inspectIndex];
    expect(Number(label.getAttribute('x'))).toBe(x);
    expect(label.textContent).toBe(result.labels[result.inspectIndex]);
    expect(label.getAttribute('text-anchor')).toBe('middle');
  });

  it('manual inspection and following preserve the separate current stage through replay', () => {
    const saved = Object.freeze({ journeyActive: true, journeyState: 'evaporating', wcSignalInspectPlace: 'return' });
    for (const result of [rendered({ d: saved }), rendered({ d: saved, journeyReplayIsScrubbed: true, journeyReplaySegment: { state: 'infiltrating' } })]) {
      expect(result.inspectIndex).toBe(4);
      expectExactReadings(result);
      expect(result.container.querySelector('.wc-signal-reading-head span').textContent).toContain(result.focusKind.toLowerCase() + ' ' + result.labels[result.stageIndex]);
      const plot = result.container.querySelector('.wc-signal-plot');
      expect(Number(plot.querySelector('.wc-signal-stage-marker').getAttribute('x1'))).toBe(result.chartX(result.stageIndex));
    }
    const follow = rendered({ d: Object.freeze({ ...saved, wcSignalInspectPlace: 'follow' }), journeyReplayIsScrubbed: true, journeyReplaySegment: { state: 'infiltrating' } });
    expect(follow.inspectIndex).toBe(follow.stageIndex);
    expect(follow.container.querySelector('.wc-signal-reading-head span').textContent).toBe('Following replay focus');
    expectExactReadings(follow);
  });

  it.each([['live stage', false], ['scrubbed replay', true]])('the focus chip, description, selector, and reading name the %s context', (_name, scrubbed) => {
    for (const preference of ['follow', 'return']) {
      const state = Object.freeze({ journeyActive: true, journeyState: 'evaporating', wcSignalInspectPlace: preference });
      const result = rendered({ d: state, currentStageLabel: 'Evaporation', journeyReplayIsScrubbed: scrubbed, journeyReplaySegment: { state: 'infiltrating' } });
      expect(result.focusKind).toBe(scrubbed ? 'Replay focus' : 'Stage focus');
      expect(result.stageIndex).toBe(scrubbed ? 3 : 1);
      expect(result.inspectIndex).toBe(preference === 'follow' ? result.stageIndex : 4);
      expectExactReadings(result);
      const chip = result.container.querySelector('.wc-signal-focus-chip');
      expect(chip.textContent).toBe(scrubbed ? 'Replay focus · Land' : 'Focus · Evaporation');
      expect(chip.getAttribute('aria-label')).toBe(scrubbed ? 'Replay focus: Land' : 'Focused stage: Evaporation');
    }
  });

  it('source and public signal inspection implementations are identical', () => {
    expect(readFileSync(MIRROR_PATH, 'utf8')).toBe(source);
  });
});
