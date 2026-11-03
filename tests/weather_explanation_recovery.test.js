import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let kernel;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.WEATHER_EXPLANATION_SOURCE || 'stem_lab/stem_tool_weathersystems.js', 'weatherSystems');
  kernel = window.WeatherSystemsKernel;
});

const oldLive = {
  label: 'Synthetic coastal school', latitude: 40, longitude: -75,
  observedAt: '2026-10-29T12:00:00Z', retrievedAt: '2026-10-29T12:01:00Z',
  source: 'Open-Meteo', sourceKind: 'model', utcOffsetSeconds: 0, timezone: 'UTC',
};
const newLive = { ...oldLive, label: 'Synthetic inland school', latitude: 41, retrievedAt: '2026-10-29T13:01:00Z', observedAt: '2026-10-29T13:00:00Z' };
const fields = {
  reasoning: 'Clouds thicken in the original retrieval, so I expect cooling.',
  attachment: 'Original retrieval evidence: two model hours differ by -2 °C.',
  hourA: Date.parse('2026-10-29T13:00:00Z'), hourB: Date.parse('2026-10-29T14:00:00Z'),
};

function draft(live = oldLive, patch = {}) {
  const result = kernel.changeLiveHourDraftForContext(null, live, { ...fields, ...patch });
  expect(result.ok).toBe(true);
  return result.draft;
}

