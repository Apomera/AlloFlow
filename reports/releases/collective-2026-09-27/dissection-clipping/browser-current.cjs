'use strict';
// Narrow real-canvas test: staged pre-fix versus current source, both under strict mode.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../../../..'), OUT = __dirname;
const FILE = 'stem_lab/stem_tool_dissection.js';
const read = p => fs.readFileSync(path.join(ROOT, p));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const current = read(FILE), staged = execFileSync('git', ['show', ':' + FILE], { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 });
const mirror = read('desktop/web-app/public/' + FILE);
assert(current.equals(mirror), 'Canonical/public Dissection bytes differ');
const monitored = [FILE, 'desktop/web-app/public/' + FILE, 'stem_lab/stem_lab_module.js', 'tests/e2e/helpers/stem_gl_harness.ts'];
const hashes = () => Object.fromEntries(monitored.map(p => [p, hash(read(p))]));
const inputsBefore = hashes();
const cases = [
  ['frog', 'traceFrogTorso'], ['earthworm', 'traceEarthwormBody'], ['pig', 'tracePigBody'],
  ['perch', 'tracePerchBody'], ['crayfish', 'traceCrayfishCarapace'],
  ['sheepEye', 'traceSheepEyeGlobe'], ['sheepHeart', 'traceSheepHeartBody'],
];
for (const [, name] of cases) {
  assert(staged.toString().includes('function ' + name + '('), 'Expected staged declaration missing: ' + name);
  assert(current.toString().includes('var ' + name + ' = function ' + name + '('), 'Expected explicit current binding missing: ' + name);
}
const harnessSource = read('tests/e2e/helpers/stem_gl_harness.ts').toString();
const recorder = harnessSource.slice(harnessSource.indexOf('const GL_RECORDER ='), harnessSource.indexOf('function harnessHtml'));
const htmlFunction = harnessSource.slice(harnessSource.indexOf('function harnessHtml'), harnessSource.indexOf('\n}', harnessSource.indexOf('function harnessHtml')) + 2)
  .replace('o: HarnessOptions, appCss: string | null, substitutes: string[]', 'o, appCss, substitutes').replace('): string {', ') {');
