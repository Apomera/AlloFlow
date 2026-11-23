// @vitest-environment jsdom
// Component 2 (Vocab Practice activity mixing + Word Sounds #f-mix discoverability & #f-directions-once hint)
// and Component 3 (Multi-category stratified broad-range randomized word selection + progressive-disclosure UI).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';
import { openMaker } from './helpers/packets_maker_page.js';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { dictionary, core, loader, wordlist, builder } = tool.loadParts();
const V = require('../packet_vocab_builder.js');
const verify = require('../packets_verify_core.js');
const bank = require('./fixtures/packets_vocab_bank_fixture.js');

const VOCAB_SCRIPTS = [
  'packets-page.js', 'word_sounds_take_home_loader.js', 'packets_verify_core.js', 'packets_reopen.js',
  'packets_zip.js', 'packets_handoff.js', 'packets_my_words.js', 'tests/fixtures/packets_vocab_bank_fixture.js',
  'word_sounds_symbols_en.js', 'word_picture_matcher.js', 'word_sounds_packet_builder.js',
  'packets_vocab_media.js', 'packet_vocab_builder.js', 'packets-print-cards.js', 'packets-vocab.js',
];

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const lessonOf = (html) => JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
const manifestOf = (html) => JSON.parse(/<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html)[1]);

async function openVocab({ saved = null } = {}) {
  const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://site.test/packets-vocab.html' });
  const w = dom.window, d = w.document;
  opened.push(w);
  const blobs = [];
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.Blob = class KeepBlob {
    constructor(parts, opts) { this.parts = parts; this.type = (opts && opts.type) || ''; this.size = parts.reduce((n, p) => n + (typeof p === 'string' ? Buffer.byteLength(p) : p.byteLength), 0); }
    text() { return Promise.resolve(this.parts.map((p) => typeof p === 'string' ? p : Buffer.from(p).toString('utf8')).join('')); }
  };
  w.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:https://site.test/' + blobs.length; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLAnchorElement.prototype.click = () => {};
  if (saved) w.localStorage.setItem('alloflow-packets-vocab/1', JSON.stringify(saved));
  for (const src of VOCAB_SCRIPTS) w.eval(read(src));
  await wait(40);
  const $ = (id) => d.getElementById(id);
  const fire = (node, name) => node.dispatchEvent(new w.Event(name, { bubbles: true }));
  return {
    dom, w, d, $, fire,
    builtHtml: async () => (blobs.length ? blobs[blobs.length - 1].text() : ''),
    typeWords: async (text) => { $('f-words').value = text; fire($('f-words'), 'input'); await wait(280); },
  };
}

