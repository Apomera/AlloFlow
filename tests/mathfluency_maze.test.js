import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'desktop/web-app/node_modules');
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
});

async function mount() {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(FluencyMaze, {
      gradeLevel: '3', t: (key) => key, addToast: () => {}, handleScoreUpdate: () => {},
    }));
  });
}

async function click(element) {
  await act(async () => { element.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
}

describe('Fluency Maze setup UX', () => {
  it('keeps quick start prominent and progressively discloses custom settings', async () => {
    await mount();
    expect(host.textContent).toContain('Fluency Maze');
    expect(host.textContent).toContain('Light the Torches');
    const customize = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Customize Maze'));
    expect(customize).toBeTruthy();
    expect(customize.getAttribute('aria-expanded')).toBe('false');

    const customPanel = host.querySelector('#fluency-maze-custom-settings');
    expect(customPanel).toBeTruthy();
    expect(customPanel.hidden).toBe(true);
    await click(customize);
    expect(customPanel.hidden).toBe(false);
    expect(customize.getAttribute('aria-expanded')).toBe('true');
    expect(customPanel.textContent).toContain('Chase Mode');
    expect(customPanel.textContent).toContain('2D Performance Mode');
    const performanceToggle = Array.from(customPanel.querySelectorAll('label'))
      .find((label) => label.textContent.includes('2D Performance Mode'))
      .querySelector('input');
    expect(performanceToggle.checked).toBe(false);
    await click(performanceToggle);
    expect(performanceToggle.checked).toBe(true);
    expect(JSON.parse(localStorage.getItem('fluency_maze_prefs')).performance2D).toBe(true);
    expect(customize.textContent).toContain('/ 2D');
    expect(customPanel.querySelectorAll('button').length).toBeGreaterThan(5);
  });
});


describe('Fluency Maze comfort controls', () => {
  it('persists and exposes maze comfort controls', async () => {
    await mount();
    await click(host.querySelector('button[aria-controls="fluency-maze-custom-settings"]'));
    const comfort = host.querySelector('.mf-maze-comfort-settings');
    expect(comfort).toBeTruthy();
    const reduced = Array.from(comfort.querySelectorAll('label')).find((label) => label.textContent.includes('Reduced motion')).querySelector('input');
    await click(reduced);
    expect(JSON.parse(localStorage.getItem('fluency_maze_prefs')).reducedMotion).toBe(true);
    expect(comfort.querySelector('select[aria-label="Field of view"]')).toBeTruthy();
  });
});

describe('Fluency Maze playing UX', () => {
  it('renders a clear quest path, compact HUD groups, distance cue, and labeled touch controls', async () => {
    localStorage.setItem('fluency_maze_tutorial_seen', '1');
    localStorage.setItem('fluency_maze_prefs', JSON.stringify({ performance2D: true, mazeSize: 'small', chaseMode: true }));
    await mount();
    const start = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Light the Torches'));
    expect(start).toBeTruthy();
    await click(start);

    const hud = host.querySelector('.mf-maze-hud');
    expect(hud).toBeTruthy();
    expect(hud.querySelector('.mf-maze-hud-stats')).toBeTruthy();
    expect(hud.querySelectorAll('.mf-maze-action-button')).toHaveLength(5);
    const radar = hud.querySelector('.mf-maze-chase-radar');
    expect(radar).toBeTruthy();
    expect(radar.getAttribute('data-danger-level')).toBe('armed');
    expect(radar.textContent).toContain('Chase armed');
    expect(radar.querySelectorAll('.mf-maze-radar-pips i')).toHaveLength(4);

    const quest = host.querySelector('.mf-maze-quest');
    expect(quest).toBeTruthy();
    expect(quest.querySelectorAll('.mf-maze-quest-step')).toHaveLength(2);
    expect(quest.textContent).toContain('Find the golden key');
    expect(quest.textContent).toContain('Exit locked');
    expect(quest.querySelector('.mf-maze-distance').textContent).toMatch(/\d+ gates? away/);

    const moves = host.querySelectorAll('.mf-maze-move-button');
    expect(moves).toHaveLength(4);
    expect(Array.from(moves).map((button) => button.textContent).join('')).toContain('W');
    expect(Array.from(moves).map((button) => button.textContent).join('')).toContain('A');
    expect(Array.from(moves).map((button) => button.textContent).join('')).toContain('S');
    expect(Array.from(moves).map((button) => button.textContent).join('')).toContain('D');

    const canvas = host.querySelector('.mf-maze-viewport');
    expect(canvas.getAttribute('role')).toBe('application');
    expect(canvas.getAttribute('tabindex')).toBe('0');
    expect(canvas.getAttribute('aria-label')).toContain('find the golden key');
    const legend = host.querySelector('.mf-maze-legend');
    expect(legend).toBeTruthy();
    expect(legend.textContent).toContain('Trail');
    expect(legend.textContent).toContain('Monster when nearby');
  });
});
