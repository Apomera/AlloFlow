// Wave 2 (ra-bridge): Read-Along Handoff Protocol (#import-draft) & Read-Along Maker Polish
// Covers:
//   1. packets_handoff.js putDraft / takeDraft / redirectDraft / expiry / size & schema validation
//   2. packets-read-along.html#import-draft auto-import (title, passage, lang, quote-anchored supports, clips, live status)
//   3. Offline Symbol & Diagram Picker inside #custom-supports-panel (zero new <script> tags, zero network fetches)
//   4. Optional Kokoro-82M narration for auto-glossary Word meanings (#f-narrate-glossary, 25-word cap, student Hear meaning, reopen)
//   5. Custom teacher notes toggle on printable paper sheet (#print-supports -> #paper)

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const RA = require('../packet_read_along_builder.js');
const VERIFY = require('../packets_verify_core.js');
const MATCHER = require('../word_picture_matcher.js');
const HTML = read('packets-read-along.html');
const JS = read('packets-read-along.js');
const HANDOFF_SRC = read('packets_handoff.js');
const ENGINE = read('packets_voice_engine.js');
const LOADER_SRC = read('word_sounds_take_home_loader.js');

const mp3 = (label) => 'data:audio/mpeg;base64,' + Buffer.from('ID3' + label).toString('base64');
const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const SVG_RAW = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#16a34a"/></svg>';
const SVG_UTF8 = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SVG_RAW);

function wavBytes(ms = 160) {
  const samples = Math.round(24000 * ms / 1000);
  const data = samples * 2;
  const buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(24000, 24); buf.writeUInt32LE(48000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data, 40);
  for (let i = 0; i < samples; i++) buf.writeInt16LE(Math.round(8000 * Math.sin(i / 8)), 44 + i * 2);
  return new Uint8Array(buf);
}

// Lightweight in-memory IndexedDB stub matching the transactional contract of packets_handoff.js.
function makeMemoryIdb(backingMap = new Map()) {
  const stores = new Map([['files', backingMap]]);
  const makeDb = () => ({
    objectStoreNames: { contains: (name) => stores.has(name) },
    createObjectStore: (name) => { if (!stores.has(name)) stores.set(name, new Map()); return {}; },
    close: () => {},
    transaction: (storeName) => {
      const map = stores.get(storeName) || new Map();
      const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
      const pending = [];
      const flush = () => {
        setTimeout(() => {
          for (const fn of pending) fn();
          if (typeof tx.oncomplete === 'function') tx.oncomplete();
        }, 0);
      };
      let scheduled = false;
      const schedule = () => { if (!scheduled) { scheduled = true; flush(); } };
      tx.objectStore = () => ({
        put: (record) => {
          const req = { result: undefined, onsuccess: null, onerror: null };
          pending.push(() => {
            map.set(record.id, record);
            if (typeof req.onsuccess === 'function') req.onsuccess();
          });
          schedule();
          return req;
        },
        get: (key) => {
          const req = { result: undefined, onsuccess: null, onerror: null };
          pending.push(() => {
            req.result = map.has(key) ? map.get(key) : undefined;
            if (typeof req.onsuccess === 'function') req.onsuccess();
          });
          schedule();
          return req;
        },
        delete: (key) => {
          const req = { result: undefined, onsuccess: null, onerror: null };
          pending.push(() => {
            map.delete(key);
            if (typeof req.onsuccess === 'function') req.onsuccess();
          });
          schedule();
          return req;
        },
      });
      return tx;
    },
  });
  return {
    backingMap,
    indexedDB: {
      open: () => {
        const req = { result: null, onupgradeneeded: null, onsuccess: null, onerror: null, onblocked: null };
        setTimeout(() => {
          req.result = makeDb();
          if (typeof req.onupgradeneeded === 'function') req.onupgradeneeded();
          if (typeof req.onsuccess === 'function') req.onsuccess();
        }, 0);
        return req;
      },
    },
  };
}

