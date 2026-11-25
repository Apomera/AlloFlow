// Game Design Studio, final recommendations round (2026-11-23): the sprite pixel grid takes a
// drag from a mouse or (in Paint mode) a finger, with the same Scroll / Paint toggle as the map,
// and Undo takes back a whole drag.
// GS_FILE=<path> runs everything against another copy (fail-first check on the reference file).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const toolPath = process.env.GS_FILE || 'stem_lab/stem_tool_gamestudio.js';
let host; let root; let latest;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
async function mount(cfg, initial) {
  function Harness() {
    const [data, setData] = React.useState({ gameStudio: initial });
    latest = data.gameStudio;
    const ctx = makeCtx({ toolData: data, setToolData: setData, labToolData: data, setLabToolData: setData });
    return cfg.render(ctx);
  }
  await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });
}
const btn = (re) => [...host.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()) || re.test(b.getAttribute('aria-label') || ''));
async function click(el) { await act(async () => { el.click(); await Promise.resolve(); }); }
const grid = () => host.querySelector('[aria-label^="Sprite pixels"]');
// jsdom has no layout: map each pixel to a 10 px square so elementFromPoint can find it.
function stubLayout() {
  document.elementFromPoint = (x, y) => grid().children[Math.floor(y / 10) * 16 + Math.floor(x / 10)] || null;
}
async function pointer(type, el, x, y, pointerType) {
  await act(async () => {
    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 });
    Object.defineProperty(ev, 'pointerId', { value: 3 });
    Object.defineProperty(ev, 'pointerType', { value: pointerType });
    el.dispatchEvent(ev);
    await Promise.resolve();
  });
}
async function drag(pointerType, cells) {
  const g = grid();
  const at = (i) => [(i % 16) * 10 + 5, Math.floor(i / 16) * 10 + 5];
  await pointer('pointerdown', g, ...at(cells[0]), pointerType);
  for (const i of cells.slice(1)) await pointer('pointermove', g, ...at(i), pointerType);
  await pointer('pointerup', g, ...at(cells[cells.length - 1]), pointerType);
  // A real browser follows a press with a click on the first square; it must not draw again.
  await click(g.children[cells[0]]);
}
const RED = '#e74c3c';
const START = { '5,5': '#000000' };

