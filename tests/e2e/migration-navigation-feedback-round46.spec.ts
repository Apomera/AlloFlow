import { test, expect, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { makeHarness, mount, data, openDetails, settled } from './helpers/migration_round31';

test.describe.configure({ timeout: 150_000, retries: 0 });
const report = process.env.MIGRATION_REPORT_DIR || join(process.cwd(), 'reports/migration-deep-review-round46-2026-10-24');
const sourcePath = join(process.cwd(), 'stem_lab/stem_tool_migration.js');
const mirrorPath = join(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_migration.js');
const source = readFileSync(sourcePath), hash = createHash('sha256').update(source).digest('hex');
const harness = makeHarness('stem_lab/stem_tool_migration.js');
const errors = new WeakMap<Page, string[]>();
const shell = (page: Page) => page.locator('#wrap > .migration-tool-shell');
const otherShell = (page: Page) => page.locator('#round46-other > .migration-tool-shell');
const work = (state: any) => Object.fromEntries(['inquiry', 'flightStudyObservations', 'flightInvestigation', 'flightChallenges'].map(key => [key, state[key]]));

function unchangedSource() {
  expect(readFileSync(sourcePath).equals(source), 'source changed during browser verification').toBe(true);
  expect(readFileSync(mirrorPath).equals(source), 'desktop mirror differs from tested source').toBe(true);
}
test.beforeAll(async () => { unchangedSource(); mkdirSync(report, { recursive: true }); await harness.start(); });
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  expect(errors.get(page) || []).toEqual([]); unchangedSource();
  await removeOther(page); await harness.destroy(page);
});

async function paint(page: Page) { await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))); }
async function activate(page: Page, control: Locator) { await control.focus(); await page.keyboard.press('Enter'); await paint(page); }
async function openScene(page: Page, dark = false) {
  const failures: string[] = []; errors.set(page, failures); page.on('pageerror', error => failures.push(error.stack || error.message));
  await mount(harness, page, 'canada_goose', { dark, reduced: true, extra: {
    flightStudyYaw: 35, flightStudyPitch: 15, flightStudyZoom: 1.2, flightWind: 0, flightFormation: 'natural',
    inquiry: { hypothesis: 'Keep my independent energy prediction.' },
    flightStudyObservations: { drafts: { 'canada_goose:tail': 'Keep my independent Study evidence.' }, records: {} },
    flightInvestigation: { variable: 'wind', prediction: 'More tailwind will increase ground speed.', baseline: null, trials: [], evidence: 'Keep my evidence draft.', explanation: 'Keep my explanation draft.' },
    flightChallenges: { selectedId: 'formation', work: {
      wind: { prediction: 'Keep my other goal prediction.', notes: 'Keep my other explanation.', setup: null, attempts: [] },
      formation: { prediction: 'Flying together will change the modeled drafting credit.', notes: 'My explanation is evidence, not an automatic grade.', setup: null, attempts: [] },
      season: { prediction: '', notes: '', setup: null, attempts: [] }
    } }
  } });
  await settled(page);
  await page.evaluate(() => { (window as any).__ctx.announceToSR = undefined; (window as any).__rerender(); });
  await paint(page);
}

// A separate React root exercises instance ownership without replacing the real
// DOM or renderer. The original harness remains available for state assertions.
async function addOther(page: Page) {
  await page.evaluate(() => {
    const w = window as any, host = document.createElement('div'); host.id = 'round46-other';
    host.style.width = 'min(100vw,1100px)'; document.body.append(host);
    const state = JSON.parse(JSON.stringify(w.__toolData)); let refresh: (() => void) | null = null;
    const ctx = { ...w.__ctx, toolData: state, labToolData: state,
      update(bucket: string, key: string, value: any) { state[bucket] = { ...state[bucket], [key]: value }; if (refresh) refresh(); },
      updateMulti(bucket: string, patch: any) { state[bucket] = { ...state[bucket], ...patch }; if (refresh) refresh(); }
    };
    function Other() {
      const [, setTick] = w.React.useState(0); refresh = () => setTick((n: number) => n + 1);
      return w.StemLab._registry.migration.render(ctx);
    }
    w.__round46OtherData = state; w.__round46OtherRoot = w.ReactDOM.createRoot(host);
    w.__round46OtherRoot.render(w.React.createElement(Other));
  });
  await expect(otherShell(page).locator('.migration-flight-stage')).toHaveAttribute('data-flight-ready', 'true');
  await paint(page);
}
async function removeOther(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    if (w.__round46OtherRoot) { w.__round46OtherRoot.unmount(); w.__round46OtherRoot = null; }
    document.querySelector('#round46-other')?.remove();
  }).catch(() => {});
}
async function scan(page: Page) {
  await page.addScriptTag({ path: join(process.cwd(), 'axe-core/4.12.1/axe.min.js') });
  const audit = await page.evaluate(async () => {
    const result = await (window as any).axe.run(document.querySelector('#wrap > .migration-tool-shell'), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }
    });
    return { violations: result.violations, incomplete: result.incomplete.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) })) };
  });
  expect(audit.violations).toEqual([]); return audit;
}
async function rememberFeedback(page: Page, status: Locator) {
  await status.evaluate(node => { (window as any).__round46Status = node; (window as any).__round46Message = node.firstElementChild; });
}
async function expectRepeatedFeedback(status: Locator) {
  expect(await status.evaluate(node => ({ sameStatus: node === (window as any).__round46Status,
    changedMessage: node.firstElementChild !== (window as any).__round46Message }))).toEqual({ sameStatus: true, changedMessage: true });
}
async function expectLiveStatus(status: Locator) {
  await expect(status).toHaveRole('status'); await expect(status).toHaveAttribute('aria-live', 'polite');
  await expect(status).toHaveAttribute('aria-atomic', 'true');
}

