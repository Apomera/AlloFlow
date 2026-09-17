// Grounding in the user's own imported sources (2026-09-16).
//
// Three things are pinned here, all against the REAL shipped source rather than
// a local copy of the logic:
//   1. the evidence sanitizer keeps a local source that has no web URL, while
//      still dropping everything it dropped before;
//   2. the Lumen engine the generator retrieves through stays provider-neutral;
//   3. a quotation attributed to an imported document is verified word-for-word.
//
// Each helper is extracted from the file on disk, so deleting or weakening the
// shipped implementation fails these tests instead of silently passing.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const AI_BACKEND = path.join(ROOT, 'ai_backend_module.js');
const CONTENT_ENGINE = path.join(ROOT, 'content_engine_module.js');

function readSource(file) {
  return fs.readFileSync(file, 'utf8');
}

// ── Extract the sanitizer (plus its local-locator helper) from the shipped file ──
function loadSanitizer() {
  const src = readSource(AI_BACKEND);
  const start = src.indexOf('_sanitizeEvidenceResults(results) {');
  const end = src.indexOf('_buildGroundingMetadata(results) {');
  expect(start, '_sanitizeEvidenceResults must exist in ai_backend_module.js').toBeGreaterThan(-1);
  expect(end, '_buildGroundingMetadata must exist in ai_backend_module.js').toBeGreaterThan(start);

  const block = src.slice(start, end);
  // Drop the trailing jsdoc that introduces the next method.
  const cut = block.lastIndexOf('/**');
  const body = block.slice(0, cut === -1 ? block.length : cut).trim().replace(/,$/, '');

  const ALLO_SOURCE_SCHEME = 'allo-source:';
  // eslint-disable-next-line no-eval
  return eval('({' + body + '})');
}

// ── Extract the quote verifier from the shipped file ──
function loadQuoteVerifier() {
  const src = readSource(CONTENT_ENGINE);
  const start = src.indexOf('var _normalizeQuoteText =');
  const end = src.indexOf('var computeGroundingSupportStats =');
  expect(start, 'verifyQuotesAgainstOwnSources must exist in content_engine_module.js').toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const scope = {};
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn verifyQuotesAgainstOwnSources;')();
}

