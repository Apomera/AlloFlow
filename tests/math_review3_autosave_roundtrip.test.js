// @vitest-environment jsdom
//
// Math-tool PROGRESS survives a reload (math review 3, autosave lane).
//
// Before this change the STEM hub's autosave whitelist held one math tool
// (Calculus, as a whole bucket), so every badge, streak best and quest counter
// in the other 21 math tools reset on reload unless a project was saved.
//
// These run the hub's real _stemPersistencePayload / _createStemAutosave /
// _stemHydrateLabToolData (helpers/math_review3_autosave_fixtures.js loads the
// STEM_AUTOSAVE block), and then ask each tool's OWN quest hooks whether the
// restored state still counts as done.
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  loadHub, saveAndRestore, MATH_TOOLS, fullBucket, fullToolData, questState, toolCreatesBucket,
  STATS_DEFAULTS_LIKE, STORAGE_KEY,
} from './helpers/math_review3_autosave_fixtures.js';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

afterEach(() => vi.useRealTimers());

const byKey = (key) => MATH_TOOLS.find((t) => t.key === key);

describe('math progress survives a save and a reload', () => {
  it('covers all 22 math tools (fixture sanity)', () => {
    expect(MATH_TOOLS.length).toBe(22);
    expect(new Set(MATH_TOOLS.map((t) => t.key)).size).toBe(22);
  });

  it.each(MATH_TOOLS.map((t) => [t.key, t]))('%s: badges, counters, bests and seen-maps come back', (key, tool) => {
    const hub = loadHub();
    const { next } = saveAndRestore(hub, { [key]: fullBucket(tool) }, {}, toolCreatesBucket(tool));
    const expected = tool.expected || tool.progress;
    const restored = next[key] || {};
    const missing = Object.keys(expected).filter((f) => JSON.stringify(restored[f]) !== JSON.stringify(expected[f]));
    expect(missing, key + ' lost: ' + missing.join(', ')).toEqual([]);
  });

  it('the real autosave writes all 22 math buckets, and only those, to localStorage', () => {
    vi.useFakeTimers();
    const hub = loadHub();
    const saver = hub.createSaver();
    saver.queue(Object.assign({ _persisted: true }, fullToolData()));
    vi.advanceTimersByTime(400);
    const raw = hub.storage.getItem(STORAGE_KEY);
    expect(typeof raw).toBe('string');
    const saved = JSON.parse(raw);
    expect(Object.keys(saved).sort()).toEqual(MATH_TOOLS.map((t) => t.key).sort());
    saver.dispose();
  });

  it('a change to progress alone triggers a save (the math buckets are watched)', () => {
    vi.useFakeTimers();
    const hub = loadHub();
    const saver = hub.createSaver();
    const base = { _persisted: true, _numberline: { badges: { firstMark: true } } };
    saver.queue(base);
    vi.advanceTimersByTime(400);
    saver.queue(Object.assign({}, base, { _numberline: { badges: { firstMark: true, rounder: true } } }));
    vi.advanceTimersByTime(400);
    expect(JSON.parse(hub.storage.getItem(STORAGE_KEY))._numberline.badges).toEqual({ firstMark: true, rounder: true });
    saver.dispose();
  });

  it('restores INTO the host defaults instead of replacing the bucket', () => {
    const hub = loadHub();
    // Shapes from AlloFlowANTI's initial labToolData, plus a tool's own prefs.
    const prev = {
      funcGrapher: { eq: 'x^2', a: 1, b: 0, c: 0, type: 'quadratic', range: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, challenge: null, feedback: null },
      inequality: { expr: 'x > 3', variable: 'x', range: { min: -10, max: 10 }, shaded: [] },
      calculus: { func: 'x^2', a: 1, b: 0, c: 0, xMin: 0, xMax: 4, n: 8, mode: 'riemann' },
      _fractions: { tab: 'compare', plateGame: { level: 3, audioOn: false } },
    };
    const td = {};
    ['funcGrapher', 'inequality', 'calculus', '_fractions'].forEach((k) => { td[k] = fullBucket(byKey(k)); });
    const { next } = saveAndRestore(hub, td, prev);
    expect(next.funcGrapher).toMatchObject({ type: 'quadratic', a: 1, b: 0, eq: 'x^2', fgScore: 6, fgMythsDone: 3 });
    expect(next.inequality).toMatchObject({ expr: 'x > 3', range: { min: -10, max: 10 }, quizCorrectTotal: 6, solverCount: 3 });
    expect(next.calculus).toMatchObject({ mode: 'riemann', n: 8, calcScore: 5, nExplored: true });
    expect(next._fractions.tab).toBe('compare');
    // A nested record merges one level down: the game's own prefs stay.
    expect(next._fractions.plateGame).toEqual({ level: 3, audioOn: false, totalServed: 26, bestCombo: 7 });
    expect(next._persisted).toBe(true);
  });

  it('Stats Lab progress waits for the tool to seed its bucket, and a save in between keeps it', () => {
    const hub = loadHub();
    const stats = byKey('statsLab');
    const { next } = saveAndRestore(hub, { statsLab: fullBucket(stats) }, {});
    // The tool only seeds STATSLAB_DEFAULTS when its bucket is missing, so the
    // restore must not create a partial one (the tool would read no defaults).
    expect(next.statsLab).toBeUndefined();
    // Any save before the tool opens still carries the progress.
    const again = JSON.parse(JSON.stringify(hub.payload(next)));
    expect(again.statsLab).toEqual(stats.progress);
    // The tool seeds its defaults; the progress joins them.
    const merged = hub.applyPending(Object.assign({}, next, { statsLab: Object.assign({}, STATS_DEFAULTS_LIKE) }));
    expect(merged.statsLab).toEqual(Object.assign({}, STATS_DEFAULTS_LIKE, stats.progress));
    expect(merged._stemProgressPending).toBeUndefined();
    // Nothing left to apply: the same object comes back, so React does not re-render.
    expect(hub.applyPending(merged)).toBe(merged);
    // And while the bucket is still missing, applying is a no-op too.
    expect(hub.applyPending(next)).toBe(next);
  });

  it('Function Grapher merges at once into the host bucket, and waits when there is none', () => {
    const hub = loadHub();
    const fg = byKey('funcGrapher');
    const withHost = saveAndRestore(hub, { funcGrapher: fullBucket(fg) }, { funcGrapher: { type: 'quadratic', a: 1, b: 0, c: 0 } }).next;
    expect(withHost.funcGrapher).toEqual(Object.assign({ type: 'quadratic', a: 1, b: 0, c: 0 }, fg.progress));
    expect(withHost._stemProgressPending).toBeUndefined();
    // e.g. a loaded project without a funcGrapher bucket: a progress-only
    // bucket would skip the tool's init guard and plot NaN.
    const bare = saveAndRestore(hub, { funcGrapher: fullBucket(fg) }, {}).next;
    expect(bare.funcGrapher).toBeUndefined();
    expect(bare._stemProgressPending.funcGrapher).toEqual(fg.progress);
  });

  it('the component hydrates through the helper and applies deferred progress', async () => {
    const { hubSource } = await import('./helpers/math_review3_autosave_fixtures.js');
    const { sliceBetween } = await import('./helpers/anchored_slice.js');
    const effect = sliceBetween(hubSource(), '// ── localStorage persistence', '// ── Tutorial Overlay Helper', { label: 'STEM hydration effects' });
    expect(effect.includes('setLabToolData(function (prev) { return _stemHydrateLabToolData(prev, _parsedForHydration); });'), 'hydration helper wired').toBe(true);
    expect(effect.includes('if (labToolData._stemProgressPending) setLabToolData(_stemApplyPendingProgress);'), 'pending effect wired').toBe(true);
  });
});

