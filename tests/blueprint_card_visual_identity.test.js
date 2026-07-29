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
  // The module reads window.AlloLanguageContext at load time. `t` returns
  // undefined for a miss, exactly like the real one (ui_strings lookup failure
  // → undefined → the caller's `|| 'English'` fallback). Returning the KEY
  // instead would mask every fallback and let un-rendered labels pass.
  window.AlloLanguageContext = React.createContext({ t: () => undefined });
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

// ── Stage 3: per-row execution status on the card ──
describe('blueprint plan rows: run status', () => {
  const RUN = {
    rows: {
      'analysis-0': { uiId: 'analysis-0', tool: 'analysis', status: 'landed' },
      'glossary-1': { uiId: 'glossary-1', tool: 'glossary', status: 'running' },
      'quiz-2': { uiId: 'quiz-2', tool: 'quiz', status: 'failed' },
    },
  };
  const CFG = {
    resourcePlan: [
      { tool: 'analysis', directive: 'a', uiId: 'analysis-0' },
      { tool: 'glossary', directive: 'g', uiId: 'glossary-1' },
      { tool: 'quiz', directive: 'q', uiId: 'quiz-2' },
    ],
  };
  const mountRun = (props) => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    act(() => root.render(React.createElement(Card, Object.assign({
      config: CFG, onUpdate: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn(),
    }, props))));
    return host;
  };

  it('labels each row with its own status', () => {
    installRegistry();
    const el = mountRun({ run: RUN });
    const r = rows(el);
    expect(r[0].textContent).toContain('Done');
    expect(r[1].textContent).toContain('Building');
    expect(r[2].textContent).toContain('Failed');
  });

  // Scoped to the ROWS: the card also has a standing role="status" live region
  // for drag-reorder announcements ("Moved plan step to position N").
  const rowStatuses = (el, sel) => rows(el).flatMap((r) => Array.from(r.querySelectorAll(sel)));

  it('marks only the in-flight row as a live region', () => {
    installRegistry();
    const el = mountRun({ run: RUN });
    const live = rowStatuses(el, '[role="status"][aria-live="polite"]');
    expect(live).toHaveLength(1);
    expect(live[0].textContent).toContain('Building');
  });

  it('shows no status at all before a run starts', () => {
    installRegistry();
    const el = mountRun({ run: null });
    expect(rowStatuses(el, '[role="status"]')).toHaveLength(0);
    expect(rows(el)[0].textContent).not.toContain('Done');
  });

  // The reason the join key exists: status must follow the ROW, not the slot.
  it('follows the row when the plan is reordered', () => {
    installRegistry();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const reordered = {
      resourcePlan: [
        { tool: 'quiz', directive: 'q', uiId: 'quiz-2' },
        { tool: 'analysis', directive: 'a', uiId: 'analysis-0' },
        { tool: 'glossary', directive: 'g', uiId: 'glossary-1' },
      ],
    };
    act(() => root.render(React.createElement(Card, {
      config: reordered, run: RUN, onUpdate: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn(),
    })));
    const r = rows(host);
    // quiz moved to slot 0 and must still read Failed, not analysis's Done.
    expect(r[0].textContent).toContain('Failed');
    expect(r[1].textContent).toContain('Done');
    expect(r[2].textContent).toContain('Building');
  });
});

