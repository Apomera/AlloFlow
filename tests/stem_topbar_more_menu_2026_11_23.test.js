// STEM Lab top bar, 2026-11-23 (UI complexity review, M3).
//
// The bar showed XP, title, Math Studio (teacher), Theme, Canvas narration (TTS/Mute), Listen,
// AI extras / AI hints (teacher), Controls and Close: two read-aloud toggles side by side.
// It now keeps XP, title, Listen and Close, and one "More" menu button holds the rest plus the
// keyboard-shortcuts help (before: only the ? key). With a tool open, the tool bar's
// "Cloudflare link" button and its "Esc or Alt+B" hint moved into the same menu, and the tool
// bar's constant "Explore tool" subtitle names the tool's category when one is known.
// These tests mount the real hub and check that every moved control is still reachable,
// keeps its handler, name and hooks, and that the menu behaves like a menu button
// (aria-haspopup/expanded, arrows, Home/End, Escape and Tab return focus, outside click).
// STEM_HUB points the suite at another copy of the hub (it fails against the pre-change copy).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

vi.setConfig({ testTimeout: 30000 });
const REPO = process.cwd();
const require = createRequire(resolve(REPO, 'tests/x.js'));
const React = require(resolve(REPO, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';

const Icon = () => null;
let root, host, toasts, api, calls;
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

function Harness({ extra, tool }) {
  const [stemLabTool, setStemLabTool] = React.useState(tool || null);
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  api = { setStemLabTool };
  const base = Object.assign({
    labToolData, setLabToolData, toolSnapshots: [], addToast: (m) => toasts.push(m), t: () => undefined,
    stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, showStemLab: true,
    setShowStemLab: (v) => calls.push(['setShowStemLab', v]),
    openMathCreate: () => calls.push(['openMathCreate']),
    onOpenAiSetup: () => calls.push(['onOpenAiSetup']),
    activeStation: null, callGemini: null, callTTS: null, isTeacherMode: false,
  }, extra);
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
async function render(extra, tool) {
  toasts = []; calls = [];
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness, { extra: extra || {}, tool })));
  await flush();
}
const bar = () => host.querySelector('.stem-lab-actionbar');
const more = () => host.querySelector('[data-stem-more-toggle]');
const menu = () => host.querySelector('#stem-lab-more-menu');
const item = (k) => host.querySelector('#stem-lab-more-menu [data-stem-more-item="' + k + '"]');
const itemKeys = () => Array.from(menu().querySelectorAll('[role^="menuitem"]')).map((b) => b.getAttribute('data-stem-more-item'));
const click = async (el) => { await act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })); }); await flush(); };
const key = async (el, k, opts) => { await act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, opts || {}))); }); await flush(); };
const open = async () => { if (!menu()) await click(more()); return menu(); };

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  new Function(readFileSync(HUB, 'utf8'))();
  const tile = (id, label, category) => window.StemLab.registerTool(id, { label, icon: 'x', desc: label + ' tool', category, render: () => React.createElement('div', { 'data-tool-body': id }, label + ' body') });
  tile('waterCycle', 'Water Cycle', 'science');
  tile('mysteryTool', 'Mystery Tool', 'zz-internal');
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  delete window.AlloToggleTheme;
  localStorage.clear();
});

describe('the bar keeps XP, title, Listen and Close; one More button holds the rest', () => {
  for (const [view, extra] of [['teacher', { isTeacherMode: true }], ['student', {}]]) {
    it(view + ': bar = Listen, More, Close; XP and title stay; the menu starts closed', async () => {
      await render(extra);
      const buttons = Array.from(bar().querySelectorAll(':scope > button'));
      expect(buttons.map((b) => b.getAttribute('data-stem-listen-toggle') ? 'listen' : b.getAttribute('data-stem-more-toggle') ? 'more' : b.getAttribute('aria-label'))).toEqual(['listen', 'more', 'Close STEAM Lab']);
      expect(host.querySelector('.stem-lab-xp-badge')).not.toBeNull();
      expect(host.querySelector('.stem-lab-title-lockup h2').textContent).toContain('STEAM Lab');
      expect(more().getAttribute('aria-haspopup')).toBe('menu');
      expect(more().getAttribute('aria-expanded')).toBe('false');
      expect(menu()).toBeNull();
      // Moved controls are not in the bar any more.
      for (const sel of ['[aria-label="Controls settings"]', '[aria-label$="Switch theme"]', '[aria-label$="toggle canvas narration"]', '.stem-lab-mathstudio-btn']) {
        expect(bar().querySelector(sel), sel + ' still in the bar').toBeNull();
      }
    });
  }

  it('student menu: Theme, Canvas narration, Controls, Keyboard shortcuts; no teacher items', async () => {
    await render({});
    await open();
    expect(itemKeys()).toEqual(['theme', 'narration', 'controls', 'keys']);
    expect(menu().getAttribute('role')).toBe('menu');
    expect(more().getAttribute('aria-expanded')).toBe('true');
    expect(more().getAttribute('aria-controls')).toBe('stem-lab-more-menu');
    expect(menu().querySelector('[role="separator"]')).toBeNull();
  });

  it('teacher menu without AI: adds the AI extras pill and Math Studio after a separator', async () => {
    await render({ isTeacherMode: true });
    await open();
    expect(itemKeys()).toEqual(['theme', 'narration', 'controls', 'keys', 'ai-setup', 'math-studio']);
    expect(menu().querySelector('[role="separator"]')).not.toBeNull();
    expect(item('ai-setup').textContent).toContain('AI extras: off');
    expect(item('ai-setup').getAttribute('aria-label')).toMatch(/^AI extras: off/);
    expect(item('math-studio').className).toContain('stem-lab-mathstudio-btn');
    expect(item('math-studio').getAttribute('aria-label')).toBe('Create moved: open Math Studio');
  });

  it('teacher menu with AI: the AI hints switch (menuitemcheckbox) replaces the pill', async () => {
    await render({ isTeacherMode: true, callGemini: () => Promise.resolve('') });
    await open();
    expect(itemKeys()).toEqual(['theme', 'narration', 'controls', 'keys', 'ai-hints', 'math-studio']);
    const h = item('ai-hints');
    expect(h.getAttribute('role')).toBe('menuitemcheckbox');
    expect(h.getAttribute('aria-checked')).toBe('false');
    expect(h.querySelector('.stem-lab-more-state').textContent).toBe('Off');
    // Same fail-closed handler: no confirm dialog available -> hints stay off, with a message.
    await click(h);
    expect(toasts.join(' ')).toContain('AI hints stayed OFF');
    expect(localStorage.getItem('alloflow_stem_ai_hints')).toBeNull();
  });
});

