// Unit tests for window.AlloModules.TextPipelineHelpers.
//
// Critical regression-locking targets:
// - toSuperscript: same Unicode citation pattern that was breaking TTS
//   karaoke yesterday; if this stops emitting U+207D/207E + superscript
//   digits, EVERY citation breaks.
// - sanitizeTruncatedCitations: URL/reference integrity (Gemini emits
//   garbage citations regularly)
// - normalizeCitationPlacement: positions citations after sentence-ending
//   punctuation; if it regresses, users see "text [(1)] ." everywhere

import { describe, it, expect, beforeAll } from 'vitest';
import { loadAlloModule } from './setup.js';

let TPH;
beforeAll(() => {
  loadAlloModule('text_pipeline_helpers_module.js');
  TPH = window.AlloModules.TextPipelineHelpers;
  if (!TPH) throw new Error('TextPipelineHelpers failed to register');
});

describe('toSuperscript', () => {
  it('converts single digits to Unicode superscript', () => {
    expect(TPH.toSuperscript(1)).toBe('¹');
    expect(TPH.toSuperscript(2)).toBe('²');
    expect(TPH.toSuperscript(0)).toBe('⁰');
    expect(TPH.toSuperscript(9)).toBe('⁹');
  });

  it('converts multi-digit numbers character-by-character', () => {
    expect(TPH.toSuperscript(12)).toBe('¹²');
    expect(TPH.toSuperscript(100)).toBe('¹⁰⁰');
    expect(TPH.toSuperscript(2026)).toBe('²⁰²⁶');
  });

  it('handles string-typed numeric input', () => {
    expect(TPH.toSuperscript('42')).toBe('⁴²');
  });

  it('passes through non-digit characters unchanged', () => {
    // The regex used downstream relies on superscript chars in [⁰-⁹] range,
    // so non-digits should leak through verbatim if they appear.
    expect(TPH.toSuperscript('1a2')).toBe('¹a²');
  });
});

describe('extractSourceTextForProcessing', () => {
  it('returns empty shape on empty input', () => {
    const r = TPH.extractSourceTextForProcessing('');
    expect(r.text).toBe('');
    expect(r.isBilingual).toBe(false);
  });

  it('returns input as monolingual when no delimiter', () => {
    const r = TPH.extractSourceTextForProcessing('Just some plain English text.');
    expect(r.isBilingual).toBe(false);
    expect(r.text).toBe('Just some plain English text.');
    expect(r.targetLangBlock).toBe(r.englishBlock);
  });

  it('splits bilingual text and returns English by default', () => {
    const text = 'Hola mundo.\n--- ENGLISH TRANSLATION ---\nHello world.';
    const r = TPH.extractSourceTextForProcessing(text);
    expect(r.isBilingual).toBe(true);
    expect(r.text).toBe('Hello world.');
    expect(r.targetLangBlock).toBe('Hola mundo.');
    expect(r.englishBlock).toBe('Hello world.');
  });

  it('returns target-language block when preferEnglish=false', () => {
    const text = 'Hola mundo.\n--- ENGLISH TRANSLATION ---\nHello world.';
    const r = TPH.extractSourceTextForProcessing(text, false);
    expect(r.text).toBe('Hola mundo.');
  });
});

describe('scrambleWord', () => {
  it('returns input unchanged for words shorter than 2 chars', () => {
    expect(TPH.scrambleWord('')).toBe('');
    expect(TPH.scrambleWord('a')).toBe('a');
  });

  it('returns a permutation of the same characters', () => {
    const original = 'photosynthesis';
    const scrambled = TPH.scrambleWord(original);
    expect(scrambled).toHaveLength(original.length);
    expect(scrambled.split('').sort().join('')).toBe(original.split('').sort().join(''));
  });

  it('does NOT return the same string as input', () => {
    // Function recurses if scrambled === word. Try a few times to confirm.
    for (let i = 0; i < 10; i++) {
      const r = TPH.scrambleWord('alphabet');
      expect(r).not.toBe('alphabet');
    }
  });
});

describe('fixCitationPlacement', () => {
  it('returns input unchanged for empty inputs', () => {
    expect(TPH.fixCitationPlacement('')).toBe('');
    expect(TPH.fixCitationPlacement(null)).toBe(null);
  });

  it('adds a missing space after heading markers', () => {
    expect(TPH.fixCitationPlacement('##Heading')).toBe('## Heading');
    expect(TPH.fixCitationPlacement('###Sub')).toBe('### Sub');
  });

  it('moves [N] citations after sentence-ending punctuation', () => {
    const r = TPH.fixCitationPlacement('Some claim [1].');
    // Punct should now precede the citation, with original whitespace preserved
    expect(r).toBe('Some claim. [1]');
  });
});

