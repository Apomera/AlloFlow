import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const DEPLOY =
  'desktop/web-app/public/stem_lab/stem_tool_cephalopodlab.js';

function renderSection(activeSection, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('cephalopodLab', {
    cephalopodLab: { activeSection, ...data },
  });
  return container;
}

function expectCompleteTableSemantics(container) {
  const tables = Array.from(container.querySelectorAll('table'));
  expect(tables.length).toBeGreaterThan(0);

  for (const table of tables) {
    expect(table.querySelector('caption')?.textContent.trim()).not.toBe('');
    for (const header of table.querySelectorAll('thead th')) {
      expect(header.getAttribute('scope')).toBe('col');
    }
    for (const row of table.querySelectorAll('tbody tr')) {
      const rowHeader = Array.from(row.children).find(
        (cell) =>
          cell.tagName === 'TH' && cell.getAttribute('scope') === 'row'
      );
      expect(rowHeader).toBeTruthy();
    }
  }
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'cephalopodLab');
});

// Rendering the whole 22k-line tool in jsdom is slow and highly variable:
// measured 929ms..8.54s for a single test across six runs on an unmodified
// checkout, so vitest's 5s default sits inside the noise band and this suite
// failed at random. Each `it` carries an explicit budget instead.
// NOTE: describe.configure does not exist in this vitest version.
const RENDER_TIMEOUT_MS = 20000;

describe('Cephalopod Lab table semantics', () => {
  it('marks matrix and observation-table relationships', () => {
    expectCompleteTableSemantics(renderSection('compcog'));
    expectCompleteTableSemantics(
      renderSection('camoHunt', {
        camoHunt: {
          substrate: 'sand',
          brightness: 50,
          hue: 50,
          coarseness: 50,
          hypothesis: '',
          stuckRevealed: false,
          understood: false,
          explanation: '',
          log: [
            { substrate: 'sand', b: 50, h: 50, c: 50, det: 25 },
          ],
        },
      })
    );
  }, RENDER_TIMEOUT_MS);

  it('marks comparison, sample-data, and taxonomy table relationships', () => {
    expectCompleteTableSemantics(renderSection('compare'));
    expectCompleteTableSemantics(renderSection('sampleData'));
    expectCompleteTableSemantics(renderSection('taxonomy'));
  }, RENDER_TIMEOUT_MS);

  it('keeps all eight table declarations captioned in source', () => {
    const source = readFileSync(SOURCE, 'utf8');

    expect(source.match(/h\('table'/g)).toHaveLength(8);
    expect(source.match(/h\('caption'/g)).toHaveLength(8);
    expect(source).toContain("scope: 'col'");
    expect(source).toContain("scope: 'row'");
  }, RENDER_TIMEOUT_MS);

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  }, RENDER_TIMEOUT_MS);
});
