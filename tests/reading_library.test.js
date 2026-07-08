// Reading Library — pure-helper + data-contract tests.
//
// Loads the compiled reading_library_module.js IIFE into the vitest+jsdom
// harness (React stubbed, same pattern as anchor_charts.test.js) and locks
// down the narration/cue math plus the mirrored StoryWeaver data contract
// that reading_library/mirror_books.js must keep producing.

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB_DIR = path.join(ROOT, 'reading_library');

let RL;

beforeAll(() => {
  window.React = window.React || {
    useState: () => [undefined, () => {}],
    useEffect: () => {},
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    memo: (c) => c,
    createElement: () => null,
    Fragment: 'fragment',
  };
  loadAlloModule('reading_library_module.js');
  RL = window.AlloModules.ReadingLibrary;
  if (!RL) throw new Error('ReadingLibrary did not register on window.AlloModules');
});

describe('tr — guarded i18n fallback', () => {
  it('falls back to English when __alloT is missing', () => {
    delete window.__alloT;
    expect(RL._tr('readinglib_title', 'Reading Library')).toBe('Reading Library');
  });
  it('falls back to English when __alloT echoes the raw key', () => {
    window.__alloT = (k) => k; // raw-key echo defeats naive || fallbacks
    expect(RL._tr('readinglib_title', 'Reading Library')).toBe('Reading Library');
    delete window.__alloT;
  });
  it('uses the translation when __alloT returns one', () => {
    window.__alloT = () => 'Bibliothèque';
    expect(RL._tr('readinglib_title', 'Reading Library')).toBe('Bibliothèque');
    delete window.__alloT;
  });
  it('survives a throwing __alloT', () => {
    window.__alloT = () => { throw new Error('boom'); };
    expect(RL._tr('readinglib_title', 'Reading Library')).toBe('Reading Library');
    delete window.__alloT;
  });
});

describe('assignCues — narration cue assignment', () => {
  it('assigns cues 1:1 when tokens match the cue words', () => {
    const lines = RL._assignCues('Hello world', [[1, 'Hello'], [2, 'world']]);
    expect(lines).toEqual([[{ w: 'Hello', cue: 1 }, { w: 'world', cue: 2 }]]);
  });
  it('is punctuation- and case-insensitive', () => {
    const lines = RL._assignCues('"Ammachi! Ammachi!"', [[1, 'ammachi'], [2, 'AMMACHI']]);
    expect(lines[0][0].cue).toBe(1);
    expect(lines[0][1].cue).toBe(2);
  });
  it('preserves paragraph structure from newlines', () => {
    const lines = RL._assignCues('One two\nThree', [[5, 'One'], [6, 'two'], [7, 'Three']]);
    expect(lines.length).toBe(2);
    expect(lines[1][0]).toEqual({ w: 'Three', cue: 7 });
  });
  it('skips one unmatched cue word and resynchronizes', () => {
    // cue stream has an extra token the text does not ("uh"), then continues
    const lines = RL._assignCues('red blue', [[1, 'red'], [2, 'uh'], [3, 'blue']]);
    expect(lines[0][0].cue).toBe(1);
    expect(lines[0][1].cue).toBe(3);
  });
  it('gives null cues (never throws) with no words at all', () => {
    const lines = RL._assignCues('Just text here', null);
    expect(lines[0].every((t) => t.cue === null)).toBe(true);
  });
});

describe('findActiveCue / pageCueRange — playback math', () => {
  const cues = [[1, 0.0, 1.0], [2, 1.0, 2.0], [3, 2.5, 3.0]];
  it('returns the cue whose window contains t', () => {
    expect(RL._findActiveCue(cues, 0.5)).toBe(1);
    expect(RL._findActiveCue(cues, 1.5)).toBe(2);
    expect(RL._findActiveCue(cues, 2.7)).toBe(3);
  });
  it('holds the previous cue briefly across small gaps (grace window)', () => {
    expect(RL._findActiveCue(cues, 2.2)).toBe(2); // 2.0-2.35 grace
  });
  it('returns null before the first cue and with empty input', () => {
    expect(RL._findActiveCue(cues, -1)).toBe(null);
    expect(RL._findActiveCue([], 1)).toBe(null);
    expect(RL._findActiveCue(null, 1)).toBe(null);
  });
  it('pageCueRange spans min..max and is null for un-cued pages', () => {
    expect(RL._pageCueRange({ words: [[4, 'a'], [9, 'b'], [6, 'c']] })).toEqual([4, 9]);
    expect(RL._pageCueRange({ words: null })).toBe(null);
    expect(RL._pageCueRange(null)).toBe(null);
  });
});

