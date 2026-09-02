// Mineral Workbench reasoning trail: every recorded observation is kept, and
// the debrief replays the learner's path, flagging revised and mismatched
// readings only AFTER the claim is solved.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';
const POOL = ['quartz', 'feldspar', 'mica', 'calcite', 'halite', 'pyrite', 'talc', 'gypsum', 'magnetite', 'hematite', 'galena', 'fluorite'];

function tree(wb) {
  const store = { rocks: { mode: 'workbench', wb: Object.assign({ spId: 'pyrite', order: POOL, scratch: {}, streakDone: false, fizz: null, magnet: null, density: false, lens: false, guessedWrong: [], solvedId: null, guided: false }, wb) }, rockCycle: {} };
  const ctx = makeCtx({ toolData: store, setToolData: (f) => Object.assign(store, typeof f === 'function' ? f(store) : f) });
  return { store, node: window.StemLab._registry.rocks.render(ctx) };
}
const markupOf = (wb) => ReactDOMServer.renderToStaticMarkup(React.createElement(() => tree(wb).node));
function findAll(node, pred, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, pred, acc)); return acc; }
  if (pred(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, pred, acc);
  return acc;
}

beforeEach(() => { resetStemLab(); loadTool(ROCKS_FILE, 'rocks'); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('reasoning trail', () => {
  it('appends every recorded observation to the history, including a revision', () => {
    const first = tree({ pending: { tool: 'lens' } });
    findAll(first.node, (n) => n.type === 'button' && n.props['data-wb-observe-choice'] === 'pearly')[0].props.onClick();
    expect(first.store.rocks.wb.history).toHaveLength(1);
    expect(first.store.rocks.wb.history[0]).toMatchObject({ tool: 'lens', choice: 'pearly' });
    const again = tree(Object.assign({}, first.store.rocks.wb, { pending: { tool: 'lens' } }));
    findAll(again.node, (n) => n.type === 'button' && n.props['data-wb-observe-choice'] === 'metallic')[0].props.onClick();
    expect(again.store.rocks.wb.history).toHaveLength(2);
    expect(again.store.rocks.wb.lens).toBe('metallic');
  });

  it('shows no verdicts before the claim is solved', () => {
    const markup = markupOf({ lens: 'metallic', history: [{ tool: 'lens', choice: 'pearly', label: 'Pearly or silky' }, { tool: 'lens', choice: 'metallic', label: 'Metallic' }] });
    expect(markup).not.toContain('data-wb-debrief-history');
    expect(markup).not.toContain('data-wb-history-verdict');
  });

  it('replays the trail in the debrief with revised and mismatched readings marked', () => {
    const markup = markupOf({
      solvedId: 'pyrite', selectedId: 'pyrite', lens: 'metallic', streakDone: true, streakObs: 'powder-greenish-black',
      history: [
        { tool: 'lens', choice: 'pearly', label: 'Pearly or silky' },
        { tool: 'lens', choice: 'metallic', label: 'Metallic' },
        { tool: 'streak', choice: 'powder-greenish-black', label: 'Greenish-black' },
      ],
    });
    expect(markup).toContain('data-wb-debrief-history="3"');
    expect(markup).toContain('data-wb-history-verdict="revised"');
    expect(markup).toContain('data-wb-history-verdict="match"');
    expect(markup).toContain('How you got there');
    // A revised first reading is described as a revision, never as a failure.
    expect(markup).not.toContain('Wrong');
  });

  it('flags a recorded reading that disagrees with the reference of the solved mineral', () => {
    const markup = markupOf({
      solvedId: 'pyrite', selectedId: 'pyrite', lens: 'metallic', fizz: 'fizz',
      history: [{ tool: 'lens', choice: 'metallic', label: 'Metallic' }, { tool: 'acid', choice: 'fizz', label: 'Bubbles rose from the drop' }],
    });
    expect(markup).toContain('data-wb-history-verdict="mismatch"');
    expect(markup).toContain('Worth a second look');
  });

  it('resets the history with a new specimen', () => {
    const { store, node } = tree({ history: [{ tool: 'lens', choice: 'metallic', label: 'Metallic' }] });
    const next = findAll(node, (n) => n.type === 'button' && n.props['data-wb-next-specimen'] !== undefined)[0]
      || findAll(node, (n) => n.type === 'button' && /New unknown/.test(JSON.stringify(n.props.children || '')))[0];
    expect(next, 'new specimen control').toBeTruthy();
    next.props.onClick();
    expect(store.rocks.wb.history).toEqual([]);
  });
});

describe('engagement touches', () => {
  it('drops the specimen onto the bench, glides the scratch tool, and offers the closest look-alike after solving', () => {
    const fresh = markupOf({});
    expect(fresh).toContain('rk-wb-drop');
    const scratching = markupOf({ anim: 'scratch', activeScratchRef: 'steel_nail' });
    expect(scratching).toContain('data-wb-scratch-tool="gliding"');
    const { store, node } = tree({ solvedId: 'pyrite', selectedId: 'pyrite', lens: 'metallic' });
    const look = findAll(node, (n) => n.type === 'button' && typeof n.props['data-wb-next-lookalike'] === 'string')[0];
    expect(look, 'look-alike control').toBeTruthy();
    const rival = look.props['data-wb-next-lookalike'];
    expect(['magnetite', 'hematite', 'galena']).toContain(rival); // pyrite's metallic neighbours
    look.props.onClick();
    expect(store.rocks.wb.spId).toBe(rival);
    expect(store.rocks.wb.solvedId).toBeNull();
    expect(store.rocks.wb.order).toHaveLength(12);
  });

  it('celebrates a correct claim through the host hook when one exists', () => {
    const src = readFileSync('stem_lab/stem_tool_rocks.js', 'utf8');
    expect(src).toContain("try { if (typeof stemCelebrate === 'function') stemCelebrate(); } catch (e) {}");
  });
});

describe('copy notebook and dock portholes', () => {
  it('copies a plain-text notebook with the trail, evidence, shortlist and claim', () => {
    const written = [];
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { written.push(t); } }, configurable: true });
    const { node } = tree({
      lens: 'metallic', streakDone: true, streakObs: 'powder-greenish-black', selectedId: 'pyrite',
      claimEvidence: ['luster', 'streak'], claimReasoning: 'both', claimConfidence: 'very',
      history: [{ tool: 'lens', choice: 'metallic', label: 'Metallic' }, { tool: 'streak', choice: 'powder-greenish-black', label: 'Greenish-black' }],
    });
    const btn = findAll(node, (n) => n.type === 'button' && n.props['data-wb-copy-notebook'] === 'true')[0];
    expect(btn, 'copy button').toBeTruthy();
    btn.props.onClick();
    expect(written).toHaveLength(1);
    const text = written[0];
    expect(text).toContain('Mineral Workbench field notebook');
    expect(text).toContain('1. Hand lens: Metallic');
    expect(text).toContain('2. Streak plate: Greenish-black');
    expect(text).toContain('luster: Lens: luster metallic (your classification)');
    expect(text).toContain('Candidates still fitting: 1 / 12');
    expect(text).toContain('Claim: stem.rocks.pyrite');
    expect(text).toContain('Reasoning: ');
  });

  it('puts the unknown and the chosen candidate under the same lens in the pinned comparison', () => {
    const markup = markupOf({ lens: 'metallic', selectedId: 'pyrite' });
    expect(markup).toContain('data-wb-dock-porthole="unknown"');
    expect(markup).toContain('data-wb-dock-porthole="pyrite"');
    expect(markupOf({ selectedId: 'pyrite' })).not.toContain('data-wb-dock-porthole=');
  });
});

describe('bench motion cues', () => {
  it('drags a specimen chip across the streak plate and raises the beaker water while those trials run', () => {
    const streak = markupOf({ anim: 'streak' });
    expect(streak).toContain('data-wb-streak-chip="gliding"');
    expect(markupOf({ streakDone: true, pending: { tool: 'streak' } })).not.toContain('data-wb-streak-chip=');
    const density = markupOf({ anim: 'density' });
    expect(density).toContain('data-wb-density-water="rising"');
    expect(markupOf({ density: true, pending: { tool: 'density' } })).toContain('data-wb-density-water="settled"');
  });

  it('marks the recommended instrument with the nudge animation', () => {
    const fresh = markupOf({ spId: 'calcite' });
    const lensBtn = /<button[^>]*data-wb-tool="lens"[^>]*>/.exec(fresh)[0];
    expect(lensBtn).toContain('rk-wb-nudge');
    const magnetBtn = /<button[^>]*data-wb-tool="magnet"[^>]*>/.exec(fresh)[0];
    expect(magnetBtn).not.toContain('rk-wb-nudge');
  });
});
