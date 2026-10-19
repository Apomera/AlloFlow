// A TIMED PASSAGE THE CHILD CAN DECODE BY CONSTRUCTION.
//
// Decodable ORF reuses the Assessment Center's tap-to-mark ORF surface with
// a passage assembled from the loaded Word Sounds pack — the same
// Finish-the-Sentence sentences the teacher reviewed at setup. Two rules:
//
//   1. The passage never runs dry inside the minute: sentences are shuffled
//      (alternate forms) and the cycle repeats past 120 words.
//   2. The score NEVER touches grade-level machinery. Controlled-text WCPM
//      has no published norms, so the result banks under its own activity
//      id ('orf_decodable'), gets no benchmark interpretation, no clinical
//      print, and no screening-passage comprehension questions.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const MODULE = read('student_analytics_module.js');

/** Execute the real passage builder. */
function loadBuilder() {
  const start = MODULE.indexOf('const DECODABLE_ORF_FRAMES');
  const end = MODULE.indexOf('const handleLaunchDecodableORF');
  expect(start, 'builder not found').toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const body = MODULE.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`${body} return { buildDecodablePassage, DECODABLE_ORF_FRAMES };`)();
}

/** Execute the real norm-mapping guard (it reads the shared AlloSheet measure table). */
function loadProbeTypeAndScore() {
  const start = MODULE.indexOf('var _probeTypeAndScore = function');
  const end = MODULE.indexOf('var _internals', start);
  expect(start, '_probeTypeAndScore not found').toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const mStart = MODULE.indexOf('var SA_ALLOSHEET_MEASURES = {');
  const mEnd = MODULE.indexOf('function saAlloSheetGrade', mStart);
  expect(mStart, 'measure table not found').toBeGreaterThan(0);
  expect(mEnd).toBeGreaterThan(mStart);
  const body = MODULE.slice(mStart, mEnd) + MODULE.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`${body} return _probeTypeAndScore;`)();
}

/** The whole module, rendered once so the reference engine is registered. */
function loadAnalytics() {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));
  globalThis.React = window.React = React;
  window.ReactDOM = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom'));
  loadAlloModule('student_analytics_module.js');
  try {
    ReactDOMServer.renderToStaticMarkup(React.createElement(window.AlloModules.StudentAnalytics, { isOpen: true, onClose: () => {}, students: [], dashboardData: null }));
  } catch (e) { /* the engine registers before the render can throw */ }
  return window.AlloModules.StudentAnalytics._meta;
}

describe('the passage is built from the pack', () => {
  const { buildDecodablePassage } = loadBuilder();

  it('prefers the teacher-reviewed Finish-the-Sentence sentence', () => {
    const passage = buildDecodablePassage([
      { targetWord: 'cat', activityItems: { read_sentence: { sentence: 'The cat can run.' } } },
    ]);
    expect(passage).toContain('The cat can run.');
  });

  it('prefers the three-sentence story over the single sentence', () => {
    const passage = buildDecodablePassage([
      { targetWord: 'cat', activityItems: {
        read_sentence: { sentence: 'The cat can run.' },
        read_passage: { story: 'Look at the cat! Here is the cat. We like the cat.' },
      } },
    ]);
    expect(passage).toContain('Look at the cat! Here is the cat. We like the cat.');
    expect(passage).not.toContain('The cat can run.');
  });

  it('falls back to a sight-word frame for words without a packed sentence', () => {
    const passage = buildDecodablePassage([{ targetWord: 'bun' }]);
    expect(passage).toMatch(/bun/);
    // Every non-target word must be one of the frame sight words.
    const glue = new Set(['i', 'can', 'see', 'the', 'look', 'at', 'here', 'is', 'we', 'like']);
    for (const w of passage.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)) {
      expect(w === 'bun' || glue.has(w), w).toBe(true);
    }
  });

  it('repeats the cycle so a fast reader cannot run out inside the minute', () => {
    const passage = buildDecodablePassage([
      { targetWord: 'cat' }, { targetWord: 'sun' }, { targetWord: 'bun' },
    ]);
    expect(passage.split(/\s+/).length).toBeGreaterThanOrEqual(120);
  });

  it('returns null when there is nothing to build from', () => {
    expect(buildDecodablePassage([])).toBe(null);
    expect(buildDecodablePassage(null)).toBe(null);
    expect(buildDecodablePassage([{ definition: 'no word fields' }])).toBe(null);
  });
});

