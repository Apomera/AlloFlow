// lang-banner-fragment (2026-06-15): the translation + plain-language reviewer
// disclaimer was inserted after <main> else after <body>, with no third branch —
// so a body-inner FRAGMENT (no main/body) shipped with NO disclaimer. The fix adds
// a three-way fall-through that prepends the note when neither landmark is present.
//
// Anti-drift: we runtime-extract the REAL shipped note-insertion tail (the `_note`
// line + the `result = …` line) from each lane and exercise it, rather than
// re-implementing the logic here.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

function extractLane(noteMarker) {
  const noteAt = src.indexOf("const _note = '<p " + noteMarker);
  if (noteAt === -1) throw new Error('note marker not found: ' + noteMarker);
  // Each lane splits its note text into its own const on the line directly
  // above the banner — _translationNoteText for the translate lane,
  // _plainNoteText for the plain-language one. Start at that line rather than
  // naming them individually, so a third lane needs no change here.
  const lineStart = src.lastIndexOf('\n', noteAt) + 1;
  const prevLineStart = src.lastIndexOf('\n', lineStart - 2) + 1;
  const prevLine = src.slice(prevLineStart, lineStart);
  const start = /const _\w*NoteText\s*=/.test(prevLine) ? prevLineStart : noteAt;
  const resultIdx = src.indexOf("result = result.includes('<main')", start);
  const prepIdx = src.indexOf('(_note + result)', resultIdx);
  if (resultIdx === -1 || prepIdx === -1) throw new Error('three-way fall-through missing for ' + noteMarker);
  const end = src.indexOf(';', prepIdx) + 1;
  const slice = src.slice(start, end);
  // The banner was later hardened to HTML-escape the language name, so the tail
  // now also closes over _alloEscapePromptDisplayText, declared above the lane.
  // Sliced in rather than stubbed: a stub would let an escaping regression pass
  // here, and escaping the display text is exactly what these tests are for.
  const escStart = src.indexOf('const _alloEscapePromptDisplayText = (value) =>');
  const escEnd = src.indexOf('const translateAccessibleHtml = async', escStart);
  if (escStart === -1 || escEnd < escStart) throw new Error('extraction markers for _alloEscapePromptDisplayText missing');
  const esc = src.slice(escStart, escEnd);
  // The banner also reads _targetLang — targetLang after control-character
  // stripping and length-clamping. Slice the real derivation in rather than
  // aliasing it, so these tests keep covering the sanitiser.
  const tlAt = src.indexOf('const _targetLang = String(targetLang)');
  const tlEnd = src.indexOf('\n', tlAt);
  if (tlAt === -1 || tlEnd < tlAt) throw new Error('extraction marker for _targetLang missing');
  const tl = src.slice(tlAt, tlEnd);
  // result + opts + targetLang remain the only injected identifiers.
  return new Function('result', 'opts', 'targetLang', esc + '\n' + tl + '\n' + slice + '\n; return result;');
}

const runTranslate = extractLane('data-allo-translation-note');
const runPlain = extractLane('data-allo-plain-note');

const countAttr = (html, attr) => (html.match(new RegExp(attr, 'g')) || []).length;

describe('lang-banner-fragment — disclaimer always ships', () => {
  for (const [name, run, attr] of [
    ['translation', runTranslate, 'data-allo-translation-note="true"'],
    ['plain-language', runPlain, 'data-allo-plain-note="true"'],
  ]) {
    describe(name + ' lane', () => {
      it('prepends the note to a body-inner FRAGMENT with no main/body (the fix)', () => {
        const out = run('<h1>Hi</h1><p>x</p>', {}, 'Spanish');
        expect(out).toContain(attr); // pre-fix: absent
        expect(out.indexOf(attr)).toBeLessThan(out.indexOf('<h1')); // note comes first
      });
      it('inserts after <main> for a full document (regression guard)', () => {
        const out = run('<html><body><main id="m"><p>x</p></main></body></html>', {}, 'Spanish');
        expect(out).toMatch(new RegExp('<main[^>]*>\\s*<p ' + attr.split(' ')[0]));
      });
      it('inserts after <body> when there is a body but no main (regression guard)', () => {
        const out = run('<body><p>x</p></body>', {}, 'Spanish');
        expect(out).toMatch(new RegExp('<body[^>]*>\\s*<p ' + attr.split(' ')[0]));
      });
      it('inserts the note exactly once', () => {
        expect(countAttr(run('<h1>Hi</h1>', {}, 'Spanish'), attr)).toBe(1);
        expect(countAttr(run('<body><p>x</p></body>', {}, 'Spanish'), attr)).toBe(1);
      });
      it('honors an opts.noteText override', () => {
        const out = run('<p>x</p>', { noteText: 'CUSTOM REVIEWER NOTE' }, 'Spanish');
        expect(out).toContain('CUSTOM REVIEWER NOTE');
      });
    });
  }
});
