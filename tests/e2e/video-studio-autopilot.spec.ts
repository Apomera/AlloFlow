import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const studioHtml = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf8');

test('official tutorial checks readiness, records, quality-checks, and recovers narration', async ({ page, context }) => {
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
                reply(event.source, request, 'allostudio-demoplan-response', { steps: [
                  { commandId: 'first-step', label: 'First custom step', why: 'Start here', params: { topic: 'fractions' }, paramNames: ['topic'] },
                  { commandId: 'second-step', label: 'Second custom step', why: 'Then continue' }
                ] });
              }
              if (request.type === 'allostudio-demovalidate-request') {
                const items = (request.steps || []).map((step, index) => ({ commandId: step.commandId, label: step.commandId, status: window.validationBlocked && index === 0 ? 'block' : 'ready', detail: window.validationBlocked && index === 0 ? 'Fixture prerequisite is missing.' : '', params: step.params || {}, contract: { params: [] } }));
                const blockingCount = items.filter(item => item.status === 'block').length;
                reply(event.source, request, 'allostudio-demovalidate-response', { report: { ok: blockingCount === 0, blockingCount, warningCount: 0, items } });
              }
              if (request.type === 'allostudio-official-tutorial-request') {
                reply(event.source, request, 'allostudio-official-tutorial-response', {
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

  const demoGoal = studio.locator('#demoGoal');
  const demoPlanButton = studio.getByRole('button', { name: /Generate demo plan/ });
  await expect(demoPlanButton).toBeVisible();
  const composerBox = await studio.locator('.demo-goal-composer').boundingBox();
  const planButtonBox = await demoPlanButton.boundingBox();
  expect(composerBox).not.toBeNull();
  expect(planButtonBox).not.toBeNull();
  expect(planButtonBox!.width).toBeGreaterThan(composerBox!.width * 0.85);
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
  await expect(studio.locator('[data-demo-step-readiness="0"]')).toContainText('Blocked');
  await expect(studio.locator('#demoRepairBtn')).toBeVisible();
  await page.evaluate(() => { (window as any).validationBlocked = false; });
  await studio.locator('#demoRepairBtn').click();
  await expect(studio.locator('[data-demo-step-readiness="0"]')).toContainText('Ready');
  await expect(studio.locator('#demoRepairBtn')).toBeHidden();
  await studio.locator('#demoPlanResetBtn').click();
  await expect(studio.locator('#demoPlanList > div').first()).toContainText('First custom step');

  await studio.locator('#demoOfficialTextBtn').click();
  await expect(studio.locator('#demoPlanList')).toContainText('Text Adaptation');
  await studio.getByLabel('Step 1 narration').fill('Teacher-approved source walkthrough.');
  await studio.getByLabel('Step 1 result hold seconds').fill('0.5');
  await studio.getByLabel('Step 1 result hold seconds').press('Tab');
  await studio.getByLabel('Step 2 result hold seconds').fill('0.5');
  await studio.getByLabel('Step 2 result hold seconds').press('Tab');
  await expect(studio.locator('#demoPreflightStatus')).toContainText('Preflight passed');
  await studio.locator('#demoRehearseBtn').click();
  await expect(studio.locator('#demoStatus')).toContainText('Readiness check passed. No app actions ran');
  await expect(studio.locator('#demoStopBtn')).toBeHidden();
  expect(await page.evaluate(() => (window as any).bridgeLog.filter((type: string) => type === 'allostudio-official-tutorial-run-request').length)).toBe(0);
  await expect(studio.locator('#demoPrivacyIndicator')).toContainText('not recording');
  await expect(studio.locator('#demoPlanResetBtn')).toBeHidden();
  await expect(studio.locator('#clipList')).toBeEmpty();
  await studio.locator('#demoStartBtn').click();
  await expect.poll(() => page.evaluate(() => (window as any).lastRunSteps?.[0]?.script)).toBe('Teacher-approved source walkthrough.');
  await expect.poll(() => page.evaluate(() => (window as any).lastRunSteps?.[0]?.pauseAfter)).toBe(0.5);

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
