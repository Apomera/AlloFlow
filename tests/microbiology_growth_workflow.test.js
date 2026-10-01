import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let config;
let mounted;
const previousActSetting = globalThis.IS_REACT_ACT_ENVIRONMENT;
const baseConditions = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
const act = React.act;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  config = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) {
    act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActSetting;
});
function mount(seed = {}, overrides = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'growthLab', ...seed } });
    view.state = data.microbiology;
    return config.render(makeCtx({ ...overrides, toolData: data, setToolData: setData }));
  }
  mounted = view;
  act(() => view.root.render(React.createElement(Host)));
  return view;
}
function button(label) {
  const result = [...mounted.container.querySelectorAll('button')].find(node => node.textContent.trim() === label);
  expect(result, label).toBeTruthy();
  return result;
}
function click(nodeOrLabel) {
  const node = typeof nodeOrLabel === 'string' ? button(nodeOrLabel) : nodeOrLabel;
  expect(node).toBeTruthy();
  act(() => node.click());
}
function write(selector, value) {
  const node = mounted.container.querySelector(selector);
  expect(node, selector).toBeTruthy();
  const prototype = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
  return node;
}
function choose(value) { click(mounted.container.querySelector('input[name="micro-growth-prediction"][value="' + value + '"]')); }
function book() { return window.__MicrobiologyCore.growth.normalizeNotebook(mounted.state.growthInvestigation); }
function readyRun() {
  click('Does E. coli need oxygen?');
  choose('lower');
  click('Run comparison');
}
function text() { return mounted.container.textContent; }
function trialButton(index) { return mounted.container.querySelectorAll('.micro-growth-trials button')[index]; }
function key(node, value) { act(() => node.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }))); }

