// @vitest-environment jsdom
// Make Symbol Runner practice, 2026-11-17 (reports/packets_review_2026-11-16.md: D2, D9, 2.2 Stroop and rapid naming, 2.3).
// 1. Microphone off: the page never starts the browser's speech recognition, and has no microphone box.
// 2. The shared maker layout: step tabs, "The file is ready", Try it then Save the file, "Saved. What to do next",
//    "Make one for each student" in its own fold, the footer, the details panel's rule and file list.
// 3. Plain names for the choices, each with one line under it. Internal ids unchanged.
// 4. Stroop inks reach 3:1 on white and on light gray; the shape does not give the ink away; congruent is on every item.
// 5. No link to Find a picture (pictures saved there never reach Symbol Runner).
// 6. The builder's copy in desktop/web-app/public is the same file.
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (f) => fs.readFileSync(f, 'utf8');
const squash = (s) => String(s || '').replace(/\s+/g, ' ').trim();

const opened = [];
afterEach(() => {
  while (opened.length) {
    try { opened.pop().window.close(); } catch (_) {}
  }
});

const PAGE_SCRIPTS = [
  'packets-page.js', 'packets_zip.js', 'packets_verify_core.js', 'word_sounds_take_home_loader.js',
  'word_picture_matcher.js', 'symbol_runner_core.js', 'packet_symbol_runner_builder.js', 'packets-symbol-runner.js',
];

function openPage(hooks = {}) {
  const dom = new JSDOM(read('packets-symbol-runner.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.example/packets-symbol-runner.html',
  });
  opened.push(dom);
  const w = dom.window;
  w.matchMedia = () => ({ matches: true });
  w.TextEncoder = TextEncoder;
  w.TextDecoder = TextDecoder;
  w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
  w.URL.createObjectURL = () => 'blob:sr-test';
  w.URL.revokeObjectURL = () => {};
  if (hooks.before) hooks.before(w);
  for (const src of PAGE_SCRIPTS) {
    w.eval(read(src));
    if (src === 'symbol_runner_core.js' && hooks.afterCore) hooks.afterCore(w);
  }
  return { w, d: w.document, $: (id) => w.document.getElementById(id) };
}

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function loadLoader() {
  const sandbox = { TextEncoder, TextDecoder, Uint8Array, Int32Array, DataView, ArrayBuffer, btoa, atob };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(read('word_sounds_take_home_loader.js'), sandbox);
  return sandbox.AlloWordSoundsTakeHome;
}

