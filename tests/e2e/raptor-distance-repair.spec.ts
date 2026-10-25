import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND17_REPORT || 'reports/raptor-distance-round17-20261024');
const harness = new GlHarness({ toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900, appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.repairNativeLoader;window.AlloPostFXEnabled=false;' });
const fields = ['distance', 'cycles', 'contrast'] as const;
type Field = typeof fields[number];
type Conditions = Record<Field, number>;
const ui = { root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  repair: '[data-distance-repair]', heading: '[data-distance-repair-heading]', readiness: '[data-distance-repair-readiness]',
  preview: '[data-distance-repair-preview]', apply: '[data-distance-repair-apply]', next: '[data-distance-repair-next]',
  noteLink: '[data-distance-repair-note]', note: '[data-distance-note]', pin: '[data-distance-pin]',
  prediction: '[data-distance-prediction-heading]', reveal: '[data-distance-reveal]', result: '[data-distance-result]',
  announcement: '[data-distance-announcement="repair"]', guidance: '[data-distance-experiment-guidance]',
  status: '[data-distance-status]', retry: '[data-distance-retry]' };
const factor = (field: Field) => '[data-distance-repair-factor="' + field + '"]';
const priorRecord = { version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'My earlier saved observation.' };
const savedResults = { version: 1, human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, index) => ({
  settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: index ? 'eagle' : 'both'
})) } };

