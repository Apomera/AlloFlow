import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}
async function advanceToLastStep(host) {
  for (let index = 0; index < 3; index += 1) {
    await act(async () => { buttonByText(host, 'Next step').click(); await Promise.resolve(); });
  }
}

describe('Learning Lab optional Self-Compassion reflections rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkCompass', viewLabel: 'Optional Self-Compassion Reflections', mytkCompass: {
      sessions: [
        { id: 's1', exerciseId: 'rain', date: '2000-01-01', time: null },
        { exerciseId: 'unknown', date: 'invalid-date' }
      ], preservedSibling: true
    } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      latest = toolData;
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders optional-use, non-clinical, research-limit, and privacy guidance', () => {
    expect(host.querySelector('#learning-lab-self-compassion-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('Use, adapt, or skip any prompt');
    expect(host.textContent).toContain('not therapy, diagnosis, or emergency support');
    expect(host.textContent).toContain('study heterogeneity, high risk of bias');
    expect(host.textContent).toContain('does not itself notify a teacher, school, counselor, clinician, or family member');
  });

  it('uses semantic exercise navigation with named large targets', () => {
    const list = host.querySelector('ul[aria-label="Optional self-compassion reflections"]');
    expect(list?.children).toHaveLength(3);
    const start = host.querySelector('button[aria-label="Start RAIN reflection"]');
    expect(start).not.toBeNull();
    expect(start.style.minHeight).toBe('110px');
    expect(start.textContent).toContain('1 saved history entry');
  });

  it('opens on a focused heading with skip and sensory-choice guidance', async () => {
    await act(async () => { host.querySelector('button[aria-label="Start RAIN reflection"]').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-self-compassion-step-heading');
    expect(host.textContent).toContain('You may also leave it unnamed and move on');
    expect(host.textContent).toContain('keep your eyes open, remain still, or stop at any time');
    const progress = host.querySelector('[role="progressbar"]');
    expect(progress?.getAttribute('aria-valuenow')).toBe('1');
    expect(progress?.getAttribute('aria-valuetext')).toBe('Step 1 of 4');
  });

  it('moves focus to each changed step and returns focus after stopping', async () => {
    await act(async () => { host.querySelector('button[aria-label="Start RAIN reflection"]').click(); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Next step').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-self-compassion-step-heading');
    expect(host.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('2');
    await act(async () => { buttonByText(host, 'Stop and return').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-self-compassion-start-rain');
  });

  it('offers separate finish choices and does not save unless selected', async () => {
    await act(async () => { host.querySelector('button[aria-label="Start RAIN reflection"]').click(); await Promise.resolve(); });
    await advanceToLastStep(host);
    expect(buttonByText(host, 'Finish without saving')).not.toBeNull();
    expect(buttonByText(host, 'Save to personal history')).not.toBeNull();
    expect(latest.learningLab.mytkCompass.sessions).toHaveLength(2);
    await act(async () => { buttonByText(host, 'Finish without saving').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkCompass.sessions).toHaveLength(2);
    expect(document.activeElement?.id).toBe('learning-lab-self-compassion-start-rain');
  });

  it('saves only after explicit choice, preserves sibling data, and focuses the entry', async () => {
    await act(async () => { host.querySelector('button[aria-label="Start RAIN reflection"]').click(); await Promise.resolve(); });
    await advanceToLastStep(host);
    await act(async () => { buttonByText(host, 'Save to personal history').click(); await Promise.resolve(); });
    const saved = latest.learningLab.mytkCompass.sessions[0];
    expect(saved.exerciseId).toBe('rain');
    expect(latest.learningLab.mytkCompass.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-self-compassion-session-heading-' + saved.id);
  });

  it('renders every history entry with semantic articles and robust dates', () => {
    const items = host.querySelectorAll('ul[aria-label="All personal self-compassion history entries"] > li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('article[aria-labelledby] h4')).not.toBeNull();
    expect(items[0].querySelector('time')?.dateTime).toBeTruthy();
    expect(items[1].textContent).toContain('Practice type not recorded');
    expect(items[1].textContent).toContain('Date not recorded');
  });

  it('deletes a legacy entry without an ID and restores focus to history', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete self-compassion history entry: Practice type not recorded"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Delete entry').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkCompass.sessions).toHaveLength(1);
    expect(latest.learningLab.mytkCompass.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-self-compassion-history-heading');
  });
});
