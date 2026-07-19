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
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Learning Lab Decision Maker rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkDec', viewLabel: 'Decision Maker',
      mytkDec: { decisions: [
        { id: 'd1', title: 'Which club should I join?', createdAt: 'not-a-date',
          options: [{ id: 'o1', name: 'Robotics' }, { id: 'o2', name: 'Drama' }, { id: 'o3' }, 'legacy-bad-option'],
          criteria: [{ id: 'c1', name: 'Fun', weight: 5 }, { id: 'c2', name: null, weight: 'heavy' }],
          scores: { 'o1|c1': 8, 'o2|c1': 6 } },
        { id: 'd2', title: null, createdAt: '2026-07-01', options: 'legacy-bad-options', criteria: null, scores: {} },
        'legacy-invalid-decision'
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

  it('renders local-only guidance and survives malformed decisions without Invalid Date or null dates', () => {
    expect(host.textContent).toContain('Decision Maker');
    expect(host.textContent).toContain('Decisions you create here are saved only in your Personal Toolkit and are not shared with or sent to anyone.');
    expect(host.querySelectorAll('ul[aria-label="Saved decisions"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Untitled decision');
    expect(host.textContent).toContain('date not recorded');
    expect(host.textContent).not.toContain('Invalid Date');
    expect(host.textContent).not.toContain('null days ago');
    expect(host.textContent).not.toContain('NaN');
  });

  it('validates the required title inline and moves focus to it', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-decision-new-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const title = host.querySelector('#learning-lab-decision-new-title');
    expect(title.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-decision-title-error')?.textContent).toContain('Enter the decision you want to make.');
    expect(document.activeElement).toBe(title);
  });

  it('creates a decision and moves focus into the editor', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-decision-new-title'), 'Summer plans'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-decision-new-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('Editing decision: Summer plans');
    expect(document.activeElement?.id).toBe('learning-lab-decision-editor-heading');
    expect(host.textContent).toContain('A decision must keep at least two options.');
  });

  it('opens a malformed decision, skips unreadable rows, and computes totals from valid data', async () => {
    await act(async () => { host.querySelector('#learning-lab-decision-open-d1').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-decision-editor-heading');
    expect(host.textContent).toContain('3 options · 2 criteria');
    const table = host.querySelector('table');
    expect(table).not.toBeNull();
    expect(table.textContent).toContain('Fun (weight 5)');
    expect(table.textContent).not.toContain('null');
    expect(host.textContent).toContain('Robotics has the highest score: 40.');
  });

  it('adds an option and moves focus to its new input', async () => {
    await act(async () => { host.querySelector('#learning-lab-decision-open-d1').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, '+ Add option').click(); await settleFocus(); });
    expect(document.activeElement?.tagName).toBe('INPUT');
    expect(document.activeElement?.id).toMatch(/^learning-lab-decision-option-/);
    expect(host.textContent).toContain('4 options · 2 criteria');
  });

  it('deletes an option only after confirmation and prunes its scores', async () => {
    await act(async () => { host.querySelector('#learning-lab-decision-open-d1').click(); await settleFocus(); });
    const deleteRobotics = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Delete option 1: Robotics');
    await act(async () => { deleteRobotics.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this option?');
    await act(async () => { buttonByText(dialog, 'Delete option').click(); await settleFocus(); });
    expect(host.textContent).toContain('2 options · 2 criteria');
    expect(host.textContent).toContain('Drama has the highest score: 30.');
    expect(document.activeElement?.id).toBe('learning-lab-decision-add-option');
  });

  it('returns from the editor to the originating open control', async () => {
    await act(async () => { host.querySelector('#learning-lab-decision-open-d1').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, '← All decisions').click(); await settleFocus(); });
    expect(document.activeElement?.id).toBe('learning-lab-decision-open-d1');
  });

  it('deletes a whole decision after confirmation and returns to the list form', async () => {
    await act(async () => { host.querySelector('#learning-lab-decision-open-d1').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Delete decision').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this decision?');
    expect(dialog?.textContent).toContain('Which club should I join?');
    await act(async () => { buttonByText(dialog, 'Delete decision').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Saved decisions"] > li')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('learning-lab-decision-new-title');
  });
});