describe('evidence sanitizer accepts the user\'s own sources', () => {
  const sanitize = () => loadSanitizer();

  it('keeps an imported document that has no web URL', () => {
    const out = sanitize()._sanitizeEvidenceResults([
      { title: 'District Policy', local: true, sourceId: 'src_policy', locatorLabel: 'page 4', snippet: 'ninety minutes' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('allo-source://src_policy#page-4');
    expect(out[0].snippet).toBe('ninety minutes');
  });

  it('still keeps ordinary web results unchanged', () => {
    const out = sanitize()._sanitizeEvidenceResults([
      { title: 'Web page', url: 'https://example.org/a', snippet: 'from the web' },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://example.org/a');
  });

  it('does NOT let a remote result that lost its URL sneak through', () => {
    // The local branch is opt-in. Without local:true this must drop exactly as
    // it always did, so a malformed search response cannot become citable.
    const out = sanitize()._sanitizeEvidenceResults([
      { title: 'Remote result, no url', snippet: 'unattributable' },
    ]);
    expect(out).toHaveLength(0);
  });

  it('keeps refusing non-http schemes', () => {
    const out = sanitize()._sanitizeEvidenceResults([
      { title: 'local file', url: 'file:///C:/secret.pdf', snippet: 'x' },
      { title: 'data uri', url: 'data:text/html,<script>alert(1)</script>', snippet: 'x' },
    ]);
    expect(out).toHaveLength(0);
  });

  it('rejects a path-like source id rather than sanitizing it into a citation', () => {
    const out = sanitize()._sanitizeEvidenceResults([
      { title: 'traversal', local: true, sourceId: '../../etc/passwd', locatorLabel: 'x', snippet: 'x' },
    ]);
    expect(out).toHaveLength(0);
  });

  it('mints a locator that cannot be dereferenced', () => {
    const out = sanitize()._sanitizeEvidenceResults([
      { title: 'Doc', local: true, sourceId: 'src_a', locatorLabel: 'lines 4-5', snippet: 'x' },
    ]);
    expect(out[0].url.startsWith('allo-source://')).toBe(true);
    expect(out[0].url).not.toMatch(/^https?:/);
    expect(out[0].url).not.toMatch(/^file:/);
  });
});

describe('the retrieval engine the generator uses is provider-neutral', () => {
  // If this ever fails, grounding in the user's own sources has quietly become
  // tied to one vendor, which is the property the feature was chosen for.
  it('names no AI provider, API key, or network call', () => {
    const engine = readSource(path.join(ROOT, 'stem_lab', 'stem_lumen_evidence.js'));
    expect(engine).not.toMatch(/gemini|openai|anthropic|claude/i);
    expect(engine).not.toMatch(/apiKey|api_key/i);
    expect(engine).not.toMatch(/\bfetch\s*\(/);
  });

  it('accepts a grounded reply whose quote is in the cited passage, and rejects one that is not', async () => {
    const E = (await import('../stem_lab/stem_lumen_evidence.js')).default
      || require('../stem_lab/stem_lumen_evidence.js');

    let project = E.makeProject({ title: 'test' });
    project = E.upsertSource(project, {
      id: 'src_policy',
      title: 'District Policy',
      content: '# Assessment Windows\nBenchmark assessment occurs three times per year: fall, winter, and spring.',
      type: 'document',
      importMethod: 'local-file',
    });

    const hits = E.retrieve(project, 'how often is benchmark assessment given?');
    expect(hits.length).toBeGreaterThan(0);
    const id = hits[0].node.id;

    const supported = JSON.stringify({
      insufficientEvidence: false,
      claims: [{ text: 'Benchmarks happen three times a year.', evidenceIds: [id], quote: 'three times per year' }],
    });
    const fabricated = JSON.stringify({
      insufficientEvidence: false,
      claims: [{ text: 'Benchmarks happen monthly.', evidenceIds: [id], quote: 'monthly benchmark testing' }],
    });

    expect(E.validateGroundedResponse(supported, hits).ok).toBe(true);

    const bad = E.validateGroundedResponse(fabricated, hits);
    expect(bad.ok).toBe(false);
    expect(bad.claims).toHaveLength(0);
    expect(bad.errors.join(' ')).toMatch(/not present in its cited passage/);
  });
});

describe('quotations attributed to the user\'s documents are verified', () => {
  const evidence = [
    { snippet: 'Benchmark assessment occurs three times per year: fall, winter, and spring.' },
    { snippet: 'Multilingual learners receive scaffolded vocabulary previews before each unit.' },
  ];

  it('matches a faithful quotation', () => {
    const r = loadQuoteVerifier()('The policy states "Benchmark assessment occurs three times per year" clearly.', evidence);
    expect(r.checked).toBe(1);
    expect(r.supported).toBe(1);
    expect(r.unsupported).toHaveLength(0);
  });

  it('flags a fabricated quotation', () => {
    const r = loadQuoteVerifier()('The handbook says "Benchmark testing happens every single month" here.', evidence);
    expect(r.checked).toBe(1);
    expect(r.supported).toBe(0);
    expect(r.unsupported[0]).toMatch(/every single month/);
  });

  it('checks curly quotes, not only straight ones', () => {
    // Regression pin: the curly-quote alternative was once written with plain
    // ASCII quotes, which made it identical to the straight-quote branch and
    // silently stopped it matching anything.
    const text = 'It says \u201CMultilingual learners receive scaffolded vocabulary previews\u201D plainly.';
    const r = loadQuoteVerifier()(text, evidence);
    expect(r.checked).toBe(1);
    expect(r.supported).toBe(1);
  });

  it('separates supported from unsupported in the same text', () => {
    const r = loadQuoteVerifier()(
      'One says "fall, winter, and spring" but another says "assessments are optional for grade 3".',
      evidence,
    );
    expect(r.checked).toBe(2);
    expect(r.supported).toBe(1);
    expect(r.unsupported).toHaveLength(1);
  });

  it('reports nothing when the text quotes nothing', () => {
    const r = loadQuoteVerifier()('Assessment happens several times a year, per district guidance.', evidence);
    expect(r.checked).toBe(0);
    expect(r.unsupported).toHaveLength(0);
  });

  it('is inert when there are no imported sources', () => {
    const r = loadQuoteVerifier()('Something "quoted at length here for testing" in the text.', []);
    expect(r.checked).toBe(0);
    expect(r.supported).toBe(0);
  });
});
