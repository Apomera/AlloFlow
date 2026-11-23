import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');

const tool = require('../dev-tools/make_word_sounds_packet.cjs');
const { core, loader } = tool.loadParts();
const mathPracticeBuilder = require('../packet_math_practice_builder.js');
const checkBuilder = require('../packet_check_builder.js');
const symbolRunnerBuilder = require('../packet_symbol_runner_builder.js');
const reader = require('../packets_results_reader.js');
const verify = require('../packets_verify_core.js');

const opened = [];
const sessions = [];
afterEach(() => {
  vi.useRealTimers();
  while (sessions.length) { try { sessions.pop().stop(); } catch (_) {} }
  while (opened.length) { try { opened.pop().close(); } catch (_) {} }
});

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

function buildWordSoundsHtml({ mixed = false } = {}) {
  const mkWord = (w, pos, correct, options) => ({
    word: w,
    targetWord: w,
    term: w,
    _ttsAssets: { [w]: { mime: 'audio/wav', base64: wav(w) } },
    activityItems: {
      isolation: { position: pos, correctSound: correct, options },
      ...(mixed ? { blending: { phonemes: w.split(''), options: [w, 'dog', 'cup', 'pig'] } } : {}),
    },
  });
  const { lesson } = loader.lessonFromPack([
    mkWord('cat', 0, 'k', ['k', 'a', 't', 'm']),
    mkWord('map', 2, 'p', ['m', 'a', 'p', 's']),
    mkWord('sun', 0, 's', ['s', 'u', 'n', 'k']),
  ], {
    core,
    banks: BANKS,
    title: 'Short vowels',
    lessonId: mixed ? 'L-ux-mixed' : 'L-ux-ws',
    ...(mixed ? { activities: ['isolation', 'blending'], order: 'mixed' } : {}),
  });
  if (mixed) {
    // Ensure a second block exists when lessonFromPack filters or builds blocks
    if (lesson.blocks.length < 2) {
      lesson.activityTitles.blending = 'Blend Sounds';
      lesson.blocks.push({
        activity: 'blending',
        items: lesson.blocks[0].items.map((it, i) => ({
          id: 'blending-' + i,
          word: it.word,
          answer: it.word,
          choices: [it.word, 'dog', 'cup', 'pig'],
        })),
      });
    }
    lesson.sequence = [];
    for (let i = 0; i < lesson.blocks[0].items.length; i++) {
      lesson.sequence.push(lesson.blocks[0].items[i].id, lesson.blocks[1].items[i].id);
    }
  }
  return loader.buildHtml(lesson, { core });
}

function buildMathPracticeHtml() {
  const lesson = mathPracticeBuilder.lessonFromMathPractice({ loader, mode: 'ccc', facts: '2+2, 3+4, 5+1' });
  return mathPracticeBuilder.buildMathPracticePacket({ lesson, loader }).html;
}

function buildMathCheckHtml() {
  const lesson = checkBuilder.lessonFromMathProblems({
    title: 'Facts to 20',
    problems: checkBuilder.parseProblems('7+8, 12-5, 9+6'),
    timeLimitS: 60,
  });
  return checkBuilder.buildCheckPacket({ lesson, loader }).html;
}

function buildSymbolRunnerHtml() {
  const plan = symbolRunnerBuilder.planSymbolRunner({ mode: 'confusable_letters', control: 'lockon', count: 3, seed: 7 });
  const built = symbolRunnerBuilder.lessonFromSymbolRunner({ plan, title: 'Confusable Letters', loader });
  return symbolRunnerBuilder.buildSymbolRunnerPacket({ lesson: built.lesson || built, loader }).html;
}

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

async function mountPreview(html, { describe: describeFn, onAction, fullscreen = 'missing' } = {}) {
  const Bus = channelBus();
  const previewId = 'blob:https://packets.test/ux-preview-' + Math.random().toString(36).slice(2, 8);
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

  if (fullscreen === 'reject') {
    pd.documentElement.requestFullscreen = () => Promise.reject(new Error('declined'));
  } else {
    delete pd.documentElement.requestFullscreen;
    delete pd.documentElement.webkitRequestFullscreen;
  }

  const blobs = new Map();
  let seq = 0;
  let childWin = null;
  let childDoc = null;

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
        Object.defineProperty(cw, 'localStorage', {
          configurable: true,
          get() { throw new cw.DOMException('The document is sandboxed.', 'SecurityError'); },
        });
        Object.defineProperty(cw, 'parent', { configurable: true, value: childParentProxy });
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
  }

  pw.eval(read('packets-try.js'));
  await new Promise((r) => setTimeout(r, 25));
  const frameEl = pd.querySelector('iframe.try-frame');
  mountChildFromBlob(frameEl.src);
  await new Promise((r) => setTimeout(r, 20));

  return {
    pw,
    pd,
    childDoc: () => childDoc,
    bar: () => pd.getElementById('try-edit'),
    where: () => pd.querySelector('.try-edit-where')?.textContent || '',
    said: () => pd.querySelector('.try-edit-said')?.textContent || '',
    navStatus: () => pd.querySelector('[data-preview-nav-status]')?.textContent || '',
    jump: () => pd.querySelector('.try-nav-select'),
    hideBtn: () => pd.querySelector('[data-preview-hide]'),
    moreBtn: () => pd.querySelector('[data-preview-more]'),
    presentBtn: () => pd.getElementById('try-present'),
    tab: () => pd.getElementById('try-tab'),
    tick: (ms = 20) => new Promise((r) => setTimeout(r, ms)),
  };
}

