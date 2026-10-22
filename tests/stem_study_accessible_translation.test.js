import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { parse } = require('acorn');
const noop = () => {};
const localized = (key, fallback) => '[localized] ' + fallback;
const moduleObservers = new Set();

// Expose existing module-scope renderers inside their original IIFE, keeping
// their actual lexical dependencies. No replacement renderer or geometry runs.
function loadHelpers(file, names) {
  const source = readFileSync(file, 'utf8');
  const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script' });
  // Registration guards can surround the module IIFE, and independent style
  // IIFEs can precede it. Select the lexical owner of the requested helpers.
  const found = new Map();
  function walk(node, functions = []) {
    if (!node || typeof node !== 'object') return;
    const isFunction = ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type);
    if (node.type === 'FunctionDeclaration' && names.includes(node.id && node.id.name)) {
      if (found.has(node.id.name)) throw new Error('Ambiguous helper ' + node.id.name + ': ' + file);
      found.set(node.id.name, functions[functions.length - 1]);
    }
    const nested = isFunction ? functions.concat(node) : functions;
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => walk(child, nested));
      else if (value && typeof value === 'object') walk(value, nested);
    }
  }
  walk(ast);
  const owners = new Set(names.map(name => found.get(name)));
  const owner = owners.values().next().value;
  if (found.size !== names.length || owners.size !== 1 || !owner || owner.body.type !== 'BlockStatement') {
    throw new Error('Missing shared lexical scope for ' + names.join(', ') + ': ' + file);
  }
  const end = owner.body.end - 1;
  const exportHelpers = '\nwindow.__alloAccessibleTestHelpers = {' + names.map(name => name + ':' + name).join(',') + '};\n';
  new Function(source.slice(0, end) + exportHelpers + source.slice(end))();
  if (!window.__alloAccessibleTestHelpers) throw new Error('Module registration guard prevented helper export: ' + file);
  return window.__alloAccessibleTestHelpers;
}

function panel(element) {
  const root = document.createElement('div');
  root.innerHTML = ReactDOMServer.renderToStaticMarkup(element);
  return root;
}

function expectNamed(root, english, translate) {
  const expected = translate === localized ? '[localized] ' + english : english;
  expect([...root.querySelectorAll('[aria-label]')].map(node => node.getAttribute('aria-label'))).toContain(expected);
}

beforeEach(() => {
  resetStemLab();
  delete window.__alloAccessibleTestHelpers;
  const NativeMutationObserver = globalThis.MutationObserver;
  vi.stubGlobal('MutationObserver', class TrackedMutationObserver extends NativeMutationObserver {
    constructor(callback) {
      super(callback);
      moduleObservers.add(this);
    }
  });
});

afterEach(() => {
  // Full module evaluation installs genuine document observers for style and
  // station tagging. Preserve their behavior during the test, then release
  // them before jsdom tears down the window and removes its document nodes.
  for (const observer of moduleObservers) observer.disconnect();
  moduleObservers.clear();
  vi.unstubAllGlobals();
  delete window.__alloAccessibleTestHelpers;
});

describe.each([
  ['host translator', localized],
  ['standalone English fallback', undefined],
  ['nonfunction translator fallback', 'unavailable']
])('study accessible names: %s', (description, translate) => {
  it.each([
    ['BirdlabToeStudy', 'Foot arrangement examples'],
    ['BirdlabForagingStudy', 'Gain versus time. Fixed axes from minus 90 to 120 seconds and 0 to 120 arbitrary food units. Gold line spans travel plus feeding; pink tangent shows the marginal gain rate.'],
    ['BirdlabHeatExchangeStudy', 'Shared spatial position along hot flow']
  ])('renders %s with the actual accessible name', (name, label) => {
    const helpers = loadHelpers('stem_lab/stem_tool_birdlab.js', [name]);
    const root = panel(React.createElement(helpers[name], { React, translateStudy: translate }));
    expectNamed(root, label, translate);
    if (name !== 'BirdlabToeStudy') {
      // These actual diagrams contain local numeric t values (residence time
      // and temperatures). Translation must leave all plotted data untouched.
      const english = panel(React.createElement(helpers[name], { React }));
      const drawings = parent => [...parent.querySelectorAll('svg')].map(svg => {
        const copy = svg.cloneNode(true);
        [copy, ...copy.querySelectorAll('[aria-label]')].forEach(node => node.removeAttribute('aria-label'));
        return copy.outerHTML;
      });
      expect(drawings(root).length).toBeGreaterThan(0);
      expect(drawings(root)).toEqual(drawings(english));
    }
  });

  it('localizes the Raptor inventory study without altering its saved input', () => {
    const { RaptorSkeletalStudy } = loadHelpers('stem_lab/stem_tool_raptorhunt.js', ['RaptorSkeletalStudy']);
    const value = {};
    const before = JSON.stringify(value);
    const root = panel(React.createElement(RaptorSkeletalStudy, { React, value, onChange: noop, translateStudy: translate }));
    expectNamed(root, 'Skeletal inventory and minimum-individual evidence studio', translate);
    expect(JSON.stringify(value)).toBe(before);
  });

  it('threads the translator through the Cell knowledge dispatcher to its history helper', () => {
    const { renderCellKnowledge } = loadHelpers('stem_lab/stem_tool_cell.js', ['renderCellKnowledge']);
    const data = { _know: {} };
    const before = JSON.stringify(data);
    const root = panel(renderCellKnowledge(React.createElement, 'history', { history: [], biologists: [] }, data, {}, translate));
    expectNamed(root, 'Filter by era', translate);
    expect(JSON.stringify(data)).toBe(before);
  });

  it('forwards the translator with Ecosystem movement props into the mammal sequence', () => {
    const { EcoMovementStudy } = loadHelpers('stem_lab/stem_tool_ecosystem.js', ['EcoMovementStudy']);
    const api = window.StemLab.ecosystemFoodWeb;
    const config = { event: 'none' };
    const compared = api.compare(config);
    const frames = api.behaviorTimeline(config, compared.baseline);
    const study = api.motionStudy(frames, 'rabbits', 0);
    expect(study && study.sequence).toBe(true);
    const state = {};
    const before = JSON.stringify({ study, state });
    const root = panel(React.createElement(EcoMovementStudy, {
      React, translateStudy: translate, study, state, studies: { rabbits: study }, branch: 'baseline',
      cursor: 0, focus: 'rabbits', representativeIndex: 0, reduced: true, ready: false,
      onSelect: noop, onInspect: noop, onChange: noop, onReplay: noop
    }));
    expectNamed(root, 'Movement detective', translate);
    expectNamed(root, 'Arrange movement snapshots', translate);
    expect(JSON.stringify({ study, state })).toBe(before);
  });
});