async function setup(page: Page) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const frame = window.requestAnimationFrame.bind(window), capture = HTMLCanvasElement.prototype.toDataURL;
    const read = CanvasRenderingContext2D.prototype.getImageData;
    (window as any).repairRafs = 0; (window as any).repairCaptures = 0; (window as any).repairReads = 0;
    (window as any).repairUpdates = 0; (window as any).repairFailNextUpdate = false;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).repairRafs++;
      return frame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).repairCaptures++;
      return capture.apply(this, args as any);
    };
    CanvasRenderingContext2D.prototype.getImageData = function (...args: any[]) {
      if (this.canvas.hasAttribute('data-distance-canvas') && /raptor_distance_(study|signal)\.js/.test(String(new Error().stack))) (window as any).repairReads++;
      return read.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.repairNativeLoader=window.StemLab.loadScriptResilient;' }));
  await page.route('**/stem_lab/raptor_distance_scene.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/raptor_distance_scene.js', 'utf8') + '\n(function(){var api=window.RaptorDistanceScene,create=api.create;window.RaptorDistanceScene=Object.assign({},api,{create:function(){var result=create.apply(api,arguments),update=result.update;return Object.assign({},result,{update:function(){window.repairUpdates++;if(window.repairFailNextUpdate){window.repairFailNextUpdate=false;throw new Error("Injected one-time scene update failure");}return update.apply(result,arguments);}});}});})();' }));
  await harness.mount(page, { raptorHunt: { activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
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
  return page.evaluate(() => { const copy = { ...(window as any).__toolData.raptorHunt }; delete copy.distantDetailStudy; return copy; });
}
async function activate(page: Page, selector: string) { await page.locator(selector).focus(); await page.keyboard.press('Enter'); }
async function open(page: Page) {
  await activate(page, ui.launch); await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
}
async function reveal(page: Page) {
  await activate(page, '[data-distance-prediction="both"]'); await activate(page, ui.reveal);
  await expect(page.locator(ui.result)).toBeVisible();
}
async function setRange(page: Page, field: Field, value: number) {
  await page.locator('#rh-distance-' + field).evaluate((node: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(node, String(next));
    node.dispatchEvent(new Event('input', { bubbles: true })); node.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + field)).toHaveValue(String(value));
}
async function conditions(page: Page, next: Conditions) { for (const field of fields) await setRange(page, field, next[field]); }
async function values(page: Page) {
  return page.locator(ui.root).evaluate(root => Object.fromEntries(['distance', 'cycles', 'contrast'].map(field =>
    [field, Number((root.querySelector('#rh-distance-' + field) as HTMLInputElement).value)])) as Conditions);
}
async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({ lifecycle: root._distanceScene?.getDiagnostics().lifecycle || null,
    captures: (window as any).repairCaptures, reads: (window as any).repairReads, rafs: (window as any).repairRafs,
    updates: (window as any).repairUpdates, persisted: (window as any).__toolData.raptorHunt.distantDetailStudy }));
}
async function frozenEvidence(page: Page) {
  return { pins: await page.locator('img[data-distance-pinned-image]').evaluateAll(nodes => nodes.map(node => (node as HTMLImageElement).src)),
    kept: await page.locator('[data-distance-signal-kept-range]').allTextContents(), note: await page.locator(ui.note).inputValue() };
}
async function pinAndCollect(page: Page) {
  await reveal(page); await activate(page, ui.pin);
  await activate(page, '[data-distance-signal] > summary'); await activate(page, '[data-distance-signal-read]'); await activate(page, '[data-distance-signal-keep]');
  await page.locator(ui.note).fill('I will isolate one factor and keep the other two controls fixed.');
  return frozenEvidence(page);
}
async function openRepair(page: Page) {
  await expect(page.locator(ui.repair)).toBeAttached();
  if (await page.locator(ui.repair).getAttribute('open') === null) await activate(page, ui.repair + ' > summary');
}
async function ready(page: Page, state: string) {
  await expect(page.locator(ui.readiness)).toHaveAttribute('data-state', state);
  await expect(page.locator(ui.apply)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-repair-readiness(?:\s|$)/);
  await expect(page.locator(ui.apply))[state === 'ready' ? 'toBeEnabled' : 'toBeDisabled']();
  return { state, text: await page.locator(ui.readiness).innerText() };
}
async function preview(page: Page, pinned: Conditions, current: Conditions, kept: Field) {
  const target = { ...pinned, [kept]: current[kept] };
  await activate(page, factor(kept)); await ready(page, 'ready'); await expect(page.locator(ui.preview)).toBeVisible();
  await expect(page.locator(ui.preview + ' thead th')).toHaveText(['Control', 'Pinned', 'Planned']);
  for (const field of fields) {
    await expect(page.locator(factor(field))).toHaveAttribute('aria-pressed', String(field === kept));
    const cell = page.locator('[data-distance-repair-value="' + field + '"]');
    expect(Number(await cell.getAttribute('data-value'))).toBe(target[field]); await expect(cell).toContainText(String(target[field]));
    await expect(page.locator('[data-distance-repair-row="' + field + '"]')).toBeVisible();
  }
  for (const field of fields.filter(field => field !== kept)) await expect(page.locator('[data-distance-repair-held]')).toContainText(field === 'cycles' ? /stripe/i : new RegExp(field, 'i'));
  return target;
}
async function guidance(page: Page, unavailable: boolean) {
  const messages: Record<string, string> = {};
  await expect(page.locator(ui.guidance)).toBeVisible();
  for (const field of [...fields, 'restore']) {
    const help = page.locator('[data-distance-experiment-help="' + field + '"]');
    await expect(help).toBeVisible(); await expect(help).toHaveAttribute('id', 'rh-distance-experiment-' + field + '-help');
    await expect(page.locator('[data-distance-experiment="' + field + '"]')).toHaveAttribute('aria-describedby', new RegExp('(?:^|\\s)rh-distance-experiment-' + field + '-help(?:\\s|$)'));
    await expect(page.locator('[data-distance-experiment="' + field + '"]'))[unavailable && field !== 'restore' ? 'toBeDisabled' : 'toBeEnabled']();
    messages[field] = await help.innerText(); expect(messages[field].trim().length).toBeGreaterThan(12);
  }
  if (unavailable) {
    expect(messages.distance).toMatch(/150/); expect(messages.cycles).toMatch(/10/); expect(messages.contrast).toMatch(/25/);
  }
  return messages;
}
async function close(page: Page, initialSiblings: unknown) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).repairClosedScene = root._distanceScene; });
  await activate(page, ui.close); await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  expect(await page.evaluate(() => (window as any).repairClosedScene.getDiagnostics().lifecycle)).toMatchObject({ disposed: true,
    liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0 });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('keyboard comparison repair previews one retained factor and explicitly applies a controlled experiment', async ({ page }) => {
  const initial = await setup(page); await open(page); const pinned = { distance: 80, cycles: 8, contrast: 95 };
  const frozen = await pinAndCollect(page); await openRepair(page); const states = [await ready(page, 'same')];
  const sameWork = await work(page); await activate(page, ui.next); await expect(page.locator('#rh-distance-distance')).toBeFocused();
  expect(await work(page)).toEqual(sameWork);
  const current = { distance: 160, cycles: 16, contrast: 25 }; await conditions(page, current); await reveal(page);
  await activate(page, '[data-distance-signal-read]'); await openRepair(page); states.push(await ready(page, 'choose'));
  const before = await work(page), plans: any[] = []; const messages = await guidance(page, false);
  const announcement = page.locator(ui.announcement); await expect(announcement).toHaveAttribute('role', 'status');
  await expect(announcement).toHaveAttribute('aria-live', 'polite'); await expect(announcement).toHaveAttribute('aria-atomic', 'true');
  await announcement.evaluate(node => { (window as any).repairAnnouncement = node; });
  for (const field of fields) {
    plans.push({ kept: field, target: await preview(page, pinned, current, field) }); expect(await work(page)).toEqual(before);
    expect(await frozenEvidence(page)).toEqual(frozen);
  }
  const target = await preview(page, pinned, current, 'cycles');
  await page.locator(ui.prediction).evaluate(node => node.addEventListener('focus', () => {
    const root = node.closest('[data-raptor-distance-study]')!;
    (window as any).repairFocus = Object.fromEntries(['distance', 'cycles', 'contrast'].map(field => [field,
      Number((root.querySelector('#rh-distance-' + field) as HTMLInputElement).value)]));
  }, { once: true }));
  await activate(page, ui.apply); await expect(page.locator(ui.prediction)).toBeFocused();
  expect(await page.evaluate(() => (window as any).repairFocus)).toEqual(target); expect(await values(page)).toEqual(target);
  await expect(page.locator(ui.result)).toHaveCount(0); await expect(page.locator(ui.reveal)).toBeDisabled();
  await expect(page.locator('[data-distance-comparison]')).toHaveAttribute('data-kind', 'single'); states.push(await ready(page, 'single'));
  const after = await work(page);
  expect(after).toEqual({ ...before, updates: before.updates + 1,
    lifecycle: { ...before.lifecycle, renderCount: before.lifecycle.renderCount + 2, textureUpdates: before.lifecycle.textureUpdates + 1 },
    persisted: { ...before.persisted, ...target } });
  expect(await frozenEvidence(page)).toEqual(frozen); expect(after.persisted.records).toEqual([priorRecord]); expect(after.persisted.fieldworkResults).toEqual(savedResults);
  expect(await announcement.evaluate(node => node === (window as any).repairAnnouncement)).toBe(true);
  await expect(announcement.locator('input,button,form,[role="status"]')).toHaveCount(0); expect((await announcement.innerText()).trim().length).toBeGreaterThan(10);
  const afterApply = await work(page); await activate(page, ui.noteLink); await expect(page.locator(ui.note)).toBeFocused();
  expect(await work(page)).toEqual(afterApply); expect(await frozenEvidence(page)).toEqual(frozen);
  writeFileSync(resolve(output, 'repair-keyboard.json'), JSON.stringify({ pinned, current, plans, applied: target, states, messages,
    selectionIsLocal: true, exactlyOneApplication: true, focusAfterCommittedValues: true, freshPredictionRequired: true,
    noAutomaticCapturesReadsOrFrames: true, stableAnnouncement: true, focusOnlyNotebook: true, frozenEvidenceAndSavedLearningPreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('comparison repair explains unavailable commands and rejects stale plans through pin and scene recovery', async ({ page }) => {
  const initial = await setup(page); await open(page); const pinned = { distance: 300, cycles: 20, contrast: 25 };
  await conditions(page, pinned); const frozen = await pinAndCollect(page); const messages = await guidance(page, true);
  const current = { distance: 40, cycles: 4, contrast: 100 }; await conditions(page, current); await openRepair(page);
  const states = [await ready(page, 'choose')], baseline = await work(page), plans: any[] = [];
  for (const field of fields) { plans.push({ kept: field, target: await preview(page, pinned, current, field) }); expect(await work(page)).toEqual(baseline); }
  await setRange(page, 'distance', 41); states.push(await ready(page, 'choose')); await expect(page.locator(ui.preview)).toHaveCount(0);
  for (const field of fields) await expect(page.locator(factor(field))).toHaveAttribute('aria-pressed', 'false');
  const changedWork = await work(page); await page.locator(ui.apply).evaluate((button: HTMLButtonElement) => button.click()); expect(await work(page)).toEqual(changedWork);
  await preview(page, pinned, { ...current, distance: 41 }, 'cycles'); await reveal(page); await activate(page, ui.pin);
  states.push(await ready(page, 'same')); await expect(page.locator(ui.preview)).toHaveCount(0);
  await setRange(page, 'distance', 80); await setRange(page, 'cycles', 8); await openRepair(page);
  states.push(await ready(page, 'choose')); await activate(page, factor('distance')); await ready(page, 'ready');
  // Identical replacement uses a new pin identity and cannot retain a pending plan.
  await conditions(page, { distance: 41, cycles: 4, contrast: 100 }); await reveal(page); await activate(page, ui.pin);
  await conditions(page, { distance: 80, cycles: 8, contrast: 95 }); await activate(page, factor('contrast')); await ready(page, 'ready');
  await page.evaluate(() => { (window as any).repairFailNextUpdate = true; }); await setRange(page, 'distance', 81);
  states.push(await ready(page, 'error')); await expect(page.locator(ui.preview)).toHaveCount(0);
  const beforeNext = await work(page); await activate(page, ui.next); await expect(page.locator(ui.retry)).toBeFocused(); expect(await work(page)).toEqual(beforeNext);
  await activate(page, ui.retry); await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  states.push(await ready(page, 'choose')); await expect(page.locator(ui.preview)).toHaveCount(0);
  const afterRetry = await work(page); expect(afterRetry.persisted.records).toEqual([priorRecord]); expect(afterRetry.persisted.fieldworkResults).toEqual(savedResults);
  await expect(page.locator(ui.note)).toHaveValue(frozen.note); expect(await page.locator('[data-distance-signal-kept-range]').allTextContents()).toEqual(frozen.kept);
  const recoveryTarget = await preview(page, { distance: 41, cycles: 4, contrast: 100 }, { distance: 81, cycles: 8, contrast: 95 }, 'distance');
  const beforeApply = await work(page); await activate(page, ui.apply); await expect(page.locator(ui.prediction)).toBeFocused();
  expect(await values(page)).toEqual(recoveryTarget); expect((await work(page)).updates).toBe(beforeApply.updates + 1);
  await setRange(page, 'distance', 41); await reveal(page); await activate(page, ui.pin);
  const identicalPin = await frozenEvidence(page); await reveal(page); await activate(page, ui.pin);
  expect(await frozenEvidence(page)).toEqual(identicalPin); states.push(await ready(page, 'same'));
  writeFileSync(resolve(output, 'repair-recovery.json'), JSON.stringify({ pinned, current, plans, messages, states, recoveryTarget,
    limitsExplainedVisibly: true, changedConditionsInvalidatePlan: true, replacementPinInvalidatesPlan: true,
    identicalPinReplacementRemainsSame: true, retryShortcutIsFocusOnly: true, recoveredSceneRequiresFreshChoice: true,
    noStaleDisabledApplication: true, draftKeptReadingRecordsAndResultsPreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('comparison repair remains readable and keyboard operable at 320px with text spacing and forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page); await page.locator('#wrap').evaluate((node: HTMLElement) => { node.style.width = '100%'; });
  await open(page); await pinAndCollect(page); await conditions(page, { distance: 160, cycles: 16, contrast: 25 }); await openRepair(page);
  await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') }); const scans: any[] = [];
  async function scan(state: string) {
    const result = await page.locator(ui.root).evaluate(async root => {
      const audit = await (window as any).axe.run(root, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, forcedColors: matchMedia('(forced-colors: active)').matches, violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        inspectedNodes: [...audit.violations, ...audit.passes, ...audit.incomplete].reduce((sum: number, rule: any) => sum + rule.nodes.length, 0) };
    });
    scans.push({ state, ...result }); writeFileSync(resolve(output, 'repair-axe.json'), JSON.stringify({ scope: ui.root,
      limitation: 'Automated scans do not establish complete WCAG conformance or replace manual assistive-technology testing; incomplete checks require review.', scans }, null, 2));
    expect(result.inspectedNodes).toBeGreaterThan(0); expect(result.violations, state + ': ' + JSON.stringify(result.violations)).toEqual([]);
  }
  await ready(page, 'choose'); await scan('multiple changed factors need a choice');
  await preview(page, { distance: 80, cycles: 8, contrast: 95 }, { distance: 160, cycles: 16, contrast: 25 }, 'distance'); await scan('one-factor plan ready');
  const before = await work(page);
  await page.addStyleTag({ content: '[data-raptor-distance-study], [data-raptor-distance-study] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-raptor-distance-study] p{margin-bottom:2em!important}' });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await page.locator(factor('distance')).focus(); await page.keyboard.press('Tab'); await expect(page.locator(factor('cycles'))).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.locator(factor('contrast'))).toBeFocused(); await page.keyboard.press('Tab'); await expect(page.locator(ui.apply)).toBeFocused();
  const layout = await page.locator(ui.repair).evaluate((root: HTMLElement) => {
    const bounds = root.getBoundingClientRect(), focus = document.activeElement as HTMLElement, css = getComputedStyle(focus);
    const targets = Array.from(root.querySelectorAll('button,summary')).map(node => { const r = node.getBoundingClientRect(); return {
      name: node.textContent?.trim().slice(0, 90), left: r.left, right: r.right, width: r.width, height: r.height }; });
    const overflow = Array.from(root.querySelectorAll('p,h4,h5,strong,label,button,th,td,caption,summary,li')).filter(node => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 2).map(node => node.textContent?.trim());
    const clippedText: any[] = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (!node.textContent?.trim() || !parent || parent.closest('svg,style,script,input') || !parent.getClientRects().length) continue;
      const range = document.createRange(); range.selectNodeContents(node);
      for (const rect of Array.from(range.getClientRects())) { let ancestor: HTMLElement | null = parent;
        while (ancestor && root.contains(ancestor)) { const style = getComputedStyle(ancestor), r = ancestor.getBoundingClientRect();
          if ((['hidden', 'clip'].includes(style.overflowX) && (rect.left < r.left - 2 || rect.right > r.right + 2)) ||
            (['hidden', 'clip'].includes(style.overflowY) && (rect.top < r.top - 2 || rect.bottom > r.bottom + 2))) {
            clippedText.push({ text: node.textContent.trim().slice(0, 80), ancestor: ancestor.className }); break;
          } ancestor = ancestor.parentElement;
        }
      }
    }
    const headers = Array.from(root.querySelectorAll('[data-distance-repair-preview] thead th')).map(header => {
      const tops: number[] = [], text = document.createTreeWalker(header, NodeFilter.SHOW_TEXT);
      while (text.nextNode()) { if (!text.currentNode.textContent?.trim()) continue; const range = document.createRange(); range.selectNodeContents(text.currentNode);
        for (const rect of Array.from(range.getClientRects())) if (rect.width > 0 && rect.height > 0 && !tops.some(top => Math.abs(top - rect.top) < 1)) tops.push(rect.top);
      } return { text: header.textContent?.trim(), lines: tops.length, lineTops: tops };
    });
    const paragraph = getComputedStyle(root.querySelector('p')!);
    const titleCss = getComputedStyle(root.querySelector('h5')!);
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, left: bounds.left, right: bounds.right, targets, overflow, clippedText, headers,
      forcedColorDiagnostics: { active: matchMedia('(forced-colors: active)').matches, titleColor: titleCss.color, titleWebkitTextFillColor: titleCss.webkitTextFillColor, rootBackground: getComputedStyle(root).backgroundColor },
      focus: { visible: focus.matches(':focus-visible'), outline: css.outlineStyle, width: parseFloat(css.outlineWidth), foreground: css.color, background: css.backgroundColor },
      spacing: { font: parseFloat(paragraph.fontSize), line: parseFloat(paragraph.lineHeight), letter: parseFloat(paragraph.letterSpacing), word: parseFloat(paragraph.wordSpacing), bottom: parseFloat(paragraph.marginBottom) } };
  });
  expect(layout.viewport).toBe(320); expect(layout.documentWidth).toBeLessThanOrEqual(321); expect(layout.left).toBeGreaterThanOrEqual(-1); expect(layout.right).toBeLessThanOrEqual(321);
  expect(layout.targets.length).toBeGreaterThanOrEqual(5);
  for (const target of layout.targets) { expect(target.left, target.name || '').toBeGreaterThanOrEqual(-1); expect(target.right, target.name || '').toBeLessThanOrEqual(321); expect(target.width, target.name || '').toBeGreaterThanOrEqual(24); expect(target.height, target.name || '').toBeGreaterThanOrEqual(24); }
  expect(layout.headers.map(header => header.text)).toEqual(['Control', 'Pinned', 'Planned']); for (const header of layout.headers) expect(header.lines, header.text).toBe(1);
  expect(layout.overflow).toEqual([]); expect(layout.clippedText).toEqual([]); expect(layout.focus.visible).toBe(true); expect(layout.focus.outline).not.toBe('none');
  expect(layout.focus.width).toBeGreaterThanOrEqual(3); expect(layout.focus.foreground).not.toBe(layout.focus.background);
  expect(layout.spacing.line).toBeCloseTo(layout.spacing.font * 1.5, 1); expect(layout.spacing.letter).toBeCloseTo(layout.spacing.font * .12, 1);
  expect(layout.spacing.word).toBeCloseTo(layout.spacing.font * .16, 1); expect(layout.spacing.bottom).toBeCloseTo(layout.spacing.font * 2, 1);
  expect(await work(page)).toEqual(before);
  await page.locator(ui.repair).screenshot({ path: resolve(output, 'repair-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  await activate(page, ui.apply); await expect(page.locator(ui.prediction)).toBeFocused(); await ready(page, 'single');
  // Axe's color-contrast rule mixes authored text-fill with forced backgrounds:
  // https://github.com/dequelabs/axe-core/issues/3978 . Keep all rules enabled
  // in the normal palette; forced-color layout, keyboard and pixels are above.
  await page.emulateMedia({ forcedColors: 'none', reducedMotion: 'reduce' });
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(false);
  await scan('applied plan requires fresh prediction');
  writeFileSync(resolve(output, 'repair-reflow.json'), JSON.stringify({ layout, keyboardOrder: ['distance', 'cycles', 'contrast', 'apply'],
    selectionAndPresentationDoNotChangeEvidence: true, forcedColorsKeyboardOperable: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});
