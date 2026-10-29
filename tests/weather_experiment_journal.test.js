import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
});

function investigation(overrides = {}) {
  return {
    schema: 'weather-experiment-v1', id: 'experiment-1', createdAt: '2026-10-29T18:00:00.000Z',
    scenarioName: 'Approaching Cold Front', contextKey: 'saved-model-context',
    variable: 'humidity', baselineValue: 72, testValue: 90, hour: 6,
    prediction: 'increase', direction: 'increase', predictionCorrect: true,
    note: 'More starting water vapor increased the modeled precipitation potential.',
    modelState: { scenario: 'coldFront', simHour: 0, temp: 25, humidity: 72, pressure: 1008, windSpeed: 24, windDir: 220, frontSpeed: 36, instability: 68, terrain: 25 },
    control: { temperature: 23.3, humidity: 68, pressure: 1009.3, windSpeed: 39, cloudCover: 69, precipPotential: 64, precipType: 'rain' },
    test: { temperature: 23.3, humidity: 86, pressure: 1009.3, windSpeed: 39, cloudCover: 82, precipPotential: 96, precipType: 'rain' },
    deltas: { temperature: 0, humidity: 18, pressure: 0, windSpeed: 0, cloudCover: 13, precipPotential: 32 },
    timeline: [
      { hour: 0, control: { precipPotential: 35 }, test: { precipPotential: 68 }, deltas: { precipPotential: 33 } },
      { hour: 6, control: { precipPotential: 64 }, test: { precipPotential: 96 }, deltas: { precipPotential: 32 } },
    ],
    ...overrides,
  };
}

