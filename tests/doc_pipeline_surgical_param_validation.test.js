// Param-validation tests for the surgical-tool registry — the
// categoHistoryHistory class of bug.
//
// Background (2026-06-07): Gemini's surgical-diagnosis pass emitted a
// hallucinated directive `{tool:'fix_contrast', oldColor:'ry', newColor:'HistoryHistory'}`.
// The unguarded dispatcher ran it, fix_contrast did a global regex replace
// across the WHOLE HTML chunk, and `'category'.replace(/ry/gi,'HistoryHistory')`
// produced exactly 'categoHistoryHistory' — byte-for-byte the corruption
// observed in the user's accessible-HTML output.
//
// MIRROR DISCIPLINE (same as tests/doc_pipeline_wcag.test.js): the tool
// functions are copied verbatim from doc_pipeline_source.jsx so they run
// headless under vitest with no factory wiring. If you change a guard regex
// in the source, update the mirror here and re-run.
//
// Source line refs as of 2026-06-07.

import { describe, it, expect } from 'vitest';

// ── Mirror: escapeForRegex (doc_pipeline_source.jsx:1364) ──
const escapeForRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Silence the warnLog side-effect in tests; we assert on returned bytes only.
const warnLog = () => {};

// ── Mirror: fix_lang_span (doc_pipeline_source.jsx:1560-1578) ──
const fix_lang_span = (html, p) => {
  if (!p.text || !p.lang) return html;
  if (!/^[a-zA-Z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(String(p.lang).trim())) {
    try { warnLog('[fix_lang_span] rejected non-BCP47 lang: ' + JSON.stringify(p.lang).slice(0, 100)); } catch (_) {}
    return html;
  }
  if (String(p.text).length < 2) return html;
  return html.replace(new RegExp(escapeForRegex(p.text)), '<span lang="' + p.lang + '">' + p.text + '</span>');
};

// ── Mirror: fix_contrast (doc_pipeline_source.jsx:1579-1597) ──
const fix_contrast = (html, p) => {
  if (!p.oldColor || !p.newColor) return html;
  if (!/^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-zA-Z]{3,30})$/.test(String(p.oldColor).trim())) {
    try { warnLog('[fix_contrast] rejected non-color oldColor: ' + JSON.stringify(p.oldColor).slice(0, 100)); } catch (_) {}
    return html;
  }
  return html.replace(new RegExp(escapeForRegex(p.oldColor), 'gi'), p.newColor);
};

// ── Mirror: dispatcher growth guard (doc_pipeline_source.jsx:1909-1929, 7746-7763, 8232-8249) ──
// Applies a tool to a chunk and rejects the result if it grew by >25%.
const dispatchWithGrowthGuard = (tool, chunk, fix) => {
  const before = chunk;
  let after = before;
  try { after = tool(chunk, fix); } catch (_) { after = before; }
  if (after !== before && after.length > before.length * 1.25) return before;
  return after;
};

