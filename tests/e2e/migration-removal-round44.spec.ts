import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, openDetails, settled } from './helpers/migration_round31';

test.describe.configure({ timeout: 150_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round44-2026-10-24');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const errors = new WeakMap<Page, string[]>();
const study = (page: Page) => page.locator('[data-study-observation]');
const note = (page: Page) => page.locator("[data-migration-id=\"migration-study-observation-note\"]");
const challenge = (page: Page) => page.locator("[data-migration-id=\"migration-flight-challenges\"]");
const notebook = (page: Page) => page.locator("[data-migration-id=\"migration-flight-experiment\"]");
const challengeRemove = (page: Page, index: number) => page.locator('[data-challenge-remove="' + index + '"]');
const trialRemove = (page: Page, index: number) => page.locator('[data-trial-remove="' + index + '"]');

const snapshot = (wind = 0) => ({ speciesId: 'canada_goose', season: 'fall', formationMode: 'natural', wind });
const trial = (index: number) => ({ variable: 'wind', prediction: 'Saved trial prediction ' + index,
  baseline: snapshot(), snapshot: snapshot(index + 3) });
const challengeStart = () => ({ speciesId: 'monarch', season: 'fall', formationMode: 'natural', wind: -15 });
const attempt = (index: number) => ({ prediction: 'Saved attempt prediction ' + index, notes: 'Saved attempt reasoning ' + index,
  baseline: challengeStart(), snapshot: { ...challengeStart(), wind: index + 3 } });
const investigation = (trials = [trial(1), trial(2)], baseline: any = snapshot()) => ({ variable: 'wind', prediction: 'Keep the current investigation prediction.',
  baseline, trials, evidence: 'Keep investigation evidence.', explanation: 'Keep investigation reasoning.' });
function challenges(rows = [attempt(1), attempt(2), attempt(3)], prediction = 'Keep the current challenge prediction.') {
  return { selectedId: 'wind', work: {
    wind: { prediction, notes: 'Keep current challenge reasoning.', setup: challengeStart(), attempts: rows },
    formation: { prediction: 'Keep the other challenge prediction.', notes: 'Keep the other reasoning.', setup: null, attempts: [] },
    season: { prediction: '', notes: '', setup: null, attempts: [] }
  } };
}
function observation() {
  return { speciesId: 'canada_goose', region: 'primaries', note: 'Recorded primary-feather evidence.', bird: 0,
    yaw: 35, pitch: 15, zoom: 1, wingStep: 8, paused: true, motionReduced: true };
}
function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source changed during verification').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from tested source').toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { expect(errors.get(page) || []).toEqual([]); unchangedSource(); await harness.destroy(page); });

