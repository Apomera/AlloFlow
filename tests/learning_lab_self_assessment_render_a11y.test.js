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
async function answerAll(host) {
  for (let index = 1; index <= 12; index++) {
    await act(async () => { host.querySelector('#learning-lab-assessment-q' + index + '-option-0').click(); await Promise.resolve(); });
  }
}

describe('Learning Lab Learning Reflection rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkAssess', viewLabel: 'Learning Reflection',
      mytkAssess: { assessments: [
        { id: 's1', date: '2026-07-10', answers: { q1: 'Trying it myself', q2: 'Afternoon' } },
        { id: 's2', date: null, answers: 'legacy-bad-answers' },
        null,
        'legacy-invalid-snapshot'
      ] }
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
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders non-diagnostic framing, progress, and history over malformed snapshots', () => {
    expect(host.textContent).toContain('A reflection, not a test or diagnosis');
    expect(host.textContent).toContain('does not assign a learning style, score, or label');
    expect(host.textContent).toContain('saving does not send them to or notify anyone');
    expect(host.textContent).toContain('0 of 12 questions answered.');
    expect(host.querySelectorAll('ul[aria-label="Most recent learning reflection snapshots"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).not.toContain('null');
  });

  it('shows malformed answers as unrecorded instead of crashing the review details', () => {
    expect(host.textContent).toContain('No response recorded');
    expect(host.textContent).toContain('Trying it myself');
    expect(host.textContent).not.toContain('legacy-bad-answers');
  });

  it('blocks incomplete submission with per-question errors and focus on the first missing question', async () => {
    await act(async () => { host.querySelector('#learning-lab-assessment-q1-option-0').click(); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-assessment-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('11 questions remain.');
    expect(document.activeElement?.id).toBe('learning-lab-assessment-question-q2');
    expect(host.querySelector('#learning-lab-assessment-question-q2-error')?.textContent).toContain('Choose one response for this question.');
  });

  it('saves a complete reflection and moves focus to the history heading', async () => {
    await answerAll(host);
    expect(host.textContent).toContain('12 of 12 questions answered.');
    const form = host.querySelector('form[aria-labelledby="learning-lab-assessment-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent learning reflection snapshots"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('0 of 12 questions answered.');
    expect(document.activeElement?.id).toBe('learning-lab-assessment-history-heading');
  });

  it('removes a snapshot only after confirmation', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove learning reflection from 2026-07-10');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this reflection snapshot?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent learning reflection snapshots"] > li')).toHaveLength(2);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove snapshot').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Most recent learning reflection snapshots"] > li')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('learning-lab-assessment-history-heading');
  });
});
