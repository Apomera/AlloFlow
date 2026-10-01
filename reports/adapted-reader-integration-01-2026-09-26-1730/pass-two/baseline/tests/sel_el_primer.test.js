// SEL Hub · the words Crew, HOWL and EL Education are defined where they are used, with sources.
//
// The six Crew Launch packs and two Hub tools used EL Education's vocabulary as if every teacher
// knew it. Now: one primer object on window.SelHub with four terms and six sources (King Middle
// School's own pages and EL Education's), rendered as a collapsed disclosure by the HOWL Tracker
// (Home, Library) and Crew Protocols (About); every pack's glossary defines Crew and HOWL and its
// FAQ opens with "What is Crew, anyway?" and "What is a HOWL?". docs/EL_CREW_PRIMER.md is the long form.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
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
  window.callGemini = null;
  if (typeof window.matchMedia !== 'function') window.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
  sg('Audio', function () { return { play: () => Promise.resolve() }; });
  sg('IS_REACT_ACT_ENVIRONMENT', true);
  const req = createRequire(import.meta.url);
  const load = (f) => new Function('require', readFileSync(f, 'utf8'))(req);
  load(resolve(SEL, 'sel_hub_module.js'));
  ['sel_tool_howl.js', 'sel_tool_crewprotocols.js'].forEach((f) => load(join(SEL, f)));
}

let store = {};
function mount(toolId, toolData) {
  const noop = () => {};
  store = { [toolId]: Object.assign({}, toolData) };
  const pal = { bg: '#fff', bgCard: '#f8fafc', text: '#0f172a', textMuted: '#475569', border: '#cbd5e1', accent: '#4f46e5', accentText: '#fff' };
  const theme = new Proxy({ isDark: false, isContrast: false, reduceMotion: true, palette: pal, ...pal }, { get: (o, k) => (k in o ? o[k] : '#475569') });
  let root, container;
  const render = () => { act(() => { root.render(React.createElement(() => window.SelHub.renderTool(toolId, ctx()))); }); };
  const setToolData = (fn) => { store = typeof fn === 'function' ? fn(store) : Object.assign({}, store, fn); render(); };
  const ctx = () => new Proxy({
    React, toolData: store, setToolData,
    update: (id, key, val) => setToolData((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id], { [key]: val }); return n; }),
    updateMulti: (id, patch) => setToolData((p) => { const n = Object.assign({}, p); n[id] = Object.assign({}, p[id], patch); return n; }),
    setSelHubTool: noop, setSelHubTab: noop, selHubTab: 'explore', selHubTool: toolId, addToast: noop, awardXP: noop, getXP: () => 0,
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

function primerChecks(el, label) {
  expect(el, label + ': primer rendered').toBeTruthy();
  expect(el.querySelector('summary').textContent).toContain('New to Crew or HOWLs?');
  const terms = Array.from(el.querySelectorAll('dt')).map((d) => d.textContent);
  expect(terms).toEqual(['EL Education', 'Crew', 'HOWLs', 'Protocols and learning targets']);
  const links = Array.from(el.querySelectorAll('a[href]'));
  expect(links.length).toBe(6);
  for (const a of links) {
    expect(a.getAttribute('href')).toMatch(/^https:\/\/(king\.portlandschools\.org|www\.eleducation\.org|hechingerreport\.org)\//);
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(a.textContent).toContain('opens in a new tab');
  }
  expect(el.textContent).toContain('I persevere to produce high quality work');
}

describe('EL primer · the long form exists and carries the same sources', () => {
  it('docs/EL_CREW_PRIMER.md names the three HOWL statements and links King and EL Education', () => {
    const p = resolve(ROOT, 'docs', 'EL_CREW_PRIMER.md');
    expect(existsSync(p)).toBe(true);
    const md = readFileSync(p, 'utf8');
    for (const s of ['I am a respectful member of the King community.', 'I take responsibility for my success as a learner.', 'I persevere to produce high quality work.']) expect(md).toContain(s);
    expect(md).toContain('https://king.portlandschools.org/about/learning-models');
    expect(md).toContain('https://www.eleducation.org/crew');
  });
});

describe('EL primer · every Crew Launch pack defines the words and opens its FAQ with them', () => {
  const packs = readdirSync(resolve(ROOT, 'allopacks')).filter((f) => f.startsWith('crew_') && f.endsWith('.allopack.json'));
  it('twelve packs', () => { expect(packs.length).toBe(12); });
  it.each(packs)('%s', (f) => {
    const pack = JSON.parse(readFileSync(resolve(ROOT, 'allopacks', f), 'utf8'));
    const glossary = pack.history.find((r) => r.type === 'glossary').data;
    const terms = glossary.map((g) => g.term);
    expect(terms).toContain('Crew');
    expect(terms).toContain('HOWL');
    const faq = pack.history.find((r) => r.type === 'faq').data;
    expect(faq[0].question).toBe('What is Crew, anyway?');
    expect(faq[1].question).toBe('What is a HOWL?');
    expect(faq[0].answer).toMatch(/\[King.s EL page\]\(https:\/\/king\.portlandschools\.org\/about\/learning-models\)/);
    expect(faq[0].answer).toMatch(/\(https:\/\/www\.eleducation\.org\/crew\)/);
    expect(faq[1].answer).toContain('I persevere to produce high quality work');
    expect(faq[1].answer).toMatch(/grading-guide\)/);
    // When the reading uses the word, it is bolded like any other glossary word.
    const reading = pack.history.find((r) => r.type === 'simplified').data;
    if (/\bcrew/i.test(reading)) expect(reading).toMatch(/\*\*[Cc]rew\w*\*\*/);
  });
});

describe.skipIf(!R)('EL primer · on screen', () => {
  beforeAll(setup);

  it('the hub exposes one primer with four terms and six https sources', () => {
    const p = window.SelHub.elPrimer;
    expect(p.terms.map((t) => t.term)).toEqual(['EL Education', 'Crew', 'HOWLs', 'Protocols and learning targets']);
    expect(p.links.length).toBe(6);
    for (const l of p.links) expect(l.url).toMatch(/^https:\/\//);
    expect(typeof window.SelHub.renderElPrimer).toBe('function');
  });

  it('HOWL Tracker Home shows it collapsed at the top; Library shows it open', () => {
    const h = mount('howlTracker', {});
    const el = h.container.querySelector('[data-el-primer]');
    primerChecks(el, 'home');
    expect(el.open).toBe(false);
    h.unmount();
    const l = mount('howlTracker', { view: 'library' });
    const el2 = l.container.querySelector('[data-el-primer]');
    primerChecks(el2, 'library');
    expect(el2.open).toBe(true);
    l.unmount();
  });

  it('Crew Protocols About shows it with the King source card', () => {
    const h = mount('crewProtocols', { view: 'about' });
    primerChecks(h.container.querySelector('[data-el-primer]'), 'about');
    expect(h.container.textContent).toContain('King Middle School, Portland, Maine');
    h.unmount();
  });
});
