import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND15_REPORT || 'reports/raptor-distance-round15-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900, appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.conditionsNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  exact: '[data-distance-exact]', form: '[data-distance-exact-form]', apply: '[data-distance-exact-apply]', reset: '[data-distance-exact-reset]',
  readiness: '[data-distance-exact-readiness]', preview: '[data-distance-exact-preview]', announcement: '[data-distance-announcement="exact"]',
  reveal: '[data-distance-reveal]', heading: '[data-distance-prediction-heading]', note: '[data-distance-note]',
  result: '[data-distance-result]', status: '[data-distance-status]', retry: '[data-distance-retry]',
  signal: '[data-distance-signal]', read: '[data-distance-signal-read]', keep: '[data-distance-signal-keep]'
};
const fields = [
  { id: 'distance', name: 'Exact viewing distance (m)', min: 40, max: 300, initial: 80 },
  { id: 'cycles', name: 'Exact stripe pairs', min: 4, max: 20, initial: 8 },
  { id: 'contrast', name: 'Exact display contrast (%)', min: 10, max: 100, initial: 95 }
] as const;
type Field = typeof fields[number]['id'];
const input = (field: Field) => '[data-distance-exact-input="' + field + '"]';
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
    (window as any).conditionsRafs = 0; (window as any).conditionsCaptures = 0; (window as any).conditionsReads = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).conditionsRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).conditionsCaptures++;
      return nativePng.apply(this, args as any);
    };
    CanvasRenderingContext2D.prototype.getImageData = function (...args: any[]) {
      if (this.canvas.hasAttribute('data-distance-canvas') && /raptor_distance_(study|signal)\.js/.test(String(new Error().stack))) (window as any).conditionsReads++;
      return nativeRead.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.conditionsNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  if (failFirstCreate) await page.route('**/stem_lab/raptor_distance_scene.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/raptor_distance_scene.js', 'utf8') + '\n(function(){var original=window.RaptorDistanceScene,create=original.create;window.conditionsCreateAttempts=0;window.RaptorDistanceScene=Object.assign({},original,{create:function(){if(++window.conditionsCreateAttempts===1)throw new Error("Injected one-time scene setup failure");return create.apply(original,arguments);}});})();'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low',
    xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 80, cycles: 8, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75,
      records: [priorRecord], fieldworkResults: savedResults }
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
  await activate(page, ui.exact + ' > summary'); await ready(page, 'ready');
}
async function ready(page: Page, state: string) {
  await expect(page.locator(ui.readiness)).toHaveAttribute('data-state', state);
  await expect(page.locator(ui.apply)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-exact-readiness(?:\s|$)/);
  await expect(page.locator(ui.apply))[state === 'ready' ? 'toBeEnabled' : 'toBeDisabled']();
  return { state, text: await page.locator(ui.readiness).innerText() };
}
async function reveal(page: Page) {
  await activate(page, '[data-distance-prediction="both"]'); await activate(page, ui.reveal);
  await expect(page.locator(ui.result)).toBeVisible();
}
async function setRange(page: Page, field: Field, value: number) {
  await page.locator('#rh-distance-' + field).evaluate((element: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(element, String(next));
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + field)).toHaveValue(String(value));
}
async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({ lifecycle: root._distanceScene ? root._distanceScene.getDiagnostics().lifecycle : null,
    captures: (window as any).conditionsCaptures, reads: (window as any).conditionsReads, rafs: (window as any).conditionsRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy }));
}
async function frozenEvidence(page: Page) {
  return { pins: await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src)),
    kept: await page.locator('[data-distance-signal-kept-range]').allTextContents(), note: await page.locator(ui.note).inputValue() };
}
async function collect(page: Page) {
  await reveal(page); await activate(page, '[data-distance-pin]');
  await activate(page, ui.signal + ' > summary'); await activate(page, ui.read); await activate(page, ui.keep);
  await page.locator(ui.note).fill('I will vary display contrast while keeping viewing distance and stripe pairs fixed.');
  return frozenEvidence(page);
}
async function applyOnce(page: Page, before: Awaited<ReturnType<typeof work>>, patch: Partial<Record<Field, number>>) {
  await page.keyboard.press('Enter'); await expect(page.locator(ui.heading)).toBeFocused();
  for (const [field, value] of Object.entries(patch)) await expect(page.locator('#rh-distance-' + field)).toHaveValue(String(value));
  await expect(page.locator(ui.result)).toHaveCount(0);
  const after = await work(page);
  expect(after).toEqual({ ...before, lifecycle: { ...before.lifecycle, renderCount: before.lifecycle.renderCount + 2,
    textureUpdates: before.lifecycle.textureUpdates + (patch.cycles !== undefined || patch.contrast !== undefined ? 1 : 0) },
    persisted: { ...before.persisted, ...patch } });
  expect(after.persisted.records).toEqual([priorRecord]); expect(after.persisted.fieldworkResults).toEqual(savedResults);
  return after;
}
async function close(page: Page, initialSiblings: unknown) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).conditionsClosedScene = root._distanceScene; });
  await activate(page, ui.close); await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  expect(await page.evaluate(() => (window as any).conditionsClosedScene.getDiagnostics().lifecycle)).toMatchObject({
    disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0
  });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('keyboard exact conditions preview a controlled investigation before one explicit application', async ({ page }) => {
  const initial = await setup(page); await open(page); const frozen = await collect(page), baseline = await work(page);
  await expect(page.locator(ui.form)).toHaveAttribute('novalidate', '');
  for (const field of fields) {
    await expect(page.getByRole('spinbutton', { name: field.name, exact: true })).toHaveCount(1);
    const control = page.locator(input(field.id)); await expect(control).toHaveValue(String(field.initial));
    await expect(control).toHaveAttribute('min', String(field.min)); await expect(control).toHaveAttribute('max', String(field.max));
    await expect(control).toHaveAttribute('step', '1');
  }
  await expect(page.locator(ui.preview)).toHaveAttribute('data-kind', 'same');
  const announcement = page.locator(ui.announcement);
  await expect(announcement).toHaveAttribute('role', 'status'); await expect(announcement).toHaveAttribute('aria-live', 'polite');
  await expect(announcement).toHaveAttribute('aria-atomic', 'true');
  await announcement.evaluate(node => { (window as any).conditionsAnnouncement = node; });
  await page.locator(input('distance')).focus(); await page.keyboard.press('Enter');
  await expect(page.locator(ui.heading)).toBeFocused(); await expect(page.locator(ui.result)).toBeVisible();
  expect(await work(page)).toEqual(baseline); expect(await frozenEvidence(page)).toEqual(frozen);
  await page.locator(input('contrast')).fill('35'); await expect(page.locator(ui.preview)).toHaveAttribute('data-kind', 'single');
  await expect(page.locator(ui.preview)).toContainText(/contrast/i); expect(await work(page)).toEqual(baseline);
  await applyOnce(page, baseline, { contrast: 35 });
  expect(await frozenEvidence(page)).toEqual(frozen); await expect(page.locator('[data-distance-signal-explorer]')).toHaveCount(0);
  await expect(page.locator(ui.preview)).toHaveAttribute('data-kind', 'same');
  await reveal(page); const beforeRead = await work(page); await activate(page, ui.read);
  expect(await work(page)).toEqual({ ...beforeRead, reads: beforeRead.reads + 2 });
  await expect(page.locator('[data-distance-signal-pair]')).toHaveAttribute('data-kind', 'contrast');
  const singleEvidence = await page.locator('[data-distance-signal-pair-status]').innerText();
  const beforeMultiple = await work(page);
  await page.locator(input('distance')).fill('100'); await page.locator(input('cycles')).fill('10'); await page.locator(input('contrast')).fill('50');
  await expect(page.locator(ui.preview)).toHaveAttribute('data-kind', 'multiple'); expect(await work(page)).toEqual(beforeMultiple);
  await applyOnce(page, beforeMultiple, { distance: 100, cycles: 10, contrast: 50 });
  expect(await frozenEvidence(page)).toEqual(frozen);
  expect(await announcement.evaluate(node => node === (window as any).conditionsAnnouncement)).toBe(true);
  await expect(announcement.locator('input,button,form,[role="status"]')).toHaveCount(0);
  writeFileSync(resolve(output, 'conditions-keyboard.json'), JSON.stringify({ nativeLabels: fields, sameValuesKeepEvidence: true,
    typingIsLocal: true, contrastOnlyApplied: { distance: 80, cycles: 8, contrast: 35 }, singleEvidence,
    multipleApplied: { distance: 100, cycles: 10, contrast: 50 }, oneSceneUpdatePerApplication: true,
    noAutomaticCaptureOrPixelRead: true, stableAnnouncement: true, frozenEvidenceAndSavedLearningPreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('exact inputs explain invalid values and recover stale plans without silently changing evidence', async ({ page }) => {
  const initial = await setup(page, true); await activate(page, ui.launch);
  await expect(page.locator(ui.status)).toHaveAttribute('data-distance-status', 'error'); await activate(page, ui.exact + ' > summary');
  const states = [await ready(page, 'error')], beforeRecovery = await work(page);
  await page.locator(input('contrast')).fill('35'); await page.keyboard.press('Enter'); expect(await work(page)).toEqual(beforeRecovery);
  await activate(page, ui.retry); await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  expect(await page.evaluate(() => (window as any).conditionsCreateAttempts)).toBe(2);
  await expect(page.locator(input('contrast'))).toHaveValue('35'); states.push(await ready(page, 'ready'));
  await activate(page, ui.reset); await expect(page.locator(input('distance'))).toBeFocused();
  const frozen = await collect(page), baseline = await work(page), invalid: any[] = [];
  for (const [field, value] of [['distance', ''], ['distance', '39'], ['distance', '301'], ['distance', '80.5'],
    ['cycles', '3'], ['cycles', '21'], ['cycles', '8.5'], ['contrast', '9'], ['contrast', '101'], ['contrast', '95.5']] as [Field, string][]) {
    await activate(page, ui.reset); await page.locator(input(field)).fill(value);
    await expect(page.locator(ui.preview)).toHaveAttribute('data-kind', 'invalid'); expect(await work(page)).toEqual(baseline);
    await page.keyboard.press('Enter'); await expect(page.locator(input(field))).toBeFocused();
    await expect(page.locator(input(field))).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(input(field))).toHaveAttribute('aria-describedby', new RegExp('(?:^|\\s)rh-distance-exact-' + field + '-error(?:\\s|$)'));
    const error = page.locator('[data-distance-exact-error="' + field + '"]'); await expect(error).toBeVisible();
    expect(await work(page)).toEqual(baseline); expect(await frozenEvidence(page)).toEqual(frozen); await expect(page.locator(ui.result)).toBeVisible();
    invalid.push({ field, value, message: await error.innerText() });
  }
  await activate(page, ui.reset); await page.locator(input('distance')).fill('10'); await page.locator(input('cycles')).fill('0'); await page.locator(input('contrast')).fill('0');
  await page.keyboard.press('Enter'); await expect(page.locator(input('distance'))).toBeFocused();
  for (const field of fields) await expect(page.locator(input(field.id))).toHaveAttribute('aria-invalid', 'true');
  expect(await work(page)).toEqual(baseline); await activate(page, ui.reset);
  await expect(page.locator(input('distance'))).toBeFocused();
  for (const field of fields) { await expect(page.locator(input(field.id))).toHaveValue(String(field.initial)); await expect(page.locator(input(field.id))).not.toHaveAttribute('aria-invalid', 'true'); }
  await page.locator(input('contrast')).fill('44'); await setRange(page, 'distance', 100);
  states.push(await ready(page, 'stale')); await expect(page.locator(ui.preview)).toHaveAttribute('data-kind', 'stale');
  await expect(page.locator(input('distance'))).toHaveValue('80'); await expect(page.locator(input('contrast'))).toHaveValue('44');
  const afterExternal = await work(page);
  expect(afterExternal).toEqual({ ...baseline, lifecycle: { ...baseline.lifecycle, renderCount: baseline.lifecycle.renderCount + 2 },
    persisted: { ...baseline.persisted, distance: 100 } });
  await page.locator(input('contrast')).focus(); await page.keyboard.press('Enter'); expect(await work(page)).toEqual(afterExternal);
  await expect(page.locator(ui.reset)).toHaveText('Use current conditions'); await activate(page, ui.reset);
  await expect(page.locator(input('distance'))).toBeFocused(); states.push(await ready(page, 'ready'));
  await expect(page.locator(input('distance'))).toHaveValue('100'); await expect(page.locator(input('cycles'))).toHaveValue('8');
  await expect(page.locator(input('contrast'))).toHaveValue('95'); await expect(page.locator(ui.preview)).toHaveAttribute('data-kind', 'same');
  expect(await work(page)).toEqual(afterExternal); expect(await frozenEvidence(page)).toEqual(frozen);
  expect(afterExternal.persisted.records).toEqual([priorRecord]); expect(afterExternal.persisted.fieldworkResults).toEqual(savedResults);
  writeFileSync(resolve(output, 'conditions-recovery.json'), JSON.stringify({ states, invalid, sceneRetryPreservesDraft: true,
    firstInvalidInputReceivesFocus: true, noInvalidClampingOrRounding: true, pendingValuesSurviveExternalChange: true,
    staleEnterCannotApply: true, resetIsLocalAndFocusesDistance: true, frozenEvidenceAndSavedLearningPreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('exact-condition planning supports 320px text spacing, forced colors and accessible error states', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page); await page.locator('#wrap').evaluate((node: HTMLElement) => { node.style.width = '100%'; });
  await open(page); const baseline = await work(page); await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(state: string) {
    const result = await page.locator(ui.root).evaluate(async root => {
      const audit = await (window as any).axe.run(root, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        inspectedNodes: [...audit.violations, ...audit.passes, ...audit.incomplete].reduce((sum: number, rule: any) => sum + rule.nodes.length, 0) };
    });
    scans.push({ state, ...result }); writeFileSync(resolve(output, 'conditions-axe.json'), JSON.stringify({ scope: ui.root,
      limitation: 'Automated scans do not establish full WCAG conformance or replace assistive-technology testing; incomplete results require review.', scans }, null, 2));
    expect(result.inspectedNodes).toBeGreaterThan(0); expect(result.violations, state + ': ' + JSON.stringify(result.violations)).toEqual([]);
  }
  await scan('exact conditions ready');
  for (const field of fields) await page.locator(input(field.id)).fill('0');
  await page.keyboard.press('Enter'); await expect(page.locator(input('distance'))).toBeFocused(); await scan('all three exact inputs invalid');
  expect(await work(page)).toEqual(baseline);
  await activate(page, ui.reset); await page.locator(input('contrast')).fill('44'); await setRange(page, 'distance', 100);
  await ready(page, 'stale'); const afterExternal = await work(page); await scan('pending exact plan stale');
  expect(afterExternal).toEqual({ ...baseline, lifecycle: { ...baseline.lifecycle, renderCount: baseline.lifecycle.renderCount + 2 },
    persisted: { ...baseline.persisted, distance: 100 } });
  await activate(page, ui.reset); for (const field of fields) await page.locator(input(field.id)).fill('0');
  await page.keyboard.press('Enter');
  await page.addStyleTag({ content: '[data-raptor-distance-study], [data-raptor-distance-study] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-raptor-distance-study] p{margin-bottom:2em!important}' });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.locator(input('distance')).focus(); await page.keyboard.press('Tab'); await expect(page.locator(input('cycles'))).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator(input('contrast'))).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator(ui.apply)).toBeFocused();
  const layout = await page.locator(ui.exact).evaluate((root: HTMLElement) => {
    const bounds = root.getBoundingClientRect(), focus = document.activeElement as HTMLElement, css = getComputedStyle(focus);
    const targets = Array.from(root.querySelectorAll('button,input,summary')).map(node => {
      const r = node.getBoundingClientRect(); return { name: (node.getAttribute('aria-label') || node.id || node.textContent || '').trim().slice(0, 80), left: r.left, right: r.right, width: r.width, height: r.height };
    });
    const overflow = Array.from(root.querySelectorAll('p,h4,h5,strong,label,button,summary')).filter(node => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 2).map(node => node.textContent?.trim());
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
  expect(layout.targets).toHaveLength(6);
  for (const target of layout.targets) { expect(target.left, target.name).toBeGreaterThanOrEqual(-1); expect(target.right, target.name).toBeLessThanOrEqual(321); expect(target.width, target.name).toBeGreaterThanOrEqual(24); expect(target.height, target.name).toBeGreaterThanOrEqual(24); }
  expect(layout.overflow).toEqual([]); expect(layout.clippedText).toEqual([]); expect(layout.focus.visible).toBe(true);
  expect(layout.focus.outline).not.toBe('none'); expect(layout.focus.width).toBeGreaterThanOrEqual(3); expect(layout.focus.foreground).not.toBe(layout.focus.background);
  expect(layout.spacing.line).toBeCloseTo(layout.spacing.font * 1.5, 1); expect(layout.spacing.letter).toBeCloseTo(layout.spacing.font * .12, 1);
  expect(layout.spacing.word).toBeCloseTo(layout.spacing.font * .16, 1); expect(layout.spacing.bottom).toBeCloseTo(layout.spacing.font * 2, 1);
  expect(await work(page)).toEqual(afterExternal);
  await page.locator(ui.exact).screenshot({ path: resolve(output, 'conditions-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  writeFileSync(resolve(output, 'conditions-reflow.json'), JSON.stringify({ layout, keyboardFormOrder: ['distance', 'cycles', 'contrast', 'apply'],
    localEditingValidationAndPresentationDoNotChangeSceneOrPersistence: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});
