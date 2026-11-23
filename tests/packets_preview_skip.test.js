import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');

const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { core, loader } = tool.loadParts();
const mathPracticeBuilder = require('../packet_math_practice_builder.js');
const checkBuilder = require('../packet_check_builder.js');
const symbolRunnerBuilder = require('../packet_symbol_runner_builder.js');
const readAlongBuilder = require('../packet_read_along_builder.js');
const verify = require('../packets_verify_core.js');

const opened = [];
const sessions = [];
afterEach(() => {
  while (sessions.length) { try { sessions.pop().stop(); } catch (_) {} }
  while (opened.length) { try { opened.pop().close(); } catch (_) {} }
});

function channelBus() {
  const peers = [];
  class BusChannel {
    constructor(name) { this.name = name; this.onmessage = null; this.closed = false; peers.push(this); }
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
    this.type = opts && opts.type;
    this.body = this.parts.join('');
  }
}

const wav = (tag) => {
  const b = Buffer.alloc(64);
  b.write('RIFF');
  b.write('WAVE', 8);
  b.write(String(tag).slice(0, 8), 44);
  return b.toString('base64');
};
const uri = (tag) => 'data:audio/wav;base64,' + wav(tag);
const BANKS = {
  isolation: { '1st': uri('q1'), '2nd': uri('q2'), '3rd': uri('q3') },
  phonemes: { k: uri('k'), a: uri('a'), t: uri('t'), m: uri('m'), p: uri('p'), s: uri('s'), n: uri('n'), u: uri('u') },
  instructions: { fb_great_job: uri('gj'), fb_try_again_listen: uri('ta') },
};

function buildWordSoundsHtml({ repeatMissed = false } = {}) {
  const mkWord = (w, pos, correct, options) => ({
    word: w,
    targetWord: w,
    term: w,
    _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } },
    activityItems: { isolation: { position: pos, correctSound: correct, options } },
  });
  const { lesson } = loader.lessonFromPack([
    mkWord('cat', 0, 'k', ['k', 'a', 't', 'm']),
    mkWord('map', 2, 'p', ['m', 'a', 'p', 's']),
    mkWord('sun', 0, 's', ['s', 'u', 'n', 'k']),
  ], { core, banks: BANKS, title: 'Short vowels', lessonId: 'L-skip-ws' });
  if (repeatMissed) lesson.repeatMissed = true;
  return loader.buildHtml(lesson, { core });
}

function buildVocabHtml() {
  const lesson = {
    schema: 'alloflow-take-home-lesson/v2',
    player: 'alloflow-word-sounds-take-home/2',
    lessonId: 'L-skip-vocab',
    revision: 'v1',
    title: 'Vocab Words',
    mode: 'practice',
    activityTitles: { vocab_meaning: 'Word to meaning' },
    blocks: [{
      activity: 'vocab_meaning',
      items: [
        {
          id: 'v1', word: 'enormous', ask: 'enormous', answer: 'very large', read: true, lang: 'en',
          choices: [{ text: 'very large' }, { text: 'very small' }, { text: 'very fast' }, { text: 'very loud' }],
        },
        {
          id: 'v2', word: 'fragile', ask: 'fragile', answer: 'easily broken', read: true, lang: 'en',
          choices: [{ text: 'easily broken' }, { text: 'very heavy' }, { text: 'brightly lit' }, { text: 'deeply cold' }],
        },
      ],
    }],
    feedback: { correct: [], retry: null },
    audio: {},
    images: {},
    submit: null,
  };
  return loader.buildHtml(lesson, { core });
}

function buildMathPracticeHtml() {
  const lesson = mathPracticeBuilder.lessonFromMathPractice({ loader, mode: 'ccc', facts: '2+2, 3+4, 5+1' });
  return mathPracticeBuilder.buildMathPracticePacket({ lesson, loader }).html;
}

function buildSymbolRunnerHtml({ control = 'lockon' } = {}) {
  const plan = symbolRunnerBuilder.planSymbolRunner({ mode: 'confusable_letters', control, count: 3, seed: 7 });
  const built = symbolRunnerBuilder.lessonFromSymbolRunner({ plan, title: 'Confusable Letters', loader });
  return symbolRunnerBuilder.buildSymbolRunnerPacket({ lesson: built.lesson || built, loader }).html;
}

