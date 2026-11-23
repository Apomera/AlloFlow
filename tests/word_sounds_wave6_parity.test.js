// @vitest-environment jsdom
// Wave 6 Track A parity & polish tests (Findings #5, #6, #7):
// - Take-home loader lessonFromPack order:'mixed' + repeatMissed:true
// - In-app Take-Home dialog checkboxes, multi-activity default title, double-click lock & error surfacing
// - Stratified WS_CORE.sampleReadyListWords + quiet "Pick random 10" inside [data-ws-ready-lists]
// - Setup sidebar order (Word sources above Settings) & Quick-Jump anchor alignment
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { JSDOM } from 'jsdom';
import { setupWordSounds, baseProps, React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const coreSource = readFileSync('word_sounds_core.js', 'utf8');
const pronunciations = require(resolve('word_sounds_pronunciations.js'));
const core = new Function('pronunciations', coreSource + ';return createWordSoundsCore({pronunciations});')(pronunciations);

const loadLoader = () => {
  delete window.AlloWordSoundsTakeHome;
  new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
  return window.AlloWordSoundsTakeHome;
};
const TH = loadLoader();

const setupSource = readFileSync('word_sounds_setup_source.jsx', 'utf8').replace(/\r\n/g, '\n');
const dataSource = readFileSync('allo_data_source.jsx', 'utf8');
const presetText = dataSource.slice(
  dataSource.indexOf('const WORD_FAMILY_PRESETS = {'),
  dataSource.indexOf('};', dataSource.indexOf('const SIGHT_WORD_PRESETS = {')) + 2,
);
const PRESETS = new Function(presetText + '\nreturn { families: WORD_FAMILY_PRESETS, sightWords: SIGHT_WORD_PRESETS };')();
const setupIcons = [...new Set([...setupSource.matchAll(/<([A-Z]\w*)\b|icon:\s*([A-Z]\w*)/g)].map((m) => m[1] || m[2]))]
  .filter((name) => !new RegExp('(?:function|const) ' + name + '\\b').test(setupSource));
const compiledSetup = transformSync(setupSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
const Generator = new Function(
  'React', 'warnLog', 'debugLog', 'getWordSoundsString', 'loadProbeBanks', ...setupIcons,
  compiledSetup + '\nreturn WordSoundsGenerator;',
)(React, () => {}, () => {}, (_t, key) => key, () => {}, ...setupIcons.map(() => () => null));

const wav = (tag) => {
  const bytes = Buffer.alloc(64);
  bytes.write('RIFF');
  bytes.write('WAVE', 8);
  bytes.write(String(tag).slice(0, 8), 44);
  return bytes.toString('base64');
};
const asset = (tag) => ({ mime: 'audio/wav', base64: wav(tag) });
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);

const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: {
    k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), s: uri('s'),
    p: uri('p'), d: uri('d'), o: uri('o'), g: uri('g'), h: uri('h'), n: uri('n'), b: uri('b'),
  },
  instructions: {
    fb_great_job: uri('gj'),
    fb_nice: uri('ni'),
    fb_correct: uri('co'),
    fb_try_again_listen: uri('ta'),
    inst_blending: uri('ib'),
    which_word_did_you_hear: uri('ww'),
  },
};

const makeMultiWord = (w, phonemes, pos, correct, options, blendOptions) => ({
  word: w,
  targetWord: w,
  term: w,
  phonemes,
  _ttsAssets: Object.fromEntries(
    [w, ...blendOptions].map((entry) => [entry, asset(entry)]),
  ),
  activityItems: {
    isolation: { position: pos, correctSound: correct, options },
    blending: { options: blendOptions, answer: w },
  },
});

const MULTI_PACK = () => [
  makeMultiWord('cat', ['k', 'a', 't'], 0, 'k', ['k', 'a', 't', 'm'], ['cat', 'map', 'dog', 'hat']),
  makeMultiWord('map', ['m', 'a', 'p'], 2, 'p', ['m', 'a', 'p', 's'], ['map', 'cat', 'dog', 'hat']),
  makeMultiWord('dog', ['d', 'o', 'g'], 1, 'o', ['d', 'o', 'g', 't'], ['dog', 'cat', 'map', 'hat']),
  makeMultiWord('hat', ['h', 'a', 't'], 0, 'h', ['h', 'a', 't', 'm'], ['hat', 'cat', 'map', 'dog']),
];

