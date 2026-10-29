import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});
afterEach(() => vi.restoreAllMocks());

function live() {
  return {
    label: 'School', latitude: 40, longitude: -75, source: 'Open-Meteo', sourceKind: 'model',
    observedAt: '2026-10-29T12:00Z', retrievedAt: '2026-10-29T12:01Z', timezone: 'UTC', utcOffsetSeconds: 0,
    temperature: 12, humidity: 75, pressure: 1010, precipitation: 0, windSpeed: 18, windDir: 225,
    cloudCover: 60, weatherCode: 3, condition: 'Overcast', pressureType: 'surface', precipitationIntervalSeconds: 900,
  };
}

function savedWork() {
  const weather = live();
  return {
    liveWeather: weather,
    liveWeatherTimeline: [
      { ...weather, time: weather.observedAt, role: 'current', offsetHours: 0 },
      { ...weather, time: '2026-10-29T13:00Z', role: 'forecast', offsetHours: 1, temperature: 0, precipitationIntervalSeconds: 3600 },
      { ...weather, time: '2026-10-29T14:00Z', role: 'forecast', offsetHours: 2, temperature: null, precipitationIntervalSeconds: 3600 },
      { ...weather, time: '2026-10-29T16:00Z', role: 'forecast', offsetHours: 4, temperature: 7, precipitationIntervalSeconds: 3600 },
    ],
    liveTimelineMetric: 'temperature', liveTimelineWindow: 6,
  };
}

function view(data = {}, context = {}) {
  const root = document.createElement('div');
  root.innerHTML = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', ...data } }, context);
  return root;
}

describe('Live timeline explorer presentation and persistence', () => {
  it.each([{ gradeLevel: '2nd Grade' }, { gradeLevel: '8th Grade', isDark: true }, { gradeLevel: '11th Grade', isContrast: true }])('provides labeled metric/window controls, an accessible chart and a table with %o', (context) => {
    const root = view(savedWork(), context);
    const panel = root.querySelector('[data-weather-live-timeline-explorer]');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('Live Timeline Explorer');
    for (const labelText of ['Live timeline metric', 'Live timeline window', 'Inspect live timeline hour']) {
      const label = [...panel.querySelectorAll('label')].find((item) => item.textContent.includes(labelText));
      expect(label).toBeDefined();
      expect(panel.querySelector(`#${label.htmlFor}`)).not.toBeNull();
    }
    expect(panel.querySelector('svg[role="img"]')).not.toBeNull();
    expect(panel.querySelector('[data-weather-live-timeline-detail]')).not.toBeNull();
    const caption = panel.querySelector('table caption');
    expect(caption.textContent).toContain('Loaded model values for this window');
    expect(panel.textContent).toContain('View live timeline data table');
    expect(panel.textContent).not.toMatch(/NaN|undefined|Infinity/);
  });

  it('does not draw a continuous curve through missing values or a missing hour', () => {
    const root = view(savedWork());
    const panel = root.querySelector('[data-weather-live-timeline-explorer]');
    const rows = panel.querySelectorAll('table tbody tr');
    expect(rows).toHaveLength(4);
    const missingRow = [...rows].find((row) => row.textContent.includes('14:00'));
    expect(missingRow.textContent).toMatch(/missing|unavailable|not (?:recorded|available)|no valid measurement/i);
    expect(panel.querySelectorAll('[data-weather-live-timeline-segment]').length).toBeGreaterThan(0);
    expect(panel.textContent).toMatch(/gap|missing/i);
  });

  it('shows an explanatory empty state without fetching weather or making chart values', () => {
    const fetch = vi.spyOn(window, 'fetch').mockImplementation(() => { throw new Error('Rendering must not fetch weather.'); });
    const root = view();
    const panel = root.querySelector('[data-weather-live-timeline-explorer]');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toMatch(/load|connect/i);
    expect(panel.querySelectorAll('[data-weather-live-timeline-segment]')).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps explicit UTC times distinct from the provider timezone label', () => {
    const work = savedWork();
    work.liveWeather.timezone = 'EDT';
    const panel = view(work).querySelector('[data-weather-live-timeline-explorer]');
    expect(panel.textContent).not.toContain('12:00Z EDT');
    expect(panel.querySelector('time').dateTime).toBe('2026-10-29T12:00:00.000Z');
    expect(panel.textContent).toContain('blank time beyond them has no loaded value');
  });

  it('returns inspection to current model time when a new retrieval replaces the selected context', () => {
    const work = savedWork();
    const previous = kernel.buildLiveTimelineExploration(work.liveWeatherTimeline, work.liveWeather);
    work.liveTimelineSelectionKey = previous.contextKey;
    work.liveTimelineSelectedAt = Date.parse('2026-10-29T13:00Z');
    work.liveWeather = { ...work.liveWeather, retrievedAt: '2026-10-29T12:06Z' };
    const detail = view(work).querySelector('[data-weather-live-timeline-detail]');
    expect(detail.textContent).toContain('12:00Z');
    expect(detail.textContent).toContain('Current model estimate');
    expect(detail.textContent).not.toContain('13:00Z');
  });

  it('persists only supported metric and window controls through local save and import', () => {
    const input = {
      ...savedWork(), liveTimelineMetric: 'windSpeed', liveTimelineWindow: 12,
      liveTimelineSelectedAt: Date.parse('2026-10-29T13:00Z'), liveTimelineSelectionKey: 'School|40|-75|retrieval',
    };
    const restored = kernel.validateImmersiveLocalWorkspacePayload(kernel.immersiveLocalWorkspacePayload(input));
    expect(restored.liveTimelineMetric).toBe('windSpeed');
    expect(restored.liveTimelineWindow).toBe(12);
    expect(restored.liveTimelineSelectedAt).toBeUndefined();
    expect(restored.liveTimelineSelectionKey).toBeUndefined();
    expect(restored.liveWeather).toEqual(input.liveWeather);
    expect(restored.liveWeatherTimeline).toEqual(input.liveWeatherTimeline);
    const invalid = kernel.immersiveSessionSharePayload({ liveTimelineMetric: 'unknown', liveTimelineWindow: -1 }, { includeLocation: true });
    expect(invalid.weatherSystems.liveTimelineMetric).toBeUndefined();
    expect(invalid.weatherSystems.liveTimelineWindow).toBeUndefined();
  });

  it('shares safe chart preferences while redacting loaded times, coordinates and active selection', () => {
    const shared = kernel.immersiveSessionSharePayload({
      ...savedWork(), liveTimelineMetric: 'precipitation', liveTimelineWindow: 'all',
      liveTimelineSelectedAt: Date.parse('2026-10-29T13:00Z'), liveTimelineSelectionKey: 'School|40|-75|retrieval',
    }, { includeLocation: false });
    expect(shared.weatherSystems.liveTimelineMetric).toBe('precipitation');
    expect(shared.weatherSystems.liveTimelineWindow).toBe('all');
    for (const key of ['liveWeather', 'liveWeatherTimeline', 'liveTimelineSelectedAt', 'liveTimelineSelectionKey']) expect(shared.weatherSystems[key]).toBeUndefined();
    expect(JSON.stringify(shared)).not.toMatch(/School|2026-10-29|retrieval/);
  });
});
