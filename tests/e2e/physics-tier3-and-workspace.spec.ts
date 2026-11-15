import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js',
  toolId: 'physics',
  width: 1000,
  height: 900,
  layout: 'document',
  appStyles: true,
});

test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

async function mount(page: Page, gradeLevel = '6th Grade') {
  await page.addInitScript(() => {
    let id = 0;
    let now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = (cb) => {
      frames.set(++id, cb);
      return id;
    };
    window.cancelAnimationFrame = (key) => {
      frames.delete(key);
    };
    (window as any).__tick = (ms: number) => {
      now += ms;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((fn) => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate((g) => {
    (window as any).__ctx.gradeLevel = g;
    (window as any).__ctx.setStemLabTool = (id: string) => {
      (window as any).__switchedTool = id;
    };
    (window as any).__rerender();
  }, gradeLevel);
}

async function setState(page: Page, patch: object) {
  await page.evaluate((p) => {
    (window as any).__ctx.setToolData((prev: any) => ({
      ...prev,
      physics: { ...prev.physics, ...p },
    }));
  }, patch);
  await page.waitForTimeout(60);
}

async function launchAndLand(page: Page) {
  await page.getByRole('button', { name: 'Launch!' }).click();
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let count = 0;
    while (cv._launched && count++ < 20000) (window as any).__tick(1000 / 60);
  });
  await page.waitForTimeout(80);
}

test('workspace tabs, learner bands, pre-launch range graph, drag profiles explorer, and interactive Quiz workflow', async ({ page }) => {
  await mount(page, '6th Grade');

  // Default tab is Missions
  await expect(page.locator('[data-physics-learning-panel="mission"]')).toBeVisible();
  await expect(page.locator('[data-physics-learning-panel="obstacles"]')).toBeVisible();
  await expect(page.locator('[data-physics-learning-panel="battle"]')).toBeVisible();
  await expect(page.locator('[data-physics-learning-panel="quiz"]')).toHaveCount(0);

  // Switch to Analyze tab with graphs enabled before any projectile launch: pre-launch Range card renders!
  await setState(page, { showGraphs: true });
  await page.locator('[data-physics-workspace-tab="analyze"]').click();
  await expect(page.locator('[data-physics-range-card]')).toBeVisible();
  await expect(page.locator('[data-physics-range-card] [data-physics-graph="range"]')).toBeVisible();

  // Aerodynamic Drag Profiles Explorer renders all 4 profiles in Analyze tab
  const dragPanel = page.locator('[data-physics-learning-panel="drag-profiles"]');
  await expect(dragPanel).toBeVisible();
  await dragPanel.locator('[data-physics-drag-profile="shuttlecock"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.physics.dragProfileId)).toBe('shuttlecock');

  // Switch to Learn & Quiz tab, change band picker (3-5 -> 9-12), run Quiz + Hint + Load in Simulator
  await page.locator('[data-physics-workspace-tab="learn"]').click();
  const quizPanel = page.locator('[data-physics-learning-panel="quiz"]');
  await expect(quizPanel).toBeVisible();

  await page.locator('[data-physics-band-btn="3-5"]').click();
  await expect(quizPanel).toContainText('(3-5)');
  await page.locator('[data-physics-band-btn="9-12"]').click();
  await expect(quizPanel).toContainText('(9-12)');

  await quizPanel.locator('[data-physics-quiz-topic]').selectOption('height');
  await quizPanel.locator('[data-physics-quiz-start]').click();
  await expect(quizPanel.locator('[data-physics-quiz-prompt]')).toBeVisible();
  await quizPanel.locator('[data-physics-quiz-hint]').click();
  await expect(quizPanel.locator('[data-physics-quiz-hint-text]')).toBeVisible();

  await quizPanel.locator('[data-physics-quiz-load]').click();
  const quizPreset = await page.evaluate(() => {
    const p = (window as any).__ctx.toolData.physics;
    return { active: p.quizItem?.simPreset, angle: p.angle, velocity: p.velocity, gravity: p.gravity };
  });
  expect(quizPreset.angle).toBe(quizPreset.active.angle);
  expect(quizPreset.velocity).toBe(quizPreset.active.velocity);
  expect(quizPreset.gravity).toBe(quizPreset.active.gravity);

  // Switch to All panels shows Missions + Analyze + Learn simultaneously
  await page.locator('[data-physics-workspace-tab="all"]').click();
  await expect(page.locator('[data-physics-learning-panel="mission"]')).toBeVisible();
  await expect(page.locator('[data-physics-learning-panel="drag-profiles"]')).toBeVisible();
  await expect(page.locator('[data-physics-learning-panel="quiz"]')).toBeVisible();
});

test('Challenge Leave restore, 2D Castle Wall obstacle blocked vs cleared, and Experiment Log Data Studio handoff', async ({ page }) => {
  await mount(page, '8th Grade');
  await setState(page, { angle: 34, velocity: 26, gravity: 1.6, launchHeight: 14, airResist: false, workspaceTab: 'missions' });

  // Activate Challenge Tier 3 -> verify gravity/height override -> Leave Challenge restores baseline
  const challengesPanel = page.locator('[data-physics-learning-panel="challenges"]');
  await challengesPanel.getByRole('button', { name: /200m on Mars/i }).click();
  await expect(challengesPanel.locator('[data-physics-leave-challenge]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.physics.gravity)).toBe(3.7);
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.physics.launchHeight)).toBe(0);

  await challengesPanel.locator('[data-physics-leave-challenge]').click();
  await expect(challengesPanel.locator('[data-physics-leave-challenge]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const p = (window as any).__ctx.toolData.physics;
    return { g: p.gravity, h: p.launchHeight, a: p.angle };
  })).toEqual({ g: 1.6, h: 14, a: 34 });

  // Select Castle Wall obstacle mission: wall at x=50 m (h=18 m), target 85 ± 8 m
  const obsPanel = page.locator('[data-physics-learning-panel="obstacles"]');
  await obsPanel.locator('[data-physics-obstacle="wall"]').click();
  await expect(obsPanel.locator('[data-physics-leave-obstacle]')).toBeVisible();

  // Launch 1 (blocked low shot): angle=20°, velocity=35 m/s hits wall below 18m at x=50m
  await setState(page, { angle: 20, velocity: 35 });
  await launchAndLand(page);
  await expect(obsPanel.locator('[data-physics-obstacle-feedback]')).toContainText('Blocked');

  // Launch 2 (clearing arc): angle=55°, velocity=30 m/s clears 18m wall (y≈30m at x=50) and lands ~86.3m (within 85±8m)
  await setState(page, { angle: 55, velocity: 30 });
  await launchAndLand(page);
  await expect(obsPanel.locator('[data-physics-obstacle-feedback]')).toContainText('Obstacle cleared');
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.physics.obstacleDone?.wall)).toBe(true);

  // Switch to Notebook tab -> Experiment Log renders -> Open in Data Studio handoff
  await page.locator('[data-physics-workspace-tab="notebook"]').click();
  const runLogPanel = page.locator('[data-physics-run-log]');
  await expect(runLogPanel).toBeVisible();
  await expect(runLogPanel.locator('[data-physics-download-runlog-csv]')).toBeVisible();

  await runLogPanel.locator('[data-physics-handoff-datastudio]').click();
  const handoff = await page.evaluate(() => ({
    switchedTo: (window as any).__switchedTool,
    ds: (window as any).__ctx.toolData._dataStudio,
  }));
  expect(handoff.switchedTo).toBe('dataStudio');
  expect(handoff.ds.chartType).toBe('scatter');
  expect(handoff.ds.showTrendline).toBe(true);
  expect(handoff.ds.dataRows.length).toBeGreaterThanOrEqual(2);
});

