import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.WEATHER_TIMELINE_CONTROLS_SOURCE || 'stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

const instant = (hour) => `2026-10-29T${String(hour).padStart(2, '0')}:00:00.000Z`;
function weather(patch = {}) {
  return {
    label: 'Synthetic coastal school', latitude: 40, longitude: -75, observedAt: instant(12), retrievedAt: '2026-10-29T12:01:00.000Z',
    source: 'Open-Meteo', sourceKind: 'model', timezone: 'UTC', utcOffsetSeconds: 0,
    temperature: 18, pressure: 1007, humidity: 70, windSpeed: 12, windDir: 220, precipitation: 0,
    ...patch,
  };
}
function points() {
  return [11, 12, 13, 14].map((hour) => ({
    time: instant(hour), role: hour < 12 ? 'earlier' : hour === 12 ? 'current' : 'forecast',
    offsetHours: hour - 12, utcOffsetSeconds: 0, source: 'Open-Meteo', sourceKind: 'model',
    retrievedAt: '2026-10-29T12:01:00.000Z', temperature: 18 + (hour - 12),
    humidity: 70, pressure: 1007, windSpeed: 12, windDir: 220, precipitation: 0,
  }));
}
function data(patch = {}) {
  return { tab: 'immersive', immersiveDataSource: 'live', liveWeather: weather(), liveWeatherTimeline: points(), liveWeatherTimelineIndex: 2, ...patch };
}
const snapshot = (state) => kernel.liveWeatherTimelineSnapshot(state);
function action(state, next) {
  return kernel.liveWeatherTimelineAction(state, { expectedContextKey: snapshot(state).contextKey, ...next });
}

