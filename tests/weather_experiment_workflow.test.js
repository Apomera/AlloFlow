import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function completed(overrides = {}, variable = 'humidity', value = 90, hour = 6) {
  const result = kernel.runExperiment(kernel.resolvedState({ scenario: 'coldFront', ...overrides }), variable, value, hour);
  return { ...result, id: 'experiment-workflow-1', createdAt: '2026-10-29T18:00:00.000Z',
    scenarioName: 'Approaching Cold Front', prediction: result.direction, predictionCorrect: true };
}

function view(data = {}, gradeLevel = '8th Grade') {
  const container = document.createElement('div');
  container.innerHTML = renderTool('weatherSystems', { weatherSystems: {
    tab: 'experiment', scenario: 'coldFront', experimentVariable: 'humidity', experimentValue: 90,
    experimentHour: 6, experimentPrediction: 'increase', ...data,
  } }, { gradeLevel });
  return container;
}

function runButton(container) {
  return [...container.querySelectorAll('button')].find((button) => button.textContent.includes('Run controlled test'));
}

describe('Controlled experiment workflow provenance and setup', () => {
  it('hides a result from changed starting conditions while keeping its notebook evidence', () => {
    const result = completed();
    const saved = { ...result, schema: 'weather-experiment-v1', note: 'Original moisture experiment.' };
    const ui = view({ pressure: 1020, experimentResult: result, experimentHistory: [saved] });
    expect(ui.querySelector('[data-weather-experiment-context="stale"]')).not.toBeNull();
    expect(ui.querySelector('[data-weather-experiment-result="true"]')).toBeNull();
    expect(ui.querySelector('[data-weather-experiment-timeline]')).toBeNull();
    expect(ui.querySelector('[data-weather-experiment-notebook]').textContent).toContain('Original moisture experiment.');
    expect(ui.querySelector('[data-weather-experiment-saved-context]').getAttribute('data-weather-experiment-saved-context')).toBe('earlier');
    expect(saved.modelState.pressure).toBe(1008);
  });

  it('keeps completed experiments current when only the scene clock changes', () => {
    const result = completed();
    const saved = { ...result, schema: 'weather-experiment-v1', note: 'An initial-condition comparison.' };
    const ui = view({ simHour: 24, experimentResult: result, experimentHistory: [saved] });
    expect(ui.querySelector('[data-weather-experiment-context]')).toBeNull();
    expect(ui.querySelector('[data-weather-experiment-result="true"]')).not.toBeNull();
    expect(ui.querySelector('[data-weather-experiment-timeline]')).not.toBeNull();
    expect(ui.querySelector('[data-weather-experiment-saved-context]').getAttribute('data-weather-experiment-saved-context')).toBe('current');
    expect(ui.textContent).toContain('The map is currently at T+24 h');
    expect(ui.querySelector('#weather-experiment-review-hour').max).toBe('6');
  });

  it('uses the same safe comparison hour for a malformed saved control and completed result', () => {
    const result = completed();
    for (const hour of [NaN, Infinity, -3, 23, 'not an hour', null]) {
      const ui = view({ experimentHour: hour, experimentResult: result });
      expect(ui.querySelector('#weather-experiment-hour').value).toBe('6');
      expect(ui.querySelector('[data-weather-experiment-context]')).toBeNull();
      expect(ui.querySelector('[data-weather-experiment-result="true"]')).not.toBeNull();
    }
  });

  it('requires a fresh result after the comparison hour changes', () => {
    const ui = view({ experimentHour: 12, experimentResult: completed() });
    expect(ui.querySelector('#weather-experiment-hour').value).toBe('12');
    expect(ui.querySelector('[data-weather-experiment-context="stale"]')).not.toBeNull();
    expect(ui.querySelector('[data-weather-experiment-result="true"]')).toBeNull();
  });

  it('replaces a variable unavailable in the selected grade band with a valid moisture test', () => {
    const result = completed({}, 'pressure', 1030);
    const ui = view({ experimentVariable: 'pressure', experimentValue: 1030, experimentResult: result }, '2nd Grade');
    const selector = ui.querySelector('#weather-experiment-variable');
    expect([...selector.options].map((option) => option.value)).toEqual(['temp', 'humidity']);
    expect(selector.value).toBe('humidity');
    expect(ui.querySelector('#weather-experiment-value').value).toBe('88');
    expect(ui.querySelector('[data-weather-experiment-context="stale"]')).not.toBeNull();
    expect(ui.querySelector('[data-weather-experiment-result="true"]')).toBeNull();
  });

  it('disables a trial with an unchanged input or without a prediction', () => {
    const noChange = view({ experimentValue: 72 });
    expect(runButton(noChange).disabled).toBe(true);
    expect(noChange.textContent).toContain('Choose a test value different from the baseline');
    expect(runButton(view({ experimentPrediction: '' })).disabled).toBe(true);
    expect(runButton(view()).disabled).toBe(false);
  });

  it('offers a lower test value when the baseline is already at the upper bound', () => {
    const ui = view({ humidity: 100, experimentValue: undefined });
    expect(ui.querySelector('#weather-experiment-value').value).toBe('84');
    expect(runButton(ui).disabled).toBe(false);
  });

  it('requires one of the offered prediction choices after malformed state is restored', () => {
    for (const prediction of ['maybe', 'INCREASE', true, 1, {}]) {
      const ui = view({ experimentPrediction: prediction });
      expect(runButton(ui).disabled).toBe(true);
      expect(ui.querySelector('fieldset button[aria-pressed="true"]')).toBeNull();
    }
  });

  it('compares normalized baseline values in the no-change guard', () => {
    const beyondRange = view({ humidity: 500, experimentValue: 100 });
    expect(runButton(beyondRange).disabled).toBe(true);
    expect(beyondRange.querySelector('[aria-label="Controlled experiment setup"]').textContent).toContain('Baseline100%');
    const missingMeasurement = view({ humidity: Infinity, experimentValue: 72 });
    expect(runButton(missingMeasurement).disabled).toBe(true);
    expect(missingMeasurement.querySelector('[aria-label="Controlled experiment setup"]').textContent).toContain('Baseline72%');
  });

  it('rejects a sensitivity sweep from a different source while keeping the verified trial', () => {
    const result = completed();
    const foreignSweep = kernel.experimentSensitivity(kernel.resolvedState({ pressure: 1020 }), 'humidity', 6);
    const ui = view({ experimentResult: result, experimentSensitivityResult: foreignSweep });
    expect(ui.querySelector('[data-weather-experiment-result="true"]')).not.toBeNull();
    expect(ui.querySelector('[data-weather-experiment-sensitivity]')).toBeNull();
    const ownSweep = kernel.experimentSensitivity(result.modelState, result.variable, result.hour);
    expect(view({ experimentResult: result, experimentSensitivityResult: ownSweep }).querySelector('[data-weather-experiment-sensitivity]')).not.toBeNull();
  });

  it('uses a legacy result’s own variable when describing its saved measurements', () => {
    const result = completed({}, 'temp', 10);
    delete result.contextKey;
    const ui = view({ experimentResult: result });
    expect(ui.querySelector('[data-weather-experiment-result="true"]').textContent).toContain('Decreasing air temperature from 25°C to 10°C');
    expect(ui.querySelector('[data-weather-experiment-result="true"]').textContent).not.toContain('Decreasing relative humidity from 25');
  });

  it('retains saved endpoint values and meaningful differences when an imported record omits deltas', () => {
    const record = { ...completed(), schema: 'weather-experiment-v1', deltas: {},
      control: { precipPotential: 64 }, test: { precipPotential: 96 } };
    const ui = view({ experimentHistory: [record] });
    const notebook = ui.querySelector('[data-weather-experiment-notebook]');
    expect(notebook.textContent).toContain('from 64% to 96%');
    expect(notebook.textContent).toContain('+32 percentage points');
    expect(notebook.textContent).not.toContain('0 percentage points');
  });
});
