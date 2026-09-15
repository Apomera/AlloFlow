# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> batch queue controls and details fit 320px contrast
- Location: tests\e2e\remediation_continuity.spec.ts:431:7

# Error details

```
Error: {"overflow":[{"tag":"BUTTON","classes":"px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2","text":"📊 Dashboard","right":310.21875}],"shell":{"width":320,"client":301,"scroll":308,"html":"rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors\">New Batch</button><button data-help-key=\"pdf_audit_view_batch_dashboard_btn\" class=\"px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2\">📊 Dashboard</button></div></div><div class=\"flex items-center gap-2 mt-3 pt-3 border-t border-slate-100\"><label class=\"flex-1 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-amber-200\" title=\"Open a .alloflow.json project file (AlloFlow saves one to your Downloads after each remediation) — your document, scores, history, and settings all come back.\">📂 Continue a previous session<input type=\"file\" accept=\".json\" class=\"hidden\"></label><button class=\"text-xs text-slate-600 hover:text-slate-900 font-bold\">Cancel</button></div></div>"}}

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    7
```

# Page snapshot

```yaml
- dialog "PDF Accessibility Audit" [ref=e1]:
  - button "Open pipeline diagnostics log" [ref=e2] [cursor=pointer]:
    - generic [ref=e3]: 🔧
    - generic [ref=e4]: Log
  - generic [ref=e5]:
    - banner [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]:
          - paragraph [ref=e9]: Document accessibility
          - heading "Batch workspace" [level=2] [ref=e10]
        - generic [ref=e11]:
          - button "Toggle color theme" [ref=e12] [cursor=pointer]:
            - generic [ref=e13]: 👁
          - button "Close audit modal" [ref=e14] [cursor=pointer]:
            - generic [ref=e15]: ×
      - list "Remediation stages; audit and fix steps may repeat" [ref=e16]:
        - listitem [ref=e17]:
          - generic [ref=e18]: "1"
        - listitem [ref=e19]:
          - generic [ref=e20]: "2"
        - listitem [ref=e21]:
          - generic [ref=e22]: "3"
        - listitem [ref=e23]:
          - generic [ref=e24]: "4"
        - listitem [ref=e25]:
          - generic [ref=e26]: "5"
          - generic [ref=e27]: Review & download
      - generic [ref=e28]:
        - generic [ref=e29]:
          - status [ref=e30]: Batch processed
          - paragraph [ref=e31]: 1 / 3 processed · 2 failed. Processing status and verification are shown separately below.
        - button "View batch results" [ref=e32] [cursor=pointer]: View batch results →
    - generic [ref=e33]:
      - group "Source to remediate" [ref=e34]:
        - button "Single document PDF, Office or media" [ref=e35] [cursor=pointer]:
          - strong [ref=e36]: Single document
          - generic [ref=e37]: PDF, Office or media
        - button "Batch of files Files or a folder" [pressed] [ref=e38] [cursor=pointer]:
          - strong [ref=e39]: ✓ Batch of files
          - generic [ref=e40]: Files or a folder
        - button "Website / HTML Static source audit" [ref=e41] [cursor=pointer]:
          - strong [ref=e42]: Website / HTML
          - generic [ref=e43]: Static source audit
      - generic [ref=e44]:
        - heading "📂 Batch Document & Image Remediation" [level=3] [ref=e45]
        - generic [ref=e46]:
          - generic [ref=e48]: 3 files in this batch
          - group "Filter batch files" [ref=e49]:
            - button "All files (3)" [ref=e50] [cursor=pointer]:
              - text: All files
              - generic [ref=e51]: (3)
            - button "Unfinished (0)" [ref=e52] [cursor=pointer]:
              - text: Unfinished
              - generic [ref=e53]: (0)
            - button "Failed (2)" [pressed] [ref=e54] [cursor=pointer]:
              - text: Failed
              - generic [ref=e55]: (2)
            - button "Needs review (1)" [ref=e56] [cursor=pointer]:
              - text: Needs review
              - generic [ref=e57]: (1)
            - button "Processed (1)" [ref=e58] [cursor=pointer]:
              - text: Processed
              - generic [ref=e59]: (1)
          - generic [ref=e60]:
            - generic [ref=e61]:
              - generic [ref=e62]: ❌
              - generic [ref=e63]: selected.docx
              - strong [ref=e65]: Failed
              - generic [ref=e66]: 0.0MB
              - button "Retry selected.docx" [ref=e67] [cursor=pointer]: Retry
              - group [ref=e68]:
                - generic "Failure details" [active] [ref=e69] [cursor=pointer]
                - paragraph [ref=e70]: Something went wrong.
                - paragraph [ref=e71]: "Details: Cannot process <script>unsafe()</script> long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-long-detail-"
            - generic [ref=e72]:
              - generic [ref=e73]: ❌
              - generic [ref=e74]: other.docx
              - strong [ref=e76]: Failed
              - generic [ref=e77]: 0.0MB
              - button "Retry other.docx" [ref=e78] [cursor=pointer]: Retry
              - group [ref=e79]:
                - generic "Failure details" [ref=e80] [cursor=pointer]
        - generic [ref=e81]:
          - heading "⚠ Batch Processing Complete" [level=4] [ref=e82]
          - generic [ref=e83]:
            - generic [ref=e84]:
              - generic [ref=e85]: 1/3
              - generic [ref=e86]: Processed
            - generic [ref=e87]:
              - generic [ref=e88]: "0"
              - generic [ref=e89]: Pending
            - generic [ref=e91]: Fully verified
            - generic [ref=e92]:
              - generic [ref=e93]: "0"
              - generic [ref=e94]: Need review
            - generic [ref=e95]:
              - generic [ref=e96]: "0"
              - generic [ref=e97]: Verified at 90+
          - generic [ref=e98]:
            - paragraph [ref=e99]: "📈 Numeric-score average: Unknown → Unknown (n/a average change)"
            - paragraph [ref=e100]: ❌ 2 failed
            - paragraph [ref=e101]: "⏱️ Total time: NaNm NaNs"
          - button "↻ Retry all failed (2)" [ref=e102] [cursor=pointer]
        - generic [ref=e103]:
          - button "📥 Download All (ZIP)" [ref=e104] [cursor=pointer]
          - button "New Batch" [ref=e105] [cursor=pointer]
          - button "📊 Dashboard" [ref=e106] [cursor=pointer]
      - generic [ref=e107]:
        - generic "Open a .alloflow.json project file (AlloFlow saves one to your Downloads after each remediation) — your document, scores, history, and settings all come back." [ref=e108] [cursor=pointer]: 📂 Continue a previous session
        - button "Cancel" [ref=e109] [cursor=pointer]
```

