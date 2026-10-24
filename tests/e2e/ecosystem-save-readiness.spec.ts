import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

// Data-only regression: genuine current records seed one working encounter,
// then all revisions, returns, checks, saves and reopening use real controls.
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_ecosystem.js', toolId: 'ecosystem', width: 1100, height: 900, appStyles: true,
  probes: `window.THREE=undefined;window.StemLab.ensureThree=function(){return Promise.reject(new Error('Renderer deferred for save-readiness regression'));};`,
});
test.describe.configure({ timeout: 180_000, retries: 0 });
test.beforeAll(async () => harness.start());
test.afterAll(async () => harness.stop());
test.afterEach(async ({ page }) => {
  expect(await page.evaluate(() => (window as any).__events?.errors || [])).toEqual([]);
  expect(await harness.glContexts(page), 'the save-readiness workflow creates no WebGL context').toEqual([]);
  await harness.destroy(page);
});
async function mount(page: Page, foodWeb: any = { showMeadow: false }) {
  await page.setViewportSize({ width: 1140, height: 1050 });
  await harness.mount(page, { ecosystem: { tab: 'foodweb', tutorialDismissed: true, foodWeb } }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    document.body.className = 'theme-default';
    document.getElementById('wrap')!.style.cssText = 'width:100%;height:auto;display:block;padding:16px;background:white';
  });
}
async function notes(page: Page) { return page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook || []); }

