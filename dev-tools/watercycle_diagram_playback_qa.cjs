'use strict';
// Isolated browser checks for Explorer canvas playback and guide semantics.
// Run from the repository root: node dev-tools/watercycle_diagram_playback_qa.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'reports', 'watercycle-diagram-clarity');
const SOURCE = path.join(ROOT, 'stem_lab', 'stem_tool_watercycle.js');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const report = {
  title: 'Water Cycle diagram playback and guide browser checks',
  startedAt: new Date().toISOString(),
  sourceSha256: sha(SOURCE),
  sourceMirrorSha256: sha(path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js')),
  method: 'One isolated Chromium context, real React callbacks and native view/process buttons; controlled document.hidden override dispatches the actual visibilitychange handler.',
  checks: [], snapshots: [], errors: [], browserClosed: false,
};
function check(label, passed, evidence) {
  report.checks.push({ label, passed: !!passed, evidence });
}
function recordError(label, error) {
  report.errors.push({ label, message: String(error && error.stack || error) });
  check(label, false, String(error));
}
async function phase(label, run) {
  try { await run(); }
  catch (error) { recordError(label, error); }
}
async function main() {
  fs.mkdirSync(REPORT, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const browserErrors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    page.on('pageerror', error => browserErrors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><title>Water Cycle diagram playback QA</title></head><body style="margin:0;background:#f1f5f9;font-family:system-ui"><main id="slot" style="padding:12px"></main></body></html>');
    await page.addStyleTag({ content: read('dev-tools/.cache/sweep-tailwind.css') });
    for (const file of [
      'desktop/web-app/node_modules/react/umd/react.production.min.js',
      'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js',
      'vendor/three-r128/three.min.js',
      'vendor/three-r128/OrbitControls.js',
      'stem_lab/stem_lab_module.js',
      'stem_lab/stem_tool_watercycle.js',
    ]) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => {
      window.qaHidden = false;
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.qaHidden });
      const Icons = new Proxy({}, { get: () => () => React.createElement('span', { 'aria-hidden': true }) });
      window.mountPlaybackWater = seed => {
        function Host() {
          const [data, setData] = React.useState({ waterCycle: seed, _threeLoaded: true });
          window.playbackData = data.waterCycle;
          window.playbackSet = setData;
          const noop = () => {};
          return window.StemLab._registry.waterCycle.render({
            React, toolData: data, setToolData: setData, isDark: false, isContrast: false,
            gradeBand: '6-8', gradeLevel: '7th Grade', icons: Icons,
            setStemLabTool: noop, setStemLabTab: noop, setToolSnapshots: noop, toolSnapshots: [],
            addToast: noop, announceToSR: noop, awardXP: noop, getXP: () => 0,
            beep: noop, celebrate: noop, canvasNarrate: noop, canvasA11yDesc: noop,
            a11yClick: fn => ({ onClick: fn }), t: (key, fallback) => fallback == null ? key : fallback,
            props: {}, srOnly: {}, callGemini: null,
          });
        }
        ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
        ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
      };
      window.patchPlaybackWater = patch => window.playbackSet(previous => ({ ...previous, waterCycle: { ...previous.waterCycle, ...patch } }));
      window.inspectPlayback = () => {
        const canvas = document.getElementById('wcCanvas');
        const ctx = canvas && canvas.getContext('2d');
        const pixel = ctx && canvas.width && canvas.height ? Array.from(ctx.getImageData(Math.floor(canvas.width * 0.43), Math.floor(canvas.height * 0.65), 1, 1).data) : [];
        const guide = document.getElementById('wcCanvasGuideDescription');
        const depiction = guide && guide.querySelector('.wc-canvas-guide-depiction');
        const frameCanvas = document.getElementById('wcJourney3d');
        return {
          width: canvas && canvas.width, height: canvas && canvas.height,
          painted: pixel[3] > 0, pixel,
          pendingFrame: !!(canvas && canvas._wcAnim),
          initialized: !!(canvas && canvas._wcInit),
          journeyProgress: Number(canvas && canvas.dataset.journeyProgress || 0),
          journeyState: canvas && canvas.dataset.journeyState,
          renderMode: canvas && canvas.dataset.renderMode,
          wc2dPaused: canvas && canvas.dataset.wc2dPaused,
          journeyPaused: canvas && canvas.dataset.journeyPaused,
          stage: canvas && canvas.dataset.activeStage,
          phaseFrom: canvas && canvas.dataset.waterPhaseFrom,
          phaseTo: canvas && canvas.dataset.waterPhaseTo,
          energy: canvas && canvas.dataset.energyTransfer,
          solar: canvas && canvas.dataset.climSolar,
          temp: canvas && canvas.dataset.climTemp,
          guide: guide && guide.innerText,
          guideProcess: guide && guide.querySelector('.wc-canvas-guide-handoff-process').innerText,
          guideBadge: guide && guide.querySelector('.wc-canvas-guide-badge').innerText,
          sceneTitle: document.querySelector('.wc-canvas-title strong') && document.querySelector('.wc-canvas-title strong').innerText,
          canvasAria: canvas && canvas.getAttribute('aria-label'),
          guideEnergy: guide && guide.querySelector('.wc-canvas-guide-handoff-energy').innerText,
          vaporGuidance: depiction && depiction.dataset.vaporGuidance,
          guideAssociation: canvas && canvas.getAttribute('aria-describedby'),
          engine: frameCanvas && frameCanvas.dataset.engineState,
          state: { ...window.playbackData },
        };
      };
      window.setPlaybackVisibility = hidden => {
        window.qaHidden = hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      };
    });
    const snapshot = () => page.evaluate(() => window.inspectPlayback());
    const mount = async seed => {
      await page.evaluate(seed => window.mountPlaybackWater(seed), { wcMode: 'explore', wcSection: 'explore', ...seed });
      await page.waitForTimeout(160);
    };
    const patch = async fields => {
      await page.evaluate(fields => window.patchPlaybackWater(fields), fields);
      await page.waitForTimeout(160);
    };
    const sample = async (name, delay = 500) => {
      const before = await snapshot();
      await page.waitForTimeout(delay);
      const after = await snapshot();
      report.snapshots.push({ name, before, after, intervalMs: delay });
      return { before, after };
    };
    console.log('Browser loaded; source ' + report.sourceSha256);

    await phase('initial paused 2D lifecycle', async () => {
      await mount({ journeyView: '2d', activeStage: 'evaporation', wc2dPaused: true });
      const { before, after } = await sample('initial-paused-2d');
      check('Initial restored paused 2D canvas paints', before.initialized && before.painted, before);
      check('Initial paused 2D has no pending animation frame', !before.pendingFrame && !after.pendingFrame, { before: before.pendingFrame, after: after.pendingFrame });
      check('Initial paused 2D stays visually stable', JSON.stringify(before.pixel) === JSON.stringify(after.pixel), { before: before.pixel, after: after.pixel });
      check('Canonical dataset.wc2dPaused reports pause', before.wc2dPaused === 'true', before.wc2dPaused);
      check('2D canvas remains associated with the visible guide', /wcCanvasGuideDescription/.test(before.guideAssociation), before.guideAssociation);
    });

    await phase('active paused 2D repaint lifecycle', async () => {
      await mount({ journeyView: '2d', activeStage: 'evaporation', journeyActive: true, journeyState: 'evaporating', journeyPaused: false, wc2dPaused: true, climTemp: 15, climSolar: 1 });
      await page.evaluate(() => document.getElementById('wcCanvas')._wcSetJourneyProgress(0.23));
      const before = await snapshot();
      await patch({ climTemp: 31, climSolar: 0.35 });
      const changed = await snapshot();
      check('Paused 2D React control update reaches the actual canvas', changed.temp === '31' && changed.solar === '0.35', { temp: changed.temp, solar: changed.solar });
      check('Paused active 2D repaint preserves journey progress', changed.journeyProgress === before.journeyProgress, { before: before.journeyProgress, after: changed.journeyProgress });
      check('Paused 2D control update leaves a painted canvas without RAF', changed.painted && !changed.pendingFrame, { painted: changed.painted, pendingFrame: changed.pendingFrame });
      await page.evaluate(() => document.getElementById('wcCanvas')._wcRedraw());
      const { before: redrawn, after } = await sample('paused-active-2d-forced-redraw');
      check('Explicit paused 2D redraw preserves journey progress', redrawn.journeyProgress === before.journeyProgress && after.journeyProgress === before.journeyProgress, { start: before.journeyProgress, redrawn: redrawn.journeyProgress, after: after.journeyProgress });
      check('Explicit paused 2D redraw leaves no RAF', !redrawn.pendingFrame && !after.pendingFrame, { redrawn: redrawn.pendingFrame, after: after.pendingFrame });
    });

    await phase('hidden initial paused 2D visibility lifecycle', async () => {
      await page.evaluate(() => window.setPlaybackVisibility(true));
      await mount({ journeyView: '2d', activeStage: 'infiltration', wc2dPaused: true });
      const hidden = await snapshot();
      check('Hidden restored paused 2D schedules no frame', !hidden.pendingFrame, hidden.pendingFrame);
      await page.evaluate(() => window.setPlaybackVisibility(false));
      const { before, after } = await sample('restored-paused-2d-visible');
      check('Visibility restoration paints paused 2D', before.painted && after.painted, { before: before.pixel, after: after.pixel });
      check('Visibility restoration keeps paused 2D free of RAF', !before.pendingFrame && !after.pendingFrame, { before: before.pendingFrame, after: after.pendingFrame });
      check('Visibility restoration preserves canonical pause state', before.wc2dPaused === 'true' && after.wc2dPaused === 'true', { before: before.wc2dPaused, after: after.wc2dPaused });
    });

    const stages = [
      ['evaporation', 'Latent heat absorbed', true],
      ['condensation', 'Latent heat released', true],
      ['precipitation', 'No required phase change', false],
      ['collection', 'No required phase change', false],
      ['transpiration', 'Latent heat absorbed', true],
      ['infiltration', 'No required phase change', false],
    ];
    async function guideProcesses(view) {
      for (let index = 0; index < stages.length; index += 1) {
        const [stage, energy, vapor] = stages[index];
        await page.locator('.wc-stage-rack button').nth(index).click();
        const state = await snapshot();
        const processName = stage.charAt(0).toUpperCase() + stage.slice(1);
        check(view + ' ' + stage + ': selected process reaches canvas', state.stage === stage, state.stage);
        check(view + ' ' + stage + ': handoff names the selected standalone process', state.guideProcess === processName, state.guideProcess);
        check(view + ' ' + stage + ': badge names the selected standalone process', state.guideBadge.includes(processName), state.guideBadge);
        check(view + ' ' + stage + ': correct resolved heat description', state.guideEnergy === energy, state.guideEnergy);
        check(view + ' ' + stage + ': correct invisible-vapor guidance', state.vaporGuidance === (vapor ? 'visible' : 'not-applicable'), state.vaporGuidance);
        check(view + ' ' + stage + ': all three existing symbols have meanings', ['Tracked parcel', 'Location, not amount', 'Water direction', 'Arrows show the route', 'Heat cue', 'Energy, not water'].every(text => state.guide.includes(text)), state.guide);
        check(view + ' ' + stage + ': marker scale guidance is visible', state.guide.includes('Markers are enlarged; the scene is not to scale.'), state.guide);
        check(view + ' ' + stage + ': raw energy enum is absent', !/Energy:\s*none/.test(state.guide), state.guideEnergy);
      }
    }
    await phase('six 2D process guide semantics', async () => {
      await mount({ journeyView: '2d', activeStage: 'evaporation', wc2dPaused: true });
      await guideProcesses('2D');
    });

    await phase('paused 2D to 3D driver lifecycle', async () => {
      const before = await snapshot();
      check('View-switch starts from a paused 2D canvas without RAF', before.wc2dPaused === 'true' && !before.pendingFrame, { pause: before.wc2dPaused, frame: before.pendingFrame });
      await page.getByRole('button', { name: 'Droplet Journey', exact: true }).click();
      await page.waitForFunction(() => document.getElementById('wcJourney3d') && document.getElementById('wcJourney3d').dataset.engineState === 'ready');
      await patch({ journeyActive: true, journeyState: 'ocean', activeStage: 'collection', journeyPaused: false });
      const { before: running, after } = await sample('paused-2d-switch-running-3d', 800);
      check('Switching paused 2D to 3D resumes hidden driver RAF', running.renderMode === 'state-only' && running.pendingFrame && after.pendingFrame, { mode: running.renderMode, before: running.pendingFrame, after: after.pendingFrame });
      check('Started unpaused 3D journey advances despite retained 2D pause', after.journeyProgress > running.journeyProgress || after.journeyState !== running.journeyState, { before: running.journeyProgress, after: after.journeyProgress, beforeState: running.journeyState, afterState: after.journeyState, wc2dPaused: after.wc2dPaused });
      check('3D engine successfully creates WebGL renderer', after.engine === 'ready', after.engine);
      await patch({ journeyPaused: true });
      const paused = await sample('paused-3d-journey', 700);
      check('Paused 3D journey progress stays fixed', paused.before.journeyProgress === paused.after.journeyProgress, { before: paused.before.journeyProgress, after: paused.after.journeyProgress });
      check('Paused 3D journey state stays fixed', paused.before.journeyState === paused.after.journeyState, { before: paused.before.journeyState, after: paused.after.journeyState });
    });

    await phase('six 3D process guide semantics', async () => {
      await patch({ journeyActive: false, journeyState: 'idle', journeyPaused: true });
      await guideProcesses('3D');
    });

    await phase('3D root uptake versus transpiration guide', async () => {
      await patch({ journeyActive: true, journeyState: 'plant_absorb', journeyPaused: true, activeStage: 'transpiration' });
      const root = await snapshot();
      check('3D root uptake handoff names the active step', root.guideProcess === 'Plant uptake', root.guideProcess);
      check('3D root uptake badge names the active step', root.guideBadge.includes('Plant uptake'), root.guideBadge);
      check('3D root uptake scene title names the active step', root.sceneTitle === 'Plant uptake', root.sceneTitle);
      check('Root uptake canvas text alternative names the active step', root.canvasAria.includes('Plant uptake'), root.canvasAria);
      check('3D root uptake trace stays liquid-to-liquid', root.phaseFrom === 'Liquid soil water' && root.phaseTo === 'Liquid plant water', { from: root.phaseFrom, to: root.phaseTo });
      check('3D root uptake requires no phase change', root.guideEnergy === 'No required phase change' && root.energy === 'none', { guide: root.guideEnergy, transfer: root.energy });
      check('3D root uptake does not imply invisible vapor formation', root.vaporGuidance === 'not-applicable' && !root.guide.includes('Water vapor is invisible'), root.guide);
      await page.locator('#wcCanvasGuideDescription').screenshot({ path: path.join(REPORT, 'playback-guide-root-uptake.png') });
      await patch({ journeyState: 'transpiring', journeyPaused: true });
      const transpiring = await snapshot();
      check('3D transpiring handoff names Transpiration', transpiring.guideProcess === 'Transpiration', transpiring.guideProcess);
      check('3D transpiring badge names Transpiration', transpiring.guideBadge.includes('Transpiration'), transpiring.guideBadge);
      check('3D transpiring scene title names Transpiration', transpiring.sceneTitle === 'Transpiration', transpiring.sceneTitle);
      check('Transpiring canvas text alternative names the active step', transpiring.canvasAria.includes('Transpiration'), transpiring.canvasAria);
      check('3D transpiring trace changes liquid plant water to vapor', transpiring.phaseFrom === 'Liquid plant water' && transpiring.phaseTo === 'Water vapor', { from: transpiring.phaseFrom, to: transpiring.phaseTo });
      check('3D transpiring requires absorbed latent heat', transpiring.guideEnergy === 'Latent heat absorbed' && transpiring.energy === 'absorbed', { guide: transpiring.guideEnergy, transfer: transpiring.energy });
      check('3D transpiring explains invisible vapor marks', transpiring.vaporGuidance === 'visible' && transpiring.guide.includes('Water vapor is invisible; drawn marks trace its path.'), transpiring.guide);
      await page.locator('#wcCanvasGuideDescription').screenshot({ path: path.join(REPORT, 'playback-guide-transpiring.png') });
      for (const [journeyState, activeStage, expected] of [
        ['river_runoff', 'collection', /river.*runoff/i],
        ['aquifer_flow', 'infiltration', /(?:aquifer|groundwater).*flow/i],
      ]) {
        await patch({ journeyState, activeStage, journeyPaused: true });
        const active = await snapshot();
        check('3D ' + journeyState + ' handoff names the active journey transfer', expected.test(active.guideProcess), active.guideProcess);
        check('3D ' + journeyState + ' badge names the active journey transfer', expected.test(active.guideBadge), active.guideBadge);
        check('3D ' + journeyState + ' scene title names the active journey transfer', expected.test(active.sceneTitle) && active.sceneTitle === active.guideProcess, active.sceneTitle);
      }
    });

    check('No browser runtime errors', browserErrors.length === 0, browserErrors);
    await page.evaluate(() => ReactDOM.unmountComponentAtNode(document.getElementById('slot')));
    await page.waitForTimeout(100);
    await context.close();
  } finally {
    await browser.close();
    report.browserClosed = true;
    report.finishedAt = new Date().toISOString();
    report.finalSourceSha256 = sha(SOURCE);
    report.finalMirrorSha256 = sha(path.join(ROOT, 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'));
    check('Runtime source stayed unchanged during playback verification', report.sourceSha256 === report.finalSourceSha256, { before: report.sourceSha256, after: report.finalSourceSha256 });
    check('Source and desktop public mirror match at verification end', report.finalSourceSha256 === report.finalMirrorSha256, { source: report.finalSourceSha256, mirror: report.finalMirrorSha256 });
    report.passed = report.checks.filter(item => item.passed).length;
    report.failed = report.checks.filter(item => !item.passed).length;
    fs.writeFileSync(path.join(REPORT, 'playback-results.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ checks: report.checks.length, passed: report.passed, failed: report.failed, errors: report.errors.length, sourceSha256: report.finalSourceSha256, browserClosed: report.browserClosed }));
    if (report.failed || report.errors.length) process.exitCode = 1;
  }
}
main().catch(error => {
  recordError('Browser harness failed', error);
  fs.mkdirSync(REPORT, { recursive: true });
  fs.writeFileSync(path.join(REPORT, 'playback-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.error(error);
  process.exitCode = 1;
});
