import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let cfg;
let mounted;

function mountTool(saved = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const toolData = { nutritionLab: { view: 'labelReader', ...saved } };
  let bump;
  const ctx = makeCtx({ toolData,
    update(section, key, value) {
      toolData[section] = { ...toolData[section], [key]: value };
      if (bump) bump();
    }
  });
  function Host() {
    const [, setTick] = React.useState(0);
    bump = () => setTick(value => value + 1);
    return cfg.render(ctx);
  }
  const root = ReactDOMClient.createRoot(container);
  React.act(() => root.render(React.createElement(Host)));
  mounted = { container, root, state: () => toolData.nutritionLab,
    rerender: () => React.act(() => ctx.update('nutritionLab', 'unrelatedNote', 'kept')) };
  return mounted;
}

function control(view, name) {
  return [...view.container.querySelectorAll('select')].find(node =>
    node.getAttribute('aria-label') === name || [...node.labels].some(label => label.textContent.includes(name)));
}
function choose(view, name, value) {
  const node = control(view, name);
  expect(node, name).toBeTruthy();
  React.act(() => { node.value = value; node.dispatchEvent(new Event('change', { bubbles: true })); });
}
function click(node) { expect(node).toBeTruthy(); React.act(() => node.click()); }
function key(node, value) {
  React.act(() => node.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true })));
}
function row(view, label) {
  const table = view.container.querySelector('[aria-label="Serving-size explorer"] table');
  expect(table).toBeTruthy();
  const found = [...table.querySelectorAll('tr')].find(node => node.querySelector('th')?.textContent === label);
  expect(found, label).toBeTruthy();
  return [...found.querySelectorAll('td')].map(node => node.textContent);
}
function labelBank() {
  const source = readFileSync('stem_lab/stem_tool_nutritionlab.js', 'utf8');
  const start = source.indexOf('var LABELS = [');
  const end = source.indexOf('function NutritionFactsPanel', start);
  return new Function('__alloT', source.slice(start, end) + '\nreturn LABELS;')((_key, fallback) => fallback);
}

