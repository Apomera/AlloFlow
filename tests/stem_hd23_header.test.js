// Round 23 lane `host`: (1) the Listen button tells screen-reader users to leave it off
// (a screen reader and Listen would both speak); (2) the phone header's action bar no longer
// has a fixed 240 px cap that 7 teacher buttons overflow. Layout is checked in the real app
// shell by the lane harness; here the button count and the phone CSS are checked in jsdom.
// STEM_HUB points the suite at a hub copy.
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
const SR_NOTE = 'Using a screen reader? Leave Listen off.';
const HINT = 'Listen: click or tap text in a tool to hear it. Alt+R reads the selection or the focused item. Press Alt+R again or Esc to stop.';

const Icon = () => null;
let root, host, toasts;
const flush = async () => { for (let i = 0; i < 4; i++) await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };

function Harness({ extra }) {
  const [stemLabTool, setStemLabTool] = React.useState(null);
  const [stemLabTab, setStemLabTab] = React.useState('explore');
  const [labToolData, setLabToolData] = React.useState({});
  const base = Object.assign({
    labToolData, setLabToolData, toolSnapshots: [], addToast: (m) => toasts.push(m), t: () => undefined,
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
  toasts = [];
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(React.createElement(Harness, { extra: extra || {} })));
  await flush();
}
const listenBtn = () => host.querySelector('[data-stem-listen-toggle]');

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = {};
  window.__alloT = (k, fb) => fb || k;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {};
  new Function(readFileSync(HUB, 'utf8'))();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); });

describe('Listen tells screen-reader users to leave it off', () => {
  it('in the button description (read by screen readers before pressing) and in the turn-on message', async () => {
    await render({});
    expect(listenBtn().title).toBe(HINT + ' ' + SR_NOTE);
    await act(async () => { listenBtn().click(); });
    expect(toasts.join(' ')).toContain(SR_NOTE);
    expect(host.querySelector('#stem-a11y-live').textContent).toContain(SR_NOTE);
  });
  it('is its own key, so the existing hint key (and its translations) is untouched', async () => {
    const tr = { 'stem.listen.hint': 'HINT-SO', 'stem.listen.sr_note': 'NOTE-SO', 'stem.listen.button': 'Dhageyso' };
    await render({ t: (k) => tr[k] });
    expect(listenBtn().title).toBe('HINT-SO NOTE-SO');
    await act(async () => root.unmount()); host.remove(); root = null;
    await render({ t: (k) => (k === 'stem.listen.hint' ? 'HINT-SO' : k) }); // untranslated new key shows English, not the raw key
    expect(listenBtn().title).toBe('HINT-SO ' + SR_NOTE);
    const src = readFileSync(HUB, 'utf8');
    expect(src).toContain("t('stem.listen.sr_note'), 'stem.listen.sr_note', '" + SR_NOTE + "'");
    expect(src).toContain("t('stem.listen.hint'), 'stem.listen.hint', '" + HINT + "'");
  });
});

describe('phone header action bar', () => {
  const phoneRule = () => {
    const css = document.getElementById('stem-xp-keyframes').textContent;
    const rule = css.split('\n').find((l) => l.startsWith('@media (max-width: 640px)') && l.includes('.stem-lab-actionbar {'));
    expect(rule, 'no 640px action bar rule').toBeTruthy();
    return rule.slice(rule.indexOf('.stem-lab-actionbar {'), rule.indexOf('}', rule.indexOf('.stem-lab-actionbar {')));
  };
  // 390 px phone: topbar padding 96 px left (430 px rule) + 12 px right.
  const ROW = 390 - 96 - 12;
  for (const [view, extra, count] of [['teacher', { isTeacherMode: true }, 7], ['student', {}, 5]]) {
    it(view + ' view: ' + count + ' buttons fit one 390 px row; no fixed cap narrower than they need', async () => {
      await render(extra);
      const bar = host.querySelector('.stem-lab-actionbar');
      const buttons = bar.querySelectorAll(':scope > button');
      expect(buttons.length).toBe(count);
      const rule = phoneRule();
      const gap = Number((/gap:\s*(\d+)px/.exec(rule) || [])[1]);
      const need = (count - 1) * 36 + 44 + (count - 1) * gap; // Listen keeps 44 px, the rest 36 px
      expect(need).toBeLessThanOrEqual(ROW);
      const cap = /max-width:\s*(\d+)px/.exec(rule);
      if (cap) expect(Number(cap[1]), 'max-width cap overflows the buttons').toBeGreaterThanOrEqual(need);
      expect(rule).toMatch(/flex-wrap:\s*wrap/); // narrower phones wrap instead of overflowing
      expect(listenBtn().style.minWidth).toBe('44px');
      expect(listenBtn().style.minHeight).toBe('44px');
    });
  }
});
