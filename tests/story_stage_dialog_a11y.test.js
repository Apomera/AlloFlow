import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  window.__alloFocusTrapStack = [];
  vi.restoreAllMocks();
});

function click(element) {
  act(() => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
}

describe('Story Stage dialog accessibility', () => {
  it('contains and restores focus, uses visible naming, and preserves an accessible upload action', async () => {
    opener = document.createElement('button');
    opener.textContent = 'Open LitLab';
    document.body.appendChild(opener);
    opener.focus();
    outside = document.createElement('button');
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(LitLab, {
        onClose: () => setOpen(false),
        gradeLevel: '5th Grade',
        studentNickname: 'Bright Owl',
        geminiVoices: [],
        kokoroVoices: [],
        addToast: () => {},
      }) : null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
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
    const upload = Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Upload File'));
    click(upload);
    expect(transientPicker?.type).toBe('file');
    expect(transientPicker?.getAttribute('aria-label')).toBe('Upload story source file');

    const axeResult = await axe.run(dialog, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(axeResult.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
