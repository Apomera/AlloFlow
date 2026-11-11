// Fluency Maze 3D pass, 2026-11-09.
//
// The 3D maze crashed at start ("tt is not a function") from 2026-07-15: a loop
// variable named `tt` in the 3D setup was hoisted over the translation helper
// tt() that the same function calls for the canvas labels. Nobody saw it because
// the maze never asked for the 3D engine, so it only ran in 3D when another tool
// had already loaded Three.js. jsdom has no WebGL, so the crash itself is pinned
// at the source; the loading and camera-choice behaviour is run for real.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('math_fluency_module.js', 'utf8');
let React, ReactDOMClient, act, FluencyMaze, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('math_fluency_module.js');
  FluencyMaze = window.AlloModules.FluencyMaze;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
  delete window.StemLab;
  delete window.THREE;
});

async function mount() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(FluencyMaze, { gradeLevel: '3rd Grade', t: (k) => k, addToast() {} }));
  });
  await act(async () => { await Promise.resolve(); });
}

const click = (el) => act(async () => { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
async function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  await act(async () => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
}

describe('no local variable hides the translation helper', () => {
  it('nothing in the module declares a variable named tt', () => {
    // tt() is the module's translate-with-key helper. A `var tt` anywhere inside a
    // function replaces it for that whole function, before the declaration too.
    expect(source).not.toMatch(/\bvar\s+tt\b/);
    expect(source).not.toMatch(/\b(?:let|const)\s+tt\b/);
    expect(source).not.toMatch(/function\s*\([^)]*\btt\b[^)]*\)/);
    expect(source).toContain('function tt(key, en, params)');
  });
  it('the 3D setup still labels its canvas through tt()', () => {
    expect(source).toContain("cnv.setAttribute('aria-roledescription', tt('math_fluency.maze_canvas_role'");
  });
});

describe('the maze asks for the 3D engine itself', () => {
  it('requests Three.js from the shared loader on open, without orbit controls', async () => {
    const ensureThree = vi.fn(() => Promise.resolve({}));
    window.StemLab = { ensureThree };
    await mount();
    expect(ensureThree).toHaveBeenCalledTimes(1);
    expect(ensureThree).toHaveBeenCalledWith({ orbit: false });
  });
  it('does not request it when 2D Performance Mode is on, or when it is already loaded', async () => {
    const ensureThree = vi.fn(() => Promise.resolve({}));
    window.StemLab = { ensureThree };
    localStorage.setItem('fluency_maze_prefs', JSON.stringify({ performance2D: true }));
    await mount();
    expect(ensureThree).not.toHaveBeenCalled();
    await act(async () => root.unmount()); root = null; host.remove(); host = null;
    localStorage.clear();
    window.THREE = { REVISION: '128' };
    await mount();
    expect(ensureThree).not.toHaveBeenCalled();
  });
  it('opens in 2D without error when the loader is missing or fails', async () => {
    await mount();
    expect(host.textContent).toContain('Fluency Maze');
    await act(async () => root.unmount()); root = null; host.remove(); host = null;
    window.StemLab = { ensureThree: () => Promise.reject(new Error('blocked')) };
    await mount();
    expect(host.textContent).toContain('Fluency Maze');
  });
});

