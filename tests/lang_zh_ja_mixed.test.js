// #9 (2026-06-15): my own lang-zh-ja fix for the deterministic #38 langPatterns pass suppressed
// ALL Chinese tagging DOCUMENT-WIDE whenever any kana appeared anywhere — so a mixed Chinese+
// Japanese worksheet lost lang="zh" on its Chinese passages. Fix: make the suppression
// CONTEXT-AWARE — a Han run defers to Japanese only when kana is NEAR it (window around the match
// offset), not anywhere in the document. fixLangSpans (the node-scoped pass) already handles this;
// #38 is the cruder inline mirror, kept but no longer over-suppressing.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

// mirror of the shipped #38 zh/ja tagging with the windowed kana check
const tagLangs = (html) => {
  const langPatterns = [
    { regex: /([一-鿿]{3,})/g, lang: 'zh' },
    { regex: /([぀-ゟ゠-ヿ]{3,})/g, lang: 'ja' },
  ];
  let h = html;
  langPatterns.forEach((lp) => {
    h = h.replace(lp.regex, (match, p1, offset) => {
      const preceding = h.substring(Math.max(0, offset - 200), offset);
      if (lp.lang === 'zh' && /[぀-ゟ゠-ヿ]/.test(h.substring(Math.max(0, offset - 60), offset + match.length + 60))) return match;
      if (new RegExp('lang=["\']' + lp.lang + '["\'][^>]*>[^<]*$', 'i').test(preceding)) return match;
      return '<span lang="' + lp.lang + '">' + match + '</span>';
    });
  });
  return h;
};

describe('#9 mixed Chinese+Japanese — Chinese tagging is no longer suppressed document-wide', () => {
  const mixed = '<p>中文测试内容段落一二三</p><p>This is a separating English paragraph with enough length here padding.</p><p>これは日本語のテキストサンプルです</p>';

  it('keeps lang="zh" on the Chinese passage even though the doc also contains Japanese', () => {
    const out = tagLangs(mixed);
    expect(out).toContain('<span lang="zh">中文测试内容段落一二三</span>'); // pre-fix: lost entirely
  });
  it('still does NOT mis-tag the Japanese kanji as zh (kana is nearby)', () => {
    const out = tagLangs(mixed);
    expect(out).not.toContain('<span lang="zh">日本語');
  });
  it('pure Chinese (no kana anywhere) is still tagged zh — no regression', () => {
    expect(tagLangs('<p>纯中文内容测试样本</p>')).toContain('lang="zh"');
  });
  it('pure Japanese kanji is not tagged zh (kana adjacent)', () => {
    expect(tagLangs('<p>これは日本語です</p>')).not.toContain('lang="zh"');
  });

  it('anti-drift: the shipped suppression is WINDOWED, not document-wide', () => {
    expect(src).toContain('accessibleHtml.substring(Math.max(0, offset - 60), offset + match.length + 60)');
    expect(src).not.toContain(".test(accessibleHtml)) return;"); // the old doc-wide check is gone
  });
});
