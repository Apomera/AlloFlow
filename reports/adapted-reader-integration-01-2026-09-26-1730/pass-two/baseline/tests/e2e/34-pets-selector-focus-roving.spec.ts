import { test, expect, type Locator, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1000,
  appStyles: true,
  probes: `
    window.__petsRenderCount = 0;
    var petsNativeRenderer = window.THREE.WebGLRenderer;
    window.THREE.WebGLRenderer = function () {
      var renderer = Reflect.construct(
        petsNativeRenderer,
        Array.prototype.slice.call(arguments),
        petsNativeRenderer
      );
      var petsNativeRender = renderer.render;
      renderer.render = function () {
        window.__petsRenderCount += 1;
        return petsNativeRender.apply(renderer, arguments);
      };
      return renderer;
    };
    window.THREE.WebGLRenderer.prototype = petsNativeRenderer.prototype;
  `,
});

async function stableRenderCount(page: Page): Promise<number> {
  let previous = -1;
  let stableSamples = 0;
  for (let sample = 0; sample < 30; sample += 1) {
    await page.waitForTimeout(100);
    const current = await page.evaluate(() => (window as any).__petsRenderCount);
    if (current === previous) stableSamples += 1;
    else stableSamples = 0;
    if (stableSamples >= 3) return current;
    previous = current;
  }
  throw new Error('Sensory renderer did not settle while reduced motion was active');
}

