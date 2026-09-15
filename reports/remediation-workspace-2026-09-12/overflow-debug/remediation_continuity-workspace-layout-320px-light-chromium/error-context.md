# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> workspace layout 320px light
- Location: tests\e2e\remediation_continuity.spec.ts:161:7

# Error details

```
Error: [{"tag":"BUTTON","classes":"px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-sky-100 text-sky-800 border-0 underline decoration-dotted underline-offset-2 focus-visible:ring-2 focus-visible:ring-sky-500","text":"🏗️ 4 passed · 0 missing · 14 N/A (18 HTML foundations)","width":275.71875},{"tag":"BUTTON","classes":"px-4 py-2 bg-violet-50 text-violet-700 rounded-xl font-bold text-xs hover:bg-violet-100 transition-colors disabled:opacity-50","text":"📖 Add glossary appendix","width":84.5625}]

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 1
Received:    29
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
          - paragraph [ref=e9]: Document accessibility
          - heading "sample.docx" [level=2] [ref=e10]
        - generic [ref=e11]:
          - button "Toggle color theme" [ref=e12] [cursor=pointer]:
            - generic [ref=e13]: ☀️
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
          - status [ref=e30]: Needs review
          - paragraph [ref=e31]: Check verification coverage and unresolved findings before sharing this copy.
        - button "Review verification" [ref=e32] [cursor=pointer]: Review verification →
      - navigation "Result sections" [ref=e33]:
        - button "Verification & review" [ref=e34] [cursor=pointer]
        - button "Downloads" [ref=e35] [cursor=pointer]
        - button "Advanced tools" [ref=e36] [cursor=pointer]
    - 'region "PDF accessibility audit complete. Score: 78 out of 100." [ref=e37]':
      - tablist "Audit view" [ref=e38]:
        - tab "Remediation Results" [selected] [ref=e39] [cursor=pointer]
        - tab "Original Audit" [ref=e40] [cursor=pointer]
      - generic [ref=e41]:
        - generic [ref=e42]:
          - button "Additional Sweep" [ref=e43] [cursor=pointer]
          - button "Address 1 Review Finding AI ? · axe ? · EA ? · review 1" [ref=e44] [cursor=pointer]:
            - generic [ref=e45]:
              - generic [ref=e46]: Address 1 Review Finding
              - generic [ref=e47]: AI ? · axe ? · EA ? · review 1
          - button "Report ▾" [ref=e49] [cursor=pointer]
          - button "Text Extract" [ref=e50] [cursor=pointer]
        - paragraph [ref=e51]: "\"Fix & Verify\" transforms to accessible HTML with axe-core verification. \"Text Extract\" pulls raw text for differentiated material generation."
        - region "Preservation review" [ref=e52]:
          - heading "Preservation review" [level=3] [ref=e53]
          - paragraph [ref=e54]: Inspect stable references for tables, cells, and images. Acknowledging an item does not resolve accessibility findings or change verification.
          - button "Inspect document references" [ref=e55] [cursor=pointer]
          - status
        - generic [ref=e56]:
          - 'region "WCAG verification: Partial" [ref=e57]':
            - generic [ref=e58]:
              - 'heading "WCAG verification: Partial" [level=3] [ref=e59]'
              - generic [ref=e60]: WCAG 2.2 AA
              - button "Re-run verification only" [ref=e61] [cursor=pointer]
            - list [ref=e62]:
              - listitem [ref=e63]:
                - strong [ref=e64]: "AI:"
                - text: unavailable
              - listitem [ref=e65]:
                - strong [ref=e66]: "axe-core:"
                - text: complete
              - listitem [ref=e67]:
                - strong [ref=e68]: "Equal Access:"
                - text: unavailable
            - group [ref=e69]:
              - generic "Why this status?" [ref=e70] [cursor=pointer]
          - navigation "Remediation results overview and section navigation" [ref=e71]:
            - 'generic "Structural/automated checks only — the AI semantic audit was throttled and did not finish, so this is NOT a verified content score. Content audit score (HTML reconstruction: AI rubric + axe), before → after. This is NOT PDF/UA conformance of the exported PDF — see the PDF/UA chip." [ref=e72]': 78 → — structural only
            - button "🏗️ 4 passed · 0 missing · 14 N/A (18 HTML foundations)" [ref=e73] [cursor=pointer]
            - button "✅ Verification" [ref=e75] [cursor=pointer]
            - button "🩹 Recovery" [ref=e76] [cursor=pointer]
            - button "🪓 Issues (axe)" [ref=e77] [cursor=pointer]
            - button "📥 Downloads" [ref=e78] [cursor=pointer]
            - button "🔍 Tag inspector" [ref=e79] [cursor=pointer]
            - button "🛠 Workbench" [ref=e80] [cursor=pointer]
            - button "📋 What changed" [ref=e81] [cursor=pointer]
            - button "✨ Tour" [ref=e82] [cursor=pointer]
          - generic [ref=e83]:
            - heading "⚠️ Needs review" [level=4] [ref=e84]
            - button "🗑️ Start New Audit" [ref=e85] [cursor=pointer]
          - note [ref=e86]:
            - generic [ref=e87]: What now?
            - generic [ref=e88]: Check verification coverage and unresolved findings before sharing this copy.
            - button "Review verification" [ref=e89] [cursor=pointer]
            - button "✨ Make learning materials" [ref=e90] [cursor=pointer]
          - generic [ref=e91]:
            - generic [ref=e92]:
              - generic [ref=e93]: 78/100
              - generic [ref=e94]: Before
            - generic [ref=e95]: →
            - generic [ref=e96]:
              - generic "No verified score yet — the AI semantic audit was throttled and did not finish. Re-run for a full score. The structural-only number is shown below." [ref=e97]: —
              - generic [ref=e98]: After
              - generic [ref=e99]: "structural only: 99/100"
          - generic [ref=e101]:
            - 'button "content: 78→incomplete" [ref=e102]'
            - generic [ref=e103]: "Content & semantics — the AI rubric reading of meaning, alt-text quality and reading order. Reproducible: 100 minus the count-weighted deductions for the issues listed below."
            - generic [ref=e104]: — structural/automated checks only; AI semantic audit incomplete — re-run for a full score
          - generic [ref=e105]:
            - generic [ref=e106]: AI semantic verification incomplete. The score shown is structural/automated checks; use “Complete final audit” below to finish the AI check when the service is calm — it audits only, and keeps this document as it is.
            - button "Re-run the AI audit on all sections to recover sections the service throttled" [ref=e107] [cursor=pointer]: 🔁 Complete final audit
          - generic [ref=e108]:
            - generic [ref=e109]:
              - generic [ref=e110]:
                - generic [ref=e111]: 🔬
                - generic [ref=e112]:
                  - generic [ref=e113]: axe-core Automated WCAG Checker
                  - generic [ref=e114]: Industry-standard engine (Deque) v — WCAG 2.2 AA
              - generic [ref=e115]: ✅
            - generic [ref=e116]:
              - generic [ref=e117]: Zero WCAG violations detected
              - generic [ref=e118]: accessibility checks passed
            - generic [ref=e119]:
              - generic [ref=e120]: ✅ passed
              - group [ref=e121]:
                - generic "⚙ Re-run with new settings" [ref=e122] [cursor=pointer]
          - generic [ref=e123]:
            - button "✏️ Preview & Edit" [ref=e124] [cursor=pointer]
            - button "🔀 Compare" [ref=e125] [cursor=pointer]
            - button "📥 Print-style PDF (unverified)" [ref=e126] [cursor=pointer]
            - group [ref=e127]:
              - generic "📋 Document metadata — Title · Language · Author (used for the Tagged PDF)" [ref=e128] [cursor=pointer]
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
            - group [ref=e129]:
              - generic "🔍 Tag structure — view + edit the roles your tagged PDF will carry" [ref=e130] [cursor=pointer]
            - paragraph [ref=e131]: Which file? 📄 Tagged PDF — give this to students (looks identical to the original, works with screen readers). 📝 Word — keep editing it. 📽 PowerPoint — present it. 📄 HTML — opens anywhere, no software needed.
            - button "📄 Tagged PDF (generated layout)" [ref=e132] [cursor=pointer]
            - button "📝 Word (.docx)" [ref=e133] [cursor=pointer]
            - button "📽 PowerPoint (.pptx)" [ref=e134] [cursor=pointer]
            - combobox "PowerPoint export theme" [ref=e135]:
              - option "🎨 Classic Light" [selected]
              - option "🌙 Midnight"
              - option "🌅 Sunrise"
              - option "🌲 Forest"
              - option "◐ High Contrast"
              - 'option "✨ AI: match my topic"'
            - button "📄 HTML" [ref=e136] [cursor=pointer]
            - button "📊 Report ▾" [ref=e138] [cursor=pointer]
          - button "🔄 Re-scan with OCR (text looks wrong?)" [ref=e140] [cursor=pointer]
          - generic [ref=e141]:
            - button "💾 Save Project" [ref=e142] [cursor=pointer]
            - generic [ref=e143] [cursor=pointer]: 📂 Load Project
          - button "📐 Save Structure as Template (for future documents)" [ref=e144] [cursor=pointer]
          - group [ref=e145]:
            - generic "⬇ Export / Download ▾" [ref=e146] [cursor=pointer]:
              - text: ⬇ Export / Download
              - generic [ref=e147]: ▾
          - group [ref=e148]:
            - generic "▸ 🤖 Expert Workbench idle" [ref=e149] [cursor=pointer]:
              - generic [ref=e150]: ▸
              - text: 🤖 Expert Workbench
              - generic [ref=e151]: idle
          - generic [ref=e152]:
            - generic [ref=e153]: 📚 Differentiate This Document
            - button "Bi onic Reading" [ref=e154] [cursor=pointer]:
              - generic [ref=e155]: Bi
              - text: onic Reading
            - button "📏 Line Guide (reading tracker)" [ref=e156] [cursor=pointer]
            - generic [ref=e157]:
              - combobox "Translation language — type any language or pick from suggestions" [ref=e158]
              - button "Translate" [ref=e159] [cursor=pointer]
            - generic [ref=e160]:
              - combobox "Simplification grade level" [ref=e161]:
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
              - button "Simplify" [ref=e162] [cursor=pointer]
            - button "✨ Full Differentiation Pipeline" [ref=e163] [cursor=pointer]
            - paragraph [ref=e164]: Translations and simplifications stack — add French, then Spanish, then a 3rd grade version, all in one document. Each appears as a new section. Use "Full Pipeline" to feed into AlloFlow's complete differentiation system.
          - generic [ref=e165]:
            - button "🎧 Download Audio" [ref=e166] [cursor=pointer]
            - button "🦻 Audio (screen-reader style)" [ref=e167] [cursor=pointer]
            - button "📖 Add glossary appendix" [ref=e168] [cursor=pointer]
          - group [ref=e169]:
            - generic "📋 What Changed ▸" [ref=e170] [cursor=pointer]:
              - text: 📋 What Changed
              - generic [ref=e171]: ▸
          - group [ref=e172]:
            - generic "📖 Easy-Read Summary (one page) — a short overview; for the full document rewritten in plain language, use 🪶 Plain-language version above ▸" [ref=e173] [cursor=pointer]:
              - text: 📖 Easy-Read Summary (one page)
              - generic [ref=e174]: — a short overview; for the full document rewritten in plain language, use 🪶 Plain-language version above
              - generic [ref=e175]: ▸
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
  146 |   expect(targetBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
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
  166 |     const checkWidth = async () => {
  167 |       const overflow = await shell.evaluate(el => {
  168 |         const right = el.getBoundingClientRect().right;
  169 |         return Array.from(el.querySelectorAll('*')).filter(e => e.getBoundingClientRect().right > right + 1).map(e => ({ tag: e.tagName, classes: e.className, text: e.textContent?.slice(0,90), width: e.getBoundingClientRect().width })).slice(0,12);
  170 |       });
> 171 |       expect(await shell.evaluate(el => el.scrollWidth - el.clientWidth), JSON.stringify(overflow)).toBeLessThanOrEqual(1);
      |                                                                                                     ^ Error: [{"tag":"BUTTON","classes":"px-1.5 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-sky-100 text-sky-800 border-0 underline decoration-dotted underline-offset-2 focus-visible:ring-2 focus-visible:ring-sky-500","text":"🏗️ 4 passed · 0 missing · 14 N/A (18 HTML foundations)","width":275.71875},{"tag":"BUTTON","classes":"px-4 py-2 bg-violet-50 text-violet-700 rounded-xl font-bold text-xs hover:bg-violet-100 transition-colors disabled:opacity-50","text":"📖 Add glossary appendix","width":84.5625}]
  172 |     };
  173 |     await checkWidth();
  174 |     fs.mkdirSync(SHOTS, { recursive: true });
  175 |     await page.screenshot({ path: path.join(SHOTS, `intake-${layout.width}-${layout.theme}.png`) });
  176 |     await setResult(page);
  177 |     await expect(page.getByTestId('pdf-workspace-header').getByRole('status')).toHaveText('Needs review');
  178 |     await checkWidth();
  179 |     await page.screenshot({ path: path.join(SHOTS, `results-${layout.width}-${layout.theme}.png`) });
  180 |     expect(errors).toEqual([]);
  181 |   });
  182 | }
  183 | 
  184 | test('batch rows distinguish processed from verified and keep failed files available for retry', async ({ page }) => {
  185 |   const { errors } = await mountWorkspace(page);
  186 |   await page.evaluate(() => (window as any).__setModalState({
  187 |     pdfBatchMode: true, pdfBatchSummary: { status: 'complete', total: 3, done: 2, failed: 1, reviewRequired: 1, pending: 0, results: [] },
  188 |     pdfBatchQueue: [
  189 |       { id: 'one', fileName: 'verified.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'complete', fullyVerifiedSuccess: true } },
  190 |       { id: 'two', fileName: 'needs-review.docx', fileSize: 100, status: 'done', result: { afterScore: 99, verificationState: 'partial' } },
  191 |       { id: 'three', fileName: 'retry.docx', fileSize: 100, status: 'failed' },
  192 |     ],
  193 |   }));
  194 |   const rows = page.locator('.pdf-workspace-batch-row');
  195 |   await expect(rows).toHaveCount(3);
  196 |   await expect(rows.nth(0)).toContainText('Processed');
  197 |   await expect(rows.nth(0)).toContainText('Verification complete');
  198 |   await expect(rows.nth(1)).toContainText('Verification partial');
  199 |   await expect(rows.nth(2).getByRole('button', { name: 'Retry retry.docx' })).toBeVisible();
  200 |   await page.screenshot({ path: path.join(SHOTS, 'batch-results-1280.png') });
  201 |   expect(errors).toEqual([]);
  202 | });
  203 | 
```