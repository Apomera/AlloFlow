'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..');
const {chromium} = require(path.join(repo, 'node_modules/playwright'));
const read = p => fs.readFileSync(path.join(repo, p), 'utf8');
const registry = read('ui_strings.js');
const source = fs.readFileSync(process.env.PT_TEST_SOURCE || path.join(repo, 'stem_lab/stem_tool_platetectonics.js'), 'utf8');
const out = process.env.PT_PHONE_QA_OUT || path.join(repo, 'scratch/tectonics-phone-controls-review');
fs.mkdirSync(out, {recursive: true});
const report = {sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), registrySha256: crypto.createHash('sha256').update(registry).digest('hex'), registryTectonicsSha256: crypto.createHash('sha256').update(JSON.stringify(JSON.parse(registry).stem.platetectonics)).digest('hex'), checks: [], captures: [], layouts: [], errors: []};
function pass(name, details) {report.checks.push({name, passed: true, details}); process.stdout.write('PASS ' + name + '\n');}
(async () => {
  const browser = await chromium.launch({headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  try {
    const page = await browser.newPage({viewport: {width: 1100, height: 1100}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(60000);
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Tectonic phone controls review</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({content: read('dev-tools/.cache/sweep-tailwind.css')});
    for (const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'node_modules/axe-core/axe.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({content: read(p)});
    await page.evaluate(() => {StemLab.ensureThree = () => Promise.resolve(THREE); StemLab.loadScriptResilient = () => new Promise(() => {});});
    await page.evaluate(dictionary => {window.__alloT = (key, fallback) => {const value = key.split('.').reduce((node, part) => node && node[part], dictionary); return typeof value === 'string' ? value : fallback;};}, JSON.parse(registry));
    await page.addScriptTag({content: source});
    await page.evaluate(() => {
      const root = ReactDOM.createRoot(document.querySelector('#app'));
      let generation = 0;
      window.mountReview = (kind, dark) => {
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#fff7ed';
        window.qaEvents = {records: [], awards: [], notices: []};
        ReactDOM.flushSync(() => root.render(React.createElement(kind === 'boundary' ? AlloTectonicsInteractive : AlloTectonicsForces, {
          key: ++generation, darkMode: dark, t: window.__alloT,
          saved: {}, onRecord: value => qaEvents.records.push(value), onRecordDepths: value => qaEvents.records.push(value), onRecordSlab: value => qaEvents.records.push(value),
          awardStemXP: value => qaEvents.awards.push(value), addToast: value => qaEvents.notices.push(value), announceToSR: () => {}
        })));
      };
    });
    const click = selector => page.locator(selector).evaluate(node => node.click());
    for (const width of [320, 390, 1100]) for (const dark of [false, true]) {
      const tag = `${dark ? 'dark' : 'light'}-${width}`;
      await page.setViewportSize({width, height: 1100});
      await page.evaluate(dark => mountReview('boundary', dark), dark);
      await click('[data-tect-view="3d"]');
      await page.waitForFunction(() => __alloTectGL.debug().state === 'ready');
      const target = page.locator('#pt-boundary-simulator');
      const before = await page.locator('[data-pt-model-reading="time"]').textContent();
      const rockKey = page.locator('[data-tect-rock-details]');
      assert.equal(await rockKey.evaluate(node => node.open), false);
      await rockKey.locator('summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await rockKey.evaluate(node => node.open), true);
      await page.keyboard.press('Enter');
      assert.equal(await rockKey.evaluate(node => node.open), false);
      await page.locator('#tect-cut').focus();
      await page.keyboard.press('End');
      assert.equal(await page.locator('#tect-cut').inputValue(), '100');
      assert.match(await page.locator('#tect-cut').getAttribute('aria-valuetext'), /off/i);
      await page.keyboard.press('Home');
      assert.equal(await page.locator('#tect-cut').inputValue(), '0');
      assert.match(await page.locator('#tect-cut').getAttribute('aria-valuetext'), /Cut position 0/);
      await page.waitForFunction(() => __alloTectGL.debug().clipConstant === 0);
      assert.equal(await page.locator('[data-pt-model-reading="time"]').textContent(), before);
      const metrics = await target.evaluate(node => {
        const selectors = ['[data-tect-block-guide]', '[data-tect-view-caption]', '#tect-cut-help', 'label[for="tect-cut"]', '[data-tect-preset]', '[data-tect-mode]', '[data-pt-model-play]', '[data-pt-model-reset]', '[data-pt-model-step]', '[data-tect-scale-toggle]'];
        const fonts = selectors.flatMap(s => [...node.querySelectorAll(s)].filter(el => el.getClientRects().length).map(el => ({selector: s, px: parseFloat(getComputedStyle(el).fontSize)})));
        const controls = [...node.querySelectorAll('[data-tect-preset], [data-tect-mode], [data-pt-model-play], [data-pt-model-reset], [data-pt-model-step], [data-tect-scale-toggle], #tect-cut')].map(el => ({height: el.getBoundingClientRect().height, width: el.getBoundingClientRect().width}));
        return {overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), fonts, controls};
      });
      assert.equal(metrics.overflow, 0);
      assert.ok(metrics.fonts.every(item => item.px >= 14), JSON.stringify(metrics.fonts));
      assert.ok(metrics.controls.every(item => item.height >= 39.9 && item.width >= 39.9), JSON.stringify(metrics.controls));
      const violations = await target.evaluate(async node => (await axe.run(node, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']}})).violations.map(v => ({id: v.id, nodes: v.nodes.map(n => n.target)})));
      assert.deepEqual(violations, []);
      const events = await page.evaluate(() => qaEvents);
      assert.deepEqual(events, {records: [], awards: [], notices: []});
      const file = path.join(out, tag + '-boundary.png');
      await target.screenshot({path: file, animations: 'disabled'}); report.captures.push(file);
      report.layouts.push({name: tag + '-boundary', metrics, violations});
      pass(tag + ': readable boundary controls, keyboard slicing, unchanged time and no overflow', metrics);
      await page.evaluate(dark => mountReview('force', dark), dark);
      const force = page.locator('[data-pt-forces="true"]');
      const theories = page.locator('[data-pt-forces-theory]');
      assert.equal(await theories.count(), 3);
      assert.deepEqual(await theories.evaluateAll(nodes => nodes.map(node => node.open)), [false, false, false]);
      const summary = theories.first().locator('summary');
      await summary.focus(); await page.keyboard.press('Enter');
      assert.equal(await theories.first().evaluate(node => node.open), true);
      await page.keyboard.press('Enter');
      assert.equal(await theories.first().evaluate(node => node.open), false);
      const forceMetrics = await page.evaluate(() => {
        const root = document.querySelector('[data-pt-forces-theory]').parentElement.parentElement;
        const readout = root.querySelector('[data-pt-forces-readout]'), probes = root.querySelector('[data-pt-forces-probe]');
        return {overflow: Math.max(0, document.documentElement.scrollWidth - innerWidth), readingsBeforeProbes: !!(readout.compareDocumentPosition(probes) & Node.DOCUMENT_POSITION_FOLLOWING),
          fonts: [...root.querySelectorAll('[data-pt-forces-theory] summary, [data-pt-forces-model-note]')].map(el => parseFloat(getComputedStyle(el).fontSize)),
          summaries: [...root.querySelectorAll('[data-pt-forces-theory] summary')].map(el => el.getBoundingClientRect().height)};
      });
      assert.equal(forceMetrics.overflow, 0); assert.equal(forceMetrics.readingsBeforeProbes, true);
      assert.ok(forceMetrics.fonts.every(px => px >= 14)); assert.ok(forceMetrics.summaries.every(height => height >= 39.9));
      const forceRoot = page.locator('[data-pt-forces-theory]').first().locator('../..');
      const forceViolations = await forceRoot.evaluate(async node => (await axe.run(node, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']}})).violations.map(v => ({id: v.id, nodes: v.nodes.map(n => n.target)})));
      assert.deepEqual(forceViolations, []);
      assert.deepEqual(await page.evaluate(() => qaEvents), {records: [], awards: [], notices: []});
      const forceFile = path.join(out, tag + '-forces.png'); await forceRoot.screenshot({path: forceFile, animations: 'disabled'}); report.captures.push(forceFile);
      report.layouts.push({name: tag + '-forces', metrics: forceMetrics, violations: forceViolations});
      pass(tag + ': expandable theory, nearby live readings, keyboard control and silence', forceMetrics);
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {report.failure = error.stack; throw error;}
  finally {fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); await browser.close();}
})().catch(error => {process.stderr.write(error.stack + '\n'); process.exitCode = 1;});