describe('Microbiology growth investigation workflow', { timeout: 20000 }, () => {
  it('requires both a saved control and a prediction, including an unsure prediction', () => {
    mount();
    expect(button('Run comparison').disabled).toBe(true);
    expect(button('Download notebook').disabled).toBe(true);
    choose('unsure');
    expect(book().prediction).toBe('unsure');
    expect(button('Run comparison').disabled).toBe(true);
    click('Use current conditions as control');
    expect(button('Run comparison').disabled).toBe(false);
    click('Run comparison');
    expect(book().trials).toHaveLength(1);
    expect(book().trials[0].prediction).toBe('unsure');
    expect(text()).toContain('Use the curves to build an explanation.');
    expect(mounted.container.querySelector('[data-design="none"]')).toBeTruthy();
  });

  it('records original predictions and paired conditions without changing previous evidence', () => {
    mount();
    click('Does E. coli need oxygen?');
    expect(book().control).toEqual(baseConditions);
    expect(mounted.state.growthLab.oxygen).toBe(0);
    expect(button('Run comparison').disabled).toBe(true);
    write('#gl-hypothesis', 'Oxygen may make the population higher.');
    choose('higher');
    click('Run comparison');
    const original = JSON.parse(JSON.stringify(book().trials[0]));
    const resultBefore = mounted.container.querySelector('.micro-growth-snapshots').textContent;
    expect(original).toMatchObject({ prediction: 'higher', hypothesis: 'Oxygen may make the population higher.', control: baseConditions, conditions: { ...baseConditions, oxygen: 0 } });
    expect(text()).toContain('This result differs from your prediction.');
    choose('lower');
    write('#gl-hypothesis', 'A new hypothesis');
    write('#gl-tempC', '30');
    click('Use current conditions as control');
    expect(book().control).toEqual({ ...baseConditions, tempC: 30, oxygen: 0 });
    expect(book().trials[0]).toEqual(original);
    expect(mounted.container.querySelector('.micro-growth-snapshots').textContent).toBe(resultBefore);
    click('Run comparison');
    expect(book().trials).toHaveLength(2);
    expect(book().trials[1]).toMatchObject({ prediction: 'lower', hypothesis: 'A new hypothesis', control: { ...baseConditions, tempC: 30, oxygen: 0 } });
    click(trialButton(0));
    expect(mounted.container.querySelector('[data-micro-growth-result]').getAttribute('data-micro-growth-result')).toBe(String(original.id));
    expect(text()).toContain('Original prediction: Higher population');
  });

  it('keeps environmental conditions fixed when changing organism, and restores the whole control', () => {
    mount({ growthLab: { ...baseConditions, tempC: 33, pH: 6.1, oxygen: 15 } });
    click('Use current conditions as control');
    write('#gl-profile', 'thermus');
    expect(mounted.state.growthLab).toMatchObject({ profile: 'thermus', tempC: 33, pH: 6.1, oxygen: 15 });
    choose('lower');
    click('Run comparison');
    expect(mounted.container.querySelector('[data-design="single"]').textContent).toContain('Organism profile');
    click('Restore control conditions');
    expect(mounted.state.growthLab).toMatchObject({ ...baseConditions, tempC: 33, pH: 6.1, oxygen: 15 });
  });

  it('preserves legacy notes and logs through presets, runs, control restoration and removal', () => {
    const legacy = {
      ...baseConditions,
      hypothesis: 'My old hypothesis', explanation: 'My old explanation', understood: true,
      log: [{ profile: 'Old organism', t: 20, p: 6, o: 10, state: 'Old observation' }]
    };
    mount({ growthLab: legacy });
    expect(text()).toContain('Notes from the earlier Growth Lab');
    expect(text()).toContain('My old hypothesis');
    readyRun();
    write('#gl-explanation', 'New evidence');
    click('Restore control conditions');
    click('Remove selected trial');
    expect(mounted.state.growthLab).toMatchObject({ hypothesis: legacy.hypothesis, explanation: legacy.explanation, log: legacy.log, understood: true });
    expect(book().trials).toHaveLength(0);
    expect(text()).toContain('My old explanation');
    expect(text()).toContain('Old organism · 20 · 6 · 10 · Old observation');
  });

  it('recovers malformed restored growth data without rendering nonfinite values or object text', () => {
    mount({
      growthLab: { profile: '__proto__', tempC: Infinity, pH: {}, oxygen: '100', hypothesis: {}, explanation: [], log: [null, {}, { profile: { wrong: true }, t: 20 }] },
      growthInvestigation: { control: [], trials: [null, {}, { id: 2, conditions: { profile: 'bad', tempC: NaN }, prediction: {}, explanation: {} }], selectedId: 2, hypothesis: {}, explanation: {} }
    });
    expect(mounted.container.querySelector('#gl-profile').value).toBe('ecoli');
    expect(mounted.container.querySelector('#gl-tempC').value).toBe('37');
    expect(mounted.container.querySelector('#gl-pH').value).toBe('7');
    expect(mounted.container.querySelector('#gl-oxygen').value).toBe('50');
    expect(mounted.container.querySelector('#gl-hypothesis').value).toBe('');
    expect(text()).not.toContain('NaN');
    expect(text()).not.toContain('[object Object]');
    expect(book().trials).toHaveLength(1);
    expect(mounted.container.querySelector('[data-micro-growth-result]')).toBe(null);
    click('Remove selected trial');
    expect(book().trials).toHaveLength(0);
    click('Use current conditions as control');
    choose('similar');
    click('Run comparison');
    expect(book().trials).toHaveLength(1);
    expect(mounted.container.querySelector('[data-micro-growth-result]')).toBeTruthy();
  });

  it('stops at twelve saved trials and allows room to be made without replacing other records', () => {
    const trials = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'lower', hypothesis: 'Run ' + (i + 1), explanation: '' }));
    mount({ growthLab: baseConditions, growthInvestigation: { control: baseConditions, trials, selectedId: 12, prediction: 'lower', nextId: 13 } });
    expect(button('Run comparison').disabled).toBe(true);
    expect(text()).toContain('Your notebook has 12 trials.');
    click('Run comparison');
    expect(book().trials).toHaveLength(12);
    click('Remove selected trial');
    expect(book().trials.map(trial => trial.id)).toEqual(Array.from({ length: 11 }, (_, i) => i + 1));
    expect(book().selectedId).toBe(11);
    expect(button('Run comparison').disabled).toBe(false);
    click('Run comparison');
    expect(book().trials.map(trial => trial.id)).toEqual([...Array.from({ length: 11 }, (_, i) => i + 1), 13]);
    expect(book().selectedId).toBe(13);
    expect(button('Run comparison').disabled).toBe(true);
  });

  it('preserves focus, field identity and text while hypotheses and explanations are edited', () => {
    mount();
    click('Does E. coli need oxygen?');
    const hypothesis = mounted.container.querySelector('#gl-hypothesis');
    hypothesis.focus();
    for (const value of ['H', 'Hypothesis', 'Hypothesis: compare oxygen.']) {
      write('#gl-hypothesis', value);
      expect(mounted.container.querySelector('#gl-hypothesis')).toBe(hypothesis);
      expect(document.activeElement).toBe(hypothesis);
      expect(hypothesis.value).toBe(value);
      expect(book().hypothesis).toBe(value);
    }
    expect(hypothesis.maxLength).toBe(600);
    choose('lower');
    click('Run comparison');
    const explanation = mounted.container.querySelector('#gl-explanation');
    explanation.focus();
    for (const value of ['E', 'Evidence: the trial curve is lower.']) {
      write('#gl-explanation', value);
      expect(mounted.container.querySelector('#gl-explanation')).toBe(explanation);
      expect(document.activeElement).toBe(explanation);
      expect(book().trials[0].explanation).toBe(value);
    }
    expect(explanation.maxLength).toBe(1200);
    expect(explanation.getAttribute('aria-describedby')).toBe('gl-explanation-hint');
    expect(text()).toContain('Explanation recorded');
  });

  it('shows labeled controls and a complete accessible table linked to the plotted evidence', () => {
    mount();
    readyRun();
    for (const id of ['gl-profile', 'gl-tempC', 'gl-pH', 'gl-oxygen', 'gl-hypothesis', 'gl-explanation']) {
      expect(mounted.container.querySelector('label[for="' + id + '"]')).toBeTruthy();
    }
    expect(mounted.container.querySelector('fieldset legend').textContent).toBe('Prediction for the next run');
    const svg = mounted.container.querySelector('.micro-growth-figure svg');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('data table');
    const table = mounted.container.querySelector('.micro-growth-table-wrap table');
    expect(table.caption.textContent).toBe('Simulated population at each model hour');
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(25);
    expect([...table.rows[1].cells].map(cell => cell.textContent)).toEqual(['0', '5.0', '5.0']);
    const result = window.__MicrobiologyCore.growth.compare(book().trials[0].control, book().trials[0].conditions);
    expect([...table.rows[25].cells].map(cell => cell.textContent)).toEqual(['24', result.control.finalPopulation.toFixed(1), result.trial.finalPopulation.toFixed(1)]);
    expect(mounted.container.querySelector('.micro-growth-result-head').getAttribute('aria-live')).toBe('polite');
  });

  it('keeps trials and drafts when navigating with keyboard tabs and returning', () => {
    mount();
    readyRun();
    write('#gl-explanation', 'Saved evidence');
    const saved = JSON.parse(JSON.stringify(book()));
    const growthTab = mounted.container.querySelector('#micro-tab-growthLab');
    growthTab.focus();
    key(growthTab, 'Home');
    const homeTab = mounted.container.querySelector('#micro-tab-home');
    expect(document.activeElement).toBe(homeTab);
    expect(homeTab.getAttribute('aria-selected')).toBe('true');
    expect(homeTab.tabIndex).toBe(0);
    expect(mounted.container.querySelector('#micro-tab-growthLab').tabIndex).toBe(-1);
    expect(mounted.state.tab).toBe('home');
    expect(book()).toEqual(saved);
    key(homeTab, 'End');
    const finalTab = mounted.container.querySelector('[role="tab"][aria-selected="true"]');
    expect(document.activeElement).toBe(finalTab);
    key(finalTab, 'ArrowRight');
    expect(document.activeElement).toBe(mounted.container.querySelector('#micro-tab-home'));
    click(mounted.container.querySelector('#micro-tab-growthLab'));
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('Saved evidence');
    expect(book()).toEqual(saved);
    expect(mounted.container.querySelector('[role="tabpanel"]').getAttribute('aria-labelledby')).toBe('micro-tab-growthLab');
  });

  it('retains saved comparisons and editable explanations through JSON storage and remounting', () => {
    mount();
    readyRun();
    write('#gl-explanation', 'A saved explanation');
    const state = JSON.parse(JSON.stringify(mounted.state));
    const saved = book();
    act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
    mount(state);
    expect(book()).toEqual(saved);
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('A saved explanation');
    write('#gl-explanation', 'Updated after restoring');
    expect(book().trials[0].explanation).toBe('Updated after restoring');
  });

  it('shows and edits saved notes when a restored trial has no control snapshot', () => {
    mount({ growthInvestigation: { control: baseConditions, selectedId: 5, trials: [{ id: 5, control: null, conditions: { ...baseConditions, tempC: 30 }, prediction: 'lower', hypothesis: 'My saved reasoning', explanation: 'My saved evidence' }] } });
    const recovered = mounted.container.querySelector('[data-micro-growth-recovered="5"]');
    expect(recovered.textContent).toContain('no control snapshot');
    expect(recovered.textContent).toContain('30 °C');
    expect(recovered.textContent).toContain('Original prediction: Lower population');
    expect(recovered.textContent).toContain('My saved reasoning');
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('My saved evidence');
    expect(recovered.querySelector('svg')).toBe(null);
    write('#gl-explanation', 'Evidence can still be edited');
    expect(book().trials[0].explanation).toBe('Evidence can still be edited');
    expect(book().trials[0].control).toBe(null);
    expect(book().control).toEqual(baseConditions);
  });

  it('runs a controlled sweep and preserves its plotted evidence when live conditions change', () => {
    mount({ growthLab: baseConditions });
    expect(button('Download notebook').disabled).toBe(true);
    expect(mounted.container.querySelector('label[for="gl-sweep-variable"]').textContent).toBe('Variable to sweep');
    click('Run variable sweep');
    expect(book().sweep).toEqual({ variable: 'tempC', conditions: baseConditions });
    expect(book().trials).toHaveLength(0);
    expect(button('Download notebook').disabled).toBe(false);
    expect(button('Download trial CSV').disabled).toBe(true);
    const saved = JSON.parse(JSON.stringify(book().sweep));
    const plotPath = mounted.container.querySelector('.micro-growth-sweep-figure path').getAttribute('d');
    const table = mounted.container.querySelector('.micro-growth-sweep-table');
    expect(table.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(4);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(10);
    expect(table.caption.textContent).toBe('Current sweep: Saved sweep settings and model responses');
    const values = [...table.querySelectorAll('tbody tr')].map(row => row.cells[1].textContent);
    expect(values).toEqual(window.__MicrobiologyCore.growth.sweep(baseConditions, 'tempC').points.map(point => point.finalPopulation.toFixed(1)));
    expect(text()).toContain('Highest sampled population');
    expect(text()).toContain('unsampled settings may differ');
    write('#gl-tempC', '0');
    write('#gl-pH', '3');
    write('#gl-profile', 'thermus');
    write('#gl-sweep-variable', 'oxygen');
    expect(book().sweep).toEqual(saved);
    expect(mounted.container.querySelector('[data-micro-growth-sweep]').getAttribute('data-micro-growth-sweep')).toBe('tempC');
    expect(mounted.container.querySelector('.micro-growth-sweep-figure path').getAttribute('d')).toBe(plotPath);
    expect([...mounted.container.querySelectorAll('.micro-growth-sweep-table tbody tr')].map(row => row.cells[1].textContent)).toEqual(values);
    expect(book().sweepVariable).toBe('oxygen');
  });

  it('prepares a saved sweep setting as a trial without overwriting any notebook evidence or control', () => {
    mount();
    readyRun();
    write('#gl-hypothesis', 'Keep this next prediction.');
    write('#gl-explanation', 'Keep this evidence.');
    click('Run variable sweep');
    const before = JSON.parse(JSON.stringify(book()));
    write('#gl-profile', 'thermus');
    write('#gl-pH', '4');
    write('#gl-oxygen', '50');
    const row = [...mounted.container.querySelectorAll('.micro-growth-sweep-table tbody tr')].find(item => item.cells[0].textContent === '30 °C');
    click(row.querySelector('button'));
    expect(mounted.state.growthLab).toMatchObject({ profile: 'ecoli', tempC: 30, pH: 7, oxygen: 0 });
    expect(book()).toEqual(before);
    expect(row.querySelector('button').getAttribute('aria-pressed')).toBe('true');
    expect(row.querySelector('button').textContent).toBe('Prepared as next trial');
    expect(mounted.container.querySelector('#gl-hypothesis').value).toBe('Keep this next prediction.');
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('Keep this evidence.');
  });

  it('recognizes a flat sweep and restores the saved snapshot after JSON persistence', () => {
    mount({ growthLab: { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 0 } });
    click('Run variable sweep');
    expect(text()).toContain('Every sampled setting gives the same final population.');
    expect([...mounted.container.querySelectorAll('.micro-growth-sweep-table tbody tr')].every(row => row.cells[1].textContent === '5.0' && row.cells[2].textContent === 'No modeled increase')).toBe(true);
    expect(mounted.container.querySelectorAll('.micro-growth-sweep-figure svg rect')).toHaveLength(10);
    const state = JSON.parse(JSON.stringify(mounted.state));
    const saved = book();
    act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
    mount(state);
    expect(book()).toEqual(saved);
    expect(text()).toContain('Saved sweep: Temperature');
    expect(mounted.container.querySelector('.micro-growth-sweep-table tbody').rows).toHaveLength(10);
  });

  it('exports sweep-only work with saved settings and keeps CSV restricted to trial records', () => {
    mount({ growthLab: baseConditions });
    write('#gl-sweep-variable', 'oxygen');
    click('Run variable sweep');
    write('#gl-pH', '3');
    const blobs = [];
    const files = [];
    vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options.type; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:micro-sweep-test'; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { files.push(this.download); });
    vi.useFakeTimers();
    click('Download notebook');
    expect(files).toEqual(['micro-lab-notebook.txt']);
    expect(blobs).toHaveLength(1);
    expect(blobs[0].type).toBe('text/plain;charset=utf-8');
    const exported = blobs[0].parts.join('');
    expect(exported).toContain('Variable to sweep: Oxygen availability');
    expect(exported).toContain('Held constant: E. coli · Temperature: 37 °C · pH: 7');
    expect(exported).toContain('not measurements');
    expect(exported).toContain('100/100\t99.7\t2.0');
    expect(exported).not.toContain('pH: 3');
    expect(button('Download trial CSV').disabled).toBe(true);
    act(() => vi.runAllTimers());
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:micro-sweep-test');
  });

  it('reviews every run against its original control and keeps draft predictions separate', () => {
    const trials = [
      { id: 3, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'higher', hypothesis: 'Original reasoning', explanation: 'First evidence' },
      { id: 8, control: { ...baseConditions, oxygen: 0 }, conditions: baseConditions, prediction: 'unsure', explanation: 'Second evidence' }
    ];
    mount({ growthInvestigation: { trials, selectedId: 8, control: { ...baseConditions, tempC: 20 }, prediction: 'similar', hypothesis: 'Next run draft' } });
    const disclosure = mounted.container.querySelector('.micro-growth-review');
    expect(disclosure.open).toBe(false);
    click(disclosure.querySelector('summary'));
    expect(disclosure.open).toBe(true);
    expect(disclosure.textContent).toContain('different saved controls');
    expect(disclosure.querySelector('.micro-growth-table-wrap').tabIndex).toBe(0);
    const table = disclosure.querySelector('table');
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(7);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(2);
    const review = window.__MicrobiologyCore.growth.reviewNotebook(book());
    for (const [index, row] of [...table.tBodies[0].rows].entries()) {
      expect(row.cells[0].textContent).toBe('Trial ' + trials[index].id);
      expect(row.cells[1].textContent).toBe('Oxygen availability');
      expect(row.cells[4].textContent).toBe(review.rows[index].controlPopulation.toFixed(1));
      expect(row.cells[5].textContent).toBe(review.rows[index].trialPopulation.toFixed(1));
      expect(row.cells[6].textContent).toBe((review.rows[index].difference > 0 ? '+' : '') + review.rows[index].difference.toFixed(1));
    }
    expect(table.tBodies[0].rows[0].cells[2].textContent).toBe('Higher population');
    expect(table.tBodies[0].rows[0].cells[3].textContent).toBe('Lower population');
    const before = JSON.parse(JSON.stringify(book()));
    click(table.tBodies[0].rows[0].querySelector('button'));
    expect(book()).toEqual({ ...before, selectedId: 3 });
    expect(text()).toContain('Reviewing saved trial 3');
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('First evidence');
    expect(mounted.container.querySelector('#gl-hypothesis').value).toBe('Next run draft');
    expect(mounted.container.querySelector('input[name="micro-growth-prediction"]:checked').value).toBe('similar');
    expect(mounted.container.querySelector('fieldset').getAttribute('aria-describedby')).toBe('gl-next-prediction-note');
  });

  it('keeps trial IDs consistent through removal, new runs, review, and both exports', () => {
    const trials = [2, 6, 11].map(id => ({ id, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'lower', explanation: 'Evidence ' + id }));
    mount({ growthLab: baseConditions, growthInvestigation: { trials, selectedId: 6, nextId: 12, control: baseConditions, prediction: 'similar' } });
    expect(mounted.container.querySelector('[data-review-controls="same"]')).toBeTruthy();
    click('Remove selected trial');
    expect([...mounted.container.querySelectorAll('.micro-growth-trials strong')].map(node => node.textContent)).toEqual(['Trial 2', 'Trial 11']);
    expect(text()).toContain('Reviewing saved trial 11');
    click('Run comparison');
    expect([...mounted.container.querySelectorAll('.micro-growth-trials strong')].map(node => node.textContent)).toEqual(['Trial 2', 'Trial 11', 'Trial 12']);
    expect([...mounted.container.querySelectorAll('.micro-growth-review-table tbody th')].map(node => node.textContent)).toEqual(['Trial 2', 'Trial 11', 'Trial 12']);
    const blobs = [];
    const files = [];
    vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options.type; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:micro-review-test'; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { files.push(this.download); });
    vi.useFakeTimers();
    click('Download notebook');
    click('Download trial CSV');
    expect(files).toEqual(['micro-lab-notebook.txt', 'micro-lab-trials.csv']);
    const exported = blobs[0].parts.join('');
    expect(exported).toContain('\nTrial 2\n');
    expect(exported).toContain('\nTrial 11\n');
    expect(exported).toContain('\nTrial 12\n');
    expect(exported).not.toContain('\nTrial 1\n');
    expect(exported).not.toContain('\nTrial 6\n');
    expect(blobs[1].parts.join('').split('\r\n').slice(1).map(line => line.split(',')[0])).toEqual(['"2"', '"11"', '"12"']);
    act(() => vi.runAllTimers());
  });

  it('inspects earlier saved populations while keeping original predictions, outcome feedback, and drafts intact', () => {
    const conditions = { ...baseConditions, tempC: 35 };
    const trials = [
      { id: 3, control: baseConditions, conditions, prediction: 'similar', hypothesis: 'Original prediction reasoning', explanation: 'Saved evidence' },
      { id: 9, control: null, conditions: baseConditions, prediction: 'higher', explanation: 'Recovered evidence' },
    ];
    mount({ growthLab: { ...baseConditions, oxygen: 0 }, growthInvestigation: { trials, selectedId: 3, control: conditions, prediction: 'lower', hypothesis: 'Next run draft' } });
    const disclosure = mounted.container.querySelector('.micro-growth-review');
    click(disclosure.querySelector('summary'));
    const selector = mounted.container.querySelector('#gl-review-hour');
    expect(selector.value).toBe('24');
    expect(selector.options).toHaveLength(25);
    const savedBook = JSON.parse(JSON.stringify(book()));
    const activeConditions = JSON.parse(JSON.stringify(mounted.state.growthLab));
    const originalFeedback = mounted.container.querySelector('.micro-growth-result-head').textContent;
    const originalMetrics = mounted.container.querySelector('.micro-growth-metrics').textContent;
    selector.focus();
    write('#gl-review-hour', '6');
    expect(document.activeElement).toBe(selector);
    expect(mounted.container.querySelector('#gl-review-hour')).toBe(selector);
    expect(mounted.state.growthReviewHour).toBe(6);
    expect(mounted.container.querySelector('#gl-review-time-status').textContent).toContain('Original predictions and outcome labels always refer to hour 24.');
    const table = disclosure.querySelector('table');
    expect([...table.querySelectorAll('thead th')].slice(3, 6).map(node => node.textContent)).toEqual(['Outcome at hour 24', 'Control at hour 6', 'Trial at hour 6']);
    const controlAtSix = window.__MicrobiologyCore.growth.simulate(baseConditions).points[6].population;
    const trialAtSix = window.__MicrobiologyCore.growth.simulate(conditions).points[6].population;
    expect([...table.tBodies[0].rows[0].cells].slice(3).map(cell => cell.textContent)).toEqual(['Similar population', controlAtSix.toFixed(1), trialAtSix.toFixed(1), (trialAtSix - controlAtSix).toFixed(1)]);
    expect([...table.tBodies[0].rows[1].cells].slice(3).map(cell => cell.textContent)).toEqual(['Unavailable', 'Unavailable', controlAtSix.toFixed(1), 'Unavailable']);
    expect(mounted.container.querySelector('.micro-growth-result-head').textContent).toBe(originalFeedback);
    expect(mounted.container.querySelector('.micro-growth-metrics').textContent).toBe(originalMetrics);
    expect(book()).toEqual(savedBook);
    expect(mounted.state.growthLab).toEqual(activeConditions);
    expect(mounted.container.querySelector('#gl-hypothesis').value).toBe('Next run draft');
    const restored = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
    mount(restored);
    expect(mounted.container.querySelector('#gl-review-hour').value).toBe('6');
    expect(book()).toEqual(savedBook);
    expect(mounted.container.querySelector('.micro-growth-result-head').textContent).toBe(originalFeedback);
  });

  it('defaults a malformed restored review hour to 24 and shows the shared inoculum at hour zero', () => {
    mount({ growthReviewHour: '6', growthInvestigation: { trials: [{ id: 7, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'lower' }], selectedId: 7 } });
    expect(mounted.container.querySelector('#gl-review-hour').value).toBe('24');
    write('#gl-review-hour', '0');
    const row = mounted.container.querySelector('[data-review-trial="7"]');
    expect([...row.cells].slice(3).map(cell => cell.textContent)).toEqual(['Lower population', '5.0', '5.0', '0.0']);
    expect(mounted.container.querySelector('.micro-growth-result-head').textContent).toContain('Your prediction matches this run.');
    click(mounted.container.querySelector('#micro-tab-home'));
    click(mounted.container.querySelector('#micro-tab-growthLab'));
    expect(mounted.container.querySelector('#gl-review-hour').value).toBe('0');
  });

  it('downloads the restored inspection hour without changing saved evidence, draft settings, or the original CSV export', () => {
    const trials = [{ id: 3, control: baseConditions, conditions: { ...baseConditions, tempC: 35 }, prediction: 'similar', explanation: 'Saved evidence' },
      { id: 9, conditions: baseConditions, prediction: 'lower', explanation: 'Recovered record' }];
    mount({ growthReviewHour: 6, growthLab: { ...baseConditions, oxygen: 0 }, growthInvestigation: { trials, selectedId: 3, nextId: 12, prediction: 'higher', hypothesis: 'Next run draft' } });
    const restored = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
    mount(restored);
    click(mounted.container.querySelector('.micro-growth-review summary'));
    const before = JSON.stringify(mounted.state);
    const originalFeedback = mounted.container.querySelector('.micro-growth-result-head').textContent;
    const blobs = [], files = [];
    vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options.type; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:inspected-hour'; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { files.push(this.download); });
    vi.useFakeTimers();
    const download = button('Download comparison at hour 6');
    expect(download.getAttribute('aria-describedby')).toBe('gl-review-export-note');
    download.focus();
    click(download);
    expect(document.activeElement).toBe(download);
    expect(files).toEqual(['micro-lab-comparison-hour-6.csv']);
    expect(blobs[0].type).toBe('text/csv;charset=utf-8');
    expect(blobs[0].parts.join('')).toBe(window.__MicrobiologyCore.growth.reviewCSV(book(), 6));
    expect(document.querySelector('a[download="micro-lab-comparison-hour-6.csv"]')).toBe(null);
    click('Download trial CSV');
    expect(files[1]).toBe('micro-lab-trials.csv');
    expect(blobs[1].parts.join('')).toBe(window.__MicrobiologyCore.growth.csv(book()));
    expect(blobs[1].parts.join('')).toContain('control_population_at_24h');
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(mounted.container.querySelector('.micro-growth-result-head').textContent).toBe(originalFeedback);
    act(() => vi.runAllTimers());
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('reports comparison download failures, cleans up temporary resources, and keeps the selected hour and evidence', () => {
    const addToast = vi.fn();
    mount({ growthReviewHour: 6, growthInvestigation: { trials: [{ id: 4, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'lower' }], selectedId: 4 } }, { addToast });
    const before = JSON.stringify(mounted.state);
    const createObjectURL = vi.fn(() => { throw new Error('Object URLs unavailable'); });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    vi.useFakeTimers();
    click('Download comparison at hour 6');
    expect(addToast).toHaveBeenLastCalledWith('The comparison could not download. Your saved trials and selected hour are unchanged.', 'error');
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    createObjectURL.mockImplementation(() => 'blob:failed-inspection');
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('Download unavailable'); });
    click('Download comparison at hour 6');
    expect(addToast).toHaveBeenCalledTimes(2);
    expect(document.querySelector('a[download="micro-lab-comparison-hour-6.csv"]')).toBe(null);
    act(() => vi.advanceTimersByTime(1000));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:failed-inspection');
    anchorClick.mockImplementation(() => {});
    click('Download comparison at hour 6');
    expect(addToast).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(mounted.container.querySelector('#gl-review-hour').value).toBe('6');
    act(() => vi.runAllTimers());
  });

  it('reuses a selected trial setting without changing controls, drafts or saved evidence', () => {
    const conditions = { ...baseConditions, tempC: 30, oxygen: 0 };
    const control = { profile: 'methanogen', tempC: 37, pH: 7, oxygen: 0 };
    mount({
      growthLab: { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100, hypothesis: 'Legacy note' },
      growthInvestigation: { control, prediction: 'similar', hypothesis: 'Next prediction draft', selectedId: 7, trials: [{ id: 7, control: baseConditions, conditions, prediction: 'higher', hypothesis: 'Original hypothesis', explanation: 'Original evidence' }] }
    });
    const before = JSON.parse(JSON.stringify(book()));
    expect(button('Use saved trial settings').getAttribute('aria-pressed')).toBe('false');
    click('Use saved trial settings');
    expect(mounted.state.growthLab).toMatchObject({ ...conditions, hypothesis: 'Legacy note' });
    expect(book()).toEqual(before);
    expect(button('Use saved trial settings').getAttribute('aria-pressed')).toBe('true');
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('Original evidence');
    expect(mounted.container.querySelector('#gl-hypothesis').value).toBe('Next prediction draft');
  });

  it('cycles through other unexplained trials in notebook order while preserving settings, saved evidence, and inspection hour', () => {
    vi.useFakeTimers();
    const trials = [
      { id: 40, explanation: ' \n ' }, { id: 8, explanation: 'Already explained' },
      { id: 3, explanation: '' }, { id: 25, explanation: 'Also explained' },
    ].map(trial => ({ control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'lower', hypothesis: 'Original reasoning ' + trial.id, ...trial }));
    const live = { ...baseConditions, tempC: 25, hypothesis: 'Legacy note', log: [{ preserved: true }] };
    mount({ growthLab: live, growthReviewHour: 6, growthInvestigation: { trials, selectedId: 8, nextId: 41, control: { ...baseConditions, tempC: 20 }, prediction: 'higher', hypothesis: 'Next run reasoning', sweepVariable: 'pH', sweep: { variable: 'pH', conditions: baseConditions } } });
    const before = JSON.parse(JSON.stringify(book()));
    expect(trialButton(0).textContent).toContain('Add an explanation');
    for (const id of [3, 40, 3]) {
      const next = button('Next trial without an explanation · Trial ' + id);
      expect(next.getAttribute('data-next-unexplained-trial')).toBe(String(id));
      next.focus();
      click(next);
      act(() => vi.runOnlyPendingTimers());
      expect(book()).toEqual({ ...before, selectedId: id });
      expect(document.activeElement).toBe(mounted.container.querySelector('#gl-explanation'));
      expect(mounted.container.querySelector('#gl-saved-result').getAttribute('data-micro-growth-result')).toBe(String(id));
      expect(mounted.state.growthLab).toEqual(live);
      expect(mounted.state.growthReviewHour).toBe(6);
      expect(mounted.container.querySelector('#gl-hypothesis').value).toBe('Next run reasoning');
    }
    write('#gl-explanation', 'The lower oxygen availability reduces modeled growth.');
    click('Next trial without an explanation · Trial 40');
    act(() => vi.runOnlyPendingTimers());
    expect(mounted.container.querySelector('[data-next-unexplained-trial]')).toBe(null);
    expect(book().selectedId).toBe(40);
    expect(book().trials.find(trial => trial.id === 3).explanation).toContain('lower oxygen availability');
    write('#gl-explanation', 'A written explanation now replaces whitespace.');
    expect(mounted.container.querySelector('[data-next-unexplained-trial]')).toBe(null);
    expect(trialButton(0).textContent).toContain('Explanation recorded');
  });

  it('opens the explanation for a recovered trial without inventing its missing control', () => {
    vi.useFakeTimers();
    const trials = [
      { id: 7, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'lower', explanation: 'Existing explanation' },
      { id: 2, control: null, conditions: baseConditions, prediction: 'higher', hypothesis: 'Original recovered reasoning', explanation: '' },
    ];
    mount({ growthReviewHour: 0, growthInvestigation: { trials, selectedId: 7, nextId: 11, prediction: 'unsure', hypothesis: 'Next question' } });
    const before = JSON.parse(JSON.stringify(book()));
    click('Next trial without an explanation · Trial 2');
    act(() => vi.runOnlyPendingTimers());
    expect(book()).toEqual({ ...before, selectedId: 2 });
    expect(mounted.state.growthReviewHour).toBe(0);
    expect(mounted.container.querySelector('[data-micro-growth-recovered="2"]')).not.toBe(null);
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-explanation'));
    expect(text()).toContain('This saved trial has no control snapshot');
    expect(mounted.container.querySelector('[data-next-unexplained-trial]')).toBe(null);
    expect(mounted.container.querySelector('#gl-hypothesis').value).toBe('Next question');
  });

  it('does not move focus to a different trial when the selected trial changes before the navigation callback', () => {
    vi.useFakeTimers();
    const trials = [1, 5, 9].map(id => ({ id, control: baseConditions, conditions: baseConditions, explanation: id === 5 ? '' : 'Recorded explanation' }));
    mount({ growthInvestigation: { trials, selectedId: 1 } });
    click('Next trial without an explanation · Trial 5');
    click(trialButton(2));
    const draft = mounted.container.querySelector('#gl-hypothesis');
    draft.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(book().selectedId).toBe(9);
    expect(document.activeElement).toBe(draft);
  });

  it('does not move focus into a reopened Growth Lab from a stale next-explanation request', () => {
    vi.useFakeTimers();
    const trials = [1, 5].map(id => ({ id, control: baseConditions, conditions: baseConditions, explanation: id === 5 ? '' : 'Recorded explanation' }));
    mount({ growthInvestigation: { trials, selectedId: 1 }, growthReviewHour: 12 });
    click('Next trial without an explanation · Trial 5');
    click(mounted.container.querySelector('#micro-tab-home'));
    click(mounted.container.querySelector('#micro-tab-growthLab'));
    const tab = mounted.container.querySelector('#micro-tab-growthLab');
    tab.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(tab);
    expect(book().selectedId).toBe(5);
    expect(mounted.state.growthReviewHour).toBe(12);
  });

  it('reports unavailable comparisons and absent predictions without claiming a mismatch', () => {
    const trials = [
      { id: 4, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: '' },
      { id: 9, control: null, conditions: baseConditions, prediction: 'lower', explanation: 'Recovered note' }
    ];
    mount({ growthInvestigation: { trials, selectedId: 4 } });
    expect(text()).toContain('No prediction was saved for this run.');
    expect(text()).not.toContain('This result differs from your prediction.');
    const disclosure = mounted.container.querySelector('.micro-growth-review');
    click(disclosure.querySelector('summary'));
    expect(disclosure.textContent).toContain('Some saved trials lack a control snapshot.');
    const row = disclosure.querySelector('[data-review-trial="9"]');
    expect(row.cells[3].textContent).toBe('Unavailable');
    expect(row.cells[4].textContent).toBe('Unavailable');
    expect(row.cells[6].textContent).toBe('Unavailable');
    expect(row.cells[5].textContent).toBe(window.__MicrobiologyCore.growth.simulate(baseConditions).finalPopulation.toFixed(1));
    click(row.querySelector('button'));
    expect(text()).toContain('Reviewing saved trial 9');
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('Recovered note');
  });
});