test('submitted ruler and headline revisions cannot disappear on save, while unfinished optional sheets stay optional', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = api.normalize(w.__toolData.ecosystem.foodWeb.run.config);
    const pair = api.compare(config), frames = api.behaviorTimeline(config, pair.experiment), encounter = api.encounters(frames, config).find((item: any) => item.kind === 'spacing');
    if (!encounter) throw new Error('Rabbit neighbors did not provide its current spacing encounter');
    const steps = [encounter.before, encounter.step, encounter.after], alternateSteps = [encounter.before + 1, encounter.step, encounter.after];
    const measured = api.pairEvidence(frames, encounter, steps), alternate = api.pairEvidence(frames, encounter, alternateSteps), trial = api.headlineTrial(frames, encounter);
    if (!measured || !alternate || !trial) throw new Error('The recorded pair cannot supply both genuine ruler sample sets and a headline trial');
    const pins = [encounter.before + 1, encounter.before + 2, encounter.before + 3], sorts = pins.map(step => api.headlineInterval(trial, step).classification);
    const firstClaim = measured.trend === 'steady' ? 'mixed' : 'steady', revisedClaim = ['closer', 'farther', 'mixed', 'steady'].find(value => value !== measured.trend && value !== firstClaim)!;
    const firstSorts = sorts.map((value: string) => value === 'supports' ? 'challenges' : 'supports');
    return {
      encounter, steps, alternateSteps, originalTrend: measured.trend, alternateTrend: alternate.trend, firstClaim, revisedClaim, firstSorts, sorts,
      foodWeb: { ...config, run: { config, prediction: 'Original population prediction.' }, showMeadow: true, cursor: encounter.step, focus: encounter.actor.id, notebook: [], notebookSequence: 0,
        fieldwork: { key: JSON.stringify(config) + '|experiment', id: encounter.id, forecast: 'avoid', revealed: true, reflection: 'Own encounter evidence.', limit: 'Illustrative scene gaps do not establish capture.', saved: false,
          measurement: { open: false, steps, claim: measured.trend, firstClaim, checked: true, reflection: 'Original pair reflection.' },
          headline: { open: false, started: true, draftStep: pins[0], visited: [...new Set(pins.flatMap(step => [step - 1, step]))], pins, sorts, firstSorts, verdict: 'challenged', firstVerdict: 'supported', checked: true, reflection: 'Original headline reflection.' }
        }
      }
    };
  });
  await harness.destroy(page); await mount(page, fixture.foodWeb);
  const fieldwork = page.locator('[data-efw-fieldwork]'), ready = fieldwork.locator('[data-efw-save-readiness]');
  const ruler = fieldwork.locator('[data-efw-pair-lab]'), headline = fieldwork.locator('[data-efw-headline-trial]');
  const save = fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true });
  const source = fieldwork.locator('[data-efw-inference]');
  await expect(ready.locator('[data-efw-save-sheet="ruler"]')).toHaveAttribute('data-status', 'included');
  await expect(ready.locator('[data-efw-save-sheet="headline"]')).toHaveAttribute('data-status', 'included');
  await expect(save).toBeEnabled();
  // Opening and partly answering a never-submitted optional sheet must not
  // turn it into a requirement, nor imply that it will be saved.
  await source.locator('summary').press('Enter');
  await source.getByLabel('Evidence statement 1 source', { exact: true }).selectOption('scene');
  await expect(ready.locator('[data-efw-save-sheet="inference"]')).toHaveAttribute('data-status', 'optional');
  await expect(save).toBeEnabled(); await save.click();
  const original = (await notes(page))[0], frozenOriginal = JSON.stringify(original);
  expect(original.sighting.inference).toBeUndefined();
  expect(original.sighting.measurement.firstClaim).toBe(fixture.firstClaim);
  expect(original.sighting.headline.firstSorts).toEqual(fixture.firstSorts);
  await page.getByRole('button', { name: 'Reopen observation ' + original.id, exact: true }).click();

  // A revised checked ruler claim must block the parent save, even when its
  // details are collapsed, and keyboard Return must restore a usable focus.
  await ruler.getByLabel('Pair gap claim', { exact: true }).selectOption(fixture.revisedClaim);
  await expect(save).toBeDisabled(); await expect(ready).toContainText('Recheck the revised pair measurements');
  await ready.screenshot({ path: (process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-ears-save-readiness') + '/save-summary-desktop.jpg', type: 'jpeg', quality: 88 });
  await ruler.locator('summary').press('Enter'); await expect(ruler).not.toHaveAttribute('open', '');
  await ready.getByRole('button', { name: 'Return to pair measurements', exact: true }).press('Enter');
  await expect(ruler).toHaveAttribute('open', ''); await expect(ruler.getByLabel('Pair gap claim', { exact: true })).toBeFocused();
  expect((await notes(page)).length).toBe(1);
  await ruler.getByRole('button', { name: 'Check my gap evidence', exact: true }).click();
  await expect(save).toBeEnabled(); await save.click();
  const claimRevision = (await notes(page)).at(-1), frozenClaimRevision = JSON.stringify(claimRevision);
  expect(claimRevision.sighting.measurement).toMatchObject({ firstClaim: fixture.firstClaim, claim: fixture.revisedClaim });
  expect(claimRevision.sighting.headline.firstSorts).toEqual(fixture.firstSorts);
  await page.getByRole('button', { name: 'Reopen observation ' + claimRevision.id, exact: true }).click();

  // Replacing the submitted sample basis clears its old first claim, but the
  // pending attempt must remain visible until the new evidence is checked.
  await ruler.getByRole('button', { name: 'Clear sample B', exact: true }).click();
  await expect(save).toBeDisabled(); await expect(ready.locator('[data-efw-save-sheet="ruler"]')).toHaveAttribute('data-status', 'pending');
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.measurement)).toMatchObject({ firstClaim: '', checked: false, revisionPending: true });
  await ruler.locator('summary').press('Enter');
  await ready.getByRole('button', { name: 'Return to pair measurements', exact: true }).press('Enter');
  await expect(ruler.getByLabel('Pair measurement time', { exact: true })).toBeFocused();
  await ruler.getByLabel('Pair measurement time', { exact: true }).fill(String(fixture.steps[1]));
  await ruler.getByRole('button', { name: 'Record current sample as B', exact: true }).click();
  await ruler.getByLabel('Pair measurement time', { exact: true }).fill(String(fixture.alternateSteps[0]));
  await ruler.getByRole('button', { name: 'Record current sample as A', exact: true }).click();
  await expect(save).toBeDisabled();
  await ruler.getByLabel('Pair gap claim', { exact: true }).selectOption(fixture.alternateTrend);
  await ruler.getByRole('button', { name: 'Check my gap evidence', exact: true }).press('Enter');
  await expect(save).toBeEnabled();

  // The headline uses the same submitted-revision contract and retains its
  // original verdict and sorting when only the latest answers change.
  await headline.getByRole('button', { name: 'I need more evidence', exact: true }).click();
  await expect(save).toBeDisabled();
  const revisedSort = fixture.sorts[0] === 'supports' ? 'challenges' : 'supports';
  await headline.locator('[data-efw-headline-card="0"]').getByRole('button', { name: revisedSort === 'supports' ? 'Supports headline' : 'Challenges headline', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await ready.screenshot({ path: (process.env.ECOLOGY_REPORT_DIR || 'reports/ecosystem-ears-save-readiness') + '/save-summary-mobile.jpg', type: 'jpeg', quality: 88 });
  await headline.locator('summary').first().press('Enter');
  await ready.getByRole('button', { name: 'Return to headline evidence', exact: true }).press('Enter');
  await expect(headline).toHaveAttribute('open', '');
  await expect(headline.getByRole('group', { name: 'Headline verdict', exact: true }).getByRole('button').first()).toBeFocused();
  expect((await notes(page)).length).toBe(2);
  await headline.getByRole('button', { name: 'Check revised evidence case', exact: true }).click();
  await expect(save).toBeEnabled(); await save.click();
  const changedBasis = (await notes(page)).at(-1);
  expect(changedBasis.sighting.measurement.samples.map((sample: any) => sample.step)).toEqual(fixture.alternateSteps);
  expect(changedBasis.sighting.measurement).toMatchObject({ firstClaim: fixture.alternateTrend, claim: fixture.alternateTrend });
  expect(changedBasis.sighting.headline).toMatchObject({ firstSorts: fixture.firstSorts, firstVerdict: 'supported', verdict: 'unsure' });
  expect(changedBasis.sighting.headline.sorts[0]).toBe(revisedSort);
  expect(JSON.stringify((await notes(page))[0])).toBe(frozenOriginal); expect(JSON.stringify((await notes(page))[1])).toBe(frozenClaimRevision);
  await page.getByRole('button', { name: 'Reopen observation ' + changedBasis.id, exact: true }).click();
  await expect(ready.locator('[data-efw-save-sheet="ruler"]')).toHaveAttribute('data-status', 'included');
  await expect(ruler.getByLabel('Pair gap claim', { exact: true })).toHaveValue(fixture.alternateTrend);
  expect(await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.fieldwork.headline.firstSorts)).toEqual(fixture.firstSorts);

  // Deliberately starting a new optional sheet is an explicit way to omit it;
  // it must never alter the already frozen observations.
  await ruler.getByRole('button', { name: 'Clear sample A', exact: true }).click(); await expect(save).toBeDisabled();
  await ruler.getByRole('button', { name: 'Start a new ruler sheet', exact: true }).press('Enter');
  await expect(ready.locator('[data-efw-save-sheet="ruler"]')).toHaveAttribute('data-status', 'optional'); await expect(save).toBeEnabled();
  await save.click();
  const all = await notes(page), intentionalOmission = all.at(-1);
  expect(intentionalOmission.sighting.measurement).toBeUndefined(); expect(intentionalOmission.sighting.headline.firstSorts).toEqual(fixture.firstSorts);
  expect(JSON.stringify(all[0])).toBe(frozenOriginal); expect(JSON.stringify(all[1])).toBe(frozenClaimRevision);
  await test.info().attach('save-readiness-frozen-history', { body: JSON.stringify({ observations: all.length, originalFirstClaim: original.sighting.measurement.firstClaim, revisedFirstClaim: claimRevision.sighting.measurement.firstClaim, newBasisFirstClaim: changedBasis.sighting.measurement.firstClaim, headlineFirstSorts: changedBasis.sighting.headline.firstSorts }), contentType: 'application/json' });
});

