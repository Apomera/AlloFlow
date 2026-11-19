// The computer-voice page, packets-voice.html (2026-11-16).
//
// The owner chose a SEPARATE opt-in page for the AI voice, so that every other Packets page keeps its
// "runs without AI" promise and its rule unchanged. Later the same day the owner asked for a second page that
// uses the same voice, Make a read-along (packets-read-along.html, tests/packets_read_along_2026_11_16.test.js):
// the two share packets_voice_engine.js. These tests pin that separation and run the page:
//   - nothing from another site is named, loaded or asked for until "Get the voice" is pressed;
//   - the page says plainly that it uses an AI voice and where the voice comes from;
//   - it reuses the app's loader and the app's verified delivery files (no copy of either);
//   - a recording is kept as the word's clip in My words, marked computer-voice, and a teacher's own
//     recording is never replaced.
// The real download and the real voice are checked in a browser (C:\tmp\overnight_1116\packets\voice_probe.cjs).

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { fakeIndexedDB } from './helpers/packets_fake_indexeddb.js';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const HTML = read('packets-voice.html');
const JS = read('packets-voice.js');
const ENGINE = read('packets_voice_engine.js');
// The two pages that use the AI voice. Every other Packets page keeps its rule.
const VOICE_PAGES = ['packets-voice.html', 'packets-read-along.html'];
const policyOf = (html) => new JSDOM(html).window.document.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
const parts = (policy) => Object.fromEntries(policy.split(';').map((p) => p.trim()).filter(Boolean).map((p) => [p.split(/\s+/)[0], p.split(/\s+/).slice(1)]));

