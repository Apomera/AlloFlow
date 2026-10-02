'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '..'), { chromium } = require(path.join(repo, 'node_modules/playwright'));
const read = file => fs.readFileSync(path.join(repo, file), 'utf8');
const source = fs.readFileSync(process.env.PT_COORDINATE_SOURCE || path.join(repo, 'stem_lab/stem_tool_platetectonics.js'), 'utf8');
const registrySource = fs.readFileSync(process.env.PT_COORDINATE_REGISTRY || path.join(repo, 'ui_strings.js'), 'utf8'), registry = JSON.parse(registrySource);
const out = path.resolve(process.env.PT_COORDINATE_OUT || path.join(repo, 'scratch/tectonics-slab-coordinates-review')); fs.mkdirSync(out, { recursive: true });
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const report = { sourceSha256: hash(source), registrySha256: hash(registrySource), registryTectonicsSha256: hash(JSON.stringify(registry.stem.platetectonics)), checks: [], captures: [], errors: [], accessibility: [], layouts: [], passed: false };
const restored = { version: 1, angle: 42, points: Array.from({ length: 8 }, (_, index) => ({ x: 100.12345678901234 + index * 50, z: 100.625 + index * 45, m: 4 })) };
const check = (name, details) => { report.checks.push({ name, passed: true, details }); console.log('PASS', name); };
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 1100, height: 1000 } });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Slab observation coordinates</title></head><body style="margin:0;font-family:system-ui"><main id="app" style="padding:12px;max-width:1100px;margin:auto"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      StemLab.ensureThree = () => new Promise(() => {}); StemLab.loadScriptResilient = () => new Promise(() => {});
      const frames = new Map(); let frameId = 0, now = performance.now(), rngIndex = 0;
      window.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
      window.cancelAnimationFrame = id => frames.delete(id);
      const sequence = [0, 0.2, 0.8, 0.9, 0.5, 0.5]; Math.random = () => sequence[rngIndex++ % sequence.length];
      window.qaFrame = (delta = 16) => { now = Math.max(now + delta, performance.now()); const callbacks = [...frames.values()]; frames.clear(); ReactDOM.flushSync(() => callbacks.forEach(callback => callback(now))); };
      window.qaStep = count => { for (let i = 0; i < count; i++) { rngIndex = 0; ReactDOM.flushSync(() => document.querySelector('[data-pt-model-step]').click()); } };
    });
    await page.addScriptTag({ content: source });
    await page.evaluate(strings => {
      window.qaStrings = strings; const root = ReactDOM.createRoot(document.querySelector('#app')); let generation = 0;
      window.qaMount = (dark, savedSlab) => {
        document.documentElement.classList.toggle('dark', dark); document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        window.qaEffects = { records: [], rewards: [], pings: [], notices: [] }; window.qaMissing = new Set();
        ReactDOM.flushSync(() => root.render(React.createElement(React.StrictMode, null, React.createElement(AlloTectonicsInteractive, {
          key: ++generation, darkMode: dark, savedSlab,
          t: (key, fallback) => { const value = key.split('.').reduce((value, part) => value && value[part], qaStrings); if (typeof value !== 'string') { qaMissing.add(key); return fallback; } return value; },
          onRecordSlab: value => qaEffects.records.push(value), awardXP: value => qaEffects.rewards.push(value), beep: value => qaEffects.pings.push(value), announceToSR: value => qaEffects.notices.push(value)
        }))));
      };
      window.qaOpenLog = () => ReactDOM.flushSync(() => { const log = document.querySelector('[data-pt-quake-log]'); log.open = true; log.dispatchEvent(new Event('toggle', { bubbles: true })); });
      window.qaCoordinates = () => [...document.querySelectorAll('[data-pt-slab-coordinate-row]')].map(row => ({ event: row.querySelector('th').textContent, x: row.dataset.distanceKm, z: row.dataset.depthKm, displayedX: row.querySelector('[data-pt-slab-coordinate-distance]').textContent, displayedZ: row.querySelector('[data-pt-slab-coordinate-depth]').textContent }));
      window.qaPoints = () => [...document.querySelectorAll('[data-pt-quake-point]')].map(point => ({ x: point.dataset.distanceKm, z: point.dataset.depthKm }));
      window.qaSnapshot = () => ({ effects: JSON.stringify(qaEffects), time: document.querySelector('[data-pt-model-reading="time"]').textContent, angle: document.querySelector('#pt-ql-dip').value, outerOpen: document.querySelector('[data-pt-quake-log]').open, rows: qaCoordinates() });
    }, registry);
    const paint = () => page.evaluate(() => { qaFrame(0); qaFrame(0); });
    const click = selector => page.locator(selector).evaluate(node => ReactDOM.flushSync(() => node.click()));
    const compare = async () => {
      const rows = await page.evaluate(() => qaCoordinates()), points = await page.evaluate(() => qaPoints());
      assert.equal(rows.length, points.length);
      rows.forEach((row, index) => { assert.equal(row.event, String(index + 1)); assert.equal(row.x, points[index].x); assert.equal(row.z, points[index].z); assert.equal(row.displayedX, points[index].x); assert.equal(row.displayedZ, points[index].z); });
      return rows;
    };
    for (const width of [320, 390, 1100]) for (const dark of [false, true]) {
      const tag = (dark ? 'dark' : 'light') + '-' + width;
      await page.setViewportSize({ width, height: 1000 }); await page.evaluate(({ dark, restored }) => { qaMount(dark, restored); qaOpenLog(); }, { dark, restored }); await paint();
      const details = page.locator('[data-pt-slab-coordinates]'), summary = details.locator('summary');
      assert.equal(await details.evaluate(node => node.open), false);
      const before = await page.evaluate(() => qaSnapshot());
      await summary.focus(); await page.keyboard.press('Space'); await page.waitForFunction(() => document.querySelector('[data-pt-slab-coordinates]').open); await paint();
      const after = await page.evaluate(() => qaSnapshot()); assert.equal(after.outerOpen, true); assert.equal(after.time, before.time); assert.equal(after.angle, before.angle); assert.equal(after.effects, before.effects);
      check(tag + ': keyboard opens the native disclosure without changing model or saved evidence');
      const rows = await compare(); assert.equal(rows.length, 8); assert.equal(rows[0].displayedX, String(restored.points[0].x));
      assert.equal(await details.getAttribute('data-pt-slab-coordinates'), 'captured'); assert.match(await details.innerText(), /stay fixed/);
      const table = details.locator('table'); assert.equal(await table.locator('caption').count(), 1); assert.deepEqual(await table.locator('thead th').evaluateAll(nodes => nodes.map(node => node.getAttribute('scope'))), ['col', 'col', 'col']); assert.equal(await table.locator('tbody th[scope="row"]').count(), 8);
      check(tag + ': exact plotted decimal coordinates have semantic table headers and sample numbering');
      const layout = await details.evaluate(node => {
        const table = node.querySelector('table'), cells = [...table.querySelectorAll('th,td')], bounds = node.getBoundingClientRect();
        return { viewport: innerWidth, tableWidth: table.getBoundingClientRect().width, disclosureWidth: bounds.width, pageOverflow: document.documentElement.scrollWidth - innerWidth, disclosureOverflow: node.scrollWidth - node.clientWidth, minFont: Math.min(...cells.map(cell => parseFloat(getComputedStyle(cell).fontSize))), summaryHeight: node.querySelector('summary').getBoundingClientRect().height };
      });
      assert.ok(layout.pageOverflow <= 1); assert.ok(layout.disclosureOverflow <= 1); assert.ok(layout.tableWidth <= layout.disclosureWidth); assert.ok(layout.minFont >= 14); assert.ok(layout.summaryHeight >= 44);
      report.layouts.push({ tag, ...layout });
      const scan = await details.evaluate(node => axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })); report.accessibility.push({ tag, violations: scan.violations }); assert.deepEqual(scan.violations, []);
      const capture = path.join(out, tag + '-checked-coordinates.png'); await details.screenshot({ path: capture, animations: 'disabled' }); report.captures.push(capture);
      check(tag + ': table remains readable at 14px with no overflow or WCAG violations', layout);
      await page.evaluate(() => qaStep(12)); await paint();
      assert.deepEqual(await compare(), rows); assert.equal(await page.locator('[data-pt-quake-log]').getAttribute('data-pt-quake-live-count'), '12'); assert.equal(await page.evaluate(() => qaEffects.records.length), 0);
      const afterIntervalsEffects = await page.evaluate(() => JSON.stringify(qaEffects));
      await summary.focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => !document.querySelector('[data-pt-slab-coordinates]').open); await paint(); assert.equal(await page.locator('[data-pt-quake-log]').evaluate(node => node.open), true);
      assert.equal(await page.evaluate(() => JSON.stringify(qaEffects)), afterIntervalsEffects);
      check(tag + ': checked coordinates stay fixed during new live intervals and nested keyboard collapse');
      await click('[data-pt-slab-revise]'); await paint(); assert.equal(await details.getAttribute('data-pt-slab-coordinates'), 'live'); assert.equal((await compare()).length, 12); assert.equal(await page.locator('[data-pt-quake-fit]').count(), 0); assert.equal(await page.locator('[data-pt-slab-line="fit"]').count(), 0);
      await summary.focus(); await page.keyboard.press('Space'); await paint();
      const liveCapture = path.join(out, tag + '-live-coordinates.png'); await details.screenshot({ path: liveCapture, animations: 'disabled' }); report.captures.push(liveCapture);
      assert.deepEqual(await page.evaluate(() => [...qaMissing].filter(key => key.includes('ql_coordinates_'))), []);
      check(tag + ': Revise exposes current observations without revealing a fitted result or missing labels');
    }
    await page.evaluate(() => { qaMount(false, undefined); qaOpenLog(); }); await paint();
    await page.locator('[data-pt-slab-coordinates] summary').focus(); await page.keyboard.press('Space'); await paint();
    assert.equal(await page.locator('[data-pt-slab-coordinate-row]').count(), 0); assert.equal(await page.locator('[data-pt-slab-coordinates-table]').count(), 0); assert.match(await page.locator('[data-pt-slab-coordinates-empty]').innerText(), /No earthquake coordinates/);
    const idle = await page.evaluate(() => qaSnapshot()); await page.evaluate(() => { for (let frame = 0; frame < 1200; frame++) qaFrame(16); }); assert.deepEqual(await page.evaluate(() => qaSnapshot()), idle);
    check('Empty sample remains truthful and 1200 idle frames produce no records, announcements, rewards or pings');
    await click('[data-tect-mode="transform"]'); await page.evaluate(() => qaStep(1)); await paint(); await compare();
    assert.match(await page.locator('[data-pt-slab-coordinates-table] thead').innerText(), /Distance from boundary/); assert.doesNotMatch(await page.locator('[data-pt-slab-coordinates-table] thead').innerText(), /trench/);
    check('Transform observations use boundary distance with exact plot values');
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (error) { report.errors.push(error.stack || String(error)); }
  finally { await browser.close(); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, captures: report.captures.length, sourceSha256: report.sourceSha256, errors: report.errors.length })); if (!report.passed) process.exitCode = 1; }
})().catch(error => { console.error(error); process.exitCode = 1; });
