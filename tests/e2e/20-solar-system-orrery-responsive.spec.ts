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
test('keeps every Orrery teaching tab within 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1600 });

  for (const tab of Array.from({ length: 9 }, (_, index) => index)) {
    await harness.mount(page, {
      solarSystem: {
        tutorialDismissed: true,
        orreryMode: true,
        orr_tab: tab,
        orr_paused: true,
        orr_sel: 'earth',
      },
    }, undefined, { expectCanvas: false });

    await page.locator('#wrap').evaluate((wrap) => { (wrap as HTMLElement).style.width = '320px'; });
    const metrics = await page.evaluate(() => {
      const wrap = document.getElementById('wrap');
      if (!wrap) throw new Error('Orrery harness wrapper did not mount');
      const wrapBox = wrap.getBoundingClientRect();
      const overflowing = [...wrap.querySelectorAll<HTMLElement>('*')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const outOfBounds = rect.width > 0 && (rect.left < wrapBox.left - 1 || rect.right > wrapBox.right + 1);
          let containedByScrollContainer = false;
          if (outOfBounds) {
            let ancestor = element.parentElement;
            while (ancestor && ancestor !== wrap) {
              const ancestorStyle = getComputedStyle(ancestor);
              const ancestorRect = ancestor.getBoundingClientRect();
              if (
                (ancestorStyle.overflowX === 'auto' || ancestorStyle.overflowX === 'scroll')
                && ancestorRect.left >= wrapBox.left - 1
                && ancestorRect.right <= wrapBox.right + 1
              ) {
                containedByScrollContainer = true;
                break;
              }
              ancestor = ancestor.parentElement;
            }
          }
          return {
            tag: element.tagName.toLowerCase(),
            id: element.id,
            className: element.className,
            text: (element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
            minWidth: getComputedStyle(element).minWidth,
            display: getComputedStyle(element).display,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            containedByScrollContainer,
          };
        })
        .filter(({ left, right, width, containedByScrollContainer }) => width > 0 && (left < Math.floor(wrapBox.left - 1) || right > Math.ceil(wrapBox.right + 1)) && !containedByScrollContainer)
        .slice(0, 80);
      return {
        documentScrollWidth: document.documentElement.scrollWidth,
        overflowing,
      };
    });

    expect(metrics.documentScrollWidth, 'tab ' + tab + ': ' + JSON.stringify(metrics)).toBeLessThanOrEqual(321);
    expect(metrics.overflowing, 'tab ' + tab + ': ' + JSON.stringify(metrics)).toEqual([]);
    await harness.destroy(page);
  }
});
test('shows the Orrery route position and Kepler exploration progress', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const route = page.locator('#orrery-tab-progress');
  const explorerView = page.locator('[data-solarsystem-route-switcher]');
  await expect(explorerView).toHaveAttribute('role', 'group');
  await expect(explorerView.getByRole('button', { name: /Orrery Lab/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(explorerView).not.toContainText('NEW');
  await expect(route).toHaveAttribute('role', 'status');
  await expect(route).toHaveAttribute('data-active-section', '1');
  await expect(route).toContainText('Section 1 of 9');
  await expect(route).toContainText('0 / 3 Kepler laws explored');
  await expect(route).toContainText('0 / 3 guided missions complete');
  await expect(route).toHaveAttribute('data-guided-missions', '0');
  await expect(route).toHaveAttribute('data-next-section', '1');
  const sectionProgress = page.locator('#orrery-section-progress');
  await expect(sectionProgress).toHaveText('1 / 9 sections sampled');
  await expect(page.locator('#orrery-tab-0')).toHaveAttribute('data-orrery-visited', 'true');
  await expect(page.locator('#orrery-next-section')).toContainText('Go to I Ellipses');
  await expect(route).toHaveAttribute('aria-label', /Section 1 of 9: Full Orrery/);

  const keplerOne = page.getByRole('tab', { name: 'Kepler I: ellipses and the Sun at one focus', exact: true });
  await page.locator('#orrery-next-section').click();
  await expect(route).toHaveAttribute('data-active-section', '2');
  await expect(route).toContainText('Section 2 of 9');
  await expect(page.locator('#orrery-kepler-progress')).toHaveText('1 / 3 Kepler laws explored');
  await expect(sectionProgress).toHaveText('2 / 9 sections sampled');
  await expect(page.locator('#orrery-tab-1')).toHaveAttribute('data-orrery-visited', 'true');
  await expect(route).toHaveAttribute('data-next-section', '2');

  await keplerOne.press('ArrowRight');
  await expect(route).toHaveAttribute('data-active-section', '3');
  await expect(route).toContainText('Section 3 of 9');
  await expect(page.locator('#orrery-kepler-progress')).toHaveText('2 / 3 Kepler laws explored');
  await expect(sectionProgress).toHaveText('3 / 9 sections sampled');
  await expect(page.locator('#orrery-tab-2')).toHaveAttribute('data-orrery-visited', 'true');
  await expect(route).toHaveAttribute('data-next-section', '3');
  for (const tabIndex of Array.from({ length: 6 }, (_, offset) => offset + 3)) {
    await page.locator('#orrery-tab-' + tabIndex).click();
    await expect(sectionProgress).toHaveText(String(tabIndex + 1) + ' / 9 sections sampled');
    await expect(page.locator('#orrery-tab-' + tabIndex)).toHaveAttribute('data-orrery-visited', 'true');
  }
  await expect(route).toHaveAttribute('data-next-section', 'complete');
  await expect(page.locator('#orrery-next-section')).toHaveCount(0);
  await expect(page.locator('#orrery-next-section-label')).toHaveText('All 9 sections sampled');
  await harness.destroy(page);
});
test('moves keyboard focus with Explorer Route changes', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: false,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const explorerView = page.locator('[data-solarsystem-route-switcher]');
  await explorerView.getByRole('button', { name: /Orrery Lab/ }).click();
  await expect(page.locator('#orrery-tab-0')).toBeFocused();

  await explorerView.getByRole('button', { name: /3D Explorer/ }).click();
  await expect(page.locator('.solar3d-canvas')).toBeFocused();
  await harness.destroy(page);
});
test('keeps Orbit Workshop controls named and wrapped at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 4,
    },
  }, undefined, { expectCanvas: false });

  await page.locator('#wrap').evaluate((wrap) => { (wrap as HTMLElement).style.width = '320px'; });
  await expect(page.locator('label[for="orrery-workshop-eccentricity"]')).toContainText('Eccentricity');
  await expect(page.locator('label[for="orrery-workshop-semi-major"]')).toContainText('Semi-major');
  await expect(page.locator('#orrery-workshop-controls-help')).toContainText('Values use AU, years, and km/s');
  await expect(page.locator('#orrery-workshop-eccentricity')).toHaveAttribute('aria-describedby', 'orrery-workshop-controls-help');
  await expect(page.locator('#orrery-workshop-semi-major')).toHaveAttribute('aria-describedby', 'orrery-workshop-controls-help');
  await expect(page.locator('#orrery-workshop-energy-note')).toContainText('normalized GM units');
  await expect(page.locator('canvas[aria-label*="energy diagram"]')).toHaveAttribute('aria-describedby', 'orrery-workshop-energy-note');
  await expect(page.locator('canvas[aria-label*="energy diagram"]')).toHaveAttribute('aria-label', /current semi-major axis/);

  const metrics = await page.evaluate(() => {
    const wrap = document.getElementById('wrap');
    if (!wrap) throw new Error('Orrery harness wrapper did not mount');
    const wrapBox = wrap.getBoundingClientRect();
    const rows = [...wrap.querySelectorAll<HTMLElement>('.orrery-workshop-control-row')].map((row) => {
      const rect = row.getBoundingClientRect();
      return { flexWrap: getComputedStyle(row).flexWrap, left: rect.left, right: rect.right };
    });
    const overflowing = [...wrap.querySelectorAll<HTMLElement>("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { tag: element.tagName.toLowerCase(), id: element.id, className: element.className, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
      })
      .filter(({ left, right, width }) => width > 0 && (left < Math.floor(wrapBox.left - 1) || right > Math.ceil(wrapBox.right + 1)))
      .slice(0, 12);
    return {
      documentScrollWidth: document.documentElement.scrollWidth,
      overflowing,
      rows,
      wrapLeft: wrapBox.left,
      wrapRight: wrapBox.right,
    };
  });
  expect(metrics.documentScrollWidth, JSON.stringify(metrics)).toBeLessThanOrEqual(321);
  expect(metrics.overflowing, JSON.stringify(metrics)).toEqual([]);
  expect(metrics.rows).toHaveLength(2);
  expect(metrics.rows.every((row) => row.flexWrap === 'wrap')).toBe(true);
  expect(metrics.rows.every((row) => row.left >= metrics.wrapLeft - 1 && row.right <= metrics.wrapRight + 1)).toBe(true);

  await harness.destroy(page);
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
  await expect(page.locator('#orrery-model-scale-note')).toContainText('not one literal scale');
  await expect(page.locator('canvas[role="application"]')).toHaveAttribute('aria-describedby', 'orrery-canvas-help orrery-model-scale-note orrery-hover-summary orrery-stage-key orrery-stage-tip');
  await expect(page.locator('#orrery-hover-summary')).toHaveAttribute('role', 'status');
  await expect(page.locator('#orrery-stage-key')).toContainText('Velocity vector');
  await expect(page.locator('#orrery-stage-tip')).toContainText('Arrow = direction/relative speed');
  await expect(page.locator('#orrery-guided-progress')).toHaveText('0 / 3 guided missions complete');
  await expect(page.locator('body')).toContainText('a · orbit size');
  await expect(page.locator('body')).toContainText('e · eccentricity');
  await expect(page.locator('body')).toContainText('distance now');
  await expect(page.locator('body')).toContainText('Kepler III check');
  const selectedMobileWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(selectedMobileWidth).toBeLessThanOrEqual(321);
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
test('mirrors canvas hover evidence into an accessible status', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_zoom: 'inner',
      orr_showComets: false,
      orr_showDwarfs: false,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const canvas = page.locator('canvas[role="application"]').first();
  await canvas.scrollIntoViewIfNeeded();
  const readTarget = () => canvas.evaluate((element) => {
    const state = (element as any).__canvasPanelState;
    const live = (element as any)._liveState;
    const body = live?.bodies?.mercury;
    if (!state || !body) return null;
    const rect = element.getBoundingClientRect();
    return {
      clientX: rect.left + (state.cx + body.x * state.scale) * rect.width / 960,
      clientY: rect.top + (state.cy - body.y * state.scale) * rect.height / 640,
    };
  });
  await expect.poll(readTarget, { timeout: 10000 }).not.toBeNull();
  const target = await readTarget();
  if (!target) throw new Error('Mercury hover target was not available');

  await page.mouse.move(target.clientX, target.clientY);
  await expect(page.locator('#orrery-hover-summary')).toContainText('Hovering Mercury: distance');
  await expect(page.locator('#orrery-hover-summary')).toContainText('orbital period');

  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Orrery canvas bounds were not available');
  await page.mouse.move(canvasBox.x + canvasBox.width + 12, canvasBox.y + canvasBox.height + 12);
  await expect(page.locator('#orrery-hover-summary')).toHaveText('');
  await harness.destroy(page);
});
test('does not select hidden worlds and clears a selected world when its layer is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_zoom: 'full',
      orr_showComets: false,
      orr_showDwarfs: false,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const canvas = page.locator('canvas[role="application"]').first();
  const readHiddenDwarfTarget = () => canvas.evaluate((element) => {
    const state = (element as any).__canvasPanelState;
    if (!state) return null;
    // Haumea starts at perihelion in the deterministic t=0 model state. It is
    // intentionally absent from _liveState while the dwarf layer is hidden.
    const haumeaX = 43.13 * (1 - 0.1912);
    const rect = element.getBoundingClientRect();
    return {
      clientX: rect.left + (state.cx + haumeaX * state.scale) * rect.width / 960,
      clientY: rect.top + state.cy * rect.height / 640,
    };
  });
  await expect.poll(readHiddenDwarfTarget, { timeout: 10000 }).not.toBeNull();
  const hiddenTarget = await readHiddenDwarfTarget();
  if (!hiddenTarget) throw new Error('Hidden dwarf target was not available');
  await page.mouse.click(hiddenTarget.clientX, hiddenTarget.clientY);
  await expect(page.locator('#orrery-live-distance')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_sel || null)).toBeNull();

  await harness.destroy(page);
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'pluto',
      orr_showDwarfs: true,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });
  await expect(page.locator('#orrery-live-distance')).toHaveCount(1);
  await page.getByRole('button', { name: 'Show dwarf planets' }).click();
  await expect(page.locator('#orrery-live-distance')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_sel || null)).toBeNull();

  await harness.destroy(page);
});
test('reselects a world normally after Escape clears the selection', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_zoom: 'inner',
      orr_showComets: false,
      orr_showDwarfs: false,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const canvas = page.locator('canvas[role="application"]').first();
  await canvas.scrollIntoViewIfNeeded();
  const readMercuryTarget = () => canvas.evaluate((element) => {
    const state = (element as any).__canvasPanelState;
    const live = (element as any)._liveState;
    const body = live?.bodies?.mercury;
    if (!state || !body) return null;
    const rect = element.getBoundingClientRect();
    return {
      clientX: rect.left + (state.cx + body.x * state.scale) * rect.width / 960,
      clientY: rect.top + (state.cy - body.y * state.scale) * rect.height / 640,
    };
  });

  await expect.poll(readMercuryTarget, { timeout: 10000 }).not.toBeNull();
  const firstTarget = await readMercuryTarget();
  if (!firstTarget) throw new Error('Mercury target was not available');

  await page.mouse.click(firstTarget.clientX, firstTarget.clientY);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_sel || null)).toBe('mercury');
  await expect(page.locator('#orrery-live-distance')).toHaveCount(1);

  await canvas.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_sel || null)).toBeNull();
  await expect(page.locator('#orrery-live-distance')).toHaveCount(0);

  const secondTarget = await readMercuryTarget();
  if (!secondTarget) throw new Error('Mercury target was not available after Escape');
  await page.mouse.click(secondTarget.clientX, secondTarget.clientY);
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_sel || null)).toBe('mercury');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_follow || null)).toBeNull();
  await expect(page.locator('#orrery-live-distance')).toHaveCount(1);

  await harness.destroy(page);
});
test('returns focus to the world selector when clearing a selected world', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_focus_body: 'earth',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  await page.getByRole('button', { name: 'Clear selected world' }).click();
  await expect.poll(() => page.evaluate(() => ({
    selected: (window as any).__toolData.solarSystem.orr_sel || null,
    focusBody: (window as any).__toolData.solarSystem.orr_focus_body || null,
  }))).toEqual({ selected: null, focusBody: null });
  await expect(page.locator('#orrery-body-navigator')).toBeFocused();
  await harness.destroy(page);
});
test('lets direct camera input interrupt a focus glide', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_zoom: 'full',
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const canvas = page.locator('canvas[role="application"]').first();
  await canvas.focus();
  await canvas.press('Enter');
  await expect(page.locator('#orrery-body-navigator')).toHaveValue('mercury');
  await expect.poll(() => canvas.evaluate((element) => !!(element as any).__canvasPanelState?._zoomAnim)).toBe(true);

  await canvas.press('ArrowRight');
  await expect.poll(() => canvas.evaluate((element) => !!(element as any).__canvasPanelState?._zoomAnim)).toBe(false);

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
    const evidenceId = tab === 1 ? 'orrery-k1-evidence' : 'orrery-k2-evidence';
    await expect(canvas).toHaveAttribute('aria-describedby', evidenceId);
    await expect(page.locator('#' + evidenceId)).toBeVisible();
    await page.waitForTimeout(100);
    const firstFrame = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
    await page.waitForTimeout(250);
    const reducedMotionFrame = await canvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
    expect(reducedMotionFrame).toBe(firstFrame);
    await harness.destroy(page);
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' });
});
test('keeps Kepler evidence readouts synchronized with eccentricity controls', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 1,
      orr_k1e: 0.5,
    },
  }, undefined, { expectCanvas: false });
  await expect(page.locator('#orrery-k1-evidence')).toContainText('Perihelion = 0.500a');
  await expect(page.locator('#orrery-k1-evidence')).toContainText('aphelion = 1.500a');
  await page.getByLabel('Eccentricity').first().fill('0.2');
  await expect(page.locator('#orrery-k1-evidence')).toContainText('Perihelion = 0.800a');
  await expect(page.locator('#orrery-k1-evidence')).toContainText('b/a = 0.980');
  await harness.destroy(page);

  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 2,
      orr_k2e: 0.6,
      orr_k2s: 6,
    },
  }, undefined, { expectCanvas: false });
  await expect(page.locator('#orrery-k2-evidence')).toContainText('Perihelion is 4.00x faster');
  await expect(page.locator('#orrery-k2-evidence')).toContainText('all 6 sectors represent the same time interval');
  await page.getByLabel('Eccentricity').first().fill('0.2');
  await expect(page.locator('#orrery-k2-evidence')).toContainText('Perihelion is 1.50x faster');
  await harness.destroy(page);
});
test('aligns Hohmann geometry evidence with outward and inward transfers', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 5,
      orr_trf: 'earth',
      orr_trt: 'mars',
    },
  }, undefined, { expectCanvas: false });

  const evidence = page.locator('#orrery-transfer-evidence');
  const canvas = page.locator('canvas[role="img"]').first();
  await expect(evidence).toContainText('depart Earth at perihelion');
  await expect(evidence).toContainText('arrive at Mars at aphelion');
  await expect(evidence).toContainText('speed up at departure, then brake at arrival');
  await expect(canvas).toHaveAttribute('aria-describedby', 'orrery-transfer-evidence');
  await expect(page.locator('th').filter({ hasText: '(km/s)' })).toHaveCount(3);
  await expect(page.getByRole('columnheader', { name: 'Transit time (days / yr)', exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Swap/ }).click();
  await expect.poll(() => page.evaluate(() => ({
    from: (window as any).__toolData.solarSystem.orr_trf,
    to: (window as any).__toolData.solarSystem.orr_trt,
  }))).toEqual({ from: 'mars', to: 'earth' });
  await expect(evidence).toContainText('depart Mars at aphelion');
  await expect(evidence).toContainText('arrive at Earth at perihelion');
  await expect(evidence).toContainText('brake at departure, then speed up at arrival');

  await harness.destroy(page);
});
test('exposes selected states for transfer and challenge navigators', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 5,
      orr_trf: 'earth',
      orr_trt: 'mars',
    },
  }, undefined, { expectCanvas: false });

  const departure = page.getByRole('group', { name: 'Transfer departure planet' });
  const arrival = page.getByRole('group', { name: 'Transfer arrival planet' });
  await expect(departure.locator('button[aria-pressed="true"]')).toContainText('Earth');
  await expect(arrival.locator('button[aria-pressed="true"]')).toContainText('Mars');
  await harness.destroy(page);

  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 6,
      orr_chi: 0,
    },
  }, undefined, { expectCanvas: false });
  const challengeNav = page.getByRole('group', { name: 'Challenge question navigator' });
  await expect(challengeNav.locator('button[aria-pressed="true"]')).toHaveText('1');
  await challengeNav.getByRole('button', { name: '2', exact: true }).click();
  await expect(challengeNav.locator('button[aria-pressed="true"]')).toHaveText('2');
  await harness.destroy(page);
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
  await expect(chart).toHaveAttribute('aria-describedby', 'orrery-k3-canvas-help orrery-k3-axis-note');
  await expect(page.locator('#orrery-k3-axis-note')).toContainText('tick labels are powers of ten');
  await expect(page.locator('#orrery-k3-units-note')).toContainText('Using a in AU and T in years');
  await expect(page.locator('#orrery-k3-verification-table')).toHaveAttribute('aria-describedby', 'orrery-k3-units-note');
  await expect(page.getByRole('columnheader').filter({ hasText: '(yr' })).toHaveCount(3);
  await expect(page.getByRole('columnheader').filter({ hasText: '(AU' })).toHaveCount(2);
  await chart.focus();
  await chart.press('Enter');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_k3hover)).toBe('mercury');
  await expect(page.locator('#orrery-k3-selected')).toContainText('Selected Mercury: a = 0.387 AU');
  await expect(page.locator('#orrery-k3-selected')).toContainText('T²/a³ = 1.0021');
  await chart.press('Escape');
  await expect.poll(() => page.evaluate(() => (window as any).__toolData.solarSystem.orr_k3hover || null)).toBeNull();
  await expect(page.locator('#orrery-k3-selected')).toContainText('Select a plotted world');
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

  await expect(page.locator('#orrery-challenge-progress')).toHaveText('Challenge progress: 0 of 10 solved');
  await expect(page.getByRole('progressbar', { name: 'Challenge completion' })).toHaveAttribute('aria-valuenow', '0');

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
  await expect(page.locator('#orrery-challenge-progress')).toHaveText('Challenge progress: 1 of 10 solved');
  await expect(page.getByRole('progressbar', { name: 'Challenge completion' })).toHaveAttribute('aria-valuenow', '1');

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
  await expect(page.locator('#orrery-live-orbit-position-meter')).toHaveAttribute('role', 'img');
  await expect(page.locator('#orrery-live-orbit-position-meter')).toHaveAttribute('aria-describedby', 'orrery-live-orbit-position');
  await expect(page.locator('#orrery-live-orbit-position')).toContainText('Earth');
  await expect(page.locator('#orrery-live-kepler-iii')).toContainText('Kepler III check');
  const initialOrbitalMarker = await page.locator('#orrery-live-orbit-position-marker').getAttribute('style');
  await page.locator('#orrery-timeline-jump-2').click();
  await expect(page.locator('#orrery-live-orbit-position')).toContainText('near aphelion');
  const aphelionOrbitalMarker = await page.locator('#orrery-live-orbit-position-marker').getAttribute('style');
  expect(aphelionOrbitalMarker).toContain('left: 100%');
  expect(initialOrbitalMarker).not.toBe(aphelionOrbitalMarker);
  await page.locator('#orrery-timeline-jump-0').click();
  await expect(page.locator('#orrery-live-orbit-position')).toContainText('near perihelion');
  await expect(page.locator('#orrery-playback-context')).toContainText('Earth completes one orbit in about 1.0 s at 1.0 Earth yr/s.');
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
  await page.locator('#orrery-timeline-jump-4').click();  await expect(page.locator('#orrery-live-timeline-value')).toContainText('1.00 / 1.00');
  await expect(page.locator('#orrery-phase-scrubber')).toHaveValue('1');
  expect(await page.locator('#orrery-timeline-jump-4').getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('#orrery-timeline-mark-4').getAttribute('aria-current')).toBe('step');
  expect(await page.locator('#orrery-timeline-jump-0').getAttribute('aria-pressed')).toBe('false');
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
  await expect(page.locator('#orrery-compare-interpretation')).toContainText('Kepler III: Mars has the larger orbit and the longer period.');
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
test('keeps comparison interpretation synchronized as worlds move', async ({ page }) => {
  await page.setViewportSize({ width: 736, height: 1600 });
  await harness.mount(page, {
    solarSystem: {
      tutorialDismissed: true,
      orreryMode: true,
      orr_tab: 0,
      orr_sel: 'earth',
      orr_compare: 'halley',
      orr_speed: 50,
      orr_paused: true,
    },
  }, undefined, { expectCanvas: false });

  const interpretation = page.locator('#orrery-compare-interpretation');
  const initialInterpretation = await interpretation.textContent();
  expect(initialInterpretation).toContain('Earth is currently farther from the Sun than Halley');
  expect(initialInterpretation).toContain('Kepler III: Halley');
  await page.evaluate(() => (window as any).__ctx.updateMulti('solarSystem', { orr_paused: false }));
  await expect.poll(() => interpretation.textContent(), { timeout: 10000 }).toContain('Earth is currently closer to the Sun than Halley');
  expect(initialInterpretation).not.toContain('Earth is currently closer to the Sun than Halley');

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
  await expect(page.locator('#orrery-live-map-scale')).toHaveText('Ruler: 10 AU');

  const readCamera = () => canvas.evaluate((element) => {
    const state = (element as any).__canvasPanelState;
    return state ? { cx: state.cx, cy: state.cy, scale: state.scale } : null;
  });
  const initialCamera = await readCamera();
  if (!initialCamera) throw new Error('Initial Orrery camera state was not available');
  await canvas.focus();
  await canvas.press('ArrowRight');
  await canvas.press('ArrowDown');
  await expect.poll(readCamera).not.toEqual(initialCamera);
  await page.getByRole('button', { name: 'Reset orbit time, camera view, and selection', exact: true }).click();
  await expect.poll(async () => {
    const camera = await readCamera();
    return camera ? { cx: Math.round(camera.cx), cy: Math.round(camera.cy), scale: Math.round(camera.scale * 100) / 100 } : null;
  }).toEqual({ cx: 480, cy: 320, scale: 10 });

  await page.getByRole('button', { name: 'Zoom to inner planets', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-view-preset', 'inner');
  expect(await canvas.getAttribute('aria-label')).toContain('Current view is inner planets');
  await expect(page.locator('#orrery-live-map-scale')).toHaveText('Ruler: 1 AU');

  await page.getByRole('button', { name: 'Zoom to outer planets', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-view-preset', 'outer');
  expect(await canvas.getAttribute('aria-label')).toContain('Current view is outer planets');
  await expect(page.locator('#orrery-live-map-scale')).toHaveText('Ruler: 50 AU');

  await page.getByRole('button', { name: 'Reset orbit time, camera view, and selection', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-view-preset', 'full');
  expect(await canvas.getAttribute('aria-label')).toContain('Current view is the full solar system');
  await expect(page.locator('#orrery-live-map-scale')).toHaveText('Ruler: 10 AU');
  await expect(page.locator('#orrery-body-navigator')).toHaveValue('');
  await expect.poll(async () => {
    const camera = await readCamera();
    return camera ? { cx: Math.round(camera.cx), cy: Math.round(camera.cy), scale: Math.round(camera.scale * 100) / 100 } : null;
  }).toEqual({ cx: 480, cy: 320, scale: 10 });

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
  await expect(page.locator('.orr-stage-tip')).toContainText('pan or zoom to release');
  await page.locator('#wrap canvas[role="application"]').press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Follow Earth with the camera', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.orr-stage-tip')).not.toContainText('Following Earth');
  await follow.click();
  await expect(release).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#wrap canvas[role="application"]').focus();
  await page.locator('#wrap canvas[role="application"]').press('Home');
  await expect(page.getByRole('button', { name: 'Follow Earth with the camera', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.orr-stage-tip')).not.toContainText('Following Earth');

  await harness.destroy(page);
});