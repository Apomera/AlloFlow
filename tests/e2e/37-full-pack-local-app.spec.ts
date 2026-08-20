import { test, expect, Page } from '@playwright/test';
import fs from 'node:fs';
import { bootAlloFlow } from './helpers';

const STORE_KEY = 'alloflow-full-pack-run-v1';
const BLUEPRINT_STORE_KEY = 'alloflow-blueprint-run-v1';
const capacity = { aiCalls: 4, textCalls: 3, imageCalls: 1, estimatedMinutes: 2, provider: 'gemini', model: 'gemini-test', imageProvider: 'auto', isLocal: false, requestConcurrency: 1, estimateBasis: 'provider-defaults', observedSamples: { text: 0, image: 0 }, warningCodes: [], warnings: [] };
const preflight = {
  createdAt: new Date().toISOString(), sourceTextChars: 321, sourceFingerprint: 'SENTINEL_SOURCE_FINGERPRINT',
  selected: [
    { type: 'quiz', index: 0, uiId: 'SENTINEL_UI_ID_QUIZ', directive: 'SENTINEL_DIRECTIVE_QUIZ' },
    { type: 'image', index: 1, uiId: 'SENTINEL_UI_ID_IMAGE', directive: 'SENTINEL_DIRECTIVE_IMAGE' },
  ],
  skipped: [], differentiation: { range: 'None', types: ['simplified'], levelCount: 1 }, estimatedResourceGenerations: 4,
  planSchemaVersion: 2, capabilityFingerprint: 'full-pack-plan-v2', capacity,
};
const readyEnvelope = () => ({
  v: 2, capabilityFingerprint: 'full-pack-plan-v2', savedAt: new Date().toISOString(),
  run: {
    runId: 'full-pack-browser-ready', targetMode: 'all-groups', status: 'ready', startedAt: new Date().toISOString(),
    settingsSnapshot: { gradeLevel: '5th Grade', leveledTextLanguage: 'English', studentInterests: ['SENTINEL_STUDENT_INTEREST'], rosterSignature: 'SENTINEL_ROSTER_SIGNATURE', differentiationRange: 'None', differentiationTypes: ['simplified'], resourceCount: '5', isAutoConfigEnabled: true, fullPackTargetGroup: 'all' },
    preflight, planPayload: { batchConfig: {}, lessonDNA: {} }, resources: {},
    groups: {
      SENTINEL_GROUP_ID: {
        groupId: 'SENTINEL_GROUP_ID', groupName: 'SENTINEL_STUDENT_NAME', status: 'ready',
        settingsSnapshot: { gradeLevel: '5th Grade', leveledTextLanguage: 'English', studentInterests: ['SENTINEL_STUDENT_INTEREST'] },
        preflight, planPayload: { batchConfig: {}, lessonDNA: {} },
        resources: {
          quiz: { key: 'SENTINEL_RESOURCE_KEY_QUIZ', type: 'quiz', index: 0, directive: 'SENTINEL_DIRECTIVE_QUIZ', status: 'landed', resourceId: 'SENTINEL_RESOURCE_ID', elapsedMs: 1300 },
          image: { key: 'SENTINEL_RESOURCE_KEY_IMAGE', type: 'image', index: 1, directive: 'SENTINEL_DIRECTIVE_IMAGE', status: 'failed', reason: 'Bearer SENTINEL_API_KEY rejected for SENTINEL_STUDENT_NAME', failureCategory: 'configuration', retryable: false, elapsedMs: 900 },
        },
      },
    },
  },
});

const blueprintEnvelope = () => {
  const uiId = 'SENTINEL_BLUEPRINT_UI_ID';
  return {
    v: 2,
    capabilityFingerprint: 'blueprint-execution-v2',
    savedAt: new Date().toISOString(),
    plan: {
      resourcePlan: [{ tool: 'quiz', directive: 'SENTINEL_BLUEPRINT_DIRECTIVE', uiId }],
      recommendedResources: ['quiz'],
      toolDirectives: { quiz: 'SENTINEL_BLUEPRINT_DIRECTIVE' },
    },
    run: {
      runId: 'blueprint-' + Date.now() + '-browser',
      status: 'partial',
      done: true,
      rows: {
        [uiId]: {
          uiId,
          tool: 'quiz',
          status: 'failed',
          failReason: 'threw: Bearer SENTINEL_BLUEPRINT_API_KEY rejected for SENTINEL_BLUEPRINT_STUDENT',
          elapsedMs: 875,
        },
      },
    },
  };
};