function checkVocabMixInvariants(lesson, seq) {
  const usual = lesson.blocks.flatMap((b) => b.items.map((it) => String(it.id)));
  expect(Array.isArray(seq)).toBe(true);
  expect(seq.length).toBe(usual.length);
  expect([...seq].sort()).toEqual([...usual].sort());
  expect(seq).not.toEqual(usual);

  const meta = Object.create(null);
  lesson.blocks.forEach((b) => {
    b.items.forEach((it) => {
      meta[String(it.id)] = { act: b.activity, word: V.keyOf(it.word || '') };
    });
  });

  // 1. Anti-leakage: vocab_word MUST precede vocab_meaning for every shared word.
  const firstWordPos = Object.create(null), firstMeaningPos = Object.create(null);
  seq.forEach((id, i) => {
    const m = meta[id];
    if (m.act === 'vocab_word' && firstWordPos[m.word] == null) firstWordPos[m.word] = i;
    if (m.act === 'vocab_meaning' && firstMeaningPos[m.word] == null) firstMeaningPos[m.word] = i;
  });
  Object.keys(firstMeaningPos).forEach((wk) => {
    if (firstWordPos[wk] != null) {
      expect(firstWordPos[wk], 'word before meaning for ' + wk).toBeLessThan(firstMeaningPos[wk]);
    }
  });

  // 2. Minimum same-word separation: NEVER adjacent (gap >= 2 slots between positions).
  const lastPos = Object.create(null);
  seq.forEach((id, i) => {
    const wk = meta[id].word;
    if (lastPos[wk] != null) {
      expect(i - lastPos[wk], 'non-adjacent same word ' + wk + ' at ' + lastPos[wk] + ' and ' + i).toBeGreaterThanOrEqual(2);
    }
    lastPos[wk] = i;
  });

  // 3. No 3-in-a-row of same activity while another valid unlocked non-adjacent activity exists.
  const wordDone = Object.create(null), seenWord = Object.create(null);
  const remaining = seq.slice();
  const hasWord = Object.create(null);
  seq.forEach((id) => { if (meta[id].act === 'vocab_word') hasWord[meta[id].word] = true; });
  for (let i = 0; i < seq.length; i++) {
    const id = seq[i], m = meta[id];
    if (i >= 2 && meta[seq[i - 1]].act === m.act && meta[seq[i - 2]].act === m.act) {
      // Only acceptable if no other activity had a valid non-adjacent unlocked candidate OR urgent same-word prevented it.
      const remAfter = remaining.slice(i);
      const otherValid = remAfter.filter((oid) => {
        const om = meta[oid];
        if (om.act === m.act) return false;
        if (om.act === 'vocab_meaning' && hasWord[om.word] && !wordDone[om.word]) return false;
        if (seenWord[om.word] != null && i - seenWord[om.word] < 2) return false;
        return true;
      });
      const remWordCount = Object.create(null);
      remAfter.forEach((oid) => { remWordCount[meta[oid].word] = (remWordCount[meta[oid].word] || 0) + 1; });
      const wasUrgent = 2 * remWordCount[m.word] - 1 >= remAfter.length;
      if (!wasUrgent) {
        expect(otherValid.length, 'no avoidable 3-in-a-row at index ' + i).toBe(0);
      }
    }
    if (m.act === 'vocab_word') wordDone[m.word] = true;
    seenWord[m.word] = i;
  }
}

