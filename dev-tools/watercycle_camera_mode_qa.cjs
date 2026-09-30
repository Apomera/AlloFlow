'use strict';
// Event-driven Explorer camera status: isolated React + real THREE/OrbitControls.
// Run: node dev-tools/watercycle_camera_mode_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'reports/watercycle-handoff-guide');
const SOURCE = path.join(ROOT, 'stem_lab/stem_tool_watercycle.js');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const hash = text => crypto.createHash('sha256').update(text).digest('hex');
const frozenSource = fs.readFileSync(SOURCE, 'utf8');
const frozenPublic = read('desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const report = {
  title: 'Water Cycle observed 3D camera status', startedAt: new Date().toISOString(),
  sourceSha256: hash(frozenSource), sourceMirrorSha256: hash(frozenPublic),
  method: 'Owned isolated Chromium page; real React refs, THREE renderer, OrbitControls drag, native keyboard/buttons, and controlled restored UI state. No user browser or preview server is used.',
  checks: [], snapshots: [], errors: [], browserClosed: false,
};
function check(label, passed, evidence) { report.checks.push({ label, passed: !!passed, evidence }); }
async function main() {
  fs.mkdirSync(REPORT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Water Cycle camera mode QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of [
      'desktop/web-app/node_modules/react/umd/react.production.min.js',
      'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
      'vendor/three-r128/three.min.js', 'vendor/three-r128/OrbitControls.js', 'stem_lab/stem_lab_module.js',
    ]) await page.addScriptTag({ content: read(file) });
    await page.addScriptTag({ content: frozenSource });
    await page.evaluate(() => {
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      window.cameraModeWrites = [];
      window.cameraRenderCount = 0;
      window.mountCameraWater = seed => {
        function Host() {
          const [data, setData] = React.useState({ waterCycle: seed, _threeLoaded: true });
          window.cameraData = data.waterCycle;
          window.cameraSet = setData;
          window.cameraRenderCount += 1;
          const observeSet = action => setData(previous => {
            const next = typeof action === 'function' ? action(previous) : action;
            if ((next.waterCycle || {}).wc3dCameraMode !== (previous.waterCycle || {}).wc3dCameraMode) {
              window.cameraModeWrites.push({ from: (previous.waterCycle || {}).wc3dCameraMode, to: (next.waterCycle || {}).wc3dCameraMode });
            }
            return next;
          });
          const noop = () => {};
          return window.StemLab._registry.waterCycle.render({
            React, toolData: data, setToolData: observeSet, isDark: false, isContrast: false,
            gradeBand: '6-8', gradeLevel: '7th Grade', icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [],
            addToast: noop, announceToSR: noop, awardXP: noop, getXP: () => 0, beep: noop, celebrate: noop,
            canvasNarrate: noop, canvasA11yDesc: noop, a11yClick: fn => ({ onClick: fn }),
            t: (key, fallback) => fallback == null ? key : fallback,
            props: {}, srOnly: {}, callGemini: null,
          });
        }
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
      };
      window.patchCameraWater = fields => window.cameraSet(previous => ({ ...previous, waterCycle: { ...previous.waterCycle, ...fields } }));
      window.inspectCameraWater = () => {
        const canvas = document.getElementById('wcJourney3d');
        const lens = document.querySelector('.wc-scene-lens');
        const mode = document.querySelector('.wc-scene-lens-mode');
        const detail = document.querySelector('.wc-viewport-state-detail');
        return {
          datasetMode: canvas && canvas.dataset.cameraMode, engine: canvas && canvas.dataset.engineState,
          label: mode && mode.innerText, aria: lens && lens.getAttribute('aria-label'),
          dock: detail && detail.innerText, stateMode: window.cameraData && window.cameraData.wc3dCameraMode,
          paused: window.cameraData && window.cameraData.journeyPaused,
          journeyState: window.cameraData && window.cameraData.journeyState,
          writes: window.cameraModeWrites.slice(), renderCount: window.cameraRenderCount,
        };
      };
    });
    const snapshot = async label => {
      const state = await page.evaluate(() => window.inspectCameraWater());
      report.snapshots.push({ label, state }); return state;
    };
    const mount = async seed => {
      await page.evaluate(seed => window.mountCameraWater(seed), { wcMode: 'explore', wcSection: 'explore', journeyView: '3d', activeStage: 'evaporation', journeyActive: true, journeyState: 'evaporating', journeyPaused: true, journeySpeed: 0.25, ...seed });
      await page.waitForFunction(() => document.getElementById('wcJourney3d')?.dataset.engineState === 'ready' && window.cameraData.wc3dCameraMode === 'follow');
      await page.waitForTimeout(120);
    };
    const patch = async fields => { await page.evaluate(fields => window.patchCameraWater(fields), fields); await page.waitForTimeout(120); };
    const expectMode = async (label, expected, paused) => {
      await page.waitForFunction(expected => document.getElementById('wcJourney3d')?.dataset.cameraMode === expected && window.cameraData.wc3dCameraMode === expected, expected);
      const state = await snapshot(label);
      const text = expected === 'orbit' ? 'Free orbit' : 'Follow camera';
      check(label + ': renderer and React agree', state.datasetMode === expected && state.stateMode === expected, state);
      check(label + ': visible lens describes camera', state.label === text && state.dock.includes(text), { label: state.label, dock: state.dock });
      check(label + ': accessible lens describes camera', state.aria.includes(text), state.aria);
      if (paused != null) check(label + ': playback stays independent', state.paused === paused, state.paused);
      return state;
    };
    const drag = async () => {
      const canvas = page.locator('#wcJourney3d');
      await canvas.scrollIntoViewIfNeeded();
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + box.width * 0.48, box.y + box.height * 0.55);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.58, box.y + box.height * 0.63, { steps: 5 });
      await page.mouse.up(); await page.waitForTimeout(120);
    };

    await mount({ wc3dCameraMode: 'orbit' });
    await expectMode('Restored observed mode reconciles to a new guided renderer', 'follow', true);
    await page.waitForTimeout(150);
    const beforeStable = await snapshot('before stable guided frames');
    await page.waitForTimeout(400);
    const stable = await snapshot('after stable guided frames');
    check('Paused guided frames produce no camera mode writes', stable.writes.length === beforeStable.writes.length, { before: beforeStable.writes, after: stable.writes });
    check('Paused guided frames produce no React renders', stable.renderCount === beforeStable.renderCount, { before: beforeStable.renderCount, after: stable.renderCount });

    await patch({ journeyPaused: false });
    await drag();
    await expectMode('Dragging a running journey selects free orbit', 'orbit', false);
    await page.getByRole('button', { name: 'Pause water journey', exact: true }).click();
    await expectMode('Pausing an orbiting journey retains free orbit', 'orbit', true);
    await page.locator('#wcJourney3d').press('f');
    await expectMode('F resumes guided camera while journey remains paused', 'follow', true);
    await drag();
    await expectMode('Dragging a paused journey selects free orbit', 'orbit', true);

    await page.evaluate(() => { window.cameraOriginalCanvas = document.getElementById('wcJourney3d'); });
    await patch({ climTemp: 31, climWind: 1.7 });
    await expectMode('Climate rerender preserves actual orbit mode', 'orbit', true);
    check('Climate rerender reuses the same connected canvas', await page.evaluate(() => window.cameraOriginalCanvas === document.getElementById('wcJourney3d')), true);
    await page.locator('#wcJourney3d').press('F');
    await expectMode('Refreshed callback receives uppercase F reset', 'follow', true);
    await page.locator('#wcJourney3d').press('ArrowRight');
    await expectMode('Native right arrow selects free orbit', 'orbit', true);
    await page.locator('#wcJourney3d').press('F');
    await page.locator('#wcJourney3d').press('ArrowUp');
    await expectMode('Native zoom arrow selects free orbit', 'orbit', true);
    await page.locator('#wcJourney3d').press('F');
    await expectMode('Native reset clears manual zoom mode', 'follow', true);

    await drag();
    const beforeSwitch = await snapshot('before native view switch');
    await page.getByRole('button', { name: 'System Map', exact: true }).click();
    await page.waitForTimeout(160);
    check('Leaving 3D disposes the owned renderer', await page.evaluate(() => !window.cameraOriginalCanvas.isConnected && !window.cameraOriginalCanvas._wc3dCleanup), true);
    check('Leaving 3D clears the callback and synchronization handle', await page.evaluate(() => !window.cameraOriginalCanvas._wc3dCameraModeChanged && !window.cameraOriginalCanvas._wc3dSyncCameraMode), true);
    check('2D view has no 3D canvas', await page.locator('#wcJourney3d').count() === 0, true);
    const inMap = await snapshot('2D after old renderer disposal');
    check('Disposal sends no detached status updates', inMap.writes.length === beforeSwitch.writes.length, { before: beforeSwitch.writes, after: inMap.writes });
    await page.getByRole('button', { name: 'Droplet Journey', exact: true }).click();
    await expectMode('Native 2D to 3D recreation reconciles camera status', 'follow', true);
    check('Returning creates a new renderer canvas', await page.evaluate(() => window.cameraOriginalCanvas !== document.getElementById('wcJourney3d')), true);

    // Queue a genuine keyboard status change and detach in the same event turn.
    // The already scheduled bridge must detect disconnection before touching React.
    const beforeDetach = await snapshot('before synchronous keyboard and detach');
    await page.evaluate(() => {
      const canvas = document.getElementById('wcJourney3d');
      window.cameraDetachedCanvas = canvas;
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
    });
    await page.waitForTimeout(160);
    const detached = await snapshot('after synchronous keyboard and detach');
    check('A queued mode observation cannot update the detached host', detached.writes.length === beforeDetach.writes.length, { before: beforeDetach.writes, after: detached.writes });
    check('Synchronous detach clears renderer lifecycle handles', await page.evaluate(() => !window.cameraDetachedCanvas._wc3dCleanup && !window.cameraDetachedCanvas._wc3dCameraModeChanged && !window.cameraDetachedCanvas._wc3dSyncCameraMode), true);

    await page.setViewportSize({ width: 320, height: 800 });
    await mount();
    const phoneLayout = () => page.evaluate(() => {
      const shell = document.querySelector('.wc-canvas-shell');
      const scene = document.getElementById('wcJourney3d');
      const dock = document.querySelector('.wc-viewport-dock');
      const choice = document.querySelector('.wc-viewport-choice');
      const box = element => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
      };
      const controls = Array.from(shell.querySelectorAll('.wc-viewport-actions button, .wc-viewport-choice button')).map(button => ({ name: button.getAttribute('aria-label') || button.innerText, disabled: button.disabled, ...box(button) }));
      return {
        shell: box(shell), scene: box(scene), dock: box(dock), choice: box(choice), controls,
        overflowY: getComputedStyle(shell).overflowY,
        fullscreen: document.fullscreenElement === shell ? 'native' : shell.hasAttribute('data-allo-fullscreen-active') ? 'css-fallback' : 'none',
        fullscreenButton: { name: shell.querySelector('.wc-viewport-fullscreen').getAttribute('aria-label'), pressed: shell.querySelector('.wc-viewport-fullscreen').getAttribute('aria-pressed') },
        dockContained: shell.contains(dock), choiceContained: !choice || shell.contains(choice),
        bodyOverflow: document.body.style.overflow,
        shellView: shell.dataset.watercycleView,
        mobileMediaMatches: matchMedia('(max-width:560px)').matches,
        mobileRuleMatches: shell.matches('.wc-explorer-root .wc-canvas-shell[data-watercycle-view="3d"]'),
        scenePosition: getComputedStyle(scene).position,
        dockPosition: getComputedStyle(dock).position,
      };
    });
    const expectPhoneLayout = async label => {
      const layout = await phoneLayout();
      report.snapshots.push({ label, layout });
      check(label + ': model keeps readable scene height', layout.fullscreen === 'none' ? Math.abs(layout.scene.height - 380) <= 1 : layout.scene.height >= 379, { scene: layout.scene, fullscreen: layout.fullscreen });
      check(label + ': dock sits below model', layout.dock.top >= layout.scene.bottom - 1, { scene: layout.scene, dock: layout.dock });
      check(label + ': dock remains inside shared fullscreen shell', layout.dockContained && layout.choiceContained, layout);
      check(label + ': dock controls meet 44px targets', layout.controls.every(control => control.width >= 43.9 && control.height >= 43.9), layout.controls);
      check(label + ': dock controls stay inside shell width', layout.controls.every(control => control.left >= layout.shell.left - 1 && control.right <= layout.shell.right + 1), layout);
      if (layout.choice) check(label + ': route choices remain below model', layout.choice.top >= layout.scene.bottom - 1, { scene: layout.scene, choice: layout.choice });
      return layout;
    };
    await expectPhoneLayout('Phone 320 ordinary 3D');
    await expectMode('Phone paused guide begins in follow mode', 'follow', true);
    await page.locator('#wcJourney3d').press('ArrowLeft');
    await expectMode('Phone native arrow selects free orbit', 'orbit', true);
    await page.locator('#wcJourney3d').press('F');
    await expectMode('Phone F restores guided camera without resuming water', 'follow', true);
    await page.locator('.wc-canvas-shell').screenshot({ path: path.join(REPORT, 'camera-phone-320.png') });
    check('Actual shared fullscreen helper and binder are loaded', await page.evaluate(() => typeof window.__alloStemFS === 'function' && typeof window.__alloStemFsBind === 'function'), true);

    async function keyboardDock(label) {
      const expected = await page.locator('.wc-viewport-actions button').evaluateAll(buttons => buttons.filter(button => !button.disabled).map(button => button.getAttribute('aria-label') || button.innerText));
      await page.locator('#wcJourney3d').scrollIntoViewIfNeeded();
      await page.locator('#wcJourney3d').focus();
      const focused = [];
      for (let index = 0; index < expected.length; index += 1) {
        await page.keyboard.press('Tab');
        const target = await page.evaluate(() => {
          const button = document.activeElement;
          const shell = document.querySelector('.wc-canvas-shell');
          const rect = button.getBoundingClientRect();
          const bounds = shell.getBoundingClientRect();
          return {
            name: button.getAttribute('aria-label') || button.innerText, inside: shell.contains(button),
            visible: rect.top >= Math.max(bounds.top, 0) - 1 && rect.bottom <= Math.min(bounds.bottom, innerHeight) + 1,
            outlineWidth: getComputedStyle(button).outlineWidth, outlineStyle: getComputedStyle(button).outlineStyle,
            scrollTop: shell.scrollTop,
          };
        });
        focused.push(target);
        check(label + ': Tab reaches ' + expected[index], target.name === expected[index] && target.inside && target.visible, target);
        check(label + ': visible focus on ' + expected[index], parseFloat(target.outlineWidth) >= 2 && target.outlineStyle !== 'none', target);
      }
      report.snapshots.push({ label, focused });
    }

    async function fullscreenPhone(label, forceFallback) {
      if (forceFallback) await page.evaluate(() => {
        Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => false });
        Object.defineProperty(document, 'webkitFullscreenEnabled', { configurable: true, get: () => false });
      });
      await page.getByRole('button', { name: 'View the droplet journey full screen', exact: true }).click();
      await page.waitForFunction(() => document.fullscreenElement === document.querySelector('.wc-canvas-shell') || document.querySelector('.wc-canvas-shell').hasAttribute('data-allo-fullscreen-active'));
      await page.waitForTimeout(160);
      const layout = await expectPhoneLayout(label);
      check(label + ': shared binder changes exit label and pressed state', layout.fullscreenButton.name === 'Exit full screen droplet journey' && layout.fullscreenButton.pressed === 'true', layout.fullscreenButton);
      check(label + ': fullscreen fills phone viewport', Math.abs(layout.shell.width - 320) <= 1 && Math.abs(layout.shell.height - 800) <= 1, layout.shell);
      check(label + ': fullscreen shell allows dock scroll', /auto|scroll/.test(layout.overflowY), layout.overflowY);
      if (forceFallback) check(label + ': actual shared CSS fallback locks body', layout.fullscreen === 'css-fallback' && layout.bodyOverflow === 'hidden', layout);
      else check(label + ': native fullscreen API selects the full shell', layout.fullscreen === 'native', layout.fullscreen);
      await keyboardDock(label);
      await page.getByRole('button', { name: 'Resume water journey', exact: true }).click();
      await expectMode(label + ': resume preserves camera mode', 'follow', false);
      await page.getByRole('button', { name: 'Pause water journey', exact: true }).click();
      await page.locator('#wcJourney3d').press('ArrowRight');
      await expectMode(label + ': native camera arrow stays usable', 'orbit', true);
      await page.locator('#wcJourney3d').press('F');
      await expectMode(label + ': F retains independent pause', 'follow', true);
      await page.locator('.wc-canvas-shell').screenshot({ path: path.join(REPORT, forceFallback ? 'camera-phone-css-fullscreen-320.png' : 'camera-phone-fullscreen-320.png') });
      // Native fullscreen has UA-level Escape handling; the button follows the
      // same real binder exit path. CSS fallback exercises its Escape listener.
      if (forceFallback) await page.keyboard.press('Escape');
      else await page.getByRole('button', { name: 'Exit full screen droplet journey', exact: true }).click();
      await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('.wc-canvas-shell').hasAttribute('data-allo-fullscreen-active'));
      await page.waitForTimeout(120);
      const restored = await expectPhoneLayout(label + ' restored');
      check(label + ': exit restores binder label and pressed state', restored.fullscreenButton.name === 'View the droplet journey full screen' && restored.fullscreenButton.pressed === 'false', restored.fullscreenButton);
      if (forceFallback) check(label + ': Escape releases body scroll lock', restored.bodyOverflow !== 'hidden', restored.bodyOverflow);
    }
    await fullscreenPhone('Phone 320 native fullscreen', false);
    await fullscreenPhone('Phone 320 CSS fullscreen fallback', true);

    await mount({ journeyState: 'ground_choice', activeStage: 'collection', journeyPaused: false });
    await expectPhoneLayout('Phone 320 land route decision');
    await page.locator('.wc-canvas-shell').screenshot({ path: path.join(REPORT, 'camera-phone-route-choice-320.png') });
    await page.getByRole('button', { name: 'System Map', exact: true }).click();
    await page.waitForTimeout(160);
    const mapLayout = await page.locator('.wc-canvas-shell').evaluate(shell => ({ height: shell.getBoundingClientRect().height, dock: !!shell.querySelector('.wc-viewport-dock'), three: !!shell.querySelector('#wcJourney3d'), mapHeight: shell.querySelector('#wcCanvas').getBoundingClientRect().height }));
    check('Phone return to 2D restores the 380px map shell', Math.abs(mapLayout.height - 380) <= 1 && Math.abs(mapLayout.mapHeight - 380) <= 2, mapLayout);
    check('Phone return to 2D removes the 3D dock and canvas', !mapLayout.dock && !mapLayout.three, mapLayout);

    check('Loaded source and public mirror match', report.sourceSha256 === report.sourceMirrorSha256, { source: report.sourceSha256, public: report.sourceMirrorSha256 });
    check('Runtime remained unchanged during camera QA', hash(fs.readFileSync(SOURCE, 'utf8')) === report.sourceSha256, { frozen: report.sourceSha256, current: hash(fs.readFileSync(SOURCE, 'utf8')) });
    check('No runtime errors in the camera review', report.errors.length === 0, report.errors);
  } catch (error) {
    report.errors.push(String(error && error.stack || error));
    check('Camera QA completes', false, String(error));
  } finally {
    await browser.close(); report.browserClosed = true;
    report.finishedAt = new Date().toISOString();
    report.passed = report.checks.filter(item => item.passed).length;
    report.failed = report.checks.filter(item => !item.passed).length;
    fs.writeFileSync(path.join(REPORT, 'camera-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ passed: report.passed, failed: report.failed, errors: report.errors.length, sourceSha256: report.sourceSha256, browserClosed: report.browserClosed }));
    if (report.failed || report.errors.length) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
