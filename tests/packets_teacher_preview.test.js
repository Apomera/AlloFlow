import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { fakeIndexedDB } from './helpers/packets_fake_indexeddb.js';
import { openMaker } from './helpers/packets_maker_page.js';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const myWords = require('../packets_my_words.js');
const vocabBuilder = require('../packet_vocab_builder.js');
const mathPracticeBuilder = require('../packet_math_practice_builder.js');
const checkBuilder = require('../packet_check_builder.js');
const verify = require('../packets_verify_core.js');
const reopen = require('../packets_reopen.js');
const mathBank = JSON.parse(read('psychometric_math_probes.json'));

const fakeWav = async (uri) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(uri.slice(-48))]).toString('base64');
const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">(.*?)<\/script>/.exec(html)[1]);
const snapshotOf = (html) => {
  const m = /<script type="application\/json" id="packet-store-snapshot">([\s\S]*?)<\/script>/i.exec(html);
  return m ? JSON.parse(m[1]) : null;
};

const opened = [];
afterAll(() => { opened.forEach((w) => { try { w.close(); } catch (_) {} }); });

function channelBus() {
  const peers = [];
  class BusChannel {
    constructor(name) {
      this.name = name;
      this.onmessage = null;
      this.closed = false;
      peers.push(this);
    }
    postMessage(data) {
      if (this.closed) return;
      const copy = JSON.parse(JSON.stringify(data));
      for (const peer of peers.slice()) {
        if (peer !== this && !peer.closed && peer.name === this.name && typeof peer.onmessage === 'function') {
          peer.onmessage({ data: copy });
        }
      }
    }
    close() { this.closed = true; }
  }
  return BusChannel;
}

class KeepBlob {
  constructor(parts, opts) {
    this.parts = parts || [];
    this.type = (opts && opts.type) || '';
    this.body = this.parts.every((p) => typeof p === 'string') ? this.parts.join('') : null;
    this.bytes = Buffer.concat(this.parts.map((p) => typeof p === 'string' ? Buffer.from(p, 'utf8') : Buffer.from(p.buffer ? new Uint8Array(p.buffer, p.byteOffset, p.byteLength) : p)));
    this.size = this.bytes.length;
  }
  arrayBuffer() { return Promise.resolve(this.bytes.buffer.slice(this.bytes.byteOffset, this.bytes.byteOffset + this.bytes.length)); }
  text() { return Promise.resolve(this.bytes.toString('utf8')); }
}

async function loadVocabFixture() {
  const ctx = { window: {} };
  ctx.window = ctx;
  new Function('window', read('tests/fixtures/packets_vocab_bank_fixture.js')).call(ctx, ctx);
  const bank = ctx.AlloVocabBank || ctx.window.AlloVocabBank;
  await bank.load();
  return bank;
}

