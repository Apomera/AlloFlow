import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { node, freshTool, mountState, unmountState, click, button } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });
const core = () => window.__WeldLabCore;
const query = selector => node().querySelector(selector);
const radios = label => [...query(`[role="radiogroup"][aria-label="${label}"]`).querySelectorAll('[role="radio"]')];
const retained = { car2_reflect: 'Keep these learner notes.', weldBadges: { ppeSafety: true }, codes_pick: 'asme9', jc_tab: 'lap', proc2_prep: 'v', proc2_pos: '3G' };
async function activate(element) {
  expect(element).toBeTruthy(); element.focus(); await click(element);
}
function expectFocus(selector) {
  const destination = query(selector);
  expect(destination, selector).toBeTruthy();
  expect(document.activeElement).toBe(destination);
  expect(destination.tabIndex).toBe(-1);
  return destination;
}
function keepOutsideFocus() {
  outside = document.createElement('button'); document.body.append(outside); outside.focus();
}
function expectRetained(app) {
  for (const [key, value] of Object.entries(retained)) expect(app.latest()[key], key).toEqual(value);
}
const clone = value => JSON.parse(JSON.stringify(value));
function correctJointRadio(app) {
  const { proc } = core();
  const state = app.latest(), item = proc.jqBuild(state.proc2_jqSeed)[state.proc2_jqIdx];
  return radios('Joint type choices')[proc.JOINT_KEYS.indexOf(item.joint)];
}

describe('WeldLab Codes practice navigation', () => {
  it('focuses sorter Previous, Next and Reset destinations while preserving scored answers until reset', async () => {
    const app = await mountState({ ...retained, view: 'codes', insp2_codesTab: 'sort', insp2_sortIdx: 0, insp2_clause: { 0: 0 } });
    await activate(radios('Sort this change')[0]);
    expectFocus('[data-codes-feedback="sort"]');
    expect(app.latest().insp2_sort).toEqual({ fno: 'req' });
    await activate(button('Next ➡️'));
    const nextText = expectFocus('[data-codes-step-heading="sort"]').textContent;
    expect(app.latest()).toMatchObject({ insp2_sortIdx: 1, insp2_sort: { fno: 'req' } });
    expect(query('#codes-sort-progress').textContent).toBe('Card 2 of 10');
    await activate(radios('Sort this change')[1]);
    expectFocus('[data-codes-feedback="sort"]');
    expect(node().textContent).toContain('Score 2 / 2');
    const scored = clone(app.latest().insp2_sort);
    await activate(button('⬅️ Previous'));
    expect(expectFocus('[data-codes-step-heading="sort"]').textContent).not.toBe(nextText);
    expect(app.latest()).toMatchObject({ insp2_sortIdx: 0, insp2_sort: scored });
    expect(radios('Sort this change').every(option => option.disabled)).toBe(true);
    await activate(button('🔄 Reset sorter'));
    expectFocus('[data-codes-step-heading="sort"]');
    expect(app.latest()).toMatchObject({ insp2_sortIdx: 0, insp2_sort: {}, insp2_clause: { 0: 0 } });
    expect(radios('Sort this change').every(option => !option.disabled)).toBe(true);
    expectRetained(app);
  });

  it('focuses the next clause task and a same-index restart without rewriting other activity records', async () => {
    const app = await mountState({ ...retained, view: 'codes', insp2_codesTab: 'clause', insp2_clauseIdx: 0, insp2_sort: { fno: 'req' } });
    await activate(radios('Pick the clause')[1]);
    expectFocus('[data-codes-feedback="clause"]');
    expect(app.latest().insp2_clause).toEqual({ 0: 1 });
    const inspect = query('[data-clause-trace-tab="8"]');
    await activate(inspect);
    expect(document.activeElement).toBe(inspect);
    expect(query('[data-clause-trace]').getAttribute('data-selected')).toBe('8');
    expect(app.latest().insp2_clause).toEqual({ 0: 1 });
    await activate(button('Next task ➡️'));
    expectFocus('[data-codes-step-heading="clause"]');
    expect(query('#codes-clause-progress').textContent).toBe('Task 2 of 6');
    expect(app.latest()).toMatchObject({ insp2_clauseIdx: 1, insp2_clause: { 0: 1 } });
    expect(query('[data-clause-trace]')).toBeNull();
    await activate(radios('Pick the clause')[1]);
    expectFocus('[data-codes-feedback="clause"]');
    expect(app.latest().insp2_clause).toEqual({ 0: 1, 1: 1 });
    await activate(button('🔄 Restart quiz'));
    expectFocus('[data-codes-step-heading="clause"]');
    expect(app.latest()).toMatchObject({ insp2_clauseIdx: 0, insp2_clause: {}, insp2_sort: { fno: 'req' } });
    await activate(radios('Pick the clause')[0]);
    await activate(button('🔄 Restart quiz'));
    expectFocus('[data-codes-step-heading="clause"]');
    expect(app.latest()).toMatchObject({ insp2_clauseIdx: 0, insp2_clause: {} });
    expectRetained(app);
  });
});

