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
// 2026-10-16: fixLangSpans calls two module-level helpers; extract them from the same source.
const hStart = src.indexOf('var _ALLO_LANG_SCRIPTS = {');
const hEnd = src.indexOf('// ── Alt-text QUALITY heuristics', hStart);
if (hStart === -1 || hEnd === -1) throw new Error('extraction markers for the language helpers missing');
const helpers = new Function(src.slice(hStart, hEnd) + '\nreturn { s: _alloScriptsForLang, l: _alloLangForScriptRun };')();
const fixLangSpans = new Function('warnLog', '_alloScriptsForLang', '_alloLangForScriptRun', fnSrc + '\n return fixLangSpans;')(() => {}, helpers.s, helpers.l);

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

  // 2026-06-15 (lang-zh-ja): kanji share the Han range with Chinese and zh is matched first,
  // so Japanese (kanji + kana) had its kanji mis-tagged lang="zh" (SR reads Mandarin). When
  // kana is present the text is Japanese → skip zh; pure-Han (no kana) is still Chinese.
  it('does NOT tag Japanese kanji as zh when kana is present (tags ja instead)', () => {
    const r = fixLangSpans('<p>私は学生です</p>'); // kanji 私学生 + hiragana はです
    expect(r.html).not.toContain('lang="zh"');
    expect(r.html).toContain('lang="ja"');
  });
  it('still tags pure-Han (no kana) text as zh (Chinese — no regression)', () => {
    const r = fixLangSpans('<p>中文测试内容</p>'); // all Han, no kana
    expect(r.html).toContain('lang="zh"');
  });
});

// 2026-10-16: the pass ignored the document's own language. A correctly labelled lang="fa"
// Persian letter had every paragraph wrapped lang="ar", and lang="uk" Ukrainian lang="ru",
// so screen readers switched to the wrong voice. Text in the script of the language already
// in force is now left alone; a run in another script is labelled from its letters.
const doc = (lang, body) => '<html lang="' + lang + '"><body>' + body + '</body></html>';
const FA = 'پدر و مادر عزیز';           // Persian: peh (U+067E), Farsi yeh (U+06CC)
const FA_WEAK = 'این یک نامه است';       // Persian with only keheh (U+06A9) / Farsi yeh
const AR = 'مدرسة جديدة';               // Arabic: teh marbuta (U+0629), Arabic yeh (U+064A)
const UR = 'یہ ایک خط ہے';              // Urdu: yeh barree (U+06D2)
const PS = 'ښوونځی ته ښه راغلاست';      // Pashto: sheen with dot (U+069A), hah with hamza (U+0681)
const UK = 'Шановні батьки, це їхній лист'; // Ukrainian: yi (U+0457), i (U+0456)
const RU = 'Привет мир друзья';
const SR = 'Ђаци и њихови родитељи';    // Serbian: dje (U+0402), nje (U+045A), lje (U+0459)
const KK = 'Қазақ тілі';                // Kazakh: ka with descender (U+049A)

describe('fixLangSpans — respects the language already in force (2026-10-16)', () => {
  it('leaves a lang="fa" Persian document unwrapped', () => {
    const r = fixLangSpans(doc('fa', '<p>' + FA + '</p><p>' + FA_WEAK + '</p>'));
    expect(r.html).not.toContain('<span lang=');
    expect(r.fixCount).toBe(0);
  });
  it('leaves Dari (prs), Urdu (ur) and Pashto (ps) documents unwrapped', () => {
    expect(fixLangSpans(doc('prs', '<p>' + FA + '</p>')).html).not.toContain('<span lang=');
    expect(fixLangSpans(doc('ur', '<p>' + UR + '</p>')).html).not.toContain('<span lang=');
    expect(fixLangSpans(doc('ps', '<p>' + PS + '</p>')).html).not.toContain('<span lang=');
  });
  it('leaves a lang="uk" Ukrainian document unwrapped', () => {
    const r = fixLangSpans(doc('uk', '<p>' + UK + '</p>'));
    expect(r.html).not.toContain('<span lang=');
  });
  it('honours region and script subtags', () => {
    expect(fixLangSpans(doc('fa-IR', '<p>' + FA + '</p>')).html).not.toContain('<span lang=');
    expect(fixLangSpans(doc('sr', '<p>' + SR + '</p>')).html).not.toContain('<span lang=');
    // Serbian written in Latin: a Cyrillic run IS a change of script, labelled Serbian
    expect(fixLangSpans(doc('sr-Latn', '<p>' + SR + '</p>')).html).toContain('<span lang="sr">');
  });
  it('uses the NEAREST ancestor lang, not just <html>', () => {
    const r = fixLangSpans(doc('en', '<div lang="fa"><p>' + FA + '</p></div><p>' + FA + '</p>'));
    expect((r.html.match(/<span lang="fa" dir="rtl">/g) || []).length).toBe(1);
  });
  it('survives unclosed <p> and void <br> tags', () => {
    expect(fixLangSpans(doc('uk', '<p>' + UK + '<p>' + UK)).html).not.toContain('<span lang=');
    expect(fixLangSpans(doc('fa', '<p>پدر<br>' + FA + '</p>')).html).not.toContain('<span lang=');
  });
  it('still tags a run in a DIFFERENT script (a Russian quote in a Persian letter)', () => {
    const r = fixLangSpans(doc('fa', '<p>' + FA + '</p><p>' + RU + '</p>'));
    expect(r.html).toContain('<span lang="ru">');
    expect(r.html).not.toContain('lang="ar"');
  });
  it('leaves a lang="ja" document\'s kanji-only text alone (not zh)', () => {
    expect(fixLangSpans(doc('ja', '<p>漢字辞典</p>')).html).not.toContain('lang="zh"');
  });
});

describe('fixLangSpans — labels a foreign run from its letters (2026-10-16)', () => {
  const run = (text) => fixLangSpans(doc('en', '<p>Dear parents: ' + text + '</p>')).html;
  it('Persian is fa, not ar (strong and keheh/yeh-only evidence)', () => {
    expect(run(FA)).toContain('<span lang="fa" dir="rtl">');
    expect(run(FA_WEAK)).toContain('<span lang="fa" dir="rtl">');
  });
  it('Arabic stays ar', () => { expect(run(AR)).toContain('<span lang="ar" dir="rtl">'); });
  it('Urdu is ur and Pashto is ps', () => {
    expect(run(UR)).toContain('<span lang="ur" dir="rtl">');
    expect(run(PS)).toContain('<span lang="ps" dir="rtl">');
  });
  it('Ukrainian is uk, Serbian sr, Kazakh kk; Russian stays ru', () => {
    expect(run(UK)).toContain('<span lang="uk">');
    expect(run(SR)).toContain('<span lang="sr">');
    expect(run(KK)).toContain('<span lang="kk">');
    expect(run(RU)).toContain('<span lang="ru">');
  });
});
