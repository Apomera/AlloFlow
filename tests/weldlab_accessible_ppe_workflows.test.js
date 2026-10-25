import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React } from './helpers/stem_widgets_smoke_harness.js';
import { Simulate, node, freshTool, mountState, unmountState, click, change, button } from './helpers/weldlab_interaction_mount.js';

let outside;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; });

const query = selector => node().querySelector(selector);
const options = label => [...query(`[role="radiogroup"][aria-label="${label}"]`).querySelectorAll('[role="radio"]')];
const scenarioButton = index => [...node().querySelectorAll('button')].find(element => element.textContent.trim().startsWith(`Scenario ${index + 1}`));
const retained = { car2_reflect: 'Keep my learner notes.', weldBadges: { ppeSafety: true }, safe2_worn: ['safetyGlasses'], uw_probe_time: 7.25 };
function keepOutsideFocus() {
  outside = document.createElement('button'); document.body.append(outside); outside.focus();
}
async function activate(element) {
  expect(element).toBeTruthy(); element.focus(); await click(element);
}
async function key(element, value) {
  await React.act(() => Simulate.keyDown(element, { key: value }));
}
function expectFocus(selector) {
  const target = query(selector);
  expect(target, selector).toBeTruthy(); expect(document.activeElement).toBe(target);
  expect(target.tabIndex).toBe(-1); return target;
}
function expectRetained(app) {
  for (const [key, value] of Object.entries(retained)) expect(app.latest()[key]).toEqual(value);
}

