// @vitest-environment jsdom
// Wave 7 Track B comprehensive regression suite (B1-B8):
// - B1: All 7 printable sheets (RTL lang/dir, Intl.Segmenter grapheme boxes, letters vs sounds label,
//       no double-numbered Worksheet Answer Key, minmax(0,1fr) grids, break-after/inside, empty Loop Key omitted)
// - B2: Printable picture rescue (term/targetWord), structured imageAttribution credits via formatPictureCredit,
//       decorative alt="" + aria-hidden="true"
// - B3: applySheetReadingSupports() skipping .noprint/.elkonin-box/.bingo-free + <b data-awp-bionic="1"> contrast CSS
// - B4: PPTX buildPictureSlidesPptx defBox above audio lane + overflow continuation, hardened JPEG SOF scan,
//       RTL footer right-alignment, everyDeviceAudio transcoding voice annotations
// - B5: Core text() XML-illegal/surrogate strip + maskWord() Lao/Khmer/Myanmar + \p{M} + curly ’s +
//       standalone offline HTML timed finishRound, sentence mode repeated-wrong announcements & tried state,
//       img.onerror calm fallback, SVG xmlns auto-injection & explicit rasterization failure
// - B6: Word Sounds guarded retry/auto-hide/sentence_match timers + sentence_match click lock +
//       Sound Sort / Word Families / letter_tracing cancellation guards
// - B7: Word Sounds SR labels/aria-pressed/aria-valuenow, SyllableBlending data-ws-cards, Counting 11+ card state,
//       read_sentence dir, Orthography pe-28 + Clear label, SoundMapping flex-wrap, 44px touch targets,
//       PhonologyView localized prompt & digraph soundCount slot alignment
// - B8: LetterTraceView onTouchCancel + localized/announced tips, renderProbeResults 1:00 duration / display name /
//       AA contrast / 100dvh / 44px buttons, showSessionComplete 100dvh / aria-hidden FX & trophy / calm recap pills
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { React, baseProps, setupWordSounds } from './helpers/word_sounds_harness.js';
import { installCanvasStub, makePackItem } from './helpers/word_sounds_pack_fixture.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(path.resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(path.resolve('desktop/web-app/node_modules/react-dom/test-utils'));

const read = (file) => fs.readFileSync(path.resolve(file), 'utf8');
const coreSource = read('word_practice_core.js');
const mediaSource = read('word_practice_media.js');
const uiSource = read('word_practice_ui.js');
const wsSource = read('word_sounds_module.js');
const alloDataSource = read('allo_data_source.jsx');
const alloDataModule = read('allo_data_module.js');
const uiStrings = JSON.parse(read('ui_strings.js'));
const uiStringsCore = JSON.parse(read('ui_strings_core.js'));

const dataUrl = (mime, bytes) => 'data:' + mime + ';base64,' + Buffer.from(bytes).toString('base64');
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const PNG = dataUrl('image/png', [
  0x89, 0x50, 0x4e, 0x47, 13, 10, 26, 10,
  0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
  ...u32(200), ...u32(100), 8, 6, 0, 0, 0, 0, 0, 0, 0, 0,
]);
const SVG_URI = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="15"/></svg>'
);
const WAV = 'data:audio/wav;base64,' + Buffer.from('RIFF' + '\0'.repeat(4) + 'WAVE' + '\0'.repeat(40)).toString('base64');
const WEBM = 'data:audio/webm;base64,' + Buffer.from([26, 69, 223, 163, ...Array(28).fill(0)]).toString('base64');

const openedWindows = [];
function loadWordPractice(extra = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'https://alloflow.example/',
  });
  const win = dom.window;
  openedWindows.push(win);
  Object.assign(win, extra);
  win.eval(coreSource);
  win.eval(mediaSource);
  win.eval(uiSource);
  return {
    win,
    core: win.AlloWordPracticeCore,
    media: win.AlloWordPracticeMedia,
    ui: win.AlloModules.WordPractice,
  };
}

class FakePresentation {
  constructor() { this.slides = []; }
  addSlide() {
    const slide = {
      texts: [],
      images: [],
      media: [],
      notes: [],
      addText(text, options) { this.texts.push({ text, options }); },
      addImage(options) { this.images.push(options); },
      addMedia(options) { this.media.push(options); },
      addNotes(text) { this.notes.push(text); },
    };
    this.slides.push(slide);
    return slide;
  }
}

afterEach(() => {
  while (openedWindows.length) {
    try { openedWindows.pop().close(); } catch (_) {}
  }
});

