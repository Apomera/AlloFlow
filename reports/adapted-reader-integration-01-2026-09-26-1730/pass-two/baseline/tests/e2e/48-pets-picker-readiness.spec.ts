import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1700,
  appStyles: true,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

type ToolWindow = Window & { __toolData: { petsLab: Record<string, any> } };
const readPets = (page: any) => page.evaluate(() => (window as unknown as ToolWindow).__toolData.petsLab);

const READINESS = ['housing', 'caregiver', 'budget', 'backup'];

// The readiness boxes have their own ids; the picker also has unrelated
// checkboxes (allergies), so a generic getByRole('checkbox') picks the wrong one.
const readyBox = (page: any, id: string) => page.locator('#pets-picker-ready-' + id);

async function tickAll(page: any) {
  for (const id of READINESS) await readyBox(page, id).check();
}

test.describe('Pets Picker — readiness gates completion', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('reading a ranking is not enough to complete the module', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'picker' } }, undefined, { expectCanvas: false });

    // The model still says what it is.
    await expect(page.locator('.petslab-species-view, body'))
      .toContainText('a question to investigate, not a pet recommendation');
    await expect(page.locator('.petslab-activity-completion-hint')).toBeVisible();
    await expect(page.locator('.petslab-complete-button')).toHaveCount(0);
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
  });

  test('confirming every readiness item completes it, scorelessly', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'picker',
        pickReadiness: { housing: true, caregiver: true, budget: true },
      },
    }, undefined, { expectCanvas: false });

    // Three of four restored: not complete yet.
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);

    // Tick the fourth.
    await readyBox(page, 'backup').check();

    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
    const state = await readPets(page);
    expect(state.modulesCompleted.picker.reason).toBe('Confirmed every readiness item');

    const row = state.evidenceRecords.filter((r: any) => r.moduleId === 'picker').pop();
    expect(row.kind).toBe('activity');
    expect(row.details).toMatchObject({ answered: 4, total: 4 });
    // The fit score is decision support, never a verdict.
    expect(row.details.criterionMet).toBeUndefined();
    expect(row.details.score).toBeUndefined();
  });

  test('unticking an item afterwards does not erase the record', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'picker',
        pickReadiness: { housing: true, caregiver: true, budget: true, backup: true },
        modulesCompleted: {
          picker: { completed: '2026-09-15T10:00:00.000Z', reason: 'Confirmed every readiness item' },
        },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');

    // Change of mind about the household is not a reason to erase the record.
    await readyBox(page, 'budget').uncheck();
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');
  });

  test('a corrupt restored readiness map heals instead of unlocking', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'picker',
        pickReadiness: { housing: 'yes', notAnItem: true, caregiver: true },
      },
    }, undefined, { expectCanvas: false });

    // Only `caregiver` is a real true; the string and the unknown key are dropped.
    await expect(page.locator('.petslab-complete-status')).toHaveCount(0);
    const checked = await page.locator('[id^="pets-picker-ready-"]').evaluateAll((boxes) =>
      boxes.filter((b) => (b as HTMLInputElement).checked).length);
    expect(checked).toBe(1);
  });

  test('no axe violations before or after confirming readiness', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'picker' } }, undefined, { expectCanvas: false });
    const before = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(before.violations.map((v: any) => v.id)).toEqual([]);

    await tickAll(page);
    await expect(page.locator('.petslab-complete-status')).toContainText('Complete');

    const after = await page.evaluate(async () => (window as any).axe.run('#wrap', { resultTypes: ['violations'] }));
    expect(after.violations.map((v: any) => v.id)).toEqual([]);
  });
});
