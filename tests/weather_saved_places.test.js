import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});
afterEach(() => vi.restoreAllMocks());

function place(overrides = {}) {
  return {
    schema: 'weather-saved-place-v1', name: 'School', label: 'Portland, Maine',
    latitude: 43.6591, longitude: -70.2568,
    place: { name: 'Portland', admin1: 'Maine', country: 'United States', country_code: 'US', elevation: 18 },
    ...overrides,
  };
}

describe('Saved weather places', () => {
  it('validates sites, derives identities and retains six distinct manually saved places', () => {
    const valid = Array.from({ length: 8 }, (_, index) => place({ latitude: index, name: `Site ${index}` }));
    const saved = kernel.normalizeSavedLivePlaces([
      null, {}, place({ schema: 'unknown' }), place({ name: ' ' }), place({ latitude: null }),
      place({ latitude: 91 }), place({ longitude: false }), ...valid, place({ latitude: 0, name: 'Duplicate site' }),
    ]);
    expect(saved).toHaveLength(6);
    expect(saved.map((entry) => entry.name)).toEqual(['Site 0', 'Site 1', 'Site 2', 'Site 3', 'Site 4', 'Site 5']);
    expect(saved[0]).toMatchObject({ latitude: 0, id: '0|-70.2568' });
    const boundary = kernel.normalizeSavedLivePlaces([place({ longitude: 180 }), place({ longitude: -180, name: 'Alias' })]);
    expect(boundary).toHaveLength(1);
    expect(boundary[0]).toMatchObject({ longitude: -180, id: '43.6591|-180' });
  });

  it('clones bounded name and geography fields without retaining unrelated data or trusting imported IDs', () => {
    const input = place({ id: 'untrusted-id', name: 'x'.repeat(200), arbitrary: 'extra', place: { name: 'Portland', admin1: 'y'.repeat(200), elevation: 18, latitude: 99, private: 'extra' } });
    const [saved] = kernel.normalizeSavedLivePlaces([input]);
    input.place.name = 'Changed';
    expect(saved.id).toBe('43.6591|-70.2568');
    expect(saved.name).toHaveLength(80);
    expect(saved.place).toEqual({ name: 'Portland', admin1: 'y'.repeat(120), elevation: 18 });
    expect(saved.arbitrary).toBeUndefined();
  });

  it('bookmarks a legacy loaded site and only carries matching geography into future loads', () => {
    const live = { latitude: 43.6591, longitude: -70.2568, label: 'Portland, Maine', temperature: 12 };
    const geography = { ...live, locality: 'Portland', admin1: 'Maine', country: 'United States', countryCode: 'US', elevation: 18 };
    const saved = kernel.savedLivePlaceFromWeather(live, geography, ' School yard ');
    expect(saved).toMatchObject({ name: 'School yard', label: 'Portland, Maine', place: { name: 'Portland', admin1: 'Maine', country_code: 'US' } });
    expect(saved.temperature).toBeUndefined();
    const differentSite = kernel.savedLivePlaceFromWeather(live, { ...geography, latitude: 40 }, 'School');
    expect(differentSite.place).toBeUndefined();
    expect(kernel.savedLivePlaceFromWeather({ ...live, longitude: null }, geography, 'School')).toBeNull();
  });

  it('round-trips places with the workspace while redacting locations and transient undo state from shares', () => {
    const data = { savedLivePlaces: [place()], livePlaceUndo: place({ name: 'Removed site' }), livePlaceStatus: 'Saved School', livePlaceName: 'Private draft' };
    const expected = kernel.normalizeSavedLivePlaces(data.savedLivePlaces);
    const restored = kernel.validateImmersiveLocalWorkspacePayload(kernel.immersiveLocalWorkspacePayload(data));
    expect(restored.savedLivePlaces).toEqual(expected);
    expect(restored.livePlaceUndo).toBeUndefined();
    expect(restored.livePlaceStatus).toBeUndefined();
    expect(restored.livePlaceName).toBeUndefined();
    expect(kernel.immersiveSessionSharePayload(data, { includeLocation: true }).weatherSystems.savedLivePlaces).toEqual(expected);
    expect(JSON.stringify(kernel.immersiveSessionSharePayload(data, { includeLocation: false }))).not.toMatch(/School|Portland|43\.6591|Removed site|Private draft/);
    expect(kernel.normalizeSavedLivePlaces(undefined)).toEqual([]);
  });

  it('offers accessible saved-place controls in both connection panels without fetching on render', () => {
    const fetch = vi.spyOn(window, 'fetch').mockImplementation(() => { throw new Error('Rendering must not load weather.'); });
    for (const tab of ['forecast', 'immersive']) {
      const root = document.createElement('div');
      root.innerHTML = renderTool('weatherSystems', { weatherSystems: {
        tab, liveWeather: { label: 'Portland', latitude: 43.6591, longitude: -70.2568 },
        savedLivePlaces: [place(), place({ name: 'School', latitude: 40 })],
      } }, { isDark: true });
      const panel = root.querySelector('[data-weather-saved-places]');
      expect(panel).not.toBeNull();
      expect(panel.querySelector('input[name="placeName"]').defaultValue).toBe('School');
      const buttons = [...panel.querySelectorAll('button[aria-label="Load saved place School"]')];
      expect(buttons).toHaveLength(2);
      const descriptions = buttons.map((button) => root.querySelector(`#${button.getAttribute('aria-describedby')}`).textContent);
      expect(new Set(descriptions).size).toBe(2);
      expect(panel.textContent).toContain('Save loaded place');
      expect(root.querySelectorAll('[data-weather-saved-places]')).toHaveLength(1);
    }
    const cold = document.createElement('div');
    cold.innerHTML = renderTool('weatherSystems', { weatherSystems: { tab: 'forecast', savedLivePlaces: [place()] } });
    expect(cold.querySelector('#weather-live-review-disclosure').open).toBe(true);
    expect(cold.querySelector('button[aria-label="Load saved place School"]')).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
