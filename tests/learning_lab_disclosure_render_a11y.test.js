import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}
function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}
function submitForm(host) {
  host.querySelector('form[aria-labelledby="learning-lab-disclosure-form-heading"]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const olderLogs = Array.from({ length: 12 }, (_, index) => ({
  id: 'older-' + index,
  date: '2026-06-' + String(index + 1).padStart(2, '0'),
  context: 'Situation ' + (index + 1),
  who: 'Advisor', what: 'A support need', why: '', when: '', risk: 4, gain: 6
}));

describe('Learning Lab Disclosure Wizard rendered accessibility states', () => {
  let host;
  let root;
  let latestToolData;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkDisc', viewLabel: 'Disclosure Wizard',
      mytkDisc: {
        logs: [
          { id: 'g1', date: '2026-07-01', context: 'New semester', who: 'Ms. Rivera', what: 'Extended time need', why: 'Prevent misunderstanding', when: 'Office hours', risk: 3, gain: 8 },
          { id: 'g2', date: null, context: null, who: null, what: null, why: null, when: null },
          'legacy-invalid-entry',
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

  it('renders guidance, non-disclosure wording, and every saved decision without a cap', () => {
    expect(host.textContent).toContain('You control your personal information');
    expect(host.textContent).toContain('This reflection tool is not legal advice');
    expect(host.textContent).toContain('Saving a decision here does not disclose anything');
    expect(host.textContent).toContain('does not send or show your notes to a teacher, school, employer, clinician, or family member');
    const items = host.querySelectorAll('section[aria-labelledby="learning-lab-disclosure-history-heading"] ul > li');
    expect(items).toHaveLength(14);
    expect(host.textContent).toContain('Situation 12');
  });

  it('renders malformed legacy entries with fallbacks instead of crashing or leaking values', () => {
    expect(host.textContent).toContain('Disclosure decision');
    expect(host.textContent).not.toContain('null');
    expect(host.textContent).not.toContain('undefined out of 10');
    expect(host.textContent).not.toContain('NaN');
  });

  it('rejects a save without the required field, shows an inline alert, and moves focus (regression: this click crashed)', async () => {
    await act(async () => { submitForm(host); await settleFocus(); });
    const what = host.querySelector('#learning-lab-disclosure-what');
    expect(what.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-disclosure-what-error')?.textContent).toContain('Describe what information or need you are considering sharing.');
    expect(document.activeElement).toBe(what);
    expect(latestToolData.learningLab.mytkDisc.logs).toHaveLength(15);
  });

  it('saves a decision, preserves sibling data, and returns focus to the first field', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-disclosure-what'), 'Quiet testing space'); await Promise.resolve(); });
    await act(async () => { submitForm(host); await settleFocus(); });
    const items = host.querySelectorAll('section[aria-labelledby="learning-lab-disclosure-history-heading"] ul > li');
    expect(items).toHaveLength(15);
    expect(host.textContent).toContain('Quiet testing space');
    expect(host.querySelector('#learning-lab-disclosure-what').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-disclosure-context');
    expect(latestToolData.learningLab.mytkDisc.preservedSibling).toBe(true);
  });

  it('adjusting a rating updates its output text', async () => {
    const risk = host.querySelector('#learning-lab-disclosure-risk');
    await act(async () => { setValue(risk, '9'); risk.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
    expect(host.textContent).toContain('9 / 10');
  });

  it('removes a decision only after confirmation and moves focus to the history heading', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove disclosure decision: New semester');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this disclosure decision?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-disclosure-history-heading"] ul > li')).toHaveLength(14);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove decision').click(); await settleFocus(); });
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-disclosure-history-heading"] ul > li')).toHaveLength(13);
    expect(host.textContent).not.toContain('New semester');
    expect(document.activeElement?.id).toBe('learning-lab-disclosure-history-heading');
  });
});
