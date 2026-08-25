import { test, expect, type Page } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

/**
 * Trajectory Computing Lab — browser-level WCAG and responsive contracts.
 *
 * The jsdom suite checks the accessibility tree, but it cannot calculate the
 * rendered contrast, viewport overflow, focus ring, or print cascade. These
 * checks intentionally use the working-tree tool, app stylesheet, Chromium,
 * and axe's own colour-contrast implementation.
 */
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_trajectorycomputing.js',
  toolId: 'trajectoryComputing',
  appStyles: true,
  width: 1180,
  height: 2400,
  extraScripts: ['desktop/web-app/node_modules/axe-core/axe.min.js'],
});

test.describe.configure({ timeout: 180_000 });
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

const COMPLETED = {
  stage: 'verify',
  worksheet: { vx: '169.42', vy: '132.37', flightTime: '27.20', range: '4607.7' },
  batchReadback: { compile: 'zero-errors', deck: 'ordered', zone: 'inside', range: '4610.1' },
  completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true, verify: true },
  auditTrail: [
    { station: 'briefing', nextStage: 'worksheet', recordedAt: 1 },
    { station: 'worksheet', nextStage: 'program', recordedAt: 2 },
    { station: 'program', nextStage: 'cards', recordedAt: 3 },
    { station: 'cards', nextStage: 'batch', recordedAt: 4 },
    { station: 'batch', nextStage: 'verify', recordedAt: 5 },
    { station: 'verify', nextStage: 'complete', recordedAt: 6 },
  ],
  workPattern: 'pair',
  reproducibilityResult: { pass: true, correct: 4, total: 4 },
  verification: { range: '4607.7', verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
  verificationResult: { pass: true, assignmentPass: true },
  awarded: true,
};

async function mount(page: Page, state: Record<string, unknown>) {
  await harness.mount(page, { _trajectoryComputing: state }, undefined, { expectCanvas: false });
  await page.evaluate(() => {
    const wrap = document.getElementById('wrap');
    if (wrap) {
      wrap.style.width = '100%';
      wrap.style.height = 'auto';
      wrap.style.display = 'block';
    }
  });
  await page.waitForTimeout(250);
}

const AXE_SURFACES: Array<[string, Record<string, unknown>]> = [
  ['briefing', { stage: 'briefing' }],
  ['worksheet diagnostics', {
    stage: 'worksheet',
    worksheetResult: {
      pass: false, correct: 0, total: 4,
      fields: {
        vx: { ok: false, message: 'Enter a number.' },
        vy: { ok: false, message: 'Enter a number.' },
        flightTime: { ok: false, message: 'Enter a number.' },
        range: { ok: false, message: 'Enter a number.' },
      },
    },
  }],
  ['program diagnostics', {
    stage: 'program', mode: 'standard', attempts: { compile: 1 },
    compileResult: { pass: false, errors: [{ code: 'FORMULA', message: 'Check the horizontal velocity formula.' }] },
  }],
  ['batch process trace', {
    stage: 'batch',
    completed: { briefing: true, worksheet: true, program: true, cards: true },
  }],
  ['verification readiness', { stage: 'verify', workPattern: 'pair' }],
  ['completed challenge hub', { ...COMPLETED, extensionView: 'menu' }],
  ['completion report with connection notes', {
    ...COMPLETED,
    extensionView: 'menu',
    reportOpen: true,
    connectionNotes: {
      program: 'Mathematical expertise helped diagnose the listing.',
      verify: 'Independent checking made the final decision more trustworthy.',
    },
  }],
  ['safeguard challenge', { ...COMPLETED, extensionView: 'safeguard' }],
  ['Angle Lab result', {
    ...COMPLETED,
    extensionView: 'angle',
    studyAngle: 46,
    studyPrediction: 'longer',
    studyResult: {
      angle: 46, prediction: 'longer', relation: 'longer', correct: true,
      baseline: { range: 4610.1, flightTime: 27.21, maxHeight: 923.0, inZone: true },
      result: { range: 4738.0, flightTime: 31.72, maxHeight: 1249.1, inZone: false },
    },
    studyExplanation: 'components',
    studyExplanationResult: { correct: true, message: 'Correct: resolve the velocity components, then recompute time and range.' },
  }],
];

