// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const cards = require('../packets-print-cards.js');
const SYMBOLS = require('../word_sounds_symbols_en.js');
const EXT_SYMBOLS = require('../reading_symbols_ext_en.js');
const semanticBridge = require('../word_picture_semantic_en.js');
const matcher = require('../word_picture_matcher.js');

for (const shard of SYMBOLS.shards) SYMBOLS.add(JSON.parse(read(shard.url)));
for (const shard of EXT_SYMBOLS.shards) EXT_SYMBOLS.add(JSON.parse(read(shard.url)));

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const WAIT = (ms = 20) => new Promise((r) => setTimeout(r, ms));

const doms = [];
afterEach(() => {
  while (doms.length) {
    try { doms.pop().window.close(); } catch (_) {}
  }
});

describe('Wave 47 Goal 1: One-click missing pictures queue button', () => {
  it('shows #find-missing-pictures in Word Sounds Maker Step 3 when words lack pictures and hides when 0 are missing', async () => {
    const dom = new JSDOM(read('packets-make.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-make.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:ws-test';
    w.URL.revokeObjectURL = () => {};
    w.scrollTo = () => {};

    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) {
      w.eval(read(src));
    }
    await WAIT(40);

    const $ = (id) => d.getElementById(id);
    const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));

    // Switch to "Type my own words" mode and enter words where 2 have no offline picture
    const ownRadio = d.querySelector('input[name="mode"][value="own"]');
    ownRadio.checked = true;
    fire(ownRadio, 'change');

    // Pick real wordlist words with built-in Kokoro recordings that have no picture in SYMBOLS/EXT_SYMBOLS/semantic/matcher
    const wordlistRows = w.AlloModules.WordSoundsWordlist.rows().filter((r) => r.kokoro);
    const noPicWords = [];
    for (const row of wordlistRows) {
      const word = row.word;
      if (SYMBOLS.has(word) || EXT_SYMBOLS.has(word) || semanticBridge.has(word)) continue;
      const probed = matcher.matchWord({ word }, { symbols: SYMBOLS, readingSymbolsExt: EXT_SYMBOLS, semantic: semanticBridge, preferDiagrams: true });
      if (!probed || !probed.svg) {
        noPicWords.push(word);
        if (noPicWords.length >= 2) break;
      }
    }
    expect(noPicWords.length).toBe(2);

    $('f-own').value = ['cat', 'dog', noPicWords[0], noPicWords[1]].join(', ');
    fire($('f-own'), 'input');
    await WAIT(300);

    // Go to Step 3
    $('next-1').click();
    $('next-2').click();
    await WAIT(40);

    const link = $('find-missing-pictures');
    expect(link).toBeTruthy();
    expect(link.hidden).toBe(false);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');
    expect(link.textContent).toContain('Find pictures for the 2 missing words');
    expect(link.getAttribute('href')).toBe(
      `packets-pictures.html#word=${encodeURIComponent(noPicWords[0])}&more=${encodeURIComponent(noPicWords[1])}`
    );

    // Now switch to words that ALL have pictures: cat, dog, sun
    $('back-3').click();
    $('f-own').value = 'cat, dog, sun';
    fire($('f-own'), 'input');
    await WAIT(300);
    $('next-2').click();
    await WAIT(40);

    expect(link.hidden).toBe(true);
  });

  it('shows [data-find-missing-pics] in both Word Sounds and Vocabulary worksheet modal toolbars when pictures are on and words lack pictures', async () => {
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://site.test/packets-make.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.scrollTo = () => {};

    const fakeSymbols = {
      bytes: 1000,
      has: (word) => word === 'cat',
      get: (word) => (word === 'cat' ? SYMBOLS.get('cat') : null),
      ready: () => true,
      credits: SYMBOLS.credits,
      credit: SYMBOLS.credit,
    };

    const inst = cards.create(d, w);

    // 1) Word Sounds worksheet modal with 2 missing words
    await inst.openWorksheet({
      title: 'WS Missing Pics',
      words: ['cat', 'blorp', 'flintx'],
      activities: ['mapping'],
      pictures: true,
      symbols: fakeSymbols,
      readingSymbolsExt: null,
      semanticBridge: null,
      matcher: null,
    });

    const wsLink = d.querySelector('#print-worksheet-view [data-find-missing-pics]');
    expect(wsLink).toBeTruthy();
    expect(wsLink.hidden).toBe(false);
    expect(wsLink.target).toBe('_blank');
    expect(wsLink.rel).toBe('noopener');
    expect(wsLink.textContent).toContain('Find pictures for 2 missing words');
    expect(wsLink.getAttribute('href')).toBe('packets-pictures.html#word=blorp&more=flintx');

    // Turning pictures off hides the link
    const wsPicBox = d.getElementById('pc-ws-pictures');
    wsPicBox.checked = false;
    wsPicBox.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(wsLink.hidden).toBe(true);

    // Turning pictures back on restores it
    wsPicBox.checked = true;
    wsPicBox.dispatchEvent(new w.Event('change', { bubbles: true }));
    await WAIT(10);
    expect(wsLink.hidden).toBe(false);

    // When all words have pictures, link is hidden
    await inst.openWorksheet({
      title: 'WS All Pics',
      words: ['cat'],
      activities: ['mapping'],
      pictures: true,
      symbols: fakeSymbols,
      readingSymbolsExt: null,
      semanticBridge: null,
      matcher: null,
    });
    expect(wsLink.hidden).toBe(true);
    inst.closeWorksheet();

    // 2) Vocabulary worksheet modal with 2 missing words
    await inst.openVocabWorksheet({
      title: 'Vocab Missing Pics',
      entries: [
        { word: 'cat', meaning: 'a small pet', picture: PNG_1X1 },
        { word: 'blorp', meaning: 'made-up word one' },
        { word: 'flintx', meaning: 'made-up word two' },
      ],
      pictures: true,
      symbols: fakeSymbols,
      matcher: null,
    });

    const vocabLink = d.querySelector('#print-vocab-worksheet-view [data-find-missing-pics]');
    expect(vocabLink).toBeTruthy();
    expect(vocabLink.hidden).toBe(false);
    expect(vocabLink.target).toBe('_blank');
    expect(vocabLink.rel).toBe('noopener');
    expect(vocabLink.textContent).toContain('Find pictures for 2 missing words');
    expect(vocabLink.getAttribute('href')).toBe('packets-pictures.html#word=blorp&more=flintx');

    // Turning pictures off hides it
    const vocabPicBox = d.getElementById('pc-vocab-pictures');
    vocabPicBox.checked = false;
    vocabPicBox.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(vocabLink.hidden).toBe(true);
    inst.closeVocabWorksheet();

    // Verify packets-print-cards.css hides [data-find-missing-pics] in @media print and stays monochrome
    const css = read('packets-print-cards.css');
    const printBlock = css.slice(css.indexOf('@media print'));
    expect(printBlock).toContain('[data-find-missing-pics]');
    expect(printBlock).toContain('display: none !important');
    const hexColors = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0].toLowerCase());
    for (const hex of hexColors) {
      expect(['#000000', '#ffffff', '#808080']).toContain(hex);
    }
  });

  it('shows #vocab-find-missing-pics in Vocabulary Maker Step 3 and hides when all words have pictures', async () => {
    const dom = new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-vocab.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:vocab-test';
    w.URL.revokeObjectURL = () => {};
    w.fetch = () => Promise.reject(new Error('offline test'));

    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) {
      if (src === 'packets_vocab_bank_en.js') {
        w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
        continue;
      }
      w.eval(read(src));
      if (src === 'word_sounds_symbols_en.js') {
        for (const sh of w.AlloModules.WordSoundsSymbols.shards) {
          w.AlloModules.WordSoundsSymbols.add(JSON.parse(read(sh.url)));
        }
      }
    }
    await WAIT(20);

    const $ = (id) => d.getElementById(id);
    const fire = (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true }));

    // habitat and predator lack pictures in SYMBOLS; bat, nest, owl, cat have pictures
    $('f-words').value = 'bat, nest, owl, cat, habitat, predator';
    fire($('f-words'), 'input');
    await WAIT(300);

    $('next-1').click();
    $('next-2').click();
    await WAIT(60);

    const link = $('vocab-find-missing-pics');
    expect(link).toBeTruthy();
    expect(link.hidden).toBe(false);
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');
    expect(link.textContent).toContain('Find pictures for the 2 missing words');
    expect(link.getAttribute('href')).toBe('packets-pictures.html#word=habitat&more=predator');

    // Now use only words that all have pictures
    $('back-3').click();
    $('back-2').click();
    $('f-words').value = 'bat, nest, owl, cat';
    fire($('f-words'), 'input');
    await WAIT(300);
    $('next-1').click();
    $('next-2').click();
    await WAIT(60);

    expect(link.hidden).toBe(true);
  });
});

