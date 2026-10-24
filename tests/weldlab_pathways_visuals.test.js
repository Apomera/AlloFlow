import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(resolve('desktop/web-app/package.json'));
const { Simulate } = require('react-dom/test-utils');
const SRC = process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js';
const prediction = { a25: 'apprentice', a35: 'college', shown: true };
const state = (extra = {}) => ({ view: 'careerPaths', cp_view: 'earnings', car2_pred: prediction, ...extra });
const ids = ['apprentice', 'college', 'degree'];
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
  document.body.innerHTML = '<div id="pathways-probe-root"></div>';
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
  root = ReactDOMClient.createRoot(document.getElementById('pathways-probe-root'));
  await React.act(() => root.render(React.createElement(App)));
  return { state: () => latest, updates };
}
const values = (card) => Object.fromEntries([...card.querySelectorAll('[data-car2-probe-value]')].map(el => [el.dataset.car2ProbeValue, Number(el.dataset.value)]));
async function click(button) { expect(button).toBeTruthy(); await React.act(() => button.click()); }
async function age(value) { await React.act(() => Simulate.change(document.querySelector('[data-car2-age-control]'), { target: { value: String(value) } })); }
const model = raw => window.__WeldLabCore.car2EarnAll(raw);

function checkReadings(host, expected, selectedAge) {
  expect(host.querySelector('[data-car2-age-readings]').dataset.car2AgeReadings).toBe(String(selectedAge));
  for (const id of ids) {
    const res = expected[id], row = selectedAge > 18 ? res.rows[selectedAge - 19] : null;
    const card = host.querySelector(`[data-car2-age-route="${id}"]`);
    const actual = values(card);
    expect(actual.gross).toBeCloseTo(row ? row.gross : 0, 9);
    expect(actual.loan).toBeCloseTo(row ? row.loan : 0, 9);
    expect(actual.net).toBeCloseTo(row ? row.net : 0, 9);
    expect(actual.cumulative).toBeCloseTo(window.__WeldLabCore.car2CumAt(res, selectedAge), 9);
    expect(actual.net).toBeCloseTo(actual.gross - actual.loan, 9);
    const mark = host.querySelector(`[data-car2-age-mark="${id}"]`);
    expect(Number(mark.dataset.cumulative)).toBeCloseTo(actual.cumulative, 9);
    expect(mark.dataset.age).toBe(String(selectedAge));
    expect(card.querySelectorAll('[data-car2-age-year]')).toHaveLength(22);
    expect(card.querySelectorAll('[data-completed="true"]')).toHaveLength(selectedAge - 18);
    expect(card.querySelectorAll('[data-school="true"]')).toHaveLength(res.schoolYears);
    expect(card.querySelector('[data-car2-timeline-guide]').dataset.car2TimelineGuide).toBe(String(selectedAge));
    if (row) expect(card.querySelector('[data-car2-probe-period]').textContent).toBe(`Completed year: age ${row.age} → ${row.age + 1}`);
    else expect(card.textContent).toContain('no completed year yet');
  }
}