function buildReadAlongHtml() {
  const sentences = [
    { text: 'Page one sentence one.' },
    { text: 'Page one sentence two.' },
    { text: 'Page two sentence one.', pageBreak: true },
    { text: 'Page two sentence two.' },
  ];
  const made = readAlongBuilder.lessonFromReadAlong({
    loader,
    title: 'Two Pages',
    sentences,
    pageMode: 'custom',
    clips: {},
    lang: 'en',
  });
  return readAlongBuilder.buildReadAlongPacket({ made, loader }).html;
}

function buildMathCheckHtml({ practice = 0, timeLimitS = 60, allowSkip = false } = {}) {
  const problems = checkBuilder.parseProblems('2+3, 4+1, 5+2');
  const practiceProblems = practice > 0 ? checkBuilder.parseProblems('1+1, 1+2').slice(0, practice) : [];
  const lesson = checkBuilder.lessonFromMathProblems({
    title: 'Math Facts Check',
    problems,
    practice: practiceProblems,
    timeLimitS,
    allowSkip,
  });
  return checkBuilder.buildCheckPacket({ lesson, loader }).html;
}

/**
 * Mounts packets-try.html + packets-try.js + packets_handoff.js hostPreview AND executes the real
 * sandboxed student file HTML inside a child JSDOM wired with real parent<->child postMessage.
 */
async function mountFullPreview(html, { describe: describeFn, onAction, speechSpy } = {}) {
  const Bus = channelBus();
  const previewId = 'blob:https://packets.test/preview-' + Math.random().toString(36).slice(2, 8);
  const hostCtx = { TextEncoder, TextDecoder, BroadcastChannel: Bus };
  hostCtx.window = hostCtx;
  new Function('window', read('packets_handoff.js')).call(hostCtx, hostCtx);
  const session = hostCtx.AlloPacketHandoff.hostPreview({
    url: previewId,
    html,
    describe: describeFn,
    onAction,
    Channel: Bus,
  });
  sessions.push(session);

  const dom = new JSDOM(read('packets-try.html'), {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://packets.test/packets-try.html#' + previewId,
  });
  const pw = dom.window;
  const pd = pw.document;
  opened.push(pw);

  const blobs = new Map();
  let seq = 0;
  let childWin = null;
  let childDoc = null;
  const childFocusLog = [];

  pw.BroadcastChannel = Bus;
  pw.Blob = KeepBlob;
  pw.URL.createObjectURL = (blob) => {
    const id = 'blob:https://packets.test/frame-' + (++seq);
    blobs.set(id, blob.body);
    return id;
  };
  pw.URL.revokeObjectURL = () => {};
  pw.fetch = async (url) => (url === previewId
    ? { ok: true, status: 200, text: async () => html }
    : { ok: false, status: 404, text: async () => '' });

  function mountChildFromBlob(blobHref) {
    const injectedHtml = blobs.get(blobHref);
    if (!injectedHtml) return;
    if (childWin) { try { childWin.close(); } catch (_) {} }
    let frameWinProxy = null;
    const childParentProxy = {
      postMessage(message) {
        const ev = new pw.MessageEvent('message', {
          data: JSON.parse(JSON.stringify(message)),
          origin: 'null',
          source: frameWinProxy,
        });
        pw.dispatchEvent(ev);
      },
    };
    const cdom = new JSDOM(injectedHtml, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://take-home.test/',
      beforeParse(cw) {
        cw.Audio = class { play() { return Promise.resolve(); } pause() {} };
        cw.URL.createObjectURL = () => 'blob:child-dl';
        cw.URL.revokeObjectURL = () => {};
        if (speechSpy) {
          cw.speechSynthesis = speechSpy;
          cw.SpeechSynthesisUtterance = class {
            constructor(text) { this.text = text; }
          };
        }
        Object.defineProperty(cw, 'localStorage', {
          configurable: true,
          get() { throw new cw.DOMException('The document is sandboxed.', 'SecurityError'); },
        });
        Object.defineProperty(cw, 'parent', { configurable: true, value: childParentProxy });
        const origFocus = cw.HTMLElement.prototype.focus;
        cw.HTMLElement.prototype.focus = function (...args) {
          childFocusLog.push(this.tagName + (this.getAttribute('data-next') != null ? '[data-next]' : ''));
          return origFocus.apply(this, args);
        };
      },
    });
    childWin = cdom.window;
    childDoc = childWin.document;
    opened.push(childWin);

    frameWinProxy = {
      postMessage(message) {
        const ev = new childWin.MessageEvent('message', {
          data: JSON.parse(JSON.stringify(message)),
          origin: 'https://packets.test',
          source: childParentProxy,
        });
        childWin.dispatchEvent(ev);
      },
    };
    const frameEl = pd.querySelector('iframe.try-frame');
    Object.defineProperty(frameEl, 'contentWindow', {
      configurable: true,
      get() { return frameWinProxy; },
    });
    // Expose helper to send raw messages with custom source/token for negative tests
    childWin.__parentProxy = childParentProxy;
    childWin.__injectedHtml = injectedHtml;
  }

  // Intercept iframe src setter via MutationObserver / polling right after eval
  pw.eval(read('packets-try.js'));
  await new Promise((r) => setTimeout(r, 25));
  const frameEl = pd.querySelector('iframe.try-frame');
  expect(frameEl).toBeTruthy();
  mountChildFromBlob(frameEl.src);
  await new Promise((r) => setTimeout(r, 15));

  const bar = () => pd.getElementById('try-edit');
  const prevBtn = () => bar().querySelector('[data-preview-nav="prev"]');
  const skipBtn = () => bar().querySelector('[data-preview-nav="next"]');
  const jumpSel = () => bar().querySelector('[data-preview-nav="goto"]');
  const hideBtn = () => bar().querySelector('[data-preview-hide]');
  const whereText = () => (bar().querySelector('.try-edit-where') || {}).textContent || '';
  const saidEl = () => bar().querySelector('.try-edit-said');
  const navStatusEl = () => bar().querySelector('[data-preview-nav-status]');
  const childApp = () => childDoc.getElementById('app').textContent;
  const childHeading = () => (childDoc.querySelector('#app h2') || {}).textContent || '';
  const tick = () => new Promise((r) => setTimeout(r, 15));

  return {
    pw, pd, session, bar, prevBtn, skipBtn, jumpSel, hideBtn, whereText, saidEl, navStatusEl,
    childWin: () => childWin,
    childDoc: () => childDoc,
    childApp,
    childHeading,
    childFocusLog,
    tick,
  };
}