// ── Audit coverage per row ──
// Coverage is by resourceId, so a row regenerated after the audit drops out of
// the audited set on its own — that IS the staleness signal.
describe('blueprint plan rows: audit coverage', () => {
  const CFG = {
    resourcePlan: [
      { tool: 'analysis', directive: 'a', uiId: 'r-a' },
      { tool: 'glossary', directive: 'g', uiId: 'r-g' },
      { tool: 'alignment-report', directive: '', uiId: 'r-audit' },
    ],
  };
  const mk = (run) => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    act(() => root.render(React.createElement(Card, {
      config: CFG, run, onUpdate: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn(),
    })));
    return host;
  };
  const badges = (el) => rows(el).map((r) => {
    const b = r.querySelector('[data-testid="bp-audit-badge"]');
    return b ? b.textContent.trim() : null;
  });

  const RUN_AUDITED = {
    rows: {
      'r-a': { uiId: 'r-a', status: 'landed', resourceId: 'res-a' },
      'r-g': { uiId: 'r-g', status: 'landed', resourceId: 'res-g' },
      'r-audit': { uiId: 'r-audit', status: 'landed', resourceId: 'res-report' },
    },
    audit: { resourceIds: ['res-a', 'res-g'], reportId: 'res-report', rowUiId: 'r-audit' },
  };

  it('marks the rows the audit actually covered', () => {
    installRegistry();
    expect(badges(mk(RUN_AUDITED))).toEqual(['Audited', 'Audited', null]);
  });

  it('shows nothing before any audit has run', () => {
    installRegistry();
    const run = { rows: RUN_AUDITED.rows }; // no .audit
    expect(badges(mk(run))).toEqual([null, null, null]);
  });

  it('flags a row regenerated after the audit as out of scope', () => {
    installRegistry();
    // The glossary was rebuilt: new resourceId, not in the recorded scope.
    const run = JSON.parse(JSON.stringify(RUN_AUDITED));
    run.rows['r-g'].resourceId = 'res-g-REGENERATED';
    expect(badges(mk(run))).toEqual(['Audited', 'Not in audit', null]);
  });

  it('never badges the audit row itself', () => {
    installRegistry();
    const el = mk(RUN_AUDITED);
    expect(rows(el)[2].querySelector('[data-testid="bp-audit-badge"]')).toBeNull();
  });
});