describe('Wave 47 Goal 2: Inline Kokoro voice callout for unrecorded Fill-in-the-blank sentences', () => {
  async function openVocabWithMedia({ siteMeaningClips = {}, myMeaningClips = {} } = {}) {
    const dom = new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-vocab.html',
    });
    doms.push(dom);
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:vocab-kokoro';
    w.URL.revokeObjectURL = () => {};
    w.fetch = () => Promise.reject(new Error('offline test'));

    const scripts = [...d.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const src of scripts) {
      if (src === 'packets_vocab_bank_en.js') {
        w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
        continue;
      }
      if (src === 'packets_vocab_media.js') {
        w.AlloVocabMedia = {
          pictures: () => Promise.resolve(false),
          clips: () => Promise.resolve({}),
          meaningClips: (texts) => {
            const out = {};
            for (const t of texts) {
              if (siteMeaningClips[t]) out[t] = siteMeaningClips[t];
            }
            return Promise.resolve(out);
          },
        };
        continue;
      }
      if (src === 'packets_my_words.js') {
        w.eval(read(src));
        w.AlloPacketMyWords.getMeaningClips = (texts) => {
          const out = {};
          for (const t of texts) {
            if (myMeaningClips[t]) out[t] = { dataUri: myMeaningClips[t] };
          }
          return Promise.resolve(out);
        };
        continue;
      }
      w.eval(read(src));
    }
    await WAIT(20);
    return {
      w,
      d,
      $: (id) => d.getElementById(id),
      fire: (node, type) => node.dispatchEvent(new w.Event(type, { bubbles: true })),
    };
  }

  it('shows #blank-kokoro-callout inside #blank-panel when Fill the blank is enabled and sentences lack Kokoro audio, and hides when all are recorded', async () => {
    const fakeMp3 = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA';
    const words = 'habitat, predator, prey, cell, bat, nest';

    // Case 1: 0 recordings -> all usable blank sentences appear in #blank-kokoro-callout
    const p1 = await openVocabWithMedia();
    p1.$('f-words').value = words;
    p1.fire(p1.$('f-words'), 'input');
    await WAIT(300);
    p1.$('next-1').click();
    p1.$('next-2').click();
    await WAIT(80);

    const blankBox = p1.d.querySelector('input[data-type="blank"]');
    expect(blankBox).toBeTruthy();
    blankBox.checked = true;
    p1.fire(blankBox, 'change');
    await WAIT(120);

    const callout = p1.$('blank-kokoro-callout');
    expect(callout).toBeTruthy();
    expect(callout.closest('#blank-panel')).toBeTruthy();
    expect(callout.hidden).toBe(false);
    expect(callout.textContent).toMatch(/fill-in-the-blank sentences? uses? the device voice right now — generate Kokoro voices in 1 click/);

    const link = p1.$('blank-kokoro-link');
    expect(link).toBeTruthy();
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');
    const href = link.getAttribute('href');
    expect(href.startsWith('packets-voice.html#meanings=')).toBe(true);
    const decoded = JSON.parse(decodeURIComponent(href.slice('packets-voice.html#meanings='.length)));
    expect(Array.isArray(decoded)).toBe(true);
    expect(decoded.length).toBeGreaterThanOrEqual(1);
    expect(callout.textContent).toContain(
      decoded.length === 1
        ? '1 fill-in-the-blank sentence uses the device voice right now'
        : `${decoded.length} fill-in-the-blank sentences use the device voice right now`
    );

    // Turning Fill the blank off hides the callout
    blankBox.checked = false;
    p1.fire(blankBox, 'change');
    await WAIT(80);
    expect(callout.hidden).toBe(true);

    // Case 2: All usable blank sentences already have Kokoro recordings (split across site + myWords) -> callout hidden
    const siteClips = {};
    const myClips = {};
    decoded.forEach((sentence, i) => {
      if (i % 2 === 0) siteClips[sentence] = fakeMp3;
      else myClips[sentence] = fakeMp3;
    });

    const p2 = await openVocabWithMedia({ siteMeaningClips: siteClips, myMeaningClips: myClips });
    p2.$('f-words').value = words;
    p2.fire(p2.$('f-words'), 'input');
    await WAIT(300);
    p2.$('next-1').click();
    p2.$('next-2').click();
    await WAIT(80);

    const blankBox2 = p2.d.querySelector('input[data-type="blank"]');
    blankBox2.checked = true;
    p2.fire(blankBox2, 'change');
    await WAIT(120);

    expect(p2.$('blank-panel').hidden).toBe(false);
    expect(p2.$('blank-kokoro-callout').hidden).toBe(true);
  });
});
