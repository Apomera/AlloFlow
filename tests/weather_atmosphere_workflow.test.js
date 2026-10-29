import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
});

function record(overrides = {}) {
  const kernel = window.WeatherSystemsKernel;
  return {
    schema: 'weather-atmosphere-investigation-v1', id: 'investigation-1',
    contextKey: kernel.atmosphereContextKey(kernel.resolvedState({ scenario: 'coldFront' }), 'central'),
    stationName: 'Central School', scenarioName: 'Cold Front Passage', hour: 0,
    summary: 'Teaching-model investigation. Cloud base fell from 1.2 to 0.4 km.',
    prediction: 'Lower cloud base', outcome: 'Lower cloud base', note: 'A smaller dew-point gap needs less lifting.',
    ...overrides,
  };
}

function dom(state, context = {}) {
  const root = document.createElement('div');
  root.innerHTML = renderTool('weatherSystems', { weatherSystems: { tab: 'atmosphere', ...state } }, context);
  return root;
}

describe('Weather atmosphere investigation workflow', () => {
  it.each([
    ['Kindergarten', false, false], ['7th Grade', false, false],
    ['11th Grade', true, false], ['11th Grade', true, true],
  ])('provides profile data in %s, dark=%s, contrast=%s', (gradeLevel, isDark, isContrast) => {
    const root = dom({}, { gradeLevel, isDark, isContrast });
    expect(root.querySelector('[data-weather-atmosphere-lab]')).not.toBeNull();
    expect(root.querySelector('[data-weather-atmosphere-chart]').getAttribute('aria-label')).toContain('temperature profile');
    expect(root.querySelectorAll('table tbody tr').length).toBeGreaterThanOrEqual(25);
    expect(root.querySelector('[data-weather-atmosphere-lab]').textContent).toContain('no live sounding data');
    expect(root.querySelector('[data-weather-atmosphere-chart]').outerHTML).not.toMatch(/NaN|Infinity/);
  });

  it('retains the whole shared model-hour range when entering from the map', () => {
    const root = dom({ simHour: 24, selectedStation: 'ridge' });
    const control = root.querySelector('#weather-atmosphere-hour');
    expect(control.max).toBe('24');
    expect(control.value).toBe('24');
    expect(root.querySelector('[data-weather-atmosphere-baseline]').textContent).toContain('T+24 h');
  });

  it('marks a notebook comparison stale when time, station, or a model variable changes', () => {
    const item = record();
    expect(dom({ atmosphereInvestigations: [item] }).querySelector('[data-weather-atmosphere-context]').textContent).toBe('Current model setup');
    for (const patch of [{ simHour: 6 }, { selectedStation: 'coast' }, { humidity: 25 }, { frontSpeed: 0 }]) {
      const root = dom({ ...patch, atmosphereInvestigations: [item] });
      expect(root.querySelector('[data-weather-atmosphere-context]').textContent).toBe('Earlier model setup');
      expect(root.querySelector('[data-weather-atmosphere-evidence]').textContent).toContain('Cloud base fell from 1.2 to 0.4 km.');
    }
  });

  it('keeps notebook provenance and notes through device save and session import', () => {
    const kernel = window.WeatherSystemsKernel;
    const source = { scenario: 'coldFront', frontSpeed: 21, instability: 48, selectedStation: 'coast', atmosphereVariable: 'lapseRate', atmosphereLapseRate: 10, atmosphereAltitude: 3, atmosphereNote: 'Compare at the same height.', atmosphereInvestigations: [record()], atmosphereRun: { key: 'transient' } };
    const saved = kernel.immersiveLocalWorkspacePayload(source);
    const restored = kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(saved)));
    expect(restored).toMatchObject({ frontSpeed: 21, instability: 48, selectedStation: 'coast', atmosphereLapseRate: 10, atmosphereAltitude: 3, atmosphereInvestigations: [record()] });
    expect(restored.atmosphereRun).toBeUndefined();
  });

  it('bounds imported notebooks and ignores malformed records without rendering injected markup', () => {
    const kernel = window.WeatherSystemsKernel;
    const notebook = [null, {}, ...Array.from({ length: 12 }, (_, index) => record({ id: 'record-' + index }))];
    const normalized = kernel.atmosphereInvestigationList(notebook);
    expect(normalized).toHaveLength(8);
    expect(normalized[0].id).toBe('record-4');
    const root = dom({ tab: 'forecast', atmosphereInvestigations: [record({ note: '<img src=x onerror=alert(1)>', summary: '<script>boom</script>' })] });
    const evidence = root.querySelector('[data-weather-atmosphere-evidence]');
    expect(evidence.querySelector('script,img')).toBeNull();
    expect(evidence.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('renders a subfreezing column honestly and resets stale result presentation', () => {
    const root = dom({ scenario: 'winterStorm', temp: -15, atmosphereRun: { key: 'different-model', supported: true } });
    expect(root.textContent).toContain('Entire column below 0°C');
    expect(root.querySelector('[data-weather-atmosphere-result]')).toBeNull();
    expect(root.querySelector('[data-weather-atmosphere-chart]').getAttribute('data-weather-atmosphere-chart')).toBe('baseline');
    expect(root.textContent).toContain('The model setup has changed');
  });
});