describe('sanitizeTruncatedCitations', () => {
  it('returns input unchanged for empty inputs', () => {
    expect(TPH.sanitizeTruncatedCitations('')).toBe('');
    expect(TPH.sanitizeTruncatedCitations(null)).toBe(null);
  });

  it('strips whitespace inside citation URLs (Gemini quirk)', () => {
    // Gemini sometimes emits "webmd. com/articles/284378" with stray spaces
    const broken = 'See more [⁽¹⁾](https://webmd. com/articles/284378).';
    const r = TPH.sanitizeTruncatedCitations(broken);
    expect(r).toContain('https://webmd.com/articles/284378');
    expect(r).not.toContain('webmd. com');
  });

  it('restores missing https:// prefix on citation URLs', () => {
    const broken = 'Source [⁽²⁾](example.com/article).';
    const r = TPH.sanitizeTruncatedCitations(broken);
    expect(r).toContain('https://example.com/article');
  });

  it('repairs truncated citation links by adding the missing closing paren', () => {
    // Rule R5 prefers repair over strip — adds the missing ")" before whitespace.
    const broken = 'Some text [⁽³⁾](https://partial.url\n';
    const r = TPH.sanitizeTruncatedCitations(broken);
    // After repair, the URL is preserved AND has a closing paren.
    expect(r).toContain('[⁽³⁾](https://partial.url)');
  });

  it('removes orphan superscript citations at end of line', () => {
    const broken = 'A claim ⁽⁴⁾\nNext line.';
    const r = TPH.sanitizeTruncatedCitations(broken);
    // The orphan ⁽⁴⁾ should be gone; next line preserved
    expect(r).not.toContain('⁽⁴⁾');
    expect(r).toContain('Next line');
  });

  it('preserves intact citations untouched', () => {
    const good = 'Verified ⁽¹⁾ source. [⁽¹⁾](https://example.com/article)';
    const r = TPH.sanitizeTruncatedCitations(good);
    expect(r).toContain('[⁽¹⁾](https://example.com/article)');
  });

  it('restores missing leading ⁽ in [N⁾](url) → [⁽N⁾](url)', () => {
    // Rule R4 — sometimes Gemini drops the opening superscript-paren
    const broken = 'Source [²⁾](https://example.com).';
    const r = TPH.sanitizeTruncatedCitations(broken);
    expect(r).toContain('[⁽²⁾](https://example.com)');
  });
});

describe('filterEducationalSources', () => {
  it('returns input unchanged for null/non-array', () => {
    expect(TPH.filterEducationalSources(null)).toBe(null);
    expect(TPH.filterEducationalSources('not an array')).toBe('not an array');
  });

  it('rejects YouTube URLs', () => {
    const chunks = [
      { web: { uri: 'https://www.youtube.com/watch?v=abc', title: 'A video' } },
      { web: { uri: 'https://example.edu/article', title: 'A real source' } },
    ];
    const r = TPH.filterEducationalSources(chunks);
    expect(r).toHaveLength(1);
    expect(r[0].web.uri).toContain('example.edu');
  });

  it('rejects social media URLs', () => {
    const chunks = [
      { web: { uri: 'https://twitter.com/user/status/123', title: 'tweet' } },
      { web: { uri: 'https://reddit.com/r/x', title: 'thread' } },
      { web: { uri: 'https://nih.gov/article', title: 'NIH article' } },
    ];
    const r = TPH.filterEducationalSources(chunks);
    expect(r).toHaveLength(1);
    expect(r[0].web.uri).toContain('nih.gov');
  });

  it('rejects sources with non-educational title patterns (movies, lyrics, etc.)', () => {
    const chunks = [
      { web: { uri: 'https://example.com/p1', title: 'Some Song (Official Music Video)' } },
      { web: { uri: 'https://example.com/p2', title: 'Real Article About Photosynthesis' } },
    ];
    const r = TPH.filterEducationalSources(chunks);
    expect(r).toHaveLength(1);
    expect(r[0].web.title).toContain('Photosynthesis');
  });
});

describe('generateBibliographyString', () => {
  it('returns "" when metadata or chunks empty', () => {
    expect(TPH.generateBibliographyString(null)).toBe('');
    expect(TPH.generateBibliographyString({})).toBe('');
    expect(TPH.generateBibliographyString({ groundingChunks: [] })).toBe('');
  });

  it('returns "" when all chunks are filtered out (e.g. all YouTube)', () => {
    const r = TPH.generateBibliographyString({
      groundingChunks: [
        { web: { uri: 'https://youtube.com/watch?v=x', title: 'video' } },
      ],
    });
    expect(r).toBe('');
  });

  it('formats sources as numbered markdown links', () => {
    const r = TPH.generateBibliographyString({
      groundingChunks: [
        { web: { uri: 'https://nih.gov/a', title: 'Article A' } },
        { web: { uri: 'https://cdc.gov/b', title: 'Article B' } },
      ],
    });
    expect(r).toContain('### Verified Sources');
    expect(r).toContain('1. [Article A](https://nih.gov/a)');
    expect(r).toContain('2. [Article B](https://cdc.gov/b)');
  });

  it('uses custom title when provided', () => {
    const r = TPH.generateBibliographyString(
      { groundingChunks: [{ web: { uri: 'https://nih.gov/a', title: 'A' } }] },
      'Links Only',
      'Source Citations',
    );
    expect(r).toContain('### Source Citations');
  });
});
