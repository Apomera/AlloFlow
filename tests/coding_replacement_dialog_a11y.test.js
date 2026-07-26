import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_coding.js');
const publicPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_coding.js');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Coding Lab program replacement dialog accessibility', () => {
  let host;
  let reactRoot;
  let config;

  beforeEach(() => {
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => reactRoot.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  async function renderHarness(initialState) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        _codingPlayground: { codeMode: 'outline', ...initialState },
      });
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => {
      reactRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });
    await settle();
  }

  function firstTemplateButton() {
    return Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Five-Point Star'));
  }

  it('opens a named alert dialog with safe initial focus and an inert background', async () => {
    await renderHarness({
      tutorialDismissed: true,
      showTemplates: true,
      blocks: [{ type: 'forward', distance: 10 }],
    });

    const opener = firstTemplateButton();
    expect(opener).toBeTruthy();
    await act(async () => opener.click());
    await settle();

    const dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('coding-replacement-dialog-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('coding-replacement-dialog-description');
    expect(dialog.textContent).toContain('Five-Point Star');
    expect(document.activeElement.textContent).toBe('Cancel');
    expect(host.querySelector('[data-coding-tool="true"] > [inert]')).not.toBeNull();
  });

  it('traps focus, cancels with Escape, preserves work, and restores focus', async () => {
    await renderHarness({
      tutorialDismissed: true,
      showTemplates: true,
      blocks: [{ type: 'forward', distance: 10 }],
    });

    const opener = firstTemplateButton();
    opener.focus();
    await act(async () => opener.click());
    await settle();

    const dialog = host.querySelector('[role="alertdialog"]');
    const buttons = dialog.querySelectorAll('button');
    buttons[buttons.length - 1].focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);

    buttons[0].focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await settle();

    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(host.textContent).toContain('Program (1 blocks)');
    expect(document.activeElement).toBe(opener);
    expect(host.querySelector('[data-coding-tool="true"] > [inert]')).toBeNull();
  });

  it('replaces work only after explicit confirmation', async () => {
    await renderHarness({
      tutorialDismissed: true,
      showTemplates: true,
      blocks: [{ type: 'forward', distance: 10 }],
    });

    await act(async () => firstTemplateButton().click());
    await settle();

    const replaceButton = Array.from(host.querySelectorAll('[role="alertdialog"] button'))
      .find((button) => button.textContent === 'Replace program');
    await act(async () => replaceButton.click());
    await settle();

    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(host.textContent).toContain('Program (2 blocks)');
    expect(host.textContent).not.toContain('Program (1 blocks)');
  });

  it('uses the same managed workflow for seeded challenge examples', async () => {
    await renderHarness({
      tutorialDismissed: true,
      blocks: [{ type: 'forward', distance: 10 }],
    });

    const challenge = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent.includes('Worked: Square'));
    expect(challenge).toBeTruthy();
    await act(async () => challenge.click());
    await settle();

    const dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Worked: Square');

    const replaceButton = Array.from(dialog.querySelectorAll('button'))
      .find((button) => button.textContent === 'Replace program');
    await act(async () => replaceButton.click());
    await settle();

    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(host.textContent).toContain('Program (8 blocks)');
  });

  it('removes native confirmation calls and keeps the active public mirror identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).not.toContain('confirm(');
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("document.addEventListener('focusin', onFocusIn, true)");
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(source);
  });
});
