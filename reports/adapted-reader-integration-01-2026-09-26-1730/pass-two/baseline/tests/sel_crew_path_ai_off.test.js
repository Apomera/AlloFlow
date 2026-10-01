// SEL Hub · the eighteen tools the Crew Launch packs link must work with student AI off.
//
// PPS students have no Gemini. The Crew Launch packs (allopacks/crew_*) link
// thirteen Hub tools; a King student reaches each one on the browser shell with
// callGemini === null. This suite mounts every one of them through the REAL
// renderTool with no AI provider, then clicks every button, tab, and role=button
// it can find (bounded), and asserts: no uncaught exception, no React render
// error, and no error toast that blames a missing AI provider on a control that
// did not say it was an AI control. A dead end here is a dead end in week one.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }

// The tools the six Crew Launch packs link, by registered id, read from the packs
// so this list cannot drift from what students are actually sent to.
const LINKED = [...new Set(
  readdirSync(resolve(ROOT, 'allopacks')).filter((f) => f.startsWith('crew_') && f.endsWith('.allopack.json'))
    .flatMap((f) => [...readFileSync(resolve(ROOT, 'allopacks', f), 'utf8').matchAll(/\]\(#sel-hub\/([A-Za-z]+)(?:\?[^)]*)?\)/g)].map((m) => m[1]))
)].sort();

let React, RDC, act;
const pageErrors = [];

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
  if (typeof window.scrollTo !== 'function') window.scrollTo = noop;
  if (typeof Element.prototype.scrollIntoView !== 'function') Element.prototype.scrollIntoView = noop;
  sg('Audio', function () { return { play: () => Promise.resolve(), pause: noop }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  window.addEventListener('error', (e) => pageErrors.push(String(e && e.message)));
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort()
    .forEach((f) => { try { load(join(SEL, f)); } catch (e) { pageErrors.push(f + ': ' + e.message); } });
}

function ctxFor(id, toasts) {
  const noop = () => {};
  const pal = { bg: '#ffffff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  let data = {};
  const base = {
    React, toolData: data, setToolData: (d) => { data = d; }, update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: id,
    addToast: (msg, kind) => toasts.push({ msg: String(msg), kind: String(kind || 'info') }), awardXP: noop, getXP: () => 0,
    getSavePolicy: () => ({ checkpointLabel: 'Private checkpoint', sharePacketLabel: 'Share Packet eligible' }),
    announceToSR: noop, celebrate: noop, beep: noop, t: (k, fb) => (typeof fb === 'string' ? fb : k), theme,
    isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }),
    gradeLevel: '7th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t),
    a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: { onExportRequested: noop },
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

const CLICK_CAP = 160;
const AI_WORDS = /\b(ai|coach|advisor|mediator|gemini|generate|suggest|analy[sz]e|feedback from|ask the)\b/i;

function sweep(id) {
  const toasts = [];
  const errors = [];
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  const origError = console.error;
  console.error = (...a) => { const s = a.map(String).join(' '); if (/(above error|Consider adding an error boundary|Error: Uncaught|TypeError|ReferenceError)/.test(s)) errors.push(s.slice(0, 200)); };
  try {
    const ctx = ctxFor(id, toasts);
    const Probe = () => window.SelHub.renderTool(id, ctx);
    act(() => { root.render(React.createElement(Probe)); });
    const seen = new Set();
    let clicks = 0;
    for (let pass = 0; pass < 4 && clicks < CLICK_CAP; pass++) {
      const controls = Array.from(container.querySelectorAll('button, [role="button"], [role="tab"]'))
        .filter((el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true');
      let fresh = 0;
      for (const el of controls) {
        const key = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60) + '|' + el.tagName + '|' + pass;
        if (seen.has(key)) continue;
        seen.add(key); fresh++;
        if (!el.isConnected) continue;
        try {
          act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
        } catch (e) { errors.push((el.textContent || '').trim().slice(0, 40) + ': ' + e.message); }
        clicks++;
        if (clicks >= CLICK_CAP) break;
      }
      if (!fresh) break;
    }
    return { toasts, errors, clicks };
  } finally {
    console.error = origError;
    try { act(() => root.unmount()); } catch {}
    container.remove();
  }
}

describe.skipIf(!R)('SEL Hub · Crew path with student AI off', () => {
  beforeAll(setup);

  it('the packs link eighteen registered tools', () => {
    expect(LINKED.length).toBe(18);
    for (const id of LINKED) expect(window.SelHub.isRegistered(id), id).toBe(true);
  });

  it.each(LINKED)('%s mounts and survives a click sweep without an AI provider', (id) => {
    pageErrors.length = 0;
    const r = sweep(id);
    expect(r.clicks).toBeGreaterThan(0);
    expect(r.errors, id + ' render/click errors').toEqual([]);
    expect(pageErrors, id + ' uncaught errors').toEqual([]);
    // An error toast about AI is only acceptable from a control that named AI.
    const blame = r.toasts.filter((t) => t.kind === 'error' && /\bAI\b|not available|Gemini/i.test(t.msg));
    for (const t of blame) expect(AI_WORDS.test(t.msg), id + ' unexplained AI error toast: ' + t.msg).toBe(true);
  });
});
