import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let host, root, tool, latest, updateSaved, outside;
const heading = id => host.querySelector('#' + id);
const button = text => [...host.querySelectorAll('button')].find(element => element.textContent.includes(text));
async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.focus(); element.click(); });
}
async function change(element, value) {
  expect(element).toBeTruthy();
  await act(async () => {
    element.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function patch(values) { await act(async () => { updateSaved(values); }); }
async function mount(seed = {}) {
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', railCollapsed: false,
      takeoffTutorialDismissed: true, landingTutorialDismissed: true, ...seed } });
    latest = data.flightSim;
    updateSaved = values => setData(previous => ({ ...previous, flightSim: { ...previous.flightSim, ...values } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      update: (id, key, value) => setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } })),
      updateMulti: (id, values) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...values } })),
    }));
  }
  await act(async () => { root.render(React.createElement(App)); });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStemLab();
  window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim');
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  if (root) await act(async () => { root.unmount(); });
  root = null;
  host?.remove();
  outside?.remove();
  outside = null;
  delete window.__testHooks;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('SkySchool activity navigation focus', () => {
  it('focuses the activity heading on entry and the menu heading when returning', async () => {
    await mount();
    expect(document.activeElement).toBe(heading('skyschool-briefing-title'));
    await click(host.querySelector('button[aria-label="Open pre-flight checklist"]'));
    expect(document.activeElement).toBe(heading('skyschool-preflight-title'));
    expect(heading('skyschool-preflight-title').tabIndex).toBe(-1);
    await click(host.querySelector('button[aria-label="Back to menu"]') || button('Menu'));
    expect(latest.view).toBe('menu');
    expect(document.activeElement).toBe(heading('skyschool-briefing-title'));
  });

  it('moves focus when lessons change and keeps it on a normal lesson response', async () => {
    await mount({ view: 'lesson', selectedLesson: 'lift' });
    const title = heading('skyschool-lesson-title');
    expect(document.activeElement).toBe(title);
    const differentLesson = [...host.querySelectorAll('nav button')].find(element => element.getAttribute('aria-current') !== 'page');
    const initialTitle = title.textContent;
    await click(differentLesson);
    expect(title.textContent).not.toBe(initialTitle);
    expect(document.activeElement).toBe(title);
    const done = button('Mark lesson complete');
    await click(done);
    expect(latest.completedLessons[latest.selectedLesson]).toBe(true);
    expect(document.activeElement).not.toBe(title);
  });

  it('announces question number and content through the focused heading after next, previous, and random navigation', async () => {
    await mount({ view: 'quiz' });
    const question = heading('skyschool-quiz-question');
    const firstText = question.textContent;
    expect(document.activeElement).toBe(question);
    expect(question.getAttribute('aria-label')).toMatch(/^Question 1 of \d+: /);
    expect(question.getAttribute('aria-label')).toContain(firstText);
    await click(button('Next'));
    expect(document.activeElement).toBe(question);
    expect(question.textContent).not.toBe(firstText);
    expect(question.getAttribute('aria-label')).toMatch(/^Question 2 of \d+: /);
    await click(button('Previous'));
    expect(document.activeElement).toBe(question);
    expect(question.textContent).toBe(firstText);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    await click(button('Random'));
    expect(document.activeElement).toBe(question);
    expect(question.getAttribute('aria-label')).toContain(question.textContent);
    expect(question.textContent).not.toBe(firstText);
  });

  it('does not steal focus after an answer or explicit practice of the same question', async () => {
    await mount({ view: 'quiz' });
    const question = heading('skyschool-quiz-question');
    const answer = host.querySelector('button[aria-label^="Answer "]');
    await click(answer);
    expect(latest.quizTotal).toBe(1);
    expect(document.activeElement).not.toBe(question);
    await click(button('Practice this question'));
    expect(host.querySelector('[data-quiz-practice]')).toBeTruthy();
    expect(document.activeElement).not.toBe(question);
  });

  it('focuses a selected Learn topic while preserving focus during search and checklist review', async () => {
    await mount();
    await click(host.querySelector('button[aria-label="Open Learn mode"]'));
    const title = heading('skyschool-learn-topic-title');
    expect(document.activeElement).toBe(title);
    const firstText = title.textContent;
    const otherTopic = [...host.querySelectorAll('nav[aria-label="Learn topics"] button')].find(element => element.getAttribute('aria-current') !== 'page');
    await click(otherTopic);
    expect(title.textContent).not.toBe(firstText);
    expect(document.activeElement).toBe(title);
    const search = host.querySelector('input[type="search"]');
    await change(search, 'wing');
    expect(latest.learnQuery).toBe('wing');
    expect(document.activeElement).toBe(search);
    await patch({ view: 'preflight' });
    const check = host.querySelector('input[type="checkbox"]');
    await click(check);
    expect(check.checked).toBe(true);
    expect(document.activeElement).toBe(check);
  });

  it('leaves calculator and guided-investigation controls focused as their values change', async () => {
    await mount({ view: 'calculator' });
    expect(document.activeElement).toBe(heading('skyschool-calculator-title'));
    const calculatorSlider = host.querySelector('input[type="range"]');
    await change(calculatorSlider, Number(calculatorSlider.value) + Number(calculatorSlider.step || 1));
    expect(document.activeElement).toBe(calculatorSlider);
    await patch({ view: 'stallHunt', stallInvestigation: { phase: 'experiment' } });
    expect(document.activeElement).toBe(heading('stall-phase-title'));
    const investigationSlider = host.querySelector('input[type="range"]');
    await change(investigationSlider, Number(investigationSlider.value) + Number(investigationSlider.step || 1));
    expect(document.activeElement).toBe(investigationSlider);
  });

  it('preserves cockpit entry and help focus, then focuses the debrief after exit', async () => {
    await mount();
    await click(host.querySelector('button[aria-label="Free Flight from Portland, ME"]'));
    const cockpit = host.querySelector('canvas[role="application"]');
    expect(document.activeElement).toBe(cockpit);
    await click(button('Controls and help'));
    expect(document.activeElement).toBe(button('Close help'));
    await click(button('Close help'));
    expect(document.activeElement).toBe(cockpit);
    await click(button('Exit'));
    expect(latest.view).toBe('debrief');
    expect(document.activeElement).toBe(heading('skyschool-debrief-title'));
  });

  it('does not pull initial focus away from an app control outside the tool', async () => {
    outside = document.createElement('button');
    outside.textContent = 'App navigation';
    document.body.appendChild(outside);
    outside.focus();
    await mount({ view: 'quiz' });
    expect(document.activeElement).toBe(outside);
    await click(button('Next'));
    expect(document.activeElement).toBe(heading('skyschool-quiz-question'));
  });
});
