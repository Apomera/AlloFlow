import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const source = readFileSync('anchor_charts_source.jsx', 'utf8');

let React;
let ReactDOMClient;
let act;
let axe;
let AnchorChartView;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('anchor_charts_module.js');
  AnchorChartView = window.AlloModules.AnchorChartView;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
});

const chart = {
  type: 'anchor-chart',
  id: 'dialog-chart',
  data: {
    title: 'Water Cycle',
    chartType: 'process',
    sections: [{
      id: 'evaporation',
      label: 'Evaporation',
      bullets: ['Sun heats water'],
      iconPrompt: '',
      iconUrl: 'data:image/png;base64,iVBORw0KGgo=',
    }],
    interactive: { armed: false, rubric: '' },
  },
};

describe('Anchor Charts dialog and target accessibility', () => {
  it('names disclosure relationships, live results, and 24px editor actions', () => {
    expect(source).toContain('aria-controls={`ac-icon-editor-${section.id || sectionIndex}`}');
    expect(source).toContain('id={`ac-icon-editor-${section.id || sectionIndex}`}');
    expect(source.match(/aria-haspopup="dialog"/g)).toHaveLength(2);
    expect(source).toContain('inline-flex min-h-6 min-w-6 items-center justify-center');
    expect(source).toContain('className="mt-2 min-h-6');
    expect(source.match(/className="min-h-6 text-\[11px\]/g)).toHaveLength(2);
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('role="alert">Couldn\'t reach the AI grader');
    expect(source).toContain("label + ' section icon'");
  });

  it('moves focus into the rubric dialog, wraps it, closes with Escape, and restores the opener', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    await act(async () => {
      root.render(React.createElement(AnchorChartView, {
        generatedContent: chart,
        handleNoteUpdate: () => {},
        isTeacherMode: true,
        callImagen: null,
        callGemini: null,
        addToast: () => {},
        addXp: () => {},
        t: (key, fallback) => fallback || key,
      }));
      await Promise.resolve();
    });

    const opener = host.querySelector('button[aria-label="Arm interactive mode"]');
    opener.focus();
    act(() => opener.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await act(async () => { await new Promise((resolveTimer) => setTimeout(resolveTimer, 0)); });

    const dialog = host.querySelector('[role="dialog"]');
    const textarea = dialog.querySelector('textarea');
    expect(document.activeElement).toBe(textarea);

    const axeResults = await axe.run(dialog, { rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    } });
    const serious = axeResults.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help}`);
    expect(serious).toEqual([]);

    const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])'));
    const last = focusable[focusable.length - 1];
    act(() => textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(last);
    act(() => last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(textarea);

    act(() => textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await act(async () => { await Promise.resolve(); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);

    const image = host.querySelector('img');
    expect(image.getAttribute('alt')).toBe('Evaporation section icon');
  });
});
