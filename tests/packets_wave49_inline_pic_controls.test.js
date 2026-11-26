// @vitest-environment jsdom
import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const read = (file) => readFileSync(file, 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const opened = [];
afterAll(() => {
  opened.forEach((w) => { try { w.close(); } catch (_) {} });
});

const SAMPLE_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const SAMPLE_PNG_URI = 'data:image/png;base64,' + SAMPLE_PNG_B64;

function makeStubSymbols(entries) {
  const map = new Map(Object.entries(entries));
  return {
    ready: () => true,
    has: (w) => map.has(String(w || '').toLowerCase()),
    get: (w) => map.get(String(w || '').toLowerCase()) || null,
    credits: {
      mulberry: { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', url: 'mulberrysymbols.org' }
    }
  };
}

function setupPrintCardsEnv(extra = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://site.test/packets-make.html'
  });
  const w = dom.window;
  const d = w.document;
  opened.push(w);

  const savedCalls = [];
  w.AlloPacketMyWords = {
    normalizeWord: (raw) => String(raw || '').trim().toLowerCase().replace(/[^a-z]/g, ''),
    creditLine: (c) => (c && c.own ? "The teacher's own picture." : ''),
    save: (payload) => {
      savedCalls.push(payload);
      return Promise.resolve(payload);
    },
    ...(extra.myWords || {})
  };

  let lastBlobText = '';
  w.Blob = class FakeBlob {
    constructor(parts, opts) {
      this.parts = parts;
      this.type = opts && opts.type;
      lastBlobText = parts.map((p) => String(p)).join('');
    }
  };
  w.URL.createObjectURL = () => 'blob:inline-pic-test';
  w.URL.revokeObjectURL = () => {};

  w.FileReader = class FakeFileReader {
    readAsDataURL(file) {
      this.result = (file && file._dataUri) || SAMPLE_PNG_URI;
      if (typeof this.onload === 'function') this.onload({ target: this });
    }
  };

  w.eval(read('packets-print-cards.js'));
  return {
    w,
    d,
    api: w.AlloPacketPrintCards,
    savedCalls,
    getLastBlobText: () => lastBlobText,
    triggerUpload(uploadBtn, dataUri = SAMPLE_PNG_URI) {
      uploadBtn.click();
      const inp = d.querySelector('input.pc-pic-file-input');
      expect(inp).toBeTruthy();
      Object.defineProperty(inp, 'files', {
        configurable: true,
        value: [{ name: 'custom.png', type: 'image/png', _dataUri: dataUri }]
      });
      inp.dispatchEvent(new w.Event('change', { bubbles: true }));
    }
  };
}

