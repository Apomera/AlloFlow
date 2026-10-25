import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND13_REPORT || 'reports/raptor-distance-round13-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900, appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.plannerNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  panel: '[data-distance-fieldwork]', form: '[data-distance-trial-plan]', input: '[data-distance-trial-distance]',
  apply: '[data-distance-trial-apply]', suggestion: '[data-distance-trial-suggestion]', suggest: '[data-distance-trial-suggest]',
  current: '[data-distance-trial-current]', error: '#rh-distance-trial-error',
  readiness: '[data-distance-fieldwork-readiness]', next: '[data-distance-fieldwork-next]',
  heading: '[data-distance-prediction-heading]', reveal: '[data-distance-reveal]',
  record: '[data-distance-fieldwork-record]', inline: '[data-distance-fieldwork-record-inline]',
  restore: '[data-distance-fieldwork-restore]', rows: '[data-distance-fieldwork-trial]',
  progress: '[data-distance-fieldwork-status]', keep: '[data-distance-results-save]',
  resultReady: '[data-distance-result-readiness]', note: '[data-distance-note]'
};
const priorRecord = { version: 1, modelVersion: 1, distance: 120, cycles: 12, contrast: 95, widthM: .3,
  referenceLimit: 60, eagleLimit: 140, prediction: 'eagle', note: 'My earlier saved observation.' };
const savedResults = { version: 1,
  human: { version: 1, modelVersion: 1, reference: 'human', trials: [85, 86].map((distance, index) => ({
    settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: index ? 'eagle' : 'both'
  })) },
  eagle: { version: 1, modelVersion: 1, reference: 'eagle', trials: [200, 201].map((distance, index) => ({
    settings: { version: 1, distance, cycles: 12, contrast: 95, widthM: .3, wideFov: 20, detailFov: .75 }, prediction: index ? 'neither' : 'eagle'
  })) }
};

async function setup(page: Page) {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    (window as any).plannerRafs = 0; (window as any).plannerCaptures = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).plannerRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).plannerCaptures++;
      return nativePng.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.plannerNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  await harness.mount(page, { raptorHunt: {
    activeSection: 'acuity', selectedSpecies: 'coopersHawk', activeMission: 'open',
    flightSession: { speciesId: 'coopersHawk', missionId: 'open' }, huntTutorialDismissed: true, graphicsQuality: 'low',
    xp: 97, huntStats: { attempts: 4, captures: 2 },
    acuity: { version: 2, distance: 18, span: 50, opacity: 75, target: 'plaque', guides: false },
    distantDetailStudy: { version: 1, distance: 120, cycles: 12, contrast: 95, records: [priorRecord], fieldworkResults: savedResults }
  } }, undefined, { expectCanvas: false });
  await expect(page.locator(ui.launch)).toBeVisible(); expect(await harness.glContexts(page)).toEqual([]);
  return { errors, siblings: await siblings(page) };
}
async function siblings(page: Page) {
  return page.evaluate(() => { const value = { ...(window as any).__toolData.raptorHunt }; delete value.distantDetailStudy; return value; });
}
async function activate(page: Page, selector: string) {
  await page.locator(selector).focus(); await page.keyboard.press('Enter');
}
async function open(page: Page) {
  await activate(page, ui.launch); await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await activate(page, ui.panel + ' > summary');
}
async function start(page: Page, reference: 'human' | 'eagle') {
  await activate(page, '[data-distance-fieldwork-start="' + reference + '"]');
  await expect(page.locator(ui.form)).toBeVisible(); await expect(page.locator(ui.rows)).toHaveCount(0);
  await expect(page.getByRole('spinbutton', { name: 'Next trial distance (metres)', exact: true })).toHaveCount(1);
  await expect(page.locator(ui.input)).toHaveAttribute('min', '40'); await expect(page.locator(ui.input)).toHaveAttribute('max', '300');
  await expect(page.locator(ui.input)).toHaveAttribute('step', '1');
  await expect(page.locator(ui.current)).toContainText('40'); await ready(page, 'prediction');
}
async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({ lifecycle: root._distanceScene.getDiagnostics().lifecycle,
    captures: (window as any).plannerCaptures, rafs: (window as any).plannerRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy }));
}
async function ready(page: Page, state: string) {
  await expect(page.locator(ui.readiness)).toHaveAttribute('data-state', state);
  await expect(page.locator(ui.record)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-fieldwork-readiness(?:\s|$)/);
  await expect(page.locator(ui.record))[state === 'ready' ? 'toBeEnabled' : 'toBeDisabled']();
  if (await page.locator(ui.inline).count()) {
    await expect(page.locator(ui.inline)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-fieldwork-readiness(?:\s|$)/);
    await expect(page.locator(ui.inline))[state === 'ready' ? 'toBeEnabled' : 'toBeDisabled']();
  }
  return { state, text: await page.locator(ui.readiness).innerText() };
}
async function reveal(page: Page, prediction = 'both') {
  await activate(page, '[data-distance-prediction="' + prediction + '"]'); await activate(page, ui.reveal);
  await expect(page.locator('[data-distance-result]')).toBeVisible(); await ready(page, 'ready');
}
async function applyDistance(page: Page, distance: number) {
  await page.locator(ui.input).fill(String(distance)); await page.keyboard.press('Enter');
  await expect(page.locator('#rh-distance-distance')).toHaveValue(String(distance));
  await expect(page.locator(ui.current)).toContainText(String(distance)); await expect(page.locator(ui.heading)).toBeFocused();
}
async function setRange(page: Page, name: string, value: number) {
  await page.locator('#rh-distance-' + name).evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-' + name)).toHaveValue(String(value));
}
async function close(page: Page, initialSiblings: unknown) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).plannerClosedScene = root._distanceScene; });
  await activate(page, ui.close); await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  expect(await page.evaluate(() => (window as any).plannerClosedScene.getDiagnostics().lifecycle)).toMatchObject({
    disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0
  });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}
