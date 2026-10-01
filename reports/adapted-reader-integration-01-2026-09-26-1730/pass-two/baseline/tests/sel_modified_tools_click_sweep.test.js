// SEL Hub · every tool the 2026-09-13 dead-content removal touched still mounts and
// survives a click sweep, with and without an AI provider.
//
// The removal was static (a parser proved nothing referenced the declarations). This
// is the runtime half of that proof: mount each of the eleven changed tools through
// the REAL renderTool, click every button, tab and role=button it exposes (capped),
// and require no uncaught exception, no React render error, and no "undefined"
// rendered into the DOM where a library used to be. Runs twice per tool: once with
// callGemini null (the PPS student case), once with a stub provider that resolves.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
const TOOLS = ['zones', 'howlTracker', 'mindfulness', 'advocacy', 'upstander', 'digitalWellbeing', 'anxietyToolkit', 'griefLoss', 'stressBucket', 'bigFeelings', 'emotions', 'teamwork'];

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;
const pageErrors = [];

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  if (typeof window.scrollTo !== 'function') window.scrollTo = noop;
  if (typeof Element.prototype.scrollIntoView !== 'function') Element.prototype.scrollIntoView = noop;
  sg('Audio', function () { return { play: () => Promise.resolve(), pause: noop }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  window.addEventListener('error', (e) => pageErrors.push(String(e && e.message)));
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).sort().forEach((f) => { try { load(join(SEL, f)); } catch (e) { pageErrors.push(f + ': ' + e.message); } });
}

function ctxFor(id, ai) {
  const noop = () => {};
  const pal = { bg: '#ffffff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  const base = {
    React, toolData: {}, setToolData: noop, update: noop, updateMulti: noop, setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: id,
    addToast: noop, awardXP: noop, getXP: () => 0, getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }), announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: ai, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '7th Grade', gradeBand: 'middle', toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t), a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: { onExportRequested: noop },
  };
  return new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
}

const CAP = 200;
function sweep(id, ai) {
  const errors = [];
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = RDC.createRoot(container);
  const origError = console.error;
  console.error = (...a) => { const s = a.map(String).join(' '); if (/(Consider adding an error boundary|TypeError|ReferenceError|is not defined|Cannot read)/.test(s)) errors.push(s.slice(0, 200)); };
  try {
    const ctx = ctxFor(id, ai);
    act(() => { root.render(React.createElement(() => window.SelHub.renderTool(id, ctx))); });
    let undefinedText = (container.textContent.match(/\bundefined\b/g) || []).length;
    const seen = new Set(); let clicks = 0;
    for (let pass = 0; pass < 4 && clicks < CAP; pass++) {
      const controls = Array.from(container.querySelectorAll('button, [role="button"], [role="tab"]')).filter((el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true');
      let fresh = 0;
      for (const el of controls) {
        const key = (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60) + '|' + pass;
        if (seen.has(key) || !el.isConnected) continue;
        seen.add(key); fresh++;
        try { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); }
        catch (e) { errors.push((el.textContent || '').trim().slice(0, 40) + ': ' + e.message); }
        undefinedText += (container.textContent.match(/\bundefined\b/g) || []).length;
        if (++clicks >= CAP) break;
      }
      if (!fresh) break;
    }
    return { errors, clicks, undefinedText };
  } finally {
    console.error = origError;
    try { act(() => root.unmount()); } catch {}
    container.remove();
  }
}

describe.skipIf(!R)('SEL Hub · tools changed by the dead-content removal', () => {
  beforeAll(setup);
  it('all twelve are registered', () => { for (const id of TOOLS) expect(window.SelHub.isRegistered(id), id).toBe(true); });
  it.each(TOOLS)('%s survives a click sweep with no AI provider', (id) => {
    pageErrors.length = 0;
    const r = sweep(id, null);
    expect(r.clicks).toBeGreaterThan(0);
    expect(r.errors, id).toEqual([]);
    expect(pageErrors, id).toEqual([]);
    expect(r.undefinedText, id + ' rendered the word "undefined"').toBe(0);
  });
  it.each(TOOLS)('%s survives a click sweep with a stub AI provider', (id) => {
    pageErrors.length = 0;
    const r = sweep(id, () => Promise.resolve('Stub reply for the sweep.'));
    expect(r.errors, id).toEqual([]);
    expect(pageErrors, id).toEqual([]);
    expect(r.undefinedText, id + ' rendered the word "undefined"').toBe(0);
  });
});
