import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function localISO() {
  const date = new Date(); date.setHours(12, 0, 0, 0);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}
function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}
function buttonByText(container, text) {
  return Array.from(container.querySelectorAll('button')).find((button) => button.textContent === text);
}

describe('Learning Lab Notes Workbench rendered accessibility states', () => {
  let host; let root; let latestToolData;
  const today = localISO();

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkNotes', viewLabel: 'Cornell Notes', mytkNotes: {
      notebooks: ['General', 'Biology'],
      notes: [{ id: 'note-1', notebook: 'Biology', title: 'Cells', cue: 'What is a cell?', main: 'Cells are units of life.', summary: 'Cells organize living things.', createdAt: today, updatedAt: today }],
      preservedSibling: true
    } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      latestToolData = toolData;
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"], [data-learning-lab-form="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders privacy guidance, a semantic notebook list, and qualified method copy', () => {
    expect(host.querySelector('#learning-lab-notebooks-heading')?.tagName).toBe('H2');
    expect(host.querySelector('#learning-lab-notes-privacy')).not.toBeNull();
    expect(host.querySelectorAll('ul[aria-label="Notebooks"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('Notes save only when you choose Save note.');
    expect(host.textContent).toContain('does not assess note quality or guarantee learning');
  });

  it('opens a notebook with focus and renders searchable semantic notes', async () => {
    await act(async () => { buttonByText(host, 'Biology1 note').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-notebook-heading');
    expect(host.querySelector('label[for="learning-lab-notes-search"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-note-search-status')?.getAttribute('role')).toBe('status');
    expect(host.querySelector('ul[aria-labelledby="learning-lab-note-results-heading"] article')).not.toBeNull();
    expect(host.querySelector('article time[datetime="' + today + '"]')).not.toBeNull();
  });

  it('updates the search result heading and live status', async () => {
    await act(async () => { buttonByText(host, 'Biology1 note').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-notes-search'), 'missing'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-note-results-heading')?.textContent).toBe('Search results (0)');
    expect(host.querySelector('#learning-lab-note-search-status')?.textContent).toBe('0 notes match your search.');
    expect(host.textContent).toContain('No notes match your search.');
  });

  it('opens a bounded native note form and validates title with focus', async () => {
    await act(async () => { buttonByText(host, 'Biology1 note').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-new-note').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-note-editor-heading');
    const form = host.querySelector('form[aria-labelledby="learning-lab-note-editor-heading"]');
    expect(host.querySelector('#learning-lab-note-title')?.maxLength).toBe(160);
    expect(host.querySelector('#learning-lab-note-cue')?.maxLength).toBe(12000);
    expect(host.querySelector('#learning-lab-note-main')?.maxLength).toBe(20000);
    expect(host.querySelector('#learning-lab-note-summary')?.maxLength).toBe(4000);
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-note-title-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-note-title');
  });

  it('saves explicitly, preserves sibling data, and restores notebook focus', async () => {
    await act(async () => { buttonByText(host, 'Biology1 note').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-new-note').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-note-title'), 'Energy'); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-note-editor-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-notebook-heading');
    expect(latestToolData.learningLab.mytkNotes.notes).toHaveLength(2);
    expect(latestToolData.learningLab.mytkNotes.preservedSibling).toBe(true);
  });

  it('confirms before discarding unsaved changes and restores notebook focus', async () => {
    await act(async () => { buttonByText(host, 'Biology1 note').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('#learning-lab-new-note').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-note-main'), 'Unsaved work'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, '← Cancel').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Discard changes').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-notebook-heading');
  });

  it('confirms note deletion and keeps a stable result-heading focus target', async () => {
    await act(async () => { buttonByText(host, 'Biology1 note').click(); await Promise.resolve(); });
    await act(async () => { host.querySelector('button[aria-label="Delete note: Cells"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete note').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-note-results-heading');
    expect(host.textContent).toContain('No notes in this notebook yet.');
    expect(latestToolData.learningLab.mytkNotes.preservedSibling).toBe(true);
  });

  it('confirms notebook deletion, preserves sibling data, and restores list focus', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete notebook: Biology"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.textContent).toContain('1 note inside it');
    await act(async () => { buttonByText(dialog, 'Delete notebook').click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(document.activeElement?.id).toBe('learning-lab-notebooks-heading');
    expect(host.querySelector('button[aria-label="Delete notebook: Biology"]')).toBeNull();
    expect(latestToolData.learningLab.mytkNotes.notes).toHaveLength(0);
    expect(latestToolData.learningLab.mytkNotes.preservedSibling).toBe(true);
  });
});
