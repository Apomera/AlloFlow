import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('view_spotlight_tour_source.jsx', 'utf8');
const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
let React;
let ReactDOMClient;
let act;
let axe;
let SpotlightTourView;
let root;
let host;
let opener;
let outside;
let originalInnerWidth;
let originalInnerHeight;
let originalCallTTS;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_spotlight_tour_module.js');
  SpotlightTourView = window.AlloModules.SpotlightTourView;
  originalInnerWidth = window.innerWidth;
  originalInnerHeight = window.innerHeight;
  originalCallTTS = window.callTTS;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  for (const node of [host, opener, outside]) node?.remove();
  host = opener = outside = null;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalInnerHeight });
  if (originalCallTTS === undefined) delete window.callTTS;
  else window.callTTS = originalCallTTS;
  vi.restoreAllMocks();
});

describe('Spotlight Help accessibility contract', () => {
  it('keeps non-modal host behavior while providing visible semantics and reduced motion', () => {
    expect(source).toContain('role="dialog" aria-modal="false" aria-labelledby="spotlight-message-title" aria-describedby="spotlight-message-body"');
    expect(source).toContain('ref={closeButtonRef}');
    expect(source.match(/min-w-11 min-h-11/g)).toHaveLength(2);
    expect(source).toContain('motion-reduce:!animate-none');
    expect(source.match(/motion-reduce:animate-none/g).length).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain('__alloFocusTrapStack');
    expect(hostSource).toContain("if (e.key === 'Escape' && isHelpMode)");
    expect(hostSource).toContain('if (isSpotlightMode) { setIsSpotlightMode(false); }');
    expect(readFileSync('desktop/web-app/public/view_spotlight_tour_module.js', 'utf8'))
      .toBe(readFileSync('view_spotlight_tour_module.js', 'utf8'));
  });

  it('focuses Close, fits a 320px viewport, leaves outside controls reachable, restores focus, and passes axe', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 });
    window.callTTS = vi.fn(() => Promise.resolve(null));

    opener = document.createElement('button');
    opener.type = 'button';
    opener.textContent = 'Open help';
    document.body.appendChild(opener);
    opener.focus();
    outside = document.createElement('button');
    outside.type = 'button';
    outside.textContent = 'Highlighted control';
    document.body.appendChild(outside);
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);

    function t(key, options) {
      if (key === 'common.close') return 'Close help';
      return options?.defaultValue || key;
    }
    function Harness() {
      const [open, setOpen] = React.useState(true);
      return open ? React.createElement(SpotlightTourView, {
        t,
        debugLog: vi.fn(),
        tourRect: { top: 100, left: 260, right: 300, width: 40, height: 40 },
        spotlightMessage: { title: 'Keyboard help', text: 'Use the highlighted control.\n### Tip\n- Press Enter.' },
        spotlightOpenTimeRef: { current: 0 },
        setIsSpotlightMode: setOpen,
      }) : null;
    }
    await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });

    const dialog = host.querySelector('[role="dialog"]');
    const close = dialog.querySelector('button[aria-label="Close help"]');
    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(dialog.getAttribute('aria-modal')).toBe('false');
    expect(dialog.getAttribute('aria-labelledby')).toBe('spotlight-message-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('spotlight-message-body');
    expect(document.activeElement).toBe(close);
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.type).toBe('button');
      expect(button.className).toContain('min-w-11 min-h-11');
      expect(button.className).toContain('focus-visible:ring-2');
    }
    const shell = dialog.parentElement;
    expect(shell.style.width).toBe('288px');
    expect(shell.style.left).toBe('16px');
    expect(shell.style.top).toBe('16px');
    const backdrop = host.querySelector('[role="presentation"]');
    expect(backdrop.getAttribute('aria-hidden')).toBe('true');

    const results = await axe.run(dialog, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } });
    expect(results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')).toEqual([]);

    outside.focus();
    expect(document.activeElement).toBe(outside);
    close.click();
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
