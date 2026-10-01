import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The transcription prompts tell the model to write [unclear] where a word
// could not be read, and that marker was rendered as ordinary text. At 44px in
// the large-print reader, a gap in a medication label or a lab safety
// instruction looked exactly like the words that WERE read, and read-aloud
// spoke the literal word "unclear" as part of the sentence.

const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
let splitUnclear, countUnclear, speechWithGaps;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  ({ splitUnclear, countUnclear, speechWithGaps } = window.AccessLensPure);
});

describe('unreadable-word markers', () => {
  it('separates gaps from transcribed text', () => {
    const parts = splitUnclear('Take [unclear] tablets daily.');
    expect(parts.map((p) => p.unclear)).toEqual([false, true, false]);
    expect(parts[0].text).toBe('Take ');
    expect(parts[2].text).toBe(' tablets daily.');
  });

  it('matches the marker whatever case the model emits', () => {
    for (const s of ['a [unclear] b', 'a [UNCLEAR] b', 'a [Unclear] b']) {
      expect(countUnclear(s), s).toBe(1);
    }
  });

  it('counts every gap, so the banner cannot understate them', () => {
    expect(countUnclear('Take [unclear] tablets [unclear] daily.')).toBe(2);
    expect(countUnclear('[unclear][unclear][unclear]')).toBe(3);
    expect(countUnclear('Take two tablets daily.')).toBe(0);
  });

  it('does not lose text around a gap', () => {
    const s = 'Take [unclear] tablets [unclear] daily.';
    const rebuilt = splitUnclear(s).map((p) => p.text).join('');
    expect(rebuilt).toBe(s);
  });

  it('handles a gap at the very start or end without emitting empty runs', () => {
    for (const s of ['[unclear] tablets', 'tablets [unclear]', '[unclear]']) {
      const parts = splitUnclear(s);
      for (const p of parts) expect(p.text.length, s).toBeGreaterThan(0);
      expect(parts.map((p) => p.text).join(''), s).toBe(s);
    }
  });

  it('speaks a gap as a gap, not as the word "unclear"', () => {
    const said = speechWithGaps('Take [unclear] tablets daily.');
    expect(said).toContain('could not be read');
    // The literal marker must not survive into speech.
    expect(said).not.toContain('[unclear]');
    expect(said).not.toMatch(/\bunclear\b(?! )/);
  });

  it('leaves clean text untouched in speech', () => {
    expect(speechWithGaps('Take two tablets daily.')).toBe('Take two tablets daily.');
  });

  it('survives hostile and empty input', () => {
    for (const bad of [null, undefined, '', 0, {}, []]) {
      expect(() => splitUnclear(bad)).not.toThrow();
      expect(() => countUnclear(bad)).not.toThrow();
      expect(() => speechWithGaps(bad)).not.toThrow();
    }
    expect(splitUnclear(null)).toEqual([]);
    expect(countUnclear(null)).toBe(0);
    expect(speechWithGaps(null)).toBe('');
  });

  it('marks gaps in the reader instead of printing the raw marker', () => {
    // The reader body must map over the split, not dump the string.
    const i = src.indexOf("key: 'reader'");
    const body = src.slice(i, i + 900);
    expect(body).toContain('splitUnclear(out)');
    expect(body).toContain('unclear_inline');
  });

  it('warns how many words were lost, before the text', () => {
    const i = src.indexOf("key: 'gaps'");
    expect(i).toBeGreaterThan(-1);
    // The banner must sit above the reader body, or it is read after the text
    // it is warning about.
    expect(i).toBeLessThan(src.indexOf("key: 'reader'"));
    expect(src).toContain('gap_advice');
  });

  it('routes read-aloud through the gap-aware text', () => {
    expect(src).toContain('speakBtn(speechWithGaps(out))');
  });

  it('marks gaps in the Translate transcription too', () => {
    // Translate uses the same marker in its transcription half.
    const i = src.indexOf("key: 'orig'");
    const body = src.slice(i, i + 800);
    expect(body).toContain('splitUnclear(out.original)');
    // ...and says the translation is built on incomplete source text.
    expect(src).toContain('translate_gap');
  });

  it('ships the same handling in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(src);
  });
});
