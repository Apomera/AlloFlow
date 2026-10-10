import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { GlHarness } from './helpers/stem_gl_harness';

const out = process.env.DISSECTION_REPLAY_EVIDENCE_OUTPUT || 'test-results/dissection-replay-evidence';
const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_dissection.js', toolId: 'dissection', width: 1180, height: 1000, layout: 'document', appStyles: true, preScripts: ['stem_lab/stem_lab_module.js'] });
const helpText = 'Replay follows the saved action order. Missing stroke data uses an illustrative teaching path. Pressure and instrument settings appear only when recorded.';
const savedPath = [{ x: 0.47, y: 0.30 }, { x: 0.50, y: 0.48 }, { x: 0.53, y: 0.66 }];
const tissue = { moisture: 67, tension: 52, exposure: 8, trauma: 0, clarity: 81, stability: 19, risk: 11, salineDrops: 0, variantId: 'firm', variantLabel: 'Firm preservation', lastAction: 'prepared', lastUpdatedAt: 100, consequences: [] };
const initial = { specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'ventral', activeInstrument: 'forceps', selectedOrgan: null, revealedLayers: {}, workspaceMode: 'advanced', techniquePanelOpen: true, procedureMode: 'independent', organNotes: { 'frog|ventral_skin': 'Preserved observation.' }, organConfidence: { 'frog|ventral_skin': 2 }, verifiedIdentifications: { 'frog|tympanum': true }, quizScore: 1, quizTotal: 2, reducedMotion: true, soundEnabled: false, sceneDetail: false };
const errors = new WeakMap<Page, string[]>();

test.describe.configure({ retries: 0, timeout: 120_000 });
test.use({ video: 'off' });
test.beforeAll(async () => { await harness.start(); await mkdir(out, { recursive: true }); });
test.afterAll(async () => { await harness.stop(); });
test.beforeEach(async ({ page }) => {
  const list: string[] = []; errors.set(page, list); page.on('pageerror', error => list.push(error.message));
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as any).__replayText = [];
    CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
      if (this.canvas.matches('[data-diss-canvas]')) {
        const transform = this.getTransform(), measured = this.measureText(String(text)).width;
        const start = new DOMPoint(x, y).matrixTransform(transform);
        const end = new DOMPoint(x + measured, y).matrixTransform(transform);
        const fontPixels = Number(/([\d.]+)px/.exec(this.font)?.[1] || 0);
        const cssFontSize = fontPixels * Math.hypot(transform.c, transform.d) * this.canvas.getBoundingClientRect().height / this.canvas.height;
        const density = (this.canvas as any)._dpr || 1;
        const replayBox = ((this.canvas as any)._canvasHudBoxes || []).find((box: any) => box.id === 'replay');
        const logicalX = start.x / density, logicalY = start.y / density;
        const inReplayCaption = !!replayBox && logicalX >= replayBox.x && logicalX <= replayBox.x + replayBox.width && logicalY >= replayBox.y && logicalY <= replayBox.y + replayBox.height;
        (window as any).__replayText.push({ text: String(text), font: this.font, cssFontSize, inReplayCaption, x: start.x, y: start.y, end: end.x, width: this.canvas.width, height: this.canvas.height });
        if ((window as any).__replayText.length > 2000) (window as any).__replayText.splice(0, 1000);
      }
      if (maxWidth === undefined) original.call(this, text, x, y); else original.call(this, text, x, y, maxWidth);
    };
  });
});
test.afterEach(async ({ page }) => {
  if (await page.evaluate(() => typeof (window as any).__unmount === 'function')) await harness.unmount(page);
  expect(errors.get(page)).toEqual([]);
});

async function preservedState(page: Page) {
  return page.evaluate(() => {
    const { timeSpent: _time, _procedureReplay: _replay, procedureFeedback: _feedback, ...state } = (window as any).__ctx.toolData.dissection;
    return state;
  });
}

