// @vitest-environment jsdom
// Wave 6 Track B: Comprehensive regression tests for all 8 bug/correctness/privacy/a11y fixes
// across the 4 Packet builders, makers, check adapters, and shared helpers.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');

const CHECK = require('../packet_check_builder.js');
const MATH_PRAC = require('../packet_math_practice_builder.js');
const RA = require('../packet_read_along_builder.js');
const SR = require('../packet_symbol_runner_builder.js');
const VERIFY = require('../packets_verify_core.js');
const MATH_ADAPTER = require('../word_sounds_take_home/check_adapters/math_computation.js');
const RA_ADAPTER = require('../word_sounds_take_home/check_adapters/read_along.js');

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const SVG_CIRCLE = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>').toString('base64');
const WAV_URI = 'data:audio/wav;base64,' + Buffer.from('RIFF\x00\x00\x00\x00WAVE').toString('base64');
const MP3_URI = 'data:audio/mpeg;base64,' + Buffer.from('ID3sample-clip').toString('base64');
const WEBM_URI = 'data:audio/webm;base64,' + Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibQ==').toString('base64');

function loadLoader() {
  const sandbox = {
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Int32Array,
    DataView,
    ArrayBuffer,
    btoa,
    atob,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('word_sounds_take_home_loader.js'), sandbox);
  return sandbox.AlloWordSoundsTakeHome;
}
const loader = loadLoader();

function parseManifest(html) {
  const m = /<script type="application\/json" id="packet-manifest">([\s\S]*?)<\/script>/.exec(html);
  return m ? JSON.parse(m[1]) : null;
}

const openedDoms = [];
function trackDom(dom) {
  openedDoms.push(dom);
  return dom;
}

