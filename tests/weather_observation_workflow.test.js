import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function reading(hour = 0, stationId = 'central', patch = {}) {
  return kernel.weatherObservationSnapshot({ scenario: 'coldFront', simHour: hour, ...patch }, stationId);
}

function view(data = {}, context = {}) {
  const root = document.createElement('div');
  root.innerHTML = renderTool('weatherSystems', { weatherSystems: { tab: 'observations', scenario: 'coldFront', ...data } }, context);
  return root;
}

function button(root, text) {
  return [...root.querySelectorAll('button')].find((element) => element.textContent === text);
}

function panel(root) {
  return root.querySelector('[data-weather-observation-comparison]');
}

describe('Observation Desk workflow', () => {
  it.each([
    ['2nd Grade', false], ['8th Grade', false], ['11th Grade', true],
  ])('makes station controls, source labels, and a local network available in %s, dark=%s', (gradeLevel, isDark) => {
    const ui = view({ simHour: 7 }, { gradeLevel, isDark });
    expect(ui.querySelector('[data-weather-observation-desk]')).not.toBeNull();
    expect(ui.querySelector('[data-weather-observation-network]').textContent).toContain('T+7');
    expect(ui.querySelectorAll('[data-weather-observation-network] tbody tr')).toHaveLength(kernel.stations.length);
    expect(ui.querySelector('[data-weather-observation-log]').textContent).toContain('not live weather observations');
    expect(button(ui, 'Log station network')).toBeDefined();
    expect(button(ui, 'Download observations CSV').disabled).toBe(true);
    expect(panel(ui)).toBeNull();
  });

  it('renders full saved time comparisons with rates, including secondary measurements', () => {
    const first = reading(0), second = reading(6);
    const ui = view({ observationLog: [first, second] });
    const comparison = panel(ui);
    expect(comparison.getAttribute('data-weather-observation-comparison')).toBe('temporal');
    expect(comparison.querySelectorAll('tbody tr')).toHaveLength(8);
    for (const label of ['Dew point', 'Relative humidity', 'Sea-level pressure', 'Wind direction (from)', 'Cloud cover', 'Precipitation potential', 'Average change/hour']) {
      expect(comparison.textContent).toContain(label);
    }
    expect(comparison.textContent).toContain('percentage points');
    expect(comparison.textContent).toContain('interval averages');
    expect(button(comparison, 'Use comparison in forecast explanation').disabled).toBe(false);
  });

  it('keeps saved values and a fair saved comparison intact after the active setup changes', () => {
    const first = { ...reading(0), temperature: 11.3 };
    const second = { ...reading(6), temperature: 14.7 };
    const original = JSON.stringify([first, second]);
    const ui = view({ scenario: 'winterStorm', temp: -10, humidity: 20, simHour: 24, observationLog: [first, second] });
    expect(panel(ui).getAttribute('data-weather-observation-comparison')).toBe('temporal');
    expect(panel(ui).textContent).toContain('active scenario has not changed their measurements');
    expect(panel(ui).textContent).toContain('11.3°C → 14.7°C');
    expect(ui.querySelector('[data-weather-observation-log]').textContent).toContain('Earlier starting conditions');
    expect(JSON.stringify([first, second])).toBe(original);
  });

  it('does not mislabel missing legacy provenance as a temporal trend or missing numbers as zero', () => {
    const legacy = { id: 'legacy', station: 'Central School', hour: 0, temperature: 12 };
    const ui = view({ observationLog: [legacy, reading(6)] });
    const comparison = panel(ui);
    expect(comparison.getAttribute('data-weather-observation-comparison')).toBe('unknown');
    expect(comparison.textContent).toContain('Source setup is incomplete');
    expect(comparison.textContent).not.toContain('Average change/hour');
    expect(comparison.querySelectorAll('tbody tr')).toHaveLength(1);
    const log = ui.querySelector('[data-weather-observation-log]');
    expect(log.textContent).toContain('Not recorded');
    expect(log.textContent).toContain('Setup not recorded');
    expect(log.textContent).not.toMatch(/undefined|NaN|Infinity/);
    expect(comparison.textContent).not.toMatch(/undefined|NaN|Infinity/);
  });

  it('does not certify a partial imported setup from its matching fingerprint and distinguishes similar reading labels', () => {
    const partial = { ...reading(0), modelState: { scenario: 'coldFront', simHour: 0 } };
    const valid = reading(0, 'central', { humidity: 30 });
    const ui = view({ observationLog: [partial, valid] });
    const rows = ui.querySelectorAll('[data-weather-observation-log] tbody tr');
    expect(rows[0].lastElementChild.textContent).toBe('Setup not recorded or incomplete');
    expect(rows[0].textContent).not.toContain('Current starting conditions');
    expect(panel(ui).getAttribute('data-weather-observation-comparison')).toBe('unknown');
    expect(panel(ui).textContent).toContain('earlier or unrecorded setup');
    const options = [...ui.querySelector('#weather-observation-from').options];
    expect(options.map((option) => option.value)).toEqual([partial.id, valid.id]);
    expect(new Set(options.map((option) => option.textContent)).size).toBe(2);
    expect(options[0].textContent).toContain('1.');
    expect(options[1].textContent).toContain('2.');
  });

  it('shows station contrasts without time-rate columns and warns about confounded selections', () => {
    const first = reading(3, 'central');
    const spatial = panel(view({ observationLog: [first, reading(3, 'coast')] }));
    expect(spatial.getAttribute('data-weather-observation-comparison')).toBe('spatial');
    expect(spatial.textContent).not.toContain('Average change/hour');
    expect(spatial.textContent).toContain('not changes through time');
    const mixed = panel(view({ observationLog: [first, reading(6, 'coast')] }));
    expect(mixed.getAttribute('data-weather-observation-comparison')).toBe('mixed');
    expect(mixed.textContent).toContain('Both station location and model hour changed');
    expect(mixed.textContent).not.toContain('Average change/hour');
  });

  it('does not offer a data comparison or forecast handoff for the same saved reading twice', () => {
    const first = reading(0), second = reading(6);
    const ui = view({ observationLog: [first, second], observationCompareFrom: first.id, observationCompareTo: first.id });
    const comparison = panel(ui);
    expect(comparison.getAttribute('data-weather-observation-comparison')).toBe('same');
    expect(comparison.textContent).toContain('Choose two different readings');
    expect(comparison.querySelector('table')).toBeNull();
    expect(button(comparison, 'Use comparison in forecast explanation')).toBeUndefined();
    expect(button(comparison, 'Download comparison')).toBeUndefined();
  });

  it('preserves endpoint ordering and offers to put the earlier hour first', () => {
    const first = reading(0), second = reading(6);
    const ui = view({ observationLog: [first, second], observationCompareFrom: second.id, observationCompareTo: first.id });
    expect(ui.querySelector('#weather-observation-from').value).toBe(second.id);
    expect(ui.querySelector('#weather-observation-to').value).toBe(first.id);
    expect(button(panel(ui), 'Put earlier hour first')).toBeDefined();
  });

  it('explains opposite wind directions without inventing an hourly turning rate', () => {
    const first = { ...reading(0), windDir: 0 }, second = { ...reading(6), windDir: 180 };
    const comparison = panel(view({ observationLog: [first, second] }));
    const row = [...comparison.querySelectorAll('tbody tr')].find((element) => element.textContent.includes('Wind direction'));
    expect(row.textContent).toContain('180°; turning direction indeterminate');
    expect(row.lastElementChild.textContent).toBe('—');
  });

  it('recognizes evidence already handed off with its explanation and keeps the export available', () => {
    const first = reading(0), second = reading(6), note = 'Pressure and moisture changed together in this interval.';
    const reasoning = kernel.observationComparisonText(kernel.compareWeatherObservations(first, second), note);
    const ui = view({ observationLog: [first, second], observationNote: note, reasoning });
    expect(ui.querySelector('#weather-observation-note').value).toBe(note);
    expect(button(panel(ui), 'Comparison added to explanation').disabled).toBe(true);
    expect(button(panel(ui), 'Download comparison').disabled).toBe(false);
  });

  it('includes the full explanation accepted by the form when preparing a report or handoff', () => {
    const first = reading(0), second = reading(6);
    const note = 'x'.repeat(1480) + ' END OF EXPLANATION';
    const ui = view({ observationLog: [first, second], observationNote: note });
    expect(ui.querySelector('#weather-observation-note').maxLength).toBe(1500);
    const report = kernel.observationComparisonText(kernel.compareWeatherObservations(first, second), note);
    expect(report).toContain(note);
    expect(report).toContain(first.scenarioName);
    expect(report).toContain('1008');
  });
});