test.describe('computed WCAG checks', () => {
  for (const [label, state] of AXE_SURFACES) {
    test(`${label} has no WCAG A/AA or contrast violations`, async ({ page }) => {
      await mount(page, state);
      const violations = await page.evaluate(async () => {
        const result = await (window as any).axe.run('#wrap', {
          runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
          resultTypes: ['violations'],
        });
        return result.violations.flatMap((violation: any) => violation.nodes.map((node: any) => ({
          id: violation.id,
          impact: violation.impact,
          html: String(node.html).slice(0, 180).replace(/\s+/g, ' '),
          why: String(node.failureSummary || node.any?.[0]?.message || '').slice(0, 240).replace(/\s+/g, ' '),
        })));
      });
      const detail = violations.length
        ? '\n' + violations.map((item: any) => `  [${item.impact}] ${item.id}: ${item.why}\n    ${item.html}`).join('\n')
        : '';
      expect(violations, `${label}: ${violations.length} violation(s)${detail}`).toEqual([]);
    });
  }
});

test('reflows without document overflow from phone through desktop', async ({ page }) => {
  for (const width of [320, 768, 1180]) {
    await page.setViewportSize({ width, height: 900 });
    await mount(page, { ...COMPLETED, extensionView: 'angle', studyAngle: 46 });
    const layout = await page.evaluate(() => {
      const root = document.documentElement;
      const shell = document.querySelector('[data-trajectory-lab]') as HTMLElement | null;
      const offenders = [...document.querySelectorAll<HTMLElement>('[data-trajectory-lab] *')]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          if (rect.right <= root.clientWidth + 1) return false;
          let ancestor = node.parentElement;
          while (ancestor && ancestor !== shell) {
            const overflowX = getComputedStyle(ancestor).overflowX;
            if ((overflowX === 'auto' || overflowX === 'scroll') && ancestor.scrollWidth > ancestor.clientWidth + 1) {
              return false;
            }
            ancestor = ancestor.parentElement;
          }
          return true;
        })
        .slice(0, 8)
        .map((node) => ({ tag: node.tagName, cls: node.className, right: Math.round(node.getBoundingClientRect().right) }));
      return {
        overflow: root.scrollWidth - root.clientWidth,
        shellRight: shell ? Math.round(shell.getBoundingClientRect().right) : null,
        clientWidth: root.clientWidth,
        offenders,
      };
    });
    expect(layout.overflow, `${width}px document overflow: ${JSON.stringify(layout)}`).toBeLessThanOrEqual(1);
    expect(layout.offenders, `${width}px overflowing elements: ${JSON.stringify(layout)}`).toEqual([]);
  }
});

test('supports skip navigation, roving station keys, and visible keyboard focus', async ({ page }) => {
  await mount(page, { ...COMPLETED, stage: 'briefing' });

  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => document.activeElement?.classList.contains('tc-skip-link')),
    'the skip link is not the first keyboard destination').toBe(true);
  const skipStyle = await page.locator('.tc-skip-link').evaluate((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height, opacity: style.opacity };
  });
  expect(skipStyle.left).toBeGreaterThanOrEqual(0);
  expect(skipStyle.top).toBeGreaterThanOrEqual(0);
  expect(skipStyle.width).toBeGreaterThan(20);
  expect(skipStyle.height).toBeGreaterThan(20);
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('tc-main-content');

  const firstTab = page.locator('#tc-tab-briefing');
  await firstTab.focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).__toolData._trajectoryComputing.stage)).toBe('worksheet');
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('tc-tab-worksheet');

  await page.keyboard.press('End');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as any).__toolData._trajectoryComputing.stage)).toBe('verify');
  await page.keyboard.press('Home');
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('tc-tab-briefing');

  const focus = await page.locator('#tc-tab-briefing').evaluate((node) => {
    const style = getComputedStyle(node);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) || 0, color: style.outlineColor };
  });
  expect(focus.style, `focus indicator: ${JSON.stringify(focus)}`).not.toBe('none');
  expect(focus.width, `focus indicator: ${JSON.stringify(focus)}`).toBeGreaterThanOrEqual(2);
});

