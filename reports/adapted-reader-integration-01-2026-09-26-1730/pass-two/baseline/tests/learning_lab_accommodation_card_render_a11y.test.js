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

function setNativeValue(element, value) {
  const setter = Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value')?.set;
  setter.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Learning Lab Accommodation Card rendered accessibility states', () => {
  let host;
  let root;

  beforeEach(async () => {
    resetStemLab();
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = {
      learningLab: {
        view: 'mytkAccom',
        viewLabel: 'Accommodation Card',
        mytkAccom: {
          selected: { 'extended-time': true },
          custom: [{ id: 'custom-1', label: 'Written response option', why: 'It gives me another way to communicate.' }],
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

  it('renders scope guidance, a live count, semantic categories, and pressed catalog choices', () => {
    expect(host.querySelector('#learning-lab-accommodation-heading')?.tagName).toBe('H2');
    expect(host.querySelector('aside[aria-labelledby="learning-lab-accommodation-note-heading"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-accommodation-count')?.textContent).toContain('2');
    expect(host.querySelectorAll('section[aria-labelledby^="learning-lab-accommodation-category-"]')).toHaveLength(5);
    expect(host.querySelectorAll('ul[aria-labelledby^="learning-lab-accommodation-category-"] > li')).toHaveLength(16);
    expect(host.querySelectorAll('button[aria-pressed]')).toHaveLength(16);
    expect(host.querySelector('button[aria-labelledby="learning-lab-accommodation-label-extended-time"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('toggles an accommodation and updates pressed state and count', async () => {
    const button = host.querySelector('button[aria-labelledby="learning-lab-accommodation-label-small-group"]');
    expect(button.getAttribute('aria-pressed')).toBe('false');
    await act(async () => { button.click(); await Promise.resolve(); });
    expect(host.querySelector('button[aria-labelledby="learning-lab-accommodation-label-small-group"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('#learning-lab-accommodation-count')?.textContent).toContain('3');
  });

  it('renders the labeled custom form and identifies an empty submission', async () => {
    const form = host.querySelector('form[aria-labelledby="learning-lab-accommodation-custom-form-heading"]');
    expect(host.querySelector('label[for="learning-lab-accommodation-custom-name"]')).not.toBeNull();
    expect(host.querySelector('label[for="learning-lab-accommodation-custom-reason"]')).not.toBeNull();
    expect(host.querySelector('#learning-lab-accommodation-custom-name')?.required).toBe(true);
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    const name = host.querySelector('#learning-lab-accommodation-custom-name');
    expect(host.querySelector('#learning-lab-accommodation-custom-error')?.getAttribute('role')).toBe('alert');
    expect(name?.getAttribute('aria-invalid')).toBe('true');
    expect(name?.getAttribute('aria-describedby')).toContain('learning-lab-accommodation-custom-error');
    expect(document.activeElement).toBe(name);
  });

  it('adds a custom accommodation and returns focus to the cleared name field', async () => {
    const name = host.querySelector('#learning-lab-accommodation-custom-name');
    const reason = host.querySelector('#learning-lab-accommodation-custom-reason');
    await act(async () => {
      setNativeValue(name, 'Quiet transition time');
      setNativeValue(reason, 'It helps me prepare for the next activity.');
      await Promise.resolve();
    });
    const form = host.querySelector('form[aria-labelledby="learning-lab-accommodation-custom-form-heading"]');
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });
    expect(host.textContent).toContain('Quiet transition time');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-accommodation-custom-heading"] > li')).toHaveLength(2);
    expect(host.querySelector('#learning-lab-accommodation-custom-name')?.value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-accommodation-custom-name');
  });

  it('renders generated advocacy examples as a named semantic list', () => {
    expect(host.querySelector('#learning-lab-accommodation-script-heading')?.tagName).toBe('H3');
    expect(host.querySelectorAll('ul[aria-labelledby="learning-lab-accommodation-examples-heading"] > li')).toHaveLength(2);
    expect(host.textContent).toContain('Review and adapt these examples before using them.');
  });

  it('confirms custom deletion, removes the item, and restores form-field focus', async () => {
    const deleteButton = host.querySelector('button[aria-label="Delete custom accommodation: Written response option"]');
    await act(async () => { deleteButton.click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Delete accommodation');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.textContent).not.toContain('Written response option');
    expect(host.querySelector('#learning-lab-accommodation-count')?.textContent).toContain('1');
    expect(document.activeElement?.id).toBe('learning-lab-accommodation-custom-name');
  });
});
