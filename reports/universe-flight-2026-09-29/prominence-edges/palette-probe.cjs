'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const repo = path.resolve(__dirname, '../../..'), hash = value => crypto.createHash('sha256').update(value).digest('hex');
const pins = Object.fromEntries(['stem_lab/stem_tool_universe.js', 'stem_lab/universe_flight_scene.js'].map(file => [file, hash(fs.readFileSync(path.join(repo, file)))]));
assert.equal(pins['stem_lab/stem_tool_universe.js'], '166dd6c8a059c03fd21e79c646c14bd104ea0be93d8cc43105231fd6f5576742');
const baseline = fs.readFileSync(path.join(__dirname, 'pre-palette-ui.js')); assert.equal(hash(baseline), '609b91840f54bbf05447bfb877a4a87e024f6b1d7cfbf65744d2b9c9904a60c6');
const result = { completed: false, productInstalled: true, pins, baselineUiHash: hash(baseline), baselineRoutedFromSavedFile: true, harnessHash: hash(fs.readFileSync(__filename)), probes: [], errors: [], candidateCssHash: hash(fs.readFileSync(path.join(__dirname, 'palette-candidate.css'))) };
const save = () => fs.writeFileSync(path.join(__dirname, 'palette-probe.json'), JSON.stringify(result, null, 2) + '\n'); save();
async function main() {
  const { chromium } = require(path.join(repo, 'node_modules/playwright'));
  const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 850 }, reducedMotion: 'reduce' }); page.setDefaultTimeout(60000);
    page.on('pageerror', error => result.errors.push(String(error)));
    const url = 'http://127.0.0.1:3187/reports/universe-flight-2026-09-29/preview.html', route = '**/stem_lab/stem_tool_universe.js*';
    await page.route(route, request => request.fulfill({ status: 200, contentType: 'application/javascript', body: baseline }));
    const vistas = page.locator('.uf-vistas');
    async function load(phase) {
      await page.goto(url + '?palette-probe=' + phase + '#universe-flight'); await vistas.waitFor({ state: 'visible' });
      const retry = page.getByRole('button', { name: 'Retry 3D view', exact: true });
      if (await retry.isVisible() && await page.evaluate(() => !!window.UniverseFlight?.create)) { await retry.click(); result.loaderRetried = true; save(); }
      await page.waitForFunction(() => { const button = document.querySelector('.uf-vista-list button:nth-child(5)'); return button && !button.disabled; });
      await page.addScriptTag({ path: path.join(repo, 'node_modules/axe-core/axe.min.js') });
    }
    await load('baseline');
    async function probe(name) {
      await vistas.scrollIntoViewIfNeeded(); await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const diagnostics = await page.evaluate(() => {
        const selectors = ['.uf-vistas', '.uf-vistas .uf-section-heading h3', '.uf-vistas .uf-section-heading .uf-eyebrow', '.uf-vistas .uf-section-heading > span', '.uf-vista-list button:nth-child(5)', '.uf-vista-list button:nth-child(5) strong', '.uf-vista-list button:nth-child(5) small'];
        return { forcedColors: matchMedia('(forced-colors: active)').matches, rows: selectors.map(selector => {
          const node = document.querySelector(selector), style = getComputedStyle(node), box = node.getBoundingClientRect();
          return { selector, text: node.innerText.slice(0, 140), color: style.color, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, borderColor: style.borderColor, forcedColorAdjust: style.forcedColorAdjust, box: { width: box.width, height: box.height } };
        }) };
      });
      const audit = await page.evaluate(async () => (await axe.run({ include: [['.uf-vistas']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(violation => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map(node => ({ target: node.target, html: node.html, failureSummary: node.failureSummary, checks: node.any.map(check => ({ id: check.id, data: check.data, message: check.message })) })) })));
      const image = 'palette-' + name + '.png'; await vistas.screenshot({ path: path.join(__dirname, image) });
      const record = { name, ...diagnostics, violations: audit, capture: image, captureHash: hash(fs.readFileSync(path.join(__dirname, image))) }; result.probes.push(record); save(); console.log(JSON.stringify({ name, forcedColors: record.forcedColors, violations: audit.map(item => item.id), rows: record.rows })); return record;
    }
    const normal = await probe('normal-baseline'); await page.emulateMedia({ forcedColors: 'active' }); const forced = await probe('forced-baseline');
    await page.unroute(route); const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/stem_lab/stem_tool_universe.js' && response.status() === 200);
    await load('candidate'); const response = await responsePromise; result.servedCandidateUiHash = hash(await response.body()); assert.equal(result.servedCandidateUiHash, pins['stem_lab/stem_tool_universe.js']); save();
    const candidate = await probe('forced-candidate');
    await page.emulateMedia({ forcedColors: 'none' }); const unchanged = await probe('normal-candidate');
    assert.equal(normal.captureHash, unchanged.captureHash, 'The media-only candidate preserves ordinary scenic pixels');
    assert.deepEqual(normal.rows, unchanged.rows, 'The media-only candidate preserves ordinary computed styles');
    assert.deepEqual(normal.violations, []); assert.deepEqual(candidate.violations, []); assert.ok(forced.violations.length > 0, 'The focused probe reproduces the baseline axe finding');
    assert.ok(candidate.rows.every(row => row.forcedColorAdjust === 'auto'));
    for (const [file, pin] of Object.entries(pins)) assert.equal(hash(fs.readFileSync(path.join(repo, file))), pin, 'Installed product files stay fixed during the staged probe');
    assert.deepEqual(result.errors, []); result.completed = true; save(); console.log(JSON.stringify({ completed: true, probes: result.probes.length, ordinaryPixelsIdentical: true, candidateViolations: 0 }));
  } catch (error) { result.failure = String(error); save(); throw error; } finally { await browser.close(); save(); }
}
main().catch(error => { result.failure = String(error); save(); console.error(error); process.exitCode = 1; });
