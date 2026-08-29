import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// First machine verification for Charts & Graphs (Data Studio): the CSV
// parser/serializer pair (including the formula-injection round trip), the
// render-scope statistics block, and the Chart Coach recommendation logic.

const src = fs.readFileSync('stem_lab/stem_tool_datastudio.js', 'utf8');
const publicSrc = () => fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_datastudio.js', 'utf8');

const CSV = (() => {
  const start = src.indexOf('function parseDataStudioCSV(');
  const end = src.indexOf('// WCAG 4.1.3', start);
  expect(start).toBeGreaterThan(-1);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn { parse: parseDataStudioCSV, serialize: serializeDataStudioCSV, cell: dataStudioCSVCell };')();
})();

function stats(displayRows, opts) {
  opts = opts || {};
  const start = src.indexOf('var values = displayRows.map');
  const end = src.indexOf('var PALETTES = {', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('displayRows', 'dataRows', 'stdDevMode', 'chartType', 'hasExplicitX',
    src.slice(start, end) +
    '\nreturn { mean: mean, median: median, q1: q1, q3: q3, iqr: iqr, stdDev: stdDev, modeVal: modeVal, outliers: outliers, pearsonR: pearsonR, recommendedChart: recommendedChart, trend: trend, whiskerMin: whiskerMin, whiskerMax: whiskerMax };'
  )(displayRows, opts.dataRows || displayRows, opts.stdDevMode || 'population', opts.chartType || 'bar', !!opts.hasExplicitX);
}

const rows = (vals) => vals.map((v, i) => ({ label: 'R' + i, value: v }));

describe('CSV parser', () => {
  it('parses Label,Value with a header, currency symbols, and a BOM', () => {
    const result = CSV.parse('﻿Label,Value\r\nApples,"1,250"\r\nBananas,$30\r\nPct,45%');
    expect(result.rows).toEqual([
      { label: 'Apples', value: 1250 },
      { label: 'Bananas', value: 30 },
      { label: 'Pct', value: 45 }
    ]);
    expect(result.skipped).toBe(0);
  });

  it('parses label,x,y headers into scatter rows', () => {
    const result = CSV.parse('label,x,y\nA,1,5\nB,2,8');
    expect(result.hasXY).toBe(true);
    expect(result.rows[0]).toEqual({ label: 'A', value: 5, x: 1 });
  });

  it('detects semicolon and tab delimiters', () => {
    expect(CSV.parse('label;value\nA;5\nB;7').rows.length).toBe(2);
    expect(CSV.parse('label\tvalue\nA\t5\nB\t7').rows.length).toBe(2);
  });

  it('handles quoted fields with embedded delimiters and escaped quotes', () => {
    const result = CSV.parse('Label,Value\n"Smith, Jane",10\n"He said ""hi""",20');
    expect(result.rows[0].label).toBe('Smith, Jane');
    expect(result.rows[1].label).toBe('He said "hi"');
  });

  it('reports an unclosed quote instead of mis-parsing', () => {
    const result = CSV.parse('Label,Value\n"broken,10');
    expect(result.error).toContain('not closed');
    expect(result.rows).toEqual([]);
  });

  it('skips invalid rows, counts them, and caps at 500', () => {
    const big = 'Label,Value\n' + Array.from({ length: 520 }, (_, i) => 'r' + i + ',' + i).join('\n') + '\nbad,notanumber';
    const result = CSV.parse(big);
    expect(result.rows.length).toBe(500);
    expect(result.skipped).toBe(21);
  });

  it('round-trips formula-injection labels losslessly', () => {
    // Export prefixes dangerous labels with a quote; import strips it back.
    const original = [{ label: '=SUM(A1:A9)', value: 3 }, { label: '+plus', value: 4 }, { label: 'safe', value: 5 }];
    const csv = CSV.serialize(original);
    expect(csv).toContain("'=SUM(A1:A9)");
    const back = CSV.parse(csv);
    expect(back.rows.map((r) => r.label)).toEqual(['=SUM(A1:A9)', '+plus', 'safe']);
    expect(back.rows.map((r) => r.value)).toEqual([3, 4, 5]);
  });

  it('serializes X/Y datasets with an X column and quotes risky cells', () => {
    const csv = CSV.serialize([{ label: 'a,b', value: 2, x: 1 }]);
    expect(csv.startsWith('Label,X,Y')).toBe(true);
    expect(csv).toContain('"a,b"');
  });
});

describe('statistics block', () => {
  it('pins median, quartiles, and IQR on a known 9-value set', () => {
    const s = stats(rows([3, 7, 8, 5, 12, 14, 21, 13, 18]));
    expect(s.median).toBe(12);
    expect(s.q1).toBe(6);
    expect(s.q3).toBe(16);
    expect(s.iqr).toBe(10);
  });

  it('population vs sample standard deviation differ correctly', () => {
    const data = rows([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(stats(data, { stdDevMode: 'population' }).stdDev).toBeCloseTo(2, 9);
    expect(stats(data, { stdDevMode: 'sample' }).stdDev).toBeCloseTo(Math.sqrt(32 / 7), 9);
  });

  it('reports every tied mode and IQR outliers with whiskers excluding them', () => {
    const s = stats(rows([1, 1, 2, 2, 3, 3, 3, 1, 2, 50]));
    expect(s.modeVal.split(', ').map(Number).sort()).toEqual([1, 2, 3]);
    expect(s.outliers.length).toBe(1);
    expect(s.outliers[0].value).toBe(50);
    expect(s.whiskerMax).toBe(3);
  });

  it('Pearson r is exactly ±1 for perfectly linear numeric-label data', () => {
    const inc = [1, 2, 3, 4, 5].map((v) => ({ label: String(v), value: 2 * v + 1 }));
    const dec = [1, 2, 3, 4, 5].map((v) => ({ label: String(v), value: 20 - 3 * v }));
    expect(stats(inc, { chartType: 'scatter' }).pearsonR).toBeCloseTo(1, 9);
    expect(stats(dec, { chartType: 'scatter' }).pearsonR).toBeCloseTo(-1, 9);
    expect(stats(inc, { chartType: 'scatter' }).trend.slope).toBeCloseTo(2, 9);
  });
});

describe('Chart Coach', () => {
  it('recommends by dataset shape: scatter, line, box, histogram, pie, bar', () => {
    expect(stats(rows([1, 2, 3]), { hasExplicitX: true }).recommendedChart).toBe('scatter');
    const months = ['Jan', 'Feb', 'Mar', 'Apr'].map((m, i) => ({ label: m, value: i + 1 }));
    expect(stats(months, { dataRows: months }).recommendedChart).toBe('line');
    const outlierData = rows([10, 11, 12, 11, 10, 12, 11, 90]);
    expect(stats(outlierData, { dataRows: outlierData }).recommendedChart).toBe('box');
    const many = rows(Array.from({ length: 12 }, (_, i) => 10 + (i % 5)));
    expect(stats(many, { dataRows: many }).recommendedChart).toBe('histogram');
    const parts = rows([30, 45, 25]);
    expect(stats(parts, { dataRows: parts }).recommendedChart).toBe('pie');
    const eight = rows([3, -1, 4, 1, 5, 9, 2, 6]);
    expect(stats(eight, { dataRows: eight }).recommendedChart).toBe('bar');
  });
});

describe('source pins', () => {
  it('the scatter trendline label renders R² (mojibake regression pin)', () => {
    expect(src).toContain("'R²='");
    expect(src).not.toContain("'R?='");
  });

  it('the loader log names this file, not the old creative bundle', () => {
    expect(src).toContain('stem_tool_datastudio.js loaded');
    expect(src).not.toContain('stem_tool_creative.js loaded');
  });

  it('gives both inquiry textareas programmatic names', () => {
    expect(src).toContain("'aria-label': t('stem.datastudio.hypothesis_when_is_a_chart_most_legibl'");
    expect(src).toContain("'aria-label': t('stem.datastudio.explain_chart_visualization_principles'");
  });
});

describe('deployment copies', () => {
  it('public mirror is byte-identical to the root copy', () => {
    expect(publicSrc()).toBe(src);
  });
});
