import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_chembalance.js';
const DEPLOY =
  'desktop/web-app/public/stem_lab/stem_tool_chembalance.js';

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'chemBalance');
});

describe('ChemBalance table semantics', () => {
  it('labels the pH log and exposes column and row relationships', () => {
    const container = document.createElement('div');
    container.innerHTML = renderTool('chemBalance', {
      chemBalance: {
        subtool: 'pHHunt',
        _everPicked: true,
        pHHunt: {
          hExpo: -7,
          buffer: 0,
          tempC: 25,
          hypothesis: '',
          stuckRevealed: false,
          understood: false,
          explanation: '',
          log: [
            { h: -7, b: 0, t: 25, p: 7, bd: 'neutral' },
          ],
        },
      },
    });
    const table = container.querySelector('table');

    expect(table.querySelector('caption').textContent).toBe(
      'pH inquiry observations'
    );
    for (const header of table.querySelectorAll('thead th')) {
      expect(header.getAttribute('scope')).toBe('col');
    }
    expect(table.querySelector('tbody th[scope="row"]').textContent).toBe(
      '-7'
    );
  });

  it('keeps the only table captioned and scoped in source', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source.match(/h\('table'/g)).toHaveLength(1);
    expect(source.match(/h\('caption'/g)).toHaveLength(1);
    expect(source).toContain("scope: 'col'");
    expect(source).toContain("scope: 'row'");
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
