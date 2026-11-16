// @vitest-environment jsdom
// Spoken directions option ("Every question" vs "First question only") across AlloFlow Packets activities,
// takeHomeTools toggle/storage, word_sounds_packet_builder default, packets_reopen round-trip, and maker page.
import { afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { openMaker } from './helpers/packets_maker_page.js';

const require = createRequire(import.meta.url);
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const BANKS = tool.loadBanks({ shards: false });
const verify = require('../packets_verify_core.js');
const reopen = require('../packets_reopen.js');

const WORDS = ['cat', 'bat', 'hat', 'mat', 'dog', 'sun', 'map', 'rabbit', 'basket', 'napkin', 'kitten', 'sunset'];
const ORDER = builder.SUPPORTED_ACTIVITIES;
const ENV = {
  verify,
  creditLine: builder.creditLine,
  codeName: builder.codeName,
  activities: ORDER,
  wordSounds: core.activityIds(),
  labels: dictionary.labels,
  seeds: { A: 1, B: 2, C: 3 },
};

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(pred, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pred()) return;
    await wait(10);
  }
  throw new Error('Timed out waiting for playback condition');
}

const wavBase64 = (tag) => {
  const b = Buffer.alloc(64);
  b.write('RIFF', 0);
  b.writeUInt32LE(56, 4);
  b.write('WAVE', 8);
  b.write('fmt ', 12);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(24000, 24);
  b.writeUInt32LE(48000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(20, 40);
  b.write(String(tag || '').slice(0, 20), 44);
  return b.toString('base64');
};
const wavUri = (tag) => 'data:audio/wav;base64,' + wavBase64(tag);
const fakeWav = async (uri) => wavUri(String(uri || '').slice(-20));

const png = (fill) => 'data:image/png;base64,' + Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(64, fill),
]).toString('base64');

function buildFromLesson(lesson) {
  return loader.buildHtml(lesson, { core });
}

function openPacket(html, { storage = null } = {}) {
  const played = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://packet.test/file.html',
    beforeParse(w) {
      w.Audio = class {
        play() {
          played.push(this.src);
          const me = this;
          setTimeout(() => { if (me.onended) me.onended(); }, 4);
          return Promise.resolve();
        }
        pause() {}
      };
      if (storage) Object.keys(storage).forEach((k) => w.localStorage.setItem(k, storage[k]));
    },
  });
  const w = dom.window, d = w.document;
  opened.push(w);
  const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
  const q = (sel) => d.querySelector(sel);
  const seen = (node) => !!node && !node.closest('[hidden]');
  const button = (text) => [...d.querySelectorAll('#app button')].filter(seen).find((b) => b.textContent === text);
  const key = (k) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const audioId = (src) => Object.keys(lesson.audio || {}).find((k) => lesson.audio[k] === src) || src;
  return {
    w,
    d,
    lesson,
    played,
    q,
    seen,
    button,
    key,
    audioId,
    playedIds: () => played.map(audioId),
    start: (name = 'Ana') => {
      d.getElementById('learner-name').value = name;
      button('Start').click();
    },
  };
}

function makeFakeBanks() {
  const clip = (tag) => wavUri(tag);
  const fake = (name) => new Proxy({}, {
    get: (_, k) => (typeof k === 'string' ? clip(name + '/' + k) : undefined),
    getOwnPropertyDescriptor: (_, k) => (typeof k === 'string'
      ? { value: clip(name + '/' + k), enumerable: true, configurable: true, writable: false }
      : undefined),
  });
  return { words: fake('words'), phonemes: fake('phonemes'), isolation: fake('isolation'), instructions: fake('instructions') };
}

function makeIsolationLesson(positions, opts = {}) {
  const banks = {
    isolation: { '1st': wavUri('iso-1st'), '2nd': wavUri('iso-2nd'), '3rd': wavUri('iso-3rd') },
    phonemes: { k: wavUri('ph-k'), a: wavUri('ph-a'), t: wavUri('ph-t'), m: wavUri('ph-m'), p: wavUri('ph-p'), s: wavUri('ph-s'), b: wavUri('ph-b') },
    instructions: { fb_great_job: wavUri('fb-ok'), fb_try_again_listen: wavUri('fb-retry') },
  };
  const words = positions.map(([w, pos, correct, options]) => ({
    word: w,
    targetWord: w,
    term: w,
    _ttsAssets: { [w]: { mime: 'audio/wav', base64: wavBase64('word-' + w) } },
    activityItems: { isolation: { position: pos, correctSound: correct, options } },
  }));
  return loader.lessonFromPack(words, {
    core,
    banks,
    activities: ['isolation'],
    title: 'Isolation positions',
    lessonId: 'L-iso-pos',
    ...opts,
  }).lesson;
}

