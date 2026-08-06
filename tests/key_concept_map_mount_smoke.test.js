// Key Concept Map — REAL-REACT mount smoke.
//
// The spine tests assert on source text, which cannot catch a hook-order bug, a crash
// in the layout effect, or a spine that renders empty. This mounts the built module with
// the real React 18 from desktop/web-app/node_modules and asserts the rendered output.
//
// Mounted TWICE on purpose: once with ConceptGraphEngine present (the engine spine path)
// and once with it deleted (the document-order fallback). This module is lazily loaded and
// must not require the engine, so the fallback is a real shipping configuration.

import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(MODULES_DIR, 'react'));
const ReactDOMClient = require2(resolve(MODULES_DIR, 'react-dom/client'));
const { act } = require2(resolve(MODULES_DIR, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const roots = [];
const loadModule = (file) => {
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
};

// jsdom ships no ResizeObserver; the view observes its container on mount.
class RO { observe() {} unobserve() {} disconnect() {} }

const BranchItem = ({ branch }) => React.createElement('p', null, branch.title || '');

const DATA = {
  main: 'The Water Cycle',
  branches: [
    { title: 'Evaporation', items: ['sun heats water', 'vapor rises'] },
    { title: 'Condensation', items: ['vapor cools'] },
    { title: 'Precipitation', items: [] },
  ],
};

function mount(props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  roots.push({ root, host });
  act(() => {
    root.render(React.createElement(window.AlloModules.KeyConceptMapView, props));
  });
  return host;
}

beforeAll(() => {
  globalThis.ResizeObserver = RO;
  window.ResizeObserver = RO;
  window.React = React;
  globalThis.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.ConceptGraphEngine;
  delete window.AlloModules.KeyConceptMapModule;
  delete window.AlloModules.KeyConceptMapView;
  loadModule('concept_graph_engine_module.js');
  loadModule('key_concept_map_module.js');
  if (!window.AlloModules.KeyConceptMapView) throw new Error('KeyConceptMapView did not register');
  if (!window.AlloModules.ConceptGraphEngine) throw new Error('ConceptGraphEngine did not register');
});

afterEach(() => {
  while (roots.length) {
    const { root, host } = roots.pop();
    act(() => root.unmount());
    host.remove();
  }
});

describe('Key Concept Map mount smoke', () => {
  it('renders without crashing and emits a spine', () => {
    const host = mount({ ...DATA, BranchItem });
    const spine = host.querySelector('.sr-only');
    expect(spine).toBeTruthy();
    expect(spine.textContent).toContain('The Water Cycle');
    expect(spine.querySelectorAll('li')).toHaveLength(3);
  });

  it('states the main concept before any branch in the reading order', () => {
    const host = mount({ ...DATA, BranchItem });
    const text = host.textContent;
    expect(text.indexOf('The Water Cycle')).toBeLessThan(text.indexOf('Evaporation'));
  });

  it('reports each branch detail count', () => {
    const host = mount({ ...DATA, BranchItem });
    const items = [...host.querySelectorAll('.sr-only li')].map((li) => li.textContent);
    expect(items[0]).toContain('Branch 1: Evaporation');
    expect(items[0]).toContain('2 details');
    // A branch with no items must not claim "0 details".
    expect(items[2]).toContain('Branch 3: Precipitation');
    expect(items[2]).not.toContain('details');
  });

  it('hides the hub bubble from assistive tech', () => {
    const host = mount({ ...DATA, BranchItem });
    const bubble = host.querySelector('.alloflow-concept-bubble');
    expect(bubble).toBeTruthy();
    expect(bubble.getAttribute('aria-hidden')).toBe('true');
  });

  it('translates the branch label through t and never emits "undefined"', () => {
    const t = (k) => (k === 'a11y.branch' ? 'Rama' : k);
    const host = mount({ ...DATA, BranchItem, t });
    const spine = host.querySelector('.sr-only');
    expect(spine.textContent).toContain('Rama 1: Evaporation');
    // t returns the key for every other lookup, so the fallbacks must win.
    expect(host.textContent).not.toContain('undefined');
    expect(host.textContent).not.toContain('a11y.');
  });

  it('renders the fallback spine when the engine is absent', () => {
    const saved = window.AlloModules.ConceptGraphEngine;
    delete window.AlloModules.ConceptGraphEngine;
    try {
      const host = mount({ ...DATA, BranchItem });
      const items = [...host.querySelectorAll('.sr-only li')].map((li) => li.textContent);
      expect(items).toHaveLength(3);
      expect(items[0]).toContain('Evaporation');
      expect(items[2]).toContain('Precipitation');
    } finally {
      window.AlloModules.ConceptGraphEngine = saved;
    }
  });

  it('survives an empty branch list', () => {
    const host = mount({ main: 'Solo', branches: [], BranchItem });
    expect(host.querySelector('.sr-only').textContent).toContain('Solo');
    expect(host.querySelectorAll('.sr-only li')).toHaveLength(0);
  });
});
