import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
const ROOT = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');
const names = source.slice(source.indexOf('function PdfAuditView(props) {')).split('} = props;')[0]
  .split('const {')[1].split(',').map(x => x.trim()).filter(Boolean);

async function mountWorkspace(page: Page, savedBatch: any = null) {
  const errors: string[] = [];
  page.on('pageerror', e => { errors.push(e.stack || e.message); console.error('Workspace browser error:', e.stack); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>');
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js',
    'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',
    'verification_policy_module.js', 'doc_pipeline_module.js', 'view_pdf_audit_module.js', 'app_styles_module.js']) await page.addScriptTag({ path: path.join(ROOT, file) });
  const css = fs.readdirSync(path.join(ROOT, 'app/static/css')).find(file => /^main\..*\.css$/.test(file));
  if (!css) throw new Error('Built application stylesheet is missing');
  await page.addStyleTag({ path: path.join(ROOT, 'app/static/css', css) });
  await page.evaluate(({ names, savedBatch }) => {
    const w = window as any;
    w.warnLog = () => {}; w.debugLog = () => {};
    w.AlloIcons = { X: () => w.React.createElement('span', { 'aria-hidden': true }, '×') };
    w.__manualStarts = 0; w.__modalCloses = 0; w.__escapedToHost = 0;
    document.addEventListener('keydown', e => { if (e.key === 'Escape') w.__escapedToHost++; });
    const initial: any = {};
    for (const name of names) {
      if (name.endsWith('Ref')) initial[name] = { current: null };
      else if (/^(set|run|call|fix|apply|save|start|update|capture|download|open|proceed|generate|retire|select)/.test(name)) initial[name] = () => {};
    }
    Object.assign(initial, {
      t: () => '', theme: 'light', pdfDocumentEpoch: 4, pdfTargetScore: 95, applyingRemarkup: false,
      pdfAutoFixPasses: 3, pdfPolishPasses: 1, pdfAuditorCount: 1,
      pdfPreviewFontSize: 16, pdfPreviewTheme: 'original', pdfFixMode: 'auto',
      pdfAuditResult: { _choosing: true, fileName: 'sample.docx', fileSize: 100 },
      pendingPdfFile: { name: 'sample.docx', size: 100 }, pendingPdfBase64: 'data',
      pdfAuditTab: 'results', pdfBatchCurrentIndex: -1, pdfStormBudgetMinutes: 10, pdfFixStep: '', pdfBatchStep: '', expertCommandInput: '',
      STYLE_SEEDS: {}, addToast: () => {}, runPdfAccessibilityAudit: async () => { w.__manualStarts++; return null; }, safeCloneAudit: (x: any) => x,
      safeCloseAudit: () => w.__modalCloses++, _closePdfAuditModal: () => w.__modalCloses++,
      isPdfDocumentIntakeCurrent: (epoch: number) => epoch === 4,
      capturePdfDocumentIntakeEpoch: () => 4, _docPipeline: Object.assign({}, w.AlloModules.createDocPipeline, { isRemediationRunning: () => !!w.__pipelineActive, loadResumableBatch: async () => savedBatch }),
      pdfBatchQueue: [], pdfRunHistory: [], agentActivityLog: [], extractedImagesList: [], liveChunkStream: [],
      insertBlockRecent: [], insertBlockOpenCats: {}, liveChunkExpanded: {}, liveChunkRejected: {},
      remediationReady: true, auditReady: true,
    });
    function Harness() {
      const [state, setState] = w.React.useState(initial);
      w.__modalState = state;
      w.__setModalState = (patch: any) => setState((s: any) => ({ ...s, ...patch }));
      const setters = w.React.useMemo(() => {
      const setters: any = {};
      for (const name of names.filter(name => /^set[A-Z]/.test(name))) {
        const key = name[3].toLowerCase() + name.slice(4);
        setters[name] = (value: any) => setState((s: any) => ({ ...s, [key]: typeof value === 'function' ? value(s[key]) : value }));
      }
      return setters;
      }, []);
      return w.React.createElement('div', { className: 'theme-' + state.theme }, w.React.createElement(w.AlloModules.AppStyles.AppStyles), w.React.createElement(w.AlloModules.PdfAuditView, { ...state, ...setters }));
    }
    w.ReactDOM.createRoot(document.getElementById('root')).render(w.React.createElement(Harness));
  }, { names, savedBatch });
  const dialog = page.getByRole('dialog', { name: 'PDF Accessibility Audit', exact: true });
  await expect(dialog, errors.join('\n')).toBeVisible();
  return { dialog, errors };
}

test('modal retains active runs across manual, review, auto, batch and focused modes', async ({ page }) => {
  const { dialog, errors } = await mountWorkspace(page);
  for (const mode of ['auto', 'review', 'expert', 'batch', 'focused']) {
    await page.evaluate(mode => (window as any).__setModalState({
      pdfFixMode: mode === 'batch' || mode === 'focused' ? 'auto' : mode,
      pdfBatchMode: mode === 'batch' || mode === 'focused', _remediationMode: mode === 'focused',
      pdfFixLoading: mode !== 'batch' && mode !== 'focused', pdfBatchProcessing: mode === 'batch' || mode === 'focused',
    }), mode);
    await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
    await dialog.focus(); await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(0);
    expect(await page.evaluate(() => (window as any).__escapedToHost)).toBe(0);
  }
  await page.evaluate(() => (window as any).__setModalState({ pdfBatchMode: false, _remediationMode: false, pdfFixLoading: false, pdfBatchProcessing: false }));
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeEnabled();
  await page.locator('[data-help-key="pdf_audit_view_close_btn"]').click();
  expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(1);
  expect(errors).toEqual([]);
});

const SHOTS = process.env.REMEDIATION_QA_SHOTS || path.join(ROOT, 'reports/remediation-recovery-2026-09-12');
async function setResult(page: Page, patch: any = {}) {
  await page.evaluate(patch => {
    const w = window as any;
    w.__setModalState({
      pdfAuditResult: { fileName: 'classroom-handout.docx', fileSize: 100, pageCount: 3, score: 78, critical: [], serious: [], moderate: [], minor: [] },
      pdfFixResult: {
        accessibleHtml: '<!doctype html><html lang="en"><head><title>Classroom handout</title></head><body><main><h1>Classroom handout</h1><p>Read the passage and discuss.</p></main></body></html>',
        originalText: 'Classroom handout Read the passage and discuss.',
        beforeScore: 78, afterScore: 99, verificationState: 'partial', verificationCoverage: { ai: 'unavailable', axe: 'complete', equalAccess: 'unavailable' },
        verificationReasons: ['ai-incomplete'], _aiVerificationIncomplete: true,
        axeAudit: { score: 100, totalViolations: 0, critical: [], serious: [], moderate: [], minor: [], incomplete: [], passes: [] },
        changes: [], fidelityNotes: [], integrityCoverage: 100,
        ...patch,
      },
      pdfFixMode: 'auto', pdfAuditTab: 'results', pdfFixLoading: false, pdfAutoContinueRunning: false,
      pdfBatchMode: false, pdfWebMode: false,
    });
  }, patch);
}

