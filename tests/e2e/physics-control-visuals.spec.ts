import { test, expect, Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 180_000, retries: 0 });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_physics.js', toolId: 'physics',
  width: 1100, height: 900, layout: 'document', appStyles: true,
});
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => harness.destroy(page));

const views = [
  ['vectors', 'showVectors'], ['energy', 'showEnergy'], ['guide', 'showLearn'],
  ['data', 'showFlightData'], ['formulas', 'showFormulas'], ['overlay', 'showOverlay'], ['graphs', 'showGraphs'],
] as const;
const parameters = [
  ['angle', '°', 35, 1], ['velocity', 'm/s', 25, 1], ['gravity', 'm/s²', 9.8, .1],
  ['mass', 'kg', 2, 1], ['launchHeight', 'm', 10, 1],
] as const;

async function mount(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    let id = 0, now = 1000;
    const frames = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = cb => { frames.set(++id, cb); return id; };
    window.cancelAnimationFrame = key => { frames.delete(key); };
    w.__tickControlPhysics = () => {
      now += 1000 / 60;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(now));
    };
  });
  await harness.mount(page, {}, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(document.getElementById('physicsCanvas') as any)?._launch, null, { polling: 20 });
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap') as HTMLElement;
    wrap.style.width = '100%';
    const main = document.createElement('main');
    wrap.parentNode!.insertBefore(main, wrap); main.appendChild(wrap);
    const card = document.createElement('div');
    main.insertBefore(card, wrap); card.appendChild(wrap);
    (window as any).__setControlTheme = (theme: string) => {
      const ctx = (window as any).__ctx;
      ctx.isDark = theme === 'dark'; ctx.isContrast = theme === 'contrast'; ctx.theme = theme;
      main.className = theme === 'default' ? '' : 'theme-' + theme;
      card.setAttribute('style', theme === 'dark'
        ? 'background:#fff;color:#0f172a;color-scheme:light;padding:10px;border-radius:10px'
        : theme === 'contrast' ? 'background:#000;color:#fff;padding:10px' : '');
      (window as any).__rerender();
    };
  });
  await redraw(page);
}

async function setState(page: Page, patch: object) {
  await page.evaluate(p => (window as any).__ctx.setToolData((prev: any) => ({
    ...prev, physics: { ...prev.physics, ...p },
  })), patch);
  await page.waitForTimeout(40);
}

async function redraw(page: Page) {
  await page.evaluate(() => {
    (document.getElementById('physicsCanvas') as any)._physScheduleFrame();
    (window as any).__tickControlPhysics();
  });
}

async function evidence(page: Page) {
  return page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    return { body: cv._ball, trails: cv._trails.map((trail: any) => ({
      points: [...trail], parameters: trail.parameters, apex: trail.apex, run: trail.run, modelVersion: trail.modelVersion,
    })), runLog: w.__toolData.physics.runLog, lastFlight: w.__toolData.physics.lastFlight };
  });
}

async function finish(page: Page) {
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    let ticks = 0;
    while (cv._launched && ticks++ < 10000) (window as any).__tickControlPhysics();
    if (cv._launched) throw new Error('The control fixture did not land');
  });
  await page.waitForFunction(() => (window as any).__toolData.physics.runLog?.length === 1, null, { polling: 20 });
  await setState(page, { simSpeed: 0 });
}

