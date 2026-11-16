import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, resetStemLab, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

// Render-sanity sweep for Life Skills Lab.
//
// Why this exists: Wave 23 found `'Target role: ' + interviewRole` rendering
// "Target role: [object Object]" in the Interview Studio 3D bay banner, and Wave 24
// uncovered hung compound-interest loops, `Infinity / Infinity` NaNs, `[object Object]`
// toasts, and SVG/select corruption when persisted state contains wrong types or `[{}]`.
// This sweep mounts EVERY tab across default state, all 17 3D overlays + Fault Quiz,
// and 8 hostile persisted-state values across every `d.<key>` field, failing on any
// crash, leaked token, SVG geometry defect, or React `console.error` warning.

const LIFESKILLS_PATH = 'stem_lab/stem_tool_lifeskills.js';
const TAB_IDS = ['appointments', 'battle', 'bodycare', 'budget', 'carcare', 'challenge', 'communication', 'contract', 'cooking', 'credit', 'data', 'decision', 'dental', 'digitalsafety', 'foodconfidence', 'homerepair', 'homesafety', 'homesys', 'insurance', 'interviewstudio', 'laundry', 'learn', 'meds', 'overview', 'paycheck', 'prooflocker', 'records', 'resumebuilder', 'science', 'sleep', 'timemanagement', 'transport', 'workreadiness'];
const OVERLAY_KEYS = ['Explode', 'Xray', 'Focus', 'Hazard', 'Mitigate', 'Measure', 'Grid', 'Axes', 'Links', 'Bounds', 'Sight', 'Zone', 'Load', 'Track', 'Stance', 'Cutaway', 'Pulse'];
const BAD_TOKENS = [
  { name: '[object Object]', re: /\[object Object\]/ },
  { name: 'NaN', re: /\bNaN\b/ },
  { name: 'undefined', re: /\bundefined\b/ },
  { name: 'Infinity', re: /\bInfinity\b/ },
];
const A11Y_ATTRS = ['aria-label', 'aria-valuetext', 'title', 'placeholder'];
const SVG_ATTRS = ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2', 'points', 'd'];
const NON_NEG_SVG_ATTRS = new Set(['width', 'height', 'r']);

let active = null;

function mount(cfg, state) {
  function Harness() {
    const [toolData, setToolData] = React.useState({ lifeSkills: Object.assign({}, state) });
    return cfg.render(makeCtx({ toolData, setToolData, callTTS: undefined }));
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const errors = [];
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
    errors.push(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
  });
  try {
    React.act(() => { root.render(React.createElement(Harness)); });
  } finally {
    errSpy.mockRestore();
  }
  active = {
    host,
    errors,
    unmount() {
      React.act(() => { root.unmount(); });
      host.remove();
    },
  };
  return active;
}

function findGarbage(host, errors) {
  const hits = [];
  if (errors && errors.length) {
    for (const msg of errors) {
      hits.push('console.error: ' + msg.replace(/\s+/g, ' ').slice(0, 140));
    }
  }
  const text = host.textContent || '';
  for (const tok of BAD_TOKENS) {
    const matches = text.matchAll(new RegExp(tok.re.source, 'g'));
    for (const m of matches) {
      const i = m.index;
      hits.push('text ' + tok.name + ': "...' + text.slice(Math.max(0, i - 70), i + 40).replace(/\s+/g, ' ') + '..."');
    }
  }
  for (const el of host.querySelectorAll('*')) {
    for (const attr of A11Y_ATTRS) {
      const v = el.getAttribute(attr);
      if (!v) continue;
      for (const tok of BAD_TOKENS) {
        if (tok.re.test(v)) hits.push(attr + ' ' + tok.name + ' on <' + el.tagName.toLowerCase() + '>: "' + v.slice(0, 110) + '"');
      }
    }
  }
  for (const el of host.querySelectorAll('svg *')) {
    for (const attr of SVG_ATTRS) {
      const v = el.getAttribute(attr);
      if (v == null || v === '') continue;
      if (/\b(NaN|undefined|Infinity)\b/.test(v)) {
        hits.push('svg attr ' + attr + ' invalid on <' + el.tagName.toLowerCase() + '>: "' + v.slice(0, 80) + '"');
      } else if (NON_NEG_SVG_ATTRS.has(attr) && /^-?\d+(\.\d+)?$/.test(v.trim()) && Number(v) < 0) {
        hits.push('svg attr ' + attr + ' negative on <' + el.tagName.toLowerCase() + '>: "' + v + '"');
      }
    }
  }
  return hits;
}

afterEach(() => {
  if (active) { active.unmount(); active = null; }
});

describe('Life Skills Lab render-sanity sweep (all 33 tabs)', () => {
  it('renders every tab in its default state without [object Object], NaN, undefined, Infinity, or React warnings', () => {
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATH, 'lifeSkills');
    const failures = [];
    for (const tab of TAB_IDS) {
      const m = mount(cfg, { tab });
      const hits = findGarbage(m.host, m.errors);
      if (hits.length) failures.push(tab + ' -> ' + hits.join(' | '));
      m.unmount();
      active = null;
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('renders every tab with all 17 3D inspection overlays and the Fault Quiz enabled without leaking garbage tokens', () => {
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATH, 'lifeSkills');
    const failures = [];
    for (const tab of TAB_IDS) {
      const state = { tab };
      for (const k of OVERLAY_KEYS) state['ls3d' + k + '_' + tab] = true;
      state['ls3dQuizOn_' + tab] = true;
      const m = mount(cfg, state);
      const hits = findGarbage(m.host, m.errors);
      if (hits.length) failures.push(tab + ' -> ' + hits.join(' | '));
      m.unmount();
      active = null;
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('survives hostile persisted state across all 33 tabs and all persisted state keys without hangs, crashes, React warnings, or garbage tokens', () => {
    resetStemLab();
    const cfg = loadTool(LIFESKILLS_PATH, 'lifeSkills');
    const src = readFileSync(LIFESKILLS_PATH, 'utf8');
    const renderStart = src.indexOf("window.StemLab.registerTool('lifeSkills'");
    const keys = [...new Set([...src.slice(renderStart).matchAll(/\bd\.([a-zA-Z_][a-zA-Z0-9_]*)/g)].map((m) => m[1]))].filter((k) => k !== 'tab');
    const HOSTILE = [
      { label: '{}', v: () => ({}) },
      { label: '[]', v: () => [] },
      { label: '[{}]', v: () => [{}] },
      { label: "'abc'", v: () => 'abc' },
      { label: 'NaN', v: () => NaN },
      { label: '1e9', v: () => 1e9 },
      { label: '-1e6', v: () => -1e6 },
      { label: 'true', v: () => true },
    ];
    const failures = [];
    for (const tab of TAB_IDS) {
      for (const hv of HOSTILE) {
        const state = { tab };
        for (const k of keys) state[k] = hv.v();
        let m = null;
        try {
          m = mount(cfg, state);
          const hits = findGarbage(m.host, m.errors);
          if (hits.length) failures.push(tab + ' @' + hv.label + ' -> ' + hits.slice(0, 3).join(' | '));
        } catch (err) {
          failures.push(tab + ' @' + hv.label + ' -> CRASH ' + String((err && err.message) || err).slice(0, 160));
        } finally {
          if (m) m.unmount();
          active = null;
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
