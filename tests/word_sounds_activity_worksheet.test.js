// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const cards = require('../packets-print-cards.js');
const matcher = require('../word_picture_matcher.js');
const myWords = require('../packets_my_words.js');
const SYMBOLS = require('../word_sounds_symbols_en.js');
for (const shard of SYMBOLS.shards) SYMBOLS.add(JSON.parse(read(shard.url)));

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const openmojiWord = SYMBOLS.words().find((w) => SYMBOLS.set(w) === 'openmoji') || 'alien';

const PACKETS_13 = [
  'mapping', 'missing_letter', 'word_scramble', 'counting', 'isolation',
  'segmentation', 'blending', 'rhyming', 'word_families', 'sound_sort',
  'letter_tracing', 'orthography', 'spelling_bee',
];
const MAIN_APP_6 = [
  'syllable_counting', 'syllable_blending', 'manipulation',
  'decoding', 'read_sentence', 'read_passage',
];

function makeFullLessonBlocks() {
  return {
    title: 'Wave 2 Complete Phonics Pack',
    images: { m0: PNG_1X1 },
    blocks: [
      {
        activity: 'mapping',
        items: [{
          id: 'mapping-0', word: 'ship', target: 'sh i p',
          graphemes: ['sh', 'i', 'p'], phonemes: ['sh', 'i', 'p'],
          chips: [{ text: 'p' }, { text: 'sh' }, { text: 'i' }],
          wordPicture: 'm0',
        }],
      },
      {
        activity: 'missing_letter',
        items: [{
          id: 'missing_letter-0', word: 'cat', letters: ['c', '', 't'],
          hiddenIndex: 1, target: 'a', options: ['a', 'e', 'o', 'u'],
        }],
      },
      {
        activity: 'word_scramble',
        items: [{
          id: 'word_scramble-0', word: 'frog', target: 'frog',
          letters: ['g', 'f', 'o', 'r'],
        }],
      },
      {
        activity: 'counting',
        items: [{
          id: 'counting-0', word: 'ship', target: '3', phonemes: ['sh', 'i', 'p'],
          values: ['1', '2', '3', '4', '5', '6'],
        }],
      },
      {
        activity: 'isolation',
        items: [{
          id: 'isolation-0', word: 'sun', position: 0, positionName: 'first',
          target: 's', choices: [{ label: 's' }, { label: 'm' }, { label: 't' }, { label: 'p' }],
        }],
      },
      {
        activity: 'segmentation',
        items: [{
          id: 'segmentation-0', word: 'ship', target: 'sh i p',
          sounds: ['sh', 'i', 'p'],
          chips: [{ label: 'sh' }, { label: 'i' }, { label: 'p' }, { label: 'm' }],
        }],
      },
      {
        activity: 'blending',
        items: [{
          id: 'blending-0', word: 'cat', target: 'cat',
          phonemes: ['k', 'a', 't'],
          sounds: ['a0', 'a1', 'a2'], // audio IDs must NOT leak onto the printed sheet
          choices: [{ text: 'cat' }, { text: 'cot' }, { text: 'cut' }],
          wordPicture: 'm0',
        }],
      },
      {
        activity: 'rhyming',
        items: [{
          id: 'rhyming-0', word: 'cat', target: 'hat',
          choices: [{ text: 'hat', answer: true }, { text: 'dog' }, { text: 'sun' }, { text: 'bed' }],
        }],
      },
      {
        activity: 'word_families',
        items: [{
          id: 'word_families-0', word: 'cat', rime: 'at',
          chips: [{ text: 'hat', member: true }, { text: 'bat', member: true }, { text: 'dog', member: false }],
        }],
      },
      {
        activity: 'sound_sort',
        items: [
          {
            id: 'sound_sort-0', word: 'cat', mode: 'first', sound: 'k',
            chips: [{ text: 'kite', member: true }, { text: 'key', member: true }, { text: 'sun', member: false }],
          },
          {
            id: 'sound_sort-1', word: 'sun', mode: 'first', sound: 's',
            chips: [{ text: 'sock', member: true }, { text: 'soap', member: true }, { text: 'map', member: false }],
          },
          {
            id: 'sound_sort-2', word: 'map', mode: 'first', sound: 'm',
            chips: [{ text: 'moon', member: true }, { text: 'mug', member: true }, { text: 'hat', member: false }],
          },
        ],
      },
      {
        activity: 'letter_tracing',
        items: [{
          id: 'letter_tracing-0', word: 'sun', letter: 's',
          parts: [{ letter: 'S', kind: 'capital' }, { letter: 's', kind: 'lowercase' }],
        }],
      },
      {
        activity: 'orthography',
        items: [{
          id: 'orthography-0', word: 'dog', target: 'dog',
          phonemes: ['d', 'o', 'g'], letterBank: ['a', 'd', 'g', 'm', 'o', 't'],
        }],
      },
      {
        activity: 'spelling_bee',
        items: [{
          id: 'spelling_bee-0', word: 'jump', target: 'jump',
          phonemes: ['j', 'u', 'm', 'p'],
        }],
      },
      {
        activity: 'syllable_counting',
        items: [{
          id: 'syllable_counting-0', word: 'rabbit', count: 2, target: '2',
          syllables: ['rab', 'bit'],
        }],
      },
      {
        activity: 'syllable_blending',
        items: [{
          id: 'syllable_blending-0', word: 'sunset', target: 'sunset',
          syllables: ['sun', 'set'],
          choices: [{ text: 'sunset' }, { text: 'raincoat' }, { text: 'bedtime' }],
        }],
      },
      {
        activity: 'manipulation',
        items: [{
          id: 'manipulation-0', word: 'cat', target: 'hat',
          instructionText: 'Say "cat". Now change /k/ to /h/.',
          choices: [{ text: 'hat' }, { text: 'mat' }, { text: 'sit' }],
        }],
      },
      {
        activity: 'decoding',
        items: [{
          id: 'decoding-0', word: 'fish', printed: 'fish', target: 'fish',
          choices: [{ text: 'fish', image: 'm0' }, { text: 'dog' }, { text: 'sun' }],
        }],
      },
      {
        activity: 'read_sentence',
        items: [{
          id: 'read_sentence-0', word: 'mat', target: 'mat',
          before: 'The cat sat on the ', after: '.', answer: 'mat',
          options: ['mat', 'run', 'big'],
        }],
      },
      {
        activity: 'read_passage',
        items: [{
          id: 'read_passage-0', word: 'sun', target: 'sun',
          lines: [
            { text: 'The cat ran out to play.' },
            { before: 'It sat in the warm ', after: '.' },
          ],
          options: ['sun', 'mud', 'box'],
        }],
      },
    ],
  };
}

