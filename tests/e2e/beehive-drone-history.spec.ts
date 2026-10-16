import { test, expect, Page, Locator } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({ toolFile: 'stem_lab/stem_tool_beehive.js', toolId: 'beehive',
  preScripts: ['stem_lab/stem_lab_module.js'], extraScripts: ['node_modules/axe-core/axe.min.js'],
  appStyles: true, layout: 'document', width: 1100, height: 1800, probes: 'window.__testHooks={};' });
const artifacts = path.resolve(process.env.BEE_DRONE_HISTORY_ARTIFACTS || '.codex-artifacts/bee-drone-history-2026-10-15');

test.describe.configure({ timeout: 480000, retries: 0 });
test.use({ viewport: { width: 1100, height: 1800 }, reducedMotion: 'reduce', video: 'off', trace: 'off' });
test.beforeAll(async () => { fs.mkdirSync(artifacts, { recursive: true }); await harness.start(); });
test.afterAll(() => harness.stop());
test.afterEach(async ({ page }, info) => { if (info.error) console.error(info.error.message); await harness.destroy(page); });

type Entry = { turn?: number; action?: string; seconds?: number; altitudeBefore?: number; altitude?: number;
  energyBefore?: number; energy?: number; rangeBefore?: number; range?: number; targetBefore?: string; target?: string;
  [key: string]: unknown };
const field = (page: Page) => page.locator('#beehive-drone-playfield');
const planner = (page: Page) => page.locator('[data-flight-decision-panel]');
const history = (page: Page) => page.locator('[data-flight-history]:visible');
const selected = (page: Page) => history(page).locator('[data-flight-history-comparison]');
const chooser = (page: Page) => history(page).locator('[data-history-select]');
const previous = (page: Page) => history(page).locator('[data-history-previous]');
const next = (page: Page) => history(page).locator('[data-history-next]');
const latest = (page: Page) => history(page).locator('[data-history-latest]');
const position = (page: Page) => history(page).locator('[data-history-position]');
const announcement = (page: Page) => history(page).locator('[data-history-announcement]');

