import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});
afterEach(() => vi.restoreAllMocks());

function loaded() {
  return {
    label: 'Portland, Maine', latitude: 43.6591, longitude: -70.2568,
    source: 'Open-Meteo', sourceKind: 'model', timezone: 'UTC', utcOffsetSeconds: 0,
    observedAt: '2026-10-29T12:00:00Z', retrievedAt: '2026-10-29T12:01:00Z',
    temperature: 12, humidity: 75, pressure: 1010, windSpeed: 18, windDir: 225,
    precipitation: 0, cloudCover: 60, weatherCode: 3, condition: 'Overcast',
    pressureType: 'surface', precipitationIntervalSeconds: 900,
  };
}

function savedWork() {
  const live = loaded();
  const checkpoint = kernel.createLiveForecastCheckpoint({
    ...live, validAt: '2026-10-29T14:00:00Z', timelineRole: 'forecast',
    precipitationIntervalSeconds: 3600,
  }, '2026-10-29T12:02:00Z');
  return {
    liveWeather: live,
    liveWeatherTimeline: [{ ...live, time: live.observedAt, role: 'current', offsetHours: 0 }],
    liveWeatherTimelineIndex: 0, liveForecastCheckpoints: [checkpoint],
    liveLocationQuery: 'Portland, Maine',
  };
}

function view(data = {}, context = {}) {
  const root = document.createElement('div');
  root.innerHTML = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', ...data } }, context);
  return root;
}

function buttons(root, name) {
  return [...root.querySelectorAll('button')].filter((element) => element.textContent.trim().replace(/^📍\s*/, '') === name);
}

function connection(root, mode = 'forecast') {
  return root.querySelector(`[data-weather-live-connection="${mode}"]`);
}

describe('Live weather connection presentation and persistence', () => {
  it.each([
    { gradeLevel: '2nd Grade' },
    { gradeLevel: '8th Grade', isDark: true },
    { gradeLevel: '11th Grade', isContrast: true },
  ])('offers a direct location connection from Forecast Mission with %o', (context) => {
    const panel = connection(view({}, context));
    expect(panel).not.toBeNull();
    expect(panel.getAttribute('aria-label')).toBe('Live weather connection');
    const label = [...panel.querySelectorAll('label')].find((element) => element.textContent === 'Quick location search');
    expect(label).toBeDefined();
    const input = panel.querySelector(`#${label.htmlFor}`);
    expect(input.type).toBe('search');
    expect(input.disabled).toBe(false);
    expect(buttons(panel, 'Search')).toHaveLength(1);
    expect(buttons(panel, 'Use my location')).toHaveLength(1);
    expect(buttons(panel, 'Cancel weather request')).toHaveLength(0);
    expect(panel.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('keeps a keyboard-operable cancellation action and polite loading status visible', () => {
    const panel = connection(view({
      ...savedWork(), liveWeatherLoading: true,
      liveWeatherStatus: 'Searching for Portland...',
    }));
    const cancel = buttons(panel, 'Cancel weather request');
    expect(cancel).toHaveLength(1);
    expect(cancel[0].type).toBe('button');
    expect(cancel[0].disabled).toBe(false);
    const status = [...panel.querySelectorAll('[role="status"]')].find((element) => element.textContent.includes('Searching for Portland'));
    expect(status).toBeDefined();
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(panel.querySelector('input[type="search"]').disabled).toBe(false);
  });

  it('shows a failed connection without discarding the saved location or forecast snapshot', () => {
    const work = savedWork();
    const original = JSON.stringify(work);
    const root = view({
      ...work, liveWeatherLoading: false,
      liveWeatherError: 'Weather service unavailable. Please retry.',
      liveWeatherStatus: 'Showing the last saved weather while the new request is unavailable.',
    });
    const panel = connection(root);
    expect(panel.querySelector('[role="alert"]').textContent).toContain('Weather service unavailable');
    expect(root.textContent).toContain('Portland, Maine');
    expect(root.querySelectorAll('[data-weather-checkpoint-status]')).toHaveLength(1);
    expect(buttons(panel, 'Search')[0].disabled).toBe(false);
    expect(buttons(panel, 'Cancel weather request')).toHaveLength(0);
    expect(JSON.stringify(work)).toBe(original);
  });

  it('offers the same connection controls in Immersive 3D without duplicate element IDs', () => {
    const root = view({ tab: 'immersive', ...savedWork(), immersiveDataSource: 'live' }, { gradeLevel: '10th Grade' });
    const panel = connection(root, 'immersive');
    expect(panel).not.toBeNull();
    expect(root.querySelectorAll('[data-weather-live-connection]')).toHaveLength(1);
    expect(buttons(panel, 'Search')).toHaveLength(1);
    expect(buttons(panel, 'Refresh loaded weather')).toHaveLength(1);
    expect(buttons(panel, 'Refresh loaded weather')[0].disabled).toBe(false);
    const ids = [...root.querySelectorAll('[id]')].map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('renders saved weather without contacting the provider or asking for location', () => {
    const fetch = vi.spyOn(window, 'fetch').mockImplementation(() => { throw new Error('Rendering must not fetch weather.'); });
    view(savedWork());
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps weather and checkpoints while excluding transient request state from local round trips', () => {
    const work = savedWork();
    const input = {
      ...work, liveWeatherLoading: true, liveWeatherError: 'Temporary network failure',
      liveWeatherStatus: 'Loading weather model data...', liveWeatherTimelinePlaying: true,
      liveWeatherRequest: { query: 'temporary request', id: 7 },
      liveWeatherRetry: { query: 'temporary request' }, liveReviewStatus: 'Temporary status',
    };
    const payload = kernel.immersiveLocalWorkspacePayload(input);
    const restored = kernel.validateImmersiveLocalWorkspacePayload(payload);
    for (const key of ['liveWeatherLoading', 'liveWeatherError', 'liveWeatherStatus', 'liveWeatherTimelinePlaying', 'liveWeatherRequest', 'liveWeatherRetry', 'liveReviewStatus']) {
      expect(payload.weatherSystems[key]).toBeUndefined();
      expect(restored[key]).toBeUndefined();
    }
    expect(restored.liveWeather).toEqual(work.liveWeather);
    expect(restored.liveWeatherTimeline).toEqual(work.liveWeatherTimeline);
    expect(restored.liveForecastCheckpoints).toEqual(work.liveForecastCheckpoints.map((entry) => kernel.normalizeLiveForecastCheckpoints([entry])[0]));
  });

  it('does not leak a pending location request or weather coordinates into a redacted share', () => {
    const share = kernel.immersiveSessionSharePayload({
      ...savedWork(), liveWeatherLoading: true, liveWeatherError: 'Failure in Portland',
      liveWeatherStatus: 'Searching Portland', liveWeatherRequest: { latitude: 43.6591, longitude: -70.2568 },
      liveWeatherRetry: { query: 'Portland' },
    }, { includeLocation: false });
    const json = JSON.stringify(share);
    expect(json).not.toMatch(/Portland|43\.6591|70\.2568|liveWeatherLoading|liveWeatherRequest|liveWeatherRetry/);
    expect(share.weatherSystems.liveForecastCheckpoints).toBeUndefined();
    expect(share.weatherSystems.liveWeather).toBeUndefined();
  });
});
