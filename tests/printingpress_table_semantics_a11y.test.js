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

describe('Printing Press table semantics', () => {
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

  it('renders the cost comparison with a caption and scoped row and column headers', async () => {
    const Component = () => config.render(makeCtx({
      toolData: { printingPress: { view: 'paperMaking' } },
    }));
    await act(async () => {
      root.render(React.createElement(Component));
      await Promise.resolve();
    });

    const economics = Array.from(host.querySelectorAll('button')).find(
      (button) => button.textContent.includes('Economics')
    );
    expect(economics).toBeTruthy();
    await act(async () => {
      economics.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });

    const table = host.querySelector('table');
    expect(table).toBeTruthy();
    expect(table.querySelector('caption').textContent).toBe(
      'Historical paper and parchment prices, 1300-1500'
    );

    const columnHeaders = table.querySelectorAll('thead th[scope="col"]');
    expect(columnHeaders).toHaveLength(4);
    expect(Array.from(columnHeaders, (header) => header.textContent)).toEqual([
      'Year',
      'Paper sheet cost (1 chancery)',
      'Comparable parchment cost',
      'Paper as % of parchment',
    ]);

    const rowHeaders = table.querySelectorAll('tbody th[scope="row"]');
    expect(rowHeaders).toHaveLength(5);
    expect(Array.from(rowHeaders, (header) => header.textContent)).toEqual([
      '1300',
      '1350',
      '1400',
      '1450',
      '1500',
    ]);
    expect(table.querySelectorAll('th:not([scope])')).toHaveLength(0);
  });

  it('keeps the sole Printing Press table fully scoped in source', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source.match(/h\('table'/g)).toHaveLength(1);
    expect(source.match(/h\('caption'/g)).toHaveLength(1);
    expect(source.match(/scope: 'col'/g)).toHaveLength(4);
    expect(source.match(/scope: 'row'/g)).toHaveLength(1);
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
