import { describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_climateExplorer.js', 'desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const sectors = [
  ['energyGrid', 'Energy Grid'], ['transportation', 'Transportation'], ['buildings', 'Buildings'],
  ['workingLands', 'Working Lands'], ['adaptation', 'Adaptation + Resilience'], ['climateJustice', 'Climate Justice']
];

function renderDebrief(path, yearLog, options = {}) {
  resetStemLab(); loadTool(path, 'climateExplorer');
  const pathway = {
    phase: 'debrief', year: 3, maxYears: 3, difficulty: 'realist', seed: 'chart-contract',
    sectors: sectors.map(([id]) => ({ id, decarb: 45, resilience: 55, support: 65 })),
    yearActions: [], yearLog, activeMods: [], avgDecarb: 45,
    finalOutcome: { icon: '', color: '#16a34a', label: 'Campaign completed', desc: 'Review this illustrative campaign.' }
  };
  const host = document.createElement('div');
  host.innerHTML = renderTool('climateExplorer', { climateExplorer: { tab: 'pathways', heroMotionPaused: true, pathway } }, options);
  return host;
}
function sample(year, values) {
  return { year, post: Object.entries(values).map(([id, decarb]) => ({ id, decarb })) };
}

describe.each(paths)('Climate pathway chart accessibility: %s', path => {
  it('names the chart, explains its teaching scale, and identifies every series without relying only on color', () => {
    const host = renderDebrief(path, [sample(1, { energyGrid: 15 }), sample(2, { energyGrid: 45 })], { isContrast: true });
    const chart = host.querySelector('#ce-pathway-trend-graphic');
    expect(chart?.getAttribute('role')).toBe('img');
    const title = host.querySelector('#' + chart.getAttribute('aria-labelledby'));
    const description = host.querySelector('#' + chart.getAttribute('aria-describedby'));
    expect(title?.textContent).toMatch(/Sector decarbonization/);
    expect(description?.textContent).toMatch(/teaching index from 0 to 100/);
    expect(description?.textContent).toMatch(/values by period/i);
    const legend = host.querySelector('#ce-pathway-trend-legend');
    expect([...legend.querySelectorAll('li span')].map(el => el.textContent)).toEqual(sectors.map(([, name]) => name));
    const patterns = sectors.map(([id]) => {
      const line = chart.querySelector('[data-ce-chart-line="' + id + '"]');
      const key = legend.querySelector('[data-ce-chart-line="' + id + '"]');
      expect(line).toBeTruthy(); expect(key).toBeTruthy();
      expect(key.getAttribute('stroke-dasharray')).toBe(line.getAttribute('stroke-dasharray'));
      return line.getAttribute('stroke-dasharray');
    });
    expect(new Set(patterns).size).toBe(sectors.length);
    const disclosure = host.querySelector('#ce-pathway-trend-data');
    expect(disclosure?.tagName).toBe('DETAILS');
    expect(disclosure.querySelector('summary')?.textContent).toBe('Read values by period');
  });

  it('provides each saved period in text, preserving zero and reporting absent or invalid values as not recorded', () => {
    const host = renderDebrief(path, [
      sample(1, { energyGrid: 0, transportation: 33.25, climateJustice: 72.234 }),
      sample(2, { energyGrid: 68, transportation: NaN, buildings: Infinity, adaptation: '42' })
    ]);
    const periods = [...host.querySelectorAll('#ce-pathway-trend-data [data-ce-period]')];
    expect(periods).toHaveLength(2);
    expect(periods[0].querySelector('h5')?.textContent).toContain('2025');
    expect(periods[1].querySelector('h5')?.textContent).toContain('2030');
    expect(periods.every(period => period.querySelectorAll('li').length === sectors.length)).toBe(true);
    const value = (period, id) => periods[period].querySelector('[data-ce-sector="' + id + '"]').textContent;
    expect(value(0, 'energyGrid')).toBe('Energy Grid: 0 / 100');
    expect(value(0, 'transportation')).toBe('Transportation: 33.3 / 100');
    expect(value(0, 'climateJustice')).toBe('Climate Justice: 72.2 / 100');
    expect(value(1, 'energyGrid')).toBe('Energy Grid: 68 / 100');
    for (const id of ['transportation', 'buildings', 'workingLands', 'adaptation', 'climateJustice']) {
      expect(value(1, id)).toContain('Not recorded');
      expect(value(1, id)).not.toContain('0 / 100');
    }
  });

  it('leaves a gap where a period has no recorded value instead of drawing a false zero or connecting across missing data', () => {
    const host = renderDebrief(path, [sample(1, { energyGrid: 0 }), sample(2, {}), sample(3, { energyGrid: 60 })]);
    const points = host.querySelector('#ce-pathway-trend-graphic [data-ce-chart-line="energyGrid"]').getAttribute('d');
    expect((points.match(/M/g) || []).length).toBe(2);
    expect(points).not.toContain('L');
    expect(host.querySelectorAll('#ce-pathway-trend-graphic [data-ce-chart-point="energyGrid"]')).toHaveLength(2);
    expect(host.querySelector('[data-ce-period="2"] [data-ce-sector="energyGrid"]').textContent).toBe('Energy Grid: Not recorded');
  });
});
