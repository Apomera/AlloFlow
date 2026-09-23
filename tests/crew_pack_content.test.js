// Crew Launch packs · content rules a teacher would notice before the shape suite does.
//
// allopack_catalog.test.js checks that every pack has the SHAPES the renderers read. It does not
// check the authoring rules in docs/ALLOPACK_AUTHORING_PROMPT.md, and dev-tools/audit_allopacks.cjs
// checks them loosely (a term counts as bolded if it is bold ANYWHERE, and only a third missing is
// flagged). Before publishing the twelve Crew packs (2026-09-22) a strict read found week 1 bolding
// the verb "share" (Amara's weekend) while the glossary word "shared" in the three-part test was
// never bold, and week 11 bolding "particular" while its glossary word "part" never was. Students
// read bold as "this is a glossary word", so both taught the wrong word.
//
// Rules, per pack:
//   1. A glossary word the reading USES is bold at its first use in the body (headings do not
//      count). A glossary word the reading never uses is allowed; the house rule in
//      tests/sel_el_primer.test.js is the same ("when the reading uses the word").
//   2. Every bold span in the body is a glossary word (the HOWL statement line excepted).
//   3. Every quiz has a short-answer item and at least one conceptLabel used twice (a retention
//      pair), and every item has a label.
//   4. Every memory-aid card has at least two essential facts.
//   5. Every count in a resource's meta line matches the resource.
//   6. No em or en dashes anywhere (ORIENTATION.md editorial rule).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// CREW_PACK_DIR points the suite at a copy (mutation runs), never at the real packs by accident.
const DIR = process.env.CREW_PACK_DIR ? resolve(process.env.CREW_PACK_DIR) : resolve(process.cwd(), 'allopacks');
const FILES = readdirSync(DIR).filter((f) => /^crew_.*\.allopack\.json$/.test(f)).sort();

// Where the reading uses a glossary word in a form no suffix rule can derive. Keyed by the
// lowercase phrase as it appears in the reading.
const ALIASES = {
  'hold it loosely': 'Hold loosely',
  'shut down': 'Shutdown',
  'asking early': 'Ask early',
  'catches up': 'Catch up',
  perseverance: 'Persevere',
};
const SUFFIXES = "s|es|d|ed|'s|ly|ing|er|ers|ion|ions|al|ive|ively|ies|ied|ation";
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Every surface form of a glossary term: the term, its inflections, and any alias for it.
function formsRe(term) {
  const parts = term.split(/\s+/);
  const last = parts.pop();
  const stem = last.replace(/[ey]$/, '');
  const head = parts.map((p) => esc(p) + '\\s+').join('');
  const alts = [head + '(?:' + esc(last) + '(?:' + SUFFIXES + ')?|' + esc(stem) + '(?:' + SUFFIXES + '))'];
  for (const [phrase, t] of Object.entries(ALIASES)) if (t === term) alts.push(esc(phrase).replace(/ /g, '\\s+'));
  return new RegExp('(?<![A-Za-z])(?:' + alts.join('|') + ')(?![A-Za-z])', 'gi');
}