describe('fix_contrast param validation', () => {
  it('accepts #hex color', () => {
    const html = '<p style="color:#000">x</p>';
    expect(fix_contrast(html, { oldColor: '#000', newColor: '#111' })).toBe('<p style="color:#111">x</p>');
  });

  it('accepts #hex8 (with alpha)', () => {
    const html = '<p style="color:#000000ff">x</p>';
    expect(fix_contrast(html, { oldColor: '#000000ff', newColor: '#111111ff' })).toContain('#111111ff');
  });

  it('accepts named color', () => {
    const html = '<p style="color:red">x</p>';
    expect(fix_contrast(html, { oldColor: 'red', newColor: 'crimson' })).toContain('crimson');
  });

  it('accepts rgb()', () => {
    const html = '<p style="color:rgb(0,0,0)">x</p>';
    expect(fix_contrast(html, { oldColor: 'rgb(0,0,0)', newColor: 'rgb(20,20,20)' })).toContain('rgb(20,20,20)');
  });

  it('accepts rgba()', () => {
    expect(fix_contrast('<p style="color:rgba(0,0,0,0.5)">x</p>', { oldColor: 'rgba(0,0,0,0.5)', newColor: 'rgba(20,20,20,0.5)' })).toContain('rgba(20,20,20,0.5)');
  });

  it('REJECTS the categoHistoryHistory class — non-color oldColor', () => {
    // The exact bug pattern from 2026-06-07
    const out = fix_contrast('<p>they fall under the category of records</p>', { oldColor: 'ry', newColor: 'HistoryHistory' });
    expect(out).toBe('<p>they fall under the category of records</p>');
    expect(out).not.toContain('HistoryHistory');
    expect(out).not.toContain('categoHistoryHistory');
  });

  it('REJECTS arbitrary 2-letter substring as oldColor', () => {
    expect(fix_contrast('<p>history</p>', { oldColor: 'st', newColor: 'XX' })).toBe('<p>history</p>');
  });

  it('REJECTS a word that happens to be too long for a named color', () => {
    // "categoryclassification" — 22 chars, all letters → passes the 3-30 named-color band,
    // which is intentional; CSS allows arbitrary case-insensitive color names. The real
    // protection is the dispatcher growth guard below, not the regex alone.
    const out = fix_contrast('<p>x</p>', { oldColor: 'thisparticularlongstringthatishopelong', newColor: 'X' });
    expect(out).toBe('<p>x</p>');
  });

  it('REJECTS oldColor with special punctuation (not a color)', () => {
    expect(fix_contrast('<p>x</p>', { oldColor: 'ry "with quotes"', newColor: 'X' })).toBe('<p>x</p>');
    expect(fix_contrast('<p>x</p>', { oldColor: 'ry.dot', newColor: 'X' })).toBe('<p>x</p>');
  });

  it('passes through when params are missing', () => {
    expect(fix_contrast('<p>x</p>', { oldColor: '', newColor: '#000' })).toBe('<p>x</p>');
    expect(fix_contrast('<p>x</p>', { oldColor: '#000', newColor: '' })).toBe('<p>x</p>');
  });
});

describe('fix_lang_span param validation', () => {
  it('accepts BCP-47 primary tag', () => {
    expect(fix_lang_span('<p>bonjour</p>', { text: 'bonjour', lang: 'fr' })).toContain('lang="fr"');
  });

  it('accepts BCP-47 with region', () => {
    expect(fix_lang_span('<p>color</p>', { text: 'color', lang: 'en-US' })).toContain('lang="en-US"');
  });

  it('accepts 3-letter primary tag (e.g. fil for Filipino)', () => {
    expect(fix_lang_span('<p>kamusta</p>', { text: 'kamusta', lang: 'fil' })).toContain('lang="fil"');
  });

  it('REJECTS the categoHistoryHistory class — non-BCP47 lang', () => {
    const out = fix_lang_span('<p>category</p>', { text: 'ry', lang: 'HistoryHistory' });
    expect(out).toBe('<p>category</p>');
    expect(out).not.toContain('HistoryHistory');
  });

  it('REJECTS lang with punctuation', () => {
    expect(fix_lang_span('<p>x</p>', { text: 'foo', lang: 'fr_FR' })).toBe('<p>x</p>'); // underscore not hyphen
    expect(fix_lang_span('<p>x</p>', { text: 'foo', lang: 'fr.FR' })).toBe('<p>x</p>');
  });

  it('REJECTS too-short text (defensive — single chars are too risky)', () => {
    expect(fix_lang_span('<p>category</p>', { text: 'r', lang: 'fr' })).toBe('<p>category</p>');
  });

  it('passes through when params are missing', () => {
    expect(fix_lang_span('<p>x</p>', { text: '', lang: 'fr' })).toBe('<p>x</p>');
    expect(fix_lang_span('<p>x</p>', { text: 'foo', lang: '' })).toBe('<p>x</p>');
  });
});

describe('dispatcher growth-ratio guard (>1.25x rejected)', () => {
  // Class defense: even if a future surgical tool ships without param validation,
  // a single directive that grows the chunk by more than 25% is rejected.
  // This catches the hypothetical scenario where Gemini hallucinates a directive
  // for a tool we haven't yet hardened with regex validation.

  it('accepts a small growth (legitimate ARIA/markup insertion)', () => {
    const grew10pct = (html) => html + '<span aria-label="x"></span>'; // small append
    const out = dispatchWithGrowthGuard(grew10pct, '<div>'.repeat(100), {});
    expect(out.length).toBeGreaterThan(500); // accepted, has the addition
  });

  it('REJECTS a 50% growth — the categoHistoryHistory amplification', () => {
    // Simulates the unguarded fix_contrast with a 2-char → 14-char substring blow-up
    const blowUp = (html) => html.replace(/ry/gi, 'HistoryHistory');
    const before = 'category every very fury ' + 'category every very fury '.repeat(50);
    const out = dispatchWithGrowthGuard(blowUp, before, { tool: 'fix_contrast' });
    expect(out).toBe(before); // rejected, chunk unchanged
    expect(out).not.toContain('HistoryHistory');
  });

  it('REJECTS even a 30% growth on a small chunk', () => {
    const blowUp = (html) => html.repeat(2);
    const out = dispatchWithGrowthGuard(blowUp, '<p>hello</p>', {});
    expect(out).toBe('<p>hello</p>');
  });

  it('passes through tool exceptions without crashing', () => {
    const broken = () => { throw new Error('boom'); };
    expect(dispatchWithGrowthGuard(broken, '<p>x</p>', {})).toBe('<p>x</p>');
  });
});