test('all seven view cards expose their state and support native keyboard toggles without changing recorded flight evidence', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await setState(page, {
    ...Object.fromEntries(views.map(([, field]) => [field, false])),
    angle: 5, velocity: 5, gravity: 25, launchHeight: 0, mass: 2, airResist: false, simSpeed: 1,
  });
  await page.locator('[data-physics-launch]').click();
  await finish(page);
  await redraw(page);
  const before = await evidence(page);
  await page.evaluate(() => {
    const w = window as any, cv = document.getElementById('physicsCanvas') as any;
    w.__controlCanvas = cv; w.__controlBody = cv._ball;
  });
  await expect(page.locator('[data-physics-view]')).toHaveCount(7);
  for (const [view, field] of views) {
    const button = page.locator(`[data-physics-view="${view}"]`);
    await expect(button).toHaveAttribute('type', 'button');
    await expect(button.locator('.phys-view-title svg')).toBeVisible();
    await expect(button.locator('.phys-view-title')).not.toHaveText('');
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button).toHaveAttribute('aria-label', /currently off\. Click to toggle\./);
    await expect(button.locator('.phys-view-state')).toContainText('OFF');
    await button.focus(); await button.press('Space');
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(button).toHaveAttribute('aria-label', /currently on\. Click to toggle\./);
    await expect(button.locator('.phys-view-state')).toContainText('ON');
    expect(await page.evaluate(key => (window as any).__toolData.physics[key], field)).toBe(true);
    await redraw(page);
    expect(await evidence(page)).toEqual(before);
    await button.press('Enter');
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect(button.locator('.phys-view-state')).toContainText('OFF');
    expect(await page.evaluate(key => (window as any).__toolData.physics[key], field)).toBe(false);
    await redraw(page);
    expect(await evidence(page)).toEqual(before);
    expect(await page.evaluate(() => {
      const w = window as any, cv = document.getElementById('physicsCanvas') as any;
      return cv === w.__controlCanvas && cv._ball === w.__controlBody;
    })).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('parameter cards show units, accept discrete keyboard changes, and keep mission locks explicit', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 35, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, simSpeed: 0 });
  await page.locator('[data-physics-launch]').click();
  await redraw(page);
  const captured = await evidence(page);
  await expect(page.locator('[data-physics-settings-heading]')).toBeVisible();
  await expect(page.locator('[data-physics-parameter-card]')).toHaveCount(5);
  for (const [key, unit, initial, step] of parameters) {
    const card = page.locator(`[data-physics-parameter-card="${key}"]`);
    const slider = card.locator(`[data-physics-parameter="${key}"]`);
    await expect(card.locator('[data-physics-parameter-unit]')).toHaveText(unit);
    await expect(slider).toHaveValue(String(initial));
    await expect(slider).toHaveAttribute('aria-valuetext', String(initial) + ' ' + unit);
    await expect(card).toHaveAttribute('data-locked', 'false');
    await slider.focus(); await slider.press('ArrowRight');
    const next = Number((initial + step).toFixed(1));
    await expect(slider).toHaveValue(String(next));
    await expect(slider).toHaveAttribute('aria-valuetext', String(next) + ' ' + unit);
    await expect(slider).toBeFocused();
    expect(await page.evaluate(field => (window as any).__toolData.physics[field], key)).toBe(next);
    await expect(card.locator('.phys-parameter-value')).toContainText(String(next));
  }
  await redraw(page);
  expect(await evidence(page)).toEqual(captured);
  const angle = page.locator('[data-physics-parameter="angle"]'), height = page.locator('[data-physics-parameter="launchHeight"]');
  await angle.focus(); await angle.press('Home');
  await expect(angle).toHaveValue('0');
  await height.focus(); await height.press('Home');
  await expect(height).toHaveValue('0');
  await expect(angle).toHaveValue('5');
  await expect(angle).toHaveAttribute('min', '5');
  await setState(page, { targetMode: true, targetConstraint: { type: 'fixedAngle', value: 40 } });
  await expect(angle).toHaveValue('40');
  await expect(angle).toBeDisabled();
  await expect(height).toBeDisabled();
  await expect(page.locator('[data-physics-parameter-card="angle"]')).toHaveAttribute('data-locked', 'true');
  await expect(page.locator('[data-physics-parameter-card="launchHeight"]')).toHaveAttribute('data-locked', 'true');
  await expect(page.locator('[data-physics-parameter="velocity"]')).toBeEnabled();
  await setState(page, { targetConstraint: { type: 'fixedVelocity', value: 30 } });
  await expect(page.locator('[data-physics-parameter="velocity"]')).toHaveValue('30');
  await expect(page.locator('[data-physics-parameter="velocity"]')).toBeDisabled();
  await expect(angle).toBeEnabled();
  await setState(page, { targetMode: false });
  await expect(page.locator('[data-physics-parameter-card][data-locked="true"]')).toHaveCount(0);
  await expect(height).toBeEnabled();
});

