// WCAG 2.1.1: controls that only answered a mouse click (div/span/SVG with onClick
// and no keyboard route). Each test mounts the real tool, finds the control by its
// accessible name, checks it is focusable, and drives it with Enter and Space.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host;
let root;
let latest;

beforeEach(() => {
  resetStemLab();
  // A 2D context where every method is a no-op, so canvas-drawing effects do not throw.
  const ctx2d = new Proxy({}, {
    get(t, p) { if (p in t) return t[p]; return function () { return { width: 0, data: [], addColorStop() {} }; }; },
    set(t, p, v) { t[p] = v; return true; },
  });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx2d);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  if (!window.ResizeObserver) {
    window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

// Mounts a tool with its state under data[id]; music uses ctx.update(tool, key, value).
async function mount(config, id, initial) {
  function Harness() {
    const [data, setData] = React.useState({ [id]: initial });
    latest = data[id];
    const set = setData;
    const ctx = makeCtx({
      toolData: data, setToolData: set, labToolData: data, setLabToolData: set,
      update: (tool, k, v) => set((p) => ({ ...p, [tool]: { ...(p[tool] || {}), [k]: v } })),
      updateMulti: (tool, o) => set((p) => ({ ...p, [tool]: { ...(p[tool] || {}), ...o } })),
    });
    return config.render(ctx);
  }
  await act(async () => {
    root.render(React.createElement(Harness));
    await Promise.resolve();
  });
}

function byLabel(re) {
  return [...host.querySelectorAll('[aria-label]')].filter((el) => re.test(el.getAttribute('aria-label')));
}

async function key(el, k) {
  await act(async () => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });
}

function focusable(el) {
  return el.tagName === 'BUTTON' || el.getAttribute('tabindex') === '0';
}

// Web Audio stand-in: every property, call and construction yields another no-op.
function audioStub() {
  return new Proxy(function () {}, {
    get(t, p) {
      if (p === 'then') return undefined;
      if (p === Symbol.toPrimitive) return () => 0;
      if (p === 'currentTime' || p === 'sampleRate') return 0;
      return audioStub();
    },
    apply() { return audioStub(); },
    construct() { return audioStub(); },
    set() { return true; },
  });
}

describe('Music Synthesizer', () => {
  let cfg;
  beforeEach(() => {
    window.AudioContext = audioStub();
    window.webkitAudioContext = window.AudioContext;
    cfg = loadTool('stem_lab/stem_tool_music.js', 'musicSynth');
  });
  afterEach(() => { delete window.AudioContext; delete window.webkitAudioContext; });

  it('waveform cards select a wave from the keyboard', async () => {
    await mount(cfg, 'musicSynth', { synthTab: 'scales', waveType: 'sine' });
    const card = [...host.querySelectorAll('[role="button"][aria-pressed]')].find((el) => /square/i.test(el.textContent));
    expect(card).toBeTruthy();
    expect(card.getAttribute('tabindex')).toBe('0');
    await key(card, 'Enter');
    expect(latest.waveType).toBe('square');
    const saw = [...host.querySelectorAll('[role="button"][aria-pressed]')].find((el) => /sawtooth/i.test(el.textContent));
    await key(saw, ' ');
    expect(latest.waveType).toBe('sawtooth');
  });

  it('scale notes are real buttons', async () => {
    await mount(cfg, 'musicSynth', { synthTab: 'scales' });
    const notes = [...host.querySelectorAll('button')].filter((b) => /^C/.test(b.textContent) && b.className.includes('border-purple-200'));
    expect(notes.length).toBeGreaterThan(0);
  });

  it('circle-of-fifths keys select a root with Enter and Space', async () => {
    await mount(cfg, 'musicSynth', { synthTab: 'chords', selectedRoot: 'C' });
    const g = byLabel(/^G major/)[0];
    expect(g).toBeTruthy();
    expect(focusable(g)).toBe(true);
    await key(g, 'Enter');
    expect(latest.selectedRoot).toBe('G');
    const d = byLabel(/^D major/)[0];
    await key(d, ' ');
    expect(latest.selectedRoot).toBe('D');
  });

  it('beat-pad drum steps and melody steps are buttons', async () => {
    await mount(cfg, 'musicSynth', { synthTab: 'beatpad', activeKit: 'x' });
    const step = byLabel(/, step 1$/).find((el) => el.getAttribute('aria-pressed') === 'false');
    expect(step && step.tagName).toBe('BUTTON');
    await act(async () => { step.click(); });
    expect(Object.values(latest.seqGrid || {})).toContain(1);
    const mel = byLabel(/^Melody step 1:/)[0];
    expect(mel && mel.tagName).toBe('BUTTON');
  });

  // Each beat-pad grid is one tab stop; arrows move it and focus follows.
  const tabStops = (grid) => [...grid.querySelectorAll('[data-bp-cell]')].filter((c) => c.getAttribute('tabindex') === '0');
  const cell = (grid, n) => grid.querySelector('[data-bp-cell="' + n + '"]');

  it('drum grid is a roving grid', async () => {
    await mount(cfg, 'musicSynth', { synthTab: 'beatpad', activeKit: 'x' });
    const grid = host.querySelector('[data-bp-grid="drum"]');
    expect(grid.getAttribute('role')).toBe('group');
    expect(grid.getAttribute('aria-label')).toMatch(/^Drum steps\./);
    expect(grid.querySelectorAll('button[data-bp-cell]').length).toBeGreaterThan(16);
    expect(tabStops(grid)).toEqual([cell(grid, 0)]);
    await key(cell(grid, 0), 'ArrowRight');
    expect(document.activeElement).toBe(cell(grid, 1));
    expect(tabStops(grid)).toEqual([cell(grid, 1)]);
    await key(cell(grid, 1), 'ArrowDown');
    expect(document.activeElement).toBe(cell(grid, 17));
    await key(cell(grid, 17), 'End');
    expect(document.activeElement).toBe(cell(grid, 31));
    await key(cell(grid, 31), 'Home');
    expect(document.activeElement).toBe(cell(grid, 16));
    expect(tabStops(grid)).toEqual([cell(grid, 16)]);
    expect(cell(grid, 16).getAttribute('aria-pressed')).toBe('false');
    await act(async () => { cell(grid, 16).click(); }); // what Enter/Space do on a native button
    expect(latest.seqGrid['1_0']).toBe(1);
    expect(latest.bpCur).toBeUndefined(); // the cursor is view state, not saved
  });

  it('melody row and piano roll are roving grids', async () => {
    await mount(cfg, 'musicSynth', { synthTab: 'beatpad', activeKit: 'x', showPianoRoll: true });
    const mel = host.querySelector('[data-bp-grid="mel"]');
    expect(mel.getAttribute('aria-label')).toMatch(/^Melody steps\./);
    expect(tabStops(mel)).toHaveLength(1);
    await key(cell(mel, 0), 'ArrowLeft');
    expect(tabStops(mel)).toEqual([cell(mel, 0)]);
    await key(cell(mel, 0), 'End');
    expect(document.activeElement).toBe(cell(mel, 15));
    expect(tabStops(mel)).toEqual([cell(mel, 15)]);
    const roll = host.querySelector('[data-bp-grid="roll"]');
    expect(roll.getAttribute('aria-label')).toMatch(/^Piano roll\./);
    expect(tabStops(roll)).toEqual([cell(roll, 0)]);
    await key(cell(roll, 0), 'ArrowDown');
    expect(document.activeElement).toBe(cell(roll, 16));
    expect(tabStops(roll)).toEqual([cell(roll, 16)]);
    await act(async () => { cell(roll, 16).click(); });
    expect(cell(roll, 16).getAttribute('aria-pressed')).toBe('true');
  });

  it('instrument cards expand from the keyboard', async () => {
    await mount(cfg, 'musicSynth', { synthTab: 'theory', showInstruments: true });
    const head = host.querySelector('[role="button"][aria-expanded="false"]');
    expect(head).toBeTruthy();
    expect(head.getAttribute('tabindex')).toBe('0');
    await key(head, 'Enter');
    expect(latest.expandedInst).toBeTruthy();
    // Keys pressed on the nested Play button do not toggle the card.
    const name = latest.expandedInst;
    const open = host.querySelector('[role="button"][aria-expanded="true"]');
    await key(open.querySelector('button'), 'Enter');
    expect(latest.expandedInst).toBe(name);
  });

  it('HarmonyPad strings pluck from the keyboard', async () => {
    await mount(cfg, 'musicSynth', { synthTab: 'harmonypad' });
    const str = byLabel(/^Pluck string /)[0];
    expect(str).toBeTruthy();
    expect(str.getAttribute('tabindex')).toBe('0');
    await key(str, 'Enter');
    expect(latest.omniStrumActive).toEqual([0]);
  });
});

describe('Game Studio paint grids', () => {
  let cfg;
  beforeEach(() => { cfg = loadTool('stem_lab/stem_tool_gamestudio.js', 'gameStudio'); });

  it('map tiles: one tab stop, arrows move it, Enter and Space paint', async () => {
    await mount(cfg, 'gameStudio', { tab: 'map', selectedTile: 'wall', brushTool: 'brush' });
    const grid = byLabel(/^Level map\./)[0];
    expect(grid).toBeTruthy();
    const cells = [...grid.children];
    expect(cells.filter((c) => c.getAttribute('tabindex') === '0')).toHaveLength(1);
    await key(cells[0], 'Enter');
    expect(latest.tiles['0,0']).toBe('wall');
    await key(cells[0], 'ArrowRight');
    expect(latest.tileCur).toBe(1);
    expect(document.activeElement).toBe(grid.children[1]);
    await key(grid.children[1], ' ');
    expect(latest.tiles['1,0']).toBe('wall');
  });

  it('sprite pixels: arrows move, Enter paints', async () => {
    await mount(cfg, 'gameStudio', { tab: 'sprite', spriteColor: '#123456', spriteTool: 'draw' });
    const grid = byLabel(/^Sprite pixels/)[0];
    expect(grid).toBeTruthy();
    const cells = [...grid.children];
    expect(cells).toHaveLength(256);
    await key(cells[0], 'ArrowDown');
    expect(latest.spriteCur).toBe(16);
    await key(grid.children[16], 'Enter');
    expect(latest.spritePixels['0,1']).toBe('#123456');
  });
});

describe('Logic Lab law cards', () => {
  it('are buttons that load the law', async () => {
    const cfg = loadTool('stem_lab/stem_tool_logiclab.js', 'logicLab');
    await mount(cfg, 'logicLab', { showEdu: true, mode: 'truth' });
    const card = [...host.querySelectorAll('button')].find((b) => b.textContent.indexOf('Double Negation') === 0);
    expect(card).toBeTruthy();
    await act(async () => { card.click(); });
    expect(latest.expression).toBe('¬¬P');
  });
});

describe('Decomposer element tiles', () => {
  it('are buttons named with the element', async () => {
    const cfg = loadTool('stem_lab/stem_tool_decomposer.js', 'decomposer');
    await mount(cfg, 'decomposer', { tab: 'explore', selected: 'Water', decomposed: true });
    const tile = byLabel(/^Hydrogen, atomic number 1, /)[0];
    expect(tile && tile.tagName).toBe('BUTTON');
  });
});
