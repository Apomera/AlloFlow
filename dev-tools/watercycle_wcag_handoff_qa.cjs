'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = process.cwd();
const folder = path.join(root, 'reports/watercycle-wcag-handoff');
const out = path.join(folder, 'final');
fs.mkdirSync(out, { recursive: true });
const temp = fs.mkdtempSync(path.join(out, 'browser-temp-'));
process.env.TEMP = process.env.TMP = temp;
const browsers = path.join(process.env.USERPROFILE, 'AppData/Local/ms-playwright');
if (fs.existsSync(browsers)) process.env.PLAYWRIGHT_BROWSERS_PATH = browsers;
const { chromium } = require('playwright');
const source = fs.readFileSync(path.join(root, 'stem_lab/stem_tool_watercycle.js'), 'utf8');
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
assert.equal(sourceSha256, '072436d531f7a7fd19bf7e1479f2156a361ee47f8510fb162ca2731160a474f0');
fs.writeFileSync(path.join(folder, 'source.js'), source);
let html = fs.readFileSync(path.join(root, 'dev-tools/watercycle_pilot_snow_lab_qa.cjs'), 'utf8').match(/const html = String.raw`([\s\S]*?)`;/)[1];
html = html.replace('renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};return render(scene,camera);};', 'renderer.render=(scene,camera)=>{window.pilotReview={scene,camera,renderer};if(window.qaRender!==false)return render(scene,camera);};');
const allowed = ['/stem_lab/', '/vendor/three-r128/', '/desktop/web-app/node_modules/react/umd/', '/desktop/web-app/node_modules/react-dom/umd/', '/desktop/web-app/node_modules/axe-core/', '/dev-tools/.cache/sweep-tailwind.css'];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
  if (url.pathname === '/stem_lab/stem_tool_watercycle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(source); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep) || !allowed.some(prefix => url.pathname.startsWith(prefix))) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404); res.end('Missing asset'); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream');
    res.end(body);
  });
});
const result = { sourceSha256, scope: 'A bounded handoff spotcheck of current Be the Water: fresh axe WCAG A/AA scans of normal desktop light/dark, 320px light, and the regional flight guide, plus actual keyboard opening, escape/no-trap navigation, and Begin focus. Existing recent full layout/large-text evidence is not repeated. No full WCAG conformance or screen-reader speech claim.', audits: [], keyboard: [], checks: [], errors: [], networkFailures: [] };
const check = (name, ok, evidence) => { result.checks.push({ name, ok, evidence }); console.log('CHECK ' + name + ' ' + ok); assert.ok(ok, name); };
let browser;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  try {
    browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disk-cache-size=1', '--media-cache-size=1', '--disable-gpu-shader-disk-cache', '--disable-component-update', '--disable-background-networking'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => result.errors.push(String(error)));
    page.on('requestfailed', request => result.networkFailures.push({ url: request.url(), error: request.failure()?.errorText }));
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const active = () => page.evaluate(() => {
      const e = document.activeElement, b = e.getBoundingClientRect(), s = getComputedStyle(e), hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return { id: e.id, tag: e.tagName, name: e.getAttribute('aria-label') || e.textContent.trim(), class: e.className, guide: !!e.closest('.wc-pilot-launch'), visible: s.visibility !== 'hidden' && s.display !== 'none', hit: hit === e || e.contains(hit), outline: s.outlineStyle, outlineWidth: s.outlineWidth, rect: { x: b.x, y: b.y, width: b.width, height: b.height } };
    });
    const mount = async (theme, width, onboardingComplete = true) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(({ theme, onboardingComplete }) => mountWater({ wcMode: 'pilot', pilot: { onboardingComplete, paused: true } }, theme), { theme, onboardingComplete });
      await page.waitForFunction(() => waterReviewData?.pilot?.snapshot && document.querySelector('#wcPilotCanvas'));
      await page.evaluate(() => { window.qaRender = false; return document.fonts.ready; });
      await settle();
    };
    const audit = async label => {
      const row = await page.evaluate(async label => {
        const data = await axe.run('#slot', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'] } });
        const map = item => ({ id: item.id, impact: item.impact, help: item.help, helpUrl: item.helpUrl, tags: item.tags, nodes: item.nodes.map(node => ({ target: node.target, html: node.html, failureSummary: node.failureSummary, any: node.any, all: node.all, none: node.none })) });
        return { label, version: data.testEngine.version, violations: data.violations.map(map), incomplete: data.incomplete.map(map), passes: data.passes.map(item => item.id) };
      }, label);
      result.audits.push(row);
      console.log('AUDIT ' + label + ' ' + JSON.stringify(row.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))));
    };
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.pilotReview && window.waterReviewData?.pilot?.snapshot, null, { timeout: 90000 });
    await page.evaluate(() => { window.qaRender = false; });
    await page.addScriptTag({ url: url + 'desktop/web-app/node_modules/axe-core/axe.min.js' });
    await mount('light', 1280); await audit('1280-light-surface');
    await mount('dark', 1280); await audit('1280-dark-surface');
    await mount('light', 320); await audit('320-light-surface');
    await mount('light', 1280);
    await page.locator('.wc-pilot-camera-help').focus(); await page.keyboard.press('Enter'); await settle();
    const opened = await active(); result.keyboard.push({ event: 'desktop Help Enter', focus: opened });
    check('Help opens the regional guide with focus on its first Begin action', opened.guide && /Begin.*parcel/.test(opened.name) && opened.hit, opened);
    const semantics = await page.locator('.wc-pilot-launch').evaluate(e => ({ role: e.getAttribute('role'), modal: e.getAttribute('aria-modal'), labelledby: e.getAttribute('aria-labelledby'), title: document.getElementById(e.getAttribute('aria-labelledby'))?.textContent }));
    check('Guide is a named nonmodal region', semantics.role === 'region' && !semantics.modal && !!semantics.title, semantics);
    await audit('1280-light-flight-guide');
    await page.keyboard.press('Escape'); await settle();
    const escape = await active(); result.keyboard.push({ event: 'Escape in regional guide', focus: escape, guideRemains: await page.locator('.wc-pilot-launch').count() === 1 });
    // Regional content does not claim modal Escape behavior; verify users can
    // leave it using the normal document focus order instead of enforcing a trap.
    await page.locator('.wc-pilot-launch-btn').first().focus(); await page.keyboard.press('Shift+Tab'); await settle();
    const before = await active(); result.keyboard.push({ event: 'Shift+Tab leaves first guide action', focus: before });
    check('Guide lets keyboard focus leave backward', !before.guide && before.tag !== 'BODY', before);
    await page.locator('.wc-pilot-launch-btn').last().focus(); await page.keyboard.press('Tab'); await settle();
    const after = await active(); result.keyboard.push({ event: 'Tab leaves last guide action', focus: after });
    check('Guide lets keyboard focus leave forward', !after.guide && after.tag !== 'BODY', after);
    await page.locator('.wc-pilot-launch-btn').first().focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => document.activeElement?.id === 'wcPilotCanvas');
    const began = await active(); result.keyboard.push({ event: 'Desktop Begin Follow', focus: began });
    check('Begin Follow closes guide and focuses the canvas', began.id === 'wcPilotCanvas' && await page.locator('.wc-pilot-launch').count() === 0 && await page.evaluate(() => waterReviewData.pilot.cameraMode === 'follow'), began);
    await mount('light', 320, false);
    await page.locator('.wc-pilot-launch-btn').last().focus(); await page.keyboard.press('Enter'); await page.waitForFunction(() => document.activeElement?.id === 'wcPilotCanvas');
    const water = await active(); result.keyboard.push({ event: '320px Begin Water', focus: water });
    check('Begin Water closes guide and focuses canvas at320px', water.id === 'wcPilotCanvas' && await page.locator('.wc-pilot-launch').count() === 0 && await page.evaluate(() => waterReviewData.pilot.cameraMode === 'water'), water);
    check('No automated WCAG A/AA violations in four sampled views', result.audits.every(row => row.violations.length === 0), result.audits.map(row => ({ label: row.label, violations: row.violations.map(v => v.id) })));
    check('No browser runtime errors', result.errors.length === 0, result.errors);
    result.success = true;
  } catch (error) { result.success = false; result.harnessError = String(error); console.error(error); process.exitCode = 1; }
  finally {
    if (browser) { await browser.close(); result.browsersClosed = true; }
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections?.(); });
    const real = fs.realpathSync(temp), parent = fs.realpathSync(out);
    assert(real.startsWith(parent + path.sep) && path.basename(real).startsWith('browser-temp-'));
    fs.rmSync(real, { recursive: true, force: true }); result.browserTempCleaned = true;
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ success: result.success, checks: result.checks.length, violations: result.audits.map(row => ({ label: row.label, count: row.violations.length })), error: result.harnessError }));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