test('playback cells, gravity presets, and estimation input retain their keyboard behavior', async ({ page }) => {
  await mount(page);
  await setState(page, { angle: 35, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, simSpeed: 0 });
  await page.locator('[data-physics-launch]').click();
  await redraw(page);
  const captured = await evidence(page);
  for (const rate of [1, .5, .25, 0]) {
    const button = page.locator(`[data-physics-playback-rate="${rate}"]`);
    await button.focus(); await button.press('Space');
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-physics-playback-rate][aria-pressed="true"]')).toHaveCount(1);
    expect(await page.evaluate(() => (window as any).__toolData.physics.simSpeed)).toBe(rate);
    if (rate === 0) await expect(page.locator('[data-physics-step]')).toBeEnabled();
    else await expect(page.locator('[data-physics-step]')).toBeDisabled();
  }
  for (const gravity of [1.6, 3.7, 9.8]) {
    const preset = page.locator(`[data-gravity-preset="${gravity}"]`);
    await preset.focus(); await preset.press('Enter');
    await expect(preset).toBeFocused();
    await expect(preset).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-physics-parameter="gravity"]')).toHaveValue(String(gravity));
    await expect(page.locator('[data-physics-parameter-card="gravity"] [data-physics-parameter-unit]')).toHaveText('m/s²');
    expect(await page.evaluate(() => {
      const data = (window as any).__toolData.physics;
      return [data.angle, data.velocity, data.mass, data.launchHeight, data.airResist];
    })).toEqual([35, 25, 2, 10, false]);
  }
  const estimate = page.getByRole('spinbutton', { name: 'Estimated landing distance in meters', exact: true });
  await estimate.fill('42.5');
  await expect(estimate).toHaveValue('42.5');
  expect(await page.evaluate(() => (window as any).__toolData.physics.predictedRange)).toBe('42.5');
  await redraw(page);
  expect(await evidence(page)).toEqual(captured);
  await expect(page.locator('[data-physics-fullscreen]')).toHaveAttribute('aria-label', 'Fullscreen for the physics canvas');
});

test('fullscreen labels follow native events and CSS fallback while retaining the flight controller', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const w = window as any;
    w.__fullscreenMock = { element: null, requests: 0, exits: 0, reject: false };
    Object.defineProperties(document, {
      fullscreenElement: { configurable: true, get: () => w.__fullscreenMock.element },
      fullscreenEnabled: { configurable: true, get: () => true },
    });
    HTMLElement.prototype.requestFullscreen = function() {
      w.__fullscreenMock.requests++;
      if (w.__fullscreenMock.reject) return Promise.reject(new Error('Mock fullscreen permission rejection'));
      w.__fullscreenMock.element = this;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    };
    document.exitFullscreen = () => {
      w.__fullscreenMock.exits++;
      w.__fullscreenMock.element = null;
      document.dispatchEvent(new Event('fullscreenchange'));
      return Promise.resolve();
    };
  });
  await mount(page);
  await setState(page, { angle: 35, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 10, airResist: false, simSpeed: 0 });
  await page.locator('[data-physics-launch]').click();
  await redraw(page);
  const captured = await evidence(page);
  await page.evaluate(() => {
    const cv = document.getElementById('physicsCanvas') as any;
    (window as any).__fullscreenController = {
      canvas: cv, body: cv._ball, trails: cv._trails,
      launch: cv._launch, schedule: cv._physScheduleFrame, cleanup: cv._physCleanup,
    };
  });
  const button = page.locator('[data-physics-fullscreen]');
  const assertState = async (active: boolean, fallback = false) => {
    const label = active ? 'Exit fullscreen' : 'Fullscreen';
    await expect(button).toHaveAttribute('aria-label', label + ' for the physics canvas');
    await expect(button).toContainText(label);
    expect(await page.evaluate(() => !!(window as any).__toolData.physics.physFsMode)).toBe(fallback);
    await redraw(page);
    expect(await evidence(page)).toEqual(captured);
    expect(await page.evaluate(() => {
      const w = window as any, cv = document.getElementById('physicsCanvas') as any, saved = w.__fullscreenController;
      return cv === saved.canvas && cv._ball === saved.body && cv._trails === saved.trails &&
        cv._launch === saved.launch && cv._physScheduleFrame === saved.schedule && cv._physCleanup === saved.cleanup;
    })).toBe(true);
  };
  await assertState(false);
  await button.focus(); await button.press('Enter');
  await assertState(true);
  await expect(button).toBeFocused();
  expect(await page.evaluate(() => (window as any).__fullscreenMock.element?.id)).toBe('physics-fs-outer');
  await button.press('Enter');
  await assertState(false);
  await expect(button).toBeFocused();

  await button.press('Space');
  await assertState(true);
  // Escape in native fullscreen is controlled by the browser, which emits this event.
  await page.evaluate(() => {
    (window as any).__fullscreenMock.element = null;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
  await assertState(false);
  await page.evaluate(() => { (window as any).__fullscreenMock.reject = true; });
  await button.press('Enter');
  await assertState(true, true);
  await expect(page.locator('#physics-fs-outer')).toHaveCSS('position', 'fixed');
  await button.press('Enter');
  await assertState(false);
  await expect(page.locator('#physics-fs-outer')).toHaveCSS('position', 'relative');
  expect(await page.evaluate(() => {
    const mock = (window as any).__fullscreenMock;
    return { requests: mock.requests, exits: mock.exits, element: mock.element };
  })).toEqual({ requests: 3, exits: 1, element: null });
  expect(errors).toEqual([]);
});

