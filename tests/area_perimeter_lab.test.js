import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_areaperimeter.js';
const ID = 'areaPerimeter';

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});

describe('Area & Perimeter Lab', () => {
  it('registers and exposes reliable geometry helpers', () => {
    const tool = loadTool(FILE, ID);
    expect(tool.label).toBe('Area & Perimeter Lab');
    expect(tool.category).toBe('math');

    const pure = window.AreaPerimeterPure;
    expect(pure.rectangleMetrics(7, 4)).toEqual({ area: 28, perimeter: 22 });
    expect(pure.compositeMetrics(10, 8, 6, 3)).toEqual({
      cutWidth: 4,
      area: 68,
      perimeter: 36,
      boundaryEdges: [6, 3, 4, 5, 10, 8],
    });
    expect(pure.factorPairs(24).map((pair) => pair.p)).toEqual([50, 28, 22, 20]);
    expect(pure.factorPairs(Infinity)).toEqual([]);
    expect(pure.isCorrectNumericAnswer('', 28)).toBe(false);
    expect(pure.isCorrectNumericAnswer('28', 28)).toBe(true);
  });

  it('renders every learning mode with stable text alternatives', () => {
    loadTool(FILE, ID);
    const expected = {
      explore: 'Build area one square at a time',
      compare: 'Area and perimeter can change differently',
      composite: 'Decompose an L-shape',
      investigate: 'Same area, different perimeter',
      challenge: 'Deterministic set',
    };

    for (const [mode, anchor] of Object.entries(expected)) {
      const html = renderTool(ID, { _areaPerimeter: { mode } });
      expect(html).toContain('Area &amp; Perimeter Lab');
      expect(html).toContain(anchor);
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('NaN');
    }

    const composite = renderTool(ID, { _areaPerimeter: { mode: 'composite' } });
    expect(composite).toContain('4 + 3 + 6 + 5 + 10 + 8');
    expect(composite).toContain('36 units');
  });

  it('keeps interactive unit tiles exposed to keyboard and assistive technology', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { _areaPerimeter: { mode: 'explore', width: 3, height: 2 } });
    expect(html).toContain('role="group"');
    expect(html.match(/role="button"/g)).toHaveLength(6);
    expect(html.match(/tabindex="0"/g)).toHaveLength(3); // active mode tab, panel, and roving tile
    expect(html.match(/tabindex="-1"/g)).toHaveLength(9); // four mode tabs and five tiles
    expect(html).not.toContain('outline:none');
  });

  it('supports keyboard tile counting in a mounted workspace', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _areaPerimeter: { mode: 'explore', width: 2, height: 2 },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const tile = document.querySelector('rect[role="button"]');
    expect(tile).toBeTruthy();
    await React.act(async () => {
      tile.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(latest._areaPerimeter.revealedTiles['0-0']).toBe(true);
    expect(document.body.textContent).toContain('1 of 4 unit squares revealed');
    await React.act(async () => { root.unmount(); });
  });

  it('scores each deterministic challenge once and awards scoped XP', async () => {
    const tool = loadTool(FILE, ID);
    let latest;
    const awardXP = vi.fn();

    function App() {
      const [state, setState] = React.useState({
        _areaPerimeter: { mode: 'challenge', challengeIndex: 0, answer: '28' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    expect(check).toBeTruthy();
    await React.act(async () => { check.click(); });
    expect(latest._areaPerimeter.solvedChallenges['0']).toBe(true);
    expect(latest._areaPerimeter.score).toEqual({ correct: 1, attempts: 1 });
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 5, 'Area & Perimeter challenge');
    await React.act(async () => { check.click(); });
    expect(latest._areaPerimeter.score).toEqual({ correct: 1, attempts: 2 });
    expect(awardXP).toHaveBeenCalledTimes(1);
    await React.act(async () => { root.unmount(); });
  });
  it('is wired into the host catalog, plugin allowlist, lazy loader, and deployment mirrors', () => {
    const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const deployedHost = fs.readFileSync('prismflow-deploy/public/stem_lab/stem_lab_module.js', 'utf8');
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(host).toContain("id: 'areaPerimeter'");
    expect(host).toContain('areaPerimeter: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_areaperimeter.js'");
  });
});