describe('Component 2: Vocabulary Practice activity mixing', () => {
  it('enforces word-before-meaning, non-adjacent same-word spacing, no avoidable 3-in-a-row, and deterministic revision across seeds and list sizes', async () => {
    await bank.load();
    const sets = [
      ['habitat', 'predator', 'prey', 'cell'],
      ['habitat', 'predator', 'prey', 'cell', 'bat'],
      ['habitat', 'predator', 'prey', 'cell', 'bat', 'adapt', 'camouflage'],
      ['habitat', 'predator', 'prey', 'cell', 'bat', 'adapt', 'camouflage', 'ecosystem'],
    ];
    for (const words of sets) {
      const rows = V.draftRows({ words, bank });
      for (const types of [['meaning', 'word'], ['meaning', 'word', 'blank']]) {
        const plain = V.lessonFromVocab({ loader, rows, types, mode: 'practice' });
        expect(plain.sequence).toBeUndefined();
        for (const orderSeed of [undefined, 1, 2, 7, 19, 42]) {
          const mixed = V.lessonFromVocab({ loader, rows, types, mode: 'practice', order: 'mix', orderSeed });
          checkVocabMixInvariants(mixed, mixed.sequence);
          expect(mixed.revision).toMatch(new RegExp('^' + plain.revision + 'm[0-9a-f]{8}$'));
          const again = V.lessonFromVocab({ loader, rows, types, mode: 'practice', order: 'mix', orderSeed });
          expect(again.sequence).toEqual(mixed.sequence);
          expect(again.revision).toBe(mixed.revision);
        }
        const s1 = V.lessonFromVocab({ loader, rows, types, mode: 'practice', order: 'mix', orderSeed: 1 });
        const s2 = V.lessonFromVocab({ loader, rows, types, mode: 'practice', order: 'mix', orderSeed: 2 });
        expect(s2.sequence).not.toEqual(s1.sequence);
      }
    }
  });

  it('strictly disables mixing for checks (mode === probe) and preserves manifest & readBack round-trip', async () => {
    await bank.load();
    const rows = V.draftRows({ words: ['habitat', 'predator', 'prey', 'cell', 'bat', 'adapt'], bank });
    const checkLesson = V.lessonFromVocab({ loader, rows, types: ['meaning', 'word'], mode: 'check', order: 'mix', orderSeed: 5 });
    expect(checkLesson.mode).toBe('probe');
    expect(checkLesson.sequence).toBeUndefined();
    expect(V.mixedVocabSequence(checkLesson, 'seed')).toBeNull();
    const checkBuilt = V.buildVocabPacket({ lesson: checkLesson, loader, rows, bank, order: 'mix', orderSeed: 5 });
    expect(checkBuilt.manifest.vocab.order).toBeUndefined();
    expect(checkBuilt.manifest.vocab.orderSeed).toBeUndefined();
    expect(V.readBack(verify.readParts(checkBuilt.html)).order).toBe('blocks');

    // Practice mixed round-trip
    const mixLesson = V.lessonFromVocab({ loader, rows, types: ['meaning', 'word'], mode: 'practice', order: 'mix', orderSeed: 12 });
    const mixBuilt = V.buildVocabPacket({ lesson: mixLesson, loader, rows, bank, order: 'mix', orderSeed: 12 });
    expect(mixBuilt.manifest.vocab.order).toBe('mix');
    expect(mixBuilt.manifest.vocab.orderSeed).toBe(12);
    const back = V.readBack(verify.readParts(mixBuilt.html));
    expect([back.order, back.orderSeed]).toEqual(['mix', 12]);
    const verified = verify.verifyPacket(mixBuilt.html);
    expect([verified.ok, verified.counts.notExpected, verified.counts.look]).toEqual([true, 0, 0]);
  });

  it('packets-vocab UI: #v-mix defaults ON in Practice, #v-mix-again reshuffles, Check hides/disables it, and reopen restores order & seed', async () => {
    const p = await openVocab();
    await p.typeWords('habitat, predator, prey, cell, bat, adapt, camouflage');
    p.$('next-1').click();
    p.$('next-2').click();
    await wait(80);

    // Practice with 2 default types: #v-mix visible & checked, #v-mix-again visible, built file has lesson.sequence.
    expect(p.$('v-mix-field').hidden).toBe(false);
    expect(p.$('v-mix').checked).toBe(true);
    expect(p.$('v-mix-again').hidden).toBe(false);
    const html1 = await p.builtHtml();
    const l1 = lessonOf(html1);
    checkVocabMixInvariants(l1, l1.sequence);
    expect(manifestOf(html1).vocab.order).toBe('mix');

    // Click "Mix again": updates mixSeed, persists in localStorage, emits a new valid sequence.
    p.$('v-mix-again').click();
    await wait(80);
    const html2 = await p.builtHtml();
    const l2 = lessonOf(html2);
    checkVocabMixInvariants(l2, l2.sequence);
    expect(l2.sequence).not.toEqual(l1.sequence);
    expect(manifestOf(html2).vocab.orderSeed).toBe(1);
    expect(JSON.parse(p.w.localStorage.getItem('alloflow-packets-vocab/1'))).toMatchObject({ mix: true, mixSeed: 1 });

    // Reopen the reshuffled Practice file in a fresh page: restores mix=true & mixSeed=1 and reproduces exact sequence.
    const fresh = await openVocab();
    const input = fresh.$('reopen-file');
    Object.defineProperty(input, 'files', { configurable: true, value: [new fresh.w.File([html2], 'mixed-vocab.html', { type: 'text/html' })] });
    fresh.fire(input, 'change');
    await wait(60);
    fresh.$('next-1').click();
    fresh.$('next-2').click();
    await wait(80);
    expect(fresh.$('v-mix').checked).toBe(true);
    const reopenedHtml = await fresh.builtHtml();
    expect(lessonOf(reopenedHtml).sequence).toEqual(l2.sequence);

    // Unchecking #v-mix builds unmixed blocks and hides #v-mix-again.
    p.$('v-mix').checked = false;
    p.fire(p.$('v-mix'), 'change');
    await wait(80);
    expect(p.$('v-mix-again').hidden).toBe(true);
    const unmixedHtml = await p.builtHtml();
    expect(lessonOf(unmixedHtml).sequence).toBeUndefined();
    expect(manifestOf(unmixedHtml).vocab.order).toBe('blocks');

    // Switching to Check mode hides/disables #v-mix and builds unmixed probe.
    const checkRadio = p.d.querySelector('input[name="mode"][value="check"]');
    checkRadio.checked = true;
    p.fire(checkRadio, 'change');
    await wait(80);
    expect(p.$('v-mix-field').hidden).toBe(true);
    expect(p.$('v-mix').disabled).toBe(true);
    const checkHtml = await p.builtHtml();
    expect(lessonOf(checkHtml).sequence).toBeUndefined();
    expect(manifestOf(checkHtml).vocab.order).toBeUndefined();

    // Back to Practice, uncheck one type so only 1 type remains: #v-mix-field hides.
    const pracRadio = p.d.querySelector('input[name="mode"][value="practice"]');
    pracRadio.checked = true;
    p.fire(pracRadio, 'change');
    const wordBox = p.d.querySelector('#types input[value="word"]');
    wordBox.checked = false;
    p.fire(wordBox, 'change');
    await wait(60);
    expect(p.$('v-mix-field').hidden).toBe(true);
  });
});

