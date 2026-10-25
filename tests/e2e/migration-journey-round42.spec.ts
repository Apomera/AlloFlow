import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data } from './helpers/migration_round31';

test.describe.configure({ timeout: 150_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round42-2026-10-24');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const challenge = (page: Page) => page.locator('[data-journey-challenge]');
const summary = (page: Page) => page.locator('[data-journey-summary]');
const choice = (page: Page, index = 0) => page.locator('[data-journey-choice="' + index + '"]');
const status = (page: Page) => page.locator('[data-journey-status]');
const errors = new WeakMap<Page, string[]>();

function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source changed during verification').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from tested source').toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { expect(errors.get(page) || []).toEqual([]); unchangedSource(); await harness.destroy(page); });

async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); }
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function openJourney(page: Page, dark = false, extra = {}) {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  await mount(harness, page, 'canada_goose', { dark, reduced: true, extra: {
    inquiry: { hypothesis: 'Retain the learner prediction.' },
    flightStudyObservations: { drafts: { 'goose:wing': 'Retain the learner evidence.' } }, ...extra
  } });
  await activate(page, page.locator('[data-migration-tab="navigate"]'));
  await expect(challenge(page)).toBeVisible(); await expect(summary(page)).toBeVisible(); await paint(page);
}
async function patchState(page: Page, patch: Record<string, unknown>) {
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
async function semantics(page: Page) {
  await expect(summary(page)).toHaveRole('group'); await expect(summary(page)).toHaveAccessibleName(/\S/);
  await expect(summary(page)).toHaveAttribute('tabindex', '-1');
  await expect(status(page)).toHaveRole('status'); await expect(status(page)).toHaveAttribute('aria-live', 'polite');
  await expect(status(page)).toHaveAttribute('aria-atomic', 'true');
  const contextId = await page.locator('[data-journey-context]').getAttribute('id'); expect(contextId).toBeTruthy();
  const buttons = await challenge(page).locator('[data-journey-choice]').all(); expect(buttons).toHaveLength(3);
  for (let index = 0; index < buttons.length; index++) {
    await expect(buttons[index]).toHaveAttribute('type', 'button');
    await expect(buttons[index]).toHaveAccessibleName(new RegExp('^Choice ' + (index + 1) + ':'));
    await expect(buttons[index]).toHaveAccessibleDescription(/energy/i);
    await expect(buttons[index]).toHaveAccessibleDescription(/distance|miles/i);
    await expect(buttons[index]).toHaveAccessibleDescription(/flock|birds/i);
    const references = await buttons[index].evaluate(node => (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => {
      const target = document.getElementById(id); return { id, exists: !!target, text: target?.textContent?.trim() };
    }));
    expect(references.length).toBeGreaterThanOrEqual(2); expect(references.every(item => item.exists && item.text)).toBe(true);
    expect(references.map(item => item.id)).toContain(contextId);
  }
}
async function layoutProof(page: Page) {
  const result = await challenge(page).evaluate(node => {
    const boundary = node.getBoundingClientRect(), failures: string[] = [], labels: any[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let text = walker.nextNode(); text; text = walker.nextNode()) {
      if (!text.textContent?.trim() || text.parentElement?.closest('[aria-hidden="true"],.sr-only,[data-journey-status]')) continue;
      const range = document.createRange(); range.selectNodeContents(text);
      for (const line of Array.from(range.getClientRects())) {
        if (!line.width || !line.height) continue;
        if (line.left < boundary.left - 1 || line.right > boundary.right + 1) failures.push('Text leaves the challenge: ' + text.textContent);
      }
    }
    for (const control of Array.from(node.querySelectorAll('button'))) {
      const rect = control.getBoundingClientRect(), style = getComputedStyle(control);
      labels.push({ text: control.textContent?.trim(), width: rect.width, height: rect.height, fontSize: style.fontSize, scrollWidth: control.scrollWidth, clientWidth: control.clientWidth });
      if (rect.height < 24 || rect.width < 24) failures.push('Small target: ' + control.textContent);
      if (control.scrollWidth > control.clientWidth + 1) failures.push('Choice content overflows: ' + control.textContent);
    }
    return { failures, labels, width: innerWidth, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(result.failures).toEqual([]); expect(result.scrollWidth).toBeLessThanOrEqual(result.width + 1); return result;
}
async function enlargeJourney(page: Page) {
  const sizes = await challenge(page).evaluate(node => {
    const elements = [node, ...Array.from(node.querySelectorAll('*'))], before = elements.map(element => parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => (element as HTMLElement).style.setProperty('font-size', before[index] * 2 + 'px', 'important'));
    return elements.map((element, index) => ({ before: before[index], after: parseFloat(getComputedStyle(element).fontSize) }));
  });
  expect(sizes.every(item => Math.abs(item.after - item.before * 2) < .1)).toBe(true);
  await page.addStyleTag({ content: '.migration-tool-shell *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.migration-tool-shell p{margin-bottom:2em!important}' });
  await paint(page);
}
async function focusProof(control: Locator) {
  await expect(control).toBeFocused();
  const result = await control.evaluate(node => {
    const rect = node.getBoundingClientRect(), computed = getComputedStyle(node);
    const width = parseFloat(computed.outlineWidth), offset = parseFloat(computed.outlineOffset);
    return {
      width: computed.outlineWidth, style: computed.outlineStyle, offset,
      element: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
      paint: { left: rect.left - offset - width, right: rect.right + offset + width, top: rect.top - offset - width, bottom: rect.bottom + offset + width },
      viewport: { width: innerWidth, height: innerHeight }
    };
  });
  expect(parseFloat(result.width)).toBeGreaterThanOrEqual(2); expect(result.style).toBe('solid');
  expect(result.offset).toBeLessThanOrEqual(-2);
  expect(result.paint.left).toBeGreaterThanOrEqual(0); expect(result.paint.right).toBeLessThanOrEqual(result.viewport.width);
  return result;
}

for (const theme of ['light', 'dark']) test('journey choices preserve keyboard context and reflow in ' + theme, async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 }); await openJourney(page, theme === 'dark');
  const initial = await data(page);
  await page.evaluate(() => { const w = window as any; w.__journeyStatusNode = document.querySelector('[data-journey-status]'); w.__journeySummaryNode = document.querySelector('[data-journey-summary]'); });
  await activate(page, page.locator('[data-journey-start]'));
  await expect(summary(page)).toBeFocused(); await semantics(page); await expect(status(page)).not.toHaveText('');
  const summaryFocus = await focusProof(summary(page));
  const firstDecision = await data(page); expect(firstDecision.challengeStep).toBe(0);
  await page.keyboard.press('Tab'); await expect(choice(page)).toBeFocused();
  await page.keyboard.press('Enter'); await expect(summary(page)).toBeFocused();
  const nextDecision = await data(page); expect(nextDecision.challengeStep).toBe(1); expect(nextDecision.challengeLog).toHaveLength(1);
  await expect(page.locator('[data-journey-context]')).toContainText(nextDecision.challengeChoices.scenario);
  await expect(status(page)).toContainText(nextDecision.challengeResult); await semantics(page);
  expect(await page.evaluate(() => {
    const w = window as any; return w.__journeyStatusNode === document.querySelector('[data-journey-status]') && w.__journeySummaryNode === document.querySelector('[data-journey-summary]');
  })).toBe(true);
  const desktop = await layoutProof(page), normalAudit = await scan(page);
  await challenge(page).screenshot({ path: join(report, theme + '-journey.png') });
  await page.setViewportSize({ width: 320, height: 1000 }); await enlargeJourney(page);
  const narrow = await layoutProof(page), enlargedAudit = await scan(page);
  await choice(page).focus();
  const focus = await focusProof(choice(page));
  await challenge(page).screenshot({ path: join(report, theme + '-journey-spacing.png') });
  const saved = await data(page); expect(saved.inquiry).toEqual(initial.inquiry); expect(saved.flightStudyObservations).toEqual(initial.flightStudyObservations);
  writeFileSync(join(report, theme + '-journey-proof.json'), JSON.stringify({ hash, firstDecision, nextDecision, desktop, normalAudit, narrow, enlargedAudit, summaryFocus, focus }, null, 2));
});

test('journey outcomes and restart retain a keyboard destination', async ({ page }) => {
  await openJourney(page, false, { challengeActive: true, challengeStep: 4, challengeEnergy: 20,
    challengeDistance: 3000, challengeDistRemaining: 300, challengeFlockSize: 47,
    challengeComplete: false, challengeLoading: false, challengeScore: 0, challengeLog: [],
    challengeChoices: { scenario: 'The wintering grounds are in sight.', choices: [
      { label: 'Finish the last flight', energy_cost: -20, distance_gain: 300, flock_change: 0, result: 'The flock reaches its destination together.' }
    ] } });
  await activate(page, choice(page)); await expect(summary(page)).toBeFocused();
  await expect(page.locator('[data-journey-heading]')).toContainText(/complete/i);
  await expect(status(page)).toContainText(/complete/i); await expect(status(page)).toContainText('The flock reaches its destination together.');
  expect((await data(page)).challengeComplete).toBe(true); await expect(challenge(page).locator('[data-journey-choice]')).toHaveCount(0);
  await page.keyboard.press('Tab'); await expect(page.locator('[data-journey-restart]')).toBeFocused();
  await page.keyboard.press('Enter'); await expect(summary(page)).toBeFocused(); await expect(choice(page)).toBeVisible();
  expect((await data(page)).challengeComplete).toBe(false); expect((await data(page)).challengeStep).toBe(0);
  await patchState(page, { challengeEnergy: 1, challengeFlockSize: 1 });
  await activate(page, choice(page)); await expect(summary(page)).toBeFocused();
  await expect(page.locator('[data-journey-heading]')).toContainText(/failed|ended/i);
  await expect(status(page)).toContainText(/failed|ended/i);
  const final = await data(page); expect(final.challengeComplete).toBe(true); expect(final.challengeFlockSize).toBe(0);
  await activate(page, page.locator('[data-journey-restart]')); await expect(summary(page)).toBeFocused();
  expect((await data(page)).challengeEnergy).toBe(100); await expect(choice(page)).toBeVisible();
  const audit = await scan(page); writeFileSync(join(report, 'journey-outcomes-proof.json'), JSON.stringify({ hash, final, audit }, null, 2));
});

test('journey loading locks submissions and lets the learner choose offline without delayed focus theft', async ({ page }) => {
  await openJourney(page);
  await page.evaluate(() => {
    const w = window as any; w.__journeyRequests = [];
    w.__ctx.callGemini = () => new Promise(resolve => w.__journeyRequests.push(resolve)); w.__rerender();
  });
  await activate(page, page.locator('[data-journey-start]')); await expect(summary(page)).toBeFocused();
  await expect(status(page)).toContainText(/scouting|loading/i); await expect(challenge(page).locator('[data-journey-choice]')).toHaveCount(0);
  await expect(page.locator('[data-journey-offline]')).toBeVisible();
  await activate(page, page.locator('[data-journey-offline]')); await expect(summary(page)).toBeFocused();
  await expect(choice(page)).toBeVisible(); const recovered = await data(page);
  await page.evaluate(() => (window as any).__journeyRequests[0](JSON.stringify({ scenario: 'Superseded AI scenario must not replace offline play.', choices: [
    { label: 'A superseded choice', energy_cost: -10, distance_gain: 100, flock_change: 0, result: 'Superseded result.' }
  ] })));
  await paint(page); expect((await data(page)).challengeChoices).toEqual(recovered.challengeChoices);
  await choice(page).evaluate(node => {
    const key = Object.keys(node).find(key => key.startsWith('__reactProps$'))!;
    (window as any).__journeyOldChoice = { handler: (node as any)[key].onClick, node };
  });
  await activate(page, choice(page)); await expect(summary(page)).toBeFocused();
  await expect(challenge(page).locator('[data-journey-choice]')).toHaveCount(0);
  await page.evaluate(() => { const old = (window as any).__journeyOldChoice; old.handler({ currentTarget: old.node }); old.handler({ currentTarget: old.node }); });
  expect(await page.evaluate(() => (window as any).__journeyRequests.length)).toBe(2);
  expect((await data(page)).challengeStep).toBe(1); expect((await data(page)).challengeLog).toHaveLength(1);
  const otherControl = page.locator('#migration-navigation-method-stars');
  await otherControl.focus();
  await page.evaluate(() => (window as any).__journeyRequests[1](JSON.stringify({ scenario: 'A fresh decision is ready.', choices: [
    { label: 'Follow the river', energy_cost: -5, distance_gain: 200, flock_change: 0, result: 'The river guides the flock.' }
  ] })));
  await expect(choice(page)).toBeVisible(); await expect(otherControl).toBeFocused();
  await expect(page.locator('[data-journey-context]')).toContainText('A fresh decision is ready.');
  await activate(page, choice(page)); await expect(page.locator('[data-journey-offline]')).toBeVisible();
  await activate(page, page.locator('[data-migration-tab="vformation"]'));
  await page.evaluate(() => (window as any).__journeyRequests[2](JSON.stringify({ scenario: 'A reply arriving after leaving the activity.', choices: [
    { label: 'Continue safely', energy_cost: -5, distance_gain: 200, flock_change: 0, result: 'Another safe stage.' }
  ] })));
  await paint(page); await expect(page.locator('[data-migration-tab="vformation"]')).toBeFocused();
  await expect(page.locator('[data-migration-tab="vformation"]')).toHaveAttribute('aria-selected', 'true');
  await expect.poll(async () => (await data(page)).challengeChoices?.scenario).toBe('A reply arriving after leaving the activity.');
  await activate(page, page.locator('[data-migration-tab="navigate"]'));
  await expect(page.locator('[data-migration-tab="navigate"]')).toBeFocused(); await expect(choice(page)).toBeVisible();
  await expect(page.locator('[data-journey-context]')).toContainText('A reply arriving after leaving the activity.');
  const final = await data(page);
  writeFileSync(join(report, 'journey-async-proof.json'), JSON.stringify({ hash, recovered, final, requests: await page.evaluate(() => (window as any).__journeyRequests.length) }, null, 2));
});
