// @vitest-environment jsdom
// Wave 8A regression tests (2026-11-19):
// 1. packets_my_words.js v2 'media' store parity in exportAll(), importAll(), usage(), and clear() count/broadcast.
// 2. Offline student HTML @media print Dark / High-Contrast ink & surface reset.
// 3. Reopen fidelity, CC attribution preservation & reset fixes across Vocab, Symbol Runner, and Read-Along.
// 4. Reading Focus Dark/HC curtain opacity + resize re-sync + 2x Magnifier null-guard & touch viewport clamp.
// 5. Network resilience in packets-vocab-lookup.js (timeout, offline, 429, prior cancel, repeat/IME Enter) & packets-pictures.js (abort on OFF).
// 6. Mid-generation cancel & concurrent edit guards in packets-voice.js and packets-read-along.js.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const myWordsMod = (() => {
  const g = { document: window.document };
  new Function('window', 'globalThis', 'module', readFileSync('packets_my_words.js', 'utf8'))(g, g, {});
  return g.AlloPacketMyWords;
})();

delete window.AlloWordSoundsTakeHome;
new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
const TH = window.AlloWordSoundsTakeHome;

delete window.AlloPacketVocab;
new Function(readFileSync('packet_vocab_builder.js', 'utf8'))();
const PV = window.AlloPacketVocab;

delete window.AlloSymbolRunnerCore;
new Function(readFileSync('symbol_runner_core.js', 'utf8'))();

delete window.AlloPacketSymbolRunner;
new Function(readFileSync('packet_symbol_runner_builder.js', 'utf8'))();
const SRB = window.AlloPacketSymbolRunner;

delete window.AlloPacketReadAlong;
new Function(readFileSync('packet_read_along_builder.js', 'utf8'))();
const RAB = window.AlloPacketReadAlong;

delete window.AlloPacketVerify;
new Function(readFileSync('packets_verify_core.js', 'utf8'))();
const PVF = window.AlloPacketVerify;

const opened = [];
afterEach(() => {
  while (opened.length) {
    try { opened.pop().close(); } catch (_) {}
  }
});

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const png = (bytes = 128) => 'data:image/png;base64,' + Buffer.alloc(bytes, 5).toString('base64');
const wav = (bytes = 128) => {
  const b = Buffer.alloc(Math.max(64, bytes));
  b.write('RIFF');
  b.write('WAVE', 8);
  return 'data:audio/wav;base64,' + b.toString('base64');
};

function openPage(htmlFile, url, setup) {
  const html = readFileSync(htmlFile, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url,
    beforeParse(w) {
      if (setup) setup(w);
    },
  });
  opened.push(dom.window);
  return dom.window;
}

