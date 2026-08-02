import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_solarsystem.js',
  toolId: 'solarSystem',
  width: 736,
  height: 1600,
});

test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });

test.describe.configure({ timeout: 90_000 });

test('keeps the Orrery free of horizontal overflow at 320px and 736px', async ({ page }) => {
  const widths = [320, 736];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 1600 });
    await harness.mount(page, {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: 0,
        orr_sel: 'earth',
      },
    }, undefined, { expectCanvas: false });

    const metrics = await page.evaluate((nextWidth) => {
      const wrap = document.getElementById('wrap');
      if (!wrap) throw new Error('Orrery harness wrapper did not mount');
      wrap.style.width = `${nextWidth}px`;
      const wrapBox = wrap.getBoundingClientRect();
      const overflowing = [...wrap.querySelectorAll<HTMLElement>('*')]
        .map((element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: element.className,
          rect: element.getBoundingClientRect(),
        }))
        .filter(({ rect }) => rect.width > 0 && (rect.left < wrapBox.left - 1 || rect.right > wrapBox.right + 1))
        .slice(0, 8)
        .map(({ tag, id, className, rect }) => ({ tag, id, className, left: Math.round(rect.left), right: Math.round(rect.right) }));
      return {
        viewportWidth: window.innerWidth,
        wrapWidth: Math.round(wrapBox.width),
        wrapScrollWidth: wrap.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        overflowing,
      };
    }, width);

    expect(metrics.wrapWidth).toBe(width);
    expect(metrics.wrapScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(width + 1);
    expect(metrics.documentScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(width + 1);
    expect(metrics.overflowing, JSON.stringify(metrics)).toEqual([]);

    await harness.destroy(page);
  }
});
test('keeps mobile stage guidance readable instead of squeezing it into a corner', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  await page.locator('#wrap').evaluate((wrap) => { (wrap as HTMLElement).style.width = '320px'; });
  const layout = await page.locator('.orr-stage-tip').evaluate((tip) => {
    const stage = tip.closest('.orr-orbit-stage');
    const hud = stage?.querySelector('.orr-stage-hud');
    if (!stage || !hud) throw new Error('Orrery stage layout did not mount');
    const tipRect = tip.getBoundingClientRect();
    const stageRect = stage.getBoundingClientRect();
    return {
      tipWidth: Math.round(tipRect.width),
      tipLeft: Math.round(tipRect.left),
      tipRight: Math.round(tipRect.right),
      stageLeft: Math.round(stageRect.left),
      stageRight: Math.round(stageRect.right),
      textAlign: getComputedStyle(tip).textAlign,
      hudDirection: getComputedStyle(hud).flexDirection,
    };
  });

  expect(layout.tipWidth).toBeGreaterThanOrEqual(240);
  expect(layout.tipLeft).toBeGreaterThanOrEqual(layout.stageLeft + 8);
  expect(layout.tipRight).toBeLessThanOrEqual(layout.stageRight - 8);
  expect(layout.textAlign).toBe('left');
  expect(layout.hudDirection).toBe('column');

  await harness.destroy(page);
});
test('persists Kepler law tab exploration for learner progress', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
    },
  }, undefined, { expectCanvas: false });

  const readSeen = () => page.evaluate(() => ((window as any).__toolData.solarSystem.orreryKeplerSeen || []));
  await expect.poll(readSeen).toEqual([]);

  await page.getByRole('tab', { name: 'Kepler I: ellipses and the Sun at one focus', exact: true }).click();
  await expect.poll(readSeen).toEqual(['keplerI']);
  await expect(page.locator('#orrery-tab-1')).toHaveAttribute('data-kepler-visited', 'true');

  await page.getByRole('tab', { name: 'Kepler II: equal areas in equal times', exact: true }).click();
  await expect.poll(readSeen).toEqual(['keplerI', 'keplerII']);
  await page.getByRole('tab', { name: 'Kepler II: equal areas in equal times', exact: true }).press('ArrowRight');
  await expect.poll(readSeen).toEqual(['keplerI', 'keplerII', 'keplerIII']);
  await expect(page.locator('#orrery-tab-3')).toHaveAttribute('data-kepler-visited', 'true');

  await harness.destroy(page);
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 3,
    },
  }, undefined, { expectCanvas: false });
  await expect.poll(readSeen).toEqual(['keplerIII']);

  await harness.destroy(page);
});
test('names the animated Kepler canvases and honors reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [tab, label] of [[1, 'Kepler I orbit visualization'], [2, 'Kepler II equal-area visualization']] as const) {
    await harness.mount(page, {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: tab,
      },
    }, undefined, { expectCanvas: false });

    const canvas = page.locator('canvas[role="img"]').first();
    await expect(canvas).toHaveAttribute('aria-label', new RegExp(label));
    await page.waitForTimeout(100);
    const firstFrame = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
    await page.waitForTimeout(250);
    const reducedMotionFrame = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
    expect(reducedMotionFrame).toBe(firstFrame);
    await harness.destroy(page);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});
