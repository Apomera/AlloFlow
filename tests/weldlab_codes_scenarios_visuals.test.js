import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const IDS = ['fno', 'amps', 'thick', 'gas', 'pos', 'process', 'dia', 'speed', 'pno', 'transfer'];
const KINDS = ['rod', 'ruler', 'thickness', 'gas', 'position', 'wire', 'diameter', 'ruler', 'metal', 'mode'];
const state = extra => ({ view: 'codes', insp2_codesTab: 'sort', ...extra });
let root, host;
beforeEach(() => {
  delete window.__alloflowWeldLab;
  localStorage.clear();
  resetStemLab();
  loadTool(SRC, 'weldLab');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null; host?.remove();
});
function render(extra = {}, contrast = false) {
  const node = document.createElement('div');
  node.innerHTML = renderTool('weldLab', { weldLab: state(extra) }, { isContrast: contrast });
  return node;
}
async function mount(extra = {}) {
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
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await React.act(() => root.render(React.createElement(App)));
  updates.length = 0;
  return { state: () => latest, updates };
}
const bench = (node = host) => node.querySelector('[data-codes-change-bench]');
async function click(button) {
  const element = typeof button === 'string' ? host.querySelector(button) : button;
  expect(element).toBeTruthy();
  await React.act(() => element.click());
}
const buttonText = text => [...host.querySelectorAll('button')].find(button => button.textContent === text);
const answer = bin => host.querySelector('[aria-label="Sort this change"]').querySelectorAll('button')[bin === 'req' ? 0 : 1];

