import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1000,
  appStyles: true,
  extraScripts: ['node_modules/axe-core/axe.min.js'],
});

test.describe('Pets Lab next-step accessibility contracts', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('AI feedback receives focus and revision evidence remains metadata-only', async ({ page }) => {
    await harness.mount(page, {
      petsLab: { view: 'aiPractice' },
    }, undefined, { expectCanvas: false });

    const pathway = page.locator('.petslab-ai-pathway');
    await expect(pathway).toContainText('Every result still needs teacher review');
    await expect(pathway.locator('[data-pets-ai-path-step="scenario"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'current');
    await expect(pathway.locator('[data-pets-ai-path-step="scenario"]'))
      .toHaveAttribute('aria-current', 'step');
    await expect(pathway.locator('[data-pets-ai-path-step="draft"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'upcoming');

    await page.getByRole('button', { name: 'Family pet selection' }).click();
    await expect(pathway.locator('[data-pets-ai-path-step="scenario"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'complete');
    await expect(pathway.locator('[data-pets-ai-path-step="draft"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'current');

    const criteria = page.locator('.petslab-ai-planning-criteria');
    await expect(criteria.locator('summary')).toContainText('Planning criteria (5)');
    await criteria.locator('summary').click();
    await expect(criteria.locator('li')).toHaveCount(5);
    await expect(criteria).toContainText(
      'Using a matching phrase does not prove your reasoning is correct',
    );

    const response = page.locator('#pets-ai-response');
    const originalDraft = [
      'I would first ask about the family schedule, housing, budget, and children.',
      'Then I would compare the animal exercise, social, grooming, and veterinary needs.',
      'I would discuss adoption and whether an adult animal with a known temperament fits.',
      'The recommendation should change if daily care time or long-term costs are not realistic.',
    ].join(' ');
    await response.fill(originalDraft);
    await expect(pathway.locator('[data-pets-ai-path-step="draft"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'complete');
    await expect(pathway.locator('[data-pets-ai-path-step="feedback"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'current');
    await page.getByRole('button', { name: 'Get critique of your response' }).click();

    const critique = page.locator('.petslab-ai-critique');
    await expect(critique).toBeFocused();
    await expect(critique).toHaveAttribute('role', 'region');
    await expect(critique).toHaveAttribute('aria-labelledby', 'pets-ai-critique-heading');
    await expect(pathway.locator('[data-pets-ai-path-step="feedback"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'complete');
    await expect(pathway.locator('[data-pets-ai-path-step="revision"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'current');

    const revisedDraft = originalDraft +
      ' I also added a plan for meeting the animal before deciding and for checking landlord rules.';
    await response.fill(revisedDraft);
    await expect(page.locator('.petslab-ai-critique-stale')).toContainText(
      'Draft changed after this critique',
    );
    await expect(page.locator('.petslab-ai-revision')).toBeVisible();

    const privateNote = 'I added a pre-adoption meeting because observed fit is stronger evidence.';
    await page.locator('#pets-ai-revision-note').fill(privateNote);
    await page.getByRole('button', { name: 'Save revision for teacher review' }).click();
    await expect(pathway.locator('[data-pets-ai-path-step="revision"]'))
      .toHaveAttribute('data-pets-ai-path-status', 'complete');

    await expect.poll(() => page.evaluate(() => {
      const rows = (window as any).__toolData.petsLab.evidenceRecords || [];
      return rows[rows.length - 1];
    })).toMatchObject({
      moduleId: 'aiPractice',
      kind: 'activity',
      details: {
        scenarioId: 'family-pick',
        feedbackSource: 'local',
        reviewStatus: 'teacher-review',
        revisionMade: true,
        revisionNoteChars: privateNote.trim().length,
        draftChars: revisedDraft.length,
      },
    });

    const evidenceJson = await page.evaluate(() => JSON.stringify(
      (window as any).__toolData.petsLab.evidenceRecords || [],
    ));
    expect(evidenceJson).not.toContain(privateNote);
    await expect(page.getByRole('button', { name: /Revision reflection saved/ })).toBeDisabled();

    await page.evaluate(() => {
      (window as any).__ctx.update('petsLab', 'view', 'teacher');
    });
    const aiCard = page.locator('.petslab-evidence-grid')
      .getByRole('listitem')
      .filter({ hasText: 'AI Practice' });
    await expect(aiCard).toContainText(
      'revision reflection saved (' + privateNote.trim().length + ' characters)',
    );
    await expect(page.locator('#wrap')).not.toContainText(privateNote);
  });

  test('AI feedback needs contextual work and clearing stays scoped to one scenario', async ({ page }) => {
    const familyDraft = 'PRIVATE FAMILY DRAFT: I would compare allergies, housing, schedules, budget, exercise, daily care, and shelter visits before making a recommendation.';
    const serviceDraft = 'SERVICE DRAFT: I would compare task needs, medical technology, training, waitlists, costs, family support, and long-term care with qualified programs.';
    const familyNote = 'PRIVATE FAMILY REVISION NOTE';
    const serviceNote = 'SERVICE REVISION NOTE';
    await harness.mount(page, {
      petsLab: {
        view: 'aiPractice',
        aiScenarioId: 'family-pick',
        aiResponse: familyDraft,
        aiDrafts: {
          'family-pick': familyDraft,
          'service-match': serviceDraft,
        },
        aiCritiques: {
          'family-pick': {
            text: 'PRIVATE FAMILY CRITIQUE',
            source: 'local',
            draftSnapshot: familyDraft,
            createdAt: '2026-08-27T12:00:00.000Z',
          },
          'service-match': {
            text: 'SERVICE CRITIQUE',
            source: 'local',
            draftSnapshot: serviceDraft,
            createdAt: '2026-08-27T12:01:00.000Z',
          },
        },
        aiRevisionNotes: {
          'family-pick': familyNote,
          'service-match': serviceNote,
        },
      },
    }, undefined, { expectCanvas: false });

    const response = page.locator('#pets-ai-response');
    await expect(response).toHaveValue(familyDraft);
    await expect(page.locator('.petslab-ai-critique')).toContainText('PRIVATE FAMILY CRITIQUE');
    await expect(page.locator('#pets-ai-feedback-readiness')).toContainText('Ready for feedback');

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('.petslab-ai-clear-work').click();
    await expect(response).toHaveValue('');
    await expect(response).toBeFocused();
    await expect(page.locator('.petslab-ai-critique')).toHaveCount(0);

    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        response: pets.aiResponse,
        draftKeys: Object.keys(pets.aiDrafts || {}).sort(),
        critiqueKeys: Object.keys(pets.aiCritiques || {}).sort(),
        noteKeys: Object.keys(pets.aiRevisionNotes || {}).sort(),
      };
    })).toEqual({
      response: '',
      draftKeys: ['service-match'],
      critiqueKeys: ['service-match'],
      noteKeys: ['service-match'],
    });

    await response.fill('Vet first.');
    const feedbackButton = page.getByRole('button', { name: 'Get critique of your response' });
    await expect(feedbackButton).toBeDisabled();
    await expect(feedbackButton).toHaveAttribute('aria-describedby', /pets-ai-feedback-readiness/);
    await expect(page.locator('#pets-ai-feedback-readiness'))
      .toContainText('Feedback unlocks at 12 words and 80 characters');
    await expect.poll(() => page.evaluate(() => (
      (window as any).__toolData.petsLab.modulesCompleted?.aiPractice || null
    ))).toBeNull();

    await response.fill(
      'I would ask about health, housing, budget, schedules, allergies, exercise, daily care, and shelter visits before recommending any animal.'
    );
    await expect(feedbackButton).toBeEnabled();
    await expect(page.locator('#pets-ai-feedback-readiness')).toContainText('Ready for feedback');

    await expect.poll(() => page.evaluate(({ family, service }) => {
      const stored = JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null');
      const json = JSON.stringify(stored || {});
      return {
        hasFamily: json.includes(family),
        hasService: json.includes(service),
      };
    }, { family: familyDraft, service: serviceDraft })).toEqual({
      hasFamily: false,
      hasService: true,
    });
  });

  test('Pet Picker makes pause, uncertainty, and readiness state explicit', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'picker',
        pickReadiness: {
          housing: true,
          budget: 'true',
          rogue: true,
        },
      },
    }, undefined, { expectCanvas: false });

    const checkpoint = page.locator('.petslab-picker-readiness');
    const readinessChecks = checkpoint.getByRole('checkbox');
    await expect(readinessChecks).toHaveCount(4);
    await expect(page.getByRole('checkbox', { name: /Housing rules checked/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /Primary caregiver confirmed/ })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: /Routine and emergency budget researched/ })).not.toBeChecked();

    const readinessStatus = page.locator('.petslab-picker-readiness-status');
    await expect(readinessStatus).toHaveAttribute('role', 'status');
    await expect(readinessStatus).toHaveAttribute('aria-live', 'polite');
    await expect(readinessStatus).toHaveAttribute('data-pets-picker-readiness-status', 'pause');
    await expect(readinessStatus).toContainText(
      'Pause before choosing — 3 of 4 readiness checks still unverified',
    );
    await expect(readinessStatus).toContainText('Waiting is the responsible outcome');

    const modelResult = page.locator('.petslab-picker-model-result');
    await expect(page.locator('#pets-picker-results-title')).toHaveText(/Ranked comparison/);
    await expect(modelResult).toContainText('leads the next option by 2 points');
    await expect(modelResult).toContainText('not confidence or proof of suitability');
    await expect(page.locator('.petslab-picker-results')).not.toContainText('TOP MATCH');

    await page.locator('label[for="pp-housing-apartment"]').click();
    await page.locator('#pp-hours').fill('0');
    await page.locator('label[for="pp-budget-low"]').click();
    await page.locator('label[for="pp-exp-first"]').click();
    await expect(modelResult).toContainText('No single model leader: 2 options tie at +3');
    await expect(page.locator('.petslab-picker-status').filter({ hasText: 'TIED MODEL LEADER' }))
      .toHaveCount(2);

    await page.locator('label[for="pp-kidage-under5"]').click();
    await expect(page.locator('#wrap')).toContainText(
      'advises children under 5 to avoid rodent contact',
    );
    const firstRank = await page.locator('.petslab-picker-card').first().getAttribute('aria-label');
    expect(firstRank).not.toMatch(/guinea pig|reptile/i);

    await page.getByRole('checkbox', { name: /Primary caregiver confirmed/ }).check();
    await page.getByRole('checkbox', { name: /Routine and emergency budget researched/ }).check();
    await page.getByRole('checkbox', { name: /Daily, travel, and veterinary access planned/ }).check();

    await expect(readinessStatus).toHaveAttribute('data-pets-picker-readiness-status', 'research');
    await expect(readinessStatus).toContainText(
      'Ready to research — all 4 readiness checks confirmed',
    );
    await expect(readinessStatus).toContainText('still does not approve an adoption');

    await expect.poll(() => page.evaluate(() => (
      (window as any).__toolData.petsLab.pickReadiness
    ))).toEqual({
      housing: true,
      caregiver: true,
      budget: true,
      backup: true,
    });

    await page.getByRole('button', { name: 'Open illustrative lifetime costs' }).click();
    await expect(page.locator('.petslab-cost-view')).toBeVisible();
    await expect(page.locator('#wrap')).toContainText('Lifetime Cost & Commitment');
  });

  test('Lifetime Cost separates contingency and turns local research into a bounded scenario', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1000 });
    await harness.mount(page, {
      petsLab: {
        view: 'cost',
        costSpecies: 'cat-indoor',
        costYears: 12,
        costMode: 'local',
        costEstimates: {
          'cat-indoor': {
            firstYear: 2200,
            privateNote: 'PRIVATE COST NOTE',
          },
          removedSpecies: {
            firstYear: 99999,
            annual: 99999,
            emergencyFund: 99999,
          },
        },
      },
    }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((element) => {
      (element as HTMLElement).style.width = '320px';
    });

    const basis = page.locator('.petslab-cost-basis');
    await expect(basis.getByRole('radio', { name: 'My researched estimates' })).toBeChecked();
    const fields = basis.getByRole('spinbutton');
    await expect(fields).toHaveCount(3);

    const status = page.locator('#pets-cost-source-status');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toContainText('1 of 3 dollar values replaced');

    const firstYear = page.locator('[data-pets-cost-input="firstYear"]');
    const annual = page.locator('[data-pets-cost-input="annual"]');
    const contingency = page.locator('[data-pets-cost-input="emergencyFund"]');
    await expect(firstYear).toHaveValue('2200');
    await expect(firstYear).toHaveAttribute('data-pets-cost-input-source', 'local');
    await expect(annual).toHaveValue('1100');
    await expect(annual).toHaveAttribute('data-pets-cost-input-source', 'starter');
    await expect(firstYear).toHaveAttribute('aria-describedby', /pets-cost-source-status/);

    await annual.fill('1400');
    await contingency.fill('3200');
    await expect(status).toHaveAttribute('data-pets-cost-source-status', 'researched');
    await expect(status).toContainText('all 3 dollar values have been replaced');

    const summary = page.locator('.petslab-cost-summary');
    await expect(summary).toContainText('12-year research scenario');
    await expect(summary).toContainText('Baseline planned cost');
    await expect(summary).toContainText('$17,600');
    await expect(summary).toContainText('Separate contingency savings target: $3,200');
    await expect(summary).toContainText('not predicted spending');
    await expect(summary).toContainText('not added to the baseline total');

    const allocation = page.locator('.petslab-cost-allocation-bar');
    await expect(allocation).toHaveAttribute('aria-label', /Baseline planned spending \$17,600/);
    expect(await allocation.getAttribute('aria-label')).not.toContain('3,200');
    await expect(allocation.locator('.petslab-cost-allocation-segment')).toHaveCount(2);

    await expect.poll(() => page.evaluate(() => (
      (window as any).__toolData.petsLab.costEstimates
    ))).toEqual({
      'cat-indoor': { firstYear: 2200, annual: 1400, emergencyFund: 3200 },
    });
    await expect.poll(() => page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null');
      return stored && {
        costMode: stored.costMode,
        costEstimates: stored.costEstimates,
      };
    })).toEqual({
      costMode: 'local',
      costEstimates: {
        'cat-indoor': { firstYear: 2200, annual: 1400, emergencyFund: 3200 },
      },
    });

    await page.locator('label[for="cs-dog-large"]').click();
    await expect(status).toContainText('0 of 3 dollar values replaced');
    await page.locator('[data-pets-cost-input="annual"]').fill('2600');
    await page.locator('label[for="cs-cat-indoor"]').click();
    await expect(annual).toHaveValue('1400');
    await page.getByRole('button', { name: 'Reset this species to starter values' }).click();
    await expect(status).toContainText('0 of 3 dollar values replaced');
    await expect(firstYear).toHaveValue('1800');
    await expect(annual).toHaveValue('1100');
    await expect(summary).toContainText('$13,900');
    await expect.poll(() => page.evaluate(() => (
      (window as any).__toolData.petsLab.costEstimates
    ))).toEqual({
      'dog-large': { annual: 2600 },
    });

    const audit = await page.evaluate(async () => {
      const wrap = document.getElementById('wrap') as HTMLElement;
      const axeResult = await (window as any).axe.run(wrap, {
        resultTypes: ['violations'],
      });
      return {
        overflow: Math.max(document.documentElement.scrollWidth, wrap.scrollWidth) - window.innerWidth,
        serious: axeResult.violations
          .filter((violation: any) => violation.impact === 'critical' || violation.impact === 'serious')
          .map((violation: any) => violation.id),
      };
    });
    expect(audit.overflow).toBeLessThanOrEqual(1);
    expect(audit.serious).toEqual([]);
  });

  test('Care interactions remain distinct 44px targets at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1000 });
    await harness.mount(page, {
      petsLab: {
        view: 'careSim',
        careSim: {
          species: 'dog',
          day: 0,
          choices: [],
          phys: 50,
          ment: 50,
          soc: 50,
          env: 50,
          en: 100,
          money: 800,
          startMoney: 800,
          lowMoney: false,
          tiredCare: 0,
          done: false,
          dailyInteractions: {},
        },
      },
    }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((el) => {
      (el as HTMLElement).style.width = '320px';
    });

    const zones = page.locator('.petslab-care-zone');
    await expect(zones).toHaveCount(5);
    const geometry = await zones.evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    }));
    expect(geometry.every((box) => box.width >= 44 && box.height >= 44)).toBe(true);
    for (let a = 0; a < geometry.length; a += 1) {
      for (let b = a + 1; b < geometry.length; b += 1) {
        const overlapWidth = Math.min(geometry[a].right, geometry[b].right) -
          Math.max(geometry[a].left, geometry[b].left);
        const overlapHeight = Math.min(geometry[a].bottom, geometry[b].bottom) -
          Math.max(geometry[a].top, geometry[b].top);
        expect(overlapWidth > 0 && overlapHeight > 0).toBe(false);
      }
    }

    const feed = page.getByRole('button', { name: /Care interaction: Feed/ });
    await feed.click();
    await expect.poll(() => page.evaluate(() => (
      !!(window as any).__toolData.petsLab.careSim.dailyInteractions?.[0]?.feed
    ))).toBe(true);
    await expect(page.locator('.petslab-care-zone--feed')).toHaveAttribute(
      'aria-label',
      /^Already done today: Feed/,
    );

    const width = await page.evaluate(() => {
      const wrap = document.getElementById('wrap')!;
      return Math.max(document.documentElement.scrollWidth, wrap.scrollWidth);
    });
    expect(width).toBeLessThanOrEqual(320);
  });

  test('decoder celebration has one reduced-motion assertive status', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'bodyLang',
        blMode: 'quiz',
        blSeenKeys: [],
        blMissedKeys: [],
        decoderMastery: {},
      },
    }, undefined, { expectCanvas: false });
    await page.evaluate(() => document.body.classList.add('reduce-motion'));

    await page.getByRole('button', { name: /Unseen \(up to 10 of 27\)/ }).click();
    const correctIndex = await page.evaluate(() => {
      const quiz = (window as any).__toolData.petsLab.blQuiz;
      return quiz.qs[quiz.idx].correct;
    });
    const choices = page.getByRole('group', { name: 'Choose the most likely meaning' })
      .getByRole('button');
    await choices.nth(correctIndex).click();

    const celebration = page.locator(
      '.petslab-decoder-celeb[role="status"][aria-live="assertive"]',
    );
    await expect(celebration).toHaveCount(1);
    await expect(celebration).toBeVisible();
    await expect(celebration).toHaveCSS('animation-name', 'none');

    await page.evaluate(() => {
      (window as any).__alloflowPetsLab = { _replace: true, version: 2 };
      window.dispatchEvent(new Event('alloflow-petslab-restored'));
    });
    await expect(celebration).toHaveCount(0);
  });

  test('app-level reduced motion disables menu, quiz, and simulator meter transitions', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'menu',
        careSim: {
          species: 'dog',
          day: 0,
          choices: [],
          phys: 50,
          ment: 50,
          soc: 50,
          env: 50,
          en: 100,
          money: 800,
          startMoney: 800,
          lowMoney: false,
          tiredCare: 0,
          done: false,
          dailyInteractions: {},
        },
      },
    }, undefined, { expectCanvas: false });
    await page.evaluate(() => document.body.classList.add('reduce-motion'));

    const menuTile = page.locator('.petslab-menu-tile').first();
    await expect(menuTile).toHaveCSS('transition-duration', '0s');
    await menuTile.hover();
    await expect(menuTile).toHaveCSS('transform', 'none');

    await page.evaluate(() => {
      (window as any).__ctx.update('petsLab', 'view', 'quiz');
    });
    await expect(page.locator('.petslab-quiz-progress span')).toHaveCSS(
      'transition-duration',
      '0s',
    );

    await page.evaluate(() => {
      (window as any).__ctx.update('petsLab', 'view', 'careSim');
    });
    const meterFills = page.locator('.petslab-meter-fill');
    await expect(meterFills).toHaveCount(4);
    for (const meter of await meterFills.all()) {
      await expect(meter).toHaveCSS('transition-duration', '0s');
    }
  });
});