test('workspace source and after-remediation controls use native keyboard behavior and stay locked during a run', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  const sources = page.getByRole('group', { name: 'Source to remediate' });
  await expect(sources.getByRole('button', { name: /Single document/ })).toHaveAttribute('aria-pressed', 'true');
  const manual = page.locator('[data-help-key="pdf_workspace_manual"]');
  await expect(manual).not.toHaveAttribute('open');
  await manual.locator('summary').click();
  const mode = page.getByRole('combobox', { name: /After remediation/ });
  for (const value of ['review', 'expert', 'auto']) {
    await mode.selectOption(value); await expect(mode).toHaveValue(value);
  }
  // Same-tick owner guard: a pipeline can become active before the render's busy flag.
  await page.evaluate(() => {
    (window as any).__pipelineActive = true;
    (document.querySelector('[data-help-key="pdf_audit_view_mode_batch_btn"]') as HTMLButtonElement).click();
    (document.querySelector('[data-help-key="pdf_audit_view_start_btn"]') as HTMLButtonElement).click();
  });
  await expect(sources.getByRole('button', { name: /Single document/ })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { (window as any).__pipelineActive = false; (window as any).__setModalState({ pdfFixLoading: true }); });
  expect(await page.evaluate(() => (window as any).__manualStarts)).toBe(0);
  await expect(mode).toBeDisabled();
  await expect(page.locator('[data-help-key="pdf_audit_view_start_btn"]')).toBeDisabled();
  await expect(sources.getByRole('button', { name: /Batch of files/ })).toBeDisabled();
  await page.evaluate(() => (window as any).__setModalState({ pdfFixLoading: false }));
  await sources.getByRole('button', { name: /Website/ }).click();
  await expect(page.getByLabel('Website URL to audit')).toBeVisible();
  await expect(sources.getByRole('button', { name: /Website/ })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => (window as any).__setModalState({ pdfAuditResult: { score: -1, error: 'Temporary failure' }, pdfFixLoading: true }));
  await expect(page.locator('[data-help-key="pdf_workspace_retry_audit"]')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('workspace results preserve the mounted owner and navigate into collapsed downloads', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await setResult(page);
  const header = page.getByTestId('pdf-workspace-header');
  await expect(header.getByRole('status')).toHaveText('Needs review');
  await expect(page.getByText(/Anything flagged below is optional polish/)).toHaveCount(0);
  await page.evaluate(() => { (window as any).__originalDialog = document.querySelector('[data-help-key="pdf_audit_view_panel"]'); });
  const formats = page.locator('[data-help-key="pdf_audit_alt_formats_summary"]');
  await expect(formats).not.toHaveAttribute('open');
  await header.getByRole('button', { name: 'Downloads', exact: true }).click();
  await expect(formats).toHaveAttribute('open', '');
  await expect(page.locator('#allo-sec-downloads')).toBeFocused();
  expect(await page.evaluate(() => (window as any).__originalDialog === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  const headerBox = await header.boundingBox(); const targetBox = await page.locator('#allo-sec-downloads').boundingBox();
  expect(targetBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  await header.getByRole('button', { name: 'Advanced tools', exact: true }).click();
  await expect(page.locator('#allo-sec-workbench')).toHaveAttribute('open', '');
  await expect(page.locator('#allo-sec-workbench > summary')).toBeFocused();
  await page.evaluate(() => (window as any).__setModalState({ pdfAuditTab: 'original' }));
  await header.getByRole('button', { name: 'Verification & review' }).click();
  await expect(page.locator('[data-help-key="pdf_audit_verification_status"]')).toBeFocused();
  await page.evaluate(() => (window as any).__setModalState({ pdfFixLoading: true }));
  await expect(header.getByRole('status')).toHaveText('Remediation in progress');
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__originalDialog === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  expect(errors).toEqual([]);
});

for (const layout of [{ width: 1280, theme: 'light' }, { width: 320, theme: 'light' }, { width: 390, theme: 'dark' }, { width: 320, theme: 'contrast' }]) {
  test(`workspace layout ${layout.width}px ${layout.theme}`, async ({ page }) => {
    await page.setViewportSize({ width: layout.width, height: 900 });
    const { errors } = await mountWorkspace(page);
    await page.evaluate(theme => (window as any).__setModalState({ theme }), layout.theme);
    const shell = page.locator('.pdf-workspace-shell');
    const checkWidth = async () => {
      const overflow = await shell.evaluate(el => {
        const right = el.getBoundingClientRect().right;
        return Array.from(el.querySelectorAll('*')).filter(e => e.getBoundingClientRect().right > right + 1).map(e => ({ tag: e.tagName, classes: e.className, text: e.textContent?.slice(0,90), width: e.getBoundingClientRect().width })).slice(0,12);
      });
      expect(await shell.evaluate(el => el.scrollWidth - el.clientWidth), JSON.stringify(overflow)).toBeLessThanOrEqual(1);
    };
    await checkWidth();
    await page.addScriptTag({ path: path.join(ROOT, 'node_modules/axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['.pdf-workspace-header'], ['.pdf-workspace-sources']] })).violations);
    expect(violations).toEqual([]);
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, `intake-${layout.width}-${layout.theme}.png`) });
    await setResult(page);
    await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Needs review');
    await checkWidth();
    await page.screenshot({ path: path.join(SHOTS, `results-${layout.width}-${layout.theme}.png`) });
    expect(errors).toEqual([]);
  });
}

test('batch rows distinguish processed from verified and keep failed files available for retry', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await page.evaluate(() => (window as any).__setModalState({
    pdfBatchMode: true, pdfBatchSummary: { status: 'complete', total: 3, done: 2, failed: 1, reviewRequired: 1, pending: 0, results: [] },
    pdfBatchQueue: [
      { id: 'one', fileName: 'verified.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'complete', fullyVerifiedSuccess: true } },
      { id: 'two', fileName: 'needs-review.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'partial' } },
      { id: 'three', fileName: 'retry.docx', fileSize: 100, status: 'failed' },
    ],
  }));
  const rows = page.locator('.pdf-workspace-batch-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Processed');
  await expect(rows.nth(0)).toContainText('Verification complete');
  await expect(rows.nth(1)).toContainText('Verification partial');
  await expect(rows.nth(2).getByRole('button', { name: 'Retry retry.docx' })).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, 'batch-results-1280.png') });
  expect(errors).toEqual([]);
});


async function setRetryBatch(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__batchCalls = []; w.__batchToasts = [];
    w.__setModalState({
      pdfBatchMode: true,
      pdfBatchSummary: { batchId: 'saved-batch', status: 'complete', total: 3, done: 1, processed: 1, failed: 2, pending: 0, settings: { pdfTargetScore: 88 }, results: [] },
      pdfBatchQueue: [
        { id: 'done', fileName: 'done.docx', fileSize: 100, status: 'done', result: { accessibleHtml: '<main>Saved work</main>', afterScore: 99, verificationState: 'partial' } },
        { id: 'selected', fileName: 'selected.docx', fileSize: 100, status: 'failed', error: 'Original failure' },
        { id: 'other', fileName: 'other.docx', fileSize: 100, status: 'failed', error: 'Keep this failure' },
      ],
      addToast: (...args: any[]) => w.__batchToasts.push(args),
      runPdfBatchRemediation: (options: any) => {
        w.__batchCalls.push(options);
        return new Promise((_resolve, reject) => { w.__rejectBatch = () => reject(new Error('engine failed to load')); });
      },
    });
  });
}

