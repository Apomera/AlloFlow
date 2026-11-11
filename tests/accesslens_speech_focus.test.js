import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Access Lens is built for students who are blind or have low vision, so the
// failures fixed here were invisible on screen and loud for them:
//  - Stop (and Clear photo, and switching tabs) silenced only the browser voice;
//    the app voice plays in the host, kept talking, and a second press stacked
//    another copy on top.
//  - Every announcement went to two live regions, so each was read twice.
//  - Clear photo, Live camera and Snap removed the focused button, dropping a
//    screen-reader user at the top of the page after every step.
//  - Analyze used `disabled`, which drops focus and hides its reason from Tab.
// These suites drive the REAL component; the photo enters through the real file
// input, with only the image decoder and canvas stubbed (jsdom has neither).

const act = React.act;
const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
const ORIG = {};

beforeEach(() => {
  ORIG.Image = window.Image;
  ORIG.getContext = window.HTMLCanvasElement.prototype.getContext;
  ORIG.toDataURL = window.HTMLCanvasElement.prototype.toDataURL;
  ORIG.lang = document.documentElement.lang;
  // A decoder that "loads" any data URL, except one marked as undecodable (HEIC).
  window.Image = class {
    set src(v) {
      this._src = v;
      setTimeout(() => {
        if (String(v).indexOf('image/heic') !== -1) { if (this.onerror) this.onerror(new Event('error')); }
        else { this.width = 800; this.height = 600; if (this.onload) this.onload(); }
      }, 0);
    }
    get src() { return this._src; }
  };
  window.HTMLCanvasElement.prototype.getContext = function () { return { drawImage() {} }; };
  window.HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/jpeg;base64,QUJD'; };
});
afterEach(() => {
  window.Image = ORIG.Image;
  window.HTMLCanvasElement.prototype.getContext = ORIG.getContext;
  window.HTMLCanvasElement.prototype.toDataURL = ORIG.toDataURL;
  document.documentElement.lang = ORIG.lang || '';
  vi.useRealTimers();
  document.body.innerHTML = '';
});

function mount(overrides = {}) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const vision = [];
  const ctx = {
    React, toolData: {}, isDark: false, isContrast: false, setToolData() {}, updateMulti() {},
    gradeBand: 'g68', aiHintsEnabled: true,
    callGeminiVision: vi.fn((prompt, b64, mime) => new Promise((resolve, reject) => vision.push({ prompt, resolve, reject }))),
    callTTS: vi.fn(() => Promise.resolve('blob:tts-audio')),
    stopTTS: vi.fn(),
    announceToSR: vi.fn(),
    ...overrides,
  };
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(window.StemLab._registry.accessLens.render(ctx)); });
  const buttons = () => [...host.querySelectorAll('button')];
  const button = (re) => buttons().find((b) => re.test(b.textContent || ''));
  return { host, root, ctx, vision, button, buttons, live: () => host.querySelector('[aria-live="polite"]') };
}

async function flush(n = 6) { for (let i = 0; i < n; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); }

async function addPhoto(t, type = 'image/jpeg') {
  const input = t.host.querySelector('input[type="file"]');
  const file = new window.File([new Uint8Array([1, 2, 3])], type === 'image/heic' ? 'IMG_0001.HEIC' : 'p.jpg', { type });
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  await act(async () => { input.dispatchEvent(new window.Event('change', { bubbles: true })); });
  await flush();
}

async function click(el) { await act(async () => { el.click(); }); await flush(2); }

