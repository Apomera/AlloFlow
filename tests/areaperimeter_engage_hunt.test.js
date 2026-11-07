// Independent hunt of the Area & Perimeter engagement build (2026-11-04).
// AP_FILE runs the fail-first checks against the hunt's start copy.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const FILE = process.env.AP_FILE || 'stem_lab/stem_tool_areaperimeter.js';
const ID = 'areaPerimeter';
let root = null;

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});
afterEach(async () => {
  if (root) await React.act(async () => { root.unmount(); });
  root = null;
});

async function mount(initial, overrides = {}) {
  const tool = loadTool(FILE, ID);
  let latest;
  function App() {
    const [state, setState] = React.useState(initial);
    latest = state;
    return tool.render(makeCtx(Object.assign({ toolData: state, setToolData: setState }, overrides)));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(async () => { root.render(React.createElement(App)); });
  return () => latest._areaPerimeter || {};
}
const button = (label) => [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === label);
async function click(el) {
  expect(el).toBeTruthy();
  await React.act(async () => { el.click(); });
}
async function clickTile(key) {
  await React.act(async () => { document.querySelector(`[data-ap-tile="${key}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}
const metricValue = (k) => document.querySelector(`[data-ap-metric="m-${k}"]`).children[1].textContent;
const panelText = () => document.getElementById('ap-mode-panel').textContent;
const toggle = () => document.querySelector('[data-ap-action="path-toggle"]');

describe('counting credit after Reveal all', () => {
  it('a click after Reveal all earns no revealedBest, for an erase or a repaint', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 6, height: 4, revealedBest: 3 } });
    await click(button('Reveal all'));
    await clickTile('0-0');
    expect(state().revealedBest).toBe(3);
    await clickTile('0-0');
    expect(state().revealedBest).toBe(3);
    expect(document.querySelector('[data-ap-path-count]').getAttribute('data-ap-path-count')).toBe('0/4');
  });

  it('counting again after Hide all earns credit', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 3, height: 2 } });
    await click(button('Reveal all'));
    await click(button('Hide all'));
    await clickTile('0-0');
    await clickTile('1-0');
    expect(state().revealedBest).toBe(2);
  });

  it('erasing never raises the best count', async () => {
    const state = await mount({ _areaPerimeter: { mode: 'explore', width: 3, height: 2, revealedBest: 1, revealedTiles: { '0-0': true, '1-0': true, '2-0': true } } });
    await clickTile('2-0');
    expect(state().revealedBest).toBe(1);
  });
});

describe('focus', () => {
  it('Hide all disables itself, so focus moves to the grid instead of being dropped', async () => {
    await mount({ _areaPerimeter: { mode: 'explore', width: 2, height: 2, revealedTiles: { '0-0': true } } });
    const hide = button('Hide all');
    hide.focus();
    await click(hide);
    expect(hide.disabled).toBe(true);
    expect(document.activeElement.getAttribute('data-ap-tile')).toBe('0-0');
  });
});

describe('fence walk wording', () => {
  it('the first step of a walk does not say "1 units"', async () => {
    const speak = vi.fn();
    await mount({ _areaPerimeter: { mode: 'explore', width: 6, height: 4 } }, { announceToSR: speak });
    await click(button('Walk one unit'));
    expect(speak.mock.calls.at(-1)[0]).toBe('Units walked: 1');
  });
});

describe('the problem the path opens with', () => {
  it('stays on screen after a first action that is not an answer', async () => {
    await mount({}, { gradeLevel: '5th Grade' });
    const before = panelText().slice(0, 200);
    expect(document.getElementById('ap-tab-challenge').getAttribute('aria-selected')).toBe('true');
    await click(toggle());
    expect(panelText().slice(0, 200)).toBe(before);
  });

  it('is still there after visiting another tab and coming back', async () => {
    await mount({}, { gradeLevel: '5th Grade' });
    const before = panelText().slice(0, 200);
    await click(document.getElementById('ap-tab-composite'));
    await click(document.getElementById('ap-tab-challenge'));
    expect(panelText().slice(0, 200)).toBe(before);
  });

  it('a returning student with progress only does not open on a problem already solved', async () => {
    loadTool(FILE, ID);
    const first = window.AreaPerimeterPure.generateProblem(4, 'rect_area', 1000 + 4 * 31);
    await mount({ _areaPerimeter: { solvedChallenges: { [first.sig]: true } } }, { gradeLevel: '4th Grade' });
    expect(document.getElementById('ap-tab-challenge').getAttribute('aria-selected')).toBe('true');
    const input = document.getElementById('ap-answer');
    expect(input && !input.disabled).toBe(true);
  });
});

describe('hostile or old state', () => {
  it('a trace step above 4 cannot print the total under a hidden card', async () => {
    await mount({ _areaPerimeter: { mode: 'explore', width: 6, height: 4, boundaryStep: 7 } });
    expect(document.querySelector('[data-boundary-progress]').textContent).toContain('= 20 units');
    expect(metricValue('perimeter')).toBe('20 units');
  });

  it('old saves with revealedBest and pathHidden still mount on the next step, totals hidden', async () => {
    await mount({ _areaPerimeter: { pathHidden: true, revealedBest: 24, mode: 'explore' } }, { gradeLevel: '3rd Grade' });
    expect(document.querySelector('[data-ap-path-next]').getAttribute('data-ap-path-next')).toBe('fence');
    expect(metricValue('area')).toBe('?');
  });
});

describe('the corner handle', () => {
  it('a narrow rectangle can always grow by a row (the 46 px cap fits only 5 at rest)', () => {
    loadTool(FILE, ID);
    const P = window.AreaPerimeterPure;
    for (let w = 1; w <= 20; w += 1) for (let h = 1; h < 16; h += 1) {
      const L = P.tileLayout(w, h);
      expect(P.resizeFromPoint(L, L.originX + w * L.cell, L.originY + (h + 1) * L.cell).h, w + 'x' + h).toBe(h + 1);
    }
  });

  it('steps aside when the walker stands under it, and comes back', async () => {
    await mount({ _areaPerimeter: { mode: 'explore', width: 6, height: 4, boundaryWalk: { sig: '6x4', n: 10 } } });
    expect(document.querySelector('[data-ap-resize-handle]')).toBeNull();
    await click(button('Walk one unit'));
    expect(document.querySelector('[data-ap-resize-handle]')).not.toBeNull();
  });
});
