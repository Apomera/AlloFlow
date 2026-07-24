import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const promptSource = readFileSync('view_prompt_dialog_source.jsx', 'utf8');
const rendererSource = readFileSync('view_renderers_source.jsx', 'utf8');
let React;
let ReactDOMClient;
let act;
let axe;
let PromptDialog;
let root;
let host;
let opener;
let outside;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;

  const useTestFocusTrap = (ref, isOpen, onEscape) => {
    const escapeRef = React.useRef(onEscape);
    escapeRef.current = onEscape;
    React.useEffect(() => {
      if (!isOpen || !ref.current) return undefined;
      const dialog = ref.current;
      const previousFocus = document.activeElement;
      const stack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
      const trap = { root: dialog };
      stack.push(trap);
      const isTop = () => stack.at(-1) === trap;
      const focusable = () => Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled])'));
      const onKey = (event) => {
        if (!isTop()) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          escapeRef.current?.();
          return;
        }
        if (event.key !== 'Tab') return;
        const items = focusable();
        if (!items.length) return;
        const first = items[0];
        const last = items.at(-1);
        if (!dialog.contains(document.activeElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', onKey);
      (focusable()[0] || dialog).focus();
      return () => {
        document.removeEventListener('keydown', onKey);
        const wasTop = isTop();
        const index = stack.indexOf(trap);
        if (index >= 0) stack.splice(index, 1);
        if (wasTop && previousFocus?.isConnected) previousFocus.focus();
      };
    }, [isOpen, ref]);
  };
  window.__alloHooks = { useFocusTrap: useTestFocusTrap };
  window.Edit3 = (props) => React.createElement('span', { 'aria-hidden': props['aria-hidden'] }, 'edit');
  window.X = (props) => React.createElement('span', { 'aria-hidden': props['aria-hidden'] }, 'close');
  loadAlloModule('view_prompt_dialog_module.js');
  PromptDialog = window.AlloModules.PromptDialog.PromptDialog;
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

describe('shared PromptDialog and Frayer refinement accessibility', () => {
  it('keeps shared prompt and Frayer generated artifacts synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_prompt_dialog_module.js', 'utf8'))
      .toBe(readFileSync('view_prompt_dialog_module.js', 'utf8'));
    expect(readFileSync('desktop/web-app/public/view_renderers_module.js', 'utf8'))
      .toBe(readFileSync('view_renderers_module.js', 'utf8'));
  });

  it('uses the shared accessible prompt for Frayer image refinement', () => {
    expect(rendererSource).not.toContain("window.prompt('How should the image change?");
    expect(rendererSource).toContain("typeof window.AlloFlowUX.prompt === 'function'");
    expect(rendererSource).toContain('await window.AlloFlowUX.prompt(');
    expect(rendererSource).toContain("title: 'Refine Frayer model image'");
    expect(rendererSource).toContain("confirmText: 'Refine image'");
    expect(rendererSource).toContain("cancelText: 'Cancel'");
    expect(rendererSource).toContain('maxLength: 500');
  });

  it('renders a named, described, contained prompt and restores opener focus on Escape', async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Refine Frayer image';
    document.body.appendChild(opener);
    opener.focus();
    outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'Outside';
    document.body.appendChild(outside);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    function Harness() {
      const [dialog, setDialog] = React.useState({
        message: 'Describe how the image should change.',
        title: 'Refine Frayer model image',
        defaultValue: 'Add labels',
        confirmText: 'Refine image',
        cancelText: 'Cancel',
        maxLength: 500,
        onCancel,
        onSubmit,
      });
      return dialog ? React.createElement(PromptDialog, {
        promptDialog: dialog,
        setPromptDialog: setDialog,
        t: (key) => key,
      }) : null;
    }

    await act(async () => {
      root.render(React.createElement(Harness));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const input = dialog.querySelector('input');
    const buttons = Array.from(dialog.querySelectorAll('button'));
    const close = buttons[0];
    const cancel = buttons[1];
    const submit = buttons[2];
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('alloflow-prompt-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('alloflow-prompt-description');
    expect(document.getElementById('alloflow-prompt-description').textContent)
      .toBe('Describe how the image should change.');
    expect(document.activeElement).toBe(input);
    expect(input.maxLength).toBe(500);
    expect(close.className).toContain('w-11 h-11');
    expect(cancel.className).toContain('min-h-11');
    expect(submit.className).toContain('min-h-11');
    expect(dialog.className).toContain('max-h-[calc(100vh-2rem)] overflow-y-auto');
    expect(window.__alloFocusTrapStack.at(-1)?.root).toBe(dialog);

    const axeResults = await axe.run(dialog, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    } });
    expect(axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical'))
      .toEqual([]);

    submit.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(close);
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(submit);
    outside.focus();
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })));
    expect(document.activeElement).toBe(close);

    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toEqual([]);
  });

  it('documents the shared modal safeguards in source', () => {
    expect(promptSource).toContain('_promptUseFocusTrap(dialogRef, true, handleCancel)');
    expect(promptSource).toContain('aria-describedby="alloflow-prompt-description"');
    expect(promptSource).toContain('id="alloflow-prompt-description"');
    expect(promptSource).toContain('motion-reduce:animate-none');
    expect(promptSource).toContain('w-11 h-11');
    expect(promptSource.match(/min-h-11/g)).toHaveLength(2);
    expect(promptSource).not.toContain("window.addEventListener('keydown', onKey)");
  });
});
