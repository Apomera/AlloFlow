// An English translation must read left to right, whatever it was translated
// FROM.
//
// Bilingual output is one string split on "--- ENGLISH TRANSLATION ---" and
// rendered inside a wrapper whose direction comes from the CONTENT language
// (dir={getContentDirection(...)}). When the source is Arabic, Hebrew, Farsi or
// Urdu that wrapper is dir="rtl", and the English half inherited it: the text
// right-aligned and every full stop jumped to the left of its sentence, so a
// heading rendered as ".Magma Earth and". The English is still English; only
// the container was wrong.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

const translationBlock = (src) => {
  const at = src.indexOf('const BilingualFieldRenderer');
  if (at < 0) throw new Error('BilingualFieldRenderer not found');
  return src.slice(at, at + 2500);
};

describe('the English half is explicitly LTR', () => {
  for (const f of COPIES) {
    it(`${f} sets dir="ltr" on the translation block`, () => {
      const block = translationBlock(readFileSync(f, 'utf8'));
      expect(block).toMatch(/<div dir="ltr" className="relative mt-2 ps-4/);
    });

    it(`${f} also pins alignment, in case an ancestor aligns by class`, () => {
      // dir alone fixes inherited direction, but not an explicit text-right
      // utility somewhere up the tree.
      const block = translationBlock(readFileSync(f, 'utf8'));
      const opening = block.slice(block.indexOf('<div dir="ltr"'), block.indexOf('<div dir="ltr"') + 200);
      expect(opening).toContain('text-left');
    });

    it(`${f} leaves the SOURCE half inheriting direction`, () => {
      // The other half really is in the target language, so it must keep
      // following the content wrapper. Forcing both to ltr would break Arabic.
      const block = translationBlock(readFileSync(f, 'utf8'));
      const sourceHalf = block.slice(0, block.indexOf('<div dir="ltr"'));
      expect(sourceHalf).toContain('renderFormattedText(targetText)');
      expect(sourceHalf, 'source half must not be forced ltr').not.toContain('dir="ltr"');
    });

    it(`${f} explains why, since the symptom is confusing`, () => {
      const block = translationBlock(readFileSync(f, 'utf8'));
      expect(block).toMatch(/English translation is English, whatever the source language/);
    });
  }
});

describe('direction still follows the content language elsewhere', () => {
  for (const f of COPIES) {
    it(`${f} keeps getContentDirection driving the content wrapper`, () => {
      // The fix is scoped to the translation block. If this helper stopped
      // being used, RTL source text would render left to right, which is the
      // same bug pointing the other way.
      const src = readFileSync(f, 'utf8');
      expect(src).toContain('getContentDirection');
    });
  }
});