async function settle(page: Page) {
  await page.evaluate(async () => { await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}
async function keyboard(page: Page, control: Locator, key = 'Enter') {
  await control.focus(); await expect(control).toBeFocused(); await page.keyboard.press(key); await settle(page);
}
async function mount(page: Page) {
  await page.addInitScript(() => { (window as any).__RR_TEST_EXPORTS__ = {}; });
  await page.goto(harness.url + '/__harness', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const w = window as any, BH = w.__RR_TEST_EXPORTS__.beehive;
    w.StemLab.ensureThree = () => Promise.reject(new Error('History tests exercise the supported graphics fallback'));
    w.ReactDOM.flushSync(() => w.__mount({ beehive: {
      ...BH.bhCreateNewColonyState(777, 2, 0), viewMode: 'drone', tutorialDone: true,
      soundOn: false, motionPaused: true, autoAdvance: false, focusLayout: true,
      day: 0, workers: 30000, honey: 80, queenHealth: 100, morale: 90, varroaLevel: 2,
      actionPoints: 2, activeEvent: null, missionBriefOpen: false, journeyOpen: false,
      notebookOpen: false, showBadges: false,
      drone: { active: false, pacing: 'steps', scenario: 'clear', routePlan: 'balanced', courseSeed: 20260908,
        graphicsMode: 'eco', cameraMode: 'cockpit', custom: { retained: 'Flight metadata.' } },
      notebook: { drone: { prediction: 'Keep my prediction.', evidence: 'Keep my evidence.', explanation: 'Keep my explanation.' },
        beekeeper: { evidence: 'Keep colony evidence.' }, synthesis: 'Keep my synthesis.', custom: { retained: 'Notebook metadata.' } },
      journal: [{ day: 0, text: 'Keep my recorded observation.' }], custom: { retained: 'Colony metadata.' },
    }, otherTool: { retained: true } }));
    Object.assign(document.getElementById('wrap')!.style, { width: '100%', height: 'auto', display: 'block' });
  });
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await keyboard(page, page.locator('[data-flight-launch="easy"]'));
  await expect(page.locator('[data-beehive-drone-canvas]')).toHaveAttribute('data-flight-renderer', 'canvas-2d-fallback');
  await expect(field(page)).toHaveAttribute('data-flight-state', 'paused');
  await page.evaluate(() => { const w = window as any;
    w.__historyCanvas = document.querySelector('[data-beehive-drone-canvas]');
    w.__historyState = w.__testHooks.beehive.droneStateRef.current;
  });
}
async function flight(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__testHooks.beehive.droneStateRef.current || {}, result: Record<string, any> = {};
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 'pitch', 'roll', 'speed', 'energy', 'timer', 'phase', 'paused', 'pacing',
      'difficulty', 'score', 'distance', 'maxAlt', 'randomState', 'simulationClock', 'decisionCount', 'decisionLog', 'telemetry',
      'reachedLaunch', 'reachedDca', 'reachedQueen', 'navigationAssists', 'nearQueens']) result[key] = state[key];
    return JSON.parse(JSON.stringify(result));
  });
}
async function savedWork(page: Page, omitFlight = false) {
  return page.evaluate(omitFlight => {
    const result = JSON.parse(JSON.stringify((window as any).__toolData));
    if (omitFlight) delete result.beehive.drone;
    return result;
  }, omitFlight);
}
async function identity(page: Page) {
  expect(await page.evaluate(() => { const w = window as any;
    return w.__historyCanvas === document.querySelector('[data-beehive-drone-canvas]') &&
      w.__historyState === w.__testHooks.beehive.droneStateRef.current;
  })).toBe(true);
}
async function maneuver(page: Page, id: string) {
  const before = await flight(page);
  await keyboard(page, planner(page).locator('input[name="bee-flight-decision"][value="' + id + '"]'), 'Space');
  expect(await flight(page)).toEqual(before);
  await keyboard(page, planner(page).locator('[data-flight-advance-decision]'));
  const after = await flight(page);
  expect(after.decisionCount).toBe((before.decisionCount || 0) + 1); expect(after.paused).toBe(true);
  return after.decisionLog.at(-1) as Entry;
}
async function openPlannerHistory(page: Page) {
  const summary = planner(page).getByText('Read maneuver evidence', { exact: true });
  const details = summary.locator('..'); await expect(details).not.toHaveAttribute('open', '');
  await keyboard(page, summary, 'Space'); await expect(details).toHaveAttribute('open', '');
  await expect(summary).toBeFocused(); await expect(history(page)).toBeVisible();
}
async function openReviewHistory(page: Page) {
  const disclosure = page.locator('[data-flight-history-disclosure]:visible');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await expect(disclosure.locator('summary').first()).toHaveText('Explore recorded maneuvers');
  await keyboard(page, disclosure.locator('summary').first(), 'Space');
  await expect(disclosure).toHaveAttribute('open', ''); await expect(history(page)).toBeVisible();
}
async function assertRecord(page: Page, index: number, count: number, entry: Entry) {
  await expect(history(page)).toHaveCount(1);
  await expect(history(page)).toHaveAttribute('role', 'region');
  await expect(history(page)).toHaveAttribute('aria-label', 'Recorded maneuver history');
  await expect(chooser(page)).toHaveAccessibleName('Choose a record');
  await expect(chooser(page)).toHaveValue(String(index));
  await expect(chooser(page).locator('option')).toHaveCount(count);
  await expect(position(page).locator('strong')).toHaveText('Record ' + (index + 1) + ' of ' + count + ' retained');
  await expect(position(page).locator('span')).toHaveText(index === count - 1 ? 'Latest record' : 'Earlier record');
  await expect(position(page)).toHaveAttribute('aria-live', 'off');
  await expect(announcement(page)).toHaveAttribute('role', 'status');
  await expect(announcement(page)).toHaveAttribute('aria-atomic', 'true');
  await expect(selected(page)).toHaveAttribute('aria-label', 'Selected maneuver comparison');
  await expect(selected(page).locator('h4').first()).toHaveText('Selected maneuver');
  await expect(selected(page)).not.toHaveAttribute('data-flight-maneuver-evidence', 'true');
  await expect(page.locator('[data-flight-maneuver-evidence]:visible')).toHaveCount(1);
  const title = (Number.isInteger(entry.turn) && entry.turn! > 0 ? 'Maneuver ' + entry.turn : 'Recorded maneuver') + (entry.action ? ' · ' + entry.action : '');
  await expect(selected(page).locator('[data-maneuver-title]')).toHaveText(title);
  for (const [key, before, after, unit] of [['altitude', entry.altitudeBefore, entry.altitude, ' model ft'],
    ['energy', entry.energyBefore, entry.energy, '%'], ['range', entry.rangeBefore, entry.range, ' model m']] as const) {
    const card = selected(page).locator('[data-maneuver-metric="' + key + '"]');
    for (const [which, value, target] of [['before', before, entry.targetBefore], ['after', after, entry.target]] as const) {
      const reading = card.locator('[data-maneuver-' + which + ']');
      if (typeof value === 'number' && Number.isFinite(value)) {
        await expect(reading).toContainText(Math.round(value) + unit);
        if (key === 'range' && target) await expect(reading).toContainText(target);
      } else await expect(reading).toContainText(/not recorded/i);
    }
  }
  const panelId = await selected(page).locator('..').getAttribute('id');
  expect(panelId).toBeTruthy();
  for (const control of [chooser(page), previous(page), next(page), latest(page)]) await expect(control).toHaveAttribute('aria-controls', panelId!);
  await expect(previous(page)).toHaveAttribute('aria-disabled', String(index === 0));
  await expect(next(page)).toHaveAttribute('aria-disabled', String(index === count - 1));
  await expect(latest(page)).toHaveAttribute('aria-disabled', String(index === count - 1 && await history(page).locator('[data-history-notice]').count() === 0));
}
async function cardText(page: Page) {
  return selected(page).innerText();
}