function loadHandoffSandbox({ idb = makeMemoryIdb(), openFn = null, initialHref = 'https://alloflow.test/app.html' } = {}) {
  const opened = [];
  const location = { href: initialHref };
  const sandbox = {
    indexedDB: idb ? idb.indexedDB : null,
    TextEncoder,
    TextDecoder,
    location,
    open: openFn || ((url, target, features) => { opened.push({ url, target, features }); return {}; }),
    Date,
    Promise,
  };
  sandbox.window = sandbox;
  new Function('window', HANDOFF_SRC).call(sandbox, sandbox);
  return { api: sandbox.AlloPacketHandoff, sandbox, opened, location, backingMap: idb ? idb.backingMap : null };
}

async function openReadAlongPage({
  url = 'https://packets.test/site/packets-read-along.html',
  idb = null,
  stubHandoff = null,
  matcher = null,
  vocabBank = null,
  symbols = null,
} = {}) {
  const dom = new JSDOM(HTML, { runScripts: 'outside-only', pretendToBeVisual: true, url });
  const w = dom.window, d = w.document;
  if (!w.TextEncoder) w.TextEncoder = TextEncoder;
  if (!w.TextDecoder) w.TextDecoder = TextDecoder;
  if (idb) Object.defineProperty(w, 'indexedDB', { value: idb.indexedDB, configurable: true });
  const page = { w, d, dom, spoken: [], fetched: [], added: [] };
  w.fetch = async (u) => {
    page.fetched.push(String(u));
    if (String(u) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1, assets: {}, graphs: {} }) };
    if (String(u).startsWith('blob:voice/')) return { ok: true, arrayBuffer: async () => wavBytes().buffer };
    return { ok: false, okStatus: 404, text: async () => '', json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  w.URL.createObjectURL = () => 'blob:https://packets.test/ra-obj';
  w.URL.revokeObjectURL = () => {};
  w.HTMLElement.prototype.scrollIntoView = function () {};
  const realAppend = w.HTMLHeadElement.prototype.appendChild;
  d.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      page.added.push(src);
      if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
      if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (catalog, target) => { target.__alloCreateVerifiedWorker = () => {}; };
      if (src === 'kokoro_tts_loader.js') w._kokoroTTS = {
        init: async (onProgress) => { onProgress({ stage: 'Ready', pct: 1 }); return true; },
        speak: async (text) => { page.spoken.push(text); return 'blob:voice/' + page.spoken.length; },
      };
      if (src === 'lame.min.js') w.eval(read('lame.min.js'));
      if (src === 'word_picture_matcher.js' && matcher) w.AlloWordPictureMatcher = matcher;
      if (src === 'word_sounds_symbols_en.js' && symbols) w.createWordSoundsSymbols = () => symbols;
      if (src === 'packets_vocab_bank_en.js' && vocabBank) w.AlloVocabBank = vocabBank;
      setTimeout(() => node.onload && node.onload(), 0);
      return node;
    }
    return realAppend.call(this, node);
  };
  if (matcher) w.AlloWordPictureMatcher = matcher;
  if (symbols) w.createWordSoundsSymbols = () => symbols;
  if (vocabBank) w.AlloVocabBank = vocabBank;
  w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
  w.eval(LOADER_SRC);
  w.eval(read('packet_read_along_builder.js'));
  w.eval(read('syllable_table_en.js'));
  w.eval(ENGINE);
  w.eval(read('packets_verify_core.js'));
  w.eval(read('packets_reopen.js'));
  if (stubHandoff) w.AlloPacketHandoff = stubHandoff;
  else w.eval(HANDOFF_SRC);
  w.eval(read('packets_zip.js'));
  w.eval(JS);
  page.$ = (id) => d.getElementById(id);
  page.until = async (fn, what) => {
    for (let i = 0; i < 400; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 15)); }
    throw new Error('Timed out waiting for ' + what);
  };
  page.type = (id, text) => { page.$(id).value = text; page.$(id).dispatchEvent(new w.Event('input', { bubbles: true })); };
  return page;
}

