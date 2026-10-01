// Header-consistency guards (2026-07-02): generated source text must carry its
// '## ' section headers deterministically, not by model whim. Pins:
//   1. getStructureForLength demands '## ' markdown headers at EVERY length tier
//      (short ≤350-word texts included — the old tier said "Do not use section
//      headers", which is why short generations never had an H2).
//   2. ensureSectionHeader repairs a section that came back without its header
//      (missing marker, missing space, wrong level, bold-line stand-in).
//   3. promoteBoldLineHeaders upgrades standalone bold lines to H2 without
//      touching dialogue speaker labels or emphasized sentences.
//   4. repairSourceMarkdown keeps exactly one H1 (title) — later '# ' lines demote.
//   5. The single-section prompt no longer contradicts the structure instruction.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'content_engine_source.jsx'), 'utf8');
const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// Extract `var NAME = function (...) {...};` via brace counting (regex
// quantifiers like {1,4} are balanced pairs, so counting stays correct).
function extractFn(source, name) {
  const start = source.indexOf(`var ${name} = function`);
  expect(start, `var ${name} = function must exist`).toBeGreaterThan(-1);
  const fnStart = source.indexOf('function', start);
  let i = source.indexOf('{', fnStart);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') { depth--; if (depth === 0) break; }
  }
  // eslint-disable-next-line no-eval
  return eval('(' + source.slice(fnStart, i + 1) + ')');
}

const ensureSectionHeader = extractFn(src, 'ensureSectionHeader');
const promoteBoldLineHeaders = extractFn(src, 'promoteBoldLineHeaders');
const getStructureForLength = extractFn(src, 'getStructureForLength');
const repairSourceMarkdown = extractFn(src, 'repairSourceMarkdown');

describe('getStructureForLength: every tier demands ## headers', () => {
  it('short texts (≤350) now get 2 sections with ## headers', () => {
    const s = getStructureForLength(250);
    expect(s).toContain("'## '");
    expect(s).toContain('2 sections');
    expect(s).not.toMatch(/do not use section headers/i);
  });
  it('remaining tiers keep their section counts and gain explicit ## syntax', () => {
    expect(getStructureForLength(500)).toContain('4 sections');
    expect(getStructureForLength(800)).toContain('6 sections');
    expect(getStructureForLength(1500)).toContain('8 sections');
    [500, 800, 1500].forEach(n => expect(getStructureForLength(n)).toContain("'## '"));
  });
});

describe('ensureSectionHeader: deterministic H2 repair per section', () => {
  it('prepends the planned title when the model skipped the header', () => {
    const out = ensureSectionHeader('First paragraph of prose.\n\nSecond paragraph.', 'Water Cycle Basics');
    expect(out.startsWith('## Water Cycle Basics\n\n')).toBe(true);
    expect(out).toContain('First paragraph of prose.');
  });
  it('forces a wrong-level header back to H2', () => {
    expect(ensureSectionHeader('### Evaporation\n\nProse.', 'Evaporation')).toMatch(/^## Evaporation/);
    expect(ensureSectionHeader('# Evaporation\n\nProse.', 'Evaporation')).toMatch(/^## Evaporation/);
  });
  it('repairs a missing space after the marker', () => {
    expect(ensureSectionHeader('##Evaporation\n\nProse.', 'Evaporation')).toMatch(/^## Evaporation/);
  });
  it('upgrades a whole-line bold stand-in to a real H2', () => {
    expect(ensureSectionHeader('**Evaporation at Work**\n\nProse.', 'Evaporation')).toMatch(/^## Evaporation at Work/);
  });
  it('does NOT double-add when a header already sits within the first content lines', () => {
    const text = 'A short intro sentence.\n\n## Evaporation\n\nProse.';
    expect(ensureSectionHeader(text, 'Evaporation')).toBe(text);
  });
  it('leaves "#1 reason" prose alone (prepends instead of mangling it into a header)', () => {
    const out = ensureSectionHeader('#1 reason clouds form is cooling air.\n\nMore prose.', 'Cloud Formation');
    expect(out.startsWith('## Cloud Formation\n\n')).toBe(true);
    expect(out).toContain('#1 reason clouds form');
  });
});

describe('promoteBoldLineHeaders: bold-line headers become H2, emphasis survives', () => {
  it('promotes a standalone short bold line (not the first content line)', () => {
    const out = promoteBoldLineHeaders('Title line\n\n**How Rain Forms**\n\nProse here.');
    expect(out).toContain('## How Rain Forms');
  });
  it('leaves dialogue speaker labels and sentence-like bold alone', () => {
    const speakers = 'Title line\n\n**Maya:**\n\n**This is a full sentence.**';
    expect(promoteBoldLineHeaders(speakers)).toBe(speakers);
  });
  it('never touches the first content line (title territory)', () => {
    const t2 = '**The Water Cycle**\n\nProse.';
    expect(promoteBoldLineHeaders(t2)).toBe(t2);
  });
});

describe('repairSourceMarkdown: exactly one H1 survives', () => {
  it('demotes any later # line to ## so the outline keeps a single H1', () => {
    const out = repairSourceMarkdown('# The Water Cycle\n\nA paragraph that ends properly and is long enough to matter here.\n\n# Evaporation\n\nAnother paragraph that also ends with a period for the tail check.');
    const h1s = out.split('\n').filter(l => /^#\s/.test(l.trim()));
    expect(h1s).toHaveLength(1);
    expect(out).toContain('## Evaporation');
  });
});

describe('prompt + pipeline pins', () => {
  it('single-section prompt no longer forbids section headers', () => {
    expect(src).not.toContain('No section heading — the article stands on its own');
    expect(src).toContain("Structure the body with short '## ' section headers");
  });
  it('multi-section path enforces the header on every section', () => {
    expect(src).toContain('if (sections.length > 1) sectionText = ensureSectionHeader(sectionText, sectionTitle);');
  });
  it('the chunked exit runs bold-line promotion before cleanup', () => {
    expect(src).toContain('fullDocument = promoteBoldLineHeaders(fullDocument);');
  });
  it('the module pair carries the same guards', () => {
    const mod = readFileSync(resolve(process.cwd(), 'content_engine_module.js'), 'utf8');
    ['ensureSectionHeader', 'promoteBoldLineHeaders'].forEach(n =>
      expect(mod).toContain(`var ${n} = function`));
    expect(mod).toContain('if (sections.length > 1) sectionText = ensureSectionHeader(sectionText, sectionTitle);');
  });
  it('doc pipeline now hints the AI to convert markdown headings to real <h*> elements', () => {
    expect(dp).toContain('hints.hasMarkdownHeadings');
    expect(dp).toMatch(/hasMarkdownHeadings\) parts\.push\('MARKDOWN HEADINGS detected/);
  });
});
