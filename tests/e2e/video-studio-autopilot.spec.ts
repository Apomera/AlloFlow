import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const studioHtml = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf8');

test('official tutorial checks readiness, records, quality-checks, and recovers narration', async ({ page, context }) => {
  test.setTimeout(75_000);
  await context.addInitScript(() => {
    const makeStream = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      const ctx = canvas.getContext('2d')!;
      let frame = 0;
      const paint = () => {
        ctx.fillStyle = frame++ % 2 ? '#1e293b' : '#312e81';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '36px sans-serif';
        ctx.fillText('AlloFlow tutorial fixture', 80, 140);
        requestAnimationFrame(paint);
      };
      paint();
      const stream = canvas.captureStream(20);
      const track = stream.getVideoTracks()[0];
      Object.defineProperty(track, 'label', { configurable: true, get: () => 'AlloFlow - E2E fixture' });
      Object.defineProperty(track, 'getSettings', { configurable: true, value: () => ({ displaySurface: 'browser' }) });
      return stream;
    };
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getDisplayMedia: async () => makeStream(),
        getUserMedia: async () => makeStream(),
      },
    });
  });

  await context.route('http://alloflow.test/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/studio') {
      await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: studioHtml });
      return;
    }
    if (url.pathname === '/opener') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: `<!doctype html><title>AlloFlow fixture</title>
          <main id="tour-input-panel">Source fixture</main>
          <button id="ui-tool-simplified">Text Adaptation</button>
          <script>
            window.bridgeLog = [];
            window.cleanupSeen = false;
            window.ttsCount = 0;
            window.rehearsalRuns = 0;
            window.activeRehearsal = null;
            window.validationBlocked = false;
            const reply = (source, request, type, payload) => {
              source.postMessage(Object.assign({ type, id: request.id, bridge: request.bridge }, payload), location.origin);
            };
            addEventListener('message', event => {
              const request = event.data || {};
              window.bridgeLog.push(request.type);
              if (request.type === 'allostudio-demoplan-request') {
                const respond = () => reply(event.source, request, 'allostudio-demoplan-response', { steps: [
                  { commandId: request.goal === 'Slow planning fixture' ? 'stale-step' : 'first-step', label: request.goal === 'Slow planning fixture' ? 'Stale delayed step' : 'First custom step', why: 'Start here', params: { topic: 'fractions' }, paramNames: ['topic'] },
                  { commandId: 'second-step', label: 'Second custom step', why: 'Then continue' }
                ] });
                if (request.goal === 'Slow planning fixture') setTimeout(respond, 1500); else respond();
              }
              if (request.type === 'allostudio-demovalidate-request') {
                const items = (request.steps || []).map((step, index) => ({ commandId: step.commandId, label: step.commandId, status: window.validationBlocked && index === 0 ? 'block' : 'ready', detail: window.validationBlocked && index === 0 ? 'Fixture prerequisite is missing.' : '', params: step.params || {}, contract: { params: [] } }));
                const blockingCount = items.filter(item => item.status === 'block').length;
                setTimeout(() => reply(event.source, request, 'allostudio-demovalidate-response', { report: { ok: blockingCount === 0, blockingCount, warningCount: 0, items } }), 350);
              }
              if (request.type === 'allostudio-demorun-request') {
                const sendStep = (index, phase, label, narration, delay) => setTimeout(() => {
                  event.source.postMessage({ type: 'allostudio-demostep', bridge: request.bridge, id: request.id, index, phase, label, narration }, location.origin);
                }, delay);
                sendStep(0, 'start', 'First custom step', 'Starting the first custom step.', 80);
                sendStep(0, 'done', 'First custom step', 'First custom step complete.', 240);
                setTimeout(() => reply(event.source, request, 'allostudio-demorun-response', { ok: false, stopped: true, completed: 1, reason: 'Fixture early stop.' }), 360);
              }
              if (request.type === 'allostudio-official-tutorial-request') {
                const respond = () => reply(event.source, request, 'allostudio-official-tutorial-response', {
                  generatedFrom: 'GUIDED_STEPS',
                  steps: [
                    { id: 'source-input', commandId: 'source-input', anchorId: 'tour-input-panel', label: 'Source Material', beats: [
                      { kind: 'action', text: 'Source Material. Add the fixture passage.' },
                      { kind: 'success', text: 'Source captured.' }
                    ] },
                    { id: 'simplified', commandId: 'simplified', anchorId: 'ui-tool-simplified', label: 'Text Adaptation', beats: [
                      { kind: 'action', text: 'Create a Grade 5 adaptation.' },
                      { kind: 'success', text: 'Adapted text ready.' }
                    ] }
                  ]
                });
                setTimeout(respond, 800);
              }
              if (request.type === 'allostudio-official-tutorial-run-request') {
                window.lastRunSteps = request.steps;
                const sendStep = (index, phase, label, narration, delay) => setTimeout(() => {
                  event.source.postMessage({ type: 'allostudio-demostep', bridge: request.bridge, id: request.id, index, phase, label, narration }, location.origin);
                }, delay);
                if (request.rehearsal) {
                  window.rehearsalRuns += 1;
                  if (window.rehearsalRuns === 1) {
                    window.activeRehearsal = { source: event.source, request };
                    sendStep(0, 'start', 'Source Material', 'Preview the source step.', 80);
                  } else {
                    sendStep(0, 'start', 'Source Material', 'Preview the source step.', 80);
                    sendStep(0, 'done', 'Source Material', 'Source preview ready.', 200);
                    setTimeout(() => reply(event.source, request, 'allostudio-official-tutorial-run-response', { ok: true, completed: 2 }), 320);
                  }
                } else {
                  sendStep(0, 'start', 'Source Material', 'Add the fixture passage.', 100);
                  sendStep(0, 'done', 'Source Material', 'Source captured.', 350);
                  sendStep(1, 'start', 'Text Adaptation', 'Create a Grade 5 adaptation.', 600);
                  sendStep(1, 'done', 'Text Adaptation', 'Adapted text ready.', 850);
                  setTimeout(() => reply(event.source, request, 'allostudio-official-tutorial-run-response', { ok: true, completed: 2 }), 950);
                }
              }
              if (request.type === 'allostudio-demostop' && window.activeRehearsal) {
                const active = window.activeRehearsal;
                window.activeRehearsal = null;
                reply(active.source, active.request, 'allostudio-official-tutorial-run-response', { ok: false, stopped: true, completed: 0, reason: 'Stopped by the teacher.' });
              }              if (request.type === 'allostudio-tts-request') {
                window.ttsCount += 1;
                if (window.ttsCount === 1) {
                  reply(event.source, request, 'allostudio-tts-response', { error: 'fixture transient failure' });
                } else if (window.ttsCount === 3) {
                  setTimeout(() => reply(event.source, request, 'allostudio-tts-response', { pcm: Array(7200).fill(0), sampleRate: 24000 }), 700);
                } else {
                  reply(event.source, request, 'allostudio-tts-response', { pcm: Array(7200).fill(0), sampleRate: 24000 });
                }
              }
              if (request.type === 'allostudio-official-tutorial-cleanup') window.cleanupSeen = true;
            });
          </script>`,
      });
      return;
    }
    await route.fulfill({ status: 404, body: 'not found' });
  });

  await page.goto('http://alloflow.test/opener');
  const popupPromise = page.waitForEvent('popup');
  await page.evaluate(() => {
    window.open('/studio?allo_origin=' + encodeURIComponent(location.origin), 'studio-e2e');
  });
  const studio = await popupPromise;
  await expect.poll(() => studio.url()).toContain('/studio');
  await studio.waitForLoadState('domcontentloaded');
  await studio.setViewportSize({ width: 560, height: 900 });

  await studio.evaluate(() => {
    const target = window as any;
    target.__bridgeOriginalAdd = window.addEventListener;
    target.__bridgeOriginalRemove = window.removeEventListener;
    target.__bridgeTrackedMessageListeners = new Set<any>();
    target.addEventListener = function (type: string, listener: any, options?: any) {
      if (type === 'message') target.__bridgeTrackedMessageListeners.add(listener);
      return target.__bridgeOriginalAdd.call(window, type, listener, options);
    };
    target.removeEventListener = function (type: string, listener: any, options?: any) {
      if (type === 'message') target.__bridgeTrackedMessageListeners.delete(listener);
      return target.__bridgeOriginalRemove.call(window, type, listener, options);
    };
  });

  const demoGoal = studio.locator('#demoGoal');
  const demoPlanButton = studio.locator('#demoPlanBtn');
  const demoTransitionLocks = () => studio.evaluate(() => {
    const disabled = (id: string) => (document.getElementById(id) as HTMLButtonElement).disabled;
    return {
      plan: disabled('demoPlanBtn'),
      official: disabled('demoOfficialTextBtn'),
      start: disabled('demoStartBtn'),
      rehearse: disabled('demoRehearseBtn'),
      preflight: disabled('demoPreflightBtn'),
    };
  });
  const allDemoTransitionsLocked = { plan: true, official: true, start: true, rehearse: true, preflight: true };
  const allDemoTransitionsUnlocked = { plan: false, official: false, start: false, rehearse: false, preflight: false };
  const demoTemplateTransitionLocks = () => studio.evaluate(() => {
    const disabled = (id: string) => (document.getElementById(id) as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).disabled;
    return {
      select: disabled('demoTemplateSelect'),
      name: disabled('demoTemplateName'),
      save: disabled('demoTemplateSaveBtn'),
      load: disabled('demoTemplateLoadBtn'),
      duplicate: disabled('demoDuplicateBtn'),
      remove: disabled('demoTemplateDeleteBtn'),
    };
  });
  const allTemplateTransitionsLocked = { select: true, name: true, save: true, load: true, duplicate: true, remove: true };
  const allTemplateTransitionsUnlocked = { select: false, name: false, save: false, load: false, duplicate: false, remove: false };
  const demoPlanEditorTransitionLocks = () => studio.evaluate(() => {
    const byId = (id: string) => (document.getElementById(id) as HTMLButtonElement | HTMLInputElement | HTMLSelectElement).disabled;
    const byLabel = (label: string) => (document.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | HTMLInputElement | HTMLTextAreaElement).disabled;
    return {
      goal: byId('demoGoal'),
      audio: byId('demoAudioMode'),
      openingTitle: byId('demoOpeningTitle'),
      scriptStyle: byId('demoScriptStyle'),
      include: byLabel('Include step 1'),
      parameter: byLabel('Step 1 topic'),
      narration: byLabel('Step 1 narration'),
      hold: byLabel('Step 1 result hold seconds'),
      moveDown: byLabel('Move step 1 later'),
      reset: byId('demoPlanResetBtn'),
      clearDraft: byId('demoDraftClearBtn'),
      draftNarration: byId('demoScriptDraftBtn'),
    };
  });
  const allPlanEditorTransitionsLocked = { goal: true, audio: true, openingTitle: true, scriptStyle: true, include: true, parameter: true, narration: true, hold: true, moveDown: true, reset: true, clearDraft: true, draftNarration: true };
  const allPlanEditorTransitionsUnlocked = { goal: false, audio: false, openingTitle: false, scriptStyle: false, include: false, parameter: false, narration: false, hold: false, moveDown: false, reset: false, clearDraft: false, draftNarration: false };
  await expect(demoPlanButton).toBeVisible();
  const composerBox = await studio.locator('.demo-goal-composer').boundingBox();
  const planButtonBox = await demoPlanButton.boundingBox();
  expect(composerBox).not.toBeNull();
  expect(planButtonBox).not.toBeNull();
  expect(planButtonBox!.width).toBeGreaterThan(composerBox!.width * 0.85);
  await demoGoal.fill('Slow planning fixture');
  await demoGoal.press('Control+Enter');
  await expect(demoPlanButton).toBeDisabled();
  await expect(demoPlanButton).toHaveAttribute('aria-busy', 'true');
  await expect(studio.locator('#demoOfficialTextBtn')).toBeDisabled();
  await expect(studio.locator('#demoPlanCancelBtn')).toBeVisible();
  await studio.locator('#demoPlanCancelBtn').click();
  await expect.poll(() => page.evaluate(() => window.bridgeLog.includes('allostudio-demoplan-cancel'))).toBe(true);
  await expect.poll(() => studio.evaluate(() => (window as any).__bridgeTrackedMessageListeners.size)).toBe(0);
  await expect(demoPlanButton).toBeEnabled();
  await expect(studio.locator('#demoOfficialTextBtn')).toBeEnabled();
  await expect(demoPlanButton).toHaveAttribute('aria-busy', 'false');
  await expect(studio.locator('#demoPlanCancelBtn')).toBeHidden();
  await expect(studio.locator('#demoStatus')).toContainText('Planning cancelled. Nothing ran');
  await studio.waitForTimeout(650);
  await expect(studio.locator('#demoPlanList')).not.toContainText('Stale delayed step');
  await studio.evaluate(() => {
    const target = window as any;
    target.addEventListener = target.__bridgeOriginalAdd;
    target.removeEventListener = target.__bridgeOriginalRemove;
    delete target.__bridgeOriginalAdd;
    delete target.__bridgeOriginalRemove;
    delete target.__bridgeTrackedMessageListeners;
  });
  await demoGoal.fill('Custom workflow fixture');
  await demoGoal.press('Control+Enter');
  await expect(studio.locator('#demoPlanSummary')).toContainText('2 approved steps');
  await expect(studio.getByLabel('Step 1 topic')).toHaveValue('fractions');
  await expect(studio.getByLabel('Step 1 narration')).toHaveValue('Start here');
  await studio.getByLabel('Step 1 narration').fill('Teacher-approved custom opener explains the fractions goal before the first action begins.');
  await expect(studio.locator('#demoPacingStatus')).toContainText('1 step may finish before the narration');
  await expect(studio.locator('#demoPacingFitBtn')).toBeEnabled();
  await studio.locator('#demoPacingFitBtn').click();
  await expect(studio.getByLabel('Step 1 result hold seconds')).toHaveValue('4.5');
  await expect(studio.locator('[data-demo-step-pacing="0"]')).toContainText('should fit');
  await studio.getByLabel('Step 1 narration').fill('Teacher-approved custom opener.');
  await studio.getByLabel('Step 1 result hold seconds').fill('4.5');
  await studio.getByLabel('Step 1 result hold seconds').press('Tab');
  await studio.locator('#demoScriptReviewBtn').click();
  await expect(studio.locator('#demoScriptReviewText')).toContainText('Teacher-approved custom opener.');
  await studio.getByRole('button', { name: 'Move step 2 earlier' }).click();
  await expect(studio.locator('#demoPlanList > div').first()).toContainText('Second custom step');
  await expect(studio.locator('[data-demo-step-readiness="0"]')).toContainText('Ready');
  await expect.poll(() => studio.evaluate(() => !!sessionStorage.getItem('vs_demo_draft_v1'))).toBe(true);
  await studio.reload();
  await studio.waitForLoadState('domcontentloaded');
  await expect(demoGoal).toHaveValue('Custom workflow fixture');
  await expect(studio.locator('#demoPlanList')).toContainText('First custom step');
  await expect(studio.getByLabel('Step 2 narration')).toHaveValue('Teacher-approved custom opener.');
  await expect(studio.getByLabel('Step 2 result hold seconds')).toHaveValue('4.5');
  await expect(studio.locator('[data-demo-step-readiness="0"]')).toContainText('Ready');
  await page.evaluate(() => { (window as any).validationBlocked = true; });
  await studio.locator('#demoPreflightBtn').click();
  await expect(studio.locator('#demoPreflightBtn')).toHaveAttribute('aria-busy', 'true');
  await expect.poll(demoTransitionLocks).toEqual(allDemoTransitionsLocked);
  await expect(studio.locator('[data-demo-step-readiness="0"]')).toContainText('Blocked');
  await expect(studio.locator('#demoPreflightBtn')).toHaveAttribute('aria-busy', 'false');
  await expect.poll(demoTransitionLocks).toEqual(allDemoTransitionsUnlocked);
  await expect(studio.locator('#demoRepairBtn')).toBeVisible();
  await page.evaluate(() => { (window as any).validationBlocked = false; });
  await studio.locator('#demoRepairBtn').click();
  await expect(studio.locator('[data-demo-step-readiness="0"]')).toContainText('Ready');
  await expect(studio.locator('#demoRepairBtn')).toBeHidden();
  await studio.locator('#demoPlanResetBtn').click();
  await expect(studio.locator('#demoPlanList > div').first()).toContainText('First custom step');
  await expect.poll(demoPlanEditorTransitionLocks).toEqual(allPlanEditorTransitionsUnlocked);
  await studio.locator('#demoRehearseBtn').click();
  await expect.poll(demoPlanEditorTransitionLocks).toEqual(allPlanEditorTransitionsLocked);
  await expect.poll(demoTransitionLocks).toEqual(allDemoTransitionsLocked);
  await expect(studio.locator('#demoStatus')).toContainText('Readiness check passed. No app actions ran');
  await expect.poll(demoPlanEditorTransitionLocks).toEqual(allPlanEditorTransitionsUnlocked);
  await expect(demoPlanButton).toBeEnabled();
  await expect(studio.locator('#demoOfficialTextBtn')).toBeEnabled();

  await studio.locator('#demoPolishPanel summary').click();
  await studio.locator('#demoOpeningTitle').fill('Fractions in AlloFlow');
  await studio.locator('#demoClosingCardChk').check();
  await studio.locator('#demoClosingText').fill('Try the workflow yourself');
  await studio.locator('#demoTemplateName').fill('Fractions walkthrough');
  await studio.locator('#demoTemplateSaveBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Saved reusable tutorial template');
  await expect.poll(() => studio.evaluate(() => JSON.parse(localStorage.getItem('vs_demo_templates_v1') || '[]').length)).toBe(1);
  await studio.locator('#demoDuplicateBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Duplicated as an independent tutorial');
  await expect(studio.locator('#demoTemplateSelect option')).toHaveCount(3);
  await expect(studio.locator('#demoOpeningTitle')).toHaveValue('Fractions in AlloFlow');
  await expect(studio.locator('#demoClosingCardChk')).toBeChecked();
  const deletedTemplateName = await studio.locator('#demoTemplateName').inputValue();
  await studio.locator('#demoTemplateDeleteBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Deleted tutorial template: ' + deletedTemplateName);
  await expect(studio.locator('#demoTemplateSelect option')).toHaveCount(2);
  await expect.poll(() => studio.evaluate(() => JSON.parse(localStorage.getItem('vs_demo_templates_v1') || '[]').length)).toBe(1);
  await expect(studio.locator('#demoTemplateUndoDeleteBtn')).toBeVisible();
  await expect(studio.locator('#demoTemplateUndoDeleteBtn')).toBeEnabled();
  await expect(studio.locator('#demoTemplateUndoDeleteBtn')).toBeFocused();
  await studio.locator('#demoTemplateUndoDeleteBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Restored tutorial template: ' + deletedTemplateName);
  await expect(studio.locator('#demoTemplateSelect option')).toHaveCount(3);
  await expect.poll(() => studio.evaluate(() => JSON.parse(localStorage.getItem('vs_demo_templates_v1') || '[]').length)).toBe(2);
  await expect(studio.locator('#demoTemplateUndoDeleteBtn')).toBeHidden();
  await expect(studio.locator('#demoTemplateSelect')).toBeFocused();
  await expect(studio.locator('#demoTemplateName')).toHaveValue(deletedTemplateName);
  await expect(studio.locator('#demoTemplateDeleteBtn')).toBeEnabled();
  await expect(studio.locator('#demoClosingText')).toHaveValue('Try the workflow yourself');

  await studio.locator('#demoAudioMode').selectOption('captions');
  await studio.locator('#demoStartBtn').click();
  await expect.poll(demoTransitionLocks).toEqual(allDemoTransitionsLocked);
  await expect.poll(demoPlanEditorTransitionLocks).toEqual(allPlanEditorTransitionsLocked);
  await expect(studio.locator('#takesList .take')).toHaveCount(1, { timeout: 15_000 });
  await expect.poll(demoPlanEditorTransitionLocks).toEqual(allPlanEditorTransitionsUnlocked);
  await expect.poll(() => studio.evaluate(() => new Promise<number>((resolve) => {
    const open = indexedDB.open('allo_video_studio');
    open.onerror = () => resolve(0);
    open.onsuccess = () => {
      const db = open.result;
      const request = db.transaction('takes', 'readonly').objectStore('takes').getAll();
      request.onerror = () => { db.close(); resolve(0); };
      request.onsuccess = () => {
        const count = request.result.filter((take) => !!take.demoSeriesId).length;
        db.close();
        resolve(count);
      };
    };
  }))).toBeGreaterThanOrEqual(1);
  await expect(studio.locator('#demoContinueEditBtn')).toBeVisible({ timeout: 10000 });
  await expect(studio.locator('#demoContinueEditBtn')).toBeEnabled();
  await expect(studio.locator('#demoContinueEditBtn')).toHaveText('Continue 1 unfinished step (1/2 complete)');
  await expect.poll(() => studio.evaluate(() => !!sessionStorage.getItem('vs_demo_continuation_v1'))).toBe(true);
  await studio.reload();
  await studio.waitForLoadState('domcontentloaded');
  await expect(studio.locator('#demoContinueBtn')).toBeVisible();
  await expect(studio.locator('#demoContinueBtn')).toBeEnabled();
  await expect(studio.locator('#demoContinueBtn')).toHaveText('Continue 1 unfinished step (1/2 complete)');
  await expect(studio.locator('#demoContinuationDismissBtn')).toBeVisible();
  await expect(studio.locator('#demoContinuationDismissBtn')).toBeEnabled();
  await expect(studio.locator('#demoStatus')).toContainText('Restored 1 saved unfinished step');
  const savedContinuation = await studio.evaluate(() => sessionStorage.getItem('vs_demo_continuation_v1'));
  expect(savedContinuation).not.toBeNull();
  await studio.locator('#demoContinuationDismissBtn').click();
  await expect(studio.locator('#demoContinueBtn')).toBeHidden();
  await expect(studio.locator('#demoContinuationDismissBtn')).toBeHidden();
  await expect(studio.locator('#demoStatus')).toContainText('current on-screen plan is unchanged');
  await expect(studio.locator('#demoPlanList > div')).toHaveCount(2);
  await expect.poll(() => studio.evaluate(() => !!sessionStorage.getItem('vs_demo_continuation_v1'))).toBe(false);
  await studio.evaluate((saved) => { if (saved) sessionStorage.setItem('vs_demo_continuation_v1', saved); }, savedContinuation);
  await studio.reload();
  await studio.waitForLoadState('domcontentloaded');
  await expect(studio.locator('#demoContinueBtn')).toBeVisible();
  await expect(studio.locator('#demoContinueBtn')).toBeEnabled();
  await studio.locator('#demoContinueBtn').click();
  await expect.poll(() => studio.evaluate(() => !!sessionStorage.getItem('vs_demo_continuation_v1'))).toBe(false);
  await expect(studio.locator('#demoPlanList > div')).toHaveCount(1);
  await expect(studio.locator('#demoPlanList')).toContainText('Second custom step');
  await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  await studio.locator('#demoStartBtn').click();
  await expect(studio.locator('#demoStitchBtn')).toBeVisible({ timeout: 15_000 });
  await expect(studio.locator('#demoStitchBtn')).toHaveText('Stitch 2 continuation takes');
  await studio.locator('#demoStitchBtn').click();
  await expect(studio.locator('#sceneList .scene-row')).toHaveCount(2);
  await expect(studio.locator('#sceneStatus')).toContainText('2 continuation takes stitched in recording order');
  await expect(studio.locator('#sceneList .scene-row').nth(0)).toContainText('Demo');
  await expect(studio.locator('#sceneList .scene-row').nth(1)).toContainText('Demo');
  await studio.locator('#tabRecord').click();
  await studio.locator('#demoAudioMode').selectOption('auto-Kore');
  await studio.locator('#demoOfficialTextBtn').click();
  await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  await expect(studio.locator('#demoOfficialTextBtn')).toHaveText('Loading tutorial...');
  await expect(studio.locator('#demoPlanCancelBtn')).toHaveText('Cancel tutorial load');
  await studio.locator('#demoPlanCancelBtn').click();
  await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  await expect(studio.locator('#demoOfficialTextBtn')).toBeFocused();
  await expect(studio.locator('#demoStatus')).toContainText('Official tutorial loading cancelled. Nothing ran');
  await studio.waitForTimeout(900);
  await expect(studio.locator('#demoPlanList')).not.toContainText('Text Adaptation');
  await studio.locator('#demoOfficialTextBtn').click();
  await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  await expect.poll(demoTransitionLocks).toEqual(allDemoTransitionsLocked);
  await expect(studio.locator('#demoPlanList')).toContainText('Text Adaptation');
  await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  await expect(demoPlanButton).toBeEnabled();
  await studio.locator('#demoTemplateSelect').selectOption({ index: 1 });
  await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsUnlocked);
  const validationCountBeforeAtomicCancel = await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length);
  await demoGoal.fill('Slow planning fixture');
  await demoPlanButton.click();
  await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsLocked);
  await expect(studio.locator('#demoPlanCancelBtn')).toBeVisible();
  await studio.locator('#demoPlanCancelBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Planning cancelled. Nothing ran');
  await expect.poll(demoTemplateTransitionLocks).toEqual(allTemplateTransitionsUnlocked);
  await studio.waitForTimeout(1650);
  await expect(studio.locator('#demoPlanList')).toContainText('Text Adaptation');
  await studio.locator('#demoPreflightBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Preflight refreshed. The current plan is ready.');
  expect(await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length)).toBe(validationCountBeforeAtomicCancel);
  const validationCountBeforeIndependentTemplate = await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length);
  await studio.locator('#demoTemplateName').fill('Official tutorial copy');
  await studio.locator('#demoTemplateSaveBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Saved reusable tutorial template');
  const savedOfficialTemplate = await studio.evaluate(() => {
    const selectedId = (document.getElementById('demoTemplateSelect') as HTMLSelectElement).value;
    const rows = JSON.parse(localStorage.getItem('vs_demo_templates_v1') || '[]');
    return rows.find((item: any) => item.id === selectedId) || null;
  });
  expect(savedOfficialTemplate?.officialId).toBeNull();
  await studio.locator('#demoTemplateLoadBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Loaded tutorial template: Official tutorial copy');
  await expect(studio.locator('#demoPlanList input[type="checkbox"]').first()).toBeEnabled();
  await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  await expect.poll(() => page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-demovalidate-request').length)).toBeGreaterThan(validationCountBeforeIndependentTemplate);
  await studio.locator('#demoOfficialTextBtn').click();
  await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'true');
  await expect(studio.locator('#demoOfficialTextBtn')).toHaveAttribute('aria-busy', 'false');
  await expect(studio.locator('#demoPlanList input[type="checkbox"]').first()).toBeDisabled();
  await demoGoal.fill('Official tutorial: adapt a short science passage for Grade 5 readers');
  await studio.getByLabel('Step 1 narration').fill('Teacher-approved source walkthrough.');
  await studio.getByLabel('Step 1 result hold seconds').fill('0.5');
  await studio.getByLabel('Step 1 result hold seconds').press('Tab');
  await studio.getByLabel('Step 2 result hold seconds').fill('0.5');
  await studio.getByLabel('Step 2 result hold seconds').press('Tab');
  await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  await expect(studio.getByLabel('Step 1 result hold seconds')).toHaveValue('1');
  await studio.locator('#demoRehearseBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Readiness check passed. No app actions ran');
  await expect(demoPlanButton).toBeEnabled();
  await expect(studio.locator('#demoOfficialTextBtn')).toBeEnabled();
  await expect(studio.locator('#demoStopBtn')).toBeHidden();
  expect(await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-official-tutorial-run-request').length)).toBe(0);
  await expect(studio.locator('#demoPrivacyIndicator')).toContainText('not recording');
  await expect(studio.locator('#demoPlanResetBtn')).toBeHidden();
  await expect(studio.locator('#clipList')).toBeEmpty();
  await studio.locator('#demoStartBtn').click();
  await expect.poll(() => page.evaluate(() => (window as any).lastRunSteps?.[0]?.script)).toBe('Teacher-approved source walkthrough.');
  await expect.poll(() => page.evaluate(() => (window as any).lastRunSteps?.[0]?.pauseAfter)).toBe(1);

  await expect(studio.locator('#clipList')).toContainText('Regenerate', { timeout: 20000 });
  await expect(studio.getByLabel('text for caption 1')).toHaveValue('Teacher-approved source walkthrough.');
  await expect(studio.locator('#demoNarrRetryEditBtn')).toBeVisible({ timeout: 10000 });
  await expect(studio.locator('#demoQualityCard')).toBeVisible();
  await expect(studio.locator('#demoQualityStatus')).toContainText('Quality score:');
  await expect(studio.getByRole('button', { name: /Review/ }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).cleanupSeen)).toBe(true);

  await studio.locator('#demoNarrRetryEditBtn').click();
  await expect(studio.locator('#demoNarrCancelEditBtn')).toBeVisible();
  await studio.locator('#demoNarrCancelEditBtn').click();
  await expect(studio.locator('#demoNarrRetryEditBtn')).toBeVisible({ timeout: 10000 });
  await expect(studio.locator('#demoQualityCard')).toBeVisible();
  await expect(studio.locator('#demoQualityStatus')).toContainText('Quality score:');
  await expect(studio.getByRole('button', { name: /Review/ }).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(3);

  await studio.locator('#demoNarrRetryEditBtn').click();
  const regenerate = studio.locator('#clipList').getByRole('button', { name: /Regenerate narration clip/ });
  await expect(regenerate).toHaveCount(2, { timeout: 10000 });
  await expect(studio.locator('#clipList')).toContainText('Teacher-approved source walkthrough.');
  await expect(studio.locator('#demoNarrRetryEditBtn')).toBeHidden();
  await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(4);

  await regenerate.first().click();
  await expect.poll(() => page.evaluate(() => (window as any).ttsCount)).toBe(5);
  await expect(studio.locator('#aiNarrStatus')).toContainText('Narration line regenerated');
  await studio.locator('#demoQualityRerunBtn').click();
  await expect(studio.locator('#demoQualityStatus')).toContainText('0 failed');
});
