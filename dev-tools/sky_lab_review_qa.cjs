// Local, isolated browser review of the real Sky Lab component.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, process.env.SKY_QA_OUT || 'reports/sky-lab-review-2026-09-27');
const harness = fs.readFileSync(path.join(root, 'tests/e2e/astronomy-observatory-3d.spec.ts'), 'utf8').split('const HARNESS = `')[1].split('`;')[0];
const mime = { '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  if (req.url === '/__sky') { res.setHeader('Content-Type', 'text/html'); res.end(harness); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  try { res.setHeader('Content-Type', mime[path.extname(file)] || 'text/plain'); res.end(await fs.promises.readFile(file)); }
  catch { res.writeHead(404); res.end(); }
});
(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [name, width, height, tab] of [['desktop', 1440, 1000, 'observatory'], ['phone', 390, 844, 'observatory'], ['tonight', 1180, 1000, 'tonight'], ['small-phone', 320, 740, 'tonight']]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/__sky`);
      await page.evaluate(tab => window.__mount({ tab, obsLive: false, obsDate: '2026-07-04', obsTime: '23:30' }), tab);
      if (tab === 'observatory') await page.waitForFunction(() => document.querySelector('#astronomy-observatory-3d')?.__observatoryDebug?.().ready, null, { timeout: 60000 });
      await page.screenshot({ path: path.join(out, `${process.env.SKY_QA_LABEL || 'current'}-${name}.png`), fullPage: true });
      const metrics = await page.evaluate(() => {
        const sky = document.querySelector('#astronomy-observatory-3d');
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, sceneTop: sky?.getBoundingClientRect().top, debug: sky?.__observatoryDebug?.() };
      });
      results.push({ name, errors, metrics });
      assert.equal(errors.length, 0, name + ': browser errors');
      assert.ok(metrics.scrollWidth <= width + 1, name + ': horizontal overflow');
      await page.evaluate(() => window.__destroy());
      await page.close();
    }
    if (process.env.SKY_QA_JOURNEY === '1') {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/__sky`);
      await page.evaluate(() => {
        document.getElementById('wrap').style.height = '100vh';
        window.__mount({ tab: 'tonight', obsLive: false, obsDate: '2026-07-04', obsTime: '23:30' });
      });
      await page.getByRole('button', { name: 'Open 3D sky' }).click();
      await page.waitForFunction(() => document.querySelector('#astronomy-observatory-3d')?.__observatoryDebug?.().ready);
      assert.equal(await page.getByLabel('Explore a section').inputValue(), 'observatory');
      const sections = await page.getByLabel('Explore a section').locator('option').evaluateAll(nodes => nodes.map(node => node.value));
      const layouts = [];
      for (const section of sections) {
        await page.getByLabel('Explore a section').selectOption(section);
        await page.waitForFunction(section => document.getElementById('astronomy-main')?.getAttribute('aria-labelledby') === 'astronomy-tab-' + section, section);
        const layout = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, panelHeight: document.getElementById('astronomy-main').clientHeight, panelWidth: document.getElementById('astronomy-main').clientWidth, panelScrollWidth: document.getElementById('astronomy-main').scrollWidth }));
        assert.ok(layout.panelHeight > 100, section + ': usable content area');
        assert.ok(layout.scroll <= layout.width + 1, section + ': document overflow');
        layouts.push({ section, ...layout });
      }
      assert.equal(errors.length, 0, errors.join('\n'));
      results.push({ name: 'section-journey', errors, layouts });
      await page.evaluate(() => window.__destroy());
      await page.close();
    }
    fs.writeFileSync(path.join(out, `${process.env.SKY_QA_LABEL || 'current'}-browser.json`), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results.map(x => ({name:x.name,errors:x.errors,width:x.metrics?.width,scrollWidth:x.metrics?.scrollWidth,sceneTop:x.metrics?.sceneTop,sections:x.layouts?.length})), null, 2));
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