describe('each item keeps its handler and shows its state', () => {
  it('Theme calls the app theme toggle and names the current theme', async () => {
    window.AlloToggleTheme = vi.fn();
    await render({});
    await open();
    expect(item('theme').getAttribute('aria-label')).toBe('Theme: light. Switch theme');
    expect(item('theme').querySelector('.stem-lab-more-state').textContent).toBe('Light');
    await click(item('theme'));
    expect(window.AlloToggleTheme).toHaveBeenCalledTimes(1);
  });

  it('Canvas narration is a checkbox item that writes its own key and shows On / Off', async () => {
    await render({});
    await open();
    const n = item('narration');
    expect(n.getAttribute('role')).toBe('menuitemcheckbox');
    expect(n.getAttribute('aria-checked')).toBe('false');
    expect(n.textContent).toContain('Canvas narration');
    await click(n);
    expect(localStorage.getItem('alloflow_canvas_narrate')).toBe('on');
    expect(menu(), 'menu closes after a choice').toBeNull();
    expect(document.activeElement).toBe(more());
    await open();
    expect(item('narration').getAttribute('aria-checked')).toBe('true');
    expect(item('narration').querySelector('.stem-lab-more-state').textContent).toBe('On');
  });

  it('Keyboard shortcuts opens the help panel that was only on the ? key', async () => {
    await render({});
    expect(host.querySelector('[role="region"][aria-label="Keyboard shortcuts"]')).toBeNull();
    await open();
    await click(item('keys'));
    expect(host.querySelector('[role="region"][aria-label="Keyboard shortcuts"]')).not.toBeNull();
  });

  it('Math Studio closes the Lab and opens Math Studio; the AI pill opens AI setup', async () => {
    await render({ isTeacherMode: true });
    await open();
    await click(item('math-studio'));
    expect(calls).toEqual([['setShowStemLab', false], ['openMathCreate']]);
    calls.length = 0;
    await open();
    await click(item('ai-setup'));
    expect(calls).toEqual([['onOpenAiSetup']]);
  });
});

