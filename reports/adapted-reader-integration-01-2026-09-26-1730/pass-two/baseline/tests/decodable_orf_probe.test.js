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
import { resolve } from 'node:path';

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

/** Execute the real norm-mapping guard. */
function loadProbeTypeAndScore() {
  const start = MODULE.indexOf('var _probeTypeAndScore = function');
  const end = MODULE.indexOf('var _internals', start);
  expect(start, '_probeTypeAndScore not found').toBeGreaterThan(0);
  expect(end).toBeGreaterThan(start);
  const body = MODULE.slice(start, end);
  // eslint-disable-next-line no-new-func
  return new Function(`${body} return _probeTypeAndScore;`)();
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
  it('_probeTypeAndScore maps orf to norms and orf_decodable to NOTHING', () => {
    const fn = loadProbeTypeAndScore();
    expect(fn({ activity: 'orf', wcpm: 45 })).toEqual({ probeType: 'orf', score: 45 });
    // The whole point: never guess a clinical score for controlled text.
    expect(fn({ activity: 'orf_decodable', wcpm: 45 })).toBe(null);
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
