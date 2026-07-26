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
    expect(r).toContain('### Referenced Sources');               // 2026-06-24: no longer overclaims "Verified Sources"
    expect(r).not.toContain('Verified Sources');
    expect(r).toContain('have not been independently verified'); // carries the verify-before-citing caveat
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
    expect(r).toContain('have not been independently verified'); // every path carries the caveat now
  });
});

describe('processGrounding deterministic support placement', () => {
  const source = (uri, title = 'Source') => ({ web: { uri, title } });
  const support = (segment, groundingChunkIndices) => ({ segment, groundingChunkIndices });

  it('does not scan a support into the following same-line sentence', () => {
    const text = 'Claim one. Claim two.';
    const segmentText = 'Claim one.';
    const result = TPH.processGrounding(text, {
      groundingChunks: [source('https://example.edu/one')],
      groundingSupports: [support({
        partIndex: 0,
        startIndex: 0,
        endIndex: Buffer.byteLength(segmentText, 'utf8'),
        text: segmentText,
      }, [0])],
    }, 'Links Only', false, false);

    expect(result).toBe('Claim one. [⁽¹⁾](https://example.edu/one) Claim two.');
  });

  it('honors partIndex and UTF-8 byte offsets for emoji and accented text', () => {
    const part0 = 'Preface 😀. ';
    const part1 = 'Café is warm. Next sentence.';
    const segmentText = 'Café is warm.';
    const metadata = {
      __textParts: [{ text: part0 }, { text: part1 }],
      groundingChunks: [source('https://example.edu/cafe')],
      groundingSupports: [support({
        partIndex: 1,
        startIndex: 0,
        endIndex: Buffer.byteLength(segmentText, 'utf8'),
        text: segmentText,
      }, [0])],
    };

    expect(TPH.processGrounding(part0 + part1, metadata, 'Links Only', false, false))
      .toBe('Preface 😀. Café is warm. [⁽¹⁾](https://example.edu/cafe) Next sentence.');
  });

  it('accepts aligned text parts through the optional sixth argument', () => {
    const parts = ['First part. ', 'Second part.'];
    const segmentText = 'Second part.';
    const metadata = {
      groundingChunks: [source('https://example.edu/second')],
      groundingSupports: [support({
        partIndex: 1,
        startIndex: 0,
        endIndex: Buffer.byteLength(segmentText, 'utf8'),
        text: segmentText,
      }, [0])],
    };
    expect(TPH.processGrounding(parts.join(''), metadata, 'Links Only', false, false, parts))
      .toBe('First part. Second part. [⁽¹⁾](https://example.edu/second)');
  });

  it('skips mismatched segment text instead of searching for a duplicate phrase', () => {
    const text = 'Repeated claim. Repeated claim.';
    const metadata = {
      groundingChunks: [source('https://example.edu/repeated')],
      groundingSupports: [support({
        startIndex: 0,
        endIndex: Buffer.byteLength('Repeated claim.', 'utf8'),
        text: 'Different claim.',
      }, [0])],
    };
    expect(TPH.processGrounding(text, metadata, 'Links Only', false, false)).toBe(text);
  });

  it('preserves original chunk identity through filtering and keeps bibliography numbering aligned', () => {
    const text = 'Supported fact.';
    const metadata = {
      groundingChunks: [
        source('https://youtube.com/watch?v=rejected', 'Rejected video'),
        source('https://example.edu/accepted', 'Accepted article'),
      ],
      groundingSupports: [support({
        startIndex: 0,
        endIndex: Buffer.byteLength(text, 'utf8'),
        text,
      }, [1])],
    };
    const result = TPH.processGrounding(text, metadata);
    expect(result).toContain('[⁽²⁾](https://example.edu/accepted)');
    expect(result).toContain('2. [Accepted article](https://example.edu/accepted)');
    expect(result).not.toContain('Rejected video');
    expect(result).not.toContain('1. [Accepted article]');
  });

  it('does not fabricate paragraph citations when grounding supports are absent', () => {
    const text = 'First paragraph.\n\nSecond paragraph keeps [Source 1].';
    const metadata = { groundingChunks: [source('https://example.edu/consulted', 'Consulted source')] };
    const result = TPH.processGrounding(text, metadata);
    expect(result.startsWith(text)).toBe(true);
    expect(result.slice(0, text.length)).toBe(text);
    expect(result).toContain('[Source 1]');
    expect(result).not.toContain('[⁽¹⁾]');
    expect(result).toContain('1. [Consulted source](https://example.edu/consulted)');
  });
});

