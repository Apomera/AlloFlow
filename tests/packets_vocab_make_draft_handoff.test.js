import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const verify = require('../packets_verify_core.js');
const HANDOFF_SRC = read('packets_handoff.js');

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const SVG_RAW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#16a34a"/></svg>';
const SVG_UTF8 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG_RAW);

const opened = [];
afterAll(() => {
  opened.forEach((w) => { try { w.close(); } catch (_) {} });
});

const wait = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn, what = 'condition', maxTicks = 250) {
  for (let i = 0; i < maxTicks; i++) {
    if (fn()) return;
    await wait(15);
  }
  throw new Error('Timed out waiting for ' + what);
}

function makeMemoryIdb(backingMap = new Map()) {
  const dbs = new Map([['alloflow-packets-handoff', new Map([['files', backingMap]])]]);
  const makeDb = (dbName) => {
    if (!dbs.has(dbName)) dbs.set(dbName, new Map());
    const stores = dbs.get(dbName);
    return {
      objectStoreNames: { contains: (name) => stores.has(name) },
      createObjectStore: (name) => { if (!stores.has(name)) stores.set(name, new Map()); return {}; },
      close: () => {},
      transaction: (storeName) => {
        if (!stores.has(storeName)) stores.set(storeName, new Map());
        const map = stores.get(storeName);
        const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
        const pending = [];
        let scheduled = false;
        const schedule = () => {
          if (scheduled) return;
          scheduled = true;
          setTimeout(() => {
            for (const fn of pending) fn();
            if (typeof tx.oncomplete === 'function') tx.oncomplete({ target: tx });
          }, 0);
        };
        tx.objectStore = () => ({
          put: (record) => {
            const req = { result: undefined, onsuccess: null, onerror: null };
            pending.push(() => { map.set(record.id || record.word || record.key, record); if (typeof req.onsuccess === 'function') req.onsuccess({ target: req }); });
            schedule();
            return req;
          },
          get: (key) => {
            const req = { result: undefined, onsuccess: null, onerror: null };
            pending.push(() => { req.result = map.has(key) ? map.get(key) : undefined; if (typeof req.onsuccess === 'function') req.onsuccess({ target: req }); });
            schedule();
            return req;
          },
          getAll: () => {
            const req = { result: undefined, onsuccess: null, onerror: null };
            pending.push(() => { req.result = [...map.values()]; if (typeof req.onsuccess === 'function') req.onsuccess({ target: req }); });
            schedule();
            return req;
          },
          delete: (key) => {
            const req = { result: undefined, onsuccess: null, onerror: null };
            pending.push(() => { map.delete(key); if (typeof req.onsuccess === 'function') req.onsuccess({ target: req }); });
            schedule();
            return req;
          },
        });
        return tx;
      },
    };
  };
  return {
    backingMap,
    indexedDB: {
      open: (dbName) => {
        const req = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
        setTimeout(() => {
          req.result = makeDb(String(dbName || 'default'));
          if (typeof req.onupgradeneeded === 'function') req.onupgradeneeded({ target: req });
          if (typeof req.onsuccess === 'function') req.onsuccess({ target: req });
        }, 0);
        return req;
      },
    },
  };
}

function loadHandoffSandbox({ idb = makeMemoryIdb() } = {}) {
  const sandbox = {
    indexedDB: idb.indexedDB,
    TextEncoder,
    TextDecoder,
    location: { href: 'https://alloflow.test/app.html' },
    open: () => ({}),
    Date,
    Promise,
  };
  sandbox.window = sandbox;
  new Function('window', HANDOFF_SRC).call(sandbox, sandbox);
  return { api: sandbox.AlloPacketHandoff, backingMap: idb.backingMap };
}