function fakeIndexedDB() {
  const databases = new Map();
  const idb = { transactions: [] };
  const named = (name) => Object.assign(new Error(name), { name });
  idb.open = (name, version) => {
    const request = {};
    queueMicrotask(() => {
      let db = databases.get(name);
      const fresh = !db;
      if (fresh) { db = { stores: new Map(), version }; databases.set(name, db); }
      const handle = {
        objectStoreNames: { contains: (store) => db.stores.has(store) },
        createObjectStore(store, options) { db.stores.set(store, { keyPath: options.keyPath, rows: new Map() }); },
        close() {},
        transaction(names, mode) {
          const list = Array.isArray(names) ? names : [names];
          for (const s of list) if (!db.stores.has(s)) throw named('NotFoundError');
          const working = new Map(list.map((s) => [s, new Map(db.stores.get(s).rows)]));
          const tx = { mode: mode || 'readonly', error: null, pending: 0, over: false };
          idb.transactions.push({ names: list, mode: tx.mode });
          const finish = () => queueMicrotask(() => {
            if (tx.over || tx.pending) return;
            tx.over = true;
            for (const [s, rows] of working) db.stores.get(s).rows = rows;
            if (tx.oncomplete) tx.oncomplete({ target: tx });
          });
          const ask = (fn) => {
            const one = {};
            tx.pending++;
            queueMicrotask(() => {
              if (tx.over) return;
              try { one.result = fn(); } catch (err) {
                tx.error = err; tx.over = true;
                if (one.onerror) one.onerror({ target: one, preventDefault() {} });
                if (tx.onabort) tx.onabort({ target: tx, preventDefault() {} });
                return;
              }
              if (one.onsuccess) one.onsuccess({ target: one });
              tx.pending--;
              finish();
            });
            return one;
          };
          tx.objectStore = (store) => ({
            get: (k) => ask(() => { const v = working.get(store).get(k); return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }),
            getAll: () => ask(() => Array.from(working.get(store).values()).map((v) => JSON.parse(JSON.stringify(v)))),
            count: () => ask(() => working.get(store).size),
            put: (v) => ask(() => {
              if (tx.mode === 'readonly') throw named('ReadOnlyError');
              const kp = db.stores.get(store).keyPath;
              working.get(store).set(v[kp], JSON.parse(JSON.stringify(v)));
              return v[kp];
            }),
            delete: (k) => ask(() => { working.get(store).delete(k); }),
            clear: () => ask(() => { working.get(store).clear(); }),
          });
          return tx;
        },
      };
      request.result = handle;
      if (fresh && request.onupgradeneeded) request.onupgradeneeded({ target: request });
      if (request.onsuccess) request.onsuccess({ target: request });
    });
    return request;
  };
  return idb;
}

describe('1. packets_my_words.js v2 media store backup, restore, usage, and clear parity', () => {
  it('exports/imports v2 media entries, counts media in usage(), and broadcasts clear() on media-only stores', async () => {
    const idb1 = fakeIndexedDB();
    const store1 = myWordsMod.create({ indexedDB: idb1 });

    // Empty media store -> exportAll keeps v1 shape without media key.
    await store1.put('cat', { picture: { dataUri: png(200), credit: { own: true } } });
    const v1Export = await store1.exportAll();
    expect(v1Export.words.length).toBe(1);
    expect('media' in v1Export).toBe(false);

    // Add multi-word Vocab phrase + single-digit Symbol Runner entries to v2 'media' store.
    await store1.putMedia('water cycle', { picture: { dataUri: png(300), credit: { own: true } } });
    await store1.putMedia('7', { clip: { dataUri: wav(400), source: 'teacher', ms: 350 } });

    idb1.transactions.length = 0;
    const u = await store1.usage();
    expect(u.count).toBe(3);
    expect(u.bytes).toBeGreaterThanOrEqual(900);
    // Single atomic readonly transaction across rows + media, never opening words.
    expect(idb1.transactions).toEqual([{ names: ['rows', 'media'], mode: 'readonly' }]);

    const exported = await store1.exportAll();
    expect(exported.words.map((w) => w.word)).toEqual(['cat']);
    expect(exported.media.map((m) => m.key)).toEqual(['7', 'water cycle']);

    // Restore into a fresh store instance.
    const idb2 = fakeIndexedDB();
    const store2 = myWordsMod.create({ indexedDB: idb2 });
    const res = await store2.importAll(exported);
    expect(res.refused).toEqual([]);
    expect(res.kept.sort()).toEqual(['7', 'cat', 'water cycle']);
    const restoredPhrase = await store2.getMedia('water cycle');
    expect(restoredPhrase && restoredPhrase.picture && restoredPhrase.picture.dataUri).toBe(png(300));
    const restoredDigit = await store2.getMedia('7');
    expect(restoredDigit && restoredDigit.clip && restoredDigit.clip.source).toBe('teacher');

    // Media-only clear(): remove word 'cat' first, leaving only media items.
    await store2.remove('cat');
    const events = [];
    store2.onChange((ev) => events.push(ev));
    const clearedCount = await store2.clear();
    expect(clearedCount).toBe(2);
    expect(events.some((ev) => ev.action === 'clear')).toBe(true);
    expect(await store2.usage()).toEqual({ count: 0, bytes: 0 });
  });
});