describe('camera choice', () => {
  it('defaults to the overhead view and remembers a change', async () => {
    await mount();
    await click(Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Customize Maze')));
    const camera = host.querySelector('select[aria-label="Camera"]');
    expect(camera.value).toBe('overhead');
    expect(Array.from(camera.options).map((o) => o.value)).toEqual(['overhead', 'first']);
    await choose(camera, 'first');
    expect(JSON.parse(localStorage.getItem('fluency_maze_prefs')).mazeView).toBe('first');
  });
  it('Explorer mode is first-person and the choice is locked', async () => {
    localStorage.setItem('fluency_maze_prefs', JSON.stringify({ controlMode: 'explorer' }));
    await mount();
    await click(Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Customize Maze')));
    const camera = host.querySelector('select[aria-label="Camera"]');
    expect(camera.disabled).toBe(true);
    expect(camera.value).toBe('first');
  });
});

describe('a keyboard answer is counted once', () => {
  // Enter was handled by the gate's own input AND by the document key handler,
  // so every keyboard answer scored twice: 2 correct and double points, or 2 wrong.
  async function openGate() {
    localStorage.setItem('fluency_maze_tutorial_seen', '1');
    await mount();
    await click(Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Light the Torches')));
    for (const key of ['ArrowDown', 'ArrowRight']) {
      await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })); });
      if (host.querySelector('.mf-maze-gate')) break;
    }
    const gate = host.querySelector('.mf-maze-gate');
    expect(gate, 'a gate opened').toBeTruthy();
    return gate;
  }
  async function answer(gate, value) {
    const input = gate.querySelector('input');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    await act(async () => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => { input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });
  }
  const stat = (label) => host.querySelector('.mf-maze-hud-stat[aria-label$="' + label + '"]').getAttribute('aria-label');
  const solve = (gate) => {
    const m = gate.textContent.match(/(\d+)\s*([+−×÷])\s*(\d+)/);
    const a = Number(m[1]), b = Number(m[3]);
    return { '+': a + b, '−': a - b, '×': a * b, '÷': a / b }[m[2]];
  };

  it('one wrong answer is one missed, one right answer is one correct', async () => {
    const gate = await openGate();
    await answer(gate, 99999);
    expect(stat('missed answers')).toBe('1 missed answers');
    expect(stat('correct answers')).toBe('0 correct answers');
    await answer(host.querySelector('.mf-maze-gate'), solve(host.querySelector('.mf-maze-gate')));
    expect(stat('correct answers')).toBe('1 correct answers');
    expect(stat('missed answers')).toBe('1 missed answers');
  });
});

describe('Chase mode is winnable', () => {
  const M = () => window.AlloModules.MathFluencyInternals;
  const passages = (maze) => {
    let n = 0;
    maze.forEach((row) => row.forEach((cell) => { if (!cell.walls.right) n++; if (!cell.walls.bottom) n++; }));
    return n;
  };
  it('a generated maze has exactly one route between cells, and chase mazes get loops', () => {
    const maze = M().generateMaze(7, 7);
    // One route everywhere = a tree: cells - 1 passages. A pursuer makes every dead end fatal there.
    expect(passages(maze)).toBe(48);
    let seed = 7;
    const opened = M().addMazeLoops(maze, 0.16, () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; });
    expect(opened).toBeGreaterThanOrEqual(2);
    expect(passages(maze)).toBe(48 + opened);
    // Walls stay two-sided, and the outer wall is never opened.
    maze.forEach((row, r) => row.forEach((cell, c) => {
      if (c < 6) expect(cell.walls.right).toBe(maze[r][c + 1].walls.left);
      if (r < 6) expect(cell.walls.bottom).toBe(maze[r + 1][c].walls.top);
      if (c === 6) expect(cell.walls.right).toBe(true);
      if (r === 6) expect(cell.walls.bottom).toBe(true);
    }));
    expect(M().findMazePathDistance(maze, { r: 0, c: 0 }, { r: 6, c: 6 })).toBeGreaterThan(0);
  });
  it('the monster starts asleep and says when it wakes', async () => {
    localStorage.setItem('fluency_maze_tutorial_seen', '1');
    localStorage.setItem('fluency_maze_prefs', JSON.stringify({ chaseMode: true }));
    await mount();
    await click(Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Light the Torches')));
    const radar = host.querySelector('.mf-maze-chase-radar');
    expect(radar.getAttribute('data-danger-level')).toBe('armed');
    expect(radar.textContent).toContain('asleep until you are 3 gates away');
    expect(M().MAZE_CHASE_HEAD_START).toBe(3);
    // Asleep means it can neither move nor catch.
    expect(source).toContain('|| !!currentProblem || !monsterAwake;');
    expect(source).toContain('monsterPos.c === playerPos.c && monsterAwake) {');
  });
});
