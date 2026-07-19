import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Learning Lab Study Planner rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = {
      learningLab: {
        view: 'mytkPlanner',
        viewLabel: 'Study Planner',
        mytkPlanner: {
          subjects: ['Math', 'Science', 'Other'],
          blocks: [
            { id: 'block-1', day: 1, hour: 16, duration: 60, subject: 'Math', task: 'Problem set', recurring: true },
            { id: 'block-2', day: 2, hour: 18, duration: 45, subject: 'Science', task: 'Lab notes', recurring: false },
          ],
          preservedSibling: true,
        },
      },
    };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      const ctx = makeCtx({
        toolData,
        update: (toolId, key, value) => {
          setToolData((previous) => ({
            ...previous,
            [toolId]: { ...(previous[toolId] || {}), [key]: value },
          }));
        },
      });
      return config.render(ctx);
    };
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"], [data-learning-lab-form="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders semantic summary, schedule table headers, blocks, and progressbars', () => {
    expect(host.querySelector('#learning-lab-study-heading')?.tagName).toBe('H2');
    expect(host.querySelectorAll('ul[aria-label="Weekly study summary"] > li')).toHaveLength(3);
    expect(host.textContent).toContain('1 hour 45 minutes');
    const table = host.querySelector('table[aria-labelledby="learning-lab-study-schedule-heading"]');
    expect(table).not.toBeNull();
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(8);
    expect(table.querySelectorAll('tbody th[scope="row"]')).toHaveLength(17);
    expect(table.querySelectorAll('button[aria-label^="Remove study block:"]')).toHaveLength(2);
    expect(host.querySelectorAll('[role="progressbar"]')).toHaveLength(2);
  });

  it('exposes duration, recurrence, and future-independent time text', () => {
    expect(host.textContent).toContain('4:00 PM');
    expect(host.textContent).toContain('1 hour · Repeats weekly');
    expect(host.textContent).toContain('45 minutes · This week only');
    expect(host.textContent).toContain('Math');
    expect(host.textContent).toContain('Science');
  });

  it('opens the native form, restores heading focus, and exposes labeled controls', async () => {
    await act(async () => { host.querySelector('#learning-lab-study-add-button').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-study-form-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-study-form-heading"]')).not.toBeNull();
    expect(host.querySelectorAll('fieldset button[aria-pressed]')).toHaveLength(10);
    expect(host.querySelector('label[for="learning-lab-study-start-time"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-study-duration"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-study-task"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-study-recurring"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-study-task')?.maxLength).toBe(500);
  });

  it('uses full day names and unambiguous select option text', async () => {
    await act(async () => { host.querySelector('#learning-lab-study-add-button').click(); await Promise.resolve(); });
    const dayButtons = [...host.querySelectorAll('fieldset:first-of-type button')].map((button) => button.textContent);
    expect(dayButtons).toEqual(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
    expect(host.querySelector('#learning-lab-study-start-time option[value="16"]')?.textContent).toBe('4:00 PM');
    expect(host.querySelector('#learning-lab-study-duration option[value="60"]')?.textContent).toBe('1 hour');
  });

  it('adds a default block through form submission and focuses the schedule heading', async () => {
    await act(async () => { host.querySelector('#learning-lab-study-add-button').click(); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-study-form-heading"]');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(document.activeElement?.id).toBe('learning-lab-study-schedule-heading');
    expect(host.querySelectorAll('button[aria-label^="Remove study block:"]')).toHaveLength(3);
    expect(host.textContent).toContain('2 hours 45 minutes');
  });

  it('confirms block removal and restores schedule-heading focus', async () => {
    const remove = host.querySelector('button[aria-label="Remove study block: Math on Monday at 4:00 PM"]');
    await act(async () => { remove.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Remove block');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.textContent).not.toContain('Problem set');
    expect(document.activeElement?.id).toBe('learning-lab-study-schedule-heading');
    expect(host.querySelectorAll('button[aria-label^="Remove study block:"]')).toHaveLength(1);
  });

  it('exposes explicit numeric progressbar values and labels', () => {
    const math = host.querySelector('[role="progressbar"][aria-label="Math share of scheduled study time"]');
    const science = host.querySelector('[role="progressbar"][aria-label="Science share of scheduled study time"]');
    expect(math?.getAttribute('aria-valuemin')).toBe('0');
    expect(math?.getAttribute('aria-valuemax')).toBe('100');
    expect(math?.getAttribute('aria-valuenow')).toBe('57');
    expect(science?.getAttribute('aria-valuenow')).toBe('43');
  });
});