describe('Wave 49 inline picture controls in worksheets & word cards', () => {
  it('passes strictConcrete: true, preferDiagrams: false for Word Sounds and preferDiagrams: true for Vocabulary', async () => {
    const { api } = setupPrintCardsEnv();
    const calls = [];
    const fakeMatcher = {
      matchWord(req, opts) {
        calls.push({ word: req.word, opts: { ...opts } });
        return { svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>', set: 'mulberry' };
      }
    };

    const wsModel = api.normalizeWorksheetModel(
      { title: 'WS', words: ['cat'], activities: ['mapping'], matcher: fakeMatcher },
      { pictures: true }
    );
    expect(wsModel.hasPicture('cat')).toBe(true);
    const wsCall = calls.find((c) => c.word === 'cat');
    expect(wsCall.opts.strictConcrete).toBe(true);
    expect(wsCall.opts.preferDiagrams).toBe(false);

    calls.length = 0;
    const vocabModel = api.normalizeVocabWorksheetModel(
      { title: 'Vocab', entries: [{ word: 'cell', meaning: 'basic unit of life' }], matcher: fakeMatcher },
      { pictures: true }
    );
    expect(vocabModel.pictureItems).toHaveLength(1);
    const vocabCall = calls.find((c) => c.word === 'cell');
    expect(vocabCall.opts.preferDiagrams).toBe(true);
    expect(vocabCall.opts.strictConcrete).toBe(false);
  });

  it('Word Sounds worksheet preview: delete bank picture, restore it, and upload custom image flowing into HTML export', async () => {
    const env = setupPrintCardsEnv();
    const symbols = makeStubSymbols({
      cat: { svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>', set: 'mulberry' },
      dog: { svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="5"/></svg>', set: 'mulberry' }
    });

    await env.api.openWorksheet({
      title: 'Phonics Pack',
      words: ['cat', 'dog'],
      activities: ['mapping'],
      pictures: true,
      symbols
    });

    // Initially both pictures appear with Upload image and Remove picture buttons
    expect(env.d.querySelectorAll('#print-worksheet-view img.pc-ws-pic')).toHaveLength(2);
    const delCat = env.d.querySelector('#print-worksheet-view [data-pic-delete="cat"]');
    expect(delCat).toBeTruthy();
    expect(delCat.getAttribute('aria-label')).toContain('cat');

    // Delete built-in bank picture for "cat"
    delCat.click();
    expect(env.savedCalls.at(-1)).toEqual({ word: 'cat', picture: { none: true } });
    expect(env.d.querySelectorAll('#print-worksheet-view img.pc-ws-pic')).toHaveLength(1);
    expect(env.d.querySelector('#print-worksheet-view [data-pic-delete="cat"]')).toBeNull();
    const restoreCat = env.d.querySelector('#print-worksheet-view [data-pic-restore="cat"]');
    expect(restoreCat).toBeTruthy();

    // Exported HTML omits "cat" picture (only 1 ws-pic img)
    env.d.getElementById('pc-ws-download').click();
    const htmlAfterDelete = env.getLastBlobText();
    expect((htmlAfterDelete.match(/class="ws-pic"/g) || []).length).toBe(1);

    // Restore picture for "cat"
    restoreCat.click();
    expect(env.savedCalls.at(-1)).toEqual({ word: 'cat', picture: null });
    expect(env.d.querySelectorAll('#print-worksheet-view img.pc-ws-pic')).toHaveLength(2);
    expect(env.d.querySelector('#print-worksheet-view [data-pic-restore="cat"]')).toBeNull();

    // Upload custom image for "cat"
    const upCat = env.d.querySelector('#print-worksheet-view [data-pic-upload="cat"]');
    expect(upCat).toBeTruthy();
    env.triggerUpload(upCat, SAMPLE_PNG_URI);
    expect(env.savedCalls.at(-1)).toEqual({
      word: 'cat',
      picture: { dataUri: SAMPLE_PNG_URI, credit: { own: true } }
    });
    const imgs = [...env.d.querySelectorAll('#print-worksheet-view img.pc-ws-pic')];
    expect(imgs.some((img) => img.src === SAMPLE_PNG_URI)).toBe(true);

    // Exported HTML includes the newly uploaded custom image
    env.d.getElementById('pc-ws-download').click();
    expect(env.getLastBlobText()).toContain(SAMPLE_PNG_URI);
  });

  it('Vocabulary worksheet preview: delete bank picture, restore it, and upload custom image flowing into HTML export', async () => {
    const env = setupPrintCardsEnv();
    const symbols = makeStubSymbols({
      bat: { svg: '<svg xmlns="http://www.w3.org/2000/svg"><rect width="12" height="12"/></svg>', set: 'mulberry' },
      owl: { svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="6"/></svg>', set: 'mulberry' }
    });

    await env.api.openVocabWorksheet({
      title: 'Animals Vocab',
      entries: [
        { word: 'bat', meaning: 'a flying mammal', example: 'The bat flew at night.' },
        { word: 'owl', meaning: 'a night bird', example: 'The owl sat in the tree.' }
      ],
      pictures: true,
      symbols
    });

    expect(env.d.querySelectorAll('#print-vocab-worksheet-view img.pc-vocab-pic-img')).toHaveLength(2);

    // Delete "bat" picture
    const delBat = env.d.querySelector('#print-vocab-worksheet-view [data-pic-delete="bat"]');
    expect(delBat).toBeTruthy();
    delBat.click();
    expect(env.savedCalls.at(-1)).toEqual({ word: 'bat', picture: { none: true } });
    expect(env.d.querySelectorAll('#print-vocab-worksheet-view img.pc-vocab-pic-img')).toHaveLength(1);
    const restoreBat = env.d.querySelector('#print-vocab-worksheet-view [data-pic-restore="bat"]');
    expect(restoreBat).toBeTruthy();

    // Exported HTML omits "bat" picture tile
    env.d.getElementById('pc-vocab-download').click();
    expect((env.getLastBlobText().match(/class="vocab-pic-img"/g) || []).length).toBe(1);

    // Restore "bat" picture
    restoreBat.click();
    expect(env.savedCalls.at(-1)).toEqual({ word: 'bat', picture: null });
    expect(env.d.querySelectorAll('#print-vocab-worksheet-view img.pc-vocab-pic-img')).toHaveLength(2);

    // Upload custom image for "bat"
    const upBat = env.d.querySelector('#print-vocab-worksheet-view [data-pic-upload="bat"]');
    env.triggerUpload(upBat, SAMPLE_PNG_URI);
    expect(env.savedCalls.at(-1)).toEqual({
      word: 'bat',
      picture: { dataUri: SAMPLE_PNG_URI, credit: { own: true } }
    });
    const imgs = [...env.d.querySelectorAll('#print-vocab-worksheet-view img.pc-vocab-pic-img')];
    expect(imgs.some((img) => img.src === SAMPLE_PNG_URI)).toBe(true);

    env.d.getElementById('pc-vocab-download').click();
    expect(env.getLastBlobText()).toContain(SAMPLE_PNG_URI);
  });

  it('Word Cards preview: delete, restore, and upload custom image update cards live', async () => {
    const env = setupPrintCardsEnv();
    const symbols = makeStubSymbols({
      sun: { svg: '<svg xmlns="http://www.w3.org/2000/svg"><circle r="8"/></svg>', set: 'mulberry' }
    });

    await env.api.open({
      title: 'Sun Cards',
      words: ['sun'],
      pictures: true,
      symbols
    });

    expect(env.d.querySelectorAll('#print-cards-view img.pc-pic')).toHaveLength(1);
    env.d.querySelector('#print-cards-view [data-pic-delete="sun"]').click();
    expect(env.d.querySelectorAll('#print-cards-view img.pc-pic')).toHaveLength(0);
    expect(env.d.querySelector('#print-cards-view [data-pic-restore="sun"]')).toBeTruthy();

    env.d.querySelector('#print-cards-view [data-pic-restore="sun"]').click();
    expect(env.d.querySelectorAll('#print-cards-view img.pc-pic')).toHaveLength(1);

    env.triggerUpload(env.d.querySelector('#print-cards-view [data-pic-upload="sun"]'), SAMPLE_PNG_URI);
    expect(env.d.querySelector('#print-cards-view img.pc-pic').src).toBe(SAMPLE_PNG_URI);
  });

  it('Vocabulary Maker Step 2/3 custom picture rows allow deleting and restoring built-in bank pictures', async () => {
    const PAGE_SCRIPTS = [
      'packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_reopen.js',
      'packets_zip.js', 'packets_handoff.js', 'packets_my_words.js', 'packets_vocab_bank_en.js',
      'word_sounds_symbols_en.js', 'reading_symbols_ext_en.js', 'word_picture_semantic_en.js',
      'word_picture_matcher.js', 'word_sounds_packet_builder.js', 'packets_vocab_media.js',
      'packet_vocab_builder.js', 'packets-print-cards.js', 'packets_word_starters.js', 'packets-vocab.js'
    ];
    const dom = new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-vocab.html'
    });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:vocab-maker';
    w.URL.revokeObjectURL = () => {};
    w.fetch = (url) => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(read(String(url))) });
    for (const src of PAGE_SCRIPTS) {
      w.eval(src === 'packets_vocab_bank_en.js' ? read('tests/fixtures/packets_vocab_bank_fixture.js') : read(src));
    }
    await wait(10);

    const $ = (id) => d.getElementById(id);
    const fire = (n, t) => n.dispatchEvent(new w.Event(t, { bubbles: true }));
    $('f-words').value = 'bat, nest, owl, hunt';
    fire($('f-words'), 'input');
    await wait(300);
    $('next-1').click();
    $('next-2').click();
    await wait(60);

    // Built-in bank picture for "bat" gets a "Remove picture" button [data-hide-pic="bat"]
    const hideBat = d.querySelector('[data-hide-pic="bat"]');
    expect(hideBat).toBeTruthy();
    expect(hideBat.textContent).toBe('Remove picture');

    // Clicking Remove picture suppresses it and swaps to "Restore picture" [data-restore-pic="bat"]
    hideBat.click();
    await wait(30);
    expect(d.querySelector('[data-hide-pic="bat"]')).toBeNull();
    const restoreBat = d.querySelector('[data-restore-pic="bat"]');
    expect(restoreBat).toBeTruthy();
    expect(restoreBat.textContent).toBe('Restore picture');
    expect(d.querySelector('[data-custom-pic-row="bat"]').textContent).toContain('Picture removed.');

    // Clicking Restore picture brings back the bank picture and [data-hide-pic="bat"]
    restoreBat.click();
    await wait(30);
    expect(d.querySelector('[data-restore-pic="bat"]')).toBeNull();
    expect(d.querySelector('[data-hide-pic="bat"]')).toBeTruthy();
  });

  it('packets-print-cards.css remains strictly monochrome, URL-free, and hides inline picture controls in @media print', () => {
    const css = read('packets-print-cards.css');
    const hexes = [...new Set((css.match(/#[0-9a-f]{3,8}\b/gi) || []).map((c) => c.toLowerCase()))];
    for (const hex of hexes) {
      expect(['#000000', '#ffffff', '#808080']).toContain(hex);
    }
    expect(css).not.toMatch(/https?:\/\/|\/\/[a-z0-9.-]+\.[a-z]{2,}/i);
    const printBlock = css.slice(css.indexOf('@media print'));
    expect(printBlock).toContain('.pc-pic-actions');
    expect(printBlock).toContain('.pc-pic-suppressed');
    expect(printBlock).toContain('[data-pic-controls]');
    expect(printBlock).toContain('display: none !important');
  });
});