const MAILBOX = {
  url: 'https://script.google.com/macros/s/AKfycbTEST/exec',
  packId: 'PK-12345678-1234-4234-9234-123456789abc',
  secret: 'k_secret_take_home_w6',
  expiresAt: '2027-01-01T00:00:00.000Z',
};

describe('Finding #5a: lessonFromPack order:"mixed" & repeatMissed:true', () => {
  it('omits sequence and repeatMissed when options are off, and keeps single-activity mixed unchanged', () => {
    const plain = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-plain', activities: ['isolation', 'blending'] });
    expect(plain.lesson.sequence).toBeUndefined();
    expect(plain.lesson.repeatMissed).toBeUndefined();

    const singlePlain = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-one', activities: ['isolation'] });
    const singleMixed = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-one', activities: ['isolation'], order: 'mixed' });
    expect(singleMixed.lesson.sequence).toBeUndefined();
    expect(singleMixed.lesson.revision).toBe(singlePlain.lesson.revision);
  });

  it('emits deterministic interleaved sequence with no 3-in-a-row while other activities remain and preserves per-activity order', () => {
    const plain = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-mix', activities: ['isolation', 'blending'] });
    const mixedA = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-mix', activities: ['isolation', 'blending'], order: 'mixed' });
    const mixedB = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-mix', activities: ['isolation', 'blending'], order: 'mixed' });

    const allIds = plain.lesson.blocks.flatMap((b) => b.items.map((it) => it.id));
    expect(mixedA.lesson.sequence).toEqual(mixedB.lesson.sequence);
    expect(mixedA.lesson.revision).toBe(mixedB.lesson.revision);
    expect(mixedA.lesson.revision).not.toBe(plain.lesson.revision);
    expect(mixedA.lesson.sequence).toHaveLength(allIds.length);
    expect([...mixedA.lesson.sequence].sort()).toEqual([...allIds].sort());
    expect(mixedA.lesson.sequence).not.toEqual(allIds);

    // Per-activity word order is preserved.
    for (const block of mixedA.lesson.blocks) {
      const expectedOrder = block.items.map((it) => it.id);
      const actualOrder = mixedA.lesson.sequence.filter((id) => id.startsWith(block.activity + '-'));
      expect(actualOrder).toEqual(expectedOrder);
    }

    // No 3-in-a-row from the same activity while another activity still has remaining items.
    const acts = mixedA.lesson.sequence.map((id) => id.slice(0, id.lastIndexOf('-')));
    const remaining = {};
    acts.forEach((a) => { remaining[a] = (remaining[a] || 0) + 1; });
    let last = '', run = 0;
    for (const a of acts) {
      const otherLeft = Object.keys(remaining).some((k) => k !== a && remaining[k] > 0);
      if (a === last) {
        run += 1;
        if (otherLeft) expect(run).toBeLessThanOrEqual(2);
      } else {
        last = a;
        run = 1;
      }
      remaining[a] -= 1;
    }
  });

  it('sets repeatMissed:true and updates revision deterministically', () => {
    const plain = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-rep', activities: ['isolation'] });
    const repA = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-rep', activities: ['isolation'], repeatMissed: true });
    const repB = TH.lessonFromPack(MULTI_PACK(), { core, banks: BANKS, lessonId: 'L-rep', activities: ['isolation'], repeatMissed: true });
    expect(repA.lesson.repeatMissed).toBe(true);
    expect(repA.lesson.revision).toBe(repB.lesson.revision);
    expect(repA.lesson.revision).not.toBe(plain.lesson.revision);
  });

  it('runs mixed order and repeatMissed end-to-end inside the built take-home HTML player', () => {
    const built = TH.lessonFromPack(MULTI_PACK().slice(0, 2), {
      core, banks: BANKS, lessonId: 'L-e2e-mix', title: 'Mix Test',
      activities: ['isolation', 'blending'], order: 'mixed', repeatMissed: true,
    });
    expect(built.lesson.sequence).toHaveLength(4);
    expect(built.lesson.repeatMissed).toBe(true);
    const html = TH.buildHtml(built.lesson, { core });
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/mix.html',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
      },
    });
    const d = dom.window.document;
    const clickText = (text) => {
      const btn = [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]')).find((b) => b.textContent.trim() === text);
      expect(btn, 'button ' + text).toBeTruthy();
      btn.click();
    };
    d.getElementById('learner-name').value = 'Sam';
    clickText('Start');
    // Check first screen matches sequence[0] activity header.
    const firstAct = built.lesson.sequence[0].slice(0, built.lesson.sequence[0].lastIndexOf('-'));
    expect(d.getElementById('app').textContent).toContain(built.lesson.activityTitles[firstAct] + ': 1 of 2');
    // Walk all 4 base items: intentionally miss item 0 twice so repeatMissed appends it at the end!
    const byId = Object.fromEntries(built.lesson.blocks.flatMap((b) => b.items.map((it) => [it.id, { activity: b.activity, item: it }])));
    for (let idx = 0; idx < built.lesson.sequence.length; idx++) {
      const entry = byId[built.lesson.sequence[idx]];
      const choices = [...d.querySelectorAll('ul.choices li button.primary')];
      expect(choices.length).toBeGreaterThanOrEqual(2);
      const targetIdx = entry.item.choices.findIndex((c) => (c.label || c.text) === entry.item.target);
      expect(targetIdx).toBeGreaterThanOrEqual(0);
      if (idx === 0) {
        const wrongA = (targetIdx + 1) % choices.length;
        const wrongB = (targetIdx + 2) % choices.length;
        choices[wrongA].click();
        choices[wrongB].click();
      } else {
        choices[targetIdx].click();
      }
      const nextBtn = [...d.querySelectorAll('#app button')].filter((b) => !b.closest('[hidden]'))
        .find((b) => b.textContent.trim() === 'Next' || b.textContent.trim() === 'See my results');
      expect(nextBtn, 'next/finish button at item ' + idx).toBeTruthy();
      nextBtn.click();
    }
    // After the 4 base items, the 1 missed question is presented once more!
    expect(d.getElementById('app').textContent).toContain('Once more: 1 of 1');
    dom.window.close();
  });
});