describe('1. packets_handoff.js sanitizeDraft for vocab and word_sounds', () => {
  it('sanitizes vocab drafts, enforces caps/bounds, and strips unsafe URIs and prototype keys', async () => {
    const idb = makeMemoryIdb();
    const { api } = loadHandoffSandbox({ idb });

    expect(api.sanitizeDraft({ kind: 'vocab', title: 'Empty', entries: [] })).toBeNull();
    expect(api.sanitizeDraft({ kind: 'vocab', title: 'No words', entries: [{ word: '   ', meaning: 'x' }] })).toBeNull();

    const tooBigImg = 'data:image/png;base64,' + 'A'.repeat(1600000);
    const rawEntries = [
      { word: '  habitat  ', meaning: '  Where an animal lives  ', example: 'A pond is a frog habitat.', pos: 'noun', tier: '2', imgUri: PNG_1X1, alt: 'Pond icon' },
      { word: 'photosynthesis', meaning: 'Plants making food', imgUri: SVG_UTF8, alt: 'Leaf' },
      { word: 'unsafe', meaning: 'Bad uri', imgUri: 'https://evil.example/a.png', alt: 'Nope' },
      { word: 'jsuri', meaning: 'Bad scheme', imgUri: 'javascript:alert(1)' },
      { word: 'oversized', meaning: 'Too large', imgUri: tooBigImg },
    ];
    for (let i = 0; i < 105; i++) rawEntries.push({ word: 'extra' + i, meaning: 'Def ' + i });

    const malicious = JSON.parse(JSON.stringify({
      kind: 'vocab',
      title: '  Ecosystems Unit  ',
      lang: 'EN-us',
      entries: rawEntries,
    }));
    malicious.__proto__ = { polluted: true };

    await expect(api.putDraft(malicious)).resolves.toBe(true);
    const taken = await api.takeDraft();
    expect(taken.kind).toBe('vocab');
    expect(taken.title).toBe('Ecosystems Unit');
    expect(taken.lang).toBe('en-us');
    expect(taken.entries).toHaveLength(100);
    expect(taken.entries[0]).toEqual({
      word: 'habitat',
      meaning: 'Where an animal lives',
      example: 'A pond is a frog habitat.',
      pos: 'noun',
      tier: '2',
      imgUri: PNG_1X1,
      alt: 'Pond icon',
    });
    expect(taken.entries[1].imgUri).toBe(SVG_UTF8);
    expect(taken.entries[2].imgUri).toBe('');
    expect(taken.entries[3].imgUri).toBe('');
    expect(taken.entries[4].imgUri).toBe('');
    expect(({}).polluted).toBeUndefined();
  });

  it('sanitizes word_sounds drafts, caps words at 120, filters activities, and cleans pictures map', async () => {
    const idb = makeMemoryIdb();
    const { api } = loadHandoffSandbox({ idb });

    expect(api.sanitizeDraft({ kind: 'word_sounds', words: [] })).toBeNull();

    const manyWords = ['  Cat ', 'cat', 'dog', 'ship'];
    for (let i = 0; i < 130; i++) manyWords.push('word' + i);

    const payload = JSON.parse(
      '{"kind":"word_sounds","title":"  Short Vowels  ","lang":"en","pattern":" CVC ","activities":["blending","mapping","bad activity!","blending"],"pictures":{"__proto__":"'
      + PNG_1X1 + '","constructor":"' + PNG_1X1 + '","Cat":"' + PNG_1X1 + '","dog":"' + SVG_UTF8
      + '","ship":"https://evil.example/x.png","bad":"javascript:alert(1)"}}'
    );
    payload.words = manyWords;

    await expect(api.putDraft(payload)).resolves.toBe(true);
    const taken = await api.takeDraft();
    expect(taken.kind).toBe('word_sounds');
    expect(taken.title).toBe('Short Vowels');
    expect(taken.lang).toBe('en');
    expect(taken.pattern).toBe('CVC');
    expect(taken.words).toHaveLength(120);
    expect(taken.words.slice(0, 3)).toEqual(['Cat', 'dog', 'ship']);
    expect(taken.activities).toEqual(['blending', 'mapping']);
    expect(Object.keys(taken.pictures).sort()).toEqual(['cat', 'dog']);
    expect(taken.pictures.cat).toBe(PNG_1X1);
    expect(taken.pictures.dog).toBe(SVG_UTF8);
    expect(Object.prototype.hasOwnProperty.call(taken.pictures, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(taken.pictures, 'constructor')).toBe(false);
  });
});

describe('2. packets-vocab.js #import-draft hydration', () => {
  const VOCAB_SCRIPTS = [
    'packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_reopen.js',
    'packets_zip.js', 'packets_handoff.js', 'packets_my_words.js', 'packets_vocab_bank_en.js',
    'word_sounds_symbols_en.js', 'word_picture_matcher.js', 'word_sounds_packet_builder.js',
    'packets_vocab_media.js', 'packet_vocab_builder.js', 'packets-print-cards.js', 'packets_word_starters.js',
    'packets-vocab.js',
  ];

  async function openVocabWithIdb(idb, hash = '#import-draft') {
    const saved = [];
    const dom = new JSDOM(read('packets-vocab.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-vocab.html' + hash,
    });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w, 'indexedDB', { value: idb.indexedDB, configurable: true });
    w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:vocab-' + saved.length; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const src of VOCAB_SCRIPTS) {
      if (src === 'packets_vocab_bank_en.js') {
        w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
        continue;
      }
      w.eval(read(src));
    }
    const $ = (id) => d.getElementById(id);
    return { w, d, $, saved };
  }

  it('hydrates title, words, custom meanings, examples, and pictures from #import-draft and builds cleanly', async () => {
    const idb = makeMemoryIdb();
    const { api } = loadHandoffSandbox({ idb });

    await api.putDraft({
      kind: 'vocab',
      title: 'Pond Ecosystems',
      lang: 'en',
      entries: [
        { word: 'habitat', meaning: 'The natural neighborhood where a living thing thrives', example: 'Frogs depend on a wet habitat.', pos: 'noun', tier: '2', imgUri: PNG_1X1, alt: 'Pond' },
        { word: 'predator', meaning: 'An animal that hunts other animals for its meal', example: 'The owl is a night predator.', pos: 'noun', tier: '2', imgUri: SVG_UTF8, alt: 'Owl' },
        { word: 'prey', meaning: '', example: '', pos: 'noun', tier: '2', imgUri: '', alt: '' },
        { word: 'cell', meaning: 'A tiny building block of every living organism', example: 'Every leaf cell holds water.', pos: 'noun', tier: '2', imgUri: '', alt: '' },
        { word: 'photosynthesis', meaning: 'How green plants turn sunlight into food', example: 'Leaves use photosynthesis every sunny day.', pos: 'noun', tier: '3', imgUri: PNG_1X1, alt: 'Leaf' },
      ],
    });

    const p = await openVocabWithIdb(idb);
    await until(() => p.$('reopen-note').hidden === false && p.$('save').hidden === false, 'vocab draft built');

    expect(p.w.location.hash).toBe('');
    expect(p.$('reopen-line').textContent).toBe('Loaded 5 words from AlloFlow.');
    expect(p.$('f-title').value).toBe('Pond Ecosystems');
    expect(p.$('f-words').value).toBe('habitat\npredator\nprey\ncell\nphotosynthesis');
    expect(p.$('step-3').hidden).toBe(false);
    expect(p.$('print-cards').hidden).toBe(false);
    expect(p.$('print-worksheet').hidden).toBe(false);

    // Verify custom pictures carried into Step 3 custom-pic rows.
    expect(p.d.querySelector('[data-custom-pic-row="habitat"]').textContent).toContain('Your picture is set.');
    expect(p.d.querySelector('[data-custom-pic-row="predator"]').textContent).toContain('Your picture is set.');
    expect(p.d.querySelector('[data-custom-pic-row="photosynthesis"]').textContent).toContain('Your picture is set.');

    // Verify built HTML includes custom title, custom meanings, and passes verification.
    const htmlBlob = p.saved.filter((b) => b.type === 'text/html').pop();
    expect(htmlBlob).toBeTruthy();
    const html = await htmlBlob.text();
    expect(html).toContain('Pond Ecosystems');
    expect(html).toContain('The natural neighborhood where a living thing thrives');
    expect(html).toContain('How green plants turn sunlight into food');
    expect(verify.verifyPacket(html).result).toBe('closed');

    // Navigate to Step 2 and verify custom meanings (and fallback bank meaning for blank 'prey').
    p.$('back-3').click();
    await until(() => p.$('step-2').hidden === false, 'step 2 visible');
    expect(p.d.querySelector('[data-row="habitat"] .v-right .v-text').textContent).toContain('The natural neighborhood where a living thing thrives');
    expect(p.d.querySelector('[data-row="photosynthesis"] .v-right .v-text').textContent).toContain('How green plants turn sunlight into food');
    expect(p.d.querySelector('[data-row="prey"] .v-right .v-text').textContent).toContain('An animal that is hunted and eaten by another animal');
  }, 45000);
});

