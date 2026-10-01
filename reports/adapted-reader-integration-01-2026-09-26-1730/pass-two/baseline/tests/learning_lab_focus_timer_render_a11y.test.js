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

function localToday() {
  const date = new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

describe('Learning Lab Focus Timer rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const ctx = makeCtx({
      toolData: {
        learningLab: {
          view: 'mytkFocus',
          viewLabel: 'Focus Timer',
          mytkFocus: {
            workMin: 25,
            breakMin: 5,
            soundEnabled: true,
            sessions: [{
              id: 'session-1',
              date: localToday(),
              workMin: 25,
              task: 'Read biology notes',
              completedAt: Date.now(),
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

  it('renders the idle form, interval groups, sound preference, summary, and history', () => {
    expect(host.querySelector('#learning-lab-focus-heading')?.tagName).toBe('H2');
    expect(host.querySelector('dl[aria-label="Focus summary"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-focus-task"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-focus-task')?.maxLength).toBe(240);
    expect([...host.querySelectorAll('legend')].map((legend) => legend.textContent)).toEqual(['Focus interval length', 'Break interval length']);
    expect(host.querySelectorAll('fieldset button[aria-pressed]')).toHaveLength(8);
    expect(host.querySelector('button[aria-pressed="true"]')?.textContent).toContain('25 min');
    expect([...host.querySelectorAll('button')].some((button) => button.textContent === 'Completion sound: on')).toBe(true);
    expect(host.querySelector('ol[aria-label="Today\'s focus sessions"]')).not.toBeNull();
    expect(host.querySelector('time[datetime]')).not.toBeNull();
  });

  it('renders and focuses an accessible countdown after starting', async () => {
    const startButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Start 25-minute'));
    await act(async () => {
      startButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const progress = host.querySelector('[role="progressbar"][aria-label="Focus interval remaining"]');
    const timer = host.querySelector('#learning-lab-focus-timer-value[role="timer"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('100');
    expect(progress?.getAttribute('aria-valuetext')).toBe('25 minutes 0 seconds remaining');
    expect(timer?.getAttribute('aria-label')).toBe('Focus time remaining: 25 minutes 0 seconds');
    expect(document.activeElement).toBe(timer);
    expect(host.querySelector('svg[aria-hidden="true"][focusable="false"]')).not.toBeNull();
  });

  it('pauses without discarding time, resumes, and resets focus to the task field', async () => {
    const startButton = [...host.querySelectorAll('button')].find((button) => button.textContent.includes('Start 25-minute'));
    await act(async () => {
      startButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const beforePause = host.querySelector('#learning-lab-focus-timer-value').textContent;
    const pauseButton = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Pause focus');
    await act(async () => { pauseButton.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-focus-phase-status')?.textContent).toBe('Focus interval paused.');
    expect(host.querySelector('#learning-lab-focus-timer-value')?.textContent).toBe(beforePause);
    expect([...host.querySelectorAll('button')].some((button) => button.textContent === 'Resume focus')).toBe(true);

    const resumeButton = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Resume focus');
    await act(async () => {
      resumeButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.querySelector('#learning-lab-focus-phase-status')?.textContent).toBe('Focus interval in progress.');

    const resetButton = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Reset timer');
    await act(async () => {
      resetButton.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.querySelector('#learning-lab-focus-phase-status')?.textContent).toBe('Timer ready.');
    expect(document.activeElement?.id).toBe('learning-lab-focus-task');
  });
});