describe('2. Offline student HTML @media print Dark & High-Contrast ink reset', () => {
  it('forces light paper and dark ink tokens for :root and [data-lt-colors] inside @media print', () => {
    const made = SRB.buildSymbolRunnerPacket({ loader: TH, mode: 'confusable_letters' });
    expect(made.html).toContain('@media print{:root,[data-lt-colors]{--bg:#fff;--card:#fff;--ink:#000;--muted:#333;--line:#999;--soft:#f5f5f5;--ok:#000;--ok-bg:#fff;--warn:#000;--warn-bg:#fff;color-scheme:light}button.primary{color:inherit;box-shadow:none}}');
  });
});

describe('3. Reopen fidelity, CC attribution & reset fixes across Vocab, Symbol Runner, and Read-Along', () => {
  it('Vocab round-trips repeatMissed in builder/readBack/maker and clears stale local noPicture overrides on reopen', async () => {
    const rows = [
      { word: 'habitat', senseId: 'own:habitat', def: 'The place where a living thing lives.', example: 'A pond is a frog habitat.', pos: 'noun', own: true,
        wrong: [
          { id: 'w1', word: 'climate', def: 'The usual weather in a place.', from: 'own' },
          { id: 'w2', word: 'predator', def: 'An animal that hunts other animals.', from: 'own' },
          { id: 'w3', word: 'erosion', def: 'The wearing away of rock or soil.', from: 'own' },
        ],
        blank: null, pictureOff: false },
      { word: 'climate', senseId: 'own:climate', def: 'The usual weather in a place.', example: 'The desert has a dry climate.', pos: 'noun', own: true,
        wrong: [
          { id: 'w4', word: 'habitat', def: 'The place where a living thing lives.', from: 'own' },
          { id: 'w5', word: 'predator', def: 'An animal that hunts other animals.', from: 'own' },
          { id: 'w6', word: 'erosion', def: 'The wearing away of rock or soil.', from: 'own' },
        ],
        blank: null, pictureOff: true },
    ];
    const lesson = PV.lessonFromVocab({ loader: TH, rows, types: ['meaning'], mode: 'practice', title: 'Science Set', readAloud: false });
    const made = PV.buildVocabPacket({ lesson, loader: TH, rows, repeatMissed: true });
    expect(made.manifest.vocab.repeatMissed).toBe(true);
    const parts = PVF.readParts(made.html);
    const back = PV.readBack(parts);
    expect(back.ok).toBe(true);
    expect(back.repeatMissed).toBe(true);
    expect(back.noPicture).toEqual(['climate']);

    // Pre-Wave-8A legacy fallback: manifest lacks recipe.repeatMissed, lesson has repeatMissed: true.
    const legacyParts = JSON.parse(JSON.stringify(parts));
    delete legacyParts.manifest.vocab.repeatMissed;
    expect(PV.readBack(legacyParts).repeatMissed).toBe(true);

    // Run packets-vocab.js reopen() inside JSDOM with a stale local noPicture override on 'habitat'.
    const w = openPage('packets-vocab.html', 'https://packets.test/packets-vocab.html', (win) => {
      win.AlloPacketVocab = PV;
      win.AlloWordSoundsTakeHome = TH;
      win.AlloPacketVerify = PVF;
      win.AlloPacketVocabBank = { ready: () => Promise.resolve(false), sense: () => null };
      win.localStorage.setItem('alloflow-packets-vocab-edits/1', JSON.stringify({
        v: 1,
        words: { habitat: { noPicture: true } },
        senses: {},
      }));
    });
    w.eval(readFileSync('packets-vocab.js', 'utf8'));
    await tick(30);

    const fileInput = w.document.getElementById('reopen-file');
    w.FileReader = class {
      readAsText() { this.result = made.html; if (this.onload) this.onload(); }
    };
    Object.defineProperty(fileInput, 'files', { value: [{ name: 'science.html', size: made.html.length }], configurable: true });
    fileInput.dispatchEvent(new w.Event('change'));
    await tick(20);
    const savedState = JSON.parse(w.localStorage.getItem('alloflow-packets-vocab/1') || '{}');
    const savedEdits = JSON.parse(w.localStorage.getItem('alloflow-packets-vocab-edits/1') || '{}');
    expect(savedState.repeatMissed).toBe(true);
    expect(savedEdits.words.climate && savedEdits.words.climate.noPicture).toBe(true);
    expect(savedEdits.words.habitat && savedEdits.words.habitat.noPicture).toBeFalsy();
  });

  it('Symbol Runner preserves picture credits on reopen, restores custom mode radio, and resets sr-view to 3d on Forget', () => {
    const pic = png(256);
    const made = SRB.buildSymbolRunnerPacket({
      loader: TH,
      mode: 'custom',
      items: 'b, d, p, q',
      pictures: {
        b: { src: pic, credit: 'Mulberry Symbols, CC BY-SA 2.0 UK', set: 'mulberry' },
        d: { src: pic, credit: 'OpenMoji, CC BY-SA 4.0', set: 'openmoji' },
      },
    });
    expect(made.manifest.symbolRunner.pictureMeta.b).toEqual({ credit: 'Mulberry Symbols, CC BY-SA 2.0 UK', set: 'mulberry' });
    const back = SRB.readBack(PVF.readParts(made.html));
    expect(back.ok).toBe(true);
    expect(back.mode).toBe('custom');
    expect(back.pictures.b.credit).toBe('Mulberry Symbols, CC BY-SA 2.0 UK');
    expect(back.pictures.b.set).toBe('mulberry');
    expect(back.pictures.d.credit).toBe('OpenMoji, CC BY-SA 4.0');
    expect(back.pictures.d.set).toBe('openmoji');

    // Legacy single-attribution fallback without pictureMeta recovers Mulberry credit too.
    const legacyParts = PVF.readParts(made.html);
    delete legacyParts.manifest.symbolRunner.pictureMeta;
    legacyParts.manifest.attributions = ['Mulberry Symbols, CC BY-SA 2.0 UK'];
    const legacyBack = SRB.readBack(legacyParts);
    expect(legacyBack.pictures.b.credit).toBe('Mulberry Symbols, CC BY-SA 2.0 UK');
    expect(legacyBack.pictures.b.set).toBe('mulberry');

    // Run packets-symbol-runner.js in JSDOM: verify custom reopen selects mode=custom + Forget resets view to 3d.
    const w = openPage('packets-symbol-runner.html', 'https://packets.test/packets-symbol-runner.html', (win) => {
      win.AlloWordSoundsTakeHome = TH;
      win.AlloSymbolRunnerCore = window.AlloSymbolRunnerCore;
      win.AlloPacketSymbolRunner = SRB;
      win.AlloPacketVerify = PVF;
    });
    w.eval(readFileSync('packets-symbol-runner.js', 'utf8'));

    const fileInput = w.document.getElementById('sr-reopen-file');
    w.FileReader = class {
      readAsText() { this.result = made.html; if (this.onload) this.onload(); }
    };
    Object.defineProperty(fileInput, 'files', { value: [{ name: 'custom-sr.html', size: made.html.length }], configurable: true });
    fileInput.dispatchEvent(new w.Event('change'));
    expect(w.document.getElementById('sr-mode').value).toBe('custom');
    const customRadio = w.document.querySelector('input[name="sr-set"][value="custom"]');
    expect(customRadio && customRadio.checked).toBe(true);

    // Switch view to grid, then click Forget my choices -> must reset back to 3d (not missing "track").
    const gridRadio = w.document.querySelector('input[name="sr-view"][value="grid"]');
    const threeDRadio = w.document.querySelector('input[name="sr-view"][value="3d"]');
    gridRadio.checked = true;
    w.document.getElementById('sr-clear-local').click();
    expect(threeDRadio.checked).toBe(true);
    expect(gridRadio.checked).toBe(false);
  });

  it('Read-Along reopen during active computer-voice generation cancels generation cleanly and builds the reopened file', async () => {
    const raLesson = RAB.lessonFromReadAlong({
      loader: TH,
      title: 'Reopened Story',
      text: 'The sun rose high. Birds sang in the trees.',
      clips: { 'The sun rose high.': { uri: wav(128), ms: 400, voice: 'af_heart', source: 'computer' } },
      voice: 'af_heart',
    });
    const raBuilt = RAB.buildReadAlongPacket({ made: raLesson, loader: TH });

    let resolveSpeak = null;
    const w = openPage('packets-read-along.html', 'https://packets.test/packets-read-along.html', (win) => {
      win.URL.createObjectURL = () => 'blob:ra-test';
      win.URL.revokeObjectURL = () => {};
      win.AlloWordSoundsTakeHome = TH;
      win.AlloPacketReadAlong = RAB;
      win.AlloPacketVerify = PVF;
      win.AlloPacketVoiceEngine = {
        get: () => Promise.resolve(),
        getMp3: () => Promise.resolve(false),
        speak: () => new Promise((resolve) => { resolveSpeak = resolve; }),
        wavMs: () => 500,
        toDataUri: () => wav(128),
      };
    });
    w.eval(readFileSync('packets-read-along.js', 'utf8'));

    // Prepare voice and start generating for an initial passage.
    w.document.getElementById('f-text').value = 'Old sentence one.';
    w.document.getElementById('f-text').dispatchEvent(new w.Event('input'));
    await tick(300);
    w.document.getElementById('get-voice').click();
    await tick(30);
    w.document.getElementById('make-all').click();
    await tick(20);
    expect(typeof resolveSpeak).toBe('function');

    // Reopen a saved file mid-generation!
    w.FileReader = class {
      readAsText() { this.result = raBuilt.html; if (this.onload) this.onload(); }
    };
    const fileInput = w.document.getElementById('reopen-file');
    Object.defineProperty(fileInput, 'files', { value: [{ name: 'story.html', size: raBuilt.html.length }], configurable: true });
    fileInput.dispatchEvent(new w.Event('change'));

    // Reopened passage must immediately build (Save visible, not stuck on "Making the recordings.").
    expect(w.document.getElementById('f-title').value).toBe('Reopened Story');
    expect(w.document.getElementById('save').hidden).toBe(false);

    // Late settling of the superseded speak() promise must not corrupt reopened state.
    resolveSpeak(new Uint8Array(64));
    await tick(30);
    expect(w.document.getElementById('f-title').value).toBe('Reopened Story');
    expect(w.document.getElementById('save').hidden).toBe(false);
  });
});

