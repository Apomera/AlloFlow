import { describe, expect, it } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

describe('Aquarium population history alternative', () => {
  it('provides all visible years and populations as a captioned table with column and row headers', () => {
    resetStemLab();
    const history = Array.from({ length: 24 }, (_, i) => ({ year: i + 1, sardines: 820 - i * 9, tuna: 240 - i * 2, sharks: 50 + i, revenue: 12 + i }));
    const store = newStore({ _aquarium: { mode: 'ocean', soundEnabled: false, simRunning: false, tutorialDismissed: true, oceanYear: 24, oceanHistory: history } });
    const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
    function Host() { return tool.render(makeCtx({}, store)); }
    const host = document.createElement('div');
    host.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(Host));
    const detail = host.querySelector('[data-aquarium-ocean-history-data]');
    expect(detail.tagName).toBe('DETAILS');
    expect(detail.querySelector('summary').textContent).toBe('View population data');
    const table = detail.querySelector('table');
    expect(table.querySelector('caption').textContent).toContain('Population History');
    const headers = [...table.querySelectorAll('thead th')];
    expect(headers.map(n => n.textContent)).toEqual(['Year', 'Sardines', 'Tuna', 'Sharks']);
    expect(headers.every(n => n.scope === 'col')).toBe(true);
    const rows = [...table.querySelectorAll('tbody tr')];
    expect(rows).toHaveLength(20);
    rows.forEach((row, index) => {
      const record = history[index + 4];
      expect(row.querySelector('th').scope).toBe('row');
      expect([...row.children].map(n => Number(n.textContent))).toEqual([record.year, record.sardines, record.tuna, record.sharks]);
    });
    expect(host.querySelector('[title="Yr 24 — Sardines: 613"]')).toBeTruthy();
    expect(host.querySelector('[title^="Yr 1 —"]')).toBeNull();
    expect(store.toolData._aquarium.oceanHistory).toEqual(history);
    expect(store.toolData._aquarium.oceanYear).toBe(24);
  });
});
