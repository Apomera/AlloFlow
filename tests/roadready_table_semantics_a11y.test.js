import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_roadready.js';
const DEPLOY = 'prismflow-deploy/public/stem_lab/stem_tool_roadready.js';

const TABLE_VIEWS = [
  {
    view: 'cheatSheet',
    data: {},
    expectedColumnHeaders: 4,
    minimumRowHeaders: 4,
    label: 'Typical stopping distance by road condition',
  },
  {
    view: 'vehicleCompare',
    data: {},
    expectedColumnHeaders: 9,
    minimumRowHeaders: 1,
    label: 'Vehicle science comparison',
  },
  {
    view: 'brakingHunt',
    data: {
      brakingHunt: {
        mass: 1500,
        speed: 50,
        decel: 7,
        grade: 0,
        hypothesis: '',
        stuckRevealed: false,
        understood: false,
        explanation: '',
        log: [{ m: 1500, s: 50, d: 7, g: 0, sd: '14.1', st: 'controlled' }],
      },
    },
    expectedColumnHeaders: 6,
    minimumRowHeaders: 0,
    label: 'Braking experiment log',
  },
  {
    view: 'fuelCalc',
    data: {},
    expectedColumnHeaders: 7,
    minimumRowHeaders: 1,
    label: 'Fuel cost comparison by vehicle',
  },
  {
    view: 'weatherCompare',
    data: {},
    expectedColumnHeaders: 6,
    minimumRowHeaders: 1,
    label: 'Weather impact comparison',
  },
];

function onlyTable(html, view) {
  const tables = html.match(/<table\b[\s\S]*?<\/table>/g) || [];
  expect(tables, `${view} should render exactly one data table`).toHaveLength(1);
  return tables[0];
}

function headerTags(table) {
  return table.match(/<th\b[^>]*>/g) || [];
}

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE, 'roadReady');
});

describe('RoadReady data-table semantics', () => {
  for (const spec of TABLE_VIEWS) {
    it(`${spec.view} exposes a named table with explicit header associations`, () => {
      const html = renderTool('roadReady', {
        roadReady: { view: spec.view, ...spec.data },
      });
      const table = onlyTable(html, spec.view);
      const openingTag = table.match(/^<table\b[^>]*>/)?.[0] || '';
      const headers = headerTags(table);
      const columnHeaders = headers.filter((tag) => /\bscope="col"/.test(tag));
      const rowHeaders = headers.filter((tag) => /\bscope="row"/.test(tag));

      expect(openingTag).toContain(`aria-label="${spec.label}"`);
      expect(columnHeaders).toHaveLength(spec.expectedColumnHeaders);
      expect(rowHeaders.length).toBeGreaterThanOrEqual(spec.minimumRowHeaders);
      expect(
        headers.every((tag) => /\bscope="(?:col|row)"/.test(tag)),
        `${spec.view} contains a table header without scope`
      ).toBe(true);
    });
  }

  it('keeps every table declaration named and every header declaration scoped', () => {
    const source = readFileSync(SOURCE, 'utf8');
    const tableDeclarations = source.match(/h\('table'/g) || [];
    const namedTableDeclarations =
      source.match(/h\('table', \{ 'aria-label':/g) || [];
    const headerDeclarations = source.match(/h\('th'/g) || [];
    const scopedHeaderDeclarations =
      source.match(/h\('th', \{ (?:key: [^,]+, )?scope: '(?:col|row)'/g) || [];

    expect(tableDeclarations).toHaveLength(5);
    expect(namedTableDeclarations).toHaveLength(5);
    expect(scopedHeaderDeclarations).toHaveLength(headerDeclarations.length);
  });

  it('keeps the deploy copy byte-for-byte aligned with the source copy', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