test('a delayed single-file retry preserves the queue and blocks reset, close and duplicate retries', async ({ page }) => {
  const { dialog, errors } = await mountWorkspace(page);
  await setRetryBatch(page);
  await page.getByRole('group', { name: 'Filter batch files' }).getByRole('button', { name: 'Failed (2)', exact: true }).click();
  await expect(page.locator('.pdf-workspace-batch-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'Retry selected.docx', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry selected.docx', exact: true })).toBeDisabled();
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_new_batch_btn"]')).toBeDisabled();
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  await dialog.focus(); await page.keyboard.press('Escape');
  const options = await page.evaluate(() => (window as any).__batchCalls);
  expect(options).toHaveLength(1);
  expect(options[0]).toMatchObject({ resumeBatchId: 'saved-batch', retryFileIds: ['selected'], resumeSettings: { pdfTargetScore: 88 } });
  expect(options[0].resumeQueue.map((item: any) => item.status)).toEqual(['done', 'pending', 'failed']);
  await page.evaluate(() => (window as any).__rejectBatch());
  await expect(page.getByRole('button', { name: 'Retry selected.docx', exact: true })).toBeEnabled();
  const state = await page.evaluate(() => ({ queue: (window as any).__modalState.pdfBatchQueue, toasts: (window as any).__batchToasts, closes: (window as any).__modalCloses }));
  expect(state.queue.map((item: any) => item.status)).toEqual(['done', 'failed', 'failed']);
  expect(state.queue[0].result.accessibleHtml).toBe('<main>Saved work</main>');
  expect(state.queue[1].error).toBe('Original failure');
  expect(state.toasts[0][0]).toContain('engine failed to load');
  expect(state.closes).toBe(0);
  expect(errors).toEqual([]);
});

test('an unavailable remediation engine leaves failed batch files ready for a later retry', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await setRetryBatch(page);
  await page.evaluate(() => (window as any).__setModalState({ remediationReady: false }));
  await expect(page.getByRole('button', { name: 'Retry selected.docx', exact: true })).toBeDisabled();
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_retry_all_failed_btn"]')).toBeDisabled();
  const state = await page.evaluate(() => ({ queue: (window as any).__modalState.pdfBatchQueue, calls: (window as any).__batchCalls }));
  expect(state.queue[1]).toMatchObject({ status: 'failed', error: 'Original failure' });
  expect(state.calls).toEqual([]);
  expect(errors).toEqual([]);
});

test('finishing an old checkpoint discard cannot clear a newer document queue', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await setRetryBatch(page);
  await page.evaluate(() => {
    const w = window as any; w.__intakeEpoch = 4;
    w.__setModalState({
      pdfBatchSummary: { batchId: 'old-batch', status: 'stopped', total: 3, processed: 1, failed: 2, pending: 0, results: [] },
      capturePdfDocumentIntakeEpoch: () => w.__intakeEpoch,
      isPdfDocumentIntakeCurrent: (epoch: number) => epoch === w.__intakeEpoch,
      _docPipeline: Object.assign({}, w.AlloModules.createDocPipeline, {
        isRemediationRunning: () => false,
        discardResumableBatch: (id: string) => { w.__discardedBatchId = id; return new Promise(resolve => { w.__resolveDiscard = () => resolve(true); }); },
      }),
    });
  });
  await page.locator('[data-help-key="pdf_audit_view_batch_new_batch_btn"]').click();
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_new_batch_btn"]')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry selected.docx', exact: true })).toBeDisabled();
  await page.evaluate(() => {
    const w = window as any; w.__intakeEpoch = 5;
    w.__setModalState({ pdfDocumentEpoch: 5, pdfBatchSummary: null,
      pdfBatchQueue: [{ id: 'new', fileName: 'new.docx', fileSize: 100, status: 'pending' }] });
  });
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_clear_all_btn"]')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove new.docx', exact: true })).toBeDisabled();
  await page.evaluate(() => (window as any).__resolveDiscard());
  await expect(page.getByRole('button', { name: 'Remove new.docx', exact: true })).toBeEnabled();
  await expect(page.locator('.pdf-workspace-batch-row')).toContainText('new.docx');
  expect(await page.evaluate(() => (window as any).__discardedBatchId)).toBe('old-batch');
  expect(errors).toEqual([]);
});


const savedBatchFixture = {
  batchId: 'saved-resume', _doneCount: 1, _incompleteCount: 1, settings: { pdfTargetScore: 87 },
  files: [
    { id: 'done', fileName: 'saved-done.docx', fileSize: 100, status: 'done', result: { accessibleHtml: '<main>Saved work</main>' } },
    { id: 'pending', fileName: 'saved-pending.docx', fileSize: 100, status: 'processing', base64: 'pending-document' },
  ],
};

test('saved-batch discard excludes resume and intake until storage responds', async ({ page }) => {
  const { errors } = await mountWorkspace(page, savedBatchFixture);
  await page.evaluate(() => {
    const w = window as any; w.__savedBatchCalls = [];
    w.__setModalState({ pdfBatchMode: true,
      runPdfBatchRemediation: (options: any) => w.__savedBatchCalls.push(options),
      _docPipeline: Object.assign({}, w.__modalState._docPipeline, {
        isRemediationRunning: () => false,
        discardResumableBatch: (id: string) => { w.__discardedId = id; return new Promise(resolve => { w.__finishDiscard = () => resolve(false); }); },
      }),
    });
  });
  await page.locator('[data-help-key="pdf_audit_view_batch_discard_btn"]').click();
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toBeDisabled();
  await expect(page.locator('#batch-pdf-input')).toBeDisabled();
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  await page.evaluate(() => (window as any).__finishDiscard());
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toBeEnabled();
  expect(await page.evaluate(() => (window as any).__discardedId)).toBe('saved-resume');
  expect(await page.evaluate(() => (window as any).__savedBatchCalls)).toEqual([]);
  expect(errors).toEqual([]);
});

