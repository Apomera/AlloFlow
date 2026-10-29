import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

function source(patch = {}) { return kernel.resolvedState({ scenario: 'coldFront', ...patch }); }
function view(data = {}, context = {}) {
  const root = document.createElement('div');
  root.innerHTML = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', scenario: 'coldFront', ...data } }, { gradeLevel: '8th Grade', ...context });
  return root;
}
function panel(root) { return root.querySelector('[data-weather-ensemble]'); }
function button(root, name) { return [...root.querySelectorAll('button')].find((item) => item.textContent === name); }

describe('Weather uncertainty exploration workflow', () => {
  it.each([false, true])('renders member inspection, range data, and model limitations with dark=%s', (isDark) => {
    const root = view({}, { isDark });
    const ensemble = panel(root);
    expect(ensemble.querySelector('[data-weather-ensemble-member]')).not.toBeNull();
    expect(ensemble.querySelector('[aria-label="All ensemble members"] tbody').children).toHaveLength(9);
    expect(ensemble.querySelector('[aria-label="Member starting conditions"] tbody').children).toHaveLength(8);
    expect(ensemble.textContent).toContain('not a confidence interval');
    expect(ensemble.textContent).toContain('not an operational weather probability');
    expect(ensemble.textContent).toContain('standard spread of 1×');
    expect(ensemble.outerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('presents ties without inventing a single winning precipitation category', () => {
    const ensemble = panel(view({ scenario: 'winterStorm', temp: -3.5, humidity: 90, ensembleScale: 1.5 }));
    expect(ensemble.textContent).toContain('4/9');
    expect(ensemble.textContent).toContain('in each tied largest group');
    expect(ensemble.textContent).toContain('There is no single most common outcome.');
    expect(ensemble.textContent).not.toContain('agree on Snow');
    const emphasized = [...ensemble.querySelector('[data-weather-ensemble-bars]').querySelectorAll('span.font-black')].map((item) => item.textContent);
    expect(emphasized).toContain('Snow');
    expect(emphasized).toContain('Wintry mix');
  });

  it('labels zero spread as one repeated setup and shows identical member measurements', () => {
    const root = view({ ensembleScale: 0, ensembleMember: 1 });
    const ensemble = panel(root);
    expect(ensemble.textContent).toContain('1 distinct starting setup across 9 members');
    expect(ensemble.textContent).toContain('Identical output does not establish certainty');
    for (const row of ensemble.querySelectorAll('[aria-label="Member starting conditions"] tbody tr')) {
      expect(row.children[1].textContent).toBe(row.children[2].textContent);
      expect(row.children[3].textContent).toMatch(/^0/);
    }
  });

  it('disables future exploration and reports the model limit at T+24', () => {
    const root = view({ simHour: 24 });
    const ensemble = panel(root);
    expect(ensemble.textContent).toContain('no future forecast window');
    expect(ensemble.querySelector('[data-weather-ensemble-timeline]')).toBeNull();
    expect(ensemble.querySelector('[data-weather-ensemble-member]')).toBeNull();
    expect(ensemble.querySelector('[data-weather-ensemble-bars]')).toBeNull();
    expect(root.querySelector('#weather-ensemble-scale').disabled).toBe(true);
    expect(root.querySelector('#weather-ensemble-note').disabled).toBe(true);
    for (const name of ['Download ensemble report', 'Download ensemble CSV', 'Use uncertainty in forecast explanation']) expect(button(ensemble, name).disabled).toBe(true);
  });

  it('reviews a sampled hour without shifting the forecast issue or target', () => {
    const data = { simHour: 6, ensembleReviewHour: 10, ensembleMember: 2 };
    const before = JSON.stringify(data);
    const root = view(data);
    const ensemble = panel(root);
    expect(root.querySelector('#weather-ensemble-hour').value).toBe('10');
    expect(ensemble.querySelector('[data-weather-ensemble-reading]').textContent).toContain('T+10 h');
    expect(ensemble.textContent).toContain('Issued T+6 h · forecast target T+12 h');
    const rows = ensemble.querySelectorAll('[aria-label="Ensemble timeline table"] tbody tr');
    expect(rows[0].children[0].textContent).toBe('T+6');
    expect(rows[rows.length - 1].children[0].textContent).toBe('T+18');
    expect(root.querySelector('[aria-label="Forecast issue hour"]').value).toBe('6');
    expect(JSON.stringify(data)).toBe(before);
  });

  it('allows the final fractional-window sample to be represented by the native range control', () => {
    const root = view({ simHour: 22.5, ensembleReviewHour: 24 });
    const slider = root.querySelector('#weather-ensemble-hour');
    expect(slider.min).toBe('22.5');
    expect(slider.max).toBe('24');
    expect(slider.step).toBe('any');
    expect(slider.value).toBe('24');
    expect(slider.getAttribute('aria-valuetext')).toContain('24');
    expect(panel(root).textContent).toContain('only 1.5 hours remain until the target');
  });

  it('shows the selected member’s actual bounded inputs and appropriate percentage-point differences', () => {
    const data = { humidity: 100, pressure: 1040, ensembleScale: 2, ensembleMember: 4, ensembleMetric: 'precipPotential' };
    const root = view(data);
    const ensemble = panel(root);
    const expected = kernel.ensembleForecast(source(data), { spreadScale: 2 }).members[3];
    const rows = [...ensemble.querySelectorAll('[aria-label="Member starting conditions"] tbody tr')];
    const humidity = rows.find((row) => row.children[0].textContent === 'Relative humidity');
    expect(humidity.children[2].textContent).toBe(expected.modelState.humidity + '%');
    expect(humidity.children[3].textContent).toBe('0 percentage points');
    const temperature = rows.find((row) => row.children[0].textContent === 'Air temperature');
    expect(temperature.children[2].textContent).toBe(expected.modelState.temp + '°C');
    expect(ensemble.querySelector('[data-weather-ensemble-reading]').textContent).toContain('%');
    expect(ensemble.textContent).toContain('Precipitation potential is a model index, not a chance of rain');
  });

  it('falls back to the unchanged control and a known measurement for invalid saved inspector settings', () => {
    const root = view({ ensembleMember: 999, ensembleMetric: 'unrecognized' });
    expect(root.querySelector('#weather-ensemble-member').value).toBe('5');
    expect(root.querySelector('#weather-ensemble-metric').value).toBe('temperature');
    expect(root.querySelector('[data-weather-ensemble-reading]').textContent).toMatch(/Control [\d.-]+°C; member 5 [\d.-]+°C/);
  });

  it('keeps an explanation only with its original model, issue hour, and spread setting', () => {
    const ensemble = kernel.ensembleForecast(source());
    const saved = { ensembleNote: 'My original source-specific explanation.', ensembleNoteContext: ensemble.contextKey };
    expect(view(saved).querySelector('#weather-ensemble-note').value).toBe(saved.ensembleNote);
    for (const patch of [{ humidity: 65 }, { simHour: 3 }, { ensembleScale: 0.5 }]) {
      const root = view({ ...saved, ...patch });
      expect(root.querySelector('#weather-ensemble-note').value).toBe('');
      expect(panel(root).textContent).toContain('previous explanation belonged to a different setup');
    }
  });

  it('keeps verified confidence tied to the standard ensemble when the what-if spread changes', () => {
    const model = source();
    const truth = kernel.expectedForecast(model);
    const forecastResult = kernel.scoreForecast(model, { precip: 'storms', timing: truth.timing, hazard: truth.hazard, confidence: 80, evidence: ['front', 'pressure', 'radar'] });
    const root = view({ ensembleScale: 0, forecastResult });
    const comparison = root.querySelector('[data-weather-confidence-comparison]');
    expect(panel(root).textContent).toContain('1 distinct starting setup');
    expect(comparison.textContent).toContain('3/9 standard-spread members');
    expect(comparison.textContent).toContain('80% vs 33%');
    expect(comparison.textContent).toContain('not statistical calibration');
    expect(comparison.textContent).not.toMatch(/Overconfident|Underconfident|Well calibrated/);
  });

  it('does not reinterpret legacy confidence comparisons as support for a recorded precipitation choice', () => {
    const model = source();
    const forecastResult = kernel.scoreForecast(model, { precip: 'snow', confidence: 80 });
    forecastResult.calibration = { selected: 80, agreement: 67, status: 'well', label: 'Well calibrated' };
    forecastResult.notes.push('Confidence was reasonably calibrated to ensemble agreement.');
    const root = view({ forecastResult });
    expect(root.querySelector('[data-weather-confidence-comparison]')).toBeNull();
    expect(root.textContent).toContain('did not record support for your selected precipitation');
    expect(root.textContent).not.toContain('Well calibrated');
    expect(root.textContent).not.toContain('Confidence was reasonably calibrated');
  });

  it('matches handoff deduplication to the whole ensemble evidence rather than the currently reviewed hour or member', () => {
    const model = source({ simHour: 6 });
    const ensemble = kernel.ensembleForecast(model, { spreadScale: 1.5 });
    const note = 'The min–max envelope belongs to these nine chosen model inputs.';
    const report = kernel.uncertaintyExplorationText(ensemble, note);
    const evidence = kernel.uncertaintyEvidenceText(ensemble, note);
    const root = view({ simHour: 6, ensembleScale: 1.5, ensembleMember: 8, ensembleReviewHour: 9, ensembleNote: note, ensembleNoteContext: ensemble.contextKey, reasoning: evidence });
    expect(button(panel(root), 'Uncertainty added to explanation').disabled).toBe(true);
    expect(root.querySelector('#weather-ensemble-note').value).toBe(note);
    expect(panel(root).textContent).toContain('Issued T+6 h · forecast target T+12 h');
    expect(report).toContain('Issue hour: T+6 h');
    expect(report).toContain('Target hour: T+12 h');
  });
});