// ============================================================================
// 1. Preview & Projector + Shared Header CSS (.top-menu)
// ============================================================================
describe('1. Preview & Projector UX + shared .top-menu contract', () => {
  it('whereQuiet hides non-math item.label when describe is absent, while preserving math prompts', async () => {
    const ws = await mountPreview(buildWordSoundsHtml());
    // Jump from start screen to Question 1 (Word Sounds, no custom describe)
    const j1 = ws.jump();
    expect(j1.value).toBe('');
    expect(j1.options[0].textContent).toBe('Start screen');
    expect(j1.options[0].disabled).toBe(true);
    expect(j1.options[0].hidden).toBe(true);

    j1.value = '0';
    j1.dispatchEvent(new ws.pw.Event('change', { bubbles: true }));
    await ws.tick();
    expect(ws.where()).toContain('Question 1 of 3');
    expect(ws.where()).toContain('cat');

    ws.hideBtn().click();
    await ws.tick();
    expect(ws.where()).toBe('Question 1 of 3');
    expect(ws.where()).not.toContain('cat');

    // Symbol Runner without describe also hides the target letter
    const sr = await mountPreview(buildSymbolRunnerHtml());
    sr.jump().value = '0';
    sr.jump().dispatchEvent(new sr.pw.Event('change', { bubbles: true }));
    await sr.tick();
    sr.hideBtn().click();
    await sr.tick();
    expect(sr.where()).toMatch(/^Question 1 of \d+$/);
    expect(sr.where()).not.toContain(':');

    // Math practice without describe keeps the problem text ("2 + 2")
    const math = await mountPreview(buildMathPracticeHtml());
    math.jump().value = '0';
    math.jump().dispatchEvent(new math.pw.Event('change', { bubbles: true }));
    await math.tick();
    math.hideBtn().click();
    await math.tick();
    expect(math.where()).toBe('Question 1 of 3: 2 + 2');
  });

  it('routes nav announcements into an sr-only live region instead of duplicating .try-edit-where in .try-edit-said', async () => {
    const html = buildWordSoundsHtml();
    const p = await mountPreview(html, {
      onAction: () => ({ html, said: 'Removed from this file.' }),
    });
    const jump = p.jump();
    jump.value = '0';
    jump.dispatchEvent(new p.pw.Event('change', { bubbles: true }));
    await p.tick();

    const status = p.pd.querySelector('[data-preview-nav-status]');
    expect(status).toBeTruthy();
    expect(status.classList.contains('sr-only')).toBe(true);
    expect(status.getAttribute('role')).toBe('status');
    expect(p.navStatus()).toBe(p.where());
    expect(p.said()).toBe('');

    // Edit confirmation still renders visibly inside .try-edit-said
    p.pd.querySelector('[data-preview-act="remove"]').click();
    await p.tick(30);
    expect(p.said()).toBe('Removed from this file.');
  });

  it('provides compact narrow-screen More toggle, desktop divider, 44px jump select, and clearer Present Menu tab', async () => {
    const html = buildWordSoundsHtml();
    const p = await mountPreview(html, {
      onAction: () => ({ html, said: 'Removed from this file.' }),
      fullscreen: 'reject',
    });

    // Enter Present mode -> fullscreen declines -> Menu tab clearly labeled & body.try-no-full set
    p.presentBtn().click();
    await p.tick(30);
    expect(p.pd.body.classList.contains('try-present')).toBe(true);
    expect(p.pd.body.classList.contains('try-no-full')).toBe(true);
    expect(p.tab().querySelector('.try-tab-label').textContent).toBe('Menu');

    // Toggle More / Less on narrow toolbar controls
    const more = p.moreBtn();
    expect(more).toBeTruthy();
    expect(more.textContent).toBe('More');
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(p.bar().classList.contains('try-more-open')).toBe(false);

    more.click();
    expect(p.bar().classList.contains('try-more-open')).toBe(true);
    expect(more.textContent).toBe('Less');
    expect(more.getAttribute('aria-expanded')).toBe('true');

    // Jump to Q1 -> re-renders bar and preserves open state + wraps actions in .try-edit-actions
    p.jump().value = '0';
    p.jump().dispatchEvent(new p.pw.Event('change', { bubbles: true }));
    await p.tick();
    expect(p.bar().classList.contains('try-more-open')).toBe(true);
    expect(p.pd.querySelector('.try-edit-actions')).toBeTruthy();

    // Verify packets-try.js has no forbidden single-quoted strings
    const tryCode = read('packets-try.js').split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
    const strings = [...tryCode.matchAll(/'([^'\\]*(?:\\.[^'\\]*)*)'/g)].map((m) => m[1]);
    for (const s of strings) {
      expect(s, 'forbidden term in packets-try.js: ' + s).not.toMatch(/practice|math|check|learner/i);
      expect(s, 'forbidden assessment term in packets-try.js: ' + s).not.toMatch(/\btests?\b|\bquiz|\bassessments?\b|\bprobes?\b/i);
    }

    // Verify packets.css rules for toolbar, Present tab, and shared .top-menu contract
    const css = read('packets.css');
    expect(css).toMatch(/\.try-nav-select\s*\{[^}]*min-height:\s*2\.75rem/);
    expect(css).toMatch(/\.try-edit-nav\s*\+\s*\.try-edit-actions\s*\{[^}]*border-left:/);
    expect(css).toMatch(/@media\s*\(max-width:\s*37\.5rem\)[\s\S]*\.try-edit-extra\s*\{\s*display:\s*none;\s*\}/);
    expect(css).toMatch(/\.try-present\s+\.try-tab\s*\{[^}]*min-height:\s*2rem/);
    expect(css).toMatch(/\.try-present\.try-no-full\s+\.try-tab\s*\{/);
    expect(css).toMatch(/\.top-menu\s*>/);
    expect(css).toMatch(/\.top-menu\s*>\s*nav\s+a\s*\{[^}]*min-height:\s*2\.75rem/);
    expect(css).toMatch(/@media\s+print[\s\S]*\.top-menu\s*\{[^}]*display:\s*none\s*!important/);
  });
});

// ============================================================================
// 2. Student Offline Runtime (word_sounds_take_home_loader.js)
// ============================================================================
describe('2. Student offline runtime polish', () => {
  function mountPacket(html, { storage = {} } = {}) {
    const saved = [];
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://packet.test/ws.html',
      beforeParse(w) {
        w.Audio = class { play() { return Promise.resolve(); } pause() {} };
        w.Blob = KeepBlob;
        w.URL.createObjectURL = (blob) => { saved.push(blob); return 'blob:dl-' + saved.length; };
        w.URL.revokeObjectURL = () => {};
        w.HTMLAnchorElement.prototype.click = function () { saved[saved.length - 1].name = this.getAttribute('download'); };
        for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v);
      },
    });
    opened.push(dom.window);
    return { w: dom.window, d: dom.window.document, saved };
  }

  it('ships phone #lt-stop docking CSS, clearer voice-speed hint, and folded More reading tools', () => {
    const html = buildWordSoundsHtml();
    const { d } = mountPacket(html);
    const css = d.querySelector('style').textContent;
    expect(css).toContain('[data-step] .lt-bar{flex-wrap:wrap}');
    expect(css).toContain('@media (max-width:480px){[data-step] [data-player-stop-audio]{flex-basis:100%}}');

    // Open Reading Tools panel
    const openBtn = d.querySelector('[data-tools-open]');
    openBtn.click();
    const panel = d.getElementById('lt-panel');
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector('[data-tools-close-top]')).toBeTruthy();

    // Voice speed hint updated
    const speedGroup = panel.querySelector('[data-tool-group="speed"]');
    expect(speedGroup.textContent).toContain('Changes how fast recorded words and read-aloud play.');

    // Secondary tools live inside a closed <details class="lt-more">
    const more = panel.querySelector('details.lt-more');
    expect(more).toBeTruthy();
    expect(more.open).toBe(false);
    expect(more.querySelector('summary').textContent).toBe('More reading tools');
    expect(more.querySelector('[data-tool-custom-size]')).toBeTruthy();
    expect(more.querySelector('[data-tool-custom-bg]')).toBeTruthy();
    expect(more.querySelector('[data-tool-custom-ink]')).toBeTruthy();
    expect(more.querySelector('[data-tool="sounds-0"]')).toBeTruthy();
    expect(more.querySelector('[data-tool="bold-0"]')).toBeTruthy();

    // Core tools stay outside the fold
    expect(panel.querySelector('[data-tool="size-0"]').closest('details.lt-more')).toBeNull();
    expect(panel.querySelector('[data-tool="colors-0"]').closest('details.lt-more')).toBeNull();
    expect(panel.querySelector('[data-tool="spacing-0"]').closest('details.lt-more')).toBeNull();
    expect(panel.querySelector('[data-tool="speed-0"]').closest('details.lt-more')).toBeNull();

    // Toggling details.lt-more toggles .lt-m on #lt-panel (controlling Magnifier visibility via CSS)
    expect(panel.classList.contains('lt-m')).toBe(false);
    more.open = true;
    more.dispatchEvent(new d.defaultView.Event('toggle'));
    expect(panel.classList.contains('lt-m')).toBe(true);
    expect(css).toContain('.lt-panel:not(.lt-m) [data-tool-group=lens]{display:none}');
  });

  it('supports Enter on #learner-name, shows (Question X of Y) in resume note, shows bold mixed progress, and hides [data-last-step] on save', () => {
    const html = buildWordSoundsHtml({ mixed: true });
    const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]);
    const key = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
    const allItems = lesson.blocks.flatMap((b) => b.items.map((it) => ({
      itemId: it.id, activity: b.activity, word: it.word, responses: [], attempts: 0,
      firstTry: false, correct: false, done: false, ms: 0, supports: {},
    })));
    expect(allItems.length).toBe(6);

    // 1. Fresh start: pressing Enter in #learner-name starts immediately
    const p1 = mountPacket(html);
    const nameInput = p1.d.getElementById('learner-name');
    nameInput.value = 'BlueHeron7';
    nameInput.dispatchEvent(new p1.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const prog = p1.d.querySelector('[data-progress]');
    expect(prog).toBeTruthy();
    expect(prog.textContent).toMatch(/^Question 1 of 6 \(/);
    expect(prog.getAttribute('style')).toContain('font-weight:700');

    // 2. Saved progress (Question 3 of 6): resume note includes both exact name line and (Question 3 of 6)
    const savedState = JSON.stringify({
      sessionId: 'S-resume',
      name: 'BlueHeron7',
      startedAt: '2026-11-20T15:00:00.000Z',
      index: 2,
      items: allItems,
    });
    const p2 = mountPacket(html, { storage: { [key]: savedState } });
    expect(p2.d.querySelector('[data-continue-name]').textContent).toBe('Answers so far by: BlueHeron7.');
    expect(p2.d.querySelector('[data-continue-progress]').textContent).toBe('(Question 3 of 6)');
    // Pressing Enter resumes straight to Question 3
    p2.d.getElementById('learner-name').dispatchEvent(new p2.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(p2.d.querySelector('[data-progress]').textContent).toMatch(/^Question 3 of 6 \(/);

    // 3. Resume without name still displays (Question 3 of 6)
    const anonState = JSON.stringify({
      sessionId: 'S-anon',
      name: '',
      startedAt: '2026-11-20T15:00:00.000Z',
      index: 2,
      items: allItems,
    });
    const p3 = mountPacket(html, { storage: { [key]: anonState } });
    expect(p3.d.querySelector('[data-continue-name]')).toBeNull();
    expect(p3.d.querySelector('[data-continue-progress]').textContent).toBe('(Question 3 of 6)');

    // 4. End screen: clicking Save my work hides [data-last-step] immediately
    const wsSimple = buildWordSoundsHtml();
    const lSimple = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(wsSimple)[1]);
    const kSimple = 'alloflow-take-home:' + lSimple.lessonId + ':' + lSimple.revision;
    const doneState = JSON.stringify({
      sessionId: 'S-done',
      name: 'BlueHeron7',
      startedAt: '2026-11-20T15:00:00.000Z',
      finishedAt: '2026-11-20T15:02:00.000Z',
      index: lSimple.blocks[0].items.length,
      items: lSimple.blocks[0].items.map((it) => ({
        itemId: it.id, activity: 'isolation', word: it.word, target: it.correct,
        responses: [it.correct], attempts: 1, firstTry: true, correct: true, done: true, ms: 1200, supports: {},
      })),
    });
    const p4 = mountPacket(wsSimple, { storage: { [kSimple]: doneState } });
    p4.d.querySelector('[data-see-results]').click();
    const lastStep = p4.d.querySelector('[data-last-step]');
    expect(lastStep).toBeTruthy();
    expect(lastStep.hidden).toBe(false);

    // Visible buttons outside <details data-grown-ups> remain strictly Save my work + Practice again
    const outside = [...p4.d.querySelectorAll('#app .card button')]
      .filter((b) => !b.closest('details') && !b.hidden && !b.closest('[hidden]'))
      .map((b) => b.textContent);
    expect(outside).toEqual(['Save my work', 'Practice again']);

    p4.d.querySelector('[data-save-csv]').click();
    expect(lastStep.hidden).toBe(true);
    expect(p4.saved.length).toBe(1);
  });

  it('passes packets_verify_core with zero unexpected findings and preserves runtime invariants', () => {
    const wsHtml = buildWordSoundsHtml();
    const ckHtml = buildMathCheckHtml();
    for (const [name, html] of [['practice', wsHtml], ['check', ckHtml]]) {
      const rep = verify.verifyPacket(html, name + '.html');
      expect(rep.headline, name).toBe(verify.HEADLINE.closed);
      expect(rep.findings.filter((f) => f.cls !== 'expected in this kind of file'), name).toEqual([]);
      const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
      expect((script.match(/\.postMessage\(/g) || []).length, name).toBe(1);
      expect((script.match(/storageKey\s*=/g) || []).length, name).toBe(1);
      expect(script, name).not.toContain('alloflow-packets-preview');
      expect(script, name).not.toContain('preview-act');
    }
  });
});