describe('the score never touches grade-level machinery', () => {
  // 2026-10 (f238731dd): _probeTypeAndScore keeps every score with its unit and the
  // reference engine refuses anything that is not a reviewed grade-level ORF. So the
  // guard is checked end to end: decodable WCPM never reaches the ORF norms.
  it('_probeTypeAndScore maps orf to the norms and orf_decodable away from them', () => {
    const fn = loadProbeTypeAndScore();
    expect(fn({ activity: 'orf', wcpm: 45 })).toEqual({ probeType: 'orf', score: 45, unit: 'wcpm' });
    const decodable = fn({ activity: 'orf_decodable', wcpm: 45 });
    expect(decodable && decodable.probeType).not.toBe('orf');
    expect(decodable && decodable.unit).toBe('wcpm_decodable_text');
  });

  it('a decodable record gets no benchmark, even with a complete ORF administration record', () => {
    const meta = loadAnalytics();
    const context = { referenceId: 'hasbrouck-tindal-2017-orf', measure: 'orf', unit: 'wcpm', grade: '3', season: 'winter',
      language: 'en', durationSeconds: 60, material: 'unpracticed-grade-level', scoring: 'standardized',
      reviewedByEducator: true, formId: 'reviewed-external-form' };
    const record = (activity) => ({ activity, grade: '3', wcpm: 40, timestamp: Date.parse('2026-01-20'), benchmarkContext: context });
    // Control: the same administration as grade-level ORF IS compared, so the check below can fail.
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Wren: [record('orf')] }));
    expect(meta.getTrendSeries('Wren')[0].benchmark).toBe(97);
    expect(meta.getRTITier('Wren').perProbe[0].comparisonAvailable).toBe(true);
    localStorage.setItem('alloflow_probe_history', JSON.stringify({ Wren: [record('orf_decodable')] }));
    const series = meta.getTrendSeries('Wren');
    expect(series[0].points[0].value).toBe(40);
    expect(series[0].benchmark).toBe(null);
    const tier = meta.getRTITier('Wren');
    for (const p of (tier ? tier.perProbe : [])) {
      expect(p.comparisonAvailable).toBe(false);
      expect(p.reference).toBe(null);
      expect(p.tier).toBe(0);
    }
    localStorage.removeItem('alloflow_probe_history');
  });

  it('the AlloSheet measure exists but carries no clinical probeType', () => {
    expect(MODULE).toMatch(/orf_decodable: \{ code: 'orf_decodable', probeType: null/);
  });

  it('no benchmark interpretation, no clinical print, no screening comprehension', () => {
    expect(MODULE).toMatch(/orfProbeResults\.decodable \? [\s\S]{0,400}not comparable to grade-level ORF benchmarks/);
    expect(MODULE).toMatch(/!orfProbeResults\.decodable && [\s\S]{0,200}printClinicalProbeReport/);
    expect(MODULE).toMatch(/if \(orfProbeResults\.decodable\) return null;/);
  });

  it('saves under its own activity id, into probeHistory', () => {
    const idx = MODULE.indexOf("activity: 'orf_decodable'");
    expect(idx).toBeGreaterThan(0);
    expect(MODULE.slice(idx - 400, idx)).toMatch(/saveProbeResult\(mathProbeStudent/);
  });
});

describe('the flag is carried and reset honestly', () => {
  it('both result-construction sites stamp it', () => {
    expect((MODULE.match(/decodable: orfProbeDecodable/g) || []).length).toBe(2);
  });

  it('the grade-passage launcher resets it, the decodable launcher sets it', () => {
    expect(MODULE).toMatch(/setOrfProbeDecodable\(false\);/);
    expect(MODULE).toMatch(/setOrfProbeDecodable\(true\);/);
  });

  it('the active panel names the measure it is running', () => {
    // The source stores the emoji as 📖 escapes — match around it.
    expect(MODULE).toMatch(/orfProbeDecodable \? "[^"]*DECODABLE ORF" : "[^"]*ORF PROBE"/);
  });
});

describe('the wiring reaches the pack', () => {
  it('the module accepts the pack value, not just its setter', () => {
    expect(MODULE).toMatch(/wsPreloadedWords,\s*\n\s*setWsPreloadedWords,/);
  });

  it('the host passes it', () => {
    expect(read('AlloFlowANTI.txt')).toMatch(/wsPreloadedWords=\{wsPreloadedWords\}/);
  });

  it('the launcher button exists in the Literacy Fluency panel', () => {
    expect(MODULE).toMatch(/onClick: handleLaunchDecodableORF/);
    expect(MODULE).toMatch(/t\('probes\.decodable_orf'\)/);
  });

  it('the strings exist', () => {
    const ui = read('ui_strings.js');
    expect(ui).toMatch(/"decodable_orf_needs_pack":/);
    expect(ui).toMatch(/"decodable_orf_started":/);
    expect(ui).toMatch(/"decodable_orf": "Timed passage from your Word Sounds pack"/);
  });
});

describe('mirrors carry it', () => {
  it('student_analytics_module and ui_strings are byte-identical', () => {
    expect(read('desktop/web-app/public/student_analytics_module.js')).toBe(MODULE);
    expect(read('desktop/web-app/public/ui_strings.js')).toBe(read('ui_strings.js'));
  });
});