describe('Controlled weather experiment notebook', () => {
  it('keeps independent evidence snapshots when source results and setup change', () => {
    const source = investigation();
    const saved = window.WeatherSystemsKernel.normalizeExperimentHistory([source])[0];
    source.modelState.temp = -15;
    source.test.precipPotential = 0;
    source.deltas.precipPotential = -64;
    source.timeline[1].test.precipPotential = 0;
    expect(saved.modelState.temp).toBe(25);
    expect(saved.test.precipPotential).toBe(96);
    expect(saved.deltas.precipPotential).toBe(32);
    expect(saved.timeline[1].test.precipPotential).toBe(96);
    expect(saved.heldInputs.find((input) => input.id === 'temp').value).toBe(25);
    expect(saved.heldInputs.find((input) => input.id === 'humidity')).toBeUndefined();
  });

  it('retains the latest eight valid experiments without allowing duplicate identifiers', () => {
    const kernel = window.WeatherSystemsKernel;
    const history = Array.from({ length: 11 }, (_, i) => investigation({ id: `experiment-${i}` }));
    history.push(investigation({ id: 'experiment-8', note: 'Revised explanation' }));
    const saved = kernel.normalizeExperimentHistory(history);
    expect(saved.map((entry) => entry.id)).toEqual(['experiment-3', 'experiment-4', 'experiment-5', 'experiment-6', 'experiment-7', 'experiment-9', 'experiment-10', 'experiment-8']);
    expect(saved.at(-1).note).toBe('Revised explanation');
  });

  it('rejects unusable imported scientific measurements instead of turning missing values into zero', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(kernel.normalizeExperimentHistory([null, [], {},
      investigation({ schema: 'unrecognized' }), investigation({ variable: 'injected' }),
      investigation({ id: '  ' }), investigation({ baselineValue: null }),
      investigation({ testValue: true }), investigation({ testValue: ' ' }),
      investigation({ hour: Infinity }), investigation({ hour: 13 }),
      investigation({ test: { precipPotential: null } }), investigation({ test: { precipPotential: 101 } }),
      investigation({ direction: 'maybe' }),
    ])).toEqual([]);
    expect(kernel.normalizeExperimentHistory('text')).toEqual([]);
    const zero = kernel.normalizeExperimentHistory([investigation({ variable: 'windSpeed', baselineValue: 0, testValue: 0, hour: 0, direction: 'steady', control: { precipPotential: 0 }, test: { precipPotential: 0 } })])[0];
    expect(zero.control.precipPotential).toBe(0);
    expect(zero.hour).toBe(0);
  });

  it('allowlists input and output snapshots, limits prose, and keeps unknown measurements absent', () => {
    const saved = window.WeatherSystemsKernel.normalizeExperimentHistory([investigation({
      modelState: { scenario: 'coldFront', temp: 25, humidity: {}, injected: { unsafe: true }, windDir: 220 },
      control: { precipPotential: 35, humidity: null, callback: () => 1 },
      deltas: { precipPotential: 32, temperature: null, injected: 1000 },
      heldInputs: [{ id: 'humidity', label: 'Invented claim', value: 999 }],
      unit: 'injected', note: '\u0000' + 'x'.repeat(2500), arbitrary: { unsafe: true },
    })])[0];
    expect(saved.modelState).toEqual({ scenario: 'coldFront', temp: 25, windDir: 220 });
    expect(saved.control).toEqual({ precipPotential: 35 });
    expect(saved.deltas).toEqual({ precipPotential: 32 });
    expect(saved.heldInputs.map((input) => input.id)).toEqual(['temp', 'windDir']);
    expect(saved.unit).toBe('%');
    expect(saved.note).toHaveLength(2000);
    expect(saved.arbitrary).toBeUndefined();
  });

  it('sorts, deduplicates and bounds saved timeline points to the completed test horizon', () => {
    const point = (hour) => ({ hour, control: { precipPotential: 20 }, test: { precipPotential: 40 }, deltas: { precipPotential: 20 } });
    const saved = window.WeatherSystemsKernel.normalizeExperimentHistory([investigation({ timeline: [
      point(6), point(2), point(0), point(2), point(7), point(-1), point(null),
      { hour: 3, control: { precipPotential: 20 }, test: { precipPotential: null } },
    ] })])[0];
    expect(saved.timeline.map((row) => row.hour)).toEqual([0, 2, 6]);
    const many = window.WeatherSystemsKernel.normalizeExperimentHistory([investigation({ hour: 12, timeline: Array.from({ length: 97 }, (_, i) => point(i / 8)) })])[0];
    expect(many.timeline).toHaveLength(14);
    expect(many.timeline.at(-1).hour).toBe(12);
  });

  it('does not invent provenance or missing predictions for older snapshots', () => {
    const source = investigation();
    delete source.modelState;
    delete source.contextKey;
    delete source.scenarioName;
    delete source.timeline;
    delete source.prediction;
    const saved = window.WeatherSystemsKernel.normalizeExperimentHistory([source])[0];
    expect(saved.modelState).toBeUndefined();
    expect(saved.contextKey).toBeUndefined();
    expect(saved.heldInputs).toBeUndefined();
    expect(saved.predictionCorrect).toBeNull();
    const report = window.WeatherSystemsKernel.experimentJournalText([saved]);
    expect(report).toContain('Scenario: Not recorded');
    expect(report).toContain('Prediction: Not recorded');
    expect(report).toContain('not inferred from the current setup');
    expect(report).toContain('Time series: not recorded');
  });

  it('roundtrips through workspace/share JSON while excluding transient experiment results', () => {
    const kernel = window.WeatherSystemsKernel;
    const source = { scenario: 'fair', experimentHistory: [investigation()], experimentResult: investigation(), experimentSensitivityResult: { temporary: true } };
    const payload = kernel.immersiveLocalWorkspacePayload(source);
    const restored = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(payload)));
    expect(restored.experimentHistory).toEqual(kernel.normalizeExperimentHistory(source.experimentHistory));
    expect(restored.experimentResult).toBeUndefined();
    expect(restored.experimentSensitivityResult).toBeUndefined();
    expect(kernel.immersiveSessionSharePayload(source, { includeLocation: false }).weatherSystems.experimentHistory).toHaveLength(1);
  });

  it('exports the independent variable, held inputs, temporal reference and measured effects', () => {
    const report = window.WeatherSystemsKernel.experimentJournalText([investigation()]);
    expect(report).toContain('not a real-world probability');
    expect(report).toContain('Changed starting variable: Relative humidity from 72% to 90%');
    expect(report).toContain('Compared at absolute model time: T+6 h (both runs start at T+0)');
    expect(report).toContain('Starting conditions held fixed:');
    expect(report).toContain('Air temperature: 25°C');
    expect(report).toContain('Wind direction: 220°');
    expect(report).toContain('Precipitation potential: 64 /100 → 96 /100 (change +32 points)');
    expect(report).toContain('T+6 h | 64 | 96');
    expect(report).toContain('More starting water vapor increased');
    expect(report).not.toMatch(/undefined|NaN|null/);
  });

  it('exports an empty notebook cleanly and derives prediction feedback from saved outcomes', () => {
    const kernel = window.WeatherSystemsKernel;
    expect(kernel.experimentJournalText(null)).toContain('No controlled experiments have been saved yet.');
    const saved = kernel.normalizeExperimentHistory([investigation({ prediction: 'decrease', predictionCorrect: true })])[0];
    expect(saved.predictionCorrect).toBe(false);
    expect(kernel.experimentJournalText([saved])).toContain('Prediction not supported by this model run.');
  });
});