test('Recorded maneuver history is keyboard accessible, passive, and equivalent in the flight planner and saved review', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const colony = await savedWork(page, true);
  const entries = [await maneuver(page, 'climb'), await maneuver(page, 'coast'), await maneuver(page, 'navigate')];
  const held = await flight(page), saved = await savedWork(page);
  await openPlannerHistory(page); await assertRecord(page, 2, 3, entries[2]);
  await expect(announcement(page)).toHaveText('');
  await keyboard(page, next(page)); await expect(next(page)).toBeFocused(); await assertRecord(page, 2, 3, entries[2]);
  await keyboard(page, previous(page)); await expect(previous(page)).toBeFocused(); await assertRecord(page, 1, 3, entries[1]);
  await expect(announcement(page)).toContainText('Record 2 of 3');
  await keyboard(page, previous(page)); await expect(previous(page)).toBeFocused(); await assertRecord(page, 0, 3, entries[0]);
  const firstText = await cardText(page);
  await keyboard(page, previous(page)); await expect(previous(page)).toBeFocused(); await assertRecord(page, 0, 3, entries[0]);
  await keyboard(page, chooser(page), 'ArrowDown'); await expect(chooser(page)).toBeFocused(); await assertRecord(page, 1, 3, entries[1]);
  await keyboard(page, latest(page)); await expect(latest(page)).toBeFocused(); await assertRecord(page, 2, 3, entries[2]);
  await keyboard(page, latest(page)); await expect(latest(page)).toBeFocused();
  const table = history(page).locator('[data-history-table]');
  await expect(table).not.toHaveAttribute('open', '');
  await expect(table.locator('summary')).toHaveText('Full evidence table');
  await keyboard(page, table.locator('summary'), 'Space'); await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(table.locator('tbody tr').first()).toContainText(entries[0].action!);
  await keyboard(page, table.locator('summary')); await expect(table).not.toHaveAttribute('open', '');
  expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);

  await keyboard(page, planner(page).getByRole('button', { name: 'Record flight and debrief', exact: true }));
  await expect(page.locator('[data-flight-decision-debrief]')).toBeFocused();
  const recorded = (await savedWork(page)).beehive.drone.lastRun;
  expect(recorded.decisionLog).toEqual(entries);
  await openReviewHistory(page); await assertRecord(page, 2, 3, entries[2]);
  const debriefSaved = await savedWork(page), debriefHeld = await flight(page);
  await keyboard(page, chooser(page), 'Home'); await assertRecord(page, 0, 3, entries[0]);
  expect(await cardText(page)).toBe(firstText);
  expect(await savedWork(page)).toEqual(debriefSaved); expect(await flight(page)).toEqual(debriefHeld);
  await keyboard(page, field(page).locator('[data-flight-command-header] [data-flight-end]'));
  await expect(field(page)).toHaveAttribute('data-beehive-stage', 'drone-briefing');
  await keyboard(page, page.locator('[data-drone-saved-review-toggle]'));
  await openReviewHistory(page); await assertRecord(page, 2, 3, entries[2]);
  const reviewSaved = await savedWork(page), reviewHeld = await flight(page);
  await keyboard(page, chooser(page), 'Home'); await assertRecord(page, 0, 3, entries[0]);
  expect(await cardText(page)).toBe(firstText);
  await keyboard(page, next(page)); await expect(next(page)).toBeFocused(); await assertRecord(page, 1, 3, entries[1]);
  expect(await savedWork(page)).toEqual(reviewSaved); expect(await flight(page)).toEqual(reviewHeld);
  expect((await savedWork(page)).beehive.drone.lastRun).toEqual(recorded);
  expect(await savedWork(page, true)).toEqual(colony);
  fs.writeFileSync(path.join(artifacts, 'history-actual-flight.json'), JSON.stringify({ entries, recorded, firstText }, null, 2));
  expect(errors).toEqual([]);
});

