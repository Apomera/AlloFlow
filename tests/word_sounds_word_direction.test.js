// @vitest-environment jsdom
// Word Sounds (2026-11-08): when the interface is right to left (Arabic, Farsi, Dari, Pashto, Urdu, Hebrew UI), the
// host sets <html dir="rtl"> and every flex row flipped, so the sound boxes of an English word ran backwards (Sound
// Mapping showed 3 2 1, "cat" read /t/ /a/ /k/). Rows that hold a word's sounds, letters or slots now carry the
// direction of the LESSON's language, as Present mode already does.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderActivity, baseProps } from './helpers/word_sounds_harness.js';

const MODULE = readFileSync('word_sounds_module.js', 'utf8');
const MISC_SRC = readFileSync('misc_components_source.jsx', 'utf8');
const MISC = readFileSync('misc_components_module.js', 'utf8');
const dirs = (html) => (html.match(/ dir="(ltr|rtl)"/g) || []).map((m) => m.slice(6, -1));

describe('Word Sounds word direction', () => {
  it('is the lesson language direction, not the interface direction', () => {
    expect(MODULE).toContain('const wsWordDir = wsLangCaps.rtl ? "rtl" : "ltr";');
    expect(MODULE).toContain('rtl: RTL.has(primary),');
  });
  // Blending and Word Families draw their rows only after audio plays, so the first render has none to check.
  for (const activity of ['segmentation', 'mapping']) {
    it(activity + ': English rows read left to right, Arabic rows right to left', () => {
      const en = dirs(renderActivity(activity));
      const ar = dirs(renderActivity({ ...baseProps(activity), wordSoundsLanguage: 'ar' }));
      expect(en.length).toBeGreaterThan(0);
      expect(en.every((d) => d === 'ltr')).toBe(true);
      expect(ar.length).toBe(en.length);
      expect(ar.every((d) => d === 'rtl')).toBe(true);
    });
  }
  it('Sound Mapping slots and syllable parts take the direction as a prop', () => {
    expect(MODULE).toContain('({ wordDir, data, onPlayAudio');
    expect(MODULE).toContain('{ dir: wordDir, className: "flex justify-center gap-4 mb-4" }');
    expect(MODULE).toContain('wordDir, data, isLoading, highlightedSyllableIndex');
    expect(MODULE).toContain('{ dir: wordDir, className: "flex flex-wrap justify-center gap-2", "aria-hidden": !showLetterHints }');
    expect(MODULE.match(/wordDir: wsWordDir,/g)).toHaveLength(3);
  });
  it('the review panel phoneme row follows the word too', () => {
    expect(MISC_SRC).toContain("dir={wordDir || 'ltr'}");
    expect(MISC).toContain('dir: wordDir || "ltr"');
  });
});