test('a rejected saved-batch resume retains its checkpoint and saved settings', async ({ page }) => {
  const { errors } = await mountWorkspace(page, savedBatchFixture);
  await page.evaluate(() => {
    const w = window as any; w.__savedBatchCalls = [];
    w.__setModalState({ pdfBatchMode: true,
      runPdfBatchRemediation: (options: any) => {
        w.__savedBatchCalls.push(options);
        return new Promise((_resolve, reject) => { w.__failResume = () => reject(new Error('storage failed to initialize')); });
      },
    });
  });
  await page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]').click();
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  await expect(page.locator('#batch-pdf-input')).toBeDisabled();
  await page.evaluate(() => (window as any).__failResume());
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toBeEnabled();
  const calls = await page.evaluate(() => (window as any).__savedBatchCalls);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({ resumeBatchId: 'saved-resume', resumeSettings: { pdfTargetScore: 87 } });
  expect(calls[0].resumeQueue.map((item: any) => item.status)).toEqual(['done', 'pending']);
  expect(calls[0].resumeQueue[0].result.accessibleHtml).toBe('<main>Saved work</main>');
  expect(errors).toEqual([]);
});


test('batch filters expose review work and readable failure details without changing the queue', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await setRetryBatch(page);
  await expect(page.getByText('Need review', { exact: true }).locator('..')).toHaveText('1Need review');
  await expect(page.getByText('Fully verified', { exact: true }).locator('..')).toHaveText('0Fully verified');
  await expect(page.getByText('Total time:', { exact: false })).toHaveText('⏱️ Total time: Unavailable');
  const filters = page.getByRole('group', { name: 'Filter batch files' });
  await filters.getByRole('button', { name: 'Needs review (1)', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(filters.getByRole('button', { name: 'Needs review (1)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.pdf-workspace-batch-row')).toHaveCount(1);
  await expect(page.locator('.pdf-workspace-batch-row')).toContainText('done.docx');
  await filters.getByRole('button', { name: 'Unfinished (0)', exact: true }).click();
  await expect(page.locator('#pdf-workspace-batch-queue')).toContainText('No files match this filter.');
  await filters.getByRole('button', { name: 'Failed (2)', exact: true }).click();
  const error = page.locator('.pdf-workspace-batch-error').first();
  await error.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(error).toHaveAttribute('open', '');
  await expect(error).toContainText('Original failure');
  await filters.getByRole('button', { name: 'All files (3)', exact: true }).click();
  await expect(page.locator('.pdf-workspace-batch-row')).toHaveCount(3);
  expect(await page.evaluate(() => (window as any).__modalState.pdfBatchQueue.map((item: any) => item.status))).toEqual(['done', 'failed', 'failed']);
  // A newly selected document starts with a complete view even if the previous filter was empty.
  await filters.getByRole('button', { name: 'Unfinished (0)', exact: true }).click();
  await page.evaluate(() => (window as any).__setModalState({ pdfDocumentEpoch: 5 }));
  await expect(filters.getByRole('button', { name: 'All files (3)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});

test('batch progress counts processed files and Stop feedback belongs only to its current run', async ({ page }) => {
  const { dialog, errors } = await mountWorkspace(page);
  await page.evaluate(() => {
    const w = window as any;
    w.__alloPdfBatchAbortCtrl = new AbortController(); w.__stopToasts = [];
    w.__setModalState({ pdfBatchMode: true, pdfBatchProcessing: true, pdfBatchCurrentIndex: 2,
      pdfBatchStep: 'Auditing last.docx', addToast: (...args: any[]) => w.__stopToasts.push(args),
      pdfBatchQueue: [
        { id: 'done', fileName: 'done.docx', fileSize: 100, status: 'done', result: { verificationState: 'partial' } },
        { id: 'failed', fileName: 'failed.docx', fileSize: 100, status: 'failed' },
        { id: 'last', fileName: 'last.docx', fileSize: 100, status: 'processing' },
      ],
    });
  });
  const progress = page.getByRole('progressbar', { name: 'Batch remediation progress' });
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  await expect(progress).toHaveAttribute('aria-valuemax', '3');
  const stop = page.locator('[data-help-key="pdf_audit_view_batch_stop_btn"]');
  // Two programmatic clicks in one event turn must request only one stop.
  await stop.evaluate((el: HTMLButtonElement) => { el.click(); el.click(); });
  await expect(stop).toBeDisabled(); await expect(stop).toHaveText('Stopping…');
  await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Stopping batch');
  expect(await page.evaluate(() => (window as any).__alloPdfBatchAbortCtrl.signal.aborted)).toBe(true);
  expect(await page.evaluate(() => (window as any).__stopToasts.length)).toBe(1);
  await dialog.focus(); await page.keyboard.press('Escape');
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(0);
  await page.evaluate(() => (window as any).__setModalState({ pdfBatchProcessing: false,
    pdfBatchSummary: { status: 'complete', total: 3, processed: 1, failed: 1, pending: 0, results: [] } }));
  await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Batch paused or interrupted');
  await expect(page.getByRole('heading', { name: /Batch Processing Interrupted/ })).toBeVisible();
  await page.evaluate(() => {
    const w = window as any; w.__alloPdfBatchAbortCtrl = new AbortController();
    w.__setModalState({ pdfBatchSummary: null, pdfBatchProcessing: true });
  });
  await expect(stop).toBeEnabled(); await expect(stop).toHaveText('Stop');
  await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Processing batch');
  await expect(progress).toHaveAttribute('aria-valuenow', '1');
  expect(errors).toEqual([]);
});

for (const layout of [{ width: 1280, theme: 'light' }, { width: 320, theme: 'dark' }, { width: 320, theme: 'contrast' }]) {
  test('batch queue controls and details fit ' + layout.width + 'px ' + layout.theme, async ({ page }) => {
    await page.setViewportSize({ width: layout.width, height: 1000 });
    const { errors } = await mountWorkspace(page);
    await setRetryBatch(page);
    await page.evaluate(theme => {
      const w = window as any;
      w.__setModalState({ theme, pdfBatchQueue: w.__modalState.pdfBatchQueue.map((item: any) => item.id === 'selected'
        ? { ...item, error: 'Cannot process <script>unsafe()</script> ' + 'long-detail-'.repeat(20) } : item) });
    }, layout.theme);
    await page.getByRole('group', { name: 'Filter batch files' }).getByRole('button', { name: 'Failed (2)', exact: true }).click();
    const detail = page.locator('.pdf-workspace-batch-error').first();
    await detail.locator('summary').click();
    await expect(detail).toContainText('<script>unsafe()</script>');
    await expect(detail.locator('script')).toHaveCount(0);
    const shell = page.locator('.pdf-workspace-shell');
    const overflow = await shell.evaluate(el => Array.from(el.querySelectorAll('*')).filter(child => child.getBoundingClientRect().right > el.getBoundingClientRect().left + el.clientLeft + el.clientWidth + 1).map(child => ({ tag: child.tagName, classes: child.className, text: child.textContent?.slice(0, 90), right: child.getBoundingClientRect().right })).slice(0, 12));
    expect(await shell.evaluate(el => el.scrollWidth - el.clientWidth), JSON.stringify(overflow)).toBeLessThanOrEqual(1);
    await page.addScriptTag({ path: path.join(ROOT, 'node_modules/axe-core/axe.min.js') });
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['.pdf-workspace-batch-filters'], ['.pdf-workspace-batch-error']] })).violations);
    expect(violations).toEqual([]);
    await page.locator('.pdf-workspace-batch-filters').scrollIntoViewIfNeeded();
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, 'queue-' + layout.width + '-' + layout.theme + '.png') });
    expect(errors).toEqual([]);
  });
}


