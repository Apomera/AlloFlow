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
    expect(table.caption.textContent).toBe('Saved sweep settings and model responses');
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
