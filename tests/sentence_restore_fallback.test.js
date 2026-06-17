// Sentence-restore fallback (#2, 2026-06-17, user-chosen). Before a dual-OCR-agreed dropped word
// lands in the out-of-reading-order Content-recovery appendix, the pipeline now tries to restore its
// WHOLE SOURCE SENTENCE at its natural spot — sentence-level neighbour anchoring is far less ambiguous
// than a single-word splice, so it recovers more content IN READING ORDER without loosening the strict
// single-word unique-anchor gate, and still loses NOTHING (anchorless orphans -> a "Preserved source
// content" section; words with no findable source sentence -> re-appendixed). The 3-pass integration
// below MIRRORS the Auto-restore block in doc_pipeline_source.jsx and MUST stay in sync with it.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const extract = (startMarker, endMarker, name) => {
  const s = src.indexOf(startMarker);
  const e = src.indexOf(endMarker, s);
  if (s === -1 || e === -1) throw new Error('extraction markers for ' + name + ' missing');
  return new Function('warnLog', src.slice(s, e) + '\n; return ' + name + ';')(() => {});
};
const applyWordRestoration = extract(
  'const applyWordRestoration = (html, missingList, sourceText) => {',
  '\n  // ── Stage A: Gemini-targeted sentence re-insertion ──', 'applyWordRestoration');
const restoreSentencesDeterministic = extract(
  'const restoreSentencesDeterministic = (html, missingList, sourceText) => {',
  '\n  // ── Stage D: Duplicate detection', 'restoreSentencesDeterministic');

// Mirror of the call-site 3-pass integration (the doc_pipeline Auto-restore block).
const restoreWithSentenceFallback = (html, missing, source) => {
  const r = applyWordRestoration(html, missing, source);
  let outHtml = r.html || html;
  let unplaceable = Array.isArray(r.unplaceable) ? r.unplaceable.slice() : [];
  let sentRestored = 0;
  if (unplaceable.length > 0) {
    const stripped = outHtml.replace(/<section\b[^>]*\bdata-content-recovery\s*=\s*["']true["'][^>]*>[\s\S]*?<\/section>/gi, '');
    const sr = restoreSentencesDeterministic(stripped, unplaceable, source);
    if (sr && sr.html) {
      outHtml = sr.html;
      sentRestored = Array.isArray(sr.restoredViaSentence) ? sr.restoredViaSentence.length : 0;
      const still = Array.isArray(sr.stillMissing) ? sr.stillMissing : [];
      if (still.length > 0) {
        const re = applyWordRestoration(outHtml, still, source);
        outHtml = (re && re.html) ? re.html : outHtml;
        unplaceable = (re && Array.isArray(re.unplaceable)) ? re.unplaceable : still;
      } else { unplaceable = []; }
    }
  }
  return { html: outHtml, wordInline: r.restored.length, sentRestored, appendix: unplaceable };
};

const htmlText = (html) => { const d = new DOMParser().parseFromString(html, 'text/html'); return (d.body.textContent || '').replace(/\s+/g, ' ').trim(); };
const wrap = (body) => `<!DOCTYPE html><html lang="en"><body><main>${body}</main></body></html>`;

describe('#2 sentence-restore fallback before the appendix', () => {
  it('recovers a whole dropped SENTENCE inline when the single word could not be placed', () => {
    // The middle source sentence was dropped entirely, so "approved" has no single-word anchor (its
    // context words are all gone) and word-restore alone would dump it in the appendix. Sentence
    // restore anchors via the surviving neighbour sentence and re-inserts the sentence in place.
    const html = wrap('<p>The committee met today.</p><p>The meeting then ended.</p>');
    const source = 'The committee met today. The proposal was approved by everyone present. The meeting then ended.';
    const out = restoreWithSentenceFallback(html, [{ word: 'approved' }], source);
    expect(htmlText(out.html)).toContain('proposal was approved by everyone');   // sentence restored INLINE
    expect(out.html).toContain('data-source-restored');                          // as a real placed paragraph
    expect(out.sentRestored).toBeGreaterThan(0);
    expect(out.appendix.map((x) => x.word.toLowerCase())).not.toContain('approved'); // not dumped as a bare word
  });

  it('loses NOTHING — a word with no findable source sentence falls back to the appendix', () => {
    // Source has NO sentence terminators, so sentence-restore finds no source sentence (stillMissing);
    // and the word has no unique single-word anchor either. It must still survive — re-appendixed.
    const html = wrap('<p>completely different remediated content here</p>');
    const source = 'alpha beta gamma Zphqx delta epsilon'; // no . ! ? → no sentences
    const out = restoreWithSentenceFallback(html, [{ word: 'Zphqx' }], source);
    expect(htmlText(out.html)).toContain('Zphqx');           // present SOMEWHERE — not dropped
    expect(out.appendix.map((x) => x.word.toLowerCase())).toContain('zphqx');
  });

  it('a single-word-placeable word is still spliced inline (fallback only fires on the residue)', () => {
    const html = wrap('<p>the board the budget today</p>');
    const out = restoreWithSentenceFallback(html, [{ word: 'approved' }], 'the board approved the budget today');
    expect(htmlText(out.html)).toContain('approved');
    expect(out.wordInline).toBeGreaterThan(0);
  });
});

describe('anti-drift: the call-site wires the sentence fallback', () => {
  it('strips the word appendix, sentence-restores the residue, re-appendixes stillMissing', () => {
    const i = src.indexOf('// Sentence-restore fallback (#2');
    const block = src.slice(i, i + 1800);
    expect(block).toContain('restoreSentencesDeterministic(_stripAppendix(_arHtml), _arUnplaceable, _arSrc)');
    expect(block).toContain('data-content-recovery'); // the strip regex
    expect(block).toContain('applyWordRestoration(_arHtml, _stillMissing, _arSrc)'); // re-appendix
    expect(src).toContain('restoredAsSentence: _sentRestored'); // surfaced in the auto-restore summary
  });
});