describe('Finding #5b: In-app Take-Home dialog parity, busy guard, error handling & default title', () => {
  let WordSoundsModal, root = null, host = null;
  beforeAll(() => { ({ WordSoundsModal } = setupWordSounds()); });
  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    root = null;
    host = null;
    delete window.__ALLO_ISOLATION_AUDIO;
    delete window.__ALLO_PHONEME_AUDIO_BANK;
    delete window.__ALLO_INSTRUCTION_AUDIO;
    delete window.__alloMailboxTakeHome;
    vi.restoreAllMocks();
  });

  const flush = async (ms = 20) => { await act(async () => { await new Promise((r) => setTimeout(r, ms)); }); };
  const mount = (props = {}) => {
    window.__ALLO_ISOLATION_AUDIO = BANKS.isolation;
    window.__ALLO_PHONEME_AUDIO_BANK = BANKS.phonemes;
    window.__ALLO_INSTRUCTION_AUDIO = BANKS.instructions;
    loadLoader();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(WordSoundsModal, Object.assign(baseProps('isolation'), {
      isTeacherMode: true,
      isProbeMode: false,
      wsPreloadedWords: MULTI_PACK(),
      wordSoundsLanguage: 'en',
    }, props))));
  };
  const openDialog = async () => {
    const btn = host.querySelector('[data-ws-take-home-open]');
    expect(btn).toBeTruthy();
    await act(async () => { btn.click(); });
    await flush(50);
    return host.querySelector('[data-ws-take-home-dialog]');
  };
  const captureDownloads = () => {
    const blobs = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { blobs.push(blob); return 'blob:w6'; });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    return blobs;
  };

  it('shows Mix only when >=2 activities are chosen, defaults both new checkboxes off, and embeds sequence & repeatMissed when enabled', async () => {
    mount({});
    const dialog = await openDialog();
    // Single activity (isolation): Mix checkbox hidden, Repeat Missed visible & unchecked, default placeholder is "Find the sound".
    expect(dialog.querySelector('[data-ws-take-home-mix]')).toBeNull();
    const repeatBox = dialog.querySelector('[data-ws-take-home-repeat-missed]');
    expect(repeatBox).toBeTruthy();
    expect(repeatBox.checked).toBe(false);
    expect(dialog.querySelector('#ws-take-home-name').getAttribute('placeholder')).toBe('Find the sound');

    // Add a second activity (blending): Mix checkbox appears (default off) and default title becomes "Word Sounds practice".
    const blendBox = dialog.querySelector('[data-ws-take-home-activity="blending"]');
    expect(blendBox).toBeTruthy();
    await act(async () => { blendBox.click(); });
    await flush(50);

    const mixBox = dialog.querySelector('[data-ws-take-home-mix]');
    expect(mixBox).toBeTruthy();
    expect(mixBox.checked).toBe(false);
    expect(dialog.querySelector('#ws-take-home-name').getAttribute('placeholder')).toBe('Word Sounds practice');

    // Turn on both Mix and Repeat Missed and download.
    await act(async () => { mixBox.click(); repeatBox.click(); });
    await flush(50);
    const blobs = captureDownloads();
    const dlBtn = dialog.querySelector('[data-ws-take-home-download]');
    await act(async () => { dlBtn.click(); });
    await flush(60);

    expect(blobs).toHaveLength(1);
    const html = await blobs[0].text();
    const embedded = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
    expect(embedded.title).toBe('Word Sounds practice');
    expect(Array.isArray(embedded.sequence)).toBe(true);
    expect(embedded.sequence).toHaveLength(8);
    expect(embedded.repeatMissed).toBe(true);
  });

  it('uses active lesson title when present, and single-activity title fallback for non-isolation single activity', async () => {
    mount({
      lessonPlanConfig: { title: 'Short A Blending Week 2', order: ['isolation', 'blending'], activities: [{ id: 'isolation', count: 4 }, { id: 'blending', count: 4 }] },
    });
    let dialog = await openDialog();
    expect(dialog.querySelector('#ws-take-home-name').getAttribute('placeholder')).toBe('Short A Blending Week 2');

    act(() => root.unmount()); host.remove();
    mount({});
    dialog = await openDialog();
    // Switch from isolation-only to blending-only.
    await act(async () => { dialog.querySelector('[data-ws-take-home-activity="blending"]').click(); });
    await act(async () => { dialog.querySelector('[data-ws-take-home-activity="isolation"]').click(); });
    await flush(50);
    expect(dialog.querySelector('#ws-take-home-name').getAttribute('placeholder')).toBe('Blend Sounds');
  });

  it('prevents double-click duplicate downloads & orphaned mailbox packs with takeHomeBusy + aria-busy', async () => {
    let resolveMailbox;
    const target = vi.fn(() => new Promise((resolve) => { resolveMailbox = resolve; }));
    window.__alloMailboxTakeHome = { connected: true, target, openSetup: vi.fn() };
    mount({});
    const dialog = await openDialog();
    const blobs = captureDownloads();
    const dlBtn = dialog.querySelector('[data-ws-take-home-download]');

    // Fire two rapid clicks while mailbox target is still pending.
    await act(async () => {
      dlBtn.click();
      dlBtn.click();
    });
    expect(target).toHaveBeenCalledTimes(1);
    expect(dlBtn.disabled).toBe(true);
    expect(dlBtn.getAttribute('aria-busy')).toBe('true');
    expect(dlBtn.textContent).toBe('Making file...');

    // Click again while disabled — still ignored.
    await act(async () => { dlBtn.click(); });
    expect(target).toHaveBeenCalledTimes(1);

    await act(async () => { resolveMailbox(MAILBOX); });
    await flush(60);

    expect(blobs).toHaveLength(1);
    expect(dlBtn.disabled).toBe(false);
    expect(dlBtn.getAttribute('aria-busy')).toBeNull();
    expect(dlBtn.textContent).toBe('Download the file');
  });

  it('surfaces a clean localized error notice and resets busy state when portableAudio or buildHtml throws', async () => {
    mount({});
    const dialog = await openDialog();
    const origPortable = window.AlloWordSoundsTakeHome.portableAudio;
    window.AlloWordSoundsTakeHome.portableAudio = vi.fn(async () => { throw new Error('codec boom'); });
    const blobs = captureDownloads();
    const dlBtn = dialog.querySelector('[data-ws-take-home-download]');

    await act(async () => { dlBtn.click(); });
    await flush(50);

    expect(blobs).toHaveLength(0);
    expect(dlBtn.disabled).toBe(false);
    expect(dlBtn.getAttribute('aria-busy')).toBeNull();
    expect(dialog.textContent).toContain('The take-home file could not be made. Please try again.');

    // Recovers cleanly on retry once the error clears.
    window.AlloWordSoundsTakeHome.portableAudio = origPortable;
    await act(async () => { dlBtn.click(); });
    await flush(60);
    expect(blobs).toHaveLength(1);
  });
});