describe('B1: All 7 printable sheets (RTL, grapheme Elkonin boxes, Worksheet Key, print/390px layout)', () => {
  const BUILDERS = [
    'buildFlashcardsHtml',
    'buildFrayerHtml',
    'buildSortingCardsHtml',
    'buildWorksheetHtml',
    'buildBingoHtml',
    'buildLoopGameHtml',
    'buildWordWallHtml',
  ];

  it('attaches per-item lang/dir="rtl" on words, definitions, examples, and .elkonin rows across all 7 sheets while preserving wave4 invariants', () => {
    const { media } = loadWordPractice();
    const pack = {
      title: 'Arabic Vocabulary',
      language: 'Arabic',
      words: [
        { word: 'شَمْس', definition: 'النجم المضيء في السماء', example: 'تشرق شَمْس الصباح.' },
        { word: 'قَمَر', definition: 'جسم مضيء في الليل', example: 'يظهر قَمَر الليل.' },
      ],
    };
    for (const fn of BUILDERS) {
      const html = media[fn](pack);
      expect(html, fn).toContain('@page{margin:12mm}');
      expect(html, fn).toContain('.noprint{display:none}');
      expect(html, fn).toContain('class="noprint print-bar"');
      expect(html, fn).toContain('onclick="window.print()"');
      expect(html, fn).not.toMatch(/<script/i);
      expect(html.slice(15), fn).not.toContain('!');
      expect(html, fn).toContain('lang="ar" dir="rtl"');
      expect(html, fn).toContain('h1,h2,h3{break-after:avoid;page-break-after:avoid}');

      const doc = new JSDOM(html).window.document;
      const elkoninRows = [...doc.querySelectorAll('.elkonin')];
      if (elkoninRows.length) {
        expect(elkoninRows.every((row) => row.getAttribute('dir') === 'rtl' && row.getAttribute('lang') === 'ar'), fn).toBe(true);
      }
    }
    // Flashcards & Frayer use minmax(0,1fr) 2-column grids to prevent 390px/print fold overflow.
    expect(media.buildFlashcardsHtml(pack)).toContain('grid-template-columns:minmax(0,1fr) minmax(0,1fr)');
    expect(media.buildFrayerHtml(pack)).toContain('grid-template-columns:minmax(0,1fr) minmax(0,1fr)');
  });

  it('uses Intl.Segmenter grapheme clusters (ignoring spaces) and distinguishes letters vs sounds on Sorting Cards', () => {
    const { media } = loadWordPractice();
    const html = media.buildSortingCardsHtml({
      title: 'Graphemes',
      words: [
        { word: 'cafe\u0301' }, // NFD: 4 grapheme clusters (not 5 code units)
        { word: 'water cycle' }, // 10 letters (ignores space)
        { word: 'knight' }, // fallback -> 6 letters (not 6 sounds)
        { word: 'ship', phonemes: ['sh', 'i', 'p'] }, // real phonemes -> 3 sounds
      ],
    });
    const doc = new JSDOM(html).window.document;
    const wordCards = [...doc.querySelectorAll('.sort-word')];
    const boxesByWord = Object.fromEntries(
      wordCards.map((card) => [
        card.querySelector('.sort-word-text').textContent,
        [...card.querySelectorAll('.elkonin-box')].map((b) => b.textContent),
      ])
    );
    expect(boxesByWord['caf\u00e9']).toEqual(['c', 'a', 'f', '\u00e9']);
    expect(boxesByWord['water cycle']).toHaveLength(10);
    expect(boxesByWord['water cycle']).not.toContain(' ');
    expect(html).toContain('6 letters');
    expect(html).not.toContain('6 sounds');
    expect(html).toContain('3 sounds');
  });

  it('fixes double-numbered Worksheet Teacher Answer Key and omits empty Loop Game Teacher Key when items < 2', () => {
    const { media } = loadWordPractice();
    const wsHtml = media.buildWorksheetHtml({
      title: 'Space',
      words: [
        { word: 'orbit', definition: 'Path around a star', example: 'Planets orbit the sun.' },
        { word: 'comet', definition: 'Icy body', example: 'A comet glows.' },
      ],
    });
    const wsDoc = new JSDOM(wsHtml).window.document;
    const clozeItems = [...wsDoc.querySelectorAll('ol.key-cloze > li')];
    expect(clozeItems).toHaveLength(2);
    for (const li of clozeItems) {
      expect(li.querySelector('strong').textContent).not.toMatch(/^\d+\.\s/);
    }
    expect(wsHtml).toContain('.key-table tr{page-break-inside:avoid;break-inside:avoid}');

    const oneWordLoop = media.buildLoopGameHtml({ title: 'Single', words: [{ word: 'orbit', definition: 'Path' }] });
    expect(oneWordLoop).not.toContain('<section class="teacher-key">');
    const twoWordLoop = media.buildLoopGameHtml({
      title: 'Pair',
      words: [
        { word: 'orbit', definition: 'Path' },
        { word: 'comet', definition: 'Icy body' },
      ],
    });
    expect(twoWordLoop).toContain('<section class="teacher-key">');
  });
});