describe('1. Microphone off', () => {
  it('has no microphone box, passes enableVoice: false to every round, and never constructs SpeechRecognition', () => {
    const html = read('packets-symbol-runner.html');
    expect(html).not.toContain('sr-voice');
    expect(html).not.toMatch(/speech matching/i);
    const js = read('packets-symbol-runner.js');
    expect(js).not.toContain('voiceCheck');
    expect(js).not.toContain("'sr-voice'");
    expect(js).toContain('enableVoice: false');

    let recognizers = 0;
    const configs = [];
    const p = openPage({
      before(w) {
        w.SpeechRecognition = class { constructor() { recognizers++; } start() {} stop() {} };
        w.webkitSpeechRecognition = w.SpeechRecognition;
      },
      afterCore(w) {
        const mount = w.AlloSymbolRunnerCore.mountRunner;
        w.AlloSymbolRunnerCore.mountRunner = (host, cfg) => { configs.push(cfg); return mount(host, cfg); };
      },
    });
    // The round starts when step 2 is on screen.
    p.$('sr-next-1').click();
    expect(p.$('step-2').hidden).toBe(false);
    p.$('sr-start-live').click();
    p.$('sr-hc').click();
    expect(configs.length).toBeGreaterThanOrEqual(2);
    for (const cfg of configs) {
      expect(cfg.enableVoice).toBe(false);
      expect(cfg.voiceEnabled).toBe(false);
    }
    const host = p.$('sr-live-host');
    expect(host.querySelector('.asr-wrap')).not.toBeNull();
    expect([...host.querySelectorAll('button')].some((b) => /mic/i.test(b.textContent))).toBe(false);
    expect(recognizers).toBe(0);
    // Leaving step 2 stops the round.
    p.$('sr-next-2').click();
    expect(host.querySelector('.asr-wrap')).toBeNull();
  });

  it('says only what is true in the details panel', () => {
    const p = openPage();
    const proof = p.d.querySelector('details.proof');
    expect(squash(proof.querySelector('.proof-line').textContent)).toBe('This page runs without AI. No account. Nothing you choose is uploaded.');
    const lines = [...proof.querySelectorAll('.proof-body li')].map((li) => squash(li.textContent));
    expect(lines).toContain('This page never uses the microphone. In the round on this page, the student answers by tapping, clicking or typing.');
    expect(lines.some((l) => /Kokoro/.test(l) && /ahead of time/.test(l) && /computer voices/.test(l))).toBe(true);
    expect(lines.some((l) => /server that sends these files can see/.test(l))).toBe(true);
    expect(proof.textContent).not.toMatch(/leaves your device|images you import/i);
    // The rule is the page's own CSP, word for word.
    const csp = p.d.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(p.d.querySelector('[data-show-rule]').textContent).toBe(csp);
    // The file list names every stylesheet and script the page loads, and the recordings it gets.
    const files = p.d.querySelector('[data-show-files]').textContent;
    for (const node of p.d.querySelectorAll('script[src], link[href]')) {
      const name = node.getAttribute('src') || node.getAttribute('href');
      expect(files, name).toContain(name);
    }
    for (const name of ['audio_bank/phonemes.json', 'audio_bank/letters.json', 'audio_bank/words.json', 'word_audio_shards/index.json', 'packets-try.html']) {
      expect(files, name).toContain(name);
    }
    // The page's only fetches are to this site: the recordings named in the list.
    const js = read('packets-symbol-runner.js');
    const fetched = [...js.matchAll(/(?:loadAudioJson|root\.fetch)\('([^']+)'/g)].map((m) => m[1]);
    expect(fetched.sort()).toEqual(['audio_bank/letters.json', 'audio_bank/phonemes.json', 'audio_bank/words.json', 'word_audio_shards/index.json']);
    expect(js).not.toMatch(/https?:\/\//);
  });
});

describe('2. The shared maker layout', () => {
  it('has three step tabs, the file box with Try it before Save, What to do next, the batch fold and the footer', () => {
    const p = openPage();
    const tabs = [...p.d.querySelectorAll('.steps .step-tab')];
    expect(tabs.map((t) => t.getAttribute('data-go'))).toEqual(['1', '2', '3']);
    expect(tabs.map((t) => squash(t.querySelector('.step-label').textContent))).toEqual(['Step 1: What to practice', 'Step 2: How it works', 'Step 3: Make the file']);
    expect([1, 2, 3].map((n) => p.$('step-' + n).hidden)).toEqual([false, true, true]);
    expect(p.$('step-1').querySelector('.kicker').textContent).toBe('Step 1 of 3');

    const step3 = p.$('step-3');
    expect(squash(p.$('sr-summary').querySelector('h3').textContent)).toBe('The file is ready');
    const tryBtn = p.$('sr-try-packet');
    const saveBtn = p.$('sr-save-html');
    expect(squash(tryBtn.textContent)).toBe('Try it (opens in a new tab)');
    expect(squash(saveBtn.textContent)).toBe('Save the file');
    expect(saveBtn.classList.contains('btn-primary')).toBe(true);
    expect(tryBtn.compareDocumentPosition(saveBtn) & p.w.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(tryBtn.parentElement).toBe(saveBtn.parentElement);
    expect(step3.contains(tryBtn)).toBe(true);

    const after = p.$('sr-after-save');
    expect(after.hidden).toBe(true);
    expect(squash(after.querySelector('h3').textContent)).toBe('Saved. What to do next');
    // The same words as the other makers about Google Drive or Classroom and the Open page.
    const math = new JSDOM(read('packets-math-practice.html'));
    opened.push(math);
    const mathAfter = math.window.document.getElementById('after-save');
    expect(squash(after.querySelector('ol li').textContent)).toBe(squash(mathAfter.querySelector('ol li').textContent));
    // The Open page's address is filled in by packets-page.js from the address the page is served at (here a test site).
    const noAddress = (text) => squash(text).replace(/: [^\s]*packets-open\.html\.$/, ': (address).');
    expect(noAddress(after.querySelector('.after-phone').textContent)).toBe(noAddress(mathAfter.querySelector('.after-phone').textContent));
    expect(after.querySelector('[data-open-address]').textContent).toMatch(/packets-open\.html$/);
    expect(after.querySelector('a[href="packets-open.html"]')).not.toBeNull();

    const batch = p.$('sr-batch');
    expect(batch.tagName).toBe('DETAILS');
    expect(batch.classList.contains('batch')).toBe(true);
    expect(squash(batch.querySelector('summary').textContent)).toBe('Make one for each student');
    expect(batch.contains(p.$('sr-learners'))).toBe(true);
    expect(batch.contains(p.$('sr-batch-make'))).toBe(true);

    const foot = p.d.querySelector('footer.foot');
    expect(foot).not.toBeNull();
    expect(squash(foot.textContent)).toContain('Free to use. Open source, license AGPL-3.0.');
    expect([...foot.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['More from AlloFlow', './']]);

    // The teacher code warns that it cannot be recovered, as the check maker does.
    const codeHint = squash(p.$('sr-code-hint').textContent);
    expect(codeHint).toContain('This page does not keep the code, so write it down.');
    expect(codeHint).toContain('It cannot be recovered.');
    expect(p.$('sr-teacher-code').getAttribute('aria-describedby')).toContain('sr-code-hint');
  });

  it('moves between the steps, shows the file box in step 3 and What to do next after a save', async () => {
    let saved = 0;
    const p = openPage({ before(w) { w.HTMLAnchorElement.prototype.click = function () { if (this.getAttribute('download')) saved++; }; } });
    p.$('sr-next-1').click();
    expect([1, 2, 3].map((n) => p.$('step-' + n).hidden)).toEqual([true, false, true]);
    expect(p.d.querySelector('.step-tab[aria-current="step"]').getAttribute('data-go')).toBe('2');
    p.$('sr-next-2').click();
    expect([1, 2, 3].map((n) => p.$('step-' + n).hidden)).toEqual([true, true, false]);
    expect(p.d.title).toBe('AlloFlow Packets: Make Symbol Runner practice, step 3 of 3');
    expect(p.$('sr-summary').hidden).toBe(false);
    expect(p.$('sr-summary-line').textContent).toMatch(/^Letters that look alike \(b, d, p, q\)\. \d+ cards\. After a miss, the student tries again\. No clock\./);
    p.$('sr-save-html').click();
    // The page first asks for the recordings (here they are not found), then saves.
    for (let i = 0; i < 50 && !saved; i++) await new Promise((r) => setTimeout(r, 10));
    expect(saved).toBe(1);
    expect(p.$('sr-after-save').hidden).toBe(false);
    // A change to the choices hides it again: the saved file no longer matches.
    const check = p.d.querySelector('input[name="sr-packet-mode"][value="check"]');
    check.checked = true;
    check.dispatchEvent(new p.w.Event('change', { bubbles: true }));
    expect(p.$('sr-after-save').hidden).toBe(true);
    expect(p.$('sr-summary-line').textContent).toMatch(/2 practice cards, then 40 cards with one try on each\. A 1-minute clock\./);
    p.d.querySelector('.step-tab[data-go="1"]').click();
    expect(p.$('step-1').hidden).toBe(false);
  });
});

describe('2b. Links into the page still work on the new layout', () => {
  it('#rehearse= fills in the missed symbols and opens step 2; #mode= opens step 1 with the plain name', () => {
    const dom = new JSDOM(read('packets-symbol-runner.html'), { runScripts: 'outside-only', url: 'https://packets.example/packets-symbol-runner.html#rehearse=b%2Cd' });
    opened.push(dom);
    const w = dom.window;
    w.matchMedia = () => ({ matches: true });
    w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    for (const src of PAGE_SCRIPTS) w.eval(read(src));
    const $ = (id) => w.document.getElementById(id);
    expect($('sr-custom').value).toContain('b, d');
    expect($('sr-rehearsal').checked).toBe(true);
    expect($('step-2').hidden).toBe(false);
    expect($('sr-rehearsal-box').hidden).toBe(false);
    expect($('sr-status').textContent).toContain('Loaded 2 missed symbols for Rehearsal with known facts.');

    const modeDom = new JSDOM(read('packets-symbol-runner.html'), { runScripts: 'outside-only', url: 'https://packets.example/packets-symbol-runner.html#mode=quantity_stroop' });
    opened.push(modeDom);
    const mw = modeDom.window;
    mw.matchMedia = () => ({ matches: true });
    mw.fetch = async () => ({ ok: false, status: 404, json: async () => ({}) });
    for (const src of PAGE_SCRIPTS) mw.eval(read(src));
    expect(mw.document.getElementById('sr-mode').value).toBe('quantity_stroop');
    expect(mw.document.getElementById('step-1').hidden).toBe(false);
    expect(mw.document.getElementById('sr-status').textContent).toBe('Loaded "Count the dots, not the number" for practice.');
  });
});

describe('3. Plain names', () => {
  it('uses plain words in the visible text, with one line under each choice, and keeps the ids', () => {
    const p = openPage();
    const text = p.d.body.textContent;
    for (const jargon of [/\bRAS\b/, /Subitiz/i, /Incremental rehearsal \(/i, /lock-on/i, /Aim and lock/i, /5x8/i, /Phoneme sounds/i, /serial grid/i, /rimes\b/i, /Find more pictures/i]) {
      expect(text, String(jargon)).not.toMatch(jargon);
    }
    // 2026-11-18 (owner): 'Stroop' and 'flanker' left the set names for the line under them, where a specialist still finds them.
    expect(text.match(/Stroop/g)).toHaveLength(3);
    expect(text).toContain('Name the ink color, not the word');
    expect(text).toContain('(A Stroop task.)');
    expect(text.match(/flanker/gi)).toHaveLength(1);
    for (const opt of p.d.querySelectorAll('#sr-mode option')) expect(opt.textContent).not.toMatch(/Stroop|flanker/i);
    expect(text).toContain('Middle letter: b, d, p, q');
    expect(text).toContain('(A flanker task.)');
    for (const plain of ['Quick naming: letters and numbers in turn', 'Quick dot counting (1 to 9)', 'Rehearsal with known facts', 'A sheet of 40 (5 by 8)', 'Letter sounds (/a/, /b/, /sh/)', 'Point at the card first']) {
      expect(text, plain).toContain(plain);
    }
    expect(text).not.toContain('!');

    // Every set of symbols has a description line, shown under the list for the chosen one.
    const options = [...p.$('sr-mode').options];
    for (const opt of options) expect(squash(opt.getAttribute('data-line')).length, opt.value).toBeGreaterThan(10);
    expect(p.$('sr-mode-line').textContent).toBe(options.find((o) => o.value === 'confusable_letters').getAttribute('data-line'));
    p.$('sr-mode').value = 'subitize_dots';
    p.$('sr-mode').dispatchEvent(new p.w.Event('change', { bubbles: true }));
    expect(p.$('sr-mode-line').textContent).toContain('without counting one by one');
    // Every card choice has a name and one line.
    for (const choice of p.d.querySelectorAll('label.choice')) {
      expect(choice.querySelectorAll('.choice-name'), choice.textContent).toHaveLength(1);
      expect(choice.querySelectorAll('.choice-line'), choice.textContent).toHaveLength(1);
    }
    // The ids saved settings and files use are unchanged.
    const builder = require('../packet_symbol_runner_builder.js');
    expect(options.map((o) => o.value).sort()).toEqual(builder.MODES.map((m) => m.id).sort());
    expect([...p.d.querySelectorAll('input[name="sr-control"]')].map((i) => i.value)).toEqual(['direct', 'lockon']);
    expect([...p.d.querySelectorAll('input[name="sr-view"]')].map((i) => i.value)).toEqual(['3d', '2d', 'grid']);
    expect([...p.d.querySelectorAll('input[name="sr-packet-mode"]')].map((i) => i.value)).toEqual(['practice', 'check']);
    expect([...p.$('sr-audio-mode').options].map((o) => o.value)).toEqual(['auto', 'name', 'sound']);
    for (const id of ['sr-rehearsal', 'sr-known', 'sr-hc', 'sr-untimed', 'sr-teacher-code', 'sr-include-audio', 'sr-title', 'sr-custom']) expect(p.$(id), id).not.toBeNull();
    // The builder's own names (the file's default title) are plain too.
    const titles = builder.MODES.map((m) => m.title).join(' | ');
    expect(titles).not.toMatch(/\bRAS\b|Subitiz|Stroop \(|Number-Size|Quantity Stroop|Flanker crowd/);
  });
});

describe('4. Stroop and flanker items in the builder', () => {
  const builder = require('../packet_symbol_runner_builder.js');
  const colorItems = builder.MODES.flatMap((m) => m.items.filter((it) => it && typeof it === 'object' && it.stroopInk).map((it) => ({ mode: m.id, ...it })));

  it('every ink is at least 3:1 against white (#ffffff) and light gray (#f3f4f6)', () => {
    expect(colorItems.length).toBeGreaterThanOrEqual(20);
    const inks = [...new Set(colorItems.map((it) => it.stroopInk.toLowerCase()))];
    expect(inks).not.toContain('#facc15');
    expect(inks).not.toContain('#22c55e');
    for (const ink of inks) {
      expect(contrast(ink, '#ffffff'), ink + ' on white').toBeGreaterThanOrEqual(3);
      expect(contrast(ink, '#f3f4f6'), ink + ' on gray').toBeGreaterThanOrEqual(3);
    }
    // Each ink still goes with one color name.
    const inkOf = {};
    for (const it of colorItems) {
      inkOf[it.answer] = inkOf[it.answer] || new Set();
      inkOf[it.answer].add(it.stroopInk);
    }
    expect(Object.keys(inkOf).sort()).toEqual(['blue', 'gold', 'green', 'red']);
    for (const name of Object.keys(inkOf)) expect(inkOf[name].size, name).toBe(1);
  });

  it('the shape on a conflicting item does not give the ink away, and the prompt asks only for the ink color', () => {
    const conflicting = colorItems.filter((it) => it.congruent === false);
    expect(conflicting.length).toBeGreaterThanOrEqual(12);
    const inksByShape = {};
    for (const it of colorItems) {
      if (!it.stroopShape) continue;
      inksByShape[it.stroopShape] = inksByShape[it.stroopShape] || new Set();
      inksByShape[it.stroopShape].add(it.stroopInk);
    }
    for (const it of conflicting) {
      if (it.stroopShape) expect(inksByShape[it.stroopShape].size, it.word + '/' + it.answer).toBeGreaterThan(1);
    }
    for (const it of colorItems) {
      expect(it.promptRule).toBe('Name the ink color');
      expect(it.word.toLowerCase() === it.answer).toBe(it.congruent);
    }
    // The same holds in a built file.
    const loader = loadLoader();
    const built = builder.buildSymbolRunnerPacket({ loader, mode: 'color_word_stroop', title: 'Ink check' });
    const items = built.lesson.blocks[0].items;
    const shapeInks = {};
    for (const it of items) {
      expect(it.prompt).toBe('Name the ink color');
      if (!it.stroopShape) continue;
      shapeInks[it.stroopShape] = shapeInks[it.stroopShape] || new Set();
      shapeInks[it.stroopShape].add(it.stroopInk);
    }
    for (const it of items.filter((x) => x.congruent === false && x.stroopShape)) expect(shapeInks[it.stroopShape].size).toBeGreaterThan(1);
  });

  it('every Stroop and flanker item carries congruent, and it reaches the file', () => {
    const kinds = new Set(['flanker', 'quantity_stroop', 'size_stroop', 'color_stroop']);
    let counted = 0;
    for (const mode of builder.MODES) {
      for (const it of mode.items) {
        if (!it || typeof it !== 'object') continue;
        const kind = it.category || mode.category;
        if (!kinds.has(kind) && !it.stroopInk && !Number.isInteger(it.flankerCenter)) continue;
        counted++;
        expect(typeof it.congruent, mode.id + ' ' + it.word).toBe('boolean');
      }
    }
    expect(counted).toBeGreaterThanOrEqual(16 + 12 + 12 + 16 + 6);
    // Flanker: the middle letter is the answer, and congruent means all five letters are the same.
    const flanker = builder.MODES.find((m) => m.id === 'flanker_letters').items;
    for (const it of flanker) {
      expect(it.word, it.word).toHaveLength(5);
      expect(it.word[it.flankerCenter], it.word).toBe(it.answer);
      expect(new Set(it.word).size === 1, it.word).toBe(it.congruent);
      if (!it.congruent) expect(it.word.split('').filter((ch) => ch !== it.answer), it.word).toHaveLength(4);
    }
    expect(flanker.map((it) => it.word)).toContain('nnunn');
    expect(flanker.map((it) => it.word)).not.toContain('nnuun');
    const loader = loadLoader();
    for (const mode of ['flanker_letters', 'color_word_stroop', 'quantity_stroop', 'number_size_stroop']) {
      for (const packetMode of ['practice', 'check']) {
        const lesson = builder.lessonFromSymbolRunner({ loader, mode, packetMode }).lesson;
        for (const it of lesson.blocks[0].items) expect(typeof it.congruent, mode + ' ' + packetMode + ' ' + it.id).toBe('boolean');
      }
    }
    const triple = builder.lessonFromSymbolRunner({ loader, mode: 'ras_triple' }).lesson.blocks[0].items.filter((it) => it.stroopInk);
    expect(triple.length).toBeGreaterThan(0);
    for (const it of triple) expect(typeof it.congruent).toBe('boolean');
  });
});

describe('5. Find a picture', () => {
  it('no longer links to packets-pictures.html, which Symbol Runner cannot read', () => {
    const html = read('packets-symbol-runner.html');
    expect(html).not.toContain('packets-pictures.html');
    expect(html).not.toMatch(/pictures online|Find a picture|Find more pictures/i);
    expect(read('packets-symbol-runner.js')).not.toContain('packets-pictures');
  });
});

describe('6. The builder copy', () => {
  it('desktop/web-app/public/packet_symbol_runner_builder.js is the same file as the root one', () => {
    expect(read('desktop/web-app/public/packet_symbol_runner_builder.js')).toBe(read('packet_symbol_runner_builder.js'));
  });
});