const createHtml = new Function(recorder + '\n' + htmlFunction + '\nreturn harnessHtml;')();
const css = 'app/static/css/' + fs.readdirSync(path.join(ROOT, 'app/static/css')).find(p => /^main\..*\.css$/.test(p));
const html = createHtml({ toolFile: FILE, toolId: 'dissection', preScripts: ['stem_lab/stem_lab_module.js'], width: 1180, height: 1000, layout: 'document' }, css, []);
const report = { at: new Date().toISOString(), ok: false, stagedSha256: hash(staged), currentSha256: hash(current), mirrorSha256: hash(mirror), inputsBefore, cases: [], limitations: [
  'Both source variants are served with a strict-mode prefix to expose the lexical-scope defect; classic-script Annex B compatibility can mask the old code.',
  'Actual Canvas2D rendering and native clipping are exercised through the existing STEM harness. The clip wrapper records stack ownership and calls the original native clip unchanged.',
  'This narrow regression checks seven body-shape clip paths and render errors; it is not broad visual, accessibility, deployed-app or performance acceptance.',
] };
const origin = 'http://dissection-clipping.test';
async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  report.browser = browser.version();
  try {
    for (const variant of ['staged-before', 'current']) for (const [specimen, traceName] of cases) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
      const page = await context.newPage(), pageErrors = [], renderErrors = [], externalRequests = [], routeErrors = [];
      const result = { variant, specimen, traceName, ok: false, pageErrors, renderErrors, externalRequests, routeErrors };
      report.cases.push(result);
      page.on('pageerror', error => pageErrors.push(error.message));
      page.on('console', message => { if (message.type() === 'error' && message.text().includes('[DissectionLab] render error:')) renderErrors.push(message.text()); });
      await page.addInitScript(() => {
        window.__specimenClipCalls = [];
        const clip = CanvasRenderingContext2D.prototype.clip;
        CanvasRenderingContext2D.prototype.clip = function (...args) {
          const stack = new Error().stack || '';
          if (stack.includes('clipSpecimenSurface')) window.__specimenClipCalls.push({ canvas: this.canvas.id, stack });
          return clip.apply(this, args);
        };
      });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) { externalRequests.push(url.origin + url.pathname); return route.abort(); }
        if (url.pathname === '/__harness') return route.fulfill({ contentType: 'text/html', body: html });
        const relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
        const target = path.resolve(ROOT, relative);
        if (!target.startsWith(ROOT + path.sep)) return route.abort();
        try {
          const body = relative === FILE ? Buffer.concat([Buffer.from('"use strict";\n'), variant === 'current' ? current : staged]) : fs.readFileSync(target);
          return await route.fulfill({ contentType: relative.endsWith('.css') ? 'text/css' : relative.endsWith('.js') ? 'text/javascript' : 'application/octet-stream', body });
        } catch (error) { routeErrors.push({ path: relative, error: error.message }); return route.abort(); }
      });
      try {
        await page.goto(origin + '/__harness');
        const mounted = await page.evaluate(specimen => window.__mount({ dissection: { specimen, _dissLoadedSpec: specimen, activeLayer: 'skin', anatomicalView: 'dorsal', reducedMotion: true, soundEnabled: false, sceneDetail: true, visualRealism: 'realistic', specimenCondition: 'dehydrated', lightIntensity: 68, inspectionLens: false, macroInset: false, revealedLayers: { skin: true, muscle: true } } }), specimen);
        assert.equal(mounted, true);
        const canvas = page.locator('[data-diss-canvas]');
        await canvas.waitFor({ state: 'visible' });
        await canvas.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => typeof document.querySelector('[data-diss-canvas]')?._drawDissectionNow === 'function');
        result.beforeExplicitRedraw = await page.evaluate(() => window.__specimenClipCalls.length);
        result.observation = await canvas.evaluate(el => {
          const before = window.__specimenClipCalls.length;
          el._drawDissectionNow();
          const data = el.getContext('2d').getImageData(0, 0, el.width, el.height).data;
          const colors = new Set();
          for (let i = 0; i < data.length; i += 640) colors.add(data[i] + ',' + data[i + 1] + ',' + data[i + 2]);
          return { additionalSurfaceClips: window.__specimenClipCalls.length - before, totalSurfaceClips: window.__specimenClipCalls.length, colors: colors.size, drawState: { specimen: el._drawD?.specimen, condition: el._drawD?.specimenCondition, sceneDetail: el._drawD?.sceneDetail, visualRealism: el._drawD?.visualRealism } };
        });
        assert.deepEqual(pageErrors, []); assert.deepEqual(externalRequests, []); assert.deepEqual(routeErrors, []);
        if (variant === 'staged-before') {
          assert(renderErrors.some(error => error.includes(traceName + ' is not defined')), 'Expected strict pre-fix render error not reproduced');
          assert.equal(result.observation.additionalSurfaceClips, 0, 'Old trace unexpectedly reached native surface clip');
          result.expectedFailureReproduced = true;
        } else {
          assert.deepEqual(renderErrors, [], 'Current renderer logged a caught error');
          assert(result.observation.additionalSurfaceClips >= 2, 'Condition and material surface clips were not both executed');
          assert(result.observation.colors > 30, 'Actual canvas did not render specimen detail');
        }
        result.ok = true;
        console.log(JSON.stringify({ variant, specimen, ok: true, clips: result.observation.additionalSurfaceClips, reproduced: !!result.expectedFailureReproduced }));
      } catch (error) { result.error = error.stack || error.message; throw error; }
      finally { await page.evaluate(() => window.__destroy?.()).catch(() => {}); await context.close(); }
    }
    report.ok = true;
  } finally { await browser.close(); }
}
main().catch(error => { report.error = error.stack || error.message; process.exitCode = 1; }).finally(() => {
  report.inputsAfter = hashes();
  try { assert.deepEqual(report.inputsAfter, report.inputsBefore); } catch (_) { report.ok = false; report.inputDrift = true; process.exitCode = 1; }
  fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, cases: report.cases.length, inputDrift: !!report.inputDrift, error: report.error }));
});
