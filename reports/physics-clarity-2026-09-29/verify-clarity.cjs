// Run from the repository root after source, strings, and desktop mirror are ready.
// This audit uses real React, application styles, translations, and a deterministic
// animation clock. It records screenshots and checks layout without a live server.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');

let source = fs.readFileSync('reports/physics-deep-review-2026-09-27/preview-harness.cjs', 'utf8');
source = source
  .replace('window.__reviewState = pair[0]; var ctx = {', 'window.__reviewState = pair[0]; window.__setReviewState = pair[1]; var ctx = {');
source += '\nglobalThis.makePhysicsPage = html;';
const sandbox = { require, console, __dirname, globalThis: {} };
vm.runInNewContext(source, sandbox);

const hash = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
const sourceFile = 'stem_lab/stem_tool_physics.js';
const sourceHash = hash(fs.readFileSync(sourceFile));
const expectedParameters = { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true, modelVersion: 'projectile-v3' };
const configurations = [];
const failures = [];
let auditComplete = false;

async function tick(page) {
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas');
    cv._physScheduleFrame();
    window.__clarityTick();
  });
}

async function patchState(page, patch) {
  await page.evaluate(next => window.__setReviewState(previous => ({ ...previous, physics: { ...previous.physics, ...next } })), patch);
  await page.waitForTimeout(60);
  await tick(page);
}

async function textAudit(page, selectors) {
  return page.evaluate(scopeSelectors => {
    const pixel = document.createElement('canvas'); pixel.width = pixel.height = 1;
    const paint = pixel.getContext('2d');
    const rgba = value => { paint.clearRect(0, 0, 1, 1); paint.fillStyle = value; paint.fillRect(0, 0, 1, 1); return [...paint.getImageData(0, 0, 1, 1).data]; };
    const luminance = values => values.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((v, c, i) => v + c * [.2126, .7152, .0722][i], 0);
    const readings = [];
    const seen = new Set();
    for (const root of document.querySelectorAll(scopeSelectors.join(','))) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const element = node.parentElement;
        if (seen.has(node) || !node.textContent.trim() || !element || !element.getClientRects().length ||
            element.closest('.sr-only,[aria-hidden="true"],button:disabled') || getComputedStyle(element).visibility === 'hidden') continue;
        seen.add(node);
        const style = getComputedStyle(element), foreground = rgba(style.color);
        let background = null;
        for (let parent = element; parent; parent = parent.parentElement) {
          const color = rgba(getComputedStyle(parent).backgroundColor);
          if (color[3] === 255) { background = color; break; }
        }
        if (!background) throw Error('No opaque background for ' + node.textContent.trim());
        const a = luminance(foreground), b = luminance(background);
        readings.push({ text: node.textContent.trim().slice(0, 90), font: parseFloat(style.fontSize), fontFamily: style.fontFamily,
          contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05), foreground: style.color, background });
      }
    }
    return readings;
  }, selectors);
}

function assertText(readings, name) {
  assert(readings.length >= 3, name + ' has too few measurable text nodes');
  assert(readings.every(item => item.font >= 11.99), name + ' typography below 12px: ' + JSON.stringify(readings.filter(item => item.font < 11.99)));
  assert(readings.every(item => item.contrast >= 4.5), name + ' contrast below 4.5:1: ' + JSON.stringify(readings.filter(item => item.contrast < 4.5)));
  return { checked: readings.length, minFont: Math.min(...readings.map(item => item.font)), minContrast: Math.min(...readings.map(item => item.contrast)), readings };
}

async function capture(page, file, selector) {
  await page.locator(selector).screenshot({ path: path.join(__dirname, file), animations: 'disabled' });
  return file;
}

