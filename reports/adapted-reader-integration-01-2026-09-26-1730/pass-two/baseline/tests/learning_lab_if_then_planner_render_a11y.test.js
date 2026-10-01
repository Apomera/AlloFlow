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

describe('Learning Lab If-Then Planner rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = {
      learningLab: {
        view: 'mytkIfThen',
        viewLabel: 'If-Then Plans',
        mytkIfThen: {
          plans: [
            {
              id: 'plan-1',
              ifPart: 'I finish lunch',
              thenPart: 'I will review one vocabulary card',
              usedCount: 2,
              lastUsed: '2026-07-18',
              createdAt: '2026-07-10',
            },
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
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders a status count, semantic saved list, explicit metadata, time, and examples', () => {
    expect(host.querySelector('#learning-lab-ifthen-heading')?.tagName).toBe('H2');
    expect(host.querySelector('#learning-lab-ifthen-count')?.textContent).toBe('1 saved plan');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-ifthen-saved-heading"] > li')).toHaveLength(1);
    expect(host.textContent).toContain('Recorded uses: 2');
    expect(host.querySelector('time[datetime="2026-07-18"]')).not.toBeNull();
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-ifthen-templates-heading"] > li')).toHaveLength(10);
  });

  it('opens the labeled native form, focuses its heading, and exposes required fields', async () => {
    const newButton = host.querySelector('#learning-lab-ifthen-new');
    await act(async () => { newButton.click(); await Promise.resolve(); });
    const heading = host.querySelector('#learning-lab-ifthen-form-heading');
    expect(heading?.tagName).toBe('H2');
    expect(document.activeElement).toBe(heading);
    expect(host.querySelector('form[aria-labelledby="learning-lab-ifthen-form-heading"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-ifthen-trigger"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-ifthen-action"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-ifthen-trigger')?.required).toBe(true);
    expect(host.querySelector('#learning-lab-ifthen-action')?.required).toBe(true);
    expect(host.querySelector('#learning-lab-ifthen-trigger')?.maxLength).toBe(2000);
  });

  it('identifies both missing fields and focuses the first on programmatic submission', async () => {
    await act(async () => { host.querySelector('#learning-lab-ifthen-new').click(); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-ifthen-form-heading"]');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const trigger = host.querySelector('#learning-lab-ifthen-trigger');
    expect(host.querySelector('#learning-lab-ifthen-trigger-error')?.getAttribute('role')).toBe('alert');
    expect(host.querySelector('#learning-lab-ifthen-action-error')?.getAttribute('role')).toBe('alert');
    expect(trigger?.getAttribute('aria-invalid')).toBe('true');
    expect(trigger?.getAttribute('aria-describedby')).toContain('learning-lab-ifthen-trigger-error');
    expect(document.activeElement).toBe(trigger);
  });

  it('opens an editable example with populated fields and form-heading focus', async () => {
    const template = host.querySelector('button[aria-label^="Use editable example:"]');
    await act(async () => { template.click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-ifthen-form-heading');
    expect(host.querySelector('#learning-lab-ifthen-trigger')?.value).not.toBe('');
    expect(host.querySelector('#learning-lab-ifthen-action')?.value).not.toBe('');
    expect(host.querySelector('#learning-lab-ifthen-preview-heading')).not.toBeNull();
    expect(host.querySelector('[role="status"][aria-live="polite"]')?.textContent).toContain('When');
  });

  it('records a use with an item-specific action name', async () => {
    const record = host.querySelector('button[aria-label^="Record use for:"]');
    expect(record).not.toBeNull();
    await act(async () => { record.click(); await Promise.resolve(); });
    expect(host.textContent).toContain('Recorded uses: 3');
  });

  it('confirms deletion, removes the plan, and restores list-heading focus', async () => {
    const deleteButton = host.querySelector('button[aria-label^="Delete if-then plan:"]');
    await act(async () => { deleteButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Delete plan');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-ifthen-count')?.textContent).toBe('0 saved plans');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-ifthen-saved-heading"] > li')).toHaveLength(0);
    expect(document.activeElement?.id).toBe('learning-lab-ifthen-heading');
  });
});
