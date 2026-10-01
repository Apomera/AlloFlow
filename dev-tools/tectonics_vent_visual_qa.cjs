'use strict';
// Local visual review: real React + WebGL, no remote assets.
const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = p => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
(async () => {
  const phase = process.argv[2] || 'after';
  const out = path.join(process.cwd(), 'scratch', 'tectonics-vent-refinement');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1180, height: 950 }, reducedMotion: 'reduce' });
    page.setDefaultTimeout(60000);
    const errors = [], shots = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Volcano cutaway visual review</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.evaluate(() => {
      window.__realRAF = window.requestAnimationFrame.bind(window); window.__heldFrames = [];
      window.requestAnimationFrame = fn => window.__holdFrames ? (window.__heldFrames.push(fn), 0) : window.__realRAF(fn);
    });
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const p of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'stem_lab/stem_lab_module.js']) await page.addScriptTag({ content: read(p) });
    await page.evaluate(() => { StemLab.ensureThree = () => Promise.resolve(THREE); StemLab.loadScriptResilient = () => new Promise(() => {}); });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_platetectonics.js') });
    await page.evaluate(() => {
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      window.mountVent = dark => {
        const noop = () => {};
        function Host() {
          const [data, setData] = React.useState({ plateTectonics: { simTab: 'sim', ptDrift: false, ptVent3D: true } });
          window.ventSet = setData;
          return StemLab._registry.plateTectonics.render({ React, toolData: data, setToolData: setData, isDark: dark, isContrast: false, icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [], addToast: noop, announceToSR: noop, awardXP: noop,
            getXP: () => 0, beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: f => ({ onClick: f }), t: (k, f) => f == null ? k : f,
            props: {}, srOnly: {}, gradeLevel: '7th Grade', callGemini: null });
        }
        document.documentElement.classList.toggle('dark', dark);
        document.body.style.background = dark ? '#0f172a' : '#f1f5f9';
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
      };
      mountVent(false);
    });
    const canvas = page.locator('[data-pt-vent-gl="true"]');
    async function shot(name, magma = 'andesite', camera = [-7, -17], cut = 0) {
      await page.evaluate(({ magma, camera, cut }) => {
        ventSet(prev => ({ ...prev, plateTectonics: { ...prev.plateTectonics, ptVentMagma: magma } }));
        __alloVentGL.setCam(camera[0], camera[1]); __alloVentGL.setCut(cut);
      }, { magma, camera, cut });
      await canvas.evaluate(n => n.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForFunction(() => __alloVentGL.debug().state === 'ready');
      await page.waitForTimeout(850);
      const debug = await page.evaluate(() => __alloVentGL.debug());
      assert.equal(debug.magma, magma); assert.equal(debug.contextLost, false);
      const box = await canvas.boundingBox();
      // Pause the surrounding 2D canvas only for the compositor capture. A live
      // 2D loop can starve screenshots on a software-rendered Windows browser.
      await page.evaluate(() => { window.__holdFrames = true; });
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(out, phase + '-' + name + '.png'), clip: box, animations: 'disabled', timeout: 60000 });
      await page.evaluate(() => { window.__holdFrames = false; window.__heldFrames.splice(0).forEach(fn => window.__realRAF(fn)); });
      shots.push({ name, debug, box }); console.log('Captured ' + name);
    }
    await canvas.waitFor();
    await shot('andesite-front');
    await shot('andesite-oblique', 'andesite', [-22, 34]);
    await shot('andesite-closed', 'andesite', [-22, -34], null);
    await shot('basalt-front', 'basalt');
    await shot('rhyolite-front', 'rhyolite');
    await page.setViewportSize({ width: 390, height: 900 });
    await shot('phone-andesite');
    await page.setViewportSize({ width: 1180, height: 950 });
    await page.evaluate(() => mountVent(true));
    await shot('dark-andesite');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, phase + '-results.json'), JSON.stringify({ passed: true, errors, shots }, null, 2));
    console.log('PASS: seven real WebGL captures, three compositions, two camera angles, open/closed cutaway, phone and dark theme.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
