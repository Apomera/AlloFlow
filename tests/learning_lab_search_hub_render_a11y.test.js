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

describe('Learning Lab Search Selected Personal Toolkit Content rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const sharedNotes = Array.from({ length: 31 }, (_, index) => ({ id: 'shared-' + index, title: 'Shared note ' + index, main: 'Shared matching text', createdAt: '2000-01-01' }));
    const initial = { learningLab: {
      view: 'mytkSearch', viewLabel: 'Search Selected Personal Toolkit Content',
      mytkNotes: { notes: [{ id: 'n1', title: 'Cell note', main: 'A cell has a membrane', createdAt: '2000-01-01' }, { id: 'numeric', title: 123, main: 456, createdAt: 'invalid-date' }, ...sharedNotes] },
      mytkJournal: { entries: [{ id: 'j1', title: 'Cell journal', body: 'Cell reflection', date: 'invalid-date' }] },
      mytkPrompts: { responses: [{ id: 'p1', promptText: 'Cell prompt', text: 'A cell response', date: '2000-01-02' }] },
      mytkReflect: { entries: [{ id: 'r1', week: 'Cell week', went_well: 'Cell success', stuck: 'Cell challenge', date: '2000-01-03' }] },
      mytkGoals: { goals: [{ id: 'g1', title: 'Cell goal', specific: 'Study cell structure', createdAt: '2000-01-04' }] },
      mytkBrain: { items: [{ id: 'b1', cat: 'Biology', text: 'Cell idea', createdAt: 'invalid-date' }] }
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
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders exact-scope, privacy, and non-ranking guidance', () => {
    expect(host.querySelector('#learning-lab-search-page-heading')?.tagName).toBe('H2');
    expect(host.textContent).toContain('Search saved Cornell Notes, Learning Journal entries');
    expect(host.textContent).toContain('exact character matching, not a relevance score');
    expect(host.textContent).toContain('does not save the search term or create new records');
    expect(host.textContent).toContain('does not itself notify a teacher, school, employer, clinician, or family member');
  });

  it('does not steal focus and uses explicit submit with a native source filter', () => {
    expect(document.activeElement).not.toBe(host.querySelector('#learning-lab-toolkit-search'));
    expect(host.querySelector('form[role="search"]')).not.toBeNull();
    expect(buttonByText(host, 'Search')?.type).toBe('submit');
    expect(host.querySelector('#learning-lab-toolkit-source-filter')?.tagName).toBe('SELECT');
    expect(host.querySelector('[role="status"]')?.textContent).toContain('Enter a search term and select Search');
  });

  it('does not update results while typing, then searches all six sources on submit', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-toolkit-search'), 'cell'); await Promise.resolve(); });
    expect(host.querySelector('ul[aria-label="All matching toolkit search results"]')).toBeNull();
    await act(async () => { host.querySelector('form[role="search"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('[role="status"]')?.textContent).toContain('6 results found');
    const sources = Array.from(host.querySelectorAll('ul[aria-label="All matching toolkit search results"] article > div:first-child > span:first-child')).map((item) => item.textContent);
    expect(sources).toEqual(expect.arrayContaining(['📝 Cornell Notes', '📓 Learning Journal', '💬 Reflection Prompts', '📔 Weekly Reflections', '🎯 Goals', '🧠 Brain Dump']));
  });

  it('deduplicates a reflection with multiple matching fields', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-toolkit-search'), 'cell'); host.querySelector('form[role="search"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(Array.from(host.querySelectorAll('article')).filter((article) => article.textContent.includes('Weekly Reflections'))).toHaveLength(1);
  });

  it('filters submitted results with a native select and announces the count', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-toolkit-search'), 'cell'); host.querySelector('form[role="search"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    await act(async () => { choose(host.querySelector('#learning-lab-toolkit-source-filter'), 'journal'); await Promise.resolve(); });
    expect(host.querySelector('[role="status"]')?.textContent).toContain('1 result found');
    expect(host.querySelectorAll('ul[aria-label="All matching toolkit search results"] > li')).toHaveLength(1);
    expect(host.textContent).toContain('Learning Journal');
  });

  it('renders more than 30 matches without a silent cap', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-toolkit-search'), 'shared'); host.querySelector('form[role="search"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(host.querySelector('[role="status"]')?.textContent).toContain('31 results found');
    expect(host.querySelectorAll('ul[aria-label="All matching toolkit search results"] > li')).toHaveLength(31);
  });

  it('uses semantic result articles and robust localized dates', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-toolkit-search'), 'cell'); host.querySelector('form[role="search"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    const items = host.querySelectorAll('ul[aria-label="All matching toolkit search results"] > li');
    expect(items[0].querySelector('article[aria-labelledby] h4')).not.toBeNull();
    expect(host.querySelector('time')?.dateTime).toBeTruthy();
    expect(host.textContent).toContain('Date not recorded');
  });

  it('clears search state and restores input focus', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-toolkit-search'), 'cell'); host.querySelector('form[role="search"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    await act(async () => { buttonByText(host, 'Clear').click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-toolkit-search')?.value).toBe('');
    expect(host.querySelector('#learning-lab-toolkit-source-filter')?.value).toBe('all');
    expect(host.querySelector('ul[aria-label="All matching toolkit search results"]')).toBeNull();
    expect(document.activeElement?.id).toBe('learning-lab-toolkit-search');
  });
});