describe('Preview-only item skipping (Component 1)', () => {
  it('Word Sounds: auto-starts from Start screen, steps forward/backward/jump, skips last item to End screen, returns via Previous, and repeatMissed never re-queues skipped items', async () => {
    const html = buildWordSoundsHtml({ repeatMissed: true });
    const p = await mountFullPreview(html, {
      describe: (l) => l.blocks[0].items.map((it) => ({
        itemId: String(it.id),
        activity: 'isolation',
        word: String(it.word),
        sample: false,
        label: 'Find Sounds \u2014 ' + it.word,
        canSwap: false,
        canTogglePicture: false,
        noPicture: false,
      })),
    });

    // Initially on Start screen: Previous is disabled, Skip is enabled
    expect(p.childDoc().getElementById('learner-name')).toBeTruthy();
    expect(p.prevBtn().disabled).toBe(true);
    expect(p.skipBtn().disabled).toBe(false);
    expect(p.whereText()).toBe('Question 1 of 3: Find Sounds \u2014 cat');

    // Focus Skip and press it on Start screen -> auto-starts directly into Question 1 (no name prompt!)
    p.skipBtn().focus();
    p.childFocusLog.length = 0;
    p.skipBtn().click();
    await p.tick();
    expect(p.childDoc().getElementById('learner-name')).toBeNull();
    expect(p.childHeading()).toContain('1 of 3');
    expect(p.prevBtn().disabled).toBe(true);
    expect(p.skipBtn().disabled).toBe(false);
    expect(p.pd.activeElement).toBe(p.skipBtn());
    expect(p.childFocusLog).toEqual([]);
    // Navigation status is announced via .sr-only live region without visibly duplicating .try-edit-where in .try-edit-said.
    expect(p.saidEl()).toBeNull();
    expect(p.navStatusEl().getAttribute('role')).toBe('status');
    expect(p.navStatusEl().classList.contains('sr-only')).toBe(true);
    expect(p.navStatusEl().textContent).toBe('Question 1 of 3: Find Sounds \u2014 cat');

    // Skip Q1 -> Q2
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toContain('2 of 3');
    expect(p.whereText()).toBe('Question 2 of 3: Find Sounds \u2014 map');
    expect(p.prevBtn().disabled).toBe(false);
    expect(p.jumpSel().value).toBe('1');
    expect(p.pd.activeElement).toBe(p.skipBtn());

    // Skip Q2 -> Q3
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toContain('3 of 3');
    expect(p.whereText()).toBe('Question 3 of 3: Find Sounds \u2014 sun');
    expect(p.skipBtn().disabled).toBe(false);

    // Skip Q3 (last item) -> End screen; repeatMissed must NOT re-queue skipped items, zero NaN
    p.skipBtn().click();
    await p.tick();
    expect(p.whereText()).toContain('End of file');
    expect(p.skipBtn().disabled).toBe(true);
    expect(p.prevBtn().disabled).toBe(false);
    expect(p.jumpSel().value).toBe('end');
    // Focus falls back cleanly to Previous when Skip becomes disabled at End screen
    expect(p.pd.activeElement).toBe(p.prevBtn());
    expect(p.childApp()).toContain('0 of 3');
    expect(p.childApp()).not.toMatch(/NaN|Infinity/);
    expect(p.childDoc().querySelector('[data-done-again]')).toBeNull();

    // Previous from End screen returns to last item (Q3)
    p.prevBtn().click();
    await p.tick();
    expect(p.childHeading()).toContain('3 of 3');
    expect(p.whereText()).toBe('Question 3 of 3: Find Sounds \u2014 sun');
    expect(p.skipBtn().disabled).toBe(false);
    expect(p.pd.activeElement).toBe(p.prevBtn());

    // Jump directly to Question 1 via select dropdown
    p.jumpSel().focus();
    p.jumpSel().value = '0';
    p.jumpSel().dispatchEvent(new p.pw.Event('change', { bubbles: true }));
    await p.tick();
    expect(p.childHeading()).toContain('1 of 3');
    expect(p.whereText()).toBe('Question 1 of 3: Find Sounds \u2014 cat');
    expect(p.pd.activeElement).toBe(p.jumpSel());

    // Jump directly to End screen
    p.jumpSel().value = 'end';
    p.jumpSel().dispatchEvent(new p.pw.Event('change', { bubbles: true }));
    await p.tick();
    expect(p.whereText()).toContain('End of file');
    expect(p.childFocusLog).toEqual([]);
  });

  it('Vocab practice: skips items cleanly and cancels speechSynthesis via handle.stop() on nav', async () => {
    let cancelCalls = 0;
    const speechSpy = {
      cancel() { cancelCalls++; },
      getVoices() { return [{ lang: 'en-US', localService: true }]; },
      speak() {},
    };
    const p = await mountFullPreview(buildVocabHtml(), {
      speechSpy,
      describe: (l) => l.blocks[0].items.map((it) => ({
        itemId: String(it.id),
        activity: 'vocab_meaning',
        word: String(it.word),
        sample: false,
        label: 'Word to meaning \u2014 ' + it.word,
        canSwap: false,
        canTogglePicture: false,
        noPicture: false,
      })),
    });

    p.skipBtn().click();
    await p.tick();
    expect(p.childApp()).toContain('enormous');

    const beforeCancel = cancelCalls;
    p.skipBtn().click();
    await p.tick();
    expect(p.childApp()).toContain('fragile');
    expect(cancelCalls).toBeGreaterThan(beforeCancel);

    p.prevBtn().click();
    await p.tick();
    expect(p.childApp()).toContain('enormous');
  });

  it('Math Practice (CCC): skips cards without having to cover/type each card, and reaches End screen cleanly', async () => {
    const p = await mountFullPreview(buildMathPracticeHtml());
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toContain('1 of 3');
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toContain('2 of 3');
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toContain('3 of 3');
    p.skipBtn().click();
    await p.tick();
    expect(p.whereText()).toContain('End of file');
    expect(p.childApp()).not.toMatch(/NaN|Infinity/);
  });

  it('Symbol Runner (lock-on mode): steps cleanly without stealing keyboard focus from #try-edit', async () => {
    const p = await mountFullPreview(buildSymbolRunnerHtml({ control: 'lockon' }));
    p.skipBtn().focus();
    p.childFocusLog.length = 0;

    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toMatch(/1 of \d+/);
    expect(p.childFocusLog).toEqual([]);
    expect(p.pd.activeElement).toBe(p.skipBtn());

    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toMatch(/2 of \d+/);
    expect(p.childFocusLog).toEqual([]);
    expect(p.pd.activeElement).toBe(p.skipBtn());

    p.prevBtn().focus();
    p.prevBtn().click();
    await p.tick();
    expect(p.childHeading()).toMatch(/1 of \d+/);
    expect(p.childFocusLog).toEqual([]);
  });

  it('Read-Along: packets-read-along.js wires read-only hostPreview and preview nav steps between pages', async () => {
    const raJs = read('packets-read-along.js');
    expect(raJs).toContain('hostPreview');
    expect(raJs).toContain('stopPreview');

    const p = await mountFullPreview(buildReadAlongHtml());
    // Read-only host: zero maker action buttons, but full nav bar
    expect(p.bar().querySelectorAll('[data-preview-act]')).toHaveLength(0);
    expect(p.skipBtn()).toBeTruthy();

    p.skipBtn().click();
    await p.tick();
    expect(p.childApp()).toContain('Page one sentence one.');

    p.skipBtn().click();
    await p.tick();
    expect(p.childApp()).toContain('Page two sentence one.');

    p.prevBtn().click();
    await p.tick();
    expect(p.childApp()).toContain('Page one sentence one.');
  });

  it('Math Check (with practice item): steps through Start -> Practice -> Ready -> Run -> Done and clears rec.done when stepping back', async () => {
    const p = await mountFullPreview(buildMathCheckHtml({ practice: 1, timeLimitS: 60 }));
    // Start -> Skip -> Practice item 0
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toMatch(/Practice 1 of 1/i);

    // Practice -> Skip -> Ready screen
    p.skipBtn().click();
    await p.tick();
    expect(p.childDoc().querySelector('[data-check-begin]')).toBeTruthy();

    // Ready -> Skip -> Run item 1 (scored item 1 of 3)
    p.skipBtn().click();
    await p.tick();
    expect(p.childDoc().querySelector('[data-stop]')).toBeTruthy();
    expect(p.childHeading()).toMatch(/1 of 3/);

    // Answer item 1 (wait >250ms debounce or just navigate, let's test answering item 1 then stepping back!)
    await new Promise((r) => setTimeout(r, 270));
    const digitBtn = p.childDoc().querySelector('[data-key="5"]') || [...p.childDoc().querySelectorAll('#app button')].find((b) => b.textContent.trim() === '5');
    const enterBtn = p.childDoc().querySelector('[data-key="next"]') || [...p.childDoc().querySelectorAll('#app button')].find((b) => /Next|Enter|Check/i.test(b.textContent));
    if (digitBtn && enterBtn) {
      digitBtn.click();
      enterBtn.click();
      await p.tick();
      // Now on scored item 2 of 3
      expect(p.childHeading()).toMatch(/2 of 3/);
      // Step backward to scored item 1: rec.done MUST be cleared so runItem() renders item 1 fresh (not skipped!)
      p.prevBtn().click();
      await p.tick();
      expect(p.childHeading()).toMatch(/1 of 3/);
      expect(p.childDoc().querySelector('[data-stop]')).toBeTruthy();
    }

    // Step forward through remaining items to Done
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toMatch(/2 of 3/);
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toMatch(/3 of 3/);
    p.skipBtn().click();
    await p.tick();
    expect(p.whereText()).toContain('End of file');
    expect(p.childDoc().querySelector('[data-teacher]')).toBeTruthy();
    expect(p.childApp()).not.toMatch(/NaN|Infinity/);

    // Previous from Check End screen returns to last scored item (3 of 3)
    p.prevBtn().click();
    await p.tick();
    expect(p.childHeading()).toMatch(/3 of 3/);
    expect(p.childDoc().querySelector('[data-stop]')).toBeTruthy();
  });

  it('Math Check (no practice items): Skip on Start auto-enters Run at item 0 and Jump reaches End screen cleanly', async () => {
    const p = await mountFullPreview(buildMathCheckHtml({ practice: 0, timeLimitS: null }));
    p.skipBtn().click();
    await p.tick();
    expect(p.childHeading()).toMatch(/1 of 3/);
    expect(p.childDoc().querySelector('[data-stop]')).toBeTruthy();

    p.jumpSel().value = '2';
    p.jumpSel().dispatchEvent(new p.pw.Event('change', { bubbles: true }));
    await p.tick();
    expect(p.childHeading()).toMatch(/3 of 3/);

    p.jumpSel().value = 'end';
    p.jumpSel().dispatchEvent(new p.pw.Event('change', { bubbles: true }));
    await p.tick();
    expect(p.whereText()).toContain('End of file');
    expect(p.childDoc().querySelector('[data-teacher]')).toBeTruthy();
  });

  it('Hide answers keeps Jump dropdown options and live status quiet (zero leaked words)', async () => {
    const html = buildWordSoundsHtml();
    const p = await mountFullPreview(html, {
      describe: (l) => l.blocks[0].items.map((it) => ({
        itemId: String(it.id),
        activity: 'isolation',
        word: String(it.word),
        sample: false,
        label: 'Find Sounds \u2014 ' + it.word,
        canSwap: false,
        canTogglePicture: false,
        noPicture: false,
      })),
    });

    // Before Hide answers (on Start screen): disabled/hidden Start screen placeholder + words visible in Jump dropdown
    expect(p.jumpSel().value).toBe('');
    const optionsBefore = [...p.jumpSel().options].map((o) => o.textContent);
    expect(optionsBefore).toEqual([
      'Start screen',
      '1. Find Sounds \u2014 cat',
      '2. Find Sounds \u2014 map',
      '3. Find Sounds \u2014 sun',
      'End screen',
    ]);

    // Turn Hide answers ON
    p.hideBtn().click();
    const optionsQuiet = [...p.jumpSel().options].map((o) => o.textContent);
    expect(optionsQuiet).toEqual([
      'Start screen',
      'Question 1: Find Sounds',
      'Question 2: Find Sounds',
      'Question 3: Find Sounds',
      'End screen',
    ]);
    for (const secret of ['cat', 'map', 'sun']) {
      expect(p.bar().textContent).not.toContain(secret);
    }

    // Skip while Hide answers is ON -> live status must ALSO stay quiet and Start screen placeholder drops once started
    p.skipBtn().click();
    await p.tick();
    p.skipBtn().click();
    await p.tick();
    for (const secret of ['cat', 'map', 'sun']) {
      expect(p.bar().textContent).not.toContain(secret);
    }
    expect(p.saidEl()).toBeNull();
    expect(p.navStatusEl().textContent).toBe('Question 2 of 3: Find Sounds');

    // Turn Hide answers OFF -> words return
    p.hideBtn().click();
    expect([...p.jumpSel().options].map((o) => o.textContent)[1]).toBe('2. Find Sounds \u2014 map');
  });

  it('Security invariants: standalone files, non-sandboxed frames, packets-open.html (no nav token), wrong token, and wrong source ALL ignore alloflow-packet-nav', async () => {
    const wsHtml = buildWordSoundsHtml();
    const checkHtml = buildMathCheckHtml({ practice: 0, timeLimitS: 60 });
    const withSnap = (html, payload) => html.replace(
      '</head>',
      '<script type="application/json" id="packet-store-snapshot">' + JSON.stringify(payload).replace(/</g, '\\u003c') + '</script></head>',
    );
    const validToken = '0123456789abcdef0123456789abcdef';

    // 1. Standalone downloaded student file (even if tampered with a nav snapshot!)
    const standalone = new JSDOM(withSnap(wsHtml, { kind: 'alloflow-packet-store', items: {}, nav: validToken }), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://student.test/',
      beforeParse(w) { w.Audio = class { play() { return Promise.resolve(); } pause() {} }; },
    });
    opened.push(standalone.window);
    standalone.window.dispatchEvent(new standalone.window.MessageEvent('message', {
      data: { kind: 'alloflow-packet-nav', token: validToken, action: 'next' },
      source: standalone.window,
    }));
    expect(standalone.window.document.getElementById('learner-name')).toBeTruthy();

    // 2. Framed file with working localStorage (NOT sandboxed)
    const fakeParent = { postMessage() {} };
    const unsandboxed = new JSDOM(withSnap(wsHtml, { kind: 'alloflow-packet-store', items: {}, nav: validToken }), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://student.test/',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        Object.defineProperty(w, 'parent', { configurable: true, value: fakeParent });
      },
    });
    opened.push(unsandboxed.window);
    unsandboxed.window.dispatchEvent(new unsandboxed.window.MessageEvent('message', {
      data: { kind: 'alloflow-packet-nav', token: validToken, action: 'next' },
      source: fakeParent,
    }));
    expect(unsandboxed.window.document.getElementById('learner-name')).toBeTruthy();

    // 3. packets-open.html student wrapper (sandboxed, snapshot WITHOUT nav token)
    const openStyle = new JSDOM(withSnap(checkHtml, { kind: 'alloflow-packet-store', items: {} }), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://take-home.test/',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        Object.defineProperty(w, 'localStorage', { configurable: true, get() { throw new w.DOMException('Sandboxed', 'SecurityError'); } });
        Object.defineProperty(w, 'parent', { configurable: true, value: fakeParent });
      },
    });
    opened.push(openStyle.window);
    openStyle.window.dispatchEvent(new openStyle.window.MessageEvent('message', {
      data: { kind: 'alloflow-packet-nav', token: '', action: 'next' },
      source: fakeParent,
    }));
    expect(openStyle.window.document.getElementById('learner-name')).toBeTruthy();

    // 4. Short nav token (< 16 chars) is rejected
    const shortTok = new JSDOM(withSnap(wsHtml, { kind: 'alloflow-packet-store', items: {}, nav: 'short-token' }), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://take-home.test/',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        Object.defineProperty(w, 'localStorage', { configurable: true, get() { throw new w.DOMException('Sandboxed', 'SecurityError'); } });
        Object.defineProperty(w, 'parent', { configurable: true, value: fakeParent });
      },
    });
    opened.push(shortTok.window);
    shortTok.window.dispatchEvent(new shortTok.window.MessageEvent('message', {
      data: { kind: 'alloflow-packet-nav', token: 'short-token', action: 'next' },
      source: fakeParent,
    }));
    expect(shortTok.window.document.getElementById('learner-name')).toBeTruthy();

    // 5. Real sandboxed preview rejects wrong token AND wrong source
    const p = await mountFullPreview(wsHtml);
    const cw = p.childWin();
    const snap = JSON.parse(cw.document.getElementById('packet-store-snapshot').textContent);
    expect(typeof snap.nav).toBe('string');
    expect(snap.nav.length).toBeGreaterThanOrEqual(16);

    // Wrong token from right source
    cw.dispatchEvent(new cw.MessageEvent('message', {
      data: { kind: 'alloflow-packet-nav', token: 'wrong-token-0000000000000000', action: 'next' },
      source: cw.__parentProxy,
    }));
    expect(cw.document.getElementById('learner-name')).toBeTruthy();

    // Right token from wrong source
    cw.dispatchEvent(new cw.MessageEvent('message', {
      data: { kind: 'alloflow-packet-nav', token: snap.nav, action: 'next' },
      source: {},
    }));
    expect(cw.document.getElementById('learner-name')).toBeTruthy();

    // 6. packets_verify_core.js stays 100% clean on generated practice & check files
    for (const [name, sample] of [['practice', wsHtml], ['check', checkHtml]]) {
      const report = verify.verifyPacket(sample, { name: name + '.html' });
      const bad = report.findings.filter((f) => f.cls === 'unexpected' || f.cls === 'look');
      expect(bad, name + ' verify findings').toEqual([]);
    }
  });
});
