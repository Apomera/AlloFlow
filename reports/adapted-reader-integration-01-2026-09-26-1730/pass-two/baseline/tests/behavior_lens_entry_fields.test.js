// Behavior Lens tools that read ABC entries by field names the saved entries no
// longer have, or treat the AI analysis (an object) as text.
//
// WHY: saved entries are normalized by the workspace runtime. The day is `localDate`
// (occurredAt + timezoneOffset) and the function is `function`; there is no `date`,
// `functionTag` or `perceivedFunction`. Until 2026-09-23:
//   - the Behavior Timeline Heatmap matched `e.date` against a UTC day, so every cell
//     read zero incidents and every function "Unknown";
//   - the toolbar CSV download wrote an empty Date column for every row;
//   - the BCBA handoff read `e.functionTag` (always empty) and called
//     `aiAnalysis.substring`, which threw on the analysis object, so with the default
//     "attach AI analysis" option every packet failed with "Generation failed";
//   - printed reports averaged intensity with unrated entries counted as 0.
// Entries below are built with the REAL normalizer, so a test cannot pass by
// supplying the old field names.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let R, runtime;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  runtime = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  R = window.AlloModules && window.AlloModules.BehaviorLensEntryReaders;
  if (!R) throw new Error('BehaviorLensEntryReaders did not register');
});

const entry = (over) => runtime.normalizeAbcEntry(Object.assign({
  antecedent: 'Math worksheet', behavior: 'Left seat', consequence: 'Redirected', setting: 'Room 12',
}, over)).entry;

describe('entry readers', () => {
  it('the day is the recorder\'s local day, not the UTC day', () => {
    // 11:30 pm in UTC-4 is 03:30 the next day in UTC.
    const e = entry({ occurredAt: '2026-09-15T03:30:00.000Z', timezoneOffset: 240 });
    expect(e.date, 'normalized entries have no date field').toBeUndefined();
    expect(R.abcEntryDay(e)).toBe('2026-09-14');
  });
  it('the function is read from `function`', () => {
    expect(R.abcEntryFunction(entry({ occurredAt: '2026-09-14T12:00:00Z', function: 'Escape' }))).toBe('Escape');
  });
  it('newest first sorts by time, whatever order the array is in', () => {
    const a = entry({ occurredAt: '2026-09-10T12:00:00Z', notes: 'a' });
    const b = entry({ occurredAt: '2026-09-12T12:00:00Z', notes: 'b' });
    const c = entry({ occurredAt: '2026-09-11T12:00:00Z', notes: 'c' });
    expect(R.abcEntriesNewestFirst([a, b, c]).map(e => e.notes)).toEqual(['b', 'c', 'a']);
    expect(R.abcEntriesNewestFirst([b, c, a]).map(e => e.notes)).toEqual(['b', 'c', 'a']);
  });
  it('the AI analysis object reads as text, never "[object Object]"', () => {
    const text = R.aiAnalysisText({ summary: 'Escape from demands is likely.', hypothesizedFunction: 'Escape', confidence: 72, recommendations: ['Offer breaks'] });
    expect(text).toContain('Escape from demands is likely.');
    expect(text).toContain('Hypothesized function: Escape');
    expect(text).toContain('Offer breaks');
    expect(R.aiAnalysisText({ summary: 'x'.repeat(900) }, 600)).toHaveLength(600);
  });
  it('the intensity mean skips unrated entries', () => {
    const rated = [4, 4, 4, 4, 4].map((v, i) => entry({ occurredAt: `2026-09-1${i}T12:00:00Z`, intensity: v }));
    const unrated = [0, 1, 2, 3, 4].map(i => entry({ occurredAt: `2026-09-2${i}T12:00:00Z` }));
    expect(R.ratedIntensityMean(rated.concat(unrated))).toMatchObject({ mean: 4, ratedCount: 5, missingCount: 5 });
  });
});

describe('toolbar CSV', () => {
  it('fills the Date column, orders rows oldest first, and quotes every cell', () => {
    const newer = entry({ occurredAt: '2026-09-15T03:30:00.000Z', timezoneOffset: 240, notes: 'n', behavior: 'Said "no" loudly' });
    const older = entry({ occurredAt: '2026-09-10T14:00:00.000Z', timezoneOffset: 240, function: 'Attention' });
    const lines = R.buildAbcCsv([newer, older]).trim().split('\n');
    expect(lines[0]).toBe('Date,Time,Antecedent,Behavior,Consequence,Setting,Intensity,Phase,Function');
    expect(lines[1].startsWith('"2026-09-10",')).toBe(true);
    expect(lines[1].endsWith(',"Attention"')).toBe(true);
    expect(lines[2].startsWith('"2026-09-14",')).toBe(true);
    expect(lines[2]).toContain('"Said ""no"" loudly"');
  });
  it('a note that looks like a formula cannot run in a spreadsheet', () => {
    const e = entry({ occurredAt: '2026-09-10T14:00:00Z', antecedent: '=HYPERLINK("http://x","click")' });
    expect(R.buildAbcCsv([e])).toContain(`"'=HYPERLINK(""http://x"",""click"")"`);
    expect(R.csvCell(-5)).toBe('"-5"');
  });
});

