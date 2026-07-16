// @vitest-environment jsdom
// Vision alt-vs-image spot check (2026-07-13). The alt-quality heuristics catch
// information-FREE alts; this catches plausible-but-WRONG ones (the auditor
// scores alts from HTML with image bytes stripped, so a confident wrong alt
// passed every layer). Eval-slices the factory helper with injected deps.
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipe = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const start = pipe.indexOf('const _visionAltSpotCheck = async');
const end = pipe.indexOf('const fixAndVerifyPdf = async', start);
if (start < 0 || end < 0) throw new Error('spot-check slice markers missing');
const makeSpotCheck = (callGeminiVision, altQuality) => new Function(
  'callGeminiVision', '_alloAltQuality', 'DOMParser', 'window',
  pipe.slice(start, end) + '\nreturn _visionAltSpotCheck;'
)(callGeminiVision, altQuality || (() => ({ issues: [] })), globalThis.DOMParser, {});

const png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const img = (alt, b64 = png1x1) => `<img alt="${alt}" src="data:image/png;base64,${b64}">`;
const doc = (body) => `<!DOCTYPE html><html><body>${body}</body></html>`;

describe('_visionAltSpotCheck', () => {
  it('flags a plausible-but-wrong alt as a disagreement, with the model reason and suggestion', async () => {
    const calls = [];
    const fn = makeSpotCheck(async (prompt, b64, mime) => {
      calls.push({ prompt, b64, mime });
      return '{"match": false, "reason": "the image shows a cat, not a rainfall chart", "betterAlt": "A cat sitting on a couch"}';
    });
    const r = await fn(doc(img('Bar chart of rainfall by month')), { sample: 2 });
    expect(calls.length).toBe(1);
    expect(calls[0].prompt).toContain('Bar chart of rainfall by month');
    expect(calls[0].mime).toBe('image/png');
    expect(r.checked).toBe(1);
    expect(r.disagreements.length).toBe(1);
    expect(r.disagreements[0].reason).toContain('cat');
    expect(r.disagreements[0].suggestion).toContain('couch');
  });

  it('a matching alt produces evidence with zero disagreements', async () => {
    const fn = makeSpotCheck(async () => '{"match": true, "reason": "accurate"}');
    const r = await fn(doc(img('A red square')), { sample: 1 });
    expect(r.checked).toBe(1);
    expect(r.disagreements.length).toBe(0);
  });

  it('throttle/garbage responses are NOT evidence — returns null, never a fabricated verdict', async () => {
    const throttled = makeSpotCheck(async () => { throw new Error('API_QUOTA_EXHAUSTED'); });
    expect(await throttled(doc(img('anything')), { sample: 1 })).toBeNull();
    const garbage = makeSpotCheck(async () => 'sorry, I cannot help with that');
    expect(await garbage(doc(img('anything')), { sample: 1 })).toBeNull();
  });

  it('prioritizes plausible unflagged alts because they are the heuristic blind spot', async () => {
    const seen = [];
    const fn = makeSpotCheck(
      async (prompt) => { seen.push(prompt); return '{"match": true, "reason": "ok"}'; },
      (alt) => ({ issues: alt === 'image' ? ['boilerplate'] : [] })
    );
    const html = doc(img('A detailed caption of the water cycle') + img('image'));
    const r = await fn(html, { sample: 1 });
    expect(r.checked).toBe(1);
    expect(seen[0]).toContain('"A detailed caption of the water cycle"');
  });

  it('resolves production deferred-image tokens without restoring them into the HTML', async () => {
    const calls = [];
    const fn = makeSpotCheck(async (prompt, b64, mime) => {
      calls.push({ prompt, b64, mime });
      return '{"match": true, "reason": "accurate"}';
    });
    const token = '__ALLOFLOW_DATAURL_FINAL_7__';
    const html = doc('<img alt="A red square" src="' + token + '">');
    const r = await fn(html, {
      sample: 1,
      deferredImages: { [token]: 'data:image/png;base64,' + png1x1 },
    });
    expect(r.checked).toBe(1);
    expect(calls).toEqual([{ prompt: expect.stringContaining('A red square'), b64: png1x1, mime: 'image/png' }]);
  });

  it('skips empty alts, non-data images, and oversized images entirely', async () => {
    const calls = [];
    const fn = makeSpotCheck(async () => { calls.push(1); return '{"match": true, "reason": "ok"}'; });
    const huge = 'A'.repeat(128);
    const html = doc(
      `<img alt="" src="data:image/png;base64,${png1x1}">` +
      '<img alt="remote" src="https://example.com/x.png">' +
      `<img alt="too big" src="data:image/png;base64,${huge}">`
    );
    expect(await fn(html, { sample: 3, maxImageBytes: 16 })).toBeNull();
    expect(calls.length).toBe(0);
  });
});

describe('pipeline wiring (anti-drift)', () => {
  it('runs after the heuristic scan, batch-aware, and rides the altQuality note plumbing', () => {
    expect(pipe).toContain('await _visionAltSpotCheck(accessibleHtml, {');
    expect(pipe).toContain('deferredImages: _deferredImageMap');
    expect(pipe).toContain('A Vision spot-check compared ');
    expect(pipe).toContain('A wrong description is worse than a missing one for a screen-reader user');
    expect(pipe).toContain('visionAltSpotCheck: _visionAltSpotCheck');
  });
  it('aborted runs stop sampling (abort signal polled between calls)', () => {
    const sliceText = pipe.slice(start, end);
    expect(sliceText).toContain('window.__alloPdfAbortSignal && window.__alloPdfAbortSignal.aborted) break;');
  });
});