test('reads the current desk task, evidence, and readiness summary aloud', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__spokenDeskSummaries = [];
    const synthesis = window.speechSynthesis;
    Object.defineProperty(synthesis, 'cancel', { configurable: true, value: () => {} });
    Object.defineProperty(synthesis, 'speak', {
      configurable: true,
      value: (utterance: SpeechSynthesisUtterance) => {
        (window as any).__spokenDeskSummaries.push(utterance.text);
      },
    });
  });
  await mount(page, { stage: 'program' });

  const readSummary = page.getByRole('button', { name: 'Read the current desk summary aloud' });
  await readSummary.focus();
  await expect(readSummary).toBeFocused();
  await page.keyboard.press('Enter');

  await expect.poll(async () => page.evaluate(() => (window as any).__spokenDeskSummaries[0] || '')).toBe(
    'Program desk. Current task: Repair and document the listing. Evidence to capture: Compiler check, FORMAT card, and print preview. Ready when: Zero errors and fixed columns are confirmed.',
  );
});

test('records an optional station connection in evidence and the completion report', async ({ page }) => {
  await mount(page, { ...COMPLETED, extensionView: 'menu' });
  const note = 'Independent checking kept the landing decision from relying on machine output alone.';

  await page.evaluate(() => {
    const core = (window as any).TrajectoryComputingCore;
    const state = (window as any).__toolData._trajectoryComputing;
    state.lastSnapshotAt = Date.now();
    state.lastSnapshotFingerprint = core.createEvidenceFingerprint(state);
    (window as any).__rerender();
  });
  await expect(page.getByText('Evidence snapshot includes the latest work.')).toBeVisible();
  await page.getByRole('button', { name: 'Review completion report' }).click();
  await expect(page.getByText('Evidence snapshot includes the latest work.')).toBeVisible();
  await page.getByRole('button', { name: 'Hide completion report' }).click();

  await page.getByLabel('Optional connection note').fill(note);
  await expect(page.getByText('Connection note recorded for this station.')).toBeVisible();
  await expect(page.getByText('Work changed after the last snapshot. Save a new snapshot to include it.')).toBeVisible();
  await expect.poll(async () => page.evaluate(() => (window as any).__toolData._trajectoryComputing.connectionNotes.verify || '')).toBe(note);

  await page.getByRole('button', { name: 'Review completion report' }).click();
  const report = page.locator('#tc-completion-report');
  await expect(report.getByRole('heading', { name: 'Historical reasoning notes' })).toBeVisible();
  await expect(report).toContainText('1 of 6 station connections recorded.');
  await expect(report).toContainText('Verify');
  await expect(report).toContainText(note);
});

test('turns signing prerequisites into a clear keyboard-operable readiness path', async ({ page }) => {
  await mount(page, {
    stage: 'verify',
    completed: { briefing: true, worksheet: true, program: true, cards: true, batch: true },
    workPattern: 'pair',
  });
  const status = page.locator('#tc-signing-status');
  const sign = page.getByRole('button', { name: 'Sign verification sheet' });
  await expect(status).toContainText('0 of 4 signing checks ready');
  await expect(sign).toBeDisabled();

  await page.getByLabel('Independent range from worksheet (meters)').fill('3000');
  await page.getByRole('radio', { name: /GO - prediction is inside/ }).check();
  await page.getByLabel('Calculation desk code').selectOption('desk-a');
  await page.getByLabel('Independent verifier desk code').selectOption('desk-b');
  await expect(status).toContainText('3 of 4 signing checks ready');
  await expect(status).toContainText('Next: Fixed mission inputs documented');

  for (const label of ['Speed = 215 m/s', 'Angle = 38 degrees', 'Release height = 30 m', 'Gravity = 9.81 m/s2']) {
    await page.getByLabel(label).check();
  }
  await page.getByRole('button', { name: 'Check fixed inputs' }).click();
  await expect(status).toContainText('All signing checks are ready');
  await expect(sign).toBeEnabled();
});

