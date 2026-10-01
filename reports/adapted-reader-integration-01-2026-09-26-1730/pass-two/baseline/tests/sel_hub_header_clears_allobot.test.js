// SEL Hub · the header's buttons are not left under the AlloBot.
//
// Found 2026-09-24 with axe in Chromium (Crew week 5, student): the AlloBot is fixed at z 10000 above
// the hub dialog (z 9999) and parks at the top right, where the header's buttons end. At 1366 px it
// covered Close SEL Hub completely: none of 9 points inside the button reached it, so a click on the X
// opened the bot's voice settings. On a phone it covered 5 of 9 points. While the bot overlaps the
// header, the header now leaves that side free.
//
// jsdom has no layout, so boxes are given to the header and the bot by hand.
// SEL_HUB_MODULE_PATH points the suite at a copy of sel_hub_module.js for mutation runs.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const HUB = process.env.SEL_HUB_MODULE_PATH ? resolve(process.env.SEL_HUB_MODULE_PATH) : resolve(SEL, 'sel_hub_module.js');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;
const nodeRequire = createRequire(import.meta.url);
const load = (f) => new Function('require', readFileSync(f, 'utf8'))(nodeRequire);

const VW = 1366;
const HEADER = { left: 0, top: 0, right: VW, bottom: 64 };
const rect = (b) => ({ ...b, x: b.left, y: b.top, width: b.right - b.left, height: b.bottom - b.top, toJSON() {} });

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  }
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  if (typeof window.Element.prototype.scrollIntoView !== 'function') window.Element.prototype.scrollIntoView = noop;
  Object.defineProperty(window, 'innerWidth', { value: VW, configurable: true, writable: true });
  // Layout stand-in: the hub header and anything carrying data-test-box get a box.
  const real = window.Element.prototype.getBoundingClientRect;
  window.Element.prototype.getBoundingClientRect = function () {
    if (this.getAttribute && this.getAttribute('role') === 'banner' && this.closest('[aria-label="SEL Hub"]')) return rect(HEADER);
    const box = this.getAttribute && this.getAttribute('data-test-box');
    if (box) { const [l, t, r, b] = box.split(',').map(Number); return rect({ left: l, top: t, right: r, bottom: b }); }
    return real.call(this);
  };
  load(HUB);
  for (const f of ['sel_safety_layer.js', 'sel_standards_alignment.js']) {
    if (existsSync(join(SEL, f))) { try { load(join(SEL, f)); } catch { /* optional */ } }
  }
  window.__alloEnsureSelPluginLoaded = () => true;
  window.__alloGetSelPluginState = () => null;
  window.__alloflowSelSnapshots = []; window.__alloflowStudentArtifacts = [];
}

// A bot like the real one: a box, plus control buttons that stick out past it.
function placeBot(body, ring) {
  const bot = document.createElement('div');
  bot.setAttribute('data-allobot-control-surface', 'true');
  bot.setAttribute('data-test-box', body.join(','));
  for (const b of ring || []) { const btn = document.createElement('button'); btn.setAttribute('data-test-box', b.join(',')); bot.appendChild(btn); }
  document.body.appendChild(bot);
  return bot;
}

function mountHub() {
  const noop = () => {};
  const Icon = () => null;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  act(() => {
    root.render(React.createElement(window.AlloModules.SelHub, {
      showSelHub: true, setShowSelHub: noop, selHubTab: 'explore', setSelHubTab: noop,
      selHubTool: null, setSelHubTool: noop, addToast: noop, gradeLevel: '7th Grade',
      callGemini: null, onSafetyFlag: noop, studentCodename: 'test', t: (k) => k,
      ArrowLeft: Icon, X: Icon, Sparkles: Icon, Heart: Icon, GripVertical: Icon, onExportRequested: noop,
    }));
  });
  const header = () => container.querySelector('[aria-label="SEL Hub"] [role="banner"]');
  return { container, header, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
const pad = (el, side) => parseFloat(el.style[side === 'right' ? 'paddingRight' : 'paddingLeft'] || '0');
const remeasure = () => act(() => { window.dispatchEvent(new window.Event('resize')); });

describe.skipIf(!R)('SEL Hub header and the AlloBot', () => {
  beforeAll(setup);
  afterEach(() => { document.querySelectorAll('[data-allobot-control-surface]').forEach((n) => n.remove()); });

  it('the bot at its default top-right spot: the header leaves room for the bot and its control ring', () => {
    // Measured at 1366 px: body 1262-1342, ring out to 1254 on the left.
    placeBot([1262, 20, 1342, 100], [[1254, 12, 1286, 44], [1318, 12, 1350, 44], [1254, 76, 1286, 108], [1318, 76, 1350, 108]]);
    const h = mountHub();
    const hdr = h.header();
    expect(hdr, 'hub header not found').toBeTruthy();
    expect(hdr.getAttribute('data-sel-bot-clear')).toBe('right:120');
    expect(pad(hdr, 'right')).toBeGreaterThanOrEqual(VW - 1254 + 8);
    h.unmount();
  });

  it('no bot (hidden or not mounted): the header keeps its normal padding', () => {
    const h = mountHub();
    expect(h.header().getAttribute('data-sel-bot-clear')).toBeNull();
    expect(h.header().style.padding).toBe('16px 20px');
    h.unmount();
  });

  it('the bot dragged to the top left: the room is taken on the left', () => {
    placeBot([16, 10, 96, 90], [[8, 2, 40, 34]]);
    const h = mountHub();
    expect(h.header().getAttribute('data-sel-bot-clear')).toBe('left:104');
    expect(pad(h.header(), 'left')).toBe(104);
    h.unmount();
  });

  it('the bot below the header: nothing changes', () => {
    placeBot([1262, 300, 1342, 380]);
    const h = mountHub();
    expect(h.header().getAttribute('data-sel-bot-clear')).toBeNull();
    h.unmount();
  });

  it('follows the bot: dragged away, then back, the header lets go and makes room again', () => {
    const bot = placeBot([1262, 20, 1342, 100]);
    const h = mountHub();
    expect(h.header().getAttribute('data-sel-bot-clear')).toBe('right:112');
    bot.setAttribute('data-test-box', '600,400,680,480');
    remeasure();
    expect(h.header().getAttribute('data-sel-bot-clear')).toBeNull();
    bot.setAttribute('data-test-box', '1262,20,1342,100');
    remeasure();
    expect(h.header().getAttribute('data-sel-bot-clear')).toBe('right:112');
    h.unmount();
  });
});