async function seedEnvelope(page: Page, envelope: any, forceQuota = false) {
  await page.addInitScript(({ key, value, quota }) => {
    const original = Storage.prototype.setItem;
    original.call(localStorage, key, JSON.stringify(value));
    if (quota) Storage.prototype.setItem = function (storageKey: string, storageValue: string) {
      if (storageKey === key) {
        let compact = false;
        try { compact = JSON.parse(String(storageValue)).compactFallback === true; } catch (_) {}
        if (!compact) throw new DOMException('Synthetic Full Pack quota limit', 'QuotaExceededError');
      }
      return original.call(this, storageKey, storageValue);
    };
  }, { key: STORE_KEY, value: envelope, quota: forceQuota });
}

async function seedBlueprintEnvelope(page: Page, envelope: any, forceQuota = false) {
  await page.addInitScript(({ key, value, quota }) => {
    const original = Storage.prototype.setItem;
    original.call(localStorage, key, JSON.stringify(value));
    if (quota) Storage.prototype.setItem = function (storageKey: string, storageValue: string) {
      if (storageKey === key) {
        let compact = false;
        try { compact = JSON.parse(String(storageValue)).compactFallback === true; } catch (_) {}
        if (!compact) throw new DOMException('Synthetic Blueprint quota limit', 'QuotaExceededError');
      }
      return original.call(this, storageKey, storageValue);
    };
  }, { key: BLUEPRINT_STORE_KEY, value: envelope, quota: forceQuota });
}async function captureDiagnosticCopy(page: Page, testId: string): Promise<string> {
  await page.evaluate(() => {
    (window as any).__copiedGenerationDiagnostic = null;
    (window as any).alloCopyText = async (text: string) => {
      (window as any).__copiedGenerationDiagnostic = text;
      return true;
    };
  });
  await page.getByTestId(testId).click();
  await expect.poll(() => page.evaluate(() => (window as any).__copiedGenerationDiagnostic)).not.toBeNull();
  return page.evaluate(() => (window as any).__copiedGenerationDiagnostic);
}

async function openErrorLog(page: Page, testId: string) {
  await page.getByTestId(testId).click();
  const diagnostics = page.locator('#allo-err-panel');
  await expect(diagnostics).toBeVisible();
  await expect(page.locator('#aer-tab-errors')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#aer-close').click();
  await expect(diagnostics).toHaveCount(0);
}

const expectPrivateDiagnostic = (serialized: string, secrets: string[]) => {
  for (const secret of secrets) expect(serialized).not.toContain(secret);
};

test('actual Full Pack sidebar restores, adapts capacity, collapses rows, and exports privately', async ({ page }) => {
  await seedEnvelope(page, readyEnvelope());
  await bootAlloFlow(page, 'full');
  const panel = page.getByTestId('full-pack-review-panel');
  await expect(panel).toBeVisible({ timeout: 120000 });
  await expect(page.getByTestId('full-pack-capacity')).toContainText('gemini · gemini-test');
  await expect(page.getByTestId('full-pack-capacity')).toContainText('provider defaults');
  await expect(page.getByTestId('full-pack-sticky-actions')).toBeVisible();
  const toggle = page.getByTestId('full-pack-toggle-completed');
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await toggle.press('Enter');
  await expect(toggle).toContainText('Show completed');
  await expect(panel.getByText(/^Complete\b/)).toHaveCount(0);
  await toggle.press('Enter');
  await expect(toggle).toContainText('Hide completed');
  await expect(panel.getByText(/^Complete\b/)).toHaveCount(1);
  expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true);

  await expect(page.getByTestId('full-pack-open-error-log')).toBeVisible();
  await openErrorLog(page, 'full-pack-open-error-log');

  const secrets = ['SENTINEL_SOURCE_FINGERPRINT', 'SENTINEL_UI_ID', 'SENTINEL_DIRECTIVE', 'SENTINEL_STUDENT_INTEREST', 'SENTINEL_ROSTER_SIGNATURE', 'SENTINEL_GROUP_ID', 'SENTINEL_STUDENT_NAME', 'SENTINEL_RESOURCE_KEY', 'SENTINEL_RESOURCE_ID', 'SENTINEL_API_KEY'];
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key) || '', STORE_KEY)).not.toContain('SENTINEL_API_KEY');

  const copiedReport = await captureDiagnosticCopy(page, 'full-pack-copy-diagnostics');
  expectPrivateDiagnostic(copiedReport, secrets);
  expect(JSON.parse(copiedReport)).toMatchObject({ reportVersion: 2, status: 'ready' });

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('full-pack-download-diagnostics').click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  const report = fs.readFileSync(downloadedPath!, 'utf8');
  expectPrivateDiagnostic(report, secrets);
  expect(JSON.parse(report)).toMatchObject({ reportVersion: 2, status: 'ready' });
});

