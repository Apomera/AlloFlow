import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const rootDir = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(rootDir, 'stem_lab', 'stem_tool_molecule.js');
const deployPath = path.join(rootDir, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_molecule.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Molecule Lab tutorial dialog accessibility', () => {
  let host;
  let reactRoot;
  let config;

  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_molecule.js', 'molecule');
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => reactRoot.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function renderHarness() {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        molecule: { tutorialDismissed: false, tutorialStep: 0 },
      });
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => {
      reactRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  async function settle() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  it('opens as a named modal with safe initial focus and inert background', async () => {
    await renderHarness();
    await settle();

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('molecule-tutorial-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('molecule-tutorial-description');
    expect(document.activeElement.getAttribute('aria-label')).toBe('Dismiss Tutorial');
    expect(host.querySelector('[data-molecule-tool="true"] > [inert]')).not.toBeNull();
  });

  it('contains focus, dismisses with Escape, restores focus, and removes isolation', async () => {
    await renderHarness();
    await settle();

    const dialog = host.querySelector('[role="dialog"]');
    const buttons = dialog.querySelectorAll('button');
    buttons[buttons.length - 1].focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await settle();

    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement.tagName).toBe('BUTTON');
    expect(host.querySelector('[data-molecule-tool="true"] > [inert]')).toBeNull();
  });

  it('announces a named step while remaining open', async () => {
    await renderHarness();
    await settle();

    const next = Array.from(host.querySelectorAll('[role="dialog"] button'))
      .find((button) => button.textContent.includes('Next'));
    await act(async () => next.click());
    await settle();

    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.querySelector('#molecule-tutorial-title').textContent).toContain('Step 2 of 5');
    expect(Array.from(host.querySelectorAll('[role="dialog"] button'))
      .some((button) => button.textContent.includes('Back'))).toBe(true);
  });

  it('preserves complete dialog behavior in the deploy copy', () => {
    expect(source).toContain("role: 'dialog'");
    expect(source).toContain("'aria-modal': 'true'");
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("document.addEventListener('focusin', onFocusIn, true)");
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
