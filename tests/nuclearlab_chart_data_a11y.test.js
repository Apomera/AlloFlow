// Nuclear Lab - semantic alternatives for quantitative canvas charts.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let host;

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  if (host) host.remove();
  host = null;
});

function show(state = {}) {
  host.innerHTML = renderTool('nuclearLab', { _nuclearLab: state });
}

function chartToggle() {
  return [...host.querySelectorAll('button')].find((node) =>
    (node.getAttribute('aria-label') || '').startsWith('Chart data.'));
}

describe('chart-data reading adaptation', () => {
  it('is compact by default and exposes an explicit toggle', () => {
    show();
    const lab = host.querySelector('[data-nuclear-lab]');
    const toggle = chartToggle();
    expect(lab.getAttribute('data-nk-chart-data')).toBe('false');
    expect(toggle.textContent.trim()).toBe('Chart data');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelectorAll('[data-nk-chart-table]')).toHaveLength(0);
  });

  it('renders six named tables with real column and row headers', () => {
    show({
      nkShowChartData: true,
      isoId: 'cs137',
      halves: 3,
      bioId: 'cs137',
      cdSrc: 'cs137',
      cdDist: 12.5,
      cdTime: 600,
      cdRuns: [{ g: 4200, b: 250, t: 600, d: 5, s: 'cs137' }],
      ptSrc: 'cs137',
      ptDist: 2.5,
      ptShield: 'lead',
      ptThick: 1,
      shRate: 2,
      shPlume: 8,
      shEvac: 4,
      shPlace: 'masonry',
    });

    expect(host.querySelector('[data-nuclear-lab]').getAttribute('data-nk-chart-data')).toBe('true');
    expect(chartToggle().getAttribute('aria-pressed')).toBe('true');

    const tables = [...host.querySelectorAll('[data-nk-chart-table]')];
    expect(tables.map((node) => node.getAttribute('data-nk-chart-table'))).toEqual([
      'decay',
      'binding',
      'biohalf',
      'counter',
      'protect',
      'shelter',
    ]);

    for (const region of tables) {
      const table = region.querySelector('table');
      expect(table, region.getAttribute('data-nk-chart-table') + ' has no table').toBeTruthy();
      expect(table.querySelector('caption').textContent.trim().length).toBeGreaterThan(20);
      const columnHeaders = [...table.querySelectorAll('thead th')];
      expect(columnHeaders.length).toBeGreaterThanOrEqual(3);
      expect(columnHeaders.every((cell) => cell.getAttribute('scope') === 'col')).toBe(true);
      const rows = [...table.querySelectorAll('tbody tr')];
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.firstElementChild
        && row.firstElementChild.tagName === 'TH'
        && row.firstElementChild.getAttribute('scope') === 'row')).toBe(true);
    }

    expect(host.querySelector('[data-nk-chart-table=decay]').textContent).toContain('12.5%');
    expect(host.querySelector('[data-nk-chart-table=binding]').textContent).toContain('Ni-62');
    expect(host.querySelector('[data-nk-chart-table=binding]').textContent).toContain('8.795 MeV');
    expect(host.querySelector('[data-nk-chart-table=biohalf]').textContent).toContain('1 effective half-life');
    expect(host.querySelector('[data-nk-chart-table=counter]').textContent).toContain('Run 1:');
    expect(host.querySelector('[data-nk-chart-table=protect]').textContent).toContain('2.5 m (selected)');
    expect(host.querySelector('[data-nk-chart-table=shelter]').textContent).toContain('4 h (selected)');
  });
});
