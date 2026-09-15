// SEL Hub · HOWL Tracker, second honesty pass: padded banks deduplicated, one script shown once.
//
// An AST scan of every SEL tool for duplicate rows found the padding concentrated in this tool:
// 80 "openers" that were 12 copied per grade, 60 closers that were 9, 150 coaching moves that were
// 50 copied per context, 192 "student voices" that were 48 (the same 12 per level under all four
// HOWLs), 252 "SMART goals" that were 36 copied per grade, and three libraries (conference, repair,
// climate) whose thirty-odd "scripts" shared one identical body. The source is deduplicated and the
// views show the one script once with the situations it fits. Mounted through the REAL renderTool.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const SEL = resolve(ROOT, 'sel_hub');
let R = null;
try {
  const req = createRequire(join(ROOT, 'desktop', 'web-app', 'package.json'));
  R = { React: req('react'), RDC: req('react-dom/client'), act: req('react-dom/test-utils').act };
} catch { R = null; }
let React, RDC, act;

function setup() {
  const sg = (k, v) => { try { globalThis[k] = v; } catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } };
  const noop = () => {};
  React = R.React; RDC = R.RDC; act = R.act;
  sg('React', React); window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloModules = window.AlloModules || {};
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  load(resolve(SEL, 'sel_tool_howl.js'));
}

