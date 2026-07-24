import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { readFileSync } from 'node:fs';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const SOURCE = 'stem_lab/stem_tool_printingpress.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_printingpress.js';

function findButton(host, text) {
  return Array.from(host.querySelectorAll('button')).find(
    (button) => button.textContent.trim() === text
  );
}

describe('Printing Press confirmation-dialog accessibility', () => {
  let host;
  let root;
  let config;

  beforeEach(() => {
    window.localStorage.clear();
    resetStemLab();
    document.getElementById('printingpress-print-css')?.remove();
    config = loadTool(SOURCE, 'printingPress');
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    root = null;
    host = null;
    window.localStorage.clear();
  });

  async function mountAskPrinter() {
    function Harness() {
      const [toolData, setToolData] = React.useState({
        printingPress: {
          view: 'askPrinter',
          askHistory: [{
            ts: '2026-07-22T12:00:00.000Z',
            q: 'How did printers distribute type?',
            text: 'They returned each sort to its compartment.',
          }],
        },
      });
      const ctx = makeCtx({
        toolData,
        update(toolId, key, value) {
          setToolData((previous) => ({
            ...previous,
            [toolId]: { ...(previous[toolId] || {}), [key]: value },
          }));
        },
        updateMulti(toolId, values) {
          setToolData((previous) => ({
            ...previous,
            [toolId]: { ...(previous[toolId] || {}), ...values },
          }));
        },
      });
      return config.render(ctx);
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });
  }

  it('moves focus into the dialog, traps Tab, cancels with Escape, and restores focus', async () => {
    await mountAskPrinter();
    const opener = findButton(host, 'Clear history');
    expect(opener).toBeTruthy();
    expect(opener.getAttribute('aria-haspopup')).toBe('dialog');
    opener.focus();

    await act(async () => {
      opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(
      'printingpress-confirm-title'
    );
    expect(dialog.getAttribute('aria-describedby')).toBe(
      'printingpress-confirm-message'
    );
    expect(dialog.querySelector('#printingpress-confirm-title').textContent)
      .toBe('Clear saved AI answers?');
    expect(dialog.querySelector('#printingpress-confirm-message').textContent)
      .toContain('permanently removes');

    const cancel = findButton(dialog, 'Cancel');
    const confirm = findButton(dialog, 'Clear history');
    expect(document.activeElement).toBe(cancel);

    act(() => {
      cancel.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
        })
      );
    });
    expect(document.activeElement).toBe(confirm);

    act(() => {
      confirm.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      );
    });
    expect(document.activeElement).toBe(cancel);

    await act(async () => {
      cancel.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('performs the destructive action only after explicit confirmation', async () => {
    await mountAskPrinter();
    const opener = findButton(host, 'Clear history');

    await act(async () => {
      opener.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    const dialog = host.querySelector('[role="alertdialog"]');
    const confirm = findButton(dialog, 'Clear history');

    await act(async () => {
      confirm.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(findButton(host, 'Clear history')).toBeUndefined();
    expect(document.activeElement).toBe(host.firstElementChild);
  });

  it('keeps both destructive triggers and the shared dialog contract explicit', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).not.toContain('window.confirm');
    expect(source.match(/'aria-haspopup': 'dialog'/g)).toHaveLength(2);
    expect(source).toContain("role: 'alertdialog'");
    expect(source).toContain("'aria-modal': 'true'");
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain("event.key !== 'Tab'");
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
