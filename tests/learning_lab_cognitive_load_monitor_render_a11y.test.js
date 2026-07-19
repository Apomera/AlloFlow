import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function localISO(offset = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

describe('Learning Lab Cognitive Load Monitor rendered accessibility states', () => {
  let host;
  let root;
  const today = localISO();
  const yesterday = localISO(-1);

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkLoad', viewLabel: 'Cognitive Load Monitor', mytkLoad: {
      entries: [
        { id: 'load-today', date: today, intrinsic: 6, extraneous: 4, germane: 7, triggers: ['noise'], notes: 'A useful note.' },
        { id: 'load-yesterday', date: yesterday, intrinsic: 5, extraneous: 3, germane: 6, triggers: [], notes: '' }
      ], preservedSibling: true
    } } };
    const Component = () => {
      const [toolData, setToolData] = React.useState(initialData);
      const ctx = makeCtx({ toolData, update: (toolId, key, value) => setToolData((previous) => ({ ...previous, [toolId]: { ...(previous[toolId] || {}), [key]: value } })) });
      return config.render(ctx);
    };
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  });

  afterEach(() => {
    document.querySelectorAll('[data-learning-lab-confirm="true"]').forEach((dialog) => dialog.remove());
    if (root) act(() => root.unmount());
    if (host) host.remove();
  });

  it('renders private framing, today summary, exact trend table, history, and limits', () => {
    expect(host.querySelector('#learning-lab-load-heading')?.tagName).toBe('H2');
    expect(host.querySelector('#learning-lab-load-privacy')).not.toBeNull();
    expect(host.querySelector('#learning-lab-load-today-heading')).not.toBeNull();
    expect(host.querySelectorAll('table tbody tr')).toHaveLength(7);
    expect(host.querySelectorAll('table tbody time')).toHaveLength(7);
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-load-history-heading"] > ul > li')).toHaveLength(2);
    expect(host.querySelector('aside[aria-labelledby="learning-lab-load-evidence-heading"]')).not.toBeNull();
    expect(host.textContent).not.toContain('overload zone');
  });

  it('opens today for editing with focus and labelled bounded fields', async () => {
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === "Edit today's check-in").click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-load-form-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-load-form-heading"]')).not.toBeNull();
    expect(host.querySelectorAll('input[type="range"]')).toHaveLength(3);
    expect(host.querySelector('#learning-lab-load-intrinsic')?.getAttribute('aria-valuetext')).toBe('6 out of 10');
    expect(host.querySelector('#learning-lab-load-notes')?.maxLength).toBe(2000);
    expect(host.querySelector('#learning-lab-load-notes')?.value).toBe('A useful note.');
  });

  it('uses visible context labels with pressed state and decorative icons', async () => {
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === "Edit today's check-in").click(); await Promise.resolve(); });
    const noise = Array.from(host.querySelectorAll('fieldset button')).find((button) => button.textContent.includes('Environmental noise'));
    expect(noise.getAttribute('aria-pressed')).toBe('true');
    expect(noise.querySelector('[aria-hidden="true"]')).not.toBeNull();
    await act(async () => { noise.click(); await Promise.resolve(); });
    expect(noise.getAttribute('aria-pressed')).toBe('false');
  });

  it('saves an edited check-in and restores today-summary focus without duplicating history', async () => {
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === "Edit today's check-in").click(); await Promise.resolve(); });
    const form = host.querySelector('form[aria-labelledby="learning-lab-load-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-load-today-heading');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-load-history-heading"] > ul > li')).toHaveLength(2);
  });

  it('cancels editing and restores today-summary focus', async () => {
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === "Edit today's check-in").click(); await Promise.resolve(); });
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Cancel editing').click(); await Promise.resolve(); });
    expect(document.activeElement?.id).toBe('learning-lab-load-today-heading');
    expect(host.querySelector('form[aria-labelledby="learning-lab-load-form-heading"]')).toBeNull();
  });

  it('confirms deleting today and restores the newly available form heading', async () => {
    await act(async () => { host.querySelector('button[aria-label="Delete cognitive-load check-in from ' + today + '"]').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Delete check-in');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-load-today-heading')).toBeNull();
    expect(document.activeElement?.id).toBe('learning-lab-load-form-heading');
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-load-history-heading"] > ul > li')).toHaveLength(1);
  });
});
