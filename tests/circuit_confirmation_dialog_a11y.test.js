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
const sourcePath = path.join(rootDir, 'stem_lab', 'stem_tool_circuit.js');
const deployPath = path.join(rootDir, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_circuit.js');
const source = fs.readFileSync(sourcePath, 'utf8');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function buttonByText(host, text) {
  return Array.from(host.querySelectorAll('button')).find((button) => button.textContent === text);
}

describe('Circuit Lab accessible confirmations', () => {
  let host;
  let reactRoot;
  let config;
  let announcements;

  beforeEach(() => {
    const canvasContext = new Proxy({
      createLinearGradient: () => ({ addColorStop() {} }),
      createRadialGradient: () => ({ addColorStop() {} }),
      measureText: () => ({ width: 0 }),
    }, {
      get(target, property) {
        if (!(property in target)) target[property] = () => {};
        return target[property];
      },
      set(target, property, value) {
        target[property] = value;
        return true;
      },
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContext);
    announcements = [];
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit');
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    await act(async () => reactRoot.unmount());
    host.remove();
    vi.restoreAllMocks();
  });

  async function renderHarness(components) {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        _circuit: { mode: 'series', voltage: 9, components },
      });
      return config.render(makeCtx({
        toolData,
        setToolData,
        announceToSR: (message) => announcements.push(message),
      }));
    }
    await act(async () => {
      reactRoot.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  async function settleFocus() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }

  it('opens a named modal alert dialog with safe initial focus and background isolation', async () => {
    await renderHarness([
      { type: 'resistor', value: 100, id: 1 },
      { type: 'bulb', value: 50, id: 2 },
    ]);
    const clear = host.querySelector('[data-circuit-clear="true"]');
    clear.focus();
    await act(async () => clear.click());
    await settleFocus();

    const dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('circuit-confirm-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('circuit-confirm-description');
    expect(document.activeElement.textContent).toBe('Cancel');
    expect(host.querySelector('[data-circuit-builder-root="true"] > [inert]')).not.toBeNull();
  });

  it('contains focus, cancels on Escape, and restores the invoking control', async () => {
    await renderHarness([
      { type: 'resistor', value: 100, id: 1 },
      { type: 'bulb', value: 50, id: 2 },
    ]);
    const clear = host.querySelector('[data-circuit-clear="true"]');
    clear.focus();
    await act(async () => clear.click());
    await settleFocus();

    const dialog = host.querySelector('[role="alertdialog"]');
    const buttons = dialog.querySelectorAll('button');
    buttons[1].focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await settleFocus();
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(clear);
  });

  it('requires explicit confirmation before clearing and announces completion', async () => {
    await renderHarness([
      { type: 'resistor', value: 100, id: 1 },
      { type: 'bulb', value: 50, id: 2 },
    ]);
    const clear = host.querySelector('[data-circuit-clear="true"]');
    clear.focus();
    await act(async () => clear.click());
    await settleFocus();

    expect(host.querySelectorAll('[data-circuit-remove-id]')).toHaveLength(2);
    await act(async () => buttonByText(host, 'Clear circuit').click());
    await settleFocus();
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(host.querySelectorAll('[data-circuit-remove-id]')).toHaveLength(0);
    expect(document.activeElement).toBe(clear);
    expect(announcements).toContain('Circuit cleared.');
  });

  it('confirms removal from a substantial circuit and restores focus nearby', async () => {
    await renderHarness([
      { type: 'resistor', value: 100, id: 1 },
      { type: 'resistor', value: 120, id: 2 },
      { type: 'bulb', value: 50, id: 3 },
      { type: 'resistor', value: 180, id: 4 },
      { type: 'switch', value: 0, id: 5, closed: true },
    ]);
    const remove = host.querySelector('[data-circuit-remove-id="3"]');
    remove.focus();
    await act(async () => remove.click());
    await settleFocus();

    expect(host.querySelectorAll('[data-circuit-remove-id]')).toHaveLength(5);
    expect(host.querySelector('#circuit-confirm-title').textContent).toBe('Remove component?');
    await act(async () => buttonByText(host, 'Remove component').click());
    await settleFocus();

    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(host.querySelectorAll('[data-circuit-remove-id]')).toHaveLength(4);
    expect(document.activeElement).toBe(host.querySelector('[data-circuit-remove-id="4"]'));
    expect(announcements).toContain('Component removed. 4 components remain.');
  });

  it('removes native confirmation APIs and preserves deploy parity', () => {
    expect(source).not.toContain('window.confirm');
    expect(source).toContain("role: 'alertdialog'");
    expect(source).toContain("'aria-modal': 'true'");
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("document.addEventListener('focusin', onFocusIn, true)");
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
