// Unit tests for window.AlloModules.PureHelpers.
//
// These functions are the load-bearing pure helpers used across many views:
// - splitTextToSentences: feeds TTS karaoke highlighting in 6+ views
// - diffWords: feeds the Compare-mode side-by-side in Simplified
// - repairSourceMarkdown: cleans AI text output before downstream rendering
// - generateBingoCards: powers the glossary bingo mini-game
// - _applyTextSurgery: jsdiff-based HTML surgery for PDF-fix

import { describe, it, expect, vi } from 'vitest';

const PH = () => window.AlloModules.PureHelpers;

describe('splitTextToSentences', () => {
  it('returns [] for empty input', () => {
    expect(PH().splitTextToSentences('')).toEqual([]);
    expect(PH().splitTextToSentences(null)).toEqual([]);
    expect(PH().splitTextToSentences(undefined)).toEqual([]);
  });

  it('splits a simple multi-sentence string', () => {
    const r = PH().splitTextToSentences('First. Second! Third?');
    expect(r).toHaveLength(3);
    expect(r[0]).toBe('First.');
    expect(r[1]).toBe('Second!');
    expect(r[2]).toBe('Third?');
  });

  it('does NOT split on honorific periods (Dr. Mr. Mrs. etc.)', () => {
    // The bug-fix comment in the source calls this out explicitly.
    const r = PH().splitTextToSentences('Dr. Smith arrived. He saw Mrs. Jones.');
    expect(r).toHaveLength(2);
    expect(r[0]).toBe('Dr. Smith arrived.');
    expect(r[1]).toBe('He saw Mrs. Jones.');
  });

  it('does NOT split on single-capital-letter abbreviations', () => {
    // E.g., "Section A. is..." should not split after "A."
    const r = PH().splitTextToSentences('Section A. is the intro. Section B. is the body.');
    expect(r).toHaveLength(2);
  });

  it('preserves markdown links across the split', () => {
    const r = PH().splitTextToSentences('See [the docs](https://example.com). Then read on.');
    expect(r).toHaveLength(2);
    expect(r[0]).toContain('[the docs](https://example.com)');
  });

  it('preserves inline LaTeX across the split', () => {
    const r = PH().splitTextToSentences('Here is $x^2$ inline. Done.');
    expect(r).toHaveLength(2);
    expect(r[0]).toContain('$x^2$');
  });

  it('preserves block LaTeX across the split', () => {
    const r = PH().splitTextToSentences('Compute $$\\int_0^1 x dx$$ first. Continue.');
    expect(r).toHaveLength(2);
    expect(r[0]).toContain('$$\\int_0^1 x dx$$');
  });
});

describe('diffWords', () => {
  it('returns [] when either input is empty', () => {
    expect(PH().diffWords('', 'hello')).toEqual([]);
    expect(PH().diffWords('hello', '')).toEqual([]);
    expect(PH().diffWords(null, 'hi')).toEqual([]);
  });

  it('marks unchanged words as same', () => {
    const r = PH().diffWords('the quick fox', 'the quick fox');
    expect(r).toHaveLength(3);
    expect(r.every(d => d.type === 'same')).toBe(true);
  });

  it('detects an addition', () => {
    const r = PH().diffWords('the fox', 'the quick fox');
    const adds = r.filter(d => d.type === 'add');
    expect(adds).toHaveLength(1);
    expect(adds[0].value).toBe('quick');
  });

  it('detects a deletion', () => {
    const r = PH().diffWords('the quick fox', 'the fox');
    const dels = r.filter(d => d.type === 'del');
    expect(dels).toHaveLength(1);
    expect(dels[0].value).toBe('quick');
  });

  it('detects mixed add + del', () => {
    const r = PH().diffWords('the quick fox', 'the slow fox');
    const types = r.map(d => d.type).sort();
    expect(types).toContain('add');
    expect(types).toContain('del');
    expect(types.filter(t => t === 'same')).toHaveLength(2);
  });
});

describe('repairSourceMarkdown', () => {
  it('returns empty input unchanged', () => {
    expect(PH().repairSourceMarkdown('')).toBe('');
    expect(PH().repairSourceMarkdown(null)).toBe(null);
  });

  it('inserts a blank line before a heading that follows a sentence', () => {
    const input = 'A sentence ending here.## Heading';
    const out = PH().repairSourceMarkdown(input);
    expect(out).toContain('\n\n## Heading');
  });

  it("converts a leading `Title:` line to a markdown H1", () => {
    const out = PH().repairSourceMarkdown('Title: My Document\n\nBody text here.');
    expect(out.startsWith('# My Document')).toBe(true);
  });

  it('strips heading markers when the heading line is absurdly long', () => {
    // Lines starting with `#...` longer than 150 chars should have the
    // heading marker removed (they're not really headings).
    const longLine = '## ' + 'a'.repeat(200);
    const out = PH().repairSourceMarkdown(longLine);
    expect(out.startsWith('## ')).toBe(false);
    expect(out).toContain('a'.repeat(200));
  });

  it('chops a hanging unfinished trailing fragment', () => {
    // The source comment says: trailing < 120 chars without sentence-end
    // gets chopped if there was a recent sentence end.
    const input = 'This is a complete sentence. Another full sentence here. And then a partial fragment without';
    const out = PH().repairSourceMarkdown(input);
    expect(out).not.toContain('partial fragment without');
  });
});

