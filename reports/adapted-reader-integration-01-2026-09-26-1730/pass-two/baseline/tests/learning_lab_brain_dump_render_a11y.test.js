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

describe('Learning Lab Brain Dump rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = {
      learningLab: {
        view: 'mytkBrain',
        viewLabel: 'Brain Dump',
        mytkBrain: {
          items: [
            { id: 'item-1', text: 'Call the advisor', cat: 'todo', createdAt: Date.now(), done: false },
            { id: 'item-2', text: 'Concern about Friday', cat: 'worry', createdAt: Date.now(), done: true },
          ],
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
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders the labeled form, category choices, filters, status, and item list', () => {
    expect(host.querySelector('#learning-lab-brain-dump-heading')?.tagName).toBe('H2');
    expect(host.querySelector('form[aria-labelledby="learning-lab-brain-dump-entry-heading"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-brain-dump-entry"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-brain-dump-entry')?.required).toBe(true);
    expect(host.querySelector('#learning-lab-brain-dump-entry')?.maxLength).toBe(4000);
    expect(host.querySelectorAll('fieldset button[aria-pressed]')).toHaveLength(5);
    expect(host.querySelector('[role="group"][aria-label="Filter brain dump items by category"]')).not.toBeNull();
    expect(host.querySelectorAll('[role="group"] button[aria-pressed]')).toHaveLength(6);
    expect(host.querySelector('#learning-lab-brain-dump-results')?.textContent).toBe('2 items shown');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-brain-dump-items-heading"] > li')).toHaveLength(2);
    expect(host.querySelector('time[datetime]')).not.toBeNull();
  });

  it('identifies an empty programmatic submission and focuses the textarea', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-brain-dump-entry-heading"]');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const entry = host.querySelector('#learning-lab-brain-dump-entry');
    expect(host.querySelector('#learning-lab-brain-dump-entry-error')?.getAttribute('role')).toBe('alert');
    expect(entry?.getAttribute('aria-invalid')).toBe('true');
    expect(entry?.getAttribute('aria-describedby')).toContain('learning-lab-brain-dump-entry-error');
    expect(document.activeElement).toBe(entry);
  });

  it('filters the rendered list and reports the result count', async () => {
    const worryFilter = [...host.querySelectorAll('[role="group"] button')].find((button) => button.textContent.startsWith('😟 Worry'));
    await act(async () => { worryFilter.click(); await Promise.resolve(); });
    expect(worryFilter.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('#learning-lab-brain-dump-results')?.textContent).toBe('1 item shown');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-brain-dump-items-heading"] > li')).toHaveLength(1);
    expect(host.textContent).toContain('Concern about Friday');
    expect(host.textContent).not.toContain('Call the advisor');
  });

  it('toggles completion with an item-specific pressed control', async () => {
    const toggle = host.querySelector('button[aria-label="Mark complete: Call the advisor"]');
    await act(async () => { toggle.click(); await Promise.resolve(); });
    expect(host.querySelector('button[aria-label="Mark incomplete: Call the advisor"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('Completed');
  });

  it('confirms individual deletion, removes the item, and restores heading focus', async () => {
    const deleteButton = host.querySelector('button[aria-label="Delete brain dump item: Call the advisor"]');
    await act(async () => { deleteButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Delete item');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.textContent).not.toContain('Call the advisor');
    expect(document.activeElement?.id).toBe('learning-lab-brain-dump-items-heading');
  });
});