// ============================================================================
// 3. Student Phone Opener (packets-open.html, packets-open.js, packets-open.css)
// ============================================================================
describe('3. Student phone opener UX', () => {
  async function openOpener({ share = false } = {}) {
    const dom = new JSDOM(read('packets-open.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-open.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.Blob = KeepBlob;
    w.URL.createObjectURL = () => 'blob:open-dl';
    w.URL.revokeObjectURL = () => {};
    w.HTMLAnchorElement.prototype.click = () => {};
    if (share) {
      w.navigator.canShare = (obj) => !!(obj && obj.files && obj.files.length);
      w.navigator.share = vi.fn().mockResolvedValue(undefined);
    }
    for (const src of ['packets-page.js', 'packets_verify_core.js', 'packets_handoff.js', 'packets-open.js']) {
      w.eval(read(src));
    }
    const $ = (id) => d.getElementById(id);
    const choose = async (text, name = 'practice.html') => {
      const input = $('file');
      Object.defineProperty(input, 'files', { configurable: true, value: [new w.File([text], name, { type: 'text/html' })] });
      input.dispatchEvent(new w.Event('change', { bubbles: true }));
      for (let i = 0; i < 80 && $('found').hidden && $('problem').hidden; i++) {
        await new Promise((r) => setTimeout(r, 10));
      }
    };
    const frame = () => d.querySelector('#run-host iframe');
    const post = (data) => w.dispatchEvent(new w.MessageEvent('message', {
      data,
      origin: 'null',
      source: frame().contentWindow,
    }));
    return { w, d, $, choose, frame, post };
  }

  it('includes Files/Downloads hint, promotes Share results file on mobile finish, and guards accidental Close', async () => {
    const wsHtml = buildWordSoundsHtml();
    const p = await openOpener({ share: true });

    // Guidance copy
    expect(p.$('pick-sub').textContent).toContain('Files or Downloads');

    await p.choose(wsHtml, 'short-vowels.html');
    p.$('start').click();
    expect(p.$('run').hidden).toBe(false);

    // 1st tap on Close while unfinished asks for confirmation instead of closing
    p.$('run-close').click();
    expect(p.$('run').hidden).toBe(false);
    expect(p.$('run-close').textContent).toBe('Tap again to close');
    expect(p.$('run-close').classList.contains('is-confirming')).toBe(true);
    expect(p.$('run-said').textContent).toContain('Tap again to close');

    // 2nd tap closes cleanly and resets button state
    p.$('run-close').click();
    expect(p.$('run').hidden).toBe(true);
    expect(p.$('run-close').textContent).toBe('Close');
    expect(p.$('run-close').classList.contains('is-confirming')).toBe(false);

    // Re-open, receive saved results -> Share results file promoted to btn-primary and Close works in 1 tap
    p.$('start').click();
    p.post({ kind: 'alloflow-packet-save', name: 'short-vowels__BlueHeron7.csv', type: 'text/csv;charset=utf-8', text: 'a,b\n1,2\n' });
    expect(p.$('run-share').hidden).toBe(false);
    expect(p.$('run-share').classList.contains('btn-primary')).toBe(true);

    p.$('run-close').click();
    expect(p.$('run').hidden).toBe(true);
    expect(p.$('run-share').classList.contains('btn-primary')).toBe(false);
  });

  it('auto-resets the 2-tap Close confirmation after 4 seconds and closes in 1 tap after a timed check finishes', async () => {
    const checkHtml = buildMathCheckHtml();
    const p = await openOpener({ share: false });
    await p.choose(checkHtml, 'check.html');
    const lesson = JSON.parse(/var lesson=(.*);\nvar labels=/.exec(checkHtml)[1]);
    const key = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;

    p.$('start').click();
    vi.useFakeTimers();
    p.$('run-close').click();
    expect(p.$('run-close').textContent).toBe('Tap again to close');
    vi.advanceTimersByTime(4100);
    expect(p.$('run-close').textContent).toBe('Close');
    expect(p.$('run-close').classList.contains('is-confirming')).toBe(false);
    vi.useRealTimers();

    // Once the check posts phase:'done', Close works on a single tap
    p.post({ kind: 'alloflow-packet-store', key, value: JSON.stringify({ check: { phase: 'done' } }) });
    p.$('run-close').click();
    expect(p.$('run').hidden).toBe(true);
  });
});

// ============================================================================
// 4. Results -> Next-Packet Loop (packets-results.html/js/css + reader)
// ============================================================================
describe('4. Results page -> next-packet loop UX', () => {
  const wall = (day, time, plus = 0) => new Date(Date.parse(day + 'T' + time + 'Z') + plus * 1000).toISOString().slice(0, 19) + '-05:00';
  const utc = (local) => new Date(Date.parse(local)).toISOString();
  const csvOf = (result) => {
    const table = loader.resultsCsv(result);
    return table.text({ method: 'sha256', value: loader.sha256(table.basis).hex });
  };
  const nameOf = (result) => loader.resultsCsv(result).stem + '.csv';

  function makePractice(learner, sid, answers) {
    const startedLocal = wall('2026-11-18', '10:00:00');
    const finishedLocal = wall('2026-11-18', '10:04:00');
    return {
      kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2',
      sessionId: sid,
      packet: { id: 'ws-short', version: 'r11111111', engine: 'alloflow-packet/1', form: '', mode: 'practice' },
      lessonId: 'ws-short', revision: 'r11111111', lessonTitle: 'Short vowels',
      activityTitles: { isolation: 'Find Sounds', math_ccc: 'Math facts' },
      learner, learnerName: learner, startedAt: utc(startedLocal), finishedAt: utc(finishedLocal),
      startedLocal, finishedLocal, durationMs: 240000, timesAreFromTheLearnerDevice: true,
      items: answers.map((a, i) => ({
        n: i + 1, itemId: a.activity + '-' + i, activity: a.activity, word: a.word, target: a.target,
        responses: a.picks, attempts: a.picks.length, firstTry: a.picks.length === 1 && !a.missed,
        correct: !a.missed, done: true, ms: 2000, supports: {}, practice: null, flag: '',
      })),
    };
  }

  function makeCheck(learner, sid, wrong = {}) {
    const probs = [[7, '+', 8], [12, '-', 5], [9, '+', 6]];
    const adapter = loader.CHECK_ADAPTERS.math_computation;
    const rows = [];
    const items = probs.map(([a, op, b], i) => {
      const right = String(op === '+' ? a + b : a - b);
      const typed = wrong[i] != null ? String(wrong[i]) : right;
      const mark = adapter.score({}, right, typed);
      rows.push({ practice: false, attempted: true, correct: mark.correct, digitsCorrect: mark.digitsCorrect, digitsPossible: mark.digitsPossible });
      return {
        n: i + 1, itemId: 'math_computation-' + i, activity: 'math_computation', word: a + ' ' + op + ' ' + b,
        target: right, responses: [typed], attempts: 1, firstTry: mark.correct, correct: mark.correct,
        done: true, ms: 3000, supports: {}, practice: null, flag: '',
        digitsCorrect: mark.digitsCorrect, digitsPossible: mark.digitsPossible,
      };
    });
    const startedLocal = wall('2026-11-18', '11:00:00');
    const finishedLocal = wall('2026-11-18', '11:01:30');
    const out = {
      kind: 'alloflow-take-home-result', schemaVersion: 3, player: 'alloflow-word-sounds-take-home/2',
      sessionId: sid,
      packet: { id: 'math-comp-g2', version: 'r22222222', engine: 'alloflow-packet/1', form: 'A', mode: 'check' },
      lessonId: 'math-comp-g2', revision: 'r22222222', lessonTitle: 'Math Fluency check (2A)',
      activityTitles: { math_computation: 'Math Fluency' },
      learner, learnerName: learner, startedAt: utc(startedLocal), finishedAt: utc(finishedLocal),
      startedLocal, finishedLocal, durationMs: 90000, timesAreFromTheLearnerDevice: true, items,
    };
    out.score = loader.checkScore({ measure: 'math_dcpm', scoreUnit: 'digits_correct_per_minute', timeLimitS: 120, scoringVersion: 3, formVersion: 2 }, rows,
      { elapsedMs: 90000, hiddenMs: 0, completion: 'complete', attempt: 1, flags: [] });
    return out;
  }

  async function openResults({ clipboard = true } = {}) {
    const dom = new JSDOM(read('packets-results.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-results.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    const copied = [];
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    Object.defineProperty(w.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
    w.HTMLElement.prototype.scrollIntoView = () => {};
    if (clipboard) {
      Object.defineProperty(w.navigator, 'clipboard', {
        configurable: true,
        value: { writeText: (text) => { copied.push(text); return Promise.resolve(); } },
      });
    }
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));
    const $ = (id) => d.getElementById(id);
    const drop = async (results) => {
      const files = results.map((r) => new w.File([csvOf(r)], nameOf(r), { type: 'text/csv' }));
      const ev = new w.Event('drop', { bubbles: true, cancelable: true });
      ev.dataTransfer = { types: ['Files'], files };
      $('main').dispatchEvent(ev);
      for (let i = 0; i < 300; i++) {
        if (/\bread[,.]/.test($('said').textContent)) break;
        await new Promise((r) => setTimeout(r, 10));
      }
    };
    const view = (name) => {
      const radio = d.querySelector('input[name="view"][value="' + name + '"]');
      radio.checked = true;
      radio.dispatchEvent(new w.Event('change', { bubbles: true }));
    };
    return { w, d, $, copied, drop, view };
  }

  it('consolidates Next practice links, copies group missed names, steps learners with prev/next, updates Print label, and surfaces missed check items', async () => {
    const pA = makePractice('BlueHeron7', 's-a1', [
      { activity: 'isolation', word: 'bed', target: 'd', picks: ['b', 'e'], missed: true },
      { activity: 'math_ccc', word: '7 × 8', target: '56', picks: ['54', '56'], missed: false },
    ]);
    const pB = makePractice('RedFox3', 's-b1', [
      { activity: 'isolation', word: 'bed', target: 'd', picks: ['b', 'e'], missed: true },
      { activity: 'math_ccc', word: '7 × 8', target: '56', picks: ['55', '56'], missed: false },
    ]);
    const cA = makeCheck('BlueHeron7', 's-a2', { 0: 14, 2: 16 });

    // 1. Reader helper checkMissedItems returns only missed attempted check items
    const parsedRes = await reader.read(csvOf(cA), { name: nameOf(cA) });
    expect(parsedRes.ok).toBe(true);
    const ckMissed = reader.checkMissedItems(parsedRes.sessions);
    expect(ckMissed.map((r) => [r.check, r.item, r.answers, r.times])).toEqual([
      ['Math Fluency', '7 + 8', ['14'], 1],
      ['Math Fluency', '9 + 6', ['16'], 1],
    ]);

    // 2. Results page: initially disabled Print button with 0 students
    const page = await openResults({ clipboard: true });
    expect(page.$('print-learner').disabled).toBe(true);
    expect(page.$('prev-learner').disabled).toBe(true);
    expect(page.$('next-learner').disabled).toBe(true);

    await page.drop([pA, pB, cA]);

    // Group view: single consolidated <section class="next-practice"> card (no stacked .actions rows)
    const groupCards = page.$('group-missed').querySelectorAll('section.next-practice');
    expect(groupCards).toHaveLength(1);
    expect(page.$('group-missed').querySelectorAll('p.actions')).toHaveLength(0);
    const groupHrefs = [...groupCards[0].querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(groupHrefs.some((h) => h.startsWith('packets-make.html#rehearse='))).toBe(true);
    expect(groupHrefs.some((h) => h.startsWith('packets-present-export.html#words='))).toBe(true);
    expect(groupHrefs.some((h) => h.startsWith('packets-math-practice.html#rehearse='))).toBe(true);

    // Quiet Copy names button on Most missed across the group copies newline-separated sorted code names
    const copyBtns = page.$('group-missed').querySelectorAll('button.copy-names.no-print');
    expect(copyBtns.length).toBeGreaterThanOrEqual(1);
    copyBtns[0].click();
    await new Promise((r) => setTimeout(r, 15));
    expect(page.copied[0]).toBe('BlueHeron7\nRedFox3');
    expect(page.$('said').textContent).toContain('Copied 2 names');

    // One-student view: prev/next buttons + dynamic Print <CodeName> + closed Missed items on checks fold above Next practice
    page.view('learner');
    expect(page.$('print-learner').disabled).toBe(false);
    expect(page.$('print-learner').textContent).toBe('Print BlueHeron7');
    expect(page.$('prev-learner').disabled).toBe(true);
    expect(page.$('next-learner').disabled).toBe(false);

    const fold = page.$('learner-body').querySelector('details.check-missed-fold');
    expect(fold).toBeTruthy();
    expect(fold.open).toBe(false);
    expect(fold.querySelector('summary').textContent).toBe('Missed items on checks (2)');
    expect(fold.textContent).toContain('7 + 8');
    expect(fold.textContent).toContain('9 + 6');

    const learnerCards = page.$('learner-body').querySelectorAll('section.next-practice');
    expect(learnerCards).toHaveLength(1);
    expect(page.$('learner-body').querySelectorAll(':scope > p.actions')).toHaveLength(0);
    expect(page.$('learner-body').querySelectorAll('p.actions a.nav-new-tab')).toHaveLength(0);
    // Check missed fold sits right above Next practice card
    expect(fold.nextElementSibling).toBe(learnerCards[0]);

    // Step to next student (RedFox3)
    page.$('next-learner').click();
    expect(page.$('print-learner').textContent).toBe('Print RedFox3');
    expect(page.$('prev-learner').disabled).toBe(false);
    expect(page.$('next-learner').disabled).toBe(true);

    // Step back to BlueHeron7
    page.$('prev-learner').click();
    expect(page.$('print-learner').textContent).toBe('Print BlueHeron7');

    // Fallback when clipboard is absent opens a read-only textarea inside the row
    const noClip = await openResults({ clipboard: false });
    await noClip.drop([pA, pB]);
    noClip.$('group-missed').querySelector('button.copy-names').click();
    const box = noClip.$('group-missed').querySelector('textarea.copy-names-box');
    expect(box).toBeTruthy();
    expect(box.readOnly).toBe(true);
    expect(box.value).toBe('BlueHeron7\nRedFox3');
  });
});

// ============================================================================
// 5. Verify, About & IT Pages
// ============================================================================
describe('5. Verify, About, and IT page polish', () => {
  it('places Copy this report and Print directly in .verdict outside closed details.part-it with zero browser storage', async () => {
    const dom = new JSDOM(read('packets-verify.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-verify.html',
    });
    const w = dom.window;
    const d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.HTMLElement.prototype.scrollIntoView = () => {};
    const copied = [];
    Object.defineProperty(w.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text) => { copied.push(text); return Promise.resolve(); } },
    });
    for (const s of d.querySelectorAll('script[src]')) w.eval(read(s.getAttribute('src')));

    // Drop a real built practice file
    const wsHtml = buildWordSoundsHtml();
    const ev = new w.Event('drop', { bubbles: true, cancelable: true });
    ev.dataTransfer = { types: ['Files'], files: [new w.File([wsHtml], 'practice.html', { type: 'text/html' })] };
    d.getElementById('main').dispatchEvent(ev);
    for (let i = 0; i < 200; i++) {
      if (d.querySelectorAll('.report').length >= 1) break;
      await new Promise((r) => setTimeout(r, 10));
    }

    const report = d.querySelector('.report');
    const verdict = report.querySelector('.verdict');
    const itFold = report.querySelector('details.part-it');
    expect(itFold.open).toBe(false);
    expect([...verdict.querySelectorAll('.actions.no-print button')].map((b) => b.textContent)).toEqual(['Copy this report', 'Print']);
    expect(itFold.querySelectorAll('.actions button')).toHaveLength(0);

    // Copy works without opening details.part-it
    verdict.querySelector('.actions button').click();
    await new Promise((r) => setTimeout(r, 15));
    expect(copied.length).toBe(1);
    expect(copied[0]).toContain('practice.html');

    // Zero browser storage in packets-verify.js
    expect(read('packets-verify.js')).not.toMatch(/localStorage|sessionStorage|indexedDB|caches\.open/);
  });

  it('links Add up results and Back to Packets in packets-about.html and breaks packets-it.html privacy cell into 3 paragraphs', () => {
    const aboutDoc = new JSDOM(read('packets-about.html')).window.document;
    const resultsLink = [...aboutDoc.querySelectorAll('main a')].find((a) => a.getAttribute('href') === 'packets-results.html');
    expect(resultsLink).toBeTruthy();
    expect(resultsLink.textContent).toBe('Add up results');
    const backLinks = [...aboutDoc.querySelectorAll('main a')].filter((a) => a.getAttribute('href') === 'packets.html');
    expect(backLinks.length).toBeGreaterThanOrEqual(1);
    expect(backLinks[backLinks.length - 1].textContent).toBe('Back to Packets');

    const itDoc = new JSDOM(read('packets-it.html')).window.document;
    const privacyRow = [...itDoc.querySelectorAll('tr')].find((tr) => tr.querySelector('th')?.textContent.trim() === 'What leaves the device, and when');
    expect(privacyRow).toBeTruthy();
    const paras = [...privacyRow.querySelectorAll('td p')];
    expect(paras).toHaveLength(3);
    expect(paras[0].textContent).toContain('Nothing, unless a person passes on a saved results file.');
    expect(paras[1].textContent).toContain('For teachers, one page of this site');
    expect(paras[2].textContent).toContain('A read-along file that a teacher saves');
  });
});