# Test source

```ts
  347 |     });
  348 |   });
  349 |   await page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]').click();
  350 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  351 |   await expect(page.locator('#batch-pdf-input')).toBeDisabled();
  352 |   await page.evaluate(() => (window as any).__failResume());
  353 |   await expect(page.locator('[data-help-key="pdf_audit_view_batch_resume_btn"]')).toBeEnabled();
  354 |   const calls = await page.evaluate(() => (window as any).__savedBatchCalls);
  355 |   expect(calls).toHaveLength(1);
  356 |   expect(calls[0]).toMatchObject({ resumeBatchId: 'saved-resume', resumeSettings: { pdfTargetScore: 87 } });
  357 |   expect(calls[0].resumeQueue.map((item: any) => item.status)).toEqual(['done', 'pending']);
  358 |   expect(calls[0].resumeQueue[0].result.accessibleHtml).toBe('<main>Saved work</main>');
  359 |   expect(errors).toEqual([]);
  360 | });
  361 | 
  362 | 
  363 | test('batch filters expose review work and readable failure details without changing the queue', async ({ page }) => {
  364 |   const { errors } = await mountWorkspace(page);
  365 |   await setRetryBatch(page);
  366 |   const filters = page.getByRole('group', { name: 'Filter batch files' });
  367 |   await filters.getByRole('button', { name: 'Needs review (1)', exact: true }).focus();
  368 |   await page.keyboard.press('Enter');
  369 |   await expect(filters.getByRole('button', { name: 'Needs review (1)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  370 |   await expect(page.locator('.pdf-workspace-batch-row')).toHaveCount(1);
  371 |   await expect(page.locator('.pdf-workspace-batch-row')).toContainText('done.docx');
  372 |   await filters.getByRole('button', { name: 'Unfinished (0)', exact: true }).click();
  373 |   await expect(page.locator('#pdf-workspace-batch-queue')).toContainText('No files match this filter.');
  374 |   await filters.getByRole('button', { name: 'Failed (2)', exact: true }).click();
  375 |   const error = page.locator('.pdf-workspace-batch-error').first();
  376 |   await error.locator('summary').focus(); await page.keyboard.press('Enter');
  377 |   await expect(error).toHaveAttribute('open', '');
  378 |   await expect(error).toContainText('Original failure');
  379 |   await filters.getByRole('button', { name: 'All files (3)', exact: true }).click();
  380 |   await expect(page.locator('.pdf-workspace-batch-row')).toHaveCount(3);
  381 |   expect(await page.evaluate(() => (window as any).__modalState.pdfBatchQueue.map((item: any) => item.status))).toEqual(['done', 'failed', 'failed']);
  382 |   // A newly selected document starts with a complete view even if the previous filter was empty.
  383 |   await filters.getByRole('button', { name: 'Unfinished (0)', exact: true }).click();
  384 |   await page.evaluate(() => (window as any).__setModalState({ pdfDocumentEpoch: 5 }));
  385 |   await expect(filters.getByRole('button', { name: 'All files (3)', exact: true })).toHaveAttribute('aria-pressed', 'true');
  386 |   expect(errors).toEqual([]);
  387 | });
  388 | 
  389 | test('batch progress counts processed files and Stop feedback belongs only to its current run', async ({ page }) => {
  390 |   const { dialog, errors } = await mountWorkspace(page);
  391 |   await page.evaluate(() => {
  392 |     const w = window as any;
  393 |     w.__alloPdfBatchAbortCtrl = new AbortController(); w.__stopToasts = [];
  394 |     w.__setModalState({ pdfBatchMode: true, pdfBatchProcessing: true, pdfBatchCurrentIndex: 2,
  395 |       pdfBatchStep: 'Auditing last.docx', addToast: (...args: any[]) => w.__stopToasts.push(args),
  396 |       pdfBatchQueue: [
  397 |         { id: 'done', fileName: 'done.docx', fileSize: 100, status: 'done', result: { verificationState: 'partial' } },
  398 |         { id: 'failed', fileName: 'failed.docx', fileSize: 100, status: 'failed' },
  399 |         { id: 'last', fileName: 'last.docx', fileSize: 100, status: 'processing' },
  400 |       ],
  401 |     });
  402 |   });
  403 |   const progress = page.getByRole('progressbar', { name: 'Batch remediation progress' });
  404 |   await expect(progress).toHaveAttribute('aria-valuenow', '1');
  405 |   await expect(progress).toHaveAttribute('aria-valuemax', '3');
  406 |   const stop = page.locator('[data-help-key="pdf_audit_view_batch_stop_btn"]');
  407 |   // Two programmatic clicks in one event turn must request only one stop.
  408 |   await stop.evaluate((el: HTMLButtonElement) => { el.click(); el.click(); });
  409 |   await expect(stop).toBeDisabled(); await expect(stop).toHaveText('Stopping…');
  410 |   await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Stopping batch');
  411 |   expect(await page.evaluate(() => (window as any).__alloPdfBatchAbortCtrl.signal.aborted)).toBe(true);
  412 |   expect(await page.evaluate(() => (window as any).__stopToasts.length)).toBe(1);
  413 |   await dialog.focus(); await page.keyboard.press('Escape');
  414 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  415 |   expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(0);
  416 |   await page.evaluate(() => (window as any).__setModalState({ pdfBatchProcessing: false,
  417 |     pdfBatchSummary: { status: 'complete', total: 3, processed: 1, failed: 1, pending: 0, results: [] } }));
  418 |   await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Batch paused or interrupted');
  419 |   await expect(page.getByRole('heading', { name: /Batch Processing Interrupted/ })).toBeVisible();
  420 |   await page.evaluate(() => {
  421 |     const w = window as any; w.__alloPdfBatchAbortCtrl = new AbortController();
  422 |     w.__setModalState({ pdfBatchSummary: null, pdfBatchProcessing: true });
  423 |   });
  424 |   await expect(stop).toBeEnabled(); await expect(stop).toHaveText('Stop');
  425 |   await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Processing batch');
  426 |   await expect(progress).toHaveAttribute('aria-valuenow', '1');
  427 |   expect(errors).toEqual([]);
  428 | });
  429 | 
  430 | for (const layout of [{ width: 1280, theme: 'light' }, { width: 320, theme: 'dark' }, { width: 320, theme: 'contrast' }]) {
  431 |   test('batch queue controls and details fit ' + layout.width + 'px ' + layout.theme, async ({ page }) => {
  432 |     await page.setViewportSize({ width: layout.width, height: 1000 });
  433 |     const { errors } = await mountWorkspace(page);
  434 |     await setRetryBatch(page);
  435 |     await page.evaluate(theme => {
  436 |       const w = window as any;
  437 |       w.__setModalState({ theme, pdfBatchQueue: w.__modalState.pdfBatchQueue.map((item: any) => item.id === 'selected'
  438 |         ? { ...item, error: 'Cannot process <script>unsafe()</script> ' + 'long-detail-'.repeat(20) } : item) });
  439 |     }, layout.theme);
  440 |     await page.getByRole('group', { name: 'Filter batch files' }).getByRole('button', { name: 'Failed (2)', exact: true }).click();
  441 |     const detail = page.locator('.pdf-workspace-batch-error').first();
  442 |     await detail.locator('summary').click();
  443 |     await expect(detail).toContainText('<script>unsafe()</script>');
  444 |     await expect(detail.locator('script')).toHaveCount(0);
  445 |     const shell = page.locator('.pdf-workspace-shell');
  446 |     const overflow = await shell.evaluate(el => Array.from(el.querySelectorAll('*')).filter(child => child.getBoundingClientRect().right > el.getBoundingClientRect().left + el.clientLeft + el.clientWidth + 1).map(child => ({ tag: child.tagName, classes: child.className, text: child.textContent?.slice(0, 90), right: child.getBoundingClientRect().right })).slice(0, 12));
> 447 |     expect(await shell.evaluate(el => el.scrollWidth - el.clientWidth), JSON.stringify({ overflow, shell: await shell.evaluate(el => ({ width: el.getBoundingClientRect().width, client: el.clientWidth, scroll: el.scrollWidth, html: el.innerHTML.slice(-1000) })) })).toBeLessThanOrEqual(1);
      |                                                                                                                                                                                                                                                                          ^ Error: {"overflow":[{"tag":"BUTTON","classes":"px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2","text":"📊 Dashboard","right":310.21875}],"shell":{"width":320,"client":301,"scroll":308,"html":"rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors\">New Batch</button><button data-help-key=\"pdf_audit_view_batch_dashboard_btn\" class=\"px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg flex items-center gap-2\">📊 Dashboard</button></div></div><div class=\"flex items-center gap-2 mt-3 pt-3 border-t border-slate-100\"><label class=\"flex-1 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 cursor-pointer border border-amber-200\" title=\"Open a .alloflow.json project file (AlloFlow saves one to your Downloads after each remediation) — your document, scores, history, and settings all come back.\">📂 Continue a previous session<input type=\"file\" accept=\".json\" class=\"hidden\"></label><button class=\"text-xs text-slate-600 hover:text-slate-900 font-bold\">Cancel</button></div></div>"}}
  448 |     await page.addScriptTag({ path: path.join(ROOT, 'node_modules/axe-core/axe.min.js') });
  449 |     const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [['.pdf-workspace-batch-filters'], ['.pdf-workspace-batch-error']] })).violations);
  450 |     expect(violations).toEqual([]);
  451 |     await page.locator('.pdf-workspace-batch-filters').scrollIntoViewIfNeeded();
  452 |     fs.mkdirSync(SHOTS, { recursive: true });
  453 |     await page.screenshot({ path: path.join(SHOTS, 'queue-' + layout.width + '-' + layout.theme + '.png') });
  454 |     expect(errors).toEqual([]);
  455 |   });
  456 | }
  457 | 
```