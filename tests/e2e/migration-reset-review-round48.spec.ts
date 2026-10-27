import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, settled } from './helpers/migration_round31';

test.describe.configure({ timeout: 180_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round48-2026-10-26');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const failures = new WeakMap<Page, string[]>();
const empty = { variable: 'wind', prediction: '', baseline: null, trials: [], evidence: '', explanation: '' };
const action = (page: Page, name: string) => page.locator('[data-experiment-action="' + name + '"]');
const review = (page: Page) => page.locator('[data-investigation-reset-review]');
function authored() {
  const baseline = { speciesId: 'canada_goose', season: 'fall', wind: 0, formationMode: 'natural' };
  return {
    flightInvestigation: { variable: 'wind', prediction: 'A tailwind may increase ground speed.', baseline,
      trials: [{ variable: 'wind', prediction: 'My recorded prediction.', baseline, snapshot: { ...baseline, wind: 8 } }],
      evidence: 'My important saved measurements.', explanation: 'My model limitation.' },
    flightStudyObservations: { drafts: { 'canada_goose:head': 'Keep this Study draft.' }, records: {} },
    flightChallenges: { selectedId: 'wind', work: { wind: { prediction: 'Keep challenge work.', notes: 'Keep explanation.', attempts: [] } } },
    inquiry: { hypothesis: 'Keep the independent inquiry.' }
  };
}
function unchanged() { expect(readFileSync(sourcePath).equals(source)).toBe(true); expect(readFileSync(mirrorPath).equals(source)).toBe(true); }
function otherWork(state: any) { const { flightInvestigation, ...other } = state; return other; }
test.beforeAll(async () => { unchanged(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => { expect(failures.get(page) || []).toEqual([]); unchanged(); await harness.destroy(page); });
async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); await paint(page); }
async function openScene(page: Page) {
  const errors: string[] = []; failures.set(page, errors); page.on('pageerror', error => errors.push(error.stack || error.message));
  await mount(harness, page, 'canada_goose', { reduced: true, extra: { flightWind: 8, flightStudyYaw: 75, flightStudyPitch: 20, flightStudyZoom: 1.2, ...authored() } });
  await settled(page);
}
async function audit(page: Page) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const result = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('[data-migration-flight-investigation]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return { violations: result.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })), incomplete: result.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  });
  expect(result.violations).toEqual([]); return result;
}

test('reset review is keyboard cancellable and returns to its own origin without changing learner work', async ({ page }) => {
  await openScene(page); const before = await data(page), origin = action(page, 'reset');
  await expect(review(page)).toBeHidden(); await activate(page, origin);
  await expect(review(page)).toBeVisible(); await expect(action(page, 'reset-cancel')).toBeFocused();
  await expect(review(page)).toHaveRole('group'); await expect(review(page)).toHaveAccessibleName('Clear this investigation?');
  await expect(review(page)).not.toHaveAttribute('aria-modal', 'true'); expect(await data(page)).toEqual(before);
  const relationships = await review(page).evaluate(group => ['aria-labelledby', 'aria-describedby'].map(attribute => {
    const id = group.getAttribute(attribute) || '', target = document.getElementById(id);
    return { attribute, id, own: !!target && group.contains(target), text: target?.textContent };
  }));
  expect(relationships.every(item => item.own)).toBe(true);
  const openAudit = await audit(page);
  await review(page).screenshot({ path: join(report, 'investigation-reset-keyboard-review.png') });
  await activate(page, action(page, 'reset-cancel')); await expect(review(page)).toBeHidden(); await expect(origin).toBeFocused();
  expect(await data(page)).toEqual(before);
  await activate(page, origin); await page.keyboard.press('Tab'); await expect(action(page, 'reset-confirm')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(review(page)).toBeHidden(); await expect(origin).toBeFocused();
  expect(await data(page)).toEqual(before);
  const accessibility = await audit(page);
  writeFileSync(join(report, 'investigation-reset-keyboard-proof.json'), JSON.stringify({ hash, before, after: await data(page), relationships, cancelFocus: true, escapeFocus: true, openAudit, audit: accessibility }, null, 2));
});

test('confirmed reset clears only the reviewed investigation and gives an owned visible acknowledgement', async ({ page }) => {
  await openScene(page); const before = await data(page), origin = action(page, 'reset');
  await activate(page, origin); expect(await data(page)).toEqual(before);
  await activate(page, action(page, 'reset-confirm')); await expect(review(page)).toBeHidden(); await expect(origin).toBeFocused();
  const after = await data(page); expect(after.flightInvestigation).toEqual(empty); expect(otherWork(after)).toEqual(otherWork(before));
  await expect(page.locator('[data-learning-feedback="investigation"]')).toContainText('Flight investigation cleared. Flight settings and other activities are unchanged.');
  const accessibility = await audit(page);
  writeFileSync(join(report, 'investigation-reset-confirmed-proof.json'), JSON.stringify({ hash, before, after, resetFocus: true, audit: accessibility }, null, 2));
});

test('changed investigation work cannot be cleared by an older review and remains readable in narrow forced colors', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 }); await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  await openScene(page); await activate(page, action(page, 'reset'));
  const evidence = page.locator('[data-migration-id="migration-experiment-evidence"]');
  await evidence.fill('New evidence entered after reset was requested.'); await paint(page);
  const changed = await data(page); await expect(action(page, 'reset-confirm')).toHaveAttribute('aria-disabled', 'true');
  await expect(review(page)).toContainText('This investigation changed'); await expect(review(page)).toContainText('Nothing has been cleared');
  await activate(page, action(page, 'reset-confirm')); expect(await data(page)).toEqual(changed);
  await page.addStyleTag({ content: '.migration-experiment-reset{font-size:24px!important;line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}.migration-investigation-reset-review h4,.migration-investigation-reset-review p,.migration-investigation-reset-review button{font:inherit!important;letter-spacing:inherit!important;word-spacing:inherit!important}.migration-investigation-reset-review p{margin-bottom:2em!important}' });
  await action(page, 'reset-cancel').focus(); await paint(page);
  const layout = await review(page).evaluate(group => {
    const rect = group.getBoundingClientRect(); const nodes = [...group.querySelectorAll('h4,p,button')];
    return { width: innerWidth, left: rect.left, right: rect.right, overflow: group.scrollWidth - group.clientWidth,
      controls: nodes.map(node => { const r = node.getBoundingClientRect(); return { tag: node.tagName, left: r.left, right: r.right, overflow: node.scrollWidth - node.clientWidth }; }),
      focus: document.activeElement?.getAttribute('data-experiment-action') };
  });
  expect(layout.left).toBeGreaterThanOrEqual(-1); expect(layout.right).toBeLessThanOrEqual(321); expect(layout.overflow).toBeLessThanOrEqual(2);
  expect(layout.controls.every(node => node.left >= layout.left - 1 && node.right <= layout.right + 1 && node.overflow <= 2)).toBe(true);
  expect(layout.focus).toBe('reset-cancel'); await review(page).screenshot({ path: join(report, 'investigation-reset-stale-forced-colors.png') });
  const accessibility = await audit(page);
  await activate(page, action(page, 'reset-cancel')); await expect(action(page, 'reset')).toBeFocused(); expect(await data(page)).toEqual(changed);
  writeFileSync(join(report, 'investigation-reset-stale-proof.json'), JSON.stringify({ hash, changed, after: await data(page), layout, audit: accessibility,
    scope: 'Real WebGL, 320 CSS-pixel viewport, enlarged review text, text-spacing overrides, and emulated forced colors. Native screen-reader speech and actual OS contrast remain manual.' }, null, 2));
});
