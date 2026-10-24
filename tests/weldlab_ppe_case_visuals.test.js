import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const state = (extra = {}) => ({ view: 'ppeSafety', ps_view: 'scenarios', ...extra });
const correctSlots = [2, 0, 3, 1, 0, 2, 1];
let root;

beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) { await React.act(() => root.unmount()); root = null; }
});
function render(extra = {}, contrast = false) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('weldLab', { weldLab: state(extra) }, { isContrast: contrast });
  return host;
}
async function mount(extra = {}) {
  document.body.innerHTML = '<div id="ppe-case-root"></div>';
  let latest;
  const updates = [];
  function App() {
    const [data, setData] = React.useState({ weldLab: state(extra) });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => { updates.push([key, value]); setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } })); }
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('ppe-case-root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest, updates };
}
const scene = (host = document) => host.querySelector('[data-ppe-case-scene]');
const responses = () => [...document.querySelector('[role="radiogroup"][aria-label="Response choices"]').querySelectorAll('button')];
const btn = (text) => [...document.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
async function click(button) { expect(button).toBeTruthy(); await React.act(() => button.click()); }
async function detail(index) { await click(document.querySelector(`[data-ppe-case-detail="${index}"]`)); }

describe('PPE illustrated case details', () => {
  it.each([0, 1, 2, 3, 4, 5, 6])('gives scenario %i a distinct neutral scene and three native detail controls', (index) => {
    const host = render({ safe2_scIdx: index });
    const board = scene(host);
    expect(board.dataset.ppeCaseScene).toBe(`sc${index + 1}`);
    expect(board.querySelector('svg').dataset.ppeCaseDiagram).toBe(`sc${index + 1}`);
    expect(board.querySelectorAll('[data-ppe-case-marker]')).toHaveLength(3);
    expect(board.querySelectorAll('button')).toHaveLength(3);
    expect(board.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
    expect(board.dataset.ppeCaseFocus).toBe('0');
    expect(board.querySelector('svg').getAttribute('aria-label')).toContain('Numbered markers match');
    expect(board.innerHTML).not.toMatch(/NaN|Infinity|bg-emerald|border-emerald|revealOk|correct-response/);
    // The scene repeats the situation. It does not reveal a response or a
    // mechanism that the authored answer explanation teaches after selection.
    expect(board.textContent).not.toMatch(/35 ft|19\.5|oxygen|metal fume fever|gas test|replace the cable|Best response/);
    expect(board.querySelector('animate')).toBeNull();
    for (const control of board.querySelectorAll('button')) {
      expect(control.tagName).toBe('BUTTON');
      expect(control.style.minHeight).toBe('44px');
    }
  });

  it('lets every case detail be inspected and remembers local focus without touching scored answers', async () => {
    const app = await mount();
    app.updates.length = 0;
    const originalChoices = responses().map(b => b.textContent);
    const fragments = ['mid-pass on a MIG joint', 'without a helmet', 'grab a wrench'];
    for (let index = 0; index < 3; index++) {
      await detail(index);
      expect(scene().dataset.ppeCaseFocus).toBe(String(index));
      expect(scene().querySelector('[data-ppe-case-fact]').textContent).toContain(fragments[index]);
      expect(scene().querySelector(`[data-ppe-case-detail="${index}"]`).getAttribute('aria-pressed')).toBe('true');
      expect(scene().querySelectorAll('[data-ppe-case-marker] circle[stroke-dasharray]')).toHaveLength(1);
      expect(responses().map(b => b.textContent)).toEqual(originalChoices);
    }
    expect(app.updates).toEqual([]);
    expect(app.state().safe2_scPick).toBeUndefined();
    expect(document.body.textContent).toContain('Score: 0 / 0 answered');
    await click(btn('Scenario 2'));
    expect(scene().dataset.ppeCaseFocus).toBe('0');
    await detail(2);
    expect(scene().querySelector('[data-ppe-case-fact]').textContent).toContain('no fume extractor or respirator');
    await click(btn('Scenario 1'));
    expect(scene().dataset.ppeCaseFocus).toBe('2');
    expect(app.updates.every(([key]) => key === 'safe2_scIdx')).toBe(true);
    expect(app.state().safe2_scPick).toBeUndefined();
  });

  it('preserves the original first-answer lock and feedback reveal after neutral inspection', async () => {
    const app = await mount();
    await detail(2);
    const boardBeforeAnswer = scene().innerHTML;
    expect(document.body.textContent).not.toContain('Anyone with a line of sight to the arc needs protection');
    await click(responses()[0]); // Scenario 1 deliberately incorrect; key stays in C.
    expect(app.state().safe2_scPick).toEqual({ 0: 0 });
    expect(document.body.textContent).toContain('Score: 0 / 1 answered');
    expect(document.body.textContent).toContain('Anyone with a line of sight to the arc needs protection');
    expect(document.body.textContent).toContain('Not the best response');
    expect(responses().every(b => b.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(scene().innerHTML).toBe(boardBeforeAnswer);
    await click(responses()[correctSlots[0]]);
    expect(app.state().safe2_scPick).toEqual({ 0: 0 });
    expect(document.body.textContent).toContain('Score: 0 / 1 answered');
  });

  it('keeps the seven authored answer positions and summary/reset behavior intact', async () => {
    const picks = Object.fromEntries(correctSlots.map((slot, index) => [index, slot]));
    const app = await mount({ safe2_scIdx: 6, safe2_scPick: picks });
    expect(document.body.textContent).toContain('7 of 7 best responses on the first try');
    expect(scene().dataset.ppeCaseScene).toBe('sc7');
    await detail(1);
    expect(scene().querySelector('[data-ppe-case-fact]').textContent).toContain('bare copper');
    await click(btn('↺ Reset scenarios and score'));
    expect(app.state().safe2_scPick).toEqual({});
    expect(scene().dataset.ppeCaseScene).toBe('sc1');
    expect(document.body.textContent).toContain('Score: 0 / 0 answered');
    await click(responses()[correctSlots[0]]);
    expect(document.body.textContent).toContain('Score: 1 / 1 answered');
    expect(document.body.textContent).toContain('Best response. Each option above now shows why');
  });

  it('repeats existing tank/drum/symptom facts without adding the later explanatory mechanisms', async () => {
    await mount({ safe2_scIdx: 4 });
    await detail(1);
    expect(scene().textContent).toContain('open hatch on top');
    await detail(2);
    expect(scene().textContent).toContain('argon hose has a slow leak');
    expect(scene().textContent).not.toMatch(/sinks|pools|heavier|oxygen|supplied air/);
    await click(btn('Scenario 4'));
    await detail(2);
    expect(scene().textContent).toContain('steam-cleaned last week');
    expect(scene().textContent).not.toMatch(/explod|vapor|vented|calibrated/);
    await click(btn('Scenario 6'));
    await detail(1);
    expect(scene().textContent).toContain('chills, a fever, and aching muscles');
    expect(scene().textContent).not.toMatch(/metal fume fever|milk|medical|treat|report it/);
  });

  it('uses an explicit contrast palette and a readable HTML fact equivalent', () => {
    const host = render({ safe2_scIdx: 6 }, true), board = scene(host);
    expect(board.querySelector('svg').style.background).toBe('rgb(0, 0, 0)');
    expect(board.style.background).toBe('rgb(0, 0, 0)');
    expect(board.querySelector('h3').style.color).toBe('rgb(255, 255, 0)');
    expect(board.querySelector('[data-ppe-case-fact]').style.color).toBe('rgb(255, 255, 255)');
    expect(board.querySelector('button').style.background).toBe('rgb(0, 0, 0)');
    expect(board.querySelector('button').style.color).toBe('rgb(255, 255, 0)');
    expect(board.querySelector('[data-ppe-case-detail="1"]').style.color).toBe('rgb(255, 255, 255)');
    expect(board.querySelector('svg text').getAttribute('fill')).toBe('#ffff00');
    expect(board.querySelector('[data-ppe-case-fact]').textContent).toContain('floor by the bay door wet');
    expect(board.querySelector('[role="group"]').getAttribute('aria-label')).toBe('Choose a case detail to inspect');
  });
});