describe('Retrieval-bound forecast explanation recovery', () => {
  it('stamps a new explanation with the actual source context and preserves its original input object', () => {
    const liveBefore = structuredClone(oldLive), input = { ...fields, injected: 'not allowed' };
    const inputBefore = structuredClone(input);
    const result = kernel.changeLiveHourDraftForContext(null, oldLive, input);
    expect(result).toMatchObject({ ok: true, changed: true });
    expect(result.draft).toMatchObject({
      schema: 'weather-live-hour-draft-v1', ...fields,
      sourceContext: {
        location: oldLive.label, latitude: 40, longitude: -75,
        retrievedAt: new Date(oldLive.retrievedAt).toISOString(), currentDataAt: new Date(oldLive.observedAt).toISOString(),
        source: 'Open-Meteo', sourceKind: 'model', utcOffsetSeconds: 0,
      },
    });
    expect(result.draft.contextKey).toBe(kernel.buildLiveTimelineExploration([], oldLive).contextKey);
    expect(result.draft.sourceContext.contextKey).toBe(result.draft.contextKey);
    expect(result.draft.injected).toBeUndefined();
    expect(oldLive).toEqual(liveBefore);
    expect(input).toEqual(inputBefore);
  });

  it('keeps prose, attached evidence and pins unchanged when a later retrieval tries to overwrite the occupied slot', () => {
    const original = draft(), before = structuredClone(original);
    for (const incoming of [{ reasoning: 'Different text' }, { attachment: 'New evidence' }, { hourA: fields.hourB }, { hourA: null, hourB: null }]) {
      const result = kernel.changeLiveHourDraftForContext(original, newLive, incoming);
      expect(result).toMatchObject({ ok: false, changed: false, code: 'recovery' });
      expect(result.draft).toEqual(before);
    }
    expect(original).toEqual(before);
  });

  it('updates the current retrieval normally while retaining other allowlisted draft fields', () => {
    const original = draft();
    const result = kernel.changeLiveHourDraftForContext(original, oldLive, { reasoning: 'Revised explanation.' });
    expect(result).toMatchObject({ ok: true, changed: true });
    expect(result.draft).toEqual({ ...original, reasoning: 'Revised explanation.' });
    expect(original.reasoning).toBe(fields.reasoning);
  });

  it('explicitly carries explanation text to the current retrieval while removing old evidence and pins', () => {
    const original = draft();
    const result = kernel.resolveLiveHourDraftForContext(original, newLive, original, 'use-text');
    expect(result).toMatchObject({ ok: true, changed: true, code: 'used-text' });
    expect(result.draft.reasoning).toBe(fields.reasoning);
    expect(result.draft.attachment).toBe('');
    expect(result.draft.hourA).toBeNull();
    expect(result.draft.hourB).toBeNull();
    expect(result.draft.contextKey).toBe(kernel.buildLiveTimelineExploration([], newLive).contextKey);
    expect(result.draft.sourceContext).toMatchObject({
      location: newLive.label, latitude: newLive.latitude, retrievedAt: new Date(newLive.retrievedAt).toISOString(),
    });
    expect(original).toEqual(draft());
  });

  it('requires the exact latest normalized draft for discard or transfer and preserves independently changed prose', () => {
    const inspected = draft();
    for (const patch of [
      { reasoning: 'A newer edit.' }, { attachment: 'A newer attachment.' }, { hourA: fields.hourA + 3600000 },
      { sourceContext: { ...inspected.sourceContext, location: 'Renamed source context' } },
    ]) {
      const latest = { ...inspected, ...patch };
      for (const action of ['discard', 'use-text']) {
        const result = kernel.resolveLiveHourDraftForContext(latest, newLive, inspected, action);
        expect(result).toMatchObject({ ok: false, changed: false, code: 'stale' });
        expect(result.draft).toEqual(kernel.normalizeLiveHourDraft(latest));
      }
    }
  });

  it('allows explicit discard without current weather and never fabricates provenance for an unknown legacy draft', () => {
    const legacy = { contextKey: 'legacy-retrieval-key', ...fields };
    const normalized = kernel.normalizeLiveHourDraft(legacy);
    expect(normalized).toEqual(legacy);
    expect(normalized.sourceContext).toBeUndefined();
    expect(normalized.schema).toBeUndefined();
    const blocked = kernel.changeLiveHourDraftForContext(legacy, newLive, { reasoning: 'Overwrite' });
    expect(blocked).toMatchObject({ ok: false, changed: false, code: 'recovery', draft: legacy });
    const discarded = kernel.resolveLiveHourDraftForContext(legacy, null, legacy, 'discard');
    expect(discarded).toMatchObject({ ok: true, changed: true, code: 'discarded', draft: null });
    const carried = kernel.resolveLiveHourDraftForContext(legacy, newLive, legacy, 'use-text');
    expect(carried).toMatchObject({ ok: true, changed: true, code: 'used-text' });
    expect(carried.draft.reasoning).toBe(fields.reasoning);
    expect(carried.draft.sourceContext.retrievedAt).toBe(new Date(newLive.retrievedAt).toISOString());
    expect(carried.draft.attachment).toBe('');
  });

  it('blocks transfer without usable weather or explanation prose while leaving evidence-only recovery available', () => {
    const original = draft();
    for (const live of [null, {}, { ...newLive, latitude: null }, { ...newLive, retrievedAt: '' }]) {
      const result = kernel.resolveLiveHourDraftForContext(original, live, original, 'use-text');
      expect(result.ok).toBe(false);
      expect(result.changed).toBe(false);
      expect(result.draft).toEqual(original);
    }
    const evidenceOnly = draft(oldLive, { reasoning: '' });
    const result = kernel.resolveLiveHourDraftForContext(evidenceOnly, newLive, evidenceOnly, 'use-text');
    expect(result.ok).toBe(false);
    expect(result.draft).toEqual(evidenceOnly);
    expect(kernel.resolveLiveHourDraftForContext(evidenceOnly, newLive, evidenceOnly, 'discard').ok).toBe(true);
  });

  it('bounds imported text and pins, rejects malformed versioned contexts and keeps harmless legacy text', () => {
    const legacy = kernel.normalizeLiveHourDraft({
      contextKey: 'legacy-key', reasoning: 'x'.repeat(1700), attachment: 'y'.repeat(1800),
      hourA: Infinity, hourB: 'not-a-time', secret: 'private unallowlisted field',
    });
    expect(legacy.reasoning).toHaveLength(1500);
    expect(legacy.attachment).toHaveLength(1500);
    expect(legacy.hourA).toBeNull();
    expect(legacy.hourB).toBeNull();
    expect(legacy.secret).toBeUndefined();
    for (const raw of [null, [], {}, { schema: 'unknown', ...fields },
      { ...draft(), sourceContext: undefined },
      { ...draft(), contextKey: 'contradicts-source' },
      { ...draft(), sourceContext: { ...draft().sourceContext, latitude: null } },
    ]) expect(kernel.normalizeLiveHourDraft(raw)).toBeNull();
  });

  it('downloads the unfinished explanation with source details without changing its contents', () => {
    const original = draft(), before = structuredClone(original);
    const text = kernel.liveHourDraftText(original);
    expect(text).toContain(fields.reasoning);
    expect(text).toContain(fields.attachment);
    expect(text).toContain(oldLive.label);
    expect(text).toContain(new Date(oldLive.retrievedAt).toISOString());
    expect(text).toContain(new Date(fields.hourA).toISOString());
    expect(original).toEqual(before);
    const legacy = { contextKey: 'unknown-old-context', ...fields };
    const legacyText = kernel.liveHourDraftText(legacy);
    expect(legacyText).toContain(fields.reasoning);
    expect(legacyText).toMatch(/unknown|not recorded|unavailable/i);
    expect(legacyText).not.toContain(oldLive.label);
  });

  it('round-trips current and legacy draft recovery through device/download payloads while excluding every share', () => {
    for (const original of [draft(), { contextKey: 'legacy-key', ...fields }]) {
      const data = { liveWeather: newLive, liveHourDraft: original };
      const download = kernel.immersiveSessionDownloadPayload(data);
      const local = kernel.immersiveLocalWorkspacePayload(data);
      expect(download.weatherSystems.liveHourDraft).toEqual(original);
      expect(local.weatherSystems.liveHourDraft).toEqual(original);
      expect(kernel.validateImmersiveSessionPayload(JSON.parse(JSON.stringify(download))).liveHourDraft).toEqual(original);
      expect(kernel.validateImmersiveLocalWorkspacePayload(JSON.parse(JSON.stringify(local))).liveHourDraft).toEqual(original);
      for (const includeLocation of [true, false]) {
        const shared = kernel.immersiveSessionSharePayload(data, { includeLocation });
        expect(shared.weatherSystems.liveHourDraft).toBeUndefined();
        expect(JSON.stringify(shared)).not.toContain(fields.reasoning);
        expect(JSON.stringify(shared)).not.toContain(fields.attachment);
      }
    }
  });
});