describe('the computer-voice page is one of the two places Packets uses an AI voice', () => {
  it('its rule allows this site, a worker from memory, WebAssembly and Hugging Face, and nothing else', () => {
    const rule = parts(policyOf(HTML));
    expect(rule['default-src']).toEqual(["'none'"]);
    expect(rule['script-src']).toEqual(["'self'", 'blob:', "'wasm-unsafe-eval'"]);
    expect(rule['worker-src']).toEqual(['blob:']);
    expect(rule['connect-src']).toEqual(["'self'", 'blob:', 'https://huggingface.co', 'https://*.huggingface.co', 'https://*.hf.co']);
    expect(rule['style-src']).toEqual(["'self'"]);
    expect(rule['form-action']).toEqual(["'none'"]);
    // No inline script, no eval of text, no "any site" source, and no code from another site.
    const sources = Object.values(rule).flat();
    for (const banned of ["'unsafe-inline'", "'unsafe-eval'", '*', 'https:', 'http:']) expect(sources, banned).not.toContain(banned);
    expect(policyOf(HTML)).not.toMatch(/jsdelivr|unpkg|cdnjs/);
  });

  it('every other Packets page keeps the rule it had: none of them gained Hugging Face, a worker or WebAssembly', () => {
    const others = readdirSync('.').filter((f) => /^packets[\w-]*\.html$/.test(f) && !VOICE_PAGES.includes(f));
    expect(others.length).toBeGreaterThan(10);
    for (const file of others) {
      const policy = policyOf(read(file));
      expect(policy, file).not.toMatch(/huggingface|hf\.co|wasm-unsafe-eval|worker-src/);
      expect(read(file), file).not.toMatch(/kokoro_tts_loader\.js|runtime_graph_host\.js|packets_voice_engine\.js/);
    }
    // The makers and the presenter still say they run without AI.
    for (const file of ['packets-make.html', 'packets-vocab.html', 'packets-present-export.html', 'packets.html']) expect(read(file), file).toContain('This page runs without AI.');
  });

  it('says what it is: an AI voice, on this device, downloaded from Hugging Face only when asked', () => {
    const doc = new JSDOM(HTML).window.document;
    expect(doc.querySelector('.proof-line').textContent).toBe('This page uses an AI voice, on this device. No account. Your words are not uploaded.');
    // Closed like every other page: the line itself says it, and the heading stays on a phone's first screen.
    expect(doc.querySelector('details.proof').hasAttribute('open')).toBe(false);
    expect(doc.querySelector('title').textContent).toBe('Make recordings with a computer voice');
    const body = doc.querySelector('.proof-body').textContent.replace(/\s+/g, ' ');
    expect(body).toContain('This is one of the two Packets pages that use AI. The other is Make a read-along.');
    expect(body).toContain('Nothing is downloaded until you press Get the voice.');
    expect(body).toContain('about 88 MB, one time, from Hugging Face (huggingface.co)');
    expect(body).toContain('It does not receive your words.');
    expect(HTML).not.toContain('runs without AI');
    expect(doc.getElementById('get-voice').textContent).toBe('Get the voice (about 88 MB)');
    // The school IT guide names the page and what it asks for.
    const guide = read('packets-it.html');
    expect(guide).toContain('<code>packets-voice.html</code>');
    expect(guide).toContain('<code>packets-read-along.html</code>');
    expect(guide).toContain('are the only pages of this site that use AI');
    expect(guide).toContain('They send no words');
  });

  it('loads only this site\'s scripts at first, and names no other site in its code', () => {
    const doc = new JSDOM(HTML).window.document;
    expect([...doc.querySelectorAll('script')].map((s) => s.getAttribute('src'))).toEqual(['packets-page.js', 'word_sounds_wordlist_en.js', 'packets_my_words.js', 'packets_voice_engine.js', 'packets-voice.js']);
    expect(JS).not.toMatch(/https?:\/\//);
    expect(ENGINE).not.toMatch(/https?:\/\//);
    // The voice is the app's own loader and verified delivery files: no page has a copy of them. They are named once,
    // in the file the two voice pages share, and the page itself names none of them.
    for (const file of ['runtime_graph_delivery_policy.js', 'runtime_graph_host.js', 'engine_runtime_integrity.json', 'kokoro_tts_loader.js']) {
      expect(ENGINE, file).toContain("'" + file + "'");
      expect(JS, file).not.toContain("'" + file + "'");
      expect(existsSync(file), file + ' is a file of this site').toBe(true);
    }
    expect(Buffer.byteLength(JS)).toBeLessThan(20000);
    expect(Buffer.byteLength(ENGINE)).toBeLessThan(10000);
    const catalog = JSON.parse(read('engine_runtime_integrity.json'));
    expect(catalog.graphs.kokoro.entry).toBe('kokoro.module');
    expect(existsSync(catalog.assets['kokoro.module'].path)).toBe(true);
    expect(read('kokoro_tts_loader.js')).toContain("window.__alloCreateVerifiedWorker('kokoro', WORKER_SOURCE");
  });
});

// A WAV the stand-in voice "speaks": 0.25 s of silence at 24 kHz, 16-bit mono.
function wavBytes(ms = 250) {
  const samples = Math.round(24000 * ms / 1000), data = samples * 2, buf = Buffer.alloc(44 + data);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + data, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(24000, 24); buf.writeUInt32LE(48000, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(data, 40);
  return new Uint8Array(buf);
}

async function openVoicePage({ hash = '', seed, wordlist } = {}) {
  const dom = new JSDOM(HTML, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/site/packets-voice.html' + hash });
  const w = dom.window, d = w.document;
  const page = { w, d, asked: [], added: [], spoken: [] };
  w.indexedDB = fakeIndexedDB();
  // What the site would answer: its own files only. The loader and the delivery files are stand-ins that record the calls.
  w.fetch = async (url) => {
    page.asked.push(String(url));
    if (String(url) === 'engine_runtime_integrity.json') return { ok: true, json: async () => ({ schemaVersion: 1, assets: {}, graphs: {} }) };
    if (String(url).startsWith('blob:voice/')) return { ok: true, arrayBuffer: async () => wavBytes().buffer };
    return { ok: false, json: async () => ({}), arrayBuffer: async () => new ArrayBuffer(0) };
  };
  const realAppend = w.HTMLHeadElement.prototype.appendChild;
  d.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      page.added.push(src);
      // 2026-11-17: the shared sound helpers (packets_audio_kit.js) come first.
      if (src === 'packets_audio_kit.js') w.eval(read('packets_audio_kit.js'));
      if (src === 'runtime_graph_host.js') w._alloInstallRuntimeGraphHost = (catalog, target) => { target.__alloCreateVerifiedWorker = () => {}; page.installed = catalog; };
      if (src === 'kokoro_tts_loader.js') w._kokoroTTS = {
        init: async (onProgress) => { onProgress({ stage: 'Downloading voice model (~88MB)', pct: 0.5 }); return true; },
        speak: async (text, voice, speed, options) => { page.spoken.push({ text, voice, speed, word: options.word, force: options.force }); return text === 'mute' ? null : 'blob:voice/' + text; },
      };
      setTimeout(() => node.onload && node.onload(), 0);
      return node;
    }
    return realAppend.call(this, node);
  };
  // A stand-in for the makers' word list: which words have a recording made ahead of time, and which the makers do not use.
  if (wordlist) w.AlloModules = { WordSoundsWordlist: { get: (word) => wordlist[word] || null } };
  w.eval(read('packets_my_words.js'));
  if (seed) await seed(w.AlloPacketMyWords);
  w.eval(ENGINE);
  w.eval(JS);
  page.$ = (id) => d.getElementById(id);
  page.rows = () => [...d.querySelectorAll('.voice-row')].map((row) => ({ word: row.dataset.word, state: row.querySelector('.voice-state').textContent, buttons: [...row.querySelectorAll('button')].map((b) => b.textContent + (b.disabled ? ' (off)' : '')) }));
  page.until = async (test, what) => { for (let i = 0; i < 400; i++) { if (test()) return; await new Promise((r) => setTimeout(r, 15)); } throw new Error('Timed out waiting for ' + what); };
  page.type = (text) => { page.$('f-words').value = text; page.$('f-words').dispatchEvent(new w.Event('input', { bubbles: true })); };
  await page.until(() => d.querySelectorAll('.voice-row').length > 0 || !hash, 'the page to open');
  return page;
}

describe('the computer-voice page, run with a stand-in voice', () => {
  it('asks for nothing until Get the voice is pressed; then it starts the voice and makes a recording for each word that has none', async () => {
    const teacherClip = 'data:audio/wav;base64,' + Buffer.from(wavBytes(400)).toString('base64');
    const page = await openVoicePage({ hash: '#words=zib,dog,mute', seed: (store) => store.put('dog', { clip: { dataUri: teacherClip, source: 'teacher', made: '2026-11-01T00:00:00.000Z', ms: 400 } }) });
    expect(page.rows()).toEqual([
      { word: 'zib', state: 'No recording yet.', buttons: ['Make recording (off)'] },
      { word: 'dog', state: 'Has your own recording. It is kept as it is.', buttons: ['Play'] },
      { word: 'mute', state: 'No recording yet.', buttons: ['Make recording (off)'] },
    ]);
    expect(page.asked).toEqual([]);
    expect(page.added).toEqual([]);
    expect(page.$('make-all').disabled).toBe(true);
    expect(page.$('make-all').textContent).toBe('Make recordings for the 2 words that have none');
    expect(page.$('make-said').textContent).toBe('Get the voice in step 2 first.');

    page.$('get-voice').click();
    await page.until(() => /The voice is ready/.test(page.$('voice-said').textContent), 'the voice');
    // The app's delivery files first, then its list of checked files, then its loader: in that order, all from this site.
    expect(page.added).toEqual(['packets_audio_kit.js', 'runtime_graph_delivery_policy.js', 'runtime_graph_host.js', 'kokoro_tts_loader.js']);
    expect(page.asked).toEqual(['engine_runtime_integrity.json']);
    expect(page.installed).toEqual({ schemaVersion: 1, assets: {}, graphs: {} });
    expect(page.$('get-voice').disabled).toBe(true);
    expect(page.$('make-all').disabled).toBe(false);

    page.$('f-voice').value = 'am_adam';
    page.$('make-all').click();
    await page.until(() => /made and kept in My words/.test(page.$('make-said').textContent), 'the recordings');
    // One word at a time, as a single word, never the teacher's own; a word the voice gives no sound for is named.
    expect(page.spoken).toEqual([{ text: 'zib', voice: 'am_adam', speed: 1, word: true, force: true }, { text: 'mute', voice: 'am_adam', speed: 1, word: true, force: true }]);
    expect(page.$('make-said').textContent).toBe('1 recording made and kept in My words on this device. Press Play to hear each one.');
    expect(page.$('make-problem').textContent).toBe('Not made: mute. You can press Make recording on a word to try it again.');
    const store = page.w.AlloPacketMyWords;
    const zib = await store.get('zib');
    expect(zib.clip).toMatchObject({ source: 'computer-voice', ms: 250, bytes: wavBytes().length });
    expect(zib.clip.dataUri.startsWith('data:audio/wav;base64,UklGR')).toBe(true);
    expect((await store.get('dog')).clip).toMatchObject({ source: 'teacher', dataUri: teacherClip });
    expect(await store.get('mute')).toBeNull();
    expect(page.rows()[0]).toEqual({ word: 'zib', state: 'Has a computer-voice recording, 0.3 seconds.', buttons: ['Play', 'Make again', 'Remove'] });

    // Make again asks the voice once more for that word only; Remove takes only the computer-voice recording away.
    page.d.querySelector('[data-make="zib"]').click();
    await page.until(() => page.spoken.length === 3 && !page.$('make-all').textContent.includes('...') && /made and kept/.test(page.$('make-said').textContent) && page.rows()[0].buttons.length === 3, 'make again');
    expect(page.spoken[2]).toMatchObject({ text: 'zib', force: true });
    page.d.querySelector('[data-remove="zib"]').click();
    await page.until(() => page.rows()[0].state === 'No recording yet.', 'the removal');
    expect(await store.get('zib')).toBeNull();
    expect((await store.get('dog')).clip.source).toBe('teacher');
    // Nothing but this site's own list was ever asked for, apart from reading back the sounds the voice made.
    expect(page.asked.filter((u) => !u.startsWith('blob:voice/'))).toEqual(['engine_runtime_integrity.json']);
  }, 60000);

  it('reads the words as typed: letters only, each once, at most 60, and says what it left out', async () => {
    const page = await openVoicePage({ hash: '#words=cat' });
    page.type('Cat cat, dog; 12x o\'clock\nfish');
    await page.until(() => page.rows().length === 3, 'the typed words');
    expect(page.rows().map((row) => row.word)).toEqual(['cat', 'dog', 'fish']);
    expect(page.$('words-said').textContent).toBe("Left out (a word here is 2 to 24 letters, and letters only): 12x, o'clock.");
    page.type(Array.from({ length: 70 }, (_, i) => 'w' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + Math.floor(i / 26))).join(' '));
    await page.until(() => page.rows().length === 60, 'sixty words');
    expect(page.$('words-said').textContent).toBe('Only the first 60 words are used.');
  }, 60000);

  it('a word that already has a recording, and a word the makers do not use, are said so and are never made', async () => {
    const page = await openVoicePage({ hash: '#words=cat,gun,zib,x', wordlist: { cat: { kokoro: true, shards: false, blocked: false }, gun: { kokoro: false, shards: false, blocked: true } } });
    expect(page.rows()).toEqual([
      { word: 'cat', state: 'Packets already has a recording of this word. It needs nothing here.', buttons: [] },
      { word: 'gun', state: 'The makers do not use this word, so it needs no recording.', buttons: [] },
      { word: 'zib', state: 'No recording yet.', buttons: ['Make recording (off)'] },
    ]);
    // One letter is not a word here, and the line says the real rule.
    expect(page.$('words-said').textContent).toBe('Left out (a word here is 2 to 24 letters, and letters only): x.');
    expect(page.$('make-all').textContent).toBe('Make recordings for the 1 word that has none');
    page.$('get-voice').click();
    await page.until(() => /The voice is ready/.test(page.$('voice-said').textContent), 'the voice');
    page.$('make-all').click();
    await page.until(() => /made and kept in My words/.test(page.$('make-said').textContent), 'the recording');
    expect(page.spoken.map((s) => s.text)).toEqual(['zib']);
    expect(await page.w.AlloPacketMyWords.get('cat')).toBeNull();
    expect(await page.w.AlloPacketMyWords.get('gun')).toBeNull();
  }, 60000);

  it('when the voice does not arrive it says so, changes nothing, and can be tried again', async () => {
    const page = await openVoicePage({ hash: '#words=zib' });
    page.w.fetch = async (url) => { page.asked.push(String(url)); return { ok: false, json: async () => ({}) }; };
    page.$('get-voice').click();
    await page.until(() => page.$('voice-problem').textContent !== '', 'the problem line');
    expect(page.$('voice-problem').textContent).toBe('The list of voice files did not arrive. Nothing was changed. You can try again.');
    expect(page.$('get-voice').disabled).toBe(false);
    expect(page.$('make-all').disabled).toBe(true);
    expect(page.$('voice-making').hidden).toBe(true);
  }, 60000);

  it('compresses Kokoro WAV recordings to MP3 before saving to My words when lame.min.js is available', async () => {
    const page = await openVoicePage({ hash: '#words=zib' });
    const prevAppend = page.d.head.appendChild;
    page.d.head.appendChild = function (node) {
      if (node && node.tagName === 'SCRIPT' && node.getAttribute('src') === 'lame.min.js') {
        page.w.eval(read('lame.min.js'));
        setTimeout(() => node.onload && node.onload(), 0);
        return node;
      }
      return prevAppend.call(this, node);
    };
    page.$('get-voice').click();
    await page.until(() => /The voice is ready/.test(page.$('voice-said').textContent), 'the voice');
    page.$('make-all').click();
    await page.until(() => /made and kept in My words/.test(page.$('make-said').textContent), 'the MP3 recording');
    const zib = await page.w.AlloPacketMyWords.get('zib');
    expect(zib.clip.dataUri.startsWith('data:audio/mpeg;base64,')).toBe(true);
    expect(zib.clip.ms).toBe(250);
    expect(zib.clip.bytes).toBeLessThan(wavBytes().length);
  }, 60000);
});