describe('bookPlainText / attributionLine', () => {
  const book = {
    title: 'Test Book',
    authors: ['A. Author'],
    illustrators: ['I. Artist'],
    originalAuthors: [],
    publisher: 'Pratham Books',
    pages: [{ text: 'Page one.' }, { text: '' }, { text: 'Page two.' }],
  };
  it('concatenates title + page texts, skipping empty pages', () => {
    expect(RL._bookPlainText(book)).toBe('Test Book\n\nPage one.\n\nPage two.');
  });
  it('credits author, illustrator and publisher', () => {
    const line = RL._attributionLine(book);
    expect(line).toContain('A. Author');
    expect(line).toContain('I. Artist');
    expect(line).toContain('Pratham Books');
  });
  it('credits the original author on translations', () => {
    const tr2 = Object.assign({}, book, { authors: ['Translator T.'], originalAuthors: ['O. Author'] });
    expect(RL._attributionLine(tr2)).toContain('O. Author');
  });
});

describe('textLayoutClass — picture-book text layout', () => {
  it('centers short page text (the picture-book convention)', () => {
    expect(RL._textLayoutClass('3', 'A short caption under the art.')).toContain('text-center');
  });
  it('start-aligns long passages for readability', () => {
    expect(RL._textLayoutClass('4', 'word '.repeat(80))).not.toContain('text-center');
  });
  it('uses a larger face for levels 1-2 and standard for 3-4', () => {
    expect(RL._textLayoutClass('1', 'Hi.')).toContain('text-2xl');
    expect(RL._textLayoutClass('2', 'Hi.')).toContain('text-2xl');
    expect(RL._textLayoutClass('4', 'Hi.')).toContain('text-xl');
    expect(RL._textLayoutClass('4', 'Hi.')).not.toContain('text-2xl');
  });
  it('never emits text-left (would break RTL start alignment)', () => {
    expect(RL._textLayoutClass('4', 'word '.repeat(80))).not.toContain('text-left');
  });
});

describe('AI translation helpers', () => {
  it('parseTranslation accepts exact page-count JSON (with fence noise)', () => {
    const raw = '```json\n{"title":"Sheeko","pages":["a","","c"]}\n```';
    expect(RL._parseTranslation(raw, 3)).toEqual({ title: 'Sheeko', pages: ['a', '', 'c'] });
  });
  it('parseTranslation rejects page-count mismatch, bad JSON, and non-arrays', () => {
    expect(RL._parseTranslation('{"title":"x","pages":["a"]}', 3)).toBe(null);
    expect(RL._parseTranslation('not json at all', 3)).toBe(null);
    expect(RL._parseTranslation('{"title":"x","pages":"a,b,c"}', 3)).toBe(null);
    expect(RL._parseTranslation('', 3)).toBe(null);
  });
  it('parseTranslation stringifies null pages and tolerates a missing title', () => {
    const out = RL._parseTranslation('{"pages":[null,"b"]}', 2);
    expect(out.pages).toEqual(['', 'b']);
    expect(out.title).toBe(null);
  });
  it('isRtlLanguage knows the RTL targets and leaves the rest LTR', () => {
    expect(RL._isRtlLanguage('Kurdish')).toBe(true);
    expect(RL._isRtlLanguage('Hebrew')).toBe(true);
    expect(RL._isRtlLanguage('Farsi (Dari)')).toBe(true);
    expect(RL._isRtlLanguage('Somali')).toBe(false);
    expect(RL._isRtlLanguage('Ukrainian')).toBe(false);
    expect(RL._isRtlLanguage('')).toBe(false);
  });
  it('langCodeFor maps known names and omits unknown ones', () => {
    expect(RL._langCodeFor('Somali')).toBe('so');
    expect(RL._langCodeFor('Ukrainian')).toBe('uk');
    expect(RL._langCodeFor('Klingon')).toBe(null);
  });
});

