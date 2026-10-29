/* Native pointer, keyboard and touch checks for the paired sauce observations. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/kitchen-sauce-touch');
const edgesOnly = process.argv.includes('--edges');
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
  async function open(query = '', options = {}) {
    const { disableWebGL = false, ...pageOptions } = options;
    const p = await browser.newPage({ viewport: { width: 1360, height: 1050 }, reducedMotion: 'reduce', ...pageOptions });
    p.setDefaultTimeout(20000); p.on('pageerror', error => report.errors.push(error.message));
    if (disableWebGL) await p.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) { return /webgl/i.test(kind) ? null : original.call(this, kind, ...args); };
    });
    await p.goto(base + 'recipe_lab_investigation.html' + query);
    await p.locator('#benchPrediction').waitFor(); return p;
  }
  async function run(p) {
    await p.locator('#benchPrediction').selectOption('unsure'); await p.locator('#benchRun').click();
    await p.locator('#benchValidity[data-valid=true]').waitFor();
  }
  async function saved(p) { return p.evaluate(key => localStorage.getItem(key), notebookKey); }
  async function scrub(p, time) {
    await p.locator('#benchTrailTime').fill(String(time)); await p.locator('#benchTrailTime').dispatchEvent('input');
  }
  async function points(p, arm = 'plain') {
    const canvas = p.locator('#benchArm-' + arm + ' .bench-sauce-canvas'); await canvas.scrollIntoViewIfNeeded();
    await p.waitForFunction(id => { const n = document.querySelector('#benchArm-' + id + ' .bench-sauce-canvas'); return n && n.dataset.sauceStart && n.getBoundingClientRect().width > 0; }, arm);
    return canvas.evaluate(n => {
      const r = n.getBoundingClientRect(), a = JSON.parse(n.dataset.sauceStart), b = JSON.parse(n.dataset.sauceEnd);
      return { start: { x: r.left + r.width * a.x, y: r.top + r.height * a.y }, end: { x: r.left + r.width * b.x, y: r.top + r.height * b.y } };
    });
  }
  async function startDrag(p, arm = 'plain', fraction = 0.5) {
    const point = await points(p, arm);
    await p.mouse.move(point.start.x, point.start.y); await p.mouse.down();
    await p.mouse.move(point.start.x + (point.end.x - point.start.x) * fraction, point.start.y + (point.end.y - point.start.y) * fraction, { steps: 8 });
    return point;
  }
  async function state(p) {
    return p.evaluate(() => ({ drawing: document.getElementById('sauceInvestigationApp').dataset.drawing, elapsed: document.getElementById('benchTrailElapsed').textContent,
      scenes: [...document.querySelectorAll('.bench-sauce-canvas')].map(n => ({ drawing: n.dataset.sauceDrawing, progress: Number(n.dataset.sauceProgress), fraction: Number(n.dataset.sauceTrailFraction) })) }));
  }
  async function shot(p, name, selector = '#benchArms') {
    await p.locator(selector).screenshot({ path: path.join(out, name + '.png') }); report.screenshots.push(name + '.png');
  }
  async function audit(p, label) {
    await p.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const issues = await p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })));
    report.accessibility.push({ label, issues }); assert.deepEqual(issues, [], label + ' accessibility');
  }
  try {
    if (edgesOnly) {
      page = await open(); await run(page); const original = await saved(page);
      assert.equal(await page.locator('#benchArm-plain .bench-sauce-art').isVisible(), false);
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('#benchArm-plain .bench-scene').isVisible(), false);
      assert.equal(await page.locator('#benchArm-plain .bench-sauce-art').isVisible(), true);
      assert.equal(await page.locator('#benchArm-reduced .bench-sauce-art').isVisible(), true);
      await page.emulateMedia({ media: 'screen' });
      assert.equal(await page.locator('#benchArm-plain .bench-sauce-art').isVisible(), false);
      report.checks.push('Printing replaces both active 3D scenes with their SVG observations, then restores the screen layout.');
      await scrub(page, 0.75); await startDrag(page); await scrub(page, 1.5); await page.mouse.up();
      assert.equal((await state(page)).elapsed, '1.50 s'); assert.equal((await state(page)).drawing, 'false');
      assert.equal(await saved(page), original);
      report.checks.push('Scrubbing while a native spoon preview is active cancels the drawing and keeps the requested new time.');
      assert.deepEqual(report.errors, []); report.status = 'passed'; return;
    }
    page = await open('?focus=starch');
    assert.equal(await page.locator('#benchPrediction').inputValue(), '');
    assert.equal(await page.locator('#benchWait').inputValue(), '0');
    assert.equal(await page.locator('#benchResults').isVisible(), false); assert.equal(await saved(page), null);
    await run(page); await page.locator('.bench-scene[data-scene-active=true]').nth(1).waitFor();
    assert.equal(await page.locator('.bench-sauce-canvas').count(), 2);
    const original = await saved(page);
    await page.evaluate(() => { window.qaSceneCanvases = [...document.querySelectorAll('.bench-sauce-canvas')]; });
    report.checks.push('Chemistry entry prepares a fair plan, requires a prediction and creates two active 3D observations only after a run.');

    await scrub(page, 1.25); let point = await startDrag(page);
    let current = await state(page); assert.equal(current.drawing, 'true');
    assert.ok(current.scenes.every(s => s.drawing === 'true' && s.progress > 0.2 && s.progress < 0.8));
    assert.equal(current.scenes[0].progress, current.scenes[1].progress);
    await page.keyboard.press('Escape'); await page.mouse.up();
    current = await state(page); assert.equal(current.drawing, 'false'); assert.equal(current.elapsed, '1.25 s');
    point = await startDrag(page, 'reduced');
    await page.mouse.move(point.end.x, point.end.y, { steps: 8 }); await page.mouse.up();
    current = await state(page); assert.equal(current.drawing, 'false'); assert.equal(current.elapsed, '0.00 s');
    assert.equal(await page.locator('#benchTrailPlay').isDisabled(), true);
    await page.locator('#benchTrailStep').focus(); await page.keyboard.press('Enter');
    assert.equal((await state(page)).elapsed, '0.50 s'); assert.equal(await saved(page), original);
    await shot(page, 'paired-sauce-trails');
    report.checks.push('Dragging either spoon previews both trails, Escape restores the prior time and valid release resets both trails without changing evidence.');

    await scrub(page, 0.75); point = await startDrag(page);
    await page.mouse.move(point.start.x - 35, point.start.y, { steps: 3 }); await page.mouse.up();
    assert.equal((await state(page)).elapsed, '0.75 s'); assert.equal((await state(page)).drawing, 'false');
    point = await startDrag(page);
    await page.locator('#benchArm-plain .bench-sauce-canvas').dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' }); await page.mouse.up();
    assert.equal((await state(page)).drawing, 'false'); assert.equal((await state(page)).elapsed, '0.75 s');
    assert.equal(await saved(page), original);
    report.checks.push('Backward and cancelled pointer strokes restore both previous observations and never create a new comparison.');

    await page.locator('#benchStagePrevious').click();
    assert.equal(await page.locator('#benchStage').inputValue(), 'fold-1');
    assert.equal((await state(page)).elapsed, '0.00 s');
    await page.locator('#benchStage').selectOption('baseline');
    assert.equal(await page.locator('#benchStagePrevious').isDisabled(), true);
    await page.locator('#benchStageNext').focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('#benchStage').inputValue(), 'poured');
    assert.equal(await page.locator('#benchPooling').isVisible(), true);
    assert.match(await page.locator('#benchCompareNote').innerText(), /Both checks show distinct oil droplets/);
    await page.locator('#benchStage').selectOption('fold-2');
    assert.equal(await page.locator('#benchStageNext').isDisabled(), true);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.bench-sauce-canvas')].every((n, i) => n === window.qaSceneCanvases[i])), true);
    assert.equal(await saved(page), original); await audit(page, 'Desktop paired observations');
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('#benchArm-plain .bench-scene').isVisible(), false);
    assert.equal(await page.locator('#benchArm-plain .bench-sauce-art').isVisible(), true);
    assert.equal(await page.locator('#benchArm-reduced .bench-sauce-art').isVisible(), true);
    await page.emulateMedia({ media: 'screen' });
    await page.locator('#benchDose').selectOption('80'); await page.locator('#benchRun').click();
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('.bench-sauce-canvas')].every((n, i) => n === window.qaSceneCanvases[i])), true);
    const rerunSaved = await saved(page);
    report.checks.push('Keyboard stage navigation uses immutable matched stages, describes oil separately and reuses both WebGL renderers.');

    await page.locator('#benchArm-plain .bench-sauce-canvas').evaluate(n => n.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
    assert.equal(await page.locator('#benchArm-plain .bench-sauce-art').isVisible(), true);
    await page.locator('#benchTrailStep').click(); assert.equal((await state(page)).elapsed, '0.50 s');
    assert.equal(await saved(page), rerunSaved);
    await audit(page, '3D context loss fallback');
    report.checks.push('A lost 3D context reveals the SVG observation while synchronized controls and saved evidence remain available.');
    await page.close();

    page = await open('?focus=emulsion');
    assert.equal(await page.locator('#benchWait').inputValue(), '120'); assert.equal(await saved(page), null);
    await run(page); assert.equal(await page.locator('#benchStage').inputValue(), 'rested');
    assert.match(await page.locator('#benchCompareNote').innerText(), /Neither check shows distinct oil droplets/);
    assert.equal(await page.locator('#benchArm-plain').getAttribute('data-reading-type'), 'thick');
    await page.locator('#benchStage').selectOption('poured');
    assert.match(await page.locator('#benchCompareNote').innerText(), /Both checks show distinct oil droplets/);
    await page.locator('#benchStage').selectOption('fold-1');
    assert.match(await page.locator('#benchCompareNote').innerText(), /Neither check shows distinct oil droplets/);
    report.checks.push('The emulsion entry includes a matched rest and accurately distinguishes thickening from visible oil separation.');
    await page.close();

    page = await open('', { reducedMotion: 'no-preference' }); await run(page); const autoplaySaved = await saved(page);
    point = await startDrag(page); await page.mouse.move(point.end.x, point.end.y, { steps: 8 }); await page.mouse.up();
    await page.waitForFunction(() => document.querySelector('#benchTrailPlay').getAttribute('aria-pressed') === 'true' && Number(document.querySelector('#benchTrailTime').value) > 0);
    await page.locator('#benchTrailPlay').click(); assert.equal(await page.locator('#benchTrailPlay').getAttribute('aria-pressed'), 'false');
    assert.equal(await saved(page), autoplaySaved);
    report.checks.push('With motion enabled, a completed stroke replays both trails on the same inspection clock and can be paused.');
    await page.close();

    page = await open('?focus=starch', { viewport: { width: 320, height: 780 }, isMobile: true, hasTouch: true }); await run(page);
    const mobileSaved = await saved(page); point = await points(page); const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: point.start.x, y: point.start.y }] });
    for (let i = 1; i <= 12; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: point.start.x + (point.end.x - point.start.x) * i / 12, y: point.start.y + (point.end.y - point.start.y) * i / 12 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.equal((await state(page)).elapsed, '0.00 s'); assert.equal((await state(page)).drawing, 'false');
    await page.locator('#benchTrailStep').tap();
    await page.waitForFunction(() => document.getElementById('benchTrailElapsed').textContent === '0.50 s');
    assert.equal((await state(page)).elapsed, '0.50 s');
    assert.equal(await saved(page), mobileSaved);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
    await shot(page, 'paired-sauce-mobile'); await audit(page, '320px touch paired observations');
    report.checks.push('At 320px, native touch drawing and explicit inspection buttons work without horizontal overflow or evidence changes.');
    await page.close();
    page = await open('', { disableWebGL: true }); await run(page);
    assert.equal(await page.locator('.bench-sauce-canvas').count(), 0);
    assert.equal(await page.locator('#benchArm-plain .bench-sauce-art').isVisible(), true);
    assert.equal(await page.locator('#benchArm-reduced .bench-sauce-art').isVisible(), true);
    const fallbackSaved = await saved(page);
    await page.locator('#benchTrailStep').click(); assert.equal((await state(page)).elapsed, '0.50 s');
    await page.locator('#benchStagePrevious').click(); assert.equal(await page.locator('#benchStage').inputValue(), 'fold-1');
    assert.equal(await saved(page), fallbackSaved);
    report.checks.push('When WebGL is unavailable from the start, both SVG observations, stage navigation and manual trail inspection remain usable.');
    assert.deepEqual(report.errors, [], 'No runtime errors');
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.failure = error.stack; process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(out, edgesOnly ? 'edge-results.json' : 'browser-results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close(); await new Promise(resolve => { server.close(resolve); server.closeAllConnections?.(); });
  }
})();
