// @vitest-environment jsdom
// Wave 7A regression tests (2026-11-19):
// 1. sound_sort & word_families keep full labels on repeatMissed (-again) rounds.
// 2. takeHomePictures preserves handle.replay/opening/payoff/allowRevisit (fixing R replay on pictured activities).
// 3. blending "Stop audio" calls ctx.stop() + 6 audio-chain adapters halt on ok===false (and read_passage checks isConnected).
// 4. e.repeat, IME (keyCode 229), and 250ms trusted-key mount guards in takeHomeKeypad, symbol_runner, and takeHomeShell.
// 5. Real-world paste resilience across math-practice, check builder, vocab, voice, symbol-runner + Vocab #rehearse= multi-word phrases + unified .txt roster hygiene.
// 6. Targeted fixes: packets-pictures usePicture staleness & repeat guard, quantity_discrimination ArrowLeft/ArrowRight focus,
//    read_along syllableText single-quoted words, and math_computation spoken SR operators + unspaced display signs.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const core = new Function(readFileSync('word_sounds_core.js', 'utf8') + ';return createWordSoundsCore();')();
delete window.AlloWordSoundsTakeHome;
new Function(readFileSync('word_sounds_take_home_loader.js', 'utf8'))();
const TH = window.AlloWordSoundsTakeHome;
delete window.AlloPacketMathPractice;
new Function(readFileSync('packet_math_practice_builder.js', 'utf8'))();
const MP = window.AlloPacketMathPractice;
delete window.AlloPacketChecks;
new Function(readFileSync('packet_check_builder.js', 'utf8'))();
const PC = window.AlloPacketChecks;
delete window.AlloPacketVocab;
new Function(readFileSync('packet_vocab_builder.js', 'utf8'))();
const PV = window.AlloPacketVocab;
delete window.AlloPacketReadAlong;
new Function(readFileSync('packet_read_along_builder.js', 'utf8'))();
const RA = window.AlloPacketReadAlong;
delete window.AlloSymbolRunnerCore;
new Function(readFileSync('symbol_runner_core.js', 'utf8'))();
const SRC = window.AlloSymbolRunnerCore;
delete window.AlloPacketSymbolRunner;
new Function(readFileSync('packet_symbol_runner_builder.js', 'utf8'))();
const SRB = window.AlloPacketSymbolRunner;

const opened = [];
afterEach(() => { while (opened.length) { try { opened.pop().close(); } catch (_) {} } });

const wav = (tag) => {
  const b = Buffer.alloc(64);
  b.write('RIFF');
  b.write('WAVE', 8);
  b.write(String(tag).slice(0, 8), 44);
  return 'data:audio/wav;base64,' + b.toString('base64');
};

function makeEl(doc) {
  return function el(tag, attrs, children) {
    const node = doc.createElement(tag);
    Object.keys(attrs || {}).forEach((k) => {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'on') Object.keys(attrs.on).forEach((ev) => node.addEventListener(ev, attrs.on[ev]));
      else if (attrs[k] !== false && attrs[k] != null) node.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (children || []).forEach((c) => { if (c) node.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return node;
  };
}

function fmt(tpl, params) {
  return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (params && params[k] != null ? params[k] : m));
}

function openHtml(html, url = 'https://packet.test/p.html') {
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url });
  opened.push(dom.window);
  return { w: dom.window, d: dom.window.document };
}

