// Tests for the deterministic per-span language floor fixLangSpans (Beat-Adobe §3,
// 2026-06-14) — extended with Bengali/Amharic/Burmese, the AlloFlow refugee/EL
// scripts that map ~1:1 to a language (Latin-script language-of-parts still needs
// the VLM/LID pass). Runtime-extracted from doc_pipeline_source.jsx (anti-drift).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const start = src.indexOf('const fixLangSpans = (htmlContent) => {');
const rIdx = src.indexOf('return { html: fixed, fixCount };', start);
const closeIdx = src.indexOf('\n  };', rIdx) + '\n  };'.length;
if (start === -1 || rIdx === -1) throw new Error('extraction markers for fixLangSpans missing');
const fnSrc = src.slice(start, closeIdx);
const fixLangSpans = new Function('warnLog', fnSrc + '\n return fixLangSpans;')(() => {});

const wrap = (s) => fixLangSpans('<p>' + s + '</p>').html;

describe('fixLangSpans — deterministic language-of-parts floor (§3)', () => {
  it('tags Bengali script as lang="bn"', () => {
    expect(wrap('আমি বাংলা পড়ি')).toContain('<span lang="bn">');
  });
  it('tags Amharic (Ethiopic) script as lang="am"', () => {
    expect(wrap('ሰላም ለዓለም')).toContain('<span lang="am">');
  });
  it('does NOT deterministically tag Myanmar script (Karen also uses it — left to the VLM)', () => {
    expect(wrap('မင်္ဂလာပါ ကမ္ဘာ')).not.toContain('lang="my"');
  });
  it('still tags the previously-covered scripts (no regression)', () => {
    expect(wrap('Привет мир друзья')).toContain('lang="ru"');
    expect(wrap('مرحبا بالعالم')).toContain('lang="ar"');
    expect(wrap('안녕하세요 여러분')).toContain('lang="ko"');
  });

  // 2026-06-15 review fixes (rawtext skip + RTL dir; zh/ja kana-disambiguation and
  // dropping Myanmar were deferred — they need editing the literal-Unicode ranges).
  it('adds dir="rtl" to Arabic / Hebrew language-of-parts spans', () => {
    expect(wrap('مرحبا بالعالم')).toContain('dir="rtl"');
    expect(wrap('שלום עולם חברים')).toContain('dir="rtl"');
  });
  it('never injects a <span> inside a rawtext element like <title>', () => {
    const r = fixLangSpans('<title>مرحبا بالعالم</title>');
    expect(r.html).not.toContain('<span');
  });
  it('leaves plain English untouched and reports zero fixes', () => {
    const r = fixLangSpans('<p>Just plain English here.</p>');
    expect(r.html).not.toContain('<span lang=');
    expect(r.fixCount).toBe(0);
  });
  it('does not double-wrap text already inside a lang span', () => {
    const r = fixLangSpans('<span lang="bn">আমি বাংলা</span>');
    expect((r.html.match(/<span lang=/g) || []).length).toBe(1);
  });

  // 2026-06-15 (lang-double-wrap): an ANCESTOR lang span (text reached via a nested
  // child) must also suppress re-wrapping — precedingTag is the child tag, so the
  // direct guard misses it. Pure string-depth walk (runs under this no-DOMParser harness).
  it('does not double-wrap when a lang span has a nested child', () => {
    const r = fixLangSpans('<span lang="bn"><b>আমি বাংলা পড়ি</b></span>');
    expect((r.html.match(/<span lang=/g) || []).length).toBe(1);
  });
  it('does not double-wrap a nested child PLUS trailing text in the same lang span', () => {
    const r = fixLangSpans('<span lang="ar"><em>مرحبا</em> بالعالم اليوم</span>');
    expect((r.html.match(/<span lang=/g) || []).length).toBe(1);
  });
  it('does not double-wrap under deep nesting', () => {
    const r = fixLangSpans('<span lang="am"><b><i>ሰላም ለዓለም</i></b></span>');
    expect((r.html.match(/<span lang=/g) || []).length).toBe(1);
  });
  it('REGRESSION GUARD: still wraps text after a CLOSED sibling lang span', () => {
    // the depth counter must reset on </span>, so the second Bengali run still gets tagged
    const r = fixLangSpans('<p><span lang="bn">আমি</span> বাংলা পড়ি আছি</p>');
    expect((r.html.match(/<span lang=/g) || []).length).toBe(2);
  });
});
