#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8'
};

function serveFile(req, res) {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  if (pathname === '/data-kernel-smoke.html') {
    res.writeHead(200, { 'content-type': MIME['.html'] });
    res.end('<!doctype html><meta charset="utf-8"><script src="/data_kernel_loader.js"></script>');
    return;
  }
  const candidate = path.resolve(ROOT, '.' + pathname);
  const relative = path.relative(ROOT, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  fs.readFile(candidate, (error, bytes) => {
    if (error) { res.writeHead(error.code === 'ENOENT' ? 404 : 500); res.end(error.message); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(candidate)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(bytes);
  });
}

async function launchBrowser() {
  try { return await chromium.launch({ headless: true }); } catch (bundledError) {
    for (const executablePath of [
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
    ]) {
      if (!fs.existsSync(executablePath)) continue;
      try { return await chromium.launch({ headless: true, executablePath }); } catch (_) {}
    }
    throw bundledError;
  }
}

async function main() {
  const server = http.createServer(serveFile);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto('http://127.0.0.1:' + port + '/data-kernel-smoke.html');
    await page.waitForFunction(() => window.AlloDataKernel && window.AlloDataKernel.queryRows);
    const result = await page.evaluate(async () => {
      const rows = [
        { label: 'A', value: 10, group: 'x' },
        { label: 'B', value: 20, group: 'x' },
        { label: 'C', value: 30, group: 'y' }
      ];
      const summary = window.AlloDataKernel.summarize(rows);
      const aggregate = await window.AlloDataKernel.queryRows(rows, 'SELECT COUNT(*) AS rows, AVG(value) AS mean_value FROM data');
      const filtered = await window.AlloDataKernel.queryRows(rows, 'SELECT label, value FROM data WHERE value > 10 ORDER BY value DESC');
      const grouped = await window.AlloDataKernel.queryRows([
        { group_name: 'A', measure_value: 2, row_index: 1 },
        { group_name: 'A', measure_value: 4, row_index: 2 },
        { group_name: 'B', measure_value: 8, row_index: 1 }
      ], 'SELECT group_name, COUNT(*) AS rows, AVG(measure_value) AS mean_value FROM data GROUP BY group_name ORDER BY group_name');
      const recipeRows = rows.map(({ group, value }) => ({ group, value }));
      const recipes = window.AlloDataKernel.suggestRecipes(recipeRows);
      const groupRecipe = recipes.find((recipe) => recipe.id === 'group-summary-group-value');
      const recipeGrouped = groupRecipe ? await window.AlloDataKernel.queryRows(recipeRows, groupRecipe.sql) : null;
      let blocked = false;
      try { await window.AlloDataKernel.queryRows(rows, 'DROP TABLE data'); } catch (_) { blocked = true; }
      return { summary, aggregate, filtered, grouped, recipes, recipeGrouped, blocked, diagnostics: window.AlloDataKernel.diagnostics() };
    });
    assert.equal(result.aggregate.backend, 'duckdb-wasm');
    assert.equal(Number(result.aggregate.rows[0].rows), 3);
    assert.equal(Number(result.aggregate.rows[0].mean_value), 20);
    assert.deepEqual(result.filtered.rows.map((row) => [row.label, Number(row.value)]), [['C', 30], ['B', 20]]);
    assert.deepEqual(result.grouped.rows.map((row) => [row.group_name, Number(row.rows), Number(row.mean_value)]), [['A', 2, 3], ['B', 1, 8]]);
    assert.ok(result.recipes.some((recipe) => recipe.id === 'group-summary-group-value'));
    assert.deepEqual(result.recipeGrouped.rows.map((row) => [row.group_name, Number(row.rows), Number(row.mean_value)]), [['x', 2, 15], ['y', 1, 30]]);
    assert.equal(result.blocked, true);
    assert.equal(result.summary.rowCount, 3);
    assert.ok(result.diagnostics.state === 'ready' || result.diagnostics.state === 'fallback');
    assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
    console.log('[data-kernel smoke] PASS');
    console.log('  Backend:', result.diagnostics.backend);
    console.log('  Aggregate:', JSON.stringify(result.aggregate.rows[0], (_, value) => typeof value === 'bigint' ? Number(value) : value));
    console.log('  Filtered rows:', result.filtered.rows.length);
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error('[data-kernel smoke] FAIL:', error.stack || error.message); process.exitCode = 1; });
