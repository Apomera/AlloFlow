import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'prismflow-deploy/node_modules');
const source = readFileSync('view_visual_supports_modal_source.jsx', 'utf8');

let React;
let ReactDOMClient;
let act;
let axe;
let VisualSupportsModal;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_visual_supports_modal_module.js');
  VisualSupportsModal = window.AlloModules.VisualSupportsModal.VisualSupportsModal;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  localStorage.clear();
});

describe('Visual Supports motion and interaction accessibility', () => {
  it('uses explicit controls, keyboard-scrollable panels, and structured saved content', () => {
    expect(source.match(/<button\b(?![^>]*\btype=)[^>]*>/gs) || []).toEqual([]);
    expect(source).toContain('hiddenWhilePaused = paused && !frozenFrame');
    expect(source).toContain('visibility: hiddenWhilePaused');
    expect(source).toContain('disabled={!!globalPaused}');
    expect(source).toContain('role="list"');
    expect(source).toContain('role="listitem"');
    expect(source).toContain('role="tabpanel" aria-labelledby={`visual-supports-tab-${vsTab}`} tabIndex={0}');
    expect(source).toContain("horizontally scrollable items'}");
    expect(source).toContain('motion-reduce:transition-none');
  });

  it('hides an unfreezable GIF while paused and exposes no serious axe violations', async () => {
    localStorage.setItem('alloVsPauseAnim', '1');
    localStorage.setItem('alloSymbolBoards__default', JSON.stringify([{
      id: 'animated-board',
      title: 'Animated Board',
      cols: 1,
      words: [{
        label: 'Wave',
        category: 'noun',
        image: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      }],
    }]));

    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(VisualSupportsModal, {
        setShowVisualSupports: () => {},
        setVsTab: () => {},
        showVisualSupports: true,
        vsTab: 'boards',
      }));
      await Promise.resolve();
    });

    const dialog = host.querySelector('[role="dialog"]');
    const image = dialog.querySelector('img');
    const imageControl = Array.from(dialog.querySelectorAll('button')).find((button) =>
      button.getAttribute('aria-label')?.includes('global setting'),
    );
    expect(image.style.visibility).toBe('hidden');
    expect(dialog.querySelector('[role="img"][aria-label="Paused animation: Wave"]')).toBeTruthy();
    expect(imageControl.disabled).toBe(true);
    expect(imageControl.getAttribute('aria-pressed')).toBe('true');
    expect(dialog.querySelector('[role="list"] [role="listitem"]')).toBeTruthy();
    expect(dialog.querySelector('[role="tabpanel"]').tabIndex).toBe(0);

    const axeResults = await axe.run(host, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
      'scrollable-region-focusable': { enabled: false },
    } });
    const serious = axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(serious).toEqual([]);

    const globalControl = Array.from(dialog.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Resume animations'),
    );
    act(() => globalControl.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(image.style.visibility).toBe('visible');
    expect(imageControl.disabled).toBe(false);

    act(() => imageControl.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(image.style.visibility).toBe('hidden');
    expect(imageControl.getAttribute('aria-pressed')).toBe('true');
  });
});