test('History preserves the chosen record across appends and trimming, handles duplicate turns, and resets replaced sources safely', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  const entries: Entry[] = [
    { turn: 7, action: 'Earlier duplicate turn', seconds: 1, altitudeBefore: 0, altitude: 9, energyBefore: 100, energy: 99,
      rangeBefore: 600, range: 590, targetBefore: 'DCA', target: 'DCA', custom: { retained: 'A' } },
    { turn: 7, action: 'Later duplicate turn', seconds: 2, altitudeBefore: 9, altitude: 10, energyBefore: 99, energy: 98,
      rangeBefore: 73, range: 200, targetBefore: 'DCA', target: 'Queen cue', custom: { retained: 'B' } },
    { action: 'Legacy readings without a turn', altitude: 0, energyBefore: 0, energy: 0, rangeBefore: 17, range: 12,
      target: 'Queen cue', custom: { retained: 'C' } },
  ];
  await page.evaluate(entries => { const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.decisionLog = entries; w.__historyFixtureEntries = entries; w.ReactDOM.flushSync(() => w.__rerender());
  }, entries);
  await openPlannerHistory(page); await assertRecord(page, 2, 3, entries[2]);
  await expect(selected(page).locator('[data-maneuver-metric="range"]')).toHaveAttribute('data-maneuver-trend', 'unknown');
  await expect(selected(page).locator('[data-maneuver-range-note]')).toContainText(/not recorded|unknown/i);
  await expect(selected(page).locator('[data-maneuver-metric="energy"] [data-maneuver-change]')).toHaveText('No rounded change');
  await keyboard(page, chooser(page), 'Home'); await assertRecord(page, 0, 3, entries[0]);
  const silent = await announcement(page).textContent();
  const appended: Entry = { turn: 8, action: 'Appended maneuver', seconds: 1, altitudeBefore: 10, altitude: 12,
    energyBefore: 98, energy: 97, rangeBefore: 200, range: 180, targetBefore: 'Queen cue', target: 'Queen cue' };
  await page.evaluate(entry => { const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.decisionLog = state.decisionLog.concat([entry]); w.ReactDOM.flushSync(() => w.__rerender());
  }, appended);
  await assertRecord(page, 0, 4, entries[0]); expect(await announcement(page).textContent()).toBe(silent);
  await page.evaluate(() => { const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.decisionLog.push({ ...state.decisionLog[3], turn: 9, action: 'In-place appended maneuver' });
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  await assertRecord(page, 0, 5, entries[0]); expect(await announcement(page).textContent()).toBe(silent);
  await keyboard(page, next(page)); await assertRecord(page, 1, 5, entries[1]);
  await page.evaluate(() => { const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.decisionLog = state.decisionLog.slice(1); w.ReactDOM.flushSync(() => w.__rerender());
  });
  await assertRecord(page, 0, 4, entries[1]);
  await page.evaluate(() => { const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.decisionLog = state.decisionLog.slice(1); w.ReactDOM.flushSync(() => w.__rerender());
  });
  const newest = { ...appended, turn: 9, action: 'In-place appended maneuver' };
  await assertRecord(page, 2, 3, newest);
  await expect(history(page).locator('[data-history-notice]')).toBeVisible();
  await expect(history(page).locator('[data-history-notice]')).toContainText(/no longer|retained|available/i);
  await keyboard(page, previous(page)); await keyboard(page, latest(page));
  await page.evaluate(() => { const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.decisionLog.push({ ...state.decisionLog[2], turn: 10, action: 'Latest follows new records' });
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  await assertRecord(page, 3, 4, { ...newest, turn: 10, action: 'Latest follows new records' });

  // Repeated turn numbers and even repeated object references must not silently
  // move a selection to a different occurrence after the log changes shape.
  await page.evaluate(() => { const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    const shared = w.__historyFixtureEntries[0]; state.decisionLog = [shared, shared, w.__historyFixtureEntries[2]];
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  await keyboard(page, chooser(page), 'Home'); await keyboard(page, chooser(page), 'ArrowDown');
  await assertRecord(page, 1, 3, entries[0]);
  await page.evaluate(() => { const w = window as any; w.ReactDOM.flushSync(() => w.__rerender()); });
  await assertRecord(page, 1, 3, entries[0]);
  await page.evaluate(() => { const w = window as any, state = w.__testHooks.beehive.droneStateRef.current;
    state.decisionLog = state.decisionLog.slice(); w.ReactDOM.flushSync(() => w.__rerender());
  });
  await assertRecord(page, 2, 3, entries[2]);
  await expect(history(page).locator('[data-history-notice]')).toBeVisible();
  await keyboard(page, chooser(page), 'Home');
  await page.evaluate(() => { const w = window as any, ref = w.__testHooks.beehive.droneStateRef;
    ref.current = { ...ref.current, decisionLog: [w.__historyFixtureEntries[0], w.__historyFixtureEntries[1]], paused: true };
    w.ReactDOM.flushSync(() => w.__rerender());
  });
  await assertRecord(page, 1, 2, entries[1]);
  const held = await flight(page), saved = await savedWork(page);
  await keyboard(page, previous(page)); await assertRecord(page, 0, 2, entries[0]);
  await keyboard(page, next(page)); await assertRecord(page, 1, 2, entries[1]);
  expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved);
  expect(errors).toEqual([]);
});

async function audit(page: Page, mode: string) {
  const result = await history(page).evaluate(async node => {
    const box = node.getBoundingClientRect(), rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const visible = Array.from(node.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect();
      if (!(el instanceof HTMLElement) || el.matches('option, optgroup') || rect.width <= 0 || rect.height <= 0) return false;
      let ancestor: HTMLElement | null = el;
      while (ancestor && ancestor !== node.parentElement) {
        const css = getComputedStyle(ancestor);
        if (css.display === 'none' || css.visibility === 'hidden' || css.clip === 'rect(0px, 0px, 0px, 0px)') return false;
        if (ancestor instanceof HTMLDetailsElement && !ancestor.open && !ancestor.querySelector('summary')?.contains(el)) return false;
        ancestor = ancestor.parentElement;
      }
      return true;
    });
    const text: { value: string; font: number; clipped: boolean; ellipsis: boolean }[] = [];
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); let value: Node | null;
    while ((value = walker.nextNode())) {
      if (!value.textContent?.trim() || !value.parentElement || !visible.includes(value.parentElement)) continue;
      const range = document.createRange(); range.selectNodeContents(value); const css = getComputedStyle(value.parentElement);
      const bound = (value.parentElement.closest('[data-maneuver-metric]') || node).getBoundingClientRect();
      text.push({ value: value.textContent.trim(), font: parseFloat(css.fontSize) / rootFont, ellipsis: css.textOverflow === 'ellipsis',
        clipped: Array.from(range.getClientRects()).some(r => r.width > 0 && (r.left < bound.left - 1 || r.right > bound.right + 1 || r.top < bound.top - 1 || r.bottom > bound.bottom + 1)) });
    }
    const cards = Array.from(node.querySelectorAll('[data-maneuver-metric]'));
    const overlaps: string[] = [];
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i].getBoundingClientRect(), b = cards[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1)
        overlaps.push(cards[i].getAttribute('data-maneuver-metric') + '/' + cards[j].getAttribute('data-maneuver-metric'));
    }
    const controls = Array.from(node.querySelectorAll('button, select, summary')).filter(el => visible.includes(el));
    const axe = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }, rules: { region: { enabled: false } } });
    return { rootFont, text, overlaps,
      controlSizes: controls.map(el => ({ name: el.getAttribute('aria-label') || el.textContent, height: el.getBoundingClientRect().height })),
      violations: axe.violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => ({ target: n.target, reason: n.failureSummary })) })),
      overflow: visible.filter(el => el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, extra: el.scrollWidth - el.clientWidth })),
      outside: visible.filter(el => { const r = el.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1; }).map(el => el.textContent),
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  fs.writeFileSync(path.join(artifacts, 'history-layout-' + mode + '.json'), JSON.stringify(result, null, 2));
  expect(result.violations).toEqual([]); expect(result.overflow).toEqual([]); expect(result.outside).toEqual([]); expect(result.overlaps).toEqual([]);
  expect(result.pageOverflow).toBeLessThanOrEqual(1); expect(result.text.length).toBeGreaterThanOrEqual(18);
  if (mode === '200-percent-text') expect(result.rootFont).toBe(32);
  for (const item of result.text) { expect(item.font, item.value).toBeGreaterThanOrEqual(.875); expect(item.clipped, item.value).toBe(false); expect(item.ellipsis, item.value).toBe(false); }
  for (const item of result.controlSizes) expect(item.height, item.name || '').toBeGreaterThanOrEqual(43);
}