describe('B2: Printable picture rescue (term/targetWord), structured credits, and decorative alt', () => {
  it('rescues SVG pictures keyed by term and targetWord, formats structured imageAttribution without [object Object], and honors decorative images', () => {
    const { core, media } = loadWordPractice();
    // Preserve core.safePicture rejecting SVG data URIs (media layer owns SVG rescue).
    expect(core.safePicture(SVG_URI)).toBe('');

    const pack = {
      title: 'Science Terms',
      words: [
        {
          term: 'chloroplast',
          def: 'Cell part that makes food.',
          image: SVG_URI,
          imageAlt: 'Chloroplast diagram',
          imageAttribution: { set: 'AlloFlow Curriculum Diagram', author: 'Science Team', license: 'AGPL-3.0' },
        },
        {
          targetWord: 'stomata',
          definition: 'Tiny openings on a leaf.',
          image: SVG_URI,
          imageDecorative: true,
          attribution: { set: 'Wikimedia Commons', author: 'A. Botanist', license: 'CC BY 4.0' },
        },
      ],
    };

    for (const fn of ['buildFlashcardsHtml', 'buildFrayerHtml', 'buildWordWallHtml']) {
      const html = media[fn](pack);
      expect(html, fn).not.toContain('[object Object]');
      expect(html, fn).toContain('AlloFlow Curriculum Diagram · Science Team · AGPL-3.0');
      expect(html, fn).toContain('Wikimedia Commons · A. Botanist · CC BY 4.0');

      const doc = new JSDOM(html).window.document;
      const imgs = [...doc.querySelectorAll('img')];
      expect(imgs, fn).toHaveLength(2);
      expect(imgs[0].getAttribute('src')).toContain('data:image/svg+xml');
      expect(imgs[0].getAttribute('alt')).toBe('Chloroplast diagram');
      expect(imgs[0].hasAttribute('aria-hidden')).toBe(false);
      // Decorative image keeps empty alt="" and aria-hidden="true".
      expect(imgs[1].getAttribute('src')).toContain('data:image/svg+xml');
      expect(imgs[1].getAttribute('alt')).toBe('');
      expect(imgs[1].getAttribute('aria-hidden')).toBe('true');
    }
  });
});

describe('B3: applySheetReadingSupports() element skipping and bionic weight contrast', () => {
  it('skips .noprint print buttons, .elkonin-box phonics tiles, and .bingo-free cells while injecting bionic contrast CSS', () => {
    const { media } = loadWordPractice();
    const fcHtml = media.buildFlashcardsHtml({
      title: 'Digraphs',
      words: [{ word: 'bright', phonemes: ['b', 'r', 'igh', 't'], definition: 'Full of light.' }],
    });
    const fcBionic = media.applySheetReadingSupports(fcHtml, { bold: true });
    expect(fcBionic.slice(15)).not.toContain('!');
    expect(fcBionic).toContain('data-awp-bionic="1"');
    expect(fcBionic).toContain('.word,.frayer-word,.sort-word-text,.bank-word,.bingo-word,.loop-word,.wall-word,.ws-word{font-weight:400}b[data-awp-bionic]{font-weight:800}');

    const fcDoc = new JSDOM(fcBionic).window.document;
    // Print button inside .noprint is NOT bionic-bolded.
    expect(fcDoc.querySelector('.print-btn').innerHTML).toBe('Print');
    // Elkonin digraph/trigraph tiles are NOT split by bionic bold.
    const boxes = [...fcDoc.querySelectorAll('.elkonin-box')].map((el) => el.innerHTML);
    expect(boxes).toEqual(['b', 'r', 'igh', 't']);
    // Target word DOES get bionic bold.
    expect(fcDoc.querySelector('.word b[data-awp-bionic="1"]')).not.toBeNull();

    const bingoHtml = media.buildBingoHtml({
      title: 'Bingo',
      words: [{ word: 'bright' }, { word: 'shine' }],
    });
    const bingoBionic = media.applySheetReadingSupports(bingoHtml, { bold: true });
    const bingoDoc = new JSDOM(bingoBionic).window.document;
    const freeCell = bingoDoc.querySelector('.bingo-free');
    expect(freeCell.querySelector('b[data-awp-bionic]')).toBeNull();
    expect(freeCell.textContent).toContain('FREE');
  });
});

