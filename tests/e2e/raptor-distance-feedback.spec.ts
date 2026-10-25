import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ timeout: 240000, retries: 0 });
const output = resolve(process.env.RAPTOR_DISTANCE_ROUND12_REPORT || 'reports/raptor-distance-round12-20261023');
const harness = new GlHarness({
  toolId: 'raptorHunt', toolFile: 'stem_lab/stem_tool_raptorhunt.js',
  preScripts: ['stem_lab/stem_lab_module.js'], width: 1120, height: 900, appStyles: true, layout: 'document',
  probes: 'window.StemLab.loadScriptResilient=window.feedbackNativeLoader;window.AlloPostFXEnabled=false;'
});
const ui = {
  root: '[data-raptor-distance-study]', launch: '[data-raptor-distance-launch]', close: '[data-raptor-distance-close]',
  readiness: '[data-distance-note-readiness]', next: '[data-distance-note-next]', note: '[data-distance-note]',
  count: '[data-distance-note-count]', save: '[data-distance-save]', reveal: '[data-distance-reveal]',
  adopt: '[data-distance-adopt-draft]', status: '[data-distance-status]', retry: '[data-distance-retry]'
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

async function setup(page: Page, failFirstCreate = false) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const nativeFrame = window.requestAnimationFrame.bind(window), nativePng = HTMLCanvasElement.prototype.toDataURL;
    (window as any).feedbackRafs = 0; (window as any).feedbackCaptures = 0;
    window.requestAnimationFrame = callback => {
      if (/raptor_distance_(study|scene)\.js/.test(String(new Error().stack))) (window as any).feedbackRafs++;
      return nativeFrame(callback);
    };
    HTMLCanvasElement.prototype.toDataURL = function (...args: any[]) {
      if (this.hasAttribute('data-distance-canvas') && /raptor_distance_study\.js/.test(String(new Error().stack))) (window as any).feedbackCaptures++;
      return nativePng.apply(this, args as any);
    };
  });
  await page.route('**/stem_lab/stem_lab_module.js*', route => route.fulfill({ contentType: 'text/javascript',
    body: readFileSync('stem_lab/stem_lab_module.js', 'utf8') + '\nwindow.feedbackNativeLoader=window.StemLab.loadScriptResilient;'
  }));
  if (failFirstCreate) await page.route('**/stem_lab/raptor_distance_scene.js*', route => route.fulfill({ contentType: 'text/javascript',
    // Only the first constructor fails. Recovery uses the original renderer and native companion loader.
    body: readFileSync('stem_lab/raptor_distance_scene.js', 'utf8') + '\n(function(){var original=window.RaptorDistanceScene,create=original.create;window.feedbackCreateAttempts=0;window.RaptorDistanceScene=Object.assign({},original,{create:function(){if(++window.feedbackCreateAttempts===1)throw new Error("Injected one-time scene setup failure");return create.apply(original,arguments);}});})();'
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
}
async function reveal(page: Page) {
  await activate(page, '[data-distance-prediction="both"]'); await activate(page, ui.reveal);
  await expect(page.locator('[data-distance-result]')).toBeVisible();
}
async function setDistance(page: Page, value: number) {
  await page.locator('#rh-distance-distance').evaluate((input: HTMLInputElement, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.locator('#rh-distance-distance')).toHaveValue(String(value));
}
async function work(page: Page) {
  return page.locator(ui.root).evaluate((root: any) => ({ diagnostics: root._distanceScene.getDiagnostics(),
    captures: (window as any).feedbackCaptures, rafs: (window as any).feedbackRafs,
    persisted: (window as any).__toolData.raptorHunt.distantDetailStudy }));
}
async function readyState(page: Page, state: string) {
  await expect(page.locator(ui.readiness)).toHaveAttribute('data-state', state);
  await expect(page.locator(ui.note)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-note-readiness(?:\s|$)/);
  await expect(page.locator(ui.save)).toHaveAttribute('aria-describedby', /(?:^|\s)rh-distance-note-readiness(?:\s|$)/);
  await expect(page.locator(ui.save))[state === 'ready' ? 'toBeEnabled' : 'toBeDisabled']();
  return { state, text: await page.locator(ui.readiness).innerText(), saveEnabled: await page.locator(ui.save).isEnabled() };
}
async function rememberAnnouncement(page: Page, name: string) {
  const node = page.locator('[data-distance-announcement="' + name + '"]');
  await expect(node).toHaveCount(1); await expect(node).toHaveAttribute('role', 'status');
  await expect(node).toHaveAttribute('aria-live', 'polite'); await expect(node).toHaveAttribute('aria-atomic', 'true');
  await node.evaluate((element, key) => { const w = window as any; w.feedbackNodes ||= {}; w.feedbackNodes[key] = element; }, name);
}
async function sameAnnouncement(page: Page, name: string) {
  expect(await page.locator('[data-distance-announcement="' + name + '"]').evaluate((element, key) => element === (window as any).feedbackNodes[key], name), name + ' must update the original live region').toBe(true);
  await expect(page.locator('[data-distance-announcement="' + name + '"] [role="status"]')).toHaveCount(0);
}
async function namedGroup(page: Page, id: string) {
  const heading = page.locator('#rh-distance-' + id + '-question');
  const name = (await heading.innerText()).trim(); expect(name.length).toBeGreaterThan(15);
  const group = page.getByRole('group', { name, exact: true }); await expect(group).toHaveCount(1);
  await expect(group).toHaveAttribute('aria-labelledby', 'rh-distance-' + id + '-question');
  await expect(group.getByRole('button')).toHaveCount(3);
  return { id, name };
}
async function close(page: Page, initialSiblings: unknown) {
  expect(await siblings(page)).toEqual(initialSiblings);
  await page.locator(ui.root).evaluate((root: any) => { (window as any).feedbackClosedScene = root._distanceScene; });
  await activate(page, ui.close); await expect(page.locator(ui.root)).toHaveCount(0); await expect(page.locator(ui.launch)).toBeFocused();
  expect(await page.evaluate(() => (window as any).feedbackClosedScene.getDiagnostics().lifecycle)).toMatchObject({
    disposed: true, liveContexts: 0, rendererDisposed: true, birdDisposed: true, ownedResourceCount: 0
  });
  expect((await harness.glContexts(page)).every(context => context.lost && context.lostBy === 'page')).toBe(true);
}

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

test('keyboard notebook guidance explains each prerequisite, preserves drafts and names question groups', async ({ page }) => {
  const initial = await setup(page); await open(page);
  const states = [await readyState(page, 'prediction')], groups = [await namedGroup(page, 'prediction')];
  const beforePredictionJump = await work(page);
  await activate(page, ui.next); await expect(page.locator('[data-distance-prediction-heading]')).toBeFocused();
  expect(await work(page)).toEqual(beforePredictionJump);
  await page.keyboard.press('Tab'); await expect(page.locator('[data-distance-prediction="both"]')).toBeFocused();
  await page.keyboard.press('Enter'); await activate(page, ui.reveal);
  states.push(await readyState(page, 'write')); const beforeWriteJump = await work(page);
  await activate(page, ui.next); await expect(page.locator(ui.note)).toBeFocused(); expect(await work(page)).toEqual(beforeWriteJump);
  const observation = 'I used the model values to compare fine detail at the same inspection magnification.';
  await page.keyboard.type(observation); states.push(await readyState(page, 'ready'));
  await expect(page.locator(ui.count)).toHaveText(observation.length + ' of 600 characters used.');
  await expect(page.locator(ui.count)).toHaveAttribute('aria-live', 'off');
  await setDistance(page, 200); states.push(await readyState(page, 'prediction'));
  await expect(page.locator(ui.note)).toHaveValue(observation); await reveal(page);
  states.push(await readyState(page, 'review')); const beforeReviewJump = await work(page);
  await activate(page, ui.next); await expect(page.locator(ui.adopt)).toBeFocused(); expect(await work(page)).toEqual(beforeReviewJump);
  await page.keyboard.press('Enter'); await expect(page.locator(ui.note)).toBeFocused(); states.push(await readyState(page, 'ready'));
  expect(await work(page)).toEqual(beforeReviewJump);
  await activate(page, ui.save); await expect(page.locator(ui.note)).toBeFocused(); states.push(await readyState(page, 'write'));
  await expect(page.locator(ui.count)).toHaveText('0 of 600 characters used.');
  const saved = (await work(page)).persisted;
  expect(saved.records).toHaveLength(2); expect(saved.records[0]).toEqual(priorRecord);
  expect(saved.records[1]).toMatchObject({ distance: 200, note: observation, prediction: 'both' }); expect(saved.fieldworkResults).toEqual(savedResults);
  await activate(page, '[data-distance-fieldwork] > summary'); groups.push(await namedGroup(page, 'results'));
  await rememberAnnouncement(page, 'results-answer');
  await activate(page, '[data-distance-results-answer="size"]'); await sameAnnouncement(page, 'results-answer');
  await expect(page.locator('[data-distance-results-feedback]')).toHaveAttribute('data-correct', 'false');
  await activate(page, '[data-distance-results-answer="frequency"]'); await sameAnnouncement(page, 'results-answer');
  await expect(page.locator('[data-distance-results-feedback]')).toHaveAttribute('data-correct', 'true');
  await activate(page, '[data-distance-inquiry="distance"]'); await reveal(page); await activate(page, '[data-distance-pin]');
  await activate(page, '[data-distance-experiment="distance"]'); await reveal(page); groups.push(await namedGroup(page, 'reflection'));
  await rememberAnnouncement(page, 'reflection');
  await activate(page, '[data-distance-reflection-answer="same-same"]'); await sameAnnouncement(page, 'reflection');
  await expect(page.locator('[data-distance-reflection-feedback]')).toHaveAttribute('data-correct', 'false');
  await activate(page, '[data-distance-reflection-answer="smaller-higher"]'); await sameAnnouncement(page, 'reflection');
  await expect(page.locator('[data-distance-reflection-feedback]')).toHaveAttribute('data-correct', 'true');
  expect((await work(page)).persisted.records).toEqual(saved.records);
  writeFileSync(resolve(output, 'feedback-keyboard.json'), JSON.stringify({ states, groups, saved, prerequisiteNavigationIsReadOnly: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('existing live regions announce evidence changes while typing and the pixel probe remain quiet', async ({ page }) => {
  const initial = await setup(page); await open(page);
  const stable = ['reveal', 'snapshot', 'signal', 'draft', 'results-save'];
  for (const name of stable) await rememberAnnouncement(page, name);
  await reveal(page); for (const name of stable) await sameAnnouncement(page, name);
  await activate(page, '[data-distance-jump="signal"]'); await activate(page, '[data-distance-signal-read]');
  await expect(page.locator('[data-distance-signal-evidence]')).toBeVisible();
  await expect(page.locator('[data-distance-announcement="signal"]')).toContainText(/Sampled:.*120 m/);
  await expect(page.locator('[data-distance-announcement="signal"] svg, [data-distance-announcement="signal"] table, [data-distance-announcement="signal"] input')).toHaveCount(0);
  await activate(page, '[data-distance-jump="notebook"]'); await page.keyboard.type('I');
  await readyState(page, 'ready'); const beforeQuiet = await work(page);
  await page.locator(ui.root).evaluate(root => {
    const w = window as any; w.feedbackMutations = [];
    w.feedbackObserver = new MutationObserver(records => records.forEach(record => {
      const element = record.target instanceof Element ? record.target : record.target.parentElement;
      w.feedbackMutations.push({ announcement: element?.closest('[data-distance-announcement]')?.getAttribute('data-distance-announcement'), type: record.type });
    }));
    root.querySelectorAll('[data-distance-announcement]').forEach(element => w.feedbackObserver.observe(element, { childList: true, characterData: true, subtree: true }));
  });
  await page.keyboard.type(' can use the values without judging the image.');
  await page.locator('[data-distance-signal-probe]').focus(); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-distance-signal-probe]')).toHaveValue('1');
  await expect(page.locator('[data-distance-signal-probe]')).toHaveAttribute('aria-valuetext', /Human.*eagle.*mean RGB code value/);
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const quiet = await page.evaluate(() => { (window as any).feedbackObserver.disconnect(); return (window as any).feedbackMutations; });
  expect(quiet).toEqual([]); expect(await work(page)).toEqual(beforeQuiet);
  for (const name of stable) await sameAnnouncement(page, name);
  await setDistance(page, 200);
  await expect(page.locator('[data-distance-announcement="draft"]')).toContainText('Review this draft before saving.');
  await expect(page.locator('[data-distance-announcement="draft"] button')).toHaveCount(0); await expect(page.locator(ui.adopt)).toBeVisible();
  await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: any) => {
    canvas.feedbackOriginalPng = canvas.toDataURL; canvas.toDataURL = () => { throw new Error('Injected copied-image failure'); };
  });
  try {
    await reveal(page); await expect(page.locator('[data-distance-snapshot-error]')).toBeVisible();
    await expect(page.locator('[data-distance-announcement="snapshot"]')).toContainText('could not be copied');
    await expect(page.locator('[data-distance-announcement="signal"]')).toContainText('Image copies are unavailable');
    for (const name of stable) await sameAnnouncement(page, name);
  } finally {
    await page.locator('canvas[data-distance-canvas="reference"]').evaluate((canvas: any) => { canvas.toDataURL = canvas.feedbackOriginalPng; delete canvas.feedbackOriginalPng; });
  }
  await reveal(page); await expect(page.locator('[data-distance-announcement="snapshot"]')).toBeEmpty();
  await activate(page, '[data-distance-signal-read]'); await expect(page.locator('[data-distance-announcement="signal"]')).toContainText(/Sampled:.*200 m/);
  for (const name of stable) await sameAnnouncement(page, name);
  await activate(page, '[data-distance-match] > summary'); await activate(page, '[data-distance-match-start]'); await reveal(page); await activate(page, '[data-distance-pin]');
  await rememberAnnouncement(page, 'match'); await activate(page, '[data-distance-match-check]'); await sameAnnouncement(page, 'match');
  await expect(page.locator('[data-distance-match-feedback]')).toHaveAttribute('data-matched', 'false');
  await setDistance(page, 140); await reveal(page); await activate(page, '[data-distance-match-check]'); await sameAnnouncement(page, 'match');
  await expect(page.locator('[data-distance-match-feedback]')).toHaveAttribute('data-matched', 'true');
  const final = await work(page); expect(final.persisted.records).toEqual([priorRecord]); expect(final.persisted.fieldworkResults).toEqual(savedResults);
  writeFileSync(resolve(output, 'feedback-announcements.json'), JSON.stringify({ stableRegions: [...stable, 'match'], quietMutations: quiet,
    probeHasSpokenValues: true, graphsOutsideLiveRegion: true, draftActionsOutsideLiveRegion: true, recoveredSnapshotFailure: true,
    records: final.persisted.records, noTypingOrProbeSceneWork: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});

test('retry preserves keyboard focus and notebook guidance survives 320px spacing and forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = await setup(page, true); await page.locator('#wrap').evaluate((element: HTMLElement) => { element.style.width = '100%'; });
  await activate(page, ui.launch); await expect(page.locator(ui.status)).toHaveAttribute('data-distance-status', 'error');
  await readyState(page, 'error'); await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(state: string) {
    const result = await page.locator(ui.root).evaluate(async root => {
      const audit = await (window as any).axe.run(root, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        inspectedNodes: [...audit.violations, ...audit.passes, ...audit.incomplete].reduce((sum: number, rule: any) => sum + rule.nodes.length, 0) };
    });
    scans.push({ state, ...result }); writeFileSync(resolve(output, 'feedback-axe.json'), JSON.stringify({ scope: ui.root,
      limitation: 'Automated scans do not establish full WCAG conformance or replace assistive-technology testing; incomplete results require review.', scans }, null, 2));
    expect(result.inspectedNodes).toBeGreaterThan(0); expect(result.violations, state + ': ' + JSON.stringify(result.violations)).toEqual([]);
  }
  await scan('scene error');
  const preserved = await page.evaluate(() => (window as any).__toolData.raptorHunt.distantDetailStudy);
  await activate(page, ui.next); await expect(page.locator(ui.retry)).toBeFocused();
  await page.locator(ui.status).evaluate(element => { (window as any).feedbackSceneStatus = element; });
  await page.keyboard.press('Enter'); await expect(page.locator(ui.root)).toHaveAttribute('data-render-ready', 'true', { timeout: 60000 });
  await expect(page.locator(ui.status)).toBeFocused(); await expect(page.locator(ui.status)).toHaveAttribute('tabindex', '-1');
  expect(await page.locator(ui.status).evaluate(element => element === (window as any).feedbackSceneStatus)).toBe(true);
  expect(await page.evaluate(() => (window as any).feedbackCreateAttempts)).toBe(2);
  expect((await work(page)).persisted).toEqual(preserved); await readyState(page, 'prediction'); await scan('prediction needed');
  await reveal(page); await readyState(page, 'write'); await scan('write needed');
  await activate(page, ui.next); await page.keyboard.type('At 120 metres I compared calculated values under the same conditions.');
  await readyState(page, 'ready'); await scan('ready to save');
  await setDistance(page, 200); await reveal(page); await readyState(page, 'review'); await scan('draft review needed');
  const beforePresentation = await work(page);
  await page.addStyleTag({ content: '[data-raptor-distance-study], [data-raptor-distance-study] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-raptor-distance-study] p{margin-bottom:2em!important}' });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await activate(page, ui.next); await expect(page.locator(ui.adopt)).toBeFocused();
  const layout = await page.locator('.rh-distance-notebook').evaluate((root: HTMLElement) => {
    const bounds = root.getBoundingClientRect(), focus = document.activeElement as HTMLElement, css = getComputedStyle(focus);
    const targets = Array.from(root.querySelectorAll('button,textarea')).filter(node => !(node as HTMLButtonElement).disabled).map(node => {
      const r = node.getBoundingClientRect(); return { name: node.textContent?.trim().slice(0, 80) || node.id, left: r.left, right: r.right, width: r.width, height: r.height };
    });
    const overflow = Array.from(root.querySelectorAll('p,h4,strong,label,button')).filter(node => node.clientWidth > 0 && node.scrollWidth > node.clientWidth + 2).map(node => node.textContent?.trim());
    const paragraph = getComputedStyle(root.querySelector('p')!);
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, left: bounds.left, right: bounds.right, targets, overflow,
      focus: { visible: focus.matches(':focus-visible'), outline: css.outlineStyle, width: parseFloat(css.outlineWidth), foreground: css.color, background: css.backgroundColor },
      spacing: { font: parseFloat(paragraph.fontSize), line: parseFloat(paragraph.lineHeight), letter: parseFloat(paragraph.letterSpacing), word: parseFloat(paragraph.wordSpacing), bottom: parseFloat(paragraph.marginBottom) } };
  });
  expect(layout.viewport).toBe(320); expect(layout.documentWidth).toBeLessThanOrEqual(321); expect(layout.left).toBeGreaterThanOrEqual(-1); expect(layout.right).toBeLessThanOrEqual(321);
  expect(layout.targets.length).toBeGreaterThanOrEqual(4);
  for (const target of layout.targets) { expect(target.left, target.name).toBeGreaterThanOrEqual(-1); expect(target.right, target.name).toBeLessThanOrEqual(321); expect(target.width, target.name).toBeGreaterThanOrEqual(24); expect(target.height, target.name).toBeGreaterThanOrEqual(24); }
  expect(layout.overflow).toEqual([]); expect(layout.focus.visible).toBe(true); expect(layout.focus.outline).not.toBe('none'); expect(layout.focus.width).toBeGreaterThanOrEqual(3);
  expect(layout.spacing.line).toBeCloseTo(layout.spacing.font * 1.5, 1); expect(layout.spacing.letter).toBeCloseTo(layout.spacing.font * .12, 1);
  expect(layout.spacing.word).toBeCloseTo(layout.spacing.font * .16, 1); expect(layout.spacing.bottom).toBeCloseTo(layout.spacing.font * 2, 1);
  expect(await work(page)).toEqual(beforePresentation);
  await page.locator('.rh-distance-notebook').screenshot({ path: resolve(output, 'feedback-notebook-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  writeFileSync(resolve(output, 'feedback-retry-reflow.json'), JSON.stringify({ recoveredWithRealScene: true, sceneStatusIdentityAndFocusPreserved: true,
    retryDidNotChangeSavedState: true, layout, presentationDidNotChangeSceneOrPersistence: true }, null, 2));
  await close(page, initial.siblings); expect(initial.errors).toEqual([]);
});
