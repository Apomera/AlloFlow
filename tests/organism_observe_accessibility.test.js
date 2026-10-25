import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const paths = ['stem_lab/stem_tool_organismid.js', 'desktop/web-app/public/stem_lab/stem_tool_organismid.js'];
const disposers = [];
let frames;

function mountTool(path, seed = {}) {
  resetStemLab();
  const config = loadTool(path, 'organismId');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), announce = vi.fn();
  let current, setCurrent;
  function Host() {
    const [data, setData] = React.useState({ organismId: { activeView: 'observe', observationExample: 'bird', ...seed } });
    current = data.organismId;
    setCurrent = patch => setData(previous => ({ ...previous, organismId: { ...previous.organismId, ...patch } }));
    return config.render(makeCtx({ toolData: data, setToolData: setData, announceToSR: announce }));
  }
  act(() => root.render(React.createElement(Host)));
  disposers.push(() => { act(() => root.unmount()); host.remove(); });
  return { host, announce, state: () => current, patch: patch => act(() => setCurrent(patch)),
    one: selector => host.querySelector(selector), all: selector => [...host.querySelectorAll(selector)],
    button: label => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === label) };
}

async function settleFocus() {
  await act(async () => {
    await Promise.resolve();
    vi.runOnlyPendingTimers();
    frames.splice(0).forEach(callback => callback(16));
    await Promise.resolve();
  });
}
async function activate(button) {
  expect(button).toBeTruthy();
  expect(button.tagName).toBe('BUTTON');
  expect(button.disabled).toBe(false);
  button.focus();
  act(() => button.click());
  await settleFocus();
}
async function selectExample(view, value) {
  const control = view.one('#oid-observation-example');
  control.focus();
  act(() => { control.value = value; control.dispatchEvent(new Event('change', { bubbles: true })); });
  await settleFocus();
  return control;
}
function assertStep(view, title) {
  const step = view.one('#oid-observation-step');
  expect(step).toBeTruthy();
  expect(step.tabIndex).toBe(-1);
  expect(step.getAttribute('role')).toBe('region');
  expect(step.getAttribute('aria-labelledby')).toBe('oid-observation-step-title');
  expect(view.one('#oid-observation-step-title').tagName).toBe('H3');
  expect(view.one('#oid-observation-step-title').textContent).toContain(title);
  const descriptions = step.getAttribute('aria-describedby').split(/\s+/);
  expect(descriptions).toContain('oid-observation-example-evidence');
  expect(descriptions).toContain('oid-observation-step-help');
  for (const id of descriptions) expect(view.one('#' + id)?.textContent.trim()).toBeTruthy();
  return step;
}
function assertStepFocused(view, title) {
  const step = assertStep(view, title);
  expect(document.activeElement).toBe(step);
  return step;
}
const entry = { id: 'saved-1', date: '2026-10-24', exampleId: 'bird', subject: 'Feathered visitor',
  note: 'I observed feathers and wings.', claim: 'Bird example', path: [{ question: 'Are feathers described?', answer: 'yes' }] };

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  frames = [];
  vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(async () => {
  disposers.splice(0).forEach(dispose => dispose());
  await settleFocus();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe.each(paths)('Taxonomy Observe accessibility: %s', path => {
  it('names the native answer group with the current question and exposes its evidence without taking focus on render', async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    disposers.push(() => outside.remove());
    const view = mountTool(path);
    await settleFocus();
    const step = assertStep(view, 'Are feathers described?');
    const group = step.querySelector('[role="group"]');
    expect(group.getAttribute('aria-labelledby')).toBe('oid-observation-step-title');
    expect([...group.querySelectorAll('button')].map(button => button.textContent.trim())).toEqual(['Yes', 'No', 'Not sure']);
    expect([...group.querySelectorAll('button')].every(button => button.type === 'button' && !button.disabled)).toBe(true);
    expect(view.one('#oid-observation-example-evidence').textContent).toContain('Feathers cover the body');
    expect(view.one('#oid-observation-step-help').textContent).toMatch(/teaching example description/i);
    expect(document.activeElement).toBe(outside);
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('keeps a persistent focus target when No replaces the question while retaining all native answer buttons', async () => {
    const view = mountTool(path), step = assertStep(view, 'Are feathers described?');
    await activate(view.button('No'));
    expect(assertStepFocused(view, 'Are jointed legs described?')).toBe(step);
    expect(view.state().observationAnswers).toEqual(['no']);
    expect(view.all('#oid-observation-step [role="group"] button').map(button => button.textContent.trim())).toEqual(['Yes', 'No', 'Not sure']);
    expect(view.one('[data-key-result]')).toBeNull();
  });

  it('moves meaningful focus to the result when Yes removes the answer controls', async () => {
    const view = mountTool(path), step = assertStep(view, 'Are feathers described?');
    const yes = view.button('Yes');
    await activate(yes);
    expect(yes.isConnected).toBe(false);
    expect(assertStepFocused(view, 'Bird example')).toBe(step);
    expect(view.one('[data-key-result]')).toBe(view.one('#oid-observation-step-title'));
    expect(view.one('[data-key-result]').getAttribute('role')).not.toBe('status');
    expect(view.one('#oid-observation-step-help').textContent).toMatch(/check every decision/i);
    expect(view.one('#oid-observation-step [role="group"]')).toBeNull();
    expect(view.state().observationAnswers).toEqual(['yes']);
    expect(view.state().observationJournal).toBeUndefined();
  });

  it('focuses unresolved guidance after Not sure rather than leaving focus on a removed control', async () => {
    const view = mountTool(path);
    await activate(view.button('Not sure'));
    assertStepFocused(view, 'Unresolved');
    expect(view.one('#oid-observation-step-help').textContent).toMatch(/missing feature is not evidence/i);
    expect(view.state().observationAnswers).toEqual(['unsure']);
  });

  it('returns Back to the last decision and disables Back once the route is empty', async () => {
    const view = mountTool(path, { observationAnswers: ['yes'] });
    await activate(view.button('Back one decision'));
    assertStepFocused(view, 'Are feathers described?');
    expect(view.state().observationAnswers).toEqual([]);
    expect(view.button('Back one decision').disabled).toBe(true);
  });

  it('restarts at the first decision while preserving the observation draft and journal', async () => {
    const view = mountTool(path, { observationAnswers: ['no', 'yes'], observationNote: 'My draft evidence.', observationJournal: [entry], observationReviewKey: 'old' });
    await activate(view.button('Restart key'));
    assertStepFocused(view, 'Are feathers described?');
    expect(view.state()).toMatchObject({ observationAnswers: [], observationNote: 'My draft evidence.', observationJournal: [entry], observationReviewKey: null });
  });

  it('focuses a named evidence review and returns to the decision when that review is dismissed by navigation', async () => {
    const view = mountTool(path, { observationAnswers: ['no'] });
    await activate(view.button('Review my evidence'));
    const review = view.one('#oid-observation-review');
    expect(document.activeElement).toBe(review);
    expect(review.tabIndex).toBe(-1);
    expect(review.getAttribute('aria-labelledby')).toBe('oid-observation-review-title');
    expect(view.one('#oid-observation-review-title').textContent).toContain('Evidence check');
    expect(review.getAttribute('aria-describedby')).toBe('oid-observation-review-detail');
    expect(view.one('#oid-observation-review-detail').textContent).toMatch(/Revisit decision 1/);
    expect(view.one('#oid-observation-review-detail').getAttribute('role')).not.toBe('status');
    const back = view.button('Return to this decision');
    await activate(back);
    expect(back.isConnected).toBe(false);
    expect(view.one('#oid-observation-review')).toBeNull();
    assertStepFocused(view, 'Are feathers described?');
    expect(view.state().observationAnswers).toEqual([]);
  });

  it('keeps native example selection focus and announces the new evidence context and prompt', async () => {
    const view = mountTool(path, { observationAnswers: ['yes'], observationReviewKey: 'old' });
    const control = await selectExample(view, 'insect');
    expect(document.activeElement).toBe(control);
    expect(control.tagName).toBe('SELECT');
    assertStep(view, 'Are feathers described?');
    expect(view.one('#oid-observation-example-evidence').textContent).toContain('Six jointed legs');
    expect(view.state()).toMatchObject({ observationExample: 'insect', observationAnswers: [], observationReviewKey: null });
    expect(view.announce.mock.calls.some(([message]) => /Six-legged visitor/.test(message) && /Are feathers described/.test(message))).toBe(true);
  });

  it('keeps field observations unclassified and retains select focus when changing into and out of field mode', async () => {
    const view = mountTool(path);
    const control = await selectExample(view, 'field');
    expect(document.activeElement).toBe(control);
    assertStep(view, 'Unclassified field observation');
    expect(view.button('Yes')).toBeUndefined();
    expect(view.announce.mock.calls.some(([message]) => /field observation/i.test(message) && /Unclassified/.test(message))).toBe(true);
    await selectExample(view, 'bird');
    expect(document.activeElement).toBe(control);
    assertStep(view, 'Are feathers described?');
    expect(view.button('Yes')).toBeTruthy();
  });

  it('does not move focus away from note-taking when an unrelated state rerender occurs', async () => {
    const view = mountTool(path);
    const note = view.one('#oid-observation-note'); note.focus();
    view.patch({ observationContext: 'Classroom sample' });
    await settleFocus();
    expect(document.activeElement).toBe(note);
    expect(view.announce).not.toHaveBeenCalled();
  });

  it('preserves existing journal revisit focus and the restored route without classifying a field note', async () => {
    const fieldEntry = { ...entry, id: 'field-1', exampleId: 'field', subject: 'Field note', claim: 'Unclassified field observation', path: [] };
    const view = mountTool(path, { observationJournal: [fieldEntry] });
    await activate(view.button('Revisit Field note'));
    expect(document.activeElement).toBe(view.one('#oid-observation-note'));
    expect(view.one('#oid-observation-note').value).toBe(fieldEntry.note);
    expect(view.state()).toMatchObject({ observationExample: 'field', observationAnswers: [], observationPreviousId: 'field-1' });
    assertStep(view, 'Unclassified field observation');
  });
});