describe('B4: PPTX picture-slide layout, hardened JPEG parser, RTL footer, and voice annotation WAV transcoding', () => {
  it('constrains fallback defBox above y=5.90 when audio is present, paginates overflowing definitions, and right-aligns RTL footers', async () => {
    const { media } = loadWordPractice();
    const longDef = 'Photosynthesis transforms sunlight, carbon dioxide, and water into glucose and oxygen. '.repeat(10).trim();
    const pptx = await media.buildPictureSlidesPptx(
      {
        title: 'Biology',
        words: [{ word: 'photosynthesis', definition: longDef, wordAudio: WAV }],
      },
      { includeAudio: true, repetitions: 1 },
      { PptxGenJS: FakePresentation }
    );
    expect(pptx.slides.length).toBeGreaterThan(1);
    const first = pptx.slides[0];
    const audioMedia = first.media[0];
    expect(audioMedia.y).toBeCloseTo(6.03, 2);
    const defEntry = first.texts.find((t) => typeof t.text === 'string' && t.text.startsWith('Photosynthesis'));
    expect(defEntry).toBeTruthy();
    expect(defEntry.options.y + defEntry.options.h).toBeLessThanOrEqual(5.90);
    expect(defEntry.text.endsWith('…')).toBe(true);
    // Overflow continuation holds the remainder of the definition.
    const continuationText = pptx.slides.slice(1).flatMap((s) => s.texts.map((t) => (typeof t.text === 'string' ? t.text : ''))).join(' ');
    expect(continuationText).toContain('glucose and oxygen.');

    // RTL footer alignment in slideBase().
    const rtlPptx = await media.buildPptx(
      { language: 'Arabic', words: [{ word: 'شمس' }] },
      { mode: 'popup', repetitions: 1, includeAudio: false },
      undefined,
      {
        PptxGenJS: FakePresentation,
        currentUiLanguage: 'Arabic',
        t: (k) => (k === 'word_practice.card_progress' ? 'بطاقة {n} من {total}' : k),
      }
    );
    const footer = rtlPptx.slides[0].texts.find((entry) => entry.options.y === 6.96);
    expect(footer.options).toMatchObject({ align: 'right', rtlMode: true });
  });

  it('hardens JPEG SOF parsing against fill bytes, progressive SOF2, post-SOS scan bytes, and corrupt segLen < 2', async () => {
    const { media } = loadWordPractice();
    // Valid progressive JPEG (0xC2) with repeated 0xFF fill bytes before marker (width 320, height 160).
    const progressiveJpeg = dataUrl('image/jpeg', [
      0xff, 0xd8,
      0xff, 0xff, 0xff, 0xc2, 0, 11, 8, 0x00, 0xa0, 0x01, 0x40, 1, 1, 0x11, 0,
      0xff, 0xda, 0, 8, 1, 1, 0, 0, 63, 0,
      0xff, 0xd9,
    ]);
    // JPEG whose only 0xFF 0xC0 sequence appears AFTER SOS (0xDA) inside entropy data — must NOT be trusted.
    const fakeAfterSos = dataUrl('image/jpeg', [
      0xff, 0xd8,
      0xff, 0xda, 0, 6, 0, 0, 0, 0,
      0xff, 0xc0, 0, 11, 8, 0x02, 0x00, 0x04, 0x00, 1, 1, 0x11, 0,
      0xff, 0xd9,
    ]);
    // Corrupt JPEG with APP1 segLen = 1 (< 2) — must terminate cleanly without hanging.
    const corruptSegLen = dataUrl('image/jpeg', [
      0xff, 0xd8,
      0xff, 0xe1, 0x00, 0x01,
      0xff, 0xc0, 0, 11, 8, 0x01, 0x00, 0x01, 0x00, 1, 1, 0x11, 0,
    ]);

    const okDeck = await media.buildPictureSlidesPptx(
      { words: [{ word: 'prog', image: progressiveJpeg }] },
      { includeAudio: false },
      { PptxGenJS: FakePresentation }
    );
    expect(okDeck.slides[0].images).toHaveLength(1);
    expect(okDeck.slides[0].images[0].w / okDeck.slides[0].images[0].h).toBeCloseTo(2, 2);

    const sosDeck = await media.buildPictureSlidesPptx(
      { words: [{ word: 'sos', image: fakeAfterSos }] },
      { includeAudio: false },
      { PptxGenJS: FakePresentation }
    );
    expect(sosDeck.slides[0].images).toHaveLength(0);

    const corruptDeck = await media.buildPictureSlidesPptx(
      { words: [{ word: 'bad', image: corruptSegLen }] },
      { includeAudio: false },
      { PptxGenJS: FakePresentation }
    );
    expect(corruptDeck.slides[0].images).toHaveLength(0);
  });

  it('transcodes WebM/Opus voice annotations to WAV in everyDeviceAudio() and detects them in needsEveryDeviceAudio()', async () => {
    const { media } = loadWordPractice();
    const webmB64 = WEBM.split(',')[1];
    const input = {
      title: 'Voice Notes',
      words: [
        {
          word: 'orbit',
          wordAudio: WAV,
          annotations: [
            { id: 'v1', kind: 'voice', mimeType: 'audio/webm', audioBase64: webmB64, x: 20, y: 20 },
          ],
        },
      ],
    };
    expect(media.needsEveryDeviceAudio(input)).toBe(true);

    const fakeBuffer = { sampleRate: 22050, length: 441, duration: 0.02, numberOfChannels: 1, getChannelData: () => new Float32Array(441).fill(0.1) };
    const AudioContext = class {
      async decodeAudioData() { return fakeBuffer; }
      async close() {}
    };
    const OfflineAudioContext = class {
      constructor() { this.destination = {}; }
      createBufferSource() { return { connect() {}, start() {} }; }
      async startRendering() { return fakeBuffer; }
    };

    const result = await media.everyDeviceAudio(input, { AudioContext, OfflineAudioContext });
    expect(result.converted).toBe(1);
    expect(result.failed).toBe(0);
    const convertedAnn = result.pack.items[0].annotations[0];
    expect(convertedAnn.mimeType).toBe('audio/wav');
    expect(Buffer.from(convertedAnn.audioBase64, 'base64').subarray(0, 4).toString()).toBe('RIFF');
    expect(media.needsEveryDeviceAudio(result.pack)).toBe(false);
  });
});