test.describe('local unreleased Full Pack editor', () => {
  test.skip(!process.env.PW_BASE_URL, 'Set PW_BASE_URL to a local build that contains the unreleased Full Pack editor.');

  test('actual Full Pack review lets the educator edit and persist the exact ready plan', async ({ page }) => {
  const envelope: any = readyEnvelope();
  envelope.run.targetMode = 'current-settings';
  envelope.run.groups = {};
  envelope.run.resources = {};
  envelope.run.settingsSnapshot.instructionalContext = {
    schemaVersion: 1,
    instructionalGrade: '5th Grade',
    primaryTextPolicy: 'preserve-primary',
    standardsFingerprint: 'reviewed-standard',
  };
  envelope.run.planPayload.instructionalContext = envelope.run.settingsSnapshot.instructionalContext;
  await seedEnvelope(page, envelope);
  await bootAlloFlow(page, 'full');

  const panel = page.getByTestId('full-pack-review-panel');
  await expect(panel).toBeVisible({ timeout: 120000 });
  await expect(panel.getByTestId('full-pack-text-access-summary')).toContainText('primary/source text remains available');

  const policy = panel.getByTestId('full-pack-primary-policy');
  await policy.focus();
  await expect(policy).toBeFocused();
  await policy.selectOption('educator-directed');
  await expect(panel.getByTestId('full-pack-resource-type')).toHaveCount(3);
  await expect(panel.getByTestId('full-pack-text-access-summary')).toContainText('1 supplemental Adapted Text companion');

  const quizDirective = panel.locator('[data-testid="full-pack-resource-directive"][data-resource-key="SENTINEL_UI_ID_QUIZ"]');
  await quizDirective.fill('Use evidence from two different paragraphs.');
  await panel.locator('[data-testid="full-pack-move-down"][data-resource-key="SENTINEL_UI_ID_QUIZ"]').click();

  await panel.getByTestId('full-pack-add-resource-select').selectOption('glossary');
  await panel.getByTestId('full-pack-add-resource').click();
  await expect(panel.getByTestId('full-pack-resource-type')).toHaveCount(4);
  await panel.getByTestId('full-pack-resource-type').last().selectOption('outline');

  await expect.poll(async () => page.evaluate(key => {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value?.run?.preflight?.selected?.map((row: any) => ({ type: row.type, directive: row.directive })) || [];
  }, STORE_KEY)).toEqual([
    { type: 'image', directive: 'SENTINEL_DIRECTIVE_IMAGE' },
    { type: 'quiz', directive: 'Use evidence from two different paragraphs.' },
    { type: 'simplified', directive: '' },
    { type: 'outline', directive: '' },
  ]);
  });
});