// Both controlled details must remain open after native toggle events settle.
test('keyboard Return to checkpoint pins keeps both controlled details open and preserves original answers', async ({ page }) => {
  await mount(page);
  await page.getByRole('button', { name: 'Rabbit neighbors', exact: true }).click();
  await page.getByRole('button', { name: 'Run food-web comparison', exact: true }).click();
  const fixture = await page.evaluate(() => {
    const w = window as any, api = w.StemLab.ecosystemFoodWeb, config = api.normalize(w.__toolData.ecosystem.foodWeb.run.config);
    const pair = api.compare(config), frames = api.behaviorTimeline(config, pair.experiment), encounter = api.encounters(frames, config).find((item: any) => item.kind === 'spacing');
    if (!encounter) throw new Error('Missing genuine recorded spacing encounter');
    const trial = api.inferenceTrial(frames, encounter, 'experiment');
    if (!trial) throw new Error('Missing original three-checkpoint inference trial');
    const codes = api.inferenceClaims(trial).map((card: any) => card.category), firstCodes = codes.map(() => 'unsupported');
    const firstPins = [trial.step], pins = [trial.before, trial.after];
    return { trial, codes, firstCodes, firstPins, pins, foodWeb: { ...config, run: { config, prediction: 'Original population prediction.' }, showMeadow: true, cursor: encounter.step, focus: encounter.actor.id, notebook: [], notebookSequence: 0,
      fieldwork: { key: JSON.stringify(config) + '|experiment', id: encounter.id, forecast: 'avoid', revealed: true, reflection: 'Own encounter explanation.', limit: 'Recorded labels do not establish a capture.', saved: false,
        inference: { open: false, trial, visited: [trial.before, trial.step, trial.after], codes, firstCodes, checked: true, reflection: 'Original source reflection.',
          link: { version: 1, trialId: trial.id, trialKey: JSON.stringify(trial), claimId: 'checkpoints', open: false, pins, firstPins, checked: false, reflection: 'I revised my evidence from only the encounter to both endpoints.' }
        }
      }
    } };
  });
  await harness.destroy(page); await mount(page, fixture.foodWeb);
  const fieldwork = page.locator('[data-efw-fieldwork]'), source = fieldwork.locator('[data-efw-inference]');
  const link = source.locator('[data-efw-evidence-link]'), ready = fieldwork.locator('[data-efw-save-readiness]');
  const save = fieldwork.getByRole('button', { name: 'Save wildlife observation', exact: true });
  await expect(source).not.toHaveAttribute('open', ''); await expect(link).not.toHaveAttribute('open', '');
  await expect(save).toBeDisabled();
  await ready.getByRole('button', { name: 'Return to checkpoint pins', exact: true }).press('Enter');
  await expect(source).toHaveAttribute('open', ''); await expect(link).toHaveAttribute('open', '');
  await expect(link.getByLabel('Pin Before checkpoint', { exact: true })).toBeFocused();
  // Give native toggle events a full round trip and verify controlled state,
  // rather than checking only a transient native-details DOM property.
  await expect.poll(() => page.evaluate(() => {
    const s = (window as any).__toolData.ecosystem.foodWeb.fieldwork.inference;
    return { open: s.open, linkOpen: s.link.open, firstPins: s.link.firstPins, checked: s.link.checked };
  })).toEqual({ open: true, linkOpen: true, firstPins: fixture.firstPins, checked: false });
  await link.getByRole('button', { name: 'Check revised checkpoint pins', exact: true }).press('Enter');
  await expect(save).toBeEnabled(); await save.click();
  const saved = await page.evaluate(() => (window as any).__toolData.ecosystem.foodWeb.notebook.at(-1));
  expect(saved.sighting.inference).toMatchObject({ codes: fixture.codes, firstCodes: fixture.firstCodes, link: { trialKey: JSON.stringify(fixture.trial), pins: fixture.pins, firstPins: fixture.firstPins } });
  const frozen = JSON.stringify(saved);
  await page.getByRole('button', { name: 'Reopen observation ' + saved.id, exact: true }).click();
  await expect(source).toHaveAttribute('open', ''); await expect(link).toHaveAttribute('open', '');
  await expect(link.getByLabel('Pin Before checkpoint', { exact: true })).toBeChecked();
  await expect(link.getByLabel('Pin Encounter checkpoint', { exact: true })).not.toBeChecked();
  await expect(link.getByLabel('Pin After checkpoint', { exact: true })).toBeChecked();
  expect(await page.evaluate(() => JSON.stringify((window as any).__toolData.ecosystem.foodWeb.notebook[0]))).toBe(frozen);
});
