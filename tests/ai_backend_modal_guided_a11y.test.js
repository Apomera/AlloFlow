// AI Backend modal — guided-setup accessibility contract.
// Mirrors quickstart_wizard_a11y.test.js's approach: mount the real built
// module and assert the semantics assistive tech depends on: dialog role +
// aria-modal, real buttons with accessible names, a live step-status line,
// correct aria-expanded on the Advanced disclosure, and Escape-to-close.

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React, ReactDOMClient, act, Modal;
let container, root, closed;

const render = async (props = {}) => {
  await act(async () => {
    root.render(React.createElement(Modal, {
      _isCanvasEnv: false, ai: null, showAIBackendModal: true,
      setShowAIBackendModal: (v) => { if (v === false) closed = true; },
      t: () => '', GEMINI_MODELS: {}, ...props,
    }));
  });
};
const click = async (el) => {
  await act(async () => {
    el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
};
const byHelpKey = (key) => container.querySelector(`[data-help-key="${key}"]`);

beforeAll(() => {
  React = require(resolve(MODULES_DIR, 'react'));
  ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
  ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  loadAlloModule('view_misc_modals_module.js');
  Modal = window.AlloModules.AIBackendModal;
});

beforeEach(() => {
  window.localStorage.clear();
  closed = false;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe('guided modal a11y', () => {
  it('keeps the dialog semantics', async () => {
    await render();
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('ai-backend-title');
    expect(container.querySelector('#ai-backend-title')).toBeTruthy();
  });

  it('announces the current step via a live status line on every view', async () => {
    await render();
    const status = () => container.querySelector('[role="status"][aria-live="polite"]');
    expect(status()).toBeTruthy();
    await click(byHelpKey('ai_backend_guided_card_gemini'));
    expect(status()).toBeTruthy();
    await click(byHelpKey('ai_backend_guided_back_btn'));
    await click(byHelpKey('ai_backend_guided_card_connect'));
    expect(status()).toBeTruthy();
  });

  it('choice cards are buttons with accessible names', async () => {
    await render();
    for (const key of ['ai_backend_guided_card_gemini', 'ai_backend_guided_card_private', 'ai_backend_guided_card_connect']) {
      const card = byHelpKey(key);
      expect(card.tagName).toBe('BUTTON');
      expect(card.getAttribute('type')).toBe('button');
      expect((card.textContent || '').trim().length).toBeGreaterThan(10);
    }
  });

  it('exposes the local-storage shortcut as a named, full-size button', async () => {
    await render();
    const section = container.querySelector('#ai-backend-guided-storage-shortcut');
    const button = byHelpKey('ai_backend_guided_storage_btn');
    expect(section.getAttribute('aria-labelledby')).toBe('ai-backend-guided-storage-title');
    expect(container.querySelector('#ai-backend-guided-storage-title')).toBeTruthy();
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.textContent.trim()).toBe('Manage local storage');
    expect(button.className).toContain('min-h-11');
  });

  it('Advanced disclosure reports aria-expanded truthfully', async () => {
    await render();
    const toggle = byHelpKey('ai_backend_advanced_toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await click(toggle);
    expect(byHelpKey('ai_backend_advanced_toggle').getAttribute('aria-expanded')).toBe('true');
    await click(byHelpKey('ai_backend_advanced_toggle'));
    expect(byHelpKey('ai_backend_advanced_toggle').getAttribute('aria-expanded')).toBe('false');
  });

  it('Escape closes the modal from any view', async () => {
    await render();
    await click(byHelpKey('ai_backend_guided_card_gemini'));
    const dialog = container.querySelector('[role="dialog"]');
    await act(async () => {
      dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closed).toBe(true);
  });

  it('external links in guided steps open safely in a new tab', async () => {
    await render();
    await click(byHelpKey('ai_backend_guided_card_gemini'));
    const link = container.querySelector('a[href="https://aistudio.google.com/apikey"]');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel') || '').toContain('noopener');
  });
});