beforeEach(() => {
  resetStemLab();
  localStorage.clear();
  cfg = loadTool('stem_lab/stem_tool_nutritionlab.js', 'nutritionLab');
});
afterEach(() => {
  if (mounted) { React.act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  document.body.innerHTML = '';
});

describe('Nutrition Lab label investigations', () => {
  it('scales whole-container and half-container amounts without multiplying rounded DV labels', () => {
    const view = mountTool({ lr_idx: 1 });
    choose(view, 'Amount to explore', 'container');
    expect(row(view, 'Sodium')[0]).toMatch(/340 mg/);
    expect(row(view, 'Sodium')[0]).toMatch(/15%/);
    const frozen = [...view.container.querySelectorAll('button')].find(node => /^Challenge 3:/.test(node.getAttribute('aria-label') || ''));
    click(frozen);
    choose(view, 'Amount to explore', 'half');
    expect(row(view, 'Sodium')[0]).toMatch(/1,?080 mg/);
    expect(row(view, 'Sodium')[0]).toMatch(/47%/);
  });

  it('compares equal 100 g portions and preserves missing nutrients as unknown', () => {
    const view = mountTool({ lr_idx: 1 });
    choose(view, 'Amount to explore', 'equal');
    choose(view, 'Compare with', 'yogurt');
    expect(row(view, 'Sodium')[0]).toMatch(/607\.1\s*mg/);
    expect(row(view, 'Sodium')[1]).toContain('Not listed');
    expect(row(view, 'Protein')[0]).toMatch(/7\.1\s*g/);
    expect(row(view, 'Protein')[1]).toMatch(/10\s*g/);
  });

  it('keeps exploration and quiz responses through host updates and a fresh mount', () => {
    const view = mountTool({ lr_idx: 2 });
    choose(view, 'Amount to explore', 'half');
    choose(view, 'Compare with', 'granola');
    const answer = view.container.querySelector('[role="radiogroup"] [role="radio"]');
    click(answer);
    view.rerender();
    expect(control(view, 'Amount to explore').value).toBe('half');
    expect(control(view, 'Compare with').value).toBe('granola');
    expect(answer.isConnected).toBe(true);
    expect(answer.getAttribute('aria-checked')).toBe('true');
    const saved = structuredClone(view.state());
    React.act(() => view.root.unmount()); view.container.remove(); mounted = null;
    const reopened = mountTool(saved);
    expect(control(reopened, 'Amount to explore').value).toBe('half');
    expect(control(reopened, 'Compare with').value).toBe('granola');
    expect(reopened.container.querySelectorAll('[role="radio"][aria-checked="true"]').length).toBe(1);
  });

  it('provides one tab stop per question, wrapped arrow navigation, and Home/End', () => {
    const view = mountTool();
    const group = view.container.querySelector('[role="radiogroup"]');
    const radios = [...group.querySelectorAll('[role="radio"]')];
    expect(radios.filter(node => node.tabIndex === 0)).toEqual([radios[0]]);
    radios[0].focus();
    key(radios[0], 'ArrowLeft');
    expect(document.activeElement).toBe(radios.at(-1));
    expect(radios.at(-1).getAttribute('aria-checked')).toBe('true');
    key(radios.at(-1), 'Home');
    expect(document.activeElement).toBe(radios[0]);
    key(radios[0], 'End');
    expect(document.activeElement).toBe(radios.at(-1));
    key(radios.at(-1), 'ArrowRight');
    expect(document.activeElement).toBe(radios[0]);
    expect(radios.filter(node => node.tabIndex === 0)).toEqual([radios[0]]);
    expect(view.state().lr_answers_v2['0_0']).toBe(0);
  });

  it.each([
    { lr_idx: 999, lr_basis: {}, lr_compare: ['missing'], lr_answers_v2: [] },
    { lr_idx: -1, lr_basis: 'invalid', lr_compare: 'missing', lr_answers_v2: 'bad data' },
    { lr_idx: 1.5, lr_answers_v2: { '0_0': 42, '0_1': '1' } }
  ])('renders usable controls from malformed persisted data: %j', saved => {
    const view = mountTool(saved);
    expect(view.container.querySelector('[aria-label="Serving-size explorer"]')).toBeTruthy();
    const amount = control(view, 'Amount to explore');
    expect([...amount.options].some(option => option.value === amount.value)).toBe(true);
    expect(view.container.textContent).not.toMatch(/NaN|undefined|Infinity/);
    expect(view.container.querySelectorAll('[role="radio"][tabindex="0"]').length).toBe(3);
  });

  it('does not reuse answers to replaced questions or invent first-attempt accuracy', () => {
    const answers = {};
    labelBank().forEach((label, li) => label.questions.forEach((question, qi) => { answers[li + '_' + qi] = question.answer; }));
    const view = mountTool({ lr_answers: answers });
    expect(view.container.querySelectorAll('[role="radio"][aria-checked="true"]').length).toBe(0);
    React.act(() => view.root.unmount()); view.container.remove(); mounted = null;
    const completed = mountTool({ lr_answers_v2: answers });
    expect(completed.container.textContent).toContain('All labels decoded');
    expect(completed.container.textContent).not.toMatch(/first try|first attempt|100% accuracy/i);
  });

  it('restarts only the current challenge while retaining other completed labels and exploration', () => {
    const answers = {};
    labelBank().forEach((label, li) => label.questions.forEach((question, qi) => { answers[li + '_' + qi] = question.answer; }));
    const view = mountTool({ lr_idx: 2, lr_answers_v2: answers, lr_basis: 'half', lr_compare: 'granola' });
    click([...view.container.querySelectorAll('button')].find(node => node.textContent === 'Practice this label again'));
    expect(Object.keys(view.state().lr_answers_v2)).toHaveLength(9);
    expect(Object.keys(view.state().lr_answers_v2).some(key => key.startsWith('2_'))).toBe(false);
    expect(view.state().lr_answers_v2['0_0']).toBe(answers['0_0']);
    expect(control(view, 'Amount to explore').value).toBe('half');
    expect(control(view, 'Compare with').value).toBe('granola');
    expect(view.container.querySelectorAll('[role="radio"][aria-checked="true"]').length).toBe(0);
    expect(view.container.textContent).toContain('3 of 4 challenges complete');
    expect(view.container.textContent).not.toContain('All labels decoded');
  });
});
