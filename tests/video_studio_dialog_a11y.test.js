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
let VideoStudio;
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
  Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined });
  Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined });
  sessionStorage.setItem('allo_vs_bridge_token', 'a11y-video-token');
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.VideoStudio;
  document.getElementById('vs-a11y-css')?.remove();
  loadAlloModule('video_studio_module.js');
  VideoStudio = window.AlloModules.VideoStudio;
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

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('Video Studio dialog accessibility', () => {
  it('manages top-level and destructive-confirmation focus without browser confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:a11y-video');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    opener = document.createElement('button');
    opener.textContent = 'Open Video Studio';
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
      return open ? React.createElement(VideoStudio, {
        onClose: () => setOpen(false),
        addToast: () => {},
      }) : null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const close = dialog.querySelector('button[aria-label="Close Video Studio panel"]');
    const a11yStyle = document.getElementById('vs-a11y-css');
    expect(dialog.parentElement.getAttribute('role')).toBe('presentation');
    expect(dialog.getAttribute('aria-labelledby')).toBe('video-studio-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('video-studio-description');
    expect(document.activeElement).toBe(close);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);
    expect(a11yStyle.textContent).toContain('outline: 3px solid #0f172a');
    expect(a11yStyle.textContent).toContain('@media (forced-colors: active)');
    expect(a11yStyle.textContent).not.toContain('outline: none');

    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(close);

    const initialAxe = await axe.run(dialog, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    });
    expect(initialAxe.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    const popup = { closed: false, postMessage: vi.fn(), focus: vi.fn() };
    const message = new window.MessageEvent('message', {
      data: {
        type: 'allostudio-video',
        bridge: 'a11y-video-token',
        payload: {
          blob: new Blob(['accessible video'], { type: 'video/webm' }),
          title: 'Accessible science lesson',
          duration: 12,
          vtt: 'WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nWelcome',
        },
      },
      origin: 'https://alloflow-cdn.pages.dev',
      source: popup,
    });
    act(() => window.dispatchEvent(message));
    await flush();
    await flush();

    const remove = Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Remove'));
    expect(remove).toBeTruthy();

    let transientCopyField = null;
    const nativeCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = nativeCreateElement(tagName, options);
      if (String(tagName).toLowerCase() === 'textarea') transientCopyField = element;
      return element;
    });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    document.execCommand = vi.fn(() => true);
    const copy = Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Copy pack reference'));
    copy.focus();
    click(copy);
    expect(transientCopyField.getAttribute('aria-label')).toBe('Temporary pack reference copy field');
    expect(transientCopyField.isConnected).toBe(false);
    expect(document.activeElement).toBe(copy);

    remove.focus();
    click(remove);
    const alertDialog = host.querySelector('[role="alertdialog"]');
    const alertButtons = Array.from(alertDialog.querySelectorAll('button'));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(alertDialog.getAttribute('aria-labelledby')).toBe('video-studio-remove-title');
    expect(alertDialog.getAttribute('aria-describedby')).toBe('video-studio-remove-message video-studio-remove-detail');
    expect(alertDialog.textContent).toContain('Accessible science lesson');
    expect(document.activeElement).toBe(alertButtons[0]);
    expect(alertButtons[0].textContent).toBe('Cancel');
    expect(dialog.getAttribute('aria-hidden')).toBe('true');
    expect(dialog.hasAttribute('inert')).toBe(true);
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(alertDialog);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(alertButtons.at(-1));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(alertButtons[0]);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await flush();
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(remove);
    expect(dialog.textContent).toContain('Accessible science lesson');

    click(remove);
    const confirmRemove = Array.from(host.querySelectorAll('[role="alertdialog"] button'))
      .find((button) => button.textContent === 'Remove video');
    click(confirmRemove);
    await flush();
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(dialog.textContent).not.toContain('Accessible science lesson');
    expect(document.activeElement).toBe(close);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await flush();
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