describe('1. packets_handoff.js draft handoff protocol (putDraft / takeDraft / redirectDraft)', () => {
  it('stores, takes once, enforces 10-minute TTL expiry, and keeps existing file handoff untouched', async () => {
    const idb = makeMemoryIdb();
    const { api, backingMap } = loadHandoffSandbox({ idb });

    expect(api.DRAFT_HASH).toBe('#import-draft');
    expect(api.HASH).toBe('#open-file');
    expect(api.RESULTS_HASH).toBe('#import-results');
    expect(api.DB_NAME).toBe('alloflow-packets-handoff');
    expect(api.LIFETIME_MS).toBe(10 * 60 * 1000);

    const draft = {
      kind: 'read_along',
      title: 'Plant Energy',
      text: 'Leaves make food with sunlight. Roots pull water from the soil.',
      lang: 'en',
      customSupports: [
        { quote: 'sunlight', text: 'Light energy from the sun.', imgUri: SVG_UTF8, audioUri: mp3('sup1'), audioSource: 'teacher' },
      ],
      clips: {
        'Leaves make food with sunlight.': { uri: mp3('line1'), source: 'teacher' },
      },
    };

    await expect(api.putDraft(draft)).resolves.toBe(true);
    expect(backingMap.has('draft')).toBe(true);
    expect(backingMap.get('draft').id).toBe('draft');
    expect(typeof backingMap.get('draft').at).toBe('number');

    // First takeDraft returns sanitized object and deletes key atomically.
    const taken = await api.takeDraft();
    expect(taken).toEqual(draft);
    expect(backingMap.has('draft')).toBe(false);
    await expect(api.takeDraft()).resolves.toBeNull();

    // Expired draft (> 10 minutes old) is discarded and returns null.
    await api.putDraft(draft);
    backingMap.get('draft').at = Date.now() - (api.LIFETIME_MS + 5000);
    await expect(api.takeDraft()).resolves.toBeNull();
    expect(backingMap.has('draft')).toBe(false);
  });

  it('validates draft payload, rejects invalid href / oversized > 30 MB drafts, and supports openNewTab in redirectDraft', async () => {
    const idb = makeMemoryIdb();
    const { api, opened, location } = loadHandoffSandbox({ idb });

    await expect(api.putDraft(null)).rejects.toThrow(/no draft/i);
    await expect(api.putDraft({ title: 'No kind', text: 'Hello.' })).rejects.toThrow(/missing required/i);
    await expect(api.putDraft({ kind: 'read_along', title: 'Empty', text: '   ' })).rejects.toThrow(/missing required/i);

    // Oversized draft (> 30 MB) is refused cleanly.
    const oversized = { kind: 'read_along', title: 'Too big', text: 'a'.repeat(30 * 1024 * 1024 + 1024) };
    await expect(api.putDraft(oversized)).rejects.toThrow(/too large/i);

    // Prototype pollution keys and unsafe URIs are stripped cleanly.
    const malicious = JSON.parse('{"kind":"read_along","title":"Safe","text":"Hello world.","clips":{"__proto__":"data:audio/mpeg;base64,SUQz","Hello world.":"javascript:alert(1)"},"customSupports":[{"text":"Note","imgUri":"https://evil.example/a.png","audioUri":"javascript:1"}]}');
    await api.putDraft(malicious);
    const cleaned = await api.takeDraft();
    expect(cleaned.clips).toBeUndefined();
    expect(cleaned.customSupports).toEqual([{ text: 'Note' }]);

    // redirectDraft rejects non-packets targets.
    const valid = { kind: 'read_along', title: 'Fox', text: 'The fox ran fast.' };
    await expect(api.redirectDraft(valid, 'https://evil.test/x.html', true)).rejects.toThrow(/cannot hand the draft/i);
    await expect(api.redirectDraft(valid, '../index.html', false)).rejects.toThrow(/cannot hand the draft/i);

    // openNewTab = true opens target + #import-draft in new tab with noopener.
    await expect(api.redirectDraft(valid, 'packets-read-along.html', true)).resolves.toBe(true);
    expect(opened).toEqual([{ url: 'packets-read-along.html#import-draft', target: '_blank', features: 'noopener' }]);
    const saved1 = await api.takeDraft();
    expect(saved1 && saved1.title).toBe('Fox');

    // openNewTab = false navigates same tab to target + #import-draft.
    await expect(api.redirectDraft(valid, 'packets-read-along.html', false)).resolves.toBe(true);
    expect(location.href).toBe('packets-read-along.html#import-draft');
  });
});

