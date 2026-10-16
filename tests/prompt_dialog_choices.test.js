import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, axe, PromptDialog;
let host, opener, outside, root, replacePrompt, dismiss;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const app = readFileSync('AlloFlowANTI.txt', 'utf8');
  const start = app.indexOf('const useFocusTrap = ');
  const endMarker = 'window.__alloHooks = { useFocusTrap };';
  const end = app.indexOf(endMarker, start) + endMarker.length;
  new Function('React', 'const { useRef, useEffect } = React;\n' + app.slice(start, end))(React);
  const source = readFileSync('view_prompt_dialog_source.jsx', 'utf8');
  const compiled = transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  PromptDialog = new Function('React', compiled + '\nreturn PromptDialog;')(React);
});

beforeEach(() => {
  opener = document.createElement('button');
  opener.textContent = 'Generate glossary';
  outside = document.createElement('button');
  outside.textContent = 'Outside';
  host = document.createElement('div');
  document.body.append(opener, outside, host);
  opener.focus();
  root = ReactDOMClient.createRoot(host);
  dismiss = vi.fn();
  window.alloAnnounce = vi.fn();
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  window.__alloFocusTrapStack = [];
  delete window.alloAnnounce;
  vi.restoreAllMocks();
});

function sourcePrompt(overrides = {}) {
  return {
    title: 'Choose a source for your glossary',
    message: 'Choose the reading to use for this glossary.',
    confirmText: 'Use this source and generate',
    cancelText: 'Cancel',
    choices: [
      { value: 'moon', label: 'Moon reading', description: 'The Moon orbits Earth and creates tides.' },
      { value: 'plants', label: 'Plants reading', description: 'Plants use chlorophyll to absorb sunlight.' },
    ],
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
}

function mount(prompt, { close = true } = {}) {
  function Harness() {
    const [current, setCurrent] = React.useState(prompt);
    replacePrompt = setCurrent;
    return current && React.createElement(PromptDialog, {
      promptDialog: current,
      setPromptDialog: next => { dismiss(next); if (close) setCurrent(next); },
      t: () => '',
    });
  }
  act(() => root.render(React.createElement(Harness)));
}

const radios = () => Array.from(host.querySelectorAll('input[type="radio"]'));
const confirm = () => Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Use this source and generate');
const keydown = (target, key, options = {}) => {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  act(() => target.dispatchEvent(event));
  return event;
};

describe('PromptDialog source choices', () => {
  it('shows named preview cards, focuses the first radio without choosing it, and requires a selection', async () => {
    const prompt = sourcePrompt();
    mount(prompt);

    expect(PromptDialog.supportsChoices).toBe(true);
    expect(radios()).toHaveLength(2);
    expect(document.activeElement).toBe(radios()[0]);
    expect(radios().every(radio => !radio.checked)).toBe(true);
    expect(confirm().disabled).toBe(true);
    for (const [index, choice] of prompt.choices.entries()) {
      expect(document.getElementById(radios()[index].getAttribute('aria-labelledby')).textContent).toBe(choice.label);
      expect(document.getElementById(radios()[index].getAttribute('aria-describedby')).textContent).toBe(choice.description);
    }
    act(() => confirm().click());
    expect(prompt.onSubmit).not.toHaveBeenCalled();
    const results = await axe.run(host, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter(result => ['serious', 'critical'].includes(result.impact))).toEqual([]);
  });

  it('announces a missing choice, clears the error on selection, and submits the selected source only once', () => {
    const prompt = sourcePrompt();
    mount(prompt, { close: false });

    keydown(radios()[0], 'Enter');
    expect(host.querySelector('[role="alert"]').textContent).toMatch(/choose a source/i);
    expect(window.alloAnnounce).toHaveBeenCalledWith(expect.stringMatching(/choose a source/i), 'assertive');
    expect(prompt.onSubmit).not.toHaveBeenCalled();
    act(() => radios()[1].click());
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(confirm().disabled).toBe(false);
    expect(radios()[1].checked).toBe(true);
    act(() => { confirm().click(); confirm().click(); });
    expect(prompt.onSubmit).toHaveBeenCalledExactlyOnceWith('plants');
    expect(dismiss).toHaveBeenCalledExactlyOnceWith(null);
    act(() => host.querySelector('[aria-label="Close"]').click());
    expect(prompt.onCancel).not.toHaveBeenCalled();
  });

  it.each(['Cancel', 'Close'])('preserves native Enter activation on %s without submitting a selected source', buttonName => {
    const prompt = sourcePrompt();
    mount(prompt, { close: false });
    act(() => radios()[1].click());
    const button = Array.from(host.querySelectorAll('button')).find(item => item.textContent === buttonName || item.getAttribute('aria-label') === buttonName);
    button.focus();

    expect(keydown(button, 'Enter').defaultPrevented).toBe(false);
    expect(prompt.onSubmit).not.toHaveBeenCalled();
    // jsdom does not dispatch the browser's native keyboard click.
    act(() => { button.click(); button.click(); });
    expect(prompt.onCancel).toHaveBeenCalledTimes(1);
    expect(prompt.onSubmit).not.toHaveBeenCalled();
  });

  it('preserves native Enter on the confirm button and allows Enter from a selected radio', () => {
    const prompt = sourcePrompt();
    mount(prompt);
    act(() => radios()[0].click());
    expect(keydown(confirm(), 'Enter').defaultPrevented).toBe(false);
    expect(prompt.onSubmit).not.toHaveBeenCalled();
    expect(keydown(radios()[0], 'Enter').defaultPrevented).toBe(true);
    expect(prompt.onSubmit).toHaveBeenCalledExactlyOnceWith('moon');
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('contains Tab focus and cancels on Escape without generating, restoring the opener', () => {
    const prompt = sourcePrompt();
    mount(prompt);
    act(() => radios()[1].click());
    confirm().focus();
    keydown(confirm(), 'Tab');
    expect(document.activeElement).toBe(host.querySelector('[aria-label="Close"]'));
    keydown(document.activeElement, 'Tab', { shiftKey: true });
    expect(document.activeElement).toBe(confirm());
    keydown(confirm(), 'Escape');
    expect(prompt.onCancel).toHaveBeenCalledTimes(1);
    expect(prompt.onSubmit).not.toHaveBeenCalled();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toEqual([]);
  });

  it('resets choice, errors, and settlement when a different prompt replaces an open prompt', () => {
    const first = sourcePrompt({ validate: () => 'This reading is unavailable.' });
    mount(first, { close: false });
    act(() => radios()[1].click());
    act(() => confirm().click());
    expect(host.querySelector('[role="alert"]').textContent).toBe('This reading is unavailable.');
    act(() => host.querySelector('[aria-label="Close"]').click());
    expect(first.onCancel).toHaveBeenCalledTimes(1);

    const next = sourcePrompt();
    act(() => replacePrompt(next));
    expect(host.querySelector('[role="alert"]')).toBeNull();
    expect(radios().every(radio => !radio.checked)).toBe(true);
    expect(confirm().disabled).toBe(true);
    expect(document.activeElement).toBe(radios()[0]);
    act(() => radios()[0].click());
    act(() => confirm().click());
    expect(next.onSubmit).toHaveBeenCalledExactlyOnceWith('moon');
  });

  it('keeps ordinary text prompts editable and resets their default value on replacement', () => {
    const first = sourcePrompt({ choices: undefined, defaultValue: 'First value' });
    mount(first, { close: false });
    expect(host.querySelector('input').value).toBe('First value');
    expect(host.querySelector('input').type).toBe('text');
    expect(confirm().disabled).toBe(false);
    keydown(host.querySelector('input'), 'Enter');
    expect(first.onSubmit).toHaveBeenCalledExactlyOnceWith('First value');

    const next = sourcePrompt({ choices: undefined, defaultValue: 'Next value' });
    act(() => replacePrompt(next));
    keydown(host.querySelector('input'), 'Enter');
    expect(next.onSubmit).toHaveBeenCalledExactlyOnceWith('Next value');
  });
});