describe('Finding #6: Stratified sampleReadyListWords & "Pick random 10" UI', () => {
  it('samples balanced quotas across multiple lists, deduplicates case-insensitively, respects filter, and avoids identical redraw', () => {
    const listA = Array.from({ length: 20 }, (_, i) => 'a' + i);
    const listB = Array.from({ length: 20 }, (_, i) => 'b' + i);
    const listC = Array.from({ length: 20 }, (_, i) => 'c' + i);

    // 2 lists -> exact 5 from each.
    const two = core.sampleReadyListWords([{ id: 'a', words: listA }, { id: 'b', words: listB }], 10, 42);
    expect(two).toHaveLength(10);
    expect(two.filter((w) => w.startsWith('a'))).toHaveLength(5);
    expect(two.filter((w) => w.startsWith('b'))).toHaveLength(5);

    // 3 lists -> balanced 4/3/3 (counts differ by at most 1).
    const three = core.sampleReadyListWords([{ id: 'a', words: listA }, { id: 'b', words: listB }, { id: 'c', words: listC }], 10, 99);
    expect(three).toHaveLength(10);
    const counts = ['a', 'b', 'c'].map((p) => three.filter((w) => w.startsWith(p)).length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);

    // Case-insensitive deduplication across overlapping lists.
    const overlap = core.sampleReadyListWords([
      ['Cat', 'bat', 'hat', 'mat', 'rat', 'sat'],
      ['cat', 'BAT', 'can', 'pan', 'man', 'fan'],
    ], 10, 7);
    expect(overlap).toHaveLength(10);
    expect(new Set(overlap.map((w) => w.toLowerCase())).size).toBe(10);

    // Respects withinSyllableRange (honoring filterBySyllables:false for sight lists).
    const filtered = core.sampleReadyListWords([
      { id: 'syl', words: ['cat', 'elephant', 'watermelon', 'bat'], filterBySyllables: true },
      { id: 'sight', words: ['beautiful', 'together'], filterBySyllables: false },
    ], 10, 5, { withinSyllableRange: (w) => w.length <= 4 });
    expect(filtered.sort()).toEqual(['bat', 'beautiful', 'cat', 'together']);

    // Avoids identical redraw when pool > count, even with a constant degenerate RNG!
    const pool = Array.from({ length: 12 }, (_, i) => 'w' + i);
    const first = core.sampleReadyListWords([pool], 10, () => 0);
    const second = core.sampleReadyListWords([pool], 10, () => 0, { previous: first });
    expect(second).toHaveLength(10);
    expect([...second].sort()).not.toEqual([...first].sort());
  });

  describe('Setup UI "Pick random 10" button inside [data-ws-ready-lists]', () => {
    let root, container;
    beforeEach(() => {
      window.AlloModules = { WordSoundsPronunciations: pronunciations, WordSoundsPhonemes: { lookup: () => [] } };
      window.WORD_FAMILY_PRESETS = PRESETS.families;
      window.SIGHT_WORD_PRESETS = PRESETS.sightWords;
      delete window.__alloAiUsable;
      container = document.createElement('div');
      document.body.appendChild(container);
      root = createRoot(container);
    });
    afterEach(() => {
      act(() => root.unmount());
      container.remove();
      vi.restoreAllMocks();
    });

    const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    const one = (sel) => container.querySelector(sel);
    const all = (sel) => [...container.querySelectorAll(sel)];
    const selected = () => all('button[aria-pressed="true"][aria-label$=": selected"]').map((b) => b.getAttribute('aria-label').split(':')[0]);
    const mount = async (extra = {}) => {
      const props = {
        glossaryTerms: [], preloadedWords: [], isTeacherMode: true, isProbeMode: false,
        wordSoundsLanguage: 'English', gradeLevel: '1st Grade', t: (key) => key,
        selectedVoice: 'Kore', ttsSpeed: 1, onStartGame: vi.fn(), callGemini: vi.fn(async () => '{}'),
        syllableReviewSession: { key: 1, setupDraft: { sessionType: 'practice' } },
        ...extra,
      };
      await act(async () => root.render(React.createElement(Generator, props)));
      return props;
    };
    const addList = async (id) => {
      await act(async () => Simulate.change(one('#ws-ready-list-select'), { target: { value: id } }));
      await act(async () => { one('[data-ws-ready-list-add]').click(); });
      await tick();
    };
    const typeWords = async (value) => {
      const box = all('input[type="checkbox"]').find((input) => input.closest('label')?.getAttribute('data-help-key') === 'ws_gen_src_custom');
      if (!box.checked) await act(async () => Simulate.change(box, { target: { checked: true } }));
      await act(async () => Simulate.change(one('[data-ws-my-words]'), { target: { value } }));
    };

    it('renders strictly inside [data-ws-ready-lists] only when eligible > 10, balances across lists, avoids identical redraw, and preserves custom ticks', async () => {
      await mount();
      expect(one('[data-ws-ready-list-random]')).toBeNull();

      await typeWords('zebra mango');
      await addList('family:Short A (-at)');
      const at = PRESETS.families['Short A (-at)'];
      // Initial add stays deterministic first 10.
      expect(selected().sort()).toEqual(['mango', 'zebra', ...at.slice(0, 10)].sort());

      const randomBtn = one('[data-ws-ready-list-random]');
      expect(randomBtn).toBeTruthy();
      expect(randomBtn.getAttribute('type')).toBe('button');
      expect(randomBtn.className).toContain('min-h-11');
      expect(one('[data-ws-ready-lists]').contains(randomBtn)).toBe(true);
      // Pin: [aria-labelledby="word-sounds-active-sources-label"] keeps exact 3 child blocks!
      const sources = one('[aria-labelledby="word-sounds-active-sources-label"]');
      expect([...sources.children].filter((node) => !node.id).length).toBe(3);

      // Add a second list (Short A -an) and click Pick random 10.
      await addList('family:Short A (-an)');
      const an = PRESETS.families['Short A (-an)'];
      const before = selected();
      await act(async () => { randomBtn.click(); });
      await tick();

      const afterFirst = selected();
      expect(afterFirst).toContain('zebra');
      expect(afterFirst).toContain('mango');
      const readyOnly = afterFirst.filter((w) => w !== 'zebra' && w !== 'mango');
      expect(readyOnly).toHaveLength(10);
      const fromAt = readyOnly.filter((w) => at.includes(w));
      const fromAn = readyOnly.filter((w) => an.includes(w));
      expect(fromAt).toHaveLength(5);
      expect(fromAn).toHaveLength(5);
      expect(afterFirst.sort()).not.toEqual(before.sort());
      expect(one('[data-ws-ready-list-status]').textContent).toBe('Picked 10 random words from your 2 lists.');

      // Clicking again avoids an identical redraw while still keeping custom words.
      const firstReadySorted = [...readyOnly].sort();
      await act(async () => { randomBtn.click(); });
      await tick();
      const afterSecond = selected();
      expect(afterSecond).toContain('zebra');
      expect(afterSecond).toContain('mango');
      const secondReadySorted = afterSecond.filter((w) => w !== 'zebra' && w !== 'mango').sort();
      expect(secondReadySorted).toHaveLength(10);
      expect(secondReadySorted).not.toEqual(firstReadySorted);
    });
  });
});