describe('normalizeCitationPlacement deterministic clusters', () => {
  const one = '[⁽¹⁾](https://a.test/path_(one))';
  const two = '[⁽²⁾](https://b.test/two)';

  it('uses one space and no comma or semicolon between adjacent citations', () => {
    expect(TPH.normalizeCitationPlacement(`Fact ${one}, ${two}.`)).toBe(`Fact. ${one} ${two}`);
    expect(TPH.normalizeCitationPlacement(`Fact ${one}; ${two}.`)).toBe(`Fact. ${one} ${two}`);
  });

  it('is idempotent and never creates comma-period or semicolon-period artifacts', () => {
    const once = TPH.normalizeCitationPlacement(`Fact ${one}, ${two}.`);
    expect(TPH.normalizeCitationPlacement(once)).toBe(once);
    expect(once).not.toContain(',.');
    expect(once).not.toContain(';.');
  });

  it('does not alter fenced code, Markdown hard breaks, or unrelated repeated spaces', () => {
    const input = `\`\`\`md\nCode ${one}, ${two}.  \n\`\`\`\nOutside  repeated  spaces.  \nFact ${one}, ${two}.`;
    const result = TPH.normalizeCitationPlacement(input);
    expect(result).toContain(`Code ${one}, ${two}.  `);
    expect(result).toContain('Outside  repeated  spaces.  \n');
    expect(result).toContain(`Fact. ${one} ${two}`);
  });
});

describe('reference structure helpers', () => {
  it.each([
    '# Source Text References',
    '## Accuracy Check References',
    '### Verified Sources',
    '#### Referenced Sources',
    '##### Sources',
    '###### References',
    '# Bibliography',
    '# R\u00e9f\u00e9rences',
    '## Sources du texte',
    '### Referencias',
    '#### Quellen',
    '## Works Cited',
  ])('recognizes the case-insensitive 1-6 hash header %s', (header) => {
    const mixedCase = header.replace(/[A-Za-z]/g, (char, index) => index % 2 ? char.toUpperCase() : char.toLowerCase());
    const split = TPH.splitReferencesFromBody(`Body.\n\n${mixedCase}\n\n1. [A](https://a.test)`);
    expect(split.body).toBe('Body.');
    expect(split.references).toContain(mixedCase);
  });

  it('keeps the bilingual delimiter and English body outside an earlier reference block', () => {
    const text = 'Hola.\n\n### References\n\n1. [Fuente](https://fuente.test)\n\n--- ENGLISH TRANSLATION ---\n\nHello.';
    const split = TPH.splitReferencesFromBody(text);
    expect(split.body).toBe('Hola.\n\n--- ENGLISH TRANSLATION ---\n\nHello.');
    expect(split.references).toContain('[Fuente](https://fuente.test)');
    expect(split.references).not.toContain('ENGLISH TRANSLATION');
    expect(split.references).not.toContain('Hello.');
  });

  it('parses balanced title brackets and URL parentheses without dropping duplicate entries or numbers', () => {
    const refs = '### References\n\n4. [Study [2026]](https://example.test/path_(v2))\n7. [Study [2026]](https://example.test/path_(v2))';
    const items = TPH.parseReferenceItems(refs);
    expect(items).toHaveLength(2);
    expect(items.map(item => item.num)).toEqual(['4', '7']);
    expect(items[0].title).toBe('Study [2026]');
    expect(items[0].url).toBe('https://example.test/path_(v2)');
  });
});

describe('citation conservation ledger', () => {
  it('records exact balanced-URL occurrences and ignores examples in fenced code', () => {
    const citation = '[⁽¹²⁾](https://example.test/path_(v2))';
    const text = `Use ${citation}.\n\n\`\`\`md\nIgnore ${citation}.\n\`\`\``;
    const ledger = TPH.extractCitationLedger(text);
    expect(ledger.occurrences).toHaveLength(1);
    expect(ledger.occurrences[0]).toMatchObject({ number: '12', url: 'https://example.test/path_(v2)' });
    expect(Object.keys(ledger.byKey)).toHaveLength(1);
  });

  it('reports missing, extra, and conflicting number-to-URL mappings', () => {
    const original = 'A [⁽¹⁾](https://a.test). B [⁽²⁾](https://b.test).';
    const candidate = 'A [⁽¹⁾](https://a.test). B [⁽²⁾](https://changed.test). C [⁽³⁾](https://c.test).';
    const report = TPH.validateCitationConservation(original, candidate);
    expect(report.valid).toBe(false);
    expect(report.missing).toContainEqual({ number: '2', url: 'https://b.test', count: 1 });
    expect(report.extra).toContainEqual({ number: '2', url: 'https://changed.test', count: 1 });
    expect(report.extra).toContainEqual({ number: '3', url: 'https://c.test', count: 1 });
    expect(report.conflictingMappings.map(item => item.number)).toEqual(expect.arrayContaining(['2', '3']));
  });

  it('accepts formatting-only citation movement when the exact occurrence multiset is conserved', () => {
    const original = 'Fact [⁽¹⁾](https://a.test).';
    const candidate = 'Fact. [⁽¹⁾](https://a.test)';
    expect(TPH.validateCitationConservation(original, candidate).valid).toBe(true);
  });
});