async function openSimpleMaker(pageFile, BusChannel, { storage = null, fixtureVocab = false } = {}) {
  const dom = new JSDOM(read(pageFile), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/' + pageFile });
  const w = dom.window, d = w.document;
  opened.push(w);
  const page = { dom, w, d, files: [], downloads: [] };
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.BroadcastChannel = BusChannel;
  w.fetch = async () => ({ ok: false, status: 404, headers: { get: () => null }, text: async () => '' });
  w.Blob = KeepBlob;
  w.URL.createObjectURL = (blob) => { page.files.push(blob); return 'blob:https://packets.test/f-' + page.files.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { page.downloads.push({ name: this.getAttribute('download'), href: this.getAttribute('href') }); };
  w.HTMLElement.prototype.scrollIntoView = function () {};
  if (storage) for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
  for (const script of d.querySelectorAll('script[src]')) {
    const src = script.getAttribute('src');
    if (fixtureVocab && src === 'packets_vocab_bank_en.js') {
      w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      continue;
    }
    w.eval(read(src));
  }
  page.$ = (id) => d.getElementById(id);
  page.seen = (id) => !!page.$(id) && !page.$(id).hidden && !page.$(id).closest('[hidden]');
  page.choose = (name, value) => {
    const radio = d.querySelector('input[name="' + name + '"][value="' + value + '"]');
    radio.checked = true;
    radio.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  page.set = (id, value) => {
    const node = page.$(id);
    node.value = value;
    node.dispatchEvent(new w.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  };
  page.built = () => [...page.files].reverse().find((b) => b.type === 'text/html').body;
  page.until = async (fn, what) => {
    for (let i = 0; i < 400; i++) {
      if (fn()) return;
      await new Promise((r) => setTimeout(r, 10));
    }
    throw new Error('Timed out waiting for ' + what);
  };
  await new Promise((r) => setTimeout(r, 25));
  return page;
}

describe('teacher preview mode (T4)', () => {
  it('leaves word_sounds_take_home_loader.js free of preview coupling and keeps unedited builder outputs byte-identical', async () => {
    const loaderSource = read('word_sounds_take_home_loader.js');
    expect(loaderSource).not.toContain('alloflow-packets-preview');
    expect(loaderSource).not.toContain('preview-act');

    const baseWs = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'pig', 'bed'],
      activities: ['isolation', 'mapping'],
      seed: 7, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    const sameWs = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'pig', 'bed'],
      activities: ['isolation', 'mapping'],
      seed: 7, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
      omitItems: [], itemSeeds: {}, own: { cat: {} },
    });
    expect(sameWs.html).toBe(baseWs.html);

    const vocabBank = await loadVocabFixture();
    const vocabRows = vocabBuilder.draftRows({ bank: vocabBank, words: ['habitat', 'predator', 'prey', 'cell'] });
    const baseVocabLesson = vocabBuilder.lessonFromVocab({
      loader, bank: vocabBank, rows: vocabRows, types: ['meaning', 'word'], mode: 'practice', title: 'Science',
    });
    const sameVocabLesson = vocabBuilder.lessonFromVocab({
      loader, bank: vocabBank, rows: vocabRows, types: ['meaning', 'word'], mode: 'practice', title: 'Science', omitItems: [],
    });
    expect(vocabBuilder.buildVocabPacket({ lesson: sameVocabLesson, loader, bank: vocabBank, rows: vocabRows }).html)
      .toBe(vocabBuilder.buildVocabPacket({ lesson: baseVocabLesson, loader, bank: vocabBank, rows: vocabRows }).html);

    const baseMath = mathPracticeBuilder.buildMathPracticePacket({
      lesson: mathPracticeBuilder.lessonFromMathPractice({ loader, mode: 'ccc', factSet: 'mul-7' }),
      loader,
    });
    const sameMath = mathPracticeBuilder.buildMathPracticePacket({
      lesson: mathPracticeBuilder.lessonFromMathPractice({ loader, mode: 'ccc', factSet: 'mul-7' }),
      loader,
    });
    expect(sameMath.html).toBe(baseMath.html);

    const baseCheck = checkBuilder.buildCheckPacket({
      lesson: checkBuilder.lessonFromMathForm({ bank: mathBank, measure: 'missing_number', grade: '1', form: 'B' }),
      loader,
    });
    const sameCheck = checkBuilder.buildCheckPacket({
      lesson: checkBuilder.lessonFromMathForm({ bank: mathBank, measure: 'missing_number', grade: '1', form: 'B' }),
      loader,
    });
    expect(sameCheck.html).toBe(baseCheck.html);
  });

  it('stores picture: "none" cleanly in My words and suppresses auto-attached Word Sounds pictures only for that word', async () => {
    const store = myWords.create({ indexedDB: fakeIndexedDB() });
    const saved = await store.put('Cat', { picture: 'none' });
    expect(saved.word).toBe('cat');
    expect(saved.picture.none).toBe(true);
    expect(await store.list()).toEqual([
      expect.objectContaining({ word: 'cat', picture: false, noPicture: true, own: false }),
    ]);
    await store.put('cat', { sounds: ['k', 'a', 't'] });
    expect((await store.get('cat')).picture.none).toBe(true);
    expect((await store.get('cat')).sounds.sounds).toEqual(['k', 'a', 't']);
    await store.put('cat', { sounds: null, picture: null });
    expect(await store.get('cat')).toBeNull();

    const symbols = {
      format: 'alloflow-word-sounds-symbols/1',
      words: {
        cat: { set: 'mulberry', alt: 'cat', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>' },
        dog: { set: 'mulberry', alt: 'dog', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8"/></svg>' },
      },
      has(w) { return Object.prototype.hasOwnProperty.call(this.words, String(w || '').toLowerCase()); },
      get(w) { return this.words[String(w || '').toLowerCase()] || null; },
    };
    const withAllPics = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'pig', 'bed'],
      activities: ['isolation', 'mapping'],
      pictures: true, symbols, seed: 1, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    const noCatPic = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'pig', 'bed'],
      activities: ['isolation', 'mapping'],
      pictures: true, symbols, own: { cat: { picture: { none: true } } },
      seed: 1, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    const allCatPicId = withAllPics.lesson.blocks[0].items.find((it) => it.word === 'cat').wordPicture;
    expect(allCatPicId).toBeTruthy();
    expect(withAllPics.lesson.images[allCatPicId]).toBeTruthy();
    expect(noCatPic.lesson.blocks[0].items.find((it) => it.word === 'cat').wordPicture).toBeUndefined();
    expect(noCatPic.lesson.blocks[1].items.find((it) => it.word === 'cat').wordPicture).toBeUndefined();
    expect(Object.keys(noCatPic.lesson.images)).toHaveLength(1);
    const noCatDogPicId = noCatPic.lesson.blocks[0].items.find((it) => it.word === 'dog').wordPicture;
    expect(noCatDogPicId).toBeTruthy();
    expect(noCatPic.lesson.images[noCatDogPicId]).toBeTruthy();
  });

  it('supports omitItems and itemSeeds in Word Sounds and omitItems in Vocab (practice & check)', async () => {
    const baseWs = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'pig', 'bed'],
      activities: ['isolation', 'mapping'],
      seed: 1, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    const editedWs = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'pig', 'bed'],
      activities: ['isolation', 'mapping'],
      omitItems: ['isolation|dog'],
      itemSeeds: { 'isolation|cat': 4 },
      seed: 1, core, dictionary, banks: BANKS, loader, wordlist, toWav: fakeWav,
    });
    expect(editedWs.lesson.blocks[0].items.map((it) => it.word)).not.toContain('dog');
    expect(editedWs.lesson.blocks[1].items.map((it) => it.word)).toContain('dog');
    const baseSun = baseWs.lesson.blocks[0].items.find((it) => it.word === 'sun');
    const editedSun = editedWs.lesson.blocks[0].items.find((it) => it.word === 'sun');
    expect({
      word: editedSun.word,
      target: editedSun.target,
      position: editedSun.position,
      choices: editedSun.choices.map((c) => c.label),
    }).toEqual({
      word: baseSun.word,
      target: baseSun.target,
      position: baseSun.position,
      choices: baseSun.choices.map((c) => c.label),
    });
    const baseCatIso = baseWs.lesson.blocks[0].items.find((it) => it.word === 'cat');
    const catItem = editedWs.lesson.blocks[0].items.find((it) => it.word === 'cat');
    expect(catItem.choices.filter((c) => c.label === catItem.target)).toHaveLength(1);
    expect(catItem.choices.map((c) => c.label)).not.toEqual(baseCatIso.choices.map((c) => c.label));
    const baseCatMap = baseWs.lesson.blocks[1].items.find((it) => it.word === 'cat');
    const editedCatMap = editedWs.lesson.blocks[1].items.find((it) => it.word === 'cat');
    expect({ word: editedCatMap.word, sounds: editedCatMap.sounds }).toEqual({ word: baseCatMap.word, sounds: baseCatMap.sounds });

    const vocabBank = await loadVocabFixture();
    const vocabRows = vocabBuilder.draftRows({ bank: vocabBank, words: ['habitat', 'predator', 'prey', 'cell'] });
    const fullPractice = vocabBuilder.lessonFromVocab({
      loader,
      bank: vocabBank,
      rows: vocabRows,
      types: ['meaning', 'word'],
      mode: 'practice',
      title: 'Vocab',
    });
    const targetP = fullPractice.blocks[0].items[1];
    const trimmedPractice = vocabBuilder.lessonFromVocab({
      loader,
      bank: vocabBank,
      rows: vocabRows,
      types: ['meaning', 'word'],
      mode: 'practice',
      omitItems: ['vocab_word|' + vocabBuilder.keyOf(targetP.word)],
      title: 'Vocab',
    });
    expect(trimmedPractice.blocks[0].items).toHaveLength(fullPractice.blocks[0].items.length - 1);
    expect(trimmedPractice.blocks[0].items.some((it) => it.word === targetP.word)).toBe(false);
    expect(trimmedPractice.blocks[1].items).toHaveLength(fullPractice.blocks[1].items.length);

    const fullCheck = vocabBuilder.lessonFromVocab({
      loader,
      bank: vocabBank,
      rows: vocabRows,
      types: ['meaning'],
      mode: 'check',
      title: 'Vocab Check',
    });
    const targetC = fullCheck.blocks[0].items[2];
    const trimmedCheck = vocabBuilder.lessonFromVocab({
      loader,
      bank: vocabBank,
      rows: vocabRows,
      types: ['meaning'],
      mode: 'check',
      omitItems: ['vocab_meaning|' + vocabBuilder.keyOf(targetC.word)],
      title: 'Vocab Check',
    });
    expect(trimmedCheck.blocks[0].items).toHaveLength(fullCheck.blocks[0].items.length - 1);
    expect(trimmedCheck.blocks[0].items[0].practice).toBe(true);
    expect(trimmedCheck.blocks[0].items.some((it) => it.word === targetC.word)).toBe(false);
  });

  it('connects packets-try.html and packets_handoff.js hostPreview over BroadcastChannel and clamps resume snapshots', async () => {
    const Bus = channelBus();
    const previewId = 'blob:https://packets.test/preview-1';
    let itemCount = 5;
    const makeHtml = (count) => {
      const lesson = mathPracticeBuilder.lessonFromMathPractice({
        loader,
        mode: 'ccc',
        facts: ['2+2', '3+3', '4+4', '5+5', '6+6'].slice(0, count).join(', '),
      });
      return mathPracticeBuilder.buildMathPracticePacket({ lesson, loader }).html;
    };
    const initHtml = makeHtml(itemCount);
    const initLesson = lessonOf(initHtml);

    const handoffCtx = { window: {} };
    handoffCtx.window = handoffCtx;
    handoffCtx.BroadcastChannel = Bus;
    handoffCtx.TextEncoder = TextEncoder;
    handoffCtx.TextDecoder = TextDecoder;
    new Function('window', read('packets_handoff.js')).call(handoffCtx, handoffCtx);
    const handoff = handoffCtx.AlloPacketHandoff;

    const actions = [];
    const session = handoff.hostPreview({
      url: previewId,
      html: initHtml,
      Channel: Bus,
      async onAction({ action, index, item }) {
        actions.push({ action, index, item });
        itemCount = Math.max(1, itemCount - 1);
        return { html: makeHtml(itemCount), said: 'Removed from this file.' };
      },
    });

    const tryDom = new JSDOM(read('packets-try.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-try.html#' + previewId,
    });
    const tw = tryDom.window, td = tw.document;
    opened.push(tw);
    const blobs = [];
    tw.BroadcastChannel = Bus;
    tw.Blob = KeepBlob;
    tw.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:https://packets.test/dyn-' + blobs.length; };
    tw.URL.revokeObjectURL = () => {};
    tw.fetch = async (url) => url === previewId
      ? { ok: true, status: 200, text: async () => initHtml }
      : { ok: false, status: 404, text: async () => '' };

    tw.eval(read('packets-try.js'));
    await new Promise((r) => setTimeout(r, 20));

    const region = td.getElementById('try-edit');
    expect(region.hidden).toBe(false);
    expect(region.querySelector('.try-edit-where').textContent).toMatch(/^Question 1 of 5:/);
    const iframe = td.querySelector('iframe.try-frame');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-downloads');
    expect(snapshotOf(blobs[0].body)).toEqual({ kind: 'alloflow-packet-store', items: {} });

    // Simulate iframe progress at index 4 (5th card) before removing a card.
    const storeKey = 'alloflow-take-home:' + initLesson.lessonId + ':' + initLesson.revision;
    const contentWin = { marker: true };
    Object.defineProperty(iframe, 'contentWindow', { configurable: true, value: contentWin });
    tw.dispatchEvent(new tw.MessageEvent('message', {
      source: contentWin,
      data: {
        kind: 'alloflow-packet-store',
        key: storeKey,
        value: JSON.stringify({ startedAt: '2026-11-14T00:00:00.000Z', blockIndex: 0, index: 4, results: [] }),
      },
    }));
    await new Promise((r) => setTimeout(r, 10));
    expect(region.querySelector('.try-edit-where').textContent).toMatch(/^Question 5 of 5:/);

    // Click Remove; hostPreview rebuilds 4 cards and clamps index 4 -> 3 cleanly.
    region.querySelector('[data-preview-act="remove"]').click();
    await new Promise((r) => setTimeout(r, 30));
    expect(actions).toHaveLength(1);
    expect(blobs.length).toBeGreaterThanOrEqual(2);
    const reloadedHtml = blobs[blobs.length - 1].body;
    const nextLesson = lessonOf(reloadedHtml);
    const nextKey = 'alloflow-take-home:' + nextLesson.lessonId + ':' + nextLesson.revision;
    const reloadedSnap = snapshotOf(reloadedHtml);
    expect(JSON.parse(reloadedSnap.items[nextKey]).index).toBe(3);
    expect(region.querySelector('.try-edit-said').textContent).toBe('Removed from this file.');

    session.stop();
    expect(region.hidden).toBe(true);
  });

  it('wires Word Sounds maker preview actions (picture toggle, swap, remove)', async () => {
    const Bus = channelBus();
    const page = await openMaker({ pictures: true });
    opened.push(page.w);
    page.w.BroadcastChannel = Bus;

    page.$('next-1').click();
    page.choose('mode', 'own');
    page.set('f-own', 'cat dog sun pig bed');
    if (!page.$('f-pictures').checked) page.$('f-pictures').click();
    await page.until(() => page.$('own-list').children.length >= 5, 'words parsed');
    page.$('next-2').click();
    await page.ready();

    const tryHref = page.$('try').getAttribute('href');
    const previewId = tryHref.slice(tryHref.indexOf('#') + 1);
    const initialLesson = lessonOf(page.built());
    const catIsolationIdx = initialLesson.blocks[0].items.findIndex((it) => it.word === 'cat');
    expect(catIsolationIdx).toBeGreaterThanOrEqual(0);
    expect(Boolean(initialLesson.blocks[0].items[catIsolationIdx].wordPicture)).toBe(true);

    const peer = new Bus('alloflow-packets-preview');
    const seen = [];
    peer.onmessage = (e) => seen.push(e.data);
    const reloads = () => seen.filter((m) => m.type === 'preview-reload' && m.id === previewId);
    peer.postMessage({ type: 'preview-hello', id: previewId });
    await page.until(() => seen.some((m) => m.type === 'preview-bar'), 'initial bar');

    const storeKey = 'alloflow-take-home:' + initialLesson.lessonId + ':' + initialLesson.revision;
    peer.postMessage({
      type: 'preview-store',
      id: previewId,
      key: storeKey,
      value: JSON.stringify({ startedAt: '2026-11-14T00:00:00.000Z', blockIndex: 0, index: catIsolationIdx }),
    });
    await new Promise((r) => setTimeout(r, 10));

    // Toggle cat picture off via preview toolbar
    peer.postMessage({ type: 'preview-act', id: previewId, action: 'picture' });
    await page.until(() => reloads().length >= 1, 'picture toggle reload');
    const afterPic = lessonOf(reloads()[0].html);
    expect(afterPic.blocks[0].items[catIsolationIdx].wordPicture).toBeUndefined();
    expect((await page.store.get('cat')).picture.none).toBe(true);

    // Reroll wrong answers for cat in block 0
    const beforeLabels = afterPic.blocks[0].items[catIsolationIdx].choices.map((c) => c.label);
    peer.postMessage({ type: 'preview-act', id: previewId, action: 'swap' });
    await page.until(() => reloads().length >= 2, 'swap reload');
    const afterSwap = lessonOf(reloads()[1].html);
    expect(afterSwap.blocks[0].items[catIsolationIdx].choices.map((c) => c.label)).not.toEqual(beforeLabels);

    // Remove cat from block 0 (keeping cat in block 1+)
    peer.postMessage({ type: 'preview-act', id: previewId, action: 'remove' });
    await page.until(() => reloads().length >= 3, 'remove reload');
    const afterRemove = lessonOf(reloads()[2].html);
    expect(afterRemove.blocks[0].items.some((it) => it.word === 'cat')).toBe(false);
    expect(afterRemove.blocks[1].items.some((it) => it.word === 'cat')).toBe(true);

    peer.close();
  });

  it('wires Vocab maker preview actions (swap wrong answers, remove question)', async () => {
    const Bus = channelBus();
    const page = await openSimpleMaker('packets-vocab.html', Bus, { fixtureVocab: true });
    page.set('f-words', 'habitat, prey, predator, cell, adapt, camouflage');
    await page.until(() => page.$('words-list').children.length >= 6, 'vocab words looked up');
    page.$('next-1').click();
    await page.until(() => !page.$('step-2').hidden, 'vocab step 2');
    page.$('next-2').click();
    await page.until(() => page.seen('summary'), 'vocab summary');

    const tryHref = page.$('try').getAttribute('href');
    const previewId = tryHref.slice(tryHref.indexOf('#') + 1);
    const initial = lessonOf(page.built());
    const meaningBlockIdx = initial.blocks.findIndex((b) => b.activity === 'vocab_meaning');
    expect(meaningBlockIdx).toBeGreaterThanOrEqual(0);
    const cellInBlock = initial.blocks[meaningBlockIdx].items.findIndex((it) => it.word === 'cell');
    expect(cellInBlock).toBeGreaterThanOrEqual(0);
    const flatCellIdx = initial.blocks.slice(0, meaningBlockIdx).reduce((n, b) => n + b.items.length, 0) + cellInBlock;
    const firstChoices = initial.blocks[meaningBlockIdx].items[cellInBlock].choices.map((c) => c.text).slice().sort();

    const peer = new Bus('alloflow-packets-preview');
    const seen = [];
    peer.onmessage = (e) => seen.push(e.data);
    const reloads = () => seen.filter((m) => m.type === 'preview-reload' && m.id === previewId);
    peer.postMessage({ type: 'preview-hello', id: previewId });
    await page.until(() => seen.some((m) => m.type === 'preview-bar'), 'vocab bar');

    const storeKey = 'alloflow-take-home:' + initial.lessonId + ':' + initial.revision;
    peer.postMessage({
      type: 'preview-store',
      id: previewId,
      key: storeKey,
      value: JSON.stringify({ startedAt: '2026-11-14T00:00:00.000Z', blockIndex: meaningBlockIdx, index: flatCellIdx }),
    });
    await new Promise((r) => setTimeout(r, 10));

    peer.postMessage({ type: 'preview-act', id: previewId, action: 'swap' });
    await page.until(() => reloads().length >= 1, 'vocab swap reload');
    const afterSwap = lessonOf(reloads()[0].html);
    expect(afterSwap.blocks[meaningBlockIdx].items[cellInBlock].choices.map((c) => c.text).slice().sort()).not.toEqual(firstChoices);

    peer.postMessage({ type: 'preview-act', id: previewId, action: 'remove' });
    await page.until(() => reloads().length >= 2, 'vocab remove reload');
    const afterRemove = lessonOf(reloads()[1].html);
    expect(afterRemove.blocks[meaningBlockIdx].items).toHaveLength(afterSwap.blocks[meaningBlockIdx].items.length - 1);
    if (meaningBlockIdx > 0) expect(afterRemove.blocks[0].items).toHaveLength(afterSwap.blocks[0].items.length);

    peer.close();
  });

  it('switches math fact practice preset to My own facts on preview removal and keeps rehearsal known facts', async () => {
    const Bus = channelBus();
    const page = await openSimpleMaker('packets-math-practice.html', Bus);
    page.choose('kind', 'mul');
    page.choose('set', 'mul-7');
    page.$('next-1').click();
    page.choose('method', 'rehearsal');
    page.$('next-2').click();
    await page.until(() => page.seen('summary'), 'math practice summary');

    const tryHref = page.$('try').getAttribute('href');
    const previewId = tryHref.slice(tryHref.indexOf('#') + 1);
    const initial = lessonOf(page.built());
    const removedFirst = initial.blocks[0].items[1].word;

    const peer = new Bus('alloflow-packets-preview');
    const seen = [];
    peer.onmessage = (e) => seen.push(e.data);
    const reloads = () => seen.filter((m) => m.type === 'preview-reload' && m.id === previewId);
    peer.postMessage({ type: 'preview-hello', id: previewId });
    await page.until(() => seen.some((m) => m.type === 'preview-bar'), 'math bar');

    const storeKey = 'alloflow-take-home:' + initial.lessonId + ':' + initial.revision;
    peer.postMessage({
      type: 'preview-store',
      id: previewId,
      key: storeKey,
      value: JSON.stringify({ startedAt: '2026-11-14T00:00:00.000Z', blockIndex: 0, index: 1 }),
    });
    await new Promise((r) => setTimeout(r, 10));

    peer.postMessage({ type: 'preview-act', id: previewId, action: 'remove' });
    await page.until(() => reloads().length >= 1, 'math reload');

    expect(page.d.querySelector('input[name="kind"]:checked').value).toBe('own');
    expect(page.$('f-facts').value.trim().split('\n')).toHaveLength(9);
    const stored = JSON.parse(page.w.localStorage.getItem('alloflow-packets-math-practice/1'));
    expect(stored.known.own).toHaveLength(8);
    const reloaded = lessonOf(reloads()[0].html);
    expect(reloaded.blocks[0].items.map((it) => it.word)).not.toContain(removedFirst);

    // Incremental rehearsal fills 8 known slots + 4 new repeats = 12 cards by cycling remaining known facts.
    const removedSecond = reloaded.blocks[0].items[1].word;
    peer.postMessage({ type: 'preview-act', id: previewId, action: 'remove' });
    await page.until(() => reloads().length >= 2, 'math second reload');
    const stored2 = JSON.parse(page.w.localStorage.getItem('alloflow-packets-math-practice/1'));
    expect(page.$('f-facts').value.trim().split('\n')).toHaveLength(8);
    expect(stored2.known.own).toHaveLength(7);
    const reloaded2 = lessonOf(reloads()[1].html);
    expect(reloaded2.blocks[0].items.map((it) => it.word)).not.toContain(removedSecond);

    peer.close();
  });

  it('marks ready math check with -edited on preview removal and notes it in packets_reopen.js readCheck', async () => {
    const Bus = channelBus();
    const page = await openSimpleMaker('packets-check.html', Bus);
    page.choose('check', 'missing_number');
    page.$('next-1').click();
    page.choose('grade', '1');
    page.choose('version', 'B');
    page.$('next-2').click();
    await page.until(() => page.seen('summary'), 'check summary');

    const beforeHtml = page.built();
    expect(manifestOf(beforeHtml).packet.form).toBe('B');
    expect(manifestOf(beforeHtml).title).not.toMatch(/\(edited\)$/);

    const tryHref = page.$('try').getAttribute('href');
    const previewId = tryHref.slice(tryHref.indexOf('#') + 1);
    const initial = lessonOf(beforeHtml);
    const sampleCount = initial.blocks[0].items.filter((it) => it.practice).length;

    const peer = new Bus('alloflow-packets-preview');
    const seen = [];
    peer.onmessage = (e) => seen.push(e.data);
    peer.postMessage({ type: 'preview-hello', id: previewId });
    await page.until(() => seen.some((m) => m.type === 'preview-bar'), 'check bar');

    const storeKey = 'alloflow-take-home:' + initial.lessonId + ':' + initial.revision;
    peer.postMessage({
      type: 'preview-store',
      id: previewId,
      key: storeKey,
      value: JSON.stringify({ startedAt: '2026-11-14T00:00:00.000Z', blockIndex: 0, index: sampleCount }),
    });
    await new Promise((r) => setTimeout(r, 10));

    peer.postMessage({ type: 'preview-act', id: previewId, action: 'remove' });
    await page.until(() => seen.some((m) => m.type === 'preview-reload'), 'check reload');

    const editedHtml = seen.find((m) => m.type === 'preview-reload').html;
    const editedManifest = manifestOf(editedHtml);
    expect(editedManifest.packet.form).toBe('B-edited');
    expect(editedManifest.title).toMatch(/\(edited\)$/);
    expect(lessonOf(editedHtml).blocks[0].items).toHaveLength(initial.blocks[0].items.length - 1);

    const reopened = reopen.readCheck(editedHtml, { verify, builder: checkBuilder, codeName: checkBuilder.codeName });
    expect(reopened.ok).toBe(true);
    expect(reopened.check.version).toBe('B');
    expect(reopened.notes).toContain('Questions were removed from version B in Try it. Step 2 opens the full version B.');

    peer.close();
  });

  it('enforces CSP, accessibility landmarks, and wording rules on packets-try.html and packets-try.js', () => {
    const html = read('packets-try.html');
    const js = read('packets-try.js');
    const doc = new JSDOM(html).window.document;
    const csp = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    // 2026-11-16: font-src data:, so the file in the frame keeps the reading fonts stored inside it.
    expect(csp).toBe("default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src data: blob:; font-src data:; connect-src blob:; frame-src blob:; form-action 'none'; base-uri 'none'");
    expect(doc.querySelector('meta[name="referrer"]').getAttribute('content')).toBe('no-referrer');
    expect(doc.querySelector('meta[name="robots"]').getAttribute('content')).toBe('noindex');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    const region = doc.getElementById('try-edit');
    expect([region.getAttribute('role'), region.getAttribute('aria-label')]).toEqual(['region', 'Teacher tools']);
    expect(doc.getElementById('try-wait').getAttribute('role')).toBe('status');
    expect(doc.querySelectorAll('style, [style]')).toHaveLength(0);
    for (const node of doc.querySelectorAll('*')) {
      for (const attr of node.attributes) expect(/^on/i.test(attr.name), attr.name).toBe(false);
    }
    expect(html + js).not.toMatch(/https?:\/\/|\/\/[a-z0-9-]+\.[a-z]{2,}\//i);
    const visibleAndStrings = doc.title + '\n' + doc.body.textContent + '\n' + (js.match(/'[^'\n]*'/g) || []).join('\n');
    expect(visibleAndStrings).not.toMatch(/\blearners?\b|\btests?\b|\bquiz|\bassessments?\b|\bprobes?\b|practis|licence|colour/i);
    expect((js.match(/'[^'\n]*'/g) || []).join('\n')).not.toMatch(/practice|learner/i);
  });
});