const doms = [];
afterEach(() => {
  while (doms.length) {
    try { doms.pop().window.close(); } catch (_) {}
  }
  vi.restoreAllMocks();
});

function loadWordPracticeModule() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example/' });
  doms.push(dom);
  dom.window.eval(read('word_practice_module.js'));
  return dom.window;
}

describe('1. Word Sounds Activity Worksheet HTML (all 13 Packets + 6 Main-App activities)', () => {
  it('renders all 19 activities with exact activity-specific layouts in packets-print-cards.js', () => {
    const lesson = makeFullLessonBlocks();
    const html = cards.buildWordSoundsWorksheetHtml(lesson, {
      pictures: true, answerKey: true, hints: true, symbols: SYMBOLS, matcher,
    });
    const doc = new JSDOM(html).window.document;

    // Header: Title + Name / Date
    expect(doc.querySelector('.ws-title').textContent).toBe('Wave 2 Complete Phonics Pack');
    expect(doc.querySelector('.ws-meta').textContent).toContain('Name:');
    expect(doc.querySelector('.ws-meta').textContent).toContain('Date:');

    // Every one of the 13 Packets + 6 Main-App activities rendered
    for (const act of [...PACKETS_13, ...MAIN_APP_6]) {
      expect(doc.querySelector(`section.ws-section[data-activity="${act}"]`), act).not.toBeNull();
    }

    // 1. mapping: exact 3 Elkonin boxes for ship + shuffled letter bank
    const mapSec = doc.querySelector('section[data-activity="mapping"]');
    expect(mapSec.querySelectorAll('.ws-box')).toHaveLength(3);
    expect(mapSec.querySelector('[data-sound-boxes="3"]')).not.toBeNull();
    expect(mapSec.querySelector('.ws-bank').textContent).toContain('Letter bank:');
    expect(mapSec.querySelector('img.ws-pic')).not.toBeNull();

    // 2. missing_letter: blank box + choices, no spoiled missing letter
    const mlSec = doc.querySelector('section[data-activity="missing_letter"]');
    expect(mlSec.querySelector('.ws-blank')).not.toBeNull();
    expect(mlSec.querySelector('.ws-missing').textContent).toBe('ct');
    expect([...mlSec.querySelectorAll('.ws-choice')].map((n) => n.textContent)).toEqual(['a', 'e', 'o', 'u']);

    // 3. word_scramble: scrambled tiles != target word + writing line
    const scrSec = doc.querySelector('section[data-activity="word_scramble"]');
    expect([...scrSec.querySelectorAll('.ws-tile')].map((n) => n.textContent).join('')).toBe('gfor');
    expect(scrSec.querySelector('.ws-line')).not.toBeNull();

    // 4. counting: numbered bubbles 1 2 3 4 5 6
    const cntSec = doc.querySelector('section[data-activity="counting"]');
    expect([...cntSec.querySelectorAll('.ws-bubble')].map((n) => n.textContent)).toEqual(['1', '2', '3', '4', '5', '6']);

    // 5. isolation: beginning sound prompt + choices
    const isoSec = doc.querySelector('section[data-activity="isolation"]');
    expect(isoSec.querySelector('.ws-prompt').textContent).toContain('beginning sound');
    expect([...isoSec.querySelectorAll('.ws-choice')].map((n) => n.textContent)).toEqual(['/s/', '/m/', '/t/', '/p/']);

    // 6. segmentation: 3 sound-tap dots + writing line
    const segSec = doc.querySelector('section[data-activity="segmentation"]');
    expect(segSec.querySelectorAll('.ws-tap-dot')).toHaveLength(3);
    expect(segSec.querySelector('.ws-line')).not.toBeNull();

    // 7. blending: separated phoneme labels (NOT audio IDs a0/a1/a2!), writing line, no spoiler picture
    const blendSec = doc.querySelector('section[data-activity="blending"]');
    expect(blendSec.querySelector('.ws-sounds-seq').textContent).toBe('/k/ · /a/ · /t/');
    expect(blendSec.textContent).not.toContain('/a0/');
    expect(blendSec.querySelector('img')).toBeNull();
    expect(blendSec.querySelector('.ws-line')).not.toBeNull();

    // 8. rhyming: target word + 4 choices
    const rhySec = doc.querySelector('section[data-activity="rhyming"]');
    expect(rhySec.querySelector('.ws-word').textContent).toBe('cat');
    expect(rhySec.querySelectorAll('.ws-choice')).toHaveLength(4);

    // 9. word_families: target rime + choices + build lines
    const wfSec = doc.querySelector('section[data-activity="word_families"]');
    expect(wfSec.textContent).toContain('-at');
    expect(wfSec.querySelectorAll('.ws-build-slot')).toHaveLength(3);

    // 10. sound_sort: 3 category columns + word bank
    const ssSec = doc.querySelector('section[data-activity="sound_sort"]');
    expect(ssSec.querySelectorAll('.ws-sort-col')).toHaveLength(3);
    expect(ssSec.querySelector('.ws-sort-bank').textContent).toContain('Word bank:');

    // 11. letter_tracing: capital + lowercase primary handwriting lines
    const ltSec = doc.querySelector('section[data-activity="letter_tracing"]');
    expect(ltSec.querySelectorAll('.ws-trace-row')).toHaveLength(2);
    expect(ltSec.querySelector('[data-trace-case="capital"]').textContent).toContain('S');
    expect(ltSec.querySelector('[data-trace-case="lowercase"]').textContent).toContain('s');

    // 12 & 13. orthography & spelling_bee: writing lines + sound boxes, DO NOT leak spelling on student copy!
    const orthoSec = doc.querySelector('section[data-activity="orthography"]');
    const beeSec = doc.querySelector('section[data-activity="spelling_bee"]');
    expect(orthoSec.textContent).not.toContain('dog');
    expect(beeSec.textContent).not.toContain('jump');
    expect(orthoSec.querySelectorAll('.ws-box')).toHaveLength(3);
    expect(beeSec.querySelectorAll('.ws-box')).toHaveLength(4);
    expect(orthoSec.querySelector('.ws-line')).not.toBeNull();
    expect(beeSec.querySelector('.ws-line')).not.toBeNull();

    // 14-19. Main App extra 6 activities
    expect(doc.querySelector('section[data-activity="syllable_counting"]').querySelectorAll('.ws-scoop').length).toBeGreaterThanOrEqual(2);
    expect(doc.querySelector('section[data-activity="syllable_counting"]').querySelectorAll('.ws-bubble').length).toBeGreaterThanOrEqual(5);
    expect(doc.querySelector('section[data-activity="syllable_blending"] .ws-sounds-seq').textContent).toBe('sun · set');
    expect(doc.querySelector('section[data-activity="manipulation"] .ws-prompt').textContent).toContain('change /k/ to /h/');
    expect(doc.querySelector('section[data-activity="decoding"]').querySelectorAll('.ws-checkbox').length).toBeGreaterThanOrEqual(2);
    expect(doc.querySelector('section[data-activity="read_sentence"] .ws-blank')).not.toBeNull();
    expect(doc.querySelector('section[data-activity="read_passage"]').querySelectorAll('.ws-checkbox')).toHaveLength(3);

    // Separate Teacher Answer Key page with required label & teacher read-aloud list
    const keySec = doc.querySelector('.ws-key');
    expect(keySec).not.toBeNull();
    expect(keySec.querySelector('.ws-key-banner').textContent).toBe('For the teacher — keep apart from the student copy');
    expect(html).toContain('.ws-key{break-before:page;page-break-before:always');
    expect(keySec.textContent).toContain('Read aloud: "dog"');
    expect(keySec.textContent).toContain('Read aloud: "jump"');
  });

  it('supports single-sound 2-column sound_sort, letter_tracing case modes, hints=false, answerKey=false, and syllables=true', () => {
    const mockSyl = { lookup: (w) => (w === 'rabbit' ? { parts: ['rab', 'bit'] } : null) };
    const html1 = cards.buildWordSoundsWorksheetHtml({
      title: 'Options Test',
      words: ['rabbit', 'cat'],
      activities: ['sound_sort', 'letter_tracing', 'mapping', 'spelling_bee', 'counting'],
      tracing: 'capital',
      syllablesTable: mockSyl,
    }, { pictures: false, answerKey: false, hints: false, syllables: true });
    const doc1 = new JSDOM(html1).window.document;

    expect(doc1.querySelectorAll('section[data-activity="sound_sort"] .ws-sort-col')).toHaveLength(2);
    expect(doc1.querySelectorAll('section[data-activity="letter_tracing"] [data-trace-case="capital"]').length).toBeGreaterThan(0);
    expect(doc1.querySelectorAll('section[data-activity="letter_tracing"] [data-trace-case="lowercase"]')).toHaveLength(0);
    expect(doc1.querySelector('.ws-key')).toBeNull();
    expect(html1).not.toContain('For the teacher');
    expect(doc1.querySelector('section[data-activity="mapping"] .ws-bank')).toBeNull();
    expect(doc1.querySelector('section[data-activity="spelling_bee"] .ws-box')).toBeNull();
    expect(doc1.querySelector('section[data-activity="counting"] .ws-word').textContent).toBe('rab·bit');
    expect(doc1.querySelectorAll('img')).toHaveLength(0);

    const htmlLower = cards.buildWordSoundsWorksheetHtml({
      title: 'Lowercase Tracing',
      words: ['sun'],
      activities: ['letter_tracing'],
    }, { tracing: 'lowercase', answerKey: false });
    const docLower = new JSDOM(htmlLower).window.document;
    expect(docLower.querySelectorAll('[data-trace-case="lowercase"]')).toHaveLength(1);
    expect(docLower.querySelectorAll('[data-trace-case="capital"]')).toHaveLength(0);
  });

  it('produces strict zero-network CSP, zero scripts/handlers, safe HTML escaping, and accurate CC BY-SA 4.0 / AGPL-3.0 / teacher picture credits', () => {
    const own = {
      fox: { picture: { dataUri: PNG_1X1, credit: { title: 'Red fox', author: 'A. Artist', license: 'CC BY 4.0', source: 'Openverse' } } },
    };
    const html = cards.buildWordSoundsWorksheetHtml({
      title: 'Test <script>alert(1)</script> Title',
      words: ['cat', openmojiWord, 'photosynthesis', 'fox'],
      activities: ['counting'],
      own,
      creditLine: myWords.creditLine,
    }, { pictures: true, symbols: SYMBOLS, matcher });

    const doc = new JSDOM(html).window.document;
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'none'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("img-src data:");
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/https?:\/\//i);
    expect(doc.querySelector('.ws-title').textContent).toBe('Test <script>alert(1)</script> Title');

    const creditsText = doc.querySelector('.ws-credits').textContent;
    expect(creditsText).toContain('Mulberry Symbols');
    expect(creditsText).toContain('CC BY-SA 4.0');
    expect(creditsText).toContain('OpenMoji');
    expect(creditsText).toContain('AlloFlow Curriculum Diagrams (AGPL-3.0)');
    expect(creditsText).toContain('Picture for "fox"');
    expect(creditsText).toContain('Red fox');
  });

  it('exposes identical 19-activity buildWordSoundsWorksheetHtml on AlloWordPracticeMedia and AlloModules.WordPractice without packets-print-cards.js', () => {
    const w = loadWordPracticeModule();
    expect(typeof w.AlloWordPracticeMedia.buildWordSoundsWorksheetHtml).toBe('function');
    expect(typeof w.AlloModules.WordPractice.buildWordSoundsWorksheetHtml).toBe('function');

    const html = w.AlloModules.WordPractice.buildWordSoundsWorksheetHtml(makeFullLessonBlocks(), {
      pictures: true, answerKey: true, hints: true, symbols: SYMBOLS, matcher: w.AlloWordPictureMatcher,
    });
    const doc = new JSDOM(html).window.document;
    for (const act of [...PACKETS_13, ...MAIN_APP_6]) {
      expect(doc.querySelector(`section.ws-section[data-activity="${act}"]`), act).not.toBeNull();
    }
    expect(doc.querySelector('.ws-key-banner').textContent).toBe('For the teacher — keep apart from the student copy');
    expect(doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')).toContain("script-src 'none'");
    expect(doc.querySelectorAll('script')).toHaveLength(0);
  });
});

describe('2. Monochrome CSS & Packets Maker wiring invariants', () => {
  it('keeps packets-print-cards.css strictly monochrome (#000000, #ffffff, #808080) with print page geometry intact', () => {
    const css = read('packets-print-cards.css');
    expect(css).not.toMatch(/#(?!000000|ffffff|808080)[0-9a-f]{3,6}\b/i);
    expect(css).not.toMatch(/@import|url\(|@font-face|https?:/i);
    const print = css.slice(css.indexOf('@media print'));
    expect(print).toContain('@page { margin: 12mm; }');
    expect(print).toMatch(/\.pc-sheet \{[^}]*height: 252mm;[^}]*break-after: page;/);
    expect(css).toContain('.pc-ws-key { break-before: page; page-break-before: always;');
  });

  it('wires #print-worksheet in packets-make.html after #open-symbol-runner without disturbing pinned scripts or #print-cards sibling', () => {
    const html = read('packets-make.html');
    const doc = new JSDOM(html).window.document;
    const printCards = doc.getElementById('print-cards');
    const presentExport = doc.getElementById('open-present-export');
    const symbolRunner = doc.getElementById('open-symbol-runner');
    const printWs = doc.getElementById('print-worksheet');

    expect(printCards.nextElementSibling).toBe(presentExport);
    expect(symbolRunner.nextElementSibling).toBe(printWs);
    expect(printWs.closest('#paper')).not.toBeNull();
    expect(printWs.getAttribute('type')).toBe('button');
    expect(printWs.hidden).toBe(true);
    expect(printWs.textContent.trim()).toBe('Print activity worksheet');

    // Exact pinned script list preserved
    const scripts = [...doc.querySelectorAll('script')].map((s) => s.getAttribute('src'));
    expect(scripts).toEqual([
      'packets-page.js', 'word_sounds_phonemes_en.js', 'word_sounds_core.js', 'word_sounds_wordlist_en.js',
      'word_sounds_take_home_loader.js', 'word_sounds_packet_builder.js', 'word_sounds_symbols_en.js',
      'packets_my_words.js', 'packets-words.js', 'packets_verify_core.js', 'packets_reopen.js',
      'packets_handoff.js', 'packets_zip.js', 'packets-print-cards.js', 'packets-make.js',
    ]);

    const makeJs = read('packets-make.js');
    // Wave 41 refactored the inline callback into named helper wordSoundsWorksheetState shared with wireWorksheetAudio.
    expect(makeJs).toContain("cards.wireWorksheet($('print-worksheet'), wordSoundsWorksheetState)");
    expect(makeJs).toContain('blocks: lastLesson && Array.isArray(lastLesson.blocks) ? lastLesson.blocks : null');
    expect(makeJs).toContain('window.AlloWordPictureMatcher');
  });

  it('drives wireWorksheet/openWorksheet preview bar, toggles, Print, HTML download, and Escape/Back focus restore', async () => {
    const dom = new JSDOM('<!doctype html><html><body><main><button type="button" id="print-worksheet" hidden>Print activity worksheet</button></main></body></html>', { pretendToBeVisual: true });
    doms.push(dom);
    const w = dom.window, d = w.document;
    let printCalls = 0;
    const downloads = [];
    w.print = () => { printCalls += 1; };
    w.scrollTo = () => {};
    w.URL.createObjectURL = (blob) => { downloads.push(blob); return 'blob:ws-test'; };
    w.URL.revokeObjectURL = () => {};
    const origClick = w.HTMLAnchorElement.prototype.click;
    const clickedNames = [];
    w.HTMLAnchorElement.prototype.click = function () { clickedNames.push(this.download); };

    const api = cards.create(d, w);
    const btn = d.getElementById('print-worksheet');
    api.wireWorksheet(btn, () => ({
      lesson: makeFullLessonBlocks(),
      title: 'Maker Worksheet',
      pictures: true,
      symbols: SYMBOLS,
      matcher,
      own: async () => ({}),
    }));
    expect(btn.hidden).toBe(false);

    btn.focus();
    btn.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(d.body.classList.contains('pc-on')).toBe(true);
    expect(api.worksheetView().hidden).toBe(false);
    expect(d.querySelectorAll('#print-worksheet-view section.pc-ws-section')).toHaveLength(19);
    expect(d.querySelector('#print-worksheet-view .pc-ws-key-banner').textContent).toBe('For the teacher — keep apart from the student copy');

    // Toggle answer key off live
    const keyBox = d.getElementById('pc-ws-answer-key');
    keyBox.checked = false;
    keyBox.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(d.querySelector('#print-worksheet-view .pc-ws-key')).toBeNull();

    // Print + Download HTML worksheet
    const actionBtns = [...d.querySelectorAll('#print-worksheet-view .pc-actions button')];
    actionBtns.find((b) => b.textContent === 'Print').click();
    expect(printCalls).toBe(1);
    actionBtns.find((b) => b.textContent === 'Download HTML worksheet').click();
    expect(downloads).toHaveLength(1);
    expect(clickedNames[0]).toMatch(/-activity-worksheet\.html$/);
    const downloadedHtml = await downloads[0].text();
    expect(downloadedHtml).toContain("script-src 'none'");

    // Escape closes and restores focus to opener button
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(api.worksheetView().hidden).toBe(true);
    expect(d.body.classList.contains('pc-on')).toBe(false);
    expect(d.activeElement).toBe(btn);
    w.HTMLAnchorElement.prototype.click = origClick;
  });
});

describe('3. Main App WordSoundsPreviewView & Packets Present/Export integration', () => {
  it('renders Print / Download Activity Worksheet button in WordSoundsPreviewView and downloads Canvas-safe standalone HTML', async () => {
    const modules = resolve('desktop/web-app/node_modules');
    const React = require(resolve(modules, 'react'));
    const { createRoot } = require(resolve(modules, 'react-dom/client'));
    const { act } = require(resolve(modules, 'react-dom/test-utils'));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;

    window.React = React;
    window.AlloModules = {};
    window.AlloIcons = { BookOpen: () => null, Play: () => null };
    window.eval(read('word_practice_module.js'));
    window.eval(read('view_word_sounds_preview_module.js'));

    const Preview = window.AlloModules.WordSoundsPreviewView;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    const downloadedBlobs = [];
    const downloadedNames = [];
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    const origAnchorClick = HTMLAnchorElement.prototype.click;
    URL.createObjectURL = (blob) => { downloadedBlobs.push(blob); return 'blob:preview-ws'; };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function () { downloadedNames.push(this.download); };

    try {
      const props = {
        generatedContent: {
          id: 'ws-preview-1',
          title: 'Digraphs & Syllables',
          data: [
            { word: 'ship', phonemes: ['sh', 'i', 'p'], graphemes: ['sh', 'i', 'p'] },
            { word: 'sunset', phonemes: ['s', 'u', 'n', 's', 'e', 't'], syllables: ['sun', 'set'] },
          ],
          sessionConfig: { language: 'English' },
        },
        wsActivitySequence: ['mapping', 'syllable_counting', 'syllable_blending', 'spelling_bee'],
        isTeacherMode: true,
        t: (k) => k,
        setWordSoundsActivity: vi.fn(),
        setIsWordSoundsMode: vi.fn(),
        setWordSoundsAutoReview: vi.fn(),
      };
      act(() => root.render(React.createElement(Preview, props)));

      const wsBtn = host.querySelector('[data-ws-worksheet-btn="true"]');
      expect(wsBtn).not.toBeNull();
      expect(wsBtn.textContent).toContain('Print / Download Activity Worksheet');
      expect(wsBtn.className).toContain('min-h-11');
      expect(wsBtn.className).toContain('focus:ring-2');
      expect(wsBtn.className).toContain('motion-reduce:transition-none');

      await act(async () => {
        wsBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(downloadedBlobs).toHaveLength(1);
      expect(downloadedNames[0]).toBe('digraphs-syllables-activity-worksheet.html');
      const wsHtml = await downloadedBlobs[0].text();
      expect(wsHtml).toContain("default-src 'none'; script-src 'none'");
      expect(wsHtml).toContain('data-activity="mapping"');
      expect(wsHtml).toContain('data-activity="syllable_counting"');
      expect(wsHtml).toContain('data-activity="syllable_blending"');
      expect(wsHtml).toContain('data-activity="spelling_bee"');
      expect(wsHtml).toContain('For the teacher — keep apart from the student copy');

      // Hidden in learner mode & locked assessments
      act(() => root.render(React.createElement(Preview, { ...props, isTeacherMode: false })));
      expect(host.querySelector('[data-ws-worksheet-btn="true"]')).toBeNull();
      act(() => root.render(React.createElement(Preview, {
        ...props, isTeacherMode: true,
        generatedContent: { ...props.generatedContent, sessionConfig: { fixedForm: true } },
      })));
      expect(host.querySelector('[data-ws-worksheet-btn="true"]')).toBeNull();
    } finally {
      act(() => root.unmount());
      host.remove();
      URL.createObjectURL = origCreate;
      URL.revokeObjectURL = origRevoke;
      HTMLAnchorElement.prototype.click = origAnchorClick;
    }
  });

  it('adds Word Sounds Activity Worksheet to packets-present-export.html #pe-sheet-type and downloads standalone HTML', async () => {
    const html = read('packets-present-export.html');
    const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://packets.example/packets-present-export.html' });
    doms.push(dom);
    const w = dom.window, d = w.document;
    expect(d.querySelector('#pe-sheet-type option[value="word-sounds-worksheet"]').textContent).toBe('Word Sounds Activity Worksheet');
    expect(d.body.textContent).not.toContain('!');

    const dlBlobs = [], dlNames = [];
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    w.URL.createObjectURL = (blob) => { dlBlobs.push(blob); return 'blob:pe-ws'; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () { dlNames.push(this.download); };

    w.AlloModules = { WordSoundsSymbols: SYMBOLS };
    w.eval(read('word_picture_matcher.js'));
    w.eval(read('word_practice_annotation_assets.js'));
    w.eval(read('word_practice_core.js'));
    w.eval(read('word_practice_media.js'));
    w.eval(read('word_practice_ui.js'));
    w.AlloModules.WordPractice.rasterizeImage = async () => PNG_1X1;
    w.eval(read('packets-present-export.js'));
    await new Promise((r) => setTimeout(r, 30));

    expect(typeof w.AlloPacketsPresentExport.buildWordSoundsWorksheetHtml).toBe('function');
    const sel = d.getElementById('pe-sheet-type');
    sel.value = 'word-sounds-worksheet';
    sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('pe-sheet-download').click();
    await new Promise((r) => setTimeout(r, 20));

    expect(dlBlobs).toHaveLength(1);
    expect(dlNames[0]).toMatch(/-word-sounds-worksheet\.html$/);
    const outHtml = await dlBlobs[0].text();
    expect(outHtml).toContain("default-src 'none'; script-src 'none'");
    expect(outHtml).toContain('Name:');
    expect(outHtml).toContain('For the teacher — keep apart from the student copy');
    expect(outHtml).toContain('data-activity="mapping"');
  });
});
