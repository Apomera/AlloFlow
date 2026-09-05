import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let root;
beforeEach(() => { resetStemLab(); document.body.innerHTML = '<div id="root"></div>'; });
afterEach(async () => { if (root) await React.act(() => root.unmount()); root = null; });
function load(file, id) { return loadTool('stem_lab/stem_tool_' + file + '.js', id); }
async function mount(file, id, initial) {
  const tool = load(file, id);
  let latest;
  function App() {
    const [state, setState] = React.useState(initial);
    latest = state;
    return tool.render(makeCtx({ toolData: state, labToolData: state, setToolData: setState, setLabToolData: setState }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
async function click(label) {
  const button = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label);
  expect(button, label).toBeTruthy();
  await React.act(() => button.click());
}

describe('basic math learning refinements', () => {
  it('conserves value through carrying and borrowing across zero', async () => {
    await mount('arithmetic', 'arithmeticStudio', { _arithmeticStudio: { operation: 'subtract', a: 102, b: 38 } });
    const total = () => Number(document.querySelector('[data-model-total]').dataset.modelTotal);
    expect(total()).toBe(102);
    await click('Next step');
    expect(total()).toBe(102);
    expect(document.querySelector('[data-place="10"]').dataset.count).toBe('10');
    await click('Next step');
    expect(total()).toBe(102);
    expect(document.querySelector('[data-place="1"]').dataset.count).toBe('12');
    await click('Next step');
    expect(total()).toBe(64);
    expect(document.querySelector('[data-place="10"]').dataset.count).toBe('6');
    expect(document.querySelector('[data-place="1"]').dataset.count).toBe('4');
  });

  it('carries into a new place while preserving the sum', async () => {
    await mount('arithmetic', 'arithmeticStudio', { _arithmeticStudio: { operation: 'add', a: 58, b: 67 } });
    await click('Next step');
    expect(document.querySelector('[data-model-total]').dataset.modelTotal).toBe('125');
    await click('Next step');
    expect(document.querySelector('[data-place="100"]').dataset.count).toBe('1');
    expect(document.querySelector('[data-place="10"]').dataset.count).toBe('2');
    expect(document.querySelector('[data-place="1"]').dataset.count).toBe('5');
  });

  it('distinguishes grouping from sharing with the same dividend and remainder', async () => {
    await mount('arithmetic', 'arithmeticStudio', { _arithmeticStudio: { operation: 'divide', a: 17, b: 5 } });
    expect(document.querySelector('[data-division-groups]').dataset.divisionGroups).toBe('3');
    expect(document.querySelector('[data-group-size]').dataset.groupSize).toBe('5');
    await click('Share among a given number of groups');
    expect(document.querySelector('[data-division-groups]').dataset.divisionGroups).toBe('5');
    expect(document.querySelector('[data-group-size]').dataset.groupSize).toBe('3');
    expect(document.querySelector('[data-division-remainder]').dataset.divisionRemainder).toBe('2');
  });

  it('draws partial products proportionally and accounts for the whole', () => {
    load('arithmetic', 'arithmeticStudio');
    document.body.innerHTML = renderTool('arithmeticStudio', { _arithmeticStudio: { operation: 'multiply', a: 23, b: 14 } });
    const parts = [...document.querySelectorAll('[data-partial-product]')];
    expect(parts.map(p => Number(p.dataset.partialProduct))).toEqual([200, 80, 30, 12]);
    expect(Number(parts[0].getAttribute('width')) / Number(parts[1].getAttribute('width'))).toBeCloseTo(10 / 4);
    expect(Number(parts[0].getAttribute('height')) / Number(parts[2].getAttribute('height'))).toBeCloseTo(20 / 3);
  });

  it.each([[3, 8, '37.5%', '0.375'], [1, 3, '≈ 33.333%', '≈ 0.333']])('marks fraction rounding honestly for %i/%i', (numerator, denominator, percent, decimal) => {
    load('fractions', 'fractionViz');
    document.body.innerHTML = renderTool('fractionViz', { _fractions: { pieces: { numerator, denominator } } });
    const summary = [...document.querySelectorAll('.fraction-lab-summary-tile')].map(el => el.textContent).join(' ');
    expect(summary).toContain(percent);
    expect(summary).toContain(decimal);
  });

  it.each([1, 0])('conserves the represented quantity when changing units (%i)', value => {
    load('unitconvert', 'unitConvert');
    document.body.innerHTML = renderTool('unitConvert', { unitConvert: { tab: 'convert', category: 'length', value, fromUnit: 'm', toUnit: 'cm' } });
    const bars = [...document.querySelectorAll('[data-equal-quantity-bar]')];
    expect(bars).toHaveLength(2);
    expect(bars.map(el => el.style.width)).toEqual([value ? '100%' : '0%', value ? '100%' : '0%']);
  });

  it('moves the clock one hour across midnight and provides optional minute labels', async () => {
    const state = await mount('timeschedule', 'timeSchedule', { _timeSchedule: { clockMinutes: 1410, showMinuteLabels: true } });
    await click('+1 hr');
    expect(state()._timeSchedule.clockMinutes).toBe(30);
    await click('−1 hr');
    expect(state()._timeSchedule.clockMinutes).toBe(1410);
    expect(document.querySelector('#ts-main-clock-title').closest('svg').textContent).toContain('55');
  });

  it('lets learners predict measurements, reveal them, and trace one edge at a time', async () => {
    const state = await mount('areaperimeter', 'areaPerimeter', { _areaPerimeter: { width: 4, height: 3 } });
    await click('Predict first');
    expect(state()._areaPerimeter.predictMeasurements).toBe(true);
    expect(document.querySelector('#ap-explore-desc').textContent).not.toContain('perimeter is');
    await click('Trace the next edge');
    expect(state()._areaPerimeter.boundaryStep).toBe(1);
    await click('Reveal measurements');
    expect(state()._areaPerimeter.measurementsShown).toBe(true);
    expect(document.querySelector('#ap-explore-desc').textContent).toContain('perimeter is');
  });

  it('connects a fresh ratio model to the next problem without filling the unknown', async () => {
    await mount('ratios', 'ratioLab', {});
    let model = document.querySelector('[data-ratio-problem-model]');
    expect(model.dataset.ratioProblemModel).toBe('ratio-paint');
    expect(model.querySelector('tbody').textContent).toBe('35?20');
    model.open = true;
    await click('Next challenge');
    model = document.querySelector('[data-ratio-problem-model]');
    expect(model.dataset.ratioProblemModel).toBe('ratio-simplify');
    expect(model.open).toBe(false);
    expect(model.querySelector('tbody').textContent).toBe('1824??');
  });

  it('keeps every manipulative available and starts a concrete regrouping activity', async () => {
    const state = await mount('manipulatives', 'base10', {});
    const chooser = [...document.querySelectorAll('select')].find(el => el.querySelector('optgroup'));
    expect(chooser.querySelectorAll('option')).toHaveLength(26);
    await click('Start with 14 ones');
    expect(state()._manipulatives.b10).toEqual({ ones: 14, tens: 0, hundreds: 0, thousands: 0 });
  });

  it('opens the chosen multiplication fact and keeps teacher simulation separate', async () => {
    const state = await mount('multtable', 'multtable', { _multExt: { visualA: 6, visualB: 7 } });
    expect(document.querySelector('[data-full-fact-table]').open).toBe(false);
    expect(document.querySelector('[data-teacher-mastery-demo]').open).toBe(false);
    await click('Build this fact');
    expect(state()._multExt.mtTab).toBe('visual');
    expect(state()._multExt.visualA).toBe(6);
    expect(state()._multExt.visualB).toBe(7);
  });
});