test('late storage initialization exposes retained failures for review without launching AI', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await page.evaluate(() => { const w = window as any; w.__setModalState({ pdfBatchMode: true, remediationReady: false, _docPipeline: { isRemediationRunning: () => false } }); });
  await expect(page.getByText('Saved-batch storage is still loading.')).toBeVisible();
  await page.evaluate(() => {
    const w = window as any; w.__restoredRuns = 0; w.__discardCalls = [];
    w.__setModalState({ _docPipeline: { isRemediationRunning: () => false,
      loadResumableBatch: async () => ({ batchId: 'retained-failed', _incompleteCount: 1, _failedCount: 1, _pendingCount: 0, _doneCount: 1, savedAt: Date.now(), settings: { pdfTargetScore: 88 }, files: [
        { id: 'done', status: 'done', fileName: 'done.docx', fileSize: 100, result: { accessibleHtml: '<main>Preserved</main>', verificationState: 'partial' } },
        { id: 'failed', status: 'failed', fileName: 'locked.pdf', fileSize: 100, error: 'PDF is password-protected', autoRetryable: false, retryAdvice: 'Add an unlocked copy.' },
      ] }), discardResumableBatch: async (id: string) => { w.__discardCalls.push(id); return true; },
    }, runPdfBatchRemediation: () => w.__restoredRuns++ });
  });
  await page.getByRole('button', { name: /Review saved files/ }).click();
  await expect(page.locator('.pdf-workspace-batch-row')).toHaveCount(2);
  expect(await page.evaluate(() => (window as any).__restoredRuns)).toBe(0);
  await expect(page.getByRole('button', { name: 'Retry locked.pdf' })).toBeDisabled();
  await page.locator('[data-help-key="pdf_audit_view_batch_new_batch_btn"]').click();
  expect(await page.evaluate(() => (window as any).__discardCalls)).toEqual(['retained-failed']);
  expect(errors).toEqual([]);
});

test('saved-batch discovery retries a temporary storage error without remounting the modal', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await page.evaluate(saved => {
    const w = window as any; w.__lookupCalls = 0;
    w.__setModalState({ pdfBatchMode: true, _docPipeline: { isRemediationRunning: () => false,
      loadResumableBatch: async () => { if (++w.__lookupCalls === 1) throw new Error('Storage temporarily unavailable'); return saved; },
    } });
  }, savedBatchFixture);
  await expect(page.getByText('Could not check for a saved batch. Your saved files were not discarded.')).toBeVisible();
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__lookupCalls)).toBe(2);
  expect(errors).toEqual([]);
});

test('an old saved-batch lookup cannot replace a newly selected document', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await page.evaluate(() => {
    const w = window as any;
    w.__setModalState({ pdfBatchMode: true, _docPipeline: { isRemediationRunning: () => false,
      loadResumableBatch: () => new Promise(resolve => { w.__finishOldLookup = resolve; }),
    } });
  });
  await expect(page.getByText('Checking for a saved batch…')).toBeVisible();
  await page.evaluate(saved => {
    const w = window as any; w.__setModalState({ pdfDocumentEpoch: 5, pdfBatchQueue: [{ id: 'new', fileName: 'new.pdf', fileSize: 100, status: 'pending' }] });
    w.__finishOldLookup(saved);
  }, savedBatchFixture);
  await expect(page.locator('.pdf-workspace-batch-row')).toContainText('new.pdf');
  await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('checkpoint health remains visible and ignores stale recovery events', async ({ page }) => {
  const { errors } = await mountWorkspace(page); await setRetryBatch(page);
  const publish = async (patch: any) => page.evaluate(patch => window.dispatchEvent(new CustomEvent('alloflow:batch-recovery-state', { detail: {
    batchId: 'saved-batch', generation: 1, sequence: 1, documentEpoch: 4, documentEpochSource: 'host', checkpoint: 'saved', phase: 'processing', savedAt: Date.now(), ...patch,
  } })), patch);
  await publish({});
  await expect(page.getByRole('complementary', { name: 'Batch recovery' })).toContainText('Saved for resume');
  await publish({ documentEpoch: 3, sequence: 9, checkpoint: 'tab-only' });
  await expect(page.getByRole('complementary', { name: 'Batch recovery' })).toContainText('Saved for resume');
  await publish({ sequence: 2, checkpoint: 'tab-only', checkpointReason: 'another-tab' });
  await expect(page.getByRole('complementary', { name: 'Batch recovery' })).toContainText('Another tab replaced this checkpoint.');
  await publish({ sequence: 1 });
  await expect(page.getByRole('complementary', { name: 'Batch recovery' })).toContainText('Only available in this tab');
  await page.evaluate(() => (window as any).__setModalState({ pdfBatchProcessing: true }));
  await publish({ sequence: 3, phase: 'cooldown', checkpoint: 'tab-only' });
  await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Waiting before retry');
  expect(errors).toEqual([]);
});

test('per-file review preserves the active document and is readable with keyboard and high contrast', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  const { errors } = await mountWorkspace(page); await setRetryBatch(page);
  await page.evaluate(() => {
    const w = window as any; w.__originalPanel = document.querySelector('[data-help-key="pdf_audit_view_panel"]');
    const queue = w.__modalState.pdfBatchQueue.map((item: any) => item.id === 'done' ? { ...item, result: { ...item.result,
      verificationCoverage: { ai: 'partial', axe: 'complete', equalAccess: 'unavailable' },
      verificationAudit: { issues: [{ issue: 'Table headers need review <script>unsafe()</script>' }] },
      secondEngineAudit: { manualFindings: [{ description: 'Check reading order' }] },
      fidelityNotes: [{ kind: 'numeric', msg: 'An equation may have changed' }],
    } } : item);
    w.__setModalState({ pdfBatchQueue: queue });
  });
  await page.getByRole('group', { name: 'Filter batch files' }).getByRole('button', { name: 'Needs review (1)' }).click();
  const review = page.locator('.pdf-workspace-batch-review');
  await review.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(review).toHaveAttribute('open', '');
  await expect(review).toContainText('Table headers need review <script>unsafe()</script>');
  await expect(review.locator('script')).toHaveCount(0);
  await expect(review).toContainText('Check reading order');
  await expect(review).toContainText('An equation may have changed');
  await page.addScriptTag({ path: path.join(ROOT, 'node_modules/axe-core/axe.min.js') });
  for (const theme of ['light', 'dark', 'contrast']) {
    await page.evaluate(theme => (window as any).__setModalState({ theme }), theme);
    expect(await page.locator('.pdf-workspace-shell').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['.pdf-workspace-batch-review']] })).violations);
    expect(violations).toEqual([]);
    await review.scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(SHOTS, 'file-review-320-' + theme + '.png') });
  }
  await review.locator('summary').press('Enter');
  await expect(review).not.toHaveAttribute('open');
  expect(await page.evaluate(() => (window as any).__modalState.pendingPdfFile.name)).toBe('sample.docx');
  expect(await page.evaluate(() => (window as any).__originalPanel === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  expect(errors).toEqual([]);
});