describe('1. sound_sort & word_families keep all labels on repeatMissed (-again) items', () => {
  it('renders non-empty headings, counters, Listen/Choose labels, and feedback when item.id ends in -again', () => {
    for (const id of ['sound_sort', 'word_families']) {
      const adapter = TH.ADAPTERS[id];
      const root = document.createElement('div');
      document.body.appendChild(root);
      try {
        const L = Object.assign({}, TH.DEFAULT_LABELS, adapter.labels);
        const item = id === 'sound_sort'
          ? { id: 'sound_sort-1-again', word: 'cat', mode: 'first', sound: 'k', wordAudio: 'a0', instruction: ['a1'],
              chips: [{ text: 'cup', audio: 'a2', member: true }, { text: 'dog', audio: 'a3', member: false }] }
          : { id: 'word_families-2-again', word: 'cat', mode: 'rime', rime: 'at', wordAudio: 'a0', instruction: ['a1'],
              chips: [{ text: 'hat', audio: 'a2', member: true }, { text: 'sun', audio: 'a3', member: false }] };
        let answerOpts = null;
        adapter.render(item, {
          root, el: makeEl(document), fmt, L, item, showLetters: true, skipDirections: true,
          play: () => Promise.resolve(true), stop: () => {}, support: () => {}, announce: () => {},
          isDone: () => false, attempts: () => 0, sound: (s) => '/' + s + '/',
          answer: (_r, _ok, opts) => { answerOpts = opts; return 'correct'; },
        });
        expect(root.textContent).toContain('0 of 1 found');
        expect(root.querySelectorAll('li.choice button').length).toBe(4);
        const listenBtn = root.querySelector('li.choice button:not(.primary)');
        const chooseBtn = root.querySelector('li.choice button.primary');
        expect(listenBtn.textContent).toContain('Listen');
        expect(listenBtn.getAttribute('aria-label')).toBeTruthy();
        expect(chooseBtn.getAttribute('aria-label')).toBeTruthy();
        chooseBtn.click();
        expect(answerOpts && answerOpts.correctText).toBeTruthy();
      } finally {
        root.remove();
      }
    }
  });
});

describe('2. takeHomePictures preserves handle.replay, opening, payoff, allowRevisit', () => {
  it('forwards all non-reveal handle properties while still revealing and naming the picture', () => {
    let replayed = 0, paid = 0, revealed = 0;
    const opening = Promise.resolve(true);
    const wrapped = TH._pictures({
      blending: () => ({
        replay: () => { replayed++; return true; },
        opening,
        payoff: () => { paid++; },
        allowRevisit: true,
        reveal: () => { revealed++; },
      }),
    }, { blending: 'after' }, TH.PICTURE_LABELS);
    const root = document.createElement('div');
    const handle = wrapped.blending({ word: 'cat', wordPicture: 'm0' }, {
      root, el: makeEl(document), fmt, image: () => 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      answer: () => 'correct',
    });
    expect(handle.opening).toBe(opening);
    expect(handle.allowRevisit).toBe(true);
    expect(handle.replay()).toBe(true);
    handle.payoff();
    handle.reveal(true);
    expect([replayed, paid, revealed]).toEqual([1, 1, 1]);
    const img = root.querySelector('img.picture');
    expect(img.getAttribute('alt')).toBe('Picture of cat');
    expect(root.querySelector('[data-word-picture]').hidden).toBe(false);
  });
});

describe('3. blending Stop audio + ok===false chain guards + read_passage isConnected guard', () => {
  it('blending Stop audio invokes ctx.stop() and carries data-stop-audio; chains halt cleanly on ok===false', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    try {
      const L = Object.assign({}, TH.DEFAULT_LABELS, TH.ADAPTERS.blending.labels);
      let stops = 0, plays = 0;
      const item = {
        id: 'blending-1', word: 'cat', target: 'cat', instruction: 'i0', question: 'q0',
        sounds: ['s1', 's2', 's3'],
        choices: [{ text: 'cat', audio: 'c1' }, { text: 'dog', audio: 'c2' }],
      };
      TH.ADAPTERS.blending.render(item, {
        root, el: makeEl(document), fmt, L, item, showLetters: true, skipDirections: true,
        soundGap: () => 0,
        play: () => { plays++; return Promise.resolve(false); },
        stop: () => { stops++; }, support: () => {}, announce: () => {}, isDone: () => false, attempts: () => 0,
        answer: () => 'correct',
      });
      await new Promise((r) => setTimeout(r, 30));
      // Opening failed on its very first clip -> halted instead of firing all 6 clips.
      expect(plays).toBe(1);
      const stopBtn = root.querySelector('[data-stop-audio]');
      expect(stopBtn).toBeTruthy();
      stopBtn.click();
      expect(stops).toBe(1);
    } finally {
      root.remove();
    }
  });

  it('read_passage readBack stops when disconnected or when a clip resolves false', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const L = Object.assign({}, TH.DEFAULT_LABELS, TH.ADAPTERS.read_passage.labels);
    const item = {
      id: 'read_passage-1', word: 'cat', target: 'cat',
      lines: [{ before: 'The ', after: ' sat.', answer: 'cat' }, { text: 'It ran.' }],
      options: ['cat', 'dog'],
      readBack: ['r1', 'r2'], readBackByLine: true,
    };
    let plays = 0;
    const handle = TH.ADAPTERS.read_passage.render(item, {
      root, el: makeEl(document), fmt, L, item, showLetters: true, image: () => null,
      play: () => {
        plays++;
        if (plays === 1) root.remove();
        return Promise.resolve(true);
      },
      stop: () => {}, support: () => {}, announce: () => {}, isDone: () => true, attempts: () => 1,
      answer: () => 'correct',
    });
    handle.payoff();
    await new Promise((r) => setTimeout(r, 30));
    expect(plays).toBe(1);
  });
});

