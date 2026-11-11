// Lessons were finished by pressing "Mark lesson complete": about sixty words, a
// formula and a self-declared tick. And the first lesson credited lift to the SHAPE
// of the wing alone, which cannot explain a symmetric wing, inverted flight, or the
// stall the same tool teaches (review 2026-11-09). Each lesson now ends in one check
// question that has to be answered correctly, and the lift text is built on turning
// air downward, with angle of attack and speed setting how much.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SOURCE = process.env.SKYSCHOOL_LESSON_SOURCE || 'stem_lab/stem_tool_flightsim.js';
let tool, api, host, root, latest;
const box = () => host.querySelector('[data-lesson-check]');
const options = () => [...box().querySelectorAll('[data-lesson-check-option]')];
const completeButton = () => host.querySelector('[data-lesson-complete]');
const byText = (text) => options().find((node) => node.textContent.replace(/^[✓✗] /, '') === text);
async function click(node) { expect(node).toBeTruthy(); await act(async () => { node.click(); }); }
async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'lesson', selectedLesson: 'lift', ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData((previous) => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, patch) => setData((previous) => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  tool = loadTool(SOURCE, 'flightSim');
  api = window.__RR_TEST_EXPORTS__.flightSim;
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); delete window.__RR_TEST_EXPORTS__; });

describe('lesson check questions', () => {
  it('every lesson has one, with four different options and exactly one key', () => {
    const lessons = Object.keys(api.LESSONS);
    expect(lessons.length).toBeGreaterThanOrEqual(7);
    for (const id of lessons) {
      const check = api.getFlightLessonCheck(id);
      expect(check, id).toBeTruthy();
      expect(new Set(check.options).size, id).toBe(4);
      expect(check.options.filter((option) => option === check.correct), id).toHaveLength(1);
      expect(check.why.length, id).toBeGreaterThan(40);
      expect(api.getFlightLessonCheck(id).options, id).toEqual(check.options);
    }
    // As authored the key is first; as shown it must not always sit in one place.
    const positions = lessons.map((id) => { const check = api.getFlightLessonCheck(id); return check.options.indexOf(check.correct); });
    expect(new Set(positions).size).toBeGreaterThanOrEqual(3);
    expect(api.getFlightLessonCheck('not-a-lesson')).toBeNull();
  });

  it('keeps the lesson locked until the question is answered correctly, then completes it', async () => {
    await mount();
    const check = api.getFlightLessonCheck('lift');
    expect(box().getAttribute('data-lesson-check-state')).toBe('open');
    expect(completeButton().getAttribute('data-lesson-complete')).toBe('locked');
    expect(completeButton().getAttribute('aria-disabled')).toBe('true');
    expect(completeButton().disabled).toBe(false); // still focusable, with a reason attached
    expect(document.getElementById(completeButton().getAttribute('aria-describedby')).textContent).toMatch(/Answer the check question/);
    await click(completeButton());
    expect(latest.completedLessons).toBeUndefined();

    const wrongText = check.options.find((option) => option !== check.correct);
    await click(byText(wrongText));
    expect(box().getAttribute('data-lesson-check-state')).toBe('incorrect');
    expect(box().querySelector('[data-lesson-check-feedback]').textContent).toMatch(/Not quite/);
    expect(box().querySelector('[data-lesson-check-feedback]').textContent).not.toContain(check.why);
    await click(completeButton());
    expect(latest.completedLessons).toBeUndefined();

    await click(byText(check.correct));
    expect(box().getAttribute('data-lesson-check-state')).toBe('correct');
    expect(box().querySelector('[data-lesson-check-feedback]').textContent).toBe(check.why);
    expect(completeButton().getAttribute('data-lesson-complete')).toBe('ready');
    expect(completeButton().getAttribute('aria-disabled')).toBe('false');
    await click(completeButton());
    expect(latest.completedLessons).toEqual({ lift: true });
    expect(completeButton().getAttribute('data-lesson-complete')).toBe('done');
  });

  it('saves nothing about the answers themselves, and asks again for another lesson', async () => {
    await mount();
    const before = JSON.stringify(latest);
    await click(byText(api.getFlightLessonCheck('lift').correct));
    expect(JSON.stringify(latest)).toBe(before);
    await click([...host.querySelectorAll('nav[aria-label="Aerodynamics lessons"] button')].find((node) => !node.hasAttribute('aria-current')));
    expect(latest.selectedLesson).not.toBe('lift');
    expect(box().getAttribute('data-lesson-check-state')).toBe('open');
    expect(completeButton().getAttribute('data-lesson-complete')).toBe('locked');
  });

  it('shows a lesson finished in an earlier visit as done without asking again', async () => {
    await mount({ completedLessons: { lift: true } });
    expect(completeButton().getAttribute('data-lesson-complete')).toBe('done');
    expect(host.querySelector('#skyschool-lesson-complete-hint')).toBeNull();
  });
});

describe('lift is taught as turning air, set by angle of attack and speed', () => {
  it('the lift lesson names the mechanism, the two controls and the stall, and covers symmetric wings', () => {
    const text = api.LESSONS.lift.content;
    expect(text).toMatch(/turning air downward/);
    expect(text).toMatch(/angle of attack/);
    expect(text).toMatch(/critical angle/);
    expect(text).toMatch(/symmetric wing/);
    expect(text).toMatch(/upside down/);
    expect(text).not.toMatch(/generated by the shape of the wing/);
    // New wording needs a new key: the registered text would otherwise override it.
    expect(api.LESSONS.lift.contentId).toBe('lift_v2');
  });

  it('Bernoulli is part of the same picture and the catch-up story is called wrong', () => {
    const text = api.LESSONS.bernoulli.content;
    expect(text).toMatch(/same lift described by Newton/);
    expect(text).toMatch(/does NOT speed up because it has to 'catch up'/);
    expect(api.LESSONS.bernoulli.contentId).toBe('bernoulli_v2');
  });

  it('the drag lesson uses minimum-drag and best-glide speed, not "drag bucket"', () => {
    const text = api.LESSONS.drag.content;
    expect(text).not.toMatch(/drag bucket/);
    expect(text).toMatch(/minimum-drag speed is also the best-glide speed/);
    expect(api.LESSONS.drag.contentId).toBe('drag_v2');
  });

  it('nothing in the tool credits lift to shape alone or says a climb needs lift above weight', () => {
    const source = fs.readFileSync(SOURCE, 'utf8');
    expect(source).not.toMatch(/Lift is generated by the shape of the wing/);
    expect(source).not.toMatch(/To climb, lift must exceed weight\./);
    expect(source).not.toMatch(/'drag bucket'/);
  });
});