async function deferVisibleAudits(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__visibleAudits = []; w.__visibleAuditFixes = 0; w.__auditStopEpochs = [];
    w.__setModalState({
      runPdfAccessibilityAudit: () => new Promise(resolve => {
        // Deliberately ignore abort, like a parser or provider that returns late.
        w.__visibleAudits.push({ resolve, controller: new AbortController() });
      }),
      fixAndVerifyPdf: async () => { w.__visibleAuditFixes++; return null; },
      _docPipeline: Object.assign({}, w.__modalState._docPipeline, {
        getPdfAuditWait: () => null,
        stopPdfAccessibilityAudit: (epoch: number) => {
          w.__auditStopEpochs.push(epoch);
          w.__visibleAudits.at(-1).controller.abort();
          return true;
        },
      }),
    });
  });
}

test('initial audit Stop restores the attached chooser and ignores an abort-insensitive late result', async ({ page }) => {
  const { dialog, errors } = await mountWorkspace(page);
  await deferVisibleAudits(page);
  const start = page.locator('[data-help-key="pdf_audit_view_make_accessible_btn"]');
  await start.click();
  await expect(page.getByRole('button', { name: 'Stop audit', exact: true })).toBeEnabled();
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  await page.getByRole('button', { name: 'Stop audit', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(start).toBeEnabled();
  await expect(start).toBeFocused();
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeEnabled();
  expect(await page.evaluate(() => {
    const w = window as any;
    return { chooser: w.__modalState.pdfAuditResult._choosing, attached: w.__modalState.pendingPdfFile.name,
      loading: w.__modalState.pdfAuditLoading, aborted: w.__visibleAudits[0].controller.signal.aborted,
      stoppedEpochs: w.__auditStopEpochs, fixes: w.__visibleAuditFixes };
  })).toEqual({ chooser: true, attached: 'sample.docx', loading: false, aborted: true, stoppedEpochs: [4], fixes: 0 });
  await page.evaluate(async () => {
    const w = window as any;
    w.__visibleAudits[0].resolve({ score: 37, fileName: 'late-old-result.docx', critical: [], serious: [], moderate: [], minor: [] });
    await new Promise(resolve => setTimeout(resolve, 350));
  });
  await expect(start).toBeEnabled();
  expect(await page.evaluate(() => ({ chooser: (window as any).__modalState.pdfAuditResult._choosing, fixes: (window as any).__visibleAuditFixes })))
    .toEqual({ chooser: true, fixes: 0 });
  expect(errors).toEqual([]);
});

test('initial audit restart owns its result when the stopped audit finishes afterward', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await deferVisibleAudits(page);
  await page.locator('[data-help-key="pdf_audit_view_make_accessible_btn"]').click();
  await page.getByRole('button', { name: 'Stop audit', exact: true }).click();
  await expect(page.locator('[data-help-key="pdf_audit_view_make_accessible_btn"]')).toBeEnabled();
  const manual = page.locator('[data-help-key="pdf_workspace_manual"]');
  await manual.locator('summary').click();
  await page.locator('[data-help-key="pdf_audit_view_start_btn"]').click();
  await expect.poll(() => page.evaluate(() => (window as any).__visibleAudits.length)).toBe(2);
  await page.evaluate(() => (window as any).__visibleAudits[1].resolve({
    score: 91, fileName: 'new-result.docx', fileSize: 100, pageCount: 1,
    critical: [], serious: [], moderate: [], minor: [], _auditFinalized: true,
  }));
  await expect(page.locator('[data-help-key="pdf_audit_results_score_badge"]')).toContainText('91');
  await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeEnabled();
  await page.evaluate(async () => {
    (window as any).__visibleAudits[0].resolve({ score: 37, fileName: 'late-old-result.docx' });
    await new Promise(resolve => setTimeout(resolve, 350));
  });
  await expect(page.locator('[data-help-key="pdf_audit_results_score_badge"]')).toContainText('91');
  expect(await page.evaluate(() => {
    const w = window as any;
    return { name: w.__modalState.pdfAuditResult.fileName, loading: w.__modalState.pdfAuditLoading, fixes: w.__visibleAuditFixes };
  })).toEqual({ name: 'new-result.docx', loading: false, fixes: 0 });
  expect(errors).toEqual([]);
});

test('initial audit wait explanations and countdown remain readable on a phone in dark and contrast themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const { errors } = await mountWorkspace(page);
  await deferVisibleAudits(page);
  await page.clock.install();
  await page.evaluate(() => {
    const w = window as any;
    w.__auditWaitSnapshot = { reason: 'pacing', until: Date.now() + 3000 };
    w.__auditWaitEpochs = [];
    w.__setModalState({ theme: 'dark', _docPipeline: Object.assign({}, w.__modalState._docPipeline, {
      getPdfAuditWait: (epoch: number) => {
        w.__auditWaitEpochs.push(epoch);
        const current = w.__auditWaitSnapshot;
        return { reason: current.reason, remainingMs: current.until ? Math.max(0, current.until - Date.now()) : null,
          pacingMs: 0, recoveryMs: 0, queueMs: 0, extraRequestPacing: true };
      },
    }) });
  });
  await page.locator('[data-help-key="pdf_audit_view_make_accessible_btn"]').click();
  const wait = page.locator('[data-audit-wait]');
  const status = page.getByTestId('pdf-workspace-header').getByRole('status');
  await expect(wait).toHaveAttribute('data-audit-wait', 'pacing');
  await expect(wait.getByRole('status')).toContainText('Spacing out AI requests');
  await expect(status).toHaveText('Audit: spacing AI requests');
  await expect(wait.locator('[aria-hidden="true"]')).toHaveText('Next request in about 3s.');
  await page.clock.runFor(1000);
  await expect(wait.locator('[aria-hidden="true"]')).toHaveText('Next request in about 2s.');
  await page.evaluate(() => { (window as any).__auditWaitSnapshot = { reason: 'queue', until: null }; });
  await page.clock.runFor(1000);
  await expect(wait.getByRole('status')).toContainText('Waiting for another AI request to finish');
  await expect(status).toHaveText('Audit: AI request queued');
  await expect(wait.locator('[aria-hidden="true"]')).toHaveCount(0);
  await page.evaluate(() => { (window as any).__auditWaitSnapshot = { reason: 'recovery', until: Date.now() + 6000 }; });
  await page.clock.runFor(1000);
  await expect(wait.getByRole('status')).toContainText('Waiting before retrying the AI service');
  await expect(status).toHaveText('Audit: waiting for AI service');
  await expect(wait.locator('[aria-hidden="true"]')).toHaveText('Next request in about 5s.');
  await page.addScriptTag({ path: path.join(ROOT, 'node_modules/axe-core/axe.min.js') });
  await page.clock.resume();
  for (const theme of ['dark', 'contrast']) {
    await page.evaluate(theme => (window as any).__setModalState({ theme }), theme);
    const shell = page.locator('.pdf-workspace-shell');
    await expect.poll(() => shell.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [
      ['.pdf-workspace-header'], ['[data-audit-wait]'], ['[data-help-key="pdf_audit_stop"]'],
    ] })).violations);
    expect(violations, theme).toEqual([]);
  }
  expect(await page.evaluate(() => [...new Set((window as any).__auditWaitEpochs)])).toEqual([4]);
  await page.getByRole('button', { name: 'Stop audit', exact: true }).click();
  await expect(wait).toHaveCount(0);
  expect(errors).toEqual([]);
});


