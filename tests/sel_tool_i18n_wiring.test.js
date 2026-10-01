// @vitest-environment jsdom
// SEL tools wired for translation (phase 2, 2026-09-28): TIPP and Crisis Companion.
//
// Each wired tool reads its text through a module-level __alloT(key, English).
// Text tables at module scope are rebuilt at the top of render(), so a language
// change applies without reloading the module. Pinned here, per tool:
//   - every literal key is registered with the English the source passes;
//   - a marker translator leaves none of the tool's registered English on screen
//     (initial view and each first-level control);
//   - the table text follows a language change on an already-mounted tool;
//   - crisis-line keywords stay verbatim whatever the translation says.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const modulesDir = resolve(ROOT, 'desktop/web-app/node_modules');
const uiStrings = JSON.parse(readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8'));
const registered = (key) => key.split('.').reduce((n, p) => (n && typeof n === 'object' ? n[p] : undefined), uiStrings);
const flat = (d, p = '', out = {}) => { for (const [k, v] of Object.entries(d || {})) { if (v && typeof v === 'object') flat(v, p + k + '.', out); else if (typeof v === 'string') out[p + k] = v; } return out; };
const TOOLS = { tipp: 'sel_hub/sel_tool_tipp.js', crisiscompanion: 'sel_hub/sel_tool_crisiscompanion.js' };
const SRC = Object.fromEntries(Object.entries(TOOLS).map(([id, f]) => [id, readFileSync(resolve(ROOT, process.env['SEL_TOOL_SOURCE_' + id.toUpperCase()] || f), 'utf8')]));

let React, ReactDOMClient, act, root, host;
let currentT = () => undefined;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = global.React = React;
  window.print = () => {}; window.alert = () => {}; window.open = () => null;
  Element.prototype.scrollIntoView = function () {};
  window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  new Function(readFileSync(resolve(ROOT, 'sel_hub/sel_safety_layer.js'), 'utf8'))(); // eslint-disable-line no-new-func
  for (const id of Object.keys(TOOLS)) new Function(SRC[id])(); // eslint-disable-line no-new-func
});

afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  host?.remove(); root = host = null;
  localStorage.clear();
});

function Host({ id }) {
  const [data, setData] = React.useState({});
  const noop = () => {};
  const ctx = {
    React, toolData: data, setToolData: setData,
    update: (tid, k, v) => setData((p) => ({ ...p, [tid]: { ...(p[tid] || {}), [k]: v } })),
    updateMulti: (tid, o) => setData((p) => ({ ...p, [tid]: { ...(p[tid] || {}), ...o } })),
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: id,
    addToast: noop, awardXP: noop, getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => currentT(k), theme: { isDark: false, isContrast: false }, isDark: false, isContrast: false,
    callGemini: null, callTTS: null, onSafetyFlag: noop, studentCodename: 'test', activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '8th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop, toolLabel: () => '', openTool: noop, props: {},
  };
  window.SelHub.t = ctx.t;
  return window.SelHub.renderTool(id, ctx);
}

async function mount(id, t) {
  currentT = t;
  const saved = window.SelHubStandards; window.SelHubStandards = undefined; // shared panel, translated separately
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => { root.render(React.createElement(Host, { id })); });
  window.SelHubStandards = saved;
  return host;
}
const visible = (el) => el.textContent + ' ' + Array.from(el.querySelectorAll('[aria-label],[title],[placeholder]')).map((n) => ['aria-label', 'title', 'placeholder'].map((a) => n.getAttribute(a) || '').join(' ')).join(' ');
const mark = (k) => { const en = registered(k); return typeof en === 'string' ? '⟦' + en + '⟧' : undefined; };
const unmarked = (s) => { let o = s, p; do { p = o; o = o.replace(/⟦[^⟦⟧]*⟧/g, ' '); } while (o !== p); return o; };
const toolEnglish = (id) => [...new Set(Object.values(flat(registered('sel.' + id))))].filter((s) => s.trim().length > 5 && !/\{[a-zA-Z]+\}/.test(s) && !/^[A-Z0-9 ·&/+-]+$/.test(s));
const buttons = (el) => Array.from(el.querySelectorAll('button, [role="tab"], summary'));

describe.each(Object.keys(TOOLS))('%s', (id) => {
  it('registers every literal key with the English the source passes', () => {
    const calls = [...SRC[id].matchAll(/__alloT\('(sel\.[A-Za-z0-9_.]+)', '((?:[^'\\]|\\.)*)'\)/g)];
    expect(calls.length).toBeGreaterThan(id === 'tipp' ? 100 : 600);
    const bad = calls.filter(([, k, en]) => registered(k) !== en.replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\\\/g, '\\')).map(([, k]) => k);
    expect(bad).toEqual([]);
  });

  it('leaves none of its registered English on screen under a marker translator', async () => {
    const english = toolEnglish(id);
    const leaksAt = (el, where) => english.filter((s) => unmarked(visible(el)).includes(s)).map((s) => where + ': ' + s);
    let el = await mount(id, mark);
    const leaks = leaksAt(el, 'initial');
    const n = buttons(el).length;
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await act(async () => { root.unmount(); }); host.remove(); localStorage.clear();
      el = await mount(id, mark);
      const b = buttons(el)[i];
      if (!b) continue;
      await act(async () => { b.click(); });
      leaks.push(...leaksAt(el, 'after control ' + i));
    }
    expect(leaks).toEqual([]);
  });
});

describe('language changes reach the rebuilt tables', () => {
  it('TIPP skill names follow a translator swapped on a mounted tool', async () => {
    const el = await mount('tipp', () => undefined);
    expect(el.textContent).toContain('Temperature');
    currentT = (k) => (k === 'sel.tipp.skills.temperature.label' ? 'Temperatura' : undefined);
    await act(async () => { root.render(React.createElement(Host, { id: 'tipp' })); });
    expect(el.textContent).toContain('Temperatura');
  });
});

describe('crisis-line keywords stay verbatim', () => {
  it('Crisis Companion keeps HOME and 741741 when every string is translated', async () => {
    const opaque = (k) => (String(k).startsWith('sel.') ? '◊' : undefined);
    const el = await mount('crisiscompanion', opaque);
    const b = buttons(el)[0];
    await act(async () => { b.click(); });
    const text = el.textContent;
    expect(text).toContain('HOME');
    expect(text).toContain('741741');
  });
});