test('horizontal activity tabs keep focus and accessible relationships in their own tool', async ({ page }) => {
  await openScene(page); await addOther(page); const before = await data(page), other = otherShell(page);
  const flight = other.locator('[data-migration-tab="flight3d"]'), formation = other.locator('[data-migration-tab="vformation"]');
  await flight.focus(); await page.keyboard.press('ArrowRight');
  await expect(formation).toBeFocused(); await expect(formation).toHaveAttribute('aria-selected', 'true');
  await expect(shell(page).locator('[data-migration-tab="flight3d"]')).toHaveAttribute('aria-selected', 'true');
  const relationships = await other.evaluate(node => {
    const tabs = [...node.querySelectorAll('[role="tab"]')], panel = node.querySelector('[role="tabpanel"]')!;
    const selected = tabs.find(tab => tab.getAttribute('aria-selected') === 'true')!;
    return { allIdsUnique: tabs.every(tab => document.querySelectorAll('[id="' + tab.id + '"]').length === 1),
      ownPanel: selected.getAttribute('aria-controls') === panel.id,
      ownLabel: panel.getAttribute('aria-labelledby') === selected.id,
      tabStops: tabs.filter(tab => (tab as HTMLElement).tabIndex === 0).length };
  });
  expect(relationships).toEqual({ allIdsUnique: true, ownPanel: true, ownLabel: true, tabStops: 1 });
  await page.keyboard.press('ArrowDown'); await expect(formation).toBeFocused();
  await page.keyboard.press('Control+ArrowRight'); await expect(formation).toBeFocused();
  await expect(formation).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End'); await expect(other.locator('[data-migration-tab="inquiry"]')).toBeFocused();
  await page.keyboard.press('Home'); await expect(flight).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(other.locator('[data-migration-tab="inquiry"]')).toBeFocused();
  expect(work(await data(page))).toEqual(work(before));
  await removeOther(page); const audit = await scan(page);
  writeFileSync(join(report, 'activity-tab-navigation-proof.json'), JSON.stringify({ hash, before, final: await data(page), relationships, audit }, null, 2));
});

test('scene focus and fullscreen failures stay within the activated 3D deck', async ({ page }) => {
  await openScene(page); await addOther(page); const before = await data(page), own = otherShell(page);
  const status = own.locator('[data-scene-feedback]'), focus = own.locator('[data-scene-focus]'), fullscreen = own.locator('[data-scene-fullscreen]');
  await activate(page, focus); await expect(own.locator('.migration-flight-stage')).toBeFocused();
  await expect(status).toContainText('3D scene focused.');
  await expect(shell(page).locator('[data-scene-feedback]')).toBeEmpty();
  // Do not invoke OS fullscreen in automation. API absence and rejected promises
  // are controlled here; real native fullscreen transitions remain a manual check.
  await own.locator('.migration-flight-deck').evaluate(node => {
    const deck = node as any; deck.requestFullscreen = undefined; deck.webkitRequestFullscreen = undefined;
    (window as any).__alloStemFS = undefined;
  });
  await activate(page, fullscreen); await expect(fullscreen).toBeFocused();
  await expect(status).toContainText('Fullscreen is unavailable.');
  await own.locator('.migration-flight-deck').evaluate(node => {
    (node as any).requestFullscreen = () => Promise.reject(new Error('Expected rejection in browser verification.'));
  });
  await activate(page, fullscreen); await expect(fullscreen).toBeFocused();
  await expect(status).toContainText('Fullscreen could not be changed.');
  await rememberFeedback(page, status); await activate(page, fullscreen);
  await expect(status).toContainText('Fullscreen could not be changed.'); await expectRepeatedFeedback(status);
  await expect(shell(page).locator('[data-scene-feedback]')).toBeEmpty();
  expect(work(await data(page))).toEqual(work(before));
  const message = await status.textContent(); await removeOther(page); const audit = await scan(page);
  writeFileSync(join(report, 'scene-navigation-owned-proof.json'), JSON.stringify({ hash, before, final: await data(page), message,
    fullscreenApi: 'Unavailable and rejecting request APIs emulated; native OS fullscreen transition not exercised', audit }, null, 2));
});