test('the workbench and controls preserve readable grids, focus, and touch targets in nine layouts', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await mount(page);
  await setState(page, {
    angle: 35, velocity: 25, gravity: 9.8, mass: 2, launchHeight: 10, simSpeed: 0,
    showVectors: true, showEnergy: false, showLearn: true, showFlightData: false,
    showFormulas: false, showOverlay: true, showGraphs: false,
  });
  for (const width of [1100, 375, 320]) for (const theme of ['default', 'dark', 'contrast']) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(t => (window as any).__setControlTheme(t), theme);
    await page.waitForTimeout(40); await redraw(page);
    await expect(page.locator('#physics-fs-outer')).toHaveAttribute('data-physics-theme', theme === 'default' ? 'light' : theme);
    await expect(page.locator('[data-physics-workbench] .phys-scene #physicsCanvas')).toHaveCount(1);
    await expect(page.locator('[data-physics-workbench] [data-physics-sliders]')).toHaveCount(1);
    const layout = await page.evaluate(() => {
      const rect = (node: Element) => {
        const box = node.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width, height: box.height };
      };
      const one = (selector: string) => rect(document.querySelector(selector)!);
      const all = (selector: string) => [...document.querySelectorAll(selector)].map(rect);
      const roots = [...document.querySelectorAll('[data-physics-primary-controls],[data-physics-workbench],[data-physics-display-controls],[data-physics-playback],[data-physics-gravity-presets]')];
      const visible = (node: Element) => node.getClientRects().length > 0 && !node.closest('.sr-only,svg');
      const rgb = (color: string) => {
        const match = color.match(/^rgba?\(([^)]+)\)$/); if (!match) throw Error('Unresolved control color: ' + color);
        return match[1].split(',').map(Number);
      };
      const lum = (color: string) => rgb(color).slice(0, 3).map(value => {
        const unit = value / 255; return unit <= .04045 ? unit / 12.92 : ((unit + .055) / 1.055) ** 2.4;
      }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
      const text: Array<{ content: string; size: number; contrast: number }> = [];
      for (const root of roots) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const element = node.parentElement!;
          if (!node.textContent?.trim() || !visible(element) || element.closest('button:disabled')) continue;
          let background: string | null = null;
          for (let parent: Element | null = element; parent; parent = parent.parentElement) {
            const color = getComputedStyle(parent).backgroundColor, channels = rgb(color);
            if (channels.length === 3 || channels[3] >= .99) { background = color; break; }
          }
          if (!background) throw Error('Control text has no resolved surface');
          const style = getComputedStyle(element), ink = lum(style.color), surface = lum(background);
          text.push({ content: node.textContent.trim(), size: parseFloat(style.fontSize),
            contrast: (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05) });
        }
      }
      const controls = [...new Set(roots.flatMap(root => [...root.querySelectorAll('button,input')]))]
        .filter(node => visible(node) && !(node as HTMLInputElement).disabled).map(rect);
      return {
        viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
        primary: one('[data-physics-primary-controls]'), scene: one('[data-physics-workbench] .phys-scene'),
        settings: one('[data-physics-sliders]'), heading: one('[data-physics-settings-heading]'),
        secondary: one('[data-physics-controls]'), canvas: one('#physicsCanvas'),
        parameterCards: all('[data-physics-parameter-card]'), views: all('[data-physics-view]'),
        playback: all('[data-physics-playback-rate]'), presets: all('[data-gravity-preset]'), controls, text,
      };
    });
    const context = width + 'px ' + theme;
    expect(layout.scroll, context + ' page overflow').toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.primary.bottom, context + ' launch precedes scene').toBeLessThanOrEqual(layout.scene.top + 1);
    expect(layout.heading.bottom, context + ' heading precedes parameters').toBeLessThanOrEqual(layout.parameterCards[0].top + 1);
    expect(layout.canvas.width).toBeGreaterThan(160);
    expect(layout.secondary.top, context + ' controls follow settings').toBeGreaterThanOrEqual(layout.settings.bottom - 1);
    if (width === 1100) {
      expect(layout.scene.right, context + ' scene beside settings').toBeLessThanOrEqual(layout.settings.left + 1);
      expect(Math.abs(layout.scene.top - layout.settings.top), context + ' workbench alignment').toBeLessThanOrEqual(1);
      for (const rate of layout.playback) expect(Math.abs(rate.top - layout.playback[0].top)).toBeLessThanOrEqual(1);
    } else {
      expect(layout.settings.top, context + ' settings follow scene').toBeGreaterThanOrEqual(layout.scene.bottom - 1);
      expect(Math.abs(layout.parameterCards[0].top - layout.parameterCards[1].top)).toBeLessThanOrEqual(1);
      expect(Math.abs(layout.parameterCards[2].top - layout.parameterCards[3].top)).toBeLessThanOrEqual(1);
      expect(Math.abs(layout.parameterCards[4].left - layout.parameterCards[0].left)).toBeLessThanOrEqual(1);
      expect(Math.abs(layout.parameterCards[4].right - layout.parameterCards[1].right)).toBeLessThanOrEqual(1);
      for (const grid of [layout.views, layout.playback, layout.presets]) {
        expect(grid.length).toBeGreaterThanOrEqual(4);
        expect(Math.abs(grid[0].top - grid[1].top), context + ' first grid row').toBeLessThanOrEqual(1);
        expect(Math.abs(grid[2].top - grid[3].top), context + ' second grid row').toBeLessThanOrEqual(1);
        expect(grid[2].top, context + ' two columns').toBeGreaterThanOrEqual(grid[0].bottom);
        expect(Math.abs(grid[0].width - grid[1].width), context + ' equal grid cells').toBeLessThanOrEqual(1);
      }
    }
    expect(layout.playback).toHaveLength(4);
    for (const rate of layout.playback) expect(Math.abs(rate.width - layout.playback[0].width), context + ' consistent playback cells').toBeLessThanOrEqual(1);
    for (const box of [layout.scene, layout.settings, ...layout.controls]) {
      expect(box.left, context + ' left bound').toBeGreaterThanOrEqual(0);
      expect(box.right, context + ' right bound').toBeLessThanOrEqual(layout.viewport + 1);
    }
    expect(layout.controls.length).toBeGreaterThan(15);
    for (const control of layout.controls) {
      expect(control.width, context + ' touch width').toBeGreaterThanOrEqual(44);
      expect(control.height, context + ' touch height').toBeGreaterThanOrEqual(44);
    }
    expect(layout.text.length).toBeGreaterThan(30);
    for (const reading of layout.text) {
      expect(reading.size, context + ': ' + reading.content).toBeGreaterThanOrEqual(12);
      expect(reading.contrast, context + ': ' + reading.content).toBeGreaterThanOrEqual(theme === 'contrast' ? 7 : 4.5);
    }
    await page.keyboard.press('Tab');
    for (const selector of ['[data-physics-view="vectors"]', '[data-physics-parameter="angle"]', '[data-physics-fullscreen]']) {
      const control = page.locator(selector); await control.focus();
      await expect(control).toBeFocused();
      const focus = await control.evaluate(node => {
        const style = getComputedStyle(node); return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      expect(focus.style, context + ' focus outline').not.toBe('none');
      expect(focus.width, context + ' focus width').toBeGreaterThanOrEqual(2);
    }
  }
  expect(errors).toEqual([]);
});
