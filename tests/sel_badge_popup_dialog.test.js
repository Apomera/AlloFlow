// SEL Hub — earning a badge must not start a three-second clock.
//
// Nine tools shipped the same celebration popup: a fixed overlay with no role,
// no accessible name, no keyboard dismissal, and a `setTimeout(..., 3000)` that
// removed it whether or not you had finished reading. Three seconds is the whole
// interaction for anyone reading slowly, listening to a screen reader, or
// working a switch — WCAG 2.2.1, Timing Adjustable. digitalwellbeing already
// shipped the right pattern; this pins the other nine to it.
//
// These assertions RENDER the popup rather than grep for it. A source scan would
// pass on a dialog that never appears, and the failure this guards against is a
// tenth copy-paste of the original popup, not a misspelling.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');

let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = {
    JSDOM: req('jsdom').JSDOM,
    React: req('react'),
    RDS: req('react-dom/server'),
    RDC: req('react-dom/client'),
    act: req('react-dom/test-utils').act,
  };
} catch { R = null; }

const TOOLS = ['coping', 'emotions', 'journal', 'mindfulness', 'perspective', 'safety', 'social', 'teamwork', 'zones'];

// A badge id the tool will actually match on, read out of its own BADGES array.
function firstBadgeId(src) {
  const arr = src.match(/(?:var|const)\s+BADGES\s*=\s*\[[\s\S]{0,4000}/);
  if (!arr) return null;
  const id = arr[0].match(/id:\s*'([^']+)'/);
  return id ? id[1] : null;
}

let registry = null;
let React;
let RDS;

function setup() {
  // Use the jsdom vitest already gives us (vitest.config.js: environment 'jsdom')
  // rather than standing up a second one. A private JSDOM is not the focused
  // document, so element.focus() silently does nothing in it and every
  // focus-related assertion below would read as a failure that isn't real.
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  const stub = () => null;
  React = R.React; RDS = R.RDS;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => stub });
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  }
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);

  window.SelHub = {
    _registry: {}, _order: [],
    registerTool(id, config) { if (!this._registry[id]) this._order.push(id); this._registry[id] = config; },
    isRegistered(id) { return !!this._registry[id]; },
    getRegisteredTools() { return this._order.map((id) => this._registry[id]).filter(Boolean); },
    renderTool(id, ctx) { const t = this._registry[id]; if (!t || !t.render) return null; try { return t.render(ctx); } catch { return null; } },
  };
  readdirSync(SEL).filter((f) => /\.js$/.test(f) && f !== 'sel_hub_module.js' && !/^_build/.test(f)).sort()
    .forEach((f) => { try { new Function(readFileSync(join(SEL, f), 'utf8'))(); } catch { /* tool-local load issue */ } });
  registry = window.SelHub._registry;
}

// Renders one tool with the given toolData and returns its static markup.
function renderWith(toolId, toolData) {
  const noop = () => {};
  const stub = () => null;
  const palette = new Proxy({}, { get: () => '#888888' });
  const themeBase = { isDark: true, isContrast: false, reduceMotion: false, palette };
  const theme = new Proxy(themeBase, { get: (o, p) => (p in o ? o[p] : '#888888') });
  const base = {
    React, toolData, setToolData: noop, update: noop, updateMulti: noop,
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: '', selHubTool: '',
    addToast: noop, awardXP: noop, getXP: () => 0, announceToSR: noop, celebrate: noop, beep: noop,
    t: (k) => k, theme, isDark: true, isContrast: false,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null,
    onSafetyFlag: noop, studentCodename: null, selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => stub }),
    gradeLevel: '5th Grade', gradeBand: 'middle',
    toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (text) => React.createElement('span', { className: 'sr-only' }, text),
    a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }),
    props: {},
  };
  const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
  const tool = registry[toolId];
  if (!tool || !tool.render) return '';
  // render() calls React hooks, so it has to run INSIDE a component. Calling it
  // directly and handing the tree to renderToStaticMarkup gives "Invalid hook call".
  const Probe = () => tool.render(ctx);
  return RDS.renderToStaticMarkup(React.createElement(Probe));
}

// The registered id need not match the filename, so read it from the call.
function toolIdFor(name, src) {
  const m = src.match(/registerTool\(\s*'([^']+)'/);
  return m ? m[1] : name;
}

