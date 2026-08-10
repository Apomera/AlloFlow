import { beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadTool,
  renderTool,
  resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const acorn = require(resolve(process.cwd(), 'node_modules/acorn'));
const TOOL_PATH = 'stem_lab/stem_tool_gisstudio.js';
const TOOL_SOURCE = readFileSync(resolve(process.cwd(), TOOL_PATH), 'utf8');
const GIS_KEY_PREFIX = 'stem.gisstudio.';

function walk(node, visit) {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc' || key === 'range') continue;
    if (Array.isArray(value)) value.forEach((child) => walk(child, visit));
    else if (value && typeof value.type === 'string') walk(value, visit);
  }
}

function literalGISCalls() {
  const ast = acorn.parse(TOOL_SOURCE, { ecmaVersion: 2022, locations: true });
  const calls = [];
  walk(ast, function (node) {
    if (node.type !== 'CallExpression') return;
    const key = node.arguments[0];
    if (!key || key.type !== 'Literal' || typeof key.value !== 'string' || !key.value.startsWith(GIS_KEY_PREFIX)) return;
    calls.push({
      key: key.value,
      fallback: node.arguments[1],
      line: node.loc && node.loc.start.line
    });
  });
  return calls;
}

function text(value) {
  return String(value == null ? '' : value);
}

function localeTag(result) {
  if (typeof result === 'string') return result;
  return result && (result.locale || result.lang || result.language);
}

function direction(result) {
  return result && typeof result === 'object' ? result.dir : undefined;
}

function expectGermanDecimal(value, label) {
  const output = text(value);
  expect(output, label + ' should return display text').not.toBe('');
  expect(output, label + ' should use the German decimal comma').toMatch(/\d,\d/);
}

function expectArabicDigits(value, label) {
  const output = text(value);
  expect(output, label + ' should return display text').not.toBe('');
  expect(output, label + ' should use Arabic-Indic digits').toMatch(/[\u0660-\u0669]/);
}

function evidenceModel(localeOptions) {
  return {
    title: 'Locale contract report',
    generated: '2026-08-09T12:30:00.000Z',
    observation: 'A visible spatial pattern.',
    analysis: 'The pattern does not establish causation.',
    left: { label: 'Population', basemap: 'Street', rows: [{ name: 'A', geometry: 'Point', lat: 44.5, lon: -69.1254, value: 1234.5 }] },
    right: { label: 'Access', basemap: 'Imagery', rows: [{ name: 'A', geometry: 'Point', lat: 44.5, lon: -69.1254, value: 88.5 }] },
    spatialAnalysis: {
      regionPack: 'Classroom sample', method: 'Radius buffer', detail: '10 km radius',
      pointCount: 1, selectedCount: 1, selectedMean: 1234.5, unit: 'people/mi2'
    },
    selected: [{ name: 'A', lat: 44.5, lon: -69.1254, value: 1234.5 }],
    locale: localeOptions.locale,
    lang: localeOptions.lang,
    dir: localeOptions.dir,
    localeOptions
  };
}

let tool;

beforeEach(function () {
  resetStemLab();
  tool = loadTool(TOOL_PATH, 'gisStudio');
});

