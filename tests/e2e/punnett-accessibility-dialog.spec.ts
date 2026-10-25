import { test, expect, type Locator, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GlHarness } from './helpers/stem_gl_harness';

test.use({ video: 'off', trace: 'off' });
test.describe.configure({ retries: 0, timeout: 240000 });
const output = resolve(process.env.PUNNETT_A11Y_REPORT || 'reports/punnett-wcag-20261024');
const harness = new GlHarness({ toolId: 'punnett', toolFile: 'stem_lab/stem_tool_punnett.js',
  width: 1120, height: 900, appStyles: true, layout: 'document' });
const root = '[data-punnett-tool]';
const content = '[data-punnett-content]';
const dialog = '[data-punnett-vocab-dialog]';
const dna = '[data-punnett-dna-lab]';
const siblingLearning = { notes: ['A learner observation remains saved.'], complete: false };

test.beforeAll(async () => { mkdirSync(output, { recursive: true }); await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

async function setup(page: Page, subtool: string, extra: Record<string, unknown> = {}) {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await harness.mount(page, { punnett: { subtool, _chalDiff: 'easy', _chalIdx: 0,
    parent1: 'Aa', parent2: 'aa', researchPoints: 17, _dnaSeq: 'ATGAAATAA',
    learnerNotes: 'Keep the evidence from my earlier crosses.', _visited: { [subtool]: true }, ...extra },
    ecology: siblingLearning }, undefined, { expectCanvas: false });
  // The GL harness uses a navy canvas. This text tool uses the host's light content
  // surface (also retained inside the dark-theme backdrop; stem_lab_module.js).
  await page.locator('#wrap').evaluate((node: HTMLElement) => {
    Object.assign(node.style, { width: '100%', background: '#fff', color: '#0f172a', colorScheme: 'light' });
  });
  await expect(page.locator(root)).toBeVisible(); expect(await harness.glContexts(page)).toEqual([]);
  await page.evaluate(() => {
    (window as any).__punnettTestXP = [];
    (window as any).__ctx.awardXP = (...args: unknown[]) => (window as any).__punnettTestXP.push(args);
    (window as any).__rerender();
  });
  return { errors, baseline: await state(page) };
}
async function state(page: Page) { return page.evaluate(() => JSON.parse(JSON.stringify((window as any).__toolData.punnett))); }
async function patch(page: Page, updates: Record<string, unknown>) {
  await page.evaluate(updates => (window as any).__ctx.setToolData((previous: any) => ({ ...previous, punnett: { ...previous.punnett, ...updates } })), updates);
}
async function preserved(page: Page, baseline: any, changed: string[] = []) {
  const current = await state(page), expected = { ...baseline };
  for (const key of changed) { delete current[key]; delete expected[key]; }
  expect(current).toEqual(expected);
  expect(await page.evaluate(() => (window as any).__toolData.ecology)).toEqual(siblingLearning);
  expect(await harness.glContexts(page)).toEqual([]);
}
async function activate(page: Page, target: Locator, key = 'Enter') {
  await target.focus(); await page.keyboard.press(key);
}
async function wrongChallenge(page: Page, index = 0) {
  // The real tool rotates each question's answers; never assume a fixed answer index.
  const question = await page.evaluate(index => (window as any).__punnettPure.CHALLENGE_QS.easy[index], index);
  expect(question.concept).toBeTruthy();
  await activate(page, page.getByRole('button', { name: question.a[(question.correct + 1) % question.a.length], exact: true }));
  const opener = page.locator('[data-punnett-vocab-term="' + question.concept + '"]');
  await expect(opener).toBeVisible(); await expect(opener).toHaveRole('button');
  expect((await state(page))._chalFeedback).toContain('Incorrect');
  return { question, opener };
}
async function openFlashcard(page: Page, opener: Locator, key = 'Enter') {
  await activate(page, opener, key);
  const panel = page.locator(dialog), close = panel.getByRole('button', { name: 'Close flashcard', exact: true });
  await expect(panel).toBeVisible(); await expect(panel).toHaveRole('dialog');
  await expect(panel).toHaveAttribute('aria-modal', 'true');
  await expect(panel).toHaveAccessibleName(await panel.locator('#punnett-vocab-title').innerText());
  await expect(panel).toHaveAccessibleDescription(await panel.locator('#punnett-vocab-definition').innerText());
  await expect(close).toBeFocused();
  expect(await page.locator(content).evaluate((node: HTMLElement) => node.inert)).toBe(true);
  return { panel, close };
}
async function closed(page: Page, restored: Locator) {
  await expect(page.locator(dialog)).toHaveCount(0); await expect(restored).toBeFocused();
  expect(await page.locator(content).evaluate((node: HTMLElement) => node.inert)).toBe(false);
}
async function studyRewards(page: Page, concept: string) {
  return page.evaluate(concept => ({
    xp: (window as any).__punnettTestXP.filter((args: any[]) => args[0] === 'studyVocab_' + concept),
    toasts: (window as any).__events.toasts.filter((toast: any) => toast.message.includes('Concept Studied!')),
  }), concept);
}
function report(name: string, data: unknown) { writeFileSync(resolve(output, name), JSON.stringify(data, null, 2)); }

test('vocabulary traps keyboard focus, restores the exact opener and awards study credit once', async ({ page }) => {
  const initial = await setup(page, 'challenge');
  const { question, opener } = await wrongChallenge(page), baseline = await state(page);
  const { panel, close } = await openFlashcard(page, opener);
  const study = panel.getByRole('button', { name: 'Study Term (+5 RP)', exact: true });
  await page.keyboard.press('Shift+Tab'); await expect(study).toBeFocused();
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await page.keyboard.press('Tab'); await expect(study).toBeFocused();
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await page.keyboard.press('Escape'); await closed(page, opener);
  await preserved(page, baseline, ['_studyConcept']);
  expect(await studyRewards(page, question.concept)).toEqual({ xp: [], toasts: [] });

  await openFlashcard(page, opener, 'Space');
  await page.keyboard.press('Enter'); await closed(page, opener); // Initial close button.
  await preserved(page, baseline, ['_studyConcept']);
  expect(await studyRewards(page, question.concept)).toEqual({ xp: [], toasts: [] });

  await openFlashcard(page, opener); await page.keyboard.press('Tab'); await expect(study).toBeFocused();
  await page.keyboard.press('Space'); await closed(page, opener);
  expect((await state(page)).researchPoints).toBe(baseline.researchPoints + 5);
  expect((await state(page))._studiedVocab[question.concept]).toBe(true);
  await preserved(page, baseline, ['_studyConcept', '_studiedVocab', 'researchPoints']);
  const earned = await studyRewards(page, question.concept);
  expect(earned.xp).toEqual([['studyVocab_' + question.concept, 10, expect.any(String)]]); expect(earned.toasts).toHaveLength(1);

  await openFlashcard(page, opener);
  await expect(panel.getByText('✓ You have already studied this term!', { exact: true })).toBeVisible();
  await expect(study).toHaveCount(0);
  const studiedClose = panel.getByRole('button', { name: 'Close', exact: true });
  await page.keyboard.press('Shift+Tab'); await expect(studiedClose).toBeFocused();
  await page.keyboard.press('Enter'); await closed(page, opener);
  expect((await state(page)).researchPoints).toBe(baseline.researchPoints + 5);
  expect(await studyRewards(page, question.concept)).toEqual(earned);
  await preserved(page, baseline, ['_studyConcept', '_studiedVocab', 'researchPoints']); expect(initial.errors).toEqual([]);
  report('punnett-modal-keyboard.json', { concept: question.concept, randomizedAnswerUsed: true, tabAndReverseTabWrap: true,
    closures: ['Escape', 'Close flashcard', 'Study Term', 'Previously studied Close'], exactOpenerRestored: true,
    openingAndClosingEarnNothing: true, studyRewards: earned, unrelatedLearningPreserved: true });
});

test('vocabulary isolates the surrounding host, recovers focus safely and restores prior inert state on cleanup', async ({ page }) => {
  const initial = await setup(page, 'challenge'); const { opener } = await wrongChallenge(page);
  const baseline = await state(page);
  await page.evaluate(() => {
    const live = document.createElement('button'); live.id = 'punnett-shell-live'; live.textContent = 'Other tool control';
    live.setAttribute('aria-hidden', 'false'); document.body.appendChild(live);
    const locked = document.createElement('section'); locked.id = 'punnett-shell-locked'; locked.setAttribute('inert', 'prior-lock');
    locked.setAttribute('aria-hidden', 'true'); locked.textContent = 'Already unavailable'; document.body.appendChild(locked);
  });
  const shell = page.locator('#punnett-shell-live'), locked = page.locator('#punnett-shell-locked');
  const { close } = await openFlashcard(page, opener);
  expect(await shell.evaluate((node: HTMLElement) => node.inert)).toBe(true);
  await shell.evaluate((node: HTMLElement) => node.focus()); await expect(close).toBeFocused();
  await opener.evaluate((node: HTMLElement) => node.focus()); await expect(close).toBeFocused();
  // A legitimate term change must keep the host isolated throughout the same modal session.
  await patch(page, { _studyConcept: 'phenotype' });
  await expect(page.locator('#punnett-vocab-title')).toHaveText('Phenotype');
  expect(await shell.evaluate((node: HTMLElement) => node.inert)).toBe(true);
  await page.locator(dialog).getByRole('button', { name: 'Study Term (+5 RP)', exact: true }).evaluate((node: HTMLButtonElement) => { node.disabled = true; });
  await page.keyboard.press('Tab'); await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(close).toBeFocused();
  await close.evaluate((node: HTMLButtonElement) => { node.disabled = true; });
  await page.keyboard.press('Tab'); await expect(page.locator(dialog)).toBeFocused();
  await page.keyboard.press('Escape'); await closed(page, opener);
  await expect(shell).not.toHaveAttribute('inert'); await expect(shell).toHaveAttribute('aria-hidden', 'false');
  await expect(locked).toHaveAttribute('inert', 'prior-lock'); await expect(locked).toHaveAttribute('aria-hidden', 'true');

  await openFlashcard(page, opener);
  await opener.evaluate((node: HTMLButtonElement) => { node.disabled = true; });
  await page.keyboard.press('Escape'); await closed(page, page.locator('[data-punnett-title]'));
  await opener.evaluate((node: HTMLButtonElement) => { node.disabled = false; });
  await openFlashcard(page, opener); await opener.evaluate(node => node.remove());
  await page.keyboard.press('Escape'); await closed(page, page.locator('[data-punnett-title]'));
  await expect(page.locator('[data-punnett-title]')).toHaveAttribute('tabindex', '-1');

  for (const invalid of ['not-a-term', '__proto__', 'constructor']) {
    await patch(page, { _studyConcept: invalid });
    await expect(page.locator(dialog)).toHaveCount(0); expect((await state(page))._studyConcept).toBe(invalid);
    expect(await page.locator(content).evaluate((node: HTMLElement) => node.inert)).toBe(false);
    await expect(shell).not.toHaveAttribute('inert');
  }
  await preserved(page, baseline, ['_studyConcept']);
  // Exercise the second real entry point, retaining its existing game consequence.
  await patch(page, { subtool: 'battle', _studyConcept: null, _battleActive: true, _battleRound: 0 });
  await expect(page.locator('#punnett-activity-battle')).toHaveAttribute('aria-current', 'page');
  const battleQuestion = await page.evaluate(() => (window as any).__punnettPure.BATTLE_QS[0]);
  await activate(page, page.getByRole('button', { name: battleQuestion.a[(battleQuestion.correct + 1) % battleQuestion.a.length], exact: true }));
  expect((await state(page))._battleHP).toBe(85); expect((await state(page))._battleEnemyHP).toBe(100);
  expect((await state(page))._battleScore).toBe(0);
  const battleOpener = page.locator('[data-punnett-vocab-term="' + battleQuestion.concept + '"]'), battleBaseline = await state(page);
  await openFlashcard(page, battleOpener, 'Space'); await page.keyboard.press('Escape'); await closed(page, battleOpener);
  await preserved(page, battleBaseline, ['_studyConcept']);
  await openFlashcard(page, battleOpener); expect(await shell.evaluate((node: HTMLElement) => node.inert)).toBe(true);
  await harness.unmount(page); await expect(page.locator(root)).toHaveCount(0);
  await expect(shell).not.toHaveAttribute('inert'); await expect(shell).toHaveAttribute('aria-hidden', 'false');
  await expect(locked).toHaveAttribute('inert', 'prior-lock'); await expect(locked).toHaveAttribute('aria-hidden', 'true');
  await shell.focus(); await expect(shell).toBeFocused(); expect(initial.errors).toEqual([]);
  report('punnett-modal-recovery.json', { nativeInertBlocksBackgroundFocus: true, termChangePreservesIsolation: true,
    dynamicallyDisabledControlsSkipped: true, noEnabledControlsFocusesDialog: true,
    disabledAndRemovedOpenerFallback: 'Punnett Square Lab heading', invalidSavedTermsDoNotCreateModalOrRewriteState: true,
    inertAttributeValuesRestoredExactly: true, ariaHiddenValuesPreserved: true, unmountReleasesHost: true,
    battleOpenerKeyboardReturn: true, battleWrongAnswerStillCosts15HP: true });
});

test('DNA has its complete visible label, truthful disclosure state and unchanged translation and credit', async ({ page }) => {
  const initial = await setup(page, 'dna2protein'), input = page.locator('#punnett-dna-sequence');
  const toggle = page.locator('[data-punnett-dna-steps]'), steps = page.locator('#punnett-dna-steps');
  const label = page.locator('label[for="punnett-dna-sequence"]');
  // CSS uppercases the label visually; its text content supplies the native name.
  await expect(label).toBeVisible(); await expect(input).toHaveAccessibleName((await label.textContent())!.trim());
  await expect(input).not.toHaveAttribute('aria-label');
  await expect(toggle).toHaveAccessibleName(/Show Steps/); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toHaveAttribute('aria-controls', 'punnett-dna-steps'); await expect(steps).toHaveCount(1); await expect(steps).toBeHidden();
  await expect(page.getByRole('button', { name: 'Sample 1', exact: true })).toHaveCount(1);
  await activate(page, toggle, 'Space'); await expect(toggle).toHaveAccessibleName(/Hide Steps/);
  await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await expect(steps).toBeVisible(); await expect(toggle).toBeFocused();
  await expect(steps.getByText('ATGAAATAA', { exact: true })).toBeVisible();
  await expect(steps.getByRole('paragraph').filter({ hasText: /^AUGAAAUAA$/ })).toBeVisible();
  for (const codon of ['AUG', 'AAA', 'UAA']) await expect(steps.getByText(codon, { exact: true })).toBeVisible();
  await expect(page.getByText('Protein length: 2 amino acids', { exact: true })).toBeVisible();
  for (const amino of ['Met', 'Lys', 'Stop']) await expect(page.locator(dna).getByText(amino, { exact: true })).toBeVisible();
  await activate(page, toggle); await expect(steps).toBeHidden(); await expect(toggle).toHaveAccessibleName(/Show Steps/);
  await preserved(page, initial.baseline, ['_dnaShowSteps']);
  expect(await page.evaluate(() => (window as any).__punnettTestXP)).toEqual([]);

  await input.fill('at-?'); await expect(input).toHaveValue('AT');
  await activate(page, toggle); await expect(toggle).toHaveAttribute('aria-expanded', 'true'); await expect(steps).toBeVisible();
  await expect(steps).toContainText(/3|three/i); await expect(steps.getByText('AUG', { exact: true })).toHaveCount(0);
  await input.fill('ATGAAATAA'); await expect(steps.getByRole('paragraph').filter({ hasText: /^AUGAAAUAA$/ })).toBeVisible();
  await activate(page, page.getByRole('button', { name: 'Translate', exact: true }));
  await expect.poll(async () => (await state(page))._dnaDone).toBe(true);
  await activate(page, page.getByRole('button', { name: 'Translate', exact: true }), 'Space');
  const translationXP = await page.evaluate(() => (window as any).__punnettTestXP.filter((args: any[]) => args[0] === 'dnaTranslate'));
  expect(translationXP).toEqual([['dnaTranslate', 15, 'DNA Translation']]);
  await activate(page, page.getByRole('button', { name: 'Sample 1', exact: true }));
  await expect(input).toHaveValue('ATGAAAGCTTTTCGATGA');
  expect((await state(page)).researchPoints).toBe(initial.baseline.researchPoints);
  await preserved(page, initial.baseline, ['_dnaShowSteps', '_dnaSeq', '_dnaDone', '_badges']); expect(initial.errors).toEqual([]);
  report('punnett-dna-controls.json', { visibleLabelSuppliesFullName: await label.innerText(), disclosureStateAndRelationship: true,
    collapsedRegionRetained: true, shortSequenceInstructionReachable: true, sanitization: 'at-? → AT',
    referenceTranslation: { DNA: 'ATGAAATAA', mRNA: 'AUGAAAUAA', codons: ['AUG', 'AAA', 'UAA'], protein: ['Met', 'Lys', 'Stop'], length: 2 },
    samplePresetPreserved: true, translationXP, unrelatedLearningPreserved: true });
});

test('DNA and vocabulary remain usable at 320px with text spacing, forced colors and scoped axe checks', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const initial = await setup(page, 'dna2protein'); await page.addScriptTag({ path: resolve('node_modules/axe-core/axe.min.js') });
  const scans: any[] = [];
  async function scan(name: string, scope: string) {
    const result = await page.locator(scope).evaluate(async node => {
      const audit = await (window as any).axe.run(node, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      const compact = (rule: any) => ({ id: rule.id, impact: rule.impact, nodes: rule.nodes.map((node: any) => ({ target: node.target, html: node.html, failureSummary: node.failureSummary })) });
      return { version: audit.testEngine.version, forcedColors: matchMedia('(forced-colors: active)').matches,
        violations: audit.violations.map(compact), incomplete: audit.incomplete.map(compact),
        inspectedNodes: [...audit.passes, ...audit.incomplete, ...audit.violations].reduce((sum, rule) => sum + rule.nodes.length, 0) };
    });
    const computedContrast = await contrastEvidence(page, scope, result.incomplete);
    scans.push({ state: name, scope, ...result, computedContrast });
    report('punnett-axe.json', { scope: 'DNA translation, active point/insertion/deletion results, and vocabulary dialog including already-studied state',
      limitation: 'Scoped axe results do not certify complete WCAG conformance. Incomplete checks require review. Forced-color keyboard and layout checks run separately because of axe-core issue 3978.', scans });
    expect(result.forcedColors).toBe(false); expect(result.inspectedNodes).toBeGreaterThan(0);
    expect(result.violations, name + ': ' + JSON.stringify(result.violations)).toEqual([]);
    for (const sample of [...computedContrast.incompleteNodes, ...computedContrast.supplementaryNodes]) {
      expect(sample.found, name + ': unresolved contrast target ' + sample.target.join(' ')).toBe(true);
      expect(sample.backgroundSamples.length, name + ': no background samples for ' + sample.text).toBeGreaterThan(0);
      expect(sample.limitations, name + ': contrast model needs manual review for ' + sample.text).toEqual([]);
      for (const background of sample.backgroundSamples) {
        expect(background.ratio, name + ': ' + sample.text + ' against ' + background.color).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
  await scan('DNA steps collapsed', dna); await activate(page, page.locator('[data-punnett-dna-steps]'));
  await scan('DNA steps expanded', dna);
  const mutationStates: any[] = [];
  for (const reference of [
    { type: 'point', control: 'Point Mutation', sequence: 'ATGACATAA', mRNA: 'AUGACAUAA', amino: ['Met', 'Thr', 'Stop'], length: 2, changes: 1 },
    { type: 'insertion', control: 'Insertion', sequence: 'ATGACAATAA', mRNA: 'AUGACAAUAA', amino: ['Met', 'Thr', 'Ile'], length: 3, changes: 2 },
    { type: 'deletion', control: 'Deletion', sequence: 'ATGAATAA', mRNA: 'AUGAAUAA', amino: ['Met', 'Asn'], length: 2, changes: 2 },
  ]) {
    await patch(page, { _dnaSeq: 'ATGAAATAA', _dnaShowSteps: true, _mutOriginal: '', _mutType: null, _mutPos: -1, _mutTypesUsed: {} });
    await expect(page.locator('#punnett-dna-sequence')).toHaveValue('ATGAAATAA');
    await page.evaluate(() => { (window as any).__punnettOriginalRandom = Math.random; Math.random = () => .5; });
    try { await activate(page, page.locator(dna).getByRole('button', { name: reference.control, exact: true })); }
    finally { await page.evaluate(() => { Math.random = (window as any).__punnettOriginalRandom; delete (window as any).__punnettOriginalRandom; }); }
    await expect(page.locator('#punnett-dna-sequence')).toHaveValue(reference.sequence);
    const current = await state(page);
    expect(current._mutType).toBe(reference.type); expect(current._mutOriginal).toBe('ATGAAATAA');
    expect(current._mutTypesUsed).toEqual({ [reference.type]: true });
    await expect(page.locator('#punnett-dna-steps').getByRole('paragraph').filter({ hasText: new RegExp('^' + reference.mRNA + '$') })).toBeVisible();
    await expect(page.locator(dna).locator('div[title] > span:first-child')).toHaveText(reference.amino);
    await expect(page.locator(dna).getByText('Protein length: ' + reference.length + ' amino acids', { exact: true })).toBeVisible();
    await expect(page.locator(dna).getByText(new RegExp(reference.changes + ' amino acids? changed'))).toBeVisible();
    await expect(page.locator(dna).getByText('Mutated DNA (' + reference.type + ')', { exact: true })).toBeVisible();
    if (reference.type !== 'point') await expect(page.locator(dna).getByText(/This is called a frameshift mutation\./)).toBeVisible();
    await preserved(page, initial.baseline, ['_dnaSeq', '_dnaShowSteps', '_mutOriginal', '_mutType', '_mutPos', '_mutTypesUsed']);
    mutationStates.push({ ...reference, original: current._mutOriginal, type: current._mutType, singleTypeRecorded: current._mutTypesUsed,
      actualControlUsed: true, unrelatedLearningPreserved: true });
    await scan('DNA active ' + reference.type + ' mutation', dna);
  }
  await activate(page, page.locator('#punnett-activity-challenge')); const { opener } = await wrongChallenge(page);
  await openFlashcard(page, opener); await scan('new vocabulary concept', dialog);
  await activate(page, page.locator(dialog).getByRole('button', { name: 'Study Term (+5 RP)', exact: true }));
  await closed(page, opener); await openFlashcard(page, opener); await scan('previously studied concept', dialog); expect(scans).toHaveLength(7);
  const beforePresentation = await state(page);
  await page.addStyleTag({ content: '[data-punnett-tool], [data-punnett-tool] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-punnett-tool] p{margin-bottom:2em!important}' });
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const close = page.locator(dialog).getByRole('button', { name: 'Close flashcard', exact: true });
  await close.focus(); await page.keyboard.press('Shift+Tab');
  const bottom = page.locator(dialog).getByRole('button', { name: 'Close', exact: true }); await expect(bottom).toBeFocused();
  const modalLayout = await layout(page, dialog);
  expect(modalLayout.viewport).toBe(320); expect(modalLayout.documentWidth).toBeLessThanOrEqual(321);
  expect(modalLayout.left).toBeGreaterThanOrEqual(-1); expect(modalLayout.right).toBeLessThanOrEqual(321);
  expect(modalLayout.top).toBeGreaterThanOrEqual(-1); expect(modalLayout.bottom).toBeLessThanOrEqual(901);
  expect(modalLayout.horizontalOverflow).toEqual([]); checkTargets(modalLayout.targets); checkFocus(modalLayout.focus);
  await page.locator(dialog).screenshot({ path: resolve(output, 'punnett-dialog-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  expect(await state(page)).toEqual(beforePresentation);
  await page.keyboard.press('Escape'); await closed(page, opener);
  await activate(page, page.locator('#punnett-activity-dna2protein'));
  const toggle = page.locator('[data-punnett-dna-steps]'); await toggle.focus();
  const beforeDNAKeys = await state(page); await page.keyboard.press('Enter');
  await expect(toggle).toBeFocused(); await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Space'); await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const dnaLayout = await layout(page, dna);
  expect(dnaLayout.documentWidth).toBeLessThanOrEqual(321); expect(dnaLayout.left).toBeGreaterThanOrEqual(-1);
  expect(dnaLayout.right).toBeLessThanOrEqual(321); expect(dnaLayout.horizontalOverflow).toEqual([]);
  checkTargets(dnaLayout.targets); checkFocus(dnaLayout.focus); expect(await state(page)).toEqual(beforeDNAKeys);
  await page.locator(dna).screenshot({ path: resolve(output, 'punnett-dna-mobile-forced-colors.jpg'), type: 'jpeg', quality: 90 });
  expect(await page.evaluate(() => (window as any).__toolData.ecology)).toEqual(siblingLearning); expect(initial.errors).toEqual([]);
  report('punnett-reflow.json', { viewport: 320, spacing: { lineHeight: 1.5, letterSpacing: '.12em', wordSpacing: '.16em', paragraphSpacing: '2em' },
    modal: modalLayout, DNA: dnaLayout, mutationStates, activeDeletionResultReflow: true,
    keyboardRoundTripPreservesLearning: true, scopedAxeStates: scans.map(scan => scan.state) });
});

test('short viewports keep long vocabulary scrollable and both dialog actions fully reachable by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 360 });
  const initial = await setup(page, 'challenge');
  await page.addStyleTag({ content: '[data-punnett-tool], [data-punnett-tool] *{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}[data-punnett-tool] p{margin-bottom:2em!important}' });
  const samples: any[] = [];
  for (const scenario of [{ concept: 'genotype', studied: false }, { concept: 'phenotype', studied: true }]) {
    const diagnostic: any = { ...scenario };
    const progress = (stage: string, snapshot: unknown) => {
      diagnostic[stage] = snapshot;
      report('punnett-low-height.json', { status: 'in-progress', stage: scenario.concept + ':' + stage,
        viewport: { width: 320, height: 360 }, normalPalette: true,
        spacing: { lineHeight: 1.5, letterSpacing: '.12em', wordSpacing: '.16em', paragraphSpacing: '2em' },
        samples, current: diagnostic });
    };
    const index = await page.evaluate(concept => (window as any).__punnettPure.CHALLENGE_QS.easy.findIndex((question: any) => question.concept === concept), scenario.concept);
    expect(index, 'A real challenge question must provide the vocabulary opener').toBeGreaterThanOrEqual(0);
    await patch(page, { _chalIdx: index, _chalFeedback: null, _selectedOption: null,
      _studiedVocab: scenario.studied ? { [scenario.concept]: true } : {} });
    const { opener } = await wrongChallenge(page, index), baseline = await state(page);
    const { panel, close } = await openFlashcard(page, opener);
    expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(false);
    const top = await lowHeightSnapshot(page);
    progress('top', top);
    checkLowHeight(top); expect(top.focused.text).toBe('✕'); expect(top.focused.fullyVisible).toBe(true);
    await panel.screenshot({ path: resolve(output, 'punnett-dialog-low-height-' + scenario.concept + '-top.jpg'), type: 'jpeg', quality: 90 });
    const last = panel.getByRole('button', { name: scenario.studied ? 'Close' : 'Study Term (+5 RP)', exact: true });
    await page.keyboard.press('Shift+Tab'); await expect(last).toBeFocused();
    const bottom = await lowHeightSnapshot(page);
    progress('bottom', bottom);
    checkLowHeight(bottom); expect(bottom.scrollTop).toBeGreaterThan(top.scrollTop);
    expect(bottom.focused.fullyVisible).toBe(true); expect(bottom.focused.centerHitsControl).toBe(true);
    expect(bottom.focused.height).toBeGreaterThanOrEqual(44);
    await panel.screenshot({ path: resolve(output, 'punnett-dialog-low-height-' + scenario.concept + '-bottom.jpg'), type: 'jpeg', quality: 90 });
    await page.keyboard.press('Tab'); await expect(close).toBeFocused();
    const returned = await lowHeightSnapshot(page);
    progress('returned', returned);
    checkLowHeight(returned); expect(returned.focused.fullyVisible).toBe(true); expect(returned.focused.centerHitsControl).toBe(true);
    // Close may already be fully visible at the last action's scroll position.
    // Keep reachability checks strict while allowing the browser to retain that position.
    expect(returned.scrollTop).toBeLessThanOrEqual(bottom.scrollTop);
    await page.keyboard.press('Tab'); await expect(last).toBeFocused();
    expect((await lowHeightSnapshot(page)).focused.fullyVisible).toBe(true);
    await page.keyboard.press('Escape'); await closed(page, opener);
    await preserved(page, baseline, ['_studyConcept']);
    expect(await studyRewards(page, scenario.concept)).toEqual({ xp: [], toasts: [] });
    samples.push({ ...scenario, top, bottom, returned, escapeRestoresExactOpener: true, openingAndKeyboardTraversalPreserveLearning: true });
  }
  expect((await state(page)).researchPoints).toBe(initial.baseline.researchPoints); expect(initial.errors).toEqual([]);
  report('punnett-low-height.json', { status: 'complete', viewport: { width: 320, height: 360 }, normalPalette: true,
    spacing: { lineHeight: 1.5, letterSpacing: '.12em', wordSpacing: '.16em', paragraphSpacing: '2em' }, samples });
});

async function lowHeightSnapshot(page: Page) {
  return page.locator(dialog).evaluate((node: HTMLElement) => {
    const panel = node.getBoundingClientRect(), focused = document.activeElement as HTMLElement;
    const target = focused.getBoundingClientRect(), centerX = target.left + target.width / 2, centerY = target.top + target.height / 2;
    const hit = document.elementFromPoint(centerX, centerY), css = getComputedStyle(node);
    const focusCSS = getComputedStyle(focused), outlineChannels = focusCSS.outlineColor.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    const linear = outlineChannels?.map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    const outlineAgainstWhite = linear?.length === 3 ? 1.05 / (.2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2] + .05) : null;
    return { viewport: { width: innerWidth, height: innerHeight }, documentWidth: document.documentElement.scrollWidth,
      forcedColors: matchMedia('(forced-colors: active)').matches, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      panel: { left: panel.left, right: panel.right, top: panel.top, bottom: panel.bottom, width: panel.width, height: panel.height },
      clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, scrollTop: node.scrollTop, overflowY: css.overflowY,
      horizontalOverflow: node.scrollWidth > node.clientWidth + 1,
      focused: { text: focused.textContent?.trim(), left: target.left, right: target.right, top: target.top, bottom: target.bottom,
        outline: { color: focusCSS.outlineColor, width: parseFloat(focusCSS.outlineWidth), style: focusCSS.outlineStyle,
          offset: parseFloat(focusCSS.outlineOffset), transition: focusCSS.transition,
          foreground: focusCSS.color, background: focusCSS.backgroundColor, boxShadow: focusCSS.boxShadow,
          focusVisible: focused.matches(':focus-visible'), contrastAgainstWhite: outlineAgainstWhite },
        width: target.width, height: target.height, fullyVisible: target.left >= panel.left + node.clientLeft - 1 && target.right <= panel.left + node.clientLeft + node.clientWidth + 1 &&
          target.top >= panel.top + node.clientTop - 1 && target.bottom <= panel.top + node.clientTop + node.clientHeight + 1,
        centerHitsControl: !!hit && (hit === focused || focused.contains(hit)) } };
  });
}
function checkLowHeight(sample: Awaited<ReturnType<typeof lowHeightSnapshot>>) {
  expect(sample.viewport).toEqual({ width: 320, height: 360 }); expect(sample.documentWidth).toBeLessThanOrEqual(321);
  expect(sample.panel.left).toBeGreaterThanOrEqual(15); expect(sample.panel.right).toBeLessThanOrEqual(305);
  expect(sample.panel.top).toBeGreaterThanOrEqual(15); expect(sample.panel.bottom).toBeLessThanOrEqual(345);
  expect(sample.panel.height).toBeLessThanOrEqual(329); expect(sample.horizontalOverflow).toBe(false);
  expect(sample.scrollHeight).toBeGreaterThan(sample.clientHeight + 1); expect(['auto', 'scroll']).toContain(sample.overflowY);
  expect(sample.focused.outline.focusVisible).toBe(true); expect(sample.focused.outline.style).not.toBe('none');
  expect(sample.focused.outline.width).toBeGreaterThanOrEqual(3); expect(sample.focused.outline.contrastAgainstWhite).toBeGreaterThanOrEqual(3);
}

async function contrastEvidence(page: Page, scope: string, incomplete: any[]) {
  return page.locator(scope).evaluate((root, incomplete) => {
    type Color = [number, number, number, number];
    const parse = (value: string): Color | null => {
      const values = value.match(/^rgba?\(([^)]+)\)$/i)?.[1].split(/[\s,\/]+/).filter(Boolean);
      if (!values || values.length < 3) return null;
      const channel = (value: string) => value.endsWith('%') ? parseFloat(value) * 2.55 : parseFloat(value);
      return [channel(values[0]), channel(values[1]), channel(values[2]), values[3] ? parseFloat(values[3]) / (values[3].endsWith('%') ? 100 : 1) : 1];
    };
    const over = (foreground: Color, background: Color): Color => [
      ...foreground.slice(0, 3).map((value, index) => value * foreground[3] + background[index] * (1 - foreground[3])), 1,
    ] as Color;
    const luminance = (color: Color) => {
      const values = color.slice(0, 3).map(value => value / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
    };
    const colorText = (color: Color) => 'rgb(' + color.slice(0, 3).map(value => Math.round(value * 1000) / 1000).join(', ') + ')';
    const inspect = (element: HTMLElement | null, target: string[]) => {
      if (!element) return { found: false, target, text: '', backgroundSamples: [], limitations: ['Target did not resolve in this scope.'] };
      const style = getComputedStyle(element), foreground = parse(style.color), chain: any[] = [], limitations: string[] = [];
      for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
        const css = getComputedStyle(ancestor);
        chain.push({ tag: ancestor.tagName.toLowerCase(), id: ancestor.id, className: ancestor.className,
          foreground: css.color, backgroundColor: css.backgroundColor, backgroundImage: css.backgroundImage, opacity: css.opacity });
        if (Number(css.opacity) < 1) limitations.push('Ancestor opacity needs visual review: ' + ancestor.tagName.toLowerCase());
      }
      let backgrounds: Color[] = [[255, 255, 255, 1]];
      for (const layer of [...chain].reverse()) {
        const background = parse(layer.backgroundColor);
        if (background) backgrounds = backgrounds.map(value => over(background, value));
        if (layer.backgroundImage !== 'none') {
          const stops = layer.backgroundImage.match(/rgba?\([^)]+\)/gi)?.map(parse).filter((value: Color | null): value is Color => !!value) || [];
          if (/^linear-gradient\(/.test(layer.backgroundImage) && stops.length >= 2) backgrounds = backgrounds.flatMap(value => stops.map((stop: Color) => over(stop, value)));
          else limitations.push('Background image is outside the endpoint model: ' + layer.backgroundImage);
        }
      }
      if (!foreground) limitations.push('Foreground is outside the RGB model: ' + style.color);
      // Deduplicate opaque descendants: they hide any gradients farther behind them.
      const unique = [...new Map(backgrounds.map(value => [colorText(value), value])).values()];
      return { found: true, target, text: element.textContent?.trim(), foreground: style.color,
        backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage,
        fontSize: style.fontSize, fontWeight: style.fontWeight, ancestorBackdrops: chain,
        backgroundSamples: foreground ? unique.map(background => {
          const effective = over(foreground, background), a = luminance(effective), b = luminance(background);
          return { color: colorText(background), effectiveForeground: colorText(effective), ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
        }) : [], limitations: [...new Set(limitations)] };
    };
    const incompleteNodes = incomplete.flatMap((rule: any) => rule.nodes.map((node: any) => {
      const selector = node.target.length === 1 && typeof node.target[0] === 'string' ? node.target[0] : null;
      let element: HTMLElement | null = null;
      try { if (selector) element = (root.matches(selector) ? root : root.querySelector(selector)) as HTMLElement | null; } catch { /* reported unresolved below */ }
      return { rule: rule.id, ...inspect(element, node.target) };
    }));
    const selectors = root.matches('[data-punnett-vocab-dialog]') ? ['button[aria-label="Close flashcard"]', '#punnett-vocab-definition', 'button:last-child'] :
      ['label[for="punnett-dna-sequence"]', '[data-punnett-dna-steps]'];
    const supplementaryNodes = selectors.map(selector => inspect(root.querySelector<HTMLElement>(selector), [selector]));
    return { method: 'WCAG sRGB relative luminance; computed RGB/alpha foregrounds and ancestor backgrounds; each linear-gradient endpoint composited over its ancestor surface.',
      limitation: 'Endpoint calculations supplement axe incomplete checks. They do not clear overlap warnings, sample intermediate gradient interpolation, rendered images or antialiasing, or certify complete WCAG conformance.',
      incompleteNodes, supplementaryNodes };
  }, incomplete);
}

async function layout(page: Page, scope: string) {
  return page.locator(scope).evaluate((node: HTMLElement) => {
    const box = node.getBoundingClientRect(), focused = document.activeElement as HTMLElement;
    const css = getComputedStyle(focused);
    const targets = Array.from(node.querySelectorAll<HTMLElement>('button,input')).map(button => {
      const bounds = button.getBoundingClientRect();
      return { text: button.textContent?.trim() || button.getAttribute('id'), left: bounds.left, right: bounds.right, width: bounds.width, height: bounds.height };
    });
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, left: box.left, right: box.right,
      top: box.top, bottom: box.bottom, targets, forcedColors: matchMedia('(forced-colors: active)').matches,
      horizontalOverflow: Array.from(node.querySelectorAll<HTMLElement>('button,input,p,#punnett-vocab-definition')).filter(element => element.scrollWidth > element.clientWidth + 2).map(element => element.textContent?.trim()),
      focus: { visible: focused.matches(':focus-visible'), outline: css.outlineStyle, width: parseFloat(css.outlineWidth), foreground: css.color, background: css.backgroundColor,
        font: parseFloat(css.fontSize), line: parseFloat(css.lineHeight), letter: parseFloat(css.letterSpacing), word: parseFloat(css.wordSpacing) } };
  });
}
function checkTargets(targets: { left: number; right: number; width: number; height: number }[]) {
  expect(targets.length).toBeGreaterThan(0);
  for (const target of targets) { expect(target.left).toBeGreaterThanOrEqual(-1); expect(target.right).toBeLessThanOrEqual(321); expect(target.width).toBeGreaterThanOrEqual(24); expect(target.height).toBeGreaterThanOrEqual(24); }
}
function checkFocus(focus: { visible: boolean; outline: string; width: number; foreground: string; background: string; font: number; line: number; letter: number; word: number }) {
  expect(focus.visible).toBe(true); expect(focus.outline).not.toBe('none'); expect(focus.width).toBeGreaterThanOrEqual(3);
  expect(focus.foreground).not.toBe(focus.background); expect(focus.line).toBeCloseTo(focus.font * 1.5, 1);
  expect(focus.letter).toBeCloseTo(focus.font * .12, 1); expect(focus.word).toBeCloseTo(focus.font * .16, 1);
}