describe('3. packets-make.js #import-draft hydration', () => {
  const MAKE_SCRIPTS = [
    'packets-page.js', 'word_sounds_phonemes_en.js', 'word_sounds_core.js', 'word_sounds_wordlist_en.js',
    'word_sounds_take_home_loader.js', 'word_sounds_packet_builder.js', 'word_sounds_symbols_en.js',
    'packets_my_words.js', 'packets-words.js', 'packets_verify_core.js', 'packets_reopen.js',
    'packets_handoff.js', 'packets_zip.js', 'packets-print-cards.js', 'packets-make.js',
  ];

  async function openMakeWithIdb(idb, hash = '#import-draft') {
    const dom = new JSDOM(read('packets-make.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://site.test/packets-make.html' + hash,
    });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w, 'indexedDB', { value: idb.indexedDB, configurable: true });
    w.URL.createObjectURL = () => 'blob:make-1';
    w.URL.revokeObjectURL = () => {};
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.fetch = async () => ({ ok: false, status: 404, text: async () => '' });
    for (const src of MAKE_SCRIPTS) {
      w.eval(read(src));
    }
    const $ = (id) => d.getElementById(id);
    return { w, d, $ };
  }

  it('hydrates title, words, matching activities, and carried-over pictures from #import-draft', async () => {
    const idb = makeMemoryIdb();
    const { api } = loadHandoffSandbox({ idb });

    await api.putDraft({
      kind: 'word_sounds',
      title: 'CVC Practice Set',
      lang: 'en',
      words: ['cat', 'dog', 'sun', 'hat'],
      pattern: 'CVC',
      activities: ['blending', 'mapping', 'nonexistent_activity'],
      pictures: {
        cat: PNG_1X1,
        dog: SVG_UTF8,
        sun: 'https://evil.example/sun.png',
      },
    });

    const p = await openMakeWithIdb(idb);
    await until(() => p.$('reopen-note').hidden === false && p.$('f-title').value === 'CVC Practice Set', 'word_sounds draft hydrated');

    expect(p.w.location.hash).toBe('');
    expect(p.$('reopen-line').textContent).toBe('Loaded 4 words from AlloFlow.');
    expect(p.$('f-title').value).toBe('CVC Practice Set');
    expect(p.$('f-own').value).toBe('cat\ndog\nsun\nhat');
    expect(p.$('step-3').hidden).toBe(false);

    // Matching activities checked; non-existent ignored.
    const checkedActs = [...p.$('strands').querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
    expect(checkedActs).toEqual(['blending', 'mapping']);

    // Carried-over pictures enable pictures checkbox and show "2 you added".
    expect(p.$('f-pictures').checked).toBe(true);
    expect(p.$('pictures-line').textContent).toContain('2 you added');
    expect(p.$('print-worksheet')).toBeTruthy();
  }, 45000);

  it('keeps default activities when draft.activities has no valid maker activity IDs', async () => {
    const idb = makeMemoryIdb();
    const { api } = loadHandoffSandbox({ idb });

    await api.putDraft({
      kind: 'word_sounds',
      title: 'Default Activities Check',
      lang: 'en',
      words: ['cat', 'sun', 'pig'],
      pattern: 'CVC',
      activities: ['unknown_mode_xyz'],
      pictures: {},
    });

    const p = await openMakeWithIdb(idb);
    await until(() => p.$('reopen-note').hidden === false && p.$('f-title').value === 'Default Activities Check', 'default activities draft hydrated');

    const checkedActs = [...p.$('strands').querySelectorAll('input[type="checkbox"]:checked')].map((el) => el.value);
    expect(checkedActs).toEqual(['isolation', 'blending', 'segmentation']);
  }, 45000);
});
