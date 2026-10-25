const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'reports/galaxy-wcag-round2-2026-10-24');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const tag = process.env.GALAXY_WCAG2_TAG || 'after', source = read(process.env.GALAXY_WCAG2_SOURCE || 'stem_lab/stem_tool_galaxy.js');
const hoverOnly = process.env.GALAXY_WCAG2_ONLY === 'hover';
const base = read('dev-tools/galaxy_core_clipping.cjs'), start = base.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = base.slice(start, base.indexOf('`;\n\n(async', start));
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), states: [], interactions: [], errors: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galaxy accessibility follow-up</title><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { window._galaxyPPLoaded = true; let seed = 3481; Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296); Object.defineProperty(navigator, 'xr', { configurable: true, value: { isSessionSupported: () => Promise.resolve(true), addEventListener() {}, removeEventListener() {} } }); const Camera = THREE.PerspectiveCamera; THREE.PerspectiveCamera = function (...args) { const camera = new Camera(...args); window.__a11yCamera = camera; return camera; }; });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: source });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function mount(state = {}) {
      await page.evaluate(state => window.__mount({ simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false, ...state }), state); await settle();
      if (!state.quizMode && (!state.simMode || state.simMode === 'galaxy')) await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetInspectionState && !document.querySelector('[data-galaxy-building]'), null, { timeout: 60000 });
    }
    async function scan(name) {
      await settle(); await page.waitForTimeout(250);
      const axe = await page.evaluate(async () => { const result = await window.axe.run('#slot', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }); return result.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })); });
      const layout = await page.evaluate(() => {
        const clipped = [];
        for (const node of document.querySelectorAll('#slot button,#slot summary,#slot label,#slot a[href]')) {
          const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
          if (!rect.width || !rect.height || style.visibility === 'hidden' || node.closest('[hidden],[inert]')) continue;
          if ((['hidden', 'clip'].includes(style.overflowX) && node.scrollWidth > node.clientWidth + 2) || (['hidden', 'clip'].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 2)) clipped.push({ text: node.textContent.trim().slice(0, 80), width: rect.width, height: rect.height, scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight });
        }
        const brokenReferences = [];
        for (const node of document.querySelectorAll('#slot [aria-labelledby],#slot [aria-describedby],#slot [aria-controls]')) for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls']) for (const id of (node.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)) if (!document.getElementById(id)) brokenReferences.push({ node: node.tagName, attribute, id });
        return { pageOverflow: document.documentElement.scrollWidth > innerWidth + 1, clipped, brokenReferences };
      });
      report.states.push({ name, axe, ...layout }); console.log(name + ': axe=' + axe.length + ' overflow=' + layout.pageOverflow + ' clipped=' + layout.clipped.length + ' references=' + layout.brokenReferences.length);
      fs.writeFileSync(path.join(OUT, tag + '-' + name + '-aria.txt'), await page.locator('#slot').ariaSnapshot());
    }
    if (!hoverOnly) {
    for (const width of [1280, 640, 320]) { await page.setViewportSize({ width, height: width === 320 ? 450 : 900 }); await mount(); await scan('reflow-' + width); }
    if (tag !== 'before') for (const panel of ['motion', 'time', 'discover']) { await page.locator('[data-galaxy-control-tab="' + panel + '"]').click(); await scan('tab-' + panel); }
    const spacing = await page.addStyleTag({ content: '#slot,#slot *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}#slot p{margin-block-end:2em!important}' });
    for (const [name, state] of [['galaxy', {}], ['black-hole', { simMode: 'blackHole' }], ['star', { simMode: 'star' }], ['metal', { simMode: 'metalHunt' }], ['real-sky', { simMode: 'realSky' }]]) {
      await mount(state); await scan('spacing-' + name); await page.screenshot({ path: path.join(OUT, tag + '-spacing-' + name + '.png'), fullPage: true });
    }
    await spacing.evaluate(node => node.remove());
    await page.setViewportSize({ width: 1280, height: 900 });
    // 200% text enlargement, independent of the 320px reflow check.
    const enlarged = await page.addStyleTag({ content: 'html{font-size:200%!important}' });
    await mount(); await scan('text-200'); await page.screenshot({ path: path.join(OUT, tag + '-text-200.png'), fullPage: true }); await enlarged.evaluate(node => node.remove());
    }
    if (tag !== 'before') {
      const check = (name, pass, details) => report.interactions.push({ name, pass, ...(details || {}) });
      const activate = async selector => { await page.locator(selector).first().focus(); await page.keyboard.press('Enter'); await settle(); };
      const focused = selector => page.locator(selector).evaluate(node => node === document.activeElement);
      if (!hoverOnly) {
      const bank = [{ q: 'Which object is a star?', a: 'Sun', options: ['Sun', 'Moon'] }, { q: 'What is our home galaxy?', a: 'Milky Way', options: ['Milky Way', 'Andromeda'] }];
      await mount({ quizMode: true, dynamicQuiz: bank });
      const feedback = page.locator('[data-galaxy-quiz-feedback-status]'); check('Quiz feedback region exists before answering', await feedback.count() === 1 && (await feedback.textContent()) === '');
      await activate('[aria-label^="Select answer:"]');
      await activate('[data-galaxy-quiz-next]');
      check('Next question receives keyboard focus', await focused('[data-galaxy-quiz-question]') && (await page.locator('[data-galaxy-quiz-question]').textContent()) === bank[1].q);
      await scan('quiz-next');
      await activate('[aria-label^="Select answer:"]'); await activate('[data-galaxy-quiz-next]');
      check('Quiz results receive meaningful focus', await focused('[data-galaxy-quiz-results-title]'));
      await scan('quiz-results'); await activate('[data-galaxy-quiz-retry]');
      check('Quiz retry returns to first question', await focused('[data-galaxy-quiz-question]') && (await page.locator('[data-galaxy-quiz-question]').textContent()) === bank[0].q);
      await mount({ simMode: 'metalHunt' }); await activate('[data-galaxy-metallicity-show-prompts]');
      check('Revealed investigation prompts receive focus', await focused('[data-galaxy-metallicity-prompts-title]'));
      await page.evaluate(() => { window.__logStatusNode = document.querySelector('[data-galaxy-metallicity-log-status]'); });
      await activate('[data-galaxy-metallicity-log-add]'); await activate('[data-galaxy-metallicity-log-add]');
      check('Investigation logging updates a persistent polite status', await page.locator('[data-galaxy-metallicity-log-status]').evaluate(node => node === window.__logStatusNode && node.getAttribute('aria-live') === 'polite' && node.textContent.includes('2 of 8')));
      await scan('investigation-feedback');
      await mount({ simMode: 'star', lifecycleMass: 1, stellarMassReference: 2 }); await activate('[data-galaxy-star-clear-reference]');
      check('Clearing a star reference preserves focus', await focused('[data-galaxy-star-keep]')); await scan('star-reference-cleared');
      for (const optical of [false, true]) {
        await mount({ simMode: 'blackHole', blackHoleOptical: optical, blackHolePaused: true });
        const canvas = page.locator('[data-black-hole-canvas]'); await page.waitForFunction(() => !!document.querySelector('[data-black-hole-canvas]')?._nudgeBlackHoleCamera, null, { timeout: 60000 });
        await canvas.scrollIntoViewIfNeeded(); await settle();
        const original = await canvas.evaluate(canvas => ({ release: canvas._blackHoleReleaseSettings(), paused: canvas._blackHoleExperimentState().paused, time: canvas._blackHoleExperimentState().time }));
        for (const action of ['left', 'right', 'up', 'down', 'in', 'out']) {
          const before = await canvas.evaluate(canvas => canvas._blackHoleCameraState());
          const button = page.locator('[data-bh-camera-step="' + action + '"]'); await button.click(); await settle();
          const after = await canvas.evaluate(canvas => ({ view: canvas._blackHoleCameraState(), release: canvas._blackHoleReleaseSettings(), paused: canvas._blackHoleExperimentState().paused, time: canvas._blackHoleExperimentState().time }));
          const rect = await button.boundingBox();
          const status = await page.locator('[data-bh-camera-status]').textContent();
          check((optical ? 'Optical' : 'Experiment') + ' camera click ' + action, ['yaw', 'pitch', 'distance', 'zoom'].some(key => after.view[key] !== before[key]) && JSON.stringify(after.release) === JSON.stringify(original.release) && after.paused === original.paused && after.time === original.time && rect.width >= 44 && rect.height >= 44 && status.includes((await button.textContent()).trim()));
        }
        if (!optical) {
          const details = page.locator('#black-hole-comparison-keep').locator('xpath=ancestor::details[1]');
          if (!(await details.evaluate(node => node.open))) { await details.locator('summary').first().focus(); await page.keyboard.press('Enter'); await settle(); }
          await activate('#black-hole-comparison-keep'); await activate('#black-hole-comparison-clear');
          check('Clearing a path comparison restores focus', await focused('#black-hole-comparison-keep'));
        }
        await scan(optical ? 'optical-camera-controls' : 'experiment-camera-controls');
        await page.locator('[data-bh-camera-controls]').screenshot({ path: path.join(OUT, optical ? 'optical-click-controls.png' : 'experiment-click-controls.png') });
      }
      await mount({ galaxyControlPanel: 'time' });
      const vr = page.locator('[data-galaxy-vr-enter]'); await vr.waitFor();
      await page.evaluate(() => { window.__vrRequests = 0; window._galaxyVR = { enterVR() { window.__vrRequests++; }, destroy() {} }; });
      await vr.focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Space');
      await vr.hover(); await page.mouse.down(); check('VR does not request twice on pointer down', await page.evaluate(() => window.__vrRequests === 2)); await page.mouse.up();
      check('VR supports Enter, Space and single click', await page.evaluate(() => window.__vrRequests === 3)); await scan('vr-keyboard');
      }
      await mount(); const canvas = page.locator('[data-galaxy-canvas]'); await canvas.scrollIntoViewIfNeeded(); await settle();
      const hoverFocus = page.locator('[data-galaxy-control-tab="view"]'); await hoverFocus.focus();
      const candidates = await canvas.evaluate(canvas => {
        const rect = canvas.getBoundingClientRect(), camera = window.__a11yCamera; camera.updateMatrixWorld(true); const points = [];
        for (let index = 75; index < 2400 && points.length < 12; index += 11) { const state = canvas._galaxyGetStarVisualState(index); if (!state || !state.animated) continue; const star = state.animated, p = new THREE.Vector3(star.x, star.y, star.z).project(camera), x = rect.x + (p.x + 1) * rect.width / 2, y = rect.y + (1 - p.y) * rect.height / 2; if (p.z > -1 && p.z < 1 && x > rect.x + 180 && x < rect.right - 130 && y > rect.y + 170 && y < rect.bottom - 130 && document.elementFromPoint(x, y) === canvas) points.push({ x, y }); }
        return points;
      });
      let target, first;
      for (const point of candidates) { await page.mouse.move(point.x, point.y); await page.waitForTimeout(150); const hover = await canvas.evaluate(canvas => canvas._galaxyGetHoverState()); if (hover.visible) { target = point; first = hover; break; } }
      assert(target, 'A real projected object is hoverable');
      const beforeHover = await canvas.evaluate(canvas => ({ orbit: { ...canvas._galaxyOrbit }, selected: canvas._galaxyGetSelectionVisualState().selectedIndex }));
      const preview = page.locator('[data-galaxy-hover-preview]'), box = await preview.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 }); await page.waitForTimeout(250);
      const held = await canvas.evaluate(canvas => canvas._galaxyGetHoverState());
      check('Hover preview is reachable and persistent', await preview.isVisible() && held.kind === first.kind && held.index === first.index && held.label === first.label);
      await page.mouse.move(1, 1); await page.waitForTimeout(150); await page.mouse.move(target.x, target.y); await page.waitForTimeout(150);
      const escapeBefore = await canvas.evaluate(canvas => ({ hover: canvas._galaxyGetHoverState(), active: document.activeElement?.outerHTML.slice(0, 250) }));
      await page.keyboard.press('Escape');
      const escapeImmediate = await canvas.evaluate(canvas => ({ hover: canvas._galaxyGetHoverState(), active: document.activeElement?.outerHTML.slice(0, 250) }));
      await page.mouse.move(target.x + .5, target.y + .5); await page.waitForTimeout(200);
      const escapeAfter = await canvas.evaluate(canvas => ({ hover: canvas._galaxyGetHoverState(), active: document.activeElement?.outerHTML.slice(0, 250), status: canvas.parentElement.querySelector('[data-galaxy-announcer]').textContent }));
      check('Escape dismisses hover without requiring canvas focus', !(await preview.isVisible()) && await hoverFocus.evaluate(node => node === document.activeElement) && escapeAfter.status === 'Object preview dismissed.', { escapeBefore, escapeImmediate, escapeAfter });
      const afterHover = await canvas.evaluate(canvas => ({ orbit: { ...canvas._galaxyOrbit }, selected: canvas._galaxyGetSelectionVisualState().selectedIndex }));
      check('Hover dismissal preserves camera and selection', JSON.stringify(beforeHover) === JSON.stringify(afterHover));
      await page.mouse.move(1, 1); await page.waitForTimeout(150); await page.mouse.move(target.x, target.y); await page.waitForTimeout(150);
      check('Hover can return after leaving and re-entering', await preview.isVisible());
      await page.locator('[data-galaxy-stage]').screenshot({ path: path.join(OUT, 'hover-accessible.png') });
    }
    if (tag !== 'before') { assert.deepEqual(report.errors, []); assert(report.states.every(state => !state.axe.length && !state.pageOverflow && !state.clipped.length && !state.brokenReferences.length), 'WCAG, clipping, reflow or ARIA reference failures'); assert(report.interactions.every(check => check.pass), 'Accessible interaction failure'); }
  } catch (error) { report.failure = String(error.stack || error); throw error; }
  finally { fs.writeFileSync(path.join(OUT, tag + '-browser.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
