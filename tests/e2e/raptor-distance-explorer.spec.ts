import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND14_REPORT || 'reports/raptor-distance-round14-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900, appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.explorerNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  panel: '[data-distance-signal]', explorer: '[data-distance-signal-explorer]', table: '[data-distance-signal-extremes]',
  read: '[data-distance-signal-read]', keep: '[data-distance-signal-keep]', probe: '[data-distance-signal-probe]',
  readiness: '[data-distance-signal-readiness]', next: '[data-distance-signal-next]', feedback: '[data-distance-signal-range-feedback]',
  reveal: '[data-distance-reveal]', heading: '[data-distance-prediction-heading]', note: '[data-distance-note]',
  status: '[data-distance-status]', retry: '[data-distance-retry]', error: '[data-distance-signal-error]'
};
const priorRecord = { version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'My earlier saved observation.' };
const savedResults = { version: 1, human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, index) => ({
  settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: index ? 'eagle' : 'both'
})) } };

async function setup(page: Page, failFirstCreate = false) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    const nativeRead = CanvasRenderingContext2D.prototype.getImageData;
    (window as any).explorerRafs = 0; (window as any).explorerCaptures = 0; (window as any).explorerReads = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).explorerRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).explorerCaptures++;
      return nativePng.apply(this, args as any);
    };
    CanvasRenderingContext2D.prototype.getImageData = function (...args: any[]) {
      if (this.canvas.hasAttribute('data-distance-canvas') && /raptor_distance_(study|signal)\.js/.test(String(new Error().stack))) (window as any).explorerReads++;
      return nativeRead.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.explorerNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  if (failFirstCreate) await page.route('**/stem_lab/raptor_distance_scene.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/raptor_distance_scene.js', 'utf8') + '\n(function(){var original=window.RaptorDistanceScene,create=original.create;window.explorerCreateAttempts=0;window.RaptorDistanceScene=Object.assign({},original,{create:function(){if(++window.explorerCreateAttempts===1)throw new Error("Injected one-time scene setup failure");return create.apply(original,arguments);}});})();'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low',
    xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 80, cycles: 8, contrast: 95, records: [priorRecord], fieldworkResults: savedResults }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible(); expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}
async function siblings(page: Page) {
  return page.evaluate(() => { const value = { ...(window as any).__toolData.raptorHunt }; delete value.distantDetailStudy; return value; });
}
async function activate(page: Page, selector: string) { await page.locator(selector).focus(); await page.keyboard.press('Enter'); }
async function open(page: Page) {
  await activate(page, ui.launch); await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await activate(page, ui.panel + ' > summary');
}
async function reveal(page: Page) {
  await activate(page, '[data-distance-prediction="both"]'); await activate(page, ui.reveal);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}
