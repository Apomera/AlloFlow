// Rock cycle transformation-process panel.
//
// The panel rendered PROCESSES.slice(0, 3) — only the three steps of the simple
// loop. The three DIRECT branches (igneous → metamorphic, sedimentary →
// igneous, metamorphic → sedimentary) were unreachable, which contradicted the
// tool's own teaching two panels down ("the diagram's 6 arrows show every
// path", "the cycle only goes one way" listed as a myth) and its stated mission
// "Explain the branching cycle". The canvas already drew all six arrows; only
// the clickable list was truncated.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMServer,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const PATHS = [
  'stem_lab/stem_tool_rocks.js',
  'desktop/web-app/public/stem_lab/stem_tool_rocks.js',
];

function mk(rockCycle) {
  const store = { rocks: {}, rockCycle: Object.assign({}, rockCycle) };
  const ctx = makeCtx({
    toolData: store,
    setToolData: (fnOrObj) => {
      const next = typeof fnOrObj === 'function' ? fnOrObj(store) : fnOrObj;
      Object.assign(store, next);
    },
  });
  return { store, ctx };
}

function render(rockCycle) {
  const { store, ctx } = mk(rockCycle);
  const markup = ReactDOMServer.renderToStaticMarkup(
    React.createElement(() => window.StemLab._registry.rockCycle.render(ctx))
  );
  return { store, markup };
}

function tree(rockCycle) {
  const { store, ctx } = mk(rockCycle);
  return { store, node: window.StemLab._registry.rockCycle.render(ctx) };
}

function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

function processButtons(node) {
  return findAll(node, (n) =>
    n.type === 'button' && typeof n.props['aria-label'] === 'string' && / by /.test(n.props['aria-label']));
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('transformation process panel', () => {
  it('exposes all six pathways, not just the simple loop', () => {
    const { node } = tree({});
    expect(processButtons(node)).toHaveLength(6);
  });

  it('includes the three direct branches that were previously unreachable', () => {
    const { node } = tree({});
    const labels = processButtons(node).map((b) => b.props['aria-label']);
    const branches = labels.filter((l) => l.includes('direct branch'));
    expect(branches).toHaveLength(3);
    // Every ordered pair of distinct families must be reachable.
    const joined = labels.join(' | ');
    ['igneous', 'sedimentary', 'metamorphic'].forEach((from) => {
      ['igneous', 'sedimentary', 'metamorphic'].forEach((to) => {
        if (from === to) return;
        const hit = labels.some((l) => {
          const arrow = l.split(' by ')[0];
          return arrow.startsWith(from) && arrow.includes('→') && arrow.trim().endsWith(to);
        });
        expect(hit, `${from} → ${to} missing from: ${joined}`).toBe(true);
      });
    });
  });

  it('no longer truncates the list in source', () => {
    PATHS.forEach((p) => {
      const src = readFileSync(p, 'utf8');
      expect(src).not.toContain('PROCESSES.slice(0, 3)');
      expect(src).toContain('PROCESSES.map(function (proc, i) {');
    });
  });

  it('matches the claim the tool makes about itself', () => {
    // "the diagram's 6 arrows show every path" — the interactive list must agree.
    expect(render({}).markup).toContain('6 arrows show every path');
    expect(processButtons(tree({}).node)).toHaveLength(6);
  });

  it('draws both rock families on every pathway button', () => {
    const { markup } = render({});
    // Family chips reuse the transformation machine's swatch renderer, so the
    // two panels speak the same visual language.
    expect(markup).toContain('rcclip-pf0');
    expect(markup).toContain('rcclip-pt0');
    expect(markup).toContain('rcclip-pf5');
    expect(markup).toContain('rcclip-pt5');
  });

  it('shows a larger from/to figure for the selected pathway', () => {
    const live = tree({});
    processButtons(live.node)[0].props.onClick();
    expect(live.store.rockCycle.selectedProcess).toBeTruthy();

    const { markup } = render(live.store.rockCycle);
    expect(markup).toContain('rcclip-selFrom');
    expect(markup).toContain('rcclip-selTo');
  });

  it('marks the active pathway for assistive tech', () => {
    const live = tree({});
    const btns = processButtons(live.node);
    btns.forEach((b) => expect(b.props['aria-pressed']).toBe(false));
    btns[4].props.onClick();

    const after = tree(live.store.rockCycle);
    const pressed = processButtons(after.node).filter((b) => b.props['aria-pressed'] === true);
    expect(pressed).toHaveLength(1);
  });
});
