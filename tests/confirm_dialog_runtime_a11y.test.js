import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const moduleSource = fs.readFileSync('view_confirm_dialog_module.js', 'utf8');
let React;
let ReactDOMClient;
let act;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
});

describe('Shared confirmation dialog runtime accessibility', () => {
  let host;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    globalThis.React = window.React = React;
    window.AlloModules = {};
    window.__alloFocusTrapStack = [];
    new Function(moduleSource)();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    host?.remove();
    document.body.innerHTML = '';
    delete window.__alloFocusTrapStack;
  });

  it('inerts background siblings, starts on Cancel, and restores both state and focus on Escape', async () => {
    const ConfirmDialog = window.AlloModules.ConfirmDialog.ConfirmDialog;
    function Harness() {
      const [dialog, setDialog] = React.useState(null);
      return React.createElement(
        React.Fragment,
        null,
        React.createElement('main', { id: 'dialog-background' },
          React.createElement('button', {
            id: 'dialog-opener',
            type: 'button',
            onClick: () => setDialog({
              title: 'Discard edits?',
              message: 'This replaces manual edits.',
              confirmText: 'Discard edits',
              cancelText: 'Keep edits',
              tone: 'danger',
              onConfirm: () => {},
            }),
          }, 'Open confirmation')
        ),
        dialog ? React.createElement(ConfirmDialog, {
          confirmDialog: dialog,
          setConfirmDialog: setDialog,
          t: () => '',
        }) : null
      );
    }

    await act(async () => root.render(React.createElement(Harness)));
    const opener = document.getElementById('dialog-opener');
    opener.focus();
    await act(async () => {
      opener.click();
      await Promise.resolve();
    });

    const background = document.getElementById('dialog-background');
    const alertDialog = document.querySelector('[role="alertdialog"]');
    const cancel = Array.from(alertDialog.querySelectorAll('button')).find((button) => button.textContent === 'Keep edits');
    expect(background.hasAttribute('inert')).toBe(true);
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect(document.activeElement).toBe(cancel);
    expect(window.__alloFocusTrapStack).toHaveLength(1);

    await act(async () => {
      alertDialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await Promise.resolve();
    });

    expect(document.querySelector('[role="alertdialog"]')).toBeNull();
    expect(background.hasAttribute('inert')).toBe(false);
    expect(background.hasAttribute('aria-hidden')).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toHaveLength(0);
  });
});