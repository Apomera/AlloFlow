import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const md = resolve(process.cwd(), 'prismflow-deploy/node_modules');
let React, ReactDOMClient, act, PoetTree, root, host;

beforeAll(() => {
  React = require(resolve(md, 'react'));
  ReactDOMClient = require(resolve(md, 'react-dom/client'));
  ({ act } = require(resolve(md, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('poet_tree_module.js');
  PoetTree = window.AlloModules.PoetTree;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
});

async function mountSavedPoem() {
  localStorage.setItem('alloPoetTreePoems', JSON.stringify([{ id: 'poem-1', title: 'Rain Song', text: 'Rain on the roof', formId: 'free', savedAt: '2026-07-22T12:00:00.000Z' }]));
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(PoetTree, { isOpen: true, onClose: () => {}, onCallTTS: async () => null, onCallImagen: async () => null, addToast: () => {}, gradeLevel: '7th Grade', selectedVoice: 'Kore', handleScoreUpdate: () => {} }));
  });
  const libraryTab = host.querySelector('#pt-tab-share');
  await act(async () => { libraryTab.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  return host.querySelector('button[aria-label="Delete Rain Song"]');
}

async function openDeleteDialog(trigger) {
  trigger.focus();
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
  return host.querySelector('[role="alertdialog"]');
}

describe('Poet Tree saved-poem deletion dialog accessibility', () => {
  it('opens a named alert dialog, traps Tab, cancels with Escape, and restores focus', async () => {
    const trigger = await mountSavedPoem();
    const dialog = await openDeleteDialog(trigger);
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('pt-delete-poem-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('pt-delete-poem-description');
    expect(dialog.textContent).toContain('Delete Rain Song?');

    const buttons = dialog.querySelectorAll('button');
    expect(document.activeElement).toBe(buttons[0]);
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[1]);
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(buttons[0]);

    await act(async () => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(JSON.parse(localStorage.getItem('alloPoetTreePoems'))).toHaveLength(1);
  });

  it('deletes only after the explicit destructive action', async () => {
    const trigger = await mountSavedPoem();
    const dialog = await openDeleteDialog(trigger);
    const confirmButton = dialog.querySelector('button[aria-label="Delete Rain Song permanently"]');
    await act(async () => {
      confirmButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 5)); });
    expect(host.querySelector('[role="alertdialog"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('alloPoetTreePoems'))).toEqual([]);
    expect(document.activeElement).toBe(host.querySelector('#pt-tab-share'));
  });
});