describe('4. Keyboard e.repeat, IME (229), and 250ms trusted-key mount guards', () => {
  it('takeHomeKeypad ignores repeat/IME Enter and repeat digits on keypad grid', () => {
    const made = MP.buildMathPracticePacket({
      lesson: MP.lessonFromMathPractice({ loader: TH, mode: 'ccc', facts: [{ a: 7, b: 8, op: 'mul' }] }),
      loader: TH,
    });
    const { w, d } = openHtml(made.html);
    d.getElementById('learner-name').value = 'Ana';
    d.querySelector('#app button.primary').click();
    d.querySelector('[data-cover]').click();
    const input = d.querySelector('[data-pad-input]');
    const btn5 = d.querySelector('[data-key="5"]');
    btn5.focus();
    btn5.dispatchEvent(new w.KeyboardEvent('keydown', { key: '5', repeat: true, bubbles: true, cancelable: true }));
    expect(input.value).toBe('');
    btn5.dispatchEvent(new w.KeyboardEvent('keydown', { key: '5', bubbles: true, cancelable: true }));
    btn5.dispatchEvent(new w.KeyboardEvent('keydown', { key: '6', bubbles: true, cancelable: true }));
    expect(input.value).toBe('56');
    input.focus();
    input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    const ime = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(ime, 'keyCode', { value: 229 });
    input.dispatchEvent(ime);
    expect(d.querySelector('[data-feedback]').textContent).toBe('');
    input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(d.querySelector('[data-feedback]').textContent).toContain('Yes!');
  });

  it('symbol_runner textInput ignores repeat and IME (229) Enter', () => {
    const made = SRB.buildSymbolRunnerPacket({ loader: TH, mode: 'custom', items: 'cat, dog, sun', control: 'typed', packetMode: 'practice' });
    const { w, d } = openHtml(made.html);
    d.getElementById('learner-name').value = 'Ana';
    d.querySelector('#app button.primary').click();
    const input = d.querySelector('[data-sr-input]');
    expect(input).toBeTruthy();
    input.value = 'wrongword';
    input.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    const ime = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    Object.defineProperty(ime, 'keyCode', { value: 229 });
    input.dispatchEvent(ime);
    expect(d.querySelector('[data-feedback]').textContent).toBe('');
  });

  it('takeHomeShell ignores trusted answer keys within 250ms of mount while allowing R replay immediately', () => {
    const banks = {
      isolation: { '1st': wav('q1') },
      phonemes: { k: wav('k'), a: wav('a'), t: wav('t'), m: wav('m') },
      instructions: { fb_great_job: wav('gj'), fb_try_again_listen: wav('ta') },
    };
    const pack = [{
      word: 'cat', targetWord: 'cat', term: 'cat',
      _ttsAssets: { cat: { mime: 'audio/wav', base64: wav('cat').split(',')[1] } },
      activityItems: { isolation: { position: 0, correctSound: 'k', options: ['k', 'a', 't', 'm'] } },
    }];
    const lesson = TH.lessonFromPack(pack, { core, banks, title: 'Mount Guard' }).lesson;
    const html = TH.buildHtml(lesson, { core });
    const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packet.test/p.html' });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    let fakeNow = 10000;
    w.Date.now = () => fakeNow;
    const keyHandlers = [];
    const origAdd = d.addEventListener.bind(d);
    d.addEventListener = (type, fn, opts) => {
      if (type === 'keydown') keyHandlers.push(fn);
      return origAdd(type, fn, opts);
    };
    for (const s of d.querySelectorAll('script:not([type="application/json"])')) w.eval(s.textContent);
    d.getElementById('learner-name').value = 'Ana';
    d.querySelector('#app button.primary').click();
    const fireTrusted = (key) => {
      let prevented = false;
      const ev = { key, code: key === 'r' ? 'KeyR' : 'Digit' + key, isTrusted: true, target: d.body, defaultPrevented: false, ctrlKey: false, metaKey: false, altKey: false, repeat: false, isComposing: false, keyCode: 0, preventDefault() { prevented = true; } };
      keyHandlers.forEach((fn) => fn(ev));
      return prevented;
    };
    // Trusted key '1' at t=0ms after mount is ignored.
    expect(fireTrusted('1')).toBe(false);
    expect(d.querySelector('[data-feedback]').textContent).toBe('');
    // Trusted 'r' replay works immediately at t=0ms.
    expect(fireTrusted('r')).toBe(true);
    // Trusted key '1' after 300ms succeeds.
    fakeNow += 300;
    expect(fireTrusted('1')).toBe(true);
    expect(d.querySelector('[data-feedback]').textContent).not.toBe('');
  });
});