test('jumps from a compiler diagnostic to the exact affected source statement', async ({ page }) => {
  await mount(page, { stage: 'program', mode: 'guided' });
  await page.evaluate(() => {
    const core = (window as any).TrajectoryComputingCore;
    const state = (window as any).__toolData._trajectoryComputing;
    state.code = core.starterProgram;
    state.compileResult = core.compileProgram(core.starterProgram);
    state.attempts = { compile: 1 };
    (window as any).__rerender();
  });

  const jump = page.getByRole('button', { name: 'Jump to affected statement' });
  await jump.focus();
  await page.keyboard.press('Enter');

  const selection = await page.locator('#tc-code-editor').evaluate((node) => {
    const editor = node as HTMLTextAreaElement;
    return {
      active: document.activeElement === editor,
      selected: editor.value.slice(editor.selectionStart, editor.selectionEnd),
    };
  });
  expect(selection.active).toBe(true);
  expect(selection.selected.trim()).toBe('G=9.18');
  await expect(page.locator('#tc-diagnostic-location')).toContainText('Current listing line 6');
});

test('shows the complete reader-to-printer trace when a valid batch job runs', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await mount(page, {
    stage: 'batch',
    completed: { briefing: true, worksheet: true, program: true, cards: true },
  });
  await page.evaluate(() => {
    const core = (window as any).TrajectoryComputingCore;
    const state = (window as any).__toolData._trajectoryComputing;
    state.code = core.correctProgram;
    state.deck = core.correctDeck;
    (window as any).__rerender();
  });

  const trace = page.locator('.tc-batch-trace');
  const narrowLayout = await trace.evaluate((node) => ({
    columns: getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  expect(narrowLayout.columns).toBe(1);
  expect(narrowLayout.overflow).toBeLessThanOrEqual(1);
  await expect(trace.locator('[aria-current="step"]')).toContainText('Card reader');
  await page.getByRole('button', { name: 'Feed deck and run job' }).click();
  await expect(trace.locator('.is-complete')).toHaveCount(4);
  await expect(page.getByRole('status').filter({ hasText: 'PRINTER READY' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Line-printer output' })).toBeVisible();
});

test('reopens downstream evidence and assigns a fresh record when a signed job is rerun', async ({ page }) => {
  await mount(page, {
    ...COMPLETED,
    stage: 'batch',
    runStatus: 'complete',
    batchRunCount: 1,
    batchRunId: '62-AUR-03-R01',
    batchReadbackResult: { pass: true, correct: 4, total: 4 },
  });
  await page.evaluate(() => {
    const core = (window as any).TrajectoryComputingCore;
    const state = (window as any).__toolData._trajectoryComputing;
    state.code = core.correctProgram;
    state.deck = core.correctDeck;
    (window as any).__rerender();
  });

  await page.getByRole('button', { name: 'Run as new job' }).click();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as any).__toolData._trajectoryComputing;
    return {
      runId: state.batchRunId,
      batchComplete: !!state.completed.batch,
      verifyComplete: !!state.completed.verify,
      readback: state.batchReadbackResult,
      verification: state.verificationResult,
    };
  })).toEqual({ runId: '62-AUR-03-R02', batchComplete: false, verifyComplete: false, readback: null, verification: null });
  await expect(page.locator('.tc-next-cue').filter({ hasText: 'Run record:' })).toContainText('62-AUR-03-R02');
});

test('locates reader and compiler rejections at the correct machine stage', async ({ page }) => {
  await mount(page, {
    stage: 'batch',
    completed: { briefing: true, worksheet: true, program: true, cards: true },
  });
  await page.evaluate(() => {
    const core = (window as any).TrajectoryComputingCore;
    const state = (window as any).__toolData._trajectoryComputing;
    state.code = core.starterProgram;
    state.deck = core.correctDeck;
    (window as any).__rerender();
  });
  await page.getByRole('button', { name: 'Feed deck and run job' }).click();
  await expect(page.locator('[data-machine-step="reader"]')).toHaveClass(/is-complete/);
  await expect(page.locator('[data-machine-step="compiler"]')).toHaveClass(/is-error/);
  await expect(page.getByRole('alert')).toContainText('Compiler rejected the listing');

  await page.evaluate(() => {
    const core = (window as any).TrajectoryComputingCore;
    const state = (window as any).__toolData._trajectoryComputing;
    state.code = core.correctProgram;
    state.deck = core.starterDeck;
    (window as any).__rerender();
  });
  await page.getByRole('button', { name: 'Feed deck and run job' }).click();
  await expect(page.locator('[data-machine-step="reader"]')).toHaveClass(/is-error/);
  await expect(page.locator('[data-machine-step="compiler"]')).toHaveClass(/is-blocked/);
  await expect(page.getByRole('alert')).toContainText('Card reader rejected the deck');
});

test('supports a prediction-first safeguard challenge', async ({ page }) => {
  await mount(page, { ...COMPLETED, extensionView: 'safeguard' });
  const check = page.getByRole('button', { name: 'Check safeguard prediction' });
  await expect(check).toBeDisabled();
  await page.getByLabel('Incident record').selectOption('misspelled-variable');
  await page.getByRole('radio', { name: 'Compiler diagnostic' }).check();
  await expect(check).toBeEnabled();
  await check.click();
  await expect(page.getByRole('status').filter({ hasText: 'Prediction supported' })).toContainText('unknown variable');
});

test('records an optional privacy-guided reflection in the completion report', async ({ page }) => {
  await mount(page, { ...COMPLETED, extensionView: 'menu' });
  await page.getByLabel('Error that stood out').selectOption('variable-name');
  await page.getByLabel('Safeguard that mattered most').selectOption('compiler');
  await page.getByLabel('Optional reflection note').fill('The compiler caught the misspelled variable before the batch run.');

  await expect(page.getByText('Reflection recorded for this mission.')).toBeVisible();
  const reflection = await page.evaluate(() => (window as any).__toolData._trajectoryComputing.reflection);
  expect(reflection).toEqual({
    errorId: 'variable-name',
    safeguardId: 'compiler',
    note: 'The compiler caught the misspelled variable before the batch run.',
  });

  await page.getByRole('button', { name: 'Review completion report' }).click();
  await expect(page.locator('#tc-completion-report')).toContainText('Misspelled variable name; Compiler diagnostic.');
  await expect(page.locator('#tc-completion-report')).toContainText('The compiler caught the misspelled variable before the batch run.');
});

test('reveals the three-record comparison only after verification is signed', async ({ page }) => {
  const unsigned: Record<string, any> = { ...COMPLETED };
  delete unsigned.verificationResult;
  unsigned.completed = { ...COMPLETED.completed, verify: false };
  await mount(page, unsigned);
  await expect(page.locator('#tc-range-reconciliation-title')).toHaveCount(0);

  await page.evaluate(() => {
    const state = (window as any).__toolData._trajectoryComputing;
    state.verificationResult = { pass: true, assignmentPass: true };
    state.completed = { ...state.completed, verify: true };
    (window as any).__rerender();
  });
  await expect(page.locator('#tc-range-reconciliation-title')).toBeVisible();
  await expect(page.locator('.tc-reconciliation-status').first()).toContainText('Maximum spread: 2.4 m');
  await expect(page.locator('#tc-range-reconciliation-title').locator('..').locator('tbody tr')).toHaveCount(3);
});

test('focuses a divergent verification and explains the disagreement', async ({ page }) => {
  await mount(page, {
    ...COMPLETED,
    completed: { ...COMPLETED.completed, verify: false },
    verification: { range: '4500', verdict: 'go', calculatorDesk: 'desk-a', verifierDesk: 'desk-b' },
    verificationResult: null,
  });
  await page.getByRole('button', { name: 'Sign verification sheet' }).click();
  await expect(page.locator('#tc-verification-summary')).toBeFocused();
  await expect(page.locator('#tc-verification-summary')).toContainText('does not agree within 15 meters');
  await expect(page.locator('.tc-reconciliation-status').first()).toContainText('records need review');
});

test('prints the completion report while hiding interactive chrome', async ({ page }) => {
  await mount(page, { ...COMPLETED, extensionView: 'menu', reportOpen: true });
  await expect(page.locator('.tc-report')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  const print = await page.evaluate(() => {
    const display = (selector: string) => {
      const node = document.querySelector(selector);
      return node ? getComputedStyle(node).display : null;
    };
    return {
      surfaces: display('.tc-completion-surfaces'),
      report: display('.tc-report'),
      top: display('.tc-top'),
      tabs: display('.tc-tabs-region'),
      side: display('.tc-side'),
    };
  });
  expect(print.surfaces).not.toBe('none');
  expect(print.report).not.toBe('none');
  expect(print.top).toBe('none');
  expect(print.tabs).toBe('none');
  expect(print.side).toBe('none');
});
