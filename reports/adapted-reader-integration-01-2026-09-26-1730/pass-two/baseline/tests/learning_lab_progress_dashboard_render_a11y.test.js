import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function localIso(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function statValue(host, label) {
  const term = Array.from(host.querySelectorAll('dt')).find((item) => item.textContent === label);
  return term?.parentElement?.querySelector('dd')?.textContent;
}

describe('Learning Lab Personal Tracker Summary rendered accessibility states', () => {
  let host;
  let root;
  const today = localIso(new Date());

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkDash', viewLabel: 'Optional Personal Tracker Summary',
      mytkGoals: { goals: [{ id: 'g1', status: 'active', progress: 90 }, { id: 'g2', status: 'done', progress: 10 }] },
      mytkFocus: { sessions: [{ date: today, workMin: '30' }, { date: today, workMin: 'not-a-number' }] },
      mytkBrain: { items: [{ id: 'b1', done: false }, { id: 'b2', done: true }] },
      mytkHabits: { habits: [{ id: 'h1' }, { id: 'h2' }], logs: { h1: [today], h2: [] } },
      mytkReflect: { entries: [{ date: today }] },
      mytkPrompts: { responses: [{ date: today }] },
      mytkJournal: { entries: [{ date: today }] },
      mytkGrat: { entries: [{ date: today }] },
      mytkFlash: { cards: [{ id: 'c1' }, { id: 'c2' }] },
      mytkSleep: { entries: [{ date: today, hours: null }] },
      mytkTasks: { tasks: [{ id: 't1', steps: [] }, { id: 't2', steps: [{ done: true }] }, { id: 't3', steps: [{ done: false }] }] },
      mytkEF: { ratings: [{ initiation: 10, planning: 1 }] },
      mytkEmotion: { checks: [{ date: today }] }
    } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders optional, non-evaluative, and privacy guidance', () => {
    expect(host.querySelector('#learning-lab-progress-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('not grades, diagnoses, comparisons, productivity scores, or judgments about progress');
    expect(host.textContent).toContain('This view combines potentially sensitive records');
    expect(host.textContent).toContain('does not itself notify a teacher, school, counselor, clinician, or family member');
  });

  it('uses a semantic summary without progressbar scoring', () => {
    const summary = host.querySelector('section[aria-labelledby="learning-lab-progress-summary-heading"] dl');
    expect(summary).not.toBeNull();
    expect(summary.querySelectorAll('dt')).toHaveLength(13);
    expect(summary.querySelectorAll('dd')).toHaveLength(13);
    expect(host.querySelector('[role="progressbar"]')).toBeNull();
  });

  it('normalizes focus minutes and reports neutral counts', () => {
    expect(statValue(host, 'Active goal entries')).toBe('1');
    expect(statValue(host, 'Finished goal entries')).toBe('1');
    expect(statValue(host, 'Focus minutes logged, 7 days')).toBe('30');
    expect(statValue(host, 'Habit check-ins today')).toBe('1 of 2');
    expect(statValue(host, 'Sleep logs saved')).toBe('1');
    expect(statValue(host, 'Open task plans')).toBe('2');
    expect(statValue(host, 'Executive-function reflections')).toBe('1');
    expect(statValue(host, 'Appreciation notes saved')).toBe('1');
  });

  it('does not render sleep thresholds, averaged ratings, or action recommendations', () => {
    expect(host.textContent).toContain('No duration threshold or health judgment is applied');
    expect(host.textContent).toContain('Ratings are not averaged across different domains');
    expect(host.textContent).not.toContain('below seven');
    expect(host.textContent).not.toContain('Habits left to check');
    expect(host.textContent).not.toContain('You can do it again');
  });

  it('renders all 14 calendar dates and descriptions visibly', () => {
    const section = host.querySelector('section[aria-labelledby="learning-lab-progress-activity-heading"]');
    const items = section.querySelectorAll('ul > li');
    expect(items).toHaveLength(14);
    expect(section.querySelectorAll('time')).toHaveLength(14);
    section.querySelectorAll('time').forEach((time) => expect(time.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}$/));
    expect(section.textContent).toContain('No recognized activity');
  });

  it('shows today text and every recognized activity type without color-only meaning', () => {
    const todayCard = host.querySelector('time[datetime="' + today + '"]')?.closest('li');
    expect(todayCard?.textContent).toContain('(today)');
    for (const activity of ['focus log', 'habit check-in', 'weekly reflection', 'prompt response', 'appreciation note', 'journal entry', 'sleep log', 'emotion check-in']) {
      expect(todayCard?.textContent).toContain(activity);
    }
  });

  it('explains that source records may be incomplete and no action is required', () => {
    expect(host.textContent).toContain('does not verify that records are current, complete, or comparable');
    expect(host.textContent).toContain('does not recommend a sleep duration, habit target, task count, or reflection schedule');
    expect(host.textContent).toContain('no action is required from this summary');
  });
});