describe('5. Real-world paste resilience, Vocab #rehearse= multi-word phrases, and unified .txt roster hygiene', () => {
  it('parseFacts, parseProblems, parseWords, and customSymbolReport accept pasted numbered/bulleted/typographic worksheets', () => {
    const facts = MP.parseFacts('\uFEFF1. 7 x 8 =\n2) 12 \u2013 5 = ?\n\u2022 6 \u00B7 4 = ___\n- 20 \u00F7 4 = 5');
    expect(facts).toEqual([
      { a: 7, b: 8, op: 'mul' },
      { a: 12, b: 5, op: 'sub' },
      { a: 6, b: 4, op: 'mul' },
      { a: 20, b: 4, op: 'div' },
    ]);

    const probs = PC.parseProblems('\uFEFF1. 7 + 8 =\n2) 12 \u2013 5 = ?\n\u2022 6 \u00B7 4 = ___\n(4) 3 - 5 = \u22122');
    expect(probs).toEqual([
      { a: 7, b: 8, op: 'add' },
      { a: 12, b: 5, op: 'sub' },
      { a: 6, b: 4, op: 'mul' },
      { display: '3 - 5', answer: -2 },
    ]);

    const vocab = PV.parseWords('\uFEFF1. habitat\n2) "predator."\n\u2022 water cycle\n- food web');
    expect(vocab.unusable).toEqual([]);
    expect(vocab.words.map((w) => w.word)).toEqual(['habitat', 'predator', 'water cycle', 'food web']);

    const sr = SRC.customSymbolReport('\uFEFF1. cat\n2) "dog."\n\u2022 bird\n- fish');
    expect(sr.skipped).toEqual([]);
    expect(sr.items.map((x) => x.display)).toEqual(['cat', 'dog', 'bird', 'fish']);
    // Plain number lists remain intact.
    expect(SRC.customSymbolReport('1, 2, 3').items.map((x) => x.display)).toEqual(['1', '2', '3']);
  });

  it('packets-voice.js readWords accepts pasted numbered/bulleted/punctuated lists', async () => {
    const dom = new JSDOM(readFileSync('packets-voice.html', 'utf8'), { runScripts: 'outside-only', url: 'https://packets.test/packets-voice.html' });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    w.AlloPacketMyWords = {
      available: () => Promise.resolve(true),
      getMany: () => Promise.resolve({}),
      onChange: () => {},
    };
    for (const s of d.querySelectorAll('script[src]')) w.eval(readFileSync(s.getAttribute('src'), 'utf8'));
    d.dispatchEvent(new w.Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 30));
    d.getElementById('f-words').value = '\uFEFF1. habitat\n2) "predator."\n\u2022 prey\n- adapt';
    d.getElementById('f-words').dispatchEvent(new w.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 260));
    expect(d.getElementById('words-said').textContent).toBe('');
    expect(d.getElementById('word-rows').textContent).toContain('habitat');
    expect(d.getElementById('word-rows').textContent).toContain('predator');
    expect(d.getElementById('word-rows').textContent).toContain('prey');
    expect(d.getElementById('word-rows').textContent).toContain('adapt');
  });

  it('packets-vocab.js preserves multi-word #rehearse= phrases and cleans >2400-char BOM/numbered/TSV/CSV .txt rosters', async () => {
    const dom = new JSDOM(readFileSync('packets-vocab.html', 'utf8'), {
      runScripts: 'outside-only',
      url: 'https://packets.test/packets-vocab.html#rehearse=water%20cycle,food%20web,cause%20and%20effect,energy%20transfer',
    });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    for (const s of d.querySelectorAll('script[src]')) w.eval(readFileSync(s.getAttribute('src'), 'utf8'));
    expect(d.getElementById('f-words').value.split('\n')).toEqual(['water cycle', 'food web', 'cause and effect', 'energy transfer']);

    // Build a 45-line roster > 2400 bytes with BOM, numbering, bullets, TSV, and CSV columns.
    const lines = [
      '\uFEFF1. BlueHeron01\tGroup A',
      '2) "RedFox02",Grade 2',
      '\u2022 GreenTurtle03\tPeriod 1',
      '- YellowFinch04,Section B',
    ];
    for (let i = 5; i <= 45; i++) lines.push(`${i}. StudentCode${String(i).padStart(2, '0')}\t${'ExtraColumnPaddingValue'.repeat(3)}`);
    const payload = lines.join('\r\n');
    expect(payload.length).toBeGreaterThan(2400);
    const roster = new w.File([payload], 'roster.txt', { type: 'text/plain' });
    Object.defineProperty(d.getElementById('batch-file'), 'files', { configurable: true, value: [roster] });
    d.getElementById('batch-file').dispatchEvent(new w.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 40));
    expect(d.getElementById('batch-make').textContent).toBe('Save .zip for 40 students');
    expect(d.getElementById('batch-said').textContent).toContain('Not used: 5 more code names.');
    expect(d.getElementById('batch-said').textContent).not.toContain('Group A');
  });
});