describe('speech can be stopped, and never stacks', () => {
  it('Stop, Clear photo and a tab switch all stop the host voice and abort its request', async () => {
    const t = mount();
    await addPhoto(t);
    await click(t.button(/Describe my photo/));
    await act(async () => { t.vision[0].resolve(JSON.stringify({ photo: { usable: true }, description: 'A red mug on a desk.', unsure: [] })); });
    await flush();
    await click(t.button(/Read aloud/));
    expect(t.ctx.callTTS).toHaveBeenCalledTimes(1);
    const opts = t.ctx.callTTS.mock.calls[0][3];
    expect(opts.force).toBe(true);
    expect(opts.signal).toBeTruthy();
    // The host plays the URL and reports no end: Stop must stay available.
    expect(t.button(/(^|\s)Stop$/), 'still speaking, so the control is Stop').toBeTruthy();
    expect(t.button(/Read aloud/)).toBeFalsy();
    const before = t.ctx.stopTTS.mock.calls.length;
    await click(t.button(/(^|\s)Stop$/));
    expect(t.ctx.stopTTS.mock.calls.length).toBeGreaterThan(before);
    expect(t.button(/Read aloud/)).toBeTruthy();
    // A second press is a new utterance, not a copy over a live one.
    await click(t.button(/Read aloud/));
    expect(t.ctx.callTTS).toHaveBeenCalledTimes(2);

    const beforeTab = t.ctx.stopTTS.mock.calls.length;
    await click(t.host.querySelector('#accesslens-tab-read'));
    expect(t.ctx.stopTTS.mock.calls.length).toBeGreaterThan(beforeTab);

    await click(t.host.querySelector('#accesslens-tab-describe'));
    await click(t.button(/Read aloud/));
    const beforeClear = t.ctx.stopTTS.mock.calls.length;
    await click(t.button(/Clear photo/));
    expect(t.ctx.stopTTS.mock.calls.length).toBeGreaterThan(beforeClear);
    t.root.unmount();
  });

  it('a Stop pressed while the voice is still being fetched aborts it and keeps the browser voice silent', async () => {
    let resolveTTS;
    const t = mount({ callTTS: vi.fn((text, v, s, opts) => new Promise((r) => { resolveTTS = r; t_opts.push(opts); })) });
    const t_opts = [];
    const speakSpy = vi.fn();
    const oldSynth = window.speechSynthesis;
    window.speechSynthesis = { speak: speakSpy, cancel() {} };
    window.SpeechSynthesisUtterance = function (x) { this.text = x; };
    try {
      await addPhoto(t);
      await click(t.button(/Describe my photo/));
      await act(async () => { t.vision[0].resolve('A plain description.'); });
      await flush();
      await click(t.button(/Read aloud/));
      await click(t.button(/(^|\s)Stop$/));
      expect(t_opts[0].signal.aborted).toBe(true);
      // The host answers late with no URL: the tool must not fall back to the
      // browser voice for speech the student already stopped.
      await act(async () => { resolveTTS(null); });
      await flush();
      expect(speakSpy).not.toHaveBeenCalled();
    } finally { window.speechSynthesis = oldSynth; t.root.unmount(); }
  });
});

describe('one announcement channel', () => {
  it('uses the host region when there is one, and leaves the local region empty', async () => {
    const t = mount();
    await addPhoto(t);
    expect(t.ctx.announceToSR).toHaveBeenCalledWith(expect.stringContaining('Photo ready'));
    expect((t.live().textContent || '').replace(/\u200B/g, '')).toBe('');
    t.root.unmount();
  });

  it('falls back to the local region when the host has none', async () => {
    const t = mount({ announceToSR: undefined });
    await addPhoto(t);
    expect(t.live().textContent).toContain('Photo ready');
    t.root.unmount();
  });
});

describe('focus is never dropped', () => {
  it('lands on Analyze when a photo is ready, on the result when it arrives, and on the photo button after Clear', async () => {
    const t = mount();
    await addPhoto(t);
    expect(document.activeElement).toBe(t.button(/Describe my photo/));
    await click(t.button(/Describe my photo/));
    // Still focused on the (aria-disabled) Analyze button while it works.
    expect(document.activeElement.textContent).toMatch(/Analyzing/);
    await act(async () => { t.vision[0].resolve('A wooden desk.'); });
    await flush();
    expect(document.activeElement.tagName).toBe('H3');
    expect(document.activeElement.textContent).toMatch(/Description/);
    await click(t.button(/Clear photo/));
    expect(document.activeElement).toBe(t.button(/Take or choose a photo/));
    t.root.unmount();
  });

  it('does not pull focus to the result if the student moved somewhere else meanwhile', async () => {
    const t = mount();
    await addPhoto(t);
    await click(t.button(/Describe my photo/));
    const tab = t.host.querySelector('#accesslens-tab-read');
    tab.focus();
    await act(async () => { t.vision[0].resolve('A wooden desk.'); });
    await flush();
    expect(document.activeElement).toBe(tab);
    t.root.unmount();
  });

  it('Live camera hands focus to Snap; Snap hands it to the photo, then Analyze', async () => {
    const oldMD = navigator.mediaDevices;
    const vw = Object.getOwnPropertyDescriptor(window.HTMLVideoElement.prototype, 'videoWidth');
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) } });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 });
    Object.defineProperty(window.HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 480 });
    try {
      const t = mount();
      await click(t.button(/Live camera/));
      await flush();
      expect(document.activeElement).toBe(t.button(/Snap photo/));
      await click(t.button(/Snap photo/));
      await flush();
      expect(document.activeElement).toBe(t.button(/Describe my photo/));
      t.root.unmount();
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: oldMD });
      if (vw) Object.defineProperty(window.HTMLVideoElement.prototype, 'videoWidth', vw);
      delete window.HTMLVideoElement.prototype.videoHeight;
    }
  });
});