describe('sprite pixel grid: drag drawing (mouse and touch)', () => {
  let cfg;
  let coarse = false;
  beforeEach(() => {
    resetStemLab();
    coarse = false;
    window.matchMedia = (q) => ({ matches: /pointer:\s*coarse/.test(q) ? coarse : false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    cfg = loadTool(toolPath, 'gameStudio');
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); delete document.elementFromPoint; });

  it('touch, Paint mode: one finger drag draws every pixel it crosses, and Undo takes back the whole drag', async () => {
    coarse = true;
    await mount(cfg, { tab: 'sprite', spritePixels: Object.assign({}, START), spriteColor: RED, spriteTool: 'draw' });
    stubLayout();
    expect(btn(/Paint$/)).toBeTruthy();
    expect(grid().style.touchAction).toBe('');
    await click(btn(/Paint$/));
    expect(latest.touchPaint).toBe(true);
    expect(grid().style.touchAction).toBe('none');
    await drag('touch', [0, 1, 2, 18]);
    expect(['0,0', '1,0', '2,0', '2,1'].map((k) => latest.spritePixels[k])).toEqual([RED, RED, RED, RED]);
    expect(Object.keys(latest.spritePixels).length).toBe(5);
    await click(btn(/^Undo sprite change$/));
    expect(latest.spritePixels).toEqual(START);
    await click(btn(/^Redo sprite change$/));
    expect(latest.spritePixels['2,1']).toBe(RED);
  });

  it('touch, Scroll mode: a finger drag does not draw (the page can scroll); a tap still draws', async () => {
    coarse = true;
    await mount(cfg, { tab: 'sprite', spritePixels: {}, spriteColor: RED, spriteTool: 'draw' });
    stubLayout();
    expect(btn(/Scroll$/).getAttribute('aria-pressed')).toBe('true');
    await pointer('pointerdown', grid(), 5, 5, 'touch');
    await pointer('pointermove', grid(), 15, 5, 'touch');
    await pointer('pointerup', grid(), 25, 5, 'touch');
    expect(latest.spritePixels).toEqual({});
    await click(grid().children[3]);
    expect(latest.spritePixels).toEqual({ '3,0': RED });
  });

  it('the map and the sprite grid share one Scroll / Paint choice, and it shows only on touch screens', async () => {
    await mount(cfg, { tab: 'sprite' });
    expect(btn(/Paint$/)).toBeFalsy();
    await act(async () => root.unmount());
    root = ReactDOMClient.createRoot(host);
    coarse = true;
    await mount(cfg, { tab: 'map' });
    await click(btn(/Paint$/));
    await click(host.querySelector('#gs-tab-sprite'));
    expect(btn(/Paint$/).getAttribute('aria-pressed')).toBe('true');
  });

  it('mouse: a drag draws its first pixel too, and is one Undo step', async () => {
    await mount(cfg, { tab: 'sprite', spritePixels: {}, spriteColor: RED, spriteTool: 'draw' });
    stubLayout();
    await drag('mouse', [16, 17, 18, 19]);
    expect(latest.spritePixels).toEqual({ '0,1': RED, '1,1': RED, '2,1': RED, '3,1': RED });
    await click(btn(/^Undo sprite change$/));
    expect(latest.spritePixels).toEqual({});
  });

  it('a drag with Mirror on draws each pixel and its twin; Erase drags erase', async () => {
    await mount(cfg, { tab: 'sprite', spritePixels: {}, spriteColor: RED, spriteTool: 'draw', spriteMirror: true });
    stubLayout();
    await drag('mouse', [0, 1]);
    expect(Object.keys(latest.spritePixels).sort()).toEqual(['0,0', '1,0', '14,0', '15,0']);
    await click(btn(/^Sprite tool: Erase$/));
    await drag('mouse', [1]);
    expect(Object.keys(latest.spritePixels).sort()).toEqual(['0,0', '15,0']);
    // Two drags, two Undo steps.
    await click(btn(/^Undo sprite change$/));
    expect(Object.keys(latest.spritePixels).length).toBe(4);
    await click(btn(/^Undo sprite change$/));
    expect(latest.spritePixels).toEqual({});
  });

  it('Fill is a tap tool: a drag does not paint pixel by pixel, and the grid still lets a finger scroll', async () => {
    coarse = true;
    await mount(cfg, { tab: 'sprite', spritePixels: {}, spriteColor: RED, spriteTool: 'fill', touchPaint: true });
    stubLayout();
    expect(grid().style.touchAction).toBe('');
    await pointer('pointerdown', grid(), 5, 5, 'touch');
    await pointer('pointermove', grid(), 15, 5, 'touch');
    await pointer('pointerup', grid(), 15, 5, 'touch');
    expect(latest.spritePixels).toEqual({});
    await click(grid().children[0]);
    expect(Object.keys(latest.spritePixels).length).toBe(256);
    await click(btn(/^Undo sprite change$/));
    expect(latest.spritePixels).toEqual({});
  });

  it('Clear and presets are undoable too, and a tap on a pixel that already has the color adds no step', async () => {
    await mount(cfg, { tab: 'sprite', spritePixels: { '0,0': RED }, spriteColor: RED, spriteTool: 'draw' });
    await click(grid().children[0]);
    expect(btn(/^Undo sprite change$/).disabled).toBe(true);
    await click(btn(/^Clear Canvas$/));
    expect(latest.spritePixels).toEqual({});
    await click(btn(/^Undo sprite change$/));
    expect(latest.spritePixels).toEqual({ '0,0': RED });
  });
});