describe('generateBingoCards', () => {
  // Minimal deps stub — the function takes deps via the (args, deps) shim.
  const makeDeps = (overrides = {}) => ({
    addToast: vi.fn(),
    t: (key) => key,
    fisherYatesShuffle: (arr) => [...arr], // identity shuffle for predictable tests
    ...overrides,
  });

  it('returns null and toasts when glossary is empty', () => {
    const deps = makeDeps();
    const r = PH().generateBingoCards([], 1, 5, deps);
    expect(r).toBeNull();
    expect(deps.addToast).toHaveBeenCalled();
  });

  it('generates the requested number of cards', () => {
    const glossary = Array.from({ length: 30 }, (_, i) => ({ term: `t${i}`, def: `def${i}` }));
    const r = PH().generateBingoCards(glossary, 3, 5, makeDeps());
    expect(r).toHaveLength(3);
  });

  it('puts a FREE SPACE in the center of an odd-sized card', () => {
    const glossary = Array.from({ length: 30 }, (_, i) => ({ term: `t${i}`, def: `def${i}` }));
    const cards = PH().generateBingoCards(glossary, 1, 5, makeDeps());
    // 5x5 = 25 cells, center is index 12
    expect(cards[0]).toHaveLength(25);
    expect(cards[0][12].type).toBe('free');
    expect(cards[0][12].term).toBe('FREE SPACE');
  });

  it('does NOT add FREE SPACE on even-sized cards', () => {
    const glossary = Array.from({ length: 30 }, (_, i) => ({ term: `t${i}`, def: `def${i}` }));
    const cards = PH().generateBingoCards(glossary, 1, 4, makeDeps());
    // 4x4 = 16 cells, no center
    expect(cards[0]).toHaveLength(16);
    expect(cards[0].every(c => c.type !== 'free')).toBe(true);
  });

  it('repeats the term pool when glossary is smaller than the card', () => {
    const glossary = [{ term: 'a', def: 'a-def' }, { term: 'b', def: 'b-def' }];
    const deps = makeDeps();
    const cards = PH().generateBingoCards(glossary, 1, 5, deps);
    // 5x5 needs 24 terms (+ 1 FREE), only 2 available, so the pool is repeated.
    expect(cards[0]).toHaveLength(25);
    // The repeating-info toast should have fired.
    expect(deps.addToast).toHaveBeenCalled();
  });
});

describe('_applyTextSurgery', () => {
  it('throws when jsdiff is not loaded', () => {
    const original = window.Diff;
    delete window.Diff;
    expect(() => PH()._applyTextSurgery('<p>hi</p>', 'hi')).toThrow(/jsdiff/);
    window.Diff = original;
  });

  it('returns no-text-nodes reason when HTML has no text', () => {
    const r = PH()._applyTextSurgery('<div></div>', '');
    expect(r.reason).toBe('no-text-nodes');
    expect(r.coverage).toBe(0);
  });

  it('preserves identical text without modification', () => {
    const html = '<p>hello world</p>';
    const r = PH()._applyTextSurgery(html, 'hello world');
    expect(r.coverage).toBe(1);
    expect(r.reason).toBe(null);
    expect(r.html).toContain('hello world');
  });

  it('applies a deletion edit when target text is shorter', () => {
    const html = '<p>hello cruel world</p>';
    const r = PH()._applyTextSurgery(html, 'hello world');
    expect(r.html).not.toContain('cruel');
    expect(r.html).toContain('hello');
    expect(r.html).toContain('world');
  });

  it('applies an insertion edit when target text is longer', () => {
    const html = '<p>hello world</p>';
    const r = PH()._applyTextSurgery(html, 'hello new world');
    expect(r.html).toContain('new');
  });

  it('reports coverage of approved tokens in the result', () => {
    // Coverage is computed against the input "effectiveText" tokens > 2 chars.
    const html = '<p>The quick brown fox jumps</p>';
    const r = PH()._applyTextSurgery(html, 'The quick brown fox jumps');
    expect(r.coverage).toBeGreaterThan(0.99);
  });

  it('skips editing inside <script> and <style> elements', () => {
    const html = '<p>visible</p><script>secret_in_script</script>';
    const r = PH()._applyTextSurgery(html, 'visible');
    // The function should leave script tag content intact (it filters them out
    // of text-walking via NodeFilter), so `secret_in_script` survives.
    expect(r.html).toContain('secret_in_script');
  });
});