test('direct canvas manipulation, tape-measure probe, Moon+drag guard, atmosphere explorer, and bridges', async ({ page }) => {
  await mount(page, '8th Grade');

  // Render initial frames and scroll canvas fully into the viewport before pointer dragging
  await page.evaluate(() => { (window as any).__tick(16); (window as any).__tick(16); });
  await page.locator('#physicsCanvas').scrollIntoViewIfNeeded();
  const dragCoords = await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    const rect = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scaleX = rect.width / ((cv.width / dpr) || rect.width);
    const scaleY = rect.height / ((cv.height / dpr) || rect.height);
    return {
      startX: rect.left + cv._dragHandles.angle.x * scaleX,
      startY: rect.top + cv._dragHandles.angle.y * scaleY,
      endX: rect.left + (cv._launchView.x + 15) * scaleX,
      endY: rect.top + (cv._launchView.y - 55) * scaleY,
      initialAngle: (window as any).__ctx.toolData.physics.angle,
    };
  });
  expect(dragCoords.initialAngle).toBe(45);

  await page.mouse.move(dragCoords.startX, dragCoords.startY);
  await page.mouse.down();
  await page.mouse.move(dragCoords.endX, dragCoords.endY, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.physics.angle)).toBeGreaterThan(55);

  // Toggle Tape-Measure Probe and snap to Apex and Landing
  await page.locator('[data-physics-tape-toggle]').click();
  const tapePanel = page.locator('[data-physics-tape-panel]');
  await expect(tapePanel).toBeVisible();
  const readout = tapePanel.locator('[data-physics-tape-readout]');

  await tapePanel.locator('[data-physics-tape-snap="apex"]').click();
  await expect(readout).toContainText('Arc y(x) =');
  const apexText = await readout.textContent();

  await tapePanel.locator('[data-physics-tape-snap="landing"]').click();
  await expect(readout).toContainText(', 0.0 m)');
  const landingText = await readout.textContent();
  expect(landingText).not.toBe(apexText);

  // Moon + Air Drag Guard quick fix
  await setState(page, { gravity: 1.6, airResist: true });
  const moonWarn = page.locator('[data-physics-moon-drag-warning]');
  await expect(moonWarn).toBeVisible();
  await moonWarn.locator('[data-physics-moon-vacuum-fix]').click();
  await expect(moonWarn).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__ctx.toolData.physics.airResist)).toBe(false);

  // Analyze tab -> Planetary Atmosphere & Wind Explorer -> Titan Apply
  await page.locator('[data-physics-workspace-tab="analyze"]').click();
  const atmoPanel = page.locator('[data-physics-learning-panel="atmosphere-wind"]');
  await expect(atmoPanel).toBeVisible();
  await atmoPanel.locator('[data-atmo-planet="titan"]').click();
  await atmoPanel.locator('[data-physics-apply-planet]').click();
  await expect.poll(() => page.evaluate(() => {
    const p = (window as any).__ctx.toolData.physics;
    return { g: p.gravity, drag: p.airResist };
  })).toEqual({ g: 1.35, drag: true });

  // Learn tab -> Mastery badge + Cross-Tool Bridge to ThrowLab
  await page.locator('[data-physics-workspace-tab="learn"]').click();
  const bridgesPanel = page.locator('[data-physics-learning-panel="bridges"]');
  await expect(bridgesPanel).toBeVisible();
  await expect(bridgesPanel.locator('[data-physics-mastery-count]')).toContainText('/ 18');
  await bridgesPanel.locator('[data-physics-bridge="throwlab"]').click();
  expect(await page.evaluate(() => (window as any).__switchedTool)).toBe('throwlab');
});
