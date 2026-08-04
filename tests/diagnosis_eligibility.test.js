// Diagnosis vs. Eligibility — the two contracts this tool must never break.
//
//   1. IT NEVER DECIDES ELIGIBILITY. Eligibility is a team determination about
//      a real child. A tool that simulated it would be wrong in exactly the
//      cases that matter most, so the scenarios ask which QUESTION is still
//      open, never whether a child qualifies.
//   2. IT REPRODUCES NO DSM TEXT. DSM-5-TR is APA-copyrighted; the educational
//      half of the comparison is quoted from law_corpus/ (34 CFR 300.8), the
//      clinical half is described in our own words.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const FILE = 'stem_lab/stem_tool_eligibility.js';
const src = read(FILE);
const idea = JSON.parse(read('law_corpus/idea-part-b.json'));

// The SHIPPED category extractor, run against the real corpus.
const cats = (() => {
  const a = src.indexOf('function categoriesFromCorpus');
  const b = src.indexOf('// ── Framing content');
  expect(a, 'categoriesFromCorpus present').toBeGreaterThan(-1);
  const box = {};
  new Function('box', '_idea', 'section', src.slice(a, b) + 'box.cats = categoriesFromCorpus;')(
    box, idea, (n) => idea.sections.find((s) => s.number === n));
  return box.cats();
})();

describe('Diagnosis vs. Eligibility — categories come from the law', () => {
  it('extracts all 13 IDEA categories from § 300.8, not a hardcoded list', () => {
    expect(cats.length).toBe(13);
    const names = cats.map((c) => c.name.toLowerCase());
    // The three that sub-markers hid on the first attempt: "(1)(i) Autism",
    // "(4)(i) Emotional disturbance", "(10) Specific learning disability—(i)".
    for (const must of ['autism', 'emotional disturbance', 'specific learning disability',
      'deaf-blindness', 'intellectual disability', 'other health impairment',
      'traumatic brain injury', 'speech or language impairment']) {
      expect(names.includes(must), 'missing category: ' + must).toBe(true);
    }
    expect(cats.map((c) => Number(c.n))).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13]);
  });

  it('quotes each category verbatim from the corpus', () => {
    const s300_8 = idea.sections.find((s) => s.number === '300.8');
    for (const c of cats) {
      expect(s300_8.paragraphs.includes(c.text), c.name + ' text must be a real corpus paragraph').toBe(true);
    }
  });

  it('renders nothing rather than inventing categories when the corpus is missing', () => {
    // Mirrors the Law Navigator's refusal branch.
    expect(src).toMatch(/rather than restating it from memory/i);
    expect(src).toContain('cats_err');
  });
});

describe('Diagnosis vs. Eligibility — never decides, never reproduces DSM', () => {
  it('offers only open questions, never an eligibility verdict', () => {
    const seg = src.match(/var QUESTIONS = \[([\s\S]*?)\];/)[1];
    expect(seg).not.toMatch(/\beligible\b/i);
    // Every scenario answer must be one of the question ids.
    const qids = [...seg.matchAll(/id: '([a-z_]+)'/g)].map((m) => m[1]);
    const answers = [...src.matchAll(/answer:\s*'([a-z_]+)'/g)].map((m) => m[1]);
    expect(answers.length).toBeGreaterThanOrEqual(4);
    for (const a of answers) expect(qids.includes(a), 'answer ' + a + ' is not a question id').toBe(true);
    // And it says so to the reader.
    expect(src).toMatch(/None of these has an "eligible" or "not eligible" answer/i);
  });

  it('contains no DSM criteria and says why', () => {
    // Criteria-shaped prose would mean copyrighted text slipped in.
    for (const tell of [
      /\bA\.\s+Persistent pattern\b/i,
      /\bfive \(or more\) of the following symptoms\b/i,
      /\bmust be present (?:for|in) at least\b/i,
      /\bDiagnostic Criteria\b/
    ]) {
      expect(src, 'criteria-shaped prose in source').not.toMatch(tell);
    }
    expect(src).toMatch(/copyrighted by the American Psychiatric Association/i);
  });

  it('teaches the two-prong test, the part most readers miss', () => {
    expect(src).toMatch(/by reason thereof/i);
    expect(src).toMatch(/Both, not either/i);
    // Both directions of the confusion are covered.
    expect(src).toMatch(/can still end in "not eligible"/i);
    expect(src).toMatch(/eligible with no clinical diagnosis at all/i);
  });

  it('keeps a private evaluation in its true role: considered, not binding', () => {
    expect(src).toMatch(/must be CONSIDERED/);
    expect(src).toMatch(/not required to adopt/i);
  });

  it('carries a not-legal-not-clinical disclaimer', () => {
    expect(src).toMatch(/not legal or clinical advice/i);
    expect(src).toMatch(/determined by a team/i);
  });
});

describe('Diagnosis vs. Eligibility — wiring and render', () => {
  beforeEach(() => resetStemLab());

  it('renders without a network instead of throwing', () => {
    const cfg = loadTool(FILE, 'diagnosisEligibility');
    expect(typeof cfg.render).toBe('function');
    const html = renderTool('diagnosisEligibility', {});
    expect(html.length).toBeGreaterThan(400);
    // Framing content is local, so it shows even with no corpus.
    expect(html).toMatch(/Two systems asking different questions/);
    // Categories are NOT invented in that state.
    expect(html).toMatch(/Loading the official text|could not be loaded/);
  });

  it('quest hooks read defensively', () => {
    const cfg = loadTool(FILE, 'diagnosisEligibility');
    for (const q of cfg.questHooks) {
      expect(() => q.check({}), q.id).not.toThrow();
      expect(() => q.check(undefined), q.id).not.toThrow();
      expect(() => q.progress(undefined), q.id).not.toThrow();
    }
  });

  it('is registered, tiled, flagged, aliased, loaded in both ANTI copies and built', () => {
    expect(src).toContain("registerTool('diagnosisEligibility'");
    const mod = read('stem_lab/stem_lab_module.js');
    expect(mod).toContain("id: 'diagnosisEligibility'");
    expect(mod).toContain('diagnosisEligibility: true');
    expect(mod).toMatch(/diagnosisEligibility: '[^']*two prong/);
    for (const anti of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      expect(read(anti), anti).toContain('stem_lab/stem_tool_eligibility.js');
    }
    expect(read('build.js')).toContain('stem_lab/stem_tool_eligibility.js');
    expect(read('desktop/web-app/public/stem_lab/stem_tool_eligibility.js')).toBe(src);
  });
});
