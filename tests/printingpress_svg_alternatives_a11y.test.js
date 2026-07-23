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
const DEPLOY = 'prismflow-deploy/public/stem_lab/stem_tool_printingpress.js';

describe('Printing Press SVG alternatives', () => {
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

  async function mountView(view) {
    const Component = () => config.render(makeCtx({
      toolData: { printingPress: { view } },
    }));
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });
  }

  async function openSection(label) {
    const button = Array.from(host.querySelectorAll('button')).find(
      (candidate) => candidate.textContent.includes(label)
    );
    expect(button).toBeTruthy();
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
  }

  it('describes the state-dependent fold diagram', async () => {
    await mountView('bookbinding');
    await openSection('Folding');
    const diagram = host.querySelector(
      'svg[aria-label^="Fold-to-size diagram for"]'
    );
    expect(diagram).toBeTruthy();
    expect(diagram.getAttribute('role')).toBe('img');
    expect(diagram.getAttribute('aria-label')).toContain(
      '2 folds turn one printed sheet into 8 pages'
    );
  });

  it('describes both informative Type Foundry diagrams', async () => {
    await mountView('typeFoundry');
    await openSection('Letter anatomy');
    const anatomy = host.querySelector(
      'svg[aria-label^="Annotated word type"]'
    );
    expect(anatomy).toBeTruthy();
    expect(anatomy.getAttribute('role')).toBe('img');
    expect(anatomy.getAttribute('aria-label')).toContain(
      'ascender on t, descenders on y and p'
    );

    await openSection('Type designer');
    const preview = host.querySelector(
      'svg[aria-label^="Custom letter M preview"]'
    );
    expect(preview).toBeTruthy();
    expect(preview.getAttribute('role')).toBe('img');
    expect(preview.getAttribute('aria-label')).toContain(
      'x-height 50 out of 100'
    );
    expect(preview.getAttribute('aria-label')).toContain(
      'bracketed serifs'
    );
  });

  it('keeps resource-type icons out of the accessibility tree', async () => {
    await mountView('resources');
    const icons = host.querySelectorAll('svg[width="16"][height="16"]');
    expect(icons.length).toBeGreaterThan(4);
    for (const icon of icons) {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.getAttribute('focusable')).toBe('false');
    }
  });

  it('classifies every SVG declaration as informative or decorative', () => {
    const lines = readFileSync(SOURCE, 'utf8').split(/\r?\n/);
    const declarations = [];
    lines.forEach((line, index) => {
      if (/h\(\s*['"]svg['"]/.test(line)) {
        declarations.push({
          line: index + 1,
          context: lines.slice(Math.max(0, index - 1), index + 4).join(' '),
        });
      }
    });

    expect(declarations).toHaveLength(51);
    for (const declaration of declarations) {
      expect(
        /aria-label|role\s*:\s*['"]img['"]|aria-hidden/.test(
          declaration.context
        ),
        `unclassified SVG declaration at source line ${declaration.line}`
      ).toBe(true);
    }
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
