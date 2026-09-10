'use strict';
const fs = require('node:fs'), path = require('node:path');
process.chdir(path.resolve(__dirname, '../../..'));
const source = fs.readFileSync('tests/remediation_residual_live.test.js', 'utf8');
const body = source.slice(source.indexOf('const image = '), source.indexOf("describe('residual source meaning"))
  + source.slice(source.indexOf('const controls = '), source.indexOf("describe('valid repairs"));
const fixtures = new Function(body + '\nreturn {failures,controls};')();
const output = path.join(__dirname, 'native-name-calibration-final.json');
if (fs.existsSync(output)) throw Error('Preserve prior evidence; choose a new output file.');
(async () => {
  const browser = await require('playwright').chromium.launch({ headless: true });
  const context = await browser.newContext({ javaScriptEnabled: false, serviceWorkers: 'block' });
  await context.route('**/*', route => route.abort());
  const page = await context.newPage(), results = [];
  try {
    for (const [label, html, change] of [...fixtures.failures, ...fixtures.controls].filter(fixture => /label|name|alternative|description/.test(fixture[0]))) {
      const sides = {};
      for (const [side, value] of Object.entries({ source: html, candidate: change(html) })) {
        await page.setContent(value);
        sides[side] = await page.locator('input,button').first().ariaSnapshot();
      }
      results.push({ label, ...sides, nativeNameChanged: sides.source !== sides.candidate });
    }
    fs.writeFileSync(output, JSON.stringify({ measuredAt: new Date().toISOString(), scope: 'Static local Chromium ARIA snapshots; naming behavior only, not human screen-reader calibration.', results }, null, 2) + '\n');
    console.log(JSON.stringify({ output, count: results.length }));
  } finally { await context.close(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