describe('Analyze stays focusable and says why it cannot be pressed', () => {
  it('is aria-disabled with a linked reason, not disabled, and ignores presses', async () => {
    const t = mount();
    const a = t.button(/Describe my photo/);
    expect(a.disabled).toBe(false);
    expect(a.getAttribute('aria-disabled')).toBe('true');
    const why = document.getElementById(a.getAttribute('aria-describedby'));
    expect(why && why.textContent).toMatch(/Capture a photo first/);
    await click(a);
    expect(t.ctx.callGeminiVision).not.toHaveBeenCalled();
    await addPhoto(t);
    expect(t.button(/Describe my photo/).getAttribute('aria-disabled')).toBeNull();
    t.root.unmount();
  });

  it('names AI-off as the reason when AI is switched off, and sends nothing', async () => {
    const t = mount({ aiHintsEnabled: false });
    await addPhoto(t);
    const a = t.button(/Describe my photo/);
    expect(a.getAttribute('aria-disabled')).toBe('true');
    expect(document.getElementById(a.getAttribute('aria-describedby')).textContent).toMatch(/AI is turned off/);
    await click(a);
    expect(t.ctx.callGeminiVision).not.toHaveBeenCalled();
    t.root.unmount();
  });
});

describe('Translate', () => {
  it('marks the translation with its language and direction, reads it with that language, and says it is machine translation', async () => {
    const t = mount();
    await addPhoto(t);
    await click(t.host.querySelector('#accesslens-tab-translate'));
    const select = t.host.querySelector('select');
    await act(async () => { select.value = 'Arabic'; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
    await click(t.button(/Translate the text/));
    await act(async () => { t.vision[0].resolve('ORIGINAL:\nMilk\nTRANSLATION:\nحليب'); });
    await flush();
    const out = [...t.host.querySelectorAll('[lang]')].find((el) => el.textContent === 'حليب');
    expect(out, 'translated text carries lang').toBeTruthy();
    expect(out.getAttribute('lang')).toBe('ar');
    expect(out.getAttribute('dir')).toBe('auto');
    expect(t.host.textContent).toMatch(/machine translation/i);
    // Changing the list afterwards must not change the voice of this result.
    await act(async () => { select.value = 'French'; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
    await click(t.button(/Read aloud/));
    expect(t.ctx.callTTS.mock.calls.at(-1)[3].language).toBe('Arabic');
    t.root.unmount();
  });

  it('"Other…" hands the student to the language-name box instead of snapping back', async () => {
    const t = mount();
    await click(t.host.querySelector('#accesslens-tab-translate'));
    const select = t.host.querySelector('select');
    await act(async () => { select.value = '_custom'; select.dispatchEvent(new window.Event('change', { bubbles: true })); });
    await flush();
    expect(t.host.querySelector('select').value).toBe('_custom');
    expect(document.activeElement).toBe(t.host.querySelector('input[type="text"]'));
    t.root.unmount();
  });
});

describe('Investigate keeps its guess until the student asks', () => {
  it('hides the guess, then reveals and announces it with its confidence', async () => {
    const t = mount();
    await addPhoto(t);
    await click(t.host.querySelector('#accesslens-tab-inquire'));
    await click(t.button(/Investigate this object/));
    await act(async () => {
      t.vision[0].resolve(JSON.stringify({ observations: ['brown', 'ridged'], questions: ['Is it rough?', 'Does it rattle?', 'How heavy is it?'], guess: { what: 'a pine cone', confidence: 'medium', why: 'scales' }, tryThis: 'Weigh it.' }));
    });
    await flush();
    expect(t.host.textContent).not.toContain('a pine cone');
    expect(t.ctx.announceToSR.mock.calls.map((c) => c[0]).join(' | ')).not.toContain('a pine cone');
    const show = t.button(/Show the AI/);
    expect(show.getAttribute('aria-expanded')).toBe('false');
    await click(show);
    expect(t.host.textContent).toContain('a pine cone');
    expect(t.button(/Hide the AI/).getAttribute('aria-expanded')).toBe('true');
    const said = t.ctx.announceToSR.mock.calls.at(-1)[0];
    expect(said).toContain('a pine cone');
    expect(said).toContain('somewhat confident guess');
    t.root.unmount();
  });
});

describe('prompts', () => {
  it('ask for answers in the page language for Describe and Investigate, and leave Read verbatim', async () => {
    document.documentElement.lang = 'es';
    const t = mount();
    await addPhoto(t);
    await click(t.button(/Describe my photo/));
    expect(t.vision[0].prompt).toContain('Write every text value in Spanish');
    await act(async () => { t.vision[0].resolve('Una taza.'); });
    await flush();
    await click(t.host.querySelector('#accesslens-tab-read'));
    await click(t.button(/Read the text/));
    expect(t.vision[1].prompt).not.toContain('Write every text value');
    t.root.unmount();
  });

  it('carry the never-list, the no-"safe"/"clear" rule and the personal-details rule', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
    const P = window.AccessLensPure;
    const inq = P.inquirePrompt('g68', '');
    for (const w of ['tasting', 'smelling', 'mushrooms', 'chemicals', 'batteries', 'sharp or hot', 'ask an adult', 'blind or have low vision']) expect(inq).toContain(w);
    expect(inq).toContain('apply to the questions and to tryThis');
    const des = P.describePrompt('g68', '');
    expect(des).toMatch(/Never say that a path, road, doorway, area, or object is safe, clear/);
    expect(des).toMatch(/do not read out people's names, addresses, phone numbers, ID numbers, or grades/);
    expect(des).not.toContain('Write every text value');
    expect(P.describePrompt('g68', 'Somali')).toContain('Write every text value in Somali');
    expect(P.uiLanguageName('en-US')).toBe('');
    expect(P.uiLanguageName('ar')).toBe('Arabic');
    expect(P.uiLanguageName('zh-CN')).toBe('Chinese (Simplified)');
  });
});

describe('a hung AI request and an unreadable HEIC photo', () => {
  it('a vision request that never answers is ended at 60 s and Analyze comes back', async () => {
    const t = mount();
    await addPhoto(t);
    vi.useFakeTimers();
    await act(async () => { t.button(/Describe my photo/).click(); });
    expect(t.button(/Analyzing/)).toBeTruthy();
    await act(async () => { vi.advanceTimersByTime(60001); });
    await act(async () => { await Promise.resolve(); });
    vi.useRealTimers();
    await flush();
    expect(t.host.textContent).toMatch(/took too long/);
    expect(t.button(/Describe my photo/).getAttribute('aria-disabled')).toBeNull();
    t.root.unmount();
  });

  it('names HEIC when an iPhone photo cannot be decoded', async () => {
    const t = mount();
    await addPhoto(t, 'image/heic');
    expect(t.host.textContent).toMatch(/HEIC/);
    t.root.unmount();
  });
});

describe('tool side of the camera-window handshake', () => {
  it('answers ready with its nonce, only to the camera page origin, and ignores other origins', async () => {
    const other = new JSDOM('<!doctype html><p>lens</p>', { url: 'https://alloflow-cdn.pages.dev/access_lens/access_lens.html' }).window;
    const posted = [];
    other.postMessage = (msg, target) => posted.push({ msg, target });
    const oldOpen = window.open;
    let openedUrl = '';
    window.open = (u) => { openedUrl = u; return other; };
    const oldMD = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(Object.assign(new Error('no'), { name: 'NotAllowedError' })) } });
    try {
      const t = mount();
      await click(t.button(/Live camera/));
      await flush();
      await click(t.button(/Open camera window/));
      const nonce = new URL(openedUrl).searchParams.get('nonce');
      expect(nonce).toMatch(/^[0-9a-f]{32}$/);
      await act(async () => { window.dispatchEvent(new window.MessageEvent('message', { data: { type: 'allolens-ready' }, origin: 'https://evil.example', source: other })); });
      expect(posted).toHaveLength(0);
      await act(async () => { window.dispatchEvent(new window.MessageEvent('message', { data: { type: 'allolens-ready' }, origin: 'https://alloflow-cdn.pages.dev', source: other })); });
      expect(posted).toHaveLength(1);
      expect(posted[0].msg).toEqual({ type: 'allolens-hello', nonce });
      expect(posted[0].target).toBe('https://alloflow-cdn.pages.dev');
      expect(src).not.toMatch(/lensWinRef\.current\.postMessage\([^)]*'\*'\)/);
      t.root.unmount();
    } finally {
      window.open = oldOpen;
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: oldMD });
    }
  });
});

describe('mirrors', () => {
  it('ship the same tool in every copy', () => {
    for (const d of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      expect(fs.readFileSync(d + '/stem_lab/stem_tool_accesslens.js', 'utf8'), d).toBe(src);
    }
  });
});
