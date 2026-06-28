// Tier 2a (2026-06-24): deterministic DOCUMENT-TITLE -> <h1> proposal. proposeRestyles only proposes section
// headings (h2-h6, AI-selected) and never an <h1> (the outline-safety rule), so a page whose title is a styled
// <div>/<p> kept shipping with no <h1> (audit finding #3). _proposeTitleHeading detects that case
// deterministically (no <h1> + a real title signal + before any heading), gates it through restyleBlock({h1}),
// and proposeRestyles prepends it (surviving an AI failure). It's a PROPOSAL the teacher confirms, never auto-
// applied — so it rides the existing review-queue + apply path (kind:'heading', level:1).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// The restyle library span (checkReadingOrderPreserved → just before the INTERACTIVE comment) now contains
// _proposeTitleHeading + restyleBlock; extract them directly. proposeRestyles is extracted with a mock
// callGemini/stripFence for the integration cases.
const span = dp.slice(dp.indexOf('function checkReadingOrderPreserved(beforeHtml, afterHtml) {'), dp.indexOf('\n// Convert an INTERACTIVE image-placeholder'));
if (span.length < 100) throw new Error('restyle span extraction markers missing');
const lib = new Function(span + '\nreturn { restyleBlock: restyleBlock, _proposeTitleHeading: _proposeTitleHeading };')();
const { restyleBlock, _proposeTitleHeading } = lib;

const _ps = dp.indexOf('const proposeRestyles = async (html, opts) => {');
const _pe = dp.indexOf('\n  };', _ps) + '\n  };'.length;
const propSrc = dp.slice(_ps, _pe).replace('const proposeRestyles', 'var proposeRestyles');
const makePropose = (callGemini) => new Function('callGemini', 'stripFence',
  span + '\n' + propSrc + '\nreturn proposeRestyles;'
)(callGemini, (s) => String(s || '').replace(/```json|```/gi, '').trim());

const dparse = (s) => new DOMParser().parseFromString(String(s), 'text/html');
const propose = (html) => _proposeTitleHeading(String(html), dparse(html));

describe('restyleBlock h1 mode — the outline-safety exception only the title proposer uses', () => {
  it('promotes a styled title block to <h1> when opts.h1 is set', () => {
    const r = restyleBlock('<div style="font-size:24px;font-weight:bold">Weekly Worksheet</div>', 'heading', { h1: true });
    expect(r.ok).toBe(true);
    expect(r.level).toBe(1);
    expect(r.html).toMatch(/^<h1[ >]/);
    expect(dparse(r.html).querySelector('h1').textContent).toBe('Weekly Worksheet');
  });
  it('WITHOUT opts.h1, a heading restyle still never produces <h1> (outline-safety intact)', () => {
    const r = restyleBlock('<p style="font-weight:bold">A Section Title</p>', 'heading', {});
    expect(r.ok).toBe(true);
    expect(r.level).toBeGreaterThanOrEqual(2);
    expect(r.html).not.toMatch(/<h1[ >]/);
  });
  it('the gate still rejects a non-title (full sentence) even in h1 mode', () => {
    const long = '<div style="font-weight:bold">This is a long full sentence of body prose that runs well past a short title and must not become a heading.</div>';
    expect(restyleBlock(long, 'heading', { h1: true }).ok).toBe(false);
  });
});

describe('_proposeTitleHeading: deterministic document-title detection', () => {
  it('proposes <h1> for a heading-styled title block when the doc has no <h1>', () => {
    const p = propose('<html><head></head><body><div style="font-size:28px;font-weight:bold">Photosynthesis Lab</div><p>Intro paragraph.</p></body></html>');
    expect(p).toBeTruthy();
    expect(p.kind).toBe('heading');
    expect(p.level).toBe(1);
    expect(p.title).toBe(true);
    expect(p.html).toMatch(/<h1[ >]/);
    expect(p.preview).toMatch(/Photosynthesis Lab/);
    expect(p.original).toContain('Photosynthesis Lab'); // splice key is the exact source block
  });

  it('uses the <head><title> text as a strong signal even without heading styling', () => {
    const p = propose('<html><head><title>Cell Biology Notes</title></head><body><div>Cell Biology Notes</div><p>x</p></body></html>');
    expect(p).toBeTruthy();
    expect(p.level).toBe(1);
  });

  it('treats an all-bold block as a title signal', () => {
    const p = propose('<html><body><p><strong>Unit 3 Study Guide</strong></p><p>Body.</p></body></html>');
    expect(p).toBeTruthy();
    expect(p.level).toBe(1);
  });

  it('returns null when the document already has an <h1>', () => {
    expect(propose('<html><body><h1>Already a title</h1><div style="font-weight:bold">Something</div></body></html>')).toBe(null);
  });

  it('returns null when the leading block has no title signal (plain prose)', () => {
    expect(propose('<html><body><p>Just an ordinary opening paragraph with no styling at all here.</p></body></html>')).toBe(null);
  });

  it('returns null when a section heading appears before any title block (ambiguous outline)', () => {
    expect(propose('<html><body><h2>Section One</h2><div style="font-weight:bold">A late bold line</div></body></html>')).toBe(null);
  });

  it('does not fire on a long emphasized sentence (the gate rejects non-titles)', () => {
    expect(propose('<html><body><div style="font-weight:bold">This is actually a long emphasized sentence of body text, not a title, so it should be left alone entirely.</div></body></html>')).toBe(null);
  });

  it('skips a container div (only a single title LINE qualifies)', () => {
    expect(propose('<html><body><div style="font-weight:bold"><p>nested para</p><p>another</p></div></body></html>')).toBe(null);
  });
});

describe('proposeRestyles integration — title proposal is prepended + survives an AI failure', () => {
  const DOC = '<html><head><title>Field Guide</title></head><body><div style="font-size:24px;font-weight:bold">Field Guide</div><p>An intro paragraph long enough to be a candidate for restyle suggestions here.</p></body></html>';

  it('prepends the title->h1 proposal ahead of AI picks', async () => {
    const out = await makePropose(async () => JSON.stringify([]))(DOC, {});
    expect(out).toBeTruthy();
    expect(out.proposals.length).toBeGreaterThanOrEqual(1);
    expect(out.proposals[0].kind).toBe('heading');
    expect(out.proposals[0].level).toBe(1);
    expect(out.proposals[0].title).toBe(true);
  });

  it('STILL returns the title proposal when the AI call throws (throttle resilience)', async () => {
    const out = await makePropose(async () => { throw new Error('rate-limited'); })(DOC, {});
    expect(out).toBeTruthy();
    expect(out.proposals.length).toBe(1);
    expect(out.proposals[0].level).toBe(1);
  });

  it('returns null (genuine failure) when the AI throws AND there is no title to offer', async () => {
    const out = await makePropose(async () => { throw new Error('rate-limited'); })(
      '<html><body><p>Plain paragraph, no title signal, nothing to promote here at all today.</p></body></html>', {});
    expect(out).toBe(null);
  });
});

describe('anti-drift: title promotion is wired into the restyle library + proposeRestyles', () => {
  it('source carries the h1-mode, the title proposer, and the proposeRestyles integration', () => {
    expect(dp).toContain('function _proposeTitleHeading(src, dom)');
    expect(dp).toContain('if (opts && opts.h1) {');
    expect(dp).toContain('var _titleProp = _proposeTitleHeading(src, dom);');
    expect(dp).toContain("restyleBlock(outer, 'heading', { h1: true })");
  });
});
