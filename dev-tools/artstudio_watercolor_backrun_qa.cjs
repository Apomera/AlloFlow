const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = p => fs.readFileSync(p, 'utf8'), out = path.resolve('reports/artstudio-workspace');
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var ctx = { React: React', 'window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React');
(async () => {
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto('about:blank');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_artstudio.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: shell });
    await page.evaluate(() => __mount('artStudio', false, { tab: 'watercolor', studioStarted: true, studioHome: false, watercolorFlowDirection: 'none', watercolorDrying: 0, watercolorHumidity: 100, watercolorAirflow: 0, watercolorSize: 48 }));
    const canvas = page.locator('#watercolorCanvas'); await canvas.waitFor();
    const experiment = await canvas.evaluate(node => {
      const e = node._watercolorEngine; e.togglePause();
      const params = { color: { r: .18, g: .43, b: .69 }, brush: 'water', surface: 'wet', flowDirection: 'none', touchMode: 'scroll', showWetness: false, showFlow: false, size: 48, water: 1, pigment: .68, paper: .48, granulation: 0, bleed: .62, absorption: 0, drying: 0, flowStrength: 0, staining: .35, opacity: .1, mobility: .65, separation: 0, rewetting: .48, humidity: 1, airflow: 0, sizing: 1, bloomSensitivity: 1 };
      const seed = e.captureState();
      for (let i = 0; i < seed.water.length; i++) {
        const radius = Math.hypot(i % seed.simWidth - 96, Math.floor(i / seed.simWidth) - 96); if (radius > 36) continue;
        const m = .52; seed.water[i] = .28 + .85 * Math.max(0, 1 - radius * radius / 324); seed.pigmentDensity[i] = m;
        for (const [channel, fraction] of [['R', .18], ['G', .43], ['B', .69]]) { seed['pigment' + channel][i] = m * fraction; seed['pigmentMobility' + channel + 'Mass'][i] = m * fraction * .65; }
        seed.pigmentStainingMass[i] = m * .35; seed.pigmentOpacityMass[i] = m * .1; seed.pigmentMobilityMass[i] = m * .65;
      }
      function measure(state) {
        let core = 0, rim = 0, total = 0;
        state.pigmentDensity.forEach((v, i) => { const m = v + state.stainDensity[i], r = Math.hypot(i % state.simWidth - 96, Math.floor(i / state.simWidth) - 96); total += m; if (r < 15) core += m; if (r >= 17 && r < 25) rim += m; });
        return { core, rim, total };
      }
      e.configure(params); e.restoreState(seed); const before = e.captureExport();
      e.configure({ ...params, bloomSensitivity: 0 }); e.advanceSimulation(45); const quiet = { ...measure(e.captureState()), png: e.captureExport() };
      e.configure(params); e.restoreState(seed); e.advanceSimulation(45); const responsive = { ...measure(e.captureState()), png: e.captureExport() };
      window.__watercolorBackrunState = e.captureState();
      // Compact wet-state round-trip must retain the evolved painting and flow fields.
      const compact = e.captureState(true); e.clear(); e.restoreState(compact); const restored = measure(e.captureState());
      return { before, quiet, responsive, restored, initial: measure(seed), compactVersion: compact.version };
    });
    assert(experiment.responsive.core < experiment.quiet.core * .98); assert(experiment.responsive.rim > experiment.quiet.rim * 1.02);
    assert(Math.abs(experiment.responsive.total / experiment.initial.total - 1) < .00001);
    assert(Math.abs(experiment.restored.total / experiment.responsive.total - 1) < .001);
    for (const [file, png] of [['watercolor-backrun-before.png', experiment.before], ['watercolor-backrun-quiet.png', experiment.quiet.png], ['watercolor-backrun-after.png', experiment.responsive.png]]) fs.writeFileSync(path.join(out, file), Buffer.from(png.split(',')[1], 'base64'));
    checks.push({ backrun: { initial: experiment.initial, quiet: { ...experiment.quiet, png: undefined }, responsive: { ...experiment.responsive, png: undefined }, restored: experiment.restored, compactVersion: experiment.compactVersion } });
    // Exercise the actual tray and load button, including profile transfer.
    const paintBeforeTray = await canvas.evaluate(node => node._watercolorEngine.captureExport());
    await page.locator('#artstudio-watercolor-mixing-tray').evaluate(node => { node.closest('details').open = true; });
    await page.locator('#artstudio-watercolor-mix-a').selectOption('ultramarine'); await page.locator('#artstudio-watercolor-mix-b').selectOption('ochre');
    const swatch = await page.locator('#artstudio-watercolor-mixing-tray [role="img"]').evaluate(node => getComputedStyle(node).backgroundColor);
    await page.locator('#artstudio-watercolor-load-mixture').click();
    const loaded = await page.evaluate(() => { const d = __state.artStudio, c = document.createElement('canvas'), ctx = c.getContext('2d'); ctx.fillStyle = d.watercolorColor; return { color: ctx.fillStyle, granulation: d.watercolorGranulation, staining: d.watercolorStaining, opacity: d.watercolorOpacity, mobility: d.watercolorMobility }; });
    const rgb = loaded.color.match(/\w\w/g).map(hex => parseInt(hex, 16)); assert.equal(swatch, 'rgb(' + rgb.join(', ') + ')');
    assert.deepEqual([loaded.granulation, loaded.staining, loaded.opacity, loaded.mobility], [67, 38, 53, 48]); checks.push({ tray: loaded });
    // Loading a new paint must not recolor the existing wash.
    assert.equal(await canvas.evaluate(node => node._watercolorEngine.captureExport()), paintBeforeTray);
    checks.push('Loading a mixture leaves the existing rendered painting unchanged');
    await page.locator('#artstudio-watercolor-mixing-tray').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'watercolor-mixing-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#artstudio-watercolor-mixing-tray').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const trayTargets = await page.locator('#artstudio-watercolor-mixing-tray').evaluate(node => [...node.querySelectorAll('input,select,button')].map(control => ({ id: control.id, height: control.getBoundingClientRect().height })));
    assert(trayTargets.every(control => control.height >= 44)); checks.push({ phoneTrayTargets: trayTargets });
    await page.screenshot({ path: path.join(out, 'watercolor-mixing-phone.png') }); checks.push('Phone mixing tray has no horizontal overflow');
    const sheet = await browser.newPage({ viewport: { width: 1440, height: 650 } });
    await sheet.setContent('<html><body style="margin:0;padding:24px;font:16px system-ui;background:#f1f5f9;color:#0f172a"><h1 style="font-size:24px;margin:0 0 8px">Watercolor: fresh water entering a damp wash</h1><p style="margin:0 0 20px">Same pigment budget, paper, water, and elapsed simulation steps. The moisture gradient redistributes mobile color.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">' + [['Fresh water added', experiment.before], ['Bloom response: 0%', experiment.quiet.png], ['Bloom response: 100%', experiment.responsive.png]].map(([label, png]) => '<figure style="margin:0;background:white;padding:12px;border-radius:12px"><figcaption style="font-weight:700;margin-bottom:8px">' + label + '</figcaption><img src="' + png + '" style="width:100%;display:block" /></figure>').join('') + '</div></body></html>');
    await sheet.screenshot({ path: path.join(out, 'watercolor-backrun-comparison.png') }); await sheet.close();
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'watercolor-backrun-browser-results.json'), JSON.stringify({ passed: true, checks, errors }, null, 2)); console.log(JSON.stringify({ passed: true, checks }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'watercolor-backrun-browser-results.json'), JSON.stringify({ passed: false, checks, errors, failure: String(error) }, null, 2));
    await page.screenshot({ path: path.join(out, 'watercolor-backrun-failure.png') }); throw error;
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