describe('WeldLab Joint Catalog transfer quiz focus', () => {
  it('focuses Start, feedback, the next drawing and the returned catalog while retaining the run and catalog settings', async () => {
    keepOutsideFocus();
    const app = await mountState({ ...retained, view: 'jointCatalog', proc2_jqOn: false, proc2_jqBest: 7 });
    expect(document.activeElement).toBe(outside);
    await activate(button('🎯 Start Quiz'));
    expectFocus('[data-joint-step-heading="question"]');
    expect(query('#proc2-jq-progress').textContent).toContain('Drawing 1 of 10');
    expect(app.latest()).toMatchObject({ proc2_jqOn: true, proc2_jqIdx: 0, proc2_jqAns: [], proc2_jqBest: 7 });
    await activate(correctJointRadio(app));
    expectFocus('[data-proc2="jq-feedback"]');
    const answers = clone(app.latest().proc2_jqAns), seed = app.latest().proc2_jqSeed;
    expect(answers).toHaveLength(1);
    expect(query('#proc2-jq-progress').textContent).toContain('Score 1');
    await activate(button('Next drawing →'));
    expectFocus('[data-joint-step-heading="question"]');
    expect(app.latest()).toMatchObject({ proc2_jqIdx: 1, proc2_jqAns: answers, proc2_jqBest: 7, proc2_jqSeed: seed });
    expect(query('[data-proc2="jq-feedback"]')).toBeNull();
    await activate(button('← Back to Catalog'));
    expectFocus('[data-joint-step-heading="catalog"]');
    expect(app.latest()).toMatchObject({ proc2_jqOn: false, proc2_jqIdx: 1, proc2_jqAns: answers, proc2_jqBest: 7, proc2_jqSeed: seed });
    expectRetained(app);
  });

  it('focuses completed results and the results-panel return while keeping all answers and the earned best score', async () => {
    const seed = 11, items = core().proc.jqBuild(seed), answers = items.map(item => item.joint);
    const app = await mountState({ ...retained, view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: seed, proc2_jqIdx: 9, proc2_jqAns: answers.slice(0, 9), proc2_jqBest: 3 });
    await activate(correctJointRadio(app));
    expectFocus('[data-proc2="jq-feedback"]');
    await activate(button('See your results →'));
    expectFocus('[data-joint-step-heading="results"]');
    expect(app.latest()).toMatchObject({ proc2_jqIdx: 10, proc2_jqAns: answers, proc2_jqBest: 10, proc2_jqSeed: seed });
    const returnButton = [...query('[data-proc2="jq-end"]').querySelectorAll('button')].find(element => element.textContent === '← Back to Catalog');
    await activate(returnButton);
    expectFocus('[data-joint-step-heading="catalog"]');
    expect(app.latest()).toMatchObject({ proc2_jqOn: false, proc2_jqIdx: 10, proc2_jqAns: answers, proc2_jqBest: 10 });
    expectRetained(app);
  });

  it('focuses the retried drawing and clears only that run while retaining the best result', async () => {
    const seed = 19, answers = core().proc.jqBuild(seed).map(item => item.joint);
    const app = await mountState({ ...retained, view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: seed, proc2_jqIdx: 10, proc2_jqAns: answers, proc2_jqBest: 10 });
    await activate(button('🔄 Retry Quiz'));
    expectFocus('[data-joint-step-heading="question"]');
    expect(app.latest()).toMatchObject({ proc2_jqOn: true, proc2_jqIdx: 0, proc2_jqAns: [], proc2_jqBest: 10 });
    expectRetained(app);
  });
});

describe('WeldLab restored Codes and Joint practice states', () => {
  it.each([
    ['answered sorter', { view: 'codes', insp2_codesTab: 'sort', insp2_sortIdx: 0, insp2_sort: { fno: 'req' } }],
    ['answered clause task', { view: 'codes', insp2_codesTab: 'clause', insp2_clauseIdx: 0, insp2_clause: { 0: 0 } }],
    ['answered joint drawing', { view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 7, proc2_jqIdx: 0, proc2_jqAns: ['butt'], proc2_jqBest: 4 }],
    ['joint results', { view: 'jointCatalog', proc2_jqOn: true, proc2_jqSeed: 7, proc2_jqIdx: 10, proc2_jqAns: ['butt', 'lap', 'tjoint', 'corner', 'edge', 'butt', 'lap', 'tjoint', 'corner', 'edge'], proc2_jqBest: 4 }],
  ])('leaves focus outside on the initial saved %s mount', async (_name, state) => {
    keepOutsideFocus();
    const app = await mountState({ ...retained, ...state });
    expect(document.activeElement).toBe(outside);
    for (const [key, value] of Object.entries(state)) expect(app.latest()[key], key).toEqual(value);
    expectRetained(app);
  });
});