describe('language plan (reading_library/languages.json)', () => {
  const plan = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'languages.json'), 'utf8')).plan;

  it('every entry has a language, a BCP47-ish code, and per-level counts', () => {
    expect(plan.length).toBeGreaterThanOrEqual(30);
    plan.forEach((p) => {
      expect(p.language.length).toBeGreaterThan(1);
      expect(p.code).toMatch(/^[a-z]{2,3}(-[A-Za-z0-9]+)?$/);
      const counts = Object.entries(p.perLevel);
      expect(counts.length).toBeGreaterThan(0);
      counts.forEach(([lvl, n]) => {
        expect(['1', '2', '3', '4']).toContain(lvl);
        expect(n).toBeGreaterThan(0);
      });
      // audioPerLevel is optional (narration-first top-up); when present it
      // must be well-formed too.
      if (p.audioPerLevel) {
        Object.entries(p.audioPerLevel).forEach(([lvl, n]) => {
          expect(['1', '2', '3', '4']).toContain(lvl);
          expect(n).toBeGreaterThan(0);
        });
      }
    });
  });

  it('only languages with a real StoryWeaver audio pool get audioPerLevel', () => {
    const withAudio = plan.filter((p) => p.audioPerLevel).map((p) => p.language).sort();
    expect(withAudio).toEqual(['Arabic', 'English', 'Hindi', 'Urdu']);
  });

  it('language names and codes are unique', () => {
    expect(new Set(plan.map((p) => p.language)).size).toBe(plan.length);
    expect(new Set(plan.map((p) => p.code)).size).toBe(plan.length);
  });

  it('every curated pick belongs to a planned language', () => {
    const planned = new Set(plan.map((p) => p.language));
    const curation = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'curation.json'), 'utf8'));
    curation.picks.forEach((p) => expect(planned.has(p.language)).toBe(true));
  });
});

describe('mirrored data contract (reading_library/)', () => {
  const index = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'index.json'), 'utf8'));

  it('index has the expected schema and attribution', () => {
    expect(index.schema).toBe('allo-reading-library-index@1');
    expect(index.attribution.text).toMatch(/StoryWeaver/);
    expect(index.attribution.licenseUrl).toMatch(/creativecommons/);
    expect(index.books.length).toBeGreaterThanOrEqual(250);
    expect(index.languages.length).toBeGreaterThanOrEqual(30);
  });

  it('language counts in the index add up', () => {
    const byLang = {};
    index.books.forEach((b) => { byLang[b.language] = (byLang[b.language] || 0) + 1; });
    index.languages.forEach((l) => expect(byLang[l.name]).toBe(l.count));
  });

  it('every book file exists, parses, and honors the book contract', () => {
    index.books.forEach((entry) => {
      const book = JSON.parse(fs.readFileSync(path.join(LIB_DIR, entry.file), 'utf8'));
      expect(book.schema).toBe('allo-reading-book@1');
      expect(book.license).toBeTruthy();
      expect(book.licenseUrl).toMatch(/^https?:\/\//);
      expect(book.source.url).toMatch(/^https?:\/\//);
      const sourceId = book.sourceId || (book.source && book.source.id) || entry.sourceId || 'storyweaver';
      if (sourceId === 'storyweaver') {
        expect(book.license).toBe('CC BY 4.0');
        expect(book.source.url).toMatch(/^https:\/\/storyweaver\.org\.in\//);
      } else {
        expect(entry.sourceId).toBe(sourceId);
        expect(['frontiers', 'nasa', 'noaa', 'usgs', 'wikisource', 'loc', 'gutenberg', 'openstax']).toContain(sourceId);
      }
      expect(book.pages.length).toBeGreaterThan(0);
      expect(book.title.length).toBeGreaterThan(0);
      // no page is silently empty: image or text must be present
      book.pages.forEach((p) => expect(!!(p.img || p.text)).toBe(true));
      // every book has SOME readable text (generation + practice depend on it)
      expect(book.stats.words).toBeGreaterThan(0);
      if (book.audio) {
        expect(book.audio.src).toMatch(/^https:\/\//);
        if (book.audio.cues) {
          for (let i = 1; i < book.audio.cues.length; i++) {
            expect(book.audio.cues[i][1]).toBeGreaterThanOrEqual(book.audio.cues[i - 1][1]);
          }
        }
      }
      if (entry.isRtl) expect(book.isRtl).toBe(true);
    });
  });

  it('public mirror of the data is in sync with the repo copy', () => {
    const pub = path.join(ROOT, 'prismflow-deploy', 'public', 'reading_library');
    const pubIndex = JSON.parse(fs.readFileSync(path.join(pub, 'index.json'), 'utf8'));
    expect(pubIndex.generatedAt).toBe(index.generatedAt);
    expect(pubIndex.books.length).toBe(index.books.length);
    index.books.forEach((entry) => {
      expect(fs.existsSync(path.join(pub, entry.file))).toBe(true);
    });
  });
});
