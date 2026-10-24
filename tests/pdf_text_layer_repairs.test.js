// PDF text-layer repairs (2026-10-17), measured on real documents:
//  - _alloPageTextUnreadable flags a PAGE whose text layer is unmapped glyph codes (a font with no usable
//    ToUnicode: control characters or U+FFFD, never words). The whole-document check missed such pages
//    inside a long clean PDF, so USGS water-cycle p30-32 shipped as replacement characters.
//  - _alloRepairRtlLigatures puts lam-alef ligatures back in reading order. pdf.js reverses the two
//    letters a ligature glyph maps to, so 39 of the words in a real Arabic school letter came out wrong
//    (some as other real words: "the truth" read as "later").
// Both are sliced from doc_pipeline_source.jsx and fed the measured pdf.js data in tests/fixtures/pdf_text_layer.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const slice = (from, to) => {
  const s = src.indexOf(from), e = src.indexOf(to, s);
  if (s < 0 || e < 0) throw new Error('slice markers missing: ' + from);
  return src.slice(s, e);
};
const unreadable = new Function(slice('var _alloPageTextUnreadable = function', '// Returns source numeric tokens whose count DROPPED') + '\nreturn _alloPageTextUnreadable;')();
const repair = new Function(slice('function _alloRepairRtlLigatures(items, glyphRuns) {', '// Pages worth the extra operator-list pass') + '\nreturn _alloRepairRtlLigatures;')();
const fixture = (name) => JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/pdf_text_layer', name), 'utf8'));
const str = (cps) => String.fromCodePoint(...cps);
const ch = (...c) => String.fromCharCode(...c);

describe('_alloPageTextUnreadable: a page whose text layer is not text', () => {
  const S = fixture('unreadable_samples.json');
  it('flags every measured unreadable page (Hebrew UDHR Type3 codes, USGS all-U+FFFD CMap)', () => {
    for (const p of S.unreadable) expect(unreadable(str(p.text)).unreadable, p.file + ' p' + p.page).toBe(true);
  });
  it('never flags the hardest real clean pages (figure labels, bullets, numbers, Arabic, Persian, emoji font)', () => {
    for (const p of S.readable) expect(unreadable(str(p.text)).unreadable, p.file + ' p' + p.page).toBe(false);
  });
  it('boundaries: needs 20 non-space characters, 10 bad ones, and 25% broken or 60% private-use', () => {
    const page = (good, bad) => 'a'.repeat(good) + ch(1).repeat(bad);
    expect(unreadable(page(9, 10)).unreadable).toBe(false); // 19 non-space characters
    expect(unreadable(page(10, 10)).unreadable).toBe(true);
    expect(unreadable(page(31, 10)).unreadable).toBe(false); // 24.4% broken
    expect(unreadable(page(30, 10)).unreadable).toBe(true); // 25%
    const pua = (good, n) => 'a'.repeat(good) + ch(0xE000).repeat(n);
    expect(unreadable(pua(41, 59)).unreadable).toBe(false); // 59% private-use
    expect(unreadable(pua(40, 60)).unreadable).toBe(true);
    expect(unreadable(ch(0xFFFD).repeat(9) + 'a'.repeat(11)).unreadable).toBe(false); // only 9 bad
    expect(unreadable(' \t\n'.repeat(50)).nonWs).toBe(0);
  });
  it('a supplementary-plane character counts once', () => {
    const r = unreadable(String.fromCodePoint(0xF0000).repeat(30));
    expect(r).toMatchObject({ nonWs: 30, pua: 30, unreadable: true });
  });
});