test('actual Full Pack sidebar survives quota fallback and exposes the warning', async ({ page }) => {
  await seedEnvelope(page, readyEnvelope(), true);
  await bootAlloFlow(page, 'full');
  await expect(page.getByTestId('full-pack-review-panel')).toBeVisible({ timeout: 120000 });
  await expect(page.getByTestId('full-pack-storage-warning')).toContainText('Browser storage was full');
  await expect.poll(async () => page.evaluate(key => {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Boolean(value?.compactFallback && value?.run?.persistenceWarning);
  }, STORE_KEY)).toBe(true);
  const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORE_KEY);
  expect(persisted).toMatchObject({ v: 2, compactFallback: true, run: { status: 'interrupted' } });
  expect(persisted.run.planPayload).toBeNull();
  expectPrivateDiagnostic(JSON.stringify(persisted), [
    'SENTINEL_SOURCE_FINGERPRINT', 'SENTINEL_UI_ID', 'SENTINEL_DIRECTIVE',
    'SENTINEL_STUDENT_INTEREST', 'SENTINEL_ROSTER_SIGNATURE', 'SENTINEL_GROUP_ID',
    'SENTINEL_STUDENT_NAME', 'SENTINEL_RESOURCE_KEY', 'SENTINEL_RESOURCE_ID', 'SENTINEL_API_KEY',
  ]);
  expect(Object.keys(persisted.run.groups)).toEqual(['group-1']);
  expect(Object.keys(persisted.run.groups['group-1'].resources)).toEqual(['resource-1', 'resource-2']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('alloflow-generation-metrics-v1') || 'null')?.storageFallbacks?.fullPack || 0)).toBe(1);
});

