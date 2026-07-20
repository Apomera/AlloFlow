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
  host.querySelector('form[aria-labelledby="learning-lab-class-form-heading"]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Learning Lab Class Roster rendered accessibility states', () => {
  let host;
  let root;
  let latestToolData;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkRoster', viewLabel: 'My Class Roster',
      mytkRoster: {
        classes: [
          { id: 'c1', createdAt: '2026-07-01', name: 'Algebra II', teacher: 'Ms. Rivera', period: '3', room: '214', day: 'Monday, Wednesday', friend: 'Jordan', notes: 'Sit near the front' },
          { id: 'c2', createdAt: null, name: null, teacher: 42, period: null, room: null, day: null, friend: null, notes: null },
          'legacy-invalid-class'
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

  it('renders privacy guidance and tolerates malformed roster records', () => {
    expect(host.textContent).toContain('My Class Roster');
    expect(host.textContent).toContain('saved only in your Personal Toolkit and is not shared with or sent to anyone');
    expect(host.textContent).toContain('record only what you would be comfortable with them reading');
    expect(host.querySelectorAll('ul[aria-label="Class roster"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Untitled class');
    expect(host.textContent).toContain('Teacher42');
    expect(host.textContent).not.toContain('null');
  });

  it('rejects a save without a class name and focuses the name field', async () => {
    await act(async () => { submitForm(host); await settleFocus(); });
    const name = host.querySelector('#learning-lab-class-name');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-class-name-error')?.textContent).toContain('Enter a class name.');
    expect(document.activeElement).toBe(name);
    expect(host.querySelectorAll('ul[aria-label="Class roster"] > li')).toHaveLength(2);
  });

  it('adds a class, preserves sibling data, and returns focus to the name field', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-class-name'), 'Chemistry'); await Promise.resolve(); });
    await act(async () => { submitForm(host); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Class roster"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('Chemistry');
    expect(host.querySelector('#learning-lab-class-name').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-class-name');
    expect(latestToolData.learningLab.mytkRoster.preservedSibling).toBe(true);
  });

  it('edits a malformed legacy class without crashing and updates it in place', async () => {
    await act(async () => { host.querySelector('#learning-lab-class-edit-c2').click(); await settleFocus(); });
    expect(host.textContent).toContain('Edit class');
    expect(host.querySelector('#learning-lab-class-name').value).toBe('');
    expect(host.querySelector('#learning-lab-class-teacher').value).toBe('42');
    expect(document.activeElement?.id).toBe('learning-lab-class-name');
    await act(async () => { setValue(host.querySelector('#learning-lab-class-name'), 'Recovered class'); await Promise.resolve(); });
    await act(async () => { submitForm(host); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Class roster"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Recovered class');
    expect(host.textContent).not.toContain('Untitled class');
    expect(document.activeElement?.id).toBe('learning-lab-class-edit-c2');
  });

  it('cancels an edit and restores focus to the originating edit control', async () => {
    await act(async () => { host.querySelector('#learning-lab-class-edit-c1').click(); await settleFocus(); });
    expect(host.querySelector('#learning-lab-class-name').value).toBe('Algebra II');
    await act(async () => { buttonByText(host, 'Cancel edit').click(); await settleFocus(); });
    expect(host.textContent).toContain('Add class');
    expect(host.querySelector('#learning-lab-class-name').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-class-edit-c1');
  });

  it('removes a class only after confirmation and returns focus to the name field', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Remove class: Algebra II');
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this class?');
    expect(dialog?.textContent).toContain('Algebra II');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ul[aria-label="Class roster"] > li')).toHaveLength(2);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove class').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Class roster"] > li')).toHaveLength(1);
    expect(host.textContent).not.toContain('Algebra II');
    expect(document.activeElement?.id).toBe('learning-lab-class-name');
  });
});