describe('Behavior Timeline Heatmap', () => {
  it('counts saved entries on their local day and names their function', () => {
    const day = new Date(); day.setHours(12, 0, 0, 0);
    while (day.getDay() === 0 || day.getDay() === 6) day.setDate(day.getDate() - 1);
    const entries = [
      entry({ occurredAt: day.toISOString(), timezoneOffset: day.getTimezoneOffset(), function: 'Escape' }),
      entry({ occurredAt: new Date(day.getTime() + 3600e3).toISOString(), timezoneOffset: day.getTimezoneOffset(), function: 'Escape' }),
    ];
    const q = componentHarness('BehaviorHeatmap', { abcEntries: entries, onOpenTool: () => {}, t: () => undefined, addToast: () => {}, mini: false },
      { blLocalDateKey: R.blLocalDateKey, abcEntryDay: R.abcEntryDay, abcEntryFunction: R.abcEntryFunction });
    const svg = q.all(n => n.type === 'svg')[0];
    expect(svg.props['aria-label']).toContain('2 total incidents');
    const cell = q.all(n => n.type === 'rect' && typeof n.props['aria-label'] === 'string')[0];
    expect(cell.props['aria-label']).toContain('2 incidents. 2 Escape');
  });
});

describe('BCBA handoff packet', () => {
  it('attaches the AI analysis object as text instead of failing, and reports functions', async () => {
    const entries = ['Escape', 'Escape', 'Attention'].map((fn, i) => entry({ occurredAt: `2026-09-1${i}T12:00:00Z`, function: fn, intensity: 3 }));
    let prompt = null; const toasts = [];
    const props = {
      studentName: 'Kestrel', abcEntries: entries, observationSessions: [], userRole: 'teacher', t: () => undefined,
      aiAnalysis: { summary: 'Escape-maintained pattern is likely.', hypothesizedFunction: 'Escape', confidence: 72, recommendations: [] },
      callGemini: async (p) => { prompt = p; return 'PACKET'; },
      addToast: (m, k) => toasts.push([m, k]),
    };
    const env = { abcEntryFunction: R.abcEntryFunction, abcEntriesNewestFirst: R.abcEntriesNewestFirst, abcEntryDay: R.abcEntryDay, aiAnalysisText: R.aiAnalysisText };
    const q = componentHarness('BCBAHandoff', props, env);
    q.button('Template').props.onClick(); q.render();
    await q.button('Fill required fields').props.onClick();
    expect(toasts, 'generation reported a failure').toEqual([]);
    expect(prompt).toContain('Escape-maintained pattern is likely.');
    expect(prompt).toContain('Hypothesized functions: Escape (2x), Attention (1x)');
    expect(prompt).not.toContain('[object Object]');
  });
});

describe('printed reports', () => {
  it('Portfolio and IEP-Ready FBA Report average rated intensities only, and say how many', async () => {
    const { vi } = await import('vitest');
    const pages = [];
    vi.spyOn(window, 'open').mockImplementation(() => ({ document: { write: html => pages.push(html), close() {} }, print() {} }));
    vi.useFakeTimers();
    try {
      const rated = [0, 1, 2, 3, 4].map(i => entry({ occurredAt: `2026-09-1${i}T12:00:00Z`, intensity: 4, phase: 'baseline' }));
      const unrated = [0, 1, 2, 3, 4].map(i => entry({ occurredAt: `2026-09-2${i}T12:00:00Z`, phase: 'baseline' }));
      const q = componentHarness('ExportPanel', { abcEntries: rated.concat(unrated), observationSessions: [], studentName: 'Kestrel', aiAnalysis: null, t: () => undefined, onOpenAlloSheetReview: () => {} });
      q.button('Print Portfolio PDF').props.onClick();
      q.button('IEP-Ready FBA Report').props.onClick();
      expect(pages).toHaveLength(2);
      // Old: (5 x 4 + 5 x 0) / 10 = 2.0, below every rating actually given.
      expect(pages[0]).toContain('4.0 (5 of 10 rated)');
      expect(pages[1]).toContain('4.0 (5 of 10 rated)');
      expect(pages[1]).toMatch(/baseline<\/span><\/td><td>10<\/td><td>100%<\/td><td>4\.0<\/td>/);
    } finally { vi.useRealTimers(); vi.restoreAllMocks(); }
  });
});