test('keeps static charts out of tab order and makes Kepler III keyboard-operable', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 1,
    },
  }, undefined, { expectCanvas: false });
  const staticCanvas = page.locator('canvas[role="img"]').first();
  await expect(staticCanvas).toHaveAttribute('aria-label', /Kepler I orbit visualization/);
  expect(await staticCanvas.getAttribute('tabindex')).toBeNull();
  await harness.destroy(page);

  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 3,
    },
  }, undefined, { expectCanvas: false });
  const chart = page.locator('canvas[role="application"]').first();
  await expect(chart).toHaveAttribute('aria-keyshortcuts', 'Enter Space Escape');
  await expect(chart).toHaveAttribute('aria-describedby', 'orrery-k3-canvas-help');
  await chart.focus();
  await chart.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_k3hover)).toBe('mercury');
  await chart.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_k3hover || null)).toBeNull();
  await harness.destroy(page);
});
test('persists calculation and live challenge progress for learner quests', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 6,
      orr_paused: true,
      orr_time: 0,
      orr_cli: 1,
    },
  }, undefined, { expectCanvas: false });

  const readState = () => page.evaluate(() => ({
    challengeScore: (window as any).__toolData.solarSystem._chalScore || 0,
    liveSolved: (window as any).__toolData.solarSystem._liveSolved || {},
  }));
  await expect.poll(readState).toEqual({ challengeScore: 0, liveSolved: {} });

  const calculationInput = page.locator('input[aria-label^="Jupiter orbits"]');
  await calculationInput.fill('10');
  await page.getByRole('button', { name: /Submit/ }).click();
  await expect(page.locator('#orrery-challenge-feedback')).toContainText('Try again');
  await expect(calculationInput).toHaveAttribute('aria-invalid', 'true');
  await expect(calculationInput).toHaveAttribute('aria-describedby', 'orrery-challenge-feedback');

  await calculationInput.fill('11.86');
  await page.getByRole('button', { name: /Submit/ }).click();
  await expect.poll(readState).toEqual({ challengeScore: 1, liveSolved: {} });

  const liveInput = page.locator('input[aria-label^="LIVE: What is Mars"]');
  await liveInput.fill('0');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.locator('#orrery-live-challenge-feedback')).toContainText('Check the live readout');
  await expect(liveInput).toHaveAttribute('aria-invalid', 'true');

  await liveInput.fill('26.5');
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect.poll(readState).toEqual({ challengeScore: 1, liveSolved: { 1: { correct: true } } });

  await harness.destroy(page);
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 6,
      orr_chc: { 0: true, 1: true, 2: true },
      orr_clc: { 0: true, 2: true },
    },
  }, undefined, { expectCanvas: false });
  await expect.poll(readState).toEqual({
    challengeScore: 3,
    liveSolved: { 0: { correct: true }, 2: { correct: true } },
  });

  await harness.destroy(page);
});

test('gates live answers until paused and opens the focused Full Orrery view', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 6,
      orr_cli: 1,
      orr_time: 0,
      orr_paused: false,
    },
  }, undefined, { expectCanvas: false });

  const liveStatus = page.locator('#orrery-live-challenge-status');
  const checkButton = page.getByRole('button', { name: 'Check', exact: true });
  await expect(liveStatus).toContainText('Clock is playing');
  await expect(checkButton).toBeDisabled();

  await page.getByRole('button', { name: 'Pause simulation clock' }).click();
  await expect(liveStatus).toContainText('Clock paused');
  await expect(checkButton).toBeEnabled();

  await page.getByRole('button', { name: 'Open Full Orrery focused on Mars' }).click();
  await expect(page.locator('#orrery-tab-0')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#wrap canvas').first()).toBeVisible({ timeout: 30_000 });
  await expect.poll(() => page.evaluate(() => ({
    selected: (window as any).__toolData.solarSystem.orr_sel,
    paused: (window as any).__toolData.solarSystem.orr_paused,
  }))).toEqual({ selected: 'mars', paused: true });

  await harness.destroy(page);
});