// Bind completed result fixtures to their exact HTML, as finalization does.
async function completeResult(page: Page, patch: any = {}) {
  await setResult(page, {
    verificationState: 'complete', verificationReasons: [], _aiVerificationIncomplete: false,
    verificationCoverage: { standard: 'WCAG 2.2 AA', ai: 'complete', axe: 'complete', equalAccess: 'complete' },
    verificationAudit: { score: 100, issues: [], critical: [], serious: [], moderate: [], minor: [] },
    axeAudit: { score: 100, totalViolations: 0, totalIncomplete: 0, incomplete: [], critical: [], serious: [], moderate: [], minor: [], passes: [] },
    secondEngineAudit: { score: 100, failViolations: 0, potentialViolations: 0, manualViolations: 0, reviewFindingCount: 0, fails: [], potentialFindings: [], manualFindings: [] },
    ...patch,
  });
  const html = await page.evaluate(() => (window as any).__modalState.pdfFixResult.accessibleHtml);
  const crypto = await import('node:crypto');
  const binding = { version: 1, algorithm: 'SHA-256', digest: crypto.createHash('sha256').update(html).digest('hex'), utf8ByteLength: Buffer.byteLength(html) };
  await page.evaluate(binding => {
    const w = window as any; const result = { ...w.__modalState.pdfFixResult, verificationHtmlBinding: binding };
    Object.defineProperty(result, '_verificationHtmlSnapshot', { value: result.accessibleHtml, enumerable: false });
    Object.defineProperty(result, '_verificationHtmlBindingDigest', { value: binding.digest, enumerable: false });
    w.__setModalState({ pdfFixResult: result });
  }, binding);
}

test('results lead with accurate static-scope verification and optional repair tools use native disclosure', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await completeResult(page, { verificationState: 'complete-for-tested-scope', verificationReasons: ['static-source-audit'] });
  const verification = page.locator('#pdf-verification-status');
  const repairs = page.locator('#pdf-additional-repairs');
  await expect(verification.getByRole('heading')).toHaveText('WCAG verification: Complete for static source');
  await expect(verification).toContainText('Review keyboard navigation and live interactions');
  await expect(page.locator('.pdf-workspace-primary')).toHaveAccessibleName('Review tested scope');
  expect(await verification.evaluate(el => !!(el.compareDocumentPosition(document.querySelector('#pdf-additional-repairs')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(repairs).not.toHaveAttribute('open');
  const summary = repairs.locator('summary'); await summary.focus(); await page.keyboard.press('Enter');
  await expect(repairs).toHaveAttribute('open', '');
  await page.keyboard.press('Tab'); await expect(repairs.getByRole('button').first()).toBeFocused();
  await summary.focus(); await page.keyboard.press('Space'); await expect(repairs).not.toHaveAttribute('open');
  await page.locator('.pdf-workspace-primary').click(); await expect(verification).toBeFocused();
  await page.evaluate(() => { const w = window as any; w.__setModalState({ pdfFixResult: { ...w.__modalState.pdfFixResult, accessibleHtml: w.__modalState.pdfFixResult.accessibleHtml + '<p>Changed after verification.</p>' } }); });
  await expect(verification.getByRole('heading')).toHaveText('WCAG verification: Partial');
  await expect(page.locator('.pdf-workspace-primary')).toHaveAccessibleName('Review verification');
  expect(errors).toEqual([]);
});

test('results next action follows incomplete checks, manual review, repair findings and preservation concerns', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await setResult(page); const primary = page.locator('.pdf-workspace-primary');
  await expect(primary).toHaveAccessibleName('Review verification');
  await primary.click(); await expect(page.locator('#pdf-verification-status')).toBeFocused();
  await completeResult(page, {
    verificationState: 'review-required',
    axeAudit: { score: 100, totalViolations: 0, totalIncomplete: 1, critical: [], serious: [], moderate: [], minor: [], incomplete: [{ id: 'color-contrast', description: 'Check the contrast against the image background.', nodes: [] }] },
  });
  await expect(primary).toHaveAccessibleName('Review findings'); await primary.click();
  await expect(page.locator('#pdf-review-findings')).toBeFocused();
  await expect(page.locator('#pdf-review-findings')).toContainText('Check the contrast against the image background.');
  await completeResult(page, { verificationState: 'review-required', verificationAudit: { score: 90, issues: [{ id: 'link-name', severity: 'serious', issue: 'Name the link' }], critical: [], serious: [], moderate: [], minor: [] } });
  await expect(primary).toHaveAccessibleName('Review repair options'); await primary.click();
  await expect(page.locator('#pdf-additional-repairs')).toHaveAttribute('open', '');
  await expect(page.locator('#pdf-additional-repairs > summary')).toBeFocused();
  await completeResult(page, { fidelityLimited: true, fidelityNotes: ['Compare the table wording with the source.'] });
  await expect(primary).toHaveAccessibleName('Review document preservation'); await primary.click();
  await expect(page.locator('#pdf-content-fidelity-review')).toBeFocused();
  await expect(page.locator('#pdf-content-fidelity-review')).toContainText('Compare the table wording with the source.');
  expect(errors).toEqual([]);
});

test('export formats use native tab order and preserve focus after forwarding a download', async ({ page }) => {
  const { errors } = await mountWorkspace(page); await setResult(page);
  await page.evaluate(() => (window as any).__setModalState({ pendingPdfFile: { name: 'sample.pdf', type: 'application/pdf', size: 100 } }));
  await page.getByTestId('pdf-workspace-header').getByRole('button', { name: 'Downloads', exact: true }).click();
  const formats = page.getByRole('group', { name: 'Export formats', exact: true });
  await expect(formats).toBeVisible(); await expect(formats.getByRole('menuitem')).toHaveCount(0);
  await expect(formats.getByRole('button', { name: /Tagged PDF/ })).toHaveText(/Tagged PDF \(\.pdf\)/);
  await page.keyboard.press('Tab'); await expect(formats.getByRole('button', { name: /Tagged PDF/ })).toBeFocused();
  await page.keyboard.press('Tab'); const word = formats.getByRole('button', { name: /Word/ }); await expect(word).toBeFocused();
  await page.evaluate(() => {
    const w = window as any; w.__forwardedWordExports = 0;
    document.querySelector('#allo-export-docx')!.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); w.__forwardedWordExports++; }, true);
  });
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => (window as any).__forwardedWordExports)).toBe(1);
  await expect(word).toBeFocused(); await expect(formats).toBeVisible();
  expect(errors).toEqual([]);
});

