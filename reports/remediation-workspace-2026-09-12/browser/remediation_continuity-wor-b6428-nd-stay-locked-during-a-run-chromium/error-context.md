# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> workspace source and after-remediation controls use native keyboard behavior and stay locked during a run
- Location: tests\e2e\remediation_continuity.spec.ts:101:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('group', { name: 'Source to remediate' }).getByRole('button', { name: /Batch of files/ })
    - locator resolved to <button type="button" aria-pressed="false" data-help-key="pdf_audit_view_mode_batch_btn">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    51 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

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
          - paragraph [ref=e9]:
            - text: Document accessibility
            - generic [ref=e10]: / Single document
          - heading "sample.docx" [level=2] [ref=e11]
        - generic [ref=e12]:
          - button "Toggle color theme" [ref=e13] [cursor=pointer]:
            - generic [ref=e14]: ☀️
          - button "Close audit modal" [disabled] [ref=e15]
      - list "Remediation stages; audit and fix steps may repeat" [ref=e16]:
        - listitem [ref=e17]:
          - generic [ref=e18]: "1"
          - generic [ref=e19]: Select
        - listitem [ref=e20]:
          - generic [ref=e21]: "2"
          - generic [ref=e22]: Audit
        - listitem [ref=e23]:
          - generic [ref=e24]: "3"
          - generic [ref=e25]: Remediate
        - listitem [ref=e26]:
          - generic [ref=e27]: "4"
          - generic [ref=e28]: Verify
        - listitem [ref=e29]:
          - generic [ref=e30]: "5"
          - generic [ref=e31]: Review & download
      - generic [ref=e33]:
        - status [ref=e34]: Remediation in progress
        - paragraph [ref=e35]: Keep this workspace open. Results stay provisional until the whole run finishes.
    - generic [ref=e36]:
      - group "Source to remediate" [ref=e37]:
        - button "Single document PDF, Office or media" [disabled] [pressed] [ref=e38]:
          - strong [ref=e39]: Single document
          - generic [ref=e40]: PDF, Office or media
        - button "Batch of files Files or a folder" [disabled] [ref=e41]:
          - strong [ref=e42]: Batch of files
          - generic [ref=e43]: Files or a folder
        - button "Website / HTML Static source audit" [disabled] [ref=e44]:
          - strong [ref=e45]: Website / HTML
          - generic [ref=e46]: Static source audit
      - generic [ref=e47]: 📄
      - 'heading "Document Uploaded: sample.docx" [level=3] [ref=e48]'
      - paragraph [ref=e49]: 0.0 MB
      - paragraph [ref=e50]: "Choose how to process this document:"
      - generic [ref=e51]:
        - paragraph [ref=e52]: "🔒 Privacy: this document’s text and images are sent to Google Gemini (a third-party AI service) for the AI parts of the audit. The automated WCAG checks run locally in your browser. Don’t upload documents containing student personal information you aren’t permitted to share with a third-party AI service."
        - button "Finishing remediation… Keep this window open — duplicate starts are disabled" [disabled] [ref=e53]:
          - generic [ref=e54]: ⏳
          - text: Finishing remediation…
          - generic [ref=e55]: Keep this window open — duplicate starts are disabled
        - paragraph [ref=e56]:
          - text: One click runs the whole pipeline hands-free with the default settings; downloads are ready at the end. Prefer control? Use "Run Audit" below, review the results, then click Fix & Verify yourself.
          - button "✨ 60-second tour" [ref=e57] [cursor=pointer]
        - group [ref=e58]:
          - generic "ℹ️ Why schools are required to do this (ADA Title II)" [ref=e59] [cursor=pointer]
      - group [ref=e60]:
        - generic "Advanced pipeline settings" [ref=e61] [cursor=pointer]
        - option "🌐 Auto-detect (recommended)" [selected]
        - option "🇪🇸 Spanish — Español"
        - option "🇸🇴 Somali — Soomaali"
        - option "🇸🇦 Arabic — العربية"
        - option "🇻🇳 Vietnamese — Tiếng Việt"
        - option "🇦🇫 Pashto — پښتو"
        - option "🇮🇷 Dari / Farsi — فارسی"
        - option "🇪🇹 Amharic — አማርኛ"
        - option "🇪🇷 Tigrinya — ትግርኛ"
        - option "🇰🇪 Swahili — Kiswahili"
        - option "🇭🇹 Haitian Creole — Kreyòl"
        - option "🇫🇷 French — Français"
        - option "🇧🇷 Portuguese — Português"
        - option "🇨🇳 Chinese — 中文"
        - option "🇷🇺 Russian — Русский"
        - option "🇺🇦 Ukrainian — Українська"
        - option "🇵🇰 Urdu — اردو"
        - option "🇮🇳 Hindi — हिन्दी"
        - option "🇧🇩 Bengali — বাংলা"
        - option "🇮🇳 Punjabi — ਪੰਜਾਬੀ"
        - option "🇮🇳 Gujarati — ગુજરાતી"
        - option "🇮🇳 Tamil — தமிழ்"
        - option "🇹🇭 Thai — ไทย"
        - option "🇰🇭 Khmer — ខ្មែរ"
        - option "🇲🇲 Burmese — မြန်မာ"
        - option "🇯🇵 Japanese — 日本語"
        - option "🇰🇷 Korean — 한국어"
        - option "🇵🇭 Tagalog"
        - option "🇹🇷 Turkish — Türkçe"
        - option "🇩🇪 German — Deutsch"
        - option "🇮🇹 Italian — Italiano"
        - option "🇵🇱 Polish — Polski"
        - option "🇬🇷 Greek — Ελληνικά"
        - option "🇮🇱 Hebrew — עברית"
        - option "10 minutes" [selected]
        - option "18 minutes (default)"
        - option "30 minutes"
        - option "45 minutes"
        - option "Keep waiting (no budget)"
      - group [ref=e62]:
        - generic "✨ Output Style & Branding (optional)" [ref=e63] [cursor=pointer]
        - option "Inter (Clean)" [selected]
        - option "Georgia (Serif)"
        - option "Atkinson (A11y)"
        - option "Lexend (Readable)"
        - option "Comic Sans (Fun)"
        - option "Times (Classic)"
        - option "OpenDyslexic"
      - group [ref=e64]:
        - generic "Manual audit & text extraction" [active] [ref=e65] [cursor=pointer]
        - generic [ref=e66]:
          - generic [ref=e67]: After remediation
          - combobox "After remediation Applies to manual Fix & Verify. Make Accessible always finishes in results." [disabled] [ref=e68]:
            - option "Show results" [selected]
            - option "Review changes"
            - option "Open editor"
          - generic [ref=e69]: Applies to manual Fix & Verify. Make Accessible always finishes in results.
        - generic [ref=e70]:
          - generic "Skip cached audit results for this run so every step executes for real (slower; useful when diagnosing)" [ref=e71] [cursor=pointer]:
            - checkbox "Run fresh (skip cached results)" [ref=e72]
            - text: Run fresh (skip cached results)
          - button "♿ Run Audit (step 1 of 2)" [ref=e73] [cursor=pointer]
          - button "Skip to Text Extraction" [disabled] [ref=e74]
        - paragraph [ref=e75]: "\"Run Audit\" scores the document and shows what needs fixing — you then review and click Fix & Verify yourself (step 2). \"Make Accessible\" above does both steps plus re-checking, automatically. \"Text Extraction\" just pulls the raw text for content generation."
      - generic [ref=e76]:
        - generic "Open a .alloflow.json project file (AlloFlow saves one to your Downloads after each remediation) — your document, scores, history, and settings all come back." [ref=e77] [cursor=pointer]: 📂 Continue a previous session
        - button "Cancel" [disabled] [ref=e78]