describe('4. Reading Focus Dark/HC curtain, resize sync, and 2x Magnifier bounds & null-guard', () => {
  it('uses 0.72 curtain on High Contrast & Dark, updates band on resize, and clamps Magnifier inside viewport', () => {
    const raLesson = RAB.lessonFromReadAlong({ loader: TH, title: 'Focus Test', text: 'First line of text. Second line of text.', clips: {} });
    const raBuilt = RAB.buildReadAlongPacket({ made: raLesson, loader: TH });

    const dom = new JSDOM(raBuilt.html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://packet.test/ra.html' });
    opened.push(dom.window);
    const w = dom.window;
    const d = w.document;
    Object.defineProperty(w, 'innerWidth', { value: 400, configurable: true });
    Object.defineProperty(w, 'innerHeight', { value: 600, configurable: true });
    w.requestAnimationFrame = (fn) => { fn(); return 1; };

    const nameIn = d.querySelector('input');
    if (nameIn) nameIn.value = 'Sam';
    const startBtn = d.querySelector('button.primary');
    if (startBtn) startBtn.click();
    const readBox = d.querySelector('[data-read]');
    expect(readBox).toBeTruthy();

    let lineTop = 20;
    readBox.getBoundingClientRect = () => ({ top: 0, left: 0, width: 320, height: 200, bottom: 200, right: 320 });
    const origCreateRange = d.createRange.bind(d);
    d.createRange = () => {
      const r = origCreateRange();
      r.getClientRects = () => [{ top: lineTop, bottom: lineTop + 24, left: 0, right: 300, width: 300, height: 24 }];
      return r;
    };

    // Open Reading tools -> enable Focus (Light mode first -> 0.45 curtain).
    d.querySelector('[data-tools-open]').click();
    d.querySelector('[data-tool="focus-1"]').click();
    const shade = readBox.querySelector('.lt-shade');
    const band = readBox.querySelector('.lt-line');
    expect(shade.style.background).toMatch(/rgba\(0,\s*0,\s*0,\s*0?\.45\)/);
    const topBefore = parseInt(band.style.top, 10);

    // Resize shifts lineTop -> resize handler must re-sync Reading Focus band immediately.
    lineTop = 80;
    w.dispatchEvent(new w.Event('resize'));
    const topAfter = parseInt(band.style.top, 10);
    expect(topAfter).toBeGreaterThan(topBefore + 40);

    // High Contrast (colors-1) & Dark (colors-3) use stronger 0.72 curtain.
    d.querySelector('[data-tool="colors-1"]').click();
    expect(shade.style.background).toMatch(/rgba\(0,\s*0,\s*0,\s*0?\.72\)/);
    d.querySelector('[data-tool="colors-3"]').click();
    expect(shade.style.background).toMatch(/rgba\(0,\s*0,\s*0,\s*0?\.72\)/);

    // Enable 2x Magnifier and simulate touch tap near top-left edge (x=10, y=20): lens & grip stay inside [0, 400] x [0, 600].
    d.querySelector('[data-tool="lens-1"]').click();
    const lens = d.querySelector('[data-lens]');
    const grip = d.querySelector('[data-lens-grip]');
    const down = new w.Event('pointerdown', { bubbles: true });
    Object.defineProperties(down, { pointerType: { value: 'touch' }, clientX: { value: 10 }, clientY: { value: 20 } });
    d.dispatchEvent(down);
    expect(parseFloat(lens.style.left)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(lens.style.top)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(grip.style.left)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(grip.style.top)).toBeGreaterThanOrEqual(0);

    // Touch tap near bottom edge (y=595): grip stays inside <= 600 - 48 = 552.
    const bottomTap = new w.Event('pointerdown', { bubbles: true });
    Object.defineProperties(bottomTap, { pointerType: { value: 'touch' }, clientX: { value: 395 }, clientY: { value: 595 } });
    d.dispatchEvent(bottomTap);
    expect(parseFloat(grip.style.left)).toBeLessThanOrEqual(352);
    expect(parseFloat(grip.style.top)).toBeLessThanOrEqual(552);
  });
});

describe('5. Network resilience in packets-vocab-lookup.js & packets-pictures.js', () => {
  it('packets-vocab-lookup handles offline, HTTP 429, prior-request abort, Enter repeat/IME guard, and toggle-off abort', async () => {
    const calls = [];
    const w = openPage('packets-vocab-lookup.html', 'https://packets.test/packets-vocab-lookup.html', (win) => {
      win.fetch = (url, opts) => {
        const rec = { url, signal: opts && opts.signal, resolve: null, reject: null };
        calls.push(rec);
        return new Promise((resolve, reject) => {
          rec.resolve = resolve;
          rec.reject = reject;
          if (opts && opts.signal) opts.signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
        });
      };
    });
    w.eval(readFileSync('packets-vocab-lookup.js', 'utf8'));
    const d = w.document;

    d.getElementById('online-on').checked = true;
    d.getElementById('online-on').dispatchEvent(new w.Event('change'));
    const input = d.getElementById('word');
    input.value = 'habitat';

    // Repeat Enter & IME Enter (isComposing) must NOT fire fetch.
    input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }));
    input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    expect(calls.length).toBe(0);

    // Offline blocks fetch with clear message.
    Object.defineProperty(w.navigator, 'onLine', { value: false, configurable: true });
    d.getElementById('look').click();
    expect(calls.length).toBe(0);
    expect(d.getElementById('look-line').textContent).toMatch(/offline/i);
    Object.defineProperty(w.navigator, 'onLine', { value: true, configurable: true });

    // Start first lookup, then start a second lookup -> first AbortSignal must be aborted.
    d.getElementById('look').click();
    expect(calls.length).toBe(1);
    input.value = 'climate';
    d.getElementById('look').click();
    expect(calls.length).toBe(2);
    expect(calls[0].signal.aborted).toBe(true);

    // HTTP 429 shows friendly rate-limit notice.
    calls[1].resolve({ ok: false, status: 429 });
    await tick(20);
    expect(d.getElementById('look-line').textContent).toMatch(/too many searches/i);

    // Toggling online OFF aborts active request immediately.
    input.value = 'erosion';
    d.getElementById('look').click();
    expect(calls.length).toBe(3);
    expect(calls[2].signal.aborted).toBe(false);
    d.getElementById('online-on').checked = false;
    d.getElementById('online-on').dispatchEvent(new w.Event('change'));
    expect(calls[2].signal.aborted).toBe(true);
  });

  it('packets-pictures aborts in-flight search controllers when online search is switched OFF', async () => {
    const signals = [];
    const w = openPage('packets-pictures.html', 'https://packets.test/packets-pictures.html', (win) => {
      win.AlloPacketMyWords = {
        LIMITS: { pictureSide: 256 },
        normalizeWord: myWordsMod.normalizeWord,
        available: () => Promise.resolve(true),
        list: () => Promise.resolve([]),
        getMany: () => Promise.resolve({}),
        onChange: () => () => {},
      };
      win.fetch = (_url, opts) => {
        if (opts && opts.signal) signals.push(opts.signal);
        return new Promise((_res, rej) => {
          if (opts && opts.signal) opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
        });
      };
    });
    w.eval(readFileSync('packets-pictures.js', 'utf8'));
    await tick(20);
    const d = w.document;

    d.getElementById('word').value = 'cat';
    d.getElementById('word').dispatchEvent(new w.Event('input'));
    d.getElementById('online-on').checked = true;
    d.getElementById('online-on').dispatchEvent(new w.Event('change'));
    d.getElementById('search').click();
    expect(signals.length).toBe(3);
    expect(signals.every((s) => !s.aborted)).toBe(true);

    d.getElementById('online-on').checked = false;
    d.getElementById('online-on').dispatchEvent(new w.Event('change'));
    expect(signals.every((s) => s.aborted)).toBe(true);
  });
});