let store = {};
function mount(toolData) {
  const noop = () => {};
  store = { howlTracker: Object.assign({}, toolData) };
  const pal = { bg: '#fff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  let root, container;
  const render = () => { act(() => { root.render(React.createElement(() => window.SelHub.renderTool('howlTracker', ctx()))); }); };
  const setToolData = (fn) => { store = typeof fn === 'function' ? fn(store) : Object.assign({}, store, fn); render(); };
  const ctx = () => new Proxy({
    React, toolData: store, setToolData,
    update: (toolId, key, val) => setToolData((p) => { const n = Object.assign({}, p); n[toolId] = Object.assign({}, p[toolId], { [key]: val }); return n; }),
    updateMulti: (toolId, patch) => setToolData((p) => { const n = Object.assign({}, p); n[toolId] = Object.assign({}, p[toolId], patch); return n; }),
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: 'howlTracker', addToast: noop, awardXP: noop, getXP: () => 0,
    getSavePolicy: () => ({ checkpointLabel: 'x', sharePacketLabel: 'y' }), announceToSR: noop, celebrate: noop, beep: noop,
    t: (k, fb) => (typeof fb === 'string' ? fb : k), theme, isDark: false, isContrast: false, reduceMotion: true, themePalette: pal,
    callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, onSafetyFlag: noop, studentCodename: 'test', selectedVoice: null, activeSessionCode: null,
    icons: new Proxy({}, { get: () => () => null }), gradeLevel: '7th Grade', gradeBand: 'middle', toolSnapshots: [], setToolSnapshots: noop, saveSnapshot: noop,
    srOnly: (t) => React.createElement('span', { className: 'sr-only' }, t), a11yClick: (fn) => ({ onClick: fn, onKeyDown: noop, role: 'button', tabIndex: 0 }), props: { onExportRequested: noop },
  }, { get: (o, p) => (p in o ? o[p] : noop) });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = RDC.createRoot(container);
  render();
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}
function count(text, needle) { return text.split(needle).length - 1; }

const src = readFileSync(resolve(SEL, 'sel_tool_howl.js'), 'utf8');
function blockOf(name, last) {
  const idx = last ? src.lastIndexOf('var ' + name + ' = [') : src.indexOf('var ' + name + ' = [');
  const rest = src.slice(idx);
  return rest.slice(0, rest.search(/\n\s*\];/));
}
function rowsOf(name, last) { return (blockOf(name, last).match(/\bid: "/g) || []).length; }

describe('HOWL Tracker · the padded banks are deduplicated at source', () => {
  it('openers 12, closers 9, coaching moves 50, student voices 48, goal sentences 36', () => {
    expect(rowsOf('CREW_OPENERS')).toBe(12);
    expect(rowsOf('CREW_CLOSERS')).toBe(9);
    expect(rowsOf('COACHING_MOVES')).toBe(50);
    expect(rowsOf('HOWL_EVIDENCE')).toBe(48);
    expect(rowsOf('HOWL_GOAL_TEMPLATES', true)).toBe(36);
  });
  it('the deduplicated voices no longer claim a HOWL, and goal sentences no longer claim a grade', () => {
    expect((blockOf('HOWL_EVIDENCE').match(/howl: "any"/g) || []).length).toBe(48);
    expect((blockOf('HOWL_GOAL_TEMPLATES', true).match(/forGrade: "all"/g) || []).length).toBe(36);
    expect(blockOf('COACHING_MOVES')).not.toMatch(/context: "/);
  });
});

describe.skipIf(!R)('HOWL Tracker · one script, shown once', () => {
  beforeAll(setup);

  it('Opener randomizer: the library says 12, not 80', () => {
    const h = mount({ view: 'opener_random' });
    const text = h.container.textContent;
    expect(text).toContain('12 openers in the library');
    expect(text).not.toContain('80 openers');
    h.unmount();
  });

  it('Conference: one agenda with its phases, and the thirty occasions listed under it', () => {
    const h = mount({ view: 'conference' });
    const text = h.container.textContent;
    expect(text).toContain('Conference agenda');
    expect(count(text, 'Thank you for making time.')).toBe(1);
    expect(text).toContain('Occasions');
    expect(text).toContain('Beginning-of-year HOWL goal setting');
    expect(text).toContain('End-of-Q1 reflection');
    expect(text).not.toContain('Conference scripts');
    h.unmount();
  });

  it('Protocols: one repair script with the situations it fits, not thirty copies', () => {
    const h = mount({ view: 'protocols' });
    const text = h.container.textContent;
    expect(text).toContain('Repair conversation');
    expect(count(text, 'We are here to talk about what happened.')).toBe(1);
    expect(text).toContain('Fits these situations');
    expect(text).toContain('After hurtful comment');
    expect(text).toContain('After microaggression');
    h.unmount();
  });

  it('Crew: coaching move titles carry no context suffix', () => {
    const h = mount({ view: 'crew' });
    const summaries = Array.from(h.container.querySelectorAll('summary')).map((x) => x.textContent);
    const moves = summaries.filter((t) => /Naming Effort/.test(t));
    expect(moves.length).toBe(1);
    expect(moves[0].trim().endsWith('·')).toBe(false);
    expect(moves[0]).not.toMatch(/in-class|crew-time/);
    h.unmount();
  });

  it('Climate scenarios: the navigation is shown once above the list, no card has a reveal button, crises keep their line', () => {
    const h = mount({ view: 'climate_scenarios' });
    const text = h.container.textContent;
    expect(h.container.querySelector('[data-howl-climate-nav]'), 'nav block').toBeTruthy();
    expect(count(text, 'Slow your own breath.')).toBe(1);
    expect(text).toContain('One student consistently sitting alone');
    expect(Array.from(h.container.querySelectorAll('button')).some((b) => b.textContent.trim() === 'See navigation')).toBe(false);
    expect(text).not.toContain('Specific situation requiring facilitator attention');
    // The shared line mentions 988 once; each crisis card carries its own escalation line.
    const crisisCards = Array.from(h.container.querySelectorAll('h5')).filter((x) => !x.closest('[data-howl-climate-nav]') && /988/.test(x.parentElement.parentElement.textContent)).length;
    expect(crisisCards).toBeGreaterThanOrEqual(3);
    expect(count(text, '988')).toBe(crisisCards + 1);
    h.unmount();
  });

  it('Evidence library: voices grouped by level, no HOWL label, no per-level boilerplate line', () => {
    const h = mount({ view: 'evidence_lib' });
    const text = h.container.textContent;
    expect(text).toContain('48 things a student might say');
    expect(text).not.toContain('Add one consistent practice toward level');
    expect(text).not.toContain('any · L');
    expect(text).toContain('Level 1');
    h.unmount();
  });

  it('a student sees the student sections; the Crew-leader sections sit behind one toggle', () => {
    const h = mount({});
    const tabs = () => Array.from(h.container.querySelectorAll('[role="tab"]')).map((b) => b.textContent.trim());
    const before = tabs();
    expect(before.length).toBeLessThanOrEqual(16);
    expect(before.some((t) => /Weekly check-in/.test(t))).toBe(true);
    expect(before.some((t) => /Climate Scenarios|Rituals|Opener Randomizer/.test(t))).toBe(false);
    const toggle = Array.from(h.container.querySelectorAll('button')).find((b) => /For Crew leaders/.test(b.textContent));
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    act(() => { toggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
    const after = tabs();
    expect(after.length).toBe(before.length + 12);
    expect(after.some((t) => /Climate Scenarios/.test(t))).toBe(true);
    h.unmount();
    // Opened on a leader section, the toggle is already open.
    const h2 = mount({ view: 'protocols' });
    expect(h2.container.querySelector('#howl-leader-tabs')).toBeTruthy();
    h2.unmount();
  });

  it('Goals library: sentences by HOWL and level, no template boilerplate', () => {
    const h = mount({ view: 'goals_lib' });
    const text = h.container.textContent;
    expect(text).toContain('36 goal sentences');
    expect(text).not.toContain('Targeted SMART goal toward next level.');
    expect(text).not.toContain('Weekly micro-actions');
    h.unmount();
  });
});
