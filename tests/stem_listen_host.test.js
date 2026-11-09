// Round 22 lane `listen`: the Listen toggle and mode inside the REAL STEAM Lab hub,
// mounted the way tests/stem_lab_teacher_split.test.js mounts it. STEM_LISTEN_HUB
// points the suite at a hub copy; against the untouched base it fails.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.setConfig({ testTimeout: 30000 });
const REPO = process.cwd();
const require = createRequire(resolve(REPO, 'tests/x.js'));
const React = require(resolve(REPO, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const HUB = process.env.STEM_LISTEN_HUB || 'stem_lab/stem_lab_module.js';

const Icon = () => null;
let root, host, api, toolCtx, toolButton, toasts, tts, spoken, synth;
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

function Harness({ tool, theme }) {
  const [stemLabTool, setStemLabTool] = React.useState(tool || null);
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  api = { setStemLabTool };
  const base = {
    labToolData, setLabToolData, toolSnapshots: [], theme,
    addToast: (m) => toasts.push(m), t: (k) => undefined,
    stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
    activeStation: null, callGemini: null, callTTS: tts, isTeacherMode: false,
  };
  const props = new Proxy(base, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === 'string' && /^[A-Z]/.test(key)) return Icon;
      if (typeof key === 'string' && /^(set|handle|on)[A-Z]/.test(key)) return () => {};
      return undefined;
    },
  });
  return window.AlloModules.StemLab(props);
}
async function render(opts) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness, opts || {})));
  await flush();
}
const listenBtn = () => host.querySelector('[data-stem-listen-toggle]');
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); }); await flush(); };

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  delete window.StemListen;
  new Function(readFileSync(HUB, 'utf8'))();
  toolButton = vi.fn();
  window.StemLab.registerTool('base10', {
    label: 'Listen Demo', icon: 'x', desc: 'Demo tool', category: 'math',
    render: (ctx) => {
      toolCtx = ctx;
      return React.createElement('div', { 'data-tool-body': 'base10' },
        React.createElement('p', { id: 'demo-p' }, 'Reefs grow slowly.'),
        React.createElement('label', { id: 'demo-label' }, 'Your idea ', React.createElement('input', { id: 'demo-input', defaultValue: 'STUDENT-TYPED' })),
        React.createElement('button', { id: 'demo-btn', onClick: toolButton }, 'Count fish'));
    },
  });
});
beforeEach(() => {
  localStorage.clear();
  delete window._alloGlobalMute;
  toasts = []; spoken = [];
  tts = vi.fn(() => Promise.resolve(null));
  synth = { speaking: false, pending: false, speak: vi.fn((u) => spoken.push(u)), cancel: vi.fn(), getVoices: () => [{ lang: 'en-US', localService: true }], addEventListener() {}, removeEventListener() {} };
  window.speechSynthesis = synth;
  window.SpeechSynthesisUtterance = function (text) { this.text = text; };
  toolButton.mockClear();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });

describe('the Listen toggle in the STEAM Lab header', () => {
  it('sits beside the narration, theme and Controls buttons with a clear name, aria-pressed and a 44 px target', async () => {
    await render({});
    const b = listenBtn();
    expect(b, 'no Listen button in the header').not.toBeNull();
    expect(b.closest('.stem-lab-actionbar')).not.toBeNull();
    expect(b.previousElementSibling.getAttribute('aria-label')).toBe('Toggle canvas narration TTS');
    expect(b.getAttribute('aria-label')).toBe('Listen');
    expect(b.textContent).toContain('Listen');
    expect(b.getAttribute('aria-pressed')).toBe('false');
    expect(b.textContent).not.toContain('✓');
    expect(b.getAttribute('type')).toBe('button');
    expect(b.style.minWidth).toBe('44px');
    expect(b.style.minHeight).toBe('44px');
    expect(b.title).toContain('Alt+R');
  });
  it('is filled when on in every theme, and the choice is kept per device', async () => {
    const want = { light: ['rgb(255, 255, 255)', 'rgb(55, 48, 163)'], dark: ['rgb(255, 255, 255)', 'rgb(55, 48, 163)'], contrast: ['rgb(251, 191, 36)', 'rgb(0, 0, 0)'] };
    for (const theme of Object.keys(want)) {
      localStorage.setItem('alloflow_stem_listen', 'on');
      await render({ theme });
      const b = listenBtn();
      expect(b.getAttribute('aria-pressed'), theme).toBe('true');
      expect([b.style.backgroundColor || b.style.background, b.style.color], theme).toEqual(want[theme]);
      // The app's contrast theme forces every header button to the same colours, so "on" also
      // shows as a check mark (kept on phones, where the label span is hidden) and an inner ring.
      expect(b.firstChild.nodeType, theme).toBe(3);
      expect(b.firstChild.nodeValue, theme).toContain('✓');
      expect(b.style.boxShadow, theme).toContain('inset');
      await act(async () => root.unmount()); host.remove(); root = null;
    }
    await render({ theme: 'contrast' });
    expect(listenBtn().style.borderColor || listenBtn().style.border).toMatch(/251, 191, 36|fbbf24/);
  });
  it('turning it on saves the preference and explains how to use it', async () => {
    await render({});
    await click(listenBtn());
    expect(localStorage.getItem('alloflow_stem_listen')).toBe('on');
    expect(listenBtn().getAttribute('aria-pressed')).toBe('true');
    expect(toasts.join(' ')).toContain('Alt+R');
    expect(localStorage.getItem('alloflow_canvas_narrate')).toBeNull();
  });
  it('the keyboard help lists the shortcut', () => {
    const src = readFileSync(HUB, 'utf8');
    const help = src.slice(src.indexOf('// ── Keyboard Help Panel ──'), src.indexOf('// ═══ XP Progress Overlay Panel ═══'));
    expect(help).toContain('"Alt+R"');
    expect(help).toContain('_listenHint');
  });
});