describe('acceptFixedHtmlDetailed upper-bound floor (whole-document)', () => {
  // Mirror of doc_pipeline_source.jsx:498-540 — just the growth ceilings we just added.
  // Catches the case where multiple individually-small directives compound past
  // the per-directive guard, OR a tool we haven't wrapped yet.
  const textCharCount = (h) => String(h).replace(/<[^>]+>/g, '').length;

  const acceptFloor = (fixed, original, opts) => {
    const sizeFloor = (opts && opts.sizeFloor) || 0.95;
    const textFloor = (opts && opts.textFloor) || 0.97;
    const sizeCeiling = (opts && opts.sizeCeiling) || 1.40;
    const textCeiling = (opts && opts.textCeiling) || 1.25;
    const sizeRatio = fixed.length / original.length;
    if (sizeRatio < sizeFloor) return { accepted: false, reason: 'size-shrink' };
    if (sizeRatio > sizeCeiling) return { accepted: false, reason: 'size-growth-unexpected' };
    const origText = textCharCount(original);
    const fixedText = textCharCount(fixed);
    if (origText > 0 && fixedText < origText * textFloor) return { accepted: false, reason: 'text-shrink' };
    if (origText > 0 && fixedText > origText * textCeiling) return { accepted: false, reason: 'text-growth-unexpected' };
    return { accepted: true };
  };

  it('accepts legitimate growth (ARIA/lang/header markup added) on a realistically-sized doc', () => {
    // Realistic: a paragraph-sized chunk with ARIA additions stays inside the 1.40
    // size / 1.25 text ceilings. Tiny docs are dominated by markup overhead — the
    // ceilings are tuned for chunk-sized inputs (kilobytes), not 30-byte stubs.
    const original = '<html><body>' + ('<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>').repeat(8) + '</body></html>';
    const fixed = '<html lang="en"><body role="main">' + ('<p aria-label="paragraph">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>').repeat(8) + '</body></html>';
    const result = acceptFloor(fixed, original);
    expect(result.accepted).toBe(true);
  });

  it('REJECTS text growth >25% (categoHistoryHistory whole-doc, text-dominant)', () => {
    // Text-dominant chunk: 95% body text vs ~5% markup. The "ry"→"HistoryHistory"
    // blow-up affects both the text-ratio and the size-ratio; the size check fires
    // first because it's a simpler signal — that's fine, "size-growth-unexpected"
    // is also a valid rejection (the bug is caught either way).
    const original = '<p>' + ('category every very fury merry library history mystery ').repeat(50) + '</p>';
    const fixed = '<p>' + ('category every very fury merry library history mystery ').replace(/ry/g, 'HistoryHistory').repeat(50) + '</p>';
    const result = acceptFloor(fixed, original);
    expect(result.accepted).toBe(false);
    // Either reason is correct — both catch the bug:
    expect(['text-growth-unexpected', 'size-growth-unexpected']).toContain(result.reason);
  });

  it('REJECTS HTML growth >40% (mass tag injection)', () => {
    const original = '<p>x</p>'.repeat(100);
    // Wrap each tag in another span — doubles the markup
    const fixed = original.replace(/<p>x<\/p>/g, '<span><b><p>x</p></b></span>');
    const result = acceptFloor(fixed, original);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('size-growth-unexpected');
  });

  it('REJECTS text shrink (existing floor still works)', () => {
    // Keep size in band (>0.95) but drop text content so text-shrink fires first.
    // 100 words → 1 word, but pad with markup to keep size close to original.
    const wordPara = 'word '.repeat(100); // ~500 chars text
    const original = '<p>' + wordPara + '</p>';
    const padding = '<!-- comment -->'.repeat(31); // ~500 chars markup (no text)
    const fixed = '<p>word</p>' + padding;
    const result = acceptFloor(fixed, original);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('text-shrink');
  });
});