async function captureOpening(page, theme, width) {
  // Measure initial reachability at 900px before making a taller screenshot.
  // Increasing only height keeps container-query layout unchanged.
  await page.evaluate(() => window.scrollTo(0, 0));
  const height = await page.locator('[data-physics-plot-key]').evaluate(element => Math.ceil(element.getBoundingClientRect().bottom + 12));
  await page.setViewportSize({ width, height: Math.max(900, height) });
  await page.waitForTimeout(60);
  await tick(page);
  const file = `clarity-${theme}-${width}-opening.png`;
  await page.screenshot({ path: path.join(__dirname, file), clip: { x: 0, y: 0, width, height }, animations: 'disabled' });
  await page.setViewportSize({ width, height: 900 });
  await page.waitForTimeout(60);
  await tick(page);
  return file;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const theme of ['default', 'dark', 'contrast']) {
      for (const width of [1100, 375, 320]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        try {
          await page.evaluate(() => {
            let id = 0, now = 1000;
            const frames = new Map();
            window.requestAnimationFrame = callback => { frames.set(++id, callback); return id; };
            window.cancelAnimationFrame = key => frames.delete(key);
            window.__clarityTick = () => {
              now += 1000 / 60;
              const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback(now));
            };
          });
          await page.setContent(sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
          await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch, null, { polling: 20 });
          await tick(page);
          await page.evaluate(() => window.scrollTo(0, 0));
          const initial = await page.evaluate(() => {
            const bounds = selector => { const rect = document.querySelector(selector).getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom }; };
            const visible = element => !!element && !!element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden';
            return {
              viewportHeight: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth,
              header: bounds('[data-physics-command]'), toolbar: bounds('[data-physics-primary-controls]'), launch: bounds('[data-physics-launch]'), scene: bounds('#physics-fs-wrap'),
              launchCount: document.querySelectorAll('[data-physics-launch]').length,
              recommendedCount: document.querySelectorAll('[data-physics-next-cta]').length,
              guidanceVisible: visible(document.querySelector('[data-physics-header-guidance]')),
              toggleVisible: visible(document.querySelector('[data-physics-header-guidance-toggle]')),
              guideExpanded: document.querySelector('[data-physics-header-guidance-toggle]').getAttribute('aria-expanded'),
            };
          });
          assert(initial.overflow <= 1, `Initial page overflow: ${theme} ${width}`);
          assert(initial.header.width > 0 && initial.scene.width > 0, 'Embedded host collapsed the physics root');
          assert.equal(initial.launchCount, 1); assert.equal(initial.recommendedCount, 1);
          assert(initial.launch.y >= 0 && initial.launch.bottom <= initial.viewportHeight, 'Launch is not initially visible');
          assert(initial.launch.bottom <= initial.scene.y && initial.toolbar.bottom <= initial.scene.y, 'Launch toolbar is below the scene');
          if (width <= 375) {
            assert(initial.header.height <= 250, `Phone header is ${initial.header.height}px tall`);
            assert(initial.toggleVisible && !initial.guidanceVisible && initial.guideExpanded === 'false', 'Phone guide must begin collapsed');
          } else assert(!initial.toggleVisible && initial.guidanceVisible, 'Desktop guidance must remain expanded');
          const initialText = assertText(await textAudit(page, ['[data-physics-primary-controls]', '[data-physics-plot-key]', '[data-physics-next-cta]', '[data-physics-header-guidance-toggle]']), 'Opening controls');
          const screenshots = [await captureOpening(page, theme, width), await capture(page, `clarity-${theme}-${width}-header.png`, '[data-physics-command]')];
          if (width <= 375) {
            await page.locator('[data-physics-header-guidance-toggle]').focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('[data-physics-header-guidance-toggle]').getAttribute('aria-expanded'), 'true');
            assert(await page.locator('[data-physics-header-guidance]').isVisible(), 'Expanded guidance is hidden');
            assert.equal(await page.locator('[data-physics-header-guidance] .phys-pathway li').count(), 3);
            for (const detail of await page.locator('[data-physics-header-guidance] .phys-pathway-detail').all()) assert(await detail.isVisible(), 'An expanded pathway explanation is hidden');
            screenshots.push(await capture(page, `clarity-${theme}-${width}-guide-expanded.png`, '[data-physics-command]'));
            assertText(await textAudit(page, ['.phys-guidance-copy', '.phys-pathway-detail']), 'Expanded phone guidance');
            await page.locator('[data-physics-header-guidance-toggle]').click();
            assert.equal(await page.locator('[data-physics-header-guidance-toggle]').getAttribute('aria-expanded'), 'false');
          }

          await patchState(page, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true,
            simSpeed: 1, showGraphs: true, showFlightData: true, showEnergy: true, showVectors: true });
          await page.getByRole('button', { name: 'Launch!', exact: true }).click();
          const original = await page.evaluate(() => {
            const cv = document.getElementById('physicsCanvas'); let count = 0;
            while (cv._launched && count++ < 20000) window.__clarityTick();
            if (cv._launched) throw Error('Flight did not complete');
            const trail = cv._trails.at(-1);
            return { samples: [...trail], ball: { ...cv._ball }, parameters: { ...trail.parameters }, modelVersion: trail.modelVersion };
          });
          await page.waitForFunction(() => !!window.__reviewState.physics.lastFlight, null, { polling: 20 });
          await patchState(page, { simSpeed: 0, angle: 5, velocity: 5, gravity: 1, mass: 9, launchHeight: 0, airResist: false });
          screenshots.push(await capture(page, `clarity-${theme}-${width}-completed-current-settings.png`, '#physics-fs-wrap'));
          await page.locator('[data-physics-inspect]').click();
          await page.waitForFunction(() => document.activeElement?.matches('[data-physics-sample-slider]'), null, { polling: 20 });
          await page.locator('[data-physics-sample-jump="highest"]').click();
          await tick(page);
          await page.locator('[data-physics-sample-forces] > summary').click();
          const evidence = await page.evaluate(() => {
            const cv = document.getElementById('physicsCanvas'), selection = cv._inspection.snapshot;
            const summary = document.querySelector('[data-physics-flight-summary]');
            const table = document.querySelector('[data-physics-flight-table-wrap]');
            const selectedRow = table.querySelector('tr[data-selected="true"]');
            return {
              overflow: document.documentElement.scrollWidth - innerWidth,
              samples: [...cv._trails.at(-1)], ball: { ...cv._ball }, snapshot: selection,
              marker: cv._visualInspection, view: cv._launchView,
              graph: [...document.querySelectorAll('[data-physics-graph-marker]')].map(element => ({ field: element.dataset.physicsGraphMarker, t: Number(element.dataset.time), index: Number(element.dataset.sampleIndex), value: Number(element.dataset.value) })),
              table: { indices: [...table.querySelectorAll('[data-physics-sample-index]')].map(element => Number(element.dataset.physicsSampleIndex)), selectedIndex: Number(selectedRow?.querySelector('button')?.dataset.physicsSampleIndex), width: table.clientWidth, scrollWidth: table.scrollWidth, height: table.clientHeight, scrollHeight: table.scrollHeight },
              summary: { kind: summary.dataset.physicsFlightSummary, index: Number(summary.dataset.sampleIndex), t: Number(summary.dataset.time), values: Object.fromEntries([...summary.querySelectorAll('[data-physics-flight-summary-value]')].map(element => [element.dataset.physicsFlightSummaryValue, element.textContent])) },
            };
          });
          assert(evidence.overflow <= 1, `Selected page overflow: ${theme} ${width}`);
          assert.deepEqual(evidence.samples, original.samples); assert.deepEqual(evidence.ball, original.ball);
          assert.deepEqual(evidence.snapshot.parameters, expectedParameters);
          const highest = original.samples.reduce((best, point, index, points) => point.mY > points[best].mY ? index : best, 0);
          assert.equal(evidence.snapshot.index, highest);
          assert.equal(evidence.marker.index, highest);
          assert(Math.abs(evidence.marker.x - evidence.view.x - evidence.snapshot.x * evidence.view.scale) < 1e-8);
          assert(Math.abs(evidence.marker.y - evidence.view.groundY + evidence.snapshot.y * evidence.view.scale) < 1e-8);
          assert.equal(evidence.graph.length, 2);
          for (const graph of evidence.graph) { assert.equal(graph.index, highest); assert.equal(graph.t, evidence.snapshot.t); assert.equal(graph.value, evidence.snapshot[graph.field]); }
          assert(evidence.table.indices.includes(0) && evidence.table.indices.includes(original.samples.length - 1) && evidence.table.indices.includes(highest));
          assert.equal(evidence.table.selectedIndex, highest);
          assert.equal(evidence.summary.kind, 'selected'); assert.equal(evidence.summary.index, highest); assert.equal(evidence.summary.t, evidence.snapshot.t);
          for (const [key, field, unit] of [['height', 'y', 'm'], ['vx', 'vx', 'm/s'], ['vy', 'vy', 'm/s'], ['speed', 'speed', 'm/s']]) assert.equal(evidence.summary.values[key], evidence.snapshot[field].toFixed(2) + ' ' + unit);
          const selectedText = assertText(await textAudit(page, ['[data-physics-sample-inspector]', '[data-physics-flight-data]', '[data-physics-plot-key]', '[data-physics-graph-time-control]']), 'Recorded sample and table');
          for (const [name, selector] of [['selected-canvas', '#physics-fs-wrap'], ['inspector', '[data-physics-sample-inspector]'], ['flight-table', '[data-physics-flight-data]'], ['graph-time', '[data-physics-graph-time-control]'], ['component-graphs', '[data-physics-component-graphs]']]) screenshots.push(await capture(page, `clarity-${theme}-${width}-${name}.png`, selector));
          if (width <= 375) {
            await page.locator('[data-physics-flight-table-wrap]').evaluate(element => { element.scrollLeft = element.scrollWidth; });
            screenshots.push(await capture(page, `clarity-${theme}-${width}-flight-table-right.png`, '[data-physics-flight-data]'));
          }
          assert.deepEqual(errors, []);
          configurations.push({ theme, width, initial, initialText, selectedText, samples: original.samples.length, evidenceSha256: hash(original.samples), evidenceUnchanged: true,
            snapshot: evidence.snapshot, marker: evidence.marker, graph: evidence.graph, table: evidence.table, summary: evidence.summary, selectedOverflow: evidence.overflow, screenshots, pageErrors: errors });
          console.log(`Verified clarity ${theme} at ${width}px`);
        } catch (error) {
          failures.push({ theme, width, message: error.message, pageErrors: errors });
          await page.screenshot({ path: path.join(__dirname, `clarity-${theme}-${width}-failure.png`), fullPage: false }).catch(() => {});
          throw error;
        } finally { await page.close(); }
      }
    }
    assert.equal(hash(fs.readFileSync(sourceFile)), sourceHash, 'Physics source changed while the audit was running');
    auditComplete = true;
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(__dirname, 'clarity-results.json'), JSON.stringify({ createdAt: new Date().toISOString(), sourceSha256: sourceHash, passed: auditComplete && configurations.length === 9 && failures.length === 0, configurations, failures }, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