describe('2. packets-read-along.html#import-draft auto-import', () => {
  it('auto-imports title, passage, language, quote-anchored supports, images, and teacher clips and announces status', async () => {
    const idb = makeMemoryIdb();
    const { api: handoffApi } = loadHandoffSandbox({ idb });
    const s1 = 'Green leaves use photosynthesis to make food.';
    const s2 = 'Water travels up the stem to every leaf.';
    const s3 = 'Sunlight gives energy to the whole plant.';

    await handoffApi.putDraft({
      kind: 'read_along',
      title: 'How Plants Grow',
      text: `${s1} ${s2} ${s3}`,
      lang: 'en',
      clips: {
        [s1]: { uri: mp3('teacher-s1'), source: 'teacher' },
        [s3]: mp3('teacher-s3'),
        [s2]: 'javascript:alert(1)', // invalid clip must be ignored
      },
      customSupports: [
        // Quote-anchored without explicit line -> matches sentence index 1 (s2)
        { quote: 'stem', text: 'The stalk that carries water up the plant.', imgUri: SVG_UTF8, audioUri: mp3('sup-stem'), audioSource: 'teacher' },
        // Explicit valid line index 2 (s3) with PNG thumbnail
        { line: 2, quote: 'Sunlight', text: 'Warm light from the sun.', imgUri: PNG_1X1, alt: 'Sun icon' },
        // Missing quote match -> falls back cleanly to sentence 0
        { quote: 'chlorophyll', text: 'Green pigment inside leaves.' },
      ],
    });

    const page = await openReadAlongPage({
      url: 'https://packets.test/site/packets-read-along.html#import-draft',
      idb,
    });
    try {
      await page.until(() => page.$('f-title').value === 'How Plants Grow', 'draft imported');
      expect(page.w.location.hash).toBe('');
      expect(page.$('f-text').value).toContain('photosynthesis');
      expect(page.$('f-lang').value).toBe('en');
      expect(page.$('reopen-line').textContent).toBe('Imported passage and supports from AlloFlow.');
      expect(page.$('reopen-note').hidden).toBe(false);

      // Teacher clips imported; invalid clip ignored.
      const st = page.w.AlloPacketReadAlongPage.state;
      expect(st.clips[s1]).toMatchObject({ uri: mp3('teacher-s1'), source: 'teacher' });
      expect(st.clips[s3]).toMatchObject({ uri: mp3('teacher-s3'), source: 'teacher' });
      expect(st.clips[s2]).toBeUndefined();

      // Custom supports anchored accurately (line 1 by quote, line 2 explicit, line 0 fallback).
      expect(st.customSupports).toHaveLength(3);
      expect(st.customSupports[0].line).toBe(1);
      expect(st.customSupports[0].imgUri).toMatch(/^data:image\/svg\+xml;base64,/);
      expect(st.customSupports[1].line).toBe(2);
      expect(st.customSupports[1].imgUri).toBe(PNG_1X1);
      expect(st.customSupports[2].line).toBe(0);
      expect(page.d.querySelectorAll('#support-rows .voice-row')).toHaveLength(3);
      expect(page.$('custom-supports-panel').open).toBe(true);

      // File builds cleanly and passes strict offline verification.
      await page.until(() => !page.$('save').hidden && !page.$('live-preview').hidden, 'built file and preview');
      const verified = VERIFY.verifyPacket(st.built.html);
      expect(verified.ok).toBe(true);
      expect(verified.counts.notExpected).toBe(0);
    } finally {
      page.dom.window.close();
    }
  }, 45000);
});