function frequency(distance: number) { return 12 / (2 * Math.atan(.3 / (2 * distance)) * 180 / Math.PI); }

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('keyboard trial planning narrows collected evidence without predicting or recording for the learner', async ({ page }) => {
  const initial = await setup(page); await open(page); await start(page, 'human');
  const sequence = [40, 300, 170, 105, 72, 88, 80, 84, 86, 85], samples: any[] = [];
  let below: number | undefined, above: number | undefined;
  for (let index = 0; index < sequence.length; index++) {
    const next = below === undefined ? 40 : above === undefined ? 300 : Math.floor((below + above) / 2);
    expect(next).toBe(sequence[index]);
    await expect(page.locator(ui.suggestion)).toContainText(new RegExp('\\b' + next + '\\s*m'));
    const beforeSuggestion = await work(page), previousRows = await page.locator(ui.rows).count();
    await activate(page, ui.suggest); await expect(page.locator(ui.input)).toBeFocused(); await expect(page.locator(ui.input)).toHaveValue(String(next));
    expect(await work(page)).toEqual(beforeSuggestion); await expect(page.locator(ui.rows)).toHaveCount(previousRows);
    await page.keyboard.press('Tab'); await expect(page.locator(ui.suggest)).toBeFocused();
    await page.keyboard.press('Tab'); await expect(page.locator(ui.apply)).toBeFocused(); await page.keyboard.press('Enter');
    await expect(page.locator(ui.heading)).toBeFocused(); await expect(page.locator('#rh-distance-distance')).toHaveValue(String(next));
    await expect(page.locator(ui.current)).toContainText(String(next)); await ready(page, 'prediction');
    await expect(page.locator('[data-distance-result]')).toHaveCount(0); await expect(page.locator(ui.rows)).toHaveCount(previousRows);
    await page.keyboard.press('Tab'); await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused(); await page.keyboard.press('Enter');
    await activate(page, ui.reveal); await ready(page, 'ready');
    const beforeRecord = await work(page); await activate(page, ui.record); expect(await work(page)).toEqual(beforeRecord);
    const row = page.locator(ui.rows + '[data-distance="' + next + '"]'); await expect(row).toBeVisible();
    const cells = await row.locator('th,td').allTextContents(); expect(Number.parseFloat(cells[1])).toBeCloseTo(frequency(next), 2);
    expect(cells[3]).toMatch(/within both|^both/i); // Wrong predictions remain the learner's evidence.
    if (frequency(next) <= 60) below = next; else above = next;
    const width = below === undefined || above === undefined ? null : above - below;
    await expect(page.locator(ui.progress)).toHaveAttribute('data-complete', String(width !== null && width <= 10));
    await expect(page.locator(ui.keep)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-result-readiness(?:\s|$)/);
    await expect(page.locator(ui.keep))[width !== null && width <= 10 ? 'toBeEnabled' : 'toBeDisabled']();
    samples.push({ distance: next, frequency: frequency(next), below, above, width, suggestion: await page.locator(ui.suggestion).innerText() });
  }
  await expect(page.locator(ui.suggest)).toHaveCount(0); await expect(page.locator(ui.suggestion)).toContainText(/No whole.metre distance remains/i);
  await expect(page.locator(ui.rows)).toHaveCount(8); await expect(page.locator(ui.progress)).toContainText('85–86 m');
  await activate(page, ui.keep);
  const saved = (await work(page)).persisted;
  expect(saved.records).toEqual([priorRecord]); expect(saved.fieldworkResults.eagle).toEqual(savedResults.eagle);
  expect(saved.fieldworkResults.human.trials.map((trial: any) => trial.settings.distance).sort((a: number, b: number) => a - b)).toEqual(sequence.slice(-8).sort((a, b) => a - b));
  expect(saved.fieldworkResults.human.trials.every((trial: any) => trial.prediction === 'both')).toBe(true);
  writeFileSync(resolve(output, 'planner-keyboard.json'), JSON.stringify({ samples, saved, suggestionsAreReadOnly: true, explicitPredictionRevealAndRecord: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('invalid and same-distance plans preserve evidence, while readiness guides held-variable recovery', async ({ page }) => {
  const initial = await setup(page); await open(page);
  await activate(page, '[data-distance-prediction="eagle"]'); await activate(page, ui.reveal);
  const draft = 'My draft should remain associated with the original 120 metre comparison.';
  await page.locator(ui.note).fill(draft); await start(page, 'human'); await reveal(page);
  const states = [await ready(page, 'ready')], beforeInvalid = await work(page);
  const announcement = page.locator('[data-distance-announcement="trial-input"]');
  await expect(announcement).toHaveAttribute('role', 'status'); await expect(announcement).toHaveAttribute('aria-live', 'polite');
  await expect(announcement).toHaveAttribute('aria-atomic', 'true');
  await announcement.evaluate(element => { (window as any).plannerInputAnnouncement = element; });
  const invalid: any[] = [];
  for (const value of ['', '39', '301', '85.5']) {
    await page.locator(ui.input).fill(value); expect(await work(page)).toEqual(beforeInvalid);
    await page.keyboard.press('Enter'); await expect(page.locator(ui.input)).toBeFocused();
    await expect(page.locator(ui.input)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(ui.input)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-trial-error(?:\s|$)/);
    await expect(page.locator(ui.error)).toBeVisible(); await expect(page.locator(ui.error)).toContainText(/40.*300/);
    await expect(page.locator(ui.error)).toContainText(/whole|integer/i);
    expect(await announcement.evaluate(element => element === (window as any).plannerInputAnnouncement)).toBe(true);
    expect(await work(page)).toEqual(beforeInvalid); await expect(page.locator(ui.rows)).toHaveCount(0);
    await expect(page.locator(ui.note)).toHaveValue(draft); await expect(page.locator('[data-distance-result]')).toBeVisible();
    invalid.push({ value, message: await page.locator(ui.error).innerText() });
  }
  await applyDistance(page, 40); await expect(page.locator(ui.input)).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator(ui.error)).toBeEmpty(); await ready(page, 'ready'); expect(await work(page)).toEqual(beforeInvalid);
  await applyDistance(page, 85); states.push(await ready(page, 'prediction'));
  await expect(page.locator(ui.note)).toHaveValue(draft); await expect(page.locator('[data-distance-draft-stale]')).toBeVisible();
  const beforeNext = await work(page); await activate(page, ui.next); await expect(page.locator(ui.heading)).toBeFocused(); expect(await work(page)).toEqual(beforeNext);
  await reveal(page); await activate(page, ui.panel + ' > summary'); await activate(page, ui.inline);
  await expect(page.locator(ui.panel)).toHaveAttribute('open', ''); await expect(page.locator(ui.progress)).toBeFocused();
  await applyDistance(page, 86); await reveal(page); await activate(page, ui.record);
  await expect(page.locator(ui.keep)).toBeEnabled(); await expect(page.locator(ui.progress)).toHaveAttribute('data-complete', 'true');
  await setRange(page, 'cycles', 14); await setRange(page, 'contrast', 25); states.push(await ready(page, 'held'));
  await expect(page.locator(ui.keep)).toBeEnabled(); await expect(page.locator(ui.resultReady)).toContainText(/recorded|collected|completed/i);
  const beforeHeldJump = await work(page); await activate(page, ui.next); await expect(page.locator(ui.restore)).toBeFocused(); expect(await work(page)).toEqual(beforeHeldJump);
  await page.keyboard.press('Enter'); await expect(page.locator(ui.heading)).toBeFocused(); states.push(await ready(page, 'prediction'));
  await expect(page.locator('#rh-distance-distance')).toHaveValue('86'); await expect(page.locator('#rh-distance-cycles')).toHaveValue('12');
  await expect(page.locator('#rh-distance-contrast')).toHaveValue('95'); await expect(page.locator(ui.rows)).toHaveCount(2);
  await expect(page.locator(ui.keep)).toBeEnabled(); await activate(page, ui.keep);
  const saved = (await work(page)).persisted;
  expect(saved.records).toEqual([priorRecord]); expect(saved.fieldworkResults.eagle).toEqual(savedResults.eagle);
  expect(saved.fieldworkResults.human.trials.map((trial: any) => trial.settings.distance)).toEqual([85, 86]);
  await expect(page.locator(ui.note)).toHaveValue(draft); await expect(page.locator('[data-distance-draft-stale]')).toBeVisible();
  writeFileSync(resolve(output, 'planner-validation.json'), JSON.stringify({ invalid, states, saved, sameDistancePreservesReveal: true,
    stableErrorAnnouncement: true, readinessNavigationIsReadOnly: true, savedCompletionIndependentOfCurrentReveal: true, draftPreserved: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('planner errors, trial readiness and completion remain accessible at 320px and in forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page); await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await open(page); await start(page, 'eagle'); await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(state: string) {
    const result = await page.locator(ui.root).evaluate(async root => {
      const audit = await (window as any).axe.run(root, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        inspectedNodes: [...audit.violations, ...audit.passes, ...audit.incomplete].reduce((sum: number, rule: any) => sum + rule.nodes.length, 0) };
    });
    scans.push({ state, ...result }); writeFileSync(resolve(output, 'planner-axe.json'), JSON.stringify({ scope: ui.root,
      limitation: 'Automated scans do not establish full WCAG conformance or replace assistive-technology testing; incomplete results require review.', scans }, null, 2));
    expect(result.inspectedNodes).toBeGreaterThan(0); expect(result.violations, state + ': ' + JSON.stringify(result.violations)).toEqual([]);
  }
  await page.locator(ui.input).fill('301'); await page.keyboard.press('Enter'); await expect(page.locator(ui.error)).toBeVisible(); await scan('invalid planned distance');
  await applyDistance(page, 40); await reveal(page); await scan('revealed trial ready'); await activate(page, ui.record);
  for (const distance of [200, 201]) { await applyDistance(page, distance); await reveal(page); await activate(page, ui.record); }
  await expect(page.locator(ui.progress)).toContainText('200–201 m'); await expect(page.locator(ui.suggest)).toHaveCount(0);
  await expect(page.locator(ui.keep)).toBeEnabled(); await scan('completed one-metre bracket');
  const beforePresentation = await work(page);
  await page.addStyleTag({ content: '[data-raptor-distance-study], [data-raptor-distance-study] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-raptor-distance-study] p{margin-bottom:2em!important}' });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await page.locator(ui.input).focus();
  await page.keyboard.press('Tab'); await expect(page.locator(ui.apply)).toBeFocused(); await page.keyboard.press('Shift+Tab'); await expect(page.locator(ui.input)).toBeFocused();
  const layout = await page.locator('[data-distance-fieldwork-run]').evaluate((root: HTMLElement) => {
    const bounds = root.getBoundingClientRect(), focus = document.activeElement as HTMLElement, css = getComputedStyle(focus);
    const targets = Array.from(root.querySelectorAll('button,input')).filter(node => !(node as HTMLInputElement).disabled).map(node => {
      const r = node.getBoundingClientRect(); return { name: node.textContent?.trim().slice(0, 80) || node.id, left: r.left, right: r.right, width: r.width, height: r.height };
    });
    const overflow = Array.from(root.querySelectorAll('p,h4,h5,strong,label,button,th,td,caption')).filter(node => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 2).map(node => node.textContent?.trim());
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
  expect(layout.targets.length).toBeGreaterThanOrEqual(6);
  for (const target of layout.targets) { expect(target.left, target.name).toBeGreaterThanOrEqual(-1); expect(target.right, target.name).toBeLessThanOrEqual(321); expect(target.width, target.name).toBeGreaterThanOrEqual(24); expect(target.height, target.name).toBeGreaterThanOrEqual(24); }
  expect(layout.overflow).toEqual([]); expect(layout.clippedText).toEqual([]); expect(layout.focus.visible).toBe(true);
  expect(layout.focus.outline).not.toBe('none'); expect(layout.focus.width).toBeGreaterThanOrEqual(3); expect(layout.focus.foreground).not.toBe(layout.focus.background);
  expect(layout.spacing.line).toBeCloseTo(layout.spacing.font * 1.5, 1); expect(layout.spacing.letter).toBeCloseTo(layout.spacing.font * .12, 1);
  expect(layout.spacing.word).toBeCloseTo(layout.spacing.font * .16, 1); expect(layout.spacing.bottom).toBeCloseTo(layout.spacing.font * 2, 1);
  expect(await work(page)).toEqual(beforePresentation);
  await page.locator(ui.form).screenshot({ path: resolve(output, 'planner-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  writeFileSync(resolve(output, 'planner-reflow.json'), JSON.stringify({ layout, completedEagleBracket: [200, 201], presentationDidNotChangeSceneOrPersistence: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});
