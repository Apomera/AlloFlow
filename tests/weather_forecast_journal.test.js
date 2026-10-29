import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
});

function attempt(overrides = {}) {
  return {
    schema: 'weather-forecast-attempt-v1', attempt: 1, score: 75,
    precip: 'rain', timing: '0-3', hazard: 'flood', action: 'avoidTravel', confidence: 80,
    evidenceCount: 3, evidenceIds: ['pressure', 'front', 'radar'],
    reasoning: 'Persistent modeled rain and rising moisture support my claim.',
    modelHour: 4, contextKey: '["coldFront",4,25,72]', scenarioName: 'Approaching Cold Front',
    issuedAt: '2026-10-29T18:00:00.000Z',
    modelState: { scenario: 'coldFront', simHour: 4, temp: 25, humidity: 72, pressure: 1008, windSpeed: 24, windDir: 220, frontSpeed: 36, instability: 68, terrain: 25 },
    outcome: { precip: 'rain', timing: '0-3', hazard: 'none', targetHour: 10 },
    window: { startHour: 4, targetHour: 10, endHour: 16, leadHours: 6, availableHours: 12, hasFuture: true, truncated: false },
    breakdown: [{ id: 'hazard', label: 'Primary hazard', earned: 0, possible: 25, matched: false, selected: 'flood', expected: 'none', explanation: 'The model did not sustain enough heavy rain for its flooding signal.' }],
    ...overrides,
  };
}