describe('WeldLab PPE scenario navigation', () => {
  it('keeps arrow exploration ungraded and focuses answer feedback, Next and scenario navigation', async () => {
    keepOutsideFocus();
    const app = await mountState({ ...retained, view: 'ppeSafety', ps_view: 'scenarios', safe2_scIdx: 0 });
    expect(document.activeElement).toBe(outside);
    const first = options('Response choices'); first[0].focus();
    await key(first[0], 'ArrowRight');
    expect(document.activeElement).toBe(first[1]);
    expect(app.latest().safe2_scPick).toBeUndefined();
    expect(first.every(option => option.getAttribute('aria-checked') === 'false')).toBe(true);
    await activate(first[0]); // Deliberately miss scenario 1; the first answer stays final.
    expectFocus('[data-ppe-scenario-feedback]');
    expect(app.latest().safe2_scPick).toEqual({ 0: 0 });
    await activate(options('Response choices')[2]);
    expect(app.latest().safe2_scPick).toEqual({ 0: 0 });
    await activate(button('Next scenario →'));
    const nextHeading = expectFocus('[data-ppe-scenario-heading]').textContent;
    expect(app.latest()).toMatchObject({ safe2_scIdx: 1, safe2_scPick: { 0: 0 } });
    await activate(scenarioButton(0));
    expect(expectFocus('[data-ppe-scenario-heading]').textContent).not.toBe(nextHeading);
    expect(options('Response choices').every(option => option.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(app.latest()).toMatchObject({ safe2_scIdx: 0, safe2_scPick: { 0: 0 } });
    expectRetained(app);
  });

  it('names summary review controls by case and focuses same-case review and reset destinations', async () => {
    // These are all deliberately incorrect; every case receives a Review control.
    const picks = { 0: 0, 1: 1, 2: 0, 3: 0, 4: 1, 5: 0, 6: 0 };
    const app = await mountState({ ...retained, view: 'ppeSafety', ps_view: 'scenarios', safe2_scIdx: 0, safe2_scPick: picks });
    const reviews = [...node().querySelectorAll('button')].filter(element => element.textContent.trim() === 'Review');
    expect(reviews).toHaveLength(7);
    expect(new Set(reviews.map(element => element.getAttribute('aria-label'))).size).toBe(7);
    for (const review of reviews) expect(review.getAttribute('aria-label')).toMatch(/^Review: .+/);
    const firstTitle = query('[data-ppe-scenario-heading]').textContent;
    expect(reviews[0].getAttribute('aria-label')).toBe(`Review: ${firstTitle}`);
    await activate(reviews[0]); // The index is already zero; the action must still move focus.
    expectFocus('[data-ppe-scenario-heading]');
    expect(app.latest().safe2_scPick).toEqual(picks);
    await activate(button('↺ Reset scenarios and score'));
    expectFocus('[data-ppe-scenario-heading]');
    expect(app.latest()).toMatchObject({ safe2_scIdx: 0, safe2_scPick: {} });
    expect(button('↺ Reset scenarios and score')).toBeUndefined();
    expect(options('Response choices').every(option => option.getAttribute('aria-disabled') === 'false')).toBe(true);
    expectRetained(app);
  });
});

describe('WeldLab Underwater prediction and decision workflows', () => {
  it('focuses the revealed depth control after a prediction and Skip, and the prompt after Predict again', async () => {
    keepOutsideFocus();
    const app = await mountState({ ...retained, view: 'underwater', uw_view: 'pressure', uw_depth: 66, uw_tech: 'wet', tech2_uw_dec: { 1: 0 } });
    expect(document.activeElement).toBe(outside);
    const predictions = options('Your prediction'); predictions[0].focus();
    await key(predictions[0], 'End');
    expect(document.activeElement).toBe(predictions[2]);
    expect(app.latest().tech2_uw_pred).toBeUndefined();
    await activate(button('About the same: water is water'));
    const depth = query('[data-uw-depth-control] input[type="range"]');
    expect(document.activeElement).toBe(depth);
    expect(depth.getAttribute('aria-label')).toBe('Depth');
    expect(app.latest()).toMatchObject({ tech2_uw_pred: 'same', tech2_uw_pred_from: 66 });
    await change(depth, '131');
    expect(document.activeElement).toBe(depth);
    expect(app.latest().uw_depth).toBe(131);
    await activate(button('Predict again'));
    expectFocus('[data-uw-prediction-prompt]');
    expect(query('[data-uw-depth-control]')).toBeNull();
    expect(app.latest()).toMatchObject({ tech2_uw_pred: '', tech2_uw_pred_from: 66, uw_depth: 131 });
    await activate(button('Skip the prediction'));
    expect(document.activeElement).toBe(query('[data-uw-depth-control] input[type="range"]'));
    expect(app.latest()).toMatchObject({ tech2_uw_pred: 'skip', tech2_uw_pred_from: 66, uw_depth: 131, tech2_uw_dec: { 1: 0 } });
    expectRetained(app);
  });

  it('focuses each submitted decision and the first cleared prompt while preserving other lab state', async () => {
    const app = await mountState({ ...retained, view: 'underwater', uw_view: 'decide', uw_depth: 173, uw_tech: 'dry', tech2_uw_pred: 'slower', tech2_uw_pred_from: 20 });
    const first = options('Choices for job 1'); first[0].focus();
    await key(first[0], 'ArrowRight');
    expect(document.activeElement).toBe(first[1]);
    expect(app.latest().tech2_uw_dec).toBeUndefined();
    await activate(first[1]);
    expectFocus('[data-uw-decision-feedback="0"]');
    expect(app.latest().tech2_uw_dec).toEqual({ 0: 1 });
    expect(options('Choices for job 1').every(option => option.disabled)).toBe(true);
    await click(options('Choices for job 1')[0]);
    expect(app.latest().tech2_uw_dec).toEqual({ 0: 1 });
    await activate(options('Choices for job 2')[1]);
    expectFocus('[data-uw-decision-feedback="1"]');
    expect(app.latest().tech2_uw_dec).toEqual({ 0: 1, 1: 1 });
    await activate(button('↺ Reset decisions'));
    expectFocus('[data-uw-decision-heading="0"]');
    expect(app.latest().tech2_uw_dec).toEqual({});
    expect(query('[data-uw-decision-feedback]')).toBeNull();
    await activate(button('↺ Reset decisions')); // An already empty reset still has a destination.
    expectFocus('[data-uw-decision-heading="0"]');
    await activate(options('Choices for job 1')[0]);
    expectFocus('[data-uw-decision-feedback="0"]');
    expect(app.latest()).toMatchObject({ tech2_uw_dec: { 0: 0 }, uw_depth: 173, uw_tech: 'dry', tech2_uw_pred: 'slower', tech2_uw_pred_from: 20 });
    expectRetained(app);
  });
});

describe('WeldLab restored PPE and Underwater progress', () => {
  it.each([
    ['answered PPE case', { view: 'ppeSafety', ps_view: 'scenarios', safe2_scIdx: 0, safe2_scPick: { 0: 2 } }],
    ['complete PPE summary', { view: 'ppeSafety', ps_view: 'scenarios', safe2_scIdx: 6, safe2_scPick: { 0: 2, 1: 0, 2: 3, 3: 1, 4: 0, 5: 2, 6: 1 } }],
    ['Underwater prediction', { view: 'underwater', uw_view: 'pressure', tech2_uw_pred: 'same', tech2_uw_pred_from: 30, uw_depth: 120 }],
    ['skipped Underwater prediction', { view: 'underwater', uw_view: 'pressure', tech2_uw_pred: 'skip' }],
    ['answered Underwater decision', { view: 'underwater', uw_view: 'decide', tech2_uw_dec: { 0: 1, 1: 1 } }],
    ['complete Underwater decisions', { view: 'underwater', uw_view: 'decide', tech2_uw_dec: { 0: 0, 1: 1, 2: 2, 3: 3 } }],
  ])('leaves focus outside on the initial %s mount', async (_name, state) => {
    keepOutsideFocus(); const app = await mountState({ ...retained, ...state });
    expect(document.activeElement).toBe(outside);
    for (const [key, value] of Object.entries(state)) expect(app.latest()[key]).toEqual(value);
    expectRetained(app);
  });
});
