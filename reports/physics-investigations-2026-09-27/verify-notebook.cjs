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
      await page.setContent(sandbox.globalThis.makePhysicsPage({ file: 'physics', id: 'physics' }, theme));
      await page.waitForFunction(() => !!document.getElementById('physicsCanvas')?._launch);
      await page.evaluate(() => {
        const runs = Array.from({ length: 8 }, (_, i) => {
          const velocity = i === 7 ? 20 : 10;
          return { ...window.StemLab._physics.simulate(45, velocity, 9.8, false, 1),
            n: i + 1, angle: 45, vel: velocity, grav: 9.8, mass: 1, drag: false, modelVersion: 'projectile-v2' };
        });
        const P = window.StemLab._physics;
        window.__setReviewState(p => ({ ...p, physics: { ...p.physics, runLog: runs, runCount: 8, simSpeed: 0,
          modelComparison: { parameters: { angle: 45, velocity: 25, gravity: 9.8, mass: 1 },
            vacuum: P.simulate(45, 25, 9.8, false, 1), drag: P.simulate(45, 25, 9.8, true, 1) }
        } }));
      });
      const notebook = page.locator('[data-physics-investigations]');
      if (!(await notebook.evaluate(el => el.open))) await notebook.locator('summary').click();
      await notebook.locator('[data-physics-investigation-activity]').selectOption('speed_squared');
      await notebook.getByRole('checkbox', { name: 'Run 7', exact: true }).check();
      await notebook.getByRole('checkbox', { name: 'Run 8', exact: true }).check();
      await notebook.locator('#physics-investigation-title').fill('How does speed change range?');
      await notebook.locator('#physics-investigation-prediction').fill('I expect twice the speed to produce four times the range.');
      await notebook.locator('#physics-investigation-observation').fill('The measured ranges support a fourfold increase.');
      await notebook.locator('#physics-investigation-claim').fill('Range scales with speed squared when angle and gravity stay fixed and air drag is off.');
      await notebook.locator('[data-physics-investigation-save]').click();
      assert.match(await notebook.locator('[data-physics-investigation-report]').innerText(), /Run 8/);

      for (const width of [375, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await notebook.scrollIntoViewIfNeeded();
        const inspectPanel = root => {
          const lum = c => {
            const s = c.map(v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
            return .2126 * s[0] + .7152 * s[1] + .0722 * s[2];
          };
          const parse = text => {
            const match = text.match(/^rgba?\(([^)]+)\)$/);
            if (!match) return null;
            const values = match[1].split(',').map(Number);
            return { rgb: values.slice(0, 3), alpha: values[3] ?? 1 };
          };
          const background = el => {
            for (let node = el; node; node = node.parentElement) {
              const style = getComputedStyle(node), bg = parse(style.backgroundColor);
              if (style.backgroundImage !== 'none') return null;
              if (bg && bg.alpha >= .99) return bg.rgb;
            }
            return null;
          };
          const ratios = [];
          const fields = [];
          for (const node of root.querySelectorAll('summary,label,p,button,input,textarea,select,pre,span,div,th,td')) {
            if (node.getBoundingClientRect().height === 0 || node.disabled) continue;
            if (node.tagName === 'INPUT' && node.type === 'checkbox') continue;
            if (node.children.length && !['SELECT', 'BUTTON'].includes(node.tagName)) continue;
            const style = getComputedStyle(node), fg = parse(style.color), bg = background(node);
            if (fg && bg) {
              const l1 = lum(fg.rgb), l2 = lum(bg);
              ratios.push({ text: (node.textContent || node.getAttribute('aria-label') || node.id).slice(0, 60), ratio: (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05) });
            }
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)) fields.push({ id: node.id, width: node.getBoundingClientRect().width, font: parseFloat(style.fontSize) });
          }
          return { overflow: document.documentElement.scrollWidth - innerWidth, notebookOverflow: root.scrollWidth - root.clientWidth,
            checked: ratios.length, worst: ratios.sort((a, b) => a.ratio - b.ratio)[0], fields };
        };
        const measurements = await notebook.evaluate(inspectPanel);
        assert(measurements.overflow <= 1, 'Document overflow: ' + JSON.stringify(measurements));
        assert(measurements.notebookOverflow <= 1, 'Notebook overflow: ' + JSON.stringify(measurements));
        assert(measurements.checked >= 20);
        assert(measurements.worst.ratio >= 4.5, theme + ' text contrast: ' + JSON.stringify(measurements.worst));
        assert(measurements.fields.every(field => field.font >= 14));
        const screenshot = `notebook-${theme}-${width}.png`;
        await notebook.screenshot({ path: path.join(__dirname, screenshot) });
        const models = page.locator('[data-physics-model-comparison]');
        const modelMeasurements = await models.evaluate(inspectPanel);
        assert(modelMeasurements.notebookOverflow <= 1, 'Model comparison overflow: ' + JSON.stringify(modelMeasurements));
        assert(modelMeasurements.checked >= 15);
        assert(modelMeasurements.worst.ratio >= 4.5, theme + ' model text contrast: ' + JSON.stringify(modelMeasurements.worst));
        const modelScreenshot = `models-${theme}-${width}.png`;
        await models.screenshot({ path: path.join(__dirname, modelScreenshot) });
        results.push({ theme, width, measurements, modelMeasurements, screenshot, modelScreenshot });
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'visual-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