async function setRange(page: Page, selector: string, value: number) {
  await page.locator(selector).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator(selector)).toHaveValue(String(value));
}
async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({ lifecycle: root._distanceScene.getDiagnostics().lifecycle,
    captures: (window as any).explorerCaptures, reads: (window as any).explorerReads, rafs: (window as any).explorerRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy }));
}
async function ready(page: Page, state: string) {
  await expect(page.locator(ui.readiness)).toHaveAttribute('data-state', state);
  for (const selector of [ui.read, ui.keep]) await expect(page.locator(selector)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-signal-readiness(?:\s|$)/);
  await expect(page.locator(ui.read))[['read', 'ready'].includes(state) ? 'toBeEnabled' : 'toBeDisabled']();
  await expect(page.locator(ui.keep))[state === 'ready' ? 'toBeEnabled' : 'toBeDisabled']();
  return { state, text: await page.locator(ui.readiness).innerText() };
}
async function pixels(page: Page) {
  // Independently sample the rendered row; do not reuse the activity's measurements or extrema helpers.
  return page.locator(ui.root).evaluate(root => {
    const distance = Number((root.querySelector('#rh-distance-distance') as HTMLInputElement).value);
    const width = 1024 * .30 / (2 * distance * Math.tan(.75 * Math.PI / 360));
    const x0 = Math.ceil(512 - width * .30), x1 = Math.floor(512 + width * .30), y = 256, count = x1 - x0 + 1;
    const rows = ['reference', 'eagle'].map(name => {
      const canvas = root.querySelector('canvas[data-distance-canvas="' + name + '"]') as HTMLCanvasElement;
      const rgba = canvas.getContext('2d')!.getImageData(x0, y, count, 1).data, values: number[] = [];
      for (let i = 0; i < rgba.length; i += 4) values.push((rgba[i] + rgba[i + 1] + rgba[i + 2]) / 3);
      const min = Math.min(...values), max = Math.max(...values);
      return { name: name === 'reference' ? 'human' : 'eagle', values, min, max, range: max - min,
        minIndex: values.indexOf(min), maxIndex: values.indexOf(max) };
    });
    return { distance, x0, x1, y, count, rows };
  });
}
async function inspect(page: Page) {
  const expected = await pixels(page), before = await work(page);
  await activate(page, ui.read); await expect(page.locator(ui.explorer)).toBeAttached();
  if (await page.locator(ui.explorer).getAttribute('open') === null) await activate(page, ui.explorer + ' > summary');
  await expect(page.locator(ui.table)).toBeVisible(); await ready(page, 'ready');
  const after = await work(page); expect(after).toEqual({ ...before, reads: before.reads + 2 });
  for (const row of expected.rows) {
    for (const extreme of ['min', 'max'] as const) {
      const cell = page.locator('[data-distance-signal-extreme="' + row.name + '-' + extreme + '"]');
      expect(Number(await cell.getAttribute('data-value'))).toBeCloseTo(row[extreme], 10);
      await expect(cell).toContainText(row[extreme].toFixed(1));
    }
    await expect(page.locator('[data-distance-signal-explorer-range="' + row.name + '"]')).toContainText(row.range.toFixed(1));
  }
  return expected;
}
async function probeValues(page: Page, evidence: Awaited<ReturnType<typeof pixels>>, index: number) {
  await expect(page.locator(ui.probe)).toHaveValue(String(index));
  await expect(page.locator(ui.probe)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-signal-explore-help(?:\s|$)/);
  for (const row of evidence.rows) {
    await expect(page.locator('[data-distance-signal-value="' + row.name + '"]')).toHaveText(row.values[index].toFixed(1));
    await expect(page.locator('[data-distance-signal-marker="' + row.name + '"]')).toHaveAttribute('cx', String(evidence.x0 + index));
    await expect(page.locator(ui.probe)).toHaveAttribute('aria-valuetext', new RegExp(row.values[index].toFixed(1).replace('.', '\\.')));
  }
}
function rightAnswer(evidence: Awaited<ReturnType<typeof pixels>>) {
  const human = Number(evidence.rows[0].range.toFixed(1)), eagle = Number(evidence.rows[1].range.toFixed(1));
  return human === eagle ? 'equal' : human > eagle ? 'human' : 'eagle';
}
async function answer(page: Page, choice: string, correct: boolean) {
  await activate(page, '[data-distance-signal-range-answer="' + choice + '"]');
  await expect(page.locator(ui.feedback)).toHaveAttribute('data-correct', String(correct));
  for (const id of ['human', 'eagle', 'equal']) await expect(page.locator('[data-distance-signal-range-answer="' + id + '"]')).toHaveAttribute('aria-pressed', String(id === choice));
}
async function noAnswer(page: Page) {
  await expect(page.locator(ui.feedback)).toHaveCount(0);
  for (const button of await page.locator('[data-distance-signal-range-answer]').all()) await expect(button).toHaveAttribute('aria-pressed', 'false');
}
async function close(page: Page, initialSiblings: unknown) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).explorerClosedScene = root._distanceScene; });
  await activate(page, ui.close); await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  expect(await page.evaluate(() => (window as any).explorerClosedScene.getDiagnostics().lifecycle)).toMatchObject({
    disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0
  });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('keyboard extrema navigation and range answers use actual pixels while preserving collected evidence', async ({ page }) => {
  const initial = await setup(page); await open(page); await reveal(page); await activate(page, '[data-distance-pin]');
  const evidence = await inspect(page); await activate(page, ui.keep);
  const draft = 'I am comparing the darkest and lightest measured pixels under the same conditions.';
  await page.locator(ui.note).fill(draft);
  const pins = await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src));
  const kept = await page.locator('[data-distance-signal-kept-range]').allTextContents(), beforePresentation = await work(page);
  const region = page.locator('[data-distance-announcement="signal-range"]');
  await expect(region).toHaveAttribute('role', 'status'); await expect(region).toHaveAttribute('aria-live', 'polite'); await expect(region).toHaveAttribute('aria-atomic', 'true');
  await region.evaluate(node => { (window as any).explorerAnnouncement = node; });
  const question = (await page.locator('#rh-distance-signal-range-question').innerText()).trim();
  const group = page.getByRole('group', { name: question, exact: true }); await expect(group).toHaveCount(1);
  await expect(group).toHaveAttribute('aria-labelledby', 'rh-distance-signal-range-question'); await expect(group.getByRole('button')).toHaveCount(3);
  const jumps: [string, number][] = [['start', 0], ['middle', Math.floor((evidence.count - 1) / 2)], ['end', evidence.count - 1]];
  for (const row of evidence.rows) jumps.push([row.name + '-min', row.minIndex], [row.name + '-max', row.maxIndex]);
  for (const [name, index] of jumps) {
    const button = page.locator('[data-distance-signal-jump="' + name + '"]');
    await expect(button).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-signal-explore-help(?:\s|$)/);
    await activate(page, '[data-distance-signal-jump="' + name + '"]'); await expect(page.locator(ui.probe)).toBeFocused();
    await probeValues(page, evidence, index); expect(await work(page)).toEqual(beforePresentation);
  }
  const correct = rightAnswer(evidence), wrong = correct === 'human' ? 'eagle' : 'human';
  await answer(page, wrong, false); await answer(page, correct, true);
  expect(await region.evaluate(node => node === (window as any).explorerAnnouncement)).toBe(true);
  await expect(region.locator('button,input,table,svg,[role="status"]')).toHaveCount(0);
  await page.locator(ui.probe).focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await probeValues(page, evidence, 1); await expect(page.locator(ui.feedback)).toHaveAttribute('data-correct', 'true');
  await activate(page, '[data-distance-inspector] > summary'); await activate(page, '[data-distance-magnifier] > summary');
  await activate(page, '[data-distance-magnifier-zoom="4"]'); await expect(page.locator(ui.feedback)).toHaveAttribute('data-correct', 'true');
  expect(await work(page)).toEqual(beforePresentation); await expect(page.locator(ui.note)).toHaveValue(draft);
  expect(await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src))).toEqual(pins);
  expect(await page.locator('[data-distance-signal-kept-range]').allTextContents()).toEqual(kept);
  const fresh = await inspect(page); await noAnswer(page); expect(fresh).toEqual(evidence);
  writeFileSync(resolve(output, 'explorer-keyboard.json'), JSON.stringify({ evidence, jumps, question, correctAnswer: correct,
    stableFeedbackRegion: true, nativeProbeFocusAfterEachJump: true, noPresentationSceneWorkOrPersistence: true,
    repeatedReadClearsAnswer: true, pinsDraftAndKeptReadingPreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('signal prerequisites and recoveries guide keyboard focus without discarding saved learning', async ({ page }) => {
  const initial = await setup(page, true); await activate(page, ui.launch);
  await expect(page.locator(ui.status)).toHaveAttribute('data-distance-status', 'error'); await activate(page, ui.panel + ' > summary');
  const states = [await ready(page, 'error')];
  const originalSaved = await page.evaluate(() => (window as any).__toolData.raptorHunt.distantDetailStudy);
  await activate(page, ui.next); await expect(page.locator(ui.retry)).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 }); await expect(page.locator(ui.status)).toBeFocused();
  expect(await page.evaluate(() => (window as any).explorerCreateAttempts)).toBe(2); expect((await work(page)).persisted).toEqual(originalSaved);
  states.push(await ready(page, 'prediction')); const beforePrediction = await work(page);
  await activate(page, ui.next); await expect(page.locator(ui.heading)).toBeFocused(); expect(await work(page)).toEqual(beforePrediction);
  await page.keyboard.press('Tab'); await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused(); await page.keyboard.press('Enter');
  await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: any) => {
    canvas.explorerOriginalPng = canvas.toDataURL; canvas.toDataURL = () => { throw new Error('Injected copied-image failure'); };
  });
  try {
    await activate(page, ui.reveal); states.push(await ready(page, 'copy'));
    await expect(page.locator('[data-distance-snapshot-error]')).toBeVisible(); const beforeCopy = await work(page);
    await activate(page, ui.next); await expect(page.locator(ui.reveal)).toBeFocused(); expect(await work(page)).toEqual(beforeCopy);
  } finally {
    await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: any) => { canvas.toDataURL = canvas.explorerOriginalPng; delete canvas.explorerOriginalPng; });
  }
  await page.keyboard.press('Enter'); states.push(await ready(page, 'read')); const beforeReadJump = await work(page);
  await activate(page, ui.next); await expect(page.locator(ui.read)).toBeFocused(); expect(await work(page)).toEqual(beforeReadJump);
  let evidence = await inspect(page); await answer(page, rightAnswer(evidence), true); await activate(page, ui.keep);
  const kept = await page.locator('[data-distance-signal-kept-range]').allTextContents();
  const draft = 'My draft and kept reading survive a failed pixel read.'; await page.locator(ui.note).fill(draft);
  await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')! as any; context.explorerOriginalRead = context.getImageData;
    context.getImageData = () => { throw new Error('Injected pixel read failure'); };
  });
  const beforeFailure = await work(page);
  try {
    await activate(page, ui.read); await expect(page.locator(ui.error)).toBeVisible(); states.push(await ready(page, 'read'));
    await expect(page.locator(ui.explorer)).toHaveCount(0); await noAnswer(page); expect(await work(page)).toEqual(beforeFailure);
    await activate(page, ui.next); await expect(page.locator(ui.read)).toBeFocused(); expect(await work(page)).toEqual(beforeFailure);
    await expect(page.locator(ui.note)).toHaveValue(draft); expect(await page.locator('[data-distance-signal-kept-range]').allTextContents()).toEqual(kept);
  } finally {
    await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext('2d')! as any; context.getImageData = context.explorerOriginalRead; delete context.explorerOriginalRead;
    });
  }
  evidence = await inspect(page); await noAnswer(page); await answer(page, rightAnswer(evidence), true);
  await activate(page, ui.reveal); await expect(page.locator(ui.explorer)).toHaveCount(0); await noAnswer(page);
  evidence = await inspect(page); await answer(page, rightAnswer(evidence), true);
  await activate(page, '[data-distance-prediction="eagle"]'); await noAnswer(page); states.push(await ready(page, 'prediction'));
  await activate(page, ui.reveal); evidence = await inspect(page); await noAnswer(page); await answer(page, rightAnswer(evidence), true);
  await setRange(page, '#rh-distance-distance', 140); await noAnswer(page); states.push(await ready(page, 'prediction'));
  await activate(page, '[data-distance-match] > summary'); await activate(page, '[data-distance-match-start]');
  await reveal(page); await activate(page, '[data-distance-pin]'); await setRange(page, '#rh-distance-contrast', 25);
  await activate(page, '[data-distance-match-restore]'); await expect(page.locator(ui.heading)).toBeFocused();
  await expect(page.locator('[data-distance-match-restore]')).toHaveCount(0); await expect(page.locator('#rh-distance-cycles')).toHaveValue('8');
  await expect(page.locator('#rh-distance-contrast')).toHaveValue('95'); await expect(page.locator(ui.note)).toHaveValue(draft);
  expect((await work(page)).persisted.records).toEqual([priorRecord]); expect((await work(page)).persisted.fieldworkResults).toEqual(savedResults);
  writeFileSync(resolve(output, 'explorer-recovery.json'), JSON.stringify({ states, initialSceneRecovery: true, focusOnlyPrerequisiteActions: true,
    copyAndPixelReadsRecover: true, answerInvalidatedByReadFailureRevealPredictionAndCondition: true,
    matchingRestoreFocusPreserved: true, draftAndSavedEvidencePreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('measured-value explorer supports 320px text spacing, forced colors and accessible feedback states', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page); await page.locator('#wrap').evaluate((node: HTMLElement) => { node.style.width = '100%'; });
  await open(page); await reveal(page); const evidence = await inspect(page); await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(state: string) {
    const result = await page.locator(ui.root).evaluate(async root => {
      const audit = await (window as any).axe.run(root, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        inspectedNodes: [...audit.violations, ...audit.passes, ...audit.incomplete].reduce((sum: number, rule: any) => sum + rule.nodes.length, 0) };
    });
    scans.push({ state, ...result }); writeFileSync(resolve(output, 'explorer-axe.json'), JSON.stringify({ scope: ui.root,
      limitation: 'Automated scans do not establish full WCAG conformance or replace assistive-technology testing; incomplete results require review.', scans }, null, 2));
    expect(result.inspectedNodes).toBeGreaterThan(0); expect(result.violations, state + ': ' + JSON.stringify(result.violations)).toEqual([]);
  }
  await scan('measured values ready'); await answer(page, rightAnswer(evidence), true); await scan('range answer feedback');
  await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')! as any; context.explorerOriginalRead = context.getImageData;
    context.getImageData = () => { throw new Error('Injected pixel read failure'); };
  });
  try { await activate(page, ui.read); await expect(page.locator(ui.error)).toBeVisible(); await scan('pixel reading error'); }
  finally {
    await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext('2d')! as any; context.getImageData = context.explorerOriginalRead; delete context.explorerOriginalRead;
    });
  }
  await inspect(page); await answer(page, rightAnswer(evidence), true); const beforePresentation = await work(page);
  await page.addStyleTag({ content: '[data-raptor-distance-study], [data-raptor-distance-study] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-raptor-distance-study] p{margin-bottom:2em!important}' });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await activate(page, '[data-distance-signal-jump="eagle-max"]'); await expect(page.locator(ui.probe)).toBeFocused();
  await page.keyboard.press('Home'); await probeValues(page, evidence, 0); await page.keyboard.press('End'); await probeValues(page, evidence, evidence.count - 1);
  await page.keyboard.press('Tab'); await expect(page.locator(ui.explorer + ' > summary')).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator('[data-distance-signal-jump="start"]')).toBeFocused();
  const layout = await page.locator(ui.explorer).evaluate((root: HTMLElement) => {
    const bounds = root.getBoundingClientRect(), focus = document.activeElement as HTMLElement, css = getComputedStyle(focus);
    const targets = Array.from(root.querySelectorAll('button,summary')).map(node => {
      const r = node.getBoundingClientRect(); return { name: node.textContent?.trim().slice(0, 80), left: r.left, right: r.right, width: r.width, height: r.height };
    });
    const overflow = Array.from(root.querySelectorAll('p,h4,h5,strong,label,button,th,td,caption,summary')).filter(node => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 2).map(node => node.textContent?.trim());
    const clippedText: any[] = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (!node.textContent?.trim() || !parent || parent.closest('svg,style,script,input') || !parent.getClientRects().length) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) {
        let ancestor: HTMLElement | null = parent;
        while (ancestor && root.contains(ancestor)) {
          const style = getComputedStyle(ancestor), r = ancestor.getBoundingClientRect();
          if ((['hidden', 'clip'].includes(style.overflowX) && (rect.left < r.left - 2 || rect.right > r.right + 2)) ||
            (['hidden', 'clip'].includes(style.overflowY) && (rect.top < r.top - 2 || rect.bottom > r.bottom + 2))) {
            clippedText.push({ text: node.textContent.trim().slice(0, 80), ancestor: ancestor.className }); break;
          }
          ancestor = ancestor.parentElement;
        }
      }
    }
    const paragraph = getComputedStyle(root.querySelector('p')!);
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, left: bounds.left, right: bounds.right, targets, overflow, clippedText,
      focus: { visible: focus.matches(':focus-visible'), outline: css.outlineStyle, width: parseFloat(css.outlineWidth), foreground: css.color, background: css.backgroundColor },
      spacing: { font: parseFloat(paragraph.fontSize), line: parseFloat(paragraph.lineHeight), letter: parseFloat(paragraph.letterSpacing), word: parseFloat(paragraph.wordSpacing), bottom: parseFloat(paragraph.marginBottom) } };
  });
  expect(layout.viewport).toBe(320); expect(layout.documentWidth).toBeLessThanOrEqual(321); expect(layout.left).toBeGreaterThanOrEqual(-1); expect(layout.right).toBeLessThanOrEqual(321);
  expect(layout.targets).toHaveLength(11);
  for (const target of layout.targets) { expect(target.left, target.name).toBeGreaterThanOrEqual(-1); expect(target.right, target.name).toBeLessThanOrEqual(321); expect(target.width, target.name).toBeGreaterThanOrEqual(24); expect(target.height, target.name).toBeGreaterThanOrEqual(24); }
  expect(layout.overflow).toEqual([]); expect(layout.clippedText).toEqual([]); expect(layout.focus.visible).toBe(true);
  expect(layout.focus.outline).not.toBe('none'); expect(layout.focus.width).toBeGreaterThanOrEqual(3); expect(layout.focus.foreground).not.toBe(layout.focus.background);
  expect(layout.spacing.line).toBeCloseTo(layout.spacing.font * 1.5, 1); expect(layout.spacing.letter).toBeCloseTo(layout.spacing.font * .12, 1);
  expect(layout.spacing.word).toBeCloseTo(layout.spacing.font * .16, 1); expect(layout.spacing.bottom).toBeCloseTo(layout.spacing.font * 2, 1);
  expect(await work(page)).toEqual(beforePresentation);
  await page.locator(ui.explorer).screenshot({ path: resolve(output, 'explorer-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  writeFileSync(resolve(output, 'explorer-reflow.json'), JSON.stringify({ layout, keyboardProbeWorksInForcedColors: true, presentationDidNotChangeSceneOrPersistence: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});