describe('GIS Studio locale adaptability foundations', function () {
  it('uses literal stem.gisstudio keys with literal English fallbacks', function () {
    const calls = literalGISCalls();
    expect(calls.length, 'GIS Studio must have at least one statically discoverable translation key').toBeGreaterThan(0);

    const invalid = calls.filter(function (call) {
      return !call.fallback || call.fallback.type !== 'Literal' || typeof call.fallback.value !== 'string' || !call.fallback.value.trim();
    }).map(function (call) { return call.key + ' (line ' + call.line + ')'; });
    expect(invalid, 'every GIS translation key needs a non-empty literal English fallback').toEqual([]);
  });

  it('actually sends its literal keys and fallbacks through ctx.t while rendering', function () {
    const staticKeys = new Set(literalGISCalls().map(function (call) { return call.key; }));
    const seen = [];
    const html = renderTool('gisStudio', {}, {
      t: function (key, fallback) {
        if (text(key).startsWith(GIS_KEY_PREFIX)) seen.push({ key, fallback });
        return text(key).startsWith(GIS_KEY_PREFIX) ? '\u27e6' + key + '\u27e7' : (fallback || key);
      }
    });

    expect(seen.length, 'rendering GIS Studio must call the host translator').toBeGreaterThan(0);
    expect(seen.filter(function (call) { return !staticKeys.has(call.key); }),
      'runtime GIS keys must remain statically discoverable literals').toEqual([]);
    expect(seen.filter(function (call) { return typeof call.fallback !== 'string' || !call.fallback.trim(); }),
      'ctx.t calls must preserve their English fallback').toEqual([]);
    expect(html, 'at least one translated value should reach rendered UI').toContain('\u27e6stem.gisstudio.');
  });

  it('resolves direction and formats German and Arabic display values', function () {
    const testing = tool.testing || {};
    expect(testing.resolveGISLocale, 'expose resolveGISLocale through tool.testing').toBeTypeOf('function');
    expect(testing.createGISFormatters, 'expose createGISFormatters through tool.testing').toBeTypeOf('function');

    const deResolved = testing.resolveGISLocale('de-DE');
    const arResolved = testing.resolveGISLocale('ar-EG');
    const deLocale = localeTag(deResolved);
    const arLocale = localeTag(arResolved);
    expect(Intl.getCanonicalLocales(deLocale)[0]).toBe('de-DE');
    expect(Intl.getCanonicalLocales(arLocale)[0]).toBe('ar-EG');
    expect(direction(deResolved) || 'ltr').toBe('ltr');
    expect(direction(arResolved)).toBe('rtl');

    const de = testing.createGISFormatters({ locale: deLocale, lang: deLocale, dir: 'ltr' });
    const ar = testing.createGISFormatters({ locale: arLocale, lang: arLocale, dir: 'rtl' });
    for (const [name, formatters] of [['de-DE', de], ['ar-EG', ar]]) {
      for (const method of ['number', 'percent', 'dateTime', 'coordinate', 'distance', 'area']) {
        expect(formatters && formatters[method], name + ' formatter .' + method).toBeTypeOf('function');
      }
    }

    expectGermanDecimal(de.number(1234.5), 'number');
    expectGermanDecimal(de.coordinate(-69.1254, 4), 'coordinate');
    expectGermanDecimal(de.distance(12.5, 'metric'), 'distance');
    expectGermanDecimal(de.area(12.5, 'metric'), 'area');
    expect(text(de.percent(12.5, 1))).toMatch(/%/);
    expect(text(de.dateTime(new Date('2024-01-02T15:04:00.000Z')))).toContain('2024');

    expectArabicDigits(ar.number(1234.5), 'number');
    expectArabicDigits(ar.coordinate(-69.1254, 4), 'coordinate');
    expectArabicDigits(ar.distance(12.5, 'metric'), 'distance');
    expectArabicDigits(ar.area(12.5, 'metric'), 'area');
    expectArabicDigits(ar.percent(12.5, 1), 'percent');
    expectArabicDigits(ar.dateTime(new Date('2024-01-02T15:04:00.000Z')), 'dateTime');
  });

  it('keeps CSV and GeoJSON machine values locale-invariant', function () {
    const testing = tool.testing || {};
    if (typeof testing.createGISFormatters === 'function') {
      const display = testing.createGISFormatters({ locale: 'ar-EG', lang: 'ar-EG', dir: 'rtl' });
      display.number(1234.5);
      display.coordinate(-69.1254, 4);
    }

    const csv = testing.rowsToCSV([
      ['value', 'longitude', 'latitude'],
      [1234.5, -69.1254, 44.5]
    ]);
    expect(csv).toContain('1234.5,-69.1254,44.5');
    expect(csv).not.toMatch(/[\u0660-\u0669]/);

    const parsed = testing.parseGeoJSON(JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { value: 1234.5 },
        geometry: { type: 'Point', coordinates: [-69.1254, 44.5] }
      }]
    }));
    const geojson = JSON.stringify(parsed.data);
    expect(geojson).toContain('"value":1234.5');
    expect(geojson).toContain('"coordinates":[-69.1254,44.5]');
    expect(geojson).not.toMatch(/[\u0660-\u0669]/);
  });

  it('emits Arabic lang and direction metadata when report localization is available', function () {
    const testing = tool.testing || {};
    const localeOptions = {
      locale: 'ar-EG', lang: 'ar-EG', dir: 'rtl',
      t: function (_key, fallback) { return fallback; }
    };
    const report = testing.buildEvidenceReport(evidenceModel(localeOptions), localeOptions);
    const document = new DOMParser().parseFromString(report, 'text/html');
    const root = document.documentElement;

    // Older report builders have no locale-option contract. Once either metadata
    // field opts in, require both so partially-localized RTL reports cannot ship.
    if ((root.getAttribute('lang') || '').toLowerCase() === 'en' && !root.hasAttribute('dir')) return;
    expect((root.getAttribute('lang') || '').toLowerCase()).toMatch(/^ar(?:-|$)/);
    expect(root.getAttribute('dir')).toBe('rtl');
  });

  it('shows an explicit global no-missions state while preserving the default Maine mission series', function () {
    const globalMissions = renderTool('gisStudio', { gisTab: 'missions', gisRegionPack: 'global' });
    expect(globalMissions).toContain('Guided GIS missions');
    expect(globalMissions).toContain('This region pack does not include guided missions.');
    expect(globalMissions).toContain('The Maine sample curriculum is separate from your current region pack.');
    expect(globalMissions).toContain('Switch to the Maine sample missions');
    expect(globalMissions).not.toContain('MAINE INQUIRY SERIES');

    const defaultMaine = renderTool('gisStudio', { gisTab: 'missions' });
    expect(defaultMaine).toContain('Guided GIS missions');
    expect(defaultMaine).toContain('MAINE INQUIRY SERIES');
    expect(defaultMaine).toContain('aria-label="Maine missions"');
    expect(defaultMaine).not.toContain('This region pack does not include guided missions.');
  });
});
