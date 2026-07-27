import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const moduleDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React;
let ReactDOMClient;
let act;
let axe;
let LitLab;
let root;
let host;
let opener;
let outside;
let hadAlloUtils;
let originalAlloUtils;

beforeAll(() => {
  React = require(resolve(moduleDir, 'react'));
  ReactDOMClient = require(resolve(moduleDir, 'react-dom/client'));
  ({ act } = require(resolve(moduleDir, 'react-dom/test-utils')));
  axe = require(resolve(moduleDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloLanguageContext = React.createContext({ currentUiLanguage: 'English' });
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.LitLab;
  document.getElementById('litlab-a11y-styles')?.remove();
  loadAlloModule('story_stage_module.js');
  LitLab = window.AlloModules.LitLab;
});

beforeEach(() => {
  hadAlloUtils = Object.prototype.hasOwnProperty.call(window, '__alloUtils');
  originalAlloUtils = window.__alloUtils;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
  if (hadAlloUtils) window.__alloUtils = originalAlloUtils;
  else delete window.__alloUtils;
  localStorage.removeItem('alloLitLabScripts');
  vi.restoreAllMocks();
});

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

async function clickAsync(element) {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

function changeValue(element, value) {
  const prototype = element.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
  act(() => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function submit(form) {
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
  });
}

function findButton(container, text) {
  return Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes(text));
}

function getMainDialog() {
  return host.querySelector('[role="dialog"][aria-labelledby="litlab-dialog-title"]');
}

function getPromptDialog() {
  return host.querySelector('[role="dialog"][aria-labelledby="litlab-prompt-title"]');
}

async function mountLitLab(extraProps = {}) {
  opener = document.createElement('button');
  opener.textContent = 'Open LitLab';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);

  function Harness() {
    const [open, setOpen] = React.useState(true);
    return open ? React.createElement(LitLab, Object.assign({
      gradeLevel: '5th Grade',
      studentNickname: 'Bright Owl',
      geminiVoices: [],
      kokoroVoices: [],
      addToast: () => {},
    }, extraProps, {
      onClose: () => setOpen(false),
    })) : null;
  }

  await act(async () => {
    root.render(React.createElement(Harness));
    await Promise.resolve();
  });
  return getMainDialog();
}

const axeOptions = {
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
};

describe('Story Stage dialog accessibility', () => {
  it('contains and restores focus, uses visible naming, and preserves an accessible upload action', async () => {
    outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    const dialog = await mountLitLab();
    const backdrop = dialog.parentElement;
    const close = dialog.querySelector('button[aria-label="Close"]');
    const style = document.getElementById('litlab-a11y-styles');

    expect(backdrop.getAttribute('role')).toBe('presentation');
    expect(dialog.getAttribute('aria-labelledby')).toBe('litlab-dialog-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('litlab-dialog-description');
    expect(dialog.querySelector('#litlab-dialog-title').textContent).toBe('LitLab');
    expect(dialog.querySelector('#litlab-dialog-description').textContent).toContain('Bring stories to life');
    expect(document.activeElement).toBe(close);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);

    expect(style.textContent).toContain(':focus-visible');
    expect(style.textContent).toContain('min-height:24px');
    expect(style.textContent).toContain('@media (forced-colors:active)');
    expect(style.textContent).toContain('@media (prefers-reduced-motion:reduce)');
    expect(dialog.querySelector('textarea').style.outline).toBe('');

    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(close);

    const focusable = Array.from(dialog.querySelectorAll(
      'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    ));
    close.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(focusable.at(-1));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(close);

    let transientPicker = null;
    vi.spyOn(window.HTMLInputElement.prototype, 'click').mockImplementation(function () {
      transientPicker = this;
    });
    const upload = findButton(dialog, 'Upload File');
    click(upload);
    expect(transientPicker?.type).toBe('file');
    expect(transientPicker?.getAttribute('aria-label')).toBe('Upload story source file');

    const axeResult = await axe.run(dialog, axeOptions);
    expect(axeResult.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('imports a URL through a labelled nested dialog with validation, focus isolation, and restoration', async () => {
    const fetchAndCleanUrl = vi.fn(async () => 'Imported story text');
    window.__alloUtils = Object.assign({}, originalAlloUtils || {}, { fetchAndCleanUrl });
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('Native prompt must not be called');
    });
    const dialog = await mountLitLab();
    const importButton = findButton(dialog, 'Import URL');

    importButton.focus();
    click(importButton);
    let prompt = getPromptDialog();
    let input = prompt.querySelector('input');
    const form = prompt.querySelector('form');

    expect(prompt.querySelector('#litlab-prompt-title').textContent).toBe('Import story from URL');
    expect(prompt.querySelector('label').textContent).toBe('Story webpage URL');
    expect(input.type).toBe('url');
    expect(input.required).toBe(true);
    expect(input.getAttribute('aria-describedby')).toContain('litlab-prompt-description');
    expect(document.activeElement).toBe(input);
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(dialog.hasAttribute('inert')).toBe(true);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(prompt);

    await submit(form);
    expect(prompt.querySelector('[role="alert"]').textContent).toBe('Enter a URL to continue.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);

    const submitButton = prompt.querySelector('button[type="submit"]');
    submitButton.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(input);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(getPromptDialog()).toBeNull();
    expect(dialog.hasAttribute('aria-hidden')).toBe(false);
    expect(dialog.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(importButton);
    expect(fetchAndCleanUrl).not.toHaveBeenCalled();

    click(importButton);
    prompt = getPromptDialog();
    input = prompt.querySelector('input');
    const axeResult = await axe.run(prompt, axeOptions);
    expect(axeResult.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    changeValue(input, '  https://example.org/story  ');
    await submit(prompt.querySelector('form'));

    expect(getPromptDialog()).toBeNull();
    expect(fetchAndCleanUrl).toHaveBeenCalledWith(
      'https://example.org/story',
      undefined,
      expect.any(Function),
    );
    expect(dialog.querySelector('textarea[aria-label="Story text input"]').value).toContain('Imported story text');
    expect(document.activeElement).toBe(importButton);
    expect(nativePrompt).not.toHaveBeenCalled();
  });

  it('refines cover and page images through the accessible dialog without native prompts', async () => {
    const script = {
      title: 'Forest Story',
      setting: 'a forest',
      characters: [
        { id: 'narrator', name: 'Narrator', description: 'The storyteller', color: '#64748b' },
      ],
      lines: [
        { id: 'l1', speaker: 'narrator', text: 'A fox entered the forest.', type: 'narration' },
      ],
    };
    const onCallGemini = vi.fn(async () => JSON.stringify(script));
    const onCallImagen = vi.fn()
      .mockResolvedValueOnce('data:image/png;base64,cover-one')
      .mockResolvedValueOnce('data:image/png;base64,page-one');
    const onCallGeminiImageEdit = vi.fn()
      .mockResolvedValueOnce('data:image/png;base64,cover-two')
      .mockResolvedValueOnce('data:image/png;base64,page-two');
    const nativePrompt = vi.spyOn(window, 'prompt').mockImplementation(() => {
      throw new Error('Native prompt must not be called');
    });
    const dialog = await mountLitLab({ onCallGemini, onCallImagen, onCallGeminiImageEdit });

    const source = dialog.querySelector('textarea[aria-label="Story text input"]');
    changeValue(source, 'A fox entered the forest.');
    await clickAsync(findButton(dialog, 'Create Script'));
    await clickAsync(findButton(dialog, 'Start Performance'));

    await clickAsync(dialog.querySelector('button[aria-label="Generate cover image with AI"]'));
    const coverRefine = dialog.querySelector('button[aria-label="Refine cover image with a custom instruction"]');
    expect(coverRefine).not.toBeNull();
    coverRefine.focus();
    click(coverRefine);

    let prompt = getPromptDialog();
    expect(prompt.querySelector('#litlab-prompt-title').textContent).toBe('Refine cover image');
    expect(prompt.querySelector('label').textContent).toBe('How should the cover image change?');
    expect(document.activeElement).toBe(prompt.querySelector('input'));
    changeValue(prompt.querySelector('input'), 'Add a moon in the sky');
    await submit(prompt.querySelector('form'));

    expect(onCallGeminiImageEdit).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Add a moon in the sky'),
      'cover-one',
      600,
      0.85,
    );
    expect(document.activeElement).toBe(coverRefine);

    await clickAsync(dialog.querySelector('button[aria-label="Illustrate this page with AI"]'));
    const pageRefine = dialog.querySelector('button[aria-label="Refine this page illustration with a custom instruction"]');
    expect(pageRefine).not.toBeNull();
    pageRefine.focus();
    click(pageRefine);

    prompt = getPromptDialog();
    expect(prompt.querySelector('#litlab-prompt-title').textContent).toBe('Refine page 1 illustration');
    expect(prompt.querySelector('label').textContent).toBe('How should this page illustration change?');
    changeValue(prompt.querySelector('input'), 'Make it warmer');
    await submit(prompt.querySelector('form'));

    expect(onCallGeminiImageEdit).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Make it warmer'),
      'page-one',
      600,
      0.85,
    );
    expect(document.activeElement).toBe(pageRefine);
    expect(nativePrompt).not.toHaveBeenCalled();
  });
});
