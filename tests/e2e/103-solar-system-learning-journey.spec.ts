import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 1060,
  height: 1600,
  appStyles: true,
  layout: 'document',
});

test.describe.configure({ timeout: 120000, retries: 0 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function mountJourney(page: Page, width: number, dark: boolean, patch: Record<string, unknown>) {
  await page.setViewportSize({ width, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${harness.url}/__harness`);
  await page.waitForFunction(() => Boolean((window as any).StemLab?._registry?.solarSystem));
  await page.locator('#wrap').evaluate((wrap, containerWidth) => {
    (wrap as HTMLElement).style.width = `${containerWidth}px`;
  }, width);
  await page.evaluate((data) => (window as any).__mount({ solarSystem: data }), {
    tutorialDismissed: true,
    solarMissionDashboardOpen: false,
    orreryMode: true,
    orr_tab: 0,
    orr_sel: 'mercury',
    orr_mission_idx: 1,
    orr_paused: true,
    orr_time: 0,
    orr_zoom: 'inner',
    isDark: dark,
    missionLog: [],
    orr_snapshots: {},
    ...patch,
  });
  await expect(page.locator('#orrery-guided-mission')).toBeVisible();
}

async function updateState(page: Page, patch: Record<string, unknown>) {
  await page.evaluate((next) => (window as any).__ctx.updateMulti('solarSystem', next), patch);
}

async function investigationState(page: Page) {
  return page.evaluate(() => {
    const data = (window as any).__toolData.solarSystem;
    return {
      time: data.orr_time,
      selected: data.orr_sel,
      comparison: data.orr_compare,
      paused: data.orr_paused,
      zoom: data.orr_zoom,
      follow: data.orr_follow,
      focus: data.orr_focus_body,
      focusRequest: data.orr_focus_request,
      snapshots: data.orr_snapshots,
      progress: data.orr_mission_progress,
      missionLog: data.missionLog,
      journal: data.journalEntries,
    };
  });
}

const incompleteStore = {
  mercury: {
    a: { bodyId: 'mercury', bodyName: 'Mercury', time: 0, speed: 59, phase: 'Near perihelion' },
    b: { bodyId: 'mercury', bodyName: 'Mercury', time: 0.12, distance: 0.467, phase: 'Near aphelion' },
    prediction: 'slower',
    predictionResult: { choice: 'slower', actual: 'slower', correct: true, speedDelta: -20, distanceDelta: 0.16 },
    observationLogged: false,
  },
};

test('unfinished guided missions remain reachable without disturbing the investigation on a phone', async ({ page }) => {
  await mountJourney(page, 320, false, {
    orr_sel: 'mars',
    orr_compare: 'earth',
    orr_mission_idx: 2,
    orr_time: 0.37,
    orr_mission_progress: {
      mercury_speed: { started: true, choice: 'peri', correct: true, detail: 'Saved Mercury explanation.' },
      longer_year: { started: true },
    },
    orr_snapshots: incompleteStore,
    missionLog: [{ time: 'Earlier', text: 'Keep my previous observation.' }],
  });
  const guide = page.locator('#orrery-guided-mission');
  await guide.getByRole('button', { name: 'Mars for Longer year', exact: true }).click();
  await expect(guide).toContainText('2/3 complete');
  await expect(guide).not.toContainText('All guided missions complete');
  const completed = await investigationState(page);
  expect(completed.progress.longer_year.correct).toBe(true);
  expect(completed.progress.earth_distance).toBeUndefined();

  await guide.getByRole('button', { name: 'Continue unfinished mission', exact: true }).click();
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_idx)).toBe(0);
  await expect(guide.getByRole('heading', { level: 3 })).toContainText('Earth live orbit');
  await expect(guide.getByRole('button', { name: 'Focus Earth and pause', exact: true })).toBeVisible();
  expect(await investigationState(page)).toEqual(completed);

  const roadmap = guide.getByRole('list', { name: 'Guided mission progress', exact: true });
  const titles = ['Earth live orbit', 'Mercury speed zone', 'Longer year'];
  await expect(roadmap.getByRole('button')).toHaveCount(3);
  for (const index of [1, 2, 0]) {
    const button = roadmap.getByRole('button', { name: `Open mission: ${titles[index]}`, exact: true });
    await button.focus();
    await button.press(index === 2 ? 'Space' : 'Enter');
    await expect(button).toBeFocused();
    await expect(roadmap.getByRole('listitem').nth(index)).toHaveAttribute('aria-current', 'step');
    await expect(guide.getByRole('heading', { level: 3 })).toContainText(titles[index]);
    expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_idx)).toBe(index);
    expect(await investigationState(page)).toEqual(completed);
    const rect = await button.boundingBox();
    expect(rect?.height).toBeGreaterThanOrEqual(43.5);
    expect(rect?.width).toBeGreaterThanOrEqual(43.5);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('restored incomplete and wrong-world evidence cannot become a supported observation', async ({ page }) => {
  await mountJourney(page, 1060, true, { orr_snapshots: incompleteStore });
  const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
  await expect(evidence.locator('.orr-evidence-snapshot')).toHaveCount(2);
  for (const slot of ['a', 'b']) {
    await expect(evidence.locator(`.orr-evidence-snapshot[data-snapshot="${slot}"]`)).toContainText('Incomplete');
  }
  const quality = page.locator('#orrery-evidence-quality');
  await expect(quality).toContainText(/Recapture A/i);
  await expect(quality).toContainText(/Recapture B/i);
  await expect(evidence.locator('.orr-evidence-result')).toHaveCount(0);
  await expect(evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true })).toHaveCount(0);
  await expect(evidence).not.toContainText(/NaN|undefined|Infinity/);
  const table = evidence.getByRole('table', { name: 'Orbital evidence change from snapshot A to B for Mercury', exact: true });
  const distance = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Distance', exact: true }) });
  const speed = table.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Orbital speed', exact: true }) });
  await expect(distance.getByRole('cell').nth(0)).toHaveText('Not recorded');
  await expect(distance.getByRole('cell').nth(2)).toHaveText('Unavailable');
  await expect(speed.getByRole('cell').nth(1)).toHaveText('Not recorded');
  await expect(speed.getByRole('cell').nth(2)).toHaveText('Unavailable');
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(incompleteStore);
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual([]);

  const exportButton = evidence.getByRole('button', { name: 'Export orbital evidence for Mercury', exact: true });
  await expect(exportButton).toBeEnabled();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    exportButton.click(),
  ]);
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  let exported = '';
  for await (const chunk of stream!) exported += chunk.toString();
  expect(exported).toContain('Not recorded');
  expect(exported).toContain('Unavailable');
  expect(exported).not.toMatch(/NaN|undefined|Infinity|Prediction supported/);
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(incompleteStore);
  const exportLog = await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog);
  expect(exportLog).toHaveLength(1);
  expect(exportLog[0].text).toContain('Exported orbital evidence');

  const wrongWorldStore = {
    mercury: {
      a: { bodyId: 'earth', bodyName: 'Earth', time: 0, distance: 0.983, speed: 30.3, phase: 'Near perihelion' },
      b: { bodyId: 'mercury', bodyName: 'Mercury', time: 0.12, distance: 0.467, speed: 38.9, phase: 'Near aphelion' },
      prediction: 'faster',
      predictionResult: { choice: 'faster', actual: 'faster', correct: true, speedDelta: 8.6, distanceDelta: -0.516 },
      observationLogged: false,
    },
  };
  await updateState(page, { orr_snapshots: wrongWorldStore });
  await expect(quality).toContainText(/Recapture A/i);
  await expect(evidence.locator('.orr-evidence-result')).toHaveCount(0);
  await expect(evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots)).toEqual(wrongWorldStore);
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual(exportLog);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});

test('explicit recapture repairs saved evidence and routes to paused orbit controls without changing it', async ({ page }) => {
  const earthEvidence = {
    a: { bodyId: 'earth', bodyName: 'Earth', time: 0, distance: 0.983, speed: 30.3, phase: 'Near perihelion' },
  };
  await mountJourney(page, 320, true, {
    orr_snapshots: { ...incompleteStore, earth: earthEvidence },
    orr_mission_progress: { mercury_speed: { started: true } },
    missionLog: [{ time: 'Earlier', text: 'Preserve my earlier work.' }],
  });
  const evidence = page.getByRole('region', { name: 'A/B orbital evidence for Mercury', exact: true });
  await evidence.getByRole('button', { name: 'Save orbital snapshot A for Mercury', exact: true }).click();
  const afterA = await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots);
  expect(afterA.earth).toEqual(earthEvidence);
  expect(afterA.mercury.a.bodyId).toBe('mercury');
  for (const field of ['time', 'distance', 'speed']) expect(Number.isFinite(afterA.mercury.a[field])).toBe(true);
  expect(afterA.mercury.b).toBeNull();
  expect(afterA.mercury.prediction).toBe('');
  expect(afterA.mercury.predictionResult).toBeNull();
  await evidence.getByRole('combobox', { name: 'Predict B: will orbital speed be faster, slower, or about the same as A?', exact: true }).selectOption('slower');
  await expect(evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true })).toBeEnabled();

  const showControls = evidence.getByRole('button', { name: 'Show orbit controls', exact: true });
  const phase = page.locator('#orrery-phase-scrubber');
  const beforePausedRoute = await investigationState(page);
  await showControls.click();
  await expect(phase).toBeFocused();
  expect(await investigationState(page)).toEqual(beforePausedRoute);

  // The running clock advances until the action pauses it. Its persisted time
  // catches up to the live position; routing must preserve all other evidence.
  await updateState(page, { orr_paused: false });
  const beforeRoute = await investigationState(page);
  expect(beforeRoute.paused).toBe(false);
  await showControls.click();
  await expect(phase).toBeFocused();
  await expect(phase).toBeVisible();
  const afterRoute = await investigationState(page);
  expect(afterRoute.time).toBeGreaterThanOrEqual(beforeRoute.time);
  expect(afterRoute).toEqual({ ...beforeRoute, paused: true, time: afterRoute.time });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect((await investigationState(page)).time).toBe(afterRoute.time);

  await page.locator('#orrery-timeline-jump-2').click();
  await evidence.getByRole('button', { name: 'Save orbital snapshot B for Mercury', exact: true }).click();
  await expect(evidence.locator('.orr-evidence-result')).toHaveAttribute('data-supported', 'true');
  await expect(evidence).toContainText('Prediction supported');
  await expect(evidence).not.toContainText(/NaN|undefined|Infinity/);
  const repaired = await page.evaluate(() => (window as any).__toolData.solarSystem.orr_snapshots);
  expect(repaired.earth).toEqual(earthEvidence);
  expect(repaired.mercury.a).toEqual(afterA.mercury.a);
  expect(repaired.mercury.b.bodyId).toBe('mercury');
  expect(repaired.mercury.b.distance).toBeGreaterThan(repaired.mercury.a.distance);
  expect(repaired.mercury.b.speed).toBeLessThan(repaired.mercury.a.speed);
  await evidence.getByRole('button', { name: 'Record orbital speed observation for Mercury', exact: true }).click();
  const recorded = evidence.getByRole('button', { name: 'Observation already recorded for Mercury', exact: true });
  await expect(recorded).toBeDisabled();
  const savedLog = await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog);
  expect(savedLog).toHaveLength(2);
  expect(savedLog.some((entry: any) => entry.text === 'Preserve my earlier work.')).toBe(true);
  expect(savedLog.filter((entry: any) => entry.text.includes('Orrery observation: Mercury'))).toHaveLength(1);
  await updateState(page, { orr_zoom: 'full' });
  await expect(recorded).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__toolData.solarSystem.missionLog)).toEqual(savedLog);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  expect(await page.evaluate(() => (window as any).__events.errors)).toEqual([]);
});
