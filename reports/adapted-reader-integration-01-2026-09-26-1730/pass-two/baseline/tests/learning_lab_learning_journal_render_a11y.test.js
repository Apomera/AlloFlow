import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}
function choose(select, value) {
  const setter = Object.getOwnPropertyDescriptor(select.constructor.prototype, 'value').set;
  setter.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}
function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}

describe('Learning Lab personal Learning Journal rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkJournal', viewLabel: 'Personal learning journal', mytkJournal: {
      entries: [
        { id: 'e1', title: 'Cell insight', body: 'Mitochondria release usable energy.', subject: 'Biology', mood: 'frustrated', tags: 'cells, , Cells, energy', date: '2000-01-01', time: null },
        { title: '', body: 'Legacy reflection', subject: '', mood: '', tags: ',,', date: 'invalid-date' }
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

  it('renders optional-use and privacy guidance with semantic summary and entries', () => {
    expect(host.querySelector('#learning-lab-journal-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('not a grade, assessment, diagnosis, or required mood check');
    expect(host.textContent).toContain('does not itself notify a teacher');
    expect(host.querySelector('section[aria-labelledby="learning-lab-journal-summary-heading"] dl')).not.toBeNull();
    expect(host.querySelectorAll('ul[aria-label="Learning journal entries"] > li')).toHaveLength(2);
  });

  it('opens a bounded native editor with heading focus and no default mood', async () => {
    await act(async () => { buttonByText(host, '+ New personal entry').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-journal-editor-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-journal-editor-heading"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-journal-mood')?.tagName).toBe('SELECT');
    expect(host.querySelector('#learning-lab-journal-mood')?.value).toBe('');
    expect(host.querySelector('#learning-lab-journal-body')?.maxLength).toBe(12000);
    expect(host.querySelector('#learning-lab-journal-tags')?.maxLength).toBe(500);
  });

  it('validates required content with a conditional alert and focus', async () => {
    await act(async () => { buttonByText(host, '+ New personal entry').click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-journal-error')).toBeNull();
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-journal-editor-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-journal-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-journal-body');
  });

  it('saves deliberate values, normalizes tags, preserves sibling data, and focuses the entry', async () => {
    await act(async () => { buttonByText(host, '+ New personal entry').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-journal-title'), 'New idea'); setValue(host.querySelector('#learning-lab-journal-body'), 'A deliberate reflection'); setValue(host.querySelector('#learning-lab-journal-tags'), ' one, , One, two '); choose(host.querySelector('#learning-lab-journal-mood'), 'curious'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-journal-editor-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const saved = latest.learningLab.mytkJournal.entries[0];
    expect(saved.tags).toBe('one, two');
    expect(saved.mood).toBe('curious');
    expect(latest.learningLab.mytkJournal.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-journal-entry-heading-' + saved.id);
  });

  it('edits without replacing the original creation date', async () => {
    await act(async () => { host.querySelector('button[aria-label^="Edit journal entry: Cell insight"]').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-journal-editor-heading');
    expect(host.querySelector('#learning-lab-journal-body')?.value).toContain('Mitochondria');
    await act(async () => { setValue(host.querySelector('#learning-lab-journal-body'), 'Updated reflection'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(latest.learningLab.mytkJournal.entries.find((entry) => entry.id === 'e1').date).toBe('2000-01-01');
    expect(document.activeElement?.id).toBe('learning-lab-journal-entry-heading-e1');
  });

  it('confirms discarding dirty new-entry changes and restores launcher focus', async () => {
    await act(async () => { buttonByText(host, '+ New personal entry').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-journal-body'), 'Unsaved'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Cancel').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Discard changes').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-journal-new-entry');
  });

  it('searches subject text and announces the result count', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-journal-search'), 'biology'); await Promise.resolve(); });
    expect(host.querySelector('[role="status"]')?.textContent).toContain('1 journal entry shown');
    expect(host.querySelectorAll('ul[aria-label="Learning journal entries"] > li')).toHaveLength(1);
  });

  it('renders robust dates and only nonblank unique tags', () => {
    const items = host.querySelectorAll('ul[aria-label="Learning journal entries"] > li');
    expect(items[0].querySelector('time')?.dateTime).toBeTruthy();
    expect(items[0].querySelectorAll('ul[aria-label^="Tags for"] > li')).toHaveLength(2);
    expect(items[1].textContent).toContain('Date not recorded');
    expect(items[1].textContent).toContain('Mood or feeling: Not recorded');
  });

  it('deletes a legacy entry without an ID and restores focus to the entries heading', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete journal entry: Legacy reflection"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete entry').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkJournal.entries).toHaveLength(1);
    expect(latest.learningLab.mytkJournal.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-journal-entries-heading');
  });
});
