# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> workspace results preserve the mounted owner and navigate into collapsed downloads
- Location: tests\e2e\remediation_continuity.spec.ts:132:5

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 269.09375
Received:    244.59375
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
      - generic [ref=e33]:
        - generic [ref=e34]:
          - status [ref=e35]: Needs review
          - paragraph [ref=e36]: Check verification coverage and unresolved findings before sharing this copy.
        - button "Review verification" [ref=e37] [cursor=pointer]: Review verification →
      - navigation "Result sections" [ref=e38]:
        - button "Verification & review" [ref=e39] [cursor=pointer]
        - button "Downloads" [ref=e40] [cursor=pointer]
        - button "Advanced tools" [ref=e41] [cursor=pointer]
    - 'region "PDF accessibility audit complete. Score: 78 out of 100." [ref=e42]':
      - tablist "Audit view" [ref=e43]:
        - tab "Remediation Results" [selected] [ref=e44] [cursor=pointer]
        - tab "Original Audit" [ref=e45] [cursor=pointer]
      - generic [ref=e46]:
        - generic [ref=e47]:
          - button "Additional Sweep" [ref=e48] [cursor=pointer]
          - button "Address 1 Review Finding AI ? · axe ? · EA ? · review 1" [ref=e49] [cursor=pointer]:
            - generic [ref=e50]:
              - generic [ref=e51]: Address 1 Review Finding
              - generic [ref=e52]: AI ? · axe ? · EA ? · review 1
          - button "Report ▾" [ref=e54] [cursor=pointer]
          - button "Text Extract" [ref=e55] [cursor=pointer]
        - paragraph [ref=e56]: "\"Fix & Verify\" transforms to accessible HTML with axe-core verification. \"Text Extract\" pulls raw text for differentiated material generation."
        - region "Preservation review" [ref=e57]:
          - heading "Preservation review" [level=3] [ref=e58]
          - paragraph [ref=e59]: Inspect stable references for tables, cells, and images. Acknowledging an item does not resolve accessibility findings or change verification.
          - button "Inspect document references" [ref=e60] [cursor=pointer]
          - status
        - generic [ref=e61]:
          - 'region "WCAG verification: Partial" [ref=e62]':
            - generic [ref=e63]:
              - 'heading "WCAG verification: Partial" [level=3] [ref=e64]'
              - generic [ref=e65]: WCAG 2.2 AA
              - button "Re-run verification only" [ref=e66] [cursor=pointer]
            - list [ref=e67]:
              - listitem [ref=e68]:
                - strong [ref=e69]: "AI:"
                - text: unavailable
              - listitem [ref=e70]:
                - strong [ref=e71]: "axe-core:"
                - text: complete
              - listitem [ref=e72]:
                - strong [ref=e73]: "Equal Access:"
                - text: unavailable
            - group [ref=e74]:
              - generic "Why this status?" [ref=e75] [cursor=pointer]
          - navigation "Remediation results overview and section navigation" [ref=e76]:
            - 'generic "Structural/automated checks only — the AI semantic audit was throttled and did not finish, so this is NOT a verified content score. Content audit score (HTML reconstruction: AI rubric + axe), before → after. This is NOT PDF/UA conformance of the exported PDF — see the PDF/UA chip." [ref=e77]': 78 → — structural only
            - button "🏗️ 4 passed · 0 missing · 14 N/A (18 HTML foundations)" [ref=e78] [cursor=pointer]
            - button "✅ Verification" [ref=e80] [cursor=pointer]
            - button "🩹 Recovery" [ref=e81] [cursor=pointer]
            - button "🪓 Issues (axe)" [ref=e82] [cursor=pointer]
            - button "📥 Downloads" [ref=e83] [cursor=pointer]
            - button "🔍 Tag inspector" [ref=e84] [cursor=pointer]
            - button "🛠 Workbench" [ref=e85] [cursor=pointer]
            - button "📋 What changed" [ref=e86] [cursor=pointer]
            - button "✨ Tour" [ref=e87] [cursor=pointer]
          - generic [ref=e88]:
            - heading "⚠️ Needs review" [level=4] [ref=e89]
            - button "🗑️ Start New Audit" [ref=e90] [cursor=pointer]
          - note [ref=e91]:
            - generic [ref=e92]: What now?
            - generic [ref=e93]: Check verification coverage and unresolved findings before sharing this copy.
            - button "Review verification" [ref=e94] [cursor=pointer]
            - button "✨ Make learning materials" [ref=e95] [cursor=pointer]
          - generic [ref=e96]:
            - generic [ref=e97]:
              - generic [ref=e98]: 78/100
              - generic [ref=e99]: Before
            - generic [ref=e100]: →
            - generic [ref=e101]:
              - generic "No verified score yet — the AI semantic audit was throttled and did not finish. Re-run for a full score. The structural-only number is shown below." [ref=e102]: —
              - generic [ref=e103]: After
              - generic [ref=e104]: "structural only: 99/100"
          - generic [ref=e106]:
            - 'button "content: 78→incomplete" [ref=e107]'
            - generic [ref=e108]: "Content & semantics — the AI rubric reading of meaning, alt-text quality and reading order. Reproducible: 100 minus the count-weighted deductions for the issues listed below."
            - generic [ref=e109]: — structural/automated checks only; AI semantic audit incomplete — re-run for a full score
          - generic [ref=e110]:
            - generic [ref=e111]: AI semantic verification incomplete. The score shown is structural/automated checks; use “Complete final audit” below to finish the AI check when the service is calm — it audits only, and keeps this document as it is.
            - button "Re-run the AI audit on all sections to recover sections the service throttled" [ref=e112] [cursor=pointer]: 🔁 Complete final audit
          - generic [ref=e113]:
            - generic [ref=e114]:
              - generic [ref=e115]:
                - generic [ref=e116]: 🔬
                - generic [ref=e117]:
                  - generic [ref=e118]: axe-core Automated WCAG Checker
                  - generic [ref=e119]: Industry-standard engine (Deque) v — WCAG 2.2 AA
              - generic [ref=e120]: ✅
            - generic [ref=e121]:
              - generic [ref=e122]: Zero WCAG violations detected
              - generic [ref=e123]: accessibility checks passed
            - generic [ref=e124]:
              - generic [ref=e125]: ✅ passed
              - group [ref=e126]:
                - generic "⚙ Re-run with new settings" [ref=e127] [cursor=pointer]
          - generic [ref=e128]:
            - button "✏️ Preview & Edit" [ref=e129] [cursor=pointer]
            - button "🔀 Compare" [ref=e130] [cursor=pointer]
            - button "📥 Print-style PDF (unverified)" [ref=e131] [cursor=pointer]
            - group [ref=e132]:
              - generic "📋 Document metadata — Title · Language · Author (used for the Tagged PDF)" [ref=e133] [cursor=pointer]
              - option "English (en)" [selected]
              - option "Spanish (es)"
              - option "French (fr)"
              - option "Arabic (ar)"
              - option "Chinese (zh)"
              - option "Japanese (ja)"
              - option "Korean (ko)"
              - option "Russian (ru)"
              - option "Portuguese (pt)"
              - option "German (de)"
              - option "Italian (it)"
              - option "Vietnamese (vi)"
              - option "Hindi (hi)"
              - option "Persian/Dari (fa)"
              - option "Urdu (ur)"
              - option "Somali (so)"
              - option "Amharic (am)"
              - option "Swahili (sw)"
              - option "Pashto (ps)"
              - option "Haitian Creole (ht)"
            - group [ref=e134]:
              - generic "🔍 Tag structure — view + edit the roles your tagged PDF will carry" [ref=e135] [cursor=pointer]
            - paragraph [ref=e136]: Which file? 📄 Tagged PDF — give this to students (looks identical to the original, works with screen readers). 📝 Word — keep editing it. 📽 PowerPoint — present it. 📄 HTML — opens anywhere, no software needed.
            - button "📄 Tagged PDF (generated layout)" [ref=e137] [cursor=pointer]
            - button "📝 Word (.docx)" [ref=e138] [cursor=pointer]
            - button "📽 PowerPoint (.pptx)" [ref=e139] [cursor=pointer]
            - combobox "PowerPoint export theme" [ref=e140]:
              - option "🎨 Classic Light" [selected]
              - option "🌙 Midnight"
              - option "🌅 Sunrise"
              - option "🌲 Forest"
              - option "◐ High Contrast"
              - 'option "✨ AI: match my topic"'
            - button "📄 HTML" [ref=e141] [cursor=pointer]
            - button "📊 Report ▾" [ref=e143] [cursor=pointer]
          - button "🔄 Re-scan with OCR (text looks wrong?)" [ref=e145] [cursor=pointer]
          - generic [ref=e146]:
            - button "💾 Save Project" [ref=e147] [cursor=pointer]
            - generic [ref=e148] [cursor=pointer]: 📂 Load Project
          - button "📐 Save Structure as Template (for future documents)" [ref=e149] [cursor=pointer]
          - group [ref=e150]:
            - generic "⬇ Export / Download ▾" [ref=e151] [cursor=pointer]:
              - text: ⬇ Export / Download
              - generic [ref=e152]: ▾
            - menu "Export formats" [ref=e153]:
              - paragraph [active] [ref=e154]: Download the remediated document in any format — pick the one that fits how it’ll be used.
              - generic [ref=e155]: Documents
              - menuitem "📝 Word (.docx — keep editing)" [ref=e156] [cursor=pointer]
              - menuitem "📽 PowerPoint (.pptx — present it)" [ref=e157] [cursor=pointer]
              - menuitem "🌐 HTML (opens anywhere, no software)" [ref=e158] [cursor=pointer]
              - generic [ref=e159]: Accessible formats
              - button "📚 ePub (e-readers, mobile, Kindle)" [ref=e160] [cursor=pointer]
              - button "⠃⠗⠇ Electronic Braille (BRF)" [ref=e161] [cursor=pointer]
              - menuitem "🔊 DAISY talking book (full text)" [ref=e162] [cursor=pointer]
              - menuitem "📖🔊 Read-along ebook (synced audio)" [ref=e163] [cursor=pointer]
              - generic [ref=e164]: Text & editable
              - button "📝 Plain Text (screen readers, large print)" [ref=e165] [cursor=pointer]
              - button "📋 Markdown (LMS, wiki, docs)" [ref=e166] [cursor=pointer]
              - menuitem "📄 ODT (LibreOffice / Google Docs)" [ref=e167] [cursor=pointer]
              - generic [ref=e168]: Audio narration
              - menuitem "🎧 Audio narration (standard)" [ref=e169] [cursor=pointer]
              - menuitem "🦻 Audio (screen-reader style)" [ref=e170] [cursor=pointer]
          - group [ref=e171]:
            - generic "▸ 🤖 Expert Workbench idle" [ref=e172] [cursor=pointer]:
              - generic [ref=e173]: ▸
              - text: 🤖 Expert Workbench
              - generic [ref=e174]: idle
          - generic [ref=e175]:
            - generic [ref=e176]: 📚 Differentiate This Document
            - button "Bi onic Reading" [ref=e177] [cursor=pointer]:
              - generic [ref=e178]: Bi
              - text: onic Reading
            - button "📏 Line Guide (reading tracker)" [ref=e179] [cursor=pointer]
            - generic [ref=e180]:
              - combobox "Translation language — type any language or pick from suggestions" [ref=e181]
              - button "Translate" [ref=e182] [cursor=pointer]
            - generic [ref=e183]:
              - combobox "Simplification grade level" [ref=e184]:
                - option "📖 Kindergarten"
                - option "📖 1st Grade"
                - option "📖 2nd Grade"
                - option "📖 3rd Grade"
                - option "📖 4th Grade"
                - option "📖 5th Grade" [selected]
                - option "📖 6th Grade"
                - option "📖 7th Grade"
                - option "📖 8th Grade"
                - option "📖 9th Grade"
                - option "📖 10th Grade"
              - button "Simplify" [ref=e185] [cursor=pointer]
            - button "✨ Full Differentiation Pipeline" [ref=e186] [cursor=pointer]
            - paragraph [ref=e187]: Translations and simplifications stack — add French, then Spanish, then a 3rd grade version, all in one document. Each appears as a new section. Use "Full Pipeline" to feed into AlloFlow's complete differentiation system.
          - generic [ref=e188]:
            - button "🎧 Download Audio" [ref=e189] [cursor=pointer]
            - button "🦻 Audio (screen-reader style)" [ref=e190] [cursor=pointer]
            - button "📖 Add glossary appendix" [ref=e191] [cursor=pointer]
          - group [ref=e192]:
            - generic "📋 What Changed ▸" [ref=e193] [cursor=pointer]:
              - text: 📋 What Changed
              - generic [ref=e194]: ▸
          - group [ref=e195]:
            - generic "📖 Easy-Read Summary (one page) — a short overview; for the full document rewritten in plain language, use 🪶 Plain-language version above ▸" [ref=e196] [cursor=pointer]:
              - text: 📖 Easy-Read Summary (one page)
              - generic [ref=e197]: — a short overview; for the full document rewritten in plain language, use 🪶 Plain-language version above
              - generic [ref=e198]: ▸
            - option "3rd"
            - option "5th" [selected]
            - option "8th"
            - option "Adult"
            - option "Brief"
            - option "Medium" [selected]
            - option "Detailed"