async function tabTo(page: Page, target: Locator, limit = 30) {
  for (let step = 0; step < limit; step += 1) {
    if (await target.evaluate((node) => node === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab did not reach ${await target.getAttribute('id') || 'the requested control'}`);
}

async function expectKeyboardFocusOnChoicePill(page: Page, input: Locator) {
  const id = await input.getAttribute('id');
  expect(id, 'choice input needs a stable label target').toBeTruthy();
  const label = page.locator(`label[for="${id}"]`);

  await expect(label).toHaveCount(1);
  await expect(label).toHaveClass(/(?:^|\s)petslab-choice-pill(?:\s|$)/);
  await tabTo(page, input);
  await expect(input).toBeFocused();
  await expect.poll(() => label.evaluate((node) => node.matches(':focus-within'))).toBe(true);

  const focusStyle = await label.evaluate((node) => {
    const style = getComputedStyle(node);
    const box = node.getBoundingClientRect();
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
      visibleWidth: Math.round(box.width),
      visibleHeight: Math.round(box.height),
    };
  });
  expect(focusStyle).toMatchObject({
    outlineStyle: 'solid',
    outlineWidth: '3px',
    outlineColor: 'rgb(251, 191, 36)',
    outlineOffset: '2px',
  });
  expect(focusStyle.visibleWidth).toBeGreaterThan(0);
  expect(focusStyle.visibleHeight).toBeGreaterThan(0);

  await page.keyboard.press('Tab');
  await expect.poll(() => label.evaluate((node) => node.matches(':focus-within'))).toBe(false);
  return await label.getAttribute('class');
}

test.describe('Pets Lab selector keyboard accessibility', () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('Pet Picker and Lifetime Cost show keyboard focus on their shared selector labels', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'picker',
        pickHousing: 'apartment',
        costSpecies: 'dog-large',
      },
    }, undefined, { expectCanvas: false });

    const focusCss = await page.locator('#allo-pets-focus-css').textContent();
    expect(focusCss).toContain('.petslab-choice-pill:focus-within');

    const pickerGroup = page.getByRole('radiogroup', { name: 'Housing type' });
    const pickerInput = pickerGroup.getByRole('radio', { name: 'Apartment / small' });
    const pickerClass = await expectKeyboardFocusOnChoicePill(page, pickerInput);

    await page.evaluate(() => {
      (window as any).__ctx.update('petsLab', 'view', 'cost');
    });
    await expect(page.locator('.petslab-view-title')).toContainText('Lifetime Cost & Commitment');
    await expect(page.locator('.petslab-view-title')).toBeFocused();

    const costGroup = page.getByRole('radiogroup', { name: 'Species' });
    const costInput = costGroup.getByRole('radio', { name: /Large dog/ });
    const costClass = await expectKeyboardFocusOnChoicePill(page, costInput);

    expect(costClass).toBe(pickerClass);
    expect(costClass).toBe('petslab-choice-pill');
  });

  test('Sensory species radios move selection and focus with every roving-navigation key', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'sensory',
        sensorySpecies: 'human',
        sensorySeen: { human: true, dog: true, cat: true },
      },
    }, undefined, { expectCanvas: false });

    const group = page.getByRole('radiogroup', { name: 'Whose eyes to see through' });
    const radios = group.getByRole('radio');
    await expect(radios).toHaveCount(3);

    async function expectRovingSelection(selectedId: 'human' | 'dog' | 'cat') {
      const selected = group.locator(`[data-pets-sensory-species="${selectedId}"]`);
      await expect(selected).toBeFocused();
      await expect(selected).toHaveAttribute('aria-checked', 'true');
      await expect(selected).toHaveAttribute('tabindex', '0');
      await expect.poll(() => radios.evaluateAll((nodes) => nodes.map((node) => ({
        id: node.getAttribute('data-pets-sensory-species'),
        checked: node.getAttribute('aria-checked'),
        tabIndex: (node as HTMLElement).tabIndex,
      })))).toEqual([
        { id: 'human', checked: selectedId === 'human' ? 'true' : 'false', tabIndex: selectedId === 'human' ? 0 : -1 },
        { id: 'dog', checked: selectedId === 'dog' ? 'true' : 'false', tabIndex: selectedId === 'dog' ? 0 : -1 },
        { id: 'cat', checked: selectedId === 'cat' ? 'true' : 'false', tabIndex: selectedId === 'cat' ? 0 : -1 },
      ]);
      await expect.poll(() => page.evaluate(() => (window as any).__toolData.petsLab.sensorySpecies))
        .toBe(selectedId);
    }

    const human = group.locator('[data-pets-sensory-species="human"]');
    await tabTo(page, human);
    await expectRovingSelection('human');

    const moves: Array<[string, 'human' | 'dog' | 'cat']> = [
      ['ArrowRight', 'dog'],
      ['ArrowDown', 'cat'],
      ['ArrowLeft', 'dog'],
      ['ArrowUp', 'human'],
      ['End', 'cat'],
      ['Home', 'human'],
    ];
    for (const [key, selectedId] of moves) {
      await page.keyboard.press(key);
      await expectRovingSelection(selectedId);
    }
  });

  test('Sensory radio arrows do not move the scene while focusable stage arrows do', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'sensory',
        sensoryActive: true,
        sensorySpecies: 'human',
        sensorySeen: { human: true, dog: true, cat: true },
        sensoryReduceMotion: true,
        _threeLoaded: true,
      },
    });

    await expect(page.locator('.petslab-sensory-stage canvas')).toHaveCount(1);
    const group = page.getByRole('radiogroup', { name: 'Whose eyes to see through' });
    const human = group.locator('[data-pets-sensory-species="human"]');
    const dog = group.locator('[data-pets-sensory-species="dog"]');
    await human.focus();
    await expect(human).toBeFocused();
    const beforeRadioArrow = await stableRenderCount(page);

    let radioArrowHeld = false;
    try {
      await page.keyboard.down('ArrowRight');
      radioArrowHeld = true;
      await expect(dog).toBeFocused();
      await expect(dog).toHaveAttribute('aria-checked', 'true');
      await expect.poll(() => page.evaluate(() => (
        (window as any).__toolData.petsLab.sensorySpecies
      ))).toBe('dog');

      const settledWhileRadioArrowHeld = await stableRenderCount(page);
      expect(settledWhileRadioArrowHeld).toBeGreaterThanOrEqual(beforeRadioArrow);
    } finally {
      if (radioArrowHeld) await page.keyboard.up('ArrowRight');
    }

    const stage = page.getByRole('region', { name: /Interactive 3D room/ });
    await stage.focus();
    await expect(stage).toBeFocused();
    const beforeStageArrow = await stableRenderCount(page);

    let stageArrowHeld = false;
    try {
      await page.keyboard.down('ArrowUp');
      stageArrowHeld = true;
      await expect.poll(() => page.evaluate(() => (window as any).__petsRenderCount))
        .toBeGreaterThan(beforeStageArrow + 2);
    } finally {
      if (stageArrowHeld) await page.keyboard.up('ArrowUp');
    }
    await stableRenderCount(page);
  });
});
