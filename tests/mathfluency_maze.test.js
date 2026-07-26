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