// Tool state is namespaced under toolData: `var d = (ctx.toolData && ctx.toolData.zones) || {}`.
// Read the namespace from the tool rather than assuming it equals the filename.
function stateKeyFor(name, src) {
  const m = src.match(/toolData\s*&&\s*toolData\.([A-Za-z_$][\w$]*)/)
    || src.match(/ctx\.toolData\s*&&\s*ctx\.toolData\.([A-Za-z_$][\w$]*)/);
  return m ? m[1] : name;
}

describe.skipIf(!R)('SEL Hub · badge popups are dialogs, not three-second flashes', () => {
  const cases = [];

  beforeAll(() => {
    setup();
    TOOLS.forEach((name) => {
      const src = readFileSync(join(SEL, 'sel_tool_' + name + '.js'), 'utf8');
      cases.push({ name, src, badge: firstBadgeId(src), id: toolIdFor(name, src), key: stateKeyFor(name, src) });
    });
  });

  it('the probe can read a real badge id out of every tool (guards the guard)', () => {
    const blind = cases.filter((c) => !c.badge).map((c) => c.name);
    expect(blind, 'no badge id extracted; the render assertions below would pass vacuously').toEqual([]);
  });

  it.each(TOOLS)('%s: shows a named, modal dialog when a badge is earned', (name) => {
    const c = cases.find((x) => x.name === name);
    const html = renderWith(c.id, { [c.key]: { showBadgePopup: c.badge, xp: 25 } });
    expect(html, name + ' rendered nothing').toBeTruthy();

    // Calibration: the same tool WITHOUT a pending badge must not show the dialog.
    // Without this, an unconditional dialog elsewhere in the tool would pass.
    const quiet = renderWith(c.id, { [c.key]: { xp: 25 } });
    expect(quiet.includes('alertdialog'), name + ' shows the badge dialog with no badge earned').toBe(false);

    expect(html, name + ': badge popup has no alertdialog role').toContain('role="alertdialog"');
    expect(html, name + ': badge popup is not marked modal').toContain('aria-modal="true"');
    expect(html, name + ': badge popup has no accessible name').toMatch(/aria-label="Badge earned:[^"]+"/);
  });

  it.each(TOOLS)('%s: the badge dialog can be dismissed from the keyboard', (name) => {
    const c = cases.find((x) => x.name === name);
    const html = renderWith(c.id, { [c.key]: { showBadgePopup: c.badge, xp: 25 } });
    const doc = new R.JSDOM('<!doctype html><body>' + html + '</body>').window.document;
    const dlg = doc.querySelector('[role="alertdialog"]');
    expect(dlg, name + ': no dialog rendered').toBeTruthy();
    const buttons = dlg.querySelectorAll('button:not([disabled])');
    expect(buttons.length, name + ': dialog has no focusable control, so a keyboard user is stuck').toBeGreaterThan(0);
    // Backdrop click is a pointer-only affordance; Escape is what a keyboard user reaches for.
    expect(c.src, name + ': dialog has no Escape handler').toMatch(/key === 'Escape'[\s\S]{0,160}showBadgePopup/);
  });

  // The tests above read rendered markup. These MOUNT the tool and dispatch real
  // keyboard events, because the two things that matter here — Escape dismisses,
  // Tab cannot leave — are behaviour, and markup cannot show either.
  //
  // ★ Calibration note: jsdom does not move focus on Tab of its own accord, so
  // "focus was still inside afterwards" is true even with NO handler. The honest
  // signal is whether the handler CLAIMED the event (preventDefault), paired with
  // a control key it must NOT claim.
  it.each(TOOLS)('%s: Escape dismisses the dialog and Tab cannot leave it', (name) => {
    const c = cases.find((x) => x.name === name);
    const host = document.createElement('div');
    document.body.appendChild(host);
    const stub = () => null;
    const palette = new Proxy({}, { get: () => '#888888' });
    const theme = new Proxy({ isDark: true, isContrast: false, reduceMotion: false, palette }, { get: (o, p) => (p in o ? o[p] : '#888888') });
    const calls = [];
    const noop = () => {};
    const record = (...a) => { calls.push(a); };
    const base = {
      React, toolData: { [c.key]: { showBadgePopup: c.badge, xp: 25 } },
      setToolData: record, update: record, updateMulti: record,
      t: (k) => k, theme, isDark: true, isContrast: false, callGemini: null,
      icons: new Proxy({}, { get: () => stub }), gradeLevel: '5th Grade', gradeBand: 'middle',
      toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop, announceToSR: noop,
      addToast: noop, awardXP: noop, getXP: () => 0, celebrate: noop, beep: noop,
      srOnly: (x) => React.createElement('span', { className: 'sr-only' }, x),
      a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }),
      props: {},
    };
    const ctx = new Proxy(base, { get: (o, p) => (p in o ? o[p] : noop) });
    const root = R.RDC.createRoot(host);
    const Probe = () => registry[c.id].render(ctx);
    R.act(() => { root.render(React.createElement(Probe)); });

    const dlg = host.querySelector('[role="alertdialog"]');
    expect(dlg, name + ': no dialog mounted').toBeTruthy();
    const btn = dlg.querySelector('button:not([disabled])');
    expect(btn, name + ': dialog has no focusable control').toBeTruthy();
    btn.focus();

    const KE = window.KeyboardEvent;
    const tab = new KE('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    R.act(() => { dlg.dispatchEvent(tab); });
    expect(tab.defaultPrevented, name + ': Tab was not trapped, so focus escapes an aria-modal dialog').toBe(true);
    expect(dlg.contains(document.activeElement), name + ': focus left the dialog').toBe(true);

    // Control: an ordinary key must pass straight through.
    const other = new KE('keydown', { key: 'a', bubbles: true, cancelable: true });
    R.act(() => { dlg.dispatchEvent(other); });
    expect(other.defaultPrevented, name + ': the dialog swallows unrelated keys').toBe(false);

    // Escape must actually dismiss, not merely be handled.
    calls.length = 0;
    const esc = new KE('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    R.act(() => { dlg.dispatchEvent(esc); });
    expect(esc.defaultPrevented, name + ': Escape was not handled').toBe(true);
    const cleared = calls.some((a) => JSON.stringify(a).includes('showBadgePopup'));
    expect(cleared, name + ': Escape did not clear showBadgePopup').toBe(true);

    R.act(() => { root.unmount(); });
    host.remove();
    // Mounting a whole tool is slow — some of these files run past 26k lines — and
    // in a full-suite run the default 5s trips on load rather than on logic.
  }, 30000);

  it('no SEL tool auto-dismisses a badge popup on a timer (WCAG 2.2.1)', () => {
    const offenders = [];
    readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).forEach((f) => {
      const src = readFileSync(join(SEL, f), 'utf8');
      // A setTimeout that clears showBadgePopup = the popup leaves on its own schedule.
      const re = /setTimeout\(\s*function\s*\([^)]*\)\s*\{[^{}]{0,200}showBadgePopup[^{}]{0,200}\}\s*,\s*(\d+)/g;
      let m;
      while ((m = re.exec(src))) offenders.push(f + ' (' + m[1] + 'ms)');
    });
    expect(offenders, 'a badge popup that removes itself is a WCAG 2.2.1 failure — let the reader close it').toEqual([]);
  });

  it('every badge popup in the hub meets the dialog contract, including future copies', () => {
    // Deliberately shape-agnostic. Two good implementations already live here:
    // role=alertdialog + aria-label (digitalwellbeing and the nine), and
    // role=dialog + aria-labelledby + a focus trap (advocacy, community,
    // conflict, decisions). Both are correct, so assert the PROPERTIES that
    // matter — announced as a dialog, modal, named, closable from the keyboard —
    // not one team's spelling of them.
    const bad = [];
    readdirSync(SEL).filter((f) => /^sel_tool_.*\.js$/.test(f)).forEach((f) => {
      const src = readFileSync(join(SEL, f), 'utf8');
      if (!/showBadgePopup/.test(src)) return;
      // Only tools that actually paint an overlay for it.
      if (!/badgePopup\s*=\s*h\(|renderBadgePopup/.test(src)) return;
      const missing = [];
      if (!/role: '(alertdialog|dialog)'/.test(src)) missing.push('dialog role');
      if (!/'aria-modal'/.test(src)) missing.push('aria-modal');
      if (!/'aria-label(ledby)?': '[^']/.test(src)) missing.push('accessible name');
      if (!/key === 'Escape'/.test(src)) missing.push('Escape');
      if (missing.length) bad.push(f + ': missing ' + missing.join(', '));
    });
    expect(bad, 'a badge popup was added or copied without the dialog contract').toEqual([]);
  });
});
