import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupSymbolStudio } from './helpers/symbol_studio_harness.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let ReactDOMClient;
let act;
let axe;
let SymbolStudio;
let root;
let host;

beforeAll(() => {
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  act = React.act;
  axe = require(resolve(modulesDir, 'axe-core'));
  SymbolStudio = setupSymbolStudio().SymbolStudio;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
  window.localStorage.clear();
});

function seedScanningBoard() {
  const profile = { id: 'profile-a', name: 'Student', description: '', image: null, codename: 'Sky Fox' };
  const board = {
    id: 'board-a',
    title: 'Choices',
    cols: 2,
    profileId: profile.id,
    words: [
      { id: 'cell-one', label: 'One', category: 'noun', image: 'data:image/png;base64,iVBORw0KGgo=' },
      { id: 'cell-two', label: 'Two', category: 'noun', image: 'data:image/png;base64,iVBORw0KGgo=' },
    ],
  };
  window.localStorage.setItem('alloStudentProfiles', JSON.stringify([profile]));
  window.localStorage.setItem('alloActiveProfileId', JSON.stringify(profile.id));
  window.localStorage.setItem('alloSymbolBoards__profile-a', JSON.stringify([board]));
}

async function flushTimer() {
  await act(async () => {
    await new Promise((resolveTimer) => setTimeout(resolveTimer, 0));
  });
}

describe('Symbol Studio scanning runtime accessibility', () => {
  it('contains focus, isolates switch shortcuts, closes with Escape, and restores the Scan button', async () => {
    seedScanningBoard();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const onCallTTS = vi.fn(async () => null);

    await act(async () => {
      root.render(React.createElement(SymbolStudio, baseProps({ initialTab: 'board', onCallTTS })));
      await Promise.resolve();
    });
    await flushTimer();

    const galleryButton = host.querySelector('button[aria-label="Toggle saved boards gallery"]');
    expect(galleryButton).toBeTruthy();
    act(() => galleryButton.click());

    const opener = host.querySelector('[data-scan-board-id="board-a"]');
    expect(opener).toBeTruthy();
    opener.focus();
    act(() => opener.click());
    await flushTimer();

    const dialog = host.querySelector('[role="dialog"][aria-labelledby="ss-scan-title"]');
    expect(dialog).toBeTruthy();
    expect(document.activeElement).toBe(dialog);
    expect(dialog.getAttribute('aria-describedby')).toBe('ss-scan-help');

    const axeResults = await axe.run(dialog, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    } });
    const serious = axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(serious).toEqual([]);

    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true })));
    const firstControl = dialog.querySelector('button');
    expect(document.activeElement).toBe(firstControl);

    const controls = Array.from(dialog.querySelectorAll('button:not([disabled]), select:not([disabled])'));
    const lastControl = controls[controls.length - 1];
    lastControl.focus();
    act(() => lastControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(firstControl);

    act(() => firstControl.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })));
    expect(onCallTTS).not.toHaveBeenCalled();
    dialog.focus();
    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true })));
    expect(onCallTTS).toHaveBeenCalledWith('One', 'Kore');

    act(() => firstControl.click());
    await act(async () => { await Promise.resolve(); });
    dialog.focus();
    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', code: 'ArrowRight', bubbles: true })));
    expect(dialog.querySelector('[role="status"]').textContent).toContain('Two (2 of 2)');

    act(() => firstControl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })));
    await flushTimer();
    expect(host.querySelector('[role="dialog"][aria-labelledby="ss-scan-title"]')).toBeNull();
    const restored = host.querySelector('[data-scan-board-id="board-a"]');
    expect(document.activeElement).toBe(restored);
  });
});
