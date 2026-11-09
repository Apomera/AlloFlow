// Quick Start "Paste or type text" and the custom word length (2026-11-04). Before this, Quick Start had
// no way to start from the teacher's own passage (its help text promised one), and length was five fixed
// presets. Renders the shipped quickstart_module.js and drives the real steps; the last block runs the
// shipped completion handler that turns the pasted text into the source.
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
const T = { 'common.next': 'Next', 'common.finish': 'Finish' };
let React, ReactDOMClient, act, Wizard, root, host;

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  // Unknown keys echo back, which is what exercises the English fallbacks.
  window.AlloLanguageContext = React.createContext({ t: (k) => T[k] || k });
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  loadAlloModule('quickstart_module.js');
  Wizard = window.AlloModules.QuickStartWizard;
  if (!Wizard) throw new Error('QuickStartWizard did not register');
});
afterEach(() => {
  if (root) { try { act(() => root.unmount()); } catch (_) {} root = null; }
  if (host) { host.remove(); host = null; }
});

const flush = async () => { await act(async () => { await Promise.resolve(); }); };
const buttonByText = text => Array.from(host.querySelectorAll('button')).find(b => (b.textContent || '').includes(text));
const click = el => { expect(el, 'missing control').toBeTruthy(); act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); };
const setValue = (el, value) => {
  const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
};

async function mount(extra = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const completed = [];
  await act(async () => {
    root.render(React.createElement(Wizard, { isOpen: true, onClose: () => {}, onComplete: d => completed.push(d), onUpload: () => {},
      onLookupStandards: null, onCallGemini: () => Promise.resolve(''), onWebSearch: null, addToast: () => {}, isParentMode: false,
      isIndependentMode: false, isHelpMode: false, setIsHelpMode: () => {}, ...extra }));
  });
  await flush();
  if (!extra.initialSourceMode) click(buttonByText('Next'));
  await flush();
  return completed;
}

describe('Quick Start: paste or type your own text', () => {
  it('offers it on the source step, then carries the text to Finish', async () => {
    const completed = await mount();
    const card = host.querySelector('[data-help-key="wizard_paste_source"]');
    // Same name as the Create screen's paste button.
    expect(card.textContent).toContain('Paste or type your own text');
    click(card);
    const box = host.querySelector('#wizard-paste-text');
    expect(box).toBeTruthy();
    expect(document.activeElement).toBe(box);
    expect(box.getAttribute('aria-describedby')).toContain('wizard-paste-help');
    const next = host.querySelector('[data-help-key="wizard_paste_next"]');
    expect(next.disabled, 'nothing to continue with yet').toBe(true);
    setValue(box, '   ');
    expect(next.disabled, 'spaces are not a passage').toBe(true);
    setValue(box, 'Rain falls on the hills. Rivers carry it to the sea.');
    expect(host.querySelector('#wizard-paste-count').textContent).toBe('11 words');
    expect(next.disabled).toBe(false);
    click(next);
    click(buttonByText('Finish'));
    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({ sourceMode: 'paste', pastedText: 'Rain falls on the hills. Rivers carry it to the sea.' });
  });
});

describe('Quick Start: word length presets plus a custom number', () => {
  it('keeps the presets, adds "Custom…", and keeps a typed number within 50 to 5,000', async () => {
    await mount({ initialSourceMode: 'generate' });
    const select = host.querySelector('[data-help-key="wizard_length_select"]');
    expect(Array.from(select.options).map(o => o.value)).toEqual(['200', '500', '800', '1200', '2000', 'custom']);
    expect(host.querySelector('[data-wizard-custom-length]'), 'hidden until asked for').toBeNull();
    setValue(select, 'custom');
    const field = host.querySelector('#wizard-custom-length');
    expect(field).toBeTruthy();
    expect([field.min, field.max, field.step]).toEqual(['50', '5000', '50']);
    expect(host.querySelector('#wizard-custom-length-hint').textContent).toBe('50 to 5,000 words');
    setValue(field, '3210');
    act(() => { field.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
    expect(host.querySelector('#wizard-custom-length').value).toBe('3210');
    setValue(field, '7');
    act(() => { field.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
    expect(host.querySelector('#wizard-custom-length').value, 'raised to the minimum').toBe('50');
    setValue(field, '99999');
    act(() => { field.dispatchEvent(new window.FocusEvent('focusout', { bubbles: true })); });
    expect(host.querySelector('#wizard-custom-length').value, 'capped at the maximum').toBe('5000');
    expect(select.value).toBe('custom');
    setValue(select, '800');
    expect(host.querySelector('[data-wizard-custom-length]'), 'a preset hides the custom field').toBeNull();
    expect(select.value).toBe('800');
  });
});

describe('finishing Quick Start with pasted text', () => {
  it('puts the text in the Source view, and asks before replacing an existing source', () => {
    loadAlloModule('phase_o_misc_handlers_module.js');
    const handlers = window.AlloModules.PhaseOHandlers;
    expect(typeof handlers.handleWizardComplete).toBe('function');
    const run = inputText => {
      const deps = new Proxy({ inputText, t: k => k, history: [], fileInputRef: { current: null } }, {
        get: (target, key) => (key in target ? target[key] : (target[key] = vi.fn())),
      });
      handlers.handleWizardComplete({ grade: '5th Grade', sourceMode: 'paste', pastedText: 'Our class garden.', materialType: 'text', topic: '' }, deps);
      return deps;
    };
    const fresh = run('');
    expect(fresh.setInputText).toHaveBeenCalledWith('Our class garden.');
    expect(fresh.openSourceView).toHaveBeenCalled();
    expect(fresh.setShowWizard).toHaveBeenCalledWith(false);
    expect(fresh.setSourceReplacement).not.toHaveBeenCalled();
    const replacing = run('An older passage.');
    // The older passage stays until the teacher picks "Replace with the new passage".
    expect(replacing.setSourceReplacement).toHaveBeenCalledWith(expect.objectContaining({ status: 'review', reason: 'unconfirmed', previous: 'An older passage.', text: 'Our class garden.' }));
    expect(replacing.setInputText).not.toHaveBeenCalled();
    expect(replacing.openSourceView).toHaveBeenCalled();
  });
});