// ── WCAG 1.4.3 contrast ──
// The station registry's `stroke` is a GRAPHICAL colour, designed for SVG
// station glyphs where 3:1 suffices (1.4.11). Stage 1 applied it as the row
// label's TEXT colour, which needs 4.5:1 — and 27 of 29 tool families failed,
// brainstorm at 2.07:1. Colour identity now lives in the fill/border/stripe;
// the text is a dark neutral. This guards the regression.
describe('blueprint row colours meet WCAG AA', () => {
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (h) => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); const hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); };

  // Every fill in the host registry, harvested from the canonical source.
  const fills = (() => {
    const src = read('AlloFlowANTI.txt');
    const block = src.slice(src.indexOf('const _ALLO_STATION_STYLES'), src.indexOf('const _ALLO_STATION_FALLBACK'));
    return [...block.matchAll(/fill: '(#[0-9a-fA-F]{6})'/g)].map((m) => m[1]);
  })();

  it('harvested a realistic set of station fills', () => {
    expect(fills.length).toBeGreaterThan(20);
  });

  it('the row label text clears 4.5:1 on EVERY station fill', () => {
    const LABEL_TEXT = '#334155';
    for (const f of fills) {
      expect(ratio(f, LABEL_TEXT), `label text on ${f}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('does not use the graphical stroke as label text', () => {
    const src = read('persona_ui_source.jsx');
    // The label pill takes the dark neutral…
    expect(src).toContain("color: '#334155'");
    // …and `color: _st.stroke` survives in exactly ONE place: the icon circle,
    // whose only content is an aria-hidden emoji (decorative, so 1.4.3 does
    // not apply). A second occurrence means real text got the graphical colour.
    expect((src.match(/color: _st\.stroke/g) || []).length).toBe(1);
    expect(src).toContain('<span aria-hidden="true">{_st.icon}</span>');
  });

  it('every status and audit badge clears 4.5:1', () => {
    const BADGES = [
      ['#f1f5f9', '#475569'], ['#eef2ff', '#4338ca'], ['#ecfdf5', '#047857'],
      ['#fef2f2', '#b91c1c'], ['#fffbeb', '#92400e'], ['#f0fdfa', '#0f766e'],
    ];
    for (const [bg, fg] of BADGES) {
      expect(ratio(bg, fg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Status is never colour-only: each badge carries a text label (1.4.1).
  it('conveys status by text, not colour alone', () => {
    const src = read('persona_ui_source.jsx');
    for (const k of ['status_planned', 'status_running', 'status_landed', 'status_failed', 'status_interrupted']) {
      expect(src).toContain(k);
    }
    expect(src).toContain('audit_covered');
    expect(src).toContain('audit_stale');
  });
});

// ── Save-as-template + the directive review ──
describe('blueprint card: save as template', () => {
  const CFG = {
    resourcePlan: [
      { tool: 'analysis', directive: 'Find the key ideas', uiId: 'a-0' },
      { tool: 'glossary', directive: 'Define photosynthesis, chloroplast', uiId: 'g-1' },
      { tool: 'quiz', directive: '', uiId: 'q-2' },
    ],
  };
  const mk = (props) => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    act(() => root.render(React.createElement(Card, Object.assign({
      config: CFG, onUpdate: vi.fn(), onConfirm: vi.fn(), onCancel: vi.fn(),
    }, props))));
    return host;
  };
  const q = (el, id) => el.querySelector(`[data-testid="${id}"]`);
  const all = (el, id) => Array.from(el.querySelectorAll(`[data-testid="${id}"]`));

  it('offers saving only when a handler is wired', () => {
    installRegistry();
    expect(q(mk({}), 'bp-template-save-open')).toBeNull();
    if (root) { act(() => root.unmount()); root = null; } host.remove();
    expect(q(mk({ onSaveTemplate: vi.fn() }), 'bp-template-save-open')).toBeTruthy();
  });

  it('reviews only rows that HAVE a directive', () => {
    installRegistry();
    const el = mk({ onSaveTemplate: vi.fn() });
    act(() => { q(el, 'bp-template-save-open').click(); });
    // The quiz row has an empty directive — nothing to decide about.
    expect(all(el, 'bp-template-directive')).toHaveLength(2);
  });

  it('requires a name before saving', () => {
    installRegistry();
    const el = mk({ onSaveTemplate: vi.fn() });
    act(() => { q(el, 'bp-template-save-open').click(); });
    expect(q(el, 'bp-template-save-confirm').disabled).toBe(true);
  });

  it('carries every directive forward by default', () => {
    installRegistry();
    const onSaveTemplate = vi.fn();
    const el = mk({ onSaveTemplate });
    act(() => { q(el, 'bp-template-save-open').click(); });
    const input = q(el, 'bp-template-name');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'My pattern');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    act(() => { q(el, 'bp-template-save-confirm').click(); });
    expect(onSaveTemplate).toHaveBeenCalledTimes(1);
    const arg = onSaveTemplate.mock.calls[0][0];
    expect(arg.name).toBe('My pattern');
    expect(arg.directives).toEqual({}); // nothing blanked
  });

  // The point of the review: the teacher marks content-bound directives.
  it('records a blanked directive for the row the teacher unchecked', () => {
    installRegistry();
    const onSaveTemplate = vi.fn();
    const el = mk({ onSaveTemplate });
    act(() => { q(el, 'bp-template-save-open').click(); });
    // Uncheck the glossary row — "Define photosynthesis, chloroplast".
    const boxes = all(el, 'bp-template-directive');
    act(() => { boxes[1].click(); });
    const input = q(el, 'bp-template-name');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Pattern');
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    act(() => { q(el, 'bp-template-save-confirm').click(); });
    expect(onSaveTemplate.mock.calls[0][0].directives).toEqual({ 'g-1': 'blank' });
  });

  it('cancelling saves nothing', () => {
    installRegistry();
    const onSaveTemplate = vi.fn();
    const el = mk({ onSaveTemplate });
    act(() => { q(el, 'bp-template-save-open').click(); });
    act(() => { q(el, 'bp-template-save-cancel').click(); });
    expect(onSaveTemplate).not.toHaveBeenCalled();
    expect(q(el, 'bp-template-save-open')).toBeTruthy();
  });
});
