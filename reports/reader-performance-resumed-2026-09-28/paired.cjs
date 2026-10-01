'use strict';
const fs = require('node:fs'), path = require('node:path'), cp = require('node:child_process'), assert = require('node:assert/strict');
const main = path.resolve(__dirname, '../..');
const work = 'C:/Users/cabba/.codex/worktrees/reader-performance/UDL-Tool-Updated';
const fixture = path.join(work, 'dev-tools/reader-performance-resumed/run.cjs');
const report = path.join(work, 'reports/reader-performance-resumed-2026-09-28');
const { chromium } = require(path.join(main, 'node_modules/playwright'));
const children = [], results = [];
function serve(variant) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, [fixture, '--deps', main, '--source-dir', path.join(report, variant), '--instrument', '--serve-only', '--baseline-ready', 'fd4044c862ed9b345b340d69cb1411a19c09dafb'], { cwd: work, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    children.push(child); let output = '';
    child.stdout.on('data', chunk => { output += chunk; const match = output.match(/SERVER_URL=(http[^\s]+)/); if (match) resolve(match[1]); });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('error', reject); child.once('exit', code => { if (!output.includes('SERVER_URL=')) reject(new Error(output + '\nExit ' + code)); });
  });
}
const median = values => [...values].sort((a,b) => a-b)[Math.floor(values.length / 2)];
const p95 = values => [...values].sort((a,b) => a-b)[Math.floor(values.length * .95)];
(async () => {
  let browser;
  try {
    const urls = [await serve('basis'), await serve('candidate')];
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    for (const name of ['comparison-supports-200', 'bilingual-panes', 'original-supports-200']) {
      const contexts = [], pages = [], errors = [], samples = [[], []];
      try {
        for (let v = 0; v < 2; v++) {
          const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); contexts.push(context);
          const page = await context.newPage(); pages.push(page);
          page.on('pageerror', error => errors.push(error.message));
          await page.route('**/*', route => route.request().url().startsWith(urls[v] + '/') || /^(blob:|data:)/.test(route.request().url()) ? route.continue() : route.abort());
          await page.goto(urls[v] + '/?case=' + name + '&instrument=1');
          await page.waitForFunction(() => window.readerFixture?.ready);
        }
        const text = await Promise.all(pages.map(page => page.locator('[data-compare-version]').allTextContents()));
        assert.deepEqual(text[0], text[1], 'Both variants display identical comparison text');
        let update = 0;
        for (let round = -3; round < 12; round++) {
          for (const v of (round % 2 ? [1, 0, 0, 1] : [0, 1, 1, 0])) {
            await pages[v].bringToFront();
            const sample = await pages[v].evaluate(async i => {
              window.readerMetrics.reset(); const start = performance.now();
              window.readerFixture.patch({ sweep: i % 101, sentence: 0 });
              await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
              return { wallMs: performance.now() - start, metrics: window.readerMetrics.snapshot() };
            }, ++update);
            if (round >= 0) samples[v].push(sample);
          }
        }
        const summaries = samples.map(list => ({ samples: list.length, medianPaintMs: median(list.map(s => s.wallMs)), p95PaintMs: p95(list.map(s => s.wallMs)), medianRenderMs: median(list.map(s => s.metrics.commitMs)), domParses: list.reduce((sum,s) => sum + (s.metrics.counts.domParses || 0), 0), totalRenderMs: list.reduce((sum,s) => sum + s.metrics.commitMs, 0) }));
        const cleanup = [];
        for (const page of pages) {
          const state = await page.evaluate(() => { window.readerFixture.unmount(); return { ...window.readerMetrics.snapshot(), ranges: [...(CSS.highlights?.values() || [])].reduce((sum,mark) => sum + mark.size, 0) }; });
          assert.equal(state.outstandingTimers, 0); assert.equal(state.outstandingFrames, 0); assert.equal(state.ranges, 0); cleanup.push(state);
        }
        assert.deepEqual(errors, []);
        results.push({ name, baseline: summaries[0], candidate: summaries[1], samples, cleanup });
        fs.writeFileSync(path.join(__dirname, 'paired-results.json'), JSON.stringify({ browser: browser.version(), measuredAt: new Date().toISOString(), order: 'Alternating ABBA/BAAB; three warmup rounds, twelve measured rounds', results }, null, 2));
        console.log(JSON.stringify({ name, baseline: summaries[0], candidate: summaries[1] }));
      } finally { for (const context of contexts) await context.close(); }
    }
  } finally { if (browser) await browser.close(); for (const child of children) child.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
