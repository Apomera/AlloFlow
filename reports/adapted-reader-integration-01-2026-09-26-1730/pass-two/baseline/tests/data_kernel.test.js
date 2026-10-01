import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const loaderSource = fs.readFileSync(path.resolve(process.cwd(), 'data_kernel_loader.js'), 'utf8');

function loadKernel() {
  const dom = new JSDOM('<!doctype html><script></script>', { url: 'http://localhost/', runScripts: 'outside-only' });
  vm.runInContext(loaderSource, dom.getInternalVMContext(), { filename: 'data_kernel_loader.js' });
  return { dom, kernel: dom.window.AlloDataKernel };
}

describe('AlloDataKernel contract', () => {
  it('normalizes rows, avoids duplicate column names, and summarizes numeric fields', () => {
    const { dom, kernel } = loadKernel();
    const normalized = kernel.normalizeRows([
      { 'Student Name': 'A', value: 10, score: 2 },
      { 'Student Name': 'B', value: 20, score: 4 },
      { 'Student Name': 'C', value: null, score: 6 }
    ]);
    expect(normalized.table).toBe('data');
    expect(normalized.columns).toEqual(['Student_Name', 'value', 'score']);
    expect(normalized.rowCount).toBe(3);
    expect(kernel.summarize(normalized.rows).numeric.value.mean).toBe(15);
    expect(kernel.summarize(normalized.rows).numeric.value.missing).toBe(1);
    dom.window.close();
  });

  it('quotes CSV cells without turning formula-like values into executable formulas', () => {
    const { dom, kernel } = loadKernel();
    const csv = kernel.rowsToCSV([{ label: '=SUM(A1:A2)', value: 3, note: 'a,b' }]);
    expect(csv).toContain('=SUM(A1:A2)');
    expect(csv).toContain('"a,b"');
    expect(csv.split('\r\n')[0]).toBe('label,value,note');
    dom.window.close();
  });

  it('suggests safe read-only recipes from the dataset shape', () => {
    const { dom, kernel } = loadKernel();
    const recipes = kernel.suggestRecipes([
      { 'Group Name': 'A', Score: 10, Other: 1 },
      { 'Group Name': 'B', Score: 20, Other: 2 }
    ]);
    expect(recipes.map((recipe) => recipe.id)).toEqual(expect.arrayContaining([
      'row-count', 'profile-Score', 'correlation-Score-Other', 'group-summary-Group_Name-Score', 'top-values-Score'
    ]));
    expect(recipes.every((recipe) => /^(select|with)\b/i.test(recipe.sql))).toBe(true);
    expect(recipes.find((recipe) => recipe.id === 'group-summary-Group_Name-Score').sql).toContain('"Group_Name"');
    dom.window.close();
  });
  it('records privacy-safe query notebook entries without result values', () => {
    const { dom, kernel } = loadKernel();
    kernel.queryHistory.clear();
    const history = kernel.queryHistory.record({
      tool: 'dataStudio', recipe: 'row-count', sql: 'SELECT COUNT(*) AS row_count FROM data',
      backend: 'duckdb-wasm', rowCount: 1, sourceRowCount: 3, columns: ['label', 'value']
    });
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ tool: 'dataStudio', recipe: 'row-count', rowCount: 1, sourceRowCount: 3 });
    expect(history[0]).not.toHaveProperty('rows');
    expect(kernel.queryHistory.list()).toEqual(history);
    expect(kernel.queryHistory.clear()).toEqual([]);
    dom.window.close();
  });
  it('does not initialize the heavy runtime until a query is requested', () => {
    const { dom, kernel } = loadKernel();
    expect(kernel.diagnostics().state).toBe('idle');
    expect(kernel.diagnostics().backend).toBe('pending');
    dom.window.close();
  });
});

describe('AlloDataKernel deployable WASM package', () => {
  it('reconstructs the pinned binary from mirrored sub-limit chunks', () => {
    const rootDir = path.resolve(process.cwd(), 'duckdb-assets');
    const publicDir = path.resolve(process.cwd(), 'desktop/web-app/public/duckdb-assets');
    const manifestName = 'duckdb-mvp.wasm.manifest.json';
    const rootManifest = JSON.parse(fs.readFileSync(path.join(rootDir, manifestName), 'utf8'));
    const publicManifest = JSON.parse(fs.readFileSync(path.join(publicDir, manifestName), 'utf8'));
    expect(rootManifest).toEqual(publicManifest);
    expect(rootManifest.format).toBe('alloflow-chunked-wasm-v1');
    expect(rootManifest.parts.length).toBeGreaterThan(1);

    const rebuild = (directory) => Buffer.concat(rootManifest.parts.map((part) => {
      const bytes = fs.readFileSync(path.join(directory, part.file));
      expect(bytes.length).toBe(part.bytes);
      expect(bytes.length).toBeLessThan(25 * 1024 * 1024);
      expect(crypto.createHash('sha256').update(bytes).digest('hex')).toBe(part.sha256);
      return bytes;
    }));
    const rootBytes = rebuild(rootDir);
    const publicBytes = rebuild(publicDir);
    expect(rootBytes.equals(publicBytes)).toBe(true);
    expect(rootBytes.length).toBe(rootManifest.bytes);
    expect(crypto.createHash('sha256').update(rootBytes).digest('hex')).toBe(rootManifest.sha256);
  });
});