describe('Growth removal recovery workflow', { timeout: 20000 }, () => {
  function trial(id) { return { id, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'higher', hypothesis: 'Original reasoning ' + id, explanation: '<b>Literal saved evidence</b> ' + id }; }

  it('recovers a middle trial after navigation and JSON reload while preserving later draft, control, sweep, and hour changes', () => {
    mount({ growthLab: { ...baseConditions, tempC: 30 }, growthReviewHour: 6,
      growthInvestigation: { trials: [2, 7, 11].map(trial), selectedId: 7, nextId: 20, control: baseConditions, prediction: 'lower', hypothesis: 'Next run draft', sweepVariable: 'pH', sweep: { variable: 'oxygen', conditions: baseConditions } } });
    const saved = structuredClone(book().trials[1]);
    button('Remove selected trial').focus(); click('Remove selected trial');
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-restore-removed'));
    expect(book().trials.map(item => item.id)).toEqual([2, 11]);
    expect(book().removed).toEqual({ trial: saved, index: 1 });
    const recovery = mounted.container.querySelector('#gl-removed-trial');
    expect(recovery.textContent).toContain('Original reasoning 7');
    expect(recovery.textContent).toContain('<b>Literal saved evidence</b> 7');
    expect(recovery.querySelector('b')).toBeNull();
    expect(mounted.container.querySelector('#gl-removal-notice').textContent).toBe('Removed trial 7. You can restore it below.');
    write('#gl-hypothesis', 'Revised next-run reasoning'); choose('unsure'); write('#gl-tempC', '18');
    click('Use current conditions as control'); write('#gl-sweep-variable', 'tempC'); click('Run variable sweep'); write('#gl-review-hour', '12');
    const beforeRestore = JSON.parse(JSON.stringify(mounted.state));
    click(mounted.container.querySelector('#micro-tab-home')); click(mounted.container.querySelector('#micro-tab-growthLab'));
    expect(book().removed).toEqual({ trial: saved, index: 1 });
    const reloaded = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(reloaded);
    expect(mounted.container.querySelector('#gl-removal-notice').textContent).toBe('');
    expect(mounted.container.querySelector('#gl-removed-trial')).toBeTruthy();
    click('Restore removed trial');
    expect(book().trials.map(item => item.id)).toEqual([2, 7, 11]);
    expect(book().trials[1]).toEqual(saved);
    expect(book().selectedId).toBe(7);
    expect(book()).not.toHaveProperty('removed');
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-trial-7'));
    expect(mounted.container.querySelector('#gl-removal-notice').textContent).toBe('Restored trial 7. Your current settings and next-run notes are unchanged.');
    expect(mounted.state.growthLab).toEqual(beforeRestore.growthLab);
    expect(mounted.state.growthReviewHour).toBe(12);
    for (const field of ['control', 'prediction', 'hypothesis', 'explanation', 'sweep', 'sweepVariable', 'nextId']) expect(book()[field]).toEqual(beforeRestore.growthInvestigation[field]);
  });

  it('keeps recovery reachable after the last trial disappears and focuses the notebook when removal is kept', () => {
    mount({ growthInvestigation: { trials: [trial(7)], selectedId: 7, nextId: 20 } });
    button('Remove selected trial').focus(); click('Remove selected trial');
    expect(book().trials).toEqual([]);
    expect(mounted.container.querySelector('.micro-growth-trials')).toBeNull();
    expect(mounted.container.querySelector('#gl-removed-trial')).toBeTruthy();
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-restore-removed'));
    const notice = mounted.container.querySelector('#gl-removal-notice');
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.getAttribute('aria-live')).toBe('polite');
    click('Keep removal');
    expect(book()).not.toHaveProperty('removed');
    expect(book().nextId).toBe(20);
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-notebook-heading'));
    expect(notice.textContent).toContain('Recovery for this trial has ended.');
  });

  it('clearly warns before a successful new run ends recovery and frees capacity without reusing IDs', () => {
    const trials = Array.from({ length: 12 }, (_, index) => trial(index + 1));
    mount({ growthLab: baseConditions, growthInvestigation: { trials, selectedId: 7, nextId: 20, control: baseConditions, prediction: 'lower', hypothesis: 'Next run draft' } });
    expect(button('Run comparison').disabled).toBe(true);
    click('Remove selected trial');
    expect(button('Run comparison').disabled).toBe(false);
    expect(button('Run comparison').getAttribute('aria-describedby')).toBe('gl-run-removal-warning');
    const warning = mounted.container.querySelector('#gl-run-removal-warning');
    expect(warning.textContent).toBe('Restore this trial before saving another trial or removing another.');
    expect(warning.compareDocumentPosition(button('Run comparison')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    click('Run comparison');
    expect(book().trials.map(item => item.id)).toEqual([1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 20]);
    expect(book().nextId).toBe(21);
    expect(book()).not.toHaveProperty('removed');
    expect(mounted.container.querySelector('#gl-removed-trial')).toBeNull();
    expect(mounted.container.querySelector('#gl-removal-notice').textContent).toBe('A new trial was saved. The earlier removed trial can no longer be restored.');
    expect(button('Run comparison').disabled).toBe(true);
  });

  it('replaces the one-step slot only when another trial is removed', () => {
    mount({ growthInvestigation: { trials: [2, 7, 11].map(trial), selectedId: 7, nextId: 20 } });
    click('Remove selected trial');
    expect(book().removed.trial.id).toBe(7);
    click(mounted.container.querySelector('#gl-trial-2'));
    write('#gl-explanation', 'Updated retained evidence');
    expect(book().removed.trial.id).toBe(7);
    expect(button('Remove selected trial').getAttribute('aria-describedby')).toBe('gl-removal-policy');
    click('Remove selected trial');
    expect(book().removed).toMatchObject({ index: 0, trial: { id: 2, explanation: 'Updated retained evidence' } });
    click('Restore removed trial');
    expect(book().trials.map(item => item.id)).toEqual([2, 11]);
    expect(book().trials[0].explanation).toBe('Updated retained evidence');
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-trial-2'));
  });

  it('shows a blocked imported recovery slot at capacity without silently evicting a saved trial', () => {
    mount({ growthInvestigation: { trials: Array.from({ length: 12 }, (_, index) => trial(index + 1)), selectedId: 3, removed: { trial: trial(20), index: 4 } } });
    const original = JSON.stringify(book());
    expect(button('Restore removed trial').disabled).toBe(true);
    expect(mounted.container.querySelector('#gl-removal-full').textContent).toBe('The notebook is full. Restoring cannot replace another saved trial.');
    click('Restore removed trial');
    expect(JSON.stringify(book())).toBe(original);
    click('Keep removal');
    expect(book().trials.map(item => item.id)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-trial-3'));
  });

  it('does not move focus back into Growth after removal and immediate navigation away', () => {
    mount({ growthInvestigation: { trials: [trial(7)], selectedId: 7 } });
    const remove = button('Remove selected trial'), home = mounted.container.querySelector('#micro-tab-home');
    act(() => { remove.click(); home.focus(); home.click(); });
    expect(mounted.state.tab).toBe('home');
    expect(document.activeElement).toBe(home);
    expect(mounted.state.growthInvestigation.removed.trial.id).toBe(7);
    click(mounted.container.querySelector('#micro-tab-growthLab'));
    expect(document.activeElement).not.toBe(mounted.container.querySelector('#gl-restore-removed'));
    expect(mounted.container.querySelector('#gl-removed-trial')).toBeTruthy();
  });

  it('downloads only active trials and leaves the recoverable snapshot and inspection hour untouched', () => {
    const blobs = [];
    vi.stubGlobal('Blob', class { constructor(parts) { blobs.push(parts.join('')); } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:growth-recovery'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {}); vi.useFakeTimers();
    mount({ growthReviewHour: 6, growthInvestigation: { trials: [trial(2), trial(7)], selectedId: 7, nextId: 20 } });
    click('Remove selected trial');
    const snapshot = JSON.stringify(mounted.state);
    click('Download notebook'); click('Download trial CSV');
    for (const exported of blobs) { expect(exported).toContain('Literal saved evidence</b> 2'); expect(exported).not.toContain('Literal saved evidence</b> 7'); }
    expect(JSON.stringify(mounted.state)).toBe(snapshot);
    expect(mounted.state.growthReviewHour).toBe(6);
    click('Restore removed trial'); click('Download notebook');
    expect(blobs[2]).toContain('Literal saved evidence</b> 7');
    act(() => vi.runOnlyPendingTimers());
  });

  it('keeps the selected original trial identity through malformed-ID repair, editing, removal, and restoration', () => {
    const trials = [{ ...trial(2), id: 'bad', explanation: 'Earlier malformed record' }, { ...trial(1), explanation: 'The original Trial 1' }, trial(9)];
    mount({ growthInvestigation: { trials, selectedId: 1, nextId: 20 }, growthReviewHour: 6 });
    expect(book().trials.map(item => item.id)).toEqual([2, 1, 9]);
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('The original Trial 1');
    write('#gl-explanation', 'Edited original Trial 1');
    expect(book().trials[0].explanation).toBe('Earlier malformed record');
    expect(book().trials[1].explanation).toBe('Edited original Trial 1');
    click('Remove selected trial');
    expect(book().removed).toMatchObject({ index: 1, trial: { id: 1, explanation: 'Edited original Trial 1' } });
    click('Restore removed trial');
    expect(book().trials.map(item => item.id)).toEqual([2, 1, 9]);
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-trial-1'));
    expect(mounted.state.growthReviewHour).toBe(6);
  });

  it('requires an explicit selection when a stale restored ID matches a newly repaired record', () => {
    mount({ growthInvestigation: { trials: [{ ...trial(2), id: 'bad', explanation: 'Recovered text' }, trial(1)], selectedId: 2 } });
    expect(book().selectedId).toBeNull();
    expect(mounted.container.querySelector('#gl-explanation')).toBeNull();
    expect(mounted.container.querySelector('#gl-trial-2').getAttribute('aria-pressed')).toBe('false');
    click(mounted.container.querySelector('#gl-trial-2'));
    expect(book().selectedId).toBe(2);
    expect(mounted.container.querySelector('#gl-explanation').value).toBe('Recovered text');
    write('#gl-explanation', 'Explicitly reviewed recovered text');
    expect(book().trials[0]).toMatchObject({ id: 2, explanation: 'Explicitly reviewed recovered text' });
    expect(book().trials[1].explanation).toBe('<b>Literal saved evidence</b> 1');
  });
});

describe('Microbiology previous sweep review and guarded navigation', { timeout: 20000 }, () => {
  function seed() {
    const sweep = { variable: 'oxygen', conditions: { profile: 'thermus', tempC: 70, pH: 7.5, oxygen: 100 } };
    const previousSweep = { variable: 'pH', conditions: baseConditions };
    return {
      growthLab: { ...baseConditions, tempC: 30, pH: 6, hypothesis: 'Earlier lab note', log: [{ kept: true }] }, growthReviewHour: 12,
      growthInvestigation: { control: { ...baseConditions, tempC: 25 }, prediction: 'higher', hypothesis: 'Next hypothesis', explanation: 'Legacy draft',
        trials: [3, 8, 11].map(id => ({ id, control: baseConditions, conditions: { ...baseConditions, oxygen: 0 }, prediction: 'lower', hypothesis: 'Original reasoning ' + id, explanation: id === 3 ? 'Original evidence' : '' })),
        selectedId: 3, nextId: 20, sweepVariable: 'oxygen', sweep, previousSweep,
        removed: { index: 1, trial: { id: 7, control: baseConditions, conditions: baseConditions, prediction: 'unsure', explanation: 'Removed evidence' } } },
      quizAnswers: [1, 2], mysteryLab: { unrelated: 'keep' }
    };
  }
  function preview() { return mounted.container.querySelector('[data-micro-growth-previous-sweep]'); }
  function current() { return mounted.container.querySelector('[data-micro-growth-sweep]'); }
  function historyStatus() { return mounted.container.querySelector('#gl-sweep-history-status'); }
  function openSweeps() {
    click(mounted.container.querySelector('.micro-growth-sweep > summary'));
    click(mounted.container.querySelector('#gl-previous-sweep > summary'));
  }
  function reload() {
    const saved = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount());
    mounted.container.remove();
    mounted = null;
    return mount(saved);
  }

  it('reviews the previous complete curve, fixed conditions and every table row without preparing a trial', () => {
    mount(seed());
    const before = JSON.stringify(mounted.state);
    openSweeps();
    const previous = preview();
    expect(previous.querySelector('h4').textContent).toBe('Previous sweep');
    expect(current().querySelector('h4').textContent).toBe('Current sweep');
    expect(previous.textContent).toContain('Held constant: E. coli · Temperature: 37 °C · Oxygen availability: 100/100');
    expect(previous.textContent).toContain('Every sample starts at 5 population units');
    expect(previous.textContent).toContain('not measurements');
    expect(previous.querySelector('svg[role="img"]')).not.toBeNull();
    expect(previous.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(previous.querySelectorAll('thead th')).toHaveLength(3);
    expect(previous.querySelectorAll('button,input,select,textarea')).toHaveLength(0);
    expect(previous.querySelector('figcaption').textContent).toMatch(/^Previous sweep: Response to pH/);
    expect(previous.querySelector('svg').getAttribute('aria-label')).toMatch(/^Previous sweep\. /);
    expect(previous.querySelector('caption').textContent).toBe('Previous sweep: Saved sweep settings and model responses');
    expect(previous.querySelector('[role="status"], [aria-live]')).toBeNull();
    expect(current().querySelector('figcaption').textContent).toMatch(/^Current sweep: Response to Oxygen availability/);
    expect(current().querySelector('svg').getAttribute('aria-label')).toMatch(/^Current sweep\. /);
    expect(current().querySelector('caption').textContent).toBe('Current sweep: Saved sweep settings and model responses');
    const model = window.__MicrobiologyCore.growth.sweep(baseConditions, 'pH');
    expect([...previous.querySelectorAll('tbody tr')].map(row => row.cells[1].textContent)).toEqual(model.points.map(point => point.finalPopulation.toFixed(1)));
    expect(current().querySelectorAll('tbody tr')).toHaveLength(9);
    expect(current().querySelectorAll('tbody button')).toHaveLength(9);
    expect(JSON.stringify(mounted.state)).toBe(before);
  });

  it('swaps saved sweeps repeatedly, announces each restore and preserves settings, drafts, records and recovery through reload', () => {
    vi.useFakeTimers();
    const awardXP = vi.fn();
    mount(seed(), { awardXP });
    const before = JSON.parse(JSON.stringify(mounted.state)), originalBook = book();
    const originalCurve = current().querySelector('path').getAttribute('d');
    const previousCurve = preview().querySelector('path').getAttribute('d');
    const random = vi.spyOn(Math, 'random');
    openSweeps();
    click('Restore previous sweep');
    act(() => vi.runOnlyPendingTimers());
    expect(book()).toEqual({ ...originalBook, sweep: originalBook.previousSweep, previousSweep: originalBook.sweep });
    for (const field of ['tab', 'growthLab', 'growthReviewHour', 'quizAnswers', 'mysteryLab']) {
      expect(mounted.state[field], field).toEqual(before[field]);
    }
    expect(current().querySelector('path').getAttribute('d')).toBe(previousCurve);
    expect(preview().querySelector('path').getAttribute('d')).toBe(originalCurve);
    expect(document.activeElement).toBe(mounted.container.querySelector('#gl-current-sweep-heading'));
    expect(historyStatus().getAttribute('role')).toBe('status');
    expect(historyStatus().getAttribute('aria-live')).toBe('polite');
    expect(historyStatus().textContent).toContain('Previous sweep restored as current.');
    const announcement = historyStatus().firstChild;
    click('Restore previous sweep');
    act(() => vi.runOnlyPendingTimers());
    expect(book()).toEqual(originalBook);
    expect(historyStatus().firstChild).not.toBe(announcement);
    expect(historyStatus().textContent).toContain('Previous sweep restored as current.');
    expect(random).not.toHaveBeenCalled();
    expect(awardXP).not.toHaveBeenCalled();
    reload();
    expect(book()).toEqual(originalBook);
    expect(historyStatus().textContent).toBe('');
    expect(preview().querySelectorAll('tbody tr')).toHaveLength(10);
    expect(mounted.state.growthLab).toEqual(before.growthLab);
  });

  it('keeps history on identical saves, replaces the older descriptor on a distinct save and clears obsolete feedback', () => {
    vi.useFakeTimers();
    const initial = seed();
    initial.growthLab = { ...initial.growthInvestigation.sweep.conditions };
    mount(initial);
    const original = book();
    click('Run variable sweep');
    expect(book()).toEqual(original);
    openSweeps();
    click('Restore previous sweep');
    act(() => vi.runOnlyPendingTimers());
    expect(historyStatus().textContent).toContain('Previous sweep restored as current.');
    write('#gl-hypothesis', 'This is still my draft');
    expect(historyStatus().textContent).toContain('Previous sweep restored as current.');
    write('#gl-sweep-variable', 'tempC');
    click('Run variable sweep');
    expect(book().sweep).toEqual({ variable: 'tempC', conditions: initial.growthLab });
    expect(book().previousSweep).toEqual(original.previousSweep);
    expect(book().hypothesis).toBe('This is still my draft');
    expect(book().trials).toEqual(original.trials);
    expect(book().removed).toEqual(original.removed);
    expect(historyStatus().textContent).toBe('');
    click('Run variable sweep');
    expect(book().previousSweep).toEqual(original.previousSweep);
    expect(historyStatus().textContent).toBe('');
  });

  it('retains both original snapshots when only the swept starting value is changed before another run', () => {
    const initial = seed();
    initial.growthLab = { ...initial.growthInvestigation.sweep.conditions };
    mount(initial);
    const original = book(), originalPath = current().querySelector('path').getAttribute('d');
    write('#gl-oxygen', '0');
    click('Run variable sweep');
    expect(book()).toEqual(original);
    expect(book().sweep.conditions.oxygen).toBe(100);
    expect(mounted.state.growthLab.oxygen).toBe(0);
    expect(current().querySelector('path').getAttribute('d')).toBe(originalPath);
    expect(preview().querySelectorAll('tbody tr')).toHaveLength(10);
    reload();
    expect(book()).toEqual(original);
    expect(mounted.state.growthLab.oxygen).toBe(0);
    expect(preview().querySelector('h4').textContent).toBe('Previous sweep');
  });

  it('does not display or export invented historical evidence from an incomplete previous-sweep import', () => {
    vi.useFakeTimers();
    const initial = seed();
    initial.growthInvestigation.previousSweep = { variable: 'pH', conditions: {} };
    mount(initial);
    expect(preview()).toBeNull();
    expect(mounted.container.querySelector('#gl-restore-previous-sweep')).toBeNull();
    const blobs = [];
    vi.stubGlobal('Blob', class { constructor(parts) { this.parts = parts; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:growth-invalid-history'; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    click('Download notebook');
    const exported = blobs[0].parts.join('');
    expect(exported).toContain('\nCurrent sweep\n');
    expect(exported).not.toContain('\nPrevious sweep\n');
    expect(exported).toContain('Variable to sweep: Oxygen availability');
    act(() => vi.runOnlyPendingTimers());
  });

  it('exports both complete sweep sections under neutral labels while the trial CSV remains unchanged', () => {
    vi.useFakeTimers();
    mount(seed());
    const before = JSON.stringify(mounted.state), original = book();
    const blobs = [], downloads = [];
    vi.stubGlobal('Blob', class { constructor(parts, options) { this.parts = parts; this.type = options.type; } });
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { blobs.push(blob); return 'blob:growth-history-' + blobs.length; }), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() { downloads.push(this.download); });
    click('Download notebook');
    click('Download trial CSV');
    expect(downloads).toEqual(['micro-lab-notebook.txt', 'micro-lab-trials.csv']);
    const exported = blobs[0].parts.join('');
    const [currentText, previousText] = exported.split('\nPrevious sweep\n');
    expect(currentText).toContain('\nCurrent sweep\n');
    expect(currentText).toContain('Variable to sweep: Oxygen availability');
    expect(currentText).toContain('Held constant: T. aquaticus · Temperature: 70 °C · pH: 7.5');
    expect(previousText).toContain('Variable to sweep: pH');
    expect(previousText).toContain('Held constant: E. coli · Temperature: 37 °C · Oxygen availability: 100/100');
    for (const [section, spec] of [[currentText, original.sweep], [previousText, original.previousSweep]]) {
      expect(section).toContain('Every sample starts at 5 population units');
      expect(section).toContain('not measurements');
      for (const point of window.__MicrobiologyCore.growth.sweep(spec.conditions, spec.variable).points) {
        const setting = String(point.value) + (spec.variable === 'oxygen' ? '/100' : spec.variable === 'tempC' ? ' °C' : '');
        expect(section).toContain(setting + '\t' + point.finalPopulation.toFixed(1) + '\t' + point.lagHours.toFixed(1));
      }
    }
    expect(exported).toContain('My reasoning before the run: Original reasoning 3');
    expect(exported).toContain('My evidence and explanation: Original evidence');
    expect(blobs[1].parts.join('')).toBe(window.__MicrobiologyCore.growth.csv({ ...original, previousSweep: undefined, sweep: null }));
    expect(JSON.stringify(mounted.state)).toBe(before);
    act(() => vi.runOnlyPendingTimers());
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });

  it('keeps both snapshots and their rendered evidence when a notebook download fails', () => {
    const addToast = vi.fn();
    mount(seed(), { addToast });
    const before = JSON.stringify(mounted.state), currentText = current().textContent, previousText = preview().textContent;
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => { throw new Error('download unavailable'); }), revokeObjectURL: vi.fn() });
    click('Download notebook');
    expect(addToast).toHaveBeenCalledWith('The notebook could not download. Your saved trials are still here.', 'error');
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(current().textContent).toBe(currentText);
    expect(preview().textContent).toBe(previousText);
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  });

  it('does not offer previous-sweep recovery for a duplicate or orphaned restored descriptor', () => {
    const initial = seed();
    initial.growthInvestigation.previousSweep = { ...initial.growthInvestigation.sweep, conditions: { ...initial.growthInvestigation.sweep.conditions, oxygen: 1000 } };
    mount(initial);
    expect(preview()).toBeNull();
    expect(mounted.container.querySelector('#gl-restore-previous-sweep')).toBeNull();
    const saved = JSON.parse(JSON.stringify(mounted.state));
    saved.growthInvestigation.sweep = null;
    act(() => mounted.root.unmount());
    mounted.container.remove(); mounted = null;
    mount(saved);
    expect(preview()).toBeNull();
    expect(current()).toBeNull();
    expect(mounted.container.querySelector('#gl-restore-previous-sweep')).toBeNull();
  });

  it.each(['next explanation', 'restore sweep'].flatMap(action => ['focus only', 'draft edit', 'inspection hour', 'disclosure'].map(newer => [action, newer])))
  ('cancels deferred %s focus after a newer %s action even when the requested evidence remains selected', (action, newer) => {
    vi.useFakeTimers();
    mount(seed());
    openSweeps();
    const trigger = action === 'next explanation' ? mounted.container.querySelector('[data-next-unexplained-trial]') : button('Restore previous sweep');
    trigger.focus();
    click(trigger);
    if (newer === 'focus only') mounted.container.querySelector('#gl-hypothesis').focus();
    if (newer === 'draft edit') write('#gl-hypothesis', 'My newer input');
    if (newer === 'inspection hour') write('#gl-review-hour', '6');
    if (newer === 'disclosure') click(mounted.container.querySelector('.micro-growth-review > summary'));
    const newerFocus = document.activeElement;
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(newerFocus);
    expect(book().selectedId).toBe(action === 'next explanation' ? 8 : 3);
    if (newer === 'draft edit') expect(book().hypothesis).toBe('My newer input');
    if (newer === 'inspection hour') expect(mounted.state.growthReviewHour).toBe(6);
  });

  it.each(['next explanation', 'restore sweep'].flatMap(action => ['#micro-tab-quiz', '.micro-library-toggle'].map(selector => [action, selector])))
  ('cancels deferred %s focus when focus moves outside Growth to %s without activating it', (action, selector) => {
    vi.useFakeTimers();
    mount(seed());
    openSweeps();
    const trigger = action === 'next explanation' ? mounted.container.querySelector('[data-next-unexplained-trial]') : button('Restore previous sweep');
    trigger.focus();
    click(trigger);
    const afterAction = JSON.parse(JSON.stringify(mounted.state));
    const outside = mounted.container.querySelector(selector);
    expect(outside).not.toBeNull();
    expect(outside.closest('[data-micro-growth]')).toBeNull();
    act(() => outside.focus());
    expect(document.activeElement).toBe(outside);
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(outside);
    expect(mounted.state).toEqual(afterAction);
    expect(mounted.state.tab).toBe('growthLab');
    expect(book().selectedId).toBe(action === 'next explanation' ? 8 : 3);
    expect(mounted.container.querySelector('#micro-tab-growthLab').getAttribute('aria-selected')).toBe('true');
    expect(mounted.container.querySelector('#micro-tab-quiz').getAttribute('aria-selected')).toBe('false');
  });

  it('does not revive a queued restore focus request after tab navigation or a JSON remount', () => {
    vi.useFakeTimers();
    mount(seed());
    openSweeps();
    click('Restore previous sweep');
    click(mounted.container.querySelector('#micro-tab-home'));
    click(mounted.container.querySelector('#micro-tab-growthLab'));
    const tab = mounted.container.querySelector('#micro-tab-growthLab');
    tab.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(tab);
    expect(historyStatus().textContent).toBe('');
    click('Restore previous sweep');
    const saved = book();
    reload();
    const draft = mounted.container.querySelector('#gl-hypothesis');
    draft.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(draft);
    expect(book()).toEqual(saved);
    expect(historyStatus().textContent).toBe('');
  });
});