test('History controls and selected measurements stay clear across seven accessible layouts without advancing the flight', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page); const entries = [await maneuver(page, 'climb'), await maneuver(page, 'coast'), await maneuver(page, 'navigate')];
  await openPlannerHistory(page); await keyboard(page, previous(page)); await assertRecord(page, 1, 3, entries[1]);
  const held = await flight(page), saved = await savedWork(page), text = await cardText(page);
  for (const mode of ['wide', 'medium', 'phone', '200-percent-text', 'dark', 'forced', 'forced-dark']) {
    await page.setViewportSize({ width: mode === 'wide' ? 1440 : mode === 'medium' ? 1100 : 320, height: 1800 });
    await page.emulateMedia({ forcedColors: mode.startsWith('forced') ? 'active' : 'none' });
    await page.evaluate(mode => { const w = window as any;
      w.__ctx.isDark = mode === 'dark' || mode === 'forced-dark';
      document.documentElement.style.fontSize = mode === '200-percent-text' ? '32px' : '';
      w.ReactDOM.flushSync(() => w.__rerender());
    }, mode);
    await chooser(page).focus(); await expect(chooser(page)).toBeFocused(); await settle(page);
    const nativeControl = await chooser(page).evaluate(node => {
      const css = getComputedStyle(node);
      return { appearance: css.appearance, backgroundImage: css.backgroundImage, colorScheme: css.colorScheme };
    });
    expect(nativeControl.appearance, mode).toBe('auto'); expect(nativeControl.backgroundImage, mode).toBe('none');
    // Forced colors lets the browser select the user's system palette.
    if (!mode.startsWith('forced')) expect(nativeControl.colorScheme, mode).toBe(mode === 'dark' ? 'dark' : 'light');
    await assertRecord(page, 1, 3, entries[1]); await audit(page, mode); expect(await cardText(page)).toBe(text);
    await history(page).screenshot({ path: path.join(artifacts, 'preview-drone-history-' + mode + '.png'), animations: 'disabled', timeout: 120000 });
    expect(await flight(page)).toEqual(held); expect(await savedWork(page)).toEqual(saved); await identity(page);
  }
  expect(errors).toEqual([]);
});