describe('Component 2: Word Sounds setup discoverability & directions-once copy', () => {
  it('surfaces #f-mix below activities only when 2+ activities are selected and clarifies #f-directions-once hint', async () => {
    const page = await openMaker({ firstVisit: true });
    opened.push(page.dom.window);
    expect(page.$('f-mix').closest('details')).toBeNull();
    expect(page.seen('mix-field')).toBe(true);
    expect(page.$('f-mix').checked).toBe(true);
    expect(page.$('more-1-now').textContent).not.toContain('activities mixed');

    // Uncheck down to 1 activity: #mix-field hides cleanly.
    const checked = [...page.d.querySelectorAll('#strands input[type="checkbox"]:checked')];
    for (const box of checked.slice(1)) box.click();
    expect(page.seen('mix-field')).toBe(false);

    // Re-check a 2nd activity: #mix-field reappears.
    checked[1].click();
    expect(page.seen('mix-field')).toBe(true);

    // Clarified directions-once hint.
    expect(page.$('directions-once-line').textContent).toContain(
      'Reads the directions on the first question of each activity, and again whenever the activity changes, then goes straight to each word.'
    );
  }, 60000);
});

describe('Component 3: Multi-category broad-range randomized word selection', () => {
  const ctx = (seed = 1) => ({ wordlist, core, dictionary, seed });
  const familiar = (row) => row.known || (row.zipf >= 3.8 && row.books >= 20);

  it('stratifies multi-pattern picks fairly (small VC pool gets equal share alongside CVC & CCVC), backfills cleanly, and defaults to full-pool randomization', () => {
    const res = builder.pickWords({ count: 9, shapes: ['CVC', 'CCVC', 'VC'] }, ctx(1));
    expect(res.words).toHaveLength(9);
    expect(new Set(res.words).size).toBe(9);
    expect(res.criteria.shapes).toEqual(['CVC', 'CCVC', 'VC']);
    expect(res.criteria.shape).toBeNull();
    expect(res.criteria.mix).toBe('any');

    const byShape = { CVC: 0, CCVC: 0, VC: 0 };
    res.words.forEach((w) => { byShape[wordlist.get(w).shape]++; });
    expect(byShape).toEqual({ CVC: 3, CCVC: 3, VC: 3 });

    // Backfills smoothly when count exceeds VC pool size (~53).
    const big = builder.pickWords({ count: 80, shapes: ['CVC', 'CCVC', 'VC'] }, ctx(1));
    expect(big.words).toHaveLength(80);
    expect(new Set(big.words).size).toBe(80);
    expect(big.words.filter((w) => wordlist.get(w).shape === 'VC').length).toBeGreaterThanOrEqual(20);

    // Deterministic by seed, distinct across seeds (versions A/B/C).
    const a1 = builder.pickWords({ count: 12, shapes: ['CVC', 'CCVC', 'VC'] }, ctx(1)).words;
    const a2 = builder.pickWords({ count: 12, shapes: ['CVC', 'CCVC', 'VC'] }, ctx(1)).words;
    const b1 = builder.pickWords({ count: 12, shapes: ['CVC', 'CCVC', 'VC'] }, ctx(2)).words;
    const c1 = builder.pickWords({ count: 12, shapes: ['CVC', 'CCVC', 'VC'] }, ctx(3)).words;
    expect(a2).toEqual(a1);
    expect(b1).not.toEqual(a1);
    expect(c1).not.toEqual(a1);
    expect(c1).not.toEqual(b1);

    // Single category remains on common-first (no auto mix: 'any', no shapes array).
    const single = builder.pickWords({ count: 9, shape: 'CVC' }, ctx(1));
    expect(single.criteria.shape).toBe('CVC');
    expect(single.criteria.shapes).toBeUndefined();
    expect(single.criteria.mix).toBeUndefined();
  });

  it('uses stage-exclusive bands for cumulative stages and keeps wider levels disjoint with 15-letter support', () => {
    const kPool = new Set(builder.pickWords({ count: 100000, stage: 'K early' }, ctx(1)).words);
    const g2Pool = new Set(builder.pickWords({ count: 100000, stage: 'G2' }, ctx(1)).words);
    const chalPool = new Set(builder.pickWords({ count: 100000, level: 'challenging' }, ctx(1)).words);

    const mix = builder.pickWords({ count: 12, stages: ['K early', 'G2', 'wider:challenging'] }, ctx(1));
    expect(mix.words).toHaveLength(12);
    expect(new Set(mix.words).size).toBe(12);
    expect(mix.criteria.stages).toEqual(['K early', 'G2', 'wider:challenging']);
    expect(mix.criteria.stage).toBeNull();
    expect(mix.criteria.mix).toBe('any');

    let inK = 0, inG2Exclusive = 0, inChal = 0;
    for (const w of mix.words) {
      const row = wordlist.get(w);
      if (chalPool.has(w)) {
        inChal++;
        expect(familiar(row), w).toBe(false);
        expect(row.wider, w).toBe(true);
        expect(w.length, w).toBeLessThanOrEqual(15);
      } else if (kPool.has(w)) {
        inK++;
        expect(w.length, w).toBeLessThanOrEqual(10);
      } else if (g2Pool.has(w)) {
        inG2Exclusive++;
        expect(w.length, w).toBeLessThanOrEqual(10);
      } else {
        throw new Error('Unexpected word outside all selected levels: ' + w);
      }
    }
    // Stratified round-robin deals 4 words from each of the 3 bands!
    expect([inK, inG2Exclusive, inChal]).toEqual([4, 4, 4]);
  });

  it('packets-make UI: multi-pattern pills, multi-level disclosure, union sounds, stable chip removal, stigma-free titles <= 80 chars, and localStorage backward compatibility', async () => {
    const GRADE_WORDS = /kindergarten|\bgrades?\b|\byears?\b|reception|\bages?\b/i;
    const chipsOf = (p) => [...p.d.querySelectorAll('#pick-chips li.chip > span:first-child')].map((n) => n.textContent);
    const page = await openMaker({ firstVisit: true });
    opened.push(page.dom.window);
    page.$('next-1').click();
    await page.until(() => chipsOf(page).length > 0, 'initial words');

    // Select 3 patterns (CVC + CCVC + VC) at Any level
    page.set('f-stage', '');
    for (const code of ['CVC', 'CCVC', 'VC']) {
      page.d.querySelector('#f-shapes input[data-shape="' + code + '"]').click();
    }
    await wait(60);
    // Increase count to 9 so all 3 patterns have 3 each
    page.set('f-count', '9');
    await wait(60);
    const chips9 = chipsOf(page);
    expect(chips9).toHaveLength(9);
    const counts = { CVC: 0, CCVC: 0, VC: 0 };
    chips9.forEach((w) => { counts[wordlist.get(w).shape]++; });
    expect(counts).toEqual({ CVC: 3, CCVC: 3, VC: 3 });

    // Removing the 2nd chip keeps chips 0 and 2..8 in their exact places and pulls the next stratified word at the end!
    const keptBefore = [chips9[0], ...chips9.slice(2)];
    page.d.querySelectorAll('#pick-chips button.chip-remove')[1].click();
    await wait(60);
    const afterRemove = chipsOf(page);
    expect(afterRemove).toHaveLength(9);
    expect(afterRemove.slice(0, 8)).toEqual(keptBefore);
    expect(afterRemove).not.toContain(chips9[1]);

    // "Pick different words" draws a fresh stratified mix.
    page.$('pick-shuffle').click();
    await wait(60);
    const reshuffled = chipsOf(page);
    expect(reshuffled).toHaveLength(9);
    expect(reshuffled).not.toEqual(afterRemove);

    // Check title length <= 80 & stigma-free for 2 patterns and 3+ patterns.
    page.$('next-2').click();
    const title3 = page.$('f-title').value;
    expect(title3).toBe('Word Sounds: mixed patterns (3), version A');
    expect(title3.length).toBeLessThanOrEqual(80);
    expect(title3).not.toMatch(GRADE_WORDS);

    page.$('back-3').click();
    page.d.querySelector('#f-shapes input[data-shape="VC"]').click(); // leaves CVC + CCVC
    await wait(60);
    page.$('next-2').click();
    const title2 = page.$('f-title').value;
    expect(title2).toBe('Word Sounds: CVC and CCVC words, version A');
    expect(title2.length).toBeLessThanOrEqual(80);
    expect(title2).not.toMatch(GRADE_WORDS);

    // Now test multi-level selection: clear patterns, turn on "Mix multiple levels", check K early + G2 + wider:challenging.
    page.$('back-3').click();
    for (const box of page.$('f-shapes').querySelectorAll('input[data-shape]:checked')) box.click();
    page.$('f-multi-stage').click();
    expect(page.$('stage-multi-field').hidden).toBe(false);
    expect(page.$('f-stage').disabled).toBe(true);
    for (const box of page.$('stage-pills').querySelectorAll('input[data-stage]:checked')) box.click();
    for (const id of ['K early', 'G2', 'wider:challenging']) {
      page.d.querySelector('#stage-pills input[data-stage="' + id + '"]').click();
    }
    await wait(60);

    // soundsFor takes union across selected stages: 'sh' is absent in K early but present in G2, so it must be enabled!
    const shOption = page.d.querySelector('#f-sound option[value="sh"]');
    expect(shOption.disabled).toBe(false);

    // Check multi-level title & localStorage payload (including words & title for packets-present-export.js).
    page.$('next-2').click();
    const titleLevels = page.$('f-title').value;
    expect(titleLevels).toBe('Word Sounds: mixed levels, version A');
    expect(titleLevels.length).toBeLessThanOrEqual(80);
    expect(titleLevels).not.toMatch(GRADE_WORDS);

    const saved = JSON.parse(page.w.localStorage.getItem('alloflow-packets-maker/1'));
    expect(saved.multiStage).toBe(true);
    expect(saved.stages).toEqual(['K early', 'G2', 'wider:challenging']);
    expect(Array.isArray(saved.words) && saved.words.length === 9).toBe(true);
    expect(saved.title).toBe(titleLevels);

    // Reload with saved multi-category state -> restores cleanly.
    const reloaded = await openMaker({
      firstVisit: true,
      before: (w) => w.localStorage.setItem('alloflow-packets-maker/1', JSON.stringify(saved)),
    });
    opened.push(reloaded.dom.window);
    reloaded.$('next-1').click();
    await reloaded.until(() => chipsOf(reloaded).length === 9, 'reloaded multi-level chips');
    expect(reloaded.$('f-multi-stage').checked).toBe(true);
    expect([...reloaded.$('stage-pills').querySelectorAll('input[data-stage]:checked')].map((b) => b.value)).toEqual(['K early', 'G2', 'wider:challenging']);

    // Reload with legacy single-string localStorage -> backward compatible!
    const legacy = await openMaker({
      firstVisit: true,
      before: (w) => w.localStorage.setItem('alloflow-packets-maker/1', JSON.stringify({ v: 1, mode: 'pick', shape: 'CCVC', stage: 'G1 early' })),
    });
    opened.push(legacy.dom.window);
    legacy.$('next-1').click();
    await legacy.until(() => chipsOf(legacy).length > 0, 'legacy chips');
    expect(legacy.$('f-multi-stage').checked).toBe(false);
    expect(legacy.$('f-stage').value).toBe('G1 early');
    expect([...legacy.$('f-shapes').querySelectorAll('input[data-shape]:checked')].map((b) => b.value)).toEqual(['CCVC']);
  }, 120000);
});
