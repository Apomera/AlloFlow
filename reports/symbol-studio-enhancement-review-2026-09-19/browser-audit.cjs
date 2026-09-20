const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
// Reuse fictional fixtures and local provider stubs from the existing review.
const prior = fs.readFileSync(path.join(root, 'reports/symbol-studio-review-2026-09-12/browser-review.cjs'), 'utf8');
const setup = prior.slice(0, prior.indexOf(' (async()=>{'));
const context = { require, __dirname: path.join(root, 'reports/symbol-studio-review-2026-09-12'), process, Buffer, console };
vm.createContext(context);
vm.runInContext(setup + '\nthis.fixtureHTML=html; this.measure=summarize;', context);
const output = path.join(__dirname, process.argv[2] || 'browser');
fs.mkdirSync(output, { recursive: true });
const routes = {'/react.js':'desktop/web-app/node_modules/react/umd/react.development.js','/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','/audio.js':'karaoke_audio_store_module.js','/studio.js':'symbol_studio_module.js'};
const server = require('http').createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (routes[url.pathname]) { res.setHeader('content-type', 'text/javascript'); res.end(fs.readFileSync(path.join(root, routes[url.pathname]))); }
  else { res.setHeader('content-type', 'text/html'); res.end(context.fixtureHTML(url.searchParams.get('tab') || 'symbols')); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({headless:true});
  const results = [];
  try {
    for (const width of [1440, 390, 320]) {
      for (const tab of ['symbols','board','schedule','stories','quickboards','books','quest','search','garden']) {
        const page = await browser.newPage({viewport:{width,height:900}});
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/*', route => route.request().url().startsWith(origin) || route.request().url().startsWith('data:') ? route.continue() : route.abort());
        await page.goto(origin+'/?tab='+tab);
        await page.locator('.ss-main-modal').waitFor();
        await page.waitForTimeout(400);
        const metrics = await page.evaluate('(' + context.measure.toString() + ')()');
        results.push({tab,width,...metrics,errors,text:await page.locator('.ss-workspace').innerText()});
        await page.screenshot({path:path.join(output,`${width}-${tab}.png`)});
        await page.close();
      }
    }
  } finally { await browser.close(); server.close(); }
  fs.writeFileSync(path.join(output,'measurements.json'),JSON.stringify(results,null,2));
  const summary = results.map(r=>({tab:r.tab,width:r.width,errors:r.errors,overflow:r.workspaceOverflow.length,smallTargets:r.smallTargets.length,unlabeled:r.unlabeled.length}));
  fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