describe('Listen inside the open tool', () => {
  it('reads tool text through the app voice, in the page language, falling back to the device voice', async () => {
    localStorage.setItem('alloflow_stem_listen', 'on');
    await render({ tool: 'base10' });
    await click(host.querySelector('#demo-p'));
    expect(tts).toHaveBeenCalledTimes(1);
    expect(tts.mock.calls[0][0]).toBe('Reefs grow slowly.');
    expect(tts.mock.calls[0][3]).toMatchObject({ priority: 'interactive', language: 'English' });
    expect(tts.mock.calls[0][3]).not.toHaveProperty('force'); // force on the TTS module means "skip the cache"
    expect(spoken.map((u) => u.text)).toEqual(['Reefs grow slowly.']);
  });
  it('a tool control still works and is not read; typed text is never sent', async () => {
    localStorage.setItem('alloflow_stem_listen', 'on');
    await render({ tool: 'base10' });
    await click(host.querySelector('#demo-btn'));
    expect(toolButton).toHaveBeenCalledTimes(1);
    await click(host.querySelector('#demo-input'));
    expect(tts).not.toHaveBeenCalled();
    await click(host.querySelector('#demo-label'));
    expect(tts.mock.calls.map((c) => c[0])).toEqual(['Your idea']);
  });
  it('with Listen off, nothing is read', async () => {
    await render({ tool: 'base10' });
    await click(host.querySelector('#demo-p'));
    expect(tts).not.toHaveBeenCalled();
  });
  it('turning Listen off mid-read stops the device voice', async () => {
    localStorage.setItem('alloflow_stem_listen', 'on');
    await render({ tool: 'base10' });
    await click(host.querySelector('#demo-p'));
    expect(host.querySelector('#demo-p').hasAttribute('data-stem-listen-reading')).toBe(true);
    await click(listenBtn());
    expect(synth.cancel).toHaveBeenCalled();
    expect(host.querySelector('[data-stem-listen-reading]')).toBeNull();
    await click(host.querySelector('#demo-p'));
    expect(tts).toHaveBeenCalledTimes(1);
  });
  it('Esc while reading stops speech and does not close the tool; Esc when idle still closes it', async () => {
    localStorage.setItem('alloflow_stem_listen', 'on');
    await render({ tool: 'base10' });
    await click(host.querySelector('#demo-p'));
    await act(async () => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(host.querySelector('[data-tool-body="base10"]'), 'Esc closed the tool').not.toBeNull();
    expect(window.StemListen.isSpeaking()).toBe(false);
    await act(async () => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(host.querySelector('[data-tool-body="base10"]')).toBeNull();
  });
  it('the tool grid is not a reading area, and closing the tool stops listening', async () => {
    localStorage.setItem('alloflow_stem_listen', 'on');
    await render({});
    const card = host.querySelector('[data-stem-tool-id] h4, [data-stem-tool-id] p');
    expect(card, 'no tool card text to click').not.toBeNull();
    await click(card);
    expect(tts).not.toHaveBeenCalled();
  });
  it('global mute wins', async () => {
    localStorage.setItem('alloflow_stem_listen', 'on');
    window._alloGlobalMute = true;
    await render({ tool: 'base10' });
    await click(host.querySelector('#demo-p'));
    expect(tts).not.toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();
  });
});

describe('what tools already have is unchanged', () => {
  it('ctx.callTTS still honours the narration toggle; force bypasses it but is not passed on', async () => {
    localStorage.setItem('alloflow_stem_listen', 'on');
    await render({ tool: 'base10' });
    expect(typeof toolCtx.callTTS).toBe('function');
    await expect(toolCtx.callTTS('Narrate me')).resolves.toBeNull();
    expect(tts).not.toHaveBeenCalled(); // Listen on does not switch narration on
    await toolCtx.callTTS('Speak button', undefined, 1, { force: true });
    // Round 23: the TTS module reads force as "skip the cache", so the hub keeps it to itself.
    expect(tts).toHaveBeenCalledWith('Speak button', undefined, 1, {});
  });
  it('the narration toggle still writes only its own key', async () => {
    await render({});
    await click(host.querySelector('[aria-label="Toggle canvas narration TTS"]'));
    expect(localStorage.getItem('alloflow_canvas_narrate')).toBe('on');
    expect(localStorage.getItem('alloflow_stem_listen')).toBeNull();
  });
});