describe('Retrieval-bound immersive live timeline controls', () => {
  it('pins the current model hour as a real baseline while a forecast hour is selected', () => {
    const original = data(), before = structuredClone(original);
    const result = action(original, { type: 'compare', validTimestamp: Date.parse(instant(12)) });
    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.patch.immersiveTimelineComparison).toEqual({
      schema: 'weather-live-timeline-comparison-v1', contextKey: snapshot(original).contextKey, validTimestamp: Date.parse(instant(12)),
    });
    const selected = snapshot({ ...original, ...result.patch });
    expect(selected.selectedTimestamp).toBe(Date.parse(instant(13)));
    expect(selected.comparisonTimestamp).toBe(Date.parse(instant(12)));
    expect(selected.comparisonIndex).toBe(1);
    expect(original).toEqual(before);
  });

  it('keeps a baseline tied to its absolute valid instant when timeline indices move', () => {
    const original = data();
    const pinned = { ...original, ...action(original, { type: 'compare', validTimestamp: Date.parse(instant(12)) }).patch };
    const shifted = { ...pinned, liveWeatherTimeline: [points()[1], points()[0], points()[2], points()[3]] };
    expect(snapshot(shifted).comparisonTimestamp).toBe(Date.parse(instant(12)));
    expect(snapshot(shifted).comparisonIndex).toBe(0);
    const noLongerLoaded = { ...pinned, liveWeatherTimeline: [points()[0], points()[2], points()[3]] };
    expect(snapshot(noLongerLoaded).comparisonIndex).toBe('');
    expect(snapshot(noLongerLoaded).comparisonTimestamp).toBeNull();
  });

  it('ignores an unbound legacy baseline while retaining legacy selected-index viewing including zero', () => {
    for (const liveWeatherTimelineIndex of [0, 2]) {
      const result = snapshot(data({ liveWeatherTimelineIndex, immersiveTimelineCompareIndex: 1 }));
      expect(result.selectedIndex).toBe(liveWeatherTimelineIndex);
      expect(result.comparisonIndex).toBe('');
      expect(result.comparisonTimestamp).toBeNull();
    }
  });

  it('does not retarget an old baseline to another retrieval or location with the same-length timeline', () => {
    const original = data();
    const pinned = { ...original, ...action(original, { type: 'compare', validTimestamp: Date.parse(instant(12)) }).patch };
    for (const liveWeather of [weather({ retrievedAt: '2026-10-29T12:02:00.000Z' }), weather({ latitude: 41 }), weather({ longitude: -74 })]) {
      const current = snapshot({ ...pinned, liveWeather });
      expect(current.timeline).toHaveLength(4);
      expect(current.comparisonIndex).toBe('');
      expect(current.comparisonTimestamp).toBeNull();
    }
  });

  it('applies queued steps and toggles against latest state instead of reusing the rendered index or playing flag', () => {
    const original = data({ liveWeatherTimelineIndex: 0 });
    const first = action(original, { type: 'step', delta: 1 });
    const second = action({ ...original, ...first.patch }, { type: 'step', delta: 1 });
    expect(first.patch.liveWeatherTimelineIndex).toBe(1);
    expect(second.patch.liveWeatherTimelineIndex).toBe(2);
    expect(second.patch.liveWeatherTimelinePlaying).toBe(false);
    const play = action(original, { type: 'toggle-play', reducedMotion: false });
    const pause = action({ ...original, ...play.patch }, { type: 'toggle-play', reducedMotion: false });
    expect(play.patch.liveWeatherTimelinePlaying).toBe(true);
    expect(pause.patch.liveWeatherTimelinePlaying).toBe(false);
    expect(original.liveWeatherTimelineIndex).toBe(0);
  });

  it('rejects a stale rendered context for selection, stepping, comparison or toggling', () => {
    const old = data(), key = snapshot(old).contextKey;
    const latest = data({ liveWeather: weather({ retrievedAt: '2026-10-29T12:03:00.000Z' }) });
    for (const request of [{ type: 'select', validTimestamp: Date.parse(instant(14)) }, { type: 'step', delta: 1 },
      { type: 'compare', validTimestamp: Date.parse(instant(12)) }, { type: 'current' }, { type: 'toggle-play', reducedMotion: false }]) {
      const result = kernel.liveWeatherTimelineAction(latest, { ...request, expectedContextKey: key });
      expect(result).toMatchObject({ ok: false, changed: false, code: 'stale', patch: {} });
    }
  });

  it('requires a unique valid absolute timestamp for selection and comparison', () => {
    const original = data();
    for (const type of ['select', 'compare']) {
      for (const validTimestamp of [NaN, Infinity, '', undefined, Date.parse(instant(15))]) {
        expect(action(original, { type, validTimestamp })).toMatchObject({ ok: false, changed: false, code: 'invalid', patch: {} });
      }
      const ambiguous = data({ liveWeatherTimeline: points().concat([points()[1]]) });
      expect(action(ambiguous, { type, validTimestamp: Date.parse(instant(12)) })).toMatchObject({ ok: false, code: 'invalid', patch: {} });
    }
    const pinned = { ...original, ...action(original, { type: 'compare', validTimestamp: Date.parse(instant(12)) }).patch };
    const selectedAsBaseline = action(pinned, { type: 'compare', validTimestamp: Date.parse(instant(13)) });
    expect(selectedAsBaseline.ok).toBe(true);
    expect(selectedAsBaseline.patch.immersiveTimelineComparison).toBeNull();
  });

  it('accepts a playback tick only for the captured retrieval, selected instant and exact timeline signature', () => {
    const original = data({ liveWeatherTimelinePlaying: true }), captured = snapshot(original);
    const tick = { type: 'tick', expectedContextKey: captured.contextKey, expectedSelectedTimestamp: captured.selectedTimestamp, expectedTimelineKey: captured.timelineKey };
    const advanced = kernel.liveWeatherTimelineAction(original, tick);
    expect(advanced.ok).toBe(true);
    expect(advanced.patch.liveWeatherTimelineIndex).toBe(3);
    const mutations = [
      { ...original, liveWeatherTimelineIndex: 1 },
      { ...original, liveWeatherTimelinePlaying: false },
      { ...original, liveWeather: weather({ retrievedAt: '2026-10-29T12:02:00.000Z' }) },
      { ...original, liveWeatherTimeline: [points()[1], points()[0], points()[2], points()[3]] },
      { ...original, liveWeatherTimeline: points().map((point, index) => index === 2 ? { ...point, temperature: 99 } : point) },
    ];
    for (const latest of mutations) {
      const result = kernel.liveWeatherTimelineAction(latest, tick);
      expect(result.ok).toBe(false);
      expect(result.changed).toBe(false);
      expect(result.patch).toEqual({});
    }
    for (const missing of [{ ...tick, expectedTimelineKey: undefined }, { ...tick, expectedSelectedTimestamp: undefined }]) {
      expect(kernel.liveWeatherTimelineAction(original, missing).ok).toBe(false);
    }
  });

  it('rejects ambiguous absolute instants reached by step or playback as well as direct selection', () => {
    const timeline = points().concat([points()[2]]);
    const beforeAmbiguous = data({ liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 1 });
    expect(action(beforeAmbiguous, { type: 'step', delta: 1 }))
      .toMatchObject({ ok: false, changed: false, code: 'invalid', patch: {} });
    const selectedAmbiguous = data({ liveWeatherTimeline: timeline, liveWeatherTimelineIndex: 2 });
    expect(action(selectedAmbiguous, { type: 'toggle-play', reducedMotion: false }))
      .toMatchObject({ ok: false, changed: false, code: 'invalid', patch: {} });
  });

  it('rejects explicitly foreign hourly provenance for selection, baseline and captured playback', () => {
    const original = data({ liveWeatherTimelineIndex: 1, liveWeatherTimelinePlaying: true });
    const captured = snapshot(original);
    for (const foreign of [
      { source: 'Other source' }, { sourceKind: 'observation' },
      { retrievedAt: '2026-10-29T12:02:00.000Z' }, { latitude: 41 }, { longitude: -74 },
    ]) {
      const timeline = points().map((point, index) => index === 2 ? { ...point, ...foreign } : point);
      const latest = { ...original, liveWeatherTimeline: timeline };
      expect(snapshot(latest).timestamps[2]).toBeNull();
      expect(action(latest, { type: 'select', validTimestamp: Date.parse(instant(13)) }))
        .toMatchObject({ ok: false, changed: false, code: 'invalid', patch: {} });
      expect(action(latest, { type: 'compare', validTimestamp: Date.parse(instant(13)) }))
        .toMatchObject({ ok: false, changed: false, code: 'invalid', patch: {} });
      const pinned = { ...latest, immersiveTimelineComparison: {
        schema: 'weather-live-timeline-comparison-v1', contextKey: captured.contextKey, validTimestamp: Date.parse(instant(13)),
      } };
      expect(snapshot(pinned).comparisonIndex).toBe('');
      expect(snapshot(pinned).comparisonTimestamp).toBeNull();
      expect(kernel.liveWeatherTimelineAction(latest, { type: 'tick', expectedContextKey: captured.contextKey,
        expectedSelectedTimestamp: captured.selectedTimestamp, expectedTimelineKey: captured.timelineKey }))
        .toMatchObject({ ok: false, changed: false, code: 'stale', patch: {} });
    }
    const compatibleLegacyPoints = points().map(({ retrievedAt, source, sourceKind, ...point }) => point);
    expect(action({ ...original, liveWeatherTimeline: compatibleLegacyPoints }, { type: 'select', validTimestamp: Date.parse(instant(13)) }).ok).toBe(true);
  });

  it('prevents reduced-motion autoplay while allowing explicit pause and manual step controls', () => {
    const original = data();
    expect(action(original, { type: 'toggle-play', reducedMotion: true }).ok).toBe(false);
    const paused = action({ ...original, liveWeatherTimelinePlaying: true }, { type: 'toggle-play', reducedMotion: true });
    expect(paused.ok).toBe(true);
    expect(paused.patch.liveWeatherTimelinePlaying).toBe(false);
    expect(action(original, { type: 'step', delta: 1 }).patch.liveWeatherTimelineIndex).toBe(3);
  });

  it('resets playback and comparison on lifecycle boundaries without inventing a legacy baseline', () => {
    const original = data({ liveWeatherTimelinePlaying: true, immersiveTimelineCompareIndex: 1 });
    const pinned = { ...original, ...action(original, { type: 'compare', validTimestamp: Date.parse(instant(12)) }).patch };
    const reset = kernel.resetLiveWeatherTimelineSnapshot(pinned);
    expect(reset).toEqual({ liveWeatherTimelineIndex: 2, liveWeatherTimelinePlaying: false, immersiveTimelineComparison: null, immersiveTimelineCompareIndex: '' });
    expect(kernel.resetLiveWeatherTimelineSnapshot(pinned, null).liveWeatherTimelineIndex).toBe(1);
    expect(kernel.resetLiveWeatherTimelineSnapshot(pinned, Date.parse(instant(14))).liveWeatherTimelineIndex).toBe(3);
    expect(kernel.resetLiveWeatherTimelineSnapshot(pinned, Date.parse(instant(19))).liveWeatherTimelineIndex).toBe(1);
    expect(kernel.resetLiveWeatherTimelineSnapshot(data({ liveWeatherTimelineIndex: 0 })).liveWeatherTimelineIndex).toBe(0);
  });
});