describe('Career Pathways shared age probe', () => {
  it('remains behind both prediction answers and the existing reveal gate', () => {
    for (const pred of [null, {}, { a25: 'degree', shown: true }, { a25: 'degree', a35: 'college', shown: false }]) {
      const host = render({ car2_pred: pred });
      expect(host.querySelector('[data-car2-age-probe]')).toBeNull();
      expect(host.querySelector('[data-car2-age-readings]')).toBeNull();
      expect(host.querySelector('[data-car2-age-chart]')).toBeNull();
      expect(host.textContent).toContain('predict before you look');
    }
    expect(render().querySelector('[data-car2-age-probe]')).toBeTruthy();
    expect(render({ cp_view: 'ladder' }).querySelector('[data-car2-age-probe]')).toBeNull();
  });

  it('moves the same age through all route rows and chart markers, including school/work and repayment boundaries', async () => {
    const app = await mount(), expected = model(null);
    app.updates.length = 0;
    for (const selectedAge of [18, 19, 20, 22, 25, 30, 32, 35, 40]) {
      await age(selectedAge);
      checkReadings(document, expected, selectedAge);
      expect(document.querySelector('[data-car2-age-guide]').dataset.car2AgeGuide).toBe(String(selectedAge));
    }
    expect(app.updates).toEqual([]);
    expect(app.state().car2_pred).toEqual(prediction);
    expect(app.state().car2_earn).toBeUndefined();
    expect(app.state().car2_ladder).toBeUndefined();
  });

  it('provides manual age stops and keeps age when a model input changes', async () => {
    const ladder = ['sense', 'd11', 'pipe6g', 'cwiElig', 'cwi', 'scwi'];
    const app = await mount({ car2_ladder: ladder, car2_lad_chk: true, car2_edit: 'degree' });
    await click(document.querySelector('[data-car2-age-stop="35"]'));
    expect(document.querySelector('[data-car2-age-stop="35"]').getAttribute('aria-pressed')).toBe('true');
    await React.act(() => Simulate.change(document.querySelector('input[aria-label="Starting wage"]'), { target: { value: '40' } }));
    expect(app.state().car2_earn.degree.wage).toBe(40);
    expect(document.querySelector('[data-car2-age-probe]').dataset.car2AgeProbe).toBe('35');
    checkReadings(document, model(app.state().car2_earn), 35);
    await React.act(() => Simulate.change(document.querySelector('input[aria-label="Overtime (hourly paths only)"]'), { target: { value: '0' } }));
    checkReadings(document, model(app.state().car2_earn), 35);
    expect(app.state().car2_pred).toEqual(prediction);
    expect(app.state().car2_ladder).toEqual(ladder);
    expect(app.state().car2_lad_chk).toBe(true);
    await click(document.querySelector('[data-car2-age-stop="18"]'));
    checkReadings(document, model(app.state().car2_earn), 18);
  });

  it('handles negative net and hostile saved assumptions through the existing model, without inventing remaining debt', async () => {
    const hostile = render({ car2_earn: { college: 'bad', degree: { years: 99, wage: NaN }, ot: Infinity, loan: {} } });
    checkReadings(hostile, model({ college: 'bad', degree: { years: 99, wage: NaN }, ot: Infinity, loan: {} }), 25);
    expect(hostile.innerHTML).not.toMatch(/NaN|Infinity/);
    const earn = { degree: { tuition: 60000, years: 6, wage: 10, raise: 0 }, loan: 15, ot: 0 };
    await mount({ car2_earn: earn });
    checkReadings(document, model(earn), 25);
    const card = document.querySelector('[data-car2-age-route="degree"]');
    expect(values(card).net).toBeLessThan(0);
    expect(values(card).cumulative).toBeLessThan(0);
    expect(card.textContent).toContain('graduation total, not a balance at the selected age');
    for (const mark of document.querySelectorAll('[data-car2-age-mark]')) expect(Number.isFinite(Number(mark.getAttribute('cy')))).toBe(true);
  });

  it('clears the probe with Predict again while keeping the pre-existing prediction workflow', async () => {
    const app = await mount();
    await age(30);
    const reset = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Predict again'));
    await click(reset);
    expect(app.state().car2_pred).toBeNull();
    expect(document.querySelector('[data-car2-age-probe]')).toBeNull();
    expect(document.querySelector('[data-car2-age-readings]')).toBeNull();
    expect(document.body.textContent).toContain('Pick an answer for both ages first');
  });

  it('uses native labelled controls and explicit contrast readings with shape-coded school/work years', () => {
    const host = render({}, true), probe = host.querySelector('[data-car2-age-probe]');
    expect(probe.style.background).toBe('rgb(0, 0, 0)');
    const input = probe.querySelector('input');
    expect(host.querySelector(`label[for="${input.id}"]`)).toBeTruthy();
    expect(input.getAttribute('aria-valuetext')).toBe('Age 25');
    for (const control of probe.querySelectorAll('input,button')) expect(control.style.minHeight).toBe('44px');
    expect(probe.querySelector('[data-car2-age-stop="25"]').style.color).toBe('rgb(255, 255, 0)');
    for (const card of host.querySelectorAll('[data-car2-age-route]')) {
      expect(card.style.background).toBe('rgb(0, 0, 0)');
      expect(card.querySelector('h5').style.color).toBe('rgb(255, 255, 0)');
      expect(card.querySelector('dt').style.color).toBe('rgb(255, 255, 255)');
      expect(card.querySelector('[data-car2-probe-value]').style.color).toBe('rgb(255, 255, 0)');
      expect(card.querySelector('svg').getAttribute('aria-label')).toContain('completed years of paid work');
    }
  });
});
