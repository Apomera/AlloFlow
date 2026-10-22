import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, api, host, root, latest, writes;
const button = text => [...host.querySelectorAll('button')].find(node => node.textContent.trim() === text);
const article = () => host.querySelector('.skyschool-learn-content');
const cards = () => [...host.querySelectorAll('.skyschool-learn-card')].map(node => node.textContent);
const quest = () => tool.questHooks.find(hook => hook.id === 'complete_lesson');
async function click(node) {
  expect(node).toBeTruthy();
  await act(async () => { node.focus(); node.click(); });
}
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => {
        writes.push(patch);
        setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } }));
      },
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
async function search(value) {
  const input = host.querySelector('input[type="search"]');
  await act(async () => {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}
beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim; writes = [];
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School lesson completion evidence', () => {
  it('keeps only own current lesson IDs with exact true values without changing the save', () => {
    const ids = Object.keys(api.LESSONS);
    const saved = Object.create({ [ids[0]]: true });
    Object.assign(saved, { [ids[1]]: true, [ids[2]]: false, [ids[3]]: 'true', [ids[4]]: 1, retired: true });
    const normalized = api.normalizeFlightLessonCompletions(saved);
    expect(normalized).toEqual({ [ids[1]]: true });
    expect(normalized).not.toBe(saved);
    expect(Object.hasOwn(saved, ids[0])).toBe(false);
    expect(saved.retired).toBe(true);
    expect(saved[ids[2]]).toBe(false);
  });

  it('does not invent completion from malformed saved containers', () => {
    for (const value of [null, undefined, false, 'lift', ['lift'], 7]) {
      expect(api.normalizeFlightLessonCompletions(value)).toEqual({});
    }
  });

  it('keeps aggregate-only, false, inherited, and retired progress from completing the lesson quest', () => {
    for (const completedLessons of [undefined, { lift: false }, { lift: 'true' }, { retired: true }, Object.create({ lift: true })]) {
      expect(quest().check({ completedLessons, lessonsCompleted: 999 })).toBe(false);
      expect(quest().progress({ completedLessons, lessonsCompleted: 999 })).toBe('Not yet');
    }
    expect(quest().check()).toBe(false);
  });

  it('recognizes a recorded lesson even when the saved aggregate counter is missing or stale', () => {
    for (const lessonsCompleted of [undefined, 0, -1, 'invalid']) {
      const saved = { completedLessons: { lift: true }, lessonsCompleted };
      expect(quest().check(saved)).toBe(true);
      expect(quest().progress(saved)).toBe('Done!');
    }
  });

  it('shows matching menu counts and completion markers for known true records only', async () => {
    const ids = Object.keys(api.LESSONS);
    const saved = Object.create({ [ids[0]]: true });
    Object.assign(saved, { [ids[1]]: true, [ids[2]]: false, [ids[3]]: 'true', retired: true });
    await mount({ completedLessons: saved, lessonsCompleted: 999, menuSections: { lessons: true } });
    const menu = host.querySelector('#skyschool-sec-lessons');
    expect(menu.textContent).toContain(`1/${ids.length} done`);
    const entries = [...menu.querySelectorAll('#skyschool-secbody-lessons button')];
    expect(entries.filter(node => node.getAttribute('aria-label').includes('(completed)'))).toHaveLength(1);
    expect(entries[1].getAttribute('aria-label')).toBe(api.LESSONS[ids[1]].title + ' (completed)');
    expect(entries[0].getAttribute('aria-label')).toBe(api.LESSONS[ids[0]].title);
  });

  it('keeps false saved lesson records actionable while the header and strip show the same valid count', async () => {
    const ids = Object.keys(api.LESSONS);
    await mount({ view: 'lesson', selectedLesson: ids[0], completedLessons: { [ids[0]]: false, [ids[1]]: true, retired: true }, lessonsCompleted: 999 });
    expect(host.querySelector('[aria-live="polite"]').textContent).toContain('1 done');
    const nav = [...host.querySelectorAll('nav[aria-label="Aerodynamics lessons"] button')];
    expect(nav.filter(node => node.getAttribute('aria-label').includes('(completed)'))).toHaveLength(1);
    expect(nav[0].getAttribute('aria-label')).not.toContain('(completed)');
    expect(button('📚 Mark lesson complete').disabled).toBe(false);
  });

  it('marks one new completion, preserves valid earlier progress and unrelated fields, and removes stale completion keys', async () => {
    const ids = Object.keys(api.LESSONS);
    const completedLessons = { [ids[0]]: false, [ids[1]]: true, [ids[2]]: 'true', retired: true };
    const before = { ...completedLessons };
    const unrelated = { learnTopic: 'math', preflightChecked: { 'Documents-0': true }, quizFirstAttempts: { kept: { choice: 'original' } } };
    await mount({ view: 'lesson', selectedLesson: ids[0], completedLessons, lessonsCompleted: 999, ...unrelated });
    await click(button('📚 Mark lesson complete'));
    expect(latest.completedLessons).toEqual({ [ids[0]]: true, [ids[1]]: true });
    expect(latest.lessonsCompleted).toBe(2);
    expect(latest.learnTopic).toBe(unrelated.learnTopic);
    expect(latest.preflightChecked).toEqual(unrelated.preflightChecked);
    expect(latest.quizFirstAttempts).toEqual(unrelated.quizFirstAttempts);
    expect(completedLessons).toEqual(before);
    expect(button('✓ Lesson completed').disabled).toBe(true);
    expect(quest().check(latest)).toBe(true);
  });

  it('does not count a same-tick repeated completion twice and restores the saved marker after remount', async () => {
    await mount({ view: 'lesson', selectedLesson: 'lift' });
    const complete = button('📚 Mark lesson complete');
    await act(async () => { complete.click(); complete.click(); });
    expect(latest.completedLessons).toEqual({ lift: true });
    expect(latest.lessonsCompleted).toBe(1);
    expect(writes.filter(patch => Object.hasOwn(patch, 'completedLessons'))).toHaveLength(1);
    const saved = structuredClone(latest);
    await mount(saved);
    expect(button('✓ Lesson completed').disabled).toBe(true);
    expect(host.querySelector('[aria-live="polite"]').textContent).toContain('1 done');
    expect(quest().check(latest)).toBe(true);
  });
});

describe('Sky School keyboard access to Learn cards', () => {
  it('moves into the reading pane when the already-active topic is activated', async () => {
    await mount({ view: 'learn', learnTopic: 'forces' });
    const active = host.querySelector('nav[aria-label="Learn topics"] [aria-current="page"]');
    const before = cards();
    await click(active);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-learn-topic-title'));
    expect(cards()).toEqual(before);
    expect(latest.learnTopic).toBe('forces');
  });

  it('keeps filtered cards reachable by keyboard without changing the search or reading selection', async () => {
    await mount({ view: 'learn', learnTopic: 'forces' });
    const input = await search('angle of attack');
    expect(document.activeElement).toBe(input);
    const before = cards();
    const active = host.querySelector('nav[aria-label="Learn topics"] [aria-current="page"]');
    await click(active);
    expect(document.activeElement).toBe(host.querySelector('#skyschool-learn-topic-title'));
    expect(input.value).toBe('angle of attack');
    expect(cards()).toEqual(before);
    expect(article().tabIndex).toBe(0);
    expect(article().getAttribute('aria-label')).toBeTruthy();
    expect(document.getElementById(active.getAttribute('aria-controls'))).toBe(article());
    article().focus();
    expect(document.activeElement).toBe(article());
  });
});
