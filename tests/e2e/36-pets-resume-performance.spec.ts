import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_pets.js',
  toolId: 'petsLab',
  width: 900,
  height: 1000,
  appStyles: true,
  probes: `
    window.__petsRenderCount = 0;
    window.__petsCameraPose = null;
    var petsNativeRenderer = window.THREE.WebGLRenderer;
    window.THREE.WebGLRenderer = function () {
      var renderer = Reflect.construct(
        petsNativeRenderer,
        Array.prototype.slice.call(arguments),
        petsNativeRenderer
      );
      var petsNativeRender = renderer.render;
      renderer.render = function (scene, camera) {
        window.__petsRenderCount += 1;
        if (camera && camera.position) {
          window.__petsCameraPose = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z,
          };
        }
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

test.describe('Pets Lab resume integrity and idle rendering', () => {
  test.describe.configure({ timeout: 150_000 });
  test.beforeAll(async () => { await harness.start(); });
  test.afterAll(async () => { await harness.stop(); });
  test.afterEach(async ({ page }) => { await harness.destroy(page); });

  test('a corrupt Trainer attempt recovers to its usable start screen', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'training',
        trMode: 'sim',
        trSim: { idx: 999, choices: 'old-schema', prob: 999, trust: -4, log: {} },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.getByRole('button', { name: /Start 10-round trainer/ })).toBeVisible();
    await expect(page.locator('#wrap')).not.toContainText('Pets Lab failed to render');
    await expect.poll(() => page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null');
      return raw?.trSim;
    })).toBeNull();
  });

  test('a corrupt Household Hazard attempt recovers inside its open game region', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'nutrition',
        tfsOpen: true,
        tfsIdx: 999,
        tfsShown: 'old-schema',
        tfsAns: true,
        tfsPick: 'raw answer text',
        tfsScore: 999,
        tfsRounds: 999,
      },
    }, undefined, { expectCanvas: false });

    const game = page.getByRole('region', { name: 'Household Hazard Sleuth quiz game' });
    await expect(game.getByRole('button', { name: /Start — vignette 1 of 10/ })).toBeVisible();
    await expect(page.locator('#wrap')).not.toContainText('Pets Lab failed to render');
    await expect.poll(() => page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null');
      return {
        idx: raw?.tfsIdx,
        answered: raw?.tfsAns,
        pick: raw?.tfsPick,
        score: raw?.tfsScore,
        rounds: raw?.tfsRounds,
        streak: raw?.tfsStreak,
        shown: raw?.tfsShown,
      };
    })).toEqual({
      idx: -1, answered: false, pick: null,
      score: 0, rounds: 0, streak: 0, shown: [],
    });
    await game.getByRole('button', { name: /Start — vignette 1 of 10/ }).click();
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        active: pets.tfsIdx >= 0 && pets.tfsIdx < 10,
        score: pets.tfsScore,
        rounds: pets.tfsRounds,
        shown: pets.tfsShown?.length,
      };
    })).toEqual({ active: true, score: 0, rounds: 0, shown: 1 });
  });

  test('a corrupt Lifespan attempt recovers to its usable start screen', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'lifespan',
        lsIdx: 999,
        lsShown: [999, -1, 'raw'],
        lsAns: true,
        lsPick: 'removed-bucket',
        lsScore: 999,
        lsRounds: 999,
      },
    }, undefined, { expectCanvas: false });

    const start = page.getByRole('button', { name: /Start — vignette 1 of 10/ });
    await expect(start).toBeVisible();
    await expect(page.locator('#wrap')).not.toContainText('Pets Lab failed to render');
    await expect.poll(() => page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null');
      return {
        idx: raw?.lsIdx,
        answered: raw?.lsAns,
        pick: raw?.lsPick,
        score: raw?.lsScore,
        rounds: raw?.lsRounds,
        streak: raw?.lsStreak,
        shown: raw?.lsShown,
      };
    })).toEqual({
      idx: -1, answered: false, pick: null,
      score: 0, rounds: 0, streak: 0, shown: [],
    });
    await start.click();
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        active: pets.lsIdx >= 0 && pets.lsIdx < 10,
        score: pets.lsScore,
        rounds: pets.lsRounds,
        shown: pets.lsShown?.length,
      };
    })).toEqual({ active: true, score: 0, rounds: 0, shown: 1 });
  });

  test('a hostile Care Sim snapshot heals to canonical progress without a false result', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'careSim',
        careSim: {
          species: 'dog',
          day: 6,
          choices: [
            {
              choiceId: 'full',
              choiceLabel: { raw: 'object-valued label must never render' },
              note: { raw: 'object-valued note must never render' },
              effects: { phys: 999, exploit: true },
              unknownChoiceField: 'drop me',
            },
            {
              choiceId: 'not-an-authored-choice',
              choiceLabel: { raw: 'unknown choice label' },
              note: { raw: 'unknown choice note' },
              effects: { phys: 999 },
            },
            {
              choiceId: 'reduce',
              choiceLabel: 'A valid later-day choice cannot bridge the invalid gap',
            },
          ],
          phys: 999,
          ment: -20,
          soc: '71',
          env: null,
          en: 'not-a-number',
          money: 25_000,
          startMoney: 999_999,
          lowMoney: true,
          tiredCare: 999,
          done: true,
          badgeEarned: true,
          dailyInteractions: {
            0: { feed: true, pet: 'true', exploit: true },
            1: ['not-an-interaction-map'],
            '-1': { play: true },
            7: { clean: true },
            intruder: { water: true },
          },
          lastInteract: { kind: 'exploit', t: 'raw' },
          unknownStateField: 'drop me',
        },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('#wrap')).not.toContainText('Pets Lab failed to render');
    await expect(page.locator('.petslab-care-reflection')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Choose your action' })).toBeVisible();
    await expect(page.locator('#wrap')).toContainText(/Day 2/);

    await expect.poll(() => page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null');
      const care = raw?.careSim;
      const first = care?.choices?.[0];
      return {
        stateKeys: care ? Object.keys(care).sort() : [],
        species: care?.species,
        day: care?.day,
        choiceCount: care?.choices?.length,
        choiceKeys: first ? Object.keys(first).sort() : [],
        choiceId: first?.choiceId,
        canonicalLabel: typeof first?.choiceLabel === 'string'
          && first.choiceLabel.startsWith('Full routine:'),
        canonicalNote: typeof first?.note === 'string'
          && first.note.startsWith('Strong start.'),
        effects: first?.effects,
        meters: {
          phys: care?.phys,
          ment: care?.ment,
          soc: care?.soc,
          env: care?.env,
          en: care?.en,
          money: care?.money,
          startMoney: care?.startMoney,
          lowMoney: care?.lowMoney,
          tiredCare: care?.tiredCare,
        },
        done: care?.done,
        badgeEarned: care?.badgeEarned,
        interactions: care?.dailyInteractions,
        lastInteract: care?.lastInteract,
        moduleComplete: !!raw?.modulesCompleted?.careSim,
        activityEvidence: (raw?.evidenceRecords || [])
          .filter((record: any) => record?.moduleId === 'careSim' && record?.kind === 'activity')
          .length,
        careBadge: !!raw?.badges?.pets_care_week,
      };
    })).toEqual({
      stateKeys: [
        'badgeEarned', 'choices', 'dailyInteractions', 'day', 'done',
        'en', 'env', 'lastInteract', 'lowMoney', 'ment', 'money', 'phys',
        'soc', 'species', 'startMoney', 'tiredCare',
      ],
      species: 'dog',
      day: 1,
      choiceCount: 1,
      choiceKeys: ['choiceId', 'choiceLabel', 'dayLabel', 'effects', 'note'],
      choiceId: 'full',
      canonicalLabel: true,
      canonicalNote: true,
      effects: { phys: 12, ment: 10, soc: 8, env: 6, en: -15, money: 0 },
      meters: {
        phys: 100,
        ment: 0,
        soc: 71,
        env: 50,
        en: 100,
        money: 10_000,
        startMoney: 500,
        lowMoney: false,
        tiredCare: 35,
      },
      done: false,
      badgeEarned: false,
      interactions: { 0: { feed: true } },
      lastInteract: null,
      moduleComplete: false,
      activityEvidence: 0,
      careBadge: false,
    });
  });

  test('hostile AI Practice state drops unknown scenarios and non-text private fields', async ({ page }) => {
    const privateText = 'PRIVATE UNKNOWN SCENARIO DATA';
    await harness.mount(page, {
      petsLab: {
        view: 'aiPractice',
        aiScenarioId: 'cat-litter',
        aiResponse: { private: privateText },
        aiDrafts: {
          'family-pick': 'A valid family draft',
          'cat-litter': { private: privateText },
          removed: privateText,
        },
        aiCritiques: {
          'family-pick': {
            text: 'A valid critique',
            source: 'ai',
            draftSnapshot: 'A valid family draft',
            createdAt: '2026-08-26T12:00:00.000Z',
          },
          'cat-litter': { text: { private: privateText } },
          removed: { text: privateText },
        },
        aiRevisionNotes: {
          'family-pick': 'A valid revision note',
          'cat-litter': { private: privateText },
          removed: privateText,
        },
        aiLoadingCritique: 'false',
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('#wrap')).not.toContainText('Pets Lab failed to render');
    await expect(page.locator('#pets-ai-response')).toHaveValue('');
    await expect(page.locator('#wrap')).not.toContainText(privateText);
    await expect(page.locator('.petslab-ai-critique')).toHaveCount(0);

    await expect.poll(() => page.evaluate((privateValue) => {
      const pets = (window as any).__toolData.petsLab;
      const stored = JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null');
      return {
        scenarioId: pets.aiScenarioId,
        response: pets.aiResponse,
        draftKeys: Object.keys(pets.aiDrafts || {}).sort(),
        critiqueKeys: Object.keys(pets.aiCritiques || {}).sort(),
        noteKeys: Object.keys(pets.aiRevisionNotes || {}).sort(),
        loading: pets.aiLoadingCritique,
        storedPrivate: JSON.stringify(stored || {}).includes(privateValue),
      };
    }, privateText)).toEqual({
      scenarioId: 'cat-litter',
      response: '',
      draftKeys: ['family-pick'],
      critiqueKeys: ['family-pick'],
      noteKeys: ['family-pick'],
      loading: false,
      storedPrivate: false,
    });
  });

  test('hostile route and Care Trade-off state heal without retaining unknown private fields', async ({ page }) => {
    const privateText = 'PRIVATE CARE INQUIRY PAYLOAD';
    const hostileLog = Array.from({ length: 12 }, (_, index) => ({
      t: '12:00:' + String(index).padStart(2, '0'),
      sp: 'parrot',
      gap: index,
      state: 'Mixed model fit',
      worst: 'Social contact',
      provided: 140,
      need: -4,
      privateText,
    }));
    hostileLog.push({
      t: 'invalid',
      sp: 'removed',
      gap: { privateText },
      state: privateText,
      worst: privateText,
    } as any);

    await harness.mount(page, {
      petsLab: {
        view: { privateText } as any,
        lastView: 'constructor',
        welfareSec: 'constructor',
        welfareVisited: { constructor: true },
        modulesCompleted: {
          constructor: {
            completed: '2026-08-27T12:00:00.000Z',
            reason: privateText,
          },
        },
        badges: {
          constructor: {
            earned: '2026-08-27T12:00:00.000Z',
            label: privateText,
          },
        },
        evidenceRecords: [{
          moduleId: 'constructor',
          moduleLabel: privateText,
          summary: privateText,
          recordedAt: '2026-08-27T12:00:00.000Z',
        }],
        careTradeoff: {
          species: 'removed',
          food: 'not-a-number',
          exercise: -13,
          social: 43,
          vet: 999,
          training: null,
          hypothesis: { privateText },
          explanation: [privateText],
          stuckRevealed: 'true',
          understood: 'true',
          log: hostileLog,
          unknownPrivateField: privateText,
        },
      },
    }, undefined, { expectCanvas: false });

    await expect(page.locator('.petslab-view-boundary')).toHaveAttribute('data-petslab-view', 'menu');
    await expect(page.locator('#wrap')).not.toContainText(privateText);
    await page.getByText('Advanced inquiry: model a care tradeoff', { exact: true }).click();
    await expect(page.locator('#pets-care-inquiry-hypothesis')).toHaveValue('');
    await expect(page.getByRole('slider', { name: 'Food/nutrition provided level' })).toHaveValue('50');
    await expect(page.getByRole('slider', { name: 'Exercise provided level' })).toHaveValue('0');
    await expect(page.getByRole('slider', { name: 'Social contact provided level' })).toHaveValue('45');
    await expect(page.getByRole('slider', { name: 'Vet care provided level' })).toHaveValue('100');
    await expect(page.locator('#pets-care-inquiry-privacy-note'))
      .toContainText('save with this project');

    await expect.poll(() => page.evaluate((privateValue) => {
      const pets = (window as any).__toolData.petsLab;
      const stored = JSON.parse(localStorage.getItem('petsLab.state.v2') || 'null');
      return {
        view: pets.view,
        species: pets.careTradeoff?.species,
        sliders: [
          pets.careTradeoff?.food,
          pets.careTradeoff?.exercise,
          pets.careTradeoff?.social,
          pets.careTradeoff?.vet,
          pets.careTradeoff?.training,
        ],
        logLength: pets.careTradeoff?.log?.length,
        understood: pets.careTradeoff?.understood,
        completionKeys: Object.keys(pets.modulesCompleted || {}),
        badgeKeys: Object.keys(pets.badges || {}),
        evidenceCount: pets.evidenceRecords?.length || 0,
        lastView: pets.lastView,
        welfareSec: pets.welfareSec,
        welfareVisitedKeys: Object.keys(pets.welfareVisited || {}),
        hasPrivate: JSON.stringify(pets || {}).includes(privateValue),
        storedPrivate: JSON.stringify(stored || {}).includes(privateValue),
      };
    }, privateText)).toEqual({
      view: 'menu',
      species: 'dog',
      sliders: [50, 0, 45, 100, 50],
      logLength: 8,
      understood: false,
      completionKeys: [],
      badgeKeys: [],
      evidenceCount: 0,
      lastView: null,
      welfareSec: 'spayNeuter',
      welfareVisitedKeys: [],
      hasPrivate: false,
      storedPrivate: false,
    });
  });

  test('a reduced-motion dog scene sleeps, wakes for input, and stops on lost key-up', async ({ page }) => {
    await harness.mount(page, {
      petsLab: {
        view: 'sensory',
        sensoryActive: true,
        sensorySpecies: 'dog',
        sensoryReduceMotion: true,
        _threeLoaded: true,
      },
    });

    await expect(page.locator('.petslab-sensory-stage canvas')).toHaveCount(1);
    await expect.poll(() => page.evaluate(() => (window as any).__petsRenderCount))
      .toBeGreaterThan(0);
    const idleEnd = await stableRenderCount(page);
    const idlePose = await page.evaluate(() => (window as any).__petsCameraPose);

    const stage = page.locator('.petslab-sensory-stage');
    await stage.focus();
    await expect(stage).toBeFocused();
    await page.keyboard.down('ArrowUp');
    await expect.poll(() => page.evaluate(() => (window as any).__petsRenderCount))
      .toBeGreaterThan(idleEnd + 2);
    await expect.poll(() => page.evaluate((start) => {
      const current = (window as any).__petsCameraPose;
      if (!start || !current) return 0;
      return Math.hypot(current.x - start.x, current.z - start.z);
    }, idlePose)).toBeGreaterThan(0.01);

    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    const settledEnd = await stableRenderCount(page);
    expect(settledEnd).toBeGreaterThan(idleEnd + 2);
    const settledPose = await page.evaluate(() => (window as any).__petsCameraPose);
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => ({
      count: (window as any).__petsRenderCount,
      pose: (window as any).__petsCameraPose,
    }))).toEqual({ count: settledEnd, pose: settledPose });
    await page.keyboard.up('ArrowUp');

    await page.evaluate(() => {
      (window as any).__alloflowPetsLab = { _replace: true, version: 2 };
      window.dispatchEvent(new Event('alloflow-petslab-restored'));
    });
    await expect(page.locator('.petslab-sensory-stage canvas')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => {
      const pets = (window as any).__toolData.petsLab;
      return {
        active: pets.sensoryActive,
        loaded: pets._threeLoaded,
        loading: pets._threeLoading,
        error: pets._threeError,
      };
    })).toEqual({ active: false, loaded: false, loading: false, error: false });
  });
});
