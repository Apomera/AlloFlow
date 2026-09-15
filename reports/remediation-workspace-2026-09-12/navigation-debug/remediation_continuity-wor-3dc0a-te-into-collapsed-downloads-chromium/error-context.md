# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> workspace results preserve the mounted owner and navigate into collapsed downloads
- Location: tests\e2e\remediation_continuity.spec.ts:131:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: getByTestId('pdf-workspace-header').getByRole('status')
Expected: "Needs review"
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for getByTestId('pdf-workspace-header').getByRole('status')

```

# Test source

```ts
  35  |       safeCloseAudit: () => w.__modalCloses++, _closePdfAuditModal: () => w.__modalCloses++,
  36  |       isPdfDocumentIntakeCurrent: (epoch: number) => epoch === 4,
  37  |       capturePdfDocumentIntakeEpoch: () => 4, _docPipeline: Object.assign({}, w.AlloModules.createDocPipeline, { isRemediationRunning: () => !!w.__pipelineActive }),
  38  |       pdfBatchQueue: [], pdfRunHistory: [], agentActivityLog: [], extractedImagesList: [], liveChunkStream: [],
  39  |       insertBlockRecent: [], insertBlockOpenCats: {}, liveChunkExpanded: {}, liveChunkRejected: {},
  40  |       remediationReady: true, auditReady: true,
  41  |     });
  42  |     function Harness() {
  43  |       const [state, setState] = w.React.useState(initial);
  44  |       w.__setModalState = (patch: any) => setState((s: any) => ({ ...s, ...patch }));
  45  |       const setters = w.React.useMemo(() => {
  46  |       const setters: any = {};
  47  |       for (const name of names.filter(name => /^set[A-Z]/.test(name))) {
  48  |         const key = name[3].toLowerCase() + name.slice(4);
  49  |         setters[name] = (value: any) => setState((s: any) => ({ ...s, [key]: typeof value === 'function' ? value(s[key]) : value }));
  50  |       }
  51  |       return setters;
  52  |       }, []);
  53  |       return w.React.createElement(w.AlloModules.PdfAuditView, { ...state, ...setters });
  54  |     }
  55  |     w.ReactDOM.createRoot(document.getElementById('root')).render(w.React.createElement(Harness));
  56  |   }, names);
  57  |   const dialog = page.getByRole('dialog', { name: 'PDF Accessibility Audit', exact: true });
  58  |   await expect(dialog, errors.join('\n')).toBeVisible();
  59  |   return { dialog, errors };
  60  | }
  61  | 
  62  | test('modal retains active runs across manual, review, auto, batch and focused modes', async ({ page }) => {
  63  |   const { dialog, errors } = await mountWorkspace(page);
  64  |   for (const mode of ['auto', 'review', 'expert', 'batch', 'focused']) {
  65  |     await page.evaluate(mode => (window as any).__setModalState({
  66  |       pdfFixMode: mode === 'batch' || mode === 'focused' ? 'auto' : mode,
  67  |       pdfBatchMode: mode === 'batch' || mode === 'focused', _remediationMode: mode === 'focused',
  68  |       pdfFixLoading: mode !== 'batch' && mode !== 'focused', pdfBatchProcessing: mode === 'batch' || mode === 'focused',
  69  |     }), mode);
  70  |     await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  71  |     await dialog.focus(); await page.keyboard.press('Escape');
  72  |     await expect(dialog).toBeVisible();
  73  |     expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(0);
  74  |     expect(await page.evaluate(() => (window as any).__escapedToHost)).toBe(0);
  75  |   }
  76  |   await page.evaluate(() => (window as any).__setModalState({ pdfBatchMode: false, _remediationMode: false, pdfFixLoading: false, pdfBatchProcessing: false }));
  77  |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeEnabled();
  78  |   await page.locator('[data-help-key="pdf_audit_view_close_btn"]').click();
  79  |   expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(1);
  80  |   expect(errors).toEqual([]);
  81  | });
  82  | 
  83  | const SHOTS = path.join(ROOT, 'reports/remediation-workspace-2026-09-12');
  84  | async function setResult(page: Page, patch: any = {}) {
  85  |   await page.evaluate(patch => {
  86  |     const w = window as any;
  87  |     w.__setModalState({
  88  |       pdfAuditResult: { fileName: 'classroom-handout.docx', fileSize: 100, pageCount: 3, score: 78, critical: [], serious: [], moderate: [], minor: [] },
  89  |       pdfFixResult: {
  90  |         accessibleHtml: '<!doctype html><html lang="en"><head><title>Classroom handout</title></head><body><main><h1>Classroom handout</h1><p>Read the passage and discuss.</p></main></body></html>',
  91  |         originalText: 'Classroom handout Read the passage and discuss.',
  92  |         beforeScore: 78, afterScore: 99, verificationState: 'partial', verificationCoverage: { ai: 'unavailable', axe: 'complete', equalAccess: 'unavailable' },
  93  |         verificationReasons: ['ai-incomplete'], _aiVerificationIncomplete: true,
  94  |         axeAudit: { score: 100, totalViolations: 0, critical: [], serious: [], moderate: [], minor: [], incomplete: [], passes: [] },
  95  |         changes: [], fidelityNotes: [], integrityCoverage: 100,
  96  |         ...patch,
  97  |       },
  98  |       pdfFixMode: 'auto', pdfAuditTab: 'results', pdfFixLoading: false, pdfAutoContinueRunning: false,
  99  |       pdfBatchMode: false, pdfWebMode: false,
  100 |     });
  101 |   }, patch);
  102 | }
  103 | 
  104 | test('workspace source and after-remediation controls use native keyboard behavior and stay locked during a run', async ({ page }) => {
  105 |   const { errors } = await mountWorkspace(page);
  106 |   const sources = page.getByRole('group', { name: 'Source to remediate' });
  107 |   await expect(sources.getByRole('button', { name: /Single document/ })).toHaveAttribute('aria-pressed', 'true');
  108 |   const manual = page.locator('[data-help-key="pdf_workspace_manual"]');
  109 |   await expect(manual).not.toHaveAttribute('open');
  110 |   await manual.locator('summary').click();
  111 |   const mode = page.getByRole('combobox', { name: /After remediation/ });
  112 |   for (const value of ['review', 'expert', 'auto']) {
  113 |     await mode.selectOption(value); await expect(mode).toHaveValue(value);
  114 |   }
  115 |   // Same-tick owner guard: a pipeline can become active before the render's busy flag.
  116 |   await page.evaluate(() => {
  117 |     (window as any).__pipelineActive = true;
  118 |     (document.querySelector('[data-help-key="pdf_audit_view_mode_batch_btn"]') as HTMLButtonElement).click();
  119 |   });
  120 |   await expect(sources.getByRole('button', { name: /Single document/ })).toHaveAttribute('aria-pressed', 'true');
  121 |   await page.evaluate(() => { (window as any).__pipelineActive = false; (window as any).__setModalState({ pdfFixLoading: true }); });
  122 |   await expect(mode).toBeDisabled();
  123 |   await expect(sources.getByRole('button', { name: /Batch of files/ })).toBeDisabled();
  124 |   await page.evaluate(() => (window as any).__setModalState({ pdfFixLoading: false }));
  125 |   await sources.getByRole('button', { name: /Website/ }).click();
  126 |   await expect(page.getByLabel('Website URL to audit')).toBeVisible();
  127 |   await expect(sources.getByRole('button', { name: /Website/ })).toHaveAttribute('aria-pressed', 'true');
  128 |   expect(errors).toEqual([]);
  129 | });
  130 | 
  131 | test('workspace results preserve the mounted owner and navigate into collapsed downloads', async ({ page }) => {
  132 |   const { errors } = await mountWorkspace(page);
  133 |   await setResult(page);
  134 |   const header = page.getByTestId('pdf-workspace-header');
> 135 |   await expect(header.getByRole('status')).toHaveText('Needs review');
      |                                            ^ Error: expect(locator).toHaveText(expected) failed
  136 |   await expect(page.getByText(/Anything flagged below is optional polish/)).toHaveCount(0);
  137 |   await page.evaluate(() => { (window as any).__originalDialog = document.querySelector('[data-help-key="pdf_audit_view_panel"]'); });
  138 |   const formats = page.locator('[data-help-key="pdf_audit_alt_formats_summary"]');
  139 |   await expect(formats).not.toHaveAttribute('open');
  140 |   await header.getByRole('button', { name: 'Downloads', exact: true }).click();
  141 |   await expect(formats).toHaveAttribute('open', '');
  142 |   await expect(page.locator('#allo-sec-downloads')).toBeFocused();
  143 |   expect(await page.evaluate(() => (window as any).__originalDialog === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  144 |   const headerBox = await header.boundingBox(); const targetBox = await page.locator('#allo-sec-downloads').boundingBox();
  145 |   expect(targetBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  146 |   await header.getByRole('button', { name: 'Advanced tools', exact: true }).click();
  147 |   await expect(page.locator('#allo-sec-workbench')).toHaveAttribute('open', '');
  148 |   await expect(page.locator('#allo-sec-workbench > summary')).toBeFocused();
  149 |   await page.evaluate(() => (window as any).__setModalState({ pdfAuditTab: 'original' }));
  150 |   await header.getByRole('button', { name: 'Verification & review' }).click();
  151 |   await expect(page.locator('[data-help-key="pdf_audit_verification_status"]')).toBeFocused();
  152 |   await page.evaluate(() => (window as any).__setModalState({ pdfFixLoading: true }));
  153 |   await expect(header.getByRole('status')).toHaveText('Remediation in progress');
  154 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  155 |   expect(await page.evaluate(() => (window as any).__originalDialog === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  156 |   expect(errors).toEqual([]);
  157 | });
  158 | 
  159 | for (const layout of [{ width: 1280, theme: 'light' }, { width: 320, theme: 'light' }, { width: 390, theme: 'dark' }, { width: 320, theme: 'contrast' }]) {
  160 |   test(`workspace layout ${layout.width}px ${layout.theme}`, async ({ page }) => {
  161 |     await page.setViewportSize({ width: layout.width, height: 900 });
  162 |     const { errors } = await mountWorkspace(page);
  163 |     await page.evaluate(theme => (window as any).__setModalState({ theme }), layout.theme);
  164 |     const shell = page.locator('.pdf-workspace-shell');
  165 |     const checkWidth = async () => expect(await shell.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  166 |     await checkWidth();
  167 |     fs.mkdirSync(SHOTS, { recursive: true });
  168 |     await page.screenshot({ path: path.join(SHOTS, `intake-${layout.width}-${layout.theme}.png`) });
  169 |     await setResult(page);
  170 |     await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Needs review');
  171 |     await checkWidth();
  172 |     await page.screenshot({ path: path.join(SHOTS, `results-${layout.width}-${layout.theme}.png`) });
  173 |     expect(errors).toEqual([]);
  174 |   });
  175 | }
  176 | 
  177 | test('batch rows distinguish processed from verified and keep failed files available for retry', async ({ page }) => {
  178 |   const { errors } = await mountWorkspace(page);
  179 |   await page.evaluate(() => (window as any).__setModalState({
  180 |     pdfBatchMode: true, pdfBatchSummary: { status: 'complete', total: 3, done: 2, failed: 1, reviewRequired: 1, pending: 0, results: [] },
  181 |     pdfBatchQueue: [
  182 |       { id: 'one', fileName: 'verified.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'complete', fullyVerifiedSuccess: true } },
  183 |       { id: 'two', fileName: 'needs-review.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'partial' } },
  184 |       { id: 'three', fileName: 'retry.docx', fileSize: 100, status: 'failed' },
  185 |     ],
  186 |   }));
  187 |   const rows = page.locator('.pdf-workspace-batch-row');
  188 |   await expect(rows).toHaveCount(3);
  189 |   await expect(rows.nth(0)).toContainText('Processed');
  190 |   await expect(rows.nth(0)).toContainText('Verification complete');
  191 |   await expect(rows.nth(1)).toContainText('Verification partial');
  192 |   await expect(rows.nth(2).getByRole('button', { name: 'Retry retry.docx' })).toBeVisible();
  193 |   await page.screenshot({ path: path.join(SHOTS, 'batch-results-1280.png') });
  194 |   expect(errors).toEqual([]);
  195 | });
  196 | 
```