async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function openScene(page: Page, extra: any = {}, dark = false) {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  await mount(harness, page, 'canada_goose', { dark, reduced: true, extra: {
    inquiry: { hypothesis: 'Keep the independent inquiry.' },
    flightInvestigation: investigation(), flightChallenges: challenges(),
    flightStudyObservations: { drafts: { 'canada_goose:primaries': 'Keep my current observation draft.', 'canada_goose:tail': 'Keep my tail draft.' },
      records: { 'canada_goose:primaries': observation() } }, ...extra
  } });
  await expect(page.locator("[data-migration-id=\"migration-flight-stage\"]")).toHaveAttribute('data-flight-ready', 'true');
  await settled(page);
}
async function patchState(page: Page, patch: any) {
  await page.evaluate(patch => { const w = window as any; w.__toolData.migration = { ...w.__toolData.migration, ...patch }; w.__rerender(); }, patch);
  await paint(page);
}
async function scan(page: Page) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const result = await page.evaluate(async () => {
    const audit = await (window as any).axe.run(document.querySelector('.migration-tool-shell'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
    });
    return { violations: audit.violations, incomplete: audit.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  });
  expect(result.violations).toEqual([]); return result;
}
async function enlarge(page: Page, scope: Locator) {
  const sizes = await scope.evaluate(node => {
    const nodes = [node, ...Array.from(node.querySelectorAll('*'))], sizes = nodes.map(element => parseFloat(getComputedStyle(element).fontSize));
    nodes.forEach((element, index) => (element as HTMLElement).style.setProperty('font-size', sizes[index] * 2 + 'px', 'important'));
    return nodes.map((element, index) => ({ before: sizes[index], after: parseFloat(getComputedStyle(element).fontSize) }));
  });
  expect(sizes.every(item => Math.abs(item.after - item.before * 2) < .1)).toBe(true);
  await page.addStyleTag({ content: '.migration-tool-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.migration-tool-shell p{margin-bottom:2em!important}' });
  await paint(page);
}
async function layoutProof(page: Page, scope: Locator, label: string) {
  const result = await scope.evaluate(node => {
    const rectData = (rect: DOMRect) => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height });
    const elementData = (element: Element) => {
      const style = getComputedStyle(element), html = element as HTMLElement;
      return { tag: element.tagName, id: element.id, className: element.getAttribute('class'), rect: rectData(element.getBoundingClientRect()),
        clientWidth: html.clientWidth, scrollWidth: html.scrollWidth, display: style.display, position: style.position,
        width: style.width, minWidth: style.minWidth, maxWidth: style.maxWidth, boxSizing: style.boxSizing,
        overflow: style.overflow, overflowX: style.overflowX, overflowY: style.overflowY, whiteSpace: style.whiteSpace,
        overflowWrap: style.overflowWrap, wordBreak: style.wordBreak, textIndent: style.textIndent,
        fontSize: style.fontSize, lineHeight: style.lineHeight, letterSpacing: style.letterSpacing, wordSpacing: style.wordSpacing,
        paddingLeft: style.paddingLeft, paddingRight: style.paddingRight, marginLeft: style.marginLeft, marginRight: style.marginRight,
        transform: style.transform, zoom: style.getPropertyValue('zoom'), flexShrink: style.flexShrink, alignSelf: style.alignSelf };
    };
    const boundary = node.getBoundingClientRect(), failures: string[] = [], controls: any[] = [], textDiagnostics: any[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (!text.textContent?.trim() || text.parentElement?.closest('[aria-hidden="true"],.sr-only')) continue;
      const range = document.createRange(); range.selectNodeContents(text);
      const fragments = Array.from(range.getClientRects()).filter(rect => rect.width && rect.height);
      const wholeTextOutside = fragments.filter(rect => rect.left < boundary.left - 1 || rect.right > boundary.right + 1);
      // pre-wrap may hang line-ending spaces outside the line box. Check
      // every visible word independently while retaining whole-text diagnostics.
      const words = Array.from(text.textContent.matchAll(/\S+/g)).map(match => {
        const word = document.createRange(); word.setStart(text, match.index!); word.setEnd(text, match.index! + match[0].length);
        return { text: match[0], index: match.index, rects: Array.from(word.getClientRects()).filter(rect => rect.width && rect.height).map(rectData) };
      });
      const outsideWords = words.flatMap(word => word.rects
        .filter(rect => rect.left < boundary.left - 1 || rect.right > boundary.right + 1)
        .map(rect => ({ text: word.text, index: word.index, ...rect,
          leftDelta: boundary.left - rect.left, rightDelta: rect.right - boundary.right })));
      for (const word of outsideWords) failures.push('Text leaves section: ' + word.text);
      if (wholeTextOutside.length || outsideWords.length) {
        const ancestors: any[] = [];
        for (let parent = text.parentElement; parent && ancestors.length < 12; parent = parent.parentElement) ancestors.push(elementData(parent));
        textDiagnostics.push({ text: text.textContent, fragments: fragments.map(rectData),
          wholeTextOutside: wholeTextOutside.map(rect => ({ ...rectData(rect), leftDelta: boundary.left - rect.left, rightDelta: rect.right - boundary.right })),
          outsideWords, nonWhitespaceWords: words, ancestors });
      }
    }
    for (const button of Array.from(node.querySelectorAll('button'))) {
      const rect = button.getBoundingClientRect(); if (!rect.width || !rect.height) continue;
      controls.push({ name: button.textContent?.trim(), width: rect.width, height: rect.height });
      if (rect.width < 24 || rect.height < 24) failures.push('Small target: ' + button.textContent);
      if (button.scrollWidth > button.clientWidth + 1) failures.push('Control text overflows: ' + button.textContent);
    }
    return { failures, controls, boundary: rectData(boundary), scope: elementData(node), textDiagnostics,
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  if (result.failures.length || result.scrollWidth > result.width + 1) {
    writeFileSync(join(report, label + '-layout-diagnostic.json'), JSON.stringify({ hash, result }, null, 2));
    await scope.screenshot({ path: join(report, label + '-layout-failure.png') });
    await page.screenshot({ path: join(report, label + '-layout-viewport.png') });
  }
  expect(result.failures).toEqual([]); expect(result.scrollWidth).toBeLessThanOrEqual(result.width + 1); return result;
}
async function captureHandler(page: Page, control: Locator) {
  await control.evaluate(node => {
    const key = Object.keys(node).find(key => key.startsWith('__reactProps$'))!;
    (window as any).__round44OldRemoval = { node, handler: (node as any)[key].onClick };
  });
}
async function replayRemoval(page: Page) {
  await page.evaluate(() => { const old = (window as any).__round44OldRemoval; old.handler({ currentTarget: old.node }); old.handler({ currentTarget: old.node }); });
  await paint(page);
}

test('removing an observation retains its draft and its own keyboard destination', async ({ page }) => {
  await openScene(page); await openDetails(page, study(page));
  const before = await data(page), input = note(page), remove = page.locator('[data-study-remove]');
  await expect(remove).toHaveAccessibleName('Remove recorded observation'); await expect(remove).toHaveAttribute('type', 'button');
  await captureHandler(page, remove); await activate(page, remove);
  await expect(input).toBeFocused(); await expect(input).toHaveValue('Keep my current observation draft.');
  await expect(remove).toHaveCount(0); await expect(page.locator('[data-study-observation-status]')).toContainText('draft is still here');
  const removed = await data(page);
  expect(removed.flightStudyObservations.records['canada_goose:primaries']).toBeUndefined();
  expect(removed.flightStudyObservations.drafts['canada_goose:tail']).toBe('Keep my tail draft.');
  expect(removed.inquiry).toEqual(before.inquiry); expect(removed.flightChallenges).toEqual(before.flightChallenges); expect(removed.flightInvestigation).toEqual(before.flightInvestigation);
  await activate(page, page.locator('[data-migration-tab="vformation"]')); const afterNavigation = await data(page);
  await replayRemoval(page); await expect(page.locator('[data-migration-tab="vformation"]')).toBeFocused(); expect(await data(page)).toEqual(afterNavigation);
  await activate(page, page.locator('[data-migration-tab="flight3d"]')); await expect(page.locator("[data-migration-id=\"migration-flight-stage\"]")).toHaveAttribute('data-flight-ready', 'true');
  await openDetails(page, study(page)); await page.setViewportSize({ width: 320, height: 1000 }); await enlarge(page, study(page));
  await input.focus(); await expect(input).toBeFocused();
  const narrow = await layoutProof(page, study(page), 'observation'), audit = await scan(page);
  await study(page).screenshot({ path: join(report, 'observation-removal-spacing.png') });
  writeFileSync(join(report, 'observation-removal-proof.json'), JSON.stringify({ hash, before, removed, afterNavigation, narrow, audit }, null, 2));
});

test('challenge removal keeps next, previous, and fallback controls in the keyboard flow', async ({ page }) => {
  await openScene(page); await openDetails(page, challenge(page)); await openDetails(page, page.locator('[data-flight-challenge-history]'));
  const before = await data(page);
  await captureHandler(page, challengeRemove(page, 2));
  await challengeRemove(page, 2).evaluate(node => (window as any).__round44MiddleRemoval = node);
  await activate(page, challengeRemove(page, 2)); await expect(challengeRemove(page, 2)).toBeFocused();
  expect(await challengeRemove(page, 2).evaluate(node => node === (window as any).__round44MiddleRemoval)).toBe(true);
  await expect(challenge(page).locator('[data-challenge-remove]')).toHaveCount(2);
  const afterMiddle = await data(page); expect(afterMiddle.flightChallenges.work.wind.attempts.map((row: any) => row.prediction)).toEqual(['Saved attempt prediction 1', 'Saved attempt prediction 3']);
  await replayRemoval(page); expect(await data(page)).toEqual(afterMiddle); await expect(challengeRemove(page, 2)).toBeFocused();
  await activate(page, challengeRemove(page, 2)); await expect(challengeRemove(page, 1)).toBeFocused();
  await activate(page, challengeRemove(page, 1)); await expect(page.locator('[data-flight-challenge-action="check"]')).toBeFocused();
  await expect(challenge(page).locator('[data-challenge-remove]')).toHaveCount(0);
  await patchState(page, { flightChallenges: challenges([attempt(4)], '') }); await openDetails(page, page.locator('[data-flight-challenge-history]'));
  await expect(page.locator('[data-flight-challenge-action="check"]')).toBeDisabled();
  await activate(page, challengeRemove(page, 1)); await expect(page.locator("[data-migration-id=\"migration-mission-prediction\"]")).toBeFocused();
  const final = await data(page); expect(final.flightChallenges.work.formation).toEqual(before.flightChallenges.work.formation);
  expect(final.flightInvestigation).toEqual(before.flightInvestigation); expect(final.flightStudyObservations).toEqual(before.flightStudyObservations); expect(final.inquiry).toEqual(before.inquiry);
  const audit = await scan(page); writeFileSync(join(report, 'challenge-removal-proof.json'), JSON.stringify({ hash, before, afterMiddle, final, audit }, null, 2));
});

test('delayed trial deletion never pulls focus back after the learner leaves', async ({ page }) => {
  await openScene(page, {}, true); const before = await data(page);
  await page.evaluate(() => {
    const w = window as any; w.__round44QueuedWrites = []; w.__round44OriginalUpdate = w.__ctx.update;
    w.__ctx.update = function(bucket: string, key: string, value: any) {
      if (bucket === 'migration' && key === 'flightInvestigation') { w.__round44QueuedWrites.push([bucket, key, value]); return; }
      return w.__round44OriginalUpdate.apply(this, arguments);
    }; w.__rerender();
  });
  await activate(page, trialRemove(page, 2)); await expect(trialRemove(page, 1)).toBeFocused();
  expect((await data(page)).flightInvestigation.trials).toHaveLength(2);
  expect(await page.evaluate(() => (window as any).__round44QueuedWrites.length)).toBe(1);
  await activate(page, page.locator('[data-migration-tab="vformation"]'));
  await page.evaluate(() => {
    const w = window as any; w.__ctx.update = w.__round44OriginalUpdate;
    for (const args of w.__round44QueuedWrites.splice(0)) w.__round44OriginalUpdate.apply(w.__ctx, args);
  });
  await paint(page); await expect(page.locator('[data-migration-tab="vformation"]')).toBeFocused();
  expect((await data(page)).flightInvestigation.trials).toHaveLength(1);
  await activate(page, page.locator('[data-migration-tab="flight3d"]')); await expect(page.locator("[data-migration-id=\"migration-flight-stage\"]")).toHaveAttribute('data-flight-ready', 'true');
  await activate(page, trialRemove(page, 1)); await expect(page.locator('[data-experiment-action="record"]')).toBeFocused();
  await patchState(page, { flightInvestigation: investigation([trial(5)], null) });
  await expect(page.locator('[data-experiment-action="record"]')).toBeDisabled();
  await activate(page, trialRemove(page, 1)); await expect(page.locator("[data-migration-id=\"migration-experiment-prediction\"]")).toBeFocused();
  const final = await data(page); expect(final.inquiry).toEqual(before.inquiry); expect(final.flightChallenges).toEqual(before.flightChallenges); expect(final.flightStudyObservations).toEqual(before.flightStudyObservations);
  await page.setViewportSize({ width: 320, height: 1000 }); await enlarge(page, page.locator('.migration-experiment-setup'));
  const narrow = await layoutProof(page, page.locator('.migration-experiment-setup'), 'trial-fallback'), audit = await scan(page);
  await page.locator('.migration-experiment-setup').screenshot({ path: join(report, 'trial-removal-fallback-spacing.png') });
  writeFileSync(join(report, 'trial-removal-proof.json'), JSON.stringify({ hash, before, final, narrow, audit }, null, 2));
});

test('explicit Study actions announce bounded settings and preserve their focused controls', async ({ page }) => {
  await openScene(page, {}, true); const before = await data(page), feedback = page.locator('[data-scene-feedback]');
  const step = page.getByRole('button', { name: 'Step wingbeat', exact: true });
  await activate(page, step); await expect(step).toBeFocused(); await expect(feedback).toContainText('Selected manual wing step 14.');
  await expect(feedback).toContainText(/Playback paused|Reduce motion/i); expect((await data(page)).flightWingStep).toBe(14);
  await page.keyboard.press('Space'); await expect(step).toBeFocused(); await expect(feedback).toContainText('Selected manual wing step 15.');
  const reset = page.getByRole('button', { name: 'Reset study view', exact: true });
  await activate(page, reset); await expect(reset).toBeFocused(); await expect(feedback).toContainText(/Study view reset/i);
  await expect(feedback).toContainText(/Angle 35/); await expect(feedback).toContainText(/Elevation 15/); await expect(feedback).toContainText(/Zoom 100/);
  const below = page.getByRole('button', { name: 'From below', exact: true });
  await activate(page, below); await expect(below).toBeFocused(); await expect(feedback).toContainText(/From below/); await expect(feedback).toContainText(/Elevation -60/);
  for (const [side, name] of [[0, 'Individual’s left: solid path'], [1, 'Individual’s right: dashed path']] as const) {
    const control = page.locator('[data-wingtip-follow-side="' + side + '"]');
    await expect(control).toHaveAccessibleName(name); await expect(control).toHaveText(name);
    await activate(page, control); await expect(control).toBeFocused();
  }
  const final = await data(page); expect(final.flightStudyObservations).toEqual(before.flightStudyObservations); expect(final.flightChallenges).toEqual(before.flightChallenges);
  expect(final.flightInvestigation).toEqual(before.flightInvestigation); expect(final.inquiry).toEqual(before.inquiry);
  const audit = await scan(page); writeFileSync(join(report, 'study-action-feedback-proof.json'), JSON.stringify({ hash, before, final, feedback: await feedback.textContent(), audit }, null, 2));
});
