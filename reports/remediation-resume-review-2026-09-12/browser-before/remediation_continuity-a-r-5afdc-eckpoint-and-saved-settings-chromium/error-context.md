# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> a rejected saved-batch resume retains its checkpoint and saved settings
- Location: tests\e2e\remediation_continuity.spec.ts:336:5

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator:  locator('[data-help-key="pdf_audit_view_close_btn"]')
Expected: disabled
Received: enabled
Timeout:  15000ms

Call log:
  - Expect "toBeDisabled" with timeout 15000ms
  - waiting for locator('[data-help-key="pdf_audit_view_close_btn"]')
    33 × locator resolved to <button type="button" title="Close (Esc)" aria-label="Close audit modal" data-help-key="pdf_audit_view_close_btn" class="pointer-events-auto w-9 h-9 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-full shadow-md border border-slate-400 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-600">…</button>
       - unexpected value "enabled"

```

```yaml
- button "Close audit modal"
```

# Test source

```ts
  248 |   expect(options[0].resumeQueue.map((item: any) => item.status)).toEqual(['done', 'pending', 'failed']);
  249 |   await page.evaluate(() => (window as any).__rejectBatch());
  250 |   await expect(page.getByRole('button', { name: 'Retry selected.docx', exact: true })).toBeEnabled();
  251 |   const state = await page.evaluate(() => ({ queue: (window as any).__modalState.pdfBatchQueue, toasts: (window as any).__batchToasts, closes: (window as any).__modalCloses }));
  252 |   expect(state.queue.map((item: any) => item.status)).toEqual(['done', 'failed', 'failed']);
  253 |   expect(state.queue[0].result.accessibleHtml).toBe('<main>Saved work</main>');
  254 |   expect(state.queue[1].error).toBe('Original failure');
  255 |   expect(state.toasts[0][0]).toContain('engine failed to load');
  256 |   expect(state.closes).toBe(0);
  257 |   expect(errors).toEqual([]);
  258 | });
  259 | 
  260 | test('an unavailable remediation engine leaves failed batch files ready for a later retry', async ({ page }) => {
  261 |   const { errors } = await mountWorkspace(page);
  262 |   await setRetryBatch(page);
  263 |   await page.evaluate(() => (window as any).__setModalState({ remediationReady: false }));
  264 |   await expect(page.getByRole('button', { name: 'Retry selected.docx', exact: true })).toBeDisabled();
  265 |   await expect(page.locator('[data-help-key="pdf_audit_view_batch_retry_all_failed_btn"]')).toBeDisabled();
  266 |   const state = await page.evaluate(() => ({ queue: (window as any).__modalState.pdfBatchQueue, calls: (window as any).__batchCalls }));
  267 |   expect(state.queue[1]).toMatchObject({ status: 'failed', error: 'Original failure' });
  268 |   expect(state.calls).toEqual([]);
  269 |   expect(errors).toEqual([]);
  270 | });
  271 | 
  272 | test('finishing an old checkpoint discard cannot clear a newer document queue', async ({ page }) => {
  273 |   const { errors } = await mountWorkspace(page);
  274 |   await setRetryBatch(page);
  275 |   await page.evaluate(() => {
  276 |     const w = window as any; w.__intakeEpoch = 4;
  277 |     w.__setModalState({
  278 |       pdfBatchSummary: { batchId: 'old-batch', status: 'stopped', total: 3, processed: 1, failed: 2, pending: 0, results: [] },
  279 |       capturePdfDocumentIntakeEpoch: () => w.__intakeEpoch,
  280 |       isPdfDocumentIntakeCurrent: (epoch: number) => epoch === w.__intakeEpoch,
  281 |       _docPipeline: Object.assign({}, w.AlloModules.createDocPipeline, {
  282 |         isRemediationRunning: () => false,
  283 |         discardResumableBatch: (id: string) => { w.__discardedBatchId = id; return new Promise(resolve => { w.__resolveDiscard = () => resolve(true); }); },
  284 |       }),
  285 |     });
  286 |   });
  287 |   await page.locator('[data-help-key="pdf_audit_view_batch_new_batch_btn"]').click();
  288 |   await expect(page.locator('[data-help-key="pdf_audit_view_batch_new_batch_btn"]')).toBeDisabled();
  289 |   await expect(page.getByRole('button', { name: 'Retry selected.docx', exact: true })).toBeDisabled();
  290 |   await page.evaluate(() => {
  291 |     const w = window as any; w.__intakeEpoch = 5;
  292 |     w.__setModalState({ pdfDocumentEpoch: 5, pdfBatchSummary: null,
  293 |       pdfBatchQueue: [{ id: 'new', fileName: 'new.docx', fileSize: 100, status: 'pending' }] });
  294 |   });
  295 |   await expect(page.locator('[data-help-key="pdf_audit_view_batch_clear_all_btn"]')).toBeDisabled();
  296 |   await expect(page.getByRole('button', { name: 'Remove new.docx', exact: true })).toBeDisabled();
  297 |   await page.evaluate(() => (window as any).__resolveDiscard());
  298 |   await expect(page.getByRole('button', { name: 'Remove new.docx', exact: true })).toBeEnabled();
  299 |   await expect(page.locator('.pdf-workspace-batch-row')).toContainText('new.docx');
  300 |   expect(await page.evaluate(() => (window as any).__discardedBatchId)).toBe('old-batch');
  301 |   expect(errors).toEqual([]);
  302 | });
  303 | 
  304 | 
  305 | const savedBatchFixture = {
  306 |   batchId: 'saved-resume', _doneCount: 1, _incompleteCount: 1, settings: { pdfTargetScore: 87 },
  307 |   files: [
  308 |     { id: 'done', fileName: 'saved-done.docx', fileSize: 100, status: 'done', result: { accessibleHtml: '<main>Saved work</main>' } },
  309 |     { id: 'pending', fileName: 'saved-pending.docx', fileSize: 100, status: 'processing', base64: 'pending-document' },
  310 |   ],
  311 | };
  312 | 
  313 | test('saved-batch discard excludes resume and intake until storage responds', async ({ page }) => {
  314 |   const { errors } = await mountWorkspace(page, savedBatchFixture);
  315 |   await page.evaluate(() => {
  316 |     const w = window as any; w.__savedBatchCalls = [];
  317 |     w.__setModalState({ pdfBatchMode: true,
  318 |       runPdfBatchRemediation: (options: any) => w.__savedBatchCalls.push(options),
  319 |       _docPipeline: Object.assign({}, w.AlloModules.createDocPipeline, {
  320 |         isRemediationRunning: () => false,
  321 |         discardResumableBatch: (id: string) => { w.__discardedId = id; return new Promise(resolve => { w.__finishDiscard = () => resolve(false); }); },
  322 |       }),
  323 |     });
  324 |   });
  325 |   await page.locator('[data-help-key="pdf_audit_view_batch_resume_discard_btn"]').click();
  326 |   await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toBeDisabled();
  327 |   await expect(page.locator('#batch-pdf-input')).toBeDisabled();
  328 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  329 |   await page.evaluate(() => (window as any).__finishDiscard());
  330 |   await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toBeEnabled();
  331 |   expect(await page.evaluate(() => (window as any).__discardedId)).toBe('saved-resume');
  332 |   expect(await page.evaluate(() => (window as any).__savedBatchCalls)).toEqual([]);
  333 |   expect(errors).toEqual([]);
  334 | });
  335 | 
  336 | test('a rejected saved-batch resume retains its checkpoint and saved settings', async ({ page }) => {
  337 |   const { errors } = await mountWorkspace(page, savedBatchFixture);
  338 |   await page.evaluate(() => {
  339 |     const w = window as any; w.__savedBatchCalls = [];
  340 |     w.__setModalState({ pdfBatchMode: true,
  341 |       runPdfBatchRemediation: (options: any) => {
  342 |         w.__savedBatchCalls.push(options);
  343 |         return new Promise((_resolve, reject) => { w.__failResume = () => reject(new Error('storage failed to initialize')); });
  344 |       },
  345 |     });
  346 |   });
  347 |   await page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]').click();
> 348 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
      |                                                                            ^ Error: expect(locator).toBeDisabled() failed
  349 |   await expect(page.locator('#batch-pdf-input')).toBeDisabled();
  350 |   await page.evaluate(() => (window as any).__failResume());
  351 |   await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toBeEnabled();
  352 |   const calls = await page.evaluate(() => (window as any).__savedBatchCalls);
  353 |   expect(calls).toHaveLength(1);
  354 |   expect(calls[0]).toMatchObject({ resumeBatchId: 'saved-resume', resumeSettings: { pdfTargetScore: 87 } });
  355 |   expect(calls[0].resumeQueue.map((item: any) => item.status)).toEqual(['done', 'pending']);
  356 |   expect(calls[0].resumeQueue[0].result.accessibleHtml).toBe('<main>Saved work</main>');
  357 |   expect(errors).toEqual([]);
  358 | });
  359 | 
```