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

describe('Learning Lab Personal Reading Tracker rendered accessibility states', () => {
  let host;
  let root;
  let latest;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: { view: 'mytkRead', viewLabel: 'Personal Reading Tracker', mytkRead: {
      books: [
        { id: 'b1', title: 'A Book', author: 'An Author', status: 'done', pages: 250, rating: 4, notes: 'A reflection', createdAt: '2000-01-01' },
        { title: 'Legacy Book', author: '', status: 'dnf', pages: null, rating: 0, notes: '', createdAt: 'invalid-date' }
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

  it('renders optional, non-evaluative, and privacy guidance', () => {
    expect(host.querySelector('#learning-lab-reading-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('not a grade, assignment, reading-level test, or measure of ability');
    expect(host.textContent).toContain('There is no requirement to finish, rate, or record a certain amount');
    expect(host.textContent).toContain('does not itself notify a teacher, school, library, or family member');
  });

  it('uses a semantic self-entered summary and visible result status', () => {
    expect(host.querySelector('section[aria-labelledby="learning-lab-reading-summary-heading"] dl')).not.toBeNull();
    expect(host.textContent).toContain('Finished entries');
    expect(host.textContent).toContain('Pages recorded for finished entries');
    expect(host.querySelector('[role="status"]')?.textContent).toContain('2 reading entries shown');
  });

  it('opens a bounded native editor with heading focus and blank optional defaults', async () => {
    await act(async () => { buttonByText(host, '+ Add reading entry').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-reading-editor-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-reading-editor-heading"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-reading-status')?.tagName).toBe('SELECT');
    expect(host.querySelector('#learning-lab-reading-rating')?.tagName).toBe('SELECT');
    expect(host.querySelector('#learning-lab-reading-status')?.value).toBe('');
    expect(host.querySelector('#learning-lab-reading-pages')?.value).toBe('');
    expect(host.querySelector('#learning-lab-reading-rating')?.value).toBe('');
    expect(host.querySelector('#learning-lab-reading-pages')?.max).toBe('1000000');
    expect(host.querySelector('#learning-lab-reading-notes')?.maxLength).toBe(6000);
  });

  it('validates a missing title with a conditional alert and field focus', async () => {
    await act(async () => { buttonByText(host, '+ Add reading entry').click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-reading-title-error')).toBeNull();
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-reading-title-error')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement?.id).toBe('learning-lab-reading-title');
  });

  it('saves deliberate values, preserves sibling data, and focuses the saved entry', async () => {
    await act(async () => { buttonByText(host, '+ Add reading entry').click(); await Promise.resolve(); });
    await act(async () => {
      setValue(host.querySelector('#learning-lab-reading-title'), 'New Reading');
      setValue(host.querySelector('#learning-lab-reading-pages'), '12');
      setValue(host.querySelector('#learning-lab-reading-notes'), 'Deliberate note');
      choose(host.querySelector('#learning-lab-reading-status'), 'done');
      choose(host.querySelector('#learning-lab-reading-rating'), '5');
      await Promise.resolve();
    });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const saved = latest.learningLab.mytkRead.books[0];
    expect(saved.status).toBe('done');
    expect(saved.pages).toBe(12);
    expect(saved.rating).toBe(5);
    expect(latest.learningLab.mytkRead.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-reading-entry-heading-' + saved.id);
  });

  it('edits without replacing the original creation date', async () => {
    await act(async () => { host.querySelector('button[aria-label="Edit reading entry: A Book"]').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-reading-editor-heading');
    expect(host.querySelector('#learning-lab-reading-status')?.value).toBe('done');
    await act(async () => { setValue(host.querySelector('#learning-lab-reading-title'), 'Updated Book'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(latest.learningLab.mytkRead.books.find((book) => book.id === 'b1').createdAt).toBe('2000-01-01');
    expect(document.activeElement?.id).toBe('learning-lab-reading-entry-heading-b1');
  });

  it('confirms dirty cancellation and restores launcher focus', async () => {
    await act(async () => { buttonByText(host, '+ Add reading entry').click(); await Promise.resolve(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-reading-title'), 'Unsaved'); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Cancel').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    await act(async () => { buttonByText(dialog, 'Discard changes').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-reading-add');
  });

  it('filters with a native select and announces the visible count', async () => {
    const filter = host.querySelector('#learning-lab-reading-filter');
    expect(filter?.tagName).toBe('SELECT');
    await act(async () => { choose(filter, 'dnf'); await Promise.resolve(); });
    expect(host.querySelector('[role="status"]')?.textContent).toContain('1 reading entry shown');
    expect(host.querySelectorAll('ul[aria-label="Saved reading entries"] > li')).toHaveLength(1);
    expect(host.textContent).toContain('Status: Stopped or paused');
  });

  it('renders every entry with semantic articles and robust dates', () => {
    const items = host.querySelectorAll('ul[aria-label="Saved reading entries"] > li');
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('article[aria-labelledby] h4')).not.toBeNull();
    expect(items[0].querySelector('time')?.dateTime).toBeTruthy();
    expect(items[0].textContent).toContain('Personal rating 4 out of 5');
    expect(items[1].textContent).toContain('Date not recorded');
  });

  it('deletes a legacy entry without an ID and restores focus to the entries heading', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete reading entry: Legacy Book"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    await act(async () => { buttonByText(dialog, 'Delete entry').click(); await Promise.resolve(); });
    expect(latest.learningLab.mytkRead.books).toHaveLength(1);
    expect(latest.learningLab.mytkRead.preservedSibling).toBe(true);
    expect(document.activeElement?.id).toBe('learning-lab-reading-entries-heading');
  });
});