```

# Test source

```ts
  14  |     'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js',
  15  |     'doc_pipeline_module.js', 'view_pdf_audit_module.js']) await page.addScriptTag({ path: path.join(ROOT, file) });
  16  |   await page.addStyleTag({ path: path.join(ROOT, 'app/static/css/main.bba82ce3.css') });
  17  |   await page.evaluate((names) => {
  18  |     const w = window as any;
  19  |     w.warnLog = () => {}; w.debugLog = () => {};
  20  |     w.__modalCloses = 0; w.__escapedToHost = 0;
  21  |     document.addEventListener('keydown', e => { if (e.key === 'Escape') w.__escapedToHost++; });
  22  |     const initial: any = {};
  23  |     for (const name of names) {
  24  |       if (name.endsWith('Ref')) initial[name] = { current: null };
  25  |       else if (/^(set|run|call|fix|apply|save|start|update|capture|download|open|proceed|generate|retire|select)/.test(name)) initial[name] = () => {};
  26  |     }
  27  |     Object.assign(initial, {
  28  |       t: () => '', theme: 'light', pdfDocumentEpoch: 4, pdfTargetScore: 95, applyingRemarkup: false,
  29  |       pdfAutoFixPasses: 3, pdfPolishPasses: 1, pdfAuditorCount: 1,
  30  |       pdfPreviewFontSize: 16, pdfPreviewTheme: 'original', pdfFixMode: 'auto',
  31  |       pdfAuditResult: { _choosing: true, fileName: 'sample.docx', fileSize: 100 },
  32  |       pendingPdfFile: { name: 'sample.docx', size: 100 }, pendingPdfBase64: 'data',
  33  |       pdfAuditTab: 'results', pdfBatchCurrentIndex: -1, pdfStormBudgetMinutes: 10, pdfFixStep: '', pdfBatchStep: '',
  34  |       STYLE_SEEDS: {}, addToast: () => {}, safeCloneAudit: (x: any) => x,
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
  45  |       const setters: any = {};
  46  |       for (const name of names.filter(name => /^set[A-Z]/.test(name))) {
  47  |         const key = name[3].toLowerCase() + name.slice(4);
  48  |         setters[name] = (value: any) => setState((s: any) => ({ ...s, [key]: typeof value === 'function' ? value(s[key]) : value }));
  49  |       }
  50  |       return w.React.createElement(w.AlloModules.PdfAuditView, { ...state, ...setters });
  51  |     }
  52  |     w.ReactDOM.createRoot(document.getElementById('root')).render(w.React.createElement(Harness));
  53  |   }, names);
  54  |   const dialog = page.getByRole('dialog', { name: 'PDF Accessibility Audit', exact: true });
  55  |   await expect(dialog, errors.join('\n')).toBeVisible();
  56  |   return { dialog, errors };
  57  | }
  58  | 
  59  | test('modal retains active runs across manual, review, auto, batch and focused modes', async ({ page }) => {
  60  |   const { dialog, errors } = await mountWorkspace(page);
  61  |   for (const mode of ['auto', 'review', 'expert', 'batch', 'focused']) {
  62  |     await page.evaluate(mode => (window as any).__setModalState({
  63  |       pdfFixMode: mode === 'batch' || mode === 'focused' ? 'auto' : mode,
  64  |       pdfBatchMode: mode === 'batch' || mode === 'focused', _remediationMode: mode === 'focused',
  65  |       pdfFixLoading: mode !== 'batch' && mode !== 'focused', pdfBatchProcessing: mode === 'batch' || mode === 'focused',
  66  |     }), mode);
  67  |     await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  68  |     await dialog.focus(); await page.keyboard.press('Escape');
  69  |     await expect(dialog).toBeVisible();
  70  |     expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(0);
  71  |     expect(await page.evaluate(() => (window as any).__escapedToHost)).toBe(0);
  72  |   }
  73  |   await page.evaluate(() => (window as any).__setModalState({ pdfBatchMode: false, _remediationMode: false, pdfFixLoading: false, pdfBatchProcessing: false }));
  74  |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeEnabled();
  75  |   await page.locator('[data-help-key="pdf_audit_view_close_btn"]').click();
  76  |   expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(1);
  77  |   expect(errors).toEqual([]);
  78  | });
  79  | 
  80  | const SHOTS = path.join(ROOT, 'reports/remediation-workspace-2026-09-12');
  81  | async function setResult(page: Page, patch: any = {}) {
  82  |   await page.evaluate(patch => {
  83  |     const w = window as any;
  84  |     w.__setModalState({
  85  |       pdfAuditResult: { fileName: 'classroom-handout.docx', fileSize: 100, pageCount: 3, score: 78, critical: [], serious: [], moderate: [], minor: [] },
  86  |       pdfFixResult: {
  87  |         accessibleHtml: '<!doctype html><html lang="en"><head><title>Classroom handout</title></head><body><main><h1>Classroom handout</h1><p>Read the passage and discuss.</p></main></body></html>',
  88  |         originalText: 'Classroom handout Read the passage and discuss.',
  89  |         beforeScore: 78, afterScore: 99, verificationState: 'partial', verificationCoverage: { ai: 'unavailable', axe: 'complete', equalAccess: 'unavailable' },
  90  |         verificationReasons: ['ai-incomplete'], _aiVerificationIncomplete: true,
  91  |         axeAudit: { score: 100, totalViolations: 0, critical: [], serious: [], moderate: [], minor: [], incomplete: [], passes: [] },
  92  |         changes: [], fidelityNotes: [], integrityCoverage: 100,
  93  |         ...patch,
  94  |       },
  95  |       pdfFixMode: 'auto', pdfAuditTab: 'results', pdfFixLoading: false, pdfAutoContinueRunning: false,
  96  |       pdfBatchMode: false, pdfWebMode: false,
  97  |     });
  98  |   }, patch);
  99  | }
  100 | 
  101 | test('workspace source and after-remediation controls use native keyboard behavior and stay locked during a run', async ({ page }) => {
  102 |   const { errors } = await mountWorkspace(page);
  103 |   const sources = page.getByRole('group', { name: 'Source to remediate' });
  104 |   await expect(sources.getByRole('button', { name: /Single document/ })).toHaveAttribute('aria-pressed', 'true');
  105 |   const manual = page.locator('[data-help-key="pdf_workspace_manual"]');
  106 |   await expect(manual).not.toHaveAttribute('open');
  107 |   await manual.locator('summary').click();
  108 |   const mode = page.getByRole('combobox', { name: /After remediation/ });
  109 |   for (const value of ['review', 'expert', 'auto']) {
  110 |     await mode.selectOption(value); await expect(mode).toHaveValue(value);
  111 |   }
  112 |   // Same-tick owner guard: a pipeline can become active before the render's busy flag.
  113 |   await page.evaluate(() => { (window as any).__pipelineActive = true; });
> 114 |   await sources.getByRole('button', { name: /Batch of files/ }).click();
      |                                                                 ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  115 |   await expect(sources.getByRole('button', { name: /Single document/ })).toHaveAttribute('aria-pressed', 'true');
  116 |   await page.evaluate(() => { (window as any).__pipelineActive = false; (window as any).__setModalState({ pdfFixLoading: true }); });
  117 |   await expect(mode).toBeDisabled();
  118 |   await expect(sources.getByRole('button', { name: /Batch of files/ })).toBeDisabled();
  119 |   await page.evaluate(() => (window as any).__setModalState({ pdfFixLoading: false }));
  120 |   await sources.getByRole('button', { name: /Website/ }).click();
  121 |   await expect(page.getByLabel('Website URL to audit')).toBeVisible();
  122 |   await expect(sources.getByRole('button', { name: /Website/ })).toHaveAttribute('aria-pressed', 'true');
  123 |   expect(errors).toEqual([]);
  124 | });
  125 | 
  126 | test('workspace results preserve the mounted owner and navigate into collapsed downloads', async ({ page }) => {
  127 |   const { errors } = await mountWorkspace(page);
  128 |   await setResult(page);
  129 |   const header = page.getByTestId('pdf-workspace-header');
  130 |   await expect(header.getByRole('status')).toHaveText('Needs review');
  131 |   await expect(page.getByText(/Anything flagged below is optional polish/)).toHaveCount(0);
  132 |   await page.evaluate(() => { (window as any).__originalDialog = document.querySelector('[data-help-key="pdf_audit_view_panel"]'); });
  133 |   const formats = page.locator('[data-help-key="pdf_audit_alt_formats_summary"]');
  134 |   await expect(formats).not.toHaveAttribute('open');
  135 |   await header.getByRole('button', { name: 'Downloads', exact: true }).click();
  136 |   await expect(formats).toHaveAttribute('open', '');
  137 |   await expect(page.locator('#allo-sec-downloads')).toBeFocused();
  138 |   expect(await page.evaluate(() => (window as any).__originalDialog === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  139 |   const headerBox = await header.boundingBox(); const targetBox = await page.locator('#allo-sec-downloads').boundingBox();
  140 |   expect(targetBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  141 |   await header.getByRole('button', { name: 'Advanced tools', exact: true }).click();
  142 |   await expect(page.locator('#allo-sec-workbench')).toHaveAttribute('open', '');
  143 |   await expect(page.locator('#allo-sec-workbench > summary')).toBeFocused();
  144 |   await page.evaluate(() => (window as any).__setModalState({ pdfAuditTab: 'original' }));
  145 |   await header.getByRole('button', { name: 'Verification & review' }).click();
  146 |   await expect(page.locator('[data-help-key="pdf_audit_verification_status"]')).toBeFocused();
  147 |   await page.evaluate(() => (window as any).__setModalState({ pdfFixLoading: true }));
  148 |   await expect(header.getByRole('status')).toHaveText('Remediation in progress');
  149 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  150 |   expect(await page.evaluate(() => (window as any).__originalDialog === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  151 |   expect(errors).toEqual([]);
  152 | });
  153 | 
  154 | for (const layout of [{ width: 1280, theme: 'light' }, { width: 320, theme: 'light' }, { width: 390, theme: 'dark' }, { width: 320, theme: 'contrast' }]) {
  155 |   test(`workspace layout ${layout.width}px ${layout.theme}`, async ({ page }) => {
  156 |     await page.setViewportSize({ width: layout.width, height: 900 });
  157 |     const { errors } = await mountWorkspace(page);
  158 |     await page.evaluate(theme => (window as any).__setModalState({ theme }), layout.theme);
  159 |     const shell = page.locator('.pdf-workspace-shell');
  160 |     const checkWidth = async () => expect(await shell.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  161 |     await checkWidth();
  162 |     fs.mkdirSync(SHOTS, { recursive: true });
  163 |     await page.screenshot({ path: path.join(SHOTS, `intake-${layout.width}-${layout.theme}.png`) });
  164 |     await setResult(page);
  165 |     await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Needs review');
  166 |     await checkWidth();
  167 |     await page.screenshot({ path: path.join(SHOTS, `results-${layout.width}-${layout.theme}.png`) });
  168 |     expect(errors).toEqual([]);
  169 |   });
  170 | }
  171 | 
  172 | test('batch rows distinguish processed from verified and keep failed files available for retry', async ({ page }) => {
  173 |   const { errors } = await mountWorkspace(page);
  174 |   await page.evaluate(() => (window as any).__setModalState({
  175 |     pdfBatchMode: true, pdfBatchSummary: { status: 'complete', total: 3, done: 2, failed: 1, reviewRequired: 1, pending: 0, results: [] },
  176 |     pdfBatchQueue: [
  177 |       { id: 'one', fileName: 'verified.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'complete', fullyVerifiedSuccess: true } },
  178 |       { id: 'two', fileName: 'needs-review.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'partial' } },
  179 |       { id: 'three', fileName: 'retry.docx', fileSize: 100, status: 'failed' },
  180 |     ],
  181 |   }));
  182 |   const rows = page.locator('.pdf-workspace-batch-row');
  183 |   await expect(rows).toHaveCount(3);
  184 |   await expect(rows.nth(0)).toContainText('Processed');
  185 |   await expect(rows.nth(0)).toContainText('Verification complete');
  186 |   await expect(rows.nth(1)).toContainText('Verification partial');
  187 |   await expect(rows.nth(2).getByRole('button', { name: 'Retry retry.docx' })).toBeVisible();
  188 |   await page.screenshot({ path: path.join(SHOTS, 'batch-results-1280.png') });
  189 |   expect(errors).toEqual([]);
  190 | });
  191 | 
```