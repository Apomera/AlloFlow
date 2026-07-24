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
import { createRequire } from 'node:module';
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

describe('pageAudioClips — Bloom talking-book clip queue', () => {
  it('returns clip srcs in order and tolerates malformed entries', () => {
    expect(RL._pageAudioClips({ audio: [{ src: 'https://a/1.mp3', dur: 2 }, { src: 'https://a/2.mp3' }] }))
      .toEqual(['https://a/1.mp3', 'https://a/2.mp3']);
    expect(RL._pageAudioClips({ audio: [{ dur: 2 }, null, { src: 'https://a/3.mp3' }] }))
      .toEqual(['https://a/3.mp3']);
  });
  it('is empty for pages without narration and for null pages', () => {
    expect(RL._pageAudioClips({ text: 'no audio here' })).toEqual([]);
    expect(RL._pageAudioClips(null)).toEqual([]);
  });
});

describe('bloomEditionsFor — cross-language edition linking', () => {
  const idx = [
    { slug: 'bloom-5a8f7349-untitled', language: 'Ukrainian', contentType: 'story' },
    { slug: 'bloom-5a8f7349-untitled-ar', language: 'Arabic', contentType: 'story' },
    { slug: 'bloom-card-5a8f7349-something', language: 'Somali', contentType: 'open-access-source-card' },
    { slug: 'bloom-99999999-other-book', language: 'Khmer', contentType: 'story' },
    { slug: '16411-too-big-too-small', language: 'English', contentType: 'story' },
  ];
  it('finds sibling editions of the same Bloom record, excluding self and cards', () => {
    const eds = RL._bloomEditionsFor('bloom-5a8f7349-untitled', idx);
    expect(eds.map((b) => b.slug)).toEqual(['bloom-5a8f7349-untitled-ar']);
  });
  it('returns nothing for non-Bloom slugs, cards, and unmatched records', () => {
    expect(RL._bloomEditionsFor('16411-too-big-too-small', idx)).toEqual([]);
    expect(RL._bloomEditionsFor('bloom-card-5a8f7349-something', idx)).toEqual([]);
    expect(RL._bloomEditionsFor('bloom-99999999-other-book', idx)).toEqual([]);
    expect(RL._bloomEditionsFor(null, idx)).toEqual([]);
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
  it('extracts only clean reader text for the lesson pipeline', () => {
    const noisy = {
      title: '  Clean Source  ',
      cover: { card: 'https://example.test/cover.png' },
      description: 'Metadata should not become source text.',
      pages: [
        {
          text: 'Main reading text. ![chart](data:image/png;base64,AAAA) <img src="x.png" alt="not source">',
          img: 'https://example.test/page.png',
          caption: 'Visual caption should stay out.',
          alt: 'Alt text should stay out.',
          source: { url: 'https://example.test/original' },
        },
        { img: 'https://example.test/image-only.jpg', caption: 'Image-only caption should not be pulled in.' },
        'A plain string page with <figure><figcaption>hidden caption</figcaption></figure> useful text.',
        { text: ['Line one', { visual: 'skip me' }, 'Line two'] },
        { text: { nested: 'object text is not safe input' } },
      ],
    };
    const out = RL._bookPlainText(noisy);
    expect(out).toBe('Clean Source\n\nMain reading text.\n\nA plain string page with useful text.\n\nLine one\nLine two');
    expect(out).not.toContain('caption');
    expect(out).not.toContain('Alt text');
    expect(out).not.toContain('data:image');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('Metadata');
    expect(out).not.toContain('object text');
  });
  it('supports translated page arrays through the same cleanup path', () => {
    expect(RL._bookPlainTextFromPages('Translated', ['First page', '![cover](x.png)', 'Second page']))
      .toBe('Translated\n\nFirst page\n\nSecond page');
  });
  it('detects chapters and extracts only the selected chapter or page range', () => {
    const pages = [
      { text: 'Preface\nA note before the book.' },
      { text: 'CHAPTER I\nThe first chapter starts here.' },
      { text: 'The first chapter continues.' },
      { text: 'CHAPTER II\nThe second chapter starts here.' },
      { text: 'The second chapter continues.' },
    ];
    const sections = RL._detectReadingSections('Long Book', pages);
    expect(sections.map((s) => [s.title, s.start, s.end])).toEqual([
      ['Preface', 0, 0],
      ['CHAPTER I', 1, 2],
      ['CHAPTER II', 3, 4],
    ]);
    const chapter = RL._bookPlainTextForScope('Long Book', pages, 'chapter', 1, '', '', sections);
    expect(chapter.label).toBe('CHAPTER I (Pages 2-3)');
    expect(chapter.text).toContain('The first chapter starts here.');
    expect(chapter.text).toContain('The first chapter continues.');
    expect(chapter.text).not.toContain('The second chapter starts here.');

    const range = RL._bookPlainTextForScope('Long Book', pages, 'range', 0, '3', '4', sections);
    expect(range.label).toBe('Pages 3-4');
    expect(range.text).toContain('The first chapter continues.');
    expect(range.text).toContain('The second chapter starts here.');
    expect(range.text).not.toContain('A note before the book.');
  });
  it('treats full texts and very long books as long-form source material', () => {
    expect(RL._isLongFormBook({ contentType: 'public-domain-full-text' }, [{ text: 'short' }])).toBe(true);
    expect(RL._isLongFormBook({ stats: { words: 12000 } }, [{ text: 'short' }])).toBe(true);
    expect(RL._isLongFormBook({ stats: { words: 500 } }, [{ text: 'short' }])).toBe(false);
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
  it('uses a quieter sustained-reading face for levels 5-6', () => {
    expect(RL._textLayoutClass('5', 'word '.repeat(80))).toContain('text-base');
    expect(RL._textLayoutClass('6', 'word '.repeat(80))).toContain('text-base');
    expect(RL._textLayoutClass('6', 'word '.repeat(80))).not.toContain('text-xl');
  });
  it('never emits text-left (would break RTL start alignment)', () => {
    expect(RL._textLayoutClass('4', 'word '.repeat(80))).not.toContain('text-left');
  });
});

describe('chromeThemeClass / readingTimeLabel', () => {
  it('maps only real chrome themes to a scoped class', () => {
    expect(RL._chromeThemeClass('dark')).toBe('rl-theme-dark');
    expect(RL._chromeThemeClass('highContrast')).toBe('rl-theme-highContrast');
    expect(RL._chromeThemeClass('sepia')).toBe('rl-theme-sepia');
    expect(RL._chromeThemeClass('default')).toBe('');
    expect(RL._chromeThemeClass('nonsense')).toBe('');
  });
  it('estimates reading time by level and skips link-out cards', () => {
    expect(RL._readingTimeLabel({ level: '4', wordCount: 1400 })).toMatch(/~\s*10\s*min/);
    expect(RL._readingTimeLabel({ level: '6', wordCount: 190 * 75, contentType: 'public-domain-full-text' })).toMatch(/hr/);
    expect(RL._readingTimeLabel({ level: '4', wordCount: 1400, contentType: 'public-domain-catalog-card' })).toBe('');
    expect(RL._readingTimeLabel({ level: '4' })).toBe('');
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
  const cardIndex = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'index_cards.json'), 'utf8'));
  // The lazy-split ships catalog-card stubs in a second file the module loads
  // on demand; the browse-facing catalog is the UNION of both, so every
  // contract check runs over the merged list.
  const allBooks = index.books.concat(cardIndex.books);
  const combinedIndex = { books: allBooks };

  it('index has the expected schema and attribution', () => {
    expect(index.schema).toBe('allo-reading-library-index@1');
    expect(index.attribution.text).toMatch(/StoryWeaver/);
    expect(index.attribution.licenseUrl).toMatch(/creativecommons/);
    expect(allBooks.length).toBeGreaterThanOrEqual(250);
    expect(index.languages.length).toBeGreaterThanOrEqual(30);
  });

  it('lazy-split: core index holds no catalog cards, card index holds only cards, and they agree', () => {
    expect(index.cardsFile).toBe('index_cards.json');
    expect(cardIndex.schema).toBe('allo-reading-library-index-cards@1');
    expect(index.books.some((b) => b.contentType === 'public-domain-catalog-card')).toBe(false);
    expect(cardIndex.books.every((b) => b.contentType === 'public-domain-catalog-card')).toBe(true);
    expect(index.cardsCount).toBe(cardIndex.books.length);
    // Same timestamp — the mirror writes both in one pass; a mismatch means a
    // stale card file shipped against a fresh core.
    expect(cardIndex.generatedAt).toBe(index.generatedAt);
  });

  it('language counts in the index add up', () => {
    const byLang = {};
    allBooks.forEach((b) => { byLang[b.language] = (byLang[b.language] || 0) + 1; });
    index.languages.forEach((l) => expect(byLang[l.name]).toBe(l.count));
  });

  it('registries, index, and physical files have exact one-to-one coverage', () => {
    const curation = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'curation.json'), 'utf8'));
    const openCatalog = JSON.parse(fs.readFileSync(path.join(LIB_DIR, 'open_catalog.json'), 'utf8'));
    const registeredSlugs = curation.picks.map((item) => item.slug).concat(openCatalog.items.map((item) => item.slug));
    const indexSlugs = allBooks.map((item) => item.slug);
    const indexFiles = allBooks.map((item) => item.file);
    const physicalFiles = fs.readdirSync(path.join(LIB_DIR, 'books'))
      .filter((name) => name.endsWith('.json'))
      .map((name) => 'books/' + name);

    expect(new Set(registeredSlugs).size).toBe(registeredSlugs.length);
    expect(new Set(indexSlugs).size).toBe(indexSlugs.length);
    expect(new Set(indexFiles).size).toBe(indexFiles.length);
    expect(indexSlugs.slice().sort()).toEqual(registeredSlugs.slice().sort());
    expect(indexFiles.slice().sort()).toEqual(physicalFiles.slice().sort());
  });

  it('every book file parses, matches its index entry, and honors the full book contract', { timeout: 120000 }, () => {
    const errors = [];
    const fail = (condition, message) => { if (!condition) errors.push(message); };
    const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

    allBooks.forEach((entry) => {
      fail(/^books\/[^/]+\.json$/.test(entry.file), entry.slug + ': unsafe file path');
      const book = JSON.parse(fs.readFileSync(path.join(LIB_DIR, entry.file), 'utf8'));
      const label = entry.file + ' (' + entry.slug + ')';
      fail(book.schema === 'allo-reading-book@1', label + ': bad schema');
      fail(book.slug === entry.slug, label + ': slug mismatch');
      fail(!!book.license, label + ': missing license');
      fail(/^https?:\/\//.test(book.licenseUrl || ''), label + ': bad license URL');
      fail(/^https?:\/\//.test((book.source && book.source.url) || ''), label + ': bad source URL');
      const sourceId = book.sourceId || (book.source && book.source.id) || entry.sourceId || 'storyweaver';
      if (sourceId === 'storyweaver') {
        fail(book.license === 'CC BY 4.0', label + ': StoryWeaver license drift');
        fail(/^https:\/\/storyweaver\.org\.in\//.test(book.source.url), label + ': StoryWeaver source drift');
      } else {
        fail(entry.sourceId === sourceId, label + ': source id mismatch');
        fail(['frontiers', 'nasa', 'noaa', 'usgs', 'wikisource', 'loc', 'gutenberg', 'openstax', 'ck12', 'bloom'].includes(sourceId), label + ': unknown source');
      }
      fail(Array.isArray(book.pages) && book.pages.length > 0, label + ': no pages');
      fail(!!(book.title && book.title.length), label + ': no title');
      (book.pages || []).forEach((page, pageIdx) => {
        fail(page.n === pageIdx + 1, label + ': nonsequential page ' + pageIdx);
        fail(!!(page.img || page.text), label + ': empty page ' + (pageIdx + 1));
        // Page art is hotlinked (StoryWeaver GCS, Bloom S3, Gutenberg cache);
        // captions ride along for alt text and must never appear without art.
        if (page.img) fail(typeof page.img === 'string' && /^https?:\/\//.test(page.img), label + ': bad page image URL ' + (pageIdx + 1));
        if (page.imgCaption != null) {
          fail(!!page.img, label + ': image caption without an image ' + (pageIdx + 1));
          fail(typeof page.imgCaption === 'string' && page.imgCaption.trim().length > 0 && page.imgCaption.length <= 300,
            label + ': bad image caption ' + (pageIdx + 1));
        }
      });
      const actualWords = (book.pages || []).reduce((sum, page) => (
        sum + (String(page.text || '').trim().match(/\S+/g) || []).length
      ), 0);
      fail(book.stats && book.stats.pages === book.pages.length, label + ': page statistics mismatch');
      fail(book.stats && book.stats.words === actualWords, label + ': word statistics mismatch');
      fail(actualWords > 0, label + ': no readable words');
      fail(!JSON.stringify(book).includes('\uFFFD'), label + ': replacement character in imported text');

      const expectedIndexFields = {
        title: book.title, description: book.description, language: book.language,
        langCode: book.langCode, isRtl: book.isRtl, level: book.level, sourceId,
        contentType: book.contentType || 'story', subjects: book.subjects || [],
        license: book.license, licenseUrl: book.licenseUrl, source: book.source || null,
        // StoryWeaver covers are {card,large} objects; Gutendex covers are
        // plain URL strings (mirror_books.js accepts both).
        cover: typeof book.cover === 'string' ? book.cover : (book.cover && book.cover.card) || null,
        authors: book.authors,
        illustrators: book.illustrators, publisher: book.publisher,
        hasAudio: !!book.audio, pageCount: book.stats && book.stats.pages,
        wordCount: book.stats && book.stats.words,
      };
      Object.entries(expectedIndexFields).forEach(([key, value]) => {
        fail(same(entry[key], value), label + ': index field drift: ' + key);
      });

      if (book.audio && book.audio.mode === 'perPage') {
        // Bloom talking books: no whole-book mp3; ordered per-page clips.
        let clipCount = 0;
        (book.pages || []).forEach((p, pi) => (p.audio || []).forEach((c, ci) => {
          clipCount++;
          fail(/^https:\/\//.test((c && c.src) || ''), label + ': bad page-audio clip ' + (pi + 1) + '/' + ci);
        }));
        fail(clipCount > 0, label + ': perPage audio with no clips');
      } else if (book.audio) {
        fail(/^https:\/\//.test(book.audio.src || ''), label + ': bad audio URL');
        if (book.audio.cues) {
          book.audio.cues.forEach((cue, cueIdx) => {
            fail(Array.isArray(cue) && cue.length >= 3, label + ': malformed cue ' + cueIdx);
            fail(Number.isFinite(cue[1]) && Number.isFinite(cue[2]), label + ': nonnumeric cue ' + cueIdx);
            fail(cue[2] >= cue[1], label + ': negative cue window ' + cueIdx);
            if (cueIdx) fail(cue[1] >= book.audio.cues[cueIdx - 1][1], label + ': unsorted cue ' + cueIdx);
          });
        }
      }
      if (entry.isRtl) fail(book.isRtl === true, label + ': RTL mismatch');
    });

    expect(errors).toEqual([]);
  });

  it('mirrored Gutenberg full texts carry no print-era markup artifacts', { timeout: 60000 }, () => {
    // The importer strips [Illustration…] blocks, bracketed/boxed transcriber
    // notes, and _underscore_ emphasis (they render raw and TTS reads them
    // aloud). Guards both future imports and the 2026-07-12 cleanup pass.
    const offenders = [];
    index.books.filter((b) => b.contentType === 'public-domain-full-text').forEach((entry) => {
      const book = JSON.parse(fs.readFileSync(path.join(LIB_DIR, entry.file), 'utf8'));
      const joined = book.pages.map((p) => p.text || '').join('\n');
      // Markup form only ("[Illustration]" / "[Illustration: …"): prose can
      // legitimately contain the word after a bracket (Twain quotes an ad
      // with "[Illustrations of it thoughtlessly omitted…]").
      if (/\[Illustration(?::|\])/i.test(joined)) offenders.push(entry.slug + ': [Illustration block');
      if (/\[Transcriber'?s? Note/i.test(joined)) offenders.push(entry.slug + ': transcriber note');
      // Volunteer production credits belong to PG's boilerplate, not the book;
      // they sometimes sit after the *** START marker (front pages only).
      const front = book.pages.slice(1, 3).map((p) => p.text || '').join('\n\n');
      if (/^(Produced by|E-?text prepared by)/im.test(front) || /Distributed Proofreading|pgdp\.net/i.test(front)) {
        offenders.push(entry.slug + ': production credits in front matter');
      }
      // Same guards as the importer's stripEmphasisUnderscores: underscores
      // used as table blank-fills (space-anchored) or in ASCII diagrams
      // (| / \ etc.) are legitimate content and stay.
      const emphasis = (joined.match(/_[^_\n]{1,100}?_/g) || []).filter((m) => {
        const inner = m.slice(1, -1);
        return /^\S(?:[\s\S]*\S)?$/.test(inner) && !/[|\/\\{}<>=+~]/.test(inner);
      });
      if (emphasis.length) offenders.push(entry.slug + ': ' + emphasis.length + ' underscore pairs e.g. ' + emphasis[0]);
    });
    expect(offenders).toEqual([]);
  });

  it('prefers the bundled catalog and provides a path beyond the first render batch', () => {
    const source = fs.readFileSync(path.join(ROOT, 'reading_library_module.js'), 'utf8');
    const bases = source.slice(source.indexOf('var DATA_BASES'), source.indexOf('var VISIBLE_BOOK_BATCH'));
    expect(bases.indexOf("'./reading_library/'")).toBeGreaterThanOrEqual(0);
    expect(bases.indexOf("'./reading_library/'")).toBeLessThan(bases.indexOf('alloflow-cdn.pages.dev'));
    expect(source).toContain('setVisibleLimit(function (n) { return n + VISIBLE_BOOK_BATCH; })');
    expect(source).toContain("tr('readinglib_show_more', 'Show more')");
    expect(source).not.toContain('MAX_VISIBLE_BOOKS');
  });

  describe('moreByAuthor — same-author discovery', () => {
    const book = (over) => Object.assign({
      slug: 's', title: 'T', language: 'English', contentType: 'public-domain-full-text', authors: [],
    }, over);

    it('matches other books by a shared personal author, excluding self', () => {
      const anne = book({ slug: 'anne-1', title: 'Anne of Green Gables', authors: ['Montgomery, L. M. (Lucy Maud)'] });
      const shelf = [
        anne,
        book({ slug: 'anne-2', title: 'Anne of Avonlea', authors: ['Montgomery, L. M. (Lucy Maud)'] }),
        book({ slug: 'blue', title: 'The Blue Castle', authors: ['Montgomery, L. M. (Lucy Maud)'] }),
        book({ slug: 'oz', title: 'Wizard of Oz', authors: ['Baum, L. Frank'] }),
      ];
      const out = RL._moreByAuthor(anne, shelf, {}, 8).map((b) => b.slug);
      expect(out).toEqual(['anne-2', 'blue']);
      expect(out).not.toContain('anne-1');
      expect(out).not.toContain('oz');
    });

    it('ignores generic and collective/organization authors', () => {
      const gutenberg = book({ slug: 'g1', authors: ['Project Gutenberg'] });
      const shelfG = [gutenberg, book({ slug: 'g2', authors: ['Project Gutenberg'] })];
      expect(RL._moreByAuthor(gutenberg, shelfG, {}, 8)).toEqual([]);
      const org = book({ slug: 'o1', authors: ['Translators Without Borders'] });
      const shelfO = [org, book({ slug: 'o2', authors: ['Translators Without Borders'] }), book({ slug: 'o3', authors: ['Bloom Library Community'] })];
      expect(RL._moreByAuthor(org, shelfO, {}, 8)).toEqual([]);
    });

    it('prefers same-language titles and respects the exclude set and limit', () => {
      const kip = book({ slug: 'jungle', authors: ['Kipling, Rudyard'], language: 'English' });
      const shelf = [
        kip,
        book({ slug: 'kim-hi', title: 'Kim (Hindi)', authors: ['Kipling, Rudyard'], language: 'Hindi' }),
        book({ slug: 'kim-en', title: 'Kim', authors: ['Kipling, Rudyard'], language: 'English' }),
        book({ slug: 'justso', title: 'Just So Stories', authors: ['Kipling, Rudyard'], language: 'English' }),
      ];
      const out = RL._moreByAuthor(kip, shelf, { justso: true }, 8).map((b) => b.slug);
      expect(out[0]).toBe('kim-en'); // English before Hindi
      expect(out).not.toContain('justso'); // excluded
      expect(RL._moreByAuthor(kip, shelf, {}, 1).length).toBe(1); // limit honored
    });

    it('never surfaces source cards', () => {
      const a = book({ slug: 'a', authors: ['Verne, Jules'] });
      const shelf = [a,
        book({ slug: 'card', authors: ['Verne, Jules'], contentType: 'public-domain-catalog-card' }),
        book({ slug: 'real', authors: ['Verne, Jules'] })];
      expect(RL._moreByAuthor(a, shelf, {}, 8).map((b) => b.slug)).toEqual(['real']);
    });
  });

  describe('pagination splitter (importer + --repaginate share it)', () => {
    const req = createRequire(import.meta.url);
    const importer = req(path.join(LIB_DIR, 'import_gutenberg_full_texts.js'));

    it('never adds, drops, or alters a token at any page target', () => {
      // Curly quotes, ellipses, footnote refs, and no-space punctuation are
      // exactly what regex sentence-tiling mangles; slice-based chunking must
      // keep the token stream byte-identical.
      const nasty = [
        'He said “Play it off!” and left. She replied ‘why?’ and ran. More words follow here to overflow the target and force chunking of this paragraph.',
        'It was the upshot. ... I will send A. Murray’s note.[3] Then came etc.; c’est-à-dire more prose that keeps going and going until the splitter must cut somewhere in the middle.',
        'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty.',
      ];
      const pages = importer.splitIntoReadingPages(nasty, { target: 12, max: 18 });
      expect(pages.length).toBeGreaterThan(3);
      const tokens = (arr) => arr.join(' ').split(/\s+/).filter(Boolean).join(' ');
      expect(tokens(pages)).toBe(tokens(nasty));
    });

    it('keeps verse and table blocks whole even when they overflow the page', () => {
      const verse = Array.from({ length: 30 }, (_, i) => 'verse line number ' + (i + 1)).join('\n');
      const pages = importer.splitIntoReadingPages([verse], { target: 12, max: 18 });
      expect(pages).toEqual([verse]);
    });

    it('scales page size down for short texts', () => {
      expect(importer.pageTargetsFor(983).target).toBeLessThan(importer.pageTargetsFor(5000).target);
      expect(importer.pageTargetsFor(5000).target).toBeLessThan(importer.pageTargetsFor(50000).target);
      expect(importer.pageTargetsFor(50000).target).toBe(520);
    });
  });

  // This reads both copies of the full runtime corpus (currently ~280 MB
  // total). Keep the byte-for-byte assertion, but allow for cold OneDrive and
  // full-suite worker I/O contention on Windows.
  it('public mirror is byte-for-byte in sync with every runtime data file', { timeout: 180000 }, () => {
    const pub = path.join(ROOT, 'desktop/web-app', 'public', 'reading_library');
    const mismatches = [];
    ['index.json', 'index_cards.json', 'open_catalog.json'].concat(allBooks.map((entry) => entry.file)).forEach((name) => {
      const source = fs.readFileSync(path.join(LIB_DIR, name));
      const deployed = fs.readFileSync(path.join(pub, name));
      if (!source.equals(deployed)) mismatches.push(name);
    });
    expect(mismatches).toEqual([]);
  });
});
