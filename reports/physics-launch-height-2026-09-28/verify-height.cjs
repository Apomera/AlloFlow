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
      const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.evaluate(() => {
        let id = 0, now = 1000;
        const frames = new Map();
        window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
        window.cancelAnimationFrame = key => frames.delete(key);
        window.__tickHeight = () => {
          now += 1000 / 60;
          const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
        };
      });
      await page.setContent(sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme), { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch, null, { polling: 20 });
      await page.evaluate(() => window.__setReviewState(p => ({ ...p, physics: { ...p.physics,
        angle: 0, velocity: 15, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false,
        simSpeed: 0, showFormulas: true, showGraphs: true, showEnergy: true, showVectors: true,
      } })));
      await page.waitForTimeout(60);
      await page.getByRole('button', { name: 'Launch!', exact: true }).click();
      await page.locator('[data-physics-step]').click();
      await page.evaluate(() => window.__tickHeight());
      await page.locator('[data-physics-inspect]').click();
      for (const width of [1100, 375, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(60);
        await page.evaluate(() => { for (let i = 0; i < 3; i++) window.__tickHeight(); });
        const measures = await page.evaluate(() => {
          const cv = document.getElementById('physicsCanvas');
          const controls = document.querySelector('[data-physics-sliders]');
          const formulas = document.querySelector('[data-physics-formulas]');
          const pixel = document.createElement('canvas'); pixel.width = pixel.height = 1;
          const paint = pixel.getContext('2d');
          const color = value => { paint.clearRect(0, 0, 1, 1); paint.fillStyle = value; paint.fillRect(0, 0, 1, 1); return [...paint.getImageData(0, 0, 1, 1).data]; };
          const luminance = values => values.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((v, c, i) => v + c * [.2126, .7152, .0722][i], 0);
          const formulaContrast = [...formulas.querySelectorAll('p,span,div')].filter(el => !el.children.length && el.textContent.trim()).map(el => {
            const fg = color(getComputedStyle(el).color);
            let bg;
            for (let p = el; p; p = p.parentElement) { bg = color(getComputedStyle(p).backgroundColor); if (bg[3] === 255) break; }
            const a = luminance(fg), b = luminance(bg);
            return { text: el.textContent.slice(0, 50), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
          }).sort((a, b) => a.ratio - b.ratio);
          return { overflow: document.documentElement.scrollWidth - innerWidth,
            canvas: { width: cv.clientWidth, height: cv.clientHeight }, view: cv._launchView,
            ball: { y: cv._ball.mY, t: cv._ball.t, E0: cv._ball.E0 },
            controlsOverflow: controls.scrollWidth - controls.clientWidth,
            formulasOverflow: formulas.scrollWidth - formulas.clientWidth,
            fieldFonts: [...controls.querySelectorAll('input')].map(el => parseFloat(getComputedStyle(el).fontSize)),
            formulaContrast,
            formulaText: formulas.innerText, optimum: Number(document.querySelector('[data-physics-graph="range"]').dataset.optimumAngle),
          };
        });
        assert(measures.overflow <= 1, 'Document overflow: ' + JSON.stringify(measures));
        assert(measures.controlsOverflow <= 1 && measures.formulasOverflow <= 1);
        assert(measures.fieldFonts.every(n => n >= 14));
        assert(measures.formulaContrast.length >= 12 && measures.formulaContrast[0].ratio >= 4.5, 'Formula contrast: ' + JSON.stringify(measures.formulaContrast[0]));
        assert(measures.view.height === 10 && measures.view.y > 40 && measures.view.y < measures.view.groundY);
        assert(Math.abs(measures.view.groundY - measures.view.y - 10 * measures.view.scale) < 1e-8);
        assert(Math.abs(measures.ball.y - (10 - 0.5 * 9.8 * 0.035 ** 2)) < 1e-10);
        assert.equal(measures.ball.t, 0.035);
        assert.equal(measures.ball.E0, 421);
        assert(measures.optimum < 45 && measures.optimum > 0);
        const screenshots = [];
        for (const [name, selector] of [['canvas', '#physics-fs-wrap'], ['controls', '[data-physics-sliders]'], ['formulas', '[data-physics-formulas]'], ['range', '[data-physics-graph="range"]']]) {
          const file = `height-${theme}-${width}-${name}.png`;
          await page.locator(selector).screenshot({ path: path.join(__dirname, file), animations: 'disabled' });
          screenshots.push(file);
        }
        results.push({ theme, width, measures, screenshots });
        console.log(`Verified ${theme} at ${width}px`);
      }
      await page.setViewportSize({ width: 1100, height: 900 });
      await page.evaluate(() => window.__setReviewState(p => ({ ...p, physics: { ...p.physics,
        angle: 35, velocity: 15, launchHeight: 50, airResist: true, simSpeed: 1,
      } })));
      await page.waitForTimeout(60);
      await page.getByRole('button', { name: 'Launch!', exact: true }).click();
      const landing = await page.evaluate(() => {
        const cv = document.getElementById('physicsCanvas'); let count = 0;
        while (cv._launched && count++ < 20000) window.__tickHeight();
        return { landed: !cv._launched, y: cv._ball.mY, height: cv._trails.at(-1).parameters.launchHeight };
      });
      assert.deepEqual(landing, { landed: true, y: 0, height: 50 });
      await page.waitForTimeout(60);
      await page.locator('#physics-fs-wrap').screenshot({ path: path.join(__dirname, `height-${theme}-landed.png`) });
      await page.locator('[data-physics-last-flight]').screenshot({ path: path.join(__dirname, `height-${theme}-last-flight.png`) });
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results.map(r => ({ theme: r.theme, width: r.width, overflow: r.measures.overflow, platformHeightPixels: r.measures.view.groundY - r.measures.view.y, optimumAngle: r.measures.optimum }))));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
