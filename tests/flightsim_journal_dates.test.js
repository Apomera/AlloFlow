import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let api;
beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
});
afterEach(() => { delete window.__RR_TEST_EXPORTS__; });
const record = endedAt => ({ aircraftId: 'cessna172', attemptId: 'original-flight', endedAt,
  flightTime: 60, reflection: 'Keep the original explanation.' });

describe('Sky School journal calendar integrity', () => {
  it('keeps impossible or ambiguous timestamps unknown while preserving recorded observations', () => {
    for (const value of ['2026-02-31T12:00:00Z', '2025-02-29T12:00:00Z', '2026-04-31T12:00:00Z',
      '2026-10-20T24:00:00Z', '2026-10-20T12:60:00Z', '2026-10-20', '10/20/2026', true, 0, null]) {
      const saved = record(value);
      const normalized = api.normalizeFlightPracticeRecord(saved);
      expect(normalized.endedAt, String(value)).toBeNull();
      expect(normalized.flightTime).toBe(60);
      expect(normalized.reflection).toBe(saved.reflection);
      expect(saved.endedAt).toBe(value);
    }
  });
  it('retains valid UTC, leap-day, fractional, and offset dates as canonical instants', () => {
    for (const value of ['2026-10-20T12:00:00Z', '2024-02-29T23:59:59.123Z',
      '2026-10-20T12:00:00.1-04:00', '2026-10-20T12:00:00+05:30']) {
      expect(api.normalizeFlightPracticeRecord(record(value)).endedAt).toBe(new Date(value).toISOString());
    }
  });
  it('keeps an unknown date unknown through repeated archiving and saved-state restoration', () => {
    const saved = record('2026-02-31T12:00:00Z');
    const history = api.archiveFlightPractice([], saved);
    expect(history).toHaveLength(1);
    expect(history[0].endedAt).toBeNull();
    const restored = api.normalizeFlightPracticeHistory(JSON.parse(JSON.stringify(history)));
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({ attemptId: 'original-flight', endedAt: null, flightTime: 60,
      reflection: saved.reflection });
  });
});
