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
async function settleFocus() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Learning Lab Quote Collector rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initial = { learningLab: {
      view: 'mytkQuote', viewLabel: 'Quote Collector',
      mytkQuote: { quotes: [
        { id: 'q1', date: '2026-07-01', text: 'We are what we repeatedly do.', source: 'Aristotle (attributed)', context: 'History class', tag: '#habit' },
        null,
        'legacy-invalid-quote'
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

  it('renders guidance, the featured quote, and the library over malformed data', () => {
    expect(host.textContent).toContain('Your collection is saved only in your Personal Toolkit and is not shared with or sent to anyone.');
    expect(host.textContent).toContain('From your collection');
    expect(host.textContent).toContain('We are what we repeatedly do.');
    expect(host.textContent).toContain('1 quote saved.');
    expect(host.querySelectorAll('ul[aria-label="Saved quote results"] > li')).toHaveLength(1);
    expect(host.textContent).toContain('Tag: habit');
    expect(host.textContent).not.toContain('Tag: #habit');
    expect(host.textContent).not.toContain('null');
  });

  it('rejects a blank quote with an inline alert and focuses the quote field', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-quote-form-heading"]');
    await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    const text = host.querySelector('#learning-lab-quote-text');
    expect(text.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('#learning-lab-quote-text-error')?.textContent).toContain('Enter the quote you want to save.');
    expect(document.activeElement).toBe(text);
  });

  it('saves a quote, enables the featured rotation, and rotates on demand', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-quote-text'), 'Mistakes are information.'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-quote-form-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    expect(host.textContent).toContain('2 quotes saved.');
    expect(host.querySelectorAll('ul[aria-label="Saved quote results"] > li')).toHaveLength(2);
    expect(document.activeElement?.id).toBe('learning-lab-quote-text');
    const rotate = buttonByText(host, 'Show another quote');
    expect(rotate).not.toBeUndefined();
    const featuredBefore = host.querySelector('aside[aria-labelledby="learning-lab-featured-quote-heading"] blockquote p').textContent;
    await act(async () => { rotate.click(); await Promise.resolve(); });
    const featuredAfter = host.querySelector('aside[aria-labelledby="learning-lab-featured-quote-heading"] blockquote p').textContent;
    expect(featuredAfter).not.toBe(featuredBefore);
  });

  it('filters the library with a live results status and clears the search', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-quote-text'), 'Mistakes are information.'); await Promise.resolve(); });
    await act(async () => { host.querySelector('form[aria-labelledby="learning-lab-quote-form-heading"]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await settleFocus(); });
    await act(async () => { setValue(host.querySelector('#learning-lab-quote-search'), 'Aristotle'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-quote-results-status')?.textContent).toBe('1 of 2 quotes match your search.');
    expect(host.querySelectorAll('ul[aria-label="Saved quote results"] > li')).toHaveLength(1);
    await act(async () => { buttonByText(host, 'Clear search').click(); await settleFocus(); });
    expect(host.querySelectorAll('ul[aria-label="Saved quote results"] > li')).toHaveLength(2);
    expect(document.activeElement?.id).toBe('learning-lab-quote-search');
  });

  it('removes a quote only after confirmation and moves focus to the search field', async () => {
    const removeButton = Array.from(host.querySelectorAll('button')).find((button) => (button.getAttribute('aria-label') || '').startsWith('Remove quote: We are what'));
    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('Remove this quote?');
    await act(async () => { buttonByText(dialog, 'Cancel').click(); await Promise.resolve(); });
    expect(host.querySelectorAll('ul[aria-label="Saved quote results"] > li')).toHaveLength(1);

    await act(async () => { removeButton.click(); await Promise.resolve(); });
    const confirmDialog = document.querySelector('[role="alertdialog"]');
    await act(async () => { buttonByText(confirmDialog, 'Remove quote').click(); await settleFocus(); });
    expect(host.textContent).toContain('0 quotes saved.');
    expect(document.activeElement?.id).toBe('learning-lab-quote-search');
  });
});