describe('Codes sorter scenario comparison bench', () => {
  it('grounds all ten existing prompts in neutral reference and proposal figures without answer explanations', () => {
    IDS.forEach((id, index) => {
      const node = render({ insp2_sortIdx: index });
      const pane = bench(node);
      expect(pane.dataset.codesChangeBench).toBe(id);
      expect(pane.dataset.view).toBe('compare');
      expect(pane.querySelectorAll('[data-codes-change-side]')).toHaveLength(2);
      expect(pane.querySelectorAll('[data-codes-change-view]')).toHaveLength(3);
      expect(pane.querySelectorAll('[data-codes-change-graphic]')).toHaveLength(2);
      for (const graphic of pane.querySelectorAll('svg')) {
        expect(graphic.dataset.graphicKind).toBe(KINDS[index]);
        expect(graphic.getAttribute('role')).toBe('img');
        expect(graphic.getAttribute('aria-label')).toMatch(/^(Reference|Proposal): /);
        expect(graphic.querySelector('animate, animateTransform, image')).toBeNull();
      }
      expect(pane.textContent).not.toMatch(/requalif|nonessential|essential variable|QW-|qualified range|new PQR|WPQ|3\/4 in/i);
      expect(pane.innerHTML).not.toMatch(/data-correct|data-answer|data-requires/);
      const radios = node.querySelector('[aria-label="Sort this change"]').querySelectorAll('button');
      expect([...radios].every(radio => !radio.disabled && radio.getAttribute('aria-checked') === 'false')).toBe(true);
    });
  });

  it('switches manual comparison views without saving answers, changing scores, or changing the current card', async () => {
    const saved = { insp2_sortIdx: 2, insp2_sort: { fno: 'req' }, insp2_clause: { 0: 2 }, insp2_wpsField: 'gas', codes_pick: 'asme9' };
    const app = await mount(saved);
    await click('[data-codes-change-view="reference"]');
    expect(bench().dataset.view).toBe('reference');
    expect(bench().querySelector('[data-codes-reference="thick"]')).toBeTruthy();
    expect(bench().querySelector('[data-codes-proposal]')).toBeNull();
    await click('[data-codes-change-view="proposal"]');
    expect(bench().querySelector('[data-codes-reference]')).toBeNull();
    expect(bench().querySelector('[data-codes-proposal="thick"]')).toBeTruthy();
    await click('[data-codes-change-view="compare"]');
    expect(bench().querySelectorAll('[data-codes-change-side]')).toHaveLength(2);
    expect(app.updates).toEqual([]);
    for (const [key, value] of Object.entries(saved)) expect(app.state()[key]).toEqual(value);
    await click(buttonText('Next ➡️'));
    expect(app.state().insp2_sortIdx).toBe(3);
    expect(bench().dataset.codesChangeBench).toBe('gas');
    expect(bench().dataset.view).toBe('compare');
    expect(app.state().insp2_sort).toEqual(saved.insp2_sort);
  });

  it('keeps thickness and diameter geometry on identical physical scales without inventing qualified limits', () => {
    const thickness = bench(render({ insp2_sortIdx: 2 }));
    const coupon = thickness.querySelector('[data-codes-thickness="0.375"]');
    const proposed = thickness.querySelector('[data-codes-thickness="1.5"]');
    expect(Number(proposed.getAttribute('height')) / Number(coupon.getAttribute('height'))).toBe(4);
    expect(Number(coupon.getAttribute('y')) + Number(coupon.getAttribute('height'))).toBe(139);
    expect(Number(proposed.getAttribute('y')) + Number(proposed.getAttribute('height'))).toBe(139);
    expect(thickness.textContent).not.toContain('3/4');
    const diameter = bench(render({ insp2_sortIdx: 6 }));
    const [min, max] = [...diameter.querySelector('[data-codes-reference]').querySelectorAll('[data-codes-diameter]')];
    const mid = diameter.querySelector('[data-codes-proposal] [data-codes-diameter]');
    expect(Number(max.getAttribute('r')) / Number(min.getAttribute('r'))).toBeCloseTo(5 / 3, 10);
    expect(Number(mid.getAttribute('r'))).toBe((Number(min.getAttribute('r')) + Number(max.getAttribute('r'))) / 2);
    expect(thickness.querySelector('[data-codes-change-scale]')).toBeTruthy();
    expect(diameter.querySelector('[data-codes-change-scale]')).toBeTruthy();
  });

  it('uses the question’s exact numeric ranges and proposals on matching rulers', () => {
    for (const [index, range, proposal, scale] of [[1, [120, 150], 135, 160], [7, [8, 14], 12, 16]]) {
      const pane = bench(render({ insp2_sortIdx: index }));
      const bar = pane.querySelector('[data-codes-numeric-range]'), marker = pane.querySelector('[data-codes-numeric-proposal]');
      expect(bar.dataset.codesNumericRange).toBe(range.join(':'));
      expect(marker.dataset.codesNumericProposal).toBe(String(proposal));
      expect(Number(bar.getAttribute('x'))).toBeCloseTo(25 + 210 * range[0] / scale, 9);
      expect(Number(bar.getAttribute('width'))).toBeCloseTo(210 * (range[1] - range[0]) / scale, 9);
      expect(marker.getAttribute('d')).toContain('M' + (25 + 210 * proposal / scale));
      expect(pane.querySelector('[data-codes-change-value="proposal"]').textContent).toContain(String(proposal));
    }
  });

  it('shows exact gas shares and distinguishes orientation, filler groups, base groups, wire and transfer without a verdict', () => {
    const gas = bench(render({ insp2_sortIdx: 3 }));
    const arc = gas.querySelector('[data-codes-argon-share="75"]');
    expect(Number(arc.getAttribute('stroke-dasharray').split(' ')[0]) / (2 * Math.PI * 43)).toBeCloseTo(0.75, 12);
    expect(gas.querySelector('[data-codes-proposal]').textContent).toContain('Argon: 0%');
    expect(gas.querySelector('[data-codes-proposal]').textContent).toContain('CO2: 100%');
    expect(gas.querySelector('[data-codes-proposal] [data-codes-argon-share]')).toBeNull();
    const position = bench(render({ insp2_sortIdx: 4 }));
    expect(position.querySelector('[data-codes-position="flat"]')).toBeTruthy();
    expect(position.querySelector('[data-codes-position="overhead"]')).toBeTruthy();
    expect(position.querySelectorAll('[data-codes-gravity="down"]')).toHaveLength(2);
    expect(position.textContent).not.toMatch(/WPQ|qualifies all|toughness/);
    const wire = bench(render({ insp2_sortIdx: 5 }));
    expect(wire.querySelector('[data-codes-wire="solid"]')).toBeTruthy();
    expect(wire.querySelector('[data-codes-wire="cored"]')).toBeTruthy();
    expect(bench(render({ insp2_sortIdx: 0 })).textContent).toContain('E7018 · F-No. 4');
    expect(bench(render({ insp2_sortIdx: 8 })).querySelector('[data-codes-pnumber="8"]')).toBeTruthy();
    expect(bench(render({ insp2_sortIdx: 9 })).textContent).toContain('GMAW short-circuit transfer');
  });

  it('preserves all ten first-call answers and the existing score, with feedback only after committing', async () => {
    const app = await mount();
    const cases = window.__WeldLabCore.INSP2_SORT;
    const initialBench = bench().outerHTML;
    expect(host.textContent).not.toContain('F-Numbers group electrodes by how they run');
    await click(answer('ok'));
    expect(app.state().insp2_sort).toEqual({ fno: 'ok' });
    expect(host.textContent).toContain('F-Numbers group electrodes by how they run');
    expect(bench().outerHTML).toBe(initialBench);
    await click(answer('req'));
    expect(app.state().insp2_sort.fno).toBe('ok');
    for (let index = 1; index < cases.length; index++) {
      await click(buttonText('Next ➡️'));
      expect(bench().dataset.codesChangeBench).toBe(cases[index].id);
      await click(answer(cases[index].req ? 'req' : 'ok'));
    }
    expect(Object.keys(app.state().insp2_sort)).toHaveLength(10);
    expect(host.textContent).toContain('Score 9 / 10');
    expect(host.textContent).toContain('All 10 cards sorted: 9 right.');
    await click(buttonText('🔄 Reset sorter'));
    expect(app.state().insp2_sort).toEqual({});
    expect(app.state().insp2_sortIdx).toBe(0);
    expect(host.textContent).not.toContain('F-Numbers group electrodes by how they run');
  });

  it('leaves clause-finder commits and explanations untouched and mounts only in the sorter', async () => {
    for (const tab of ['read', 'flow', 'clause']) expect(render({ insp2_codesTab: tab }).querySelector('[data-codes-change-bench]')).toBeNull();
    const app = await mount({ insp2_codesTab: 'clause' });
    expect(host.textContent).not.toContain('Clause 8 Inspection holds the acceptance criteria');
    const radios = host.querySelector('[aria-label="Pick the clause"]').querySelectorAll('button');
    await click(radios[0]);
    expect(app.state().insp2_clause).toEqual({ 0: 0 });
    expect(host.textContent).toContain('Clause 8 Inspection holds the acceptance criteria');
    await click(radios[1]);
    expect(app.state().insp2_clause).toEqual({ 0: 0 });
    expect(host.querySelector('[data-codes-change-bench]')).toBeNull();
  });

  it('normalizes hostile saved selections through original rules without granting answer credit', () => {
    const node = render({ codes_pick: 'unknown', insp2_sortIdx: 'bad', insp2_sort: { fno: 'yes', nonsense: 'req' }, insp2_clause: { 0: 'bad' } });
    expect(bench(node).dataset.codesChangeBench).toBe('fno');
    expect(node.textContent).toContain('Score 0 / 0');
    expect(node.textContent).not.toContain('F-Numbers group electrodes by how they run');
    expect(bench(node).innerHTML).not.toMatch(/NaN|Infinity|\[object Object\]/);
    expect(bench(render({ insp2_sortIdx: 999 })).dataset.codesChangeBench).toBe('transfer');
  });

  it('provides explicit contrast, native 44px controls and flexible diagrams with HTML value equivalents', async () => {
    const node = render({}, true), pane = bench(node);
    expect(pane.style.background).toBe('rgb(0, 0, 0)');
    expect(pane.style.color).toBe('rgb(255, 255, 255)');
    for (const button of pane.querySelectorAll('[data-codes-change-view]')) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.style.minHeight).toBe('44px');
    }
    const selected = pane.querySelector('[data-codes-change-view="compare"]');
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(selected.style.background).toBe('rgb(255, 255, 0)');
    expect(selected.style.color).toBe('rgb(0, 0, 0)');
    for (const card of pane.querySelectorAll('[data-codes-change-side]')) {
      expect(parseFloat(card.style.minWidth)).toBe(0);
      expect(card.querySelector('svg').style.width).toBe('100%');
      expect(card.querySelector('[data-codes-change-value]')).toBeTruthy();
    }
    await mount();
    const control = host.querySelector('[data-codes-change-view="reference"]');
    control.focus(); expect(document.activeElement).toBe(control);
  });
});