describe('6. Targeted fixes: pictures staleness/repeat, QD arrows, Read-Along quotes, math_computation SR operators', () => {
  it('quantity_discrimination supports focus-only ArrowLeft/ArrowRight without auto-submitting', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    try {
      const L = Object.assign({}, TH.CHECK_LABELS, TH.CHECK_ADAPTERS.quantity_discrimination.labels);
      let keyFn = null, answers = 0;
      TH.CHECK_ADAPTERS.quantity_discrimination.render({ left: 4, right: 9 }, {
        root, el: makeEl(document), fmt, L, isDone: () => false,
        keys: (fn) => { keyFn = fn; },
        answer: () => { answers++; },
      });
      const btns = root.querySelectorAll('button[data-choice]');
      expect(keyFn('ArrowRight')).toBe(true);
      expect(document.activeElement).toBe(btns[1]);
      expect(keyFn('ArrowLeft')).toBe(true);
      expect(document.activeElement).toBe(btns[0]);
      expect(answers).toBe(0);
    } finally {
      root.remove();
    }
  });

  it('packet_read_along_builder syllableText splits single-quoted words while keeping contractions/possessives whole', () => {
    const table = { butterfly: ['but', 'ter', 'fly'], tomorrow: ['to', 'mor', 'row'], ladder: ['lad', 'der'], afternoon: ['af', 'ter', 'noon'], didn: ['did', 'n'], dogs: ['do', 'gs'], clock: ['cl', 'ock'] };
    const lookup = (w) => table[w] || null;
    expect(RA.syllableText("She said 'butterfly' softly.", lookup)).toBe("She said 'but\u00B7ter\u00B7fly' softly.");
    expect(RA.syllableText('She said \u2018tomorrow\u2019 softly.', lookup)).toBe('She said \u2018to\u00B7mor\u00B7row\u2019 softly.');
    expect(RA.syllableText("He shouted, 'Tomorrow!'", lookup)).toBe("He shouted, 'To\u00B7mor\u00B7row!'");
    // Contractions, possessives, and elisions stay untouched.
    expect(RA.syllableText("She didn't go at o'clock.", lookup)).toBe('');
    expect(RA.syllableText("The dogs' ladder.", lookup)).toBe("The dogs' lad\u00B7der.");
    expect(RA.syllableText("'tis an afternoon.", lookup)).toBe("'tis an af\u00B7ter\u00B7noon.");
  });

  it('math_computation normalizes unspaced custom signs and speaks minus/times/divided by in aria-label', () => {
    const prep1 = TH.CHECK_ADAPTERS.math_computation.prepare({ display: '12-5', answer: 7 }).item;
    const prep2 = TH.CHECK_ADAPTERS.math_computation.prepare({ display: '6x4', answer: 24 }).item;
    const prep3 = TH.CHECK_ADAPTERS.math_computation.prepare({ display: '20/4', answer: 5 }).item;
    expect(prep1.shown).toBe('12 \u2212 5');
    expect(prep2.shown).toBe('6 \u00D7 4');
    expect(prep3.shown).toBe('20 \u00F7 4');

    const labels = [prep1, prep2, prep3].map((item) => {
      const root = document.createElement('div');
      let padLabel = '';
      TH.CHECK_ADAPTERS.math_computation.render(item, {
        root, el: makeEl(document), fmt, L: TH.CHECK_ADAPTERS.math_computation.labels,
        keypad: (opts) => { padLabel = opts.label; return { node: document.createElement('div'), focus: () => {}, lock: () => {} }; },
        answer: () => {},
      });
      return padLabel;
    });
    expect(labels).toEqual([
      '12 minus 5. Type the answer.',
      '6 times 4. Type the answer.',
      '20 divided by 4. Type the answer.',
    ]);
  });

  it('packets-pictures.js ignores stale usePicture completion after word changes and ignores repeat Enter', async () => {
    const dom = new JSDOM(readFileSync('packets-pictures.html', 'utf8'), { runScripts: 'outside-only', url: 'https://packets.test/packets-pictures.html' });
    opened.push(dom.window);
    const w = dom.window, d = w.document;
    let resolveCopy = null;
    let searchCalls = 0;
    w.fetch = (url) => {
      if (String(url).includes('/thumb/')) {
        return new Promise((res) => { resolveCopy = () => res({ ok: true, blob: () => Promise.resolve(new w.Blob(['png'], { type: 'image/png' })) }); });
      }
      searchCalls++;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          results: [{ id: '11111111-2222-3333-4444-555555555555', title: 'Cat', creator: 'Ada', license: 'cc0', license_version: '1.0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/', foreign_landing_url: 'https://openverse.org/1', mature: false }],
        }),
      });
    };
    const saved = {};
    w.AlloPacketMyWords = {
      LIMITS: { pictureSide: 320 },
      available: () => Promise.resolve(true),
      onChange: () => {},
      normalizeWord: (v) => String(v || '').trim().toLowerCase().replace(/[^a-z]/g, ''),
      creditLine: () => 'Cat by Ada (CC0)',
      resizeToDataUri: () => Promise.resolve('data:image/png;base64,AAAA'),
      put: (word, patch) => { saved[word] = { word, picture: patch.picture }; return Promise.resolve(saved[word]); },
      list: () => Promise.resolve(Object.keys(saved).map((word) => ({ word, picture: true }))),
      getMany: () => Promise.resolve(saved),
    };
    w.eval(readFileSync('packets-pictures.js', 'utf8'));
    d.dispatchEvent(new w.Event('DOMContentLoaded'));
    await new Promise((r) => setTimeout(r, 20));
    d.getElementById('online-on').checked = true;
    d.getElementById('online-on').dispatchEvent(new w.Event('change', { bubbles: true }));
    const wordInput = d.getElementById('word');
    wordInput.value = 'cat';
    wordInput.dispatchEvent(new w.Event('input', { bubbles: true }));
    // Repeated Enter does not trigger search.
    wordInput.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    expect(searchCalls).toBe(0);
    // Normal Enter triggers search.
    wordInput.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 40));
    expect(searchCalls).toBeGreaterThan(0);
    const useBtn = d.querySelector('#pics-openverse button');
    expect(useBtn).toBeTruthy();
    useBtn.click();
    // Teacher switches word to 'dog' before copy resolves.
    wordInput.value = 'dog';
    wordInput.dispatchEvent(new w.Event('input', { bubbles: true }));
    resolveCopy();
    await new Promise((r) => setTimeout(r, 40));
    // Stale 'cat' copy must NOT show #saved banner under 'dog'.
    expect(d.getElementById('saved').hidden).toBe(true);
    expect(saved.cat).toBeTruthy();
  });
});