test('keeps Orrery exploration earned and tracks guided missions in quest hooks', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const questResults = await page.evaluate(() => {
    const hooks = ((window as any).StemLab?._registry?.solarSystem?.questHooks || []) as Array<any>;
    const explore = hooks.find((hook) => hook.id === 'orrery_explore');
    const guided = hooks.find((hook) => hook.id === 'orrery_guided_3');
    const completeProgress = {
      earth_distance: { correct: true },
      mercury_speed: { correct: true },
      longer_year: { correct: true },
    };
    const partialProgress = {
      earth_distance: { correct: true },
      mercury_speed: { correct: true },
    };
    return {
      exploreAfterReturn: !!explore?.check({ orreryMode: false, orrery_explored_once: true }),
      exploreProgress: explore?.progress({ orreryMode: false, orrery_explored_once: true }),
      guidedComplete: !!guided?.check({ orr_mission_progress: completeProgress }),
      guidedProgress: guided?.progress({ orr_mission_progress: partialProgress }),
    };
  });

  expect(questResults).toEqual({
    exploreAfterReturn: true,
    exploreProgress: 'Done',
    guidedComplete: true,
    guidedProgress: '2/3 missions',
  });

  await harness.destroy(page);
});

test('supports two-finger pinch zoom on the orbit canvas', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const canvas = page.locator('#wrap canvas[role="application"]');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveCSS('touch-action', 'none');
  const before = await canvas.evaluate((element) => (element as any).__canvasPanelState.scale);

  await canvas.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const emit = (target: EventTarget, type: string, init: PointerEventInit) => {
      target.dispatchEvent(new PointerEvent(type, { bubbles: true, ...init }));
    };
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 11, pointerType: 'touch',
      clientX: centerX - 30, clientY: centerY,
    }));
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 12, pointerType: 'touch',
      clientX: centerX + 30, clientY: centerY,
    }));
    emit(window, 'pointermove', {
      pointerId: 12, pointerType: 'touch',
      clientX: centerX + 90, clientY: centerY,
    });
    emit(window, 'pointerup', {
      pointerId: 11, pointerType: 'touch',
      clientX: centerX - 30, clientY: centerY,
    });
    emit(window, 'pointerup', {
      pointerId: 12, pointerType: 'touch',
      clientX: centerX + 90, clientY: centerY,
    });
  });

  const after = await canvas.evaluate((element) => (element as any).__canvasPanelState.scale);
  expect(after).toBeGreaterThan(before);

  await harness.destroy(page);
});
test('keeps selected-world DOM readouts moving with the orbit clock', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  await expect(page.locator('#orrery-live-selected-summary')).toContainText('Earth: distance');
  await expect(page.locator('#orrery-live-selected-summary')).toHaveAttribute('aria-live', 'polite');
  expect(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('#orrery-timeline-mark-0').getAttribute('aria-current')).toBe('step');
  expect(await page.locator('#orrery-timeline-mark-4').getAttribute('aria-current')).toBe('false');
  expect(await page.locator('#orrery-timeline-jump-4').getAttribute('aria-pressed')).toBe('false');
  await page.locator('#orrery-timeline-jump-2').click();
  await expect(page.locator('#orrery-live-timeline-phase')).toContainText('Near aphelion');
  await page.locator('#orrery-timeline-jump-0').click();
  await expect(page.locator('#orrery-live-timeline-phase')).toContainText('Near perihelion');
  const activeMarkBorder = await page.locator('#orrery-timeline-mark-0').evaluate((element) => getComputedStyle(element).borderTopColor);

  expect(await page.locator('#orrery-live-timeline-value').textContent()).toContain('Earth year 1 · day 1');
  await page.locator('#orrery-timeline-jump-4').click();
  await expect(page.locator('#orrery-live-timeline-value')).toContainText('Earth year 2 · day 1');
  await page.locator('#orrery-timeline-jump-0').click();
  await expect(page.locator('#orrery-live-timeline-value')).toContainText('Earth year 1 · day 1');
  const before = await page.locator('#orrery-live-timeline-value').textContent();
  await page.evaluate(() => {
    const ctx = (window as any).__ctx;
    ctx.updateMulti('solarSystem', { orr_speed: 1, orr_paused: false });
  });
  await page.waitForTimeout(350);

  const after = await page.locator('#orrery-live-timeline-value').textContent();
  expect(after).not.toBe(before);
  expect(Number(await page.locator('#orrery-phase-scrubber').inputValue())).toBeGreaterThan(0);
  expect(await page.locator('#orrery-phase-scrubber').getAttribute('aria-valuetext')).toContain('years into Earth');
  expect(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed')).toBe('false');
  expect(await page.locator('#orrery-timeline-mark-0').getAttribute('aria-current')).toBe('false');
  expect(await page.locator('#orrery-timeline-mark-0').evaluate((element) => getComputedStyle(element).borderTopColor)).not.toBe(activeMarkBorder);

  await harness.destroy(page);
});
test('gates guided predictions until the orbital clock is paused', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_paused: false,
      orr_mission_progress: { earth_distance: { started: true } },
    },
  }, undefined, { expectCanvas: false });

  const options = page.locator('button[aria-describedby="orrery-guided-objective"]');
  await expect(options).toHaveCount(2);
  await expect(options.first()).toBeDisabled();
  expect(await options.first().getAttribute('aria-label')).toContain('Pause the clock before predicting');

  await page.getByRole('button', { name: 'Pause clock', exact: true }).click();
  await expect(options.first()).toBeEnabled();

  await page.evaluate(() => (window as any).__ctx.updateMulti('solarSystem', { orr_time: 0, orr_paused: true }));
  await page.getByRole('button', { name: 'Farther than 1 AU for Earth live orbit' }).click();
  await expect(page.locator('#orrery-guided-feedback')).toContainText('Not quite');
  await expect(page.locator('button[aria-describedby="orrery-guided-objective orrery-guided-feedback"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Closer than 1 AU for Earth live orbit' }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_progress.earth_distance.correct)).toBe(true);

  await harness.destroy(page);
});
test('keeps comparison distance and speed evidence live', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_compare: 'mars',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  await expect(page.locator('table[aria-label*="Earth"][aria-label*="Mars"]')).toBeVisible();
  await expect(page.locator('#orrery-compare-interpretation')).toContainText('Earth is currently');
  const beforeDistance = await page.locator('#orrery-live-compare-primary-distance').textContent();
  const beforeSpeed = await page.locator('#orrery-live-compare-primary-speed').textContent();

  await page.evaluate(() => {
    const ctx = (window as any).__ctx;
    ctx.updateMulti('solarSystem', { orr_speed: 1, orr_paused: false });
  });
  await page.waitForTimeout(350);

  expect(await page.locator('#orrery-live-compare-primary-distance').textContent()).not.toBe(beforeDistance);
  expect(await page.locator('#orrery-live-compare-primary-speed').textContent()).not.toBe(beforeSpeed);
  await expect(page.locator('#orrery-live-compare-secondary-distance')).toBeVisible();
  await expect(page.locator('#orrery-live-compare-secondary-speed')).toBeVisible();

  await harness.destroy(page);
});
test('lets keyboard users cycle through worlds from the Orrery canvas', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const canvas = page.locator('#wrap canvas[role="application"]');
  await canvas.focus();
  await canvas.press('Enter');
  await expect(page.locator('#orrery-body-navigator')).toHaveValue('mercury');
  expect(await canvas.getAttribute('aria-label')).toContain('Mercury is selected');

  await canvas.press('Space');
  await expect(page.locator('#orrery-body-navigator')).toHaveValue('venus');
  expect(await page.locator('#orrery-body-navigator-help').textContent()).toContain('Focused: Venus');

  await harness.destroy(page);
});
test('makes zoom presets reset and announce the active camera view', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const canvas = page.locator('#wrap canvas[role="application"]');
  await expect(canvas).toHaveAttribute('data-view-preset', 'full');
  expect(await canvas.getAttribute('aria-label')).toContain('Current view is the full solar system');

  await page.getByRole('button', { name: 'Zoom to inner planets', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-view-preset', 'inner');
  expect(await canvas.getAttribute('aria-label')).toContain('Current view is inner planets');

  await page.getByRole('button', { name: 'Zoom to outer planets', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-view-preset', 'outer');
  expect(await canvas.getAttribute('aria-label')).toContain('Current view is outer planets');

  await page.getByRole('button', { name: 'Reset orbit time, camera view, and selection', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-view-preset', 'full');
  expect(await canvas.getAttribute('aria-label')).toContain('Current view is the full solar system');
  await expect(page.locator('#orrery-body-navigator')).toHaveValue('');

  await harness.destroy(page);
});
test('lets keyboard and touch users toggle camera follow', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const follow = page.getByRole('button', { name: 'Follow Earth with the camera', exact: true });
  await expect(follow).toHaveAttribute('aria-pressed', 'false');
  await follow.click();

  const release = page.getByRole('button', { name: 'Release camera follow for Earth', exact: true });
  await expect(release).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.orr-stage-tip')).toContainText('Following Earth');

  await release.click();
  await expect(page.getByRole('button', { name: 'Follow Earth with the camera', exact: true })).toHaveAttribute('aria-pressed', 'false');

  await follow.click();
  await expect(release).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#wrap canvas[role="application"]').focus();
  await page.locator('#wrap canvas[role="application"]').press('Home');
  await expect(page.getByRole('button', { name: 'Follow Earth with the camera', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.orr-stage-tip')).not.toContainText('Following Earth');

  await harness.destroy(page);
});