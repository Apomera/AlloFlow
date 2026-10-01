// Dino Lab quiz - q5 and q29 ask the same question and key DIFFERENT answers.
//
//   q5  "Which group includes the long-necked giants?"  -> Sauropodomorpha
//   q29 "Which group were the long-necked giants?"      -> Sauropods
//
// Both are correct: sauropods sit inside Sauropodomorpha. But the quiz walks
// all 34 questions in order and the printable worksheet prints every one with
// its answer key, so a student meets both in one sitting and sees a flat
// contradiction with nothing to resolve it. Worse than a repeat: it teaches
// that one of the two must be wrong.
//
// The fix is not deletion - the repeat is a chance to teach that groups nest.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function quiz() {
  const open = SRC.indexOf('var QUIZ = [');
  expect(open, 'QUIZ not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('\n  ];', open);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open + 11, close + 4).replace(/\n {2}\];/, ']'))();
}

function glossary() {
  const open = SRC.indexOf('var GLOSSARY = [');
  expect(open, 'GLOSSARY not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('\n  ];', open);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open + 15, close + 4).replace(/\n {2}\];/, ']'))();
}

const STOP = new Set(['which', 'what', 'the', 'a', 'of', 'did', 'do', 'does', 'is', 'was',
  'were', 'are', 'how', 'why', 'that', 'and', 'to', 'in', 'for', 'their', 'they', 'it',
  'its', 'some', 'about', 'this', 'with', 'from', 'on', 'at', 'by']);

function contentWords(text) {
  return new Set(String(text).toLowerCase().replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
}

describe('the quiz is internally consistent', () => {
  it('keeps every answer key in range with an explanation', () => {
    const broken = quiz().filter((q) => !Array.isArray(q.options) || q.options.length < 2
      || typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length
      || !q.explain).map((q) => q.id);
    expect(broken, 'malformed questions: ' + broken.join(', ')).toEqual([]);
  });

  it('never offers the same option twice in one question', () => {
    const dupes = quiz().filter((q) => new Set(q.options).size !== q.options.length).map((q) => q.id);
    expect(dupes, 'questions with duplicate options: ' + dupes.join(', ')).toEqual([]);
  });

  it('explains the nesting wherever two questions overlap heavily', () => {
    // A near-duplicate pair is only safe if the learner is told why both
    // answers can be right. Any NEW heavily-overlapping pair must either be
    // reworded or carry an explanation that reconciles them.
    const qs = quiz();
    const unreconciled = [];
    for (let i = 0; i < qs.length; i++) {
      for (let j = i + 1; j < qs.length; j++) {
        const a = contentWords(qs[i].q), b = contentWords(qs[j].q);
        const shared = [...a].filter((w) => b.has(w)).length;
        const overlap = shared / new Set([...a, ...b]).size;
        if (overlap < 0.7) continue;
        const keyA = qs[i].options[qs[i].answer], keyB = qs[j].options[qs[j].answer];
        if (keyA === keyB) continue;
        // Different keys for the same question: one of the two explanations
        // must mention the other answer, or the pair reads as a contradiction.
        const reconciled = (qs[i].explain + ' ' + qs[j].explain).toLowerCase();
        const namesBoth = reconciled.includes(keyA.toLowerCase().replace(/s$/, ''))
          && reconciled.includes(keyB.toLowerCase().replace(/s$/, ''));
        if (!namesBoth) unreconciled.push(`${qs[i].id}/${qs[j].id}: "${keyA}" vs "${keyB}"`);
      }
    }
    expect(unreconciled, 'overlapping questions with unreconciled answers:\n  '
      + unreconciled.join('\n  ')).toEqual([]);
  });

  it('tells the learner that sauropods sit inside Sauropodomorpha', () => {
    const q29 = quiz().find((q) => q.id === 'q29');
    expect(q29, 'q29 is gone - re-check this pair').toBeTruthy();
    expect(q29.explain).toMatch(/Sauropodomorpha/);
    expect(q29.explain.toLowerCase()).toMatch(/inside|within|part of/);
  });
});

describe('every group the quiz keys is defined somewhere', () => {
  it('defines Sauropodomorpha in the glossary', () => {
    // It was a keyed correct answer with no definition anywhere in the tool.
    const terms = glossary().map((g) => g.term);
    expect(terms, 'Sauropodomorpha is keyed as correct but never defined').toContain('Sauropodomorpha');
  });

  it('states the containment in plain words', () => {
    const entry = glossary().find((g) => g.term === 'Sauropodomorpha');
    expect(entry.def.toLowerCase()).toContain('sauropod');
    expect(entry.def.toLowerCase()).toMatch(/not every|but not/);
  });

  it('keeps the glossary free of duplicate terms', () => {
    const terms = glossary().map((g) => g.term);
    const seen = new Set(), dupes = [];
    for (const t of terms) { if (seen.has(t)) dupes.push(t); seen.add(t); }
    expect(dupes, 'duplicate glossary terms: ' + dupes.join(', ')).toEqual([]);
  });

  it('gives every term a definition', () => {
    const empty = glossary().filter((g) => !g.def || !String(g.def).trim()).map((g) => g.term);
    expect(empty, 'terms with no definition: ' + empty.join(', ')).toEqual([]);
  });
});