describe('Weather forecast journal snapshots', () => {
  it('preserves saved claims and outcome without recalculating them from a new model', () => {
    const kernel = window.WeatherSystemsKernel;
    const original = attempt();
    const snapshot = kernel.normalizeForecastHistory([original])[0];
    original.modelState.temp = -15;
    original.outcome.precip = 'snow';
    original.window.targetHour = 20;
    original.breakdown[0].explanation = 'Changed later';
    expect(snapshot.modelState.temp).toBe(25);
    expect(snapshot.outcome.precip).toBe('rain');
    expect(snapshot.window.targetHour).toBe(10);
    expect(snapshot.breakdown[0].explanation).toContain('did not sustain');
  });

  it('retains only the latest five valid attempts while rejecting malformed imports', () => {
    const kernel = window.WeatherSystemsKernel;
    const history = [null, [], {}, { attempt: null, score: 50 }, { attempt: 2, score: NaN }, { attempt: 3, score: {} }, ...Array.from({ length: 8 }, (_, index) => attempt({ attempt: index + 1 }))];
    expect(kernel.normalizeForecastHistory(history).map((entry) => entry.attempt)).toEqual([4, 5, 6, 7, 8]);
    expect(kernel.normalizeForecastHistory({})).toEqual([]);
    expect(kernel.normalizeForecastHistory([{ attempt: 1, score: 0 }])[0].score).toBe(0);
  });

  it('deduplicates known evidence and strips arbitrary imported objects', () => {
    const kernel = window.WeatherSystemsKernel;
    const entry = kernel.normalizeForecastHistory([attempt({
      evidenceCount: 999, evidenceIds: ['front', 'front', 'pressure', 'unknown', { id: 'radar' }],
      modelState: { scenario: 'coldFront', temp: 24, humidity: {}, injected: { content: 'ignore' }, callback: () => 42 },
      outcome: { precip: { bad: true }, timing: 'anything', hazard: 'ice', targetHour: null, arbitrary: true },
      reasoning: 'x'.repeat(15000), arbitrary: { content: 'ignore' },
    })])[0];
    expect(entry.evidenceIds).toEqual(['pressure', 'front']);
    expect(entry.evidenceCount).toBe(2);
    expect(entry.modelState).toEqual({ scenario: 'coldFront', temp: 24 });
    expect(entry.outcome).toEqual({ precip: '', timing: '', hazard: 'ice', targetHour: null });
    expect(entry.reasoning).toHaveLength(12000);
    expect(entry.arbitrary).toBeUndefined();
  });

  it('keeps absent legacy provenance absent rather than inventing a matching context', () => {
    const kernel = window.WeatherSystemsKernel;
    const entry = kernel.normalizeForecastHistory([{ attempt: 1, score: 90, precip: 'snow', evidenceCount: 3 }])[0];
    expect(entry.contextKey).toBeUndefined();
    expect(entry.modelState).toBeUndefined();
    expect(entry.outcome).toBeUndefined();
    expect(entry.window).toBeUndefined();
    expect(entry.modelHour).toBeNull();
    const report = kernel.forecastJournalText([entry]);
    expect(report).toContain('Scenario: Not recorded in this older attempt');
    expect(report).toContain('Model outcome: not saved with this older attempt; not recomputed');
    expect(report).toContain('3 sources; identities not saved');
    expect(report).not.toContain('0%');
  });

  it('normalizes a shortened valid window and rejects impossible ordering', () => {
    const kernel = window.WeatherSystemsKernel;
    const entry = kernel.normalizeForecastHistory([attempt({ window: { startHour: 22, targetHour: 24, endHour: 24, leadHours: 6, availableHours: 12, truncated: false } })])[0];
    expect(entry.window).toEqual({ startHour: 22, targetHour: 24, endHour: 24, leadHours: 2, horizonHours: 2, availableHours: 2, hasFuture: true, truncated: true });
    expect(kernel.forecastJournalText([entry])).toContain('Conditions valid at: T+24 h (2 h ahead)');
    expect(kernel.forecastJournalText([entry])).toContain('shortened by the model endpoint');
    expect(kernel.normalizeForecastHistory([attempt({ window: { startHour: 12, targetHour: 6, endHour: 24 } })])[0].window).toBeUndefined();
  });

  it('bounds rubric rows without allowing duplicate or unrecognized criteria', () => {
    const kernel = window.WeatherSystemsKernel;
    const entry = kernel.normalizeForecastHistory([attempt({ breakdown: [
      { id: 'evidence', label: 'Evidence', earned: 999, possible: 10, matched: true, selected: 3, expected: 3, explanation: 'Three sources.' },
      { id: 'evidence', earned: 10, possible: 10 }, { id: 'unknown', earned: 50, possible: 50 },
      { id: 'precip', earned: null, possible: 40 },
    ] })])[0];
    expect(entry.breakdown).toHaveLength(1);
    expect(entry.breakdown[0]).toMatchObject({ earned: 10, possible: 10, selected: 3, expected: 3 });
  });

  it('survives device persistence and JSON import with the original issued snapshot', () => {
    const kernel = window.WeatherSystemsKernel;
    const source = { scenario: 'fair', simHour: 18, forecastHistory: [attempt()], forecastResult: { score: 99 } };
    const saved = kernel.immersiveLocalWorkspacePayload(source);
    const restored = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(saved)));
    expect(restored.scenario).toBe('fair');
    expect(restored.forecastHistory[0]).toMatchObject({ scenarioName: 'Approaching Cold Front', modelHour: 4, outcome: { precip: 'rain' }, modelState: { temp: 25 } });
    expect(restored.forecastResult).toBeUndefined();
    expect(kernel.immersiveSessionSharePayload(source, { includeLocation: false }).weatherSystems.forecastHistory).toHaveLength(1);
  });

  it('exports clear units, source labels, claims versus outcomes, feedback and reasoning', () => {
    const report = window.WeatherSystemsKernel.forecastJournalText([attempt()]);
    expect(report).toContain('Source: simplified teaching model');
    expect(report).toContain('Forecast #1 — 75/100');
    expect(report).toContain('Issued at model hour: T+4 h');
    expect(report).toContain('Conditions valid at: T+10 h (6 h ahead)');
    expect(report).toContain('Claim: Rain | start 0–3 hours | Flooding');
    expect(report).toContain('Saved model outcome: Rain | start 0–3 hours | No major hazard');
    expect(report).toContain('Pressure tendency; Radar reflectivity pattern; Front position and motion');
    expect(report).toContain('Starting temperature: 25 °C');
    expect(report).toContain('Front speed: 36 km/h');
    expect(report).toContain('Primary hazard: 0/25');
    expect(report).toContain('Persistent modeled rain and rising moisture support my claim.');
    expect(report).toContain('Compare score changes only when the saved model setup and issue hour match.');
  });

  it('exports a useful empty journal without an invalid numeric placeholder', () => {
    const report = window.WeatherSystemsKernel.forecastJournalText(null);
    expect(report).toContain('No verified forecasts have been saved yet.');
    expect(report).not.toMatch(/NaN|undefined|null/);
  });

  it('preserves the timing horizon independently from remaining model hours', () => {
    const kernel = window.WeatherSystemsKernel;
    const forecastWindow = kernel.expectedForecast(kernel.resolvedState({ simHour: 4 })).window;
    expect(kernel.normalizeForecastHistory([attempt({ window: forecastWindow })])[0].window).toEqual(forecastWindow);
    const report = kernel.forecastJournalText([attempt({ timing: 'after12', window: { startHour: 23, targetHour: 24, endHour: 24 } })]);
    expect(report).toContain('No precipitation within the available window');
    expect(report).not.toContain('available 12-hour window');
  });

  it('keeps target weather separate from earlier precipitation in claim frames and broadcasts', () => {
    const html = renderTool('weatherSystems', { weatherSystems: {
      tab: 'forecast', simHour: 23, predictionPrecip: 'none', predictionTiming: '0-3', predictionHazard: 'none', readinessAction: 'normal'
    } }, { gradeLevel: '8th Grade' });
    expect(html).toContain('next 1 hour?');
    expect(html).toContain('At T+24 h, I predict no precipitation. First precipitation: now through 3 hours after issue.');
    expect(html).toContain('At T+24 h, the regional forecast is no precipitation. First precipitation: now through 3 hours after issue.');
    expect(html).not.toContain('no precipitation will begin');
    expect(html).not.toContain('1 hours');
  });
});
