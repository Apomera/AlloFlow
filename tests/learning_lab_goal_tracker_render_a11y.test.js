import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Learning Lab Goal Tracker rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const ctx = makeCtx({
      toolData: {
        learningLab: {
          view: 'mytkGoals',
          viewLabel: 'My Goals',
          mytkGoals: {
            goals: [{
              id: 'goal-1',
              title: 'Biology review',
              specific: 'Review cell structure',
              measurable: 'Complete 20 questions',
              achievable: 'Use two study blocks',
              relevant: 'Prepare for the unit assessment',
              timebound: 'By Friday',
              createdAt: '2026-01-01',
              startDate: '2026-01-01',
              status: 'active',
              progress: 40,
              checkIns: [{ date: '2026-01-02', progress: 40, note: 'Reviewed organelles.' }],
            }],
          },
        },
      },
    });
    const Component = () => config.render(ctx);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders a named summary, filter group, goal list, and progressbar', () => {
    expect(host.querySelector('#learning-lab-goals-heading')?.tagName).toBe('H2');
    expect(host.querySelector('dl[aria-label="Goal status summary"]')).not.toBeNull();
    expect(host.querySelector('[role="group"][aria-label="Filter goals by status"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="group"] button[aria-pressed]')).toHaveLength(3);
    expect(host.querySelector('ul[aria-label="Goals"]')).not.toBeNull();
    const progress = host.querySelector('[role="progressbar"][aria-label="Biology review progress"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('40');
    expect(progress?.getAttribute('aria-valuetext')).toBe('40 percent');
  });

  it('renders real field attributes and focuses an invalid required title', async () => {
    const newButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('New goal'));
    await act(async () => {
      newButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const title = host.querySelector('#learning-lab-goal-title');
    expect(title?.required).toBe(true);
    expect(title?.maxLength).toBe(200);
    expect(host.querySelector('label[for="learning-lab-goal-title"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-goal-specific')?.getAttribute('aria-describedby')).toBe('learning-lab-goal-specific-help');

    const saveButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Save goal'));
    await act(async () => {
      saveButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(host.querySelector('#learning-lab-goal-title-error')?.getAttribute('role')).toBe('alert');
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(title.getAttribute('aria-describedby')).toBe('learning-lab-goal-title-error');
    expect(document.activeElement).toBe(title);
  });

  it('renders the detail range, history list, date, and progress semantics', async () => {
    const goalButton = host.querySelector('button[aria-label^="Open goal: Biology review"]');
    await act(async () => {
      goalButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(host.querySelector('#learning-lab-goal-detail-heading')?.tagName).toBe('H2');
    expect(document.activeElement?.id).toBe('learning-lab-goal-detail-heading');
    expect(host.querySelector('label[for="learning-lab-goal-checkin-progress"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-goal-checkin-progress')?.getAttribute('aria-valuetext')).toBe('50 percent');
    expect(host.querySelector('label[for="learning-lab-goal-checkin-note"]')).not.toBeNull();
    expect(host.querySelector('ol[aria-label="Goal check-in history"]')).not.toBeNull();
    expect(host.querySelector('time[datetime="2026-01-02"]')).not.toBeNull();
    expect(host.querySelector('[role="progressbar"][aria-label="Goal progress"]')?.getAttribute('aria-valuenow')).toBe('40');
  });
});
