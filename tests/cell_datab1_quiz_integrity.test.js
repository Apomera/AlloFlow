// Cell Simulator — quiz bank integrity (QUIZ_BANK + the 200 wired EXTRA_QUIZ items).
//
// The live quiz is QUIZ_BANK followed by EXTRA_QUIZ mapped to {q, a, options,
// hint, explanation}; it grades by option TEXT (case-insensitive) and shows the
// explanation after every answer. In 2026-10 the 200 extra items were 10 questions
// repeated 20 times with placeholder explanations, and several had two defensible
// answers (e.g. "What organelle produces ATP?" with Mitochondria AND Chloroplast
// offered). This suite evaluates the real literals and the real append.
import fs from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect, beforeAll } from 'vitest';

const SRC_PATH = 'stem_lab/stem_tool_cell.js';
let src;
let extra;
let quizBank;
let live;
let rotate;

function slice(from, to) {
  const i = src.indexOf(from);
  if (i < 0) throw new Error('missing marker: ' + from);
  const j = src.indexOf(to, i);
  return src.slice(i, j + to.length);
}
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

beforeAll(() => {
  src = fs.readFileSync(SRC_PATH, 'utf8');
  const extraLit = slice('var EXTRA_QUIZ = [', '\n          ];');
  const bankLit = slice('var QUIZ_BANK = [', '\n          ];');
  const push = slice('Array.prototype.push.apply(QUIZ_BANK, EXTRA_QUIZ.map(', '.filter(Boolean));');
  extra = runInNewContext('(function(){ ' + extraLit + '; return EXTRA_QUIZ; })()');
  quizBank = runInNewContext('(function(){ ' + bankLit + '; return QUIZ_BANK; })()');
  live = runInNewContext('(function(){ ' + extraLit + '\n' + bankLit + '\n' + push + '; return QUIZ_BANK; })()',
    { Math, Number, Array, Object, String, isFinite });
  const fnStart = src.indexOf('function cellRotateQuizOptions');
  const fnEnd = src.indexOf('\n          }', fnStart);
  rotate = new Function(src.slice(fnStart, fnEnd + 12) + '; return cellRotateQuizOptions;')();
});

describe('cell quiz — every item is well formed', () => {
  it('keeps the pinned shape: 20 bank entries + 200 wired extras', () => {
    expect(quizBank.length).toBe(20);
    expect(extra.length).toBe(200);
    expect(live.length).toBe(220);
  });

  it('every multiple-choice item has 4 distinct non-empty options and exactly one keyed answer', () => {
    live.forEach((q, i) => {
      expect(typeof q.q === 'string' && q.q.trim().length > 10, 'stem ' + i).toBe(true);
      expect(typeof q.a === 'string' && q.a.trim().length > 0, 'key ' + i).toBe(true);
      if (!Array.isArray(q.options)) return; // organism-spotter entries pick from the dish
      expect(q.options.length, q.q).toBe(4);
      q.options.forEach((o) => expect(typeof o === 'string' && o.trim().length > 0, q.q).toBe(true));
      const lower = q.options.map((o) => o.toLowerCase());
      expect(new Set(lower).size, 'duplicate options: ' + q.q).toBe(4);
      expect(lower.filter((o) => o === q.a.toLowerCase()).length, 'keyed answer: ' + q.q).toBe(1);
      if (Array.isArray(q.wrongFeedback)) {
        expect(q.wrongFeedback.length, q.q).toBe(4);
        q.options.forEach((o, k) => {
          if (o.toLowerCase() !== q.a.toLowerCase()) expect(String(q.wrongFeedback[k]).trim().length > 10, q.q + ' feedback ' + k).toBe(true);
        });
      }
    });
  });

  it('no two questions share a stem, and no wired item repeats a bank question', () => {
    const seen = new Map();
    live.forEach((q, i) => {
      const n = norm(q.q);
      expect(seen.has(n), 'duplicate stem at ' + i + ' and ' + seen.get(n) + ': ' + q.q).toBe(false);
      seen.set(n, i);
    });
  });

  it('every extra item has its own explanation and hint, a real difficulty and category', () => {
    const ex = new Set();
    const counts = {};
    extra.forEach((q) => {
      expect(q.explanation.length, q.question).toBeGreaterThan(40);
      expect(q.hint.length, q.question).toBeGreaterThan(8);
      expect(q.hint, q.question).not.toBe(q.explanation);
      expect(ex.has(q.explanation), 'repeated explanation: ' + q.question).toBe(false);
      ex.add(q.explanation);
      expect(['easy', 'medium', 'hard']).toContain(q.difficulty);
      expect(['Anatomy', 'Function', 'History', 'Behavior', 'Reproduction']).toContain(q.category);
      counts[q.category] = (counts[q.category] || 0) + 1;
    });
    Object.values(counts).forEach((n) => expect(n).toBe(40));
  });

  it('the explanation names the keyed answer or its key idea (not a generic sentence)', () => {
    // A cheap guard against explanations pasted onto the wrong question: at
    // least one content word of the key (or its first word) must appear.
    const stop = new Set(['the', 'and', 'a', 'an', 'of', 'to', 'in', 'it', 'its', 'is', 'by', 'for', 'from', 'with', 'one', 'only']);
    const misses = extra.filter((q) => {
      const kw = norm(q.correctAnswer).split(' ').filter((w) => w.length > 2 && !stop.has(w));
      if (!kw.length) return false; // numeric keys such as "46", "8"
      const ex = norm(q.explanation + ' ' + q.question);
      return !kw.some((w) => ex.includes(w.slice(0, Math.max(4, w.length - 2))));
    }).map((q) => q.question + ' -> ' + q.correctAnswer);
    expect(misses).toEqual([]);
  });
});