describe('B5: Core text()/maskWord() + standalone offline HTML deck hardening', () => {
  it('strips XML-illegal controls, noncharacters, and unpaired surrogates in text(), and masks Lao/Khmer/Myanmar, combining marks, and curly possessives in maskWord()', () => {
    const { core } = loadWordPractice();
    expect(core.text('hello\u007f\ufffe\uffff\ud800world\udc00🦋')).toBe('helloworld🦋');
    // Truncating mid-surrogate pair must not emit a trailing unpaired high surrogate.
    const sliced = core.text('abc🦋def', 4);
    expect(sliced).toBe('abc');

    // Spaceless scripts: Lao, Khmer, Myanmar.
    expect(core.maskWord('ດື່ມນ້ຳສະອາດ', 'ນ້ຳ')).toBe('ດື່ມ____ສະອາດ');
    expect(core.maskWord('អានសៀវភៅនេះ', 'សៀវភៅ')).toBe('អាន____នេះ');
    expect(core.maskWord('ကျောင်းသွားတယ်', 'ကျောင်း')).toBe('____သွားတယ်');
    // Typographic right-single-quote possessive.
    expect(core.maskWord('The ship\u2019s anchor dropped.', 'ship')).toBe('The ____ anchor dropped.');
    // Combining mark guard: base consonant 'क' must NOT match inside 'का' ('क\u093e') leaving orphaned matra.
    expect(core.maskWord('यह का है।', 'क')).toBe('यह का है।');
  });

  it('completes timed rounds cleanly in standalone offline HTML decks, announces repeated wrong sentence picks, swaps broken images via onerror, and handles SVG xmlns/failures', async () => {
    const { ui } = loadWordPractice();

    // 1. Standalone offline timed round completion sets finished=true, unhides Round complete heading, and focuses it.
    const timedHtml = ui.buildHtml(
      { title: 'Timed Offline', words: ['orbit'] },
      { mode: 'popup', autoAdvance: true, intervalSeconds: 1, repetitions: 1, shuffle: false, includeAudio: false }
    );
    const timedDom = new JSDOM(timedHtml, { runScripts: 'dangerously' });
    openedWindows.push(timedDom.window);
    const tDoc = timedDom.window.document;
    const startBtn = [...tDoc.querySelectorAll('button')].find((b) => b.textContent === 'Start timer');
    startBtn.click();
    await new Promise((r) => setTimeout(r, 1150));
    const roundH2 = tDoc.querySelector('.awp-round-actions h2');
    expect(roundH2.hidden).toBe(false);
    expect(tDoc.activeElement).toBe(roundH2);
    expect(tDoc.querySelector('.awp-round-actions').classList.contains('awp-surface')).toBe(true);
    expect(startBtn.getAttribute('aria-pressed')).toBe('false');

    // 2. Sentence mode repeated wrong tries produce distinct live announcements and mark tried buttons.
    const sentHtml = ui.buildHtml(
      {
        title: 'Sentence Deck',
        words: [{
          word: 'orbit',
          sentenceActivity: { prompt: 'Planets ____ the sun.', choices: ['orbit', 'comet', 'moon'], answer: 'orbit' },
        }],
      },
      { mode: 'sentence', repetitions: 1, includeAudio: false }
    );
    const sentDom = new JSDOM(sentHtml, { runScripts: 'dangerously' });
    openedWindows.push(sentDom.window);
    const sDoc = sentDom.window.document;
    const findChoice = (txt) => [...sDoc.querySelectorAll('.awp-choices button')].find((b) => b.textContent === txt);
    const cometBtn = findChoice('comet');
    const moonBtn = findChoice('moon');
    cometBtn.click();
    const msg1 = sDoc.querySelector('.awp-feedback').textContent;
    expect(msg1).toContain('comet');
    expect(msg1).toContain('Try another word');
    expect(cometBtn.getAttribute('aria-disabled')).toBe('true');
    expect(cometBtn.dataset.awpTried).toBe('true');
    moonBtn.click();
    const msg2 = sDoc.querySelector('.awp-feedback').textContent;
    expect(msg2).toContain('moon');
    expect(msg2).not.toBe(msg1);
    expect(moonBtn.getAttribute('aria-disabled')).toBe('true');

    // 3. Broken image onerror swaps to calm alt-text placeholder while preserving figcaption credit.
    const picDom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' });
    openedWindows.push(picDom.window);
    picDom.window.eval(coreSource);
    picDom.window.eval(uiSource);
    picDom.window.AlloModules.WordPractice.open({
      words: [{ word: 'leaf', definition: 'Green plant part.', image: 'https://example.org/leaf.png', imageAlt: 'Maple leaf', imageAttribution: { set: 'Wikimedia', license: 'CC BY 4.0' } }],
      options: { mode: 'vocabulary', repetitions: 1, includeAudio: false },
    });
    const pDoc = picDom.window.document;
    [...pDoc.querySelectorAll('button')].find((b) => b.textContent === 'Present').click();
    await new Promise((r) => setTimeout(r, 0));
    [...pDoc.querySelectorAll('.awp-player button')].find((b) => b.textContent === 'Show meaning').click();
    const img = pDoc.querySelector('.awp-stage .awp-picture img');
    expect(img).not.toBeNull();
    img.onerror();
    expect(pDoc.querySelector('.awp-stage .awp-picture img')).toBeNull();
    expect(pDoc.querySelector('.awp-stage .awp-picture .awp-picture-fallback').textContent).toBe('Maple leaf');
    expect(pDoc.querySelector('.awp-stage .awp-picture figcaption').textContent).toContain('Wikimedia');

    // 4. SVG xmlns auto-injection + explicit failure instead of blank #F8FAFC square when rasterization fails.
    let capturedSrc = '';
    const mockWin = loadWordPractice({
      Image: class {
        set src(val) {
          capturedSrc = val;
          setTimeout(() => this.onerror && this.onerror(), 0);
        }
      },
    });
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ clearRect() {}, drawImage() {} }),
      toDataURL: () => '',
    };
    const fakeDoc = {
      defaultView: mockWin.win,
      createElement: () => fakeCanvas,
    };
    await expect(
      mockWin.ui.rasterizeImage('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>', fakeDoc)
    ).rejects.toThrow(/SVG/i);
    expect(decodeURIComponent(capturedSrc)).toContain('xmlns="http://www.w3.org/2000/svg"');
  });
});

