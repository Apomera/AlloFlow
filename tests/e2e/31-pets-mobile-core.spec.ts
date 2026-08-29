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

const views = [
  'menu', 'dogs', 'cats', 'smallMammals', 'birds', 'reptiles', 'training',
  'nutrition', 'genetics', 'zoonoses', 'service', 'welfare', 'careSim',
  'sensory', 'picker', 'bodyLang', 'decoderMastery', 'cost', 'lifespan',
  'diagrams', 'aiPractice', 'famous', 'glossary', 'myths', 'careers',
  'action', 'quiz', 'resources', 'teacher',
];

test.describe('Pet Lab phone-width core', () => {
  test.describe.configure({ timeout: 180_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  for (const width of [320]) {
    test(`all module entry states fit and pass serious axe rules at ${width}px`, async ({ page }) => {
      const findings: any[] = [];
      await page.setViewportSize({ width, height: 1000 });
      for (const view of views) {
        await page.goto(harness.url + '/__harness');
        await page.waitForFunction(() => !!(window as any).StemLab?._registry?.petsLab);
        await page.evaluate((seed) => (window as any).__mount({ petsLab: { view: seed } }), view);
        await page.waitForTimeout(350);
        await page.locator('#wrap').evaluate((el, w) => { (el as HTMLElement).style.width = `${w}px`; }, width);
        await page.waitForTimeout(150);
        const result = await page.evaluate(async () => {
          const axeResult = await (window as any).axe.run(document.getElementById('wrap'), {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          });
          const wrap = document.getElementById('wrap')!;
          const overflow = Math.max(document.documentElement.scrollWidth, wrap.scrollWidth) - window.innerWidth;
          return {
            overflow,
            offenders: overflow > 1 ? Array.from(wrap.querySelectorAll('*')).map((node) => {
              const el = node as HTMLElement;
              const box = el.getBoundingClientRect();
              return {
                tag: el.tagName.toLowerCase(),
                cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 100) : '',
                text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100),
                left: Math.round(box.left),
                right: Math.round(box.right),
                width: Math.round(box.width),
              };
            }).filter((item) => item.right > window.innerWidth + 1 || item.left < -1).slice(-12) : [],
            violations: axeResult.violations
              .filter((v: any) => v.impact === 'critical' || v.impact === 'serious')
              .map((v: any) => ({
                id: v.id,
                impact: v.impact,
                nodes: v.nodes.map((node: any) => ({ target: node.target, html: node.html, summary: node.failureSummary })),
              })),
          };
        });
        findings.push({ view, ...result });
        await page.evaluate(() => (window as any).__destroy());
      }
      const problems = findings.filter((f) => f.overflow > 1 || f.violations.length);
      if (problems.length) console.log(JSON.stringify({ width, problems }));
      expect(problems).toEqual([]);
    });
  }

  test('care inquiry survives partial saved state, logs useful context, and fits at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 1000 });
    await harness.mount(page, {
      petsLab: { view: 'menu', careTradeoff: { species: 'rabbit', food: 65 } },
    }, undefined, { expectCanvas: false });
    await page.locator('#wrap').evaluate((el) => { (el as HTMLElement).style.width = '320px'; });
    await page.locator('.petslab-inquiry-disclosure summary').click();

    const widget = page.locator('.petslab-care-tradeoff');
    await expect(widget).toBeVisible();
    await expect(widget.locator('input[type=range]')).toHaveCount(5);
    const analysis = widget.locator('.petslab-tradeoff-analysis');
    await expect(analysis).not.toHaveJSProperty('open', true);
    await expect(widget.locator('.petslab-tradeoff-dashboard')).not.toBeVisible();
    await widget.getByRole('button', { name: /Log this scenario/ }).click();
    const log = widget.getByRole('log', { name: 'Logged care scenarios' });
    await expect(log).toContainText('rabbit');
    await expect(log).toContainText('largest Food/nutrition P65/T25');

    const result = await page.evaluate(async () => {
      const wrap = document.getElementById('wrap')!;
      const axeResult = await (window as any).axe.run(wrap, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      });
      const visibleBoxes = (selector: string) => Array.from(wrap.querySelectorAll(selector))
        .map((node) => (node as HTMLElement).getBoundingClientRect())
        .filter((box) => box.width > 0 && box.height > 0)
        .map((box) => ({ width: box.width, height: box.height }));
      return {
        width: Math.max(document.documentElement.scrollWidth, wrap.scrollWidth),
        widgetHeight: Math.round((wrap.querySelector('.petslab-care-tradeoff') as HTMLElement).getBoundingClientRect().height),
        buttonBoxes: visibleBoxes('.petslab-care-tradeoff button'),
        rangeBoxes: visibleBoxes('.petslab-care-tradeoff input[type=range]'),
        checkboxBoxes: visibleBoxes('.petslab-care-tradeoff input[type=checkbox]'),
        serious: axeResult.violations
          .filter((v: any) => v.impact === 'critical' || v.impact === 'serious')
          .map((v: any) => v.id),
      };
    });
    expect(result.width).toBeLessThanOrEqual(320);
    expect(result.widgetHeight).toBeLessThan(1300);
    expect(result.buttonBoxes.every((box) => box.height >= 43)).toBe(true);
    expect(result.rangeBoxes).toHaveLength(5);
    expect(result.rangeBoxes.every((box) => box.height >= 43)).toBe(true);
    expect(result.checkboxBoxes.every((box) => box.width >= 23 && box.height >= 23)).toBe(true);
    expect(result.serious).toEqual([]);
  });

  test('completion is explicit and route focus returns to the originating tile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await harness.mount(page, { petsLab: { view: 'menu' } }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-care-tradeoff')).toHaveCount(0);
    const catalog = page.locator('.petslab-catalog');
    await catalog.locator('summary').click();
    const dogsTile = page.locator('[data-pets-module-id=dogs]');
    await dogsTile.click();
    await expect(page.locator('.petslab-view-title')).toBeFocused();
    await page.getByRole('button', { name: 'I reviewed this module' }).click();
    await expect(page.getByText('✓ Complete', { exact: true })).toBeVisible();
    await expect(page.locator('.petslab-view-title')).toBeFocused();
    await page.getByRole('button', { name: 'Back to Pets Lab menu' }).click();
    await expect(dogsTile).toBeFocused();
    await expect(page.locator('.petslab-command-stat').filter({ hasText: 'Completed' })).toContainText('1 / 26');

    const catsTile = page.locator('[data-pets-module-id=cats]');
    await catsTile.click();
    await expect(page.locator('.petslab-view-title')).toBeFocused();
    await page.getByRole('button', { name: 'Back to Pets Lab menu' }).click();
    await expect(catalog).toHaveJSProperty('open', true);
    await expect(catsTile).toBeFocused();
    await expect(page.locator('.petslab-command-stat').filter({ hasText: 'Started' })).toContainText('2 / 26');
    await expect(page.locator('.petslab-command-stat').filter({ hasText: 'Completed' })).toContainText('1 / 26');
  });

  test('menu discovery filters progress and learning-path links lead somewhere', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await harness.mount(page, {
      petsLab: {
        view: 'menu',
        modulesVisited: {
          dogs: '2026-08-25T12:00:00.000Z',
          cats: '2026-08-25T12:05:00.000Z',
        },
        modulesCompleted: {
          dogs: { completed: '2026-08-25T12:10:00.000Z', reason: 'Read species evidence' },
        },
      },
    }, undefined, { expectCanvas: false });

    const filters = page.getByRole('group', { name: 'Filter modules by progress' });
    await filters.getByRole('button', { name: 'Completed', exact: true }).click();
    await expect(page.locator('.petslab-menu-result-count')).toHaveText('1 found');
    await expect(page.locator('.petslab-filtered-grid [data-pets-module-id]')).toHaveCount(1);
    await expect(page.locator('[data-pets-module-id=dogs]')).toContainText('Reviewed by learner');
    await expect(page.locator('[data-pets-module-id=cats]')).toHaveCount(0);

    await filters.getByRole('button', { name: 'All modules', exact: true }).click();
    const search = page.getByLabel('Search modules');
    await search.fill('obligate carnivore');
    await expect(page.locator('.petslab-menu-result-count')).toHaveText('1 found');
    await page.locator('[data-pets-module-id=cats]').click();
    await expect(page.locator('.petslab-view-title')).toBeFocused();

    await page.getByRole('button', { name: 'Practice pet training' }).click();
    await expect(page.locator('.petslab-view-title')).toContainText('Pet Training');
    await expect(page.locator('.petslab-view-title')).toBeFocused();
    await page.getByRole('button', { name: 'Back to Pets Lab menu' }).click();
    await expect(search).toHaveValue('obligate carnivore');
    await expect(page.locator('.petslab-view-title')).toBeFocused();

    await search.fill('dogs');
    await page.locator('[data-pets-module-id=dogs]').click();
    await page.evaluate(() => {
      const w = window as any;
      w.__stemHandoff = {};
      w.__ctx.setStemLabTab = (tab: string) => { w.__stemHandoff.tab = tab; };
      w.__ctx.setStemLabTool = (tool: string) => { w.__stemHandoff.tool = tool; };
    });
    await page.getByRole('button', { name: 'Open BehaviorLab' }).click();
    const handoff = await page.evaluate(() => (window as any).__stemHandoff);
    expect(handoff).toEqual({ tab: 'explore', tool: 'behaviorLab' });
  });

  test('finishing the trainer records activity evidence and backfills started progress', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'training',
        trMode: 'sim',
        trSim: {
          idx: 9,
          choices: Array.from({ length: 10 }, (_, i) => i === 9
            ? { rxn: 'treat3s', dProb: 0.1, dTrust: 0, verdict: 'Reinforced the requested behavior.' }
            : null),
          prob: 0.82,
          trust: 0.94,
          done: false,
          log: Array.from({ length: 10 }, (_, i) => ({
            rd: i + 1,
            prob: 0.28 + (i * 0.06),
            trust: 0.94,
            dProb: 0.06,
          })),
        },
      },
    }, undefined, { expectCanvas: false });

    await page.getByRole('button', { name: /See results/ }).click();
    await expect(page.getByText('Solid trainer.', { exact: false })).toBeVisible();
    await expect(page.getByText('✓ Complete', { exact: true })).toBeVisible();
    const progress = await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        completed: pets.modulesCompleted?.training,
        visited: pets.modulesVisited?.training,
      };
    });
    expect(progress.completed.reason).toBe('Finished the 10-round reinforcement trainer');
    expect(progress.visited).toBeTruthy();
  });

  test('offline AI rubric work completes the module with durable evidence', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'aiPractice' } }, undefined, { expectCanvas: false });

    await page.getByRole('button', { name: /Family pet selection/ }).click();
    await page.locator('#pets-ai-response').fill(
      'I would ask about allergies, time at home, exercise, cost, and whether the family can visit a shelter together.',
    );
    await page.getByRole('button', { name: 'Get critique of your response' }).click();
    await expect(page.getByText('Offline rubric check ready', { exact: false })).toBeVisible();
    await expect(page.getByText('✓ Complete', { exact: true })).toBeVisible();

    const progress = await page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        completed: pets.modulesCompleted?.aiPractice,
        visited: pets.modulesVisited?.aiPractice,
      };
    });
    expect(progress.completed.reason).toBe('Wrote a response and completed a rubric check');
    expect(progress.visited).toBeTruthy();

    await page.waitForTimeout(350);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null'));
    expect(stored.modulesCompleted.aiPractice.reason).toBe('Wrote a response and completed a rubric check');
  });

  test('v2 persistence restores activity work and keeps AI drafts per scenario', async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 1000 });
    await harness.mount(page, { petsLab: { view: 'aiPractice' } }, undefined, { expectCanvas: false });

    await page.getByRole('button', { name: /Family pet selection/ }).click();
    const response = page.locator('#pets-ai-response');
    await response.fill('Family draft: ask about allergies, schedules, exercise, and shelter visits.');
    await page.getByRole('button', { name: /Service dog exploration/ }).click();
    await response.fill('Service draft: compare task training with the CGM and plan for cost.');
    await page.getByRole('button', { name: /Family pet selection/ }).click();
    await expect(response).toHaveValue('Family draft: ask about allergies, schedules, exercise, and shelter visits.');

    await page.evaluate(() => {
      (window as any).__ctx.updateMulti('petsLab', {
        modulesCompleted: { dogs: { completed: '2026-08-25T12:00:00.000Z', reason: 'test' } },
        quizState: { idx: 3, score: 2, answered: false, lastChoice: null, missedIds: ['q2'], reviewIds: [], mode: 'all' },
        careTradeoff: { species: 'rabbit', food: 65, hypothesis: 'Social needs may dominate.', log: [] },
      });
    });
    await page.waitForTimeout(300);

    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null'));
    expect(stored.version).toBe(2);
    expect(stored.modulesCompleted.dogs).toBeTruthy();
    expect(stored.quizState.missedIds).toEqual(['q2']);
    expect(stored.careTradeoff.hypothesis).toBe('Social needs may dominate.');
    expect(stored.aiDrafts['family-pick']).toContain('Family draft');
    expect(stored.aiDrafts['service-match']).toContain('Service draft');
    expect(JSON.stringify(stored)).not.toContain('data:image');

    await page.evaluate(() => (window as any).__destroy());
    await page.reload();
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.petsLab);
    await page.evaluate(() => (window as any).__mount({ petsLab: { view: 'menu' } }));
    await expect(page.locator('.petslab-command-stat').filter({ hasText: 'Completed' })).toContainText('1 / 26');
    const restored = await page.evaluate(() => (window as any).__toolData.petsLab);
    expect(restored.quizState.missedIds).toEqual(['q2']);
    expect(restored.careTradeoff.hypothesis).toBe('Social needs may dominate.');
    expect(restored.aiDrafts['family-pick']).toContain('Family draft');
  });

  test('quiz can retry only missed questions and clear them when corrected', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'quiz',
        quizState: {
          idx: 15,
          score: 13,
          answered: false,
          lastChoice: null,
          missedIds: ['q1', 'q2'],
          reviewIds: [],
          mode: 'all',
        },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.getByRole('button', { name: /Review Dogs/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Review Cats/ })).toBeVisible();
    await page.getByRole('button', { name: /Retry 2 missed questions/ }).click();
    await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2');

    await page.getByRole('button', { name: /15,000.*40,000 years/ }).click();
    await page.getByRole('button', { name: /Next question/ }).click();
    await page.getByRole('button', { name: /lost the metabolic ability to synthesize taurine/ }).click();
    await page.getByRole('button', { name: /See results/ }).click();

    await expect(page.getByText('Every retried question is now correct')).toBeVisible();
    await expect(page.getByRole('button', { name: /Retry .* missed/ })).toHaveCount(0);
    const quiz = await page.evaluate(() => (window as any).__toolData.petsLab.quizState);
    expect(quiz.missedIds).toEqual([]);
    expect(quiz.reviewIds).toEqual(['q1', 'q2']);
    expect(quiz.score).toBe(2);
  });

  test('AI critiques stay scoped to their scenario and become stale after a draft revision', async ({ page }) => {
    const familyDraft = 'Family draft about allergies, schedules, exercise, costs, and visiting a shelter.';
    const serviceDraft = 'Service draft about trained tasks, CGM backup, access rights, and long-term cost.';
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
            text: 'FAMILY-SCOPED FEEDBACK',
            source: 'ai',
            draftSnapshot: familyDraft,
            createdAt: '2026-08-25T12:00:00.000Z',
          },
          'service-match': {
            text: 'SERVICE-SCOPED FEEDBACK',
            source: 'local',
            draftSnapshot: serviceDraft,
            createdAt: '2026-08-25T12:05:00.000Z',
          },
        },
      },
    }, undefined, { expectCanvas: false });

    const critique = page.locator('.petslab-ai-critique');
    const response = page.locator('#pets-ai-response');
    await expect(critique).toContainText('FAMILY-SCOPED FEEDBACK');
    await expect(page.locator('.petslab-ai-critique-stale')).toHaveCount(0);

    await response.fill(familyDraft + ' Revised after reading the feedback.');
    await expect(critique).toContainText('FAMILY-SCOPED FEEDBACK');
    await expect(page.locator('.petslab-ai-critique-stale')).toContainText('Draft changed after this critique');

    await page.getByRole('button', { name: /Service dog exploration/ }).click();
    await expect(response).toHaveValue(serviceDraft);
    await expect(critique).toContainText('SERVICE-SCOPED FEEDBACK');
    await expect(critique).not.toContainText('FAMILY-SCOPED FEEDBACK');
    await expect(page.locator('.petslab-ai-critique-stale')).toHaveCount(0);

    await page.getByRole('button', { name: /Family pet selection/ }).click();
    await expect(response).toHaveValue(familyDraft + ' Revised after reading the feedback.');
    await expect(critique).toContainText('FAMILY-SCOPED FEEDBACK');
    await expect(page.locator('.petslab-ai-critique-stale')).toBeVisible();
  });

  test('a deferred AI response is ignored after the learner switches scenarios', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'aiPractice' } }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.callGemini = () => new Promise<string>((resolve) => { w.__resolvePetsCritique = resolve; });
      w.__rerender();
    });

    await page.getByRole('button', { name: /Family pet selection/ }).click();
    await page.locator('#pets-ai-response').fill(
      'I would ask about allergies, schedules, exercise, budget, and meeting suitable shelter animals.',
    );
    await page.getByRole('button', { name: 'Get critique of your response' }).click();
    await expect(page.getByRole('button', { name: 'Getting critique' })).toHaveAttribute('aria-busy', 'true');
    await expect.poll(() => page.evaluate(() => typeof (window as any).__resolvePetsCritique)).toBe('function');

    await page.getByRole('button', { name: /Service dog exploration/ }).click();
    await expect(page.locator('#pets-ai-response')).toHaveValue('');
    await page.evaluate(() => (window as any).__resolvePetsCritique('STALE RESPONSE MUST NOT APPEAR'));
    await page.waitForTimeout(50);

    await expect(page.locator('.petslab-ai-critique')).toHaveCount(0);
    const state = await page.evaluate(() => (window as any).__toolData.petsLab);
    expect(state.aiCritiques?.['family-pick']).toBeUndefined();
    expect(state.modulesCompleted?.aiPractice).toBeUndefined();
    expect(state.aiLoadingCritique).toBe(false);
  });

  test('unmount cancels deferred AI work and a retained busy record recovers on remount', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'aiPractice' } }, undefined, { expectCanvas: false });
    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.callGemini = () => new Promise<string>((resolve) => { w.__resolveUnmountedPetsCritique = resolve; });
      w.__rerender();
    });

    await page.getByRole('button', { name: /Family pet selection/ }).click();
    const draft = 'I would compare allergies, time, exercise, cost, housing, and shelter visits before deciding.';
    await page.locator('#pets-ai-response').fill(draft);
    await page.getByRole('button', { name: 'Get critique of your response' }).click();
    await expect(page.getByRole('button', { name: 'Getting critique' })).toBeDisabled();
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        loading: pets.aiLoadingCritique,
        requestScenario: pets.aiCritiqueRequest?.scenarioId || null,
        resolver: typeof (window as any).__resolveUnmountedPetsCritique,
      };
    })).toEqual({ loading: true, requestScenario: 'family-pick', resolver: 'function' });

    await page.evaluate(() => {
      const w = window as any;
      const retainedToolData = w.__toolData;
      w.__destroy();
      w.__mount(retainedToolData);
    });

    const usableButton = page.getByRole('button', { name: 'Get critique of your response' });
    await expect(usableButton).toBeEnabled();
    await expect(usableButton).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#pets-ai-response')).toHaveValue(draft);
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        loading: !!pets.aiLoadingCritique,
        request: pets.aiCritiqueRequest || null,
      };
    })).toEqual({ loading: false, request: null });

    await page.evaluate(() => (window as any).__resolveUnmountedPetsCritique('LATE FEEDBACK MUST BE IGNORED'));
    await page.waitForTimeout(50);
    await expect(page.locator('.petslab-ai-critique')).toHaveCount(0);
    await expect(usableButton).toBeEnabled();
    const finalState = await page.evaluate(() => (window as any).__toolData.petsLab);
    expect(finalState.aiCritiques?.['family-pick']).toBeUndefined();
    expect(finalState.modulesCompleted?.aiPractice).toBeUndefined();
  });

  test('Welfare tabs support keyboard traversal and award the visit-all badge', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'welfare' } }, undefined, { expectCanvas: false });

    const tabs = page.getByRole('tablist', { name: 'Welfare topic' });
    const spay = tabs.getByRole('tab', { name: /Spay & Neuter/ });
    const adoption = tabs.getByRole('tab', { name: /Adopt-don't-shop/ });
    const declawing = tabs.getByRole('tab', { name: /Declawing/ });
    const outdoor = tabs.getByRole('tab', { name: /Outdoor cats and wildlife/ });

    await spay.focus();
    await spay.press('ArrowRight');
    await expect(adoption).toBeFocused();
    await expect(adoption).toHaveAttribute('aria-selected', 'true');
    await adoption.press('ArrowRight');
    await expect(declawing).toBeFocused();
    await declawing.press('End');
    await expect(outdoor).toBeFocused();
    await expect(outdoor).toHaveAttribute('aria-selected', 'true');
    await outdoor.press('Home');
    await expect(spay).toBeFocused();
    await expect(spay).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveAttribute('id', 'pets-welfare-panel-spayNeuter');

    await expect.poll(async () => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        visited: Object.keys(pets.welfareVisited || {}).sort(),
        badge: pets.badges?.pets_welfare_aware?.label || null,
      };
    })).toEqual({
      visited: ['adoption', 'declawing', 'outdoorCats', 'spayNeuter'],
      badge: 'Welfare-Aware',
    });
  });

  test('Care Sim mood and final verdict follow the weakest welfare domain', async ({ page }) => {
    const careSim = {
      species: 'dog',
      day: 0,
      choices: [],
      phys: 96,
      ment: 94,
      soc: 92,
      env: 20,
      en: 90,
      money: 500,
      startMoney: 500,
      lowMoney: false,
      tiredCare: 0,
      done: false,
    };
    await harness.mount(page, { petsLab: { view: 'careSim', careSim } }, undefined, { expectCanvas: false });

    const stage = page.locator('.petslab-care-stage');
    await expect(stage).toHaveAttribute('data-pets-care-mood', 'distressed');
    await expect(stage).toHaveAttribute('data-pets-care-weakest', 'env');
    await expect(stage.locator('svg[role="img"]')).toHaveAttribute('aria-label', /Mood: distressed/);

    await page.evaluate(() => {
      const w = window as any;
      const current = w.__toolData.petsLab.careSim;
      w.__ctx.update('petsLab', 'careSim', {
        ...current,
        done: true,
        badgeEarned: false,
        choices: [
          { choiceId: 'skip' },
          { choiceId: 'long_alone' },
          { choiceId: 'ignore' },
          { choiceId: 'skip' },
          { choiceId: 'nothing' },
          { choiceId: 'alone_visits' },
          { choiceId: 'allow' },
        ],
      });
    });

    const reflection = page.locator('.petslab-care-reflection');
    await expect(reflection.locator('h3')).toContainText('Critical environmental gap');
    await expect(reflection).not.toContainText('Excellent week');
    await expect(page.locator('.petslab-care-weakest')).toContainText('Weakest domain: Environmental 20%');
    await expect(page.locator('.petslab-care-weakest')).toContainText('Treat them like furniture today');
    await expect(page.getByRole('button', { name: /Retry this species/ })).toBeVisible();
  });

  test('Decoder Signal Log ignores orphan keys and cannot be completed manually', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'decoderMastery',
        decoderMastery: {
          'legacy|removed-signal': { correctCount: 99 },
          '🐕 Dogs|Loose body + soft eyes + open mouth + wagging mid-height tail': {
            correctCount: 1,
            firstCorrectAt: '2026-08-25T12:00:00.000Z',
          },
        },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.getByText('1 / 27', { exact: true })).toBeVisible();
    await expect(page.locator('.petslab-mastery-goal')).toHaveText('Coverage completes at 27 / 27');
    await expect(page.getByText(/coverage record—not proof of durable mastery/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'I reviewed this module' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark complete' })).toHaveCount(0);
    const completion = await page.evaluate(() => (window as any).__toolData.petsLab.modulesCompleted?.decoderMastery);
    expect(completion).toBeUndefined();
  });

  test('authoritative project restore does not inherit warm-cache learner state', async ({ page }) => {
    await page.goto(harness.url + '/__harness');
    await page.waitForFunction(() => !!(window as any).StemLab?._registry?.petsLab);
    await page.evaluate(() => {
      localStorage.setItem('petsLab.state.v2', JSON.stringify({
        version: 2,
        modulesCompleted: { dogs: { completed: '2026-08-25T12:00:00.000Z', reason: 'stale learner' } },
        aiDrafts: { 'family-pick': 'stale learner draft' },
        decoderMastery: { 'legacy|stale': { correctCount: 8 } },
      }));
      (window as any).__alloflowPetsLab = {
        _replace: true,
        version: 2,
        modulesVisited: { cats: '2026-08-25T13:00:00.000Z' },
      };
      (window as any).__mount({ petsLab: { view: 'menu' } });
    });

    await expect.poll(async () => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        visited: Object.keys(pets.modulesVisited || {}),
        completed: pets.modulesCompleted || null,
        drafts: pets.aiDrafts || null,
        mastery: pets.decoderMastery || null,
      };
    })).toEqual({ visited: ['cats'], completed: null, drafts: null, mastery: null });

    await page.evaluate(() => {
      const w = window as any;
      w.__ctx.updateMulti('petsLab', {
        modulesCompleted: { birds: { completed: '2026-08-25T14:00:00.000Z', reason: 'other project' } },
        aiDrafts: { 'service-match': 'other project draft' },
      });
      w.__alloflowPetsLab = {
        _replace: true,
        version: 2,
        quizState: {
          idx: 0,
          score: 0,
          answered: false,
          lastChoice: null,
          missedIds: ['q2'],
          reviewIds: [],
          mode: 'all',
        },
      };
      window.dispatchEvent(new Event('alloflow-petslab-restored'));
    });

    await expect.poll(async () => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        visited: pets.modulesVisited || null,
        completed: pets.modulesCompleted || null,
        drafts: pets.aiDrafts || null,
        missed: pets.quizState?.missedIds || [],
      };
    })).toEqual({ visited: null, completed: null, drafts: null, missed: ['q2'] });
  });

  test('unmount flushes the latest AI draft without waiting for the storage debounce', async ({ page }) => {
    await harness.mount(page, { petsLab: { view: 'aiPractice' } }, undefined, { expectCanvas: false });
    await page.getByRole('button', { name: /Family pet selection/ }).click();
    const finalDraft = 'Final draft typed immediately before leaving the lab.';
    await page.locator('#pets-ai-response').fill(finalDraft);
    await expect.poll(() => page.evaluate(() => (
      (window as any).__alloflowPetsLab?.aiDrafts?.['family-pick'] || ''
    ))).toBe(finalDraft);

    await page.evaluate(() => {
      localStorage.removeItem('petsLab.state.v2');
      (window as any).__destroy();
    });
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null'));
    expect(stored.aiDrafts['family-pick']).toBe(finalDraft);
  });

});
