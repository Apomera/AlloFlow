import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// WCAG 2.5.7 Dragging Movements: Geometry Prover vertices moved only by a drag
// (or arrow keys on the focused canvas). Clicking a vertex now selects it, and
// a "Move a point" group offers Previous/Next point and four one-click nudge
// buttons that move the selected vertex one grid step.
// GEO_PROVER_MOVE_SRC points at another copy (pre-fix copy must go red).

const FILE = process.env.GEO_PROVER_MOVE_SRC || 'stem_lab/stem_tool_geo.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, host, root, latest;
const TRI = [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 150, y: 200 }];

async function mount() {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ geometryProver: { points: TRI.map(p => ({ ...p })), segments: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }] } });
    latest = data.geometryProver;
    return tool.render(makeCtx({ toolData: data, setToolData: setData }));
  }
  await act(async () => root.render(React.createElement(App)));
}
const canvas = () => host.querySelector('svg[role="application"]');
async function clickAt(x, y) {
  // Separate acts: a real click re-renders between press and release.
  await act(async () => { canvas().dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y })); });
  await act(async () => { canvas().dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y })); });
}
async function click(selector) {
  const el = host.querySelector(selector);
  expect(el, 'missing control ' + selector).toBeTruthy();
  await act(async () => el.click());
}

beforeEach(() => {
  resetStemLab();
  new Function(readFileSync(resolve(process.cwd(), FILE), 'utf8'))();
  tool = window.StemLab._registry.geometryProver;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); root = null; host?.remove(); host = null;
});

describe('Geometry Prover moves a vertex without dragging (WCAG 2.5.7)', () => {
  it('a click selects a vertex without moving it, then nudge buttons move only that vertex', async () => {
    await mount();
    await clickAt(200, 100);
    expect(latest.points).toEqual(TRI);
    expect(host.querySelector('[data-prover-selected]')?.textContent).toBe('Selected: B');
    await click('[data-prover-nudge="right"]');
    expect(latest.points[1]).toEqual({ x: 225, y: 100 });
    await click('[data-prover-nudge="down"]');
    expect(latest.points[1]).toEqual({ x: 225, y: 125 });
    expect(latest.points[0]).toEqual(TRI[0]);
    expect(latest.points[2]).toEqual(TRI[2]);
    expect(latest.dragging).toBeNull();
  });

  it('nudge buttons are named for the selected vertex and direction', async () => {
    await mount();
    await clickAt(100, 100);
    const names = ['left', 'up', 'down', 'right'].map(dir => host.querySelector('[data-prover-nudge="' + dir + '"]')?.getAttribute('aria-label'));
    expect(names).toEqual(['Move A left', 'Move A up', 'Move A down', 'Move A right']);
    await click('[data-prover-nudge="up"]');
    await click('[data-prover-nudge="left"]');
    expect(latest.points[0]).toEqual({ x: 75, y: 75 });
  });

  it('Previous/Next point buttons choose the vertex without a pointer on the canvas', async () => {
    await mount();
    // Nothing picked yet: the newest point (C) is selected, as on the keyboard.
    expect(host.querySelector('[data-prover-selected]')?.textContent).toBe('Selected: C');
    await click('[data-prover-select="next"]');
    expect(host.querySelector('[data-prover-selected]').textContent).toBe('Selected: A');
    await click('[data-prover-select="prev"]');
    await click('[data-prover-select="prev"]');
    expect(host.querySelector('[data-prover-selected]').textContent).toBe('Selected: B');
    await click('[data-prover-nudge="left"]');
    expect(latest.points[1]).toEqual({ x: 175, y: 100 });
  });

  it('keeps nudged vertices on the canvas', async () => {
    await mount();
    await clickAt(100, 100);
    for (let i = 0; i < 8; i++) await click('[data-prover-nudge="left"]');
    expect(latest.points[0].x).toBe(10);
  });
});