describe('_alloRepairRtlLigatures: lam-alef back in reading order', () => {
  const LA = ch(0x644, 0x627), AL = ch(0x627, 0x644);
  const L = fixture('arabic_lamalef_letter.json');
  const toRuns = (runs) => runs.map((r) => r.map((g) => (Array.isArray(g) ? { unicode: str(g) } : g)));
  it('the real letter\'s first line reads as printed, and its two articles stay alef+lam', () => {
    const r = repair([{ str: str(L.line1.itemStrCodePoints), dir: L.line1.dir }], toRuns(L.line1.glyphRuns));
    const truth = ch(0x639, 0x627, 0x626, 0x644, 0x627, 0x62A) + ' ' + ch(0x645, 0x62F, 0x627, 0x631, 0x633) + ' ' + ch(0x628, 0x648, 0x631, 0x62A, 0x644, 0x627, 0x646, 0x62F)
      + ' ' + ch(0x627, 0x644, 0x639, 0x627, 0x645, 0x629) + ' ' + ch(0x627, 0x644, 0x639, 0x632, 0x64A, 0x632, 0x629, 0x60C);
    expect(r.fixed).toBe(2);
    expect(r.items[0].str).toBe(truth);
  });
  it('the whole real page: 39 ligatures repaired, nothing else changed', () => {
    const items = L.wholePage.items.map((it) => ({ str: str(it.str), dir: it.dir }));
    const r = repair(items, toRuns(L.wholePage.glyphRuns));
    expect(r.fixed).toBe(L.wholePage.expectFixed);
    let changed = 0;
    items.forEach((it, i) => { for (let k = 0; k < it.str.length; k++) if (it.str[k] !== r.items[i].str[k]) changed++; expect(r.items[i].str.length).toBe(it.str.length); });
    expect(changed).toBe(2 * L.wholePage.expectFixed);
  });
  it('English lines holding Arabic words come out in reading order', () => {
    const M = fixture('arabic_lamalef_mixed_ltr.json');
    const r = repair(M.items.map((it) => ({ str: str(it.str), dir: it.dir })), toRuns(M.runs));
    expect(r.items.map((x) => x.str).filter((x) => x.trim())).toEqual(M.truth.map(str));
  });
  it('a one-glyph "la" is restored; a two-glyph "la" and "qala" are never touched', () => {
    expect(repair([{ str: AL, dir: 'rtl' }], [[{ unicode: LA }]]).items[0].str).toBe(LA);
    const two = repair([{ str: LA, dir: 'rtl' }], [[{ unicode: ch(0x627) }, { unicode: ch(0x644) }]]);
    expect(two).toMatchObject({ fixed: 0 }); expect(two.items[0].str).toBe(LA);
    const QALA = ch(0x642, 0x627, 0x644);
    const mixed = repair([{ str: QALA + ' ' + AL, dir: 'rtl' }], [[{ unicode: LA }, { unicode: ' ' }, { unicode: ch(0x644) }, { unicode: ch(0x627) }, { unicode: ch(0x642) }]]);
    expect(mixed.items[0].str).toBe(QALA + ' ' + LA);
  });
  it('steps back unchanged whenever it is unsure', () => {
    // a presentation-form ligature is one character
    expect(repair([{ str: ch(0xFEFB), dir: 'rtl' }], [[{ unicode: ch(0xFEFB) }]]).fixed).toBe(0);
    // a pdf.js that already gets it right: letters differ from the glyph stream
    const right = repair([{ str: LA, dir: 'rtl' }], [[{ unicode: LA }]]);
    expect(right.fixed).toBe(0); expect(right.items[0].str).toBe(LA); expect(right.reason).toMatch(/differ/);
    // letters the glyphs do not account for
    expect(repair([{ str: AL + ch(0x628), dir: 'rtl' }], [[{ unicode: LA }]]).fixed).toBe(0);
    // the ligature's two letters are not next to each other
    const apart = repair([{ str: ch(0x627) + ' ' + ch(0x644), dir: 'rtl' }], [[{ unicode: LA }]]);
    expect(apart.fixed).toBe(0); expect(apart.items[0].str).toBe(ch(0x627) + ' ' + ch(0x644));
    // no ligature glyph at all: nothing to do, no reason
    expect(repair([{ str: 'abc', dir: 'ltr' }], [[{ unicode: 'a' }]])).toMatchObject({ fixed: 0, reason: '' });
  });
});

describe('wiring in the extractor and the remediation intake', () => {
  it('the extractor runs the ligature repair on pages with an alef+lam pair and flags unreadable pages without blanking them', () => {
    const ex = slice('const pageErrors = [];\n      const unreadablePages = [];', '    } catch (e) {\n      const msg = e?.message');
    expect(ex.includes('_alloRepairRtlLigatures(tc.items || [], _runs)'), 'ligature repair call').toBe(true);
    expect(ex.includes('if (_unread.unreadable) pages[pages.length - 1].textLayerUnreadable = true;'), 'flag on the page').toBe(true);
    expect(ex.includes('unreadablePages,'), 'returned').toBe(true);
  });
  it('the intake blanks flagged pages so the mixed-page rescue OCRs them, and reports pages it could not recover', () => {
    const intake = slice('// Per-PAGE unreadable layer (2026-10-17)', '// ── Mixed scanned+digital rescue ──');
    expect(intake.includes("det.pages.forEach(pg => { if (pg && pg.textLayerUnreadable) pg.text = ''; });")).toBe(true);
    expect(src.includes("error: 'unreadable-font-text-layer'")).toBe(true);
  });
});
