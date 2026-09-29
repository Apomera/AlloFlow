const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

let source = fs.readFileSync('reports/physics-deep-review-2026-09-27/preview-harness.cjs', 'utf8');
source = source
  .replace('window.__reviewState = pair[0]; var ctx = {', 'window.__reviewState = pair[0]; window.__setReviewState = pair[1]; var ctx = {');
source += '\nglobalThis.makePhysicsPage = html;';
const sandbox = { require, console, __dirname, globalThis: {} };
vm.runInNewContext(source, sandbox);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const theme of ['default', 'dark', 'contrast']) {
      const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 2 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.evaluate(() => {
        let id = 0, now = 1000;
        const frames = new Map();
        window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
        window.cancelAnimationFrame = key => frames.delete(key);
        window.__inspectionTick = () => {
          now += 1000 / 60;
          const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
        };
      });
      await page.setContent(sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch, null, { polling: 20 });
      await page.evaluate(() => window.__setReviewState(p => ({ ...p, physics: { ...p.physics,
        angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true,
        simSpeed: 1, showGraphs: true, showFlightData: true, showEnergy: true, showVectors: true, showFormulas: true,
      } })));
      await page.waitForTimeout(60);
      await page.getByRole('button', { name: 'Launch!', exact: true }).click();
      const original = await page.evaluate(() => {
        const cv = document.getElementById('physicsCanvas'); let count = 0;
        while (cv._launched && count++ < 20000) window.__inspectionTick();
        if (cv._launched) throw Error('Flight did not complete');
        return { samples: [...cv._trails.at(-1)], ball: { ...cv._ball } };
      });
      await page.evaluate(() => window.__setReviewState(p => ({ ...p, physics: { ...p.physics,
        simSpeed: 0, angle: 5, velocity: 5, gravity: 1, mass: 9, launchHeight: 0, airResist: false,
      } })));
      await page.waitForTimeout(60);
      await page.locator('[data-physics-inspect]').click();
      await page.locator('[data-physics-sample-jump="highest"]').click();
      for (const width of [1100, 375, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(60);
        await page.evaluate(() => { document.getElementById('physicsCanvas')._physScheduleFrame(); window.__inspectionTick(); });
        const measures = await page.evaluate(() => {
          const cv = document.getElementById('physicsCanvas');
          const snapshot = cv._inspection.snapshot;
          const pixel = document.createElement('canvas'); pixel.width = pixel.height = 1;
          const paint = pixel.getContext('2d');
          const rgba = value => { paint.clearRect(0, 0, 1, 1); paint.fillStyle = value; paint.fillRect(0, 0, 1, 1); return [...paint.getImageData(0, 0, 1, 1).data]; };
          const luminance = values => values.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((v, c, i) => v + c * [.2126, .7152, .0722][i], 0);
          const text = [...document.querySelectorAll('[data-physics-sample-inspector] *, [data-physics-flight-data] *')].filter(el =>
            !el.children.length && el.textContent.trim() && el.getBoundingClientRect().height > 0 && !el.closest('.sr-only') && !el.disabled
          ).map(el => {
            const style = getComputedStyle(el), fg = rgba(style.color);
            let bg;
            for (let parent = el; parent; parent = parent.parentElement) { bg = rgba(getComputedStyle(parent).backgroundColor); if (bg[3] === 255) break; }
            const a = luminance(fg), b = luminance(bg);
            return { text: el.textContent.slice(0, 60), font: parseFloat(style.fontSize), contrast: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
          });
          return {
            overflow: document.documentElement.scrollWidth - innerWidth,
            text, snapshot, marker: cv._visualInspection, view: cv._launchView,
            samples: [...cv._trails.at(-1)], ball: { ...cv._ball },
            graph: [...document.querySelectorAll('[data-physics-graph-marker]')].map(el => ({
              field: el.dataset.physicsGraphMarker, t: Number(el.dataset.time), index: Number(el.dataset.sampleIndex), value: Number(el.dataset.value),
            })),
            tableIndices: [...document.querySelectorAll('[data-physics-sample-index]')].map(el => Number(el.dataset.physicsSampleIndex)),
          };
        });
        assert(measures.overflow <= 1, 'Page overflows: ' + theme + ' ' + width);
        assert(measures.text.length > 25 && measures.text.every(t => t.font >= 12), 'Inspector typography: ' + JSON.stringify(measures.text.filter(t => t.font < 12)));
        assert(measures.text.every(t => t.contrast >= 4.5), 'Inspector contrast: ' + JSON.stringify(measures.text.filter(t => t.contrast < 4.5)));
        assert.deepEqual(measures.samples, original.samples);
        assert.deepEqual(measures.ball, original.ball);
        assert.deepEqual(measures.snapshot.parameters, { angle: 35, velocity: 35, gravity: 9.8, mass: 2, launchHeight: 10, airResist: true, modelVersion: 'projectile-v3' });
        assert.equal(measures.marker.index, measures.snapshot.index);
        assert(Math.abs(measures.marker.x - measures.view.x - measures.snapshot.x * measures.view.scale) < 1e-8);
        assert(Math.abs(measures.marker.y - measures.view.groundY + measures.snapshot.y * measures.view.scale) < 1e-8);
        assert.equal(measures.graph.length, 2);
        for (const graph of measures.graph) {
          assert.equal(graph.index, measures.snapshot.index);
          assert.equal(graph.t, measures.snapshot.t);
          assert.equal(graph.value, measures.snapshot[graph.field]);
        }
        assert(measures.tableIndices.includes(0) && measures.tableIndices.includes(original.samples.length - 1));
        const screenshots = [];
        for (const [name, selector] of [['canvas', '#physics-fs-wrap'], ['inspector', '[data-physics-sample-inspector]'], ['graphs', '[data-physics-motion-panel]'], ['data', '[data-physics-flight-data]']]) {
          const file = `inspection-${theme}-${width}-${name}.png`;
          await page.locator(selector).screenshot({ path: path.join(__dirname, file), animations: 'disabled' });
          screenshots.push(file);
        }
        results.push({ theme, width, minFont: Math.min(...measures.text.map(t => t.font)), minContrast: Math.min(...measures.text.map(t => t.contrast)), overflow: measures.overflow,
          snapshot: measures.snapshot, marker: measures.marker, graph: measures.graph, tableIndices: measures.tableIndices, screenshots });
        console.log(`Verified inspection ${theme} at ${width}px`);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'inspection-results.json'), JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