// Blank headings so a title is not a "first use", keeping character offsets.
const bodyOf = (reading) => reading.replace(/^#.*$/gm, (m) => ' '.repeat(m.length));
const boldSpans = (body) => [...body.matchAll(/\*\*([^*]+)\*\*/g)].map((m) => ({ start: m.index, end: m.index + m[0].length, text: m[1] }));

export function firstUseProblems(pack) {
  const reading = String(pack.history.find((r) => r.type === 'simplified').data);
  const body = bodyOf(reading);
  const spans = boldSpans(body);
  const problems = [];
  for (const g of pack.history.find((r) => r.type === 'glossary').data) {
    const first = formsRe(g.term).exec(body);
    if (!first) continue; // not used in the reading
    if (!spans.some((s) => first.index >= s.start && first.index < s.end)) {
      problems.push('"' + g.term + '" first used as "' + first[0] + '" without bold: ...' + body.slice(Math.max(0, first.index - 40), first.index + 40).replace(/\s+/g, ' ') + '...');
    }
  }
  return problems;
}

export function strayBoldProblems(pack) {
  const reading = String(pack.history.find((r) => r.type === 'simplified').data);
  const terms = pack.history.find((r) => r.type === 'glossary').data.map((g) => g.term);
  const problems = [];
  for (const s of boldSpans(bodyOf(reading))) {
    if (/^HOWL:\s*"/.test(s.text)) continue;
    const ok = terms.some((t) => { const re = formsRe(t); re.lastIndex = 0; const m = re.exec(s.text); return m && m.index === 0 && m[0].length === s.text.length; });
    if (!ok) problems.push('"' + s.text + '" is bold but is not a glossary word');
  }
  return problems;
}

// Exact duplicates, and near ones a student cannot tell apart in the History panel: the same words
// reordered (week 6 had a chart "Verdict or Map?" and a quiz "Map or Verdict?"), or a title that is
// another title behind a "<Family> Challenge: " prefix (week 9's quiz "Where Did It Go?" beside
// "Investigate Challenge: Where Did It Go?").
export function duplicateTitles(pack) {
  const words = (t) => [...new Set(String(t).toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean))].sort().join(' ');
  const bare = (t) => String(t).replace(/^[A-Z][a-z]+ Challenge:\s*/, '').trim().toLowerCase();
  const out = [];
  const H = pack.history;
  for (let i = 0; i < H.length; i++) {
    for (let j = i + 1; j < H.length; j++) {
      const a = H[i].title, b = H[j].title;
      if (a === b || words(a) === words(b) || bare(a) === bare(b)) out.push(a + ' (' + H[i].type + ') ~ ' + b + ' (' + H[j].type + ')');
    }
  }
  return out;
}

describe.each(FILES)('Crew pack content: %s', (file) => {
  const pack = JSON.parse(readFileSync(resolve(DIR, file), 'utf8'));
  const of = (t) => pack.history.find((r) => r.type === t);

  it('bolds every glossary word the reading uses, at its first use', () => {
    expect(firstUseProblems(pack)).toEqual([]);
  });

  it('bolds nothing in the reading that is not a glossary word', () => {
    expect(strayBoldProblems(pack)).toEqual([]);
  });

  it('quiz has a short answer and a retention pair, and every item is labelled', () => {
    const qs = of('quiz').data.questions;
    expect(qs.some((q) => q.type === 'shortAnswer')).toBe(true);
    for (const q of qs) expect(typeof q.conceptLabel === 'string' && q.conceptLabel.length > 0, q.question).toBe(true);
    const counts = {};
    for (const q of qs) counts[q.conceptLabel] = (counts[q.conceptLabel] || 0) + 1;
    expect(Math.max(...Object.values(counts)), JSON.stringify(counts)).toBeGreaterThanOrEqual(2);
  });

  it('every memory-aid card has at least two essential facts', () => {
    for (const c of of('memory-aid').data.cards) expect(c.essentialFacts.length, c.id).toBeGreaterThanOrEqual(2);
  });

  it('every count in a meta line matches its resource', () => {
    const num = (r, re) => { const m = String(r.meta).match(re); expect(m, r.type + ' meta "' + r.meta + '"').toBeTruthy(); return m.slice(1).map(Number); };
    expect(num(of('glossary'), /(\d+) terms/)).toEqual([of('glossary').data.length]);
    expect(num(of('concept-sort'), /(\d+) categories • (\d+) cards/)).toEqual([of('concept-sort').data.categories.length, of('concept-sort').data.items.length]);
    const q = of('quiz').data;
    expect(num(of('quiz'), /(\d+) multiple choice \+ (\d+) short answer • (\d+) reflection/)).toEqual([
      q.questions.filter((x) => x.type === 'mcq').length, q.questions.filter((x) => x.type === 'shortAnswer').length, (q.reflections || []).length]);
    expect(num(of('sentence-frames'), /(\d+) frames/)).toEqual([of('sentence-frames').data.items.length]);
    expect(num(of('faq'), /(\d+) questions/)).toEqual([of('faq').data.length]);
    expect(num(of('memory-aid'), /(\d+) memory aids?/)).toEqual([of('memory-aid').data.cards.length]);
    expect(num(of('anchor-chart'), /(\d+) sections/)).toEqual([of('anchor-chart').data.sections.length]);
    expect(num(of('directions'), /(\d+) goals/)).toEqual([of('directions').data.objectives.length]);
    // A reading meta that states a length must be within 10% of the reading (audit_allopacks rule).
    const claim = String(of('simplified').meta).match(/~?\s*(\d+)\s*words/);
    if (claim) {
      const words = String(of('simplified').data).replace(/[*_#>`]/g, ' ').split(/\s+/).filter((w) => /[a-zA-Z]/.test(w)).length;
      expect(Math.abs(Number(claim[1]) - words) / words).toBeLessThanOrEqual(0.1);
    }
  });

  it('gives every resource a title no other resource in the pack uses', () => {
    // Weeks 7, 10 and 12 shipped a quiz titled like the chart or the reading, so the History
    // panel showed two identical rows and "open the X" could mean either.
    expect(duplicateTitles(pack)).toEqual([]);
  });

  it('has no em or en dashes anywhere', () => {
    const dashes = new RegExp('.{0,30}[' + String.fromCharCode(0x2013, 0x2014) + '].{0,30}', 'g');
    const hits = [...JSON.stringify(pack).matchAll(dashes)].map((m) => m[0]);
    expect(hits).toEqual([]);
  });
});

describe('the checks can fail', () => {
  const pack = () => JSON.parse(readFileSync(resolve(DIR, 'crew_norms_grade6_8.allopack.json'), 'utf8'));
  const withReading = (p, fn) => { const r = p.history.find((x) => x.type === 'simplified'); r.data = fn(r.data); return p; };
  it('flags a glossary word whose first use is not bold', () => {
    const p = withReading(pack(), (s) => s.replace('**shared**', 'shared'));
    expect(firstUseProblems(p).join(' ')).toMatch(/"Shared"/);
  });
  it('flags a bold word that is not in the glossary', () => {
    const p = withReading(pack(), (s) => s.replace('starts to share about', 'starts to **share** about'));
    expect(strayBoldProblems(p).join(' ')).toMatch(/"share"/);
  });
  it('flags two resources with one title', () => {
    const p = pack();
    p.history.find((x) => x.type === 'quiz').title = p.history.find((x) => x.type === 'simplified').title;
    expect(duplicateTitles(p)).toHaveLength(1);
  });
  it('flags the same words reordered, and a title hiding behind a challenge prefix', () => {
    const p = pack();
    const chart = p.history.find((x) => x.type === 'anchor-chart');
    p.history.find((x) => x.type === 'quiz').title = chart.title.split(/\s+/).reverse().join(' ');
    expect(duplicateTitles(p).join(' ')).toMatch(/anchor-chart/);
    const q = pack();
    q.history.find((x) => x.type === 'quiz').title = q.history.find((x) => x.type === 'applied-challenge').title.replace(/^[A-Z][a-z]+ Challenge:\s*/, '');
    expect(duplicateTitles(q).join(' ')).toMatch(/applied-challenge/);
  });
  it('does not count a heading as the first use', () => {
    const p = withReading(pack(), (s) => s);
    expect(bodyOf('## Norms\n\nA **norm** is')).not.toMatch(/Norms/);
    expect(firstUseProblems(p)).toEqual([]);
  });
});
