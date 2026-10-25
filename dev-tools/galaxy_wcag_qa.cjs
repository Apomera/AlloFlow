// Actual Chromium accessibility tree, axe WCAG 2.2 rules and production styles.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'reports/galaxy-wcag-2026-10-24');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const tag = process.env.GALAXY_WCAG_TAG || 'after';
const source = read(process.env.GALAXY_WCAG_SOURCE || 'stem_lab/stem_tool_galaxy.js');
const core = read('dev-tools/galaxy_core_clipping.cjs'), start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start));
const audit = read('dev-tools/galaxy_a11y_audit.cjs').replace(/\r\n/g, '\n');
const probe = new Function('return (' + audit.slice(audit.indexOf('const PROBE = ') + 14, audit.indexOf('\n\n(async () =>', audit.indexOf('const PROBE = '))).replace(/;\s*$/, '') + ')')();
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), states: [], interactions: [], errors: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galaxy accessibility checks</title><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { window._galaxyPPLoaded = true; let seed = 831; Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296); });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' });
    await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: source });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function mount(state) { await page.evaluate(state => window.__mount({ simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false, ...state }), state); await settle(); }
    async function scan(name) {
      await settle(); await page.waitForTimeout(300); // inspect a settled state, not disabled-to-ready transitions
      const result = await page.evaluate(async () => { const result = await axe.run('#slot', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } }); return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.length })) }; });
      const observed = await page.evaluate(probe);
      const tree = await page.locator('#slot').ariaSnapshot(); fs.writeFileSync(path.join(OUT, tag + '-' + name + '-aria.txt'), tree);
      const record = { name, ...result, contrast: observed.contrast, smallTargets: observed.controls.filter(c => !c.disabled && c.w && c.h && (c.w < 24 || c.h < 24)), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1) };
      report.states.push(record); console.log(name + ': ' + result.violations.map(v => v.id).join(',') + ' contrast=' + record.contrast.length + ' small=' + record.smallTargets.length);
    }
    for (const panel of ['view', 'motion', 'time', 'discover']) { await mount({ galaxyControlPanel: panel }); await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetInspectionState && !document.querySelector('[data-galaxy-building]'), null, { timeout: 60000 }); await scan('galaxy-' + panel); }
    await mount({ galaxyControlPanel: 'view' }); await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetInspectionState);
    const canvas = page.locator('[data-galaxy-canvas]');
    if (tag !== 'before') {
      for (const direction of ['left', 'right', 'up', 'down']) {
        const before = await canvas.evaluate(canvas => ({ ...canvas._galaxyOrbit }));
        const button = page.locator('[data-galaxy-orbit-step="' + direction + '"]'); await button.click(); await settle();
        const after = await canvas.evaluate(canvas => ({ ...canvas._galaxyOrbit }));
        const field = ['left', 'right'].includes(direction) ? 'theta' : 'phi', sign = ['left', 'up'].includes(direction) ? -1 : 1;
        const rect = await button.boundingBox();
        report.interactions.push({ check: 'Single click orbit ' + direction, pass: Math.abs(after[field] - before[field] - sign * .1) < 1e-9 && after.r === before.r && rect.height >= 44 && rect.width >= 44 });
      }
      await page.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false }));
      await page.locator('button[aria-label="Toggle fullscreen"]').click();
      await page.locator('[data-galaxy-fullscreen-panel]').click(); await settle();
      const splitter = page.locator('[data-galaxy-panel-resizer]');
      for (const direction of ['wider', 'narrower']) {
        const before = Number(await splitter.getAttribute('aria-valuenow'));
        const button = page.locator('[data-galaxy-panel-width-step="' + direction + '"]'); await button.click(); await settle();
        const after = Number(await splitter.getAttribute('aria-valuenow')), min = Number(await splitter.getAttribute('aria-valuemin')), max = Number(await splitter.getAttribute('aria-valuemax'));
        report.interactions.push({ check: 'Single click panel ' + direction, pass: after >= min && after <= max && after !== before && await button.evaluate(node => node === document.activeElement) });
      }
      await splitter.focus(); await page.keyboard.press('End'); await settle();
      report.interactions.push({ check: 'Splitter End exposes true maximum', pass: await splitter.getAttribute('aria-valuenow') === await splitter.getAttribute('aria-valuemax') });
      const stops = await page.locator('[data-galaxy-workspace]').evaluate(workspace => [...workspace.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex]')].filter(node => node.tabIndex >= 0 && !node.disabled && node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden').length + 1);
      await canvas.focus(); const traversal = [];
      for (let index = 0; index < stops + 2; index++) {
        await page.keyboard.press('Tab');
        traversal.push(await page.evaluate(() => {
          const node = document.activeElement, workspace = document.querySelector('[data-galaxy-workspace]');
          const inside = workspace.contains(node) || node.matches('[data-galaxy-exit-immersive]');
          const rect = node.getBoundingClientRect(), points = [[.5, .5], [.1, .1], [.9, .1], [.1, .9], [.9, .9]];
          const visible = points.some(([x, y]) => { const px = rect.left + rect.width * x, py = rect.top + rect.height * y; if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) return false; const top = document.elementFromPoint(px, py); return top && (top === node || node.contains(top)); });
          return { name: node.getAttribute('aria-label') || node.textContent.trim().slice(0, 50), inside, visible };
        }));
      }
      report.interactions.push({ check: 'Fullscreen keyboard focus remains contained and visible', pass: traversal.every(stop => stop.inside && stop.visible), stops: traversal });
      await page.keyboard.press('Shift+Tab');
      report.interactions.push({ check: 'Fullscreen reverse traversal remains inside', pass: await page.evaluate(() => document.querySelector('[data-galaxy-workspace]').contains(document.activeElement) || document.activeElement.matches('[data-galaxy-exit-immersive]')) });
      await scan('fullscreen-panel');
      await page.setViewportSize({ width: 390, height: 1000 }); await settle();
      report.interactions.push({ check: 'Resize controls hidden in stacked phone layout', pass: !(await page.locator('[data-galaxy-panel-width-controls]').isVisible()) && !(await splitter.isVisible()) });
      await page.setViewportSize({ width: 1280, height: 1000 }); await settle();
      await canvas.evaluate(canvas => canvas._galaxyToggleFullscreen()); await settle();
      report.interactions.push({ check: 'Fullscreen exit restores invoking control', pass: await page.locator('button[aria-label="Toggle fullscreen"]').evaluate(node => node === document.activeElement) });
      await mount({ galaxyControlPanel: 'view', observeMode: 'radio', galaxyVelocityOverlay: false, galaxyMagneticOverlay: false, galaxyScienceOverlay: false });
      await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyNudgeCamera && !document.querySelector('[data-galaxy-building]'));
      await scan('radio-overlays-off');
      for (const selector of ['[data-galaxy-velocity-toggle]', '[data-galaxy-magnetic-toggle]', '[data-galaxy-science-toggle]']) await page.locator(selector).click();
      await scan('radio-overlays-on');
      await mount({ galaxyControlPanel: 'view' }); await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetInspectionState && !document.querySelector('[data-galaxy-building]'));
    }
    for (const [id, name] of [['helix', 'Helix Nebula'], ['ring', 'Ring Nebula'], ['crab', 'Crab Nebula']]) {
      await canvas.evaluate((canvas, name) => { canvas._galaxyFocusNebula(name); canvas._galaxyInspectSelection(); }, name); await settle();
      const details = page.locator('[data-galaxy-object-context]'); if (!(await details.evaluate(node => node.open))) await page.locator('[data-galaxy-object-context-summary]').click();
      await scan(id);
      if (id === 'crab') {
        await page.locator('[data-galaxy-crab-component="filaments"]').click(); await page.locator('[data-galaxy-crab-component="wind"]').click();
        const show = page.locator('[data-galaxy-crab-show-both]'); await show.focus(); await page.keyboard.press('Enter'); await settle();
        const focus = await page.evaluate(() => document.activeElement?.getAttribute('data-galaxy-crab-component'));
        report.interactions.push({ check: 'Crab recovery retains focus', pass: focus === 'filaments', focus });
        await scan('crab-restored');
      } else {
        await page.locator('[data-galaxy-shell-component-mode="secondary"]').click(); await page.locator('[data-galaxy-shell-view="oblique"]').click(); await settle();
        await scan(id + '-secondary');
        for (const scheme of ['light', 'dark']) {
          await page.emulateMedia({ forcedColors: 'active', colorScheme: scheme });
          const pressed = await page.locator('[data-galaxy-shell-component-mode="secondary"]').evaluate(node => { const style = getComputedStyle(node); return { border: style.borderStyle, width: style.borderWidth, color: style.borderColor }; });
          await page.keyboard.press('Tab'); // keyboard modality, then target the persistent control
          await page.locator('[data-galaxy-shell-component-mode="secondary"]').focus();
          const focus = await page.locator('[data-galaxy-shell-component-mode="secondary"]').evaluate(node => ({ outline: getComputedStyle(node).outlineStyle, width: getComputedStyle(node).outlineWidth }));
          report.interactions.push({ check: id + ' forced colors ' + scheme, pass: pressed.border === 'double' && focus.outline !== 'none' && parseFloat(focus.width) >= 2, pressed, focus });
          if (tag !== 'before') await details.screenshot({ path: path.join(OUT, id + '-forced-' + scheme + '.png') });
        }
        await page.emulateMedia({ forcedColors: 'none', colorScheme: 'light' });
      }
      await canvas.evaluate(canvas => canvas._galaxyExitInspection());
    }
    for (const width of [390, 320]) { await page.setViewportSize({ width, height: 1000 }); await settle(); await scan('phone-' + width); if (tag !== 'before') await page.locator('[data-galaxy-controls]').screenshot({ path: path.join(OUT, 'controls-' + width + '.png') }); }
    await page.setViewportSize({ width: 1280, height: 1000 });
    if (tag !== 'before') {
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await mount({ galaxyControlPanel: 'motion' });
      await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetMotionPreference);
      const reduce = page.locator('[data-galaxy-reduce-motion]'); await reduce.focus(); await page.keyboard.press('Enter'); await settle();
      const frozen = await canvas.evaluate(canvas => ({ motion: canvas._galaxyGetMotionPreference(), orbit: { ...canvas._galaxyOrbit }, inspection: canvas._galaxyGetInspectionState() }));
      await page.waitForTimeout(250);
      const later = await canvas.evaluate(canvas => ({ motion: canvas._galaxyGetMotionPreference(), orbit: { ...canvas._galaxyOrbit }, inspection: canvas._galaxyGetInspectionState() }));
      report.interactions.push({ check: 'Local motion reduction freezes time and camera', pass: frozen.motion.reduced && frozen.motion.local && frozen.motion.elapsed === later.motion.elapsed && JSON.stringify(frozen.orbit) === JSON.stringify(later.orbit) && JSON.stringify(frozen.inspection.camera) === JSON.stringify(later.inspection.camera) });
      await scan('local-reduced-motion'); await page.locator('[data-galaxy-controls]').screenshot({ path: path.join(OUT, 'reduce-motion.png') });
      await page.emulateMedia({ reducedMotion: 'reduce' }); await settle(); await reduce.click(); await settle();
      const system = await canvas.evaluate(canvas => canvas._galaxyGetMotionPreference());
      report.interactions.push({ check: 'Device motion preference retains priority', pass: system.system && system.reduced && !system.local });
    }
    for (const mode of ['blackHole', 'star', 'metalHunt', 'realSky']) { await mount({ simMode: mode }); await scan(mode); }
    if (tag !== 'before') { assert.deepEqual(report.errors, []); assert(report.states.every(state => !state.violations.length && !state.contrast.length && !state.smallTargets.length && !state.overflow), 'axe, contrast, targets or reflow checks'); assert(report.interactions.every(check => check.pass), 'Focus, pointer alternatives, motion or forced colors checks'); }
  } catch (error) { report.failure = String(error.stack || error); throw error; }
  finally { fs.writeFileSync(path.join(OUT, tag + '-browser.json'), JSON.stringify(report, null, 2) + '\n'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