test('actual Full Pack sidebar migrates v1 and demotes running and retrying work after reload', async ({ page }) => {
  const envelope: any = readyEnvelope();
  envelope.v = 1;
  envelope.capabilityFingerprint = 'full-pack-plan-v1';
  envelope.run.targetMode = 'current-settings';
  envelope.run.status = 'running';
  envelope.run.groups = {};
  envelope.run.resources = {
    quiz: { key: 'quiz', type: 'quiz', index: 0, status: 'running', directive: '', reason: 'Network connection failed while calling the provider' },
    image: { key: 'image', type: 'image', index: 1, status: 'retrying', directive: '' },
    done: { key: 'done', type: 'outline', index: 2, status: 'landed', directive: '' },
  };
  envelope.run.preflight = { ...preflight, selected: [
    { type: 'quiz', index: 0, uiId: 'quiz', directive: '' },
    { type: 'image', index: 1, uiId: 'image', directive: '' },
    { type: 'outline', index: 2, uiId: 'done', directive: '' },
  ] };
  await seedEnvelope(page, envelope);
  await bootAlloFlow(page, 'full');
  const panel = page.getByTestId('full-pack-review-panel');
  await expect(panel).toBeVisible({ timeout: 120000 });
  await expect(panel.getByText('Interrupted', { exact: true }).first()).toBeVisible();
  const safeFailure = panel.getByTestId('full-pack-failure-reason').first();
  await expect(safeFailure).toContainText('Transient provider or network failure');
  await expect(safeFailure).toHaveAttribute('data-failure-code', 'network');
  await expect(safeFailure).toHaveClass(/break-words/);
  await expect(safeFailure).not.toHaveClass(/truncate/);
  await expect(panel.getByText('Retrying', { exact: true })).toHaveCount(0);
  const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), STORE_KEY);
  expect(persisted.v).toBe(2);
  expect(persisted.capabilityFingerprint).toBe('full-pack-plan-v2');
  expect(persisted.run.status).toBe('interrupted');
  expect(persisted.run.resources.quiz.status).toBe('interrupted');
  expect(persisted.run.resources.image.status).toBe('interrupted');
  expect(persisted.run.resources.done.status).toBe('landed');
});
test('actual Blueprint restore explains failures safely and copies and downloads private diagnostics', async ({ page }) => {
  await seedBlueprintEnvelope(page, blueprintEnvelope());
  await bootAlloFlow(page, 'full');
  await page.getByRole('button', { name: /Message|AI Guide & Assistant/i }).first().click();

  const card = page.locator('[data-help-key="blueprint_card_panel"]').first();
  await expect(card).toBeVisible({ timeout: 120000 });
  const failure = card.getByTestId('bp-fail-reason');
  await expect(failure).toContainText('Authentication or permission failure');
  await expect(failure).toHaveAttribute('data-failure-code', 'authentication');
  await expect(failure).not.toContainText('SENTINEL_BLUEPRINT_API_KEY');
  await expect(failure).not.toContainText('SENTINEL_BLUEPRINT_STUDENT');
  await expect(card.locator('[title*="SENTINEL_BLUEPRINT_API_KEY"]')).toHaveCount(0);
  await openErrorLog(page, 'bp-open-error-log');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key) || '', BLUEPRINT_STORE_KEY)).not.toContain('SENTINEL_BLUEPRINT_API_KEY');

  const secrets = ['SENTINEL_BLUEPRINT_API_KEY', 'SENTINEL_BLUEPRINT_STUDENT', 'SENTINEL_BLUEPRINT_UI_ID', 'SENTINEL_BLUEPRINT_DIRECTIVE'];
  const copiedReport = await captureDiagnosticCopy(page, 'bp-copy-diagnostics');
  expectPrivateDiagnostic(copiedReport, secrets);
  expect(JSON.parse(copiedReport)).toMatchObject({
    reportVersion: 2,
    generatorCapability: 'blueprint-execution-v2',
    rows: [{ tool: 'quiz', status: 'failed', failureCode: 'authentication' }],
  });

  const downloadPromise = page.waitForEvent('download');
  await card.getByTestId('bp-download-diagnostics').click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  const downloadedReport = fs.readFileSync(downloadedPath!, 'utf8');
  expectPrivateDiagnostic(downloadedReport, secrets);
  expect(JSON.parse(downloadedReport)).toMatchObject({ reportVersion: 2, done: true });
});
test('actual Blueprint quota fallback stays visible and persists only pseudonymized diagnostics', async ({ page }) => {
  await seedBlueprintEnvelope(page, blueprintEnvelope(), true);
  await bootAlloFlow(page, 'full');
  await expect.poll(async () => page.evaluate(key => {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Boolean(value?.compactFallback && value?.run?.persistenceWarning);
  }, BLUEPRINT_STORE_KEY)).toBe(true);
  await page.getByRole('button', { name: /Message|AI Guide & Assistant/i }).first().click();

  const card = page.locator('[data-help-key="blueprint_card_panel"]').first();
  await expect(card).toBeVisible({ timeout: 120000 });
  await expect(card.getByTestId('bp-storage-warning')).toContainText('Browser storage was full');
  const persisted = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), BLUEPRINT_STORE_KEY);
  expect(persisted).toMatchObject({ v: 2, compactFallback: true, plan: null, run: { status: 'partial' } });
  expect(Object.keys(persisted.run.rows)).toEqual(['row-1']);
  expectPrivateDiagnostic(JSON.stringify(persisted), [
    'SENTINEL_BLUEPRINT_API_KEY', 'SENTINEL_BLUEPRINT_STUDENT',
    'SENTINEL_BLUEPRINT_UI_ID', 'SENTINEL_BLUEPRINT_DIRECTIVE',
  ]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('alloflow-generation-metrics-v1') || 'null')?.storageFallbacks?.blueprint || 0)).toBe(1);
});
test('actual app purges malformed Full Pack state and expired Blueprint state on boot', async ({ page }) => {
  const expiredBlueprint = blueprintEnvelope();
  expiredBlueprint.savedAt = '2026-01-01T00:00:00.000Z';
  await page.addInitScript(({ fullPackKey, blueprintKey, blueprintValue }) => {
    localStorage.setItem(fullPackKey, JSON.stringify({ v: 2, run: [] }));
    localStorage.setItem(blueprintKey, JSON.stringify(blueprintValue));
  }, { fullPackKey: STORE_KEY, blueprintKey: BLUEPRINT_STORE_KEY, blueprintValue: expiredBlueprint });

  await bootAlloFlow(page, 'full');
  await expect.poll(() => page.evaluate(({ fullPackKey, blueprintKey }) => ({
    fullPack: localStorage.getItem(fullPackKey),
    blueprint: localStorage.getItem(blueprintKey),
  }), { fullPackKey: STORE_KEY, blueprintKey: BLUEPRINT_STORE_KEY })).toEqual({
    fullPack: null,
    blueprint: null,
  });
});