describe('cell quiz — no test-wise cues', () => {
  it('the key is not systematically the longest option', () => {
    let n = 0;
    let uniqLongest = 0;
    let severe = 0;
    live.forEach((q) => {
      if (!Array.isArray(q.options) || q.options.length !== 4) return;
      const L = q.options.map((o) => o.length);
      const k = q.options.findIndex((o) => o.toLowerCase() === q.a.toLowerCase());
      const others = L.filter((_, i) => i !== k);
      n++;
      if (L[k] === Math.max(...L) && L.filter((x) => x === L[k]).length === 1) uniqLongest++;
      if (L[k] >= Math.max(...others) + 20 && L[k] >= Math.max(...others) * 1.75) severe++;
    });
    expect(n).toBe(210);
    expect(uniqLongest / n, uniqLongest + '/' + n + ' keys uniquely longest').toBeLessThan(0.25);
    expect(severe).toBe(0);
  });

  it('the shown answer position has no repeating pattern after rotation', () => {
    const shown = [];
    live.forEach((q, i) => {
      if (!Array.isArray(q.options) || q.options.length !== 4) return;
      const r = rotate(q, i);
      shown.push(r.options.findIndex((o) => o.toLowerCase() === q.a.toLowerCase()));
    });
    const tail = shown.slice(10); // the 200 wired extras, shown back to back
    const counts = [0, 0, 0, 0];
    tail.forEach((s) => counts[s]++);
    counts.forEach((c) => expect(c / tail.length, counts.join('/')).toBeLessThan(0.32));
    for (let p = 1; p <= 8; p++) {
      let same = 0;
      for (let i = 0; i + p < tail.length; i++) if (tail[i] === tail[i + p]) same++;
      expect(same / (tail.length - p), 'shown slot repeats with period ' + p).toBeLessThan(0.45);
    }
    let run = 1;
    let maxRun = 1;
    for (let i = 1; i < tail.length; i++) { run = tail[i] === tail[i - 1] ? run + 1 : 1; maxRun = Math.max(maxRun, run); }
    expect(maxRun).toBeLessThanOrEqual(3);
  });
});

describe('cell quiz — corrected items stay corrected', () => {
  const stem = (re) => live.filter((q) => re.test(q.q));

  it('ATP is not asked so that chloroplast is also right', () => {
    stem(/produces? ATP|makes? (the )?most( of the)? ATP/i).forEach((q) => {
      if (!Array.isArray(q.options)) return;
      const hasChloro = q.options.some((o) => /chloroplast/i.test(o));
      expect(hasChloro && !/animal/i.test(q.q), q.q).toBe(false);
    });
    expect(stem(/powerhouse/i).length, 'one powerhouse question, not two').toBe(1);
  });

  it('"Who discovered cells?" (Hooke vs Leeuwenhoek, both defensible) is gone', () => {
    expect(stem(/^who discovered cells\??$/i)).toEqual([]);
    const hooke = stem(/first used the word 'cell'/i);
    expect(hooke.length).toBe(1);
    expect(hooke[0].a).toBe('Robert Hooke');
  });

  it('the space-survival question no longer offers bacteria (spores have survived space too)', () => {
    const q = stem(/FOTON-M3/);
    expect(q.length).toBe(1);
    expect(q[0].options.map((o) => o.toLowerCase())).not.toContain('bacterium');
    expect(q[0].a).toBe('tardigrade');
  });

  it('organism-spotter stems single out one organism in the dish', () => {
    // Spirillum is also a bacterium, Stentor also has cilia, diatoms and Volvox
    // also have walls and chloroplasts, Volvox also swims to light.
    expect(stem(/^What type of cell has no nucleus\?$/)).toEqual([]);
    expect(stem(/^Which organism has cilia for movement\?$/)).toEqual([]);
    expect(stem(/^Which cell has a rigid cell wall AND chloroplasts\?$/)).toEqual([]);
    expect(stem(/^Which organism moves toward light\?$/)).toEqual([]);
    expect(stem(/Spirillum, which organism in the dish has no nucleus/)[0].a).toBe('bacterium');
    expect(stem(/cellulose cell wall, chloroplasts and a large central vacuole/)[0].a).toBe('plantcell');
  });

  it('osmosis and transport items keep the physically correct key', () => {
    expect(stem(/red blood cell placed in pure water/i)[0].a).toBe('It swells and may burst');
    expect(stem(/^Osmosis is the movement of which substance/i)[0].a).toBe('Water');
    expect(stem(/mitochondria and chloroplasts BOTH make/)[0].a).toBe('ATP');
    expect(stem(/Which base pairs with adenine/i)[0].a).toBe('Thymine (T)');
  });
});
