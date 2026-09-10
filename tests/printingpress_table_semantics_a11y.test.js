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
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_printingpress.js';

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

  it('keeps both Printing Press tables fully scoped in source', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source.match(/h\('table'/g)).toHaveLength(2);
    expect(source.match(/h\('caption'/g)).toHaveLength(2);
    expect(source.match(/scope: 'col'/g)).toHaveLength(7);
    expect(source.match(/scope: 'row'/g)).toHaveLength(2);
  });

  it('renders the screw comparison with scoped measurements and setup headers', async () => {
    const Component = () => config.render(makeCtx({ toolData: { printingPress: { view: 'pressMechanism' } } }));
    await act(async () => { root.render(React.createElement(Component)); });
    const keep = Array.from(host.querySelectorAll('button')).find(button => button.textContent === 'Keep these settings as A');
    expect(keep).toBeTruthy();
    await act(async () => { keep.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    const table = host.querySelector('#pp-screw-comparison table');
    expect(table.querySelector('caption').textContent).toBe('Settings and travel during one full turn');
    expect(Array.from(table.querySelectorAll('thead th[scope="col"]'), el => el.textContent)).toEqual(['Measurement','Setup A','Setup B']);
    expect(Array.from(table.querySelectorAll('tbody th[scope="row"]'), el => el.textContent)).toEqual(['Bar length','Thread pitch','Hand travel','Platen travel']);
    expect(table.querySelectorAll('th:not([scope])')).toHaveLength(0);
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
