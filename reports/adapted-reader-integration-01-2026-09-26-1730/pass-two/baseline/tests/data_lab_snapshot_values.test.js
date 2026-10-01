// The Data Lab tutor used to receive a SCHEMA-ONLY snapshot — column names and
// counts, never cell values — so it could not ask about what the data actually
// showed. On 2026-08-03 the snapshot gained two more layers: per-column summary
// statistics and a bounded window of real rows.
//
// Two things must not silently regress:
//   1. The value layers stay BOUNDED. They are capped for prompt size, and an
//      unbounded snapshot would blow the token budget on a real class dataset.
//   2. The user-facing copy stays TRUE. The UI used to promise "never the
//      values in your table"; shipping values while still displaying that
//      promise would be a lie to teachers and students, which is worse than
//      either behavior on its own.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const plugin = read('data_lab/tutor_plugin.html');
const companion = read('data_lab/data_lab.html');
const launcher = read('stem_lab/stem_tool_datalab.js');
const catalog = read('stem_lab/stem_lab_module.js');

const inlineScript = (html) =>
  [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).pop();

let summarizeAttribute;
let cellText;
beforeAll(() => {
  const code = inlineScript(plugin);
  const helpers = code.slice(code.indexOf('var MAX_SAMPLE_ROWS'), code.indexOf('async function buildSnapshot'));
  expect(helpers.length).toBeGreaterThan(200);
  const ctx = { console };
  vm.createContext(ctx);
  vm.runInContext(helpers + '\nthis.summarizeAttribute = summarizeAttribute; this.cellText = cellText;', ctx);
  ({ summarizeAttribute, cellText } = ctx);
});

describe('Data Lab snapshot value layers', () => {
  it('bounds rows, scanned cases and cell length', () => {
    expect(plugin).toMatch(/var MAX_SAMPLE_ROWS = \d+;/);
    expect(plugin).toMatch(/var MAX_SCAN_CASES = \d+;/);
    expect(plugin).toMatch(/var MAX_CELL_CHARS = \d+;/);
    // The sample must be filled under a length guard, never by copying every case.
    expect(plugin).toContain('sample.length < MAX_SAMPLE_ROWS');
    expect(plugin).toContain('cases.slice(0, MAX_SCAN_CASES)');
  });

  it('truncates individual cells', () => {
    expect(cellText('x'.repeat(500))).toHaveLength(40);
    expect(cellText(null)).toBe('');
    expect(cellText(undefined)).toBe('');
  });

  it('reports numeric range, mean and blank count', () => {
    const s = summarizeAttribute('Age', ['11', '12', '', '14', '13', null, '12']);
    expect(s.type).toBe('numeric');
    expect(s.min).toBe(11);
    expect(s.max).toBe(14);
    expect(s.mean).toBe(12.4);
    expect(s.missing).toBe(2);
  });

  it('does not mislabel a mostly-text column as numeric', () => {
    const s = summarizeAttribute('Pet', ['cat', 'dog', 'cat', '42', 'dog']);
    expect(s.type).toBe('categorical');
    expect(s.distinct).toBe(3);
    expect(s.top[0]).toEqual({ value: 'cat', count: 2 });
  });

  it('does not average booleans, and survives an all-blank column', () => {
    expect(summarizeAttribute('Flag', [true, false, true]).type).toBe('categorical');
    const blank = summarizeAttribute('Empty', ['', null, undefined]);
    expect(blank.missing).toBe(3);
    expect(blank.top).toEqual([]);
  });

  it('keeps the snapshot ceiling above the old schema-only cap', () => {
    const m = launcher.match(/var MAX_SNAPSHOT_CHARS = (\d+);/);
    expect(m).toBeTruthy();
    // 2500 was the schema-only cap; summaries + sample need materially more or
    // the JSON is handed to the model sliced mid-object.
    expect(Number(m[1])).toBeGreaterThan(2500);
  });

  it('no longer promises that values never leave the table', () => {
    const claims = [/never the values/i, /never your (data )?values/i, /names and counts only/i];
    for (const surface of [companion, plugin, launcher]) {
      for (const claim of claims) expect(surface).not.toMatch(claim);
    }
    expect(catalog).not.toMatch(/names and counts, never values/i);
  });

  it('tells the reader what the tutor can now see', () => {
    expect(companion).toMatch(/summary statistics/i);
    expect(companion).toMatch(/sample of rows/i);
  });
});