describe('Finding #7: Setup sidebar order & Quick-Jump anchor alignment + i18n registration', () => {
  let root, container;
  beforeEach(() => {
    window.AlloModules = { WordSoundsPronunciations: pronunciations, WordSoundsPhonemes: { lookup: () => [] } };
    window.WORD_FAMILY_PRESETS = PRESETS.families;
    window.SIGHT_WORD_PRESETS = PRESETS.sightWords;
    delete window.__alloAiUsable;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    delete window.__alloAiUsable;
    vi.restoreAllMocks();
  });

  const mount = async (extra = {}) => {
    const props = {
      glossaryTerms: [], preloadedWords: [], isTeacherMode: true, isProbeMode: false,
      wordSoundsLanguage: 'English', gradeLevel: '1st Grade', t: (key) => key,
      selectedVoice: 'Kore', ttsSpeed: 1, onStartGame: vi.fn(), callGemini: vi.fn(async () => '{}'),
      syllableReviewSession: { key: 1, setupDraft: { sessionType: 'practice' } },
      ...extra,
    };
    await act(async () => root.render(React.createElement(Generator, props)));
  };

  it('places Word sources directly below Lesson and ABOVE Settings, and aligns Quick-Jump anchors (AI on and off)', async () => {
    for (const aiOn of [true, false]) {
      window.__alloAiUsable = () => aiOn;
      await mount();
      const jumps = [...container.querySelectorAll('[data-ws-step-jump]')].map((b) => b.getAttribute('data-ws-step-jump'));
      expect(jumps).toEqual(['ws-step-lesson', 'ws-step-goals-words', 'ws-step-media']);

      const lesson = container.querySelector('#ws-step-lesson');
      const planCard = container.querySelector('[data-ws-plan-card]');
      const goalsWords = container.querySelector('#ws-step-goals-words');
      const sources = container.querySelector('[aria-labelledby="word-sounds-active-sources-label"]');
      const media = container.querySelector('#ws-step-media');

      expect(lesson).toBeTruthy();
      expect(planCard).toBeTruthy();
      expect(goalsWords).toBeTruthy();
      expect(sources).toBeTruthy();
      expect(media).toBeTruthy();
      // Only ONE #ws-step-goals-words in DOM (no duplicate IDs).
      expect(container.querySelectorAll('#ws-step-goals-words')).toHaveLength(1);
      // #ws-step-goals-words wraps Word sources directly (not skipped past!).
      expect(goalsWords.contains(sources)).toBe(true);
      // DOM order: Lesson -> Plan Card -> Word Sources (#ws-step-goals-words) -> Settings (#ws-step-media).
      expect(lesson.compareDocumentPosition(planCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(planCard.compareDocumentPosition(sources) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(sources.compareDocumentPosition(media) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      // Clicking Quick-Jump "Words & Goals" scrolls & focuses #ws-step-goals-words directly.
      const scrollSpy = vi.fn();
      goalsWords.scrollIntoView = scrollSpy;
      await act(async () => { container.querySelector('[data-ws-step-jump="ws-step-goals-words"]').click(); });
      expect(scrollSpy).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(goalsWords);
    }
  });

  it('registers every new Wave 6 localization key in allo_data_source.jsx, ui_strings.js, and ui_strings_core.js', () => {
    const uiStrings = JSON.parse(readFileSync('ui_strings.js', 'utf8')).word_sounds;
    const uiCore = JSON.parse(readFileSync('ui_strings_core.js', 'utf8')).word_sounds;
    const keys = [
      'take_home_default_title_multi',
      'take_home_mix',
      'take_home_repeat_missed',
      'take_home_downloading',
      'take_home_download_failed',
      'ready_list_pick_random',
      'ready_list_picked_random',
      'ready_list_picked_random_multi',
      'setup_steps_nav',
      'jump_to_step',
      'step_lesson',
      'step_goals_words',
      'step_media',
    ];
    for (const key of keys) {
      expect(dataSource, 'allo_data_source missing ' + key).toContain("'word_sounds." + key + "':");
      expect(typeof uiStrings[key], 'ui_strings missing ' + key).toBe('string');
      expect(typeof uiCore[key], 'ui_strings_core missing ' + key).toBe('string');
    }
  });
});