for (const variant of [
  { name: 'legacy-phone', width: 320, available: 320, historyOnly: true, path: false, pressure: false, supported: false, label: 'TEACHING PATH' },
  { name: 'saved-desktop', width: 1440, available: 1180, historyOnly: false, path: true, pressure: false, supported: false, label: 'SAVED PATH' },
  { name: 'pressure-forced-colors', width: 390, available: 390, historyOnly: false, path: true, pressure: true, supported: false, label: 'SAVED PATH', forced: true },
  { name: 'supported-embedded-large', width: 1440, available: 320, historyOnly: false, path: true, pressure: false, supported: true, label: 'SUPPORTED PATH', large: true, contrast: true },
]) test(`attempt replay ${variant.name} identifies the evidence behind the visible trace`, async ({ page }) => {
  if (variant.forced) await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: variant.width, height: 1000 });
  const procedure = {
    tissueState: tissue, inspected: true, incisionStarted: true, errors: 0, protocolDeviations: 0, history: ['scalpel'], cautionLog: [], learningChecks: {},
    actionLog: variant.historyOnly ? [] : [{ action: 'scalpel', label: 'Incision', at: 100, inputType: variant.supported ? 'button' : 'pointer', assistance: variant.supported ? 'motor-neutral' : 'independent' }],
    ...(variant.path ? { incisionPath: savedPath } : {}),
    ...(variant.pressure ? { incisionSamples: savedPath.map((point, index) => ({ ...point, t: index * 100, pressure: 0.5 })) } : {}),
  };
  await harness.mount(page, { dissection: { ...initial, procedureByLayer: { skin: procedure }, largeText: !!variant.large, highContrast: !!variant.contrast } }, undefined, { expectCanvas: false });
  await page.evaluate(() => { const meta = document.querySelector('meta[name="viewport"]') || document.head.appendChild(document.createElement('meta')); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'width=device-width, initial-scale=1'); });
  await page.addStyleTag({ content: `#wrap {width:100%!important;max-width:${variant.available}px;}` });
  const canvas = page.locator('[data-diss-canvas]'), help = page.locator('#diss-replay-evidence-help');
  const replay = page.getByRole('button', { name: 'Replay the recorded technique attempt on the specimen', exact: true });
  await expect(help).toBeVisible(); await expect(help).toHaveText(helpText);
  await expect(replay).toBeEnabled(); await expect(replay).toHaveAttribute('aria-describedby', 'diss-replay-evidence-help');
  await expect(replay).toHaveAccessibleDescription(helpText);
  const before = await preservedState(page);
  await replay.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await expect(replay).toBeFocused();
  expect(await preservedState(page)).toEqual(before);
  const metrics = await help.evaluate(node => {
    const parent = node.parentElement!, button = parent.querySelector('[aria-describedby="diss-replay-evidence-help"]')!;
    return { help: { font: parseFloat(getComputedStyle(node).fontSize), client: node.clientWidth, scroll: node.scrollWidth }, parent: { width: parent.getBoundingClientRect().width, client: parent.clientWidth, scroll: parent.scrollWidth }, button: { height: button.getBoundingClientRect().height, outline: getComputedStyle(button).outlineStyle, outlineWidth: parseFloat(getComputedStyle(button).outlineWidth) } };
  });
  expect(metrics.help.font).toBeGreaterThanOrEqual(variant.large ? 18 : 16); expect(metrics.help.scroll).toBeLessThanOrEqual(metrics.help.client + 1);
  expect(metrics.parent.width).toBeLessThanOrEqual(variant.available); expect(metrics.parent.scroll).toBeLessThanOrEqual(metrics.parent.client + 1);
  await writeFile(`${out}/${variant.name}-metrics.json`, JSON.stringify(metrics, null, 2));
  await help.locator('..').screenshot({ path: `${out}/${variant.name}-controls.png`, style: '.diss-next-action{position:static!important;}' });
  await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['.diss-procedure__controls']] }));
  await writeFile(`${out}/${variant.name}-axe.json`, JSON.stringify(audit, null, 2)); expect(audit.violations).toEqual([]);

  const epoch = await page.evaluate(() => Date.now()); await page.clock.install({ time: new Date(epoch) }); await page.clock.pauseAt(new Date(epoch + 1000));
  await page.evaluate(() => { (window as any).__replayText = []; });
  await replay.focus(); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => !!(window as any).__ctx.toolData.dissection._procedureReplay)).toBe(true);
  await canvas.evaluate(node => node.scrollIntoView({ block: 'center' }));
  await expect.poll(() => canvas.evaluate(node => (node as any)._dissInViewport)).toBe(true);
  await page.clock.runFor(80);
  await expect.poll(() => page.evaluate(() => (window as any).__replayText.filter((row: any) => row.inReplayCaption && row.text.startsWith('STEP 1/1')).length)).toBeGreaterThan(0);
  const records = await page.evaluate(() => (window as any).__replayText.filter((row: any) => row.inReplayCaption));
  const captionText = records.map((row: any) => row.text).join(' ').replace(/\s+/g, ' ');
  expect(captionText).toContain(variant.label);
  if (variant.pressure) { expect(captionText).toContain('PRESSURE 50%'); expect(captionText).not.toContain('PRESSURE NOT RECORDED'); }
  else { expect(captionText).toContain('PRESSURE NOT RECORDED'); expect(captionText).not.toMatch(/PRESSURE \d+%/); }
  if (variant.historyOnly || variant.supported) expect(captionText).not.toMatch(/ON PATH|EDGE|CORRECTION/);
  for (const row of records) { expect(row.x).toBeGreaterThanOrEqual(0); expect(row.end).toBeLessThanOrEqual(row.width + 1); expect(row.y).toBeGreaterThan(0); expect(row.y).toBeLessThanOrEqual(row.height); expect(row.cssFontSize).toBeGreaterThanOrEqual(12); }
  const geometry = await canvas.evaluate(node => {
    const drawing = node as HTMLCanvasElement & { _logicalW?: number; _logicalH?: number; _canvasHudBoxes?: any[]; _guidanceBoxes?: any[] };
    const hud = drawing._canvasHudBoxes || [], guidance = drawing._guidanceBoxes || [];
    const box = hud.find(item => item.id === 'replay');
    const overlap = (other: any) => box ? Math.max(0, Math.min(box.x + box.width, other.x + other.width) - Math.max(box.x, other.x)) * Math.max(0, Math.min(box.y + box.height, other.y + other.height) - Math.max(box.y, other.y)) : null;
    return { box, width: drawing._logicalW || drawing.width, height: drawing._logicalH || drawing.height,
      guidance: guidance.map(item => ({ ...item, overlap: overlap(item) })),
      otherHud: hud.filter(item => item.id !== 'replay').map(item => ({ ...item, overlap: overlap(item) })) };
  });
  expect(geometry.box).toBeDefined();
  expect(geometry.box.x).toBeGreaterThanOrEqual(0); expect(geometry.box.y).toBeGreaterThanOrEqual(0);
  expect(geometry.box.x + geometry.box.width).toBeLessThanOrEqual(geometry.width);
  expect(geometry.box.y + geometry.box.height).toBeLessThanOrEqual(geometry.height);
  for (const obstacle of geometry.guidance.concat(geometry.otherHud)) expect(obstacle.overlap).toBe(0);
  const after = await preservedState(page); expect(after).toEqual(before);
  const replayState = await page.evaluate(() => (window as any).__ctx.toolData.dissection._procedureReplay);
  expect(replayState.layer).toBe('skin'); expect(replayState.actions).toHaveLength(1); expect(replayState.actions[0].action).toBe('scalpel');
  await canvas.screenshot({ path: `${out}/${variant.name}-canvas.png`, style: '.diss-next-action{position:static!important;}' });
  await writeFile(`${out}/${variant.name}-replay.json`, JSON.stringify({ records, captionText, geometry, savedStatePreserved: true, replayActions: replayState.actions }, null, 2));
  await page.clock.runFor(replayState.duration + 251);
  expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._procedureReplay)).toBeFalsy();
  expect(await preservedState(page)).toEqual(before);
});
