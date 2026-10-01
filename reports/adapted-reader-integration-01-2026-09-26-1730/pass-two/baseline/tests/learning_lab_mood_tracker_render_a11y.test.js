import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
function localISO(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

const olderLogs = Array.from({ length: 21 }, (_, index) => ({
  id: 'older-' + index, date: '2026-05-' + String(index + 1).padStart(2, '0'), time: 1778000000000 + index, mood: 6, energy: 5, note: ''
}));

describe('Learning Lab Mood Tracker rendered accessibility states', () => {
  let host;
  let root;
  let latestToolData;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkMood', viewLabel: 'Mood Tracker',
      mytkMood: {
        logs: [
          { id: 'y1', date: localISO(1), time: 1782500000000, mood: 8, energy: 7, note: 'Slept well' },
          { id: 'm1', date: null, time: null, mood: 'high', energy: null, note: 42 },
          'legacy-invalid-log',
          ...olderLogs
        ],
        preservedSibling: true
      }
    } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initial);
      latestToolData = toolData;
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

  it('renders guidance, no-target framing, and every check-in without a cap', () => {
    expect(host.textContent).toContain('saving does not notify a teacher, school, clinician, or family member');
    expect(host.textContent).toContain('there is no target or good score');
    expect(host.textContent).toContain('consider talking with someone you trust');
    const items = host.querySelectorAll('section[aria-labelledby="learning-lab-mood-recent-heading"] ul > li');
    expect(items).toHaveLength(23);
    expect(host.textContent).toContain('Total check-ins');
    expect(host.textContent).toContain('23');
  });

  it('renders malformed legacy check-ins with clamped values and date fallback', () => {
    expect(host.textContent).toContain('Date not recorded');
    expect(host.textContent).toContain('0 out of 10');
    expect(host.textContent).not.toContain('null');
    expect(host.textContent).not.toContain('NaN');
    expect(host.textContent).not.toContain('high out of 10');
  });

  it('shows yesterday in the local fourteen-day history (regression: UTC dates hid evening check-ins)', () => {
    const yesterdayCell = host.querySelector('ul[aria-label="Fourteen-day mood history"] time[datetime="' + localISO(1) + '"]');
    expect(yesterdayCell).not.toBeNull();
    const spans = Array.from(host.querySelectorAll('ul[aria-label="Fourteen-day mood history"] span[aria-label="Mood 8 out of 10"]'));
    expect(spans.length).toBe(1);
  });

  it('saves a daily check-in and switches to the completed state', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-mood-form-heading"]');
    expect(form).not.toBeNull();
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('Today’s check-in is complete');
    expect(host.textContent).toContain('Mood 5 out of 10; energy 5 out of 10.');
    expect(host.querySelector('form[aria-labelledby="learning-lab-mood-form-heading"]')).toBeNull();
    expect(latestToolData.learningLab.mytkMood.preservedSibling).toBe(true);
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-mood-recent-heading"] ul > li')).toHaveLength(24);
  });

  it('removes a check-in only after confirmation and moves focus to the recent heading', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove mood check-in from ' + localISO(1));
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this mood check-in?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-mood-recent-heading"] ul > li')).toHaveLength(23);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove check-in').click(); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-mood-recent-heading"] ul > li')).toHaveLength(22);
    expect(document.activeElement?.id).toBe('learning-lab-mood-recent-heading');
  });
});
