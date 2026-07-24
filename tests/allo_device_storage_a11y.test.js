import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import axe from 'axe-core';

const source = readFileSync('allo_device_storage_module.js', 'utf8');
let dom;

const flush = async (win) => {
  await Promise.resolve();
  await new Promise((resolve) => win.setTimeout(resolve, 0));
};

const findButton = (root, text) => Array.from(root.querySelectorAll('button'))
  .find((button) => button.textContent.includes(text));

const openPopulatedPanel = async (api, doc, win) => {
  const panel = api.__openProbePanel();
  const dataButton = findButton(panel, 'View app data');
  dataButton.click();
  await flush(win);
  return panel;
};

afterEach(() => {
  dom?.window?.close();
  dom = null;
  vi.restoreAllMocks();
});

describe('device storage probe accessibility', () => {
  it('ships safe-default dialog and target/focus safeguards to both deployed copies', () => {
    expect(source).not.toContain("window.confirm('Erase all '");
    expect(source).toContain('function confirmDeviceStorageErase(info, opener)');
    expect(source).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', 'allo-device-storage-confirm-title')");
    expect(source).toContain("dialog.setAttribute('aria-describedby', 'allo-device-storage-confirm-description')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
    expect(source).toContain("entry.el.setAttribute('aria-hidden', 'true')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("var btnCss = 'font:inherit;font-weight:600;min-height:44px;");
    expect(source).toContain("panel.setAttribute('aria-labelledby', 'allo-device-storage-probe-title')");
    expect(source).toContain("if (restoreFocus !== false && panelOpener");
    expect(readFileSync('desktop/web-app/public/allo_device_storage_module.js', 'utf8')).toBe(source);
  });

  it('cancels safely, traps focus, restores focus, and erases only after explicit confirmation', async () => {
    const runtimeErrors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => {
      const message = String(error?.stack || error?.message || error || '');
      if (/SyntaxError|Uncaught/i.test(message)) runtimeErrors.push(message);
    });
    dom = new JSDOM('<!doctype html><html><body><button id="probe-opener" type="button">Open storage probe</button><main id="app">App</main></body></html>', {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://example.test/app.html',
      virtualConsole,
    });
    dom.window.eval(source);
    expect(runtimeErrors).toEqual([]);

    const doc = dom.window.document;
    const api = dom.window.alloDeviceStorage;
    const clearNamespace = vi.fn(() => new Promise(() => {}));
    api.ready = vi.fn(() => Promise.resolve(api));
    api.namespaces = vi.fn(() => Promise.resolve([{ ns: 'learner_notes', count: 3, bytes: 128 }]));
    api.clearNamespace = clearNamespace;

    const opener = doc.getElementById('probe-opener');
    opener.focus();
    let panel = await openPopulatedPanel(api, doc, dom.window);
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-labelledby')).toBe('allo-device-storage-probe-title');
    expect(doc.getElementById('allo-device-storage-probe-title')).toBeTruthy();
    Array.from(panel.querySelectorAll('button')).forEach((button) => {
      expect(button.type).toBe('button');
      expect(button.style.minHeight).toBe('44px');
    });

    let eraseButton = findButton(panel, 'Erase');
    eraseButton.focus();
    eraseButton.click();
    let dialog = doc.querySelector('[role="alertdialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('allo-device-storage-confirm-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('allo-device-storage-confirm-description');
    expect(doc.getElementById('allo-device-storage-confirm-description').textContent)
      .toBe('3 record(s) in learner_notes will be permanently removed from this device. This cannot be undone.');
    expect(panel.hasAttribute('inert')).toBe(true);
    expect(panel.getAttribute('aria-hidden')).toBe('true');
    const [cancel, confirm] = Array.from(dialog.querySelectorAll('button'));
    expect(cancel.textContent).toBe('Cancel');
    expect(confirm.textContent).toBe('Erase data');
    expect(doc.activeElement).toBe(cancel);

    dom.window.eval(axe.source);
    const results = await dom.window.axe.run(dialog, {
      rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
    });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Tab', shiftKey: true, bubbles: true, cancelable: true,
    }));
    expect(doc.activeElement).toBe(confirm);
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Tab', bubbles: true, cancelable: true,
    }));
    expect(doc.activeElement).toBe(cancel);
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, cancelable: true,
    }));
    await flush(dom.window);
    expect(doc.querySelector('[role="alertdialog"]')).toBeNull();
    expect(clearNamespace).not.toHaveBeenCalled();
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(panel.hasAttribute('aria-hidden')).toBe(false);
    expect(doc.activeElement).toBe(eraseButton);

    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Escape', bubbles: true, cancelable: true,
    }));
    expect(panel.isConnected).toBe(false);
    expect(doc.activeElement).toBe(opener);

    panel = await openPopulatedPanel(api, doc, dom.window);
    eraseButton = findButton(panel, 'Erase');
    eraseButton.focus();
    eraseButton.click();
    dialog = doc.querySelector('[role="alertdialog"]');
    findButton(dialog, 'Erase data').click();
    await flush(dom.window);
    expect(clearNamespace).toHaveBeenCalledTimes(1);
    expect(clearNamespace).toHaveBeenCalledWith('learner_notes');
    expect(doc.querySelector('[role="alertdialog"]')).toBeNull();
    expect(panel.hasAttribute('inert')).toBe(false);
    expect(doc.activeElement).toBe(eraseButton);
  });
});
