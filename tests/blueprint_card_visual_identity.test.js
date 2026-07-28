// Blueprint plan rows carry per-resource visual identity — a real mount.
//
// Aaron's report: "blueprint mode is missing visual elements that can make the
// resources more distinctive". Every plan row rendered an identical grey
// numbered circle plus an identical indigo pill, so a twelve-step plan read as
// twelve copies of the same thing.
//
// The fix reuses the ONE registry that already exists (_ALLO_STATION_STYLES in
// the host, 23 entries, mirrored to window) rather than inventing a sixth
// colour table — plus the five TOOL_CATALOG ids that had no entry and were
// silently falling through to the grey fallback glyph.
//
// The fallback case is load-bearing: persona_ui is a CDN module, so a BARE
// reference to _alloStationStyle would be a ReferenceError inside the module
// IIFE (the free-variable crash class), and the host mirror may not have run
// when the card first paints.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let Card;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // The module reads window.AlloLanguageContext at load time.
  window.AlloLanguageContext = React.createContext({ t: (k) => k });
  loadAlloModule('persona_ui_module.js');
  Card = window.AlloModules.InteractiveBlueprintCard;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  delete window._alloStationStyle;
});

// Mirrors the real host registry closely enough to exercise the seam.
const STYLES = {
  glossary: { icon: '\u{1F4D6}', shape: 'circle', fill: '#f5f3ff', stroke: '#8b5cf6', label: 'Word bank' },
  quiz: { icon: '\u{1F4DD}', shape: 'diamond', fill: '#fef2f2', stroke: '#ef4444', label: 'Quiz' },
  analysis: { icon: '\u{1F50D}', shape: 'circle', fill: '#eef2ff', stroke: '#6366f1', label: 'Analysis' },
};
const FALLBACK = { icon: '\u{1F4C4}', shape: 'circle', fill: '#f8fafc', stroke: '#64748b', label: 'Resource' };
const installRegistry = () => { window._alloStationStyle = (type) => STYLES[type] || FALLBACK; };

const CONFIG = {
  resourcePlan: [
    { tool: 'analysis', directive: 'Find the key ideas' },
    { tool: 'glossary', directive: 'Tier 2 vocabulary' },
    { tool: 'quiz', directive: '' },
  ],
};

const mount = (config = CONFIG) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(Card, {
    config, onUpdate: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn(),
  })));
  return host;
};

const rows = (el) => Array.from(el.querySelectorAll('[data-help-key="blueprint_resource_list_review"] > div'));

describe('blueprint plan rows: visual identity', () => {
  it('gives each row its own glyph and accent colour', () => {
    installRegistry();
    const el = mount();
    const r = rows(el);
    expect(r).toHaveLength(3);
    // Distinct glyphs, not three identical circles.
    const glyphs = r.map(row => row.textContent).map(txt => [...STYLES.analysis.icon + STYLES.glossary.icon + STYLES.quiz.icon].find(g => txt.includes(g)));
    expect(r[0].textContent).toContain(STYLES.analysis.icon);
    expect(r[1].textContent).toContain(STYLES.glossary.icon);
    expect(r[2].textContent).toContain(STYLES.quiz.icon);
    expect(new Set(glyphs).size).toBe(3);
    // Distinct accent stripes.
    const stripes = r.map(row => row.style.borderLeftColor);
    expect(new Set(stripes).size).toBe(3);
    expect(stripes.every(Boolean)).toBe(true);
  });

  it('keeps the step number visible so the sequence is still readable', () => {
    installRegistry();
    const el = mount();
    const r = rows(el);
    expect(r[0].textContent).toContain('1');
    expect(r[1].textContent).toContain('2');
    expect(r[2].textContent).toContain('3');
  });

  it('still shows each row directive', () => {
    installRegistry();
    const el = mount();
    expect(rows(el)[0].textContent).toContain('Find the key ideas');
    expect(rows(el)[1].textContent).toContain('Tier 2 vocabulary');
  });

  // The safety case. A bare _alloStationStyle reference would throw here.
  it('renders numbered rows when the host registry is absent, and does not throw', () => {
    expect(window._alloStationStyle).toBeUndefined();
    let el;
    expect(() => { el = mount(); }).not.toThrow();
    const r = rows(el);
    expect(r).toHaveLength(3);
    expect(r[0].textContent).toContain('1');
    expect(r[0].textContent).toContain('Find the key ideas');
  });

  it('falls back to the neutral glyph for a type with no registry entry', () => {
    installRegistry();
    const el = mount({ resourcePlan: [{ tool: 'timeline', directive: 'Sequence it' }] });
    expect(rows(el)[0].textContent).toContain(FALLBACK.icon);
  });
});

// ── Copy-sync + registry-coverage guardrails ──
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');
const HOSTS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

describe('station-style registry guardrails', () => {
  it.each(HOSTS)('%s exposes the registry to CDN modules', (file) => {
    const src = read(file);
    expect(src).toContain('window._alloStationStyle = _alloStationStyle');
  });

  // A catalog id with no style is a silent grey square everywhere the registry
  // renders. This is the drift guard the registry never had.
  it.each(HOSTS)('%s styles every TOOL_CATALOG id', (file) => {
    const src = read(file);
    const block = src.slice(src.indexOf('const _ALLO_STATION_STYLES'), src.indexOf('const _ALLO_STATION_FALLBACK'));
    expect(block.length).toBeGreaterThan(0);
    const catalog = read('tool_catalog_source.jsx');
    const ids = [...catalog.matchAll(/^\s*id: '([^']+)'/gm)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(15);
    const missing = ids.filter((id) => !block.includes(`'${id}':`));
    expect(missing).toEqual([]);
  });

  it.each(HOSTS)('%s opens the chat panel from every lesson-flow front door', (file) => {
    const src = read(file);
    // handleAutoFillToggle seeds the flow but never opens the panel, and
    // showUDLGuide defaults false — both front doors must open it themselves.
    expect(src).toContain('const [showUDLGuide, setShowUDLGuide] = useState(false)');
    const doors = src.match(/handleAutoFillToggle\(\{ target: \{ checked: true \} \}\)/g) || [];
    expect(doors.length).toBeGreaterThanOrEqual(2);
    expect((src.match(/setShowUDLGuide\(true\)/g) || []).length).toBeGreaterThanOrEqual(2);
  });
});