describe('3. Offline Symbol & Diagram Picker inside #custom-supports-panel', () => {
  it('prefills search from #sup-quote, searches built-in diagrams offline, attaches valid data:image/svg+xml URI, and builds clean packet', async () => {
    const page = await openReadAlongPage({ matcher: MATCHER });
    try {
      page.type('f-title', 'Volcanoes');
      page.type('f-text', 'A volcano erupts hot lava from deep underground.');
      await page.until(() => page.d.querySelectorAll('#line-rows .voice-row').length === 1, 'sentence row');

      // Picker starts hidden.
      expect(page.$('sup-pic-picker').hidden).toBe(true);
      expect(page.$('sup-pic-offline').getAttribute('aria-expanded')).toBe('false');

      // Type quote, click Pick offline symbol / diagram -> opens & auto-prefills search!
      page.type('sup-quote', 'volcano');
      page.type('sup-text', 'An opening in Earth where magma rises to the surface.');
      page.$('sup-pic-offline').click();

      expect(page.$('sup-pic-picker').hidden).toBe(false);
      expect(page.$('sup-pic-offline').getAttribute('aria-expanded')).toBe('true');
      expect(page.$('sup-pic-search').value).toBe('volcano');

      await page.until(() => page.d.querySelectorAll('#sup-pic-results button').length >= 1, 'offline diagram results');
      expect(page.fetched.filter((u) => /^https?:/.test(u))).toEqual([]);

      // Also verify searching another curriculum diagram via #sup-pic-search.
      page.type('sup-pic-search', 'photosynthesis');
      await page.until(() => !!page.d.querySelector('#sup-pic-results button[data-sup-pick-word="photosynthesis"]'), 'photosynthesis diagram');

      // Select photosynthesis diagram -> attaches sanitized data:image/svg+xml URI, alt, and credit note.
      page.d.querySelector('#sup-pic-results button[data-sup-pick-word="photosynthesis"]').click();
      expect(page.$('sup-pic-picker').hidden).toBe(true);
      expect(page.$('sup-pic-preview').hidden).toBe(false);
      expect(page.$('sup-pic-preview').getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
      expect(page.$('sup-pic-preview').getAttribute('alt')).toBeTruthy();
      expect(page.$('sup-pic-credit').hidden).toBe(false);
      expect(page.$('sup-pic-credit').textContent).toContain('AlloFlow');

      // Add support -> built offline packet embeds the diagram & honest credit with 0 verifier findings.
      page.$('sup-add').click();
      await page.until(() => page.d.querySelectorAll('#support-rows .voice-row').length === 1, 'support added');
      const st = page.w.AlloPacketReadAlongPage.state;
      expect(st.customSupports[0].imgUri).toMatch(/^data:image\/svg\+xml/);
      await page.until(() => st.built && st.built.html, 'packet rebuilt');
      expect(st.built.html).toContain('AlloFlow Curriculum Diagrams');
      expect(VERIFY.verifyPacket(st.built.html).counts.notExpected).toBe(0);
    } finally {
      page.dom.window.close();
    }
  }, 45000);
});

describe('4. Optional Kokoro-82M narration for auto-glossary Word meanings (#f-narrate-glossary)', () => {
  it('toggles visibility/disabled state with #f-dict and #f-lang, synthesizes up to 25 glossary MP3s, exposes Hear meaning in student HTML, and round-trips on reopen', async () => {
    const DICT = {
      volcano: { word: 'volcano', pos: 'noun', def: 'A mountain that can erupt hot lava.' },
      magma: { word: 'magma', pos: 'noun', def: 'Melted rock beneath the surface of Earth.' },
      crater: { word: 'crater', pos: 'noun', def: 'A bowl-shaped opening at the top of a volcano.' },
    };
    const mockVocab = {
      ready: () => true,
      load: async () => true,
      ensureForWords: async () => true,
      head: (w) => w,
      senses: (w) => (DICT[w] ? [DICT[w]] : []),
    };

    const page = await openReadAlongPage({ vocabBank: mockVocab });
    try {
      // Hidden and disabled when #f-dict is unchecked.
      expect(page.$('f-narrate-glossary-wrap').hidden).toBe(true);
      expect(page.$('f-narrate-glossary').disabled).toBe(true);

      page.type('f-title', 'Inside a Volcano');
      page.type('f-text', 'A volcano holds hot magma deep under its crater.');
      await page.until(() => page.d.querySelectorAll('#line-rows .voice-row').length === 1, 'sentence row');

      // Checking #f-dict enables and reveals #f-narrate-glossary.
      page.$('f-dict').checked = true;
      page.$('f-dict').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      expect(page.$('f-narrate-glossary-wrap').hidden).toBe(false);
      expect(page.$('f-narrate-glossary').disabled).toBe(false);

      // Switching to non-English hides and disables #f-narrate-glossary.
      page.$('f-lang').value = 'es';
      page.$('f-lang').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      expect(page.$('f-narrate-glossary-wrap').hidden).toBe(true);
      expect(page.$('f-narrate-glossary').disabled).toBe(true);

      // Back to English and enable #f-narrate-glossary.
      page.$('f-lang').value = 'en';
      page.$('f-lang').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      page.$('f-narrate-glossary').checked = true;
      page.$('f-narrate-glossary').dispatchEvent(new page.w.Event('change', { bubbles: true }));

      // Get Kokoro voice and record passage + auto-glossary meanings.
      page.$('get-voice').click();
      await page.until(() => !page.$('make-all').disabled, 'voice ready');
      expect(page.$('make-all').textContent).toContain('3 word meanings');

      page.$('make-all').click();
      await page.until(() => page.spoken.length === 4 && !page.$('save').hidden, 'sentence + 3 glossary entries synthesized');

      expect(page.spoken).toEqual([
        'A volcano holds hot magma deep under its crater.',
        'volcano. A mountain that can erupt hot lava.',
        'magma. Melted rock beneath the surface of Earth.',
        'crater. A bowl-shaped opening at the top of a volcano.',
      ]);

      const st = page.w.AlloPacketReadAlongPage.state;
      expect(Object.keys(st.glossaryClips).sort()).toEqual(['crater', 'magma', 'volcano']);
      for (const k of ['volcano', 'magma', 'crater']) {
        expect(st.glossaryClips[k].source).toBe('computer');
        expect(st.glossaryClips[k].uri).toMatch(/^data:audio\/mpeg;base64,/);
      }

      const builtHtml = st.built.html;
      expect(VERIFY.verifyPacket(builtHtml).counts.notExpected).toBe(0);

      // Open built student HTML and verify auto-glossary words expose "Hear meaning" and play embedded MP3.
      const played = [];
      const sdom = new JSDOM(builtHtml, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: 'https://packet.test/volcano-gloss.html',
        beforeParse(sw) {
          sw.Audio = class {
            set src(v) { this._src = v; }
            get src() { return this._src; }
            play() { played.push(this._src); setTimeout(() => { if (this.onended) this.onended(); }, 5); return Promise.resolve(); }
            pause() {}
          };
        },
      });
      try {
        const sd = sdom.window.document;
        sd.getElementById('learner-name').value = 'Leo';
        sd.querySelector('#app button.primary').click();
        await page.until(() => !!sd.querySelector('[data-read-along-define]'), 'student page');
        sd.querySelector('[data-read-along-define]').click();
        sd.querySelector('[data-def-pick="magma"]').click();
        const hearBtn = sd.querySelector('[data-def-hear="magma"]');
        expect(hearBtn).not.toBeNull();
        expect(hearBtn.textContent).toBe('Hear meaning');
        hearBtn.click();
        await page.until(() => played.length === 1, 'glossary audio played');
        expect(played[0]).toBe(st.glossaryClips.magma.uri);
      } finally {
        sdom.window.close();
      }

      // Reopen restores glossaryAudio clips and #f-narrate-glossary checkbox state.
      const page2 = await openReadAlongPage({ vocabBank: mockVocab });
      try {
        expect(page2.w.AlloPacketReadAlongPage.reopen(builtHtml, 'Inside-a-Volcano.html')).toBe(true);
        expect(page2.$('f-dict').checked).toBe(true);
        expect(page2.$('f-narrate-glossary').checked).toBe(true);
        expect(page2.$('f-narrate-glossary-wrap').hidden).toBe(false);
        expect(Object.keys(page2.w.AlloPacketReadAlongPage.state.glossaryClips).sort()).toEqual(['crater', 'magma', 'volcano']);
      } finally {
        page2.dom.window.close();
      }
    } finally {
      page.dom.window.close();
    }
  }, 45000);

  it('caps auto-glossary Kokoro synthesis at 25 words per passage', async () => {
    const words = Array.from({ length: 30 }, (_, i) => 'term' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26)) + 'x');
    const vocabBank = {
      ready: () => true,
      load: async () => true,
      ensureForWords: async () => true,
      head: (w) => w,
      senses: (w) => (words.includes(w) ? [{ word: w, pos: 'noun', def: 'Meaning of ' + w + '.' }] : []),
    };
    const page = await openReadAlongPage({ vocabBank });
    try {
      page.type('f-text', words.join(' ') + '.');
      await page.until(() => page.d.querySelectorAll('#line-rows .voice-row').length === 1, 'sentence row');
      page.$('f-dict').checked = true;
      page.$('f-dict').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      page.$('f-narrate-glossary').checked = true;
      page.$('f-narrate-glossary').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      page.$('get-voice').click();
      await page.until(() => !page.$('make-all').disabled, 'voice ready');
      page.$('make-all').click();
      await page.until(() => page.spoken.length === 26 && !page.$('save').hidden, '1 sentence + 25 capped meanings');
      expect(Object.keys(page.w.AlloPacketReadAlongPage.state.glossaryClips)).toHaveLength(25);
    } finally {
      page.dom.window.close();
    }
  }, 45000);
});

