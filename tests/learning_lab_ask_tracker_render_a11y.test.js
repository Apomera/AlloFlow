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
  host.querySelector('form[aria-labelledby="learning-lab-ask-form-heading"]')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const olderEntries = Array.from({ length: 16 }, (_, index) => ({
  id: 'older-' + index,
  date: '2026-06-' + String(index + 1).padStart(2, '0'),
  time: Date.UTC(2026, 5, index + 1, 15, 0, 0),
  who: 'Study group',
  what: 'Practice question ' + (index + 1),
  outcome: 'partial',
  notes: ''
}));

describe('Learning Lab Optional Support Request Notes rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkAsk', viewLabel: 'Optional Support Request Notes',
      mytkAsk: { asks: [
        { id: 'a1', date: '2026-07-01', time: Date.UTC(2026, 6, 1, 14, 30, 0), who: 'Teacher', what: 'Extra time on quiz', outcome: 'helpful', notes: 'Asking early helped' },
        { id: 'a2', date: 'not-a-date', time: 'garbage', who: '', what: '', outcome: 'bogus-outcome', notes: '' },
        'legacy-invalid-string',
        ...olderEntries
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

  it('renders optional, privacy, and non-communication guidance without metrics', () => {
    expect(host.textContent).toContain('Optional Support Request Notes');
    expect(host.textContent).toContain('Saving a note does not send a request or notify a teacher, school, employer, clinician, family member, or the person named.');
    expect(host.textContent).toContain('Avoid including private details you do not want stored.');
    expect(host.textContent).toContain('Notes are shown in saved order without scores or rankings.');
    expect(host.textContent).toContain('A saved note is not evidence that support was requested, received, effective, or required.');
    expect(host.textContent).not.toMatch(/\d+%/);
    expect(host.textContent).not.toMatch(/\bstreak\b/i);
    expect(host.textContent).not.toMatch(/\brank(?:ed|ing)?\s+\d/i);
    expect(host.textContent).not.toContain('Help request statistics');
  });

  it('renders all saved entries, skipping unreadable records without crashing', () => {
    const items = host.querySelectorAll('ul[aria-label="All saved support notes"] > li');
    expect(items).toHaveLength(18);
    expect(host.textContent).toContain('18 support notes saved.');
    expect(host.textContent).toContain('No readable details recorded in this legacy note.');
    expect(host.textContent).toContain('Date not recorded');
    expect(host.textContent).not.toContain('Invalid Date');
    expect(host.textContent).toContain('Practice question 16');
  });

  it('rejects a fully blank submit with an inline alert and focus on the support field', async () => {
    await act(async () => { submitForm(host); await settleFocus(); });
    const what = host.querySelector('#learning-lab-ask-what');
    expect(what.getAttribute('aria-invalid')).toBe('true');
    expect(what.getAttribute('aria-describedby')).toBe('learning-lab-ask-details-error');
    expect(host.querySelector('#learning-lab-ask-details-error')?.textContent).toContain('Enter at least one detail before saving this support note.');
    expect(document.activeElement).toBe(what);
    expect(host.querySelectorAll('ul[aria-label="All saved support notes"] > li')).toHaveLength(18);
  });

  it('leaves the outcome unselected by default and supports selecting and clearing it', async () => {
    const radios = () => Array.from(host.querySelectorAll('input[name="learning-lab-ask-outcome"]'));
    expect(radios()).toHaveLength(4);
    expect(radios().filter((radio) => radio.checked)).toHaveLength(0);
    expect(buttonByText(host, 'Clear outcome')).toBeUndefined();
    await act(async () => { host.querySelector('#learning-lab-ask-outcome-helpful').click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-ask-outcome-helpful').checked).toBe(true);
    const clear = buttonByText(host, 'Clear outcome');
    expect(clear).not.toBeUndefined();
    await act(async () => { clear.click(); await Promise.resolve(); });
    expect(radios().filter((radio) => radio.checked)).toHaveLength(0);
    expect(buttonByText(host, 'Clear outcome')).toBeUndefined();
  });

  it('saves a note with only one detail and returns focus to the form', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-ask-who'), 'Peer tutor'); await Promise.resolve(); });
    await act(async () => { submitForm(host); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="All saved support notes"] > li')).toHaveLength(19);
    expect(host.textContent).toContain('19 support notes saved.');
    expect(host.textContent).toContain('Peer tutor');
    expect(host.querySelector('#learning-lab-ask-who').value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-ask-what');
  });

  it('edits an existing note, updates it in place, and restores focus to its edit control', async () => {
    await act(async () => { host.querySelector('#learning-lab-ask-edit-0').click(); await settleFocus(); });
    expect(host.textContent).toContain('Edit support note');
    expect(document.activeElement?.id).toBe('learning-lab-ask-form-heading');
    expect(host.querySelector('#learning-lab-ask-what').value).toBe('Extra time on quiz');
    expect(host.querySelector('#learning-lab-ask-outcome-helpful').checked).toBe(true);
    await act(async () => { setValue(host.querySelector('#learning-lab-ask-what'), 'More time on lab reports'); await Promise.resolve(); });
    const update = buttonByText(host, 'Update support note');
    expect(update).not.toBeUndefined();
    await act(async () => { submitForm(host); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="All saved support notes"] > li')).toHaveLength(18);
    expect(host.textContent).toContain('More time on lab reports');
    expect(host.textContent).not.toContain('Extra time on quiz');
    expect(host.textContent).toContain('Add a support note');
    expect(document.activeElement?.id).toBe('learning-lab-ask-edit-0');
  });

  it('cancels a clean edit immediately but confirms discarding unsaved changes', async () => {
    await act(async () => { host.querySelector('#learning-lab-ask-edit-0').click(); await settleFocus(); });
    await act(async () => { buttonByText(host, 'Cancel editing').click(); await settleFocus(); });
    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(host.textContent).toContain('Add a support note');
    expect(document.activeElement?.id).toBe('learning-lab-ask-edit-0');

    await act(async () => { host.querySelector('#learning-lab-ask-edit-0').click(); await settleFocus(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-ask-notes'), 'Changed my mind'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Cancel editing').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Discard unsaved changes?');
    await act(async () => { buttonByText(dialog, 'Discard changes').click(); await settleFocus(); });
    expect(host.textContent).toContain('Add a support note');
    expect(host.textContent).not.toContain('Changed my mind');
    expect(document.activeElement?.id).toBe('learning-lab-ask-edit-0');
  });

  it('keeps the edit open when the discard confirmation is declined', async () => {
    await act(async () => { host.querySelector('#learning-lab-ask-edit-0').click(); await settleFocus(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-ask-notes'), 'Keep this draft'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Cancel editing').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Discard unsaved changes?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await settleFocus(); });
    expect(host.textContent).toContain('Edit support note');
    expect(host.querySelector('#learning-lab-ask-notes').value).toBe('Keep this draft');
  });

  it('deletes a note only after confirmation and moves focus to the next edit control', async () => {
    const findFirstDelete = () => Array.from(host.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Delete support note 1');
    expect(findFirstDelete()?.textContent).toBe('Delete note');
    await act(async () => { findFirstDelete().click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Delete this support note?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ul[aria-label="All saved support notes"] > li')).toHaveLength(18);

    await act(async () => { findFirstDelete().click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Delete note').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="All saved support notes"] > li')).toHaveLength(17);
    expect(host.textContent).not.toContain('Extra time on quiz');
    expect(document.activeElement?.id).toBe('learning-lab-ask-edit-0');
  });
});
