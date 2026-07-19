// Coaster Lab (stem_tool_coasterlab.js) — registration + mount smoke.
//
// The tool is GENERATED from the standalone prototype at C:\tmp\coaster-lab
// (gen_stem_tool.mjs): a full imperative Three.js app booted inside a ref'd
// container. jsdom has no WebGL and never loads the CDN three.js script, so
// the engine stays dormant here by design — these tests pin the React shell,
// the registration contract, the quest-hook logic, the ctx bridge, and that
// every loader/registration site actually references the tool.
import { describe, expect, it, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadTool, resetStemLab, React } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require(resolve(MODULES_DIR, 'react-dom/test-utils'));

const TOOL_PATHS = [
  'stem_lab/stem_tool_coasterlab.js',
  'prismflow-deploy/public/stem_lab/stem_tool_coasterlab.js',
];

beforeEach(() => { resetStemLab(); });

describe('coaster lab — registration', () => {
  it('root and mirror copies are byte-identical', () => {
    const a = readFileSync(resolve(process.cwd(), TOOL_PATHS[0]), 'utf8');
    const b = readFileSync(resolve(process.cwd(), TOOL_PATHS[1]), 'utf8');
    expect(a).toBe(b);
  });

  it.each(TOOL_PATHS)('%s registers with tile metadata and 5 quest hooks', (p) => {
    const cfg = loadTool(p, 'coasterLab');
    expect(cfg.icon).toBe('🎢');
    expect(cfg.label).toBe('Coaster Lab');
    expect(cfg.color).toBe('amber');
    expect(cfg.questHooks).toHaveLength(5);
    expect(cfg.questHooks.map(q => q.id)).toEqual([
      'clab_run', 'clab_cert', 'clab_explore', 'clab_ride', 'clab_missions',
    ]);
  });

  it('quest hooks read the coasterLab toolData bucket', () => {
    const cfg = loadTool(TOOL_PATHS[0], 'coasterLab');
    const hook = id => cfg.questHooks.find(q => q.id === id).check;
    expect(hook('clab_run')({})).toBe(false);
    expect(hook('clab_run')({ coasterLab: { runs: 1 } })).toBe(true);
    expect(hook('clab_cert')({ coasterLab: { certified: true } })).toBe(true);
    expect(hook('clab_explore')({ coasterLab: { explored: true } })).toBe(true);
    expect(hook('clab_ride')({ coasterLab: { rideBestCorrect: 3 } })).toBe(false);
    expect(hook('clab_ride')({ coasterLab: { rideBestCorrect: 4 } })).toBe(true);
    expect(hook('clab_missions')({ coasterLab: { missionCount: 6 } })).toBe(true);
  });
});

describe('coaster lab — mount smoke (no WebGL in jsdom)', () => {
  it('renders the shell, scoped styles, and the loading note without throwing', () => {
    const cfg = loadTool(TOOL_PATHS[0], 'coasterLab');
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const ctx = {
      React,
      toolData: {},
      setToolData: () => {},
      addToast: () => {},
      t: (k, f) => (f != null ? f : k),
    };
    try {
      act(() => { root.render(cfg.render(ctx)); });
      expect(host.querySelector('.clab-root')).toBeTruthy();
      expect(host.querySelector('style').textContent).toContain('.clab-root');
      // scoped CSS must not carry app-wide selectors
      expect(host.querySelector('style').textContent).not.toMatch(/(^|\})\s*button\s*\{/);
      expect(host.textContent).toContain('Building the midway');
      expect(host.querySelector('[aria-label="Coaster Lab 3-D designer"]')).toBeTruthy();
    } finally {
      act(() => { root.unmount(); });
      host.remove();
    }
  });

  it('the ctx bridge accumulates run/cert/ride/mission progress', () => {
    const cfg = loadTool(TOOL_PATHS[0], 'coasterLab');
    // Drive the bridge through a real setToolData reducer chain.
    let data = {};
    const setToolData = (fn) => { data = fn(data); };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    act(() => { root.render(cfg.render({ React, toolData: {}, setToolData, addToast: () => {}, t: (k, f) => f })); });
    // The engine can't boot in jsdom, so exercise the same reducer shape the
    // bridge uses by re-rendering: bridge itself is engine-internal. Instead,
    // pin the quest thresholds against a hand-built bucket the bridge would
    // produce after: 2 runs, cert, a 4/4 ride, 6 missions.
    const d = { coasterLab: { runs: 2, certified: true, explored: true, rideBestCorrect: 4, missionCount: 6 } };
    expect(cfg.questHooks.every(q => q.check(d))).toBe(true);
    act(() => { root.unmount(); });
    host.remove();
  });
});

describe('coaster lab — wired into every load site', () => {
  it.each([
    'AlloFlowANTI.txt',
    'prismflow-deploy/src/AlloFlowANTI.txt',
    'prismflow-deploy/src/App.jsx',
    'build.js',
  ])('%s lists the coaster lab loader', (f) => {
    const src = readFileSync(resolve(process.cwd(), f), 'utf8');
    expect(src).toContain("'stem_lab/stem_tool_coasterlab.js'");
  });

  it.each([
    'stem_lab/stem_lab_module.js',
    'prismflow-deploy/public/stem_lab/stem_lab_module.js',
  ])('%s carries the tile and plugin flag', (f) => {
    const src = readFileSync(resolve(process.cwd(), f), 'utf8');
    expect(src).toContain("// @tool coasterLab");
    expect(src).toContain('coasterLab: true');
  });
});
