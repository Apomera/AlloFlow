# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> saved-batch discard excludes resume and intake until storage responds
- Location: tests\e2e\remediation_continuity.spec.ts:313:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-help-key="pdf_audit_view_batch_resume_discard_btn"]')

```

# Page snapshot

```yaml
- dialog "PDF Accessibility Audit" [active] [ref=e1]:
  - button "Open pipeline diagnostics log" [ref=e2] [cursor=pointer]:
    - generic [ref=e3]: 🔧
    - generic [ref=e4]: Log
  - generic [ref=e5]:
    - banner [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - paragraph [ref=e9]:
            - text: Document accessibility
            - generic [ref=e10]: / Batch of files
          - heading "Batch workspace" [level=2] [ref=e11]
        - generic [ref=e12]:
          - button "Toggle color theme" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: ☀️
          - button "Close audit modal" [ref=e15] [cursor=pointer]:
            - generic [ref=e16]: ×
      - list "Remediation stages; audit and fix steps may repeat" [ref=e17]:
        - listitem [ref=e18]:
          - generic [ref=e19]: "1"
          - generic [ref=e20]: Select
        - listitem [ref=e21]:
          - generic [ref=e22]: "2"
          - generic [ref=e23]: Audit
        - listitem [ref=e24]:
          - generic [ref=e25]: "3"
          - generic [ref=e26]: Remediate
        - listitem [ref=e27]:
          - generic [ref=e28]: "4"
          - generic [ref=e29]: Verify
        - listitem [ref=e30]:
          - generic [ref=e31]: "5"
          - generic [ref=e32]: Review & download
      - generic [ref=e34]:
        - status [ref=e35]: Build your batch
        - paragraph [ref=e36]: Add files or a folder, then start remediation. Completed files stay in the queue.
    - generic [ref=e37]:
      - group "Source to remediate" [ref=e38]:
        - button "Single document PDF, Office or media" [ref=e39] [cursor=pointer]:
          - strong [ref=e40]: Single document
          - generic [ref=e41]: PDF, Office or media
        - button "Batch of files Files or a folder" [pressed] [ref=e42] [cursor=pointer]:
          - strong [ref=e43]: ✓ Batch of files
          - generic [ref=e44]: Files or a folder
        - button "Website / HTML Static source audit" [ref=e45] [cursor=pointer]:
          - strong [ref=e46]: Website / HTML
          - generic [ref=e47]: Static source audit
      - generic [ref=e48]:
        - heading "📂 Batch Document & Image Remediation" [level=3] [ref=e49]
        - generic [ref=e50] [cursor=pointer]:
          - generic [ref=e51]: 📥
          - paragraph [ref=e52]: Drag & drop PDFs, Word, PowerPoint, Markdown, CSV, Excel, PNG, JPEG, or WebP files here
          - paragraph [ref=e53]: or click to browse
          - generic [ref=e54]: Browse Files
        - generic [ref=e56]:
          - generic [ref=e57]: 📋
          - generic [ref=e58]:
            - heading "Previous batch interrupted" [level=4] [ref=e59]
            - paragraph [ref=e60]: 1/2 file(s) completed before the tab closed. 1 remaining.
            - paragraph [ref=e61]: "Files: saved-done.docx, saved-pending.docx"
            - generic [ref=e62]:
              - button "▶ Resume Batch" [ref=e63] [cursor=pointer]
              - button "Discard" [ref=e64] [cursor=pointer]
      - generic [ref=e65]:
        - generic "Open a .alloflow.json project file (AlloFlow saves one to your Downloads after each remediation) — your document, scores, history, and settings all come back." [ref=e66] [cursor=pointer]: 📂 Continue a previous session
        - button "Cancel" [ref=e67] [cursor=pointer]
```

# Test source

```ts
  225 |         { id: 'selected', fileName: 'selected.docx', fileSize: 100, status: 'failed', error: 'Original failure' },
  226 |         { id: 'other', fileName: 'other.docx', fileSize: 100, status: 'failed', error: 'Keep this failure' },
  227 |       ],
  228 |       addToast: (...args: any[]) => w.__batchToasts.push(args),
  229 |       runPdfBatchRemediation: (options: any) => {
  230 |         w.__batchCalls.push(options);
  231 |         return new Promise((_resolve, reject) => { w.__rejectBatch = () => reject(new Error('engine failed to load')); });
  232 |       },
  233 |     });
  234 |   });
  235 | }
  236 | 
  237 | test('a delayed single-file retry preserves the queue and blocks reset, close and duplicate retries', async ({ page }) => {
  238 |   const { dialog, errors } = await mountWorkspace(page);
  239 |   await setRetryBatch(page);
  240 |   await page.getByRole('button', { name: 'Retry selected.docx', exact: true }).click();
  241 |   await expect(page.getByRole('button', { name: 'Retry selected.docx', exact: true })).toBeDisabled();
  242 |   await expect(page.locator('[data-help-key="pdf_audit_view_batch_new_batch_btn"]')).toBeDisabled();
  243 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  244 |   await dialog.focus(); await page.keyboard.press('Escape');
  245 |   const options = await page.evaluate(() => (window as any).__batchCalls);
  246 |   expect(options).toHaveLength(1);
  247 |   expect(options[0]).toMatchObject({ resumeBatchId: 'saved-batch', retryFileIds: ['selected'], resumeSettings: { pdfTargetScore: 88 } });
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
> 325 |   await page.locator('[data-help-key="pdf_audit_view_batch_resume_discard_btn"]').click();
      |                                                                                   ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
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
  348 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
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