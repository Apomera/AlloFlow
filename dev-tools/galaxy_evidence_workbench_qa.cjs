// Real Chromium + SwiftShader checks for the model evidence workbench.
// Uses the same local React/Three harness as galaxy_connected_workflows_qa.cjs.
// Run: node dev-tools/galaxy_evidence_workbench_qa.cjs
// Quick render/accessibility checks: add --narrow.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, process.env.GALAXY_QA_OUTPUT || 'reports/galaxy-evidence-workbench-2026-10-17');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const core = read('dev-tools/galaxy_core_clipping.cjs');
const shellStart = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shellEnd = core.indexOf('`;\n\n(async', shellStart);
assert(shellStart > 0 && shellEnd > shellStart, 'Local browser harness exists');
const shell = core.slice(shellStart, shellEnd).replace(
  'var pair = React.useState({ galaxy: state });',
  `var pair = React.useState({ galaxy: state });
    window.__galaxyState = pair[0].galaxy;
    window.__patchGalaxy = function(patch) { pair[1](function(prev) { return { galaxy: Object.assign({}, prev.galaxy, patch) }; }); };`
);
const cssAsset = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const browserPaths = [
  process.env.GALAXY_BROWSER_EXECUTABLE,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const executablePath = browserPaths.find(file => fs.existsSync(file));
const missions = [
  { id: 'dust', bands: ['visible', 'infrared'], wrong: 'empty', correct: 'dust' },
  { id: 'fuel', bands: ['radio', 'xray'], wrong: 'sameGas', correct: 'differentGas' },
  { id: 'mass', bands: ['visible', 'gravity'], wrong: 'newLight', correct: 'inferredMass' },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const errors = [];
  const results = { browser: executablePath || 'Playwright bundled Chromium', starCount: 5000, errors, missions: [], layouts: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    // Stable scene sampling without network services or mocked WebGL.
    await page.evaluate(() => { let seed = 123456789; Math.random = () => { seed = (1103515245 * seed + 12345) % 2147483648; return seed / 2147483648; }; });
    await page.addStyleTag({ path: path.join(ROOT, cssAsset) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js']) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell });
    await page.addScriptTag({ content: read('stem_lab/stem_tool_galaxy.js') });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const state = () => page.evaluate(() => window.__galaxyState);
    const workbench = () => page.locator('[data-galaxy-evidence-workbench]');
    const mount = async data => { await page.evaluate(data => window.__mount({ simMode: 'galaxy', starCount: 5000, galaxyAutoRotate: false, ...data }), data || {}); await settle(); await workbench().waitFor({ state: 'attached' }); };
    const click = async selector => { await page.locator(selector).click(); await settle(); };
    const mission = async id => { await click('[data-galaxy-evidence-mission="' + id + '"]'); assert.equal((await state()).galaxyEvidenceWorkbench.mission, id); };
    const choose = async id => { await page.locator('[data-galaxy-evidence-choice="' + id + '"] input').check(); await settle(); };
    const entry = async id => (await state()).galaxyEvidenceWorkbench.entries[id];
    const visit = async (index, band) => {
      await click('[data-galaxy-evidence-observe="' + index + '"]');
      assert.equal((await state()).observeMode, band, 'Observe in model updates saved view to ' + band);
      await page.waitForFunction(band => document.querySelector('[data-galaxy-canvas]')?._galaxyGetInstrumentVisualState?.().mode === band, band, { timeout: 60000 });
      assert.equal(await page.locator('[data-galaxy-evidence-band="' + band + '"][data-active="true"]').count(), 1, 'Band card tracks the live model');
      assert.equal(await page.locator('[data-galaxy-evidence-visited="' + index + '"][data-visited="true"]').count(), 1, 'Observation is recorded');
      const returnToNote = page.locator('[data-galaxy-evidence-return-note]');
      await returnToNote.click(); await settle();
      assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-galaxy-evidence-note')), String(index), 'Returning from the model focuses the matching evidence note');
    };
    const bounds = async width => {
      const overflowing = await page.evaluate(() => Array.from(document.querySelectorAll('[data-galaxy-evidence-workbench], [data-galaxy-evidence-workbench] button, [data-galaxy-evidence-workbench] textarea, [data-galaxy-evidence-workbench] input')).filter(node => {
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -1 || rect.right > innerWidth + 1);
      }).map(node => ({ tag: node.tagName, text: node.getAttribute('aria-label') || node.textContent?.trim().slice(0, 80) })));
      assert.deepEqual(overflowing, [], 'Workbench controls fit ' + width + 'px: ' + JSON.stringify(overflowing));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Page has no horizontal overflow at ' + width);
    };

    // Fast checks of bridge ownership and high-contrast styling can be run
    // independently after a narrow render-only change. The 2-D fallback avoids
    // rebuilding an unrelated WebGL scene for these DOM and keyboard checks.
    if (process.argv.includes('--narrow')) {
      await mount({ webglError: true, observeMode: 'visible', galaxyEvidenceReturn: 0, galaxyEvidenceWorkbench: { mission: 'dust' } });
      assert.equal(await page.locator('[data-galaxy-evidence-return-note]').count(), 1, 'A matching observed view offers the note shortcut');
      await page.getByRole('button', { name: /Radio/ }).first().click(); await settle();
      assert.equal((await state()).observeMode, 'radio', 'Ordinary filter controls update the current view');
      assert.equal(await page.locator('[data-galaxy-evidence-return-note]').count(), 0, 'An unrelated current filter hides the old recording shortcut');
      await mission('fuel');
      assert.equal((await state()).galaxyEvidenceReturn, null, 'Changing investigation clears the recording shortcut');
      assert.equal(await page.locator('[data-galaxy-evidence-return-note]').count(), 0);
      await page.setViewportSize({ width: 390, height: 1050 });
      await page.emulateMedia({ forcedColors: 'active' });
      await workbench().scrollIntoViewIfNeeded(); await settle();
      const hiddenControls = await workbench().locator('button,input,textarea').evaluateAll(nodes => nodes.filter(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
        return rect.width < 1 || rect.height < 1 || style.display === 'none' || style.visibility === 'hidden';
      }).map(node => node.outerHTML));
      assert.deepEqual(hiddenControls, [], 'Forced colors retains all workbench controls');
      await page.keyboard.press('Tab');
      const focusButton = page.locator('[data-galaxy-evidence-mission="fuel"]');
      await focusButton.focus();
      assert(await focusButton.evaluate(node => node === document.activeElement));
      const focusStyle = await focusButton.evaluate(node => { const style = getComputedStyle(node); return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor }; });
      assert.notEqual(focusStyle.outlineStyle, 'none', 'Keyboard focus is visible in forced colors');
      assert(parseFloat(focusStyle.outlineWidth) >= 1, 'Keyboard focus has a measurable outline');
      await bounds(390);
      await workbench().screenshot({ path: path.join(OUT, 'forced-colors-390.png'), animations: 'disabled' });
      assert.deepEqual(errors, []);
      const narrow = { errors, staleFilterBridgeHidden: true, missionBridgeCleared: true, forcedColorsControlsVisible: true, forcedColorsFocus: focusStyle, overflow: false };
      fs.writeFileSync(path.join(OUT, 'narrow-results.json'), JSON.stringify(narrow, null, 2) + '\n');
      console.log(JSON.stringify(narrow));
      return;
    }

    await mount();
    await page.waitForFunction(() => typeof document.querySelector('[data-galaxy-canvas]')?._setObserveMode === 'function', null, { timeout: 60000 });
    await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'galaxy-model-1440.png'), animations: 'disabled' });
    for (const spec of missions) {
      await mission(spec.id);
      assert.equal(await page.locator('[data-galaxy-evidence-band]').count(), 2, 'Each mission presents a stable comparison pair');
      assert(await page.locator('[data-galaxy-evidence-check]').isDisabled(), 'Checking needs a prediction');
      await choose(spec.wrong);
      assert(await page.locator('[data-galaxy-evidence-check]').isDisabled(), 'A prediction alone is insufficient');
      await visit(0, spec.bands[0]);
      const referenceCamera = await page.locator('[data-galaxy-canvas]').evaluate(canvas => ({ theta: canvas._galaxyOrbit.theta, phi: canvas._galaxyOrbit.phi, r: canvas._galaxyOrbit.r }));
      const referenceZoomPosition = await page.locator('[data-galaxy-zoom-slider]').inputValue();
      assert(await page.locator('[data-galaxy-evidence-check]').isDisabled(), 'Both views must be visited');
      const note = 'I noticed ' + spec.bands[0] + ' differs from ' + spec.bands[1] + '.';
      const referenceSetup = (await entry(spec.id)).context;
      assert(referenceSetup && typeof referenceSetup === 'object', 'An explicit setup is saved for a fair comparison');
      await page.evaluate(() => window.__patchGalaxy({ galaxyType: 'irregular', cosmicAge: 2, layers: { arms: false, bulge: false, blackHole: false, nebulae: false, bgStars: false, grid: true, labels: true }, galaxyAutoRotate: true, galaxyTourActive: true }));
      await settle();
      await visit(1, spec.bands[1]);
      const restoredSetup = await state();
      assert.notEqual(restoredSetup.galaxyType, 'irregular', 'Reobserving restores the reference morphology');
      assert.equal(restoredSetup.cosmicAge, 10, 'Reobserving restores the comparison age');
      assert.deepEqual(restoredSetup.layers, { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, dust: true, gas: true, grid: false, labels: false }, 'Reobserving restores comparison layers');
      assert.equal(restoredSetup.galaxyAutoRotate, false, 'Reobserving keeps a stable camera');
      assert.equal(restoredSetup.galaxyTourActive, false, 'Reobserving stops the cinematic tour');
      assert.deepEqual((await entry(spec.id)).context, referenceSetup, 'The comparison setup stays fixed');
      // Drift the camera on the SAME shape so a scene rebuild cannot mask a
      // missing camera reset in the comparison action.
      await page.locator('[data-galaxy-canvas]').evaluate(canvas => { canvas._galaxySetViewAngle('edge'); canvas._galaxySetZoomPosition(85); });
      await page.waitForFunction(() => Number(document.querySelector('[data-galaxy-zoom-slider]')?.value) >= 80, null, { timeout: 5000 });
      await visit(1, spec.bands[1]);
      await page.waitForFunction(reference => {
        const orbit = document.querySelector('[data-galaxy-canvas]')?._galaxyOrbit;
        return orbit && Math.abs(orbit.theta - reference.theta) < 0.0001 && Math.abs(orbit.phi - reference.phi) < 0.0001 && Math.abs(orbit.r - reference.r) < 0.0001;
      }, referenceCamera, { timeout: 5000 });
      assert.equal(await page.locator('[data-galaxy-zoom-slider]').inputValue(), referenceZoomPosition, 'Reference observation restores overview zoom');
      assert.equal(await page.locator('[data-galaxy-evidence-check]').isDisabled(), false, 'Two actual observations unlock checking');
      assert.equal((await entry(spec.id)).notes.join(''), '', 'Writing is optional for comparing the evidence');
      await page.locator('[data-galaxy-evidence-note="0"]').fill(note);
      await page.locator('[data-galaxy-evidence-explanation]').fill('My evidence connects the tracer to the claim.');
      await click('[data-galaxy-evidence-check]');
      const incorrectFeedback = (await page.locator('[data-galaxy-evidence-feedback]').innerText()).trim();
      assert(incorrectFeedback.length > 80, 'Feedback explains the evidence and misconception');
      assert((await entry(spec.id)).checked, 'Check is persisted');
      await choose(spec.correct);
      await click('[data-galaxy-evidence-check]');
      const correctFeedback = (await page.locator('[data-galaxy-evidence-feedback]').innerText()).trim();
      assert(correctFeedback.length > 80, 'Correct choices also receive scientific reasoning');
      assert.notEqual(correctFeedback, incorrectFeedback, 'Feedback responds to the selected explanation');
      if (spec.id === 'mass') {
        assert.match(await page.locator('[data-galaxy-evidence-band="gravity"]').innerText(), /infer|reconstruct/i, 'Gravity is identified as an inference');
        assert.match(correctFeedback, /motion|orbit|lensing/i, 'Gravity reasoning names measurable evidence');
        assert.match(correctFeedback, /photograph|light|inference|infer/i, 'Gravity reasoning distinguishes inference from emitted light');
      }
      const before = await entry(spec.id);
      await mission(missions.find(other => other.id !== spec.id).id);
      await mission(spec.id);
      assert.deepEqual(await entry(spec.id), before, 'Changing mission preserves prediction, observation notes and feedback');
      assert.equal(await page.locator('[data-galaxy-evidence-note="0"]').inputValue(), note);
      await workbench().scrollIntoViewIfNeeded();
      await bounds(1440);
      await workbench().screenshot({ path: path.join(OUT, spec.id + '-1440.png'), animations: 'disabled' });
      results.missions.push({ id: spec.id, actualCanvasBands: spec.bands, checkRequiresBothViews: true, explanatoryFeedback: true, notesPreserved: true, comparisonSetupRestored: true, comparisonCameraRestored: true });
    }

    // Saved work survives broader tool navigation, not only the mission tabs.
    const saved = (await state()).galaxyEvidenceWorkbench;
    await page.locator('[data-galaxy-mode="star"]').click(); await settle();
    await page.locator('[data-galaxy-mode="galaxy"]').click(); await settle();
    assert.deepEqual((await state()).galaxyEvidenceWorkbench, saved, 'Leaving the mode preserves the notebook');
    results.modeNavigationPreservesNotebook = true;

    // Native radios and real buttons must remain usable without a pointer.
    await mission('dust');
    const radio = page.locator('[data-galaxy-evidence-choice="empty"] input');
    await radio.focus(); await page.keyboard.press('Space'); await settle();
    assert.equal((await entry('dust')).prediction, 'empty', 'Keyboard selects a prediction');
    const observe = page.locator('[data-galaxy-evidence-observe="0"]');
    await observe.focus(); await page.keyboard.press('Enter'); await settle();
    assert.equal((await state()).observeMode, 'visible', 'Keyboard observes the selected model');
    results.keyboardPredictionAndObservation = true;

    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1050 });
      for (const spec of missions) {
        await mission(spec.id);
        await workbench().scrollIntoViewIfNeeded(); await settle();
        await bounds(width);
        if (width !== 1440) await workbench().screenshot({ path: path.join(OUT, spec.id + '-' + width + '.png'), animations: 'disabled' });
      }
      results.layouts.push({ width, overflow: false, allMissions: true });
    }
    await page.evaluate(() => document.documentElement.dir = 'rtl');
    await bounds(320);
    await workbench().screenshot({ path: path.join(OUT, 'mass-rtl-320.png'), animations: 'disabled' });
    results.rtl = true;

    assert.deepEqual(errors, [], 'No browser exceptions or console errors');
    fs.writeFileSync(path.join(OUT, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(JSON.stringify(results));
  } catch (error) {
    results.failure = String(error.stack || error);
    fs.writeFileSync(path.join(OUT, process.argv.includes('--narrow') ? 'narrow-results.json' : 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