test('investigation confirmations repeat locally without changing focus or unrelated learner work', async ({ page }) => {
  await openScene(page); const before = await data(page), status = shell(page).locator('[data-learning-feedback="investigation"]');
  const baseline = page.locator('[data-experiment-action="baseline"]'), record = page.locator('[data-experiment-action="record"]');
  await expectLiveStatus(status); await expect(status).toBeEmpty();
  await activate(page, baseline); await expect(baseline).toBeFocused(); await expect(status).toContainText('Baseline captured.');
  await rememberFeedback(page, status); await activate(page, baseline); await expectRepeatedFeedback(status);
  await activate(page, record); await expect(record).toBeFocused(); await expect(status).toContainText('Trial recorded.');
  await rememberFeedback(page, status); await activate(page, record); await expectRepeatedFeedback(status);
  const recorded = await data(page); expect(recorded.flightInvestigation.trials).toHaveLength(2);
  expect(recorded.flightInvestigation.prediction).toBe(before.flightInvestigation.prediction);
  expect(recorded.flightInvestigation.evidence).toBe(before.flightInvestigation.evidence);
  expect(recorded.flightInvestigation.explanation).toBe(before.flightInvestigation.explanation);
  expect(recorded.inquiry).toEqual(before.inquiry); expect(recorded.flightChallenges).toEqual(before.flightChallenges);
  expect(recorded.flightStudyObservations).toEqual(before.flightStudyObservations);
  const restore = page.locator('[data-experiment-action="restore"]');
  await activate(page, restore); await expect(restore).toBeFocused(); await expect(status).toContainText('Baseline flight controls restored.');
  const reset = page.locator('[data-experiment-action="reset"]'); await activate(page, reset);
  await expect(reset).toBeFocused(); await expect(status).toContainText('Flight investigation cleared.');
  expect((await data(page)).flightInvestigation.trials).toEqual([]);
  const audit = await scan(page);
  writeFileSync(join(report, 'investigation-action-confirmation-proof.json'), JSON.stringify({ hash, before, recorded, final: await data(page), audit }, null, 2));
});

test('challenge save confirmations repeat without a host announcer and stay readable on a narrow page', async ({ page }) => {
  await openScene(page, true); const before = await data(page), challenge = page.locator('[data-migration-flight-challenges]');
  await openDetails(page, challenge); const status = challenge.locator('[data-learning-feedback="challenge"]');
  await expectLiveStatus(status); await expect(status).toBeEmpty();
  const load = challenge.locator('[data-flight-challenge-action="load"]'), check = challenge.locator('[data-flight-challenge-action="check"]');
  await activate(page, load); await expect(load).toBeFocused(); await expect(status).toContainText('Starting flight loaded.');
  await rememberFeedback(page, status); await activate(page, load); await expectRepeatedFeedback(status);
  await activate(page, check); await expect(check).toBeFocused(); await expect(status).toContainText('Attempt saved.');
  await rememberFeedback(page, status); await activate(page, check); await expectRepeatedFeedback(status);
  const saved = await data(page), attempts = saved.flightChallenges.work.formation.attempts;
  expect(attempts).toHaveLength(2); expect(attempts[0].prediction).toBe(before.flightChallenges.work.formation.prediction);
  expect(attempts[0].notes).toBe(before.flightChallenges.work.formation.notes);
  expect(saved.flightChallenges.work.wind).toEqual(before.flightChallenges.work.wind);
  expect(saved.inquiry).toEqual(before.inquiry); expect(saved.flightInvestigation).toEqual(before.flightInvestigation);
  expect(saved.flightStudyObservations).toEqual(before.flightStudyObservations);
  await page.setViewportSize({ width: 320, height: 1000 }); await check.focus();
  const focus = await check.evaluate(node => { const r = node.getBoundingClientRect(), s = getComputedStyle(node); return {
    left: r.left, right: r.right, viewport: innerWidth, outline: s.outlineStyle, outlineWidth: s.outlineWidth,
    scrollWidth: document.documentElement.scrollWidth
  }; });
  expect(focus.left).toBeGreaterThanOrEqual(0); expect(focus.right).toBeLessThanOrEqual(focus.viewport + 1);
  expect(focus.scrollWidth).toBeLessThanOrEqual(focus.viewport + 1); expect(focus.outline).toBe('solid');
  expect(parseFloat(focus.outlineWidth)).toBeGreaterThanOrEqual(2);
  const audit = await scan(page);
  await challenge.locator('.migration-mission-actions').screenshot({ path: join(report, 'challenge-local-feedback-mobile.png') });
  writeFileSync(join(report, 'challenge-action-confirmation-proof.json'), JSON.stringify({ hash, before, final: await data(page), focus, audit }, null, 2));
});
