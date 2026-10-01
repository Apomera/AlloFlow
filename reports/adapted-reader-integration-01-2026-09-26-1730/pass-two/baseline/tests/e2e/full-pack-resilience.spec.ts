import { test, expect } from '@playwright/test';
import * as path from 'path';
import { readFileSync } from 'fs';

const MATRIX_MODULE_PATH = path.resolve(__dirname, '../../generation_matrix_module.js');
const MODULE_PATH = path.resolve(__dirname, '../../generation_helpers_module.js');

test.describe.configure({ mode: 'serial' });
test.setTimeout(60000);

test.describe('Full Pack browser fault injection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
    await page.addScriptTag({ path: MATRIX_MODULE_PATH });
    await page.addScriptTag({ path: MODULE_PATH });
    await page.waitForFunction(() => !!(window as any).AlloModules?.GenerationMatrix);
    await page.waitForFunction(() => !!(window as any).AlloModules?.GenerationHelpers);
    await page.evaluate(() => {
      (window as any).__makeFullPackHarness = (overrides: any = {}) => {
        let run: any = null;
        const calls: any[] = [];
        const toasts: any[] = [];
        const deps: any = {
          isProcessing: false,
          fullPackTargetGroup: 'none',
          rosterKey: null,
          gradeLevel: '5th Grade',
          leveledTextLanguage: 'English',
          studentInterests: [],
          dokLevel: '2',
          differentiationRange: 'None',
          differentiationTypes: ['simplified'],
          differentiationCustomGrades: [],
          leveledTextCustomInstructions: '', selectedLanguages: [], targetStandards: [],
          useEmojis: false, textFormat: 'Standard Text', history: [],
          translationMode: 'auto', currentUiLanguage: 'English', imageGenerationStyle: '', imageAspectRatio: '',
          inputText: 'The water cycle moves water through evaporation, condensation, and precipitation.',
          sourceTopic: 'Water cycle', standardsInput: '', standardsContext: null,
          resourceCount: '5', isAutoConfigEnabled: true,
          quizCustomInstructions: '', adventureCustomInstructions: '', frameCustomInstructions: '',
          brainstormCustomInstructions: '', faqCustomInstructions: '', outlineCustomInstructions: '',
          visualCustomInstructions: '', timelineTopic: '', lessonCustomAdditions: '', conceptInput: '',
          glossaryCustomInstructions: '', personaCustomInstructions: '', conceptSortCustomInstructions: '',
          dbqCustomInstructions: '', noteTakingCustomInstructions: '', anchorChartCustomInstructions: '',
          setIsProcessing: () => {}, setGenerationStep: () => {}, setFullPackTargetGroup: () => {},
          setGradeLevel: () => {}, setLeveledTextLanguage: () => {}, setStudentInterests: () => {},
          setDokLevel: () => {}, setLeveledTextCustomInstructions: () => {}, setSelectedLanguages: () => {},
          setTargetStandards: () => {}, setUseEmojis: () => {}, setTextFormat: () => {},
          setPersistedLessonDNA: () => {}, setError: () => {},
          setFullPackRun: (next: any) => { run = typeof next === 'function' ? next(run || {}) : next; },
          addToast: (message: string, kind: string) => toasts.push({ message, kind }),
          t: (key: string, values?: any) => values ? `${key}:${values.count || ''}` : key,
          warnLog: () => {}, handleApplyRosterGroup: (id: string) => calls.push({ kind: 'group', id }),
          autoConfigureSettings: async () => ({ resourcePlan: [{ tool: 'quiz', directive: 'Check understanding.' }] }),
          applyDetailedAutoConfig: () => {}, getGroupDifferentiationContext: () => '',
          getAssetManifest: () => [], getDifferentiationGrades: (grade: string) => [grade],
          handleGenerate: async (type: string, _lang: any, _keep: any, _text: any, _config: any, _switch: any, request: any) => {
            calls.push({ kind: 'resource', type, gradeLevel: request.gradeLevel });
            return { id: `resource-${type}-${calls.length}`, type, data: {} };
          },
        };
        Object.assign(deps, overrides);
        return { deps, calls, toasts, getRun: () => run };
      };
    });
  });

  test('approved plan is reused without a second auto-configuration call', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const w = window as any;
      const h = w.__makeFullPackHarness();
      let autoCalls = 0;
      h.deps.autoConfigureSettings = async () => {
        autoCalls++;
        return { resourcePlan: [{ tool: 'quiz', directive: 'Approved directive.' }] };
      };
      await w.AlloModules.GenerationHelpers.handlePlanFullPack(h.deps);
      const plan = h.getRun();
      const statusAfterPlan = plan.status;
      await w.AlloModules.GenerationHelpers.handleApproveFullPack(plan, h.deps);
      return {
        statusAfterPlan,
        finalStatus: h.getRun().status,
        autoCalls,
        resourceCalls: h.calls.filter((call: any) => call.kind === 'resource').length,
        directive: h.getRun().preflight.selected[0].directive,
        approvedFrom: h.getRun().approvedFrom,
        planId: plan.runId,
      };
    });
    expect(result).toMatchObject({ statusAfterPlan: 'ready', finalStatus: 'completed', autoCalls: 1, resourceCalls: 1, directive: 'Approved directive.' });
    expect(result.approvedFrom).toBe(result.planId);
  });

  test('stale source blocks an approved plan before any resource call', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const w = window as any;
      const h = w.__makeFullPackHarness();
      await w.AlloModules.GenerationHelpers.handlePlanFullPack(h.deps);
      const plan = h.getRun();
      h.deps.inputText = 'The source changed after the teacher reviewed the plan.';
      const accepted = await w.AlloModules.GenerationHelpers.handleApproveFullPack(plan, h.deps);
      return {
        accepted,
        status: h.getRun().status,
        reason: h.getRun().reason,
        resourceCalls: h.calls.filter((call: any) => call.kind === 'resource').length,
      };
    });
    expect(result.accepted).toBe(false);
    expect(result.status).toBe('failed');
    expect(result.reason).toContain('source changed');
    expect(result.resourceCalls).toBe(0);
  });

  test('Stop also aborts the planning AI request without a diagnostic failure', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const w = window as any;
      const records: any[] = [];
      w.AlloModules.ErrorReporter = { record: (...args: any[]) => records.push(args) };
      const h = w.__makeFullPackHarness();
      h.deps.autoConfigureSettings = async (...args: any[]) => new Promise((_resolve, reject) => {
        const signal = args[7];
        setTimeout(() => w.AlloModules.GenerationHelpers.handleStopFullPack(), 0);
        signal.addEventListener('abort', () => {
          const error: any = new Error('planning stopped');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      });
      await w.AlloModules.GenerationHelpers.handlePlanFullPack(h.deps);
      return { status: h.getRun().status, records: records.length, resourceCalls: h.calls.filter((call: any) => call.kind === 'resource').length };
    });
    expect(result).toEqual({ status: 'stopped', records: 0, resourceCalls: 0 });
  });
  test('Stop aborts the active request without emitting a diagnostic failure', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const w = window as any;
      const records: any[] = [];
      w.AlloModules.ErrorReporter = { record: (...args: any[]) => records.push(args) };
      const h = w.__makeFullPackHarness();
      h.deps.handleGenerate = async (_type: string, _lang: any, _keep: any, _text: any, _config: any, _switch: any, request: any) =>
        new Promise((_resolve, reject) => {
          setTimeout(() => w.AlloModules.GenerationHelpers.handleStopFullPack(), 0);
          request.generationSignal.addEventListener('abort', () => {
            const error: any = new Error('teacher stopped');
            error.name = 'AbortError';
            reject(error);
          }, { once: true });
        });
      await w.AlloModules.GenerationHelpers.handleGenerateFullPack(null, h.deps);
      return { status: h.getRun().status, rowStatus: Object.values(h.getRun().resources)[0] && (Object.values(h.getRun().resources)[0] as any).status, records: records.length };
    });
    expect(result).toEqual({ status: 'stopped', rowStatus: 'stopped', records: 0 });
  });

  test('partial All Groups run retries only the affected group', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const w = window as any;
      const h = w.__makeFullPackHarness({
        fullPackTargetGroup: 'all',
        rosterKey: { groups: {
          core: { name: 'Core', profile: { gradeLevel: '3rd Grade' } },
          support: { name: 'Support', profile: { gradeLevel: '8th Grade' } },
        } },
      });
      h.deps.handleGenerate = async (type: string, _lang: any, _keep: any, _text: any, _config: any, _switch: any, request: any) => {
        h.calls.push({ kind: 'resource', type, gradeLevel: request.gradeLevel });
        if (request.gradeLevel === '8th Grade') throw new Error('scripted group failure');
        return { id: `resource-${type}`, type, data: {} };
      };
      await w.AlloModules.GenerationHelpers.handleGenerateFullPack(null, h.deps);
      const partial = h.getRun();
      h.calls.length = 0;
      h.deps.handleGenerate = async (type: string, _lang: any, _keep: any, _text: any, _config: any, _switch: any, request: any) => {
        h.calls.push({ kind: 'resource', type, gradeLevel: request.gradeLevel });
        return { id: `retry-${type}`, type, data: {} };
      };
      await w.AlloModules.GenerationHelpers.handleRetryFailedFullPack(partial, h.deps);
      return {
        partialStatus: partial.status,
        childStatuses: Object.fromEntries(Object.entries(partial.groups).map(([key, value]: any) => [key, value.status])),
        retryGroups: h.calls.filter((call: any) => call.kind === 'group').map((call: any) => call.id),
        retryGrades: h.calls.filter((call: any) => call.kind === 'resource').map((call: any) => call.gradeLevel),
        retryStatus: h.getRun().status,
      };
    });
    expect(result.partialStatus).toBe('partial');
    expect(result.childStatuses).toEqual({ core: 'completed', support: 'partial' });
    expect(result.retryGroups).toEqual(['support']);
    expect(result.retryGrades).toEqual(['8th Grade']);
    expect(result.retryStatus).toBe('completed');
  });
});
test.describe('Full Pack review panel accessibility', () => {
  test('supports narrow screens, keyboard disclosure, drift messaging, and reduced motion', async ({ page }) => {
    const source = readFileSync(path.resolve(__dirname, '../../AlloFlowANTI.txt'), 'utf8');
    expect(source).toContain('Settings changed after this plan was created');
    expect(source).toContain('<details key={rowKey}');
    expect(source).toContain('Generate original plan');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain('_compactFullPackRunForStorage');
    expect(source).toContain('compactFallback: true');

    await page.setViewportSize({ width: 360, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(`
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; font: 14px system-ui; }
        main { width: 100%; max-width: 360px; padding: 12px; overflow-wrap: anywhere; }
        [role=status], details, footer { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; margin: 8px 0; }
        summary { cursor: pointer; display: flex; justify-content: space-between; gap: 8px; }
        .chevron { transition: transform .2s; }
        details[open] .chevron { transform: rotate(180deg); }
        footer { display: flex; flex-wrap: wrap; gap: 8px; }
        @media (prefers-reduced-motion: reduce) { .chevron { transition: none; } }
      </style>
      <main aria-label="Full Pack review">
        <div role="status" aria-live="polite"><strong>Settings changed after this plan was created</strong><br>Generate original plan uses the reviewed settings.</div>
        <details>
          <summary><span>Quiz</span><span>Queued <span class="chevron">⌄</span></span></summary>
          <div><strong>Instruction:</strong> Check understanding with five questions.</div>
          <div><strong>Audience:</strong> 5th Grade · English</div>
          <div><strong>Differentiation:</strong> 3 levels</div>
        </details>
        <footer><button>Refresh plan</button><button>Generate original plan</button><button>Copy diagnostics</button></footer>
      </main>
    `);

    const disclosure = page.locator('summary');
    await disclosure.focus();
    await expect(disclosure).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('details')).toHaveAttribute('open', '');
    await expect(page.getByText('Check understanding with five questions.')).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      transition: getComputedStyle(document.querySelector('.chevron')!).transitionDuration,
    }));
    expect(dimensions.documentWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.transition).toBe('0s');
    await expect(page.getByRole('status')).toContainText('Settings changed');
    await expect(page.getByRole('button', { name: 'Generate original plan' })).toBeVisible();
  });
});
