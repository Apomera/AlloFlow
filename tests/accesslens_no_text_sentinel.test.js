import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Both transcription prompts ask for the literal reply NO_TEXT_FOUND when a
// photo has no readable text, and the two modes tested for it differently --
// both wrong, in opposite directions.
//
//   Read used `out === 'NO_TEXT_FOUND'`, so "NO_TEXT_FOUND." rendered the raw
//   sentinel at up to 44px to a low-vision student.
//   Translate used indexOf, so a sign that genuinely contains that token was
//   misreported as having no text at all.

const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
let isNoTextReply;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  isNoTextReply = window.AccessLensPure.isNoTextReply;
});

describe('no-text sentinel', () => {
  it('recognises the bare sentinel', () => {
    expect(isNoTextReply('NO_TEXT_FOUND')).toBe(true);
  });

  it('tolerates the punctuation and whitespace a model adds', () => {
    // The strict check shipped the raw token to the reader for every one of
    // these.
    for (const s of ['NO_TEXT_FOUND.', 'NO_TEXT_FOUND!', 'NO_TEXT_FOUND\n', '  NO_TEXT_FOUND  ', '"NO_TEXT_FOUND"', "'NO_TEXT_FOUND'", 'NO_TEXT_FOUND...']) {
      expect(isNoTextReply(s), JSON.stringify(s)).toBe(true);
    }
  });

  it('accepts the sentinel whatever case it arrives in', () => {
    for (const s of ['no_text_found', 'No_Text_Found', 'nO_tExT_fOuNd']) {
      expect(isNoTextReply(s), s).toBe(true);
    }
  });

  it('treats an embedded occurrence as photographed text, not as a signal', () => {
    // A student really could photograph a sign or a screen containing this
    // token; the substring check silently threw that transcription away.
    for (const s of ['I see NO_TEXT_FOUND here', 'The sign reads NO_TEXT_FOUND in red', 'NO_TEXT_FOUND is printed on the label']) {
      expect(isNoTextReply(s), s).toBe(false);
    }
  });

  it('treats ordinary transcriptions as text', () => {
    for (const s of ['Milk 2%', 'Take two tablets daily.', 'Exit', '0']) {
      expect(isNoTextReply(s), s).toBe(false);
    }
  });

  it('survives hostile and empty input', () => {
    for (const bad of [null, undefined, '', '   ', 0, {}, [], 42, true]) {
      expect(() => isNoTextReply(bad)).not.toThrow();
      expect(isNoTextReply(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('both modes use the one rule, not two different ones', () => {
    // Read mode.
    expect(src).toContain('var noText = isNoTextReply(out);');
    expect(src).not.toContain("out === 'NO_TEXT_FOUND'");
    // Translate mode.
    expect(src).toContain('if (isNoTextReply(text)) return { none: true };');
    expect(src).not.toContain("text.indexOf('NO_TEXT_FOUND') !== -1");
  });

  it('keeps the sentinel out of every rendered surface', () => {
    // The only places the literal may appear are the prompts that request it
    // and the classifier that recognises it.
    const lines = src.split('\n')
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l.indexOf('NO_TEXT_FOUND') !== -1 && l.trim().indexOf('//') !== 0);
    for (const { l, i } of lines) {
      const ok = l.indexOf('output exactly') !== -1 || l.indexOf('NO_TEXT_SENTINEL') !== -1;
      expect(ok, 'line ' + (i + 1) + ': ' + l.trim()).toBe(true);
    }
  });

  it('ships the same rule in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(src);
  });
});
