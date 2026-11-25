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
  'packets-page.js', 'packets_zip.js', 'packets_my_words.js', 'packets_verify_core.js', 'packets_reopen.js', 'word_sounds_take_home_loader.js',
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
    if (src === 'packets_my_words.js' && hooks.afterMyWords) hooks.afterMyWords(w);
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
    expect(squash(batch.querySelector('summary').textContent)).toBe('Put student code names in the file');
    expect(batch.contains(p.$('sr-learners'))).toBe(true);
    expect(batch.contains(p.$('sr-batch-make'))).toBe(true);
    // Title sits before Try it / Save the file, matching the other makers (Wave 3A).
    expect(p.$('sr-title').compareDocumentPosition(saveBtn) & p.w.Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(p.$('sr-code-name-box')).toBeNull();
    expect(p.$('sr-learner-tip')).toBeNull();
    expect(p.$('sr-batch-save')).toBeNull();
    expect(squash(p.$('sr-learners-hint').textContent)).toBe('Use code names or first names only, never full names. At most 40 at a time.');

    const foot = p.d.querySelector('footer.foot');
    expect(foot).not.toBeNull();
    expect(squash(foot.textContent)).toContain('Free to use. Open source, license AGPL-3.0.');
    // 2026-11-23: every Packets page's footer also links "Send feedback" (packets-feedback.html), before "More from AlloFlow".
    expect([...foot.querySelectorAll('a')].map((a) => [a.textContent, a.getAttribute('href')])).toEqual([['Send feedback', 'packets-feedback.html#from-packets-symbol-runner'], ['More from AlloFlow', './']]);

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

describe('5. Find a picture & AlloPacketMyWords sharing (Wave 3A)', () => {
  it('reads AlloPacketMyWords IndexedDB and links 2+ letter words to packets-pictures.html#word=<w>&from=symbol-runner', async () => {
    const pngUri = 'data:image/png;base64,' + Buffer.alloc(64, 7).toString('base64');
    const p = openPage({
      afterMyWords(w) {
        w.AlloPacketMyWords = {
          normalizeWord: (s) => (/^[a-z]{2,24}$/.test(String(s || '').trim().toLowerCase()) ? String(s).trim().toLowerCase() : ''),
          normalizeMediaKey: (s) => String(s || '').trim().toLowerCase(),
          getManyMedia: async (keys) => (keys.some((k) => String(k).toLowerCase() === 'all') ? { all: { picture: { dataUri: pngUri, credit: { own: true } } } } : {}),
          putMedia: async () => ({}),
          creditLine: () => "The teacher's own picture.",
          onChange: () => () => {},
        };
      },
    });
    // Switch to sight_words so 2+ letter words get Find a picture links and auto-surface My words pictures.
    p.$('sr-mode').value = 'sight_words';
    p.$('sr-mode').dispatchEvent(new p.w.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    const link = p.d.querySelector('[data-sr-find-pic="all"]');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('packets-pictures.html#word=all&from=symbol-runner');
    expect(p.w.AlloPacketsSymbolRunner.getPictures().all?.src).toBe(pngUri);
  });
});

describe('6. The builder copy', () => {
  it('desktop/web-app/public/packet_symbol_runner_builder.js is the same file as the root one', () => {
    expect(read('desktop/web-app/public/packet_symbol_runner_builder.js')).toBe(read('packet_symbol_runner_builder.js'));
  });
});

describe('7. Wave 1 hardening, portability & student player fixes', () => {
  it('refuses unsafe SVG (<script>, onload=) and oversized images in safeDataImage while keeping clean SVG', () => {
    const builder = require('../packet_symbol_runner_builder.js');
    const loader = loadLoader();
    const scriptSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64');
    const onloadSvg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><circle r="10"/></svg>');
    const hugePng = 'data:image/png;base64,' + Buffer.alloc(410000, 1).toString('base64');
    const cleanSvg = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>').toString('base64');
    const built = builder.buildSymbolRunnerPacket({
      loader,
      mode: 'custom',
      items: 'cat dog fish bird',
      pictures: { cat: { src: scriptSvg }, dog: { src: onloadSvg }, fish: { src: hugePng }, bird: { src: cleanSvg } },
      packetMode: 'practice',
    });
    const imgs = Object.values(built.lesson.images || {});
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toBe(cleanSvg);
  });

  it('clears #rehearse= hash after applying and resets form controls on Forget my choices', () => {
    const p = openPage({
      before(w) {
        w.location.hash = '#rehearse=b,d,p';
      },
    });
    expect(p.w.location.hash).toBe('');
    expect(p.$('sr-custom').value).toContain('b');
    p.$('sr-title').value = 'Custom Changed Title';
    p.$('sr-clear-local').click();
    expect(p.$('sr-custom').value).toBe('');
    expect(p.$('sr-title').value).toBe('Letters that look alike (b, d, p, q) practice');
    expect(p.$('sr-mode').value).toBe('confusable_letters');
  });

  it('student player: matches numeric value on digit keys (not slot index), handles lockon arrows at document level, replays audio on R, and hides Spoken directions', () => {
    const builder = require('../packet_symbol_runner_builder.js');
    const loader = loadLoader();
    const wavClip = 'data:audio/wav;base64,' + Buffer.from('RIFF0000WAVE').toString('base64');
    const built = builder.buildSymbolRunnerPacket({
      loader,
      mode: 'subitize_dots',
      packetMode: 'practice',
      control: 'lockon',
      clips: { '1': wavClip, '2': wavClip, '3': wavClip, '4': wavClip, '5': wavClip, '6': wavClip },
    });
    const played = [];
    const dom = new JSDOM(built.html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/sr.html',
      beforeParse(w) {
        w.Audio = class { play() { played.push(this.src); return Promise.resolve(); } pause() {} };
      },
    });
    opened.push(dom);
    const w = dom.window;
    const d = w.document;
    // Reading Tools hides Spoken directions in Symbol Runner practice.
    d.querySelector('[data-tools-open]').click();
    expect(d.querySelector('[data-tool-group="directions"]').hidden).toBe(true);
    d.querySelector('[data-tools-close-top]').click();

    d.getElementById('learner-name').value = 'Sam';
    d.querySelector('#app button.primary').click();
    // Lock-on arrows work at document level to lock onto the target lane.
    const targetLane = Number(d.querySelector('[data-sr-target="true"]').getAttribute('data-lane'));
    for (let step = 0; step < 3; step++) {
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: targetLane === 0 ? 'ArrowLeft' : 'ArrowRight', bubbles: true }));
    }
    expect(d.querySelector('[data-sr-lanes]').getAttribute('data-locked')).toBe('false');
    // R key replays item.audio cleanly.
    const playedBefore = played.length;
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'r', bubbles: true }));
    expect(played.length).toBeGreaterThan(playedBefore);
    // Pressing the digit equal to a choice's numeric VALUE submits that value (not blind slot index).
    const choices = [...d.querySelectorAll('[data-sr-choice]')].map((b) => b.getAttribute('data-sr-choice'));
    const pickVal = choices.find((c, idx) => Number(c) !== idx + 1 && /^[0-9]$/.test(c)) || choices[0];
    d.dispatchEvent(new w.KeyboardEvent('keydown', { key: pickVal, bubbles: true }));
    const savedRaw = Object.values(Object.fromEntries(Object.keys(w.localStorage).map((k) => [k, w.localStorage.getItem(k)])))[0];
    expect(JSON.parse(savedRaw).items[0].responses[0]).toBe(pickVal);
  });

  it('transcodes letter/phoneme WebM clips to portable WAV/MP3 before exporting so zero raw audio/webm enters HTML', async () => {
    let savedHtml = '';
    const webmUri = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84E=';
    const mp3Uri = 'data:audio/mpeg;base64,SUQzBAAAAAA=';
    const wavUri = 'data:audio/wav;base64,' + Buffer.from('RIFF0000WAVE').toString('base64');
    const p = openPage({
      before(w) {
        w.OfflineAudioContext = class {};
        w.Blob = class { constructor(parts) { this._text = parts.join(''); } };
        w.URL.createObjectURL = (b) => { savedHtml = b._text || ''; return 'blob:sr-portable'; };
        w.HTMLAnchorElement.prototype.click = function () {};
        w.fetch = async (url) => {
          const u = String(url);
          if (u === 'audio_bank/letters.json') return { ok: true, status: 200, json: async () => ({ b: webmUri, d: webmUri, p: webmUri, q: webmUri }) };
          if (u === 'audio_bank/phonemes.json') return { ok: true, status: 200, json: async () => ({ b: webmUri, d: webmUri, p: webmUri, q: webmUri }) };
          return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
        };
        w.AlloPacketAudioKit = {
          getMp3: async () => true,
          wavUriToMp3Uri: () => mp3Uri,
        };
      },
    });
    // Stub portableAudio on loaded take-home loader to simulate WebM -> WAV decoding in JSDOM.
    p.w.AlloWordSoundsTakeHome.portableAudio = async (lesson) => {
      for (const k of Object.keys(lesson.audio)) lesson.audio[k] = wavUri;
    };
    p.$('sr-save-html').click();
    for (let i = 0; i < 60 && !savedHtml; i++) await new Promise((r) => setTimeout(r, 15));
    expect(savedHtml).toContain('data:audio/mpeg;base64,');
    expect(savedHtml).not.toContain('data:audio/webm');
  });
});