describe('5. Custom teacher notes on printable paper sheet (#print-supports)', () => {
  it('shows #print-supports checked by default when custom supports exist, renders Notes & supports in #paper, and toggles cleanly', async () => {
    const page = await openReadAlongPage();
    try {
      page.type('f-title', 'River Habitat');
      page.type('f-text', 'Beavers build dams across shallow streams. The pond shelters young fish.');
      await page.until(() => !page.$('print').hidden, 'paper drawn');

      // No custom supports -> #print-supports-wrap stays hidden and no Notes & supports in #paper.
      expect(page.$('print-supports-wrap').hidden).toBe(true);
      expect(page.$('print-supports').checked).toBe(true);
      expect(page.$('paper').textContent).not.toContain('Notes & supports');

      // Add a custom support with quote + thumbnail + note text.
      page.$('sup-line').value = '1';
      page.type('sup-quote', 'shelters');
      page.type('sup-text', 'Protects and gives a safe place to hide.');
      page.w.AlloPacketReadAlongPage.state.draftSupImg = PNG_1X1;
      page.$('sup-add').click();

      await page.until(() => !page.$('print-supports-wrap').hidden, 'print-supports revealed');
      const paper = page.$('paper');
      expect(paper.textContent).toContain('Notes & supports');
      expect(paper.textContent).toContain('shelters (sentence 2):');
      expect(paper.textContent).toContain('Protects and gives a safe place to hide.');
      const thumb = paper.querySelector('[data-paper-supports] img.paper-gloss-img');
      expect(thumb).not.toBeNull();
      expect(thumb.getAttribute('src')).toBe(PNG_1X1);

      // Unchecking #print-supports hides the Notes & supports section on paper.
      page.$('print-supports').checked = false;
      page.$('print-supports').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      expect(page.$('paper').textContent).not.toContain('Notes & supports');
      expect(page.$('paper').querySelector('[data-paper-supports]')).toBeNull();

      // Re-checking restores it immediately.
      page.$('print-supports').checked = true;
      page.$('print-supports').dispatchEvent(new page.w.Event('change', { bubbles: true }));
      expect(page.$('paper').textContent).toContain('Notes & supports');
    } finally {
      page.dom.window.close();
    }
  }, 45000);
});