describe('B6-B8: Word Sounds timers, SR/keyboard/390px polish, LetterTraceView, Probe Results, Session Complete & i18n parity', () => {
  let Modal;
  let root;
  let container;
  let originalAudio;
  let originalGlobalAudio;

  class CompleteAudio {
    constructor(src = '') {
      this.src = src;
      this.paused = true;
      this.listeners = new Map();
      queueMicrotask(() => this.emit('canplaythrough'));
    }
    addEventListener(name, fn) {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());
      this.listeners.get(name).add(fn);
    }
    removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
    emit(name) { this['on' + name]?.(); for (const fn of this.listeners.get(name) || []) fn(); }
    canPlayType() { return 'probably'; }
    load() { queueMicrotask(() => { this.emit('loadedmetadata'); this.emit('canplaythrough'); }); }
    removeAttribute() {}
    pause() { this.paused = true; }
    play() {
      this.paused = false;
      setTimeout(() => { if (!this.paused) { this.ended = true; this.emit('ended'); } }, 1);
      return Promise.resolve();
    }
  }

  const englishWs = uiStrings.word_sounds;
  const strings = (_t, key, params = {}) => {
    let text = englishWs[String(key).replace('word_sounds.', '')] || '';
    for (const [name, value] of Object.entries(params || {})) {
      text = text.split('{' + name + '}').join(String(value));
      text = text.split('{{' + name + '}}').join(String(value));
    }
    return text;
  };

  beforeAll(() => {
    installCanvasStub();
    ({ WordSoundsModal: Modal } = setupWordSounds());
  });

  beforeEach(() => {
    vi.useFakeTimers({ now: 1700000000000, toFake: ['Date', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    originalAudio = window.Audio;
    originalGlobalAudio = globalThis.Audio;
    window.Audio = globalThis.Audio = CompleteAudio;
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    root = null;
    container?.remove();
    window.Audio = originalAudio;
    globalThis.Audio = originalGlobalAudio;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function Host(overrides = {}) {
    const [activity, setActivity] = React.useState(overrides.activity || 'counting');
    const [word, setWord] = React.useState(null);
    const [data, setData] = React.useState(null);
    const [score, setScore] = React.useState({ correct: 0, total: 0, streak: 0 });
    const [history, setHistory] = React.useState([]);
    const [feedback, setFeedback] = React.useState(null);
    const { activity: _ignored, ...rest } = overrides;
    return React.createElement(Modal, {
      ...baseProps(activity),
      allowRuntimeAi: false,
      disableAnimations: true,
      sessionId: 'w7-test',
      wsPreloadedWords: [makePackItem()],
      wordSoundsDifficulty: 'easy',
      wordSoundsSessionGoal: 5,
      getWordSoundsString: strings,
      setWordSoundsLanguage: () => {},
      setWordSoundsDifficulty: () => {},
      glossaryTerms: [{ term: 'cat', def: 'pet', translations: { Spanish: 'gato' } }],
      ...rest,
      wordSoundsActivity: activity,
      setWordSoundsActivity: setActivity,
      currentWordSoundsWord: word,
      setCurrentWordSoundsWord: setWord,
      wordSoundsPhonemes: data,
      setWordSoundsPhonemes: setData,
      wordSoundsScore: score,
      setWordSoundsScore: setScore,
      wordSoundsHistory: history,
      setWordSoundsHistory: setHistory,
      wordSoundsFeedback: feedback,
      setWordSoundsFeedback: setFeedback,
    });
  }

  async function tick(ms) { await act(async () => vi.advanceTimersByTimeAsync(ms)); }
  async function mount(overrides = {}) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(React.createElement(Host, overrides)));
    await tick(120);
  }

  it('B6: clears retry feedback timer on immediate correct answer so success banner is not erased at T=3s', async () => {
    await mount({ activity: 'counting', isTeacherMode: true, wordSoundsDifficulty: 'hard' });
    const wrongTile = container.querySelector('[role="button"][aria-label="Number 5"]');
    const rightTile = container.querySelector('[role="button"][aria-label="Number 3"]');
    expect(wrongTile).toBeTruthy();
    expect(rightTile).toBeTruthy();

    // First miss schedules a 3s retry clear timer.
    await act(async () => wrongTile.click());
    await tick(500);
    // Answer correctly at T=0.5s — must cancel the stale 3s retry clear timer.
    await act(async () => rightTile.click());
    await tick(2600); // T=3.1s total — past the original 3s timer!
    // Check that the retryFeedbackTimerRef guard exists alongside auto-hide and sentence_match guards.
    expect(wsSource).toContain('retryFeedbackTimerRef');
    expect(wsSource).toContain('autoHideLettersTimerRef');
    expect(wsSource).toContain('sentenceMatchResetTimerRef');
    expect(wsSource).toContain('const smLocked = !!sentenceMatchMarks || submissionLockRef.current;');
    // Sound Sort and Word Families replay loops route through beginIsolationPlayback().
    const ssBlock = wsSource.slice(wsSource.indexOf('const isoMode = mode;'), wsSource.indexOf('const isoMode = mode;') + 1200);
    expect(ssBlock).toContain('if (stale()) return;');
    const wfIdx = wsSource.indexOf('WF replay instruction failed:');
    expect(wsSource.slice(wfIdx - 1400, wfIdx)).toContain('beginIsolationPlayback()');
    expect(wsSource.slice(wfIdx - 1400, wfIdx)).toContain('if (stale()) return;');
  });

  it('B7: provides distinct SR labels/aria-pressed/aria-valuenow in header, aligns digraph PhonologyView blanks to soundCount, and pads OrthographyView', async () => {
    await mount({ activity: 'counting', isTeacherMode: true, wordSoundsDifficulty: 'hard' });
    // Distinct Language, Difficulty, and Speed labels + aria-valuetext.
    expect(container.querySelector('select[aria-label="Language"]')).not.toBeNull();
    expect(container.querySelector('select[aria-label="Difficulty"]')).not.toBeNull();
    const speedSlider = container.querySelector('input[type="range"][aria-label="Speech Speed"]');
    expect(speedSlider).not.toBeNull();
    expect(speedSlider.getAttribute('aria-valuetext')).toMatch(/x$/);

    // Phonics toggle has aria-pressed and mobile aria-label, and toggles cleanly.
    const phonicsBtn = [...container.querySelectorAll('button')].find((b) =>
      /Switch to (Sound Only|Letter) Mode/.test(b.getAttribute('aria-label') || '')
    );
    expect(phonicsBtn).toBeTruthy();
    const initialPressed = phonicsBtn.getAttribute('aria-pressed');
    expect(['true', 'false']).toContain(initialPressed);
    await act(async () => phonicsBtn.click());
    expect(phonicsBtn.getAttribute('aria-pressed')).toBe(initialPressed === 'true' ? 'false' : 'true');

    // Counting "11+" button has ws-card-small and data-ws-card-state.
    const elevenBtn = [...container.querySelectorAll('[data-ws-card="true"]')].find((el) => el.textContent.includes('11+'));
    expect(elevenBtn).toBeTruthy();
    expect(elevenBtn.getAttribute('data-ws-card-state')).toBe('idle');
    expect(elevenBtn.className).toContain('ws-card-small');

    // Unmount and mount Isolation with digraph word "ship" (4 letters, 3 sounds, position 2 = last sound /p/).
    await act(async () => root.unmount());
    container.remove();
    const shipItem = makePackItem();
    shipItem.word = 'ship';
    shipItem.targetWord = 'ship';
    shipItem.term = 'ship';
    shipItem.displayWord = 'ship';
    shipItem.phonemes = ['sh', 'i', 'p'];
    shipItem.phonemeCount = 3;
    shipItem.activityItems.isolation = { position: 2, correctSound: 'p', options: ['sh', 'i', 'p', 'k'] };
    await mount({ activity: 'isolation', isTeacherMode: true, wsPreloadedWords: [shipItem] });
    expect(container.querySelector('h3.text-2xl').textContent).toBe('What is the last sound?');
    // Enable Letter Hints (Phonics mode) so the sound-slot underscores render.
    const isoPhonicsBtn = [...container.querySelectorAll('button')].find((b) =>
      /Switch to (Sound Only|Letter) Mode/.test(b.getAttribute('aria-label') || '')
    );
    if (isoPhonicsBtn && isoPhonicsBtn.getAttribute('aria-pressed') === 'false') {
      await act(async () => isoPhonicsBtn.click());
    }
    const soundSlots = [...container.querySelectorAll('[data-ws-sound-slot]')];
    expect(soundSlots).toHaveLength(3); // 3 sounds for "ship", NOT 4 letters!
    expect(soundSlots[2].getAttribute('data-ws-sound-active')).toBe('true');
    expect(soundSlots[0].getAttribute('data-ws-sound-active')).toBe('false');

    // Structural checks on SyllableBlendingView, OrthographyView, SoundMappingView, read_sentence, and touch targets.
    expect(wsSource).toContain('className: "grid grid-cols-2 gap-3", "data-ws-cards": "true"');
    expect(wsSource).toContain('w-full ps-6 pe-28 py-5');
    expect(wsSource).toContain('"aria-label": ts("word_sounds.clear_spelling") || "Clear spelling"');
    expect(wsSource).toContain('className: "flex flex-wrap justify-center gap-3 sm:gap-4 mb-4"');
    expect(wsSource).toContain('w-14 sm:w-20');
    expect(wsSource).toContain('dir: wsWordDir, className: "flex flex-wrap items-center justify-center gap-2 max-w-xl text-3xl font-black text-slate-800"');
    expect(wsSource).toContain('"aria-pressed": !!aacMode');
    expect(wsSource).toContain('"aria-label": ts("word_sounds.session_progress") || "Session Progress"');
    expect(wsSource).toContain('"aria-label": ts("word_sounds.activity_progress") || "Activity Progress"');
  });

  it('B8: fixes LetterTraceView touchcancel/tips, Probe Results 1:00 duration/display name/AA contrast/100dvh, Session Complete FX/recap pills, and registers all new keys everywhere', () => {
    // LetterTraceView touchcancel + localized tips + wsAnnounce.
    expect(wsSource).toContain('onTouchCancel: endDraw');
    expect(wsSource).toContain('ts("word_sounds.trace_tip_empty")');
    expect(wsSource).toContain('ts("word_sounds.trace_tip_great"');
    expect(wsSource).toContain('if (typeof wsAnnounce === "function") wsAnnounce(tip);');

    // renderProbeResults: rounds total seconds before splitting min:sec (59.7 -> 1:00, never 0:60).
    expect(wsSource).toContain('const s = Math.max(0, Math.round(totalTime));');
    expect(wsSource).toContain('activityDisplayName(wordSoundsActivity)');
    expect(wsSource).toContain('text-amber-800');
    expect(wsSource).not.toContain('text-yellow-600');
    expect(wsSource).toContain('max-h-[calc(100dvh-2rem)]');
    expect(wsSource).toContain('{ className: "text-4xl mb-3", "aria-hidden": "true" }');

    // Celebration FX & showSessionComplete aria-hidden + high-contrast calm recap pills with sr-only status.
    expect(wsSource).toContain("el.setAttribute('aria-hidden', 'true');");
    expect(wsSource).toContain('{ className: "text-6xl mb-4 animate-bounce motion-reduce:animate-none", "aria-hidden": "true" }');
    expect(wsSource).toContain('bg-emerald-50 text-emerald-900 border-emerald-200');
    expect(wsSource).toContain('bg-rose-50 text-rose-900 border-rose-200');
    expect(wsSource).toContain('ts("word_sounds.recap_status_correct")');
    expect(wsSource).toContain('ts("word_sounds.recap_status_missed")');

    // Localization gate parity: every new key exists in allo_data_source, allo_data_module, ui_strings, and ui_strings_core.
    const newKeys = [
      'select_language', 'activity_progress', 'clear_spelling',
      'isolation_prompt_first', 'isolation_prompt_middle', 'isolation_prompt_last', 'isolation_prompt_position',
      'trace_tip_empty', 'trace_tip_great', 'trace_tip_start_dot_1', 'trace_tip_start_dot',
      'trace_tip_whole_letter', 'trace_tip_stay_on_lines', 'trace_tip_follow_arrow', 'trace_tip_almost',
      'recap_status_correct', 'recap_status_missed',
    ];
    for (const key of newKeys) {
      expect(alloDataSource, key).toContain(`'word_sounds.${key}':`);
      expect(alloDataModule, key).toContain(`'word_sounds.${key}':`);
      expect(uiStrings.word_sounds[key], key).toBeTruthy();
      expect(uiStringsCore.word_sounds[key], key).toBeTruthy();
    }
  });
});
