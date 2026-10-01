import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setValue(control, value) {
  const setter = Object.getOwnPropertyDescriptor(control.constructor.prototype, 'value').set;
  setter.call(control, value);
  control.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Learning Lab Learning Profile rendered accessibility states', () => {
  let host;
  let root;
  let printSpy;

  beforeEach(async () => {
    resetStemLab();
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const config = loadTool('stem_lab/stem_tool_learning_lab.js', 'learningLab');
    const initialData = { learningLab: { view: 'mytkProfile', viewLabel: 'My Learning Profile', mytkProfile: {
      profile: { name: 'A.B.', identity: 'Written directions help me.' }, preservedSibling: true
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
    printSpy.mockRestore();
  });

  it('renders privacy guidance, named fields, bounds, clear action, and sharing review', () => {
    expect(host.querySelector('#learning-lab-profile-heading')?.tagName).toBe('H2');
    expect(host.querySelector('#learning-lab-profile-privacy')).not.toBeNull();
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-profile-fields-heading"] input')).toHaveLength(3);
    expect(host.querySelectorAll('section[aria-labelledby="learning-lab-profile-fields-heading"] textarea')).toHaveLength(7);
    expect(host.querySelector('#learning-lab-profile-name')?.maxLength).toBe(240);
    expect(host.querySelector('#learning-lab-profile-identity')?.maxLength).toBe(4000);
    expect(host.querySelector('#learning-lab-profile-name')?.getAttribute('autocomplete')).toBe('off');
    expect(host.querySelector('aside[aria-labelledby="learning-lab-profile-sharing-heading"]')).not.toBeNull();
    expect(Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Clear profile')).not.toBeNull();
  });

  it('associates every field with visible help and decorative icons', () => {
    for (const id of ['name', 'bestTime', 'worstTime', 'helps', 'overwhelms', 'strengths', 'growing', 'helpers', 'goals', 'identity']) {
      const field = host.querySelector('#learning-lab-profile-' + id);
      expect(host.querySelector('label[for="learning-lab-profile-' + id + '"]')).not.toBeNull();
      expect(field.getAttribute('aria-describedby')).toBe('learning-lab-profile-help-' + id);
    }
    expect(host.querySelectorAll('label [aria-hidden="true"]')).toHaveLength(10);
  });

  it('autosaves an edited field without replacing the other profile fields', async () => {
    await act(async () => { setValue(host.querySelector('#learning-lab-profile-name'), 'C.D.'); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-profile-name')?.value).toBe('C.D.');
    expect(host.querySelector('#learning-lab-profile-identity')?.value).toBe('Written directions help me.');
  });

  it('reports a successful print request as status with review guidance', async () => {
    const print = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Print or save profile');
    await act(async () => { print.click(); await Promise.resolve(); });
    expect(printSpy).toHaveBeenCalledTimes(1);
    expect(host.querySelector('#learning-lab-profile-print-status')?.getAttribute('role')).toBe('status');
    expect(host.textContent).toContain('Review the destination and included information');
  });

  it('reports a print failure as an alert', async () => {
    printSpy.mockImplementation(() => { throw new Error('blocked'); });
    const print = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Print or save profile');
    await act(async () => { print.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-profile-print-status')?.getAttribute('role')).toBe('alert');
    expect(host.textContent).toContain('The print dialog could not open.');
  });

  it('confirms clearing, empties all fields, and restores first-field focus', async () => {
    await act(async () => { Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Clear profile').click(); await Promise.resolve(); });
    const dialog = document.querySelector('[data-learning-lab-confirm="true"]');
    expect(dialog?.querySelector('[role="alertdialog"]')).not.toBeNull();
    const confirm = Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Clear profile');
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(host.querySelector('#learning-lab-profile-name')?.value).toBe('');
    expect(host.querySelector('#learning-lab-profile-identity')?.value).toBe('');
    expect(document.activeElement?.id).toBe('learning-lab-profile-name');
    expect(Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Clear profile')).toBeUndefined();
  });
});