describe('8. Wave 3A: canonical filenames, Show toggle, .txt roster, and deterministic fixed-mode shard audio', () => {
  it('uses canonical Title__CodeName.html filenames, Show toggle on teacher code, and zero-storage .txt roster', async () => {
    const downloads = [];
    const p = openPage({
      before(w) {
        w.HTMLAnchorElement.prototype.click = function () {
          if (this.getAttribute('download')) downloads.push(this.getAttribute('download'));
        };
      },
    });
    // Teacher code Show toggle
    expect(p.$('sr-teacher-code').type).toBe('password');
    p.$('sr-code-show').click();
    expect(p.$('sr-teacher-code').type).toBe('text');
    expect(p.$('sr-code-show').textContent).toBe('Hide');
    p.$('sr-code-show').click();
    expect(p.$('sr-teacher-code').type).toBe('password');

    // Canonical single-file Title__CodeName.html
    p.$('sr-title').value = 'Letters Practice';
    p.$('sr-learners').value = 'BlueHeron7';
    p.$('sr-learners').dispatchEvent(new p.w.Event('input', { bubbles: true }));
    expect(p.$('sr-batch-make').hidden).toBe(true);
    p.$('sr-save-html').click();
    for (let i = 0; i < 40 && !downloads.length; i++) await new Promise((r) => setTimeout(r, 15));
    expect(downloads[0]).toBe('Letters-Practice__BlueHeron7.html');

    // Zero-storage .txt roster loader + 1-click Title__N-students.zip
    const roster = new p.w.File(['BlueHeron7\nRedFox3\n'], 'roster.txt', { type: 'text/plain' });
    Object.defineProperty(p.$('sr-batch-file'), 'files', { configurable: true, value: [roster] });
    p.$('sr-batch-file').dispatchEvent(new p.w.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 25));
    expect(p.$('sr-batch-make').hidden).toBe(false);
    expect(p.$('sr-batch-make').textContent).toBe('Save .zip for 2 students');
    expect(JSON.stringify({ ...p.w.localStorage })).not.toContain('BlueHeron7');
    p.$('sr-batch-make').click();
    for (let i = 0; i < 40 && downloads.length < 2; i++) await new Promise((r) => setTimeout(r, 15));
    expect(downloads[1]).toBe('Letters-Practice__2-students.zip');
  });

  it('embeds deterministic word_audio_shards/ clips for fixed digits, colors, and directions without speechSynthesis', async () => {
    const idxJson = read('word_audio_shards/index.json');
    const wavClip = 'data:audio/wav;base64,' + Buffer.from('RIFF0000WAVE').toString('base64');
    const savedBlobs = [];
    const p = openPage({
      before(w) {
        w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
        w.URL.createObjectURL = (blob) => { savedBlobs.push(blob); return 'blob:sr-audio-' + savedBlobs.length; };
        w.HTMLAnchorElement.prototype.click = function () {};
        w.fetch = async (url) => {
          const u = String(url);
          if (u === 'word_audio_shards/index.json') return { ok: true, json: async () => JSON.parse(idxJson) };
          if (u.startsWith('word_audio_shards/')) {
            const idx = JSON.parse(idxJson);
            const shardFile = u.split('/').pop();
            const shardKey = Object.keys(idx.shards).find((k) => idx.shards[k].file === shardFile);
            const words = {};
            for (const [word, sk] of Object.entries(idx.words)) if (sk === shardKey) words[word] = wavClip;
            return { ok: true, json: async () => ({ words }) };
          }
          return { ok: false, status: 404, json: async () => ({}) };
        };
      },
    });
    for (const [modeId, customVal, expectedCount] of [['digits_single', '', 10], ['color_word_stroop', '', 4], ['custom', 'up, down, left, right', 4]]) {
      const before = savedBlobs.length;
      p.$('sr-mode').value = modeId;
      p.$('sr-custom').value = customVal;
      p.$('sr-save-html').click();
      for (let i = 0; i < 60 && savedBlobs.length === before; i++) await new Promise((r) => setTimeout(r, 20));
      const html = savedBlobs[savedBlobs.length - 1].body;
      const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
      expect(Object.keys(lesson.audio || {}).length, modeId).toBe(expectedCount);
      expect(html).not.toMatch(/speechSynthesis/);
    }
  });

  it('Wave 3B: routes wrong-maker (including Word Sounds via identify) and results files in 1 click via AlloPacketHandoff.redirect', async () => {
    const handed = [];
    const p = openPage();
    p.w.AlloPacketHandoff = { HASH: '#open-file', RESULTS_HASH: '#import-results', redirect: async (file, href, hash) => { handed.push({ name: file.name, href, hash }); } };
    const csv = '\uFEFF"format","session_id"\r\n"alloflow-packet-result/1","S-1"\r\n';
    p.w.AlloPacketsSymbolRunner.reopenFromText(csv, 'sr-res.csv');
    const goRes = p.$('sr-reopen-status').querySelector('button[data-handoff-href="packets-results.html"]');
    expect(goRes).toBeTruthy();
    goRes.click();
    expect(handed[0]).toEqual({ name: 'sr-res.csv', href: 'packets-results.html', hash: '#import-results' });

    // A real Word Sounds HTML packet dropped on Symbol Runner identifies cleanly via AlloPacketReopen.identify().
    const th = p.w.AlloWordSoundsTakeHome;
    const wsCore = new Function(read('word_sounds_core.js') + ';return createWordSoundsCore();')();
    const wsHtml = th.buildHtml({
      schema: th.LESSON_SCHEMA,
      player: th.PLAYER,
      lessonId: 'ws-test-1',
      revision: 'r1',
      title: 'Short a',
      mode: 'practice',
      activityTitles: { isolation: 'Find Sounds' },
      blocks: [{ activity: 'isolation', items: [{ id: 'iso-1', word: 'cat', target: 'k', position: 0, choices: [{ label: 'k', audio: 'k' }, { label: 'a', audio: 'a' }] }] }],
      audio: {},
      images: {},
      feedback: { correct: [], retry: null },
      submit: null,
    }, { core: wsCore });
    p.w.AlloPacketsSymbolRunner.reopenFromText(wsHtml, 'ws.html');
    const goWs = p.$('sr-reopen-status').querySelector('button[data-handoff-href="packets-make.html"]');
    expect(goWs).toBeTruthy();
    goWs.click();
    expect(handed[1]).toEqual({ name: 'ws.html', href: 'packets-make.html', hash: '#open-file' });
  });

  it('Wave 4A: enforces strict style-src self CSP, skips inline style tag with data-sr-css, and reuses My words recordings', async () => {
    const htmlSrc = read('packets-symbol-runner.html');
    expect(htmlSrc).toContain('<html lang="en" data-sr-css>');
    const csp = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(htmlSrc)[1];
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(read('packets-voice.html')).toContain('My saved words under From this browser');
    expect(read('packets-voice.html')).not.toContain('Load saved My words');

    const recUri = 'data:audio/mpeg;base64,SUQzBAAAAAA=';
    const savedBlobs = [];
    const p = openPage({
      before(w) {
        w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; } };
        w.URL.createObjectURL = (blob) => { savedBlobs.push(blob); return 'blob:sr-4a-' + savedBlobs.length; };
        w.HTMLAnchorElement.prototype.click = function () {};
      },
      afterMyWords(w) {
        w.AlloPacketMyWords = {
          normalizeMediaKey: (k) => String(k || '').trim().toLowerCase(),
          getManyMedia: async (keys) => {
            const out = {};
            for (const k of keys) {
              const nk = String(k || '').toLowerCase();
              if (nk === 'zayden' || nk === 'amara') out[nk] = { recording: { dataUri: recUri } };
            }
            return out;
          },
          onChange: () => {},
        };
      },
    });
    // data-sr-css prevents injecting an inline <style> tag on packets-symbol-runner.html.
    expect(p.d.getElementById('allo-symbol-runner-styles')).toBeNull();
    p.$('sr-custom').value = 'Zayden, Amara';
    p.$('sr-custom').dispatchEvent(new p.w.Event('input', { bubbles: true }));
    p.$('sr-save-html').click();
    for (let i = 0; i < 60 && !savedBlobs.length; i++) await new Promise((r) => setTimeout(r, 15));
    expect(savedBlobs.length).toBeGreaterThan(0);
    const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(savedBlobs[0].body)[1]);
    expect(Object.values(lesson.audio || {})).toContain(recUri);
    expect(Object.keys(lesson.audio || {}).length).toBe(2);
  });
});