async function enableReviewCommits(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__rejectReviewCommits = false;
    w.__setModalState({
      capturePdfHtmlCommitToken: () => ({ documentEpoch: w.__modalState.pdfDocumentEpoch, revision: 0, html: w.__modalState.pdfFixResult?.accessibleHtml }),
      commitPdfFixResultIfCurrent: (token: any, update: any) => {
        const state = w.__modalState;
        if (w.__rejectReviewCommits || !token || token.documentEpoch !== state.pdfDocumentEpoch || token.html !== state.pdfFixResult?.accessibleHtml) return false;
        w.__setModalState({ pdfFixResult: update(state.pdfFixResult) });
        return true;
      },
    });
  });
}

test('human review keeps focus, supports individual undo and preserves verification evidence', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await completeResult(page, { verificationState: 'review-required', axeAudit: {
    score: 100, totalViolations: 0, totalIncomplete: 2, critical: [], serious: [], moderate: [], minor: [], passes: [],
    incomplete: [
      { id: 'color-contrast', description: 'Check text against the image background.', nodes: [] },
      { id: 'link-in-text-block', description: 'Check that the link is distinguishable without color.', nodes: [] },
    ],
  } });
  await enableReviewCommits(page);
  await page.locator('.pdf-workspace-primary').click();
  const queue = page.locator('#pdf-review-findings');
  const mark = (id: string) => queue.locator('[data-review-action="mark"][data-review-key="axe|incomplete|' + id + '"]');
  const before = await page.evaluate(() => (window as any).__modalState.pdfFixResult.accessibleHtml);
  await mark('color-contrast').click();
  await expect(mark('link-in-text-block')).toBeFocused();
  await expect(queue).toContainText('1 pending');
  await queue.locator('.pdf-workspace-reviewed > summary').click();
  await queue.locator('[data-review-action="undo"][data-review-key="axe|incomplete|color-contrast"]').click();
  await expect(mark('color-contrast')).toBeFocused();
  await expect(queue).toContainText('2 pending');
  await mark('color-contrast').click(); await mark('link-in-text-block').click();
  await expect(queue.locator('[data-review-completion]')).toBeFocused();
  await expect(queue).toContainText('0 pending');
  await expect(page.locator('#pdf-verification-status').getByRole('heading')).toHaveText('WCAG verification: Human review required');
  expect(await page.evaluate(() => {
    const w = window as any; const result = w.__modalState.pdfFixResult;
    return { html: result.accessibleHtml, live: w.__modalState._docPipeline.isLiveVerificationHtmlBound(result), reviewed: Object.keys(result.reviewedFindings || {}).length };
  })).toEqual({ html: before, live: true, reviewed: 2 });
  const reviewed = queue.locator('.pdf-workspace-reviewed');
  if (await reviewed.getAttribute('open') === null) await reviewed.locator('summary').click();
  await queue.locator('[data-review-action="reset"]').click();
  await expect(mark('color-contrast')).toBeFocused();
  await page.evaluate(() => { (window as any).__rejectReviewCommits = true; });
  await mark('color-contrast').click();
  await expect(mark('color-contrast')).toBeFocused(); await expect(queue).toContainText('2 pending');
  expect(await page.evaluate(() => Object.keys((window as any).__modalState.pdfFixResult.reviewedFindings || {}).length)).toBe(0);
  await queue.locator('[data-review-action="workbench"][data-review-key="axe|incomplete|color-contrast"]').click();
  await expect(page.locator('#allo-sec-workbench')).toHaveAttribute('open', '');
  await expect(page.locator('#allo-sec-workbench > summary')).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Expert remediation command', exact: true })).toHaveValue(/Check text against the image background/);
  expect(errors).toEqual([]);
});

test('changed documents explain why previous engine results are not current', async ({ page }) => {
  const { errors } = await mountWorkspace(page);
  await completeResult(page);
  await page.evaluate(() => {
    const w = window as any; const result = w.__modalState.pdfFixResult;
    w.__setModalState({ pdfFixResult: { ...result, accessibleHtml: result.accessibleHtml.replace('Read the passage', 'Read the updated passage') } });
  });
  const card = page.locator('#pdf-verification-status');
  await expect(card.getByRole('heading')).toHaveText('WCAG verification: Partial');
  await card.getByText('Why this status?', { exact: true }).click();
  await expect(card).toContainText('Run verification again');
  await expect(card).not.toContainText('verification-html-binding-missing-or-stale');
  const engines = card.getByTestId('pdf-verification-engine-list');
  await expect(engines.locator('[data-verification-freshness="unconfirmed"]')).toHaveCount(3);
  await expect(page.locator('.pdf-workspace-primary')).toHaveAccessibleName('Review verification');
  expect(errors).toEqual([]);
});