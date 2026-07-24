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
const sourcePath = path.join(rootDir, 'stem_lab', 'stem_tool_universe.js');
const deployPath = path.join(rootDir, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_universe.js');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Universe tutorial dialog accessibility', () => {
  let host;
  let reactRoot;
  let config;
  let originalResizeObserver;

  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
    originalResizeObserver = globalThis.ResizeObserver;
    const ResizeObserverStub = class {
      observe() {}
      disconnect() {}
    };
    globalThis.ResizeObserver = window.ResizeObserver = ResizeObserverStub;
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_universe.js', 'universe');
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    if (typeof window._universeCleanupAll === 'function') window._universeCleanupAll();
    await act(async () => reactRoot.unmount());
    await new Promise((resolve) => setTimeout(resolve, 0));
    host.remove();
    globalThis.ResizeObserver = window.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  async function renderHarness() {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        universe: { tutorialDismissed: false },
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

  it('opens as a named modal with keyboard-neutral instructions and inert background', async () => {
    await renderHarness();
    await settle();

    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('universe-tutorial-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('universe-tutorial-description universe-tutorial-instructions');
    expect(document.activeElement.getAttribute('aria-label')).toBe('Dismiss tutorial and start exploring');
    expect(dialog.textContent).toContain('Left and Right Arrow keys or drag');
    expect(host.querySelector('[data-universe-tool="true"] > [inert]')).not.toBeNull();
  });

  it('contains focus, dismisses with Escape, restores focus, and removes isolation', async () => {
    await renderHarness();
    await settle();

    const dialog = host.querySelector('[role="dialog"]');
    const start = dialog.querySelector('button');
    start.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(start);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    await settle();

    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement.getAttribute('aria-label')).toBe('Back to tools');
    expect(host.querySelector('[data-universe-tool="true"] > [inert]')).toBeNull();
  });

  it('preserves complete dialog behavior in the deploy copy', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("role: 'dialog'");
    expect(source).toContain("'aria-modal': 'true'");
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("document.addEventListener('focusin', onFocusIn, true)");
    expect(source).toContain('max-h-[calc(100vh-2rem)] overflow-y-auto');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
