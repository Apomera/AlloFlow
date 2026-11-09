// Round 24 lane `gear`: the header "Controls" button had a bare-text label, so the 640 px rule
// (which hides every span in a header button) could not hide it and at 390 px it spilled onto the
// Close X. It now shows a gear icon (aria-hidden, not a span, so it stays on phones) plus its word
// in a span, like the other header buttons. Layout is measured in the real app shell by the lane
// harness; here the markup, the name and the handler are checked in jsdom. STEM_HUB points the
// suite at a hub copy.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = process.cwd();
const require = createRequire(resolve(REPO, 'tests/x.js'));
const React = require(resolve(REPO, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve(REPO, 'desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const HUB = process.env.STEM_HUB || 'stem_lab/stem_lab_module.js';

const Icon = () => null;
let root, host;
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

function Harness({ extra }) {
  const [stemLabTool, setStemLabTool] = React.useState(null);
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  const base = Object.assign({
    labToolData, setLabToolData, toolSnapshots: [], addToast: () => {}, t: () => undefined,
    stemLabTool, setStemLabTool, stemLabTab, setStemLabTab, setShowStemLab: () => {}, showStemLab: true,
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
async function render(extra) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness, { extra: extra || {} })));
  await flush();
}
const bar = () => host.querySelector('.stem-lab-actionbar');
const controlsBtn = () => bar().querySelector('button[aria-label="Controls settings"]');
// Text a header button shows outside any span: the phone rule cannot hide it.
const bareWords = (b) => Array.from(b.childNodes).filter((n) => n.nodeType === 3 && /\p{L}/u.test(n.textContent)).map((n) => n.textContent);

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  new Function(readFileSync(HUB, 'utf8'))();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });

describe('header Controls button: gear icon + word in a span', () => {
  for (const [view, extra] of [['teacher', { isTeacherMode: true }], ['student', {}]]) {
    it(view + ' view: no header button shows a word outside a span (the phone rule hides spans)', async () => {
      await render(extra);
      const buttons = Array.from(bar().querySelectorAll(':scope > button'));
      expect(buttons.length).toBeGreaterThan(3);
      for (const b of buttons) expect(bareWords(b), (b.getAttribute('aria-label') || '') + ' has bare text').toEqual([]);
    });
  }

  it('shows an aria-hidden gear that is not a span (so it stays on phones) and the word "Controls" in a span', async () => {
    await render({ isTeacherMode: true });
    const b = controlsBtn();
    expect(b).toBeTruthy();
    const icon = Array.from(b.children).find((c) => c.getAttribute('aria-hidden') === 'true');
    expect(icon, 'no aria-hidden icon').toBeTruthy();
    expect(icon.tagName).not.toBe('SPAN');
    expect(icon.textContent).toContain('\u2699');
    expect(icon.style.fontStyle).toBe('normal');
    const span = b.querySelector('span');
    expect(span.textContent).toBe('Controls');
    expect(span.getAttribute('aria-hidden')).toBeNull();
    // Accessible name unchanged, and it still contains the visible word (label in name).
    expect(b.getAttribute('aria-label')).toBe('Controls settings');
    expect(b.getAttribute('title')).toBe('Controls settings');
    expect(b.getAttribute('aria-label')).toContain(span.textContent);
    expect(b.className).toMatch(/\bflex\b/);
    expect(b.className).toMatch(/\bitems-center\b/);
  });

  it('the 640 px rule hides button spans and only spans, and keeps the 36 px button', async () => {
    await render({ isTeacherMode: true });
    const css = document.getElementById('stem-xp-keyframes').textContent;
    const rule = css.split('\n').find((l) => l.startsWith('@media (max-width: 640px)') && l.includes('.stem-lab-actionbar {'));
    expect(rule).toContain('.stem-lab-actionbar button span { display: none !important; }');
    expect(rule).not.toMatch(/\.stem-lab-actionbar button (i|\*|>)[^{]*\{\s*display:\s*none/);
    expect(rule).toMatch(/\.stem-lab-actionbar button \{[^}]*width: 36px;[^}]*height: 36px;/);
  });

  it('same handler: a press opens the Controls panel, a second press closes it', async () => {
    await render({ isTeacherMode: true });
    expect(host.querySelector('[data-stem-controls-panel]')).toBeNull();
    await act(async () => { controlsBtn().click(); });
    await flush();
    expect(host.querySelector('[data-stem-controls-panel]')).toBeTruthy();
    await act(async () => { controlsBtn().click(); });
    await flush();
    expect(host.querySelector('[data-stem-controls-panel]')).toBeNull();
  });
});