```

# Test source

```ts
  46  |       const setters = w.React.useMemo(() => {
  47  |       const setters: any = {};
  48  |       for (const name of names.filter(name => /^set[A-Z]/.test(name))) {
  49  |         const key = name[3].toLowerCase() + name.slice(4);
  50  |         setters[name] = (value: any) => setState((s: any) => ({ ...s, [key]: typeof value === 'function' ? value(s[key]) : value }));
  51  |       }
  52  |       return setters;
  53  |       }, []);
  54  |       return w.React.createElement(w.AlloModules.PdfAuditView, { ...state, ...setters });
  55  |     }
  56  |     w.ReactDOM.createRoot(document.getElementById('root')).render(w.React.createElement(Harness));
  57  |   }, names);
  58  |   const dialog = page.getByRole('dialog', { name: 'PDF Accessibility Audit', exact: true });
  59  |   await expect(dialog, errors.join('\n')).toBeVisible();
  60  |   return { dialog, errors };
  61  | }
  62  | 
  63  | test('modal retains active runs across manual, review, auto, batch and focused modes', async ({ page }) => {
  64  |   const { dialog, errors } = await mountWorkspace(page);
  65  |   for (const mode of ['auto', 'review', 'expert', 'batch', 'focused']) {
  66  |     await page.evaluate(mode => (window as any).__setModalState({
  67  |       pdfFixMode: mode === 'batch' || mode === 'focused' ? 'auto' : mode,
  68  |       pdfBatchMode: mode === 'batch' || mode === 'focused', _remediationMode: mode === 'focused',
  69  |       pdfFixLoading: mode !== 'batch' && mode !== 'focused', pdfBatchProcessing: mode === 'batch' || mode === 'focused',
  70  |     }), mode);
  71  |     await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  72  |     await dialog.focus(); await page.keyboard.press('Escape');
  73  |     await expect(dialog).toBeVisible();
  74  |     expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(0);
  75  |     expect(await page.evaluate(() => (window as any).__escapedToHost)).toBe(0);
  76  |   }
  77  |   await page.evaluate(() => (window as any).__setModalState({ pdfBatchMode: false, _remediationMode: false, pdfFixLoading: false, pdfBatchProcessing: false }));
  78  |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeEnabled();
  79  |   await page.locator('[data-help-key="pdf_audit_view_close_btn"]').click();
  80  |   expect(await page.evaluate(() => (window as any).__modalCloses)).toBe(1);
  81  |   expect(errors).toEqual([]);
  82  | });
  83  | 
  84  | const SHOTS = path.join(ROOT, 'reports/remediation-workspace-2026-09-12');
  85  | async function setResult(page: Page, patch: any = {}) {
  86  |   await page.evaluate(patch => {
  87  |     const w = window as any;
  88  |     w.__setModalState({
  89  |       pdfAuditResult: { fileName: 'classroom-handout.docx', fileSize: 100, pageCount: 3, score: 78, critical: [], serious: [], moderate: [], minor: [] },
  90  |       pdfFixResult: {
  91  |         accessibleHtml: '<!doctype html><html lang="en"><head><title>Classroom handout</title></head><body><main><h1>Classroom handout</h1><p>Read the passage and discuss.</p></main></body></html>',
  92  |         originalText: 'Classroom handout Read the passage and discuss.',
  93  |         beforeScore: 78, afterScore: 99, verificationState: 'partial', verificationCoverage: { ai: 'unavailable', axe: 'complete', equalAccess: 'unavailable' },
  94  |         verificationReasons: ['ai-incomplete'], _aiVerificationIncomplete: true,
  95  |         axeAudit: { score: 100, totalViolations: 0, critical: [], serious: [], moderate: [], minor: [], incomplete: [], passes: [] },
  96  |         changes: [], fidelityNotes: [], integrityCoverage: 100,
  97  |         ...patch,
  98  |       },
  99  |       pdfFixMode: 'auto', pdfAuditTab: 'results', pdfFixLoading: false, pdfAutoContinueRunning: false,
  100 |       pdfBatchMode: false, pdfWebMode: false,
  101 |     });
  102 |   }, patch);
  103 | }
  104 | 
  105 | test('workspace source and after-remediation controls use native keyboard behavior and stay locked during a run', async ({ page }) => {
  106 |   const { errors } = await mountWorkspace(page);
  107 |   const sources = page.getByRole('group', { name: 'Source to remediate' });
  108 |   await expect(sources.getByRole('button', { name: /Single document/ })).toHaveAttribute('aria-pressed', 'true');
  109 |   const manual = page.locator('[data-help-key="pdf_workspace_manual"]');
  110 |   await expect(manual).not.toHaveAttribute('open');
  111 |   await manual.locator('summary').click();
  112 |   const mode = page.getByRole('combobox', { name: /After remediation/ });
  113 |   for (const value of ['review', 'expert', 'auto']) {
  114 |     await mode.selectOption(value); await expect(mode).toHaveValue(value);
  115 |   }
  116 |   // Same-tick owner guard: a pipeline can become active before the render's busy flag.
  117 |   await page.evaluate(() => {
  118 |     (window as any).__pipelineActive = true;
  119 |     (document.querySelector('[data-help-key="pdf_audit_view_mode_batch_btn"]') as HTMLButtonElement).click();
  120 |   });
  121 |   await expect(sources.getByRole('button', { name: /Single document/ })).toHaveAttribute('aria-pressed', 'true');
  122 |   await page.evaluate(() => { (window as any).__pipelineActive = false; (window as any).__setModalState({ pdfFixLoading: true }); });
  123 |   await expect(mode).toBeDisabled();
  124 |   await expect(sources.getByRole('button', { name: /Batch of files/ })).toBeDisabled();
  125 |   await page.evaluate(() => (window as any).__setModalState({ pdfFixLoading: false }));
  126 |   await sources.getByRole('button', { name: /Website/ }).click();
  127 |   await expect(page.getByLabel('Website URL to audit')).toBeVisible();
  128 |   await expect(sources.getByRole('button', { name: /Website/ })).toHaveAttribute('aria-pressed', 'true');
  129 |   expect(errors).toEqual([]);
  130 | });
  131 | 
  132 | test('workspace results preserve the mounted owner and navigate into collapsed downloads', async ({ page }) => {
  133 |   const { errors } = await mountWorkspace(page);
  134 |   await setResult(page);
  135 |   const header = page.getByTestId('pdf-workspace-header');
  136 |   await expect(header.getByRole('status')).toHaveText('Needs review');
  137 |   await expect(page.getByText(/Anything flagged below is optional polish/)).toHaveCount(0);
  138 |   await page.evaluate(() => { (window as any).__originalDialog = document.querySelector('[data-help-key="pdf_audit_view_panel"]'); });
  139 |   const formats = page.locator('[data-help-key="pdf_audit_alt_formats_summary"]');
  140 |   await expect(formats).not.toHaveAttribute('open');
  141 |   await header.getByRole('button', { name: 'Downloads', exact: true }).click();
  142 |   await expect(formats).toHaveAttribute('open', '');
  143 |   await expect(page.locator('#allo-sec-downloads')).toBeFocused();
  144 |   expect(await page.evaluate(() => (window as any).__originalDialog === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  145 |   const headerBox = await header.boundingBox(); const targetBox = await page.locator('#allo-sec-downloads').boundingBox();
> 146 |   expect(targetBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
      |                        ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  147 |   await header.getByRole('button', { name: 'Advanced tools', exact: true }).click();
  148 |   await expect(page.locator('#allo-sec-workbench')).toHaveAttribute('open', '');
  149 |   await expect(page.locator('#allo-sec-workbench > summary')).toBeFocused();
  150 |   await page.evaluate(() => (window as any).__setModalState({ pdfAuditTab: 'original' }));
  151 |   await header.getByRole('button', { name: 'Verification & review' }).click();
  152 |   await expect(page.locator('[data-help-key="pdf_audit_verification_status"]')).toBeFocused();
  153 |   await page.evaluate(() => (window as any).__setModalState({ pdfFixLoading: true }));
  154 |   await expect(header.getByRole('status')).toHaveText('Remediation in progress');
  155 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeDisabled();
  156 |   expect(await page.evaluate(() => (window as any).__originalDialog === document.querySelector('[data-help-key="pdf_audit_view_panel"]'))).toBe(true);
  157 |   expect(errors).toEqual([]);
  158 | });
  159 | 
  160 | for (const layout of [{ width: 1280, theme: 'light' }, { width: 320, theme: 'light' }, { width: 390, theme: 'dark' }, { width: 320, theme: 'contrast' }]) {
  161 |   test(`workspace layout ${layout.width}px ${layout.theme}`, async ({ page }) => {
  162 |     await page.setViewportSize({ width: layout.width, height: 900 });
  163 |     const { errors } = await mountWorkspace(page);
  164 |     await page.evaluate(theme => (window as any).__setModalState({ theme }), layout.theme);
  165 |     const shell = page.locator('.pdf-workspace-shell');
  166 |     const checkWidth = async () => expect(await shell.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  167 |     await checkWidth();
  168 |     fs.mkdirSync(SHOTS, { recursive: true });
  169 |     await page.screenshot({ path: path.join(SHOTS, `intake-${layout.width}-${layout.theme}.png`) });
  170 |     await setResult(page);
  171 |     await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Needs review');
  172 |     await checkWidth();
  173 |     await page.screenshot({ path: path.join(SHOTS, `results-${layout.width}-${layout.theme}.png`) });
  174 |     expect(errors).toEqual([]);
  175 |   });
  176 | }
  177 | 
  178 | test('batch rows distinguish processed from verified and keep failed files available for retry', async ({ page }) => {
  179 |   const { errors } = await mountWorkspace(page);
  180 |   await page.evaluate(() => (window as any).__setModalState({
  181 |     pdfBatchMode: true, pdfBatchSummary: { status: 'complete', total: 3, done: 2, failed: 1, reviewRequired: 1, pending: 0, results: [] },
  182 |     pdfBatchQueue: [
  183 |       { id: 'one', fileName: 'verified.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'complete', fullyVerifiedSuccess: true } },
  184 |       { id: 'two', fileName: 'needs-review.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'partial' } },
  185 |       { id: 'three', fileName: 'retry.docx', fileSize: 100, status: 'failed' },
  186 |     ],
  187 |   }));
  188 |   const rows = page.locator('.pdf-workspace-batch-row');
  189 |   await expect(rows).toHaveCount(3);
  190 |   await expect(rows.nth(0)).toContainText('Processed');
  191 |   await expect(rows.nth(0)).toContainText('Verification complete');
  192 |   await expect(rows.nth(1)).toContainText('Verification partial');
  193 |   await expect(rows.nth(2).getByRole('button', { name: 'Retry retry.docx' })).toBeVisible();
  194 |   await page.screenshot({ path: path.join(SHOTS, 'batch-results-1280.png') });
  195 |   expect(errors).toEqual([]);
  196 | });
  197 | 
```