describe('menu-button keyboard and pointer behaviour', () => {
  it('opening focuses the first item; arrows wrap, Home and End jump', async () => {
    await render({});
    await open();
    const items = Array.from(menu().querySelectorAll('[role^="menuitem"]'));
    expect(items.every((b) => b.tabIndex === -1)).toBe(true);
    expect(document.activeElement).toBe(items[0]);
    await key(items[0], 'ArrowDown');
    expect(document.activeElement).toBe(items[1]);
    await key(items[1], 'ArrowUp');
    await key(items[0], 'ArrowUp');
    expect(document.activeElement).toBe(items[items.length - 1]);
    await key(document.activeElement, 'Home');
    expect(document.activeElement).toBe(items[0]);
    await key(document.activeElement, 'End');
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('ArrowUp on the closed button opens on the last item', async () => {
    await render({});
    more().focus();
    await key(more(), 'ArrowUp');
    const items = Array.from(menu().querySelectorAll('[role^="menuitem"]'));
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('Escape closes the menu, returns focus to More, and does not close the open tool', async () => {
    await render({}, 'waterCycle');
    await open();
    await key(document.activeElement, 'Escape');
    expect(menu()).toBeNull();
    expect(more().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(more());
    expect(host.querySelector('[data-tool-body="waterCycle"]'), 'Escape also closed the tool').not.toBeNull();
    await key(document.body, 'Escape');
    expect(host.querySelector('[data-tool-body="waterCycle"]'), 'a second Escape still closes the tool').toBeNull();
  });

  it('Tab closes the menu and returns focus to More', async () => {
    await render({});
    await open();
    await key(document.activeElement, 'Tab');
    expect(menu()).toBeNull();
    expect(document.activeElement).toBe(more());
  });

  it('a press outside closes it; pressing More again closes it too', async () => {
    await render({});
    await open();
    await act(async () => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    await flush();
    expect(menu()).toBeNull();
    await open();
    await click(more());
    expect(menu()).toBeNull();
  });
});

describe('with a tool open', () => {
  it('Cloudflare link and the Esc / Alt+B hint live in the menu, not in the tool bar', async () => {
    await render({}, 'waterCycle');
    const toolbar = host.querySelector('.stem-active-toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar.querySelector('[data-stem-direct-link-toggle]')).toBeNull();
    expect(toolbar.textContent).not.toContain('Alt+B');
    await open();
    expect(itemKeys()).toEqual(['theme', 'narration', 'controls', 'keys', 'cloudflare']);
    const cf = item('cloudflare');
    expect(cf.getAttribute('data-stem-direct-link-toggle')).toBe('true');
    expect(cf.textContent).toContain('Cloudflare link');
    expect(cf.getAttribute('aria-checked')).toBe('false');
    expect(cf.getAttribute('aria-label')).toBe('Show shareable Cloudflare link for Water Cycle');
    const hint = host.querySelector('#stem-lab-more-keyhint');
    expect(hint.textContent).toBe('Esc or Alt+B returns to all tools');
    expect(item('keys').getAttribute('aria-describedby')).toBe('stem-lab-more-keyhint');
    await click(cf);
    const panel = host.querySelector('#stem-active-direct-link-panel');
    expect(panel.textContent).toContain('https://alloflow-cdn.pages.dev/water-cycle');
    await open();
    expect(item('cloudflare').getAttribute('aria-checked')).toBe('true');
  });

  it('no tool open: no Cloudflare item and no Esc / Alt+B hint', async () => {
    await render({});
    await open();
    expect(item('cloudflare')).toBeNull();
    expect(host.querySelector('#stem-lab-more-keyhint')).toBeNull();
  });

  it('the tool bar subtitle names the category when known, else keeps "Explore tool"', async () => {
    await render({}, 'waterCycle');
    expect(host.querySelector('.stem-active-tool-title p').textContent).toBe('Science');
    await act(async () => api.setStemLabTool('mysteryTool'));
    await flush();
    expect(host.querySelector('.stem-active-tool-title p').textContent).toBe('Explore tool');
  });

  it('opened from the catalog, the subtitle is the catalog section the tile sits under', async () => {
    await render({});
    const card = host.querySelector('[data-stem-tool-id="waterCycle"]');
    expect(card).not.toBeNull();
    await click(card);
    const sub = host.querySelector('.stem-active-tool-title p').textContent;
    expect(sub).not.toBe('Explore tool');
    expect(sub).not.toBe('Science');
    expect(sub).toMatch(/^\p{L}/u); // section label without its leading emoji
  });
});

// fix2 (2026-11-23): with three small controls, the action bar shares the title row at phone
// widths: the brand block no longer claims a 160px basis (which forced a wrap at 390px, leaving
// Listen/More/Close alone on a second row under the left padding), the title truncates with an
// ellipsis instead of pushing the bar down, and the bar gap narrows at <= 430px. Desktop rules
// are untouched.
describe('phone-width top bar keeps one row', () => {
  it('ships the one-row phone rules and leaves the desktop rules alone', async () => {
    await render({ isTeacherMode: true });
    const css = document.getElementById('stem-xp-keyframes').textContent;
    const q640 = css.split('\n').find((l) => l.startsWith('@media (max-width: 640px) { .stem-lab-modal-shell { margin: 0'));
    const q430 = css.split('\n').find((l) => l.startsWith('@media (max-width: 430px)'));
    expect(q640).toContain('.stem-lab-brand-block { flex: 1 1 0 !important;');
    expect(q640).not.toContain('1 1 160px');
    expect(q640).toMatch(/\.stem-lab-title-lockup h2 \{[^}]*white-space: nowrap; overflow: hidden; text-overflow: ellipsis;/);
    expect(q640).toContain('.stem-lab-actionbar { flex: 0 0 auto !important;');
    expect(q430).toMatch(/\.stem-lab-topbar \{ padding-left: 96px !important; column-gap: 8px; \}/);
    expect(css).toContain('.stem-lab-topbar { gap: 16px; }');
    // Order matters: title block first, the bar last, so the bar ends the row on the right.
    const top = host.querySelector('.stem-lab-topbar');
    expect(top.lastElementChild.classList.contains('stem-lab-actionbar') || top.querySelector(':scope > .stem-lab-actionbar') !== null).toBe(true);
    expect(top.firstElementChild.classList.contains('stem-lab-brand-block')).toBe(true);
  });
});
