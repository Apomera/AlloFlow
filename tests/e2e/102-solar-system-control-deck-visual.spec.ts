import { test, expect, type Page, type Locator } from '@playwright/test';
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

async function mountControls(page: Page, width: number, dark: boolean) {
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
  });
  await expect(page.locator('.orr-playback')).toBeVisible();
  await expect(page.locator('#orrery-guided-mission')).toBeVisible();
}

async function updateState(page: Page, patch: Record<string, unknown>) {
  await page.evaluate((next) => {
    (window as any).__ctx.updateMulti('solarSystem', next);
  }, patch);
}

async function assertControlGeometry(page: Page, width: number) {
  const geometry = await page.evaluate(() => {
    const panels = Array.from(document.querySelectorAll<HTMLElement>(
      '.orr-control-deck, #orrery-display-options, #orrery-guided-mission',
    ));
    const controls = Array.from(new Set(panels.flatMap((panel) => Array.from(
      panel.querySelectorAll<HTMLElement>('button, input[type="range"], select, summary'),
    )))).filter((control) => {
      const rect = control.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return {
      pageWidth: document.documentElement.scrollWidth,
      panels: panels.map((panel) => {
        const rect = panel.getBoundingClientRect();
        return { name: panel.id || panel.className, left: rect.left, right: rect.right,
          scrollWidth: panel.scrollWidth, clientWidth: panel.clientWidth };
      }),
      controls: controls.map((control) => {
        const rect = control.getBoundingClientRect();
        return { name: control.getAttribute('aria-label') || control.textContent?.trim() || control.id,
          width: rect.width, height: rect.height, left: rect.left, right: rect.right };
      }),
    };
  });
  expect(geometry.controls.length).toBeGreaterThan(15);
  expect(geometry.pageWidth).toBeLessThanOrEqual(width + 1);
  for (const panel of geometry.panels) {
    expect(panel.left, `${panel.name} left edge`).toBeGreaterThanOrEqual(-1);
    expect(panel.right, `${panel.name} right edge`).toBeLessThanOrEqual(width + 1);
    expect(panel.scrollWidth, `${panel.name} internal overflow`).toBeLessThanOrEqual(panel.clientWidth + 1);
  }
  for (const control of geometry.controls) {
    expect(control.height, `${control.name} target height`).toBeGreaterThanOrEqual(43.5);
    expect(control.width, `${control.name} target width`).toBeGreaterThanOrEqual(43.5);
    expect(control.left, `${control.name} left edge`).toBeGreaterThanOrEqual(-1);
    expect(control.right, `${control.name} right edge`).toBeLessThanOrEqual(width + 1);
  }
}

async function assertReadableContrast(page: Page) {
  const contrast = await page.evaluate(() => {
    type Color = [number, number, number, number];
    const parse = (value: string): Color => {
      if (value === 'transparent') return [0, 0, 0, 0];
      const channels = value.match(/[\d.]+/g)?.map(Number) || [];
      if (channels.length < 3) throw new Error(`Unsupported computed color: ${value}`);
      return [channels[0], channels[1], channels[2], channels[3] ?? 1];
    };
    const over = (top: Color, bottom: Color): Color => {
      const alpha = top[3] + bottom[3] * (1 - top[3]);
      return [0, 1, 2].map((channel) => (
        top[channel] * top[3] + bottom[channel] * bottom[3] * (1 - top[3])
      ) / alpha).concat(alpha) as Color;
    };
    const luminance = (color: Color) => color.slice(0, 3).map((channel) => {
      const value = channel / 255;
      return value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      '.orr-playback *, .orr-phase *, .orr-view-controls *, .orr-filter-deck *, #orrery-guided-mission *',
    )).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
        && !element.closest('[aria-hidden="true"]')
        && !element.closest('button:disabled, input:disabled, select:disabled')
        && Array.from(element.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
    });
    return candidates.map((element) => {
      const ancestors: HTMLElement[] = [];
      for (let current: HTMLElement | null = element; current; current = current.parentElement) ancestors.unshift(current);
      let backgrounds: Color[] = [[255, 255, 255, 1]];
      for (const ancestor of ancestors) {
        const style = getComputedStyle(ancestor);
        const gradientStops = style.backgroundImage.match(/rgba?\([^)]*\)/g) || [];
        const next = backgrounds.flatMap((background) => {
          const solid = over(parse(style.backgroundColor), background);
          return gradientStops.length ? gradientStops.map((stop) => over(parse(stop), solid)) : [solid];
        });
        backgrounds = Array.from(new Map(next.map((background) => [background.join(','), background])).values());
      }
      const ratios = backgrounds.map((background) => {
        const foreground = over(parse(getComputedStyle(element).color), background);
        const a = luminance(foreground), b = luminance(background);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      return { text: element.textContent?.trim().slice(0, 90), ratio: Math.min(...ratios) };
    });
  });
  expect(contrast.length).toBeGreaterThan(15);
  const unreadable = contrast.filter((sample) => sample.ratio < 4.5);
  expect(unreadable, 'Control prose, active actions, and mission feedback need readable contrast').toEqual([]);
}

async function rememberLiveNodes(page: Page) {
  return page.evaluate(() => {
    const known = ['orrery-playback-context', 'orrery-live-timeline-value'];
    const leaves = Array.from(document.querySelectorAll<HTMLElement>('[id^="orrery-live-"]'));
    const ids = Array.from(new Set(known.concat(leaves.map((leaf) => leaf.id))));
    (window as any).__controlLiveNodes = ids.map((id) => ({ id, node: document.getElementById(id) }));
    return ids;
  });
}

async function assertLiveNodesRetained(page: Page) {
  expect(await page.evaluate(() => (window as any).__controlLiveNodes.every(
    (entry: { id: string; node: HTMLElement | null }) => entry.node && document.getElementById(entry.id) === entry.node,
  )), 'Clock and inspection updates should retain the existing live readout leaves').toBe(true);
}

async function assertLandmark(page: Page, index: number) {
  const jumps = page.locator('[data-orrery-timeline-jump]');
  await expect(jumps).toHaveCount(5);
  for (let candidate = 0; candidate < 5; candidate++) {
    await expect(jumps.nth(candidate)).toHaveAttribute('aria-pressed', String(candidate === index));
    const mark = page.locator(`#orrery-timeline-mark-${candidate}`);
    if (candidate === index) await expect(mark).toHaveAttribute('aria-current', 'step');
    else await expect(mark).not.toHaveAttribute('aria-current', 'step');
  }
}

async function expectFocused(locator: Locator) {
  await expect(locator).toBeFocused();
}

for (const width of [320, 1060]) {
  for (const dark of [false, true]) {
    test(`Orrery controls remain readable and actionable at ${width}px in ${dark ? 'dark' : 'light'} mode`, async ({ page }) => {
      await mountControls(page, width, dark);
      await assertControlGeometry(page, width);
      await assertReadableContrast(page);
      const liveIds = await rememberLiveNodes(page);
      expect(liveIds).toContain('orrery-playback-context');
      expect(liveIds).toContain('orrery-live-timeline-value');
      expect(liveIds.length).toBeGreaterThanOrEqual(5);

      const phase = page.locator('#orrery-phase-scrubber');
      const period = Number(await phase.getAttribute('max'));
      const phaseStep = Number(await phase.getAttribute('step'));
      expect(period).toBeGreaterThan(0);
      await assertLandmark(page, 0);
      for (const index of [1, 2, 3, 4, 0]) {
        await page.locator(`#orrery-timeline-jump-${index}`).click();
        await assertLandmark(page, index);
        const expectedPhase = period * index / 4;
        expect(Math.abs(Number(await phase.inputValue()) - expectedPhase)).toBeLessThanOrEqual(phaseStep + 1e-6);
        expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_time)).toBeCloseTo(expectedPhase, 6);
      }
      await expect(page.locator('#orrery-live-timeline-value')).not.toHaveText('');

      await phase.focus();
      await phase.press('End');
      expect(Math.abs(Number(await phase.inputValue()) - period)).toBeLessThanOrEqual(phaseStep + 1e-6);
      await phase.press('Home');
      await assertLandmark(page, 0);
      await phase.press('ArrowRight');
      expect(Number(await phase.inputValue())).toBeGreaterThan(0);
      await expect(phase).toHaveAttribute('aria-valuetext', /years into Mercury/);
      expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_paused)).toBe(true);
      await expectFocused(phase);

      const speed = page.locator('#orrery-speed-control');
      await speed.focus();
      await speed.press('Home');
      await speed.press('ArrowRight');
      const currentSpeed = Number(await speed.inputValue());
      expect(currentSpeed).toBeGreaterThan(Number(await speed.getAttribute('min')));
      await expect(speed).toHaveAttribute('aria-valuetext', /Earth years per second/);
      await expect(page.locator('#orrery-playback-context')).toContainText('Mercury completes one orbit');
      await expect(page.locator('#orrery-playback-context')).toContainText('Earth yr/s');
      expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_speed)).toBeCloseTo(currentSpeed, 6);

      await page.getByRole('button', { name: 'Resume orbital clock', exact: true }).click();
      expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_paused)).toBe(false);
      await expect(page.locator('#orrery-live-timeline-value')).toHaveAttribute('aria-live', 'off');
      await page.getByRole('button', { name: 'Pause orbital clock', exact: true }).click();
      await expect(page.locator('#orrery-live-timeline-value')).toHaveAttribute('aria-live', 'polite');
      await assertLiveNodesRetained(page);

      await page.locator('.orr-evidence').getByRole('button', { name: 'Save orbital snapshot A for Mercury', exact: true }).click();
      const savedSnapshots = await page.evaluate(() => JSON.stringify((window as any).__toolData.solarSystem.orr_snapshots));
      expect(savedSnapshots).not.toBe('{}');
      const display = page.locator('#orrery-display-options');
      const summary = display.locator(':scope > summary');
      await expect(display).toHaveAttribute('open', '');
      await summary.focus();
      await summary.press('Enter');
      await expect(display).not.toHaveAttribute('open');
      await expectFocused(summary);
      await updateState(page, { orr_sel: 'earth' });
      await expect(display).not.toHaveAttribute('open');
      expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_displayOptionsOpen)).toBe(false);
      await summary.focus();
      await summary.press('Space');
      await expect(display).toHaveAttribute('open', '');
      await expectFocused(summary);
      expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_displayOptionsOpen)).toBe(true);

      await page.getByRole('button', { name: 'Reset orbit time, camera view, and selection', exact: true }).click();
      const reset = await page.evaluate(() => {
        const data = (window as any).__toolData.solarSystem;
        return { time: data.orr_time, zoom: data.orr_zoom, selected: data.orr_sel, follow: data.orr_follow,
          compare: data.orr_compare, snapshots: JSON.stringify(data.orr_snapshots) };
      });
      expect(reset).toEqual({ time: 0, zoom: 'full', selected: null, follow: null, compare: null, snapshots: savedSnapshots });

      const guide = page.locator('#orrery-guided-mission');
      await expect(guide).toHaveAttribute('aria-labelledby', /\S+/);
      const guideHeading = page.locator(`#${await guide.getAttribute('aria-labelledby')}`);
      await expect(guideHeading).toHaveJSProperty('tagName', 'H3');
      await expect(guideHeading).not.toHaveText('');
      await expect(guide.getByRole('list', { name: 'Guided mission progress' })).toBeVisible();
      await guide.getByRole('button', { name: 'Focus Mercury and pause', exact: true }).click();
      const wrong = guide.getByRole('button', { name: 'Near aphelion for Mercury speed zone', exact: true });
      const correct = guide.getByRole('button', { name: 'Near perihelion for Mercury speed zone', exact: true });
      await expect(wrong).toBeEnabled();
      await expect(correct).toBeEnabled();
      await wrong.click();
      await expect(page.locator('#orrery-guided-feedback')).toContainText('Not quite');
      await expect(wrong).toHaveAttribute('aria-describedby', /orrery-guided-feedback/);
      await assertReadableContrast(page);
      await correct.click();
      await expect(wrong).toHaveCount(0);
      await expect(correct).toHaveCount(0);
      const completedProgress = await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_progress);
      expect(Object.values(completedProgress as Record<string, { correct?: boolean }>).some((entry) => entry.correct)).toBe(true);
      await assertReadableContrast(page);
      await guide.getByRole('button', { name: /Next mission/i }).click();
      await expect(guide.getByRole('button', { name: 'Focus Mars and pause', exact: true })).toBeVisible();
      expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_idx)).toBe(2);
      expect(await page.evaluate(() => (window as any).__toolData.solarSystem.orr_mission_progress)).toEqual(completedProgress);
      await assertControlGeometry(page, width);
      await assertReadableContrast(page);
    });
  }
}