afterEach(() => {
  while (openedDoms.length) {
    try { openedDoms.pop().window.close(); } catch (_) {}
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Finding 1 [P0 Privacy]: withCodeName(html, '') strips manifest.learner
// ---------------------------------------------------------------------------
describe('Finding 1: withCodeName("", null, punctuation) strips manifest.learner across all 4 builders & packets-check.js', () => {
  it('strips manifest.learner when cleared while keeping exact byte parity on already-unnamed HTML across all 4 builders', () => {
    const checkUnnamed = CHECK.buildCheckPacket({
      lesson: CHECK.lessonFromMathProblems({ problems: CHECK.parseProblems('7+8, 12-5') }),
      loader,
    }).html;
    const mathUnnamed = MATH_PRAC.buildMathPracticePacket({
      lesson: MATH_PRAC.lessonFromMathPractice({ loader, mode: 'ccc', factSet: 'mul-7' }),
      loader,
    }).html;
    const raUnnamed = RA.buildReadAlongPacket({
      made: RA.lessonFromReadAlong({ loader, title: 'Fox', text: 'The fox ran.', clips: {} }),
      loader,
    }).html;
    const srUnnamed = SR.buildSymbolRunnerPacket({
      loader,
      mode: 'confusable_letters',
      packetMode: 'practice',
    }).html;

    const cases = [
      ['packet_check_builder', CHECK, checkUnnamed],
      ['packet_math_practice_builder', MATH_PRAC, mathUnnamed],
      ['packet_read_along_builder', RA, raUnnamed],
      ['packet_symbol_runner_builder', SR, srUnnamed],
    ];

    for (const [label, builder, unnamed] of cases) {
      expect(parseManifest(unnamed).learner, label + ' unnamed').toBeUndefined();
      // Exact byte-for-byte no-op when learner is already absent.
      expect(builder.withCodeName(unnamed, ''), label + ' byte parity on empty').toBe(unnamed);
      expect(builder.withCodeName(unnamed, '   '), label + ' byte parity on whitespace').toBe(unnamed);

      const named = builder.withCodeName(unnamed, 'Ana');
      expect(parseManifest(named).learner, label + ' named').toBe('Ana');

      // Clearing strips manifest.learner and restores exact unnamed bytes.
      for (const emptyInput of ['', '   ', '!!!', null, undefined]) {
        const stripped = builder.withCodeName(named, emptyInput);
        expect(Object.prototype.hasOwnProperty.call(parseManifest(stripped), 'learner'), `${label} strip(${String(emptyInput)})`).toBe(false);
        expect(stripped, `${label} restores exact unnamed bytes`).toBe(unnamed);
      }
    }
  });

  it('packets-check.js never leaks a prior student code name into an unnamed class copy after rebuild + clearing #f-batch-names', async () => {
    const dom = trackDom(new JSDOM(read('packets-check.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-check.html',
    }));
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    const blobs = [];
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    w.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:https://packets.test/' + blobs.length; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));

    const $ = (id) => d.getElementById(id);
    const until = async (fn, msg) => {
      for (let i = 0; i < 300; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 10)); }
      throw new Error('Timed out: ' + msg);
    };

    // Choose Own problems -> step 2 -> step 3.
    d.querySelector('input[name="check"][value="own"]').checked = true;
    d.querySelector('input[name="check"][value="own"]').dispatchEvent(new w.Event('change', { bubbles: true }));
    $('f-problems').value = '7+8\n12-5';
    $('f-problems').dispatchEvent(new w.Event('input', { bubbles: true }));
    await until(() => $('own-list').children.length === 2, 'own problems parsed');
    $('next-1').click();
    $('next-2').click();
    await until(() => !$('summary').hidden, 'initial build ready');

    // Enter Ana in #f-batch-names, then trigger a full rebuild (edit title via Back -> Next).
    $('f-batch-names').value = 'Ana';
    $('f-batch-names').dispatchEvent(new w.Event('input', { bubbles: true }));
    expect(parseManifest(blobs[blobs.length - 1].body).learner).toBe('Ana');

    $('back-3').click();
    $('f-title').value = 'Updated Check';
    $('f-title').dispatchEvent(new w.Event('input', { bubbles: true }));
    $('next-2').click();
    await until(() => !$('summary').hidden && blobs[blobs.length - 1].body.includes('Updated Check'), 'rebuilt with Ana');
    expect(parseManifest(blobs[blobs.length - 1].body).learner).toBe('Ana');

    // Now clear #f-batch-names -> unnamed class copy must NOT contain learner "Ana"!
    const beforeClear = blobs.length;
    $('f-batch-names').value = '';
    $('f-batch-names').dispatchEvent(new w.Event('input', { bubbles: true }));
    expect(blobs.length).toBeGreaterThan(beforeClear);
    const classManifest = parseManifest(blobs[blobs.length - 1].body);
    expect(classManifest.title).toBe('Updated Check');
    expect(Object.prototype.hasOwnProperty.call(classManifest, 'learner')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Finding 2 [P0 Assessment Validity]: Symbol Runner Check strips pictures & API audio
// ---------------------------------------------------------------------------
describe('Finding 2: Symbol Runner 1-Minute Check strips cue pictures and API audio', () => {
  it('strips pictures, audio, and their credits in check mode while keeping them in practice mode', () => {
    const pictures = {
      b: { src: PNG_1X1, alt: 'ball', credit: 'Mulberry Symbols', set: 'mulberry' },
      d: { src: SVG_CIRCLE, alt: 'dog', credit: 'OpenMoji', set: 'openmoji' },
    };
    const clips = { b: WAV_URI, d: WAV_URI };

    const checkBuilt = SR.buildSymbolRunnerPacket({
      loader,
      mode: 'confusable_letters',
      packetMode: 'check',
      pictures,
      clips,
    });
    expect(Object.keys(checkBuilt.lesson.images || {})).toEqual([]);
    expect(Object.keys(checkBuilt.lesson.audio || {})).toEqual([]);
    for (const it of checkBuilt.lesson.blocks[0].items) {
      expect(it.image).toBeUndefined();
      expect(it.audio).toBeUndefined();
    }
    expect(checkBuilt.manifest.symbolRunner.includeAudio).toBe(false);
    expect(checkBuilt.manifest.symbolRunner.pictureMeta).toBeUndefined();
    expect(checkBuilt.manifest.attributions || []).toEqual([]);

    const pracBuilt = SR.buildSymbolRunnerPacket({
      loader,
      mode: 'confusable_letters',
      packetMode: 'practice',
      pictures,
      clips,
    });
    expect(Object.keys(pracBuilt.lesson.images || {}).length).toBe(2);
    expect(Object.keys(pracBuilt.lesson.audio || {}).length).toBe(2);
    expect(pracBuilt.lesson.blocks[0].items.some((it) => !!it.image)).toBe(true);
    expect(pracBuilt.lesson.blocks[0].items.some((it) => !!it.audio)).toBe(true);
  });

  it('packets-symbol-runner.js hides .sr-pics-panel and omits pictures when exporting a 1-minute check', async () => {
    const dom = trackDom(new JSDOM(read('packets-symbol-runner.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.example/packets-symbol-runner.html',
    }));
    const w = dom.window;
    const d = w.document;
    w.matchMedia = () => ({ matches: true });
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
    const capturedBlobs = [];
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    w.URL.createObjectURL = (blob) => { capturedBlobs.push(blob); return 'blob://sr-' + capturedBlobs.length; };
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = function () {};

    for (const src of ['packets-page.js', 'packets_zip.js', 'packets_verify_core.js', 'packets_reopen.js', 'word_sounds_take_home_loader.js', 'word_picture_matcher.js', 'symbol_runner_core.js', 'packet_symbol_runner_builder.js', 'packets-symbol-runner.js']) {
      w.eval(read(src));
    }
    await new Promise((r) => setTimeout(r, 30));

    // Practice mode shows pictures panel.
    const picsPanel = d.querySelector('.sr-pics-panel');
    expect(picsPanel.hidden).toBe(false);

    // Seed a real picture into the page state via getPictures() so we prove check mode strips it.
    w.AlloPacketsSymbolRunner.getPictures().b = { src: PNG_1X1, alt: 'ball', credit: 'Teacher card', set: 'custom' };

    // Switch to 1-minute check -> hides .sr-pics-panel and omits pictures from exported HTML.
    const checkRadio = d.querySelector('input[name="sr-packet-mode"][value="check"]');
    checkRadio.checked = true;
    checkRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(picsPanel.hidden).toBe(true);
    expect(d.getElementById('sr-more-2-now').textContent).not.toMatch(/picture/i);

    const before = capturedBlobs.length;
    d.getElementById('sr-save-html').click();
    for (let i = 0; i < 40 && capturedBlobs.length === before; i++) await new Promise((r) => setTimeout(r, 10));
    expect(capturedBlobs.length).toBeGreaterThan(before);
    const checkParts = VERIFY.readParts(capturedBlobs[capturedBlobs.length - 1].body);
    expect(checkParts.ok).toBe(true);
    expect(Object.keys(checkParts.lesson.images || {})).toEqual([]);
    expect(checkParts.lesson.blocks[0].items.every((it) => !it.image && !it.audio)).toBe(true);

    // Switching back to practice restores .sr-pics-panel visibility.
    const pracRadio = d.querySelector('input[name="sr-packet-mode"][value="practice"]');
    pracRadio.checked = true;
    pracRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(picsPanel.hidden).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Finding 3 [P1 Crash Fix]: Symbol Runner Rehearsal deduplicates unique answers
// ---------------------------------------------------------------------------
describe('Finding 3: Symbol Runner Rehearsal handles multi-card-per-answer pools without crashing', () => {
  it('plans and builds color_word_stroop rehearsal (4 unique answers -> 1 new + 3 known) and all other multi-card pools', () => {
    const stroopPlan = SR.planSymbolRunner({ mode: 'color_word_stroop', rehearsal: true });
    expect(stroopPlan.newSymbols).toHaveLength(1);
    expect(stroopPlan.newSymbols[0].answer).toBe('red');
    expect(new Set(stroopPlan.knownSymbols.map((k) => k.answer))).toEqual(new Set(['blue', 'green', 'gold']));

    const stroopBuilt = SR.buildSymbolRunnerPacket({ loader, mode: 'color_word_stroop', rehearsal: true });
    expect(VERIFY.verifyPacket(stroopBuilt.html).counts.notExpected).toBe(0);
    expect(stroopBuilt.manifest.symbolRunner.known).toEqual(['blue', 'green', 'gold']);

    for (const modeId of ['flanker_letters', 'quantity_stroop', 'number_size_stroop', 'ras_triple']) {
      const plan = SR.planSymbolRunner({ mode: modeId, rehearsal: true });
      const newAns = plan.newSymbols.map((s) => s.answer);
      expect(new Set(newAns).size, modeId + ' distinct new answers').toBe(newAns.length);
      expect(newAns.length, modeId + ' at least 1 new').toBeGreaterThanOrEqual(1);
      expect(new Set(plan.knownSymbols.map((k) => k.answer)).size, modeId + ' >= 3 distinct known').toBeGreaterThanOrEqual(3);
    }
  });

  it('rejects explicit known lists with fewer than 3 distinct answers even when the pool has duplicate cards per answer', () => {
    // red + blue span 8 cards in color_word_stroop, but only 2 distinct answers!
    expect(() => SR.planSymbolRunner({ mode: 'color_word_stroop', rehearsal: true, known: ['red', 'blue'] }))
      .toThrow(/at least 3 known symbols/i);
  });
});

// ---------------------------------------------------------------------------
// Finding 4 [P1 Construct & Deck Fix]: Alternating RAS checks + forward-scan adjacent dedupe
// ---------------------------------------------------------------------------
describe('Finding 4: Symbol Runner Check alternating RAS & forward-scan adjacent dedupe', () => {
  it('alternates Letter/Number in ras_switch checks and Letter/Number/Color in ras_triple checks (samples + scored)', () => {
    const dual = SR.planSymbolRunner({ mode: 'ras_switch', packetMode: 'check', count: 40 });
    const dualSamples = dual.cards.filter((c) => c.practice);
    const dualScored = dual.cards.filter((c) => !c.practice);
    expect(dualSamples).toHaveLength(2);
    expect(dualScored).toHaveLength(40);
    expect(/^[a-z]+$/i.test(dualSamples[0].answer)).toBe(true);
    expect(/^[0-9]+$/.test(dualSamples[1].answer)).toBe(true);
    dualScored.forEach((c, idx) => {
      if (idx % 2 === 0) expect(/^[a-z]+$/i.test(c.answer), 'dual scored ' + idx).toBe(true);
      else expect(/^[0-9]+$/.test(c.answer), 'dual scored ' + idx).toBe(true);
    });

    const triple = SR.planSymbolRunner({ mode: 'ras_triple', packetMode: 'check', count: 40 });
    const tripleSamples = triple.cards.filter((c) => c.practice);
    const tripleScored = triple.cards.filter((c) => !c.practice);
    expect(tripleSamples).toHaveLength(3);
    expect(tripleScored).toHaveLength(40);
    const catOf = (card) => (card.stroopInk ? 'color_stroop' : (/^[0-9]+$/.test(card.answer) ? 'number' : 'letter'));
    expect(tripleSamples.map(catOf)).toEqual(['letter', 'number', 'color_stroop']);
    const expectedCycle = ['letter', 'number', 'color_stroop'];
    tripleScored.forEach((c, idx) => {
      expect(catOf(c), 'triple scored ' + idx).toBe(expectedCycle[idx % 3]);
    });
  });

  it('never duplicates cPass[0] or drops cPass[last] on adjacent-dedupe across passes in check or practice mode', () => {
    // 4 unique items over 40 scored cards (10 full passes): each symbol must appear EXACTLY 10 times with 0 adjacent repeats!
    for (const packetMode of ['check', 'practice']) {
      const plan = SR.planSymbolRunner({ mode: 'custom', items: 'b d p q', packetMode, count: 20 });
      const list = packetMode === 'check' ? plan.cards.filter((c) => !c.practice) : plan.cards;
      expect(list).toHaveLength(20);
      const counts = { b: 0, d: 0, p: 0, q: 0 };
      for (let i = 0; i < list.length; i++) {
        counts[list[i].answer]++;
        if (i > 0) expect(list[i].answer, `${packetMode} idx ${i}`).not.toBe(list[i - 1].answer);
      }
      expect(counts).toEqual({ b: 5, d: 5, p: 5, q: 5 });
    }
    // Minimal 2-item pool over 10 cards (5 passes): exact 5/5 split, 0 adjacent duplicates!
    const twoPlan = SR.planSymbolRunner({ mode: 'custom', items: 'b d', packetMode: 'check', count: 10 });
    const twoScored = twoPlan.cards.filter((c) => !c.practice);
    expect(twoScored.filter((c) => c.answer === 'b')).toHaveLength(5);
    expect(twoScored.filter((c) => c.answer === 'd')).toHaveLength(5);
    for (let i = 1; i < twoScored.length; i++) {
      expect(twoScored[i].answer).not.toBe(twoScored[i - 1].answer);
    }
  });
});

// ---------------------------------------------------------------------------
// Finding 5 [P1 Karaoke Sync & Reopen Timings]: Read-Along Unicode word tokenizer + readBack timings
// ---------------------------------------------------------------------------
describe('Finding 5: Read-Along Unicode word tokenizer parity (hyphens, digits, Spanish) & readBack timings', () => {
  it('tokenizes computeWordTimings 1:1 with read_along.js for hyphens, numerals, and Spanish accents', () => {
    const sr = 8000;
    const pcm = new Float32Array(sr * 2);
    for (let i = 400; i < pcm.length - 400; i++) pcm[i] = 0.35 * Math.sin(i * 0.15);

    const hyphenTimings = RA.computeWordTimings('A well-known fox.', pcm, sr);
    expect(hyphenTimings).toHaveLength(4); // A, well, known, fox
    expect(hyphenTimings[3]).toBe(1000);

    const numeralTimings = RA.computeWordTimings('In 2026, Mia walked.', pcm, sr);
    expect(numeralTimings).toHaveLength(3); // In, Mia, walked
    expect(numeralTimings[2]).toBe(1000);

    const spanishTimings = RA.computeWordTimings('El niño rápido corrió.', pcm, sr);
    expect(spanishTimings).toHaveLength(4); // El, niño, rápido, corrió
    expect(spanishTimings[3]).toBe(1000);

    // Direct adapter render check on Spanish accented words: Bold start + karaoke highlight keep accented words whole!
    const dom = trackDom(new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>'));
    const doc = dom.window.document;
    const root = doc.getElementById('root');
    let progressCb = null;
    const ctx = {
      L: RA_ADAPTER.labels,
      root,
      el: (tag, attrs, children) => {
        const node = doc.createElement(tag);
        if (attrs) {
          for (const [k, v] of Object.entries(attrs)) {
            if (k === 'text') node.textContent = v;
            else if (k === 'hidden') node.hidden = !!v;
            else node.setAttribute(k, String(v));
          }
        }
        if (Array.isArray(children)) {
          for (const ch of children) {
            if (ch == null) continue;
            node.appendChild(typeof ch === 'string' ? doc.createTextNode(ch) : ch);
          }
        }
        return node;
      },
      fmt: (s, vals) => String(s).replace(/\{(\w+)\}/g, (_, k) => String(vals[k])),
      play: (_id, _r, onProgress) => { progressCb = onProgress; return new Promise(() => {}); },
      stop: () => {},
      support: () => {},
      isDone: () => false,
      practice: () => {},
    };
    const prep = RA_ADAPTER.prepare({
      lines: [{
        text: 'El niño rápido corrió.',
        syl: 'El ni·ño rá·pi·do co·rrió.',
        audio: 's1',
        timings: [200, 500, 800, 1000],
      }],
      lang: 'es',
      page: 1,
      pages: 1,
    });
    expect(prep.item.lines[0].timings).toEqual([200, 500, 800, 1000]);
    RA_ADAPTER.render(prep.item, ctx);

    // Enable Bold start: 4 whole words => 4 .ra-bionic strong tags (never split at ñ/á/ó!).
    root.querySelector('[data-read-along-bold]').click();
    const lineEl = root.querySelector('[data-read-along-line="1"]');
    expect(lineEl.textContent).toBe('El niño rápido corrió.');
    expect(lineEl.querySelectorAll('.ra-bionic')).toHaveLength(4);

    // Karaoke progress at 350/1000 highlights whole word "niño", at 650/1000 highlights "rápido", at 900/1000 highlights "corrió".
    lineEl.click();
    expect(typeof progressCb).toBe('function');
    progressCb(0.35, 1.0);
    expect(lineEl.querySelector('[data-word-active="true"]').textContent).toBe('niño');
    progressCb(0.65, 1.0);
    expect(lineEl.querySelector('[data-word-active="true"]').textContent).toBe('rápido');
    progressCb(0.9, 1.0);
    expect(lineEl.querySelector('[data-word-active="true"]').textContent).toBe('corrió');
  });

  it('preserves line.timings in readBack() and restores them into packets-read-along.js state.clips on reopen', async () => {
    const lineText = 'A well-known fox.';
    const savedTimings = [180, 440, 760, 1000];
    const made = RA.lessonFromReadAlong({
      loader,
      title: 'Timings Roundtrip',
      text: lineText,
      clips: { [lineText]: MP3_URI },
      timings: { [lineText]: savedTimings },
    });
    const built = RA.buildReadAlongPacket({ made, loader });

    const back = RA.readBack(VERIFY.readParts(built.html));
    expect(back.ok).toBe(true);
    expect(back.timings).toEqual({ [lineText]: savedTimings });

    // Reopen on packets-read-along.html and verify state.clips[k].timings survives and re-embeds!
    const dom = trackDom(new JSDOM(read('packets-read-along.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-read-along.html',
    }));
    const w = dom.window;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:ra-reopen';
    w.URL.revokeObjectURL = () => {};
    w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
    for (const file of ['word_sounds_take_home_loader.js', 'packet_read_along_builder.js', 'syllable_table_en.js', 'packets_voice_engine.js', 'packets_verify_core.js', 'packets_reopen.js', 'packets_handoff.js', 'packets_zip.js', 'packets-read-along.js']) {
      w.eval(read(file));
    }

    expect(w.AlloPacketReadAlongPage.reopen(built.html, 'timings.html')).toBe(true);
    expect(w.AlloPacketReadAlongPage.state.clips[lineText].timings).toEqual(savedTimings);
    const rebuiltParts = VERIFY.readParts(w.AlloPacketReadAlongPage.state.baseHtml);
    expect(rebuiltParts.lesson.blocks[0].items[0].lines[0].timings).toEqual(savedTimings);
  });
});

// ---------------------------------------------------------------------------
// Finding 6 [P1 Read-Along Parser / Print / Credits]
// ---------------------------------------------------------------------------
describe('Finding 6: Read-Along --- paragraph separation, picture-only credits/reopen, and U.S. abbreviation', () => {
  it('sets para: true alongside pageBreak: true on --- and keeps separate paragraphs in paper print & scroll preview', async () => {
    const raw = 'First page line.\n---\nSecond page line.';
    const rows = RA.splitPassage(raw);
    expect(rows).toHaveLength(2);
    expect(rows[1].pageBreak).toBe(true);
    expect(rows[1].para).toBe(true);

    const scrollMade = RA.lessonFromReadAlong({ loader, title: 'Scroll Breaks', text: raw, clips: {}, pageMode: 'scroll' });
    expect(scrollMade.lesson.blocks[0].items[0].lines[1].para).toBe(true);

    // Maker page paper & preview keep separate <p> nodes across --- in scroll mode.
    const dom = trackDom(new JSDOM(read('packets-read-along.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-read-along.html',
    }));
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:ra-breaks';
    w.URL.revokeObjectURL = () => {};
    w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
    for (const file of ['word_sounds_take_home_loader.js', 'packet_read_along_builder.js', 'syllable_table_en.js', 'packets_voice_engine.js', 'packets_verify_core.js', 'packets_reopen.js', 'packets_handoff.js', 'packets_zip.js', 'packets-read-along.js']) {
      w.eval(read(file));
    }
    if (d.readyState === 'loading') {
      await new Promise((r) => d.addEventListener('DOMContentLoaded', r, { once: true }));
    }

    d.getElementById('f-text').value = raw;
    d.getElementById('f-page-mode').value = 'scroll';
    d.getElementById('f-page-mode').dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(d.getElementById('file-problem').textContent).toBe('');
    expect([...d.querySelectorAll('#paper .paper-para')].map((p) => p.textContent)).toEqual(['First page line.', 'Second page line.']);
    expect([...d.querySelectorAll('#preview-card .ra-preview-p')].map((p) => p.textContent)).toEqual(['First page line.', 'Second page line.']);
  });

  it('does not emit Wiktionary/WordNet credits or flip #f-dict ON during reopen for picture-only Read-Along packets', async () => {
    const picOnly = RA.lessonFromReadAlong({
      loader,
      title: 'Pictures Only',
      text: 'The volcano rose over the fox.',
      clips: {},
      dictionary: null,
      pictures: (w) => (w === 'volcano' || w === 'fox') ? { uri: SVG_CIRCLE, label: w, set: 'mulberry' } : null,
    });
    expect(picOnly.dictionary).toBeNull();
    expect(picOnly.pictures && picOnly.pictures.count).toBe(2);

    const built = RA.buildReadAlongPacket({ made: picOnly, loader });
    expect(built.manifest.readAlong.dictionaryWords).toBeUndefined();
    expect(built.manifest.readAlong.pictureWords).toBe(2);
    const attrs = JSON.stringify(built.manifest.attributions || []);
    expect(attrs).toContain('Mulberry Symbols');
    expect(attrs).not.toMatch(/Wiktionary|WordNet|Word meanings:/i);

    const back = RA.readBack(VERIFY.readParts(built.html));
    expect(back.ok).toBe(true);
    expect(back.dictionary).toBe(false);
    expect(back.pictures).toBe(true);

    // Reopen on packets-read-along.html: #f-dict stays OFF while #f-dict-pics turns ON!
    const dom = trackDom(new JSDOM(read('packets-read-along.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-read-along.html',
    }));
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.URL.createObjectURL = () => 'blob:ra-piconly';
    w.URL.revokeObjectURL = () => {};
    w.crypto.subtle || Object.defineProperty(w, 'crypto', { value: webcrypto });
    for (const file of ['word_sounds_take_home_loader.js', 'packet_read_along_builder.js', 'syllable_table_en.js', 'packets_voice_engine.js', 'packets_verify_core.js', 'packets_reopen.js', 'packets_handoff.js', 'packets_zip.js', 'packets-read-along.js']) {
      w.eval(read(file));
    }
    if (d.readyState === 'loading') {
      await new Promise((r) => d.addEventListener('DOMContentLoaded', r, { once: true }));
    }
    expect(w.AlloPacketReadAlongPage.reopen(built.html, 'pic-only.html')).toBe(true);
    expect(d.getElementById('f-dict').checked).toBe(false);
    expect(d.getElementById('f-dict-pics').checked).toBe(true);
  });

  it('keeps U.S. joined before capitalized words like "The U.S. Constitution was signed."', () => {
    const rows = RA.splitPassage('The U.S. Constitution was signed. Then Congress met.');
    expect(rows.map((r) => r.text)).toEqual([
      'The U.S. Constitution was signed.',
      'Then Congress met.',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Finding 7 [P1 Parser Parity & CCC Order]
// ---------------------------------------------------------------------------
describe('Finding 7: Symbol Runner parseItems line cleaning & Math Practice CCC preview-remove mixed order', () => {
  it('strips BOM, numbering, bullets, and outer punctuation in parseItems and categorizes multi-letter words as "word"', () => {
    const items = SR.parseItems('\uFEFF1. b\n2. d\n(3) "cat,"\n• dog!\n- 12\n---');
    expect(items.map((it) => [it.word, it.answer, it.category])).toEqual([
      ['b', 'b', 'letter'],
      ['d', 'd', 'letter'],
      ['cat', 'cat', 'word'],
      ['dog', 'dog', 'word'],
      ['12', '12', 'number'],
    ]);
  });

  it('preserves deterministic mixed CCC order when removing a fact in Math Practice Preview', async () => {
    const dom = trackDom(new JSDOM(read('packets-math-practice.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-math-practice.html',
    }));
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    w.URL.createObjectURL = () => 'blob:mp-preview';
    w.URL.revokeObjectURL = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};

    let previewOpts = null;
    for (const s of d.querySelectorAll('script[src]')) {
      const src = s.getAttribute('src');
      w.eval(read(src));
      if (src === 'packets_handoff.js') {
        w.AlloPacketHandoff = Object.assign({}, w.AlloPacketHandoff, {
          hostPreview: (opts) => { previewOpts = opts; return { update: (u) => { previewOpts.latestHtml = u.html; } }; },
        });
      }
    }

    const $ = (id) => d.getElementById(id);
    const choose = (name, val) => {
      const r = d.querySelector(`input[name="${name}"][value="${val}"]`);
      r.checked = true;
      r.dispatchEvent(new w.Event('change', { bubbles: true }));
    };
    const until = async (fn, msg) => {
      for (let i = 0; i < 300; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 10)); }
      throw new Error('Timed out: ' + msg);
    };

    choose('kind', 'mul');
    choose('set', 'mul-7');
    $('next-1').click();
    choose('method', 'ccc');
    $('next-2').click();
    await until(() => previewOpts && previewOpts.html, 'preview hosted');

    const initialWords = VERIFY.readParts(previewOpts.html).lesson.blocks[0].items.map((it) => it.word);
    const countingOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => '7 × ' + n);
    expect(initialWords).toHaveLength(10);
    expect(initialWords).not.toEqual(countingOrder);

    // Remove card index 0 via Preview action -> remaining 9 cards MUST keep the family's mixed order!
    const res = await previewOpts.onAction({ action: 'remove', index: 0 });
    expect(res && res.html).toBeTruthy();
    const afterWords = VERIFY.readParts(res.html).lesson.blocks[0].items.map((it) => it.word);
    expect(afterWords).toEqual(initialWords.slice(1));
    expect(afterWords).not.toEqual(countingOrder.filter((w2) => w2 !== initialWords[0]));
  });
});

// ---------------------------------------------------------------------------
// Finding 8 [P2 Shared Helper Resilience & Math Check Parentheses]
// ---------------------------------------------------------------------------
describe('Finding 8: Shared helper resilience (vocab_media, vocab_bank) & Math Check parenthesized expressions', () => {
  it('packets_vocab_media upgrades previously cached WAV clips to MP3 once readyKit resolves and times out stalled kit scripts', async () => {
    vi.useFakeTimers();
    const dom = trackDom(new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://packets.test/packets-vocab.html',
    }));
    const w = dom.window;
    let resolveMp3 = null;
    const mp3Spy = vi.fn(() => MP3_URI);
    w.AlloPacketAudioKit = {
      getMp3: () => new Promise((r) => { resolveMp3 = r; }),
      wavUriToMp3Uri: mp3Spy,
    };
    w.fetch = vi.fn(async (url) => {
      if (url === 'word_audio_shards/index.json') {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({
            format: 'alloflow-word-audio-index/1',
            shards: { s1: { file: 's1.json', bytes: 100 } },
            words: { habitat: 's1' },
          }),
        };
      }
      return { ok: true, status: 200, text: async () => JSON.stringify({ habitat: WEBM_URI }) };
    });
    const loaderStub = {
      portableAudio: vi.fn(async (todo) => {
        for (const k of Object.keys(todo.audio)) todo.audio[k] = WAV_URI;
      }),
    };
    w.eval(read('packets_vocab_media.js'));

    // First call hits KIT_WAIT_MS (1500ms) before getMp3 resolves -> falls back to WAV.
    const firstP = w.AlloVocabMedia.clips(['habitat'], loaderStub);
    await vi.advanceTimersByTimeAsync(1600);
    const first = await firstP;
    expect(first.habitat).toBe(WAV_URI);
    expect(mp3Spy).not.toHaveBeenCalled();

    // Now the audio kit finishes loading -> second clips() call upgrades the cached WAV to MP3!
    resolveMp3(true);
    await Promise.resolve();
    await Promise.resolve();
    const second = await w.AlloVocabMedia.clips(['habitat'], loaderStub);
    expect(second.habitat).toBe(MP3_URI);
    expect(mp3Spy).toHaveBeenCalledTimes(1);

    // Third call already cached MP3 -> does not re-encode.
    const third = await w.AlloVocabMedia.clips(['habitat'], loaderStub);
    expect(third.habitat).toBe(MP3_URI);
    expect(mp3Spy).toHaveBeenCalledTimes(1);

    // Separate sandbox: stalled script tag times out after 15s, removes script, and resets gettingKit so retry works.
    const dom2 = trackDom(new JSDOM('<!doctype html><html><head></head><body></body></html>', {
      runScripts: 'outside-only',
      url: 'https://packets.test/packets-vocab.html',
    }));
    const w2 = dom2.window;
    w2.fetch = w.fetch;
    w2.eval(read('packets_vocab_media.js'));
    const storeP = w2.AlloVocabMedia.store();
    await storeP;
    expect(w2.document.head.querySelectorAll('script[src="packets_audio_kit.js"]')).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(15100);
    expect(w2.document.head.querySelectorAll('script[src="packets_audio_kit.js"]')).toHaveLength(0);
  });

  it('packets_vocab_bank_en validates shard indices in add(), strips BOM on text(), and aborts/times out stalled shard fetches', async () => {
    const code = read('packets_vocab_bank_en.js');
    const makeBank = (extraRoot = {}) => {
      const root = Object.assign({}, extraRoot);
      new Function('window', 'module', code)(root, undefined);
      return root.AlloVocabBank;
    };

    // Bounds guard in add()
    const bank1 = makeBank();
    const validShard1 = { version: 1, part: 1, words: [['alpha', [['n1', 'First letter', '', 's', 0, '']]]] };
    const validShard2 = { version: 1, part: 2, words: [['beta', [['n1', 'Second letter', '', 's', 0, '']]]] };
    expect(bank1.add(validShard1, 0)).toBe(0);
    expect(bank1.add(validShard1, -1)).toBe(0);
    expect(bank1.add(validShard1, 99)).toBe(0);
    expect(bank1.add(validShard1, 1.5)).toBe(0);
    expect(bank1.add(validShard1, 'bad')).toBe(0);
    expect(bank1.ready()).toBe(false);
    expect(bank1.add(validShard1, 1)).toBe(1);
    expect(bank1.ready()).toBe(false);
    expect(bank1.add(validShard2, 2)).toBe(1);
    expect(bank1.ready()).toBe(true);
    expect(bank1.has('alpha')).toBe(true);
    expect(bank1.has('beta')).toBe(true);

    // Timeout + AbortController + recovery on retry + BOM-safe parse
    let aborted = 0;
    const bank2 = makeBank({ AbortController, setTimeout, clearTimeout });
    await expect(bank2.load({
      timeoutMs: 30,
      fetch: (_url, init) => new Promise((_resolve, reject) => {
        if (init && init.signal) {
          init.signal.addEventListener('abort', () => { aborted++; reject(new Error('aborted')); });
        }
      }),
    })).rejects.toThrow(/timed out/i);
    expect(aborted).toBeGreaterThanOrEqual(1);
    expect(bank2.ready()).toBe(false);

    // Subsequent load() succeeds even with UTF-8 BOM in text() responses!
    await bank2.load({
      fetch: async (url) => {
        const body = url.endsWith('en-1.json') ? validShard1 : validShard2;
        return { ok: true, status: 200, text: async () => '\uFEFF' + JSON.stringify(body) };
      },
    });
    expect(bank2.ready()).toBe(true);
    expect(bank2.has('alpha')).toBe(true);
  });

  it('formats and speaks parenthesized binary operators in math_computation.js and packets-check.js paper copy', async () => {
    const cases = [
      ['(2 + 3) x 4', 20, '(2 + 3) \u00D7 4', '(2 + 3) times 4'],
      ['4 * (2 + 3)', 20, '4 \u00D7 (2 + 3)', '4 times (2 + 3)'],
      ['20 / (2 + 3)', 4, '20 \u00F7 (2 + 3)', '20 divided by (2 + 3)'],
      ['(10 + 10) / 5', 4, '(10 + 10) \u00F7 5', '(10 + 10) divided by 5'],
      ['(10 + 2) - (3 + 1)', 8, '(10 + 2) \u2212 (3 + 1)', '(10 + 2) minus (3 + 1)'],
      ['10-(2 + 3)', 5, '10 \u2212 (2 + 3)', '10 minus (2 + 3)'],
      ['(-5) + 8', 3, '(\u22125) + 8', '(minus 5) + 8'],
    ];
    for (const [display, answer, expectedShown, expectedSpoken] of cases) {
      const prepared = MATH_ADAPTER.prepare({ display, answer });
      expect(prepared.item, display).toBeTruthy();
      expect(prepared.item.shown, display + ' shown').toBe(expectedShown);

      const dom = trackDom(new JSDOM('<!doctype html><html><body><div id="r"></div></body></html>'));
      const doc = dom.window.document;
      let capturedLabel = '';
      MATH_ADAPTER.render(prepared.item, {
        L: MATH_ADAPTER.labels,
        root: doc.getElementById('r'),
        el: (tag, attrs) => {
          const n = doc.createElement(tag);
          if (attrs && attrs.text) n.textContent = attrs.text;
          return n;
        },
        fmt: (tpl, vals) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => String(vals[k])),
        keypad: (opts) => { capturedLabel = opts.label; return { node: doc.createElement('div'), focus: () => {}, lock: () => {} }; },
        noFocus: true,
      });
      expect(capturedLabel, display + ' spoken').toContain(expectedSpoken);
    }

    // packets-check.js paper sheet renders typographic × / ÷ / − for parenthesized expressions.
    const dom = trackDom(new JSDOM(read('packets-check.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/site/packets-check.html',
    }));
    const w = dom.window;
    const d = w.document;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    w.URL.createObjectURL = () => 'blob:paper-parens';
    w.URL.revokeObjectURL = () => {};
    w.HTMLElement.prototype.scrollIntoView = () => {};
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));

    const $ = (id) => d.getElementById(id);
    const until = async (fn, msg) => {
      for (let i = 0; i < 300; i++) { if (fn()) return; await new Promise((r) => setTimeout(r, 10)); }
      throw new Error('Timed out: ' + msg);
    };

    d.querySelector('input[name="check"][value="own"]').checked = true;
    d.querySelector('input[name="check"][value="own"]').dispatchEvent(new w.Event('change', { bubbles: true }));
    $('f-problems').value = '(2 + 3) x 4 = 20\n20 / (2 + 3) = 4\n10 - (2 + 3) = 5';
    $('f-problems').dispatchEvent(new w.Event('input', { bubbles: true }));
    await until(() => $('own-list').children.length === 3, '3 own paren problems');
    $('next-1').click();
    $('next-2').click();
    await until(() => $('paper-items-1').children.length === 3, 'paper rendered');

    const lines = [...$('paper-items-1').querySelectorAll('.pl')].map((el) => el.textContent.replace(/\s+/g, ' ').trim());
    expect(lines).toEqual([
      '(2 + 3) \u00D7 4 =',
      '20 \u00F7 (2 + 3) =',
      '10 \u2212 (2 + 3) =',
    ]);
  });
});
