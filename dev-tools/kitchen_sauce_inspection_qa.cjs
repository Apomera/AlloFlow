/* Native close-up inspection and pinned observation comparison checks. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/kitchen-sauce-inspection');
const notebookKey = 'alloflow-kitchen-sauce-science-v1';
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((request, response) => {
  const file = path.resolve(root, '.' + new URL(request.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); response.end(data);
  });
});

(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/stem_lab/kitchen_studio/';
  const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = { checks: [], accessibility: [], screenshots: [], errors: [] };
  let page;
  async function open(options = {}) {
    const { disableWebGL = false, ...pageOptions } = options;
    const p = await browser.newPage({ viewport: { width: 1360, height: 1050 }, reducedMotion: 'reduce', ...pageOptions });
    p.setDefaultTimeout(20000); p.on('pageerror', error => report.errors.push(error.message));
    if (disableWebGL) await p.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
    });
    await p.goto(base + 'recipe_lab_investigation.html?focus=emulsion');
    await p.locator('#benchPrediction').selectOption('unsure'); await p.locator('#benchRun').click();
    await p.locator('#benchValidity[data-valid=true]').waitFor(); return p;
  }
  const saved = p => p.evaluate(key => localStorage.getItem(key), notebookKey);
  const modes = p => p.locator('.bench-sauce-canvas').evaluateAll(nodes => nodes.map(n => n.dataset.inspection));
  async function view(p, name) { await p.locator('#benchView' + name).click(); }
  async function stage(p, value) { await p.locator('#benchStage').selectOption(value); }
  async function scrub(p, value) { await p.locator('#benchTrailTime').fill(String(value)); await p.locator('#benchTrailTime').dispatchEvent('input'); }
  async function point(p, arm, key) {
    const canvas = p.locator('#benchArm-' + arm + ' .bench-sauce-canvas'); await canvas.scrollIntoViewIfNeeded();
    await p.waitForFunction(({ arm, key }) => { const c = document.querySelector('#benchArm-' + arm + ' .bench-sauce-canvas'); return c && c.dataset[key] && c.getBoundingClientRect().width > 0; }, { arm, key });
    return canvas.evaluate((c, key) => { const r = c.getBoundingClientRect(), v = JSON.parse(c.dataset[key]); return { x: r.left + v.x * r.width, y: r.top + v.y * r.height }; }, key);
  }
  async function shot(p, name, selector = '#benchArms') { await p.locator(selector).screenshot({ path: path.join(out, name + '.png') }); report.screenshots.push(name + '.png'); }
  async function audit(p, label) {
    await p.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const issues = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    report.accessibility.push({ label, issues }); assert.deepEqual(issues, [], label + ' accessibility');
  }
  try {
    page = await open(); const original = await saved(page); await stage(page, 'fold-2');
    assert.deepEqual(await modes(page), ['trail', 'trail']);
    await scrub(page, 0.75);
    const originalPan = await page.locator('#benchArm-plain .bench-sauce-canvas').screenshot();
    let spoon = await point(page, 'reduced', 'sauceSpoon');
    await page.mouse.click(spoon.x, spoon.y);
    await page.waitForFunction(() => document.getElementById('benchViewSpoon').getAttribute('aria-pressed') === 'true');
    assert.deepEqual(await modes(page), ['spoon', 'spoon']);
    assert.equal(await page.locator('#benchTrailElapsed').textContent(), '0.75 s');
    assert.equal(await page.locator('#benchArm-plain .bench-observation-details').evaluate(n => n.open), false);
    assert.equal(await page.locator('#benchArm-reduced .bench-observation-details').evaluate(n => n.open), false);
    await shot(page, 'paired-spoon-closeups');
    await view(page, 'Trail');
    const restoredPan = await page.locator('#benchArm-plain .bench-sauce-canvas').screenshot();
    assert.ok(originalPan.equals(restoredPan), 'Returning from a spoon close-up restores the original pan and spoon pose');
    await view(page, 'Oil'); assert.deepEqual(await modes(page), ['oil', 'oil']);
    assert.match(await page.locator('#benchArm-plain .bench-inspection-cue').innerText(), /oil/i);
    await stage(page, 'poured');
    assert.deepEqual(await modes(page), ['oil', 'oil']);
    assert.deepEqual(await page.locator('.bench-sauce-canvas').evaluateAll(nodes => nodes.map(n => n.dataset.sauceOil)), ['separated', 'separated']);
    await shot(page, 'oil-after-pouring');
    await view(page, 'Spoon');
    assert.match(await page.locator('#benchArm-plain .bench-inspection-cue').innerText(), /separate|patch|combined/i);
    assert.equal(await saved(page), original);
    report.checks.push('A native spoon click opens matched close-ups; pan, spoon and oil views preserve the shared time and recorded evidence, including unresolved mixing cues.');

    await view(page, 'Trail'); await scrub(page, 1.25);
    const start = await point(page, 'plain', 'sauceStart'), end = await point(page, 'plain', 'sauceEnd');
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move((start.x + end.x) / 2, (start.y + end.y) / 2, { steps: 6 });
    assert.equal(await page.locator('#sauceInvestigationApp').getAttribute('data-drawing'), 'true');
    await page.locator('#benchViewOil').focus(); await page.keyboard.press('Enter'); await page.mouse.up();
    assert.deepEqual(await modes(page), ['oil', 'oil']);
    assert.equal(await page.locator('#sauceInvestigationApp').getAttribute('data-drawing'), 'false');
    assert.equal(await page.locator('#benchTrailElapsed').textContent(), '1.25 s');
    await page.locator('#benchTrailStep').click(); assert.deepEqual(await modes(page), ['trail', 'trail']);
    assert.equal(await page.locator('#benchTrailElapsed').textContent(), '1.75 s');
    spoon = await point(page, 'plain', 'sauceSpoon');
    await page.mouse.move(spoon.x, spoon.y); await page.mouse.down(); await page.mouse.move(spoon.x + 35, spoon.y + 25); await page.mouse.up();
    assert.deepEqual(await modes(page), ['trail', 'trail']);
    await page.locator('#benchArm-plain .bench-observation-details > summary').click();
    await stage(page, 'fold-2');
    assert.equal(await page.locator('#benchArm-plain .bench-observation-details').evaluate(n => n.open), true);
    assert.equal(await saved(page), original);
    report.checks.push('Changing view cancels native strokes without losing the chosen time; trail controls return to the pan and details stay open across recorded stages.');

    await stage(page, 'baseline'); await page.locator('#benchPinStage').click();
    assert.equal(await page.locator('#benchUseReference').isDisabled(), true);
    await stage(page, 'poured');
    assert.equal(await page.locator('#benchUseReference').isDisabled(), false);
    let reference = await page.locator('#benchReference').innerText();
    assert.match(reference, /Before the addition/); assert.match(reference, /After the measured addition/); assert.match(reference, /105/);
    await stage(page, 'rested'); await page.locator('#benchPinStage').click(); await stage(page, 'fold-2');
    reference = await page.locator('#benchReference').innerText(); assert.match(reference, /earlier|before/i);
    await shot(page, 'pinned-stage-comparison', '#benchReference');
    const reflection = 'My explanation starts with a comparison of the visible coating.';
    await page.locator('#benchReflection').fill(reflection); await page.locator('#benchUseReference').click();
    const draft = await page.locator('#benchReflection').inputValue(); assert.ok(draft.startsWith(reflection)); assert.ok(draft.length > reflection.length);
    assert.equal(await saved(page), original, 'Appending evidence remains a draft');
    await page.locator('#benchReflection').fill('x'.repeat(2000)); await page.locator('#benchUseReference').click();
    assert.equal(await page.locator('#benchReflection').inputValue(), 'x'.repeat(2000));
    await page.locator('#benchReflection').fill(draft); await page.locator('#benchSaveReflection').click();
    assert.equal(JSON.parse(await saved(page)).items[0].record.reflection, draft);
    await audit(page, 'Desktop close-ups and pinned comparison');
    report.checks.push('Pinned stage IDs distinguish zero-time observations, allow reverse comparison, and append bounded evidence only to the learner’s draft until Save is chosen.');
    await page.close();

    page = await open({ viewport: { width: 320, height: 850 }, isMobile: true, hasTouch: true });
    const mobileOriginal = await saved(page); await stage(page, 'fold-2'); spoon = await point(page, 'plain', 'sauceSpoon');
    await page.touchscreen.tap(spoon.x, spoon.y);
    await page.waitForFunction(() => document.getElementById('benchViewSpoon').getAttribute('aria-pressed') === 'true');
    assert.deepEqual(await modes(page), ['spoon', 'spoon']);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
    await shot(page, 'mobile-spoon-closeups');
    await stage(page, 'baseline'); await page.locator('#benchPinStage').tap(); await stage(page, 'rested');
    assert.equal(await page.locator('#benchReference').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false);
    assert.equal(await saved(page), mobileOriginal);
    await audit(page, '320px touch inspection and reference');
    report.checks.push('At 320px, native touch lifts both spoons, compact cards and reference comparisons fit without horizontal overflow, and records remain unchanged.');
    await page.close();

    page = await open({ disableWebGL: true }); const fallbackOriginal = await saved(page);
    assert.equal(await page.locator('#benchArm-plain .bench-sauce-art').isVisible(), true);
    await view(page, 'Spoon'); assert.match(await page.locator('#benchArm-plain .bench-inspection-cue').innerText(), /spoon|coating|patch|layer/i);
    await stage(page, 'baseline'); await page.locator('#benchPinStage').click(); await stage(page, 'fold-2');
    assert.equal(await page.locator('#benchReference').isVisible(), true);
    assert.equal(await saved(page), fallbackOriginal); await audit(page, 'Illustrated inspection fallback');
    report.checks.push('Without WebGL, all inspection text, measurement details and pinned comparisons remain available with native controls.');
    assert.deepEqual(report.errors, []); report.status = 'passed';
  } catch (error) { report.status = 'failed'; report.failure = error.stack || String(error); process.exitCode = 1; }
  finally { fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(report, null, 2)); await browser.close(); await new Promise(resolve => server.close(resolve)); console.log(JSON.stringify(report, null, 2)); }
})();
