import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_storybook_export_modal_source.jsx', 'utf8');
let React;
let ReactDOMClient;
let act;
let StorybookExportModal;
let root;
let host;
let opener;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_storybook_export_modal_module.js');
  StorybookExportModal = window.AlloModules.StorybookExportModal.StorybookExportModal;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  if (host) host.remove();
  host = null;
  if (opener) opener.remove();
  opener = null;
  vi.restoreAllMocks();
});

async function renderDialog(overrides = {}) {
  opener = document.createElement('button');
  opener.textContent = 'Open Storybook export';
  document.body.appendChild(opener);
  opener.focus();
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const close = vi.fn();
  await act(async () => {
    root.render(React.createElement(StorybookExportModal, {
      handleExportStorybook: vi.fn(async () => false),
      handleSetShowStorybookExportModalToFalse: close,
      isProcessing: false,
      setShowStorybookExportModal: vi.fn(),
      t: (key) => ({
        'adventure.storybook': 'Export Storybook PDF',
        'adventure.export_options': 'Export Options',
        'adventure.storybook_export_description': 'Choose an export format.',
        'adventure.include_images': 'Include Images',
        'adventure.text_only': 'Text Only',
        'adventure.storybook_image_warning': 'Images increase file size.',
        'common.cancel': 'Cancel',
      }[key] || key),
      ...overrides,
    }));
  });
  return { close, dialog: host.querySelector('[role="dialog"]') };
}

describe('Storybook export modal accessibility', () => {
  it('moves focus inside, wraps Tab, handles Escape, and restores its opener', async () => {
    const { close, dialog } = await renderDialog();
    const first = host.querySelector('#storybook-include-narration');
    const last = Array.from(host.querySelectorAll('button:not([disabled])')).at(-1);
    expect(document.activeElement).toBe(first);

    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(first);

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    root = null;
    expect(document.activeElement).toBe(opener);
  });

  it('keeps a busy export modal open and contains focus on the dialog', async () => {
    const { close, dialog } = await renderDialog({ isProcessing: true });
    expect(document.activeElement).toBe(dialog);
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).not.toHaveBeenCalled();
  });

  it('keeps the image action visible label in its accessible name', () => {
    expect(source).toContain("aria-label={t('adventure.include_images')}");
    expect(source).not.toContain("aria-label={t('common.toggle_images')}");
  });

  it('keeps every export state within the padded viewport at narrow reflow widths', () => {
    expect(source).toContain('max-h-[calc(100vh-2rem)]');
    expect(source).toContain('overflow-y-auto');
  });
});
