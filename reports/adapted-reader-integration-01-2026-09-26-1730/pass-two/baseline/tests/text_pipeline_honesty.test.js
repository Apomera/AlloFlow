// Honesty-label hardening (2026-06-24): three overclaim fixes surfaced by a pipeline survey.
//  2.1 the SHARED bibliography helper defaulted to "Verified Sources" with no caveat (the dispatcher path) —
//      AI-search grounding chunks are NOT verified; relabel + carry a verify-before-citing caveat (mirrors the
//      already-hardened content_engine copy).
//  2.2 the deterministic missing-alt fallback stamped a generic alt="Document image" that clears axe image-alt
//      by PRESENCE while telling a screen-reader user nothing — use the honest "Image (needs description)".
//  2.3 the meta badge said "Analysis + Verified" for a Gemini self-reported search check — relabel honestly.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const tph = readFileSync(resolve(process.cwd(), 'text_pipeline_helpers_source.jsx'), 'utf8');
const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const ui = readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8');

// filterEducationalSources + generateBibliographyString are adjacent + self-contained (no external deps).
const _s = tph.indexOf('const filterEducationalSources = (chunks) => {');
const _e = tph.indexOf('\n};', tph.indexOf('const generateBibliographyString')) + 3;
const generateBibliographyString = new Function(tph.slice(_s, _e) + '\nreturn generateBibliographyString;')();

const META = { groundingChunks: [{ web: { title: 'A Source', uri: 'https://example.edu/a' } }] };

describe('Part 2.1 — bibliography no longer overclaims "Verified Sources"', () => {
  it('defaults to "Referenced Sources" (not "Verified Sources")', () => {
    const out = generateBibliographyString(META);
    expect(out).toContain('### Referenced Sources');
    expect(out).not.toContain('Verified Sources');
  });
  it('carries the "not been independently verified" caveat', () => {
    expect(generateBibliographyString(META)).toContain('have not been independently verified');
  });
  it('an explicit title still gets the caveat (every path is honest)', () => {
    const out = generateBibliographyString(META, 'Links Only', 'Source Text References');
    expect(out).toContain('### Source Text References');
    expect(out).toContain('have not been independently verified');
  });
  it('still emits the source links', () => {
    expect(generateBibliographyString(META)).toContain('[A Source](https://example.edu/a)');
  });
  it('empty / null metadata → empty string (no caveat on nothing)', () => {
    expect(generateBibliographyString({ groundingChunks: [] })).toBe('');
    expect(generateBibliographyString(null)).toBe('');
  });
});

describe('Part 2.2 — alt-text fallback is honest (anti-drift)', () => {
  it('the deterministic missing-alt fallback uses "Image (needs description)", not "Document image"', () => {
    expect(dp).toContain('<img alt="Image (needs description)"${attrs}>');
    expect(dp).not.toContain('<img alt="Document image"${attrs}>');
  });
});

describe('Part 2.3 — "Analysis + Verified" relabelled (anti-drift)', () => {
  it('meta.analysis_verified no longer claims "Verified"', () => {
    expect(ui).toContain('"analysis_verified": "Analysis + AI fact-check"');
    expect(ui).not.toContain('"analysis_verified": "Analysis + Verified"');
  });
});

describe('anti-drift: the shared bibliography helper source is hardened', () => {
  it('default title is "Referenced Sources" + the caveat is emitted', () => {
    expect(tph).toContain("title = 'Referenced Sources'");
    expect(tph).not.toContain("title = 'Verified Sources'");
    expect(tph).toContain('have not been independently verified');
  });
});
