import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const SEED = 83;
const state = (extra = {}) => ({ view: 'mathBlueprint', mb_mode: 'practice', sym2_m_seed: SEED, ...extra });
const core = () => window.__WeldLabCore.sym2;
const problem = (kind, round = 0) => core().gen(kind, core().mixSeed(SEED, core().KINDS.indexOf(kind), round));
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
const given = (figure, key) => Number(figure.querySelector(`[data-weld-math-given="${key}"]`).getAttribute('data-value'));
const figure = (host, kind) => host.querySelector(`[data-weld-math-visual="${kind}"]`);

async function mount() {
  document.body.innerHTML = '<div id="math-visual-root"></div>';
  let latest;
  function App() {
    const [data, setData] = React.useState({ weldLab: state() });
    latest = data.weldLab;
    return window.StemLab._registry.weldLab.render(makeCtx({
      toolData: data, setToolData: setData,
      update: (tool, key, value) => setData(prev => ({ ...prev, [tool]: { ...prev[tool], [key]: value } }))
    }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('math-visual-root'));
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(text, scope) {
  const button = [...scope.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
  expect(button, text).toBeTruthy();
  await React.act(() => button.click());
}
async function enter(input, value) {
  await React.act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Dimensioned math practice drawings', () => {
  it('draws the actual randomized plate, frame and filler givens without exposing solutions', () => {
    const host = render();
    const plate = figure(host, 'plateWeight'), pp = problem('plateWeight').p;
    expect(given(plate, 'length')).toBe(pp.L);
    expect(given(plate, 'width')).toBe(pp.W);
    expect(given(plate, 'thickness')).toBe(pp.tn / pp.td);
    expect(plate.querySelector('svg').textContent).toContain(`${pp.L} in`);
    expect(plate.querySelector('svg').textContent).toContain(`${pp.W} in`);
    expect(plate.querySelector('svg').textContent).toContain(`${core().frac(pp.tn / pp.td)} in`);
    const frame = figure(host, 'square'), sp = problem('square').p;
    expect(given(frame, 'side-a')).toBe(sp.a);
    expect(given(frame, 'side-b')).toBe(sp.b);
    const weld = figure(host, 'filler'), fp = problem('filler').p;
    expect(given(weld, 'leg')).toBe(fp.ln / fp.ld);
    expect(given(weld, 'weld-length')).toBe(fp.ft);
    expect(given(weld, 'efficiency')).toBe(core().DEP_EFF[fp.proc]);
    for (const kind of ['plateWeight', 'square', 'filler']) {
      const image = figure(host, kind);
      expect(image.getAttribute('data-weld-math-reveal')).toBe('hidden');
      expect(image.querySelector('[data-weld-math-worked-values]')).toBeNull();
      expect(image.innerHTML).not.toContain(problem(kind).answer.toFixed(2));
      expect(image.querySelector('svg').getAttribute('aria-label')).toBeTruthy();
    }
    expect(weld.textContent).toContain('Throat');
    expect(weld.textContent).toContain('length is compressed');
  });

  it('keeps frame side proportions faithful to its dimensions', () => {
    const svg = figure(render(), 'square').querySelector('svg');
    const outline = svg.querySelector('rect[stroke-width="13"]');
    const p = problem('square').p;
    expect(Number(outline.getAttribute('width')) / Number(outline.getAttribute('height'))).toBeCloseTo(p.a / p.b, 8);
  });

  it('draws the perpendicular fillet throat separately from the two equal legs', () => {
    const svg = figure(render(), 'filler').querySelector('svg');
    const throat = svg.querySelector('line[stroke-dasharray="4 3"]');
    const dx = Number(throat.getAttribute('x2')) - Number(throat.getAttribute('x1'));
    const dy = Number(throat.getAttribute('y2')) - Number(throat.getAttribute('y1'));
    // The front face runs (80,94) → (160,174), slope +1.
    expect(dx * 80 + dy * 80).toBe(0);
    expect(svg.textContent.match(new RegExp(core().frac(problem('filler').p.ln / problem('filler').p.ld).replace('/', '\\/'), 'g')).length).toBe(2);
  });

  it('shows worked geometric values only after an explicit solution or correct check', async () => {
    const current = await mount();
    const card = document.querySelector('[data-sym2-math="filler"]');
    await enter(card.querySelector('input'), '-1');
    await click('Check answer', card);
    expect(figure(card, 'filler').getAttribute('data-weld-math-reveal')).toBe('hidden');
    expect(current().sym2_m_tries).toBe(1);
    await click('Show the worked solution', card);
    expect(figure(card, 'filler').getAttribute('data-weld-math-reveal')).toBe('shown');
    expect(figure(card, 'filler').querySelector('[data-weld-math-worked-values]')).toBeTruthy();
    expect(figure(card, 'filler').textContent).toContain(`${problem('filler').answer.toFixed(2)} lb`);
    expect(current().sym2_m_tries).toBe(1);
    await click('New numbers', card);
    expect(current().sym2_m_rounds.filler).toBe(1);
    expect(figure(card, 'filler').getAttribute('data-weld-math-reveal')).toBe('hidden');
    const next = problem('filler', 1).p;
    expect(given(figure(card, 'filler'), 'leg')).toBe(next.ln / next.ld);
    expect(given(figure(card, 'filler'), 'weld-length')).toBe(next.ft);
  });

  it('reveals the checked plate volume after a correct answer while preserving first-try scoring', async () => {
    const current = await mount();
    const card = document.querySelector('[data-sym2-math="plateWeight"]');
    const prob = problem('plateWeight');
    await enter(card.querySelector('input'), prob.answer);
    await click('Check answer', card);
    expect(figure(card, 'plateWeight').getAttribute('data-weld-math-reveal')).toBe('shown');
    expect(figure(card, 'plateWeight').textContent).toContain(`${(prob.p.L * prob.p.W * prob.p.tn / prob.p.td).toFixed(3)} in³`);
    expect(current().sym2_m_score).toBe(1);
    expect(current().sym2_m_tries).toBe(1);
  });

  it('provides contrast-safe dark drawings and a textual equivalent of every dimension', () => {
    const host = render({}, true);
    for (const kind of ['plateWeight', 'square', 'filler']) {
      const image = figure(host, kind), svg = image.querySelector('svg');
      expect(svg.style.background).toBe('rgb(0, 0, 0)');
      expect(svg.getAttribute('role')).toBe('img');
      expect(image.querySelectorAll('[data-weld-math-given]').length).toBeGreaterThanOrEqual(2);
      expect(image.innerHTML).not.toMatch(/NaN|Infinity/);
    }
  });
});