describe('Packets: Spoken directions once per activity', () => {
  it('isolation skips promptAudio on item 2+ when position matches, plays full introAudio when position changes, and keeps Hear the question / R full', async () => {
    const lesson = makeIsolationLesson([
      ['cat', 0, 'k', ['k', 'a', 't', 'm']],
      ['cap', 0, 'k', ['k', 'a', 'p', 's']],
      ['map', 2, 'p', ['m', 'a', 'p', 's']],
    ], { instructionsOnce: true });
    const f = openPacket(buildFromLesson(lesson));
    expect(f.q('[data-tool="directions-1"]').getAttribute('aria-pressed')).toBe('true');

    f.start();
    const items = f.lesson.blocks[0].items;
    expect(items).toHaveLength(3);
    await waitUntil(() => f.played.length >= 2);
    await wait(20);
    expect(f.playedIds()).toEqual([items[0].promptAudio, items[0].wordAudio]);

    f.played.length = 0;
    f.key('1');
    await wait(25);
    f.played.length = 0;
    f.button('Next').click();
    await waitUntil(() => f.played.length >= 1);
    await wait(20);
    // Same position (0 === 0): skip generic promptAudio, play wordAudio only.
    expect(f.playedIds()).toEqual([items[1].wordAudio]);

    // Explicit replay ("Hear the question" plays promptAudio; keyboard shortcut R plays full prompt + word).
    f.played.length = 0;
    f.button('Hear the question').click();
    await waitUntil(() => f.played.length >= 1);
    await wait(20);
    expect(f.playedIds()).toEqual([items[1].promptAudio]);

    f.played.length = 0;
    f.key('r');
    await waitUntil(() => f.played.length >= 2);
    await wait(20);
    expect(f.playedIds()).toEqual([items[1].promptAudio, items[1].wordAudio]);

    // Advance to item 3 where position changed (0 -> 2): play full introAudio.
    f.key('1');
    await wait(25);
    f.played.length = 0;
    f.button('Next').click();
    await waitUntil(() => f.played.length >= 2);
    await wait(20);
    expect(f.playedIds()).toEqual([items[2].promptAudio, items[2].wordAudio]);
  });

  it('runtime Aa Reading tools toggle switches between Every question and First question only mid-activity', async () => {
    const lesson = makeIsolationLesson([
      ['cat', 0, 'k', ['k', 'a', 't', 'm']],
      ['cap', 0, 'k', ['k', 'a', 'p', 's']],
      ['sat', 0, 's', ['s', 'a', 't', 'm']],
    ]);
    const f = openPacket(buildFromLesson(lesson));
    expect(f.q('[data-tool="directions-0"]').getAttribute('aria-pressed')).toBe('true');

    f.start();
    const items = f.lesson.blocks[0].items;
    expect(items).toHaveLength(3);
    await waitUntil(() => f.played.length >= 2);
    await wait(20);
    expect(f.playedIds()).toEqual([items[0].promptAudio, items[0].wordAudio]);

    // Turn on "First question only" in Aa panel mid-activity.
    f.q('[data-tools-open]').click();
    f.q('[data-tool="directions-1"]').click();
    f.key('1');
    await wait(25);
    f.played.length = 0;
    f.button('Next').click();
    await waitUntil(() => f.played.length >= 1);
    await wait(20);
    expect(f.playedIds()).toEqual([items[1].wordAudio]);

    // Switch back to "Every question".
    f.q('[data-tool="directions-0"]').click();
    f.key('1');
    await wait(25);
    f.played.length = 0;
    f.button('Next').click();
    await waitUntil(() => f.played.length >= 2);
    await wait(20);
    expect(f.playedIds()).toEqual([items[2].promptAudio, items[2].wordAudio]);
  });

  it('decoding and mapping stay silent on item 2+ when First question only is active, while Hear the instructions still replays prompt', async () => {
    const assets = { cat: png(1), dog: png(2), sun: png(3), map: png(4) };
    const PROMPT = 'Read the word, then tap its picture!';
    const words = ['cat', 'dog'].map((w) => ({
      word: w,
      targetWord: w,
      term: w,
      _decodingAssets: assets,
      _ttsAssets: {
        [w]: { mime: 'audio/wav', base64: wavBase64('dec-' + w) },
        [core.packAudioKey(PROMPT)]: { mime: 'audio/wav', base64: wavBase64('dec-prompt') },
      },
      activityItems: { decoding: { choices: ['cat', 'dog', 'sun', 'map'] } },
    }));
    const decLesson = loader.lessonFromPack(words, {
      core,
      banks: makeFakeBanks(),
      activities: ['decoding'],
      title: 'Read Words',
      lessonId: 'L-dec-once',
      instructionsOnce: true,
    }).lesson;
    const f = openPacket(buildFromLesson(decLesson));
    const items = f.lesson.blocks[0].items;
    expect(items.length).toBe(2);
    expect(items[0].prompt).toBeTruthy();

    f.start();
    await waitUntil(() => f.played.length >= items[0].introAudio.length);
    await wait(20);
    expect(f.playedIds()).toEqual(items[0].introAudio);

    const rightIdx = items[0].choices.findIndex((c) => String(c.text).toLowerCase() === String(items[0].target).toLowerCase());
    f.d.querySelectorAll('#app li.choice button')[rightIdx].click();
    await wait(25);
    f.played.length = 0;
    f.button('Next').click();
    await wait(40);
    // Silent on item 2+ (never speaks printed words).
    expect(f.playedIds()).toEqual([]);

    f.button('Hear the instructions').click();
    await waitUntil(() => f.played.length >= 1);
    await wait(20);
    expect(f.playedIds()).toEqual([items[1].prompt]);

    // Mapping: silent on item 2+ when directionsOnce is active.
    const mapBuilt = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map'],
      activities: ['mapping'],
      seed: 3,
      title: 'Build Words',
      core,
      dictionary,
      banks: makeFakeBanks(),
      loader,
      wordlist,
      toWav: fakeWav,
      directionsOnce: true,
    });
    expect(mapBuilt.html.length).toBeGreaterThan(0);
    const mf = openPacket(mapBuilt.html);
    const mapItems = mf.lesson.blocks[0].items;
    expect(mapItems.length).toBeGreaterThanOrEqual(2);
    mf.start();
    await waitUntil(() => mf.played.length >= mapItems[0].introAudio.length);
    await wait(20);
    expect(mf.playedIds()).toEqual(mapItems[0].introAudio);

    const slotButtons = [...mf.d.querySelectorAll('#app ol.slots button.slot')];
    mapItems[0].graphemes.forEach((g, si) => {
      const pick = [...mf.d.querySelectorAll('#app ul button.primary')]
        .filter((b) => !b.closest('[hidden]'))
        .find((b) => b.textContent === g);
      pick.click();
      slotButtons[si].click();
    });
    // Filling the last slot auto-checks in Sound Mapping (no separate Check button).
    await wait(25);
    mf.played.length = 0;
    mf.button('Next').click();
    await wait(40);
    expect(mf.playedIds()).toEqual([]);
  });

  it('counting and letter_tracing drop leading promptAudio on item 2+ while preserving question/R replay', async () => {
    const banks = makeFakeBanks();
    const countBuilt = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map'],
      activities: ['counting'],
      seed: 5,
      title: 'Count Sounds',
      core,
      dictionary,
      banks,
      loader,
      wordlist,
      toWav: fakeWav,
      directionsOnce: true,
    });
    expect(countBuilt.html.length).toBeGreaterThan(0);
    const cf = openPacket(countBuilt.html);
    const cItems = cf.lesson.blocks[0].items;
    expect(cItems.length).toBeGreaterThanOrEqual(2);
    cf.start();
    await waitUntil(() => cf.played.length >= 2);
    await wait(20);
    expect(cf.playedIds()).toEqual([cItems[0].promptAudio, cItems[0].wordAudio]);

    cf.button(String(cItems[0].target)).click();
    await wait(25);
    cf.played.length = 0;
    cf.button('Next').click();
    await waitUntil(() => cf.played.length >= 1);
    await wait(20);
    expect(cf.playedIds()).toEqual([cItems[1].wordAudio]);

    cf.played.length = 0;
    cf.button('Hear the question').click();
    await waitUntil(() => cf.played.length >= 1);
    await wait(20);
    expect(cf.playedIds()).toEqual([cItems[1].promptAudio]);

    cf.played.length = 0;
    cf.key('r');
    await waitUntil(() => cf.played.length >= 2);
    await wait(20);
    expect(cf.playedIds()).toEqual([cItems[1].promptAudio, cItems[1].wordAudio]);

    // Letter tracing: item 2+ drops leading promptAudio (introAudio.slice(1)).
    const traceBuilt = await builder.buildPacket({
      words: ['cat', 'dog', 'sun'],
      activities: ['letter_tracing'],
      seed: 5,
      title: 'Trace Letters',
      core,
      dictionary,
      banks,
      loader,
      wordlist,
      toWav: fakeWav,
      directionsOnce: true,
    });
    expect(traceBuilt.html.length).toBeGreaterThan(0);
    const tf = openPacket(traceBuilt.html);
    const tItems = tf.lesson.blocks[0].items;
    expect(tItems.length).toBeGreaterThanOrEqual(2);
    expect(tItems[0].introAudio.length).toBeGreaterThanOrEqual(2);
    tf.start();
    await waitUntil(() => tf.played.length >= tItems[0].introAudio.length);
    await wait(20);
    expect(tf.playedIds()).toEqual(tItems[0].introAudio);

    const skipBtn = [...tf.d.querySelectorAll('#app button')].filter(tf.seen).find((b) => /Skip/i.test(b.textContent));
    expect(skipBtn).toBeTruthy();
    skipBtn.click();
    await wait(25);
    tf.played.length = 0;
    tf.button('Next').click();
    const expectedSlice = tItems[1].introAudio.slice(1);
    await waitUntil(() => tf.played.length >= expectedSlice.length);
    await wait(20);
    expect(tf.playedIds()).toEqual(expectedSlice);
  });

  it('blending, rhyming, syllable_blending, syllable_counting, and manipulation handle item 1 vs item 2+ and replay accurately', async () => {
    const banks = makeFakeBanks();
    for (const act of ['blending', 'rhyming', 'syllable_blending', 'syllable_counting', 'manipulation']) {
      let html;
      if (act === 'syllable_blending') {
        const sbDefs = [
          ['sunset', ['sun', 'set'], ['sunset', 'pancake']],
          ['pancake', ['pan', 'cake'], ['pancake', 'sunset']],
        ];
        const sbWords = sbDefs.map(([w, syls, opts]) => {
          const tts = { [w]: { mime: 'audio/wav', base64: wavBase64('sb-' + w) } };
          syls.forEach((s) => { tts[s] = { mime: 'audio/wav', base64: wavBase64('sb-' + s) }; });
          opts.forEach((o) => { tts[o] = { mime: 'audio/wav', base64: wavBase64('sb-' + o) }; });
          return {
            word: w,
            targetWord: w,
            term: w,
            _ttsAssets: tts,
            activityItems: {
              syllable_blending: {
                targetWord: w,
                supported: true,
                version: 1,
                contentStatus: 'curated_compound',
                syllables: syls,
                audioUnits: syls.map((s) => ({ key: s, text: s })),
                options: opts,
              },
            },
          };
        });
        const sbLesson = loader.lessonFromPack(sbWords, {
          core,
          banks,
          activities: ['syllable_blending'],
          title: 'Test syllable_blending',
          lessonId: 'L-sb-once',
          language: 'en',
          instructionsOnce: true,
        }).lesson;
        html = buildFromLesson(sbLesson);
      } else if (act === 'syllable_counting') {
        const scWords = [['sunset', ['sun', 'set']], ['pancake', ['pan', 'cake']]].map(([w, syls]) => ({
          word: w,
          targetWord: w,
          term: w,
          syllables: syls,
          _ttsAssets: { [w]: { mime: 'audio/wav', base64: wavBase64('sc-' + w) } },
          activityItems: { syllable_counting: { language: 'en', supported: true, count: syls.length, targetWord: w } },
        }));
        const scLesson = loader.lessonFromPack(scWords, {
          core,
          banks,
          activities: ['syllable_counting'],
          title: 'Test syllable_counting',
          lessonId: 'L-sc-once',
          language: 'en',
          instructionsOnce: true,
        }).lesson;
        html = buildFromLesson(scLesson);
      } else if (act === 'manipulation') {
        const manipWords = ['cat', 'hat'].map((w) => {
          const task = core.resolveManipulationTask(w, null, 'en');
          const parts = String(task.instruction || '').split(/(\/[^\s/]{1,4}\/)/g).map((p) => p.trim()).filter((p) => p && /[a-z0-9]/i.test(p));
          const tts = { [w]: { mime: 'audio/wav', base64: wavBase64('m-' + w) } };
          [task.answer].concat(task.distractors || []).forEach((o) => { tts[o] = { mime: 'audio/wav', base64: wavBase64('m-' + o) }; });
          parts.forEach((p) => { if (!/^\/[^/]+\/$/.test(p)) tts[p] = { mime: 'audio/wav', base64: wavBase64('mp-' + p) }; });
          return {
            word: w,
            targetWord: w,
            term: w,
            _ttsAssets: tts,
            manipulationTask: task,
            activityItems: { manipulation: { task, options: [task.answer].concat(task.distractors || []) } },
          };
        });
        const mLesson = loader.lessonFromPack(manipWords, {
          core,
          banks,
          activities: ['manipulation'],
          title: 'Test manipulation',
          lessonId: 'L-manip-once',
          language: 'en',
          instructionsOnce: true,
        }).lesson;
        html = buildFromLesson(mLesson);
      } else {
        const built = await builder.buildPacket({
          words: WORDS,
          activities: [act],
          seed: 7,
          title: 'Test ' + act,
          core,
          dictionary,
          banks,
          loader,
          wordlist,
          toWav: fakeWav,
          directionsOnce: true,
        });
        html = built.html;
      }
      expect(html.length, act + ' build should succeed').toBeGreaterThan(0);
      const f = openPacket(html);
      const items = f.lesson.blocks[0]?.items || [];
      expect(items.length, act + ' should generate >= 2 items').toBeGreaterThanOrEqual(2);

      f.start();
      if (act === 'syllable_blending') {
        await waitUntil(() => f.played.length >= 1 + items[0].units.length);
        await wait(25);
      } else {
        const minClips = act === 'manipulation' ? items[0].instruction.length + items[0].choices.length : act === 'syllable_counting' ? 2 : 1;
        await waitUntil(() => f.played.length >= minClips);
        await wait(25);
      }
      const firstPlayed = f.playedIds();
      expect(firstPlayed.length, act + ' item 1 should play audio').toBeGreaterThan(0);

      if (act === 'blending') {
        if (items[0].instruction) expect(firstPlayed[0]).toBe(items[0].instruction);
        const idx = items[0].choices.findIndex((c) => String(c.text).toLowerCase() === String(items[0].target).toLowerCase());
        f.d.querySelectorAll('#app li.choice button.primary')[idx].click();
      } else if (act === 'rhyming') {
        expect(firstPlayed[0]).toBe(items[0].promptAudio);
        const idx = items[0].choices.findIndex((c) => !!c.ok);
        f.d.querySelectorAll('#app li.choice button.primary')[idx].click();
      } else if (act === 'syllable_blending') {
        expect(firstPlayed).toEqual([items[0].promptAudio].concat(items[0].units));
        const idx = items[0].choices.findIndex((c) => String(c.text).trim().toLowerCase() === String(items[0].target).trim().toLowerCase());
        f.d.querySelectorAll('#app li.choice button.primary')[idx].click();
      } else if (act === 'syllable_counting') {
        expect(firstPlayed).toEqual([items[0].promptAudio, items[0].wordAudio]);
        const tapBtn = f.q('button[aria-label="Tap to count syllables"]');
        for (let k = 0; k < items[0].count; k++) tapBtn.click();
        f.button('Check').click();
      } else if (act === 'manipulation') {
        expect(firstPlayed).toEqual(items[0].instruction.concat(items[0].choices.map((c) => c.audio)));
        const idx = items[0].choices.findIndex((c) => String(c.text).toLowerCase() === String(items[0].target).toLowerCase());
        f.d.querySelectorAll('#app li.choice button.primary')[idx].click();
      }

      await wait(30);
      f.played.length = 0;
      f.button('Next').click();
      if (act === 'syllable_blending') {
        await waitUntil(() => f.played.length >= items[1].units.length);
        await wait(25);
      } else {
        const minNext = act === 'manipulation' ? items[1].instruction.length + items[1].choices.length : 1;
        await waitUntil(() => f.played.length >= minNext);
        await wait(25);
      }
      const secondPlayed = f.playedIds();

      if (act === 'blending') {
        expect(secondPlayed[0]).toBe(items[1].sounds[0]);
        if (items[1].instruction) expect(secondPlayed[0]).not.toBe(items[1].instruction);
      } else if (act === 'rhyming') {
        expect(secondPlayed[0]).toBe(items[1].wordAudio);
        f.played.length = 0;
        f.button('Hear the question').click();
        await waitUntil(() => f.played.length >= 2);
        await wait(20);
        expect(f.playedIds()).toEqual([items[1].promptAudio, items[1].wordAudio]);
      } else if (act === 'syllable_blending') {
        expect(secondPlayed).toEqual(items[1].units);
        expect(f.d.querySelectorAll('#app li.choice button.primary')[0].getAttribute('aria-disabled')).not.toBe('true');
      } else if (act === 'syllable_counting') {
        expect(secondPlayed).toEqual([items[1].wordAudio]);
        f.played.length = 0;
        f.button('Hear the question').click();
        await waitUntil(() => f.played.length >= 1);
        await wait(20);
        expect(f.playedIds()).toEqual([items[1].promptAudio]);
        f.played.length = 0;
        f.key('r');
        await waitUntil(() => f.played.length >= 2);
        await wait(20);
        expect(f.playedIds()).toEqual([items[1].promptAudio, items[1].wordAudio]);
      } else if (act === 'manipulation') {
        expect(secondPlayed).toEqual(items[1].instruction.concat(items[1].choices.map((c) => c.audio)));
      }
    }
  });

  it('builder, packets_verify_core, and packets_reopen keep default builds unchanged and round-trip directionsOnce=true', async () => {
    const plain = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map'],
      activities: ['isolation'],
      seed: 2,
      title: 'Default Check',
      core,
      dictionary,
      banks: BANKS,
      loader,
      wordlist,
      toWav: fakeWav,
    });
    expect(plain.html.length).toBeGreaterThan(0);
    const plainNoOpt = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map'],
      activities: ['isolation'],
      seed: 2,
      title: 'Default Check',
      core,
      dictionary,
      banks: BANKS,
      loader,
      wordlist,
      toWav: fakeWav,
      directionsOnce: false,
    });
    expect(plainNoOpt.html).toBe(plain.html);
    expect(reopen.read(plain.html, ENV).directionsOnce).toBe(false);

    const once = await builder.buildPacket({
      words: ['cat', 'dog', 'sun', 'map'],
      activities: ['isolation'],
      seed: 2,
      title: 'Default Check',
      core,
      dictionary,
      banks: BANKS,
      loader,
      wordlist,
      toWav: fakeWav,
      directionsOnce: true,
    });
    expect(once.html.length).toBeGreaterThan(0);
    expect(once.html).not.toBe(plain.html);
    expect(once.manifest.directionsOnce).toBe(true);
    const embeddedManifest = JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(once.html)[1]);
    expect(embeddedManifest.builder.directionsOnce).toBe(true);
    const v = verify.verifyPacket(once.html);
    expect([v.ok, v.counts.notExpected, v.counts.look]).toEqual([true, 0, 0]);
    const r = reopen.read(once.html, ENV);
    expect(r.ok).toBe(true);
    expect(r.directionsOnce).toBe(true);
    const rebuilt = await builder.buildPacket({
      words: r.words,
      activities: r.activities,
      seed: 2,
      title: r.title,
      core,
      dictionary,
      banks: BANKS,
      loader,
      wordlist,
      toWav: fakeWav,
      directionsOnce: r.directionsOnce,
    });
    expect(rebuilt.html).toBe(once.html);
  });

  it('packets-make.html #f-directions-once sets First question only on export and round-trips through Open a file I made', async () => {
    const one = await openMaker();
    one.$('next-1').click();
    one.$('next-2').click();
    const cb = one.$('f-directions-once');
    expect(cb).toBeTruthy();
    expect(cb.checked).toBe(false);
    cb.checked = true;
    cb.dispatchEvent(new one.w.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 700));
    await one.ready();
    const firstHtml = one.built();
    expect(reopen.read(firstHtml, ENV).directionsOnce).toBe(true);
    const f = openPacket(firstHtml);
    expect(f.q('[data-tool="directions-1"]').getAttribute('aria-pressed')).toBe('true');

    const two = await openMaker();
    await two.open('Directions-once.html', firstHtml);
    expect(two.$('reopen-list').textContent).toContain('Spoken directions: first question only.');
    two.$('next-1').click();
    two.$('next-2').click();
    expect(two.$('f-directions-once').checked).toBe(true);
    await two.ready();
    expect(two.built()).toBe(firstHtml);
  });
});
