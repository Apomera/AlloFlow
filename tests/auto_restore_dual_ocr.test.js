// Tests for the dual-OCR automatic text recovery (2026-06-14).
//
// Two things are guarded here:
//   1. The HIGH-CONFIDENCE SELECTION GATE (mirror) — the safety property that we
//      ONLY auto-restore a dropped source word when BOTH OCR engines (Tesseract
//      AND Vision) saw it. A word seen by one engine (possible hallucination), a
//      word already present in the final, and sub-3-char noise are all excluded.
//      This is the discriminator the 2026-06-07 plan lacked when it refused silent
//      auto-restore; the gate is what makes auto-restore safe.
//   2. The "nothing is ever dropped" property of the real applyWordRestoration —
//      runtime-extracted from doc_pipeline_source.jsx (anti-drift, like the docx
//      spec test) — every input word is either spliced back in context OR listed
//      in the Content-recovery appendix.
//
// The selection mirror MUST stay in sync with the Auto-restore block in
// doc_pipeline_source.jsx (the `_arNorm` / `_arSetOf` / `_arMissing` loop).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ── Mirror of the doc_pipeline Auto-restore selection gate ──
const _arNorm = (tk) => String(tk || '').toLowerCase().replace(/­/g, '').replace(/[^a-z0-9'-]/g, '');
const _arSetOf = (s) => {
  const o = new Set();
  for (const p of String(s || '').split(/\s+/)) { const n = _arNorm(p); if (n.length >= 2) o.add(n); }
  return o;
};
function selectHighConfidenceMissing(sourceText, finalText, tessText, visText) {
  const setT = _arSetOf(tessText);
  const setV = _arSetOf(visText);
  const finalSet = _arSetOf(finalText);
  const seen = new Set();
  const out = [];
  for (const raw of (String(sourceText).match(/\S+/g) || [])) {
    const n = _arNorm(raw);
    if (n.length < 3 || seen.has(n)) continue;
    if (finalSet.has(n)) continue;
    if (!(setT.has(n) && setV.has(n))) continue;
    seen.add(n);
    out.push({ word: n });
  }
  return out;
}

describe('dual-OCR auto-restore — high-confidence selection gate', () => {
  it('selects a dropped word that BOTH engines saw', () => {
    const sel = selectHighConfidenceMissing('the quick brown fox', 'the quick fox', 'the quick brown fox', 'the quick brown fox');
    expect(sel.map(s => s.word)).toEqual(['brown']);
  });

  it('EXCLUDES a dropped word only ONE engine saw (possible hallucination)', () => {
    // "brown" missing from final; Tesseract saw it but Vision did not → not high-confidence
    const sel = selectHighConfidenceMissing('the quick brown fox', 'the quick fox', 'the quick brown fox', 'the quick fox');
    expect(sel).toEqual([]);
  });

  it('EXCLUDES a word still present in the final (no false restore)', () => {
    const sel = selectHighConfidenceMissing('alpha beta gamma', 'alpha beta gamma', 'alpha beta gamma', 'alpha beta gamma');
    expect(sel).toEqual([]);
  });

  it('EXCLUDES sub-3-char tokens (article/punctuation noise)', () => {
    // "to" and "of" are dropped and both engines saw them, but they are < 3 chars
    const sel = selectHighConfidenceMissing('report of to district', 'report district', 'report of to district', 'report of to district');
    expect(sel).toEqual([]);
  });

  it('de-dupes repeated source words to a single candidate', () => {
    const sel = selectHighConfidenceMissing('services services services rendered', 'rendered', 'services services rendered', 'services rendered');
    expect(sel.map(s => s.word)).toEqual(['services']);
  });

  it('does nothing when dual-OCR text is absent (gate is off for born-digital)', () => {
    // Caller only runs this when both OCR texts are present; with empties the
    // engine sets are empty so nothing is ever high-confidence.
    const sel = selectHighConfidenceMissing('the quick brown fox', 'the quick fox', '', '');
    expect(sel).toEqual([]);
  });
});

// ── Runtime-extract the REAL applyWordRestoration (anti-drift) ──
const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('const applyWordRestoration = (html, missingList, sourceText) => {');
const end = src.indexOf('\n  // ── Stage A: Gemini-targeted sentence re-insertion ──', start);
if (start === -1 || end === -1) throw new Error('extraction markers for applyWordRestoration missing');
const fnSrc = src.slice(start, end);
// jsdom provides DOMParser/NodeFilter; warnLog is the only free identifier.
const applyWordRestoration = new Function('warnLog', fnSrc + '\n; return applyWordRestoration;')(() => {});

const htmlText = (html) => {
  const d = new DOMParser().parseFromString(html, 'text/html');
  return (d.body.textContent || '').replace(/\s+/g, ' ').trim();
};

describe('applyWordRestoration — nothing is ever dropped', () => {
  const wrap = (body) => `<!DOCTYPE html><html lang="en"><body><main>${body}</main></body></html>`;

  it('splices a confidently-placeable word back in context', () => {
    // source has "the board approved the budget"; final dropped "approved"
    const html = wrap('<p>the board the budget today</p>');
    const r = applyWordRestoration(html, [{ word: 'approved' }], 'the board approved the budget today');
    expect(r.restored.map(x => x.word)).toContain('approved');
    expect(htmlText(r.html)).toContain('approved');
  });

  it('preserves an unplaceable word in the Content-recovery appendix (never dropped)', () => {
    // "Shawn" has no matching context in the final HTML → cannot be placed inline,
    // so it must survive in the appendix rather than vanish.
    const html = wrap('<p>completely unrelated remediated paragraph here</p>');
    const r = applyWordRestoration(html, [{ word: 'Shawn' }], 'the student Shawn Smith was assessed');
    expect(r.unplaceable.map(x => x.word)).toContain('Shawn');
    expect(r.html).toContain('data-content-recovery');
    expect(htmlText(r.html)).toContain('Shawn'); // present SOMEWHERE — not dropped
  });

  it('every input word ends up either restored inline or in the appendix', () => {
    const html = wrap('<p>the board the budget</p>');
    const missing = [{ word: 'approved' }, { word: 'unanimously' }, { word: 'Zphqx' }];
    const r = applyWordRestoration(html, missing, 'the board approved the budget unanimously Zphqx');
    const accounted = new Set(r.restored.map(x => x.word.toLowerCase()).concat(r.unplaceable.map(x => x.word.toLowerCase())));
    for (const m of missing) expect(accounted.has(m.word.toLowerCase())).toBe(true);
  });
});
