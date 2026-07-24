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
    expect(pure.challengeIds).toHaveLength(10);
    expect(pure.challengeIds[0]).toBe('garden-area');
    expect(pure.normalizeChallengeProgress({ 0: true, 'frame-perimeter': true, bogus: true })).toEqual({
      'garden-area': true,
      'frame-perimeter': true,
    });
    expect(pure.challengeProgressCount({ 0: true, 'garden-area': true, 4: true })).toBe(2);
    expect(pure.isValidTileKey('1-1', 2, 2)).toBe(true);
    expect(pure.isValidTileKey('-1-0', 2, 2)).toBe(false);
    expect(pure.isValidTileKey('1.5-0', 2, 2)).toBe(false);
    expect(pure.isValidTileKey('01-0', 2, 2)).toBe(false);
    expect(pure.countValidTiles({ '0-0': true, '00-0': true, '1-1': true, '-1-0': true, '2-0': true, bogus: true }, 2, 2)).toBe(2);
    const modeQuest = tool.questHooks.find((hook) => hook.id === 'measurement_tour');
    const challengeQuest = tool.questHooks.find((hook) => hook.id === 'challenge_five');
    expect(modeQuest.progress({ modeVisits: { explore: true, bogus: true } })).toBe('1/5 modes');
    expect(challengeQuest.progress({ solvedChallenges: { bogus: true }, score: { correct: 99 } })).toBe('0/5 solved');
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
    expect(html.match(/tabindex="0"/g)).toHaveLength(4); // active mode tab, panel, roving tile, and focusable formula scroller
    expect(html.match(/tabindex="-1"/g)).toHaveLength(9); // four mode tabs and five tiles
    expect(html).not.toContain('outline:none');
    expect(html).toContain('min-width:334px'); // preserves a 24 CSS-pixel tile target at narrow widths
  });

  it('uses high-contrast revealed and hidden tile fills in light and dark themes', () => {
    loadTool(FILE, ID);
    const state = { _areaPerimeter: { mode: 'explore', width: 2, height: 1, revealedTiles: { '0-0': true } } };
    document.body.innerHTML = renderTool(ID, state);
    expect(document.querySelector('[data-ap-tile="0-0"]').getAttribute('fill')).toBe('#0f766e');
    expect(document.querySelector('[data-ap-tile="1-0"]').getAttribute('fill')).toBe('#ccfbf1');
    document.body.innerHTML = renderTool(ID, state, { isDark: true });
    expect(document.querySelector('[data-ap-tile="0-0"]').getAttribute('fill')).toBe('#2dd4bf');
    expect(document.querySelector('[data-ap-tile="1-0"]').getAttribute('fill')).toBe('#134e4a');
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

  it('sanitizes malformed persisted tile keys before updating reveal progress', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _areaPerimeter: {
          mode: 'explore', width: 2, height: 2, revealedBest: 0,
          revealedTiles: { '0-0': true, '-1-0': true, '2-0': true, bogus: true },
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    expect(document.body.textContent).toContain('1 of 4 unit squares revealed');
    const tile = document.querySelectorAll('[data-ap-tile]')[1];
    await React.act(async () => { tile.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(latest._areaPerimeter.revealedTiles).toEqual({ '0-0': true, '1-0': true });
    expect(latest._areaPerimeter.revealedBest).toBe(2);
    await React.act(async () => { root.unmount(); });
  });

  it('draws equal-area and challenge rectangles with a uniform unit scale', () => {
    loadTool(FILE, ID);
    const factors = renderTool(ID, { _areaPerimeter: { mode: 'investigate', targetArea: 24 } });
    document.body.innerHTML = factors;
    const factorRects = [...document.querySelectorAll('rect[data-factor-pair]')];
    expect(factorRects).toHaveLength(4);
    const pixelAreas = factorRects.map((rect) => Number(rect.getAttribute('width')) * Number(rect.getAttribute('height')));
    expect(Math.max(...pixelAreas) - Math.min(...pixelAreas)).toBeLessThan(0.000001);
    expect(new Set(factorRects.map((rect) => rect.getAttribute('data-square-unit'))).size).toBe(1);

    const challenge = renderTool(ID, { _areaPerimeter: { mode: 'challenge', challengeIndex: 0 } });
    document.body.innerHTML = challenge;
    const rectangle = document.querySelector('rect[data-challenge-shape="rectangle"]');
    expect(rectangle).toBeTruthy();
    expect(Number(rectangle.getAttribute('width')) / Number(rectangle.getAttribute('height'))).toBeCloseTo(7 / 4, 6);

    const secondChallenge = renderTool(ID, { _areaPerimeter: { mode: 'challenge', challengeIndex: 1 } });
    expect(secondChallenge).toContain('picture frame');
    expect(secondChallenge).toContain('Perimeter');
  });

  it('scores each deterministic challenge once under rapid activation', async () => {
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
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._areaPerimeter.solvedChallenges['garden-area']).toBe(true);
    expect(latest._areaPerimeter.solvedChallenges['0']).toBeUndefined();
    expect(latest._areaPerimeter.score).toEqual({ correct: 1, attempts: 1 });
    expect(awardXP).toHaveBeenCalledWith('areaPerimeter', 5, 'Area & Perimeter challenge');
    expect(awardXP).toHaveBeenCalledTimes(1);
    const solved = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Solved');
    expect(solved).toBeTruthy();
    expect(solved.disabled).toBe(true);

    let next = [...document.querySelectorAll('button')].find((button) => button.textContent.startsWith('Next'));
    await React.act(async () => { next.click(); });
    expect(latest._areaPerimeter.challengeIndex).toBe(1);
    expect(document.body.textContent).toContain('picture frame');
    const previous = [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Previous'));
    await React.act(async () => { previous.click(); });
    expect(latest._areaPerimeter.challengeIndex).toBe(0);
    const revisitedInput = document.getElementById('ap-answer');
    expect(revisitedInput.value).toBe('28');
    expect(revisitedInput.disabled).toBe(true);
    expect(document.body.textContent).toContain('Solved previously. Area = length');
    await React.act(async () => { root.unmount(); });
  });
  it('focuses challenge difficulty and saves missed work by stable identity', async () => {
    const tool = loadTool(FILE, ID);
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _areaPerimeter: { mode: 'challenge', challengeIndex: 0, answer: '27' },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    expect(document.querySelector('[data-challenge-id=garden-area]')).toBeTruthy();

    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check answer');
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._areaPerimeter.missedChallenges).toEqual({ 'garden-area': true });
    expect(latest._areaPerimeter.score).toEqual({ correct: 0, attempts: 1 });
    expect(latest._areaPerimeter.feedback.challengeId).toBe('garden-area');
    expect(document.body.textContent).toContain('saved for retry');

    const retry = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Retry missed (1)');
    expect(retry).toBeTruthy();
    await React.act(async () => { retry.click(); });
    expect(latest._areaPerimeter.challengeId).toBe('garden-area');
    expect(latest._areaPerimeter.answer).toBe('');

    const stretch = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Stretch');
    await React.act(async () => { stretch.click(); });
    expect(latest._areaPerimeter.challengeDifficulty).toBe('stretch');
    expect(latest._areaPerimeter.challengeId).toBe('l-shape-area');
    expect(latest._areaPerimeter.challengeIndex).toBe(4);
    expect(document.querySelector('[data-challenge-id=l-shape-area]')).toBeTruthy();
    expect(document.body.textContent).toContain('An L-shape starts');
    await React.act(async () => { root.unmount(); });
  });

  it('drops stale cross-filter feedback and exposes hint and error semantics', () => {
    loadTool(FILE, ID);
    const stale = renderTool(ID, {
      _areaPerimeter: {
        mode: 'challenge', challengeDifficulty: 'stretch', challengeId: 'garden-area',
        challengeIndex: 0, answer: '28', showHint: true,
        feedback: { correct: true, challengeId: 'garden-area', text: 'Old foundation result' },
      },
    });
    document.body.innerHTML = stale;
    expect(document.querySelector('[data-challenge-id=l-shape-area]')).toBeTruthy();
    expect(document.getElementById('ap-answer').value).toBe('');
    expect(document.body.textContent).not.toContain('Old foundation result');
    expect(document.getElementById('ap-challenge-hint')).toBeNull();

    const scoped = renderTool(ID, {
      _areaPerimeter: {
        mode: 'challenge', challengeId: 'garden-area', challengeIndex: 0, showHint: true,
        feedback: { correct: false, challengeId: 'garden-area', text: 'Try the area model.' },
      },
    });
    document.body.innerHTML = scoped;
    const hintButton = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Hide hint');
    expect(hintButton.getAttribute('aria-expanded')).toBe('true');
    expect(hintButton.getAttribute('aria-controls')).toBe('ap-challenge-hint');
    expect(document.getElementById('ap-challenge-hint')).toBeTruthy();
    const input = document.getElementById('ap-answer');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('ap-challenge-prompt ap-feedback');
  });

  it('is wired into the host catalog, plugin allowlist, lazy loader, and deployment mirrors', () => {
    const host = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    const deployedHost = fs.readFileSync('desktop/web-app/public/stem_lab/stem_lab_module.js', 'utf8');
    const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
    expect(host).toContain("id: 'areaPerimeter'");
    expect(host).toContain('areaPerimeter: true');
    expect(deployedHost).toBe(host);
    expect(app).toContain("'stem_lab/stem_tool_areaperimeter.js'");
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_areaperimeter.js', 'utf8')).toBe(fs.readFileSync(FILE, 'utf8'));
    expect(fs.readFileSync(FILE, 'utf8')).not.toContain('.find.indexOf(t(');
    expect(fs.readFileSync(FILE, 'utf8')).not.toMatch(/(?:fontSize|flex):\s*t\(/);
  });
});