describe('6. Mid-generation cancel & concurrent edit guards in packets-voice.js and packets-read-along.js', () => {
  it('packets-voice does not persist a cancelled clip after Stop and aborts cleanly on #f-words edit', async () => {
    const puts = [];
    const speaks = [];
    const w = openPage('packets-voice.html', 'https://packets.test/packets-voice.html', (win) => {
      win.AlloPacketMyWords = {
        available: () => Promise.resolve(true),
        getMany: () => Promise.resolve({}),
        put: (word, patch) => { puts.push({ word, patch }); return Promise.resolve({ word }); },
      };
      win.AlloPacketVoiceEngine = {
        get: () => Promise.resolve(),
        getMp3: () => Promise.resolve(false),
        speak: (word, _voice, opts) => new Promise((resolve) => { speaks.push({ word, signal: opts.signal, resolve }); }),
        wavMs: () => 400,
        toDataUri: () => wav(64),
      };
    });
    w.eval(readFileSync('packets-voice.js', 'utf8'));
    await tick(20);
    const d = w.document;

    d.getElementById('f-words').value = 'alpha\nbeta';
    d.getElementById('f-words').dispatchEvent(new w.Event('input'));
    await tick(300);
    d.getElementById('get-voice').click();
    await tick(20);
    d.getElementById('make-all').click();
    await tick(10);
    expect(speaks.length).toBe(1);

    // Click Stop BEFORE speak() resolves with WAV bytes -> aborted clip must NOT be written to My words!
    d.getElementById('stop').click();
    speaks[0].resolve(new Uint8Array(64));
    await tick(40);
    expect(puts.length).toBe(0);
    expect(d.getElementById('make-said').textContent).toMatch(/Stopped\. 0 recordings made/);

    // Start again, then edit #f-words mid-generation -> must abort batch and ignore late resolve.
    d.getElementById('make-all').click();
    await tick(10);
    expect(speaks.length).toBe(2);
    d.getElementById('f-words').value = 'gamma';
    d.getElementById('f-words').dispatchEvent(new w.Event('input'));
    expect(speaks[1].signal.aborted).toBe(true);
    expect(d.getElementById('make-said').textContent).toMatch(/Stopped because the word list changed/);
    speaks[1].resolve(new Uint8Array(64));
    await tick(300);
    expect(puts.length).toBe(0);
  });

  it('packets-read-along does not save a cancelled clip after Stop and stops generation cleanly on #f-text edit', async () => {
    const speaks = [];
    const w = openPage('packets-read-along.html', 'https://packets.test/packets-read-along.html', (win) => {
      win.URL.createObjectURL = () => 'blob:ra-cancel';
      win.URL.revokeObjectURL = () => {};
      win.AlloWordSoundsTakeHome = TH;
      win.AlloPacketReadAlong = RAB;
      win.AlloPacketVoiceEngine = {
        get: () => Promise.resolve(),
        getMp3: () => Promise.resolve(false),
        speak: (text, _voice, opts) => new Promise((resolve) => { speaks.push({ text, signal: opts.signal, resolve }); }),
        wavMs: () => 400,
        toDataUri: () => wav(64),
      };
    });
    w.eval(readFileSync('packets-read-along.js', 'utf8'));
    const d = w.document;

    d.getElementById('f-text').value = 'First sentence here.';
    d.getElementById('f-text').dispatchEvent(new w.Event('input'));
    await tick(300);
    d.getElementById('get-voice').click();
    await tick(20);
    d.getElementById('make-all').click();
    await tick(10);
    expect(speaks.length).toBe(1);

    // Stop clicked before WAV resolves -> 0 recordings saved.
    d.getElementById('stop').click();
    speaks[0].resolve(new Uint8Array(64));
    await tick(40);
    expect(d.getElementById('make-said').textContent).toMatch(/Stopped\. 0 recordings made/);

    // Start again, then edit #f-text mid-generation -> cancels generation cleanly.
    d.getElementById('make-all').click();
    await tick(10);
    expect(speaks.length).toBe(2);
    d.getElementById('f-text').value = 'Changed sentence text.';
    d.getElementById('f-text').dispatchEvent(new w.Event('input'));
    expect(speaks[1].signal.aborted).toBe(true);
    expect(d.getElementById('make-said').textContent).toMatch(/Stopped because the passage changed/);
    speaks[1].resolve(new Uint8Array(64));
    await tick(300);
    expect(d.querySelector('[data-play="1"]')).toBeFalsy();
  });
});