describe("each tool's own quest hooks still count the restored progress", () => {
  const withHooks = MATH_TOOLS.filter((t) => t.questTrue.length || t.questReset.length);

  it.each(withHooks.map((t) => [t.id, t]))('%s', (id, tool) => {
    resetStemLab();
    const cfg = loadTool('stem_lab/' + tool.file, tool.id);
    const hooks = cfg.questHooks || [];
    const hook = (qid) => {
      const h = hooks.find((x) => x.id === qid);
      if (!h) throw new Error(id + ' has no quest hook ' + qid + ' (has: ' + hooks.map((x) => x.id).join(', ') + ')');
      return h;
    };
    // The fixture is a real finished state: every listed hook passes before the reload.
    const before = questState(cfg, tool.id, { [tool.key]: fullBucket(tool) });
    for (const qid of tool.questTrue.concat(tool.questReset)) expect(!!hook(qid).check(before), 'before reload: ' + qid).toBe(true);

    const hub = loadHub();
    const { next } = saveAndRestore(hub, { [tool.key]: fullBucket(tool) }, {}, toolCreatesBucket(tool));
    const after = questState(cfg, tool.id, next);
    for (const qid of tool.questTrue) expect(!!hook(qid).check(after), 'after reload, progress quest: ' + qid).toBe(true);
    // These read the student's work (answers, points, pins, cart), which is
    // never saved: they are EXPECTED to start over on a new visit.
    for (const qid of tool.questReset) expect(!!hook(qid).check(after), 'after reload, work quest: ' + qid).toBe(false);
  });
});
