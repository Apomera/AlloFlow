import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_assessmentliteracy.js';
const DEPLOY =
  'prismflow-deploy/public/stem_lab/stem_tool_assessmentliteracy.js';

function renderView(view, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('assessmentLiteracy', {
    assessmentLiteracy: { view, ...data },
  });
  return container;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'assessmentLiteracy');
});

describe('Assessment Literacy table semantics', () => {
  it('renders effect-size benchmarks with a caption and scoped headers', () => {
    const container = renderView('personality', { sub: 'effectsize' });
    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    expect(table.querySelector('caption').textContent).toBe(
      'Cohen effect size reference benchmarks'
    );

    const columnHeaders = table.querySelectorAll('thead th[scope="col"]');
    expect(columnHeaders).toHaveLength(4);
    expect(Array.from(columnHeaders, (header) => header.textContent)).toEqual([
      'Measure',
      'Small',
      'Medium',
      'Large',
    ]);

    const rowHeaders = table.querySelectorAll('tbody th[scope="row"]');
    expect(rowHeaders).toHaveLength(5);
    expect(rowHeaders[0].textContent).toContain("Cohen's d");
    expect(table.querySelectorAll('th:not([scope])')).toHaveLength(0);
  });

  it('names the dynamic career comparison and retains all existing scopes', () => {
    const container = renderView('career', {
      sub: 'compare',
      compareIds: ['rn', 'lpn'],
    });
    const table = container.querySelector('table');
    expect(table).toBeTruthy();
    expect(table.querySelector('caption').textContent).toBe(
      'Career comparison: Registered Nurse, Licensed Practical Nurse'
    );
    expect(table.querySelectorAll('thead th[scope="col"]')).toHaveLength(3);
    expect(table.querySelectorAll('tbody th[scope="row"]').length)
      .toBeGreaterThan(6);
    expect(table.querySelectorAll('th:not([scope])')).toHaveLength(0);
  });

  it('keeps every table named and every header declaration scoped in source', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source.match(/h\('table'/g)).toHaveLength(2);
    expect(source.match(/h\('caption'/g)).toHaveLength(2);

    const headerDeclarations = source
      .split(/\r?\n/)
      .filter((line) => /h\('th'/.test(line));
    expect(headerDeclarations.length).toBeGreaterThan(8);
    for (const declaration of headerDeclarations) {
      expect(declaration).toContain('scope:');
    }
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
