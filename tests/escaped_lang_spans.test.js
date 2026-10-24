// _alloRestoreEscapedLangSpans (2026-10-17): an AI wrote a language span INSIDE a text value, the
// pipeline (correctly) escaped it, and the Arabic family letter showed
//   <span lang='en'>P517- ARA Childcare Letter to Families December 2020</span>
// as visible code that a screen reader read aloud. Only text is repaired, only a lang (+ dir) span
// around plain text, and never inside an attribute or a raw-text element. Sliced from the source.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const s = src.indexOf('var _alloRestoreEscapedLangSpans = function');
const e = src.indexOf('// ── Alt-text QUALITY heuristics', s);
if (s < 0 || e < 0) throw new Error('slice markers missing');
const restore = new Function(src.slice(s, e) + '\nreturn _alloRestoreEscapedLangSpans;')();

describe('escaped language spans in text become real spans', () => {
  it('the real pilot line (Arabic family letter, 2026-09-22)', () => {
    const line = '<p style="margin:0.6em 0">&lt;span lang=\'en\'&gt;P517- ARA Childcare Letter to Families December 2020&lt;/span&gt;</p>';
    expect(restore(line)).toEqual({ html: '<p style="margin:0.6em 0"><span lang="en">P517- ARA Childcare Letter to Families December 2020</span></p>', fixCount: 1 });
  });
  it('entity-quoted attributes and a dir attribute', () => {
    expect(restore('<p>&lt;span lang=&quot;ar&quot; dir=&quot;RTL&quot;&gt;x&lt;/span&gt;</p>').html).toBe('<p><span lang="ar" dir="rtl">x</span></p>');
    expect(restore('<p>&lt;span lang=&#39;zh-Hant&#39;&gt;x&lt;/span&gt;</p>').html).toBe('<p><span lang="zh-hant">x</span></p>');
  });
  it('the content stays escaped text', () => {
    expect(restore('<td>&lt;span lang="en"&gt;a &amp;lt;b&amp;gt; b&lt;/span&gt;</td>').html).toBe('<td><span lang="en">a &amp;lt;b&amp;gt; b</span></td>');
  });
});

describe('everything else is left alone', () => {
  it('never inside an attribute value', () => {
    const html = '<img alt="&lt;span lang=\'en\'&gt;x&lt;/span&gt;" src="a.png"><p>ok</p>';
    expect(restore(html)).toEqual({ html, fixCount: 0 });
  });
  it('never inside title, textarea, script or style', () => {
    for (const tag of ['title', 'textarea', 'script', 'style']) {
      const html = '<' + tag + '>&lt;span lang="en"&gt;x&lt;/span&gt;</' + tag + '><p>after</p>';
      expect(restore(html).fixCount, tag).toBe(0);
    }
    // text AFTER the raw-text element is still repaired
    expect(restore('<title>t</title><p>&lt;span lang="en"&gt;x&lt;/span&gt;</p>').fixCount).toBe(1);
  });
  it('any other attribute, an invalid language code, or nested markup: unchanged', () => {
    for (const bad of [
      '<p>&lt;span lang="en" onclick="x()"&gt;x&lt;/span&gt;</p>',
      '<p>&lt;span style="color:red"&gt;x&lt;/span&gt;</p>',
      '<p>&lt;span lang="english!"&gt;x&lt;/span&gt;</p>',
      '<p>&lt;div lang="en"&gt;x&lt;/div&gt;</p>',
      '<p>&lt;span lang="en"&gt;never closed</p>',
    ]) expect(restore(bad), bad).toEqual({ html: bad, fixCount: 0 });
  });
  it('a stray opener stays text; only the complete span inside it is restored', () => {
    expect(restore('<p>&lt;span lang="en"&gt;a &lt;span lang="fr"&gt;b&lt;/span&gt;</p>').html)
      .toBe('<p>&lt;span lang="en"&gt;a <span lang="fr">b</span></p>');
  });
  it('wired into the deterministic WCAG fixes before fixLangSpans', () => {
    expect(src.includes("try { result = _alloRestoreEscapedLangSpans(result).html; } catch (e) { warnLog('[Det WCAG] restoreEscapedLangSpans failed:', e?.message); }\n    try { result = fixLangSpans(result).html; }")).toBe(true);
  });
});
