import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const labs = [
  { id: 'heatLab', label: 'Heat & Thermodynamics Lab', marker: '[data-heat-lab]', file: 'stem_lab/stem_tool_heatlab.js' },
  { id: 'nuclearLab', label: 'Nuclear & Radiation Lab', marker: '[data-nuclear-lab]', file: 'stem_lab/stem_tool_nuclearlab.js' },
];

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'phone', width: 390, height: 844 },
];

for (const viewport of viewports) {
  test('Heat and Nuclear labs open, recover, and render in the local app on ' + viewport.name, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const failedOnce = new Map(labs.map((lab) => [lab.id, false]));

    // Register both failures before boot. The STEAM loader may start fetching
    // either plugin as soon as its card is hovered or focused.
    for (const lab of labs) {
      const source = fs.readFileSync(path.join(process.cwd(), lab.file), 'utf8');
      await page.route('**/' + lab.file + '*', async (route) => {
        if (!failedOnce.get(lab.id)) {
          failedOnce.set(lab.id, true);
          await route.abort('failed');
          return;
        }
        await route.fulfill({ status: 200, contentType: 'application/javascript', body: source });
      });
    }

    await test.step('Open STEAM Lab from Learning Tools', async () => {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const pathwayChooser = page.getByRole('region', { name: 'Choose how to use AlloFlow' });
      await expect(pathwayChooser).toBeVisible({ timeout: 120000 });
      const learningTools = pathwayChooser.getByRole('button', { name: 'Learning Tools', exact: true });
      await expect(learningTools).toBeVisible();
      await learningTools.evaluate((element) => {
        window.setTimeout(() => (element as HTMLElement).click(), 0);
      });
      await expect(pathwayChooser).toBeHidden({ timeout: 60000 });
      const learningHub = page.getByRole('dialog', { name: 'Learning Tools' });
      await expect(learningHub).toBeVisible({ timeout: 30000 });
      const stemTile = learningHub.locator('[data-hub-id="stem-lab"] [data-hub-launch="true"]');
      await expect(stemTile).toBeVisible({ timeout: 30000 });
      await stemTile.evaluate((element) => {
        window.setTimeout(() => (element as HTMLElement).click(), 0);
      });
      await expect(learningHub).toBeHidden({ timeout: 60000 });
      await expect(page.locator('[data-stem-lab="true"]')).toBeVisible({ timeout: 30000 });
      await expect(pathwayChooser).toBeHidden();
    });

    const stemDialog = page.locator('[data-stem-lab="true"]');

    async function exerciseLab(lab: (typeof labs)[number]) {
      const toolTile = stemDialog.locator('[data-stem-tool-id="' + lab.id + '"]');
      await expect(toolTile).toBeVisible({ timeout: 30000 });
      await toolTile.evaluate((element) => {
        window.setTimeout(() => (element as HTMLElement).click(), 0);
      });

      const retry = page.getByRole('button', { name: 'Retry loading ' + lab.label });
      await expect(retry).toBeVisible({ timeout: 30000 });
      await retry.focus();
      await expect(retry).toBeFocused();
      await retry.click();
      const labRoot = page.locator(lab.marker);
      await expect(labRoot).toBeVisible({ timeout: 30000 });
      await expect(labRoot.getByRole('heading').filter({ hasText: lab.label }).first()).toBeVisible();

      const dialog = stemDialog;
      const shell = dialog.locator('.stem-lab-modal-shell');
      const scrollRegion = dialog.locator('[data-stem-scroll-region="true"]');
      await expect(dialog).toBeVisible();
      await expect(scrollRegion).toHaveCount(1);
      await expect(scrollRegion).toHaveAttribute('role', 'region');
      await expect(scrollRegion).toHaveAttribute('tabindex', '0');
      await expect(scrollRegion).toHaveAttribute('data-stem-scroll-contract', 'vertical');

      const toolbar = dialog.locator('.stem-active-toolbar');
      await expect(toolbar).toBeVisible();
      const toolbarBox = await toolbar.boundingBox();
      const initialScrollBox = await scrollRegion.boundingBox();
      expect(toolbarBox).not.toBeNull();
      expect(initialScrollBox).not.toBeNull();
      expect(toolbarBox!.y + toolbarBox!.height).toBeLessThanOrEqual(initialScrollBox!.y + 1);
      const backButton = toolbar.getByRole('button', { name: 'Back to all STEAM Lab tools' });
      await expect(backButton).toBeVisible();
      const backButtonOwnsCenterPoint = await backButton.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return hit === button || button.contains(hit);
      });
      expect(backButtonOwnsCenterPoint).toBe(true);

      const computedScrollContract = await scrollRegion.evaluate((element) => {
        const region = element as HTMLElement;
        const style = getComputedStyle(region);
        return {
          clientHeight: region.clientHeight,
          overflowY: style.overflowY,
          flexGrow: style.flexGrow,
          flexBasis: style.flexBasis,
          touchAction: style.touchAction,
        };
      });
      expect(computedScrollContract.clientHeight).toBeGreaterThan(0);
      expect(computedScrollContract.overflowY).toBe('auto');
      expect(computedScrollContract.flexGrow).toBe('1');
      expect(computedScrollContract.flexBasis).toBe('0%');
      expect(computedScrollContract.touchAction).toContain('pan-y');

      // Exercise the real workspace content. A synthetic spacer used to make
      // this test pass even though active tools were rendered as siblings of
      // the scroll region and clipped by the modal shell.
      const regionOwnsLab = await labRoot.evaluate((element) => {
        const region = element.closest('[data-stem-scroll-region="true"]');
        return !!region && region.getAttribute('data-stem-scroll-contract') === 'vertical';
      });
      expect(regionOwnsLab).toBe(true);

      const naturalOverflow = await scrollRegion.evaluate((element) => {
        const region = element as HTMLElement;
        return {
          clientHeight: region.clientHeight,
          scrollHeight: region.scrollHeight,
        };
      });
      expect(naturalOverflow.scrollHeight).toBeGreaterThan(naturalOverflow.clientHeight);

      // Overflow belongs to the inner workspace, not the locked modal shell.
      const shellOverflow = await shell.evaluate((element) => {
        const shellElement = element as HTMLElement;
        return {
          clientHeight: shellElement.clientHeight,
          scrollHeight: shellElement.scrollHeight,
        };
      });
      expect(shellOverflow.scrollHeight).toBeLessThanOrEqual(shellOverflow.clientHeight + 1);

      await scrollRegion.evaluate((element) => ((element as HTMLElement).scrollTop = 0));
      const scrollBox = await scrollRegion.boundingBox();
      expect(scrollBox).not.toBeNull();
      if (viewport.name === 'desktop') {
        await page.mouse.move(
          scrollBox!.x + scrollBox!.width - 16,
          scrollBox!.y + Math.min(120, scrollBox!.height / 2),
        );
        await page.mouse.wheel(0, 500);
        await expect.poll(() => scrollRegion.evaluate((element) => (element as HTMLElement).scrollTop)).toBeGreaterThan(0);
      } else {
        // A resized desktop page is not a mobile interaction test. Send a
        // trusted Chromium touch sequence and verify that the browser itself
        // scrolls the real tool workspace.
        const cdp = await page.context().newCDPSession(page);
        try {
          await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
          await scrollRegion.evaluate((element) => {
            element.setAttribute('data-stem-touch-seen', 'false');
            element.addEventListener('touchstart', (event) => {
              element.setAttribute('data-stem-touch-seen', event.isTrusted ? 'trusted' : 'untrusted');
            }, { once: true, capture: true });
          });
          const x = Math.round(scrollBox!.x + scrollBox!.width - 16);
          const startY = Math.round(scrollBox!.y + scrollBox!.height * 0.78);
          const endY = Math.round(scrollBox!.y + scrollBox!.height * 0.22);
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y: startY, radiusX: 4, radiusY: 4, force: 1 }],
          });
          for (let step = 1; step <= 8; step += 1) {
            const y = Math.round(startY + ((endY - startY) * step) / 8);
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y, radiusX: 4, radiusY: 4, force: 1 }],
            });
            await page.waitForTimeout(24);
          }
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await expect(scrollRegion).toHaveAttribute('data-stem-touch-seen', 'trusted');
          await expect.poll(() => scrollRegion.evaluate((element) => (element as HTMLElement).scrollTop)).toBeGreaterThan(0);
        } finally {
          await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false }).catch(() => {});
          await cdp.detach();
        }
      }

      await scrollRegion.evaluate((element) => ((element as HTMLElement).scrollTop = 0));
      await scrollRegion.focus();
      await page.keyboard.press('PageDown');
      await expect.poll(() => scrollRegion.evaluate((element) => (element as HTMLElement).scrollTop)).toBeGreaterThan(0);
      await scrollRegion.evaluate((element) => ((element as HTMLElement).scrollTop = 0));

      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');

      const bounds = await shell.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(-1);
      expect(bounds!.y).toBeGreaterThanOrEqual(-1);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height + 1);

      const slider = labRoot.getByRole('slider').first();
      await expect(slider).toBeVisible();
      await expect(slider).toHaveAccessibleName(/.+/);
      const before = await slider.inputValue();
      const maximum = Number(await slider.getAttribute('max'));
      await slider.press(Number(before) >= maximum ? 'ArrowLeft' : 'ArrowRight');
      await expect.poll(() => slider.inputValue()).not.toBe(before);

      await dialog.focus();
      await expect(dialog).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect.poll(() => page.evaluate(() => {
        const root = document.querySelector('[data-stem-lab="true"]');
        return !!root && root.contains(document.activeElement);
      })).toBe(true);

      expect(failedOnce.get(lab.id)).toBeTruthy();
    }

    await test.step('Heat & Thermodynamics Lab recovery and interaction checks', async () => {
      await exerciseLab(labs[0]);
    });

    await test.step('Back to all STEAM Lab tools', async () => {
      await stemDialog.getByRole('button', { name: 'Back to all STEAM Lab tools' }).click();
      await expect(page.locator(labs[0].marker)).toHaveCount(0);
      await expect(stemDialog.locator('[data-stem-tool-id="' + labs[1].id + '"]')).toBeVisible({ timeout: 30000 });
      expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    });

    await test.step('Nuclear & Radiation Lab recovery and interaction checks', async () => {
      await exerciseLab(labs[1]);
      await stemDialog.getByRole('button', { name: 'Back to all STEAM Lab tools' }).click();
      await expect(page.locator(labs[1].marker)).toHaveCount(0);
      await page.getByRole('button', { name: 'Close STEAM Lab' }).click();
      await expect(stemDialog).toHaveCount(0);
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    });
  });